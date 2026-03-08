# LCT 实现链接/断开

## 教学目标

*   **知识目标:**
    *   理解 LCT (Link-Cut Tree) 的核心思想：实边与虚边、Splay 树的维护方式。
    *   掌握 LCT 中 `access(u)`、`makeRoot(u)`、`findRoot(u)` 三个基础操作的原理与实现细节。
    *   深入理解 `link(u, v)` 和 `cut(u, v)` 操作的逻辑，以及它们如何利用 `access` 等基础操作实现。
    *   理解 LCT 各操作的均摊时间复杂度为 O(log N)。
*   **能力目标:**
    *   能够独立分析 LCT 动态树问题的需求，并将其转化为 LCT 提供的操作。
    *   能够准确实现 LCT 的 `rotate`、`splay`、`access`、`makeRoot`、`findRoot`、`link`、`cut` 等核心函数。
    *   能够在具体题目中运用 LCT 解决动态树连接、断开等问题。
*   **素养目标:**
    *   培养学生面对复杂动态树问题的抽象建模能力和分解问题能力。
    *   激发对高级数据结构设计思想的好奇心和探索欲。
    *   提升严谨的代码实现能力和调试能力。

===NEXT===

## 趣味引入

同学们，想象一下我们生活在一个充满道路和桥梁的城市。有些是高速公路，车速飞快，直达目的地；有些是普通道路，连接着各个小镇。现在，这个城市正在快速发展：

1.  **新建高速公路：** 我们需要把两个原本不相连的城市连接起来，架设一座新的大桥，让它们之间可以通行。
2.  **拆除旧桥梁：** 有时候，因为城市规划或者安全问题，我们需要拆除某条道路上的一个路段，让它断开。
3.  **紧急疏通：** 突然，市长要从城市 A 赶往城市 B，他希望这条路线上的所有道路都能变成“高速通道”，保证一路畅通无阻，并且他希望 A 城市能成为整个交通网络的“中心枢纽”。
4.  **寻找源头：** 市民想知道，从他们所在的城市出发，最终能到达的“交通总指挥中心”是哪个城市？

如果城市的道路和桥梁是固定的，我们用静态的树结构就能解决。但是，如果这些连接关系是动态变化的呢？道路可以新建，也可以拆除！我们如何高效地完成这些操作，同时还能快速回答市长的要求和市民的问题呢？

今天，我们就来学习一个超级强大的“城市交通管理系统”——**LCT (Link-Cut Tree，链接-断开树)**！它就像一个魔法工具，能让我们动态地管理森林（多棵树），高效地完成连接、断开、路径查询等各种操作。我们今天的重点就是学习如何用它来“新建高速公路”（`link`）和“拆除旧桥梁”（`cut`）！

===NEXT===

## 深度知识点讲解

### LCT：动态树的魔法师

LCT 是一种数据结构，它能维护一个由若干棵树组成的森林，并支持对这些树进行动态的修改操作（如连接、断开边）和路径查询操作（如查询路径上的最大值、求和等）。

它的核心思想非常精妙：它把每棵树分解成若干条“实路径”和“虚边”。

*   **实边 (Solid Edge):** 构成“实路径”，这些路径由 Splay 树（伸展树）来维护。
*   **虚边 (Dashed Edge):** 连接不同的 Splay 树。一个 Splay 树的根节点会有一个指向其在原树中父节点的虚边。

你可以把实边想象成高速公路，虚边想象成普通连接路。Splay 树就是高速公路管理系统，负责维护一条高速公路上的所有节点。

### LCT 的节点结构

每个节点 `u` 在 LCT 中需要维护以下信息：
*   `p[u]`: 节点 `u` 在其 Splay 树中的父节点，或者，如果是 Splay 树的根，则指向其在原树中的虚边父节点。
*   `c[u][0]`: 节点 `u` 的左子节点（Splay 树中）。
*   `c[u][1]`: 节点 `u` 的右子节点（Splay 树中）。
*   `f[u]`: 懒惰标记，用于路径翻转（`makeRoot` 操作会用到）。

