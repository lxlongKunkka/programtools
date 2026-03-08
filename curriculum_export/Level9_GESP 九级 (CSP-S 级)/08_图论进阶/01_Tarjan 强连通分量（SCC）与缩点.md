# Tarjan 强连通分量（SCC）与缩点

## 教学目标

### 知识目标
1.  **理解强连通分量 (SCC) 的概念**：学生能准确定义强连通分量，并识别给定有向图中的强连通分量。
2.  **掌握 Tarjan 算法的核心思想**：理解深度优先搜索 (DFS) 树、发现时间 (`dfn`) 和追溯值 (`low`) 的作用。
3.  **理解栈在 Tarjan 算法中的应用**：明确栈如何辅助识别和记录强连通分量。
4.  **理解缩点的概念与意义**：掌握将强连通分量缩点后形成的新图的性质（有向无环图 DAG）。

### 能力目标
1.  **能够手工模拟 Tarjan 算法**：对简单有向图，学生能手动追踪 `dfn`、`low` 值的变化，并找出所有 SCC。
2.  **能够独立实现 Tarjan 算法**：学生能使用 C++ 语言正确编写 Tarjan 算法，找出图中的所有 SCC。
3.  **能够运用 SCC 缩点解决实际问题**：学生能将复杂图问题转化为在缩点后的 DAG 上进行计算（如拓扑排序、最长路等）。

### 素养目标
1.  **培养抽象思维能力**：通过理解 `dfn` 和 `low` 这种抽象指标，提升分析和解决复杂问题的能力。
2.  **提升算法设计与分析能力**：学会从问题中提炼出图论模型，并选择合适的算法进行求解。
3.  **养成严谨的编程习惯**：注重代码的逻辑清晰、变量命名规范和边界条件处理。
4.  **体验算法之美**：感受 Tarjan 算法的巧妙设计，培养对算法学习的兴趣。

===NEXT===

## 趣味引入

同学们，想象一下我们生活在一个巨大的社交网络中，每个人都是一个节点，如果你关注了某人，就有一条从你指向他的有向边。

现在，我们想找出一些“铁杆粉丝团”或者“秘密社团”。这些社团有什么特点呢？
1.  **社团内部，所有成员都互相认识**：也就是说，社团里的任意两个人，都可以通过社团内部的成员关系（关注链）到达对方。比如小明关注小红，小红关注小刚，小刚又关注小明，那么他们三个人就能形成一个互相可达的圈子。
2.  **社团是最大的**：这个圈子不能再加入外面的人，否则外面的人也能和圈子里所有人都互相可达了。

这样的“铁杆粉丝团”在数学中，我们称之为 **强连通分量 (Strongly Connected Component, SCC)**。在有向图中，一个强连通分量就是一个最大的子图，其中任意两个节点都可以互相到达。

找出这些 SCC 有什么用呢？
比如，如果我们想知道一个谣言能在哪些人之间完全传播开来，并且这些人之间还能互相确认消息，那么这些“铁杆粉丝团”就是最好的传播单位。
又比如，如果我们把每个“铁杆粉丝团”看作一个整体，把他们“打包”成一个大大的节点，那么整个社交网络就会变得更简单，变成一个没有“死循环”的“单向街”网络，这样我们就能更容易地分析信息传播的路径了！

今天，我们就来学习一个非常巧妙的算法——**Tarjan 算法**，它就像一个专业的侦探，能帮我们高效地找出这些隐藏在复杂网络中的“铁杆粉丝团”！

===NEXT===

## 深度知识点讲解

### 1. 强连通分量 (SCC) 的定义

在一个有向图 $G=(V, E)$ 中，如果对于任意两个节点 $u, v \in V$，都存在一条从 $u$ 到 $v$ 的路径和一条从 $v$ 到 $u$ 的路径，那么我们就说 $u$ 和 $v$ 是**强连通**的。
**强连通分量 (Strongly Connected Component, SCC)** 是一个有向图中的**极大**子图，使得这个子图中的任意两个节点都是强连通的。这里的“极大”意味着这个子图不能再加入任何一个图中的节点，否则它就不是 SCC 了。

**生活类比**：想象一个由单向车道组成的城市交通网络。一个 SCC 就像是一个区域，在这个区域内，你可以从任何一个路口出发，最终到达区域内的任何其他路口，并且也能从任何其他路口回到你出发的路口。而且这个区域是最大的，不能再把外面的任何一个路口加进来，否则它就不是一个可以完全循环的区域了。

