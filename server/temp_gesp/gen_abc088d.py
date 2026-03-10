from cyaron import *
import random as py_random
import sys, os
sys.setrecursionlimit(10000)
os.makedirs('./testdata', exist_ok=True)

# BFS 判断连通性
def has_path(grid, H, W):
    from collections import deque
    if grid[0][0] == '#' or grid[H-1][W-1] == '#':
        return False
    dq = deque([(0, 0)])
    vis = [[False]*W for _ in range(H)]
    vis[0][0] = True
    while dq:
        r, c = dq.popleft()
        if (r, c) == (H-1, W-1):
            return True
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            rr, cc = r+dr, c+dc
            if 0 <= rr < H and 0 <= cc < W and not vis[rr][cc] and grid[rr][cc] == '.':
                vis[rr][cc] = True
                dq.append((rr, cc))
    return False

# 迭代版随机 DFS 自回避路径（避免递归爆栈）
def random_dfs_path(H, W):
    visited = [[False]*W for _ in range(H)]
    stack = [[(0, 0), None]]  # [当前节点, 邻居迭代器]
    path = []
    visited[0][0] = True

    while stack:
        node = stack[-1][0]
        if stack[-1][1] is None:
            nbrs = [(node[0]+1, node[1]), (node[0]-1, node[1]),
                    (node[0], node[1]+1), (node[0], node[1]-1)]
            py_random.shuffle(nbrs)
            stack[-1][1] = iter(nbrs)
            path.append(node)
        if node == (H-1, W-1):
            return path
        moved = False
        for rr, cc in stack[-1][1]:
            if 0 <= rr < H and 0 <= cc < W and not visited[rr][cc]:
                visited[rr][cc] = True
                stack.append([(rr, cc), None])
                moved = True
                break
        if not moved:
            path.pop()
            stack.pop()
    return None  # 理论上不会到这里