```cpp
const int N = 100005; // 最大节点数

int p[N], c[N][2]; // p[u]: u的父节点, c[u][0/1]: u的左右孩子
bool f[N];         // f[u]: 翻转标记
// 还可以添加其他信息，例如路径和、路径最大值等
// int v[N], s[N]; // v[u]: 节点u的值, s[u]: u所在Splay子树的值和
```

### Splay 树基础回顾 (LCT 的基石)

LCT 内部维护实路径的关键就是 Splay 树。Splay 树是一种自平衡二叉查找树，它通过“伸展”（splay）操作，将最近访问的节点旋转到根，从而保证均摊 O(log N) 的操作复杂度。

**1. `isRoot(u)`: 判断 `u` 是否是其所属 Splay 树的根**
在 LCT 中，`isRoot(u)` 检查的是 `u` 是否是 *当前 Splay 树* 的根，而不是整个树的根。一个节点是 Splay 树的根，当且仅当它的父节点 `p[u]` 不为空，且 `u` 不是 `p[u]` 的左右孩子（即 `u` 是通过虚边连接到 `p[u]` 的）。

```cpp
// 判断u是否是其所属Splay树的根
// 如果u是p[u]的左孩子或右孩子，说明u在Splay树内部
// 否则，u是Splay树的根，通过虚边连接到p[u]
bool isRoot(int u) {
    return c[p[u]][0] != u && c[p[u]][1] != u;
}
```

**2. `rotate(u)`: 旋转操作**
这是 Splay 树最基础的操作。它将节点 `u` 向上旋转，使其成为其父节点 `x` 的位置。

```cpp
// 获取u是其父节点x的哪个孩子 (0为左，1为右)
int get(int u) {
    return c[p[u]][1] == u;
}

// 推送懒惰标记 (如果需要的话)
void pushdown(int u) {
    if (f[u]) {
        // 交换左右孩子
        swap(c[u][0], c[u][1]);
        // 传递标记给孩子
        if (c[u][0]) f[c[u][0]] ^= 1;
        if (c[u][1]) f[c[u][1]] ^= 1;
        f[u] = 0; // 清除自身标记
    }
}

// 向上更新节点信息 (如果需要的话，例如路径和)
void pushup(int u) {
    // s[u] = s[c[u][0]] ^ s[c[u][1]] ^ v[u]; // 示例：异或和
}

// 旋转操作：将u向上旋转，使其代替其父节点x的位置
void rotate(int u) {
    int x = p[u], y = p[x]; // x是u的父节点，y是x的父节点
    int d = get(u);         // d表示u是x的左孩子(0)还是右孩子(1)

    // 如果x不是其所属Splay树的根，则u的父节点p[u]的父节点y需要指向u
    if (!isRoot(x)) {
        c[y][get(x)] = u;
    }
    p[u] = y; // u的父节点指向y

    // 将u的相反方向的孩子作为x的孩子
    c[x][d] = c[u][1 - d];
    if (c[u][1 - d]) p[c[u][1 - d]] = x; // 如果孩子存在，更新其父节点

    // u成为x的父节点，x成为u的子节点
    c[u][1 - d] = x;
    p[x] = u;

    // 更新节点信息 (先更新x，再更新u)
    pushup(x);
    pushup(u);
}
```

**3. `splay(u)`: 伸展操作**
将节点 `u` 旋转到其所属 Splay 树的根。这是 LCT 中最常用的操作。