### 2. DFS 搜索树与边的分类

Tarjan 算法是基于深度优先搜索 (DFS) 的。当我们对一个有向图进行 DFS 时，会形成一棵或多棵 DFS 树（森林）。图中的边可以根据它们在 DFS 树中的作用分为四类：

1.  **树边 (Tree Edge)**：在 DFS 过程中，从一个已访问节点 `u` 首次访问一个未访问节点 `v`，这条边 `(u, v)` 就是树边。它构成了 DFS 树的主干。
2.  **回边 (Back Edge)**：从一个节点 `u` 指向它的祖先节点 `v`（包括 `u` 自己）的边 `(u, v)`。回边是形成环的关键。
3.  **前向边 (Forward Edge)**：从一个节点 `u` 指向它的子孙节点 `v`（`v` 不是 `u` 的子节点，但 `v` 在 `u` 的 DFS 子树中）的边 `(u, v)`。
4.  **横叉边 (Cross Edge)**：从一个节点 `u` 指向一个既不是 `u` 的祖先也不是 `u` 的子孙的节点 `v` 的边 `(u, v)`。通常 `v` 已经在另一个 DFS 树中被访问过，或者在当前 DFS 树中但不是 `u` 的祖先或子孙。

**关键点**：在 Tarjan 算法中，我们主要关注**树边**和**回边**。前向边和横叉边对 `low` 值的计算有影响，但它们的处理方式与回边略有不同。

### 3. Tarjan 算法的核心：`dfn` 和 `low`

Tarjan 算法的核心是为每个节点维护两个值：

1.  **`dfn[u]` (Discovery Time / 发现时间)**：记录节点 `u` 在 DFS 过程中**首次被访问**的时间戳。可以看作是 `u` 的“出生时间”。
2.  **`low[u]` (Low-Link Value / 追溯值)**：记录从节点 `u` 开始，通过 DFS 树中的边（树边）以及**最多一条回边**，能够到达的所有节点中，**最小的 `dfn` 值**。可以看作是 `u` 能够追溯到的“最早的祖先”的发现时间。

**生活类比**：
*   `dfn[u]`：你加入侦探社的时间。
*   `low[u]`：通过你和你的下线（DFS子树），以及最多一次“走后门”（回边），能联系到的最早加入侦探社的成员的时间。

**`low[u]` 的更新规则：**
*   初始化时，`low[u] = dfn[u]` (最开始只能追溯到自己)。
*   当从 `u` 访问到 `v` 时：
    *   **如果 `v` 没有被访问过** (`v` 是树边)：递归 `dfs(v)`。`dfs(v)` 返回后，`low[u] = min(low[u], low[v])`。这意味着 `u` 也能通过 `v` 追溯到 `v` 能追溯到的最早节点。
    *   **如果 `v` 已经被访问过，并且 `v` 当前在栈中** (`v` 是回边或横叉边指向栈中节点)：`low[u] = min(low[u], dfn[v])`。这意味着 `u` 可以直接通过 `v` 追溯到 `v`（因为 `v` 还在栈中，说明 `u` 和 `v` 都在同一个 DFS 路径上，并且 `v` 是 `u` 的祖先或在同一个 SCC 中）。
    *   **如果 `v` 已经被访问过，但 `v` 不在栈中** (`v` 是前向边或横叉边指向已经形成 SCC 的节点)：`v` 已经属于某个 SCC，并且该 SCC 已经处理完毕并从栈中弹出。此时 `(u, v)` 这条边不能用来更新 `low[u]`，因为 `v` 所在的 SCC 已经是一个“封闭”的整体，`u` 不能通过 `v` 追溯到更早的节点并形成新的 SCC。

### 4. 栈在 Tarjan 算法中的应用

Tarjan 算法使用一个栈来存储正在进行 DFS 的节点。当一个节点 `u` 被访问时，它会被压入栈中。
**栈的作用**：
1.  **标记活跃节点**：栈中的节点表示它们仍然是当前正在探索的 DFS 路径的一部分，并且可能属于某个 SCC。
2.  **识别 SCC 成员**：当 `dfn[u] == low[u]` 时，这意味着节点 `u` 是某个 SCC 的“根”。从栈顶开始，不断弹出节点，直到弹出 `u` 为止，所有弹出的节点都属于以 `u` 为根的这个 SCC。

