# RMQ 综合例题

---

> **章节 ID：** `8-14-3`  
> **所属专题：** 专题 14 — 离散化与 ST 表  
> **所属等级：** Level 8 — GESP 八级 (综合巅峰)

## 教案内容

## 教学目标

### 知识目标
1.  理解**RMQ (Range Minimum Query)** 问题的定义、应用场景及其求解的挑战。
2.  掌握**离散化 (Discreteization)** 的概念、目的和具体实现步骤，理解其在处理大规模、稀疏数据时的作用。
3.  掌握**ST 表 (Sparse Table)** 的核心思想、数据结构 (`st[i][k]`)、预处理（构建）过程（基于倍增思想的动态规划）和查询过程。
4.  理解 `log_2` 预处理在 ST 表查询中的作用。

### 能力目标
1.  能够分析给定问题，判断是否适合使用离散化和 ST 表解决。
2.  能够独立实现离散化过程，将原始数据映射到新的连续区间。
3.  能够独立实现 ST 表的构建和查询功能。
4.  能够将离散化与 ST 表结合，解决复杂的区间最值查询问题。
5.  能够分析离散化和 ST 表算法的时间与空间复杂度。

### 素养目标
1.  培养对预处理思想的认识和运用能力，理解“以空间换时间”的优化策略。
2.  提升解决复杂问题时，将问题分解、抽象和转化的能力。
3.  培养严谨的逻辑思维和代码实现能力，注重边界条件和特殊情况的处理。
4.  激发对数据结构与算法学习的兴趣，享受解决难题的成就感。

===NEXT===

## 趣味引入

同学们，想象一下我们正在参加一场“寻宝大冒险”！你手头有一张巨大的藏宝图，上面标记了地球上很多地方的海拔高度。现在，探险队长给你下达了一个任务：在藏宝图的某个指定区域内（比如从经度 X 到经度 Y 之间），找到海拔最低的那个点，这样我们就能在那里挖宝了！

这个任务听起来很简单，对吧？我们只要把这个区域内所有点的海拔高度都看一遍，找出最小的就行了。
但是，如果这个藏宝图非常非常大，大到覆盖了整个地球，而且你需要频繁地在不同的区域里寻找最低点（比如找100万次），你还会觉得简单吗？
每次都遍历一遍，那不是要累死小助手吗？效率太低了！

更糟糕的是，藏宝图上的经度坐标可能不是连续的整数，比如有 1 号点、10000 号点、500000000 号点，中间大部分地方都没有标记。但是我们又想对一个“物理范围”进行查询，比如从经度 1000 到 20000 之间的最低点。
这该怎么办呢？如何高效地处理这些“大而不连续”的坐标，并且快速找出区间最小值呢？

别担心！今天，我们就来学习两种超级厉害的“魔法”：**离散化**和 **ST 表**。它们能帮助我们把复杂的问题变得简单，把慢腾腾的查找变得飞快，让我们成为真正的寻宝高手！

===NEXT===

## 深度知识点讲解

### 1. RMQ (Range Minimum Query) 问题

*   **是什么？** RMQ，全称 Range Minimum Query，即区间最值查询。顾名思义，它指的是在一系列数据中，查询给定区间 `[L, R]` 内的最小值（或者最大值）。
*   **为什么重要？** 它是许多复杂算法和数据结构的基础，广泛应用于各种需要查询区间极值的问题，例如：滑动窗口问题、最长上升子序列的优化、最近公共祖先 (LCA) 等。
*   **怎么想到的？**
    *   **朴素方法：** 对于每次查询 `[L, R]`，直接遍历 `L` 到 `R` 之间的所有元素，找出最小值。如果有 `N` 个元素，`Q` 次查询，每次查询需要 `O(R-L+1)`，最坏情况下 `O(N)`。总时间复杂度 `O(N*Q)`。当 `N` 和 `Q` 都很大（比如 `10^5` 级别）时，这将会非常慢 (`10^{10}` 次操作，无法接受)。
    *   **优化思路：** 能不能提前做一些“功课”，把一些信息预先计算好，这样查询的时候就能省力气了？就像我们背乘法口诀表一样，提前背好了，计算乘法就快了。这就是“预处理”的思想。ST 表就是一种非常高效的预处理方法。