```cpp
// 辅助函数：将路径上的所有懒惰标记从上到下推送
void splay_pushdown_path(int u) {
    if (!isRoot(u)) splay_pushdown_path(p[u]); // 递归推送父节点的标记
    pushdown(u); // 推送自己的标记
}

// 伸展操作：将u旋转到其所属Splay树的根
void splay(int u) {
    splay_pushdown_path(u); // 先推送路径上的所有标记
    for (int x = p[u]; !isRoot(u); x = p[u]) {
        if (!isRoot(x)) { // 如果x也不是Splay树的根
            rotate(get(u) == get(x) ? x : u); // Zag-Zag 或 Zig-Zag
        }
        rotate(u); // Zig 或 Zag
    }
    pushup(u); // 最终更新u的信息
}
```

### LCT 的核心操作

**1. `access(u)`: 核心！打通路径**
这是 LCT 最关键的操作。它的作用是：
*   将节点 `u` 到其所在原树的根节点的路径，全部变为实边（preferred path）。
*   将 `u` 变为这条实路径上 Splay 树的根。
*   断开 `u` 原本与其右孩子之间的实边（如果有），用 `u` 替代其右孩子。

**生活类比：** 想象 `access(u)` 就是“铺设一条从城市 `u` 直达‘总指挥中心’的高速公路”。这条高速公路会经过一些关键节点，每到一个节点，就会把这个节点连接的“普通道路”断开，然后把这个节点纳入到新的高速公路网中。

```cpp
// access操作：将u到树根的路径变为实链，并使u成为Splay树的根
void access(int u) {
    for (int v = 0; u; v = u, u = p[u]) { // u从当前节点开始向上，v是u的右孩子
        splay(u); // 将u旋转到当前Splay树的根
        // 此时u是当前Splay树的根，它原本的右子树是实路径
        // 现在要将u的右子树替换为v（v是上一个Splay树的根）
        c[u][1] = v; // u的右孩子变为v（虚边转实边）
        p[v] = u;    // v的父节点变为u
        pushup(u);   // 更新u的信息
    }
}
```

**2. `makeRoot(u)`: 改变树的根**
将节点 `u` 所在树的根变为 `u`。

**生活类比：** 想象 `makeRoot(u)` 就是“把城市 `u` 设立为新的交通总指挥中心”。为了达到这个目的，我们需要把从 `u` 到旧总指挥中心的所有道路方向都反过来，让它们都指向 `u`。

```cpp
// makeRoot操作：将u变为其所在树的根
void makeRoot(int u) {
    access(u); // 打通u到原树根的路径，u成为Splay树的根
    splay(u);  // 确保u是Splay树的根
    f[u] ^= 1; // 翻转u所在Splay树的路径方向 (懒惰标记)
    pushdown(u); // 立即推送一次标记，确保后续操作正确
}
```

**3. `findRoot(u)`: 查找树的根**
查找节点 `u` 所在树的实际根节点。

**生活类比：** 想象 `findRoot(u)` 就是“从城市 `u` 出发，沿着高速公路一直走，直到找到最终的交通总指挥中心”。

```cpp
// findRoot操作：查找u所在树的根节点
int findRoot(int u) {
    access(u); // 打通u到根的路径
    splay(u);  // 确保u是Splay树的根
    // 根节点一定是Splay树中最左边的节点（深度最小）
    while (c[u][0]) {
        pushdown(u); // 确保路径上的标记都已推送
        u = c[u][0];
    }
    splay(u); // 将真正的根节点旋转到Splay树的根，方便后续操作
    return u;
}
```

### 链接与断开操作 (今天的重点！)

有了 `access`, `makeRoot`, `findRoot` 这三个核心操作，`link` 和 `cut` 就变得非常简洁了。

**1. `link(u, v)`: 连接两个节点**
在节点 `u` 和 `v` 之间添加一条边。
**前置条件：** `u` 和 `v` 必须属于不同的连通分量 (即 `findRoot(u) != findRoot(v)`)。

**生活类比：** 就像在两个独立的城市网络之间架设一座新桥。为了方便，我们把其中一个城市（比如 `u`）设为临时总指挥中心，然后直接把另一个城市（`v`）连接到它下面。

