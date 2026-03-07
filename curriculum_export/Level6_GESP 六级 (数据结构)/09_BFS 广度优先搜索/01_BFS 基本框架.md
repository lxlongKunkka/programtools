# BFS 基本框架

---

> **章节 ID：** `6-9-1`  
> **所属专题：** 专题 9 — BFS 广度优先搜索  
> **所属等级：** Level 6 — GESP 六级 (数据结构)

## 教案内容

## 教学目标

*   **知识目标:**
    *   理解BFS（广度优先搜索）算法的核心思想：层序遍历，即“一层一层”地向外探索。
    *   掌握使用队列（数组模拟）实现BFS的基本框架，包括队列操作、`visited` 数组和距离记录。
    *   理解BFS在无权图（包括网格图）中寻找最短路径的原理和应用场景。
*   **能力目标:**
    *   能够独立设计并实现BFS算法解决简单的无权图或网格图的最短路径问题。
    *   能够分析BFS算法的时间和空间复杂度，并理解其效率优势。
    *   能够追踪BFS算法在具体图上的执行过程，预测其输出结果。
*   **素养目标:**
    *   培养学生结构化思维和抽象建模能力，将实际问题转化为图论问题。
    *   提升解决复杂问题的计算思维和算法设计能力。
    *   激发对数据结构与算法的兴趣，感受算法解决问题的优雅与高效。

===NEXT===

## 趣味引入

同学们，想象一下，你和你的小伙伴们正在玩一个超级大的迷宫游戏！这个迷宫里有很多岔路口，也有很多死胡同，但只有一个出口。你们的目标是：**以最快的速度，找到从起点到出口的最短路径！**

这时候，你们有两种探险策略：

1.  **“莽撞探险家”策略：** 小明一马当先，选一个方向就一直往前冲，直到撞墙或者走到死胡同才回头，换另一个方向继续冲。他可能会走很远很远，才发现原来出口就在旁边不远处。
2.  **“聪明搜救队”策略：** 小红组织了一个搜救队。她先派出一批探路员，每个人都从起点走“一步”，到达所有能直接到达的新位置。然后，她再把这些新位置的探路员组织起来，每个人再走“一步”，到达所有能从这些位置再走一步到达的新位置……这样一层一层地向外扩散，就像水波纹一样。

现在问题来了：哪种策略更有可能在最短的时间内找到最短路径呢？

没错，是小红的“聪明搜救队”策略！因为它总是优先探索离起点最近的地方，一旦找到出口，那条路径一定是“最短的”。这种“一层一层”向外扩散的搜索方式，就是我们今天要学习的——**广度优先搜索（BFS）**！

它就像在水里扔一颗石子，水波纹一层一层地向外扩散。先扩散到的地方，离石子落点就越近。BFS就是用这种方式，帮我们在图中“找出最近的邻居”。

===NEXT===

## 深度知识点讲解

### 1. BFS的本质：层序遍历

BFS，全称Breadth-First Search，中文叫“广度优先搜索”。它的核心思想是：从一个起点开始，先访问所有与起点直接相连的节点（第一层），然后访问所有与第一层节点直接相连但未被访问过的节点（第二层），依此类推，直到所有可达节点都被访问。

**为什么是“广度优先”？**
因为它像宽度一样向外扩展，先覆盖完当前层的所有节点，再去探索下一层。这与“深度优先搜索（DFS）”形成鲜明对比，DFS是“一条路走到黑”，BFS是“雨露均沾，全面撒网”。

**为什么在无权图能找到最短路径？**
因为BFS的“层序遍历”特性，它保证了：
*   所有距离起点1步的节点，一定比距离起点2步的节点先被访问。
*   所有距离起点2步的节点，一定比距离起点3步的节点先被访问。
*   ...
所以，当我们第一次访问到目标节点时，它所经过的路径长度一定是所有可能路径中最短的。

### 2. BFS的核心工具：队列（Queue）

要实现“层序遍历”，我们需要一个特殊的工具来帮助我们记住哪些节点是“下一层”要访问的，并且要保证“先进先出”的顺序。这个工具就是——**队列（Queue）**。

*   **队列的特性：** FIFO (First-In, First-Out)，先进先出。就像排队买票，先排队的人先买到票。
*   **为什么用队列？** 队列的先进先出特性完美符合BFS的需求：我们把当前层待访问的节点依次放入队列，当它们出队时，它们的邻居（下一层节点）又被依次放入队列。这样就保证了距离近的节点先出队，它们的邻居也就能更早地被探索。

