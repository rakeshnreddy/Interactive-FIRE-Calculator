#!/usr/bin/env bash
set -euo pipefail

# tools/test-run-gemini.sh
# Isolated, mock-based unit tests for tools/run-gemini.sh
#
# Covers:
# 1. Bad argc (0 and >1)
# 2. Missing, empty, unreadable prompt files
# 3. Execution outside Git repository
# 4. Binary discovery: missing binary, ~/.local/bin/agy preference over PATH, PATH fallback
# 5. Invocation from subdirectories with spaces and relative paths
# 6. Execution cwd enforcement at git root
# 7. Byte-exact preservation of multiline prompts, metacharacters, and trailing newlines (no eval)
# 8. Exit code propagation from worker process
# 9. Default model/effort flags and exact string --print-timeout 30m
# 10. Timeout validation (rejects missing unit, non-numeric, 0, negative, >30m, accepts valid <=30m)
# 11. Restrictive model enforcement (gemini-3.8-flash-high/high, gemini-3.8-flash-medium/medium; rejects 2.5 Pro and arbitrary models)
# 12. Soft-denial detection in stderr (including exact jetski auto-denied string despite SUCCESS response)
# 13. Empty stdout detection despite exit code 0
# 14. Rigorous python3 JSON validation (top-level object, exact status SUCCESS, non-empty response, rejects arrays/nested SUCCESS/malformed)
# 15. Credential leak prevention (secret marker never appears on terminal stdout/stderr on errors)
# 16. Restrictive permissions (umask 077: dir 0700, files 0600)
# 17. Machine-readable completion record generation on both success and failures

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LAUNCHER="${REPO_ROOT}/tools/run-gemini.sh"

TEST_TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/gemini_test.XXXXXX")"
cleanup() {
  rm -rf "$TEST_TEMP_ROOT"
}
trap cleanup EXIT

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

pass() {
  local name="$1"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  PASSED_TESTS=$((PASSED_TESTS + 1))
  echo "[PASS] ${name}"
}

fail() {
  local name="$1"
  local reason="$2"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  FAILED_TESTS=$((FAILED_TESTS + 1))
  echo "[FAIL] ${name}: ${reason}" >&2
}

setup_git_repo() {
  local dir="$1"
  mkdir -p "$dir"
  (
    cd "$dir"
    git init --quiet -b main
    git config user.email "test@example.com"
    git config user.name "Test User"
    touch README.md
    git add README.md
    git commit --quiet -m "Initial commit"
  )
}

# 1. Bad argc: 0 args
test_bad_argc_zero() {
  local test_dir="${TEST_TEMP_ROOT}/test_bad_argc_zero"
  setup_git_repo "$test_dir"
  set +e
  local out
  out="$(cd "$test_dir" && "$LAUNCHER" 2>&1)"
  local code=$?
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "usage"; then
    pass "test_bad_argc_zero"
  else
    fail "test_bad_argc_zero" "Expected nonzero exit and usage message, got code=$code, out=$out"
  fi
}

# 2. Bad argc: >1 args
test_bad_argc_multiple() {
  local test_dir="${TEST_TEMP_ROOT}/test_bad_argc_multiple"
  setup_git_repo "$test_dir"
  touch "${test_dir}/p1.md" "${test_dir}/p2.md"
  set +e
  local out
  out="$(cd "$test_dir" && "$LAUNCHER" "${test_dir}/p1.md" "${test_dir}/p2.md" 2>&1)"
  local code=$?
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "Exactly one"; then
    pass "test_bad_argc_multiple"
  else
    fail "test_bad_argc_multiple" "Expected nonzero exit and 'Exactly one', got code=$code, out=$out"
  fi
}

# 3. Missing prompt file
test_missing_prompt() {
  local test_dir="${TEST_TEMP_ROOT}/test_missing_prompt"
  setup_git_repo "$test_dir"
  set +e
  local out
  out="$(cd "$test_dir" && "$LAUNCHER" "${test_dir}/does_not_exist.md" 2>&1)"
  local code=$?
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "does not exist"; then
    pass "test_missing_prompt"
  else
    fail "test_missing_prompt" "Expected nonzero exit and 'does not exist', got code=$code, out=$out"
  fi
}