```cpp
// link操作：连接u和v，将u作为v的子节点
void link(int u, int v) {
    makeRoot(u); // 将u变为其所在树的根
    // 此时u是Splay树的根，且是原树的根，p[u] = 0
    if (findRoot(v) != u) { // 如果u和v不在同一个连通分量
        p[u] = v; // 将u的父节点设为v (虚边连接)
    }
}
```

**2. `cut(u, v)`: 断开两个节点之间的边**
断开节点 `u` 和 `v` 之间的边。
**前置条件：** `u` 和 `v` 之间必须存在一条边，并且 `u` 和 `v` 必须是相邻的。

**生活类比：** 拆除城市 `u` 和 `v` 之间的一段道路。为了确保精确拆除，我们先要把 `u` 设为总指挥中心，然后把 `v` 所在的路径打通到 `u`，这样 `u` 和 `v` 就在同一条高速公路上，并且 `v` 是 `u` 的直接子节点。然后我们就可以安全地断开它们。

```cpp
// cut操作：断开u和v之间的边
void cut(int u, int v) {
    makeRoot(u); // 将u变为其所在树的根
    access(v);   // 打通v到u的路径，v成为Splay树的根
    splay(v);    // 确保v是Splay树的根
    // 此时，如果u和v之间有边，那么u一定是v的左孩子，且v没有右孩子
    // (因为u是根，v在u的子树中，makeRoot(u)后u在v的左边，且access(v)后v是路径根，右子树为空)
    if (c[v][0] == u && !c[u][0] && !c[u][1]) { // 检查条件：u是v的左孩子，且u没有自己的左右孩子（确保u是直接连接到v的）
        c[v][0] = 0; // 断开v的左孩子u
        p[u] = 0;    // 断开u的父节点v
        pushup(v);   // 更新v的信息
    }
    // 注意：这里的条件检查非常重要，要确保u和v确实是直接相连的父子关系
    // 如果没有这个检查，可能会错误地断开不相连的节点，或者断开的不是直接父子关系
}
```

**关于 `cut(u, v)` 的条件补充：**
在 `cut(u, v)` 中，`makeRoot(u)` 使得 `u` 成为其所在树的根，且其 `p[u]=0`。
然后 `access(v)` 使得 `v` 到 `u` 的路径变为实链，并且 `v` 成为这条实链的 Splay 树的根。
此时，如果 `u` 和 `v` 之间确实有边，那么 `u` 一定是 `v` 的左孩子（因为 `u` 是原树的根，`v` 是其子孙，`makeRoot(u)` 翻转了路径，使得 `u` 在 `v` 的左边）。
同时，由于 `v` 被 `access` 成为实链的根，它的右子树是空的（因为 `access` 过程中 `c[u][1] = v` 替换了右子树）。
所以，`cut` 的条件可以简化为：`c[v][0] == u` 且 `p[u] == v` 且 `c[v][1] == 0`。
我的代码中 `!c[u][0] && !c[u][1]` 是为了更严谨地确保 `u` 是叶子节点且直接连到 `v`，但实际上 `makeRoot(u)` 之后 `u` 会是 Splay 树的根，其左右孩子都应该为空（或被处理），所以更简洁的 `if (c[v][0] == u && p[u] == v)` 可能也足够，但为了防止意外情况，`c[v][1] == 0` 是关键的。

### 复杂度分析

LCT 的所有操作（包括 `link`, `cut`, `access`, `makeRoot`, `findRoot`）的均摊时间复杂度都是 **O(log N)**，其中 N 是节点数量。这是因为 Splay 树本身的均摊复杂度保证了 LCT 的高效性。

===NEXT===

## 典型例题精讲

**例题：动态连通性判断与修改**