**为什么 `dfn[u] == low[u]` 意味着 `u` 是 SCC 的根？**
如果 `dfn[u] == low[u]`，说明从 `u` 出发，在 `u` 的 DFS 子树中，无法通过任何一条回边追溯到比 `u` 的 `dfn` 值更小的节点。这意味着 `u` 及其 DFS 子树中所有通过树边和回边能到达的节点，都只能回溯到 `u` 自己，或者 `u` 的子树中的节点。它们形成了一个“封闭”的环，这个环的最高点就是 `u`。因此，`u` 就是一个 SCC 的根。

### 5. Tarjan 算法的整体流程

1.  **初始化**：
    *   `dfn` 数组、`low` 数组初始化为 0。
    *   `visited` 数组（或 `inStack` 数组）初始化为 `false`。
    *   `timer` (时间戳计数器) 初始化为 0。
    *   `scc_cnt` (SCC 数量计数器) 初始化为 0。
    *   `s` 栈清空。
2.  **遍历所有节点**：对于图中的每个节点 `i`，如果 `i` 尚未被访问 (`dfn[i] == 0`)，则从 `i` 开始调用 `dfs(i)`。
3.  **`dfs(u)` 函数**：
    *   `timer` 自增，`dfn[u] = low[u] = timer`。
    *   将 `u` 压入栈 `s`，并标记 `u` 在栈中 (`inStack[u] = true`)。
    *   遍历 `u` 的所有邻接点 `v`：
        *   **如果 `v` 未被访问** (`dfn[v] == 0`)：
            *   递归调用 `dfs(v)`。
            *   `low[u] = min(low[u], low[v])`。
        *   **如果 `v` 已被访问，且 `v` 在栈中** (`inStack[v] == true`)：
            *   `low[u] = min(low[u], dfn[v])`。
    *   **判断 SCC**：如果 `dfn[u] == low[u]`：
        *   找到了一个 SCC，`scc_cnt` 自增。
        *   从栈 `s` 中不断弹出节点 `w`，直到 `w == u`。
        *   每个弹出的节点 `w` 都属于当前的 SCC (`scc_id[w] = scc_cnt`)，并标记 `w` 不在栈中 (`inStack[w] = false`)。

### 6. 缩点 (Graph Condensation)

找到所有 SCC 后，我们可以将每个 SCC 视为一个**超级节点** (或称**块节点**)。然后，如果原图中的一个 SCC `A` 中的某个节点 `u` 指向 SCC `B` 中的某个节点 `v`，那么在新图中，就从超级节点 `A` 向超级节点 `B` 添加一条有向边。

**缩点后的图的性质**：
*   缩点后的图是一个**有向无环图 (DAG)**。
*   在 DAG 上，我们可以进行拓扑排序、最长路/最短路等操作，这些在有环图中是无法直接进行的。

**生活类比**：我们找到了所有的“铁杆粉丝团”，现在我们把每个粉丝团看作一个“大明星”。如果“小明粉丝团”里有人关注了“小红粉丝团”里的人，那么我们就说“小明粉丝团”这个大明星关注了“小红粉丝团”这个大明星。这样，整个社交网络就变成了由这些“大明星”组成的，而且再也没有“大明星”之间的循环关注了，因为所有的循环都被“打包”进了一个个大明星内部。

**实现缩点**：
遍历原图中的所有边 `(u, v)`。如果 `scc_id[u] != scc_id[v]` (即 `u` 和 `v` 不属于同一个 SCC)，那么就在新图的 `scc_id[u]` 和 `scc_id[v]` 之间添加一条边。注意，为了避免重复边，可以使用 `set` 或者先将边存起来再排序去重。

===NEXT===

## 典型例题精讲

### 例题 1：找出所有强连通分量

**题目描述**：
给定一个 $N$ 个点 $M$ 条边的有向图，请输出图中所有强连通分量的数量，以及每个点所属的强连通分量编号。

**输入格式**：
第一行包含两个整数 $N, M$ ($1 \le N \le 10^4, 1 \le M \le 10^5$)。
接下来 $M$ 行，每行包含两个整数 $u, v$，表示存在一条从 $u$ 到 $v$ 的有向边。