for test_id in range(1, 21):
    io = IO(file_prefix='./testdata/data', data_id=test_id)

    # 1. 最小全白 2×2，答案 = 4-2-2 = 0（只有起终点和一个对角格，最短路3步）
    if test_id == 1:
        H, W = 2, 2
        grid = [['.' for _ in range(W)] for _ in range(H)]

    # 2. 最小无路 2×2，起终点外全黑，答案 -1
    elif test_id == 2:
        H, W = 2, 2
        grid = [['#']*W for _ in range(H)]
        grid[0][0] = grid[H-1][W-1] = '.'
        assert not has_path(grid, H, W)

    # 3. 手工绕行样例 3×4
    elif test_id == 3:
        H, W = 3, 4
        grid = [list('.#..'), list('.#.#'), list('....')]
        assert has_path(grid, H, W)

    # 4. 小随机 (2~5) 30% 黑，保证有路
    elif test_id == 4:
        while True:
            H, W = randint(2, 5), randint(2, 5)
            grid = [['.' if py_random.random() > 0.3 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if has_path(grid, H, W):
                break

    # 5. 小随机 (2~5) 70% 黑，保证有路
    elif test_id == 5:
        while True:
            H, W = randint(2, 5), randint(2, 5)
            grid = [['.' if py_random.random() > 0.7 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if has_path(grid, H, W):
                break

    # 6. 小随机 (2~5)，保证无路
    elif test_id == 6:
        while True:
            H, W = randint(2, 5), randint(2, 5)
            grid = [['.' if py_random.random() > 0.5 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if not has_path(grid, H, W):
                break

    # 7. 手工蛇形狭窄唯一路径 5×5（考察路径唯一时分数 = 白格数 - 路径长度）
    elif test_id == 7:
        H, W = 5, 5
        grid = [['#']*W for _ in range(H)]
        path7 = [(0,0),(0,1),(1,1),(1,2),(2,2),(2,3),(3,3),(3,4),(4,4)]
        for r, c in path7:
            grid[r][c] = '.'
        assert has_path(grid, H, W)

    # 8. 中等随机 (10~20) 30% 黑，保证有路
    elif test_id == 8:
        while True:
            H, W = randint(10, 20), randint(10, 20)
            grid = [['.' if py_random.random() > 0.3 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if has_path(grid, H, W):
                break

    # 9. 中等随机 (10~20) 70% 黑，保证有路
    elif test_id == 9:
        while True:
            H, W = randint(10, 20), randint(10, 20)
            grid = [['.' if py_random.random() > 0.7 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if has_path(grid, H, W):
                break

    # 10. 中等随机 (10~20)，保证无路
    elif test_id == 10:
        while True:
            H, W = randint(10, 20), randint(10, 20)
            grid = [['.' if py_random.random() > 0.5 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if not has_path(grid, H, W):
                break

    # 11. 阶梯状宽路 21×21（每行最多2个黑格连通处）
    elif test_id == 11:
        H, W = 21, 21
        grid = [['#']*W for _ in range(H)]
        for r in range(H):
            if r % 2 == 0:
                for c in range(W):
                    grid[r][c] = '.'
            else:
                grid[r][0] = grid[r][W-1] = '.'
        assert has_path(grid, H, W)

    # 12. 棋盘图 20×20（白格 4-邻域全黑，无任何连通路径，答案 -1）
    elif test_id == 12:
        H, W = 20, 20
        grid = [['.' if (r+c) % 2 == 0 else '#' for c in range(W)] for r in range(H)]
        assert not has_path(grid, H, W)

    # 13. 大随机 (50×50) 30% 黑，保证有路
    elif test_id == 13:
        while True:
            H, W = 50, 50
            grid = [['.' if py_random.random() > 0.3 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if has_path(grid, H, W):
                break

    # 14. 大随机 (50×50) 70% 黑，保证有路
    elif test_id == 14:
        while True:
            H, W = 50, 50
            grid = [['.' if py_random.random() > 0.7 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if has_path(grid, H, W):
                break

    # 15. 大随机 (50×50)，保证无路（切断所有路径）
    elif test_id == 15:
        while True:
            H, W = 50, 50
            grid = [['.' if py_random.random() > 0.5 else '#' for _ in range(W)] for _ in range(H)]
            grid[0][0] = grid[H-1][W-1] = '.'
            if not has_path(grid, H, W):
                break

    # 16. 真正蛇形路径 50×50（只有蛇形路径是白，其余全黑；最大化黑格数同时保留唯一通路）
    #     蛇形：偶数行全白从左到右，奇数行仅最右（偶数行号对应）或最左列（奇数行号对应）一格
    elif test_id == 16:
        H, W = 50, 50
        grid = [['#']*W for _ in range(H)]
        for r in range(H):
            if r % 2 == 0:
                # 偶数行从左到右全白
                for c in range(W):
                    grid[r][c] = '.'
            else:
                # 奇数行只留右端或左端一格（连接上下偶数行的端点）
                if (r // 2) % 2 == 0:
                    grid[r][W-1] = '.'   # 上行末尾 → 下行末尾
                else:
                    grid[r][0] = '.'     # 上行开头 → 下行开头
        assert has_path(grid, H, W)

    # 17. 大棋盘图 50×50（同上，白格孤立，答案 -1）
    elif test_id == 17:
        H, W = 50, 50
        grid = [['.' if (r+c) % 2 == 0 else '#' for c in range(W)] for r in range(H)]
        assert not has_path(grid, H, W)

    # 18. 全白 50×50（答案最大值压力测试：白格数 - 最短路长度 = 2500-99 = 2401）
    elif test_id == 18:
        H, W = 50, 50
        grid = [['.']*W for _ in range(H)]

    # 19. 全黑仅留起终点 50×50，答案 -1
    elif test_id == 19:
        H, W = 50, 50
        grid = [['#']*W for _ in range(H)]
        grid[0][0] = grid[H-1][W-1] = '.'
        assert not has_path(grid, H, W)

    # 20. 随机 DFS 自回避路径 50×50（迭代版，避免递归爆栈）
    elif test_id == 20:
        H, W = 50, 50
        path = random_dfs_path(H, W)
        assert path is not None
        grid = [['#']*W for _ in range(H)]
        for r, c in path:
            grid[r][c] = '.'
        assert has_path(grid, H, W)

    # 写入输入
    io.input_writeln(H, W)
    for row in grid:
        io.input_writeln(''.join(row))
    io.output_gen('std.exe')