**题目描述：**
给定一个 N 个节点 M 条边的森林。你需要支持以下两种操作：
1.  `link u v`: 在节点 `u` 和 `v` 之间添加一条边。如果 `u` 和 `v` 已经连通，则忽略此操作。
2.  `cut u v`: 删除节点 `u` 和 `v` 之间的边。如果 `u` 和 `v` 不存在边，或者 `u` 和 `v` 之间有边但删除后会使图不连通（即 `u` 和 `v` 不构成桥），则忽略此操作。
3.  `query u v`: 查询 `u` 和 `v` 是否连通。

**输入格式：**
第一行两个整数 N, M，表示节点数和操作数。
接下来 M 行，每行一个操作。操作格式为 `1 u v` (link), `2 u v` (cut), `3 u v` (query)。

**输出格式：**
对于每个 `query` 操作，如果 `u` 和 `v` 连通输出 `Yes`，否则输出 `No`。

**数据范围：** N <= 100000, M <= 100000

---

**思路分析：**

这道题是 LCT 的经典应用。
*   **连通性判断 (`query u v`):** 我们可以使用 `findRoot(u)` 和 `findRoot(v)` 来判断。如果它们返回的根节点相同，则 `u` 和 `v` 连通。
*   **链接操作 (`link u v`):**
    1.  首先判断 `u` 和 `v` 是否已经连通：`if (findRoot(u) == findRoot(v)) return;`
    2.  如果未连通，直接调用 LCT 的 `link(u, v)` 函数。
*   **断开操作 (`cut u v`):**
    1.  首先判断 `u` 和 `v` 是否连通：`if (findRoot(u) != findRoot(v)) return;` (不连通当然不能断开)
    2.  然后，为了确保 `u` 和 `v` 之间确实存在一条直接的边，并且这条边不是桥（即删除后不会导致连通分量数量减少），我们需要进行更详细的检查。
        *   `makeRoot(u)`: 将 `u` 设为根。
        *   `access(v)`: 打通 `v` 到 `u` 的路径，`v` 成为 Splay 树的根。
        *   `splay(v)`: 确保 `v` 是 Splay 树的根。
        *   此时，如果 `u` 和 `v` 直接相连，`u` 会是 `v` 的左孩子，且 `v` 的右孩子必须为空 (因为 `access(v)` 替换了右子树)。同时，`u` 本身不能有其他孩子（确保它是直接连到 `v` 的）。
        *   所以，检查条件为 `c[v][0] == u && !c[u][0] && !c[u][1]`。满足这些条件才能调用 `cut(u, v)`。

**代码实现：**