**输出格式**：
第一行输出强连通分量的总数量。
第二行输出 $N$ 个整数，第 $i$ 个整数表示节点 $i$ 所属的强连通分量编号。

**思路分析**：
这道题是 Tarjan 算法的直接应用。我们只需要按照 Tarjan 算法的步骤，维护 `dfn`、`low`、栈以及 `scc_id` 数组即可。

1.  **图的表示**：使用邻接表存储图，由于 GESP 9 级要求原生数组，我们将使用链式前向星来模拟邻接表。
2.  **Tarjan 算法**：
    *   `dfn[i]` 存储节点 `i` 的发现时间。
    *   `low[i]` 存储节点 `i` 的追溯值。
    *   `s[N]` 模拟栈，`top` 指针表示栈顶。
    *   `inStack[i]` 标记节点 `i` 是否在栈中。
    *   `scc_id[i]` 存储节点 `i` 所属的 SCC 编号。
    *   `scc_cnt` 记录 SCC 的数量。
    *   `timer` 记录时间戳。
3.  **DFS 遍历**：从每个未访问过的节点开始 DFS，确保所有节点都被处理。
4.  **输出结果**：根据 `scc_cnt` 和 `scc_id` 数组输出。

**代码实现**：

```cpp
#include <iostream>
#include <algorithm> // for std::min

const int MAXN = 10005; // 最大节点数
const int MAXM = 100005; // 最大边数

// 邻接表 (链式前向星)
int head[MAXN];
int nxt[MAXM];
int to[MAXM];
int edgeCount;

// Tarjan 算法相关数组
int dfn[MAXN];      // 节点发现时间
int low[MAXN];      // 节点追溯值
int timer;          // 时间戳计数器

int s[MAXN];        // 模拟栈
int top;            // 栈顶指针
bool inStack[MAXN]; // 标记节点是否在栈中

int scc_id[MAXN];   // 节点所属的强连通分量编号
int scc_cnt;        // 强连通分量数量

int n, m;           // 节点数和边数

// 添加边函数
void addEdge(int u, int v) {
    to[edgeCount] = v;
    nxt[edgeCount] = head[u];
    head[u] = edgeCount;
    edgeCount++;
}

// Tarjan 核心 DFS 函数
void tarjan(int u) {
    dfn[u] = low[u] = ++timer; // 记录发现时间与追溯值
    s[++top] = u;              // 节点入栈
    inStack[u] = true;         // 标记在栈中

    // 遍历所有邻接点
    for (int i = head[u]; i != -1; i = nxt[i]) {
        int v = to[i];
        if (dfn[v] == 0) { // 如果 v 未被访问
            tarjan(v);
            low[u] = std::min(low[u], low[v]); // 更新 u 的追溯值
        } else if (inStack[v]) { // 如果 v 已被访问且在栈中 (回边或横叉边指向栈中节点)
            low[u] = std::min(low[u], dfn[v]); // 更新 u 的追溯值
        }
    }

    // 如果 dfn[u] == low[u]，说明 u 是一个 SCC 的根
    if (dfn[u] == low[u]) {
        scc_cnt++; // SCC 数量加一
        int current_node;
        do { // 从栈中弹出节点，直到 u
            current_node = s[top--];
            inStack[current_node] = false; // 标记不在栈中
            scc_id[current_node] = scc_cnt; // 记录 SCC 编号
        } while (current_node != u);
    }
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::cin >> n >> m;

    // 初始化邻接表头
    for (int i = 1; i <= n; ++i) {
        head[i] = -1;
    }

    // 读取边
    for (int i = 0; i < m; ++i) {
        int u, v;
        std::cin >> u >> v;
        addEdge(u, v);
    }

    // 对每个未访问的节点执行 Tarjan 算法
    for (int i = 1; i <= n; ++i) {
        if (dfn[i] == 0) {
            tarjan(i);
        }
    }

    std::cout << scc_cnt << std::endl;
    for (int i = 1; i <= n; ++i) {
        std::cout << scc_id[i] << (i == n ? "" : " ");
    }
    std::cout << std::endl;

    return 0;
}
```

**复杂度分析**：
*   **时间复杂度**：Tarjan 算法本质上是一个 DFS 过程，每个节点和每条边都只被访问一次。因此，时间复杂度为 $O(N+M)$，其中 $N$ 是节点数，$M$ 是边数。
*   **空间复杂度**：需要存储邻接表、`dfn`、`low`、`inStack`、`scc_id` 数组以及模拟栈。这些都与 $N$ 和 $M$ 成正比。因此，空间复杂度为 $O(N+M)$。