**GESP L6 队列的实现：数组模拟**

在GESP L6中，我们不能直接使用C++标准库中的 `std::queue`，需要用数组来模拟队列。
我们需要一个数组 `q` 来存储队列中的元素，以及两个指针 `head` 和 `tail` 来分别指示队列的头部和尾部。

```cpp
int q[MAX_NODES]; // 存储队列元素的数组
int head = 0;      // 队列头部指针
int tail = 0;      // 队列尾部指针

// 入队操作 (Enqueue)
void push(int x) {
    q[tail++] = x; // 将元素x放入队列尾部，tail向后移动
}

// 出队操作 (Dequeue)
int pop() {
    return q[head++]; // 取出队列头部元素，head向后移动
}

// 判断队列是否为空
bool isEmpty() {
    return head == tail; // 如果head和tail相等，说明队列为空
}
```

### 3. BFS的基本步骤与框架

要进行BFS，我们通常需要以下几个“装备”：

1.  **图的表示：**
    *   **邻接矩阵 `int adj[N][N]`：** 如果节点数量 `N` 不大，且边数很多（稠密图），可以用邻接矩阵。`adj[u][v] = 1` 表示 `u` 和 `v` 之间有边。
    *   **邻接表（链式前向星）：** 对于节点数量 `N` 较大，但边数 `M` 相对较少（稀疏图），邻接表更高效。
        ```cpp
        int head[N];       // 存储每个节点的第一个邻居的索引
        int nxt[M * 2];    // 存储下一条边的索引 (M*2因为无向图每条边存两次)
        int to[M * 2];     // 存储这条边指向的节点
        int idx;           // 边的计数器

        void add(int u, int v) { // 添加从u到v的边
            to[idx] = v;
            nxt[idx] = head[u]; // 将新边插在u的链表头部
            head[u] = idx++;
        }
        // 在main函数或初始化时，所有head[i]设为-1，idx设为0
        ```
    *   **网格图：** 通常用二维数组 `char grid[R][C]` 或 `int map[R][C]` 来表示，每个单元格可以看作一个节点，其上下左右（或斜向）邻居是它的边。

2.  **`visited` 数组：** `bool vis[N]` 或 `int vis[N]`。
    *   **作用：** 记录每个节点是否已经被访问过。
    *   **为什么需要？** 防止重复访问同一个节点，避免陷入死循环（特别是有环图），也避免重复计算导致效率低下。
    *   **如何使用？** 节点第一次入队时，就标记为已访问 `vis[node] = true`。

3.  **`distance` 数组（可选但常用）：** `int d[N]`。
    *   **作用：** 记录从起点到每个节点的最短距离。
    *   **如何使用？** 起点距离为0，即 `d[start] = 0`。当节点 `u` 出队，其邻居 `v` 入队时，`d[v] = d[u] + 1`。

**BFS算法框架：**

```cpp
// 全局变量或结构体定义
// 图的表示 (邻接表或网格)
// 队列 (数组模拟)
int q[MAX_SIZE];
int head, tail;
// 访问标记
bool vis[MAX_NODES];
// 距离数组
int d[MAX_NODES];

void bfs(int start_node) {
    // 1. 初始化
    head = 0; tail = 0; // 清空队列
    for (int i = 0; i < MAX_NODES; ++i) { // 初始化所有节点为未访问，距离为-1 (或无限大)
        vis[i] = false;
        d[i] = -1; // -1表示不可达或未访问
    }

    // 2. 起点入队
    push(start_node);
    vis[start_node] = true;
    d[start_node] = 0; // 起点距离自己为0

    // 3. 循环搜索
    while (!isEmpty()) {
        int u = pop(); // 从队列头部取出一个节点

        // 遍历 u 的所有邻居 v
        // 如果是邻接表：
        for (int i = head[u]; i != -1; i = nxt[i]) {
            int v = to[i];
            if (!vis[v]) { // 如果 v 未被访问过
                push(v);
                vis[v] = true;
                d[v] = d[u] + 1; // 距离加1
                // 可以在这里做一些处理，比如如果v是目标节点，就可以直接返回了
            }
        }
        // 如果是网格图，则遍历上下左右四个方向
        // int dx[] = {-1, 1, 0, 0};
        // int dy[] = {0, 0, -1, 1};
        // for (int i = 0; i < 4; ++i) {
        //     int nx = u.x + dx[i];
        //     int ny = u.y + dy[i];
        //     // 检查 nx, ny 是否合法且未访问过
        //     if (isValid(nx, ny) && !vis[nx][ny]) {
        //         push({nx, ny});
        //         vis[nx][ny] = true;
        //         d[nx][ny] = d[u.x][u.y] + 1;
        //     }
        // }
    }
}
```

