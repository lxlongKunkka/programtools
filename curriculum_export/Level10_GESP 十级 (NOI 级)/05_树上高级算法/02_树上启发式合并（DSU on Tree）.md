# 树上启发式合并（DSU on Tree）

## 教学目标

### 知识目标
1.  **理解核心思想**：学生能够理解树上启发式合并（DSU on Tree）算法的核心思想，即通过轻重链剖分和按子树大小合并来优化树上子树查询问题。
2.  **掌握实现细节**：学生能够掌握 DSU on Tree 算法的实现细节，包括两次 DFS 的作用（计算子树大小和重儿子、进行启发式合并），以及如何利用 `keep` 标记来控制信息的保留与清除。
3.  **了解复杂度证明**：学生能够了解 DSU on Tree 算法的时间复杂度为 O(N log N) 的数学证明。

### 能力目标
1.  **问题分析能力**：学生能够分析给定的树上子树查询问题，判断其是否适合使用 DSU on Tree 算法进行解决。
2.  **算法设计能力**：学生能够根据具体问题需求，设计并实现 DSU on Tree 算法，正确地维护子树信息（如颜色计数、出现次数最多的颜色等）。
3.  **算法优化能力**：学生能够将暴力遍历子树的方法优化为 DSU on Tree 算法，显著提升解决问题的效率。

### 素养目标
1.  **计算思维**：培养学生面对复杂问题时，通过分解、抽象和模式识别来寻找高效解决方案的计算思维。
2.  **逻辑推理**：培养学生严谨的逻辑推理能力，理解算法设计的每一步“为什么”和“怎么样”。
3.  **代码实现规范**：培养学生编写结构清晰、注释详尽、符合规范的高质量代码的习惯。

===NEXT===

## 趣味引入

同学们好！今天我们要学习一个特别酷炫、特别强大的树上算法——“树上启发式合并”，英文叫 DSU on Tree。听起来是不是有点玄乎？别担心，我会用一个大家都能听懂的故事来解释它！

想象一下，你是一个“森林管理员”，管理着一片巨大的森林，这片森林里有好多好多棵树（也就是我们数据结构里的“树”）。每棵树上都住着各种各样的小动物，比如小鸟、松鼠、兔子等等，它们都有不同的颜色。

村长今天给你布置了一个任务：对于森林里的每一棵“小树枝”（也就是树的每一个子树），你都要统计出这根小树枝上总共有多少种不同颜色的小动物。

如果你是一个新手管理员，你可能会怎么做呢？
“嗯，对于这根树枝，我从头到尾仔细数一遍，有红色的鸟，有蓝色的松鼠……数完了！哦，下一根树枝？好，我再从头到尾数一遍……”
这样数来数去，你会发现，很多小树枝是包含在更大的小树枝里面的，你每次都重新数一遍，是不是做了很多重复劳动，效率非常低啊？如果森林很大，小树枝很多，你可能要数到天黑也数不完！

聪明的管理员会怎么做呢？
他会想：“哎，有些小树枝的信息，是不是可以利用起来，不用每次都从零开始数呢？”
这就是我们今天的主角——DSU on Tree 的核心思想！它就像一个经验丰富的老管理员，每次统计的时候，它会聪明地选择一个“最重要”的子树（我们叫它“重儿子”），把它的统计结果保留下来。然后，对于其他“不那么重要”的子树（我们叫它“轻儿子”），它会暂时把它们的信息统计出来，用完就扔掉。最后，再把所有信息汇总起来，得到当前树枝的最终结果。这样一来，它就大大减少了重复数数的次数，效率瞬间提升好几倍！

是不是很神奇？接下来，我们就一起揭开这个“聪明管理员”的神秘面纱，看看它到底是怎么工作的！

===NEXT===

## 深度知识点讲解

### 1. 问题背景：树上子树信息查询