### 例题 2：缩点后求最长路

**题目描述**：
给定一个 $N$ 个点 $M$ 条边的有向图。每个节点有一个权值 $w_i$。现在定义每个 SCC 的权值为其包含的所有节点的权值之和。请你找出缩点后的图中，从任意一个 SCC 开始，沿着边走能获得的最大 SCC 权值和。

**输入格式**：
第一行包含两个整数 $N, M$ ($1 \le N \le 10^4, 1 \le M \le 10^5$)。
第二行包含 $N$ 个整数 $w_1, w_2, \dots, w_N$，表示每个节点的权值。
接下来 $M$ 行，每行包含两个整数 $u, v$，表示存在一条从 $u$ 到 $v$ 的有向边。

**输出格式**：
一个整数，表示缩点后图中的最大 SCC 权值和。

**思路分析**：
这道题需要结合 Tarjan 算法和动态规划 (DP)。

1.  **找出 SCC 并缩点**：
    *   首先运行 Tarjan 算法，找出所有 SCC，并记录每个节点所属的 `scc_id`。
    *   计算每个 SCC 的总权值 `scc_val[k]`，即所有 `scc_id[i] == k` 的节点 `i` 的 `w_i` 之和。
2.  **构建新图 (DAG)**：
    *   遍历原图中的所有边 `(u, v)`。
    *   如果 `scc_id[u] != scc_id[v]`，则表示从 `u` 所在的 SCC `scc_id[u]` 到 `v` 所在的 SCC `scc_id[v]` 有一条边。在新图 `adj_new` 中添加这条边。
    *   注意：新图中的边可能重复，需要去重。或者在添加边时，使用 `visited` 数组避免重复添加。
3.  **在 DAG 上求最长路**：
    *   由于新图是 DAG，我们可以使用 DP 或拓扑排序来求最长路。
    *   定义 `dp[k]` 为从 SCC `k` 出发，沿着边走能获得的最大 SCC 权值和。
    *   `dp[k] = scc_val[k] + max(dp[next_k])`，其中 `next_k` 是 `k` 指向的 SCC。
    *   由于是 DAG，我们可以反向拓扑排序或者记忆化搜索来计算 `dp` 值。这里使用记忆化搜索更直观。
    *   最终答案是所有 `dp[k]` 中的最大值。

**代码实现**：