### 2. 离散化 (Discreteization)

*   **是什么？** 离散化是一种处理大规模、稀疏数据（尤其是坐标或数值）的技术。它的核心思想是：将原始数据中**有用的、不重复的值**提取出来，然后将它们映射到从 0 或 1 开始的**连续整数序列**。
*   **为什么需要它？**
    *   **节省空间：** 当原始数据的取值范围非常大（例如 `1` 到 `10^9`），但实际有意义的、不重复的数据点数量却相对较少（例如只有 `10^5` 个）时，我们无法直接使用数组以下标作为原始值来存储数据（因为数组会太大，内存溢出）。离散化可以将这些稀疏的大值映射到小范围的连续下标，从而可以使用较小的数组。
    *   **简化问题：** 很多算法（如树状数组、线段树、ST 表等）要求数据是连续的、从 0 或 1 开始的下标。离散化为这些算法提供了“友好”的数据输入。
    *   **只关心相对大小：** 有时候我们只关心数据的相对大小或顺序，而不关心它们的绝对值。离散化保留了这种相对顺序。
*   **生活类比：**
    *   想象你是一个图书管理员，图书馆里有100本书，它们的编号分别是 1 号、50 号、1000 号、100000 号……这些编号非常稀疏，而且很大。如果你想把它们整齐地放在书架上，并按照编号顺序排列，你不会真的留出 99999 个空位来放书。
    *   离散化就像是给这些书重新编号：1 号书变成新编号 1，50 号书变成新编号 2，1000 号书变成新编号 3……这样，这100本书就被重新编号为 1 到 100 的连续整数，方便你管理和查找。
*   **怎么实现？**
    1.  **收集：** 把所有需要离散化的原始值（例如所有涉及的坐标 `x`）收集到一个临时的容器（比如 `vector`）中。
    2.  **排序：** 对这个容器中的值进行排序。
    3.  **去重：** 移除排序后容器中的重复值，只保留唯一的元素。
    4.  **映射：** 对于每一个原始值 `val`，通过在去重排序后的容器中查找它的位置（通常使用二分查找，如 `lower_bound` 函数），将其映射为一个新的、从 0 或 1 开始的连续整数下标。这个下标就是 `val` 离散化后的值。

### 3. ST 表 (Sparse Table)

*   **是什么？** ST 表是一种主要用于解决**静态** RMQ 问题的**数据结构**。它通过**预处理**所有长度为 `2^k` 的区间最值，使得每次查询可以在 `O(1)` 时间内完成。
*   **核心思想：** **倍增 (Doubling)**。我们不预处理所有可能的区间，而是只预处理长度为 `2^0, 2^1, 2^2, ..., 2^k` 这样的特殊区间。任何一个区间 `[L, R]` 都可以被分解成两个**可能重叠**的、长度为 `2^k` 的子区间。
*   **数据结构：**
    *   我们用一个二维数组 `st[i][k]` 来存储信息。
    *   `st[i][k]` 表示从下标 `i` 开始，长度为 `2^k` 的区间 `[i, i + 2^k - 1]` 中的最小值（或最大值）。
    *   例如：
        *   `st[i][0]`：表示 `[i, i + 2^0 - 1]`，即 `[i, i]`，也就是 `a[i]` 本身。
        *   `st[i][1]`：表示 `[i, i + 2^1 - 1]`，即 `[i, i+1]`。
        *   `st[i][k]`：表示 `[i, i + 2^k - 1]`。