DSU on Tree 主要用于解决一类树上问题：对于树中的每个节点 `u`，我们需要查询其**子树**中满足某种条件的信息。
例如：
*   子树中有多少种不同的颜色？
*   子树中出现次数最多的颜色是哪种？出现了多少次？
*   子树中所有节点的权值和是多少？（如果权值有特殊性质，例如颜色值）

**暴力做法**：
对于每个节点 `u`，进行一次深度优先搜索（DFS）遍历其整个子树，并统计所需信息。
*   时间复杂度：如果树是链状的，每个节点查询都需要遍历 O(N) 个节点，总共 O(N * N)。
*   空间复杂度：O(N) (递归栈)。
显然，当 N 很大时，这种 O(N^2) 的暴力方法会超时。

### 2. DSU on Tree 的核心思想：启发式合并

DSU on Tree 的核心思想来源于“启发式合并”的概念，它在并查集（Disjoint Set Union, DSU）中也有应用。简单来说，就是**每次合并时，把小的集合合并到大的集合中，从而保证每个元素被合并的次数不会太多。**

在树上，我们如何应用这个思想呢？

#### 2.1 第一次 DFS：计算子树大小与重儿子

为了实现启发式合并，我们首先需要知道每个子树的大小。而且，我们需要找到每个节点的“重儿子”。

*   **重儿子 (Heavy Child)**：对于节点 `u`，它的儿子 `v` 中，如果 `v` 所在的子树的大小 `s[v]` 是所有儿子中最大的，那么 `v` 就是 `u` 的重儿子。
*   **轻儿子 (Light Child)**：除了重儿子之外的儿子，都叫做轻儿子。
*   **重链 (Heavy Path)**：由节点和它的重儿子连接起来的路径，构成了重链。

**DFS1 的任务**：
遍历整棵树，对于每个节点 `u`：
1.  计算 `u` 的子树大小 `s[u]`。
2.  找出 `u` 的重儿子 `h[u]`（如果没有儿子，则 `h[u]` 为空）。

```cpp
// 伪代码 for dfs1
void dfs1(int u, int p) {
    s[u] = 1; // 初始子树大小为1（只包含自己）
    h[u] = 0; // 初始重儿子为空
    int mx_s = 0; // 记录当前遇到的最大子树大小

    for (int v : g[u]) { // 遍历所有邻居 v
        if (v == p) {    // 如果 v 是父节点，跳过
            continue;
        }
        dfs1(v, u);      // 递归计算子节点 v 的子树信息
        s[u] += s[v];    // 累加子节点的子树大小
        if (s[v] > mx_s) { // 如果 v 的子树比当前最大子树还大
            mx_s = s[v];   // 更新最大子树大小
            h[u] = v;      // 更新重儿子为 v
        }
    }
}
```

#### 2.2 第二次 DFS：启发式合并与信息统计

这是 DSU on Tree 的核心步骤。我们通过一个递归函数 `dfs2(u, p, keep)` 来实现。
*   `u`: 当前处理的节点。
*   `p`: `u` 的父节点。
*   `keep`: 一个布尔值，表示当前 `u` 的子树信息在处理完后是否需要保留在全局统计数据中。

**DFS2 的工作流程**：

1.  **处理所有轻儿子**：
    对于 `u` 的每一个**轻儿子** `v`，递归调用 `dfs2(v, u, false)`。
    *   `false` 表示这些轻儿子的子树信息在处理完后**不需要保留**。为什么？因为它们是“小”的子树，我们不希望它们的数据污染全局统计，只在需要时临时统计。
    *   当 `dfs2(v, u, false)` 返回时，`cnt` 数组（用于统计信息的全局数组）中关于 `v` 子树的信息已经被清除了。

2.  **处理重儿子**：
    如果 `u` 有重儿子 `h[u]`，递归调用 `dfs2(h[u], u, true)`。
    *   `true` 表示重儿子的子树信息在处理完后**需要保留**。为什么？因为重儿子代表了 `u` 子树中最大的一部分，保留它的信息可以避免重复计算，这是启发式合并的关键。
    *   当 `dfs2(h[u], u, true)` 返回时，`cnt` 数组中已经包含了 `h[u]` 整个子树的信息。