```cpp
#include <iostream>
#include <algorithm> // for std::min, std::max
#include <vector>    // for std::vector (for new_adj)

const int MAXN = 10005;
const int MAXM = 100005;

// 原图邻接表 (链式前向星)
int head[MAXN];
int nxt[MAXM];
int to[MAXM];
int edgeCount;

// Tarjan 算法相关数组
int dfn[MAXN];
int low[MAXN];
int timer;

int s[MAXN];
int top;
bool inStack[MAXN];

int scc_id[MAXN];
int scc_cnt;

int n, m;
int w[MAXN]; // 节点权值

// SCC 缩点后的信息
long long scc_val[MAXN]; // 每个SCC的总权值
std::vector<int> new_adj[MAXN]; // 缩点后的DAG邻接表
bool new_adj_vis[MAXN][MAXN]; // 避免新图重复边的辅助数组 (注意空间，这里简化处理，实际可能用哈希或排序去重)

long long dp[MAXN]; // dp[i] 表示从SCC i出发的最大权值和

void addEdge(int u, int v) {
    to[edgeCount] = v;
    nxt[edgeCount] = head[u];
    head[u] = edgeCount;
    edgeCount++;
}

void tarjan(int u) {
    dfn[u] = low[u] = ++timer;
    s[++top] = u;
    inStack[u] = true;

    for (int i = head[u]; i != -1; i = nxt[i]) {
        int v = to[i];
        if (dfn[v] == 0) {
            tarjan(v);
            low[u] = std::min(low[u], low[v]);
        } else if (inStack[v]) {
            low[u] = std::min(low[u], dfn[v]);
        }
    }

    if (dfn[u] == low[u]) {
        scc_cnt++;
        int current_node;
        do {
            current_node = s[top--];
            inStack[current_node] = false;
            scc_id[current_node] = scc_cnt;
            scc_val[scc_cnt] += w[current_node]; // 累加SCC权值
        } while (current_node != u);
    }
}

// 在缩点后的DAG上进行DP (记忆化搜索)
long long dfs_dp(int u_scc) {
    if (dp[u_scc] != -1) { // 已经计算过
        return dp[u_scc];
    }

    long long max_next_path = 0;
    for (int v_scc : new_adj[u_scc]) {
        max_next_path = std::max(max_next_path, dfs_dp(v_scc));
    }

    dp[u_scc] = scc_val[u_scc] + max_next_path;
    return dp[u_scc];
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::cin >> n >> m;

    for (int i = 1; i <= n; ++i) {
        std::cin >> w[i];
        head[i] = -1; // 初始化邻接表头
        dp[i] = -1;   // 初始化dp数组
    }

    for (int i = 0; i < m; ++i) {
        int u, v;
        std::cin >> u >> v;
        addEdge(u, v);
    }

    // 1. 运行 Tarjan 算法找出所有 SCC
    for (int i = 1; i <= n; ++i) {
        if (dfn[i] == 0) {
            tarjan(i);
        }
    }

    // 2. 构建缩点后的新图 (DAG)
    for (int u = 1; u <= n; ++u) {
        for (int i = head[u]; i != -1; i = nxt[i]) {
            int v = to[i];
            if (scc_id[u] != scc_id[v]) { // 如果 u 和 v 不在同一个 SCC
                int u_scc = scc_id[u];
                int v_scc = scc_id[v];
                // 避免重复添加边，这里使用一个简单的二维数组标记，
                // 实际竞赛中如果SCC数量大，可能需要更高效的去重方式，如排序+unique
                if (!new_adj_vis[u_scc][v_scc]) {
                    new_adj[u_scc].push_back(v_scc);
                    new_adj_vis[u_scc][v_scc] = true;
                }
            }
        }
    }
    
    // 3. 在 DAG 上进行 DP，求最长路
    long long max_total_val = 0;
    for (int i = 1; i <= scc_cnt; ++i) {
        max_total_val = std::max(max_total_val, dfs_dp(i));
    }

    std::cout << max_total_val << std::endl;

    return 0;
}
```

**复杂度分析**：
*   **Tarjan 算法**：$O(N+M)$
*   **构建新图**：遍历原图所有边，每个 SCC 的边最多添加一次。如果使用 `new_adj_vis[MAXN][MAXN]`，空间会是 $O(N^2)$，这在 $N=10^4$ 时会内存超限。更优的方式是：将新图的边存储在一个 `vector<pair<int, int>>` 中，然后排序去重，再构建 `new_adj`。或者使用 `std::set<int>` 来存储每个 `new_adj[u_scc]`，但这又违反了“原生数组”的限制。对于 GESP 9 级，为了简化，`new_adj_vis` 可能会被接受，但需要注意 $N$ 的范围。如果 $N$ 真的很大，通常会通过 `std::vector<int> new_adj[MAXN]` 然后 `std::sort(new_adj[i].begin(), new_adj[i].end()); new_adj[i].erase(std::unique(...));` 来去重。这里为了遵循“原生数组”的严格要求，`new_adj` 仍然是 `vector<int>`，但 `new_adj_vis` 换成 `bool visited_edge[MAXN][MAXN]` 仍然是问题。
    *   **修正**：为了避免 $O(N^2)$ 的 `new_adj_vis`，且仍然使用原生数组，可以这样处理新图的边：
        1.  先将所有 `(scc_id[u], scc_id[v])` 形式的边存入一个 `struct Edge { int u, v; };` 数组中。
        2.  对这个边数组进行排序，先按 `u` 排序，再按 `v` 排序。
        3.  遍历排序后的边数组，去重，然后用链式前向星的方式构建 `new_adj`。
        这个过程时间复杂度是 $O(M \log M)$ (排序)，空间 $O(M)$。
*   **DP 求最长路**：记忆化搜索或拓扑排序在 DAG 上都是 $O(SCC_{cnt} + E_{new})$，其中 $SCC_{cnt} \le N$， $E_{new} \le M$。所以也是 $O(N+M)$。
*   **总时间复杂度**：$O(N+M)$ (如果新图去重优化到位)。
*   **总空间复杂度**：$O(N+M)$。