*   **构建 (预处理) 过程：** 这是一个动态规划的过程。
    1.  **初始化 `k=0`：** 对于所有 `i`，`st[i][0] = a[i]`。这是长度为 `2^0 = 1` 的区间最小值。
    2.  **递推 `k > 0`：**
        对于 `k` 从 `1` 到 `log_2(N)`，对于 `i` 从 `0` 到 `N - (1<<k)`：
        `st[i][k] = min(st[i][k-1], st[i + (1<<(k-1))][k-1])`
        *   **解释：** 一个长度为 `2^k` 的区间 `[i, i + 2^k - 1]` 可以被看作是两个长度为 `2^(k-1)` 的子区间拼接而成：
            *   第一个子区间是 `[i, i + 2^(k-1) - 1]`，它的最小值是 `st[i][k-1]`。
            *   第二个子区间是 `[i + 2^(k-1), i + 2^k - 1]`，它的最小值是 `st[i + (1<<(k-1))][k-1]`。
        *   这两个子区间的最小值中的较小者，就是整个长度为 `2^k` 的区间的最小值。
*   **查询过程：**
    1.  给定查询区间 `[L, R]`（假设数组下标从 0 开始）。
    2.  计算区间的长度 `len = R - L + 1`。
    3.  找到最大的整数 `k`，使得 `2^k <= len`。这个 `k` 可以通过预处理 `log_2` 数组或者直接计算 `floor(log2(len))` 得到。
    4.  区间的最小值就是 `min(st[L][k], st[R - (1<<k) + 1][k])`。
        *   **解释：** 整个区间 `[L, R]` 被分解成两个长度为 `2^k` 的子区间，它们**重叠**在一起，共同覆盖了 `[L, R]`。
            *   第一个子区间是 `[L, L + 2^k - 1]`，最小值是 `st[L][k]`。
            *   第二个子区间是 `[R - 2^k + 1, R]`，最小值是 `st[R - (1<<k) + 1][k]`。
        *   由于求的是最小值，重复计算不会影响结果，只要确保所有元素都被覆盖到即可。
*   **预处理 `log_2` 值：** 为了 `O(1)` 查询 `k` 值，我们可以预先计算 `log_2[i]`，表示 `i` 的二进制表示中最高位的 `1` 所在的位置（或者说 `floor(log2(i))`）。
    `log_2[1] = 0`
    `log_2[i] = log_2[i/2] + 1` （对于 `i > 1`）
*   **时间复杂度：**
    *   构建：`O(N log N)` ( `N` 是数据规模，`log N` 是 `k` 的最大值)。
    *   查询：`O(1)`。
*   **空间复杂度：** `O(N log N)`。
*   **优点：** 查询速度极快，`O(1)`。
*   **缺点：** 静态数据结构，不支持修改操作。如果数据会动态变化，ST 表就不适用了（需要其他数据结构如线段树）。

### 常见误区
1.  **离散化后下标映射错误：** 离散化后，原始值 `val` 应该映射到其在去重排序数组中的**下标**，而不是其值本身。同时要注意下标是从 0 开始还是从 1 开始。
2.  **ST 表查询区间不完整：** 在查询 `[L, R]` 时，容易忘记 `R - (1<<k) + 1` 这个计算，导致第二个子区间没有正确覆盖到 `R`。
3.  **`k` 值计算错误：** `k` 必须是满足 `2^k <= len` 的最大整数。如果 `k` 过大，可能导致访问越界；如果 `k` 过小，可能无法完整覆盖区间。
4.  **最大 `k` 值：** `k` 的最大值通常是 `log_2(N)`，例如当 `N=10^5` 时，`log_2(10^5)` 大约是 16-17。所以 `st` 数组的第二维大小通常设置为 18-20 左右。

===NEXT===

## 典型例题精讲

### 例题一：纯 ST 表应用 - 区间最大值查询

**题目描述：**
给定一个包含 `N` 个整数的序列 `a_1, a_2, ..., a_N`。有 `M` 次查询，每次查询给定一个区间 `[L, R]`（下标从 1 开始），你需要输出该区间内的最大值。

