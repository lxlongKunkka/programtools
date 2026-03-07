# 广义 SAM（多串共用）

---

> **章节 ID：** `10-1-3`  
> **所属专题：** 专题 1 — 字符串高级  
> **所属等级：** Level 10 — GESP 十级 (NOI 竞赛提高)

## 教案内容

## 教学目标

**知识目标 (Knowledge Objectives):**
1.  理解广义后缀自动机（Generalized Suffix Automaton, GSAM）的概念、作用及其与单串后缀自动机的区别。
2.  掌握增量式（Incremental）构建 GSAM 的核心思想和具体步骤，特别是 `last` 指针的重置机制。
3.  理解 GSAM 中状态的 `len`、`link` 和 `nxt` 数组的含义，以及它们在多串上下文中的变化。

**能力目标 (Skill Objectives):**
1.  能够独立编写增量式 GSAM 的构建代码，并能正确处理多字符串输入。
2.  能够运用 GSAM 解决多字符串相关的经典问题，如计算多字符串的公共子串、不同子串总数等。
3.  能够分析 GSAM 算法的时间和空间复杂度。

**素养目标 (Competence Objectives):**
1.  培养学生面对复杂字符串问题时的分解与抽象能力，能将多串问题转化为图论或自动机问题。
2.  提升学生对数据结构设计和算法优化的意识，理解 GSAM 在处理大规模多串问题时的效率优势。
3.  通过理解 GSAM 的构建逻辑，锻炼严谨的逻辑推理和细节处理能力。

===NEXT===

## 趣味引入

同学们，想象一下我们是一个侦探团队，接到了一项艰巨的任务：分析好几本厚厚的犯罪小说，找出所有小说中都提到过的“关键线索词”，或者统计一下这些小说总共有多少种不同的“秘密暗号”。如果每本小说单独分析，再把结果合并，那效率是不是太低了？就像把每本小说都建一个“线索索引本”，然后一本一本去比对。

有没有一种更聪明的方法呢？我们能不能只建一个“超级线索索引本”，把所有小说中的线索都汇总进去，而且这个索引本能自动帮我们去重、分类，甚至指出哪些线索是所有小说共有的，哪些是特定小说独有的？

今天，我们要学习的“广义后缀自动机（Generalized Suffix Automaton, GSAM）”就是这样一个“超级线索索引本”！它能帮我们高效地处理多个字符串（多本小说）的问题，找出它们之间各种有趣的共同点和差异。准备好成为字符串世界的超级侦探了吗？

===NEXT===

## 深度知识点讲解

### 1. 单串后缀自动机（SAM）回顾

在深入 GSAM 之前，我们先快速回顾一下单串后缀自动机。
单串 SAM 是一个能够识别字符串 S 所有后缀的最小确定有限状态自动机（DFA）。
它有以下几个核心概念：
*   **状态 (State)**：每个状态代表 S 的一个或多个子串集合。
*   **`len[u]`**: 状态 `u` 所能识别的最长子串的长度。
*   **`link[u]` (后缀链接)**: `link[u]` 指向的状态 `v` 代表的子串集合是 `u` 识别的最短子串的长度减一，且 `v` 是 `u` 识别的所有子串的最长公共后缀。可以理解为 `v` 是 `u` 的最长后缀链接。
*   **`nxt[u][c]` (转移)**: 从状态 `u` 经过字符 `c` 转移到的下一个状态。
*   **`max_len` 和 `min_len`**: 每个状态 `u` 识别的子串长度范围是 `(len[link[u]], len[u]]`。

单串 SAM 能够在线性时间 O(|S|) 内构建，并解决许多单串问题，如计算不同子串数量、查找子串出现次数等。

### 2. 为什么需要广义后缀自动机 (GSAM)？

如果我们有多个字符串 S1, S2, ..., Sk，要解决涉及它们共同性质的问题，比如：
*   找出所有字符串的最长公共子串。
*   计算所有字符串中出现的不同子串的总数。
*   找出在至少 `X` 个字符串中出现的子串。

