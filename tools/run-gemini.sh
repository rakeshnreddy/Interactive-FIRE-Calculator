#!/usr/bin/env bash
set -euo pipefail

# tools/run-gemini.sh - CLI delegation launcher for Gemini worker
#
# Contract:
# - Invocation: tools/run-gemini.sh <prompt-file>
# - Exactly one argument required.
# - Validates prompt existence, readability, non-emptiness.
# - Resolves prompt path to absolute path before cd to git root.
# - Locates Git repository root via git rev-parse --show-toplevel and executes in it.
# - Finds agy binary: prefers ~/.local/bin/agy, falls back to PATH agy.
# - Models restricted to confirmed:
#     gemini-3.8-flash-high (with --effort high) [DEFAULT]
#     gemini-3.8-flash-medium (with --effort medium)
# - Rejects arbitrary other models or incompatible model/effort pairs.
# - Preserves prompt trailing newlines and metacharacters verbatim (no eval).
# - Flags: -p, --model, --effort, --print-timeout, --mode accept-edits, --output-format json
# - Bounded run via --print-timeout with integer seconds s or integer minutes m (default 30m, max 30m/1800s).
# - Sets umask 077 before file creation; output stored under .ai-handoff/ (0700 dir / 0600 files).
# - Synchronously awaits worker process; no model polling loops.
# - Emits atomic machine-readable completion record (.ai-handoff/*_completion.json) via tempfile+replace
#   with run ID, status (SUCCESS/FAILED/BLOCKED/TIMEOUT), worker_exit_code, launcher_exit_code, report paths, and timestamps.
# - Represents runtime execution completion only, never task acceptance (Astra alone accepts).
# - Validates JSON structure using python3 (top-level object, exact status SUCCESS, non-empty response string,
#   rejects explicit non-empty error, treats non-empty denied_actions as BLOCKED).
# - Scans stderr for soft-denials, auto-denied tools, no output produced, or permission errors.
# - Constant error categories prevent credential/secret leakage in error output.

# Restrictive umask before any files or directories are created
umask 077

if [ "$#" -ne 1 ]; then
  echo "Error: Exactly one prompt-file argument is required." >&2
  echo "Usage: $0 <prompt-file>" >&2
  exit 1
fi

PROMPT_INPUT="$1"

if [ ! -e "$PROMPT_INPUT" ]; then
  echo "Error: Prompt file does not exist: '$PROMPT_INPUT'" >&2
  exit 1
fi

if [ ! -f "$PROMPT_INPUT" ]; then
  echo "Error: Prompt path is not a regular file: '$PROMPT_INPUT'" >&2
  exit 1
fi

if [ ! -r "$PROMPT_INPUT" ]; then
  echo "Error: Prompt file is not readable: '$PROMPT_INPUT'" >&2
  exit 1
fi

if [ ! -s "$PROMPT_INPUT" ]; then
  echo "Error: Prompt file is empty: '$PROMPT_INPUT'" >&2
  exit 1
fi

