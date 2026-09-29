#!/usr/bin/env python3
"""Check execution packet structure. Does not certify implementation or approval authority."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

def main():
    errors = []
    state = json.loads((HERE / 'TASK_STATUS.json').read_text())
    tasks = state['tasks']
    by_id = {t['id']: t for t in tasks}
    if len(by_id) != len(tasks):
        errors.append('duplicate task IDs')
    backlog = (ROOT / 'docs/EXECUTION_BACKLOG.md').read_text()
    listed = re.findall(r'- \[([ x])\] \*\*(B\d\d)\b', backlog)
    if len(listed) != len(tasks) or {i for _, i in listed} != set(by_id):
        errors.append('backlog and status IDs/counts disagree')
    marks = {i: mark for mark, i in listed}
    cp_text = (HERE / 'CHECKPOINTS.md').read_text()
    cp_rows = {}
    for line in cp_text.splitlines():
        if re.match(r'\| C\d', line):
            cells = [x.strip() for x in line.strip('|').split('|')]
            cp_rows[cells[0]] = cells
    found = []
    order = {}
    for c, cells in cp_rows.items():
        ids = re.findall(r'B\d\d', cells[2])
        for i in ids:
            order[i] = len(found)
            found.append(i)
        if cells[3] not in {'accepted', 'released', 'locked', 'blocked'}:
            errors.append(f'{c}: invalid release')
    if len(found) != len(tasks) or set(found) != set(by_id):
        errors.append('checkpoint task partition disagrees with status')
    allowed = {'pending', 'in_progress', 'ready_for_review', 'blocked', 'changes_requested', 'done'}
    for t in tasks:
        i = t['id']
        if t['status'] not in allowed:
            errors.append(f'{i}: invalid status')
        p = HERE / t['prompt']
        if not p.is_file() or not p.read_text().startswith(f'# {i} '):
            errors.append(f'{i}: missing/mismatched prompt')
        if t['checkpoint'] not in cp_rows or i not in re.findall(r'B\d\d', cp_rows[t['checkpoint']][2]):
            errors.append(f'{i}: checkpoint mismatch')
        for d in t['dependencies']:
            if d not in by_id or d == i:
                errors.append(f'{i}: invalid dependency {d}')
            elif order.get(d, 999) >= order.get(i, -1):
                errors.append(f'{i}: dependency {d} is not scheduled earlier')
        if (marks.get(i) == 'x') != (t['status'] == 'done'):
            errors.append(f'{i}: checkbox/status mismatch')
        if t['status'] == 'blocked' and not t.get('blocked_reason'):
            errors.append(f'{i}: blocked without reason')
        if t['status'] in {'ready_for_review', 'done'}:
            if not re.fullmatch(r'[0-9a-f]{7,40}', t.get('code_sha') or ''):
                errors.append(f'{i}: missing code revision')
            if i != 'B01' and not (HERE / (t.get('submission') or '__missing__')).is_file():
                errors.append(f'{i}: missing submission')
        if t['status'] == 'done':
            review = HERE / (t.get('review') or '__missing__')
            if not review.is_file() or 'APPROVED' not in review.read_text() or i not in review.read_text():
                errors.append(f'{i}: missing approval record')
    visiting, visited = set(), set()
    def visit(i):
        if i in visiting:
            errors.append(f'dependency cycle at {i}')
            return
        if i in visited:
            return
        visiting.add(i)
        for d in by_id[i]['dependencies']:
            if d in by_id:
                visit(d)
        visiting.remove(i)
        visited.add(i)
    for i in by_id:
        visit(i)
    docs = list(HERE.rglob('*.md')) + [ROOT / ('docs/' + n) for n in ['EXECUTION_BACKLOG.md','VISUAL_AND_UI_AUDIT.md','VISUAL_DESIGN_SPEC.md','COLOR_AND_GLASS_SYSTEM.md']]
    for p in docs:
        for target in re.findall(r'\]\(([^)]+)\)', p.read_text()):
            target = target.split('#')[0]
            if not target or re.match(r'^[a-z]+:', target) or target.startswith('<'):
                continue
            if not (p.parent / target).exists():
                errors.append(f'{p.relative_to(ROOT)}: broken link {target}')
    if errors:
        raise SystemExit('\n'.join(errors))
    done = sum(t['status'] == 'done' for t in tasks)
    print(f'PASS: {len(tasks)} tasks, {len(cp_rows)-1} implementation checkpoints, acyclic ordered prerequisites, prompt/link/status consistency. {done}/{len(tasks)} accepted ({done/len(tasks):.1%}, task count only).')

if __name__ == '__main__':
    main()