如果为每个字符串单独构建一个 SAM，然后去合并或比较这些 SAM，会非常低效和复杂。例如，要找所有字符串的最长公共子串，我们需要在 k 个 SAM 中同时遍历，或者将 k 个 SAM 合并成一个巨大的结构，这非常麻烦。

GSAM 就是为了解决这类问题而生！它是一个能够识别所有输入字符串的所有后缀的最小 DFA。换句话说，GSAM 是一个能同时表示所有字符串的后缀信息的紧凑结构。

### 3. 广义后缀自动机 (GSAM) 的两种构建方法

GSAM 主要有两种构建方法：

1.  **批处理构建 (Batch Construction)**：
    *   首先将所有字符串插入到一个 Trie 树中。
    *   然后对这个 Trie 树进行 BFS 或 DFS 遍历，在这个遍历过程中，根据 Trie 树的结构来构建 SAM。
    *   这种方法概念上更接近“对一个字符串集合构建 SAM”，但实现起来相对复杂，需要处理 Trie 树节点与 SAM 状态的映射。

2.  **增量式构建 (Incremental Construction)**：
    *   这是最常用、最实用的方法。
    *   它的核心思想是：沿用单串 SAM 的 `extend` 操作，但每次处理一个新的字符串时，需要进行一个关键的调整。
    *   **关键调整：** 当开始处理一个新的字符串时，必须将 `last` 指针（上一个字符添加后所在的状态）重置回初始状态（状态 0）。
    *   **为什么重置 `last`？**
        *   在单串 SAM 中，`last` 始终指向当前已构建字符串的整个前缀对应的状态。当我们添加字符 `c` 时，我们是把 `c` 接到现有前缀的末尾。
        *   但在 GSAM 中，当我们开始处理一个新的字符串时，这个字符串是独立的，它不应该被视为前一个字符串的“后缀”或“扩展”。新字符串的第一个字符是它自己的“开头”，而不是前一个字符串的延续。
        *   因此，`last` 必须重置到表示空字符串的状态（状态 0），这样新字符串的第一个字符就会从头开始构建其后缀结构，而不会错误地继承前一个字符串的后缀链接信息。
        *   如果不重置 `last`，那么新字符串的子串可能会与前一个字符串的子串错误地合并，导致 GSAM 结构不正确。

### 4. 增量式 GSAM 的构建步骤详解

增量式 GSAM 的 `extend(char c)` 函数与单串 SAM 的 `extend` 函数基本一致，只是在处理多个字符串时，外部调用需要特殊处理。

**SAM 状态结构：**
每个状态 `u` 包含：
*   `len[u]`：状态 `u` 能够表示的最长子串的长度。
*   `link[u]`：状态 `u` 的后缀链接。
*   `nxt[u][c]`：从状态 `u` 经过字符 `c` 转移到的下一个状态。

**全局变量：**
*   `sz`：当前 SAM 中的状态总数。
*   `last`：上一个添加的字符所对应的状态。

**`init()` 函数：**
*   初始化状态 0：`len[0] = 0`, `link[0] = -1` (或 `0`，取决于约定，`-1` 更常见表示空链接), `sz = 1`, `last = 0`。

**`extend(char c)` 函数：**
1.  **创建新状态 `cur`**: `cur = sz++`。
2.  **设置 `len[cur]`**: `len[cur] = len[last] + 1`。
3.  **向上遍历并添加转移**:
    *   从 `p = last` 开始，沿着后缀链接 `link[p]` 不断向上跳。
    *   对于每个 `p`，如果 `p` 还没有字符 `c` 的转移：`nxt[p][c-'a'] = cur`。
    *   如果 `p` 已经有字符 `c` 的转移 `q = nxt[p][c-'a']`，则停止遍历。