### 代码实现 (例题2 - 修正新图去重)

```cpp
#include <iostream>
#include <algorithm> // for std::min, std::max, std::sort, std::unique

const int MAXN = 10005;
const int MAXM = 100005;

// 原图邻接表 (链式前向星)
int head[MAXN];
int nxt[MAXM];
int to[MAXM];
int edgeCount;

// Tarjan 算法相关数组
int dfn[MAXN];
int low[MAXN];
int timer;

int s[MAXN];
int top;
bool inStack[MAXN];

int scc_id[MAXN];
int scc_cnt;

int n, m;
int w[MAXN]; // 节点权值

// SCC 缩点后的信息
long long scc_val[MAXN]; // 每个SCC的总权值

// 新图的边结构
struct NewEdge {
    int u_scc, v_scc;
    bool operator<(const NewEdge& other) const {
        if (u_scc != other.u_scc) return u_scc < other.u_scc;
        return v_scc < other.v_scc;
    }
    bool operator==(const NewEdge& other) const {
        return u_scc == other.u_scc && v_scc == other.v_scc;
    }
};
NewEdge newEdges[MAXM]; // 存储缩点后的边
int newEdgeCount;

// 缩点后的DAG邻接表 (链式前向星)
int new_head[MAXN];
int new_nxt[MAXM];
int new_to[MAXM];
int new_edgeCount;

long long dp[MAXN]; // dp[i] 表示从SCC i出发的最大权值和

void addEdge(int u, int v) {
    to[edgeCount] = v;
    nxt[edgeCount] = head[u];
    head[u] = edgeCount;
    edgeCount++;
}

void tarjan(int u) {
    dfn[u] = low[u] = ++timer;
    s[++top] = u;
    inStack[u] = true;

    for (int i = head[u]; i != -1; i = nxt[i]) {
        int v = to[i];
        if (dfn[v] == 0) {
            tarjan(v);
            low[u] = std::min(low[u], low[v]);
        } else if (inStack[v]) {
            low[u] = std::min(low[u], dfn[v]);
        }
    }

    if (dfn[u] == low[u]) {
        scc_cnt++;
        int current_node;
        do {
            current_node = s[top--];
            inStack[current_node] = false;
            scc_id[current_node] = scc_cnt;
            scc_val[scc_cnt] += w[current_node];
        } while (current_node != u);
    }
}

// 添加新图边函数
void addNewEdge(int u_scc, int v_scc) {
    new_to[new_edgeCount] = v_scc;
    new_nxt[new_edgeCount] = new_head[u_scc];
    new_head[u_scc] = new_edgeCount;
    new_edgeCount++;
}

// 在缩点后的DAG上进行DP (记忆化搜索)
long long dfs_dp(int u_scc) {
    if (dp[u_scc] != -1) {
        return dp[u_scc];
    }

    long long max_next_path = 0;
    for (int i = new_head[u_scc]; i != -1; i = new_nxt[i]) {
        int v_scc = new_to[i];
        max_next_path = std::max(max_next_path, dfs_dp(v_scc));
    }

    dp[u_scc] = scc_val[u_scc] + max_next_path;
    return dp[u_scc];
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::cin >> n >> m;

    for (int i = 1; i <= n; ++i) {
        std::cin >> w[i];
        head[i] = -1; // 初始化原图邻接表头
    }
    for (int i = 1; i <= n; ++i) { // 初始化新图邻接表头和dp数组
        new_head[i] = -1;
        dp[i] = -1;
    }

    for (int i = 0; i < m; ++i) {
        int u, v;
        std::cin >> u >> v;
        addEdge(u, v);
    }

    // 1. 运行 Tarjan 算法找出所有 SCC
    for (int i = 1; i <= n; ++i) {
        if (dfn[i] == 0) {
            tarjan(i);
        }
    }

    // 2. 收集新图的边并去重
    newEdgeCount = 0;
    for (int u = 1; u <= n; ++u) {
        for (int i = head[u]; i != -1; i = nxt[i]) {
            int v = to[i];
            if (scc_id[u] != scc_id[v]) {
                newEdges[newEdgeCount++] = {scc_id[u], scc_id[v]};
            }
        }
    }

    std::sort(newEdges, newEdges + newEdgeCount);
    newEdgeCount = std::unique(newEdges, newEdges + newEdgeCount) - newEdges;

    // 3. 构建缩点后的新图 (DAG) 的邻接表
    for (int i = 0; i < newEdgeCount; ++i) {
        addNewEdge(newEdges[i].u_scc, newEdges[i].v_scc);
    }
    
    // 4. 在 DAG 上进行 DP，求最长路
    long long max_total_val = 0;
    for (int i = 1; i <= scc_cnt; ++i) {
        max_total_val = std::max(max_total_val, dfs_dp(i));
    }

    std::cout << max_total_val << std::endl;

    return 0;
}
```