# 4. Empty prompt file
test_empty_prompt() {
  local test_dir="${TEST_TEMP_ROOT}/test_empty_prompt"
  setup_git_repo "$test_dir"
  touch "${test_dir}/empty.md"
  set +e
  local out
  out="$(cd "$test_dir" && "$LAUNCHER" "${test_dir}/empty.md" 2>&1)"
  local code=$?
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "empty"; then
    pass "test_empty_prompt"
  else
    fail "test_empty_prompt" "Expected nonzero exit and 'empty', got code=$code, out=$out"
  fi
}

# 5. Unreadable prompt file
test_unreadable_prompt() {
  local test_dir="${TEST_TEMP_ROOT}/test_unreadable_prompt"
  setup_git_repo "$test_dir"
  echo "content" > "${test_dir}/unreadable.md"
  chmod 000 "${test_dir}/unreadable.md"
  set +e
  local out
  out="$(cd "$test_dir" && "$LAUNCHER" "${test_dir}/unreadable.md" 2>&1)"
  local code=$?
  chmod 644 "${test_dir}/unreadable.md"
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "readable"; then
    pass "test_unreadable_prompt"
  else
    fail "test_unreadable_prompt" "Expected nonzero exit and 'readable', got code=$code, out=$out"
  fi
}

# 6. Outside git repo detection
test_outside_git_repo() {
  local non_git_dir="${TEST_TEMP_ROOT}/non_git_dir"
  mkdir -p "$non_git_dir"
  echo "content" > "${non_git_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$non_git_dir" && "$LAUNCHER" "${non_git_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "Git repository"; then
    pass "test_outside_git_repo"
  else
    fail "test_outside_git_repo" "Expected nonzero exit and 'Git repository', got code=$code, out=$out"
  fi
}

# 7. Missing binary in both HOME and PATH
test_missing_binary() {
  local test_dir="${TEST_TEMP_ROOT}/test_missing_bin"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local empty_path="${test_dir}/empty_path"
  mkdir -p "$fake_home" "$empty_path"
  echo "Run prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e
  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "agy binary not found"; then
    pass "test_missing_binary"
  else
    fail "test_missing_binary" "Expected nonzero exit and 'agy binary not found', got code=$code, out=$out"
  fi
}

# 8. Binary preference: ~/.local/bin/agy over PATH agy
test_binary_preference() {
  local test_dir="${TEST_TEMP_ROOT}/test_bin_pref"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  local path_bin="${test_dir}/path_bin"
  mkdir -p "$home_bin" "$path_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "from HOME"}'
EOF
  chmod +x "${home_bin}/agy"

  cat <<'EOF' > "${path_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "from PATH"}'
EOF
  chmod +x "${path_bin}/agy"

  echo "Valid prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="${path_bin}:/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -eq 0 ] && grep -q "from HOME" "${test_dir}/.ai-handoff/"*_stdout.json; then
    pass "test_binary_preference"
  else
    fail "test_binary_preference" "Expected HOME agy to be selected, code=$code, out=$out"
  fi
}

# 9. Binary fallback to PATH agy when ~/.local/bin/agy is absent
test_binary_fallback_to_path() {
  local test_dir="${TEST_TEMP_ROOT}/test_bin_fallback"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local path_bin="${test_dir}/path_bin"
  mkdir -p "$fake_home" "$path_bin"

  cat <<'EOF' > "${path_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "from PATH fallback"}'
EOF
  chmod +x "${path_bin}/agy"

  echo "Valid prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="${path_bin}:/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -eq 0 ] && grep -q "from PATH fallback" "${test_dir}/.ai-handoff/"*_stdout.json; then
    pass "test_binary_fallback_to_path"
  else
    fail "test_binary_fallback_to_path" "Expected fallback to PATH agy, code=$code, out=$out"
  fi
}

# 10. Relative path from nested subdirectory (including spaces)
test_relative_path_from_subdirectory_with_spaces() {
  local test_dir="${TEST_TEMP_ROOT}/test_subdir_spaces"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "ok from spaces"}'
EOF
  chmod +x "${home_bin}/agy"

  local prompt_dir="${test_dir}/prompts with spaces"
  mkdir -p "$prompt_dir"
  local prompt_file="${prompt_dir}/task prompt.md"
  echo "Do this task" > "$prompt_file"

  local run_sub="${test_dir}/nested dir with spaces/deeper"
  mkdir -p "$run_sub"

  set +e
  local out
  out="$(cd "$run_sub" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "../../prompts with spaces/task prompt.md" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -eq 0 ] && [ -d "${test_dir}/.ai-handoff" ]; then
    pass "test_relative_path_from_subdirectory_with_spaces"
  else
    fail "test_relative_path_from_subdirectory_with_spaces" "Failed with code=$code, out=$out"
  fi
}