3.  **整合信息**：
    现在，`cnt` 数组中只有 `h[u]` 子树的信息（如果 `u` 没有重儿子，则 `cnt` 是空的）。
    *   首先，把 `u` 节点自己的信息加入 `cnt`。
    *   然后，**重新遍历**所有**轻儿子** `v`，把 `v` 的整个子树的信息（包括 `v` 自己）都加入 `cnt`。这一步通过一个辅助函数 `add_subtree_nodes(v, u)` 来实现。

4.  **计算答案**：
    在 `cnt` 数组中包含了 `u` 整个子树的所有信息后，我们就可以根据 `cnt` 来计算 `u` 节点所需的答案 `ans[u]`。

5.  **清除信息（如果需要）**：
    如果当前的 `dfs2(u, p, keep)` 是由父节点以 `keep=false` 调用进来的（即 `u` 是父节点的一个轻儿子），那么在 `u` 节点的所有计算完成后，我们需要将 `u` 整个子树的信息从 `cnt` 中清除。这一步通过一个辅助函数 `remove_subtree_nodes(u, p)` 来实现。

**生活类比**：
想象你是一个公司老板，要统计每个部门（子树）的总业绩。
*   **重儿子**：公司里最大的一个部门。你让这个部门直接把报表留给你，你直接看就行。
*   **轻儿子**：公司里其他的小部门。你让它们把报表交上来，你看完就扔掉，因为它们的数据量不大，需要的时候再重新收集一下也很快。
*   **`keep` 参数**：就是你给部门经理的指示：“这份报表，你看完是留着还是扔掉？”

### 3. 时间复杂度证明

DSU on Tree 的时间复杂度是 $O(N \log N)$。
*   **DFS1**：计算子树大小和重儿子，每个节点访问一次，O(N)。
*   **DFS2**：
    每个节点 `u` 自身会被 `add(u)` 和 `remove(u)` 操作各执行一次。
    关键在于 `add_subtree_nodes` 和 `remove_subtree_nodes` 函数。一个节点 `x` 会被 `add_subtree_nodes` 和 `remove_subtree_nodes` 遍历多少次呢？
    当节点 `x` 所在的子树作为**轻儿子**被处理时，`x` 的信息会被加入 `cnt`，然后被清除。
    每次 `x` 所在的子树被清除时，说明 `x` 的父节点 `p` 选择 `x` 的兄弟作为重儿子，或者 `x` 本身是 `p` 的轻儿子。此时，`s[x] <= s[p] / 2`。也就是说，每次 `x` 被清除，它所在的子树大小至少减半。
    因此，一个节点 `x` 最多被清除和重新加入 `log N` 次。
    所以，总的操作次数是 $N \times (\text{单次 add/remove 操作时间} \times \log N)$。
    如果 `add/remove` 操作是 O(1) 的（例如维护频率数组），那么总时间复杂度就是 $O(N \log N)$。

### 4. 常见误区与注意事项

1.  **忘记清除信息**：在 `dfs2` 中，如果 `keep` 为 `false`，一定要记得调用 `remove_subtree_nodes` 清除当前子树的所有信息。否则，会污染后续的统计结果。
2.  **重儿子处理顺序**：必须先处理轻儿子（`keep=false`），再处理重儿子（`keep=true`），最后再把轻儿子的信息加回来。这个顺序不能错。
3.  **`add` 和 `remove` 函数的实现**：这两个函数是算法的关键。它们需要根据具体问题的需求来维护统计量。例如，统计不同颜色数量时，`add` 可能要检查 `cnt[color]` 是否从 0 变为 1，`remove` 检查是否从 1 变为 0。
4.  **根节点的 `keep` 参数**：对于根节点，通常调用 `dfs2(root, 0, false)`。因为根节点没有父节点，其信息无需被父节点保留，所以 `keep=false` 即可。