===NEXT===

## 代码实现模板

```cpp
#include <iostream>
#include <algorithm> // For std::min, std::max, std::sort, std::unique (if needed for new graph edges)
// #include <vector> // GESP 9 级通常允许使用 vector，但若严格遵循“原生数组”原则，则避免使用。
                  // 本模板仍以原生数组实现邻接表和栈。

const int MAXN = 100005; // 最大节点数，根据题目 N 的范围调整
const int MAXM = 200005; // 最大边数，根据题目 M 的范围调整 (通常是 N 或 2N，有向图 M)

// -------------------- 原图邻接表 (链式前向星实现) --------------------
int head[MAXN];     // head[u] 存储节点 u 的第一条边的索引
int nxt[MAXM];      // nxt[i] 存储第 i 条边的下一条边的索引
int to[MAXM];       // to[i] 存储第 i 条边指向的节点
int edgeCount;      // 边计数器，表示当前添加的边总数

// 添加边函数：从 u 到 v
void addEdge(int u, int v) {
    to[edgeCount] = v;
    nxt[edgeCount] = head[u]; // 新边指向 u 原来的第一条边
    head[u] = edgeCount;      // u 的第一条边更新为新边
    edgeCount++;
}

// -------------------- Tarjan 算法核心数据结构 --------------------
int dfn[MAXN];      // dfn[u] 记录节点 u 的发现时间 (Discovery Time)
int low[MAXN];      // low[u] 记录节点 u 的追溯值 (Low-Link Value)
int timer;          // 全局时间戳，用于 dfn 赋值

int s[MAXN];        // 模拟栈，存储正在 DFS 且可能属于某个 SCC 的节点
int top;            // 栈顶指针，指向栈顶元素的下一个空位置

bool inStack[MAXN]; // inStack[u] 为 true 表示节点 u 当前在栈中

int scc_id[MAXN];   // scc_id[u] 记录节点 u 所属的强连通分量编号
int scc_cnt;        // 强连通分量的总数量

// -------------------- Tarjan 核心 DFS 函数 --------------------
void tarjan(int u) {
    dfn[u] = low[u] = ++timer; // 记录发现时间，并初始化追溯值为自己
    s[++top] = u;              // 节点 u 入栈
    inStack[u] = true;         // 标记 u 在栈中

    // 遍历节点 u 的所有邻接点 v
    for (int i = head[u]; i != -1; i = nxt[i]) {
        int v = to[i];
        if (dfn[v] == 0) { // 如果 v 未被访问 (树边)
            tarjan(v);
            low[u] = std::min(low[u], low[v]); // 用子节点的追溯值更新父节点的追溯值
        } else if (inStack[v]) { // 如果 v 已被访问且在栈中 (回边或横叉边指向栈中节点)
            low[u] = std::min(low[u], dfn[v]); // 用已访问祖先节点的发现时间更新追溯值
        }
        // 注意：如果 v 已访问但不在栈中，说明 v 已经属于某个已处理的 SCC，不更新 low[u]
    }

    // 如果 dfn[u] == low[u]，说明以 u 为根找到了一个强连通分量
    if (dfn[u] == low[u]) {
        scc_cnt++; // SCC 数量加一
        int current_node;
        do { // 从栈中弹出节点，直到弹出 u
            current_node = s[top--];
            inStack[current_node] = false; // 标记节点已出栈
            scc_id[current_node] = scc_cnt; // 记录节点所属的 SCC 编号
            // 可以在这里累加 SCC 权值等操作，如果题目需要
            // scc_val[scc_cnt] += node_weight[current_node];
        } while (current_node != u);
    }
}

// -------------------- 主函数示例框架 --------------------
int main() {
    // 优化输入输出
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n, m; // n 为节点数，m 为边数
    std::