4.  **设置 `link[cur]`**:
    *   **情况 1: `p` 跳到了初始状态 `-1` (或 `0` 且 `nxt[0][c]` 不存在)**：这意味着字符 `c` 是一个新的前缀，没有更短的后缀能识别它。将 `link[cur]` 设置为初始状态 `0`。
    *   **情况 2: `p` 找到了一个状态 `q = nxt[p][c-'a']`**:
        *   **子情况 2.1: `len[q] == len[p] + 1`**: 这表示 `q` 已经是一个“标准”状态，其最长长度恰好比 `p` 多一个字符 `c`。直接设置 `link[cur] = q`。
        *   **子情况 2.2: `len[q] != len[p] + 1` (需要克隆)**: 这表示 `q` 所代表的子串太长了，它不能作为 `cur` 的直接后缀链接。我们需要“克隆” `q`，创建一个新状态 `nq`。
            *   `nq = sz++`。
            *   `len[nq] = len[p] + 1`。
            *   `link[nq] = link[q]`。
            *   `nxt[nq]` 复制 `nxt[q]` 的所有转移。
            *   更新所有指向 `q` 的转移：从 `p` 开始向上遍历，如果 `nxt[p][c-'a'] == q`，则将 `nxt[p][c-'a']` 更新为 `nq`。
            *   最后，设置 `link[cur] = nq` 和 `link[q] = nq`。
5.  **更新 `last`**: `last = cur`。

**处理多个字符串 S1, S2, ..., Sk：**

```cpp
// 伪代码
init(); // 初始化 SAM

for (each string S_i in {S1, S2, ..., Sk}) {
    last = 0; // 关键一步：处理新字符串前，重置 last 指针
    for (each char c in S_i) {
        extend(c); // 每次 extend 后，last 会更新为当前字符对应的状态
    }
}
```

**时间复杂度:**
*   单次 `extend` 操作的均摊时间复杂度为 O(1)。
*   对于总长度为 L 的所有字符串，GSAM 的构建时间复杂度为 O(L)。
*   空间复杂度为 O(L * Σ)，其中 Σ 是字符集大小（例如，26 对于小写字母）。

### 5. GSAM 的应用示例

**1. 计算所有字符串中出现的不同子串的总数**
*   构建 GSAM。
*   遍历所有状态 `u` (除了初始状态 0)。
*   每个状态 `u` 代表 `len[u] - len[link[u]]` 个不同的子串。
*   将这些数量累加即可。
*   `ans = sum(len[u] - len[link[u]])` (对于所有 `u > 0`)。

**2. 查找所有字符串的最长公共子串 (LCS)**
*   构建 GSAM。
*   在 `extend` 函数中，或者在构建完成后，标记每个状态 `u` 属于哪些原始字符串。例如，使用一个 `mask[u]` 存储一个位掩码，表示状态 `u` 对应的子串属于哪些字符串。
    *   在 `extend(char c, int string_id)` 中，新创建的 `cur` 状态和所有因 `cur` 而更新的 `q` 或 `nq` 状态，都应该被标记为属于 `string_id`。
    *   更简单的方法是，在每次 `extend` 之后，将 `mask[last]` 标记为当前字符串的 ID。
*   构建完成后，需要将这些标记沿后缀链接树向上“传播”。
    *   构建后缀链接树：对于每个状态 `u`，从 `link[u]` 到 `u` 建立一条边。
    *   对后缀链接树进行 DFS 遍历。在 DFS 过程中，一个状态 `u` 的 `mask` 应该包含它所有子节点的 `mask`。
    *   或者，更简便地，从 `sz-1` 到 `1` 倒序遍历所有状态 `u`，执行 `mask[link[u]] |= mask[u]`。这能保证所有子节点的信息都传播到父节点。
*   遍历所有状态 `u`，如果 `mask[u]` 包含了所有字符串的标记（即 `mask[u] == (1 << num_strings) - 1`），那么这个状态 `u` 对应的子串就是所有字符串的公共子串。在所有这样的状态中，找到 `len[u]` 最大的那个，其 `len[u]` 就是最长公共子串的长度。