**输入格式：**
第一行包含两个整数 `N` 和 `M`。
第二行包含 `N` 个整数，表示序列 `a`。
接下来 `M` 行，每行包含两个整数 `L` 和 `R`，表示查询的区间。

**输出格式：**
对于每个查询，输出一行一个整数，表示区间 `[L, R]` 中的最大值。

**样例输入：**
```
8 3
1 5 2 7 3 8 4 6
1 4
3 6
2 8
```

**样例输出：**
```
7
8
8
```

**思路分析：**
1.  **问题类型：** 这是一个典型的 RMQ 问题，需要查询区间最大值。由于序列是静态的，且查询次数 `M` 较多，ST 表是理想的选择。
2.  **ST 表定义：** 我们需要构建一个 `st[i][k]` 数组，表示从下标 `i` 开始，长度为 `2^k` 的区间 `[i, i + 2^k - 1]` 中的最大值。
3.  **预处理 `log_2`：** 为了 `O(1)` 查询 `k`，预处理 `log_2[i]` 数组。
4.  **构建 ST 表：**
    *   `st[i][0] = a[i]` （对于 `i` 从 `1` 到 `N`）。
    *   对于 `k` 从 `1` 到 `log_2[N]`，对于 `i` 从 `1` 到 `N - (1<<k) + 1`：
        `st[i][k] = max(st[i][k-1], st[i + (1<<(k-1))][k-1])`
5.  **查询：**
    *   对于每次查询 `[L, R]`：
    *   计算 `k = log_2[R - L + 1]`。
    *   结果为 `max(st[L][k], st[R - (1<<k) + 1][k])`。

**C++ 代码实现：**

```cpp
#include <iostream>
#include <algorithm> // 引入 max 函数

const int MAXN = 100005; // N的最大值
const int LOG_MAXN = 18; // log2(100000) 约等于 16.6，所以取 18 足够

int a[MAXN]; // 原始序列
int st[MAXN][LOG_MAXN]; // ST表，st[i][k]表示从i开始长度为2^k区间的最大值
int log_2[MAXN]; // 预处理log2值，log_2[i] = floor(log2(i))

void build_st(int n) {
    // 预处理 log_2 数组
    log_2[1] = 0;
    for (int i = 2; i <= n; ++i) {
        log_2[i] = log_2[i / 2] + 1;
    }

    // 初始化 ST 表，k=0 的情况
    for (int i = 1; i <= n; ++i) {
        st[i][0] = a[i];
    }

    // 递推构建 ST 表
    // k 从 1 开始，每次倍增
    for (int k = 1; (1 << k) <= n; ++k) {
        // i 是区间的起始位置
        // 保证 i + (1 << k) - 1 不超过 n
        for (int i = 1; i + (1 << k) - 1 <= n; ++i) {
            // 当前长度为 2^k 的区间 [i, i + 2^k - 1]
            // 由两个长度为 2^(k-1) 的区间合并而来
            // 第一个区间: [i, i + 2^(k-1) - 1]，其最大值为 st[i][k-1]
            // 第二个区间: [i + 2^(k-1), i + 2^k - 1]，其最大值为 st[i + (1 << (k - 1))][k-1]
            st[i][k] = std::max(st[i][k - 1], st[i + (1 << (k - 1))][k - 1]);
        }
    }
}

int query_st(int l, int r) {
    // 计算区间长度
    int len = r - l + 1;
    // 找到最大的 k，使得 2^k <= len
    int k = log_2[len];
    // 查询结果为两个长度为 2^k 的区间的最大值
    // 第一个区间: [l, l + 2^k - 1]
    // 第二个区间: [r - 2^k + 1, r]
    return std::max(st[l][k], st[r - (1 << k) + 1][k]);
}

int main() {
    // 优化输入输出
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n, m;
    std::cin >> n >> m;

    for (int i = 1; i <= n; ++i) {
        std::cin >> a[i];
    }

    // 构建 ST 表
    build_st(n);

    // 处理查询
    for (int q = 0; q < m; ++q) {
        int l, r;
        std::cin >> l >> r;
        std::cout << query_st(l, r) << "\n";
    }

    return 0;
}

```
**复杂度分析：**
*   **时间复杂度：**
    *   预处理 `log_2` 数组：`O(N)`。
    *   构建 ST 表：外层循环 `k` 运行 `log N` 次，内层循环 `i` 运行 `N` 次。所以构建时间为 `O(N log N)`。
    *   每次查询：`O(1)`。
    *   总时间复杂度：`O(N log N + M)`。