理解了这些，你就可以开始构建你的“聪明管理员”了！

===NEXT===

## 典型例题精讲

### 例题1：统计子树中不同颜色节点的数量

**问题描述**：
给定一棵包含 N 个节点的树，每个节点 `i` 有一个颜色 `c[i]`。对于树中的每个节点 `u`，你需要计算其子树中包含多少种不同的颜色。

**输入**：
第一行一个整数 N (1 <= N <= 10^5)。
第二行 N 个整数，表示节点 1 到 N 的颜色 `c[i]` (1 <= c[i] <= N)。
接下来 N-1 行，每行两个整数 `u, v`，表示 `u` 和 `v` 之间有一条边。

**输出**：
N 行，每行一个整数，表示节点 `i` 的子树中不同颜色的数量。

**思路分析**：
这正是 DSU on Tree 的经典应用场景。
1.  **DFS1**：计算每个节点的子树大小 `s[u]` 和重儿子 `h[u]`。
2.  **数据结构维护**：我们需要一个 `cnt` 数组来记录每种颜色出现的次数，以及一个 `current_distinct_colors` 变量来记录当前统计范围内不同颜色的总数。
3.  **`add(u)` 函数**：
    *   `cnt[c[u]]++`。
    *   如果 `cnt[c[u]]` 变为 1 (从 0 变到 1)，说明这是一种新颜色，`current_distinct_colors++`。
4.  **`remove(u)` 函数**：
    *   `cnt[c[u]]--`。
    *   如果 `cnt[c[u]]` 变为 0 (从 1 变到 0)，说明这种颜色已经不再存在于统计范围内，`current_distinct_colors--`。
5.  **DFS2**：按照 DSU on Tree 的标准流程进行。
    *   递归处理轻儿子 `v`：`dfs2(v, u, false)`。
    *   递归处理重儿子 `h[u]`：`dfs2(h[u], u, true)`。
    *   将 `u` 节点自身加入统计：`add(u)`。
    *   将所有轻儿子的子树信息重新加入统计（通过 `add_subtree_nodes(v, u)` 遍历并调用 `add`）。
    *   记录 `ans[u] = current_distinct_colors`。
    *   如果 `!keep`，清除 `u` 整个子树的信息（通过 `remove_subtree_nodes(u, p)` 遍历并调用 `remove`）。

**代码实现**：见下方“代码实现模板”部分，该模板正是针对此问题。

**复杂度分析**：
*   时间复杂度：`dfs1` 为 O(N)，`dfs2` 为 O(N log N)。`add` 和 `remove` 操作都是 O(1)。总计 O(N log N)。
*   空间复杂度：O(N) 用于存储邻接表、颜色、子树大小、重儿子、答案和计数数组。

---

### 例题2：统计子树中出现次数最多的颜色及其出现次数

**问题描述**：
给定一棵包含 N 个节点的树，每个节点 `i` 有一个颜色 `c[i]`。对于树中的每个节点 `u`，你需要计算其子树中出现次数最多的颜色，以及该颜色的出现次数。如果有多种颜色出现次数相同且最多，任意输出一种即可。

**输入**：
同例题1。

**输出**：
N 行，每行两个整数，分别表示节点 `i` 的子树中出现次数最多的颜色及其出现次数。

**思路分析**：
与例题1类似，但 `add` 和 `remove` 函数需要维护的信息更多。
1.  **DFS1**：同例题1。
2.  **数据结构维护**：
    *   `cnt` 数组：`cnt[color]` 记录颜色 `color` 的出现次数。
    *   `max_freq`：当前统计范围内出现次数最多的颜色的次数。
    *   `max_freq_color`：当前统计范围内出现次数最多的颜色（如果多个，任意一个即可）。
3.  **`add(u)` 函数**：
    *   `cnt[c[u]]++`。
    *   如果 `cnt[c[u]] > max_freq`，更新 `max_freq = cnt[c[u]]` 并且 `max_freq_color = c[u]`。
    *   如果 `cnt[c[u]] == max_freq`，可以不做额外处理（因为题目允许任意一个）。