```cpp
#include <bits/stdc++.h>

const int N = 100005; // 最大节点数

int p[N], c[N][2]; // p[u]: u的父节点, c[u][0/1]: u的左右孩子
bool f[N];         // f[u]: 翻转标记

// 获取u是其父节点x的哪个孩子 (0为左，1为右)
int get(int u) {
    return c[p[u]][1] == u;
}

// 判断u是否是其所属Splay树的根
bool isRoot(int u) {
    return c[p[u]][0] != u && c[p[u]][1] != u;
}

// 推送懒惰标记
void pushdown(int u) {
    if (f[u]) {
        std::swap(c[u][0], c[u][1]);
        if (c[u][0]) f[c[u][0]] ^= 1;
        if (c[u][1]) f[c[u][1]] ^= 1;
        f[u] = 0;
    }
}

// 向上更新节点信息 (本题无需，但保留结构)
void pushup(int u) {
    // s[u] = s[c[u][0]] ^ s[c[u][1]] ^ v[u];
}

// 辅助函数：将路径上的所有懒惰标记从上到下推送
void splay_pushdown_path(int u) {
    if (!isRoot(u)) splay_pushdown_path(p[u]);
    pushdown(u);
}

// 旋转操作：将u向上旋转，使其代替其父节点x的位置
void rotate(int u) {
    int x = p[u], y = p[x];
    int d = get(u);

    if (!isRoot(x)) {
        c[y][get(x)] = u;
    }
    p[u] = y;

    c[x][d] = c[u][1 - d];
    if (c[u][1 - d]) p[c[u][1 - d]] = x;

    c[u][1 - d] = x;
    p[x] = u;

    pushup(x);
    pushup(u);
}

// 伸展操作：将u旋转到其所属Splay树的根
void splay(int u) {
    splay_pushdown_path(u);
    for (int x = p[u]; !isRoot(u); x = p[u]) {
        if (!isRoot(x)) {
            rotate(get(u) == get(x) ? x : u);
        }
        rotate(u);
    }
    pushup(u);
}

// access操作：将u到树根的路径变为实链，并使u成为Splay树的根
void access(int u) {
    for (int v = 0; u; v = u, u = p[u]) {
        splay(u);
        c[u][1] = v;
        if (v) p[v] = u; // 确保v不为0时才设置p[v]
        pushup(u);
    }
}

// makeRoot操作：将u变为其所在树的根
void makeRoot(int u) {
    access(u);
    splay(u);
    f[u] ^= 1;
    pushdown(u); // 立即推送，确保根节点的左右孩子被交换
}

// findRoot操作：查找u所在树的根节点
int findRoot(int u) {
    access(u);
    splay(u);
    while (c[u][0]) {
        pushdown(u);
        u = c[u][0];
    }
    splay(u); // 将真正的根节点旋转到Splay树的根
    return u;
}

// link操作：连接u和v
void link(int u, int v) {
    makeRoot(u); // 将u变为其所在树的根
    if (findRoot(v) != u) { // 如果u和v不在同一个连通分量
        p[u] = v; // 将u的父节点设为v (虚边连接)
    }
}

// cut操作：断开u和v之间的边
void cut(int u, int v) {
    makeRoot(u); // 将u变为其所在树的根
    access(v);   // 打通v到u的路径，v成为Splay树的根
    splay(v);    // 确保v是Splay树的根
    // 检查条件：u是v的左孩子，且v没有右孩子，且u没有左右孩子
    // 这里的 !c[u][0] && !c[u][1] 严格确保u是v的直接子节点且u没有其他子节点
    if (c[v][0] == u && p[u] == v && !c[v][1]) {
        c[v][0] = 0; // 断开v的左孩子u
        p[u] = 0;    // 断开u的父节点v
        pushup(v);   // 更新v的信息
    }
}


int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(0);

    int n, m;
    std::cin >> n >> m;

    for (int i = 0; i < m; ++i) {
        int op, u, v;
        std::cin >> op >> u >> v;
        if (op == 1) { // link
            if (findRoot(u) != findRoot(v)) {
                link(u, v);
            }
        } else if (op == 2) { // cut
            makeRoot(u); // 尝试将u设为根
            access(v);   // 打通v到u的路径
            splay(v);    // 将v伸展到根
            // 检查u和v是否直接相连，且v的右子树为空
            if (c[v][0] == u && p[u] == v && c[u][0] == 0 && c[u][1] == 0) { // GESP 10级更严谨的判断
                c[v][0] = 0;
                p[u] = 0;
                pushup(v);
            }
        } else { // query
            if (findRoot(u) == findRoot(v)) {
                std::cout << "Yes\n";
            } else {
                std::cout << "No\n";
            }
        }
    }

    return 0;
}
```

**复杂度分析：**
*   时间复杂度：所有 LCT 操作均摊 O(log N)。M 次操作总时间复杂度为 O(M log N)。
*   空间复杂度：O(N) 用于存储 LCT 节点信息。

---

**例题2：树上路径异或和 (拓展)**

**题目描述：**
给定 N 个节点，每个节点有一个权值 `val[i]`。初始时没有边。支持以下操作：
1.  `link u v`: 连接 `u` 和 `v`。如果已连通或连接后成环，则忽略。
2.  `cut u v`: 断开 `u` 和 `v`。如果无边或断开后不连通，则忽略。
3.  `query u v`: 查询 `u` 到 `v` 路径上所有节点权值的异或和。