*   **空间复杂度：**
    *   `a` 数组：`O(N)`。
    *   `st` 数组：`O(N log N)`。
    *   `log_2` 数组：`O(N)`。
    *   总空间复杂度：`O(N log N)`。

---

### 例题二：离散化 + ST 表应用

**题目描述：**
小明在玩一个游戏，游戏中有 `N` 个事件。每个事件 `i` 发生在一个特定的时间点 `t_i`，并产生一个分数 `s_i`。时间点 `t_i` 的范围非常大（例如 `1` 到 `10^9`），但事件总数 `N` 不超过 `10^5`。
现在小明想知道，对于 `M` 次查询，每次给定一个时间区间 `[T_start, T_end]`，在这个时间区间内发生的所有事件中，产生的最低分数是多少？如果区间内没有事件，则输出 `-1`。

**输入格式：**
第一行包含两个整数 `N` 和 `M`。
接下来 `N` 行，每行包含两个整数 `t_i` 和 `s_i`，表示事件发生的时间和分数。
接下来 `M` 行，每行包含两个整数 `T_start` 和 `T_end`，表示查询的时间区间。

**输出格式：**
对于每个查询，输出一行一个整数，表示区间 `[T_start, T_end]` 内的最低分数。

**样例输入：**
```
5 3
100 5
200 10
50 2
300 8
150 7
1 100
100 250
350 400
```

**样例输出：**
```
2
5
-1
```

**思路分析：**
1.  **问题特点：** 时间 `t_i` 范围大但事件 `N` 数量有限，需要查询区间最小值。这正是离散化 + ST 表的典型应用场景。
2.  **离散化：**
    *   收集所有事件时间 `t_i` 和查询的 `T_start`, `T_end`（为了处理查询区间边界）。将它们全部放入一个临时的 `vector`。
    *   对 `vector` 排序并去重，得到一个从小到大排列的唯一时间点序列。
    *   这样，我们将所有相关的“大时间点”映射到了 `0` 到 `unique_count - 1` 的连续整数下标。
3.  **构建离散化后的数组 `b`：**
    *   创建一个新数组 `b`，大小为 `unique_count`。`b[idx]` 将存储离散化后时间点 `idx` 上的最低分数。
    *   初始化 `b` 数组为无穷大（或者一个足够大的值，表示目前没有事件发生）。
    *   遍历所有 `N` 个事件 `(t_i, s_i)`：
        *   找到 `t_i` 在离散化序列中的下标 `idx = lower_bound(unique_times.begin(), unique_times.end(), t_i) - unique_times.begin()`。
        *   更新 `b[idx] = min(b[idx], s_i)`。
4.  **构建 ST 表：**
    *   在离散化后的数组 `b` 上构建 ST 表。
    *   `st[i][k]` 存储 `b` 数组中 `[i, i + 2^k - 1]` 区间的最小值。