4.  **`remove(u)` 函数**：
    *   `cnt[c[u]]--`。
    *   **注意**：`remove` 操作比较复杂。当一个颜色 `c[u]` 的计数减少时，`max_freq` 和 `max_freq_color` 可能需要重新计算。
        *   如果 `cnt[c[u]]` 减少后，`cnt[c[u]] == max_freq - 1` 并且 `c[u] == max_freq_color`，那么 `max_freq_color` 就不再是出现次数最多的颜色了。此时，为了找到新的 `max_freq` 和 `max_freq_color`，最简单的方法是重新遍历当前 `cnt` 数组中所有非零的颜色，找到新的最大值。
        *   **优化**：为了避免遍历整个 `cnt` 数组，我们可以维护一个 `freq_count` 数组，`freq_count[k]` 记录有多少种颜色出现了 `k` 次。当 `cnt[c[u]]` 改变时，更新 `freq_count`。如果 `freq_count[max_freq]` 变为 0，那么 `max_freq` 就需要减 1 直到找到下一个有颜色的频率。
        *   **GESP限制**：考虑到 GESP 10 且不能用 STL 容器，维护 `freq_count` 数组可能超出 `N` 的范围，或者需要动态分配。如果颜色值范围是 `1~N`，那么 `freq_count` 数组是可行的。
        *   **更简单的处理**：在 `remove` 函数中，如果 `cnt[c[u]]` 减少导致 `c[u]` 不再是 `max_freq_color` 且 `cnt[c[u]] < max_freq`，我们可以只更新 `cnt[c[u]]`，而**不**更新 `max_freq` 和 `max_freq_color`。这是因为 `max_freq` 和 `max_freq_color` 只有在 `add` 操作时才可能变大，而 `remove` 操作通常只是清除数据，不影响全局最大值（因为最终会在 `dfs2` 的一个阶段重新统计）。
        *   **实际操作**：在 `dfs2` 中，`max_freq` 和 `max_freq_color` 是在 `add` 完所有轻子树和 `u` 自身后才确定的。`remove` 阶段，只是将 `cnt` 数组清零，`max_freq` 和 `max_freq_color` 并不需要被“撤销”到上一步的状态，因为它们在 `dfs2` 的 `!keep` 分支结束后就会被丢弃。所以 `remove` 只需要简单地 `cnt[c[u]]--` 即可，不需要更新 `max_freq` 或 `max_freq_color`。
5.  **DFS2**：与例题1流程相同。在计算 `ans[u]` 时，记录 `max_freq` 和 `max_freq_color`。