# Resolve prompt to an absolute path BEFORE cd
if [[ "$PROMPT_INPUT" = /* ]]; then
  ABS_PROMPT_PATH="$PROMPT_INPUT"
else
  PROMPT_DIR="$(cd "$(dirname "$PROMPT_INPUT")" && pwd)"
  PROMPT_BASE="$(basename "$PROMPT_INPUT")"
  ABS_PROMPT_PATH="${PROMPT_DIR}/${PROMPT_BASE}"
fi

# Locate Git repository root (read-only detection)
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$GIT_ROOT" ] || [ ! -d "$GIT_ROOT" ]; then
  echo "Error: Current directory is not within a Git repository." >&2
  exit 1
fi

cd "$GIT_ROOT"

# Locate agy binary: prefer ~/.local/bin/agy, fall back to PATH agy
AGY_BIN=""
if [ -x "${HOME}/.local/bin/agy" ]; then
  AGY_BIN="${HOME}/.local/bin/agy"
elif command -v agy >/dev/null 2>&1; then
  AGY_BIN="$(command -v agy)"
else
  echo "Error: agy binary not found. Checked '${HOME}/.local/bin/agy' and PATH." >&2
  exit 1
fi

# Model & Effort validation
# Restrict to confirmed pairs:
# 1) gemini-3.8-flash-high with high
# 2) gemini-3.8-flash-medium with medium
MODEL="${GEMINI_MODEL:-gemini-3.8-flash-high}"
EFFORT="${GEMINI_EFFORT:-high}"

if [ "$MODEL" = "gemini-3.8-flash-high" ]; then
  if [ "$EFFORT" != "high" ]; then
    echo "Error: Incompatible model/effort configuration. Model 'gemini-3.8-flash-high' requires '--effort high', got '${EFFORT}'." >&2
    exit 1
  fi
elif [ "$MODEL" = "gemini-3.8-flash-medium" ]; then
  if [ "$EFFORT" != "medium" ]; then
    echo "Error: Incompatible model/effort configuration. Model 'gemini-3.8-flash-medium' requires '--effort medium', got '${EFFORT}'." >&2
    exit 1
  fi
else
  echo "Error: Unsupported model '${MODEL}'. Only 'gemini-3.8-flash-high' (effort high) and 'gemini-3.8-flash-medium' (effort medium) are permitted." >&2
  exit 1
fi

# Timeout validation: integer seconds s or integer minutes m only, positive up to 1800s/30m
PRINT_TIMEOUT="${GEMINI_PRINT_TIMEOUT:-30m}"

TIMEOUT_VALID="$(python3 -c '
import re, sys

val = sys.argv[1].strip()
m = re.fullmatch(r"^([1-9]\d*)([sm])$", val)
if not m:
    sys.exit(1)

num = int(m.group(1))
unit = m.group(2)
total_sec = num * 60 if unit == "m" else num
if total_sec < 1 or total_sec > 1800:
    sys.exit(1)

sys.exit(0)
' "$PRINT_TIMEOUT" 2>&1 && echo "OK" || echo "INVALID")"

if [ "$TIMEOUT_VALID" != "OK" ]; then
  echo "Error: Invalid GEMINI_PRINT_TIMEOUT '${PRINT_TIMEOUT}'. Must be an integer number of seconds (s) or minutes (m) up to 1800s/30m (e.g. 30m, 15m, 1800s, 60s). Subsecond units, composite units, non-integers, zero, negative, and values exceeding 30m are rejected." >&2
  exit 1
fi

# Read prompt preserving trailing newlines and metacharacters via sentinel
PROMPT_CONTENT="$(cat -- "$ABS_PROMPT_PATH"; printf 'x')"
PROMPT_CONTENT="${PROMPT_CONTENT%x}"

# Prepare private .ai-handoff directory
HANDOFF_DIR="${GIT_ROOT}/.ai-handoff"
if [ ! -d "$HANDOFF_DIR" ]; then
  mkdir -p "$HANDOFF_DIR"
fi
chmod 700 "$HANDOFF_DIR"

START_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
RUN_ID="gemini_${RUN_TIMESTAMP}_$$"
STDOUT_FILE="${HANDOFF_DIR}/${RUN_ID}_stdout.json"
STDERR_FILE="${HANDOFF_DIR}/${RUN_ID}_stderr.log"
REPORT_FILE="${HANDOFF_DIR}/${RUN_ID}_report.md"
COMPLETION_FILE="${HANDOFF_DIR}/${RUN_ID}_completion.json"

touch "$STDOUT_FILE" "$STDERR_FILE"
chmod 600 "$STDOUT_FILE" "$STDERR_FILE"

# Helper to emit machine-readable completion record and Markdown report
emit_artifacts() {
  local status="$1"        # SUCCESS, FAILED, BLOCKED, TIMEOUT
  local category="$2"      # Generic summary or failure category (constant string)
  local launcher_code="$3" # Launcher exit code
  local end_time
  end_time="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  # Write machine-readable completion record (JSON) atomically via temp file + replace
  python3 -c '
import json, os, sys, tempfile

run_id = sys.argv[1]
status = sys.argv[2]
worker_exit = int(sys.argv[3])
launcher_exit = int(sys.argv[4])
model = sys.argv[5]
effort = sys.argv[6]
timeout = sys.argv[7]
report_path = sys.argv[8]
stdout_path = sys.argv[9]
stderr_path = sys.argv[10]
start_time = sys.argv[11]
end_time = sys.argv[12]
category = sys.argv[13]
target_path = sys.argv[14]

data = {
    "run_id": run_id,
    "status": status,
    "exit_code": launcher_exit,
    "worker_exit_code": worker_exit,
    "launcher_exit_code": launcher_exit,
    "model": model,
    "effort": effort,
    "timeout": timeout,
    "report_path": report_path,
    "stdout_path": stdout_path,
    "stderr_path": stderr_path,
    "started_at": start_time,
    "completed_at": end_time,
    "summary": category
}

target_dir = os.path.dirname(os.path.abspath(target_path))
fd, tmp_path = tempfile.mkstemp(dir=target_dir, prefix=".completion_", suffix=".tmp")
try:
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.chmod(tmp_path, 0o600)
    os.replace(tmp_path, target_path)
except Exception:
    if os.path.exists(tmp_path):
        os.unlink(tmp_path)
    raise
' "$RUN_ID" "$status" "$WORKER_EXIT_CODE" "$launcher_code" "$MODEL" "$EFFORT" "$PRINT_TIMEOUT" "$REPORT_FILE" "$STDOUT_FILE" "$STDERR_FILE" "$START_TIME" "$end_time" "$category" "$COMPLETION_FILE"

  # Write simplified Markdown report
  {
    echo "# Gemini Task Delegation Report"
    echo ""
    echo "- **Execution Status**: ${status} (Worker process execution complete; NOT task acceptance)"
    echo "- **Model**: \`${MODEL}\` (effort: \`${EFFORT}\`)"
    echo "- **Run ID**: \`${RUN_ID}\`"
    echo "- **Worker Process Exit Code**: ${WORKER_EXIT_CODE}"
    echo "- **Launcher Exit Code**: ${launcher_code}"
    echo "- **Started At**: \`${START_TIME}\`"
    echo "- **Completed At**: \`${end_time}\`"
    echo "- **Completion Record**: \`${COMPLETION_FILE}\`"
    echo "- **Stdout Log**: \`${STDOUT_FILE}\`"
    echo "- **Stderr Log**: \`${STDERR_FILE}\`"
    echo ""
    echo "## Category / Summary"
    echo "${category}"
    echo ""
    echo "> [!NOTE]"
    echo "> Execution SUCCESS indicates worker process completion only. Astra alone reviews output and decides task acceptance."
  } > "$REPORT_FILE"
  chmod 600 "$REPORT_FILE"
}

# Execute agy in headless mode; synchronously await child completion (no model polling)
set +e
"$AGY_BIN" \
  -p "$PROMPT_CONTENT" \
  --model "$MODEL" \
  --effort "$EFFORT" \
  --mode accept-edits \
  --output-format json \
  --print-timeout "$PRINT_TIMEOUT" \
  > "$STDOUT_FILE" 2> "$STDERR_FILE"
WORKER_EXIT_CODE=$?
set -e

# Handle non-zero exit code from worker process
if [ "$WORKER_EXIT_CODE" -ne 0 ]; then
  STATUS="FAILED"
  CATEGORY="Worker process exited with code ${WORKER_EXIT_CODE}"
  if [ "$WORKER_EXIT_CODE" -eq 124 ]; then
    STATUS="TIMEOUT"
    CATEGORY="Worker process timed out (--print-timeout ${PRINT_TIMEOUT})"
  fi
  emit_artifacts "$STATUS" "$CATEGORY" "$WORKER_EXIT_CODE"
  echo "Error: Gemini delegation failed (${CATEGORY})." >&2
  echo "Private evidence paths:" >&2
  echo "  Completion: ${COMPLETION_FILE}" >&2
  echo "  Report:     ${REPORT_FILE}" >&2
  echo "  Stdout:     ${STDOUT_FILE}" >&2
  echo "  Stderr:     ${STDERR_FILE}" >&2
  exit "$WORKER_EXIT_CODE"
fi

# Detect soft-denials / permission errors in stderr despite exit code 0
# Catches: auto-denied, no output produced, soft-denial, permission errors
DENIAL_DETECTED=0
if [ -s "$STDERR_FILE" ]; then
  if grep -Eiq 'auto-deni(ed|al)|no output produced|soft-deni(ed|al)|permission[[:space:]]+(denied|error|rejected|required)|denied[[:space:]]+permission|requires?[[:space:]]+permission|approval[[:space:]]+required' "$STDERR_FILE"; then
    DENIAL_DETECTED=1
  fi
fi

if [ "$DENIAL_DETECTED" -eq 1 ]; then
  emit_artifacts "BLOCKED" "Runtime permission denial, soft-denial, or auto-denied tool detected in stderr" 1
  echo "Error: Runtime permission denial or soft-denial detected in stderr despite exit code 0." >&2
  echo "Private evidence paths:" >&2
  echo "  Completion: ${COMPLETION_FILE}" >&2
  echo "  Report:     ${REPORT_FILE}" >&2
  echo "  Stdout:     ${STDOUT_FILE}" >&2
  echo "  Stderr:     ${STDERR_FILE}" >&2
  exit 1
fi

# Verify response file exists and has non-empty content
if [ ! -s "$STDOUT_FILE" ]; then
  emit_artifacts "FAILED" "agy exited 0 but produced no response output (empty stdout)" 1
  echo "Error: agy exited 0 but produced no response output (empty stdout)." >&2
  echo "Private evidence paths:" >&2
  echo "  Completion: ${COMPLETION_FILE}" >&2
  echo "  Report:     ${REPORT_FILE}" >&2
  echo "  Stdout:     ${STDOUT_FILE}" >&2
  echo "  Stderr:     ${STDERR_FILE}" >&2
  exit 1
fi

# Validate JSON structure using standard python3 json parser:
# - Root must be a JSON object (rejects arrays and primitives)
# - Non-empty denied_actions must be treated as BLOCKED regardless of status or stderr
# - Non-empty error must be rejected as FAILED
# - Status must be exactly "SUCCESS" (rejects non-SUCCESS, missing status, or nested misleading SUCCESS)
# - Response must be a non-empty string (rejects empty/whitespace/missing/non-string response)
# - Emits constant category text only (no untrusted field interpolation to prevent secret leaks)
JSON_CHECK="$(python3 -c '
import json, sys

path = sys.argv[1]
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    sys.stdout.write("FAILED|Malformed JSON response")
    sys.exit(0)

if not isinstance(data, dict):
    sys.stdout.write("FAILED|Root JSON is not an object")
    sys.exit(0)

denied = data.get("denied_actions")
if denied:
    sys.stdout.write("BLOCKED|Denied actions detected in response envelope")
    sys.exit(0)

err = data.get("error")
if err:
    sys.stdout.write("FAILED|Response contains error field")
    sys.exit(0)

status = data.get("status")
if status != "SUCCESS":
    sys.stdout.write("FAILED|Status is not SUCCESS")
    sys.exit(0)

resp = data.get("response")
if not isinstance(resp, str) or not resp.strip():
    sys.stdout.write("FAILED|Missing, non-string, or whitespace-only response field")
    sys.exit(0)

sys.exit(0)
' "$STDOUT_FILE")"

if [ -n "$JSON_CHECK" ]; then
  CHECK_STATUS="${JSON_CHECK%%|*}"
  CHECK_CATEGORY="${JSON_CHECK#*|}"
  emit_artifacts "$CHECK_STATUS" "JSON response validation: ${CHECK_CATEGORY}" 1
  if [ "$CHECK_STATUS" = "BLOCKED" ]; then
    echo "Error: Actions denied by runtime policy in response envelope (${CHECK_CATEGORY})." >&2
  else
    echo "Error: Invalid JSON response envelope from agy (${CHECK_CATEGORY})." >&2
  fi
  echo "Private evidence paths:" >&2
  echo "  Completion: ${COMPLETION_FILE}" >&2
  echo "  Report:     ${REPORT_FILE}" >&2
  echo "  Stdout:     ${STDOUT_FILE}" >&2
  echo "  Stderr:     ${STDERR_FILE}" >&2
  exit 1
fi

# Successful execution completion (Astra alone conducts review and determines task acceptance)
emit_artifacts "SUCCESS" "Worker execution completed successfully (status: SUCCESS). Task acceptance pending Astra review." 0

# Extract compact response preview for stdout
COMPACT_RESP="$(python3 -c '
import json, sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    resp = data.get("response", "")
    lines = resp.strip().splitlines()
    if len(lines) > 10:
        print("\n".join(lines[:10]) + "\n...")
    else:
        print("\n".join(lines))
except Exception:
    pass
' "$STDOUT_FILE")"

# Compact final output to stdout
echo "=== Gemini Delegation Execution Completed ==="
echo "Run ID:     ${RUN_ID}"
echo "Status:     SUCCESS (Execution Complete; Astra acceptance pending)"
echo "Model:      ${MODEL} (effort: ${EFFORT})"
echo "Completion: ${COMPLETION_FILE}"
echo "Report:     ${REPORT_FILE}"
echo "Stdout:     ${STDOUT_FILE}"
echo "Stderr:     ${STDERR_FILE}"
echo ""
echo "Response:"
echo "${COMPACT_RESP}"

exit 0