# 11. Proper root cwd execution verification
test_proper_root_cwd() {
  local test_dir="${TEST_TEMP_ROOT}/test_root_cwd"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
ACTUAL_CWD="$(pwd -P)"
echo "{\"status\": \"SUCCESS\", \"response\": \"cwd: ${ACTUAL_CWD}\"}"
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  local nested="${test_dir}/nested/sub/dir"
  mkdir -p "$nested"

  set +e
  local out
  out="$(cd "$nested" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "../../../prompt.md" 2>&1)"
  local code=$?
  set -e

  local expected_root
  expected_root="$(cd "$test_dir" && pwd -P)"
  if [ "$code" -eq 0 ] && grep -q "cwd: ${expected_root}" "${test_dir}/.ai-handoff/"*_stdout.json; then
    pass "test_proper_root_cwd"
  else
    fail "test_proper_root_cwd" "agy was not executed from git root. code=$code, out=$out"
  fi
}

# 12. Multiline, trailing newlines, and metacharacters byte-exact (no eval, no newline stripping)
test_byte_exact_prompt_preservation() {
  local test_dir="${TEST_TEMP_ROOT}/test_byte_exact"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  local can_fail_file="${TEST_TEMP_ROOT}/should_never_be_touched"
  rm -f "$can_fail_file"

  local arg_dump="${test_dir}/arg_dump.txt"

  cat <<EOF > "${home_bin}/agy"
#!/usr/bin/env bash
while [ "\$#" -gt 0 ]; do
  if [ "\$1" = "-p" ]; then
    printf '%s' "\$2" > "${arg_dump}"
    shift 2
  else
    shift
  fi
done
echo '{"status": "SUCCESS", "response": "byte exact test complete"}'
EOF
  chmod +x "${home_bin}/agy"

  local prompt_file="${test_dir}/complex_prompt.md"
  # Create prompt with quotes, variables, backticks, semicolons, and 3 trailing newlines
  printf 'Line 1: Normal instruction\nLine 2: `touch %s`\nLine 3: $(touch %s)\nLine 4: ; rm -rf / ; \nLine 5: "double quotes" and '\''single quotes'\'' and $NOT_EXPANDED_VAR\n\n\n' "$can_fail_file" "$can_fail_file" > "$prompt_file"

  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "$prompt_file" 2>&1)"
  local code=$?
  set -e

  if [ -e "$can_fail_file" ]; then
    fail "test_byte_exact_prompt_preservation" "Command injection executed from prompt!"
    return
  fi

  if [ "$code" -eq 0 ] && cmp -s "$prompt_file" "$arg_dump"; then
    pass "test_byte_exact_prompt_preservation"
  else
    fail "test_byte_exact_prompt_preservation" "Prompt byte comparison failed or code=$code, out=$out"
  fi
}

# 13. Exit code propagation
test_exit_code_propagation() {
  local test_dir="${TEST_TEMP_ROOT}/test_exit_prop"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo "Simulated fatal error in worker" >&2
exit 42
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  local comp_file
  comp_file="$(ls "${test_dir}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  if [ "$code" -eq 42 ] && [ -f "$comp_file" ] && \
     grep -q '"worker_exit_code": 42' "$comp_file" && \
     grep -q '"launcher_exit_code": 42' "$comp_file"; then
    pass "test_exit_code_propagation"
  else
    fail "test_exit_code_propagation" "Expected exit code 42 and worker/launcher exit codes 42, got $code, out=$out"
  fi
}

# 14. Default model args and explicit string 30m timeout
test_default_model_args_and_timeout_30m() {
  local test_dir="${TEST_TEMP_ROOT}/test_default_model_args"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  local captured_args="${test_dir}/captured_args.txt"
  cat <<EOF > "${home_bin}/agy"
#!/usr/bin/env bash
echo "\$@" > "${captured_args}"
echo '{"status": "SUCCESS", "response": "defaults verified"}'
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -eq 0 ] && \
     grep -q -- "--model gemini-3.8-flash-high" "$captured_args" && \
     grep -q -- "--effort high" "$captured_args" && \
     grep -q -- "--mode accept-edits" "$captured_args" && \
     grep -q -- "--output-format json" "$captured_args" && \
     grep -q -- "--print-timeout 30m" "$captured_args"; then
    pass "test_default_model_args_and_timeout_30m"
  else
    fail "test_default_model_args_and_timeout_30m" "Flags missing or timeout was not '30m': $(cat "$captured_args" 2>/dev/null)"
  fi
}