**代码实现 (关键部分)**：
```cpp
// Global variables for problem 2
int cnt[N]; // Frequency of each color
long long current_max_freq_sum; // Sum of colors with max frequency (if problem asks for sum)
int max_freq; // Maximum frequency found so far

// Function to add a node's info to current statistics
void add(int u) {
    int old_freq = cnt[c[u]];
    cnt[c[u]]++;
    int new_freq = cnt[c[u]];

    if (new_freq > max_freq) {
        max_freq = new_freq;
        current_max_freq_sum = c[u]; // If problem asks for *one* such color
    } else if (new_freq == max_freq) {
        current_max_freq_sum += c[u]; // If problem asks for *sum of* such colors
    }
    // If old_freq == max_freq - 1 and new_freq == max_freq, this color just reached max_freq
}

// Function to remove a node's info from current statistics
void remove(int u) {
    int old_freq = cnt[c[u]];
    cnt[c[u]]--;
    int new_freq = cnt[c[u]];

    // Important: When removing, we only update cnt.
    // max_freq and current_max_freq_sum are only meaningful at the point of calculating ans[u].
    // If this remove leads to max_freq decreasing, it means the current max_freq_color was removed,
    // and we are in a 'keep=false' branch, so these global max_freq will be overwritten soon anyway
    // by the heavy child's data, or re-calculated when light children are added back.
    // So, we typically don't update max_freq/current_max_freq_sum here directly.
    // However, if the problem asks for *which* color, and that color is removed,
    // a full re-calculation might be needed if max_freq_color is no longer valid.
    // For simplicity, for GESP, usually we only update cnt in remove.
    // The max_freq and current_max_freq_sum are computed *after* all additions for a node.
    // If the problem requires finding the *actual* max_freq after removals,
    // this would require iterating through cnt array or using more complex data structures.
    // For typical DSU on tree (like this problem), simpler remove is sufficient.
}

// Inside dfs2:
// ... (light children, heavy child processing) ...
// add(u);
// for (int v : g[u]) { if (v == p || v == h[u]) continue; add_subtree_nodes(v, u); }

// ans_color[u] = current_max_freq_sum; // Or max_freq_color
// ans_freq[u] = max_freq;

// if (!keep) { remove_subtree_nodes(u, p); }
```
*自纠正*：在 `remove` 函数中，`max_freq` 和 `current_max_freq_sum` 的维护确实是 DSU on Tree 的一个难点。如果 `max_freq_color` 被移除，或者其频率下降，导致它不再是 `max_freq`，那么 `max_freq` 和 `current_max_freq_sum` 应该如何回溯？
最安全的做法是：在 `dfs2` 的 `if (!keep)` 分支中，调用 `remove_subtree_nodes` 后，直接将 `max_freq` 和 `current_max_freq_sum` 清零。因为这些变量是全局的，如果 `u` 是轻儿子，它的信息处理完后就要全部清除，包括它所带来的最大频率信息。
在 `add` 函数中，更新 `max_freq` 和 `current_max_freq_sum`。
在 `dfs2` 中，当处理完重儿子，并加入 `u` 及所有轻儿子后，当前的 `max_freq` 和 `current_max_freq_sum` 已经是 `u` 子树的正确答案。

**最终 `add` 和 `remove` 的简化逻辑**：
对于例题2，我们通常只在 `add` 操作中更新 `max_freq` 和 `current_max_freq_sum`。`remove` 操作只负责减少 `cnt` 数组的值。当 `dfs2(u, p, false)` 返回时，`max_freq` 和 `current_max_freq_sum` 会被重置为处理重儿子时的状态（或清零），然后在 `u` 节点及其轻儿子被重新 `add` 时，它们会被重新计算。

```cpp
// Global variables for problem 2
int cnt[N]; // Frequency of each color
long long current_max_freq_color_sum; // 存储出现次数最多的所有颜色值的和
int max_freq_val; // 存储出现最多的次数

// Function to add a node's info to current statistics
void add(int u) {
    cnt[c[u]]++;
    if (cnt[c[u]] > max_freq_val) {
        max_freq_val = cnt[c[u]];
        current_max_freq_color_sum = c[u]; // 如果只需要一个颜色，直接赋值
    } else if (cnt[c[u]] == max_freq_val) {
        current_max_freq_color_sum += c[u]; // 如果需要所有颜色值的和
    }
}

// Function to remove a node's info from current statistics
void remove(int u) {
    // 移除操作只减小计数，不直接更新 max_freq_val 和 current_max_freq_color_sum
    // 因为这些全局变量会在 dfs2 的下一次计算中重新赋值或清零
    // 如果一个颜色被移除导致它不再是max_freq_val，这个状态的改变会被后续逻辑覆盖
    cnt[c[u]]--;
}

// Inside dfs2:
// ...
// Calculate ans[u] based on max_freq_val and current_max_freq_color_sum
// ans_freq[u] = max_freq_val;
// ans_color_sum[u] = current_max_freq_color_sum; // Or ans_color[u] = max_freq_color

// if (!keep) {
//     remove_subtree_nodes(u, p);
//     // 重要的：当清除整个子树信息时，max_freq_val 和 current_max_freq_color_sum 也需要重置
//     // 否则会污染父节点处理重儿子后的状态
//     max_freq_val = 0;
//     current_max_freq_color_sum = 0;
// }
```