5.  **查询：**
    *   对于每次查询 `[T_start, T_end]`：
    *   找到 `T_start` 在离散化序列中的起始下标 `L_idx`：`lower_bound(unique_times.begin(), unique_times.end(), T_start) - unique_times.begin()`。
    *   找到 `T_end` 在离散化序列中的结束下标 `R_idx`：`upper_bound(unique_times.begin(), unique_times.end(), T_end) - unique_times.begin() - 1`。
    *   注意：如果 `L_idx > R_idx`，说明查询区间内没有对应的离散化时间点，直接输出 `-1`。
    *   否则，在 `b` 数组的 `[L_idx, R_idx]` 范围内进行 ST 表查询。
    *   如果查询结果仍是无穷大（初始值），说明该离散化区间内没有实际事件发生，输出 `-1`。

**C++ 代码实现：**

```cpp
#include <iostream>
#include <vector>
#include <algorithm> // 引入 sort, unique, lower_bound, min

const int MAXN_EVENTS = 100005; // N的最大值
const int LOG_MAXN_DISCRETE = 18; // log2(MAXN_EVENTS) 约等于 16.6，取 18 足够
const int INF = 2000000000; // 定义一个足够大的值表示无穷大，作为初始最小值

// 存储原始事件
struct Event {
    int t, s;
};
Event events[MAXN_EVENTS];

// 存储所有需要离散化的时间点
std::vector<int> discrete_points;

// 离散化后的数组，b[i] 表示在第 i 个离散化时间点上的最低分数
int b[MAXN_EVENTS];

// ST表
int st[MAXN_EVENTS][LOG_MAXN_DISCRETE];
// 预处理log2值
int log_2[MAXN_EVENTS];

// 离散化函数
void discretize(int n) {
    // 收集所有事件的时间点
    for (int i = 0; i < n; ++i) {
        discrete_points.push_back(events[i].t);
    }
    // 排序并去重
    std::sort(discrete_points.begin(), discrete_points.end());
    discrete_points.erase(std::unique(discrete_points.begin(), discrete_points.end()), discrete_points.end());

    // 初始化离散化后的分数数组为无穷大
    for (int i = 0; i < discrete_points.size(); ++i) {
        b[i] = INF;
    }

    // 将事件分数更新到离散化后的数组
    for (int i = 0; i < n; ++i) {
        // 找到事件时间 t_i 对应的离散化下标
        int idx = std::lower_bound(discrete_points.begin(), discrete_points.end(), events[i].t) - discrete_points.begin();
        b[idx] = std::min(b[idx], events[i].s);
    }
}

// 构建 ST 表
void build_st(int discrete_size) {
    // 预处理 log_2 数组
    log_2[1] = 0;
    for (int i = 2; i <= discrete_size; ++i) {
        log_2[i] = log_2[i / 2] + 1;
    }

    // 初始化 ST 表，k=0 的情况
    for (int i = 0; i < discrete_size; ++i) {
        st[i][0] = b[i];
    }

    // 递推构建 ST 表
    for (int k = 1; (1 << k) <= discrete_size; ++k) {
        for (int i = 0; i + (1 << k) - 1 < discrete_size; ++i) {
            st[i][k] = std::min(st[i][k - 1], st[i + (1 << (k - 1))][k - 1]);
        }
    }
}

// 查询 ST 表
int query_st(int l_idx, int r_idx) {
    if (l_idx > r_idx) { // 如果查询范围无效
        return INF;
    }
    int len = r_idx - l_idx + 1;
    int k = log_2[len];
    return std::min(st[l_idx][k], st[r_idx - (1 << k) + 1][k]);
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n, m;
    std::cin >> n >> m;

    for (int i = 0; i < n; ++i) {
        std::cin >> events[i].t >> events[i].s;
    }

    // 离散化处理
    discretize(n);
    int discrete_size = discrete_points.size();

    // 构建 ST 表
    build_st(discrete_size);

    // 处理查询
    for (int q = 0; q < m; ++q) {
        int t_start, t_end;
        std::cin >> t_start >> t_end;

        // 找到查询时间区间 [T_start, T_end] 对应的离散化下标区间 [L_idx, R_idx]
        // L_idx: 第一个 >= T_start 的离散化时间点的下标
        int l_idx = std::lower_bound(discrete_points.begin(), discrete_points.end(), t_start) - discrete_points.begin();
        // R_idx: 最后一个 <= T_end 的离散化时间点的下标
        // upper_bound 找到第一个 > T_end 的位置，再减 1 就是最后一个 <= T_end 的位置
        int r_idx = std::upper_bound(discrete_points.begin(), discrete_points.end(), t_end) - discrete_points.begin() - 1;

        // 如果有效查询区间为空，或者 L_idx 已经超出离散化数组范围，则无事件
        if (l_idx > r_idx || l_idx >= discrete_size) {
            std::cout << -1 << "\n";
        } else {
            int result = query_st(l_idx, r_idx);
            if (result == INF) { // 如果查询结果是初始的无穷大，说明区间内没有实际事件发生
                std::cout << -1 << "\n";
            } else {
                std::cout << result << "\n";
            }
        }
    }

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度：**
    *   收集离散化点：`O(N)`。
    *   排序去重：`O(N log N)`。
    *   更新 `b` 数组：`N` 次 `lower_bound`，每次 `O(log N)`。总 `O(N log N)`。
    *   构建 ST 表：`O(discrete_size * log(discrete_size))`，由于 `discrete_size <= N`，所以是 `O(N log N)`。
    *   每次查询：`O(log N)` (用于 `lower_bound`/`upper_bound`) + `O(1)` (ST 表查询)。总 `O(M log N)`。
    *   总时间复杂度：`O(N log N + M log N)`。
*   **空间复杂度：**
    *   `events` 数组：`O(N)`。
    *   `discrete_points` `vector`：`O(N)`。
    *   `b` 数组：`O(N)`。
    *   `st` 数组：`O(N log N)`。
    *   `log_2` 数组：`O(N)`。
    *   总空间复杂度：`O(N log N)`。

===NEXT===

## 代码实现模板

这里提供一个通用的 ST 表和离散化的模板，方便同学们在实际题目中进行修改和应用。

```cpp
#include <iostream>
#include <vector>
#include <algorithm> // for std::sort, std::unique, std::lower_bound, std::min/max

