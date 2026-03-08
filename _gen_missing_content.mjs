import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const CL = mongoose.model('CourseLevel', new mongoose.Schema({
  level: Number,
  topics: [{
    title: String, description: String,
    chapters: [{ _id: false, id: String, title: String, content: String, contentType: String, resourceUrl: String, problemIds: [String], optionalProblemIds: [String], optional: Boolean }]
  }]
}))

await mongoose.connect(process.env.APP_MONGODB_URI)

// ─────────────────────────────────────────────────────────────
const CONTENTS = {

'5-8-4': `## list 与 deque 的使用场景

STL 除了 \`vector\` 之外，还提供了 \`list\`（双向链表）和 \`deque\`（双端队列）两种容器，它们在特定场景下比 \`vector\` 更高效。

---

### std::list —— 双向链表

\`list\` 内部是一个**双向链表**，每个节点存储前驱和后继指针。

#### 核心特性

| 操作 | 时间复杂度 |
|------|-----------|
| 头尾插入/删除 | O(1) |
| 任意位置插入/删除（已有迭代器） | O(1) |
| 随机访问（下标） | ❌ 不支持 |
| 查找 | O(n) |

#### 基本用法

\`\`\`cpp
#include <list>
using namespace std;

list<int> lst;
lst.push_back(3);   // 尾插
lst.push_front(1);  // 头插
lst.push_back(5);
// lst: 1 3 5

// 遍历（只能用迭代器）
for (int x : lst) cout << x << " ";

// 删除值为 3 的元素
lst.remove(3);

// 在迭代器位置插入
auto it = lst.begin();
++it;
lst.insert(it, 2); // 在第二个位置前插入
\`\`\`

#### 适用场景

- 需要**频繁在中间插入/删除**的数据（如 LRU 缓存、任务调度队列）
- 竞赛中极少直接使用 \`list\`，了解概念即可

---

### std::deque —— 双端队列

\`deque\`（double-ended queue）支持**在头尾两端高效插入和删除**，同时支持随机访问。

#### 核心特性

| 操作 | 时间复杂度 |
|------|-----------|
| 头尾插入/删除 | O(1) |
| 随机访问（\`deque[i]\`） | O(1) |
| 中间插入/删除 | O(n) |

#### 基本用法

\`\`\`cpp
#include <deque>
using namespace std;

deque<int> dq;
dq.push_back(3);    // 尾插
dq.push_front(1);   // 头插
dq.push_back(5);
// dq: 1 3 5

cout << dq[1] << endl;  // 随机访问，输出 3
dq.pop_front();          // 头删
dq.pop_back();           // 尾删
\`\`\`

#### 与单调队列的关系

竞赛中的**单调队列**通常用 \`deque\` 实现（或直接用数组模拟头尾指针）：

\`\`\`cpp
deque<int> dq; // 存下标
for (int i = 0; i < n; i++) {
    // 弹出窗口外的元素
    while (!dq.empty() && dq.front() < i - k + 1)
        dq.pop_front();
    // 维护单调递减（求最大值）
    while (!dq.empty() && a[dq.back()] <= a[i])
        dq.pop_back();
    dq.push_back(i);
    if (i >= k - 1) cout << a[dq.front()] << " ";
}
\`\`\`

---

### 选择建议

| 需求 | 推荐容器 |
|------|---------|
| 频繁尾部操作 + 随机访问 | \`vector\` |
| 频繁头尾操作 + 随机访问 | \`deque\` |
| 频繁中间插入/删除 | \`list\` |
| 竞赛单调队列 | \`deque\` 或数组模拟 |
`,

'6-g-1': `## 图的基本概念

图（Graph）是计算机科学中最重要的数据结构之一，用于描述**事物之间的关系**。地图、社交网络、任务依赖关系都可以用图来建模。

---

### 什么是图

一个图 $G$ 由两个集合组成：
- **顶点集** $V$（Vertex）：图中的节点
- **边集** $E$（Edge）：连接两个顶点的关系

记作 $G = (V, E)$，其中 $n = |V|$ 为顶点数，$m = |E|$ 为边数。

---

### 有向图与无向图

#### 无向图

边没有方向，$(u, v)$ 和 $(v, u)$ 是同一条边。

\`\`\`
1 --- 2
|     |
3 --- 4
\`\`\`

#### 有向图

边有方向，$(u, v)$ 表示从 $u$ 指向 $v$，记作 $u \\to v$。

\`\`\`
1 --> 2
↑     |
3 <-- 4
\`\`\`

---

### 带权图

边上附带一个**权值**（如距离、费用、时间），称为带权图。

$$w(u, v) = \text{边 } (u,v) \text{ 的权值}$$

---

### 度数

- **无向图**中，顶点 $v$ 的**度**（degree）= 与 $v$ 相连的边数，记作 $\deg(v)$
- **有向图**中：
  - **入度**（in-degree）：指向 $v$ 的边数
  - **出度**（out-degree）：从 $v$ 出发的边数

> 握手定理：$\sum_{v \in V} \deg(v) = 2m$（无向图）

---

### 路径与连通性

- **路径**：从顶点 $u$ 到顶点 $v$ 经过的顶点序列
- **简单路径**：不重复经过任何顶点的路径
- **环（回路）**：起点和终点相同的路径
- **连通图**：无向图中任意两点间都有路径
- **强连通图**：有向图中任意两点间都有有向路径

---

### 常见图的种类

| 名称 | 特征 |
|------|------|
| 树 | $n$ 个顶点，$n-1$ 条边，无环连通图 |
| 完全图 | 任意两点都有边，共 $\frac{n(n-1)}{2}$ 条边 |
| 二分图 | 顶点可分为两组，边只在组间 |
| DAG | 有向无环图，常用于拓扑排序 |

---

### 竞赛中常见建图场景

- **最短路**：城市间距离 → 带权有向/无向图
- **拓扑排序**：任务依赖 → DAG
- **二分图匹配**：左右两组关系
- **网络流**：流量网络
`,

'6-g-2': `## 邻接矩阵与邻接表存储

图在程序中需要用数组或其他数据结构来存储，最常见的两种方式是**邻接矩阵**和**邻接表**。

---

### 邻接矩阵

用一个二维数组 \`g[u][v]\` 表示边的关系：

$$g[u][v] = \\begin{cases} w & \\text{若存在边 } (u,v)，权值为 w \\\\ 0 \\ \\text{或} \\ \\infty & \\text{不存在边} \\end{cases}$$

#### 代码示例

\`\`\`cpp
const int N = 105;
const int INF = 1e9;
int g[N][N];
int n, m;

int main() {
    // 初始化：无边为 INF（用于最短路），无边为0（用于连通判断）
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++)
            g[i][j] = (i == j) ? 0 : INF;

    // 读入无向带权图
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        g[u][v] = w;
        g[v][u] = w; // 无向图双向
    }
}
\`\`\`

#### 优缺点

| | 邻接矩阵 |
|--|---------|
| ✅ 优点 | O(1) 判断两点间是否有边；代码简单 |
| ❌ 缺点 | 空间 O(n²)，$n > 10^4$ 时不可用；无法存多重边 |
| 适用场景 | 稠密图（边多）、Floyd 全源最短路 |

---

### 邻接表

用 \`vector<int> adj[N]\` 或 \`vector<pair<int,int>> adj[N]\` 存储每个顶点的邻居列表。

#### 无权图

\`\`\`cpp
const int N = 1e5 + 5;
vector<int> adj[N];
int n, m;

int main() {
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u); // 无向图
    }

    // 遍历顶点 u 的所有邻居
    for (int v : adj[u]) {
        // 处理边 u->v
    }
}
\`\`\`

#### 带权图

\`\`\`cpp
vector<pair<int,int>> adj[N]; // {邻居, 权值}

adj[u].push_back({v, w});
adj[v].push_back({u, w}); // 无向图

// 遍历
for (auto [v, w] : adj[u]) {
    cout << u << "->" << v << " 权值:" << w << endl;
}
\`\`\`

#### 优缺点

| | 邻接表 |
|--|--------|
| ✅ 优点 | 空间 O(n+m)，适合稀疏图；可存多重边 |
| ❌ 缺点 | 判断两点是否有边需 O(度数) |
| 适用场景 | **竞赛绝大多数图题** |

---

### 如何选择

| 条件 | 推荐 |
|------|------|
| $n \leq 500$，Floyd | 邻接矩阵 |
| $n, m \leq 10^5$ 以上 | 邻接表 |
| 需要快速判断边存在 | 邻接矩阵 |
| DFS / BFS / Dijkstra | 邻接表 |
`,

'6-g-3': `## 链式前向星（数组模拟链表建图）

链式前向星是竞赛中**最常用的图存储方式**之一，用纯数组模拟链表，速度快、内存连续，适合大规模图。

---

### 为什么需要链式前向星

\`vector\` 邻接表虽然方便，但动态内存分配有常数开销。当边数 $m > 10^5$ 且时间要求严格时，链式前向星更快。

---

### 数据结构

维护四个数组：

| 数组 | 含义 |
|------|------|
| \`head[u]\` | 顶点 $u$ 的第一条边的编号（-1 表示无边） |
| \`to[i]\` | 第 $i$ 条边指向的终点 |
| \`w[i]\` | 第 $i$ 条边的权值 |
| \`nxt[i]\` | 第 $i$ 条边的下一条同起点边的编号（-1 结束） |

---

### 完整模板

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

const int N = 1e5 + 5;
const int M = 2e5 + 5; // 无向图边数×2

int head[N], to[M], w[M], nxt[M], cnt;

void init(int n) {
    fill(head + 1, head + n + 1, -1);
    cnt = 0;
}

// 添加一条有向边 u -> v，权值为 weight
void add(int u, int v, int weight) {
    to[cnt] = v;
    w[cnt] = weight;
    nxt[cnt] = head[u];
    head[u] = cnt++;
}

int main() {
    int n, m;
    cin >> n >> m;
    init(n);

    for (int i = 0; i < m; i++) {
        int u, v, weight;
        cin >> u >> v >> weight;
        add(u, v, weight);       // 有向图
        // add(v, u, weight);    // 无向图加这行
    }

    // 遍历顶点 u 的所有出边
    for (int i = head[u]; i != -1; i = nxt[i]) {
        int v = to[i], wi = w[i];
        cout << u << "->" << v << " 权值:" << wi << endl;
    }
}
\`\`\`

---

### 建图过程示意

以添加边 $1 \\to 3$（第0条），$1 \\to 2$（第1条）为例：

\`\`\`
初始: head[1] = -1

add(1, 3, 5):  to[0]=3, nxt[0]=-1, head[1]=0
add(1, 2, 2):  to[1]=2, nxt[1]=0, head[1]=1

遍历 head[1]:
  i=1: to[1]=2, w[1]=2, 下一条 nxt[1]=0
  i=0: to[0]=3, w[0]=5, 下一条 nxt[0]=-1 → 结束
\`\`\`

注意：**最后加入的边最先被遍历**（类似链表头插法）。

---

### 与邻接表对比

| | 链式前向星 | vector 邻接表 |
|--|-----------|--------------|
| 速度 | ✅ 更快 | 稍慢 |
| 代码量 | 稍多 | 简洁 |
| 内存 | 连续数组 | 动态分配 |
| 竞赛使用率 | 高（时限严格时） | 高（日常） |

---

### 练习建议

用链式前向星重写一道 BFS 最短路题目，与 \`vector\` 邻接表版本对比结果是否一致。
`,

'7-8-1': `## 全排列与回溯

**回溯**（Backtracking）是 DFS 的一种重要应用：在搜索过程中，如果发现当前路径不满足条件，就**回退一步**，尝试其他选择。全排列是回溯的经典入门题。

---

### 全排列问题

**题意：** 给定 $n$ 个不同的数，输出它们的所有排列，共 $n!$ 种。

例：$n=3$，数组为 $[1,2,3]$，共 6 种排列：
$$123, 132, 213, 231, 312, 321$$

---

### 回溯框架

\`\`\`
选择 → 递归 → 撤销选择
\`\`\`

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

int n;
int a[10], path[10];
bool used[10];

void dfs(int step) {
    if (step == n + 1) {
        // 找到一个完整排列
        for (int i = 1; i <= n; i++) cout << path[i] << " ";
        cout << endl;
        return;
    }
    for (int i = 1; i <= n; i++) {
        if (!used[i]) {
            used[i] = true;     // 选择 i
            path[step] = a[i];
            dfs(step + 1);      // 递归下一位
            used[i] = false;    // 撤销选择（回溯）
        }
    }
}

int main() {
    cin >> n;
    for (int i = 1; i <= n; i++) a[i] = i;
    dfs(1);
}
\`\`\`

---

### 执行过程图示（n=3）

\`\`\`
dfs(1)
├── 选1 → dfs(2)
│   ├── 选2 → dfs(3): 选3 → 输出 1 2 3 ✓
│   └── 选3 → dfs(3): 选2 → 输出 1 3 2 ✓
├── 选2 → dfs(2)
│   ├── 选1 → dfs(3): 选3 → 输出 2 1 3 ✓
│   └── 选3 → dfs(3): 选1 → 输出 2 3 1 ✓
└── 选3 → dfs(2)
    ├── 选1 → dfs(3): 选2 → 输出 3 1 2 ✓
    └── 选2 → dfs(3): 选1 → 输出 3 2 1 ✓
\`\`\`

---

### STL 写法（了解）

C++ STL 提供了 \`next_permutation\`，可以直接枚举所有排列：

\`\`\`cpp
int a[] = {1, 2, 3};
sort(a, a + 3); // 必须先排序（从最小排列开始）
do {
    for (int x : a) cout << x << " ";
    cout << endl;
} while (next_permutation(a, a + 3));
\`\`\`

---

### 回溯的关键要点

1. **选择**：在当前步骤枚举所有可能的选项
2. **约束**：用 \`used[]\` 等标记避免重复使用
3. **目标**：到达终止条件时记录/输出结果
4. **撤销**：递归返回后必须恢复状态（这是"回溯"的核心）

---

### 扩展：含重复元素的全排列

若数组中有重复元素，需要**排序 + 跳过重复**：

\`\`\`cpp
sort(a + 1, a + n + 1);
// 在 for 循环中加：
if (i > 1 && a[i] == a[i-1] && !used[i-1]) continue;
\`\`\`
`,

'8-sp-2': `## Bellman-Ford 算法与负权边处理

**Bellman-Ford** 算法能处理**含负权边**的单源最短路问题，并能检测**负权环**的存在。时间复杂度 $O(nm)$。

---

### 为什么 Dijkstra 不能处理负权边

Dijkstra 基于贪心思想——已确定的最短距离不会再被更新。但负权边可能让"已确定"的节点通过负权边获得更短路径，破坏贪心假设。

---

### Bellman-Ford 核心思想

**松弛操作**：对于边 $(u, v, w)$，若 $dist[u] + w < dist[v]$，则更新 $dist[v]$。

**关键定理：** 若图中不含负权环，则最短路最多经过 $n-1$ 条边。

因此，**对所有边重复松弛 $n-1$ 轮**，即可得到最短路。

---

### 代码模板

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

const int INF = 1e9;
const int N = 1e4 + 5;
const int M = 5e4 + 5;

struct Edge { int u, v, w; } edges[M];
int dist[N];
int n, m;

void bellman_ford(int src) {
    fill(dist + 1, dist + n + 1, INF);
    dist[src] = 0;

    // 松弛 n-1 轮
    for (int i = 1; i <= n - 1; i++) {
        bool updated = false;
        for (int j = 0; j < m; j++) {
            int u = edges[j].u, v = edges[j].v, w = edges[j].w;
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break; // 提前终止优化
    }
}

// 检测负权环：第 n 轮仍能松弛说明有负环
bool hasNegativeCycle() {
    for (int j = 0; j < m; j++) {
        int u = edges[j].u, v = edges[j].v, w = edges[j].w;
        if (dist[u] != INF && dist[u] + w < dist[v])
            return true;
    }
    return false;
}

int main() {
    cin >> n >> m;
    for (int i = 0; i < m; i++)
        cin >> edges[i].u >> edges[i].v >> edges[i].w;

    bellman_ford(1);

    if (hasNegativeCycle()) {
        cout << "存在负权环" << endl;
    } else {
        for (int i = 1; i <= n; i++)
            cout << (dist[i] == INF ? -1 : dist[i]) << endl;
    }
}
\`\`\`

---

### 算法流程图示

\`\`\`
初始: dist[src]=0, 其余=∞

第1轮松弛所有边:
  dist 数组更新为 "经过1条边能到达的最短距离"

第2轮松弛所有边:
  dist 数组更新为 "经过2条边能到达的最短距离"

...

第n-1轮松弛所有边:
  dist 数组 = 最终最短距离

第n轮仍有更新 → 存在负权环
\`\`\`

---

### 与 Dijkstra 对比

| | Bellman-Ford | Dijkstra |
|--|-------------|---------|
| 负权边 | ✅ 支持 | ❌ 不支持 |
| 负权环检测 | ✅ 支持 | ❌ 不支持 |
| 时间复杂度 | $O(nm)$ | $O((n+m)\\log n)$ |
| 适用场景 | 边数少、含负权 | 边数多、非负权 |

---

### 例题模板

- 差分约束系统（转化为最短路，可能有负权边）
- 含负权的图中求最短路并判断负环
`,

'8-sp-3': `## SPFA 算法与负环判断

**SPFA**（Shortest Path Faster Algorithm）是 Bellman-Ford 的**队列优化版本**，只对刚被更新的节点的邻居进行松弛，平均性能远优于 Bellman-Ford。

---

### 核心思想

Bellman-Ford 每轮遍历所有边，浪费大量时间在"没有更新"的边上。SPFA 用一个队列只处理**距离被更新过**的顶点，类似 BFS。

---

### 代码模板

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

const int INF = 1e9;
const int N = 1e5 + 5;

vector<pair<int,int>> adj[N]; // {邻居, 权值}
int dist[N], cnt[N];          // cnt[v] = 入队次数（用于判负环）
bool inQueue[N];
int n, m;

bool spfa(int src) {
    fill(dist + 1, dist + n + 1, INF);
    fill(cnt + 1, cnt + n + 1, 0);
    fill(inQueue + 1, inQueue + n + 1, false);

    dist[src] = 0;
    queue<int> q;
    q.push(src);
    inQueue[src] = true;
    cnt[src] = 1;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        inQueue[u] = false;

        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (!inQueue[v]) {
                    q.push(v);
                    inQueue[v] = true;
                    cnt[v]++;
                    // 若某顶点入队 n 次，说明存在负权环
                    if (cnt[v] >= n) return false; // 有负环
                }
            }
        }
    }
    return true; // 无负环
}

int main() {
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
        // adj[v].push_back({u, w}); // 无向图加这行
    }

    if (!spfa(1)) {
        cout << "存在负权环" << endl;
    } else {
        for (int i = 1; i <= n; i++)
            cout << (dist[i] == INF ? -1 : dist[i]) << endl;
    }
}
\`\`\`

---

### 负环判断原理

若不存在负权环，最短路最多经过 $n-1$ 条边，即每个顶点最多入队 $n-1$ 次。  
若某顶点入队次数 $\\geq n$，则必然存在负权环。

---

### SPFA 的性能

- **平均**：$O(km)$，其中 $k$ 很小（实践中接近 $O(m)$）
- **最坏**：$O(nm)$（与 Bellman-Ford 相同，可被特殊数据卡）

> ⚠️ 竞赛注意：部分题目会专门构造数据卡 SPFA，此时需要用 Dijkstra+堆或其他方法代替。判断是否需要 SPFA 的标准：**图中是否含负权边**。无负权边优先用 Dijkstra。

---

### 三种最短路算法对比

| 算法 | 负权边 | 负环检测 | 时间复杂度 | 推荐场景 |
|------|--------|---------|-----------|---------|
| Dijkstra（堆优化） | ❌ | ❌ | $O((n+m)\\log n)$ | 无负权，常规最短路 |
| Bellman-Ford | ✅ | ✅ | $O(nm)$ | 边数少，差分约束 |
| SPFA | ✅ | ✅ | $O(km)$ 平均 | 含负权，数据不卡 |
| Floyd | ✅ | ✅ | $O(n^3)$ | 多源最短路，$n \\leq 500$ |
`,

'5-1-1': `## STL 标准模板库概述

**STL**（Standard Template Library，标准模板库）是 C++ 标准库的核心部分，提供了一套**通用的数据结构和算法**，是竞赛编程的必备工具。

---

### STL 的三大组成

| 组件 | 作用 | 典型示例 |
|------|------|---------|
| **容器**（Container） | 存储数据 | \`vector\`、\`map\`、\`set\` |
| **迭代器**（Iterator） | 遍历容器 | \`begin()\`、\`end()\`、\`it++\` |
| **算法**（Algorithm） | 操作数据 | \`sort\`、\`find\`、\`lower_bound\` |

---

### 常用容器速览

#### 序列容器（有序存储）

| 容器 | 特性 | 竞赛用途 |
|------|------|---------|
| \`vector<T>\` | 动态数组，O(1) 随机访问 | 最常用，替代普通数组 |
| \`deque<T>\` | 双端队列，头尾 O(1) 插删 | 单调队列 |
| \`list<T>\` | 双向链表，中间 O(1) 插删 | 较少使用 |

#### 关联容器（自动排序）

| 容器 | 特性 | 竞赛用途 |
|------|------|---------|
| \`set<T>\` | 有序不重复集合，O(log n) | 去重、维护有序集 |
| \`multiset<T>\` | 有序可重复集合 | 维护有序多重集 |
| \`map<K,V>\` | 有序键值对，O(log n) | 字典、映射 |
| \`multimap<K,V>\` | 允许键重复 | 较少使用 |

#### 无序容器（哈希，O(1) 均摊）

| 容器 | 特性 |
|------|------|
| \`unordered_set<T>\` | 哈希集合 |
| \`unordered_map<K,V>\` | 哈希映射 |

#### 容器适配器

| 容器 | 底层 | 用途 |
|------|------|------|
| \`stack<T>\` | \`deque\` | 栈（LIFO） |
| \`queue<T>\` | \`deque\` | 队列（FIFO） |
| \`priority_queue<T>\` | 堆 | 优先队列 |

---

### 迭代器基础

迭代器是访问容器元素的"指针"：

\`\`\`cpp
vector<int> v = {3, 1, 4, 1, 5};

// 普通迭代器遍历
for (vector<int>::iterator it = v.begin(); it != v.end(); ++it)
    cout << *it << " ";

// C++11 简写
for (auto it = v.begin(); it != v.end(); ++it)
    cout << *it << " ";

// 范围 for（最简洁）
for (int x : v) cout << x << " ";
\`\`\`

---

### 常用算法（\`#include <algorithm>\`）

\`\`\`cpp
vector<int> v = {3, 1, 4, 1, 5, 9};

sort(v.begin(), v.end());               // 排序
reverse(v.begin(), v.end());            // 反转
int idx = lower_bound(v.begin(), v.end(), 4) - v.begin(); // 二分查找
int mx = *max_element(v.begin(), v.end()); // 最大值
int cnt = count(v.begin(), v.end(), 1); // 计数
\`\`\`

---

### 头文件引用

\`\`\`cpp
#include <vector>
#include <set>
#include <map>
#include <queue>      // queue, priority_queue
#include <stack>
#include <algorithm>  // sort, lower_bound 等
#include <unordered_map>

// 竞赛万能头（包含所有标准库）
#include <bits/stdc++.h>
\`\`\`

---

### 学习建议

Level 5 重点掌握：**vector、set、map、stack、queue、priority_queue**，这六种容器覆盖了 GESP 5 级及以下的绝大多数题目需求。
`,

'5-4-5': `## 前缀和差分综合练习

本节通过典型例题，巩固**一维前缀和**、**二维前缀和**和**差分**三种技术的灵活运用。

---

### 题型分类

| 题型 | 核心技术 | 时间复杂度 |
|------|---------|-----------|
| 区间和查询 | 一维前缀和 | 预处理 O(n)，查询 O(1) |
| 矩阵子矩形和 | 二维前缀和 | 预处理 O(nm)，查询 O(1) |
| 区间加法 + 单点查询 | 差分 | O(n) |
| 区间加法 + 区间查询 | 差分 + 前缀和 | O(n) |

---

### 练习题 1：区间和

**题意：** 给定数组 $a[1..n]$，$q$ 次询问 $[l, r]$ 的区间和。

\`\`\`cpp
int n, q;
cin >> n >> q;
vector<int> a(n+1), pre(n+1, 0);
for (int i = 1; i <= n; i++) {
    cin >> a[i];
    pre[i] = pre[i-1] + a[i];
}
while (q--) {
    int l, r;
    cin >> l >> r;
    cout << pre[r] - pre[l-1] << "\n";
}
\`\`\`

---

### 练习题 2：区间批量修改 + 单点查询

**题意：** $m$ 次操作，每次将 $[l, r]$ 全部加上 $v$，最后查询某位置的值。

**思路：** 使用差分数组 $d[]$，$d[l] += v$，$d[r+1] -= v$，还原时对 $d$ 求前缀和。

\`\`\`cpp
int n, m;
cin >> n >> m;
vector<int> d(n+2, 0);
while (m--) {
    int l, r, v;
    cin >> l >> r >> v;
    d[l] += v;
    d[r+1] -= v;
}
// 还原原数组（同时加上初始值）
vector<int> a(n+1, 0);
for (int i = 1; i <= n; i++)
    a[i] = a[i-1] + d[i];
// 查询 a[pos]
int pos;
cin >> pos;
cout << a[pos] << "\n";
\`\`\`

---

### 练习题 3：二维矩阵子矩形求和

**题意：** 给定 $n \\times m$ 矩阵，查询左上角 $(r_1, c_1)$、右下角 $(r_2, c_2)$ 的子矩形元素和。

\`\`\`cpp
int n, m, q;
cin >> n >> m >> q;
vector<vector<int>> pre(n+1, vector<int>(m+1, 0));
for (int i = 1; i <= n; i++)
    for (int j = 1; j <= m; j++) {
        int x; cin >> x;
        pre[i][j] = x + pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1];
    }
while (q--) {
    int r1, c1, r2, c2;
    cin >> r1 >> c1 >> r2 >> c2;
    int ans = pre[r2][c2] - pre[r1-1][c2] - pre[r2][c1-1] + pre[r1-1][c1-1];
    cout << ans << "\n";
}
\`\`\`

---

### 练习题 4：综合应用——区间加法 + 区间查询

**题意：** $m$ 次将 $[l, r]$ 全部加上 $v$，同时支持区间和查询。

**思路：** 设差分数组 $d[]$，原数组 $a[i] = \\sum_{j=1}^{i} d[j]$（前缀和），区间和 $\\sum_{i=l}^{r} a[i]$ 可用两层前缀和推导。

$$\\sum_{i=1}^{r} a[i] = \\sum_{i=1}^{r} \\sum_{j=1}^{i} d[j] = \\sum_{j=1}^{r} d[j] \\cdot (r - j + 1) = (r+1)\\sum_{j=1}^{r} d[j] - \\sum_{j=1}^{r} j \\cdot d[j]$$

维护两个差分辅助数组，时间复杂度 $O(n + m)$。

---

### 常见错误总结

| 错误 | 解决方案 |
|------|---------|
| 下标越界（$d[r+1]$ 越界） | 数组开大一格：\`d(n+2)\` |
| 二维前缀和容斥搞错符号 | 记公式：加两条边，减左上角，加点 |
| 忘记前缀和从 1 开始 | \`pre[0] = 0\`，循环从 $i=1$ |
| 差分还原后忘记加初始值 | 差分基于 0 时，还原就是初始修改后的值 |
`,

'5-8-17': `## 贪心算法综合练习

本节通过多道例题，归纳贪心算法的常见套路，并练习**证明贪心正确性**的思维方式。

---

### 贪心 vs 动态规划的选择

- **贪心**：局部最优选择可以推导出全局最优，不需要回溯
- **DP**：需要枚举所有状态转移，记录历史最优

判断能否用贪心：尝试**交换论证**——假设存在最优解，若把某个选择换成贪心选择后解不变差，则贪心成立。

---

### 练习题 1：区间选点

**题意：** 给定 $n$ 个区间 $[l_i, r_i]$，选最少的点，使每个区间至少包含一个点。

**贪心策略：** 按右端点排序，每次在右端点处放一个点，跳过所有被覆盖的区间。

\`\`\`cpp
int n;
cin >> n;
vector<pair<int,int>> segs(n);
for (auto& [l, r] : segs) cin >> l >> r;
sort(segs.begin(), segs.end(), [](auto& a, auto& b){ return a.second < b.second; });

int cnt = 0, last = INT_MIN;
for (auto [l, r] : segs) {
    if (l > last) {      // 当前区间未被覆盖
        cnt++;
        last = r;        // 在右端点放点
    }
}
cout << cnt << "\n";
\`\`\`

---

### 练习题 2：区间合并

**题意：** 给定 $n$ 个区间，合并所有重叠区间，输出合并后的区间集合。

\`\`\`cpp
sort(segs.begin(), segs.end()); // 按左端点排序
vector<pair<int,int>> res;
for (auto [l, r] : segs) {
    if (res.empty() || l > res.back().second)
        res.push_back({l, r});
    else
        res.back().second = max(res.back().second, r);
}
\`\`\`

---

### 练习题 3：任务调度（最小化最大完成时间）

**题意：** $n$ 个任务各有时长 $t_i$ 和截止时间 $d_i$，在同一台机器上顺序执行，最小化**最晚截止时间超时量**（$\\max(0, finish_i - d_i)$）。

**贪心策略（EDF）：** 按截止时间 $d_i$ 从小到大排序执行。

可用交换论证证明：若有两个相邻任务 $i, j$ 且 $d_i > d_j$，交换后 $j$ 的超时不增而 $i$ 的超时不增。

---

### 练习题 4：分糖果

**题意：** $n$ 个孩子排成一排，每人有权重 $w_i$。规则：若 $w_i > w_{i-1}$，孩子 $i$ 得到的糖比 $i-1$ 多；若 $w_i > w_{i+1}$，孩子 $i$ 得到的糖比 $i+1$ 多。求最少糖果总数。

**贪心策略：** 两次扫描
- 从左到右：保证右侧比左侧大时糖果更多
- 从右到左：保证左侧比右侧大时糖果更多
- 取两次结果的 \`max\`

\`\`\`cpp
vector<int> candy(n, 1);
// 左→右
for (int i = 1; i < n; i++)
    if (w[i] > w[i-1]) candy[i] = candy[i-1] + 1;
// 右→左
for (int i = n-2; i >= 0; i--)
    if (w[i] > w[i+1]) candy[i] = max(candy[i], candy[i+1] + 1);
cout << accumulate(candy.begin(), candy.end(), 0) << "\n";
\`\`\`

---

### 练习题 5：哈夫曼编码（最优编码）

**题意：** 给定 $n$ 个字符的频率 $f_i$，构造前缀码使编码总长度最小。

**贪心策略：** 每次取频率最小的两个节点合并（用优先队列）。

\`\`\`cpp
priority_queue<long long, vector<long long>, greater<>> pq;
for (int i = 0; i < n; i++) { long long x; cin >> x; pq.push(x); }
long long cost = 0;
while (pq.size() > 1) {
    long long a = pq.top(); pq.pop();
    long long b = pq.top(); pq.pop();
    cost += a + b;
    pq.push(a + b);
}
cout << cost << "\n";
\`\`\`

---

### 贪心常见套路总结

| 问题类型 | 贪心策略 |
|---------|---------|
| 区间调度 | 按右端点排序 |
| 区间覆盖 | 按左端点排序 + 贪心延伸 |
| 任务调度 | EDF（最早截止优先）/ SPT（最短任务优先） |
| 最优合并 | 优先队列，每次取最小两个合并 |
| 字典序最小 | 逐位贪心选最小可行字符 |
`
}

// ── 写入数据库
const docs = await CL.find({ level: { $in: [5, 6, 7, 8] } })
let updated = 0
for (const doc of docs) {
  let changed = false
  for (const topic of doc.topics) {
    for (const chapter of topic.chapters) {
      if (CONTENTS[chapter.id]) {
        chapter.content = CONTENTS[chapter.id]
        chapter.contentType = 'markdown'
        console.log(`✓ L${doc.level} [${chapter.id}] ${chapter.title}`)
        changed = true
        updated++
      }
    }
  }
  if (changed) await doc.save()
}
console.log(`\n共写入 ${updated} 章内容`)
await mongoose.disconnect()