**思路分析：**
`link` 和 `cut` 操作与例题1相同。
`query u v` 操作：
1.  首先判断 `u` 和 `v` 是否连通：`if (findRoot(u) != findRoot(v)) return;`
2.  如果连通，则需要获取路径。
    *   `makeRoot(u)`: 将 `u` 设为根。
    *   `access(v)`: 打通 `v` 到 `u` 的路径，`v` 成为 Splay 树的根。
    *   `splay(v)`: 确保 `v` 是 Splay 树的根。
    *   此时，`v` 的整个 Splay 树就包含了 `u` 到 `v` 路径上的所有节点。我们可以在 `pushup` 函数中维护 Splay 树子树的异或和 `s[u]`。那么 `s[v]` 就是 `u` 到 `v` 路径上的异或和。

**代码片段 (仅展示 `pushup` 和 `query` 相关部分)：**

```cpp
// ... (LCT 基础结构和操作同上) ...
int v[N]; // 节点u的值
int s[N]; // u所在Splay子树的异或和

// 向上更新节点信息 (路径异或和)
void pushup(int u) {
    s[u] = v[u]; // 自己的值
    if (c[u][0]) s[u] ^= s[c[u][0]]; // 加上左子树的异或和
    if (c[u][1]) s[u] ^= s[c[u][1]]; // 加上右子树的异或和
}

// queryPath操作：查询u到v路径上的异或和
int queryPath(int u, int v) {
    makeRoot(u); // 将u变为其所在树的根
    access(v);   // 打通v到u的路径，v成为Splay树的根
    splay(v);    // 确保v是Splay树的根
    return s[v]; // 此时s[v]就是u到v路径上的异或和
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(0);

    int n, m;
    std::cin >> n >> m;

    for (int i = 1; i <= n; ++i) {
        std::cin >> v[i]; // 读取节点权值
        pushup(i); // 初始化每个节点的异或和
    }

    for (int i = 0; i < m; ++i) {
        int op, u, v_node; // v_node避免与局部变量v冲突
        std::cin >> op >> u >> v_node;
        if (op == 1) { // link
            if (findRoot(u) != findRoot(v_node)) {
                link(u, v_node);
            }
        } else if (op == 2) { // cut
            makeRoot(u);
            access(v_node);
            splay(v_node);
            if (c[v_node][0] == u && p[u] == v_node && c[u][0] == 0 && c[u][1] == 0) {
                c[v_node][0] = 0;
                p[u] = 0;
                pushup(v_node);
            }
        } else { // query
            if (findRoot(u) == findRoot(v_node)) {
                std::cout << queryPath(u, v_node) << "\n";
            } else {
                std::cout << "-1\n"; // 不连通返回-1
            }
        }
    }

    return 0;
}
```

===NEXT===

## 代码实现模板