### 4. 时间与空间复杂度

*   **时间复杂度：O(V + E)**
    *   `V` 是节点（Vertex）的数量，`E` 是边（Edge）的数量。
    *   每个节点最多入队、出队一次。
    *   每条边（在无向图中，每条边会访问两次，分别从两个方向）最多被检查一次。
    *   因此，总时间与节点数和边数之和成正比。这是非常高效的！
*   **空间复杂度：O(V + E)**
    *   存储图的结构（邻接表）需要 `O(V + E)`。
    *   队列最多存储 `O(V)` 个节点。
    *   `visited` 数组和 `distance` 数组需要 `O(V)` 空间。
    *   所以总空间复杂度为 `O(V + E)`。

### 5. 常见误区与注意事项

*   **忘记初始化：** 队列、`visited` 数组、`distance` 数组在每次BFS前都要正确初始化。
*   **`visited` 标记时机：** 节点应该在**入队时**就标记为 `true`，而不是出队时。这样可以防止在队列中出现重复的节点，因为某个节点可能被它的多个邻居发现。
*   **边界条件：** 在网格图中，一定要检查新的坐标是否在合法范围内，以及是否是障碍物。
*   **处理多个连通分量：** 如果图不是连通的，一次BFS只能访问到起点所在的连通分量。如果需要遍历整个图，可能需要从每个未访问过的节点再次启动BFS。

===NEXT===

## 典型例题精讲

### 例题1：迷宫最短路径

**题目描述：**
给定一个 `R` 行 `C` 列的迷宫，迷宫由 `.` (通路)、`#` (墙壁)、`S` (起点) 和 `E` (终点) 组成。求从 `S` 到 `E` 的最短步数。如果无法到达，输出 -1。每次只能向上、下、左、右四个方向移动一格。

**输入示例：**
```
4 5
S.###
.#.#.
.###.
##.E.
```

**输出示例：**
```
6
```

**思路分析：**
1.  **建模：** 将迷宫看作一个网格图。每个可通行的单元格 `(x, y)` 是一个节点。相邻（上下左右）的两个可通行单元格之间有一条边。
2.  **状态：** 队列中存储的元素需要包含当前位置 `(x, y)` 和从起点到此位置的步数 `s`。我们可以用一个结构体或者直接用三个数组 `qx, qy, qs` 来模拟队列。
3.  **BFS过程：**
    *   找到起点 `S` 的坐标 `(sx, sy)`。
    *   将 `(sx, sy, 0)` 入队，并标记 `vis[sx][sy] = true`。
    *   当队列不为空时：
        *   取出队头元素 `(u_x, u_y, u_s)`。
        *   检查其四个方向的邻居 `(v_x, v_y)`：
            *   如果 `(v_x, v_y)` 合法（在迷宫范围内，不是墙壁 `#`，且未访问过）：
                *   如果 `(v_x, v_y)` 是终点 `E`，则 `u_s + 1` 就是最短步数，直接返回。
                *   否则，将 `(v_x, v_y, u_s + 1)` 入队，并标记 `vis[v_x][v_y] = true`。
    *   如果队列为空，但仍未找到终点，说明无法到达，返回 -1。

**代码实现：**