### 常见误区：

*   **忘记重置 `last`**: 这是 GSAM 最常见的错误。每次处理新字符串前，`last` 必须设为 `0`。
*   **混淆状态的含义**: `len[u]` 只是最长子串的长度，一个状态实际代表一个长度区间 `(len[link[u]], len[u]]` 内的所有子串。
*   **后缀链接树的遍历方向**: 对于需要统计或传播信息的应用，通常需要从叶子节点向根节点（通过 `link` 指针）传播信息，或者构建反向边（从 `link[u]` 到 `u`）然后 DFS。

===NEXT===

## 典型例题精讲

### 例题 1：多字符串不同子串总数

**题目描述：**
给定 N 个字符串 S1, S2, ..., SN。求这 N 个字符串中所有出现的不同子串的总数。

**思路分析：**
1.  **构建 GSAM**：使用增量式方法构建包含所有 N 个字符串的广义后缀自动机。在处理每个字符串前，记得将 `last` 指针重置为 `0`。
2.  **统计不同子串**：对于 GSAM 中的每一个状态 `u` (除了初始状态 0)，它代表了 `len[u] - len[link[u]]` 个不同的子串。这些子串都是唯一的，因为 SAM 的设计保证了每个状态代表的子串集合是唯一的。
3.  **累加结果**：将所有状态 `u` ( `u > 0` ) 的 `len[u] - len[link[u]]` 值累加起来，即可得到所有字符串中不同子串的总数。

**代码实现：**

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <cstring> // For memset

// 使用常量定义最大状态数和字符集大小
const int MAX_STATES = 2000005; // 假设总长度最大10^6，状态数约2*10^6
const int ALPHABET_SIZE = 26;

struct State {
    int len; // 最长子串长度
    int link; // 后缀链接
    int nxt[ALPHABET_SIZE]; // 转移数组
    // 其他可能需要的属性，例如计数、标记等
};

State sam[MAX_STATES];
int sz;   // 当前状态总数
int last; // 上一个添加字符对应的状态

void sam_init() {
    sam[0].len = 0;
    sam[0].link = -1; // 初始状态的后缀链接通常设为-1或0
    memset(sam[0].nxt, 0, sizeof(sam[0].nxt)); // 初始化转移数组
    sz = 1;
    last = 0;
}