# 15. Timeout validation: integer seconds s or integer minutes m only, positive up to 1800s/30m
test_timeout_validation() {
  local test_dir="${TEST_TEMP_ROOT}/test_timeout_val"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "timeout ok"}'
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"

  # Reject: missing unit (1800)
  set +e
  local c_nounit
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="1800" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_nounit=$?

  # Reject: 0m and 0s
  local c_zero_m c_zero_s
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="0m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_zero_m=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="0s" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_zero_s=$?

  # Reject: negative (-5m, -1s)
  local c_neg_m c_neg_s
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="-5m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_neg_m=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="-1s" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_neg_s=$?

  # Reject: beyond 30m / 1800s (31m, 1801s)
  local c_over_m c_over_s
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="31m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_over_m=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="1801s" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_over_s=$?

  # Reject: ms unit or floats (500ms, 1.5m)
  local c_ms c_float
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="500ms" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_ms=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="1.5m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_float=$?

  # Reject: non-numeric/infinite
  local c_inf
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="infinite" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_inf=$?

  # Accept: boundaries 1s, 1800s, 1m, 30m, and intermediate 15m
  local c_1s c_1800s c_1m c_30m c_15m
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="1s" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_1s=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="1800s" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_1800s=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="1m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_1m=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="30m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_30m=$?
  (cd "$test_dir" && GEMINI_PRINT_TIMEOUT="15m" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)
  c_15m=$?
  set -e

  if [ "$c_nounit" -ne 0 ] && [ "$c_zero_m" -ne 0 ] && [ "$c_zero_s" -ne 0 ] && \
     [ "$c_neg_m" -ne 0 ] && [ "$c_neg_s" -ne 0 ] && [ "$c_over_m" -ne 0 ] && \
     [ "$c_over_s" -ne 0 ] && [ "$c_ms" -ne 0 ] && [ "$c_float" -ne 0 ] && \
     [ "$c_inf" -ne 0 ] && [ "$c_1s" -eq 0 ] && [ "$c_1800s" -eq 0 ] && \
     [ "$c_1m" -eq 0 ] && [ "$c_30m" -eq 0 ] && [ "$c_15m" -eq 0 ]; then
    pass "test_timeout_validation"
  else
    fail "test_timeout_validation" "nounit=$c_nounit, zero_m=$c_zero_m, zero_s=$c_zero_s, neg_m=$c_neg_m, neg_s=$c_neg_s, over_m=$c_over_m, over_s=$c_over_s, ms=$c_ms, float=$c_float, inf=$c_inf, 1s=$c_1s, 1800s=$c_1800s, 1m=$c_1m, 30m=$c_30m, 15m=$c_15m"
  fi
}

# 16. Restrictive models: flash-high/high, flash-medium/medium; rejects 2.5 Pro and arbitrary models
test_restrictive_models() {
  local test_dir="${TEST_TEMP_ROOT}/test_models"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  local captured_args="${test_dir}/captured_args.txt"
  cat <<EOF > "${home_bin}/agy"
#!/usr/bin/env bash
echo "\$@" > "${captured_args}"
echo '{"status": "SUCCESS", "response": "model ok"}'
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"

  # Case A: gemini-3.8-flash-medium with medium -> must accept
  set +e
  local out1
  out1="$(cd "$test_dir" && GEMINI_MODEL="gemini-3.8-flash-medium" GEMINI_EFFORT="medium" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code1=$?
  set -e

  # Case B: gemini-3.8-flash-high with medium -> must reject
  set +e
  local out2
  out2="$(cd "$test_dir" && GEMINI_MODEL="gemini-3.8-flash-high" GEMINI_EFFORT="medium" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code2=$?
  set -e

  # Case C: gemini-2.5-pro -> must reject (no 2.5 Pro fallback)
  set +e
  local out3
  out3="$(cd "$test_dir" && GEMINI_MODEL="gemini-2.5-pro" GEMINI_EFFORT="high" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code3=$?
  set -e

  # Case D: arbitrary model gpt-4 -> must reject
  set +e
  local out4
  out4="$(cd "$test_dir" && GEMINI_MODEL="gpt-4" GEMINI_EFFORT="high" HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code4=$?
  set -e

  if [ "$code1" -eq 0 ] && [ "$code2" -ne 0 ] && [ "$code3" -ne 0 ] && [ "$code4" -ne 0 ]; then
    pass "test_restrictive_models"
  else
    fail "test_restrictive_models" "c1=$code1 (expected 0), c2=$code2, c3=$code3, c4=$code4 (expected non-zero)"
  fi
}