// --- 常量定义 ---
const int MAX_DATA_COUNT = 100005; // 原始数据或离散化后的数据最大数量
const int LOG_MAX_DATA_COUNT = 18; // log2(MAX_DATA_COUNT) 向上取整，通常取18-20
const int INF_MAX = 2000000000;    // 用于表示极大值（求最小值时作为初始值）
const int INF_MIN = -2000000000;   // 用于表示极小值（求最大值时作为初始值）

// --- ST 表相关数组 ---
// st[i][k] 表示从下标 i 开始，长度为 2^k 的区间的最值
int st[MAX_DATA_COUNT][LOG_MAX_DATA_COUNT];
// log_2[i] = floor(log2(i))，用于 O(1) 查询 k
int log_2[MAX_DATA_COUNT];

// --- 离散化相关数据 ---
// 存储所有需要离散化的原始值（例如坐标、时间点等）
std::vector<int> all_values_to_discretize;
// 离散化后的值数组 (例如 b[idx] = score_at_discrete_idx)
// 这里的 MAX_DATA_COUNT 实际上是离散化后的最大数量
int discrete_value_array[MAX_DATA_COUNT];

// --- 离散化函数 ---
// 功能：收集所有需要离散化的值，并生成映射关系
// 参数：
//   - original_values: 存储原始值的 vector (或数组)，注意传入方式
//   - count: 原始值的数量
// 返回：离散化后不重复值的数量
int perform_discretization(const std::vector<int>& original_values) {
    all_values_to_discretize.clear(); // 清空，准备新的离散化
    // 复制所有原始值到临时 vector
    for (int val : original_values) {
        all_values_to_discretize.push_back(val);
    }

    // 排序
    std::sort(all_values_to_discretize.begin(), all_values_to_discretize.end());
    // 去重
    all_values_to_discretize.erase(
        std::unique(all_values_to_discretize.begin(), all_values_to_discretize.end()),
        all_values_to_discretize.end()
    );

    // 返回离散化后不重复值的数量
    return all_values_to_discretize.size();
}

