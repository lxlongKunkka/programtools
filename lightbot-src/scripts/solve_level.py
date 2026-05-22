#!/usr/bin/env python3
"""
Lightbot level BFS solver.

Usage:
  python scripts/solve_level.py src/content/levels/swf-ch1/level-001.json
  python scripts/solve_level.py --all          # solve all levels
  python scripts/solve_level.py --max-depth 15 src/content/levels/...
"""

import json
import sys
import argparse
import glob
import os
from collections import deque

# ── Direction helpers ─────────────────────────────────────────────────────────

DIR_DELTA = {'N': (0, -1), 'E': (1, 0), 'S': (0, 1), 'W': (-1, 0)}

# SWF-recovered levels may use full lowercase names
_DIR_NORM = {'north': 'N', 'south': 'S', 'east': 'E', 'west': 'W',
             'N': 'N', 'S': 'S', 'E': 'E', 'W': 'W'}

def norm_dir(d: str) -> str:
    return _DIR_NORM.get(d, d)

def rotate_left(d: str) -> str:
    return {'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N'}[d]

def rotate_right(d: str) -> str:
    return {'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N'}[d]

# ── Grid helpers ──────────────────────────────────────────────────────────────

def get_tile(grid, x, y):
    if 0 <= y < len(grid) and 0 <= x < len(grid[y]):
        return grid[y][x]
    return None

# ── Single-step simulation (mirrors interpreter.ts) ──────────────────────────

def apply_action(action: str, robot: tuple, grid: list, collected: frozenset):
    """
    robot = (x, y, z, direction)
    Returns (new_robot, new_collected).
    Never raises — invalid moves are silently skipped (same as the game engine).
    """
    x, y, z, d = robot

    if action in ('turnLeft', 'left'):
        return (x, y, z, rotate_left(d)), collected

    if action in ('turnRight', 'right'):
        return (x, y, z, rotate_right(d)), collected

    if action == 'pickup':
        tile = get_tile(grid, x, y)
        if tile and tile['kind'] == 'coin' and (x, y) not in collected:
            return (x, y, z, d), collected | {(x, y)}
        return robot, collected

    dx, dy = DIR_DELTA[d]
    tx, ty = x + dx, y + dy
    target = get_tile(grid, tx, ty)

    if not target or target['kind'] in ('void', 'obstacle'):
        return robot, collected   # silently skip

    if action == 'forward':
        if target['height'] != z:
            return robot, collected  # height mismatch → skip
        return (tx, ty, target['height'], d), collected

    if action == 'jump':
        delta = target['height'] - z
        if delta not in (1, -1):
            return robot, collected  # only ±1 allowed
        return (tx, ty, target['height'], d), collected

    return robot, collected

# ── BFS solver ────────────────────────────────────────────────────────────────

# Blocks that map directly to single actions (flat programs only).
# call-f1 / f2Call / repeat need a separate recursive search — not done here.
FLAT_ACTIONS = {'forward', 'turnLeft', 'turnRight', 'left', 'right', 'jump', 'pickup'}