# 17. Observed stderr soft-denial: jetski auto-denied command permission fails despite SUCCESS + nonempty response
test_soft_denial_observed_jetski_stderr() {
  local test_dir="${TEST_TEMP_ROOT}/test_jetski_denial"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
# Exact observed stderr string
echo 'jetski: no output produced — a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied' >&2
echo '{"status": "SUCCESS", "response": "Fabricated success that should fail"}'
exit 0
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  local completion_file
  completion_file="$(ls "${test_dir}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  if [ "$code" -eq 1 ] && [ -f "$completion_file" ] && \
     grep -q '"status": "BLOCKED"' "$completion_file" && \
     grep -q '"worker_exit_code": 0' "$completion_file" && \
     grep -q '"launcher_exit_code": 1' "$completion_file"; then
    pass "test_soft_denial_observed_jetski_stderr"
  else
    fail "test_soft_denial_observed_jetski_stderr" "Expected code=1, BLOCKED, worker_exit_code=0, launcher_exit_code=1, got code=$code, out=$out"
  fi
}

# 18. Credential leak prevention and restrictive modes (umask 077)
test_secret_leak_prevention_and_restrictive_modes() {
  local test_dir="${TEST_TEMP_ROOT}/test_secret_leak"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  local SECRET_MARKER="TEST_SECRET_DO_NOT_LEAK_xyz987654"

  cat <<EOF > "${home_bin}/agy"
#!/usr/bin/env bash
echo "Sensitive credential dump: Bearer ${SECRET_MARKER}" >&2
echo "Stdout sensitive dump: ${SECRET_MARKER}"
exit 1
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  # Verify secret marker never appears in terminal stdout or stderr
  if echo "$out" | grep -q "$SECRET_MARKER"; then
    fail "test_secret_leak_prevention_and_restrictive_modes" "Secret leaked to stdout/stderr!"
    return
  fi

  # Verify restrictive permissions: dir 700, files 600
  local dir_mode file_mode
  dir_mode="$(stat -f "%Lp" "${test_dir}/.ai-handoff")"
  local test_file
  test_file="$(ls "${test_dir}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"
  file_mode="$(stat -f "%Lp" "$test_file")"

  if [ "$code" -ne 0 ] && [ "$dir_mode" = "700" ] && [ "$file_mode" = "600" ]; then
    pass "test_secret_leak_prevention_and_restrictive_modes"
  else
    fail "test_secret_leak_prevention_and_restrictive_modes" "dir_mode=$dir_mode (expected 700), file_mode=$file_mode (expected 600)"
  fi
}

# 19. Python3 JSON parser validation: top-level object, exact status SUCCESS, non-empty string response
test_python_json_parser_validation() {
  local test_dir="${TEST_TEMP_ROOT}/test_json_val"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  echo "Prompt" > "${test_dir}/prompt.md"

  # Sub-case A: Valid JSON object with status SUCCESS and non-empty response -> PASS
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "READY"}'
EOF
  chmod +x "${home_bin}/agy"

  set +e
  local out_a
  out_a="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_a=$?
  set -e

  # Sub-case B: Top-level array instead of object -> FAIL
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '[{"status": "SUCCESS", "response": "READY"}]'
EOF
  set +e
  local out_b
  out_b="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_b=$?
  set -e

  # Sub-case C: Nested misleading SUCCESS -> FAIL
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "FAILED", "inner": {"status": "SUCCESS", "response": "READY"}}'
EOF
  set +e
  local out_c
  out_c="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_c=$?
  set -e

  # Sub-case D: Missing response -> FAIL
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS"}'
EOF
  set +e
  local out_d
  out_d="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_d=$?
  set -e

  # Sub-case E: Whitespace-only response -> FAIL
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "   \n\t  "}'
EOF
  set +e
  local out_e
  out_e="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_e=$?
  set -e

  # Sub-case F: Non-string response (array) -> FAIL
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": ["READY"]}'
EOF
  set +e
  local out_f
  out_f="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_f=$?
  set -e

  # Sub-case G: Malformed JSON syntax -> FAIL
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "READY"'
EOF
  set +e
  local out_g
  out_g="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code_g=$?
  set -e

  if [ "$code_a" -eq 0 ] && [ "$code_b" -ne 0 ] && [ "$code_c" -ne 0 ] && [ "$code_d" -ne 0 ] && [ "$code_e" -ne 0 ] && [ "$code_f" -ne 0 ] && [ "$code_g" -ne 0 ]; then
    pass "test_python_json_parser_validation"
  else
    fail "test_python_json_parser_validation" "a=$code_a, b=$code_b, c=$code_c, d=$code_d, e=$code_e, f=$code_f, g=$code_g"
  fi
}