```cpp
#include <bits/stdc++.h> // 包含常用头文件，如iostream, cstdio等

using namespace std;

const int MAXN = 105; // 迷宫最大尺寸
char g[MAXN][MAXN];   // 存储迷宫地图
bool vis[MAXN][MAXN]; // 访问标记数组
int R, C;             // 迷宫的行数和列数

// 队列 (模拟)
int qx[MAXN * MAXN]; // 存储x坐标
int qy[MAXN * MAXN]; // 存储y坐标
int qs[MAXN * MAXN]; // 存储步数
int head, tail;      // 队列头尾指针

// 四个方向的偏移量 (上，下，左，右)
int dx[] = {-1, 1, 0, 0};
int dy[] = {0, 0, -1, 1};

// 检查坐标是否合法且可通行
bool isValid(int x, int y) {
    return x >= 0 && x < R && y >= 0 && y < C && g[x][y] != '#' && !vis[x][y];
}

int main() {
    ios_base::sync_with_stdio(false); // 优化输入输出
    cin.tie(NULL);

    cin >> R >> C;
    int sx, sy, ex, ey; // 起点和终点坐标

    for (int i = 0; i < R; ++i) {
        for (int j = 0; j < C; ++j) {
            cin >> g[i][j];
            if (g[i][j] == 'S') {
                sx = i;
                sy = j;
            } else if (g[i][j] == 'E') {
                ex = i;
                ey = j;
            }
        }
    }

    // 初始化队列和访问标记
    head = 0;
    tail = 0;
    for (int i = 0; i < R; ++i) {
        for (int j = 0; j < C; ++j) {
            vis[i][j] = false;
        }
    }

    // 起点入队
    qx[tail] = sx;
    qy[tail] = sy;
    qs[tail] = 0;
    tail++;
    vis[sx][sy] = true;

    int ans = -1; // 存储最短步数，初始化为-1表示未找到

    // BFS主循环
    while (head < tail) { // 队列不为空
        int ux = qx[head];
        int uy = qy[head];
        int us = qs[head];
        head++; // 出队

        if (ux == ex && uy == ey) { // 找到终点
            ans = us;
            break; // 找到最短路径，可以直接退出
        }

        // 遍历四个方向的邻居
        for (int i = 0; i < 4; ++i) {
            int vx = ux + dx[i];
            int vy = uy + dy[i];

            if (isValid(vx, vy)) { // 如果邻居合法且未访问过
                qx[tail] = vx;
                qy[tail] = vy;
                qs[tail] = us + 1; // 步数加1
                tail++;           // 入队
                vis[vx][vy] = true; // 标记为已访问
            }
        }
    }

    cout << ans << endl;

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度：** `O(R * C)`。每个迷宫单元格最多入队、出队一次，每个单元格最多检查其4个邻居。所以总操作次数与单元格总数 `R * C` 成正比。
*   **空间复杂度：** `O(R * C)`。 `g` 数组、`vis` 数组、队列 `qx, qy, qs` 都需要 `O(R * C)` 的空间。

### 例题2：无权图最短路径

**题目描述：**
给定一个 `N` 个点 `M` 条边的无向图。求从指定起点 `S` 到所有其他点的最短路径长度。如果某个点无法到达，则输出 -1。

**输入示例：**
```
5 5 1  // N=5, M=5, S=1 (起点)
1 2
1 3
2 4
3 4
4 5
```

**输出示例：**
```
0 1 1 2 3  // 0到1距离0, 1到2距离1, 1到3距离1, 1到4距离2, 1到5距离3
```

**思路分析：**
1.  **建模：** 直接就是图。节点编号从1到N。
2.  **图的表示：** 由于可能节点数较多，边数相对少，使用邻接表（链式前向星）存储图是高效的选择。
3.  **状态：** 队列中存储节点编号 `u`。
4.  **BFS过程：**
    *   初始化 `d` 数组为 -1（表示不可达），`vis` 数组为 `false`。
    *   将起点 `S` 入队，标记 `vis[S] = true`，`d[S] = 0`。
    *   当队列不为空时：
        *   取出队头节点 `u`。
        *   遍历 `u` 的所有邻居 `v`：
            *   如果 `v` 未被访问过 `(!vis[v])`：
                *   将 `v` 入队。
                *   标记 `vis[v] = true`。
                *   更新 `d[v] = d[u] + 1`。

**代码实现：**

```cpp
#include <bits/stdc++.h>

using namespace std;

const int MAXN = 10005; // 最大节点数
const int MAXM = 20005; // 最大边数 (无向图 M*2)

// 邻接表 (链式前向星)
int head[MAXN]; // 存储每个节点的第一个邻居的索引
int nxt[MAXM];  // 存储下一条边的索引
int to[MAXM];   // 存储这条边指向的节点
int idx;        // 边的计数器

// 队列 (模拟)
int q[MAXN];
int head_q, tail_q;

// 访问标记和距离数组
bool vis[MAXN];
int d[MAXN];

// 添加边函数
void add(int u, int v) {
    to[idx] = v;
    nxt[idx] = head[u];
    head[u] = idx++;
}