void sam_extend(char c_val) {
    int c = c_val - 'a'; // 将字符映射到0-25的整数
    int cur = sz++; // 创建新状态
    sam[cur].len = sam[last].len + 1;
    memset(sam[cur].nxt, 0, sizeof(sam[cur].nxt));

    int p = last;
    while (p != -1 && sam[p].nxt[c] == 0) {
        sam[p].nxt[c] = cur;
        p = sam[p].link;
    }

    if (p == -1) {
        sam[cur].link = 0; // 如果p跳到了初始状态，则新状态的后缀链接为0
    } else {
        int q = sam[p].nxt[c];
        if (sam[q].len == sam[p].len + 1) {
            sam[cur].link = q; // q是p的直接扩展
        } else {
            // 需要克隆q
            int nq = sz++;
            sam[nq].len = sam[p].len + 1;
            sam[nq].link = sam[q].link;
            memcpy(sam[nq].nxt, sam[q].nxt, sizeof(sam[q].nxt)); // 复制q的转移

            while (p != -1 && sam[p].nxt[c] == q) {
                sam[p].nxt[c] = nq;
                p = sam[p].link;
            }
            sam[q].link = nq;
            sam[cur].link = nq;
        }
    }
    last = cur; // 更新last指针
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n;
    std::cin >> n;

    sam_init(); // 初始化GSAM

    for (int i = 0; i < n; ++i) {
        std::string s;
        std::cin >> s;
        last = 0; // 核心：处理每个新字符串前，重置last指针
        for (char ch : s) {
            sam_extend(ch);
        }
    }

    long long total_distinct_substrings = 0;
    for (int i = 1; i < sz; ++i) { // 从状态1开始遍历，状态0代表空串
        total_distinct_substrings += (sam[i].len - sam[sam[i].link].len);
    }

    std::cout << total_distinct_substrings << std::endl;

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度**: `sam_init()` O(ALPHABET_SIZE)。`sam_extend()` 每次调用均摊 O(1)。如果有 N 个字符串，总长度为 L，则构建 GSAM 的时间复杂度为 O(L)。统计不同子串需要遍历所有状态，O(sz)，其中 `sz` 最大为 `2 * L`。因此，总时间复杂度为 O(L)。
*   **空间复杂度**: O(L * ALPHABET_SIZE)，主要用于存储 `sam` 数组。

---

### 例题 2：多个字符串的最长公共子串 (LCS)

**题目描述：**
给定 N 个字符串 S1, S2, ..., SN。求所有字符串的最长公共子串的长度。

**思路分析：**
1.  **构建 GSAM 并标记**：
    *   使用增量式方法构建 GSAM。
    *   在 `sam_extend` 函数中，我们需要知道当前添加的字符属于哪个字符串。可以修改 `sam_extend` 函数，使其接受一个 `string_id` 参数。
    *   每个状态 `u` 维护一个 `mask[u]`，用位掩码表示 `u` 对应的子串属于哪些原始字符串。例如，如果 `string_id` 是 `k`，则 `mask[u] |= (1 << k)`。
    *   在每次调用 `sam_extend(char c, int string_id)` 后，将 `mask[last]` 标记为 `(1 << string_id)`。

2.  **传播标记**：
    *   构建完成后，初始的 `mask` 只标记了每个字符串的完整前缀对应的状态。我们需要将这些标记沿着后缀链接树向上（从子节点到父节点）传播，以确保所有包含某个字符串子串的状态都被正确标记。
    *   最简单的方法是倒序遍历所有状态（从 `sz-1` 到 `1`）：`mask[sam[u].link] |= mask[u]`。这个操作会把子节点的标记合并到父节点。

3.  **查找 LCS**：
    *   遍历所有状态 `u` (从 `0` 到 `sz-1`)。
    *   如果 `mask[u]` 包含了所有 N 个字符串的标记（即 `mask[u] == (1 << N) - 1`），那么状态 `u` 对应的子串就是所有字符串的公共子串。
    *   在所有满足条件的 `u` 中，找到 `len[u]` 最大的那个值，它就是最长公共子串的长度。如果没有任何状态满足条件，说明没有公共子串，长度为 0。

**代码实现：**

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <cstring> // For memset
#include <algorithm> // For max

const int MAX_STATES = 2000005; // 假设总长度最大10^6，状态数约2*10^6
const int ALPHABET_SIZE = 26;
const int MAX_STRINGS = 20; // 最多支持20个字符串，因为 mask 是 int

struct State {
    int len;
    int link;
    int nxt[ALPHABET_SIZE];
    int mask; // 记录该状态对应的子串属于哪些原始字符串
};

State sam[MAX_STATES];
int sz;
int last;
int num_strings_total; // 记录总共的字符串数量

void sam_init() {
    sam[0].len = 0;
    sam[0].link = -1;
    memset(sam[0].nxt, 0, sizeof(sam[0].nxt));
    sam[0].mask = 0; // 初始状态不属于任何字符串
    sz = 1;
    last = 0;
}

void sam_extend(char c_val, int string_id) {
    int c = c_val - 'a';
    int cur = sz++;
    sam[cur].len = sam[last].len + 1;
    memset(sam[cur].nxt, 0, sizeof(sam[cur].nxt));
    sam[cur].mask = (1 << string_id); // 标记新状态属于当前字符串

    int p = last;
    while (p != -1 && sam[p].nxt[c] == 0) {
        sam[p].nxt[c] = cur;
        p = sam[p].link;
    }

    if (p == -1) {
        sam[cur].link = 0;
    } else {
        int q = sam[p].nxt[c];
        if (sam[q].len == sam[p].len + 1) {
            sam[cur].link = q;
        } else {
            int nq = sz++;
            sam[nq].len = sam[p].len + 1;
            sam[nq].link = sam[q].link;
            memcpy(sam[nq].nxt, sam[q].nxt, sizeof(sam[q].nxt));
            sam[nq].mask = sam[q].mask; // 克隆状态的mask继承原状态的mask

            while (p != -1 && sam[p].nxt[c] == q) {
                sam[p].nxt[c] = nq;
                p = sam[p].link;
            }
            sam[q].link = nq;
            sam[cur].link = nq;
        }
    }
    last = cur;
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::cin >> num_strings_total; // 读取字符串数量

    sam_init();

    for (int i = 0; i < num_strings_total; ++i) {
        std::string s;
        std::cin >> s;
        last = 0; // 重置last指针
        for (char ch : s) {
            sam_extend(ch, i); // 传入字符串ID
        }
    }

    // 传播mask信息：从后往前遍历，将子节点的mask合并到父节点
    // 这样做是因为状态按创建顺序排列，link指向的状态的len通常小于当前状态
    // 从大的len向小的len传播，保证了信息从子树叶子向根汇聚
    for (int i = sz - 1; i >= 1; --i) {
        if (sam[i].link != -1) { // 避免link为-1的情况
            sam[sam[i].link].mask |= sam[i].mask;
        }
    }

    int longest_common_substring_len = 0;
    int full_mask = (1 << num_strings_total) - 1; // 所有字符串都包含的mask

    for (int i = 0; i < sz; ++i) {
        if (sam[i].mask == full_mask) {
            longest_common_substring_len = std::max(longest_common_substring_len, sam[i].len);
        }
    }

    std::cout << longest_common_substring_len << std::endl;

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度**: 构建 GSAM 仍是 O(L)。传播 `mask` 信息 O(sz)。查找 LCS O(sz)。总时间复杂度 O(L)。
*   **空间复杂度**: O(L * ALPHABET_SIZE)，用于存储 `sam` 数组。

===NEXT===

## 代码实现模板

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <cstring> // For memset and memcpy
#include <algorithm> // For std::max, etc.

// === 常量定义 ===
// 最大总字符串长度，根据题目数据范围调整
const int MAX_TOTAL_LEN = 1000005; 
// SAM 的状态数上限，通常是总长度的两倍
const int MAX_SAM_STATES = MAX_TOTAL_LEN * 2; 
// 字符集大小，例如小写字母是26
const int ALPHABET_SIZE = 26; 
// 如果需要标记字符串ID，最大字符串数量
const int MAX_NUM_STRINGS = 20; 

// === SAM 状态结构 ===
struct State {
    int len;                // 当前状态代表的最长子串的长度
    int link;               // 后缀链接 (suffix link)，指向最长后缀的父状态
    int nxt[ALPHABET_SIZE]; // 转移数组，nxt[c] 表示经过字符 c 转移到的下一个状态
    // 可以根据具体应用添加额外信息，例如：
    // int count;            // 该状态在原始字符串中出现的次数
    // int mask;             // 位掩码，表示该状态的子串属于哪些原始字符串
    // bool is_cloned;       // 标记是否是克隆状态
};

// === GSAM 全局变量 ===
State sam[MAX_SAM_STATES]; // 存储所有状态的数组
int sz;                    // 当前 SAM 中的状态总数 (下一个可用状态的索引)
int last;                  // 上一个添加的字符所对应的状态索引

// === GSAM 初始化函数 ===
// 在构建任何字符串之前调用一次
void sam_init() {
    sam[0].len = 0;           // 初始状态 (空串) 长度为0
    sam[0].link = -1;         // 初始状态的后缀链接为-1 (表示没有更短的后缀)
    memset(sam[0].nxt, 0, sizeof(sam[0].nxt)); // 初始状态没有转移
    // sam[0].mask = 0;       // 如果使用mask，初始状态不属于任何字符串
    sz = 1;                   // 当前状态总数，状态0已经被使用
    last = 0;                 // last 指针指向初始状态
}

// === GSAM 扩展函数 ===
// 每次添加一个字符 c_val 到 SAM 中
// string_id: (可选) 如果需要标记当前字符属于哪个字符串，传入字符串的ID (0到N-1)
void sam_extend(char c_val /*, int string_id = -1 */) {
    int c = c_val - 'a'; // 将字符转换为 0-ALPHABET_SIZE-1 的整数索引

    int cur = sz++; // 创建一个新状态
    sam[cur].len = sam[last].len + 1; // 新状态的最长长度是 last 状态的长度+1
    memset(sam[cur].nxt, 0, sizeof(sam[cur].nxt)); // 初始化新状态的转移
    // if (string_id != -1) {
    //     sam[cur].mask = (1 << string_id); // 标记新状态属于当前字符串
    // }

    int p = last; // 从 last 状态开始向上遍历后缀链接
    while (p != -1 && sam[p].nxt[c] == 0) {
        // 如果 p 状态没有字符 c 的转移，则创建转移指向 cur
        sam[p].nxt[c] = cur;
        p = sam[p].link; // 继续向上跳
    }

    if (p == -1) {
        // 如果 p 跳到了初始状态 -1，说明 cur 是一个新的前缀，其后缀链接指向状态0
        sam[cur].link = 0;
    } else {
        // 找到了一个状态 q，它是 p 经过字符 c 的转移
        int q = sam[p].nxt[c];
        if (sam[q].len == sam[p].len + 1) {
            // 如果 q 的长度恰好是 p 的长度+1，说明 q 是一个“标准”的扩展状态
            // cur 的后缀链接直接指向 q
            sam[cur].link = q;
        } else {
            // 否则，q 的长度太长了，我们需要克隆 q
            // 创建一个新状态 nq，作为 q 的“副本”，但长度为 sam[p].len + 1
            int nq = sz++;
            sam[nq].len = sam[p].len + 1;
            sam[nq].link = sam[q].link;
            memcpy(sam[nq].nxt, sam[q].nxt, sizeof(sam[q].nxt)); // 复制 q 的所有转移
            // if (string_id != -1) {
            //     sam[nq].mask = sam[q].mask; // 克隆状态的mask继承原状态的mask
            // }

            // 更新所有指向 q 的转移，使它们指向 nq
            while (p != -1 && sam[p].nxt[c] == q) {
                sam[p].nxt[c] = nq;
                p = sam[p].link;
            }
            // 更新 q 和 cur 的后缀链接，都指向 nq
            sam[q].link = nq;
            sam[cur].link = nq;
        }
    }
    last = cur; // 更新 last 指针为新创建的状态 cur
}

// === 主函数示例结构 ===
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 1. 初始化 GSAM
    sam_init();

    // 2. 读取多个字符串并构建 GSAM
    int n_strings; // 字符串数量
    std::cin >> n_strings;

    for (int i = 0; i < n_strings; ++i) {
        std::string s;
        std::cin >> s;
        
        // !!! 核心：在处理每个新字符串前，重置 last 指针为初始状态 !!!
        last = 0; 
        
        for (char ch : s) {
            // 调用 extend 函数，如果需要可以传入字符串ID
            sam_extend(ch /*, i */); 
        }
    }

    // 3. (可选) 后处理，例如传播 mask 信息
    // for (int i = sz - 1; i >= 1; --i) {
    //     if (sam[i].link != -1) {
    //         sam[sam[i].link].mask |= sam[i].mask;
    //     }
    // }

    // 4. 根据具体问题，对构建好的 GSAM 进行查询或统计
    long long result = 0;
    // 示例：计算所有不同子串的总数
    for (int i = 1; i < sz; ++i) { // 从状态1开始，状态0代表空串
        result += (sam[i].len - sam[sam[i].link].len);
    }
    
    std::cout << "Total distinct substrings: " << result << std::endl;

    return 0;
}
```

===NEXT===

## 课堂互动

1.  **思考题：为什么要重置 `last` 指针？**
    *   同学们，我们反复强调了在处理新字符串前要将 `last` 重置为 `0`。请你们用自己的语言解释一下，如果我不重置 `last`，会发生什么问题？它会如何影响我们构建出来的 GSAM 的正确性？
    *   （提示：考虑新字符串与前一个字符串的“连接”问题，以及后缀链接的含义。）

2.  **讨论环节：GSAM 和单独构建多个 SAM 有什么本质区别？**
    *   假设我们有 N 个字符串，每个字符串都单独构建一个 SAM。然后我们再尝试从这些独立的 SAM 中找出它们的最长公共子串。这种方法和直接构建一个 GSAM 有什么不同？GSAM 在哪些方面表现得更好？
    *   （提示：考虑空间效率、时间效率、以及“公共”概念的直接表示。）

3.  **动手练习：模拟 `extend` 过程**
    *   现在，请大家拿出纸笔。我们来模拟构建 GSAM 的过程。
    *   **字符串序列：** "ab", "ba"
    *   **任务：**
        1.  初始化 GSAM。
        2.  处理第一个字符串 "ab"：
            *   添加 'a'，画出状态和链接。
            *   添加 'b'，画出状态和链接。
        3.  **重置 `last`！**
        4.  处理第二个字符串 "ba"：
            *   添加 'b'，画出状态和链接。
            *   添加 'a'，画出状态和链接。
    *   （老师可以巡视，检查学生的模拟过程，并纠正错误。）

4.  **提问：克隆状态的意义？**
    *   在 `extend` 函数中，我们有时会遇到 `len[q] != len[p] + 1` 的情况，这时就需要克隆状态 `q` 得到 `nq`。这个克隆操作的目的是什么？它解决了什么问题？为什么不能直接使用 `q`？
    *   （提示：考虑状态 `q` 代表的子串集合的长度范围，以及 `cur` 状态需要一个精确的后缀链接。）

5.  **小组任务：设计“至少 K 个字符串的公共子串”算法**
    *   请小组讨论：如果我们要找出在至少 K 个字符串中出现的最长子串，基于我们今天学习的 GSAM，应该如何修改例题2的算法？
    *   （提示：`mask` 的判断条件需要调整。）

===NEXT===

## 分层练习题目

### 基础巩固

1.  **题目：计算所有字符串的总长度**
    *   给定 N 个字符串，请你用 GSAM 的思路（虽然有点大材小用）来计算这些字符串的总长度。
    *   **提示：** 这道题主要考察 GSAM 的构建过程和对总长度的理解。

2.  **题目：不同字符计数**
    *   给定 N 个字符串，请问它们一共使用了多少种不同的字符？
    *   **提示：** 在 `sam_extend` 函数中，可以维护一个 `bool visited_char[ALPHABET_SIZE]` 数组来记录出现过的字符。

3.  **题目：统计所有字符串的公共子串数量**
    *   给定 N 个字符串，请计算它们所有公共子串（即在所有 N 个字符串中都出现的子串）的总数量。
    *   **提示：** 参考例题 2 的思路，找到 `mask` 满足所有位都置位的状态，然后累加 `len[u] - len[link[u]]`。

### 能力提升

1.  **题目：最长重复子串 (在至少 K 个字符串中)**
    *   给定 N 个字符串 S1, S2, ..., SN 和一个整数 K。找出所有在至少 K 个字符串中出现的