**复杂度分析**：
*   时间复杂度：O(N log N)。
*   空间复杂度：O(N)。

===NEXT===

## 代码实现模板

以下是针对**例题1：统计子树中不同颜色节点的数量**的完整 DSU on Tree 模板代码。

```cpp
#include <bits/stdc++.h> // 包含大部分常用头文件

// Allman 风格大括号

const int N = 100005; // 定义最大节点数，根据题目数据范围调整

std::vector<int> g[N]; // 邻接表，存储树的结构
int c[N];               // 存储每个节点的颜色
int s[N];               // 存储每个节点子树的大小
int h[N];               // 存储每个节点的重儿子（0 表示没有重儿子）
int ans[N];             // 存储每个节点的答案（子树中不同颜色的数量）

int cnt[N];             // 频率计数数组，cnt[color] 表示 color 出现的次数
int current_distinct_colors; // 记录当前统计范围内不同颜色的数量

// --- 辅助函数：更新统计信息 ---
// 将节点 u 的信息加入到当前统计中
void add(int u) {
    if (cnt[c[u]] == 0) { // 如果这是该颜色第一次出现
        current_distinct_colors++; // 不同颜色数量加 1
    }
    cnt[c[u]]++; // 该颜色计数加 1
}

// 将节点 u 的信息从当前统计中移除
void remove(int u) {
    cnt[c[u]]--; // 该颜色计数减 1
    if (cnt[c[u]] == 0) { // 如果该颜色计数减到 0，说明它不再存在于统计中
        current_distinct_colors--; // 不同颜色数量减 1
    }
}

// --- 辅助函数：遍历子树并执行 add/remove ---
// 遍历以 u 为根的子树，并将其所有节点的信息加入统计
// 注意：这个函数会遍历整个子树，不区分轻重儿子
void add_subtree_nodes(int u, int p) {
    add(u); // 加入当前节点 u 的信息
    for (int v : g[u]) { // 遍历所有邻居 v
        if (v == p) {    // 如果 v 是父节点，跳过
            continue;
        }
        add_subtree_nodes(v, u); // 递归加入子节点 v 的子树信息
    }
}

// 遍历以 u 为根的子树，并将其所有节点的信息从统计中移除
void remove_subtree_nodes(int u, int p) {
    remove(u); // 移除当前节点 u 的信息
    for (int v : g[u]) { // 遍历所有邻居 v
        if (v == p) {    // 如果 v 是父节点，跳过
            continue;
        }
        remove_subtree_nodes(v, u); // 递归移除子节点 v 的子树信息
    }
}

// --- DFS1: 计算子树大小和重儿子 ---
// u: 当前节点，p: u 的父节点
void dfs1(int u, int p) {
    s[u] = 1; // 初始子树大小为 1（只包含自己）
    h[u] = 0; // 初始重儿子为空
    int mx_s = 0; // 记录当前遇到的最大子树大小

    for (int v : g[u]) { // 遍历所有邻居 v
        if (v == p) {    // 如果 v 是父节点，跳过
            continue;
        }
        dfs1(v, u);      // 递归计算子节点 v 的子树信息
        s[u] += s[v];    // 累加子节点的子树大小
        if (s[v] > mx_s) { // 如果 v 的子树比当前最大子树还大
            mx_s = s[v];   // 更新最大子树大小
            h[u] = v;      // 更新重儿子为 v
        }
    }
}

// --- DFS2: DSU on Tree 的核心逻辑 ---
// u: 当前节点，p: u 的父节点，keep: 是否保留 u 的子树信息
void dfs2(int u, int p, bool keep) {
    // 1. 递归处理所有轻儿子：不保留它们的信息
    for (int v : g[u]) {
        if (v == p || v == h[u]) { // 跳过父节点和重儿子
            continue;
        }