// 功能：获取某个原始值 val 离散化后的下标
// 参数：
//   - val: 待查询的原始值
// 返回：val 在离散化序列中的 0-based 下标
int get_discrete_index(int val) {
    return std::lower_bound(all_values_to_discretize.begin(), all_values_to_discretize.end(), val) - all_values_to_discretize.begin();
}

// --- ST 表构建函数 ---
// 功能：在 discrete_value_array 数组上构建 ST 表
// 参数：
//   - n: discrete_value_array 的有效大小（离散化后的总元素数量）
//   - is_min_query: true 表示构建用于求最小值的ST表，false 表示求最大值
void build_st(int n, bool is_min_query) {
    // 预处理 log_2 数组
    log_2[1] = 0;
    for (int i = 2; i <= n; ++i) {
        log_2[i] = log_2[i / 2] + 1;
    }

    // 初始化 ST 表，k=0 的情况
    for (int i = 0; i < n; ++i) {
        st[i][0] = discrete_value_array[i];
    }

    // 递推构建 ST 表
    for (int k = 1; (1 << k) <= n; ++k) {
        for (int i = 0; i + (1 << k) - 1 < n; ++i) {
            if (is_min_query) {
                st[i][k] = std::min(st[i][k - 1], st[i + (1 << (k - 1))][k - 1]);
            } else { // 求最大值
                st[i][k] = std::max(st[i][k - 1], st[i + (1 << (k - 1))][k - 1]);
            }
        }
    }
}

// --- ST 表查询函数 ---
// 功能：查询 discrete_value_array 数组在区间 [l_idx, r_idx] 的最值
// 参数：
//   - l_idx: 区间起始 0-based 下标
//   - r_idx: 区间结束 0-based 下标
//   - is_min_query: true 表示求最小值，false 表示求最大值
// 返回：区间最值，如果 l_idx > r_idx 或区间无效，返回 INF_MAX/INF_MIN
int query_st(int l_idx, int r_idx, bool is_min_query) {
    if (l_idx > r_idx) { // 无效区间
        return is_min_query ? INF_MAX : INF_MIN;
    }
    int len = r_idx - l_idx + 1;
    int k = log_2[len];
    if (is_min_query) {
        return std::min(st[l_idx][k], st[r_idx - (1 << k) + 1][k]);
    } else { // 求最大值
        return std::max(st[l_idx][k], st[r_idx - (1 << k) + 1][k]);
    }
}

// --- 主函数示例框架 (根据具体题目修改) ---
/*
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n_events, m_queries;
    std::cin >> n_events >> m_queries;

    std::vector<std::pair<int, int>> raw_events(n_events);
    std::vector<int> all_t_values; // 收集所有时间点用于离散化

    for (int i = 0; i < n_events; ++i) {
        std::cin >> raw_events[i].first >> raw_events[i].second;
        all_t_values.push_back(raw_events[i].first);
    }

    // --- 离散化步骤 ---
    int discrete_size = perform_discretization(all_t_values);

    // 初始化 discrete_value_array，用于存储离散化后的数据，例如分数
    for (int i = 0; i < discrete_size; ++i) {
        discrete_value_array[i] = INF_MAX; // 假设我们要求最小值，初始化为极大值
    }

    // 将原始事件数据映射到 discrete_value_array
    for (int i = 0; i < n_events; ++i) {
        int t = raw_events[i].first;
        int s = raw_events[i].second;
        int discrete_idx = get_discrete_index(t);
        discrete_value_array[discrete_idx] = std::min(discrete_value_array[discrete_idx], s); // 假设求最低分数
    }

    // --- 构建 ST 表 ---
    build_st(discrete_size, true); // true 表示构建求最小值的 ST 表