void bfs(int s_node, int n_nodes) {
    // 1. 初始化
    head_q = 0;
    tail_q = 0;
    for (int i = 1; i <= n_nodes; ++i) { // 节点编号从1开始
        vis[i] = false;
        d[i] = -1; // -1表示不可达或未访问
    }

    // 2. 起点入队
    q[tail_q++] = s_node;
    vis[s_node] = true;
    d[s_node] = 0;

    // 3. 循环搜索
    while (head_q < tail_q) { // 队列不为空
        int u = q[head_q++]; // 出队

        // 遍历u的所有邻居
        for (int i = head[u]; i != -1; i = nxt[i]) {
            int v = to[i];
            if (!vis[v]) { // 如果v未被访问过
                q[tail_q++] = v; // 入队
                vis[v] = true;   // 标记为已访问
                d[v] = d[u] + 1; // 距离更新
            }
        }
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, m, s; // 节点数N，边数M，起点S
    cin >> n >> m >> s;

    // 初始化邻接表
    for (int i = 1; i <= n; ++i) {
        head[i] = -1; // 所有head初始化为-1
    }
    idx = 0;

    // 读取边
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        add(u, v); // 无向图，双向加边
        add(v, u);
    }

    bfs(s, n); // 执行BFS

    // 输出结果
    for (int i = 1; i <= n; ++i) {
        cout << d[i] << (i == n ? "" : " ");
    }
    cout << endl;

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度：** `O(N + M)`。每个节点最多入队、出队一次，每条边（在无向图中，因为双向加边，实际上是 `2M` 条边）最多被检查一次。
*   **空间复杂度：** `O(N + M)`。邻接表 `head, nxt, to` 需要 `O(N+M)` 空间，队列 `q`、`vis` 数组、`d` 数组需要 `O(N)` 空间。总计 `O(N+M)`。

===NEXT===

## 代码实现模板

这里提供一个通用的BFS模板，适用于大多数图或网格问题。

```cpp
#include <bits/stdc++.h> // 包含常用头文件

using namespace std;

// === 常量定义 ===
const int MAX_NODES = 100005; // 最大节点数，根据题目调整
const int MAX_EDGES = 200005; // 最大边数 (无向图通常是节点数的几倍，记得乘2)
const int INF = 0x3f3f3f3f;   // 无穷大，用于初始化距离

// === 图的表示 (邻接表 - 链式前向星) ===
int head[MAX_NODES]; // 存储每个节点的第一条边的索引
int nxt[MAX_EDGES];  // 存储下一条边的索引
int to[MAX_EDGES];   // 存储这条边指向的节点
int idx;             // 边的计数器，每次添加新边递增

// 添加边函数 (从u到v)
void add_edge(int u, int v) {
    to[idx] = v;
    nxt[idx] = head[u]; // 将新边插入到u的邻接链表的头部
    head[u] = idx++;    // 更新u的头部，并增加边的计数器
}

// === 队列模拟 (使用数组) ===
int q_data[MAX_NODES]; // 存储队列中的节点数据
int q_head, q_tail;    // 队列头尾指针

// 入队操作
void q_push(int val) {
    q_data[q_tail++] = val;
}

// 出队操作
int q_pop() {
    return q_data[q_head++];
}

// 判断队列是否为空
bool q_is_empty() {
    return q_head == q_tail;
}

// === BFS相关数据结构 ===
bool visited[MAX_NODES]; // 标记节点是否被访问过
int dist[MAX_NODES];     // 存储从起点到各个节点的最短距离

// === BFS函数 ===
// 参数：start_node - 起始节点，num_nodes - 图中总节点数
void bfs(int start_node, int num_nodes) {
    // 1. 初始化所有节点状态
    q_head = 0; q_tail = 0; // 重置队列
    for (int i = 1; i <= num_nodes; ++i) { // 假设节点从1开始编号
        visited[i] = false; // 所有节点标记为未访问
        dist[i] = -1;       // 所有距离初始化为-1 (表示不可达或未计算)
                            // 如果需要INF，则初始化为INF
    }

    // 2. 起点入队并初始化其状态
    q_push(start_node);
    visited[start_node] = true; // 标记起点已访问
    dist[start_node] = 0;       // 起点到自己的距离为0

    // 3. BFS主循环：当队列不为空时，持续进行搜索
    while (!q_is_empty()) {
        int u = q_pop(); // 从队列头部取出一个节点u

        // 遍历节点u的所有邻居v
        // 通过邻接表遍历：从head[u]开始，沿着nxt链表直到-1
        for (int i = head[u]; i != -1; i = nxt[i]) {
            int v = to[i]; // 当前邻居节点v

            // 如果邻居v没有被访问过
            if (!visited[v]) {
                q_push(v);             // 将v入队
                visited[v] = true;     // 标记v为已访问
                dist[v] = dist[u] + 1; // 更新v的最短距离 (距离u的距离+1)

                // 可以在这里添加特定问题的逻辑，例如：
                // if (v == target_node) {
                //     // 找到了目标，可以直接返回 dist[v]
                //     return;
                // }
            }
        }
    }
}

// === 主函数 ===
int main() {
    // 优化C++标准输入输出流
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, m; // n: 节点数, m: 边数
    cin >> n >> m;

    // 初始化邻接表：所有head设为-1，idx设为0
    for (int i = 1; i <= n; ++i) { // 节点编号从1开始
        head[i] = -1;
    }
    idx = 0; // 重置边计数器

    // 读取m条边，并添加到邻接表
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        add_edge(u, v); // 添加从u到v的边
        add_edge(v, u); // 如果是无向图，需要添加从v到u的边
    }

    int start_node; // 起点
    cin >> start_node;

    // 执行BFS
    bfs(start_node, n);

    // 输出结果 (例如，输出所有节点到起点的最短距离)
    for (int i = 1; i <= n; ++i) {
        cout << dist[i] << (i == n ? "" : " ");
    }
    cout << endl;

    return 0;
}
```

**网格图BFS模板的额外说明：**
对于网格图，`add_edge` 函数和邻接表部分可以省略，直接在 `bfs` 函数内部遍历 `dx, dy` 数组来获取邻居。
队列中存储的不再是单个节点编号，而是结构体 `struct Node { int x, y; };` 或者两个数组 `qx[], qy[]`。

```cpp
// 网格图方向数组
int dx[] = {-1, 1, 0, 0}; // 上，下，左，右
int dy[] = {0, 0, -1, 1};

// 检查 (x, y) 是否在网格内，是否是障碍，是否已访问
bool is_valid(int x, int y, int R, int C, char grid[MAX_R][MAX_C], bool visited[MAX_R][MAX_C]) {
    return x >= 0 && x < R && y >= 0 && y < C && grid[x][y] != '#' && !visited[x][y];
}

// 队列存储 (x, y) 坐标
int qx[MAX_R * MAX_C], qy[MAX_R * MAX_C];
int q_head, q_tail;

// BFS函数 (网格图版本)
void bfs_grid(int start_x, int start_y, int R, int C, char grid[MAX_R][MAX_C]) {
    q_head = 0; q_tail = 0;
    for (int i = 0; i < R; ++i) {
        for (int j = 0; j < C; ++j) {
            visited[i][j] = false;
            dist[i][j] = -1;
        }
    }

    qx[q_tail] = start_x;
    qy[q_tail] = start_y;
    q_tail++;
    visited[start_x][start_y] = true;
    dist[start_x][start_y] = 0;

    while (q_head < q_tail) {
        int ux = qx[q_head];
        int uy = qy[q_head];
        q_head++;

        for (int i = 0; i < 4; ++i) {
            int vx = ux + dx[i];
            int vy = uy + dy[i];

            if (is_valid(vx, vy, R, C, grid, visited)) {
                qx[q_tail] = vx;
                qy[q_tail] = vy;
                q_tail++;
                visited[vx][vy] = true;
                dist[vx][vy] = dist[ux][uy] + 1;
                // if (grid[vx][vy] == 'E') { /* 找到终点 */ }
            }
        }
    }
}
```

===NEXT===

## 课堂互动

1.  **提问1：** 假设你在一个有很多房间的房子里，每个房间都有门通向其他房间。你想找到离你当前房间“最近”的那个宝藏房间。你会选择“一条路走到黑”的DFS，还是“一层一层探索”的BFS？为什么？
    *   **预期回答：** BFS。因为BFS会先探索离起点近的房间，一旦找到，就是最短路径。
2.  **提问2：** 在BFS中，我们为什么要使用 `visited` 数组？如果一个节点被访问了多次，会发生什么？
    *   **预期回答：** 防止重复访问，避免死循环（特别是图中存在环时），也避免重复计算导致效率低下。如果重复访问，队列会变得很大，计算量增加，甚至可能无限循环。
3.  **提问3：** 队列的“先进先出”特性对于BFS来说为什么如此重要？如果用栈（先进后出）来代替队列，那会变成什么算法？
    *   **预期回答：** 队列保证了离起点