def solve(level: dict, max_depth: int | None = None) -> tuple[int | None, list | None]:
    """
    BFS over flat action sequences.
    Returns (steps, sequence) on success, (None, None) if unsolvable within max_depth.
    """
    grid = level['grid']
    available_blocks = set(level.get('availableBlocks', []))
    # Normalize: treat 'left'/'right' and 'turnLeft'/'turnRight' as the same capability
    canonical = []
    has_turn_left  = 'left' in available_blocks or 'turnLeft' in available_blocks
    has_turn_right = 'right' in available_blocks or 'turnRight' in available_blocks
    if 'forward' in available_blocks: canonical.append('forward')
    if has_turn_left:  canonical.append('left')
    if has_turn_right: canonical.append('right')
    if 'jump' in available_blocks: canonical.append('jump')
    if 'pickup' in available_blocks: canonical.append('pickup')
    actions = canonical

    if not actions:
        return None, None

    # Collect all coin positions
    coins = frozenset(
        (x, y)
        for y, row in enumerate(grid)
        for x, cell in enumerate(row)
        if cell['kind'] == 'coin'
    )
    if not coins:
        return 0, []   # no coins → trivially complete

    constraints = level.get('constraints', {})
    if max_depth is None:
        max_depth = constraints.get('maxMainBlocks', 14)

    r = level['robot']
    init_robot = (r['x'], r['y'], r['z'], norm_dir(r['direction']))
    init_collected: frozenset = frozenset()
    init_state = (init_robot, init_collected)

    # BFS: each node = (state, sequence_so_far)
    # State = ((x,y,z,dir), frozenset_of_collected_coins)
    visited: set = {init_state}
    queue: deque = deque([(init_state, [])])

    while queue:
        (robot, collected), seq = queue.popleft()

        if len(seq) >= max_depth:
            continue

        for action in actions:
            new_robot, new_collected = apply_action(action, robot, grid, collected)
            new_seq = seq + [action]
            new_state = (new_robot, new_collected)

            if new_collected == coins:
                return len(new_seq), new_seq

            if new_state not in visited:
                visited.add(new_state)
                queue.append((new_state, new_seq))

    return None, None

# ── Star rating ───────────────────────────────────────────────────────────────

def star_rating(steps: int, level: dict) -> str:
    constraints = level.get('constraints', {})
    rec = constraints.get('recommendedSteps')
    max_main = constraints.get('maxMainBlocks')
    if rec is None:
        return '(no star config)'
    if steps <= rec:
        return '⭐⭐⭐'
    if max_main is not None:
        mid = (rec + max_main) // 2
        if steps <= mid:
            return f'⭐⭐  (optimal ≤{rec})'
    return f'⭐   (optimal ≤{rec})'

# ── CLI ───────────────────────────────────────────────────────────────────────

def solve_file(path: str, max_depth: int | None, verbose: bool = True) -> dict:
    with open(path, encoding='utf-8') as f:
        level = json.load(f)

    level_id    = level.get('id', os.path.basename(path))
    title       = level.get('title', '')
    constraints = level.get('constraints', {})
    rec         = constraints.get('recommendedSteps')
    max_main    = constraints.get('maxMainBlocks')
    available   = level.get('availableBlocks', [])

    has_functions = any(b in available for b in ('f1Call', 'f2Call', 'repeat'))

    steps, solution = solve(level, max_depth)

    result = {
        'id': level_id,
        'title': title,
        'solvable': solution is not None,
        'steps': steps,
        'solution': solution,
        'rec': rec,
        'max': max_main,
        'has_functions': has_functions,
    }

    if verbose:
        status = '✅' if solution else '❌'
        fn_note = ' [有函数/repeat，仅验证平铺解]' if has_functions else ''
        print(f'{status} {level_id}  "{title}"{fn_note}')
        if solution:
            print(f'   最优解: {steps} 步  {star_rating(steps, level)}')
            print(f'   程序: {" → ".join(solution)}')
        else:
            print(f'   ❌ 在 {max_depth or max_main} 步内无解（可能需要函数/repeat）')

    return result

def main():
    parser = argparse.ArgumentParser(description='Lightbot level BFS solver')
    parser.add_argument('level_files', nargs='*', help='Path(s) to level JSON file(s)')
    parser.add_argument('--all', action='store_true', help='Solve all levels in src/content/levels/')
    parser.add_argument('--max-depth', type=int, default=None, help='Override max search depth')
    args = parser.parse_args()

    files: list[str] = list(args.level_files)
    if args.all:
        files = sorted(glob.glob('src/content/levels/**/*.json', recursive=True))

    if not files:
        parser.print_help()
        sys.exit(1)

    results = [solve_file(f, args.max_depth) for f in files]

    if len(results) > 1:
        total       = len(results)
        solved      = sum(1 for r in results if r['solvable'])
        unsolvable  = total - solved
        print()
        print(f'── 汇总: {total} 个关卡，{solved} 个可解，{unsolvable} 个无解（可能需要函数）')

if __name__ == '__main__':
    main()