# 20. Machine-readable completion record generated on success and failure
test_machine_readable_completion_records() {
  local test_dir="${TEST_TEMP_ROOT}/test_completion_records"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  echo "Prompt" > "${test_dir}/prompt.md"

  # Case A: Success record
  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "response": "All good"}'
EOF
  chmod +x "${home_bin}/agy"

  (cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" >/dev/null 2>&1)

  local comp_success
  comp_success="$(ls "${test_dir}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  # Verify no leftover .tmp files from atomic rename
  local tmp_count_a=0
  for f in "${test_dir}/.ai-handoff/".*tmp "${test_dir}/.ai-handoff/"*tmp; do
    [ -e "$f" ] && tmp_count_a=$((tmp_count_a + 1))
  done

  # Case B: Failure record in separate repo dir
  local test_dir_fail="${TEST_TEMP_ROOT}/test_completion_records_fail"
  setup_git_repo "$test_dir_fail"
  echo "Prompt" > "${test_dir_fail}/prompt.md"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo "Worker crashed" >&2
exit 17
EOF

  set +e
  (cd "$test_dir_fail" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir_fail}/prompt.md" >/dev/null 2>&1)
  set -e

  local comp_fail
  comp_fail="$(ls "${test_dir_fail}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  local tmp_count_b=0
  for f in "${test_dir_fail}/.ai-handoff/".*tmp "${test_dir_fail}/.ai-handoff/"*tmp; do
    [ -e "$f" ] && tmp_count_b=$((tmp_count_b + 1))
  done

  if [ -f "$comp_success" ] && grep -q '"status": "SUCCESS"' "$comp_success" && \
     grep -q '"worker_exit_code": 0' "$comp_success" && grep -q '"launcher_exit_code": 0' "$comp_success" && \
     [ -f "$comp_fail" ] && grep -q '"status": "FAILED"' "$comp_fail" && \
     grep -q '"worker_exit_code": 17' "$comp_fail" && grep -q '"launcher_exit_code": 17' "$comp_fail" && \
     [ "$tmp_count_a" -eq 0 ] && [ "$tmp_count_b" -eq 0 ]; then
    pass "test_machine_readable_completion_records"
  else
    fail "test_machine_readable_completion_records" "Completion record validation failed (tmp_a=$tmp_count_a, tmp_b=$tmp_count_b)"
  fi
}

# 21. Empty stdout response detected despite exit code 0
test_empty_stdout_detection() {
  local test_dir="${TEST_TEMP_ROOT}/test_empty_stdout"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -ne 0 ] && echo "$out" | grep -qi "empty stdout"; then
    pass "test_empty_stdout_detection"
  else
    fail "test_empty_stdout_detection" "Expected non-zero and empty stdout warning, code=$code, out=$out"
  fi
}

# 22. Denied actions in JSON envelope treated as BLOCKED, and explicit error treated as FAILED
test_denied_actions_and_error_envelope() {
  local fake_home="${TEST_TEMP_ROOT}/fake_home_envelope"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  # Case A: status SUCCESS but non-empty denied_actions -> BLOCKED, launcher exits 1, worker_exit_code 0
  local test_dir_a="${TEST_TEMP_ROOT}/test_envelope_denial_a"
  setup_git_repo "$test_dir_a"
  echo "Prompt A" > "${test_dir_a}/prompt.md"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "denied_actions": ["execute_command"], "response": "Should be blocked"}'