```cpp
#include <bits/stdc++.h> // 包含所有常用头文件

const int N = 100005; // 定义最大节点数

// LCT 节点信息
// p[u]: u在Splay树中的父节点，或者虚边父节点
// c[u][0]: u的左孩子
// c[u][1]: u的右孩子
// f[u]: 翻转懒惰标记 (true表示需要翻转)
// v[u]: 节点u的实际权值 (用于路径查询，如果需要)
// s[u]: u所在Splay子树的路径信息汇总 (例如异或和、最大值等，根据题目需求定义)
int p[N], c[N][2];
bool f[N];
// int v[N], s[N]; // 根据题目需求启用

// --- Splay Tree 辅助函数 ---

// 检查u是否是其Splay树的根
// 如果u的父节点p[u]的左右孩子都不是u，说明p[u]是通过虚边连接u的Splay树的根
bool isRoot(int u) {
    return c[p[u]][0] != u && c[p[u]][1] != u;
}

// 获取u是其父节点p[u]的哪个孩子 (0为左，1为右)
int get(int u) {
    return c[p[u]][1] == u;
}

// 向下推送懒惰标记
// 如果f[u]为真，则交换u的左右孩子，并传递标记给孩子
void pushdown(int u) {
    if (f[u]) {
        std::swap(c[u][0], c[u][1]); // 交换左右孩子
        if (c[u][0]) f[c[u][0]] ^= 1; // 传递标记给左孩子
        if (c[u][1]) f[c[u][1]] ^= 1; // 传递标记给右孩子
        f[u] = 0; // 清除自身标记
    }
}

// 向上更新节点信息
// 例如，如果s[u]是路径异或和，则 s[u] = s[c[u][0]] ^ s[c[u][1]] ^ v[u];
// 本模板仅为结构，具体实现根据题目需求
void pushup(int u) {
    // s[u] = v[u];
    // if (c[u][0]) s[u] ^= s[c[u][0]];
    // if (c[u][1]) s[u] ^= s[c[u][1]];
}

// 辅助函数：沿着路径从上到下推送所有懒惰标记
// 确保在旋转或访问节点前，其所有祖先的标记都被推送
void splay_pushdown_path(int u) {
    if (!isRoot(u)) {
        splay_pushdown_path(p[u]);
    }
    pushdown(u);
}

// 旋转操作：将u向上旋转，使其代替其父节点x的位置
void rotate(int u) {
    int x = p[u], y = p[x]; // x是u的父节点，y是x的父节点
    int d = get(u);         // d表示u是x的左孩子(0)还是右孩子(1)

    // 如果x不是其所属Splay树的根，则u的父节点p[u]的父节点y需要指向u
    if (!isRoot(x)) {
        c[y][get(x)] = u;
    }
    p[u] = y; // u的父节点指向y

    // 将u的相反方向的孩子作为x的孩子
    c[x][d] = c[u][1 - d];
    if (c[u][1 - d]) p[c[u][1 - d]] = x; // 如果孩子存在，更新其父节点

    // u成为x的父节点，x成为u的子节点
    c[u][1 - d] = x;
    p[x] = u;

    // 更新节点信息 (先更新x，再更新u)
    pushup(x);
    pushup(u);
}

// 伸展操作：将u旋转到其所属Splay树的根
void splay(int u) {
    splay_pushdown_path(u); // 先推送路径上的所有标记
    for (int x = p[u]; !isRoot(u); x = p[u]) {
        if (!isRoot(x)) { // 如果x也不是Splay树的根
            rotate(get(u) == get(x) ? x : u); // Zag-Zag 或 Zig-Zag
        }
        rotate(u); // Zig 或 Zag
    }
    pushup(u); // 最终更新u的信息
}

// --- LCT 核心操作 ---

// access操作：将u到树根的路径变为实链，并使u成为Splay树的根
// v是u的右孩子（实路径的下一段），u是当前处理的节点
void access(int u) {
    for (int v = 0; u; v = u, u = p[u]) {
        splay(u); // 将u旋转到当前Splay树的根
        c[u][1] = v; // u的右孩子变为v（虚边转实边）
        if (v) p[v] = u; // v的父节点变为u (如果v存在)
        pushup(u); // 更新u的信息
    }
}

// makeRoot操作：将u变为其所在树的根
void makeRoot(int u) {
    access(u); // 打通u到原树根的路径，u成为Splay树的根
    splay(u);  // 确保u是Splay树的根
    f[u] ^= 1; // 翻转u所在Splay树的路径方向 (懒惰标记)
    pushdown(u); // 立即推送一次标记，确保后续操作正确
}

// findRoot操作：查找u所在树的根节点
int findRoot(int u) {
    access(u); // 打通u到根的路径
    splay(u);  // 确保u是Splay树的根
    // 根节点一定是Splay树中最左边的节点（深度最小）
    while (c[u][0]) {
        pushdown(u); // 确保路径上的标记都已推送
        u = c[u][0];
    }
    splay(u); // 将真正的根节点旋转到Splay树的根，方便后续操作
    return u;
}

// link