exit 0
EOF
  chmod +x "${home_bin}/agy"

  set +e
  local out_a
  out_a="$(cd "$test_dir_a" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir_a}/prompt.md" 2>&1)"
  local code_a=$?
  set -e

  local comp_a
  comp_a="$(ls "${test_dir_a}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  # Case B: status SUCCESS but non-empty error -> FAILED, launcher exits 1
  local test_dir_b="${TEST_TEMP_ROOT}/test_envelope_denial_b"
  setup_git_repo "$test_dir_b"
  echo "Prompt B" > "${test_dir_b}/prompt.md"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "error": "Explicit internal error", "response": "Should fail"}'
exit 0
EOF

  set +e
  local out_b
  out_b="$(cd "$test_dir_b" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir_b}/prompt.md" 2>&1)"
  local code_b=$?
  set -e

  local comp_b
  comp_b="$(ls "${test_dir_b}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  # Case C: empty denied_actions list and null error -> SUCCESS
  local test_dir_c="${TEST_TEMP_ROOT}/test_envelope_denial_c"
  setup_git_repo "$test_dir_c"
  echo "Prompt C" > "${test_dir_c}/prompt.md"

  cat <<'EOF' > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "SUCCESS", "denied_actions": [], "error": null, "response": "Success with empty envelope fields"}'
exit 0
EOF

  set +e
  local out_c
  out_c="$(cd "$test_dir_c" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir_c}/prompt.md" 2>&1)"
  local code_c=$?
  set -e

  local comp_c
  comp_c="$(ls "${test_dir_c}/.ai-handoff/"*_completion.json 2>/dev/null | head -n 1 || true)"

  if [ "$code_a" -eq 1 ] && [ -f "$comp_a" ] && \
     grep -q '"status": "BLOCKED"' "$comp_a" && \
     grep -q '"worker_exit_code": 0' "$comp_a" && \
     grep -q '"launcher_exit_code": 1' "$comp_a" && \
     [ "$code_b" -eq 1 ] && [ -f "$comp_b" ] && \
     grep -q '"status": "FAILED"' "$comp_b" && \
     [ "$code_c" -eq 0 ] && [ -f "$comp_c" ] && \
     grep -q '"status": "SUCCESS"' "$comp_c"; then
    pass "test_denied_actions_and_error_envelope"
  else
    fail "test_denied_actions_and_error_envelope" "code_a=$code_a, code_b=$code_b, code_c=$code_c"
  fi
}

# 23. Secret leak prevention in JSON status field
test_secret_leak_in_json_status() {
  local test_dir="${TEST_TEMP_ROOT}/test_secret_leak_status"
  setup_git_repo "$test_dir"
  local fake_home="${test_dir}/fake_home"
  local home_bin="${fake_home}/.local/bin"
  mkdir -p "$home_bin"

  local SECRET_SENTINEL="SECRET_TOKEN_IN_STATUS_abcdef12345"

  cat <<EOF > "${home_bin}/agy"
#!/usr/bin/env bash
echo '{"status": "${SECRET_SENTINEL}", "response": "Valid response"}'
exit 0
EOF
  chmod +x "${home_bin}/agy"

  echo "Prompt" > "${test_dir}/prompt.md"
  set +e
  local out
  out="$(cd "$test_dir" && HOME="$fake_home" PATH="/usr/bin:/bin" "$LAUNCHER" "${test_dir}/prompt.md" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -ne 0 ] && ! echo "$out" | grep -q "$SECRET_SENTINEL"; then
    pass "test_secret_leak_in_json_status"
  else
    fail "test_secret_leak_in_json_status" "Secret sentinel was emitted in launcher output! code=$code, out=$out"
  fi
}

echo "=== Running Gemini Launcher Unit Tests ==="
test_bad_argc_zero
test_bad_argc_multiple
test_missing_prompt
test_empty_prompt
test_unreadable_prompt
test_outside_git_repo
test_missing_binary
test_binary_preference
test_binary_fallback_to_path
test_relative_path_from_subdirectory_with_spaces
test_proper_root_cwd
test_byte_exact_prompt_preservation
test_exit_code_propagation
test_default_model_args_and_timeout_30m
test_timeout_validation
test_restrictive_models
test_soft_denial_observed_jetski_stderr
test_secret_leak_prevention_and_restrictive_modes
test_python_json_parser_validation
test_machine_readable_completion_records
test_empty_stdout_detection
test_denied_actions_and_error_envelope
test_secret_leak_in_json_status

echo ""
echo "=== Test Summary ==="
echo "Total:  $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ "$FAILED_TESTS" -gt 0 ]; then
  exit 1
fi
exit 0
