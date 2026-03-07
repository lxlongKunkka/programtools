# Trie 字典树

---

> **章节 ID：** `9-1-3`  
> **所属专题：** 专题 1 — 字符串算法  
> **所属等级：** Level 9 — GESP 九级 (CSP-S 竞赛基础)

## 教案内容

## 教学目标

### 知识目标
1.  **理解 Trie（字典树）的基本概念和结构**：学生能够描述 Trie 的节点、边、以及如何利用共同前缀存储字符串的特性。
2.  **掌握 Trie 的核心操作**：学生能够理解并解释字符串的插入（`insert`）和查找（`search`）操作的原理和步骤。
3.  **理解 Trie 的时间与空间复杂度**：学生能够分析 Trie 在插入和查找操作上的时间复杂度，并对其空间占用有初步认识。

### 能力目标
1.  **独立实现 Trie 的基本功能**：学生能够使用 C++ 原生数组，实现一个支持小写英文字符串插入和查找的 Trie 数据结构。
2.  **运用 Trie 解决实际问题**：学生能够将 Trie 应用于判断字符串集合中是否存在某个字符串，或统计具有特定前缀的字符串数量等问题。
3.  **调试和优化代码能力**：学生能够在实现过程中识别并修正常见错误，并对代码结构进行初步优化。

### 素养目标
1.  **培养抽象思维能力**：通过理解 Trie 这种非线性数据结构，提升学生将实际问题抽象为树形结构的能力。
2.  **提升算法设计与分析能力**：鼓励学生在面对字符串问题时，主动思考并选择合适的数据结构，并对其效率进行评估。
3.  **激发对高效数据结构的兴趣**：通过生动的案例和讲解，让学生感受到 Trie 在处理字符串问题时的巧妙和高效，培养学习计算科学的兴趣。

===NEXT===

## 趣味引入

同学们，大家好！今天我们要学习一个非常酷、非常强大的数据结构，它能帮助我们像变魔术一样处理字符串！

想象一下，你是一位超级图书馆管理员，你的图书馆里有成千上万本书，每本书都有一个独一无二的名字。现在，图书馆来了很多人：

*   小明想知道：“图书馆里有没有一本叫 'apple' 的书？”
*   小红想知道：“图书馆里所有以 'app' 开头的书都有哪些？”
*   小亮想把他的新书 'apply' 借给图书馆。

如果你只是把所有书名列成一张长长的单子，每次查找都要从头到尾看一遍，那得多慢呀！小亮每次加书也要重新排序，太麻烦了！有没有一种更聪明、更高效的方法呢？

当然有！我们的大脑在处理文字的时候，其实就有点像我们今天要学的这个“魔法工具”。比如，我们看到 "apple" 和 "apply"，是不是发现它们的前面 "appl" 都是一样的？我们是不是可以把这些共同的部分“共享”起来，不用重复记录呢？

今天，我们就来揭秘这个能够高效存储、查找和管理字符串的“魔法工具”—— **Trie（字典树）**！它就像一个超级智能的图书馆索引，能够共享相同前缀，让查找和插入变得飞快！准备好了吗？让我们一起进入 Trie 的奇妙世界！

===NEXT===

## 深度知识点讲解

### 1. Trie 是什么？—— 字符串的“家族树”

Trie，发音是 "try"，也有人叫它“前缀树”或“字典树”。它是一种树形数据结构，专门用来高效地存储和查找字符串。

**核心思想**：Trie 利用字符串的**公共前缀**来减少存储空间和加快查询速度。

**生活类比**：
想象你家里的**家谱树**。家谱树的根是你的祖先，然后分支到你的爷爷奶奶，再分支到你的爸爸妈妈，最后是你。Trie 就像字符串的家谱树：
*   **根节点 (Root)**：通常不代表任何字符，是所有字符串的起点，就像家谱的“始祖”。
*   **节点 (Node)**：每个节点代表一个字符。从根节点到任意一个节点的路径，就代表了一个**字符串前缀**。
*   **边 (Edge)**：连接两个节点的边代表一个字符。比如，从节点 A 到节点 B 的边上写着 'c'，就表示从 A 走到 B 是通过字符 'c'。
*   **“词尾标记” (is\_end)**：有些节点会被特殊标记，表示从根节点到这个节点的路径形成了一个完整的单词。就像家谱里，你是一个“活生生的人”，而不是某个人的“一部分”。

**我们来看一个例子**：存储 "apple", "apply", "app", "banana"。

1.  **根节点**：空。
2.  插入 "apple"：
    *   从根节点出发，走 'a'，新建节点。
    *   从 'a' 走 'p'，新建节点。
    *   从 'p' 走 'p'，新建节点。
    *   从 'p' 走 'l'，新建节点。
    *   从 'l' 走 'e'，新建节点。
    *   在 'e' 节点上标记 `is_end = true`。
3.  插入 "apply"：
    *   从根节点出发，走 'a'，发现节点已存在，直接过去。
    *   从 'a' 走 'p'，发现节点已存在，直接过去。
    *   从 'p' 走 'p'，发现节点已存在，直接过去。
    *   从 'p' 走 'l'，发现节点已存在，直接过去。
    *   从 'l' 走 'y'，发现节点不存在，新建节点。
    *   在 'y' 节点上标记 `is_end = true`。
    *   **注意**：'apple' 和 'apply' 共享了 "appl" 这个前缀的路径！
4.  插入 "app"：
    *   从根节点走 'a' -> 'p' -> 'p'，路径都已存在。
    *   在第二个 'p' 节点上标记 `is_end = true`。
    *   **注意**：'app' 是 'apple' 和 'apply' 的前缀，它共享了路径，并在中间节点打上了 `is_end` 标记。
5.  插入 "banana"：
    *   从根节点走 'b'，新建节点。
    *   ...一直到 'a'，新建节点。
    *   在最后一个 'a' 节点上标记 `is_end = true`。

通过这个过程，你会发现，Trie 就像一个高效的分类器，把所有以相同前缀开头的字符串都放在了同一条“枝干”上。

### 2. 为什么需要 Trie？—— 效率的奥秘

我们为什么不直接用 `std::map<string, bool>` 或者 `std::set<string>` 呢？或者直接把所有字符串排个序？

*   **`std::map` 或 `std::set` (基于平衡二叉搜索树或哈希表)**：
    *   **查找/插入时间**：通常是 `O(L * log N)` 或 `O(L)` (平均)，其中 `L` 是字符串长度，`N` 是字符串数量。对于哈希表，可能存在哈希冲突。
    *   **Trie**：查找/插入时间是 `O(L)`。因为每次沿着路径走，只需要根据字符的 ASCII 码直接找到下一个节点，没有比较操作，也没有哈希冲突的开销。
*   **排序的字符串列表**：
    *   **查找时间**：`O(L * log N)` (二分查找)。
    *   **插入时间**：`O(L * N)` (插入后保持有序)。
    *   **Trie**：明显更快。

**Trie 的优势**：
1.  **快速查找**：查找一个字符串的时间复杂度只与字符串的长度 `L` 有关，是 `O(L)`。与存储了多少个字符串 `N` 无关！
2.  **快速前缀查找**：可以非常方便地查找所有具有某个前缀的字符串。
3.  **空间优化**：当字符串集合中存在大量共同前缀时，Trie 可以显著节省存储空间。
4.  **按字典序遍历**：通过深度优先遍历 (DFS) Trie，可以得到所有存储字符串的字典序排列。

### 3. Trie 的结构实现—— 用数组模拟树

在 C++ 竞赛编程中，我们通常使用**静态数组**来模拟 Trie 的节点，而不是真的用指针和 `new` 来创建大量小对象（这样会比较慢，且容易爆内存）。

每个 Trie 节点需要存储什么信息呢？
1.  **子节点指针（或索引）**：指向它的子节点。因为我们处理的是英文字符，每个节点最多有 26 个小写字母的子节点。我们可以用一个大小为 26 的数组 `children[26]` 来表示。`children[0]` 代表 'a' 的子节点，`children[1]` 代表 'b'，以此类推。如果 `children[i]` 是 0（或一个特殊值，比如 -1），表示没有这个子节点。
2.  **是否是单词结尾的标记**：一个布尔变量 `is_end`，表示从根节点到当前节点构成的路径是否是一个完整的单词。

**核心数据结构**：

```cpp
const int MAX_NODES = 100005; // 假设最多有 100000 个节点，根据题目数据范围调整
const int ALPHABET_SIZE = 26; // 小写英文字母

// children[i][j] 表示第 i 个节点 的 第 j 个字符子节点 的 索引
int children[MAX_NODES][ALPHABET_SIZE]; 
// is_end[i] 表示第 i 个节点是否是某个单词的结尾
bool is_end[MAX_NODES]; 
// 当前已经使用的节点数量，0 号节点作为根节点
int node_count; 

// 初始化 Trie
void init() {
    // 将所有节点的孩子指针和is_end标记清零
    // node_count + 1 是因为我们要清空所有已使用的节点，包括根节点
    for (int i = 0; i <= node_count; ++i) {
        for (int j = 0; j < ALPHABET_SIZE; ++j) {
            children[i][j] = 0; // 0 表示没有这个子节点
        }
        is_end[i] = false;
    }
    node_count = 0; // 根节点是 0 号节点，但我们从 1 开始分配新节点
                    // 或者可以认为 node_count = 0 已经代表了根节点
                    // 实际操作中，通常将 node_count 初始化为 0，根节点就是 0 号
                    // 第一次创建子节点时，node_count++，分配 1 号节点
}
```

### 4. 核心操作详解

#### 4.1 插入 (Insert) 操作

**目标**：将一个字符串 `s` 插入到 Trie 中。

**思路**：
1.  从根节点 `u = 0` 开始。
2.  遍历字符串 `s` 的每一个字符 `c`。
3.  将字符 `c` 映射到 `0-25` 的索引 `idx = c - 'a'`。
4.  检查当前节点 `u` 是否有 `idx` 对应的子节点：
    *   **如果有**：直接移动到那个子节点 `u = children[u][idx]`。
    *   **如果没有**：说明这条路径是新的，需要**新建一个节点**。
        *   `node_count` 增加 1，得到新节点的索引 `new_node_idx = ++node_count`。
        *   将当前节点 `u` 的 `children[u][idx]` 指向 `new_node_idx`。
        *   移动到新节点 `u = new_node_idx`。
5.  所有字符遍历完毕后，当前节点 `u` 就是字符串 `s` 的最后一个字符所对应的节点。将 `is_end[u]` 设置为 `true`，表示这个节点是一个单词的结尾。

**图解插入 "apple"**:
```
  (root) 0
    | 'a'
    v
  (node 1) a  (is_end=false)
    | 'p'
    v
  (node 2) ap (is_end=false)
    | 'p'
    v
  (node 3) app (is_end=false)
    | 'l'
    v
  (node 4) appl (is_end=false)
    | 'e'
    v
  (node 5) apple (is_end=true)
```
**注意**：`is_end` 标记只在单词的末尾节点设置。例如，插入 "app" 后，`node 3` 的 `is_end` 也会被设为 `true`。

#### 4.2 查找 (Search) 操作

**目标**：判断一个字符串 `s` 是否在 Trie 中。

**思路**：
1.  从根节点 `u = 0` 开始。
2.  遍历字符串 `s` 的每一个字符 `c`。
3.  将字符 `c` 映射到 `0-25` 的索引 `idx = c - 'a'`。
4.  检查当前节点 `u` 是否有 `idx` 对应的子节点：
    *   **如果有**：移动到那个子节点 `u = children[u][idx]`。
    *   **如果没有**：说明路径中断，字符串 `s` 不在 Trie 中，直接返回 `false`。
5.  所有字符遍历完毕后，我们到达了字符串 `s` 的最后一个字符对应的节点 `u`。此时，我们还需要检查 `is_end[u]` 是否为 `true`。
    *   **如果 `is_end[u]` 为 `true`**：说明从根到 `u` 的路径构成了一个完整的单词 `s`，返回 `true`。
    *   **如果 `is_end[u]` 为 `false`**：说明 `s` 只是某个更长单词的前缀，但它本身不是一个独立的单词，返回 `false`。
        *   例如，插入了 "apple"，查找 "app"。我们会走到 'app' 对应的节点，但如果 'app' 没被单独插入过，它的 `is_end` 就是 `false`。

**查找前缀 (startsWith) 操作**：
这个操作和查找操作非常相似，唯一的区别在于，遍历完字符串 `s` 后，我们**不需要**检查 `is_end[u]` 标记。只要路径存在，就说明 `s` 是一个前缀，直接返回 `true`。

### 5. 时间与空间复杂度分析

*   **时间复杂度**：
    *   **插入一个长度为 `L` 的字符串**：需要遍历 `L` 个字符。每个字符的操作（查找子节点或创建新节点）都是 `O(1)`。因此，插入操作的时间复杂度是 `O(L)`。
    *   **查找一个长度为 `L` 的字符串**：同样需要遍历 `L` 个字符。每个字符的操作是 `O(1)`。因此，查找操作的时间复杂度是 `O(L)`。
    *   **优势**：Trie 的操作时间复杂度与字符串数量 `N` 无关，只与字符串长度 `L` 有关。这在 `N` 很大而 `L` 相对较小的情况下非常高效。

*   **空间复杂度**：
    *   最坏情况下，所有字符串都没有共同前缀，或者每个字符都不同。那么 Trie 会创建 `总字符数` 个节点。
    *   假设有 `N` 个字符串，平均长度为 `L`，并且字符集大小为 `K`（例如，小写字母 `K=26`）。
    *   总节点数最多为 `N * L`。每个节点存储 `K` 个子节点索引和一个布尔标记。
    *   因此，空间复杂度是 `O(N * L * K)`。
    *   **优势**：当存在大量共同前缀时，实际使用的节点数会远小于 `N * L`，从而节省空间。但如果字符串很长且差异大，空间占用可能比较大。

### 6. 常见误区与注意事项

*   **根节点**：通常用 0 号节点作为根节点，不代表任何字符，它的 `is_end` 默认为 `false`。
*   **字符映射**：将字符 `'a'` 映射为索引 `0`，`'b'` 映射为 `1`，以此类推，`'z'` 映射为 `25`。这是通过 `c - 'a'` 实现的。
*   **节点初始化**：新创建的节点，它的所有 `children` 数组元素都应初始化为 0（表示没有子节点），`is_end` 初始化为 `false`。在 `init()` 函数中统一清空所有节点信息是一种常见的做法。
*   **`node_count` 管理**：确保 `node_count` 正确递增，并且不会超出 `MAX_NODES` 的范围。
*   **数组越界**：`char` 到 `int` 的转换 `c - 'a'` 必须在 `0` 到 `ALPHABET_SIZE - 1` 之间。如果字符串包含大写字母或其他字符，需要额外处理。

理解了这些，我们就可以开始用代码实现 Trie 了！

===NEXT===

## 典型例题精讲

### 例题 1：实现基本的 Trie 插入和查找

**题目描述**：
你需要实现一个 Trie 数据结构，支持以下两种操作：
1.  `insert(string s)`: 向 Trie 中插入一个字符串 `s`。
2.  `search(string s)`: 查找字符串 `s` 是否在 Trie 中。如果是，返回 `true`；否则，返回 `false`。
假设所有字符串都只包含小写英文字母。

**输入示例**：
```
insert apple
insert apply
search apple
search banana
insert app
search app
search apply
```

**输出示例**：
```
true
false
true
true
```

**思路分析**：
这道题是 Trie 的基本应用，直接按照上面讲解的插入和查找逻辑实现即可。
1.  定义 `children` 数组、`is_end` 数组和 `node_count` 全局变量。
2.  实现 `init()` 函数，初始化 Trie。
3.  实现 `insert(string s)` 函数，遍历字符串，如果路径不存在则创建新节点，并在最后标记 `is_end`。
4.  实现 `search(string s)` 函数，遍历字符串，如果路径中断则返回 `false`；遍历结束后，检查最后一个节点的 `is_end` 标记。

**代码实现**：

```cpp
#include <bits/stdc++.h> // 包含常用头文件，如 iostream, string 等

using namespace std;

const int MAX_NODES = 100005; // 最大节点数，根据题目字符串总长度来估算
const int ALPHABET_SIZE = 26; // 字母表大小，小写英文字母

// children[i][j] 表示第 i 个节点的第 j 个字符（'a'+j）对应的子节点索引
int children[MAX_NODES][ALPHABET_SIZE]; 
// is_end[i] 表示第 i 个节点是否是某个完整单词的结尾
bool is_end[MAX_NODES]; 
// 当前Trie中已分配的节点总数，0号节点是根节点
int node_count; 

// 初始化Trie
void init() {
    // 将所有节点的子节点指针和is_end标记清零
    // 从0到node_count，清空所有可能被使用过的节点
    for (int i = 0; i <= node_count; ++i) {
        for (int j = 0; j < ALPHABET_SIZE; ++j) {
            children[i][j] = 0; // 0 表示没有子节点
        }
        is_end[i] = false;
    }
    node_count = 0; // 重新计数，根节点是0号，新节点从1号开始分配
}

// 插入字符串s
void insert(string s) {
    int u = 0; // 从根节点开始
    for (char c : s) { // 遍历字符串中的每个字符
        int v = c - 'a'; // 将字符转换为0-25的索引
        if (children[u][v] == 0) { // 如果当前节点没有这个字符对应的子节点
            children[u][v] = ++node_count; // 分配一个新的节点
        }
        u = children[u][v]; // 移动到下一个节点
    }
    is_end[u] = true; // 标记当前节点是一个单词的结尾
}

// 查找字符串s是否存在
bool search(string s) {
    int u = 0; // 从根节点开始
    for (char c : s) { // 遍历字符串中的每个字符
        int v = c - 'a'; // 将字符转换为0-25的索引
        if (children[u][v] == 0) { // 如果当前节点没有这个字符对应的子节点，说明字符串不存在
            return false;
        }
        u = children[u][v]; // 移动到下一个节点
    }
    return is_end[u]; // 路径走完，检查最后一个节点是否被标记为单词结尾
}

/*
int main() {
    init(); // 初始化Trie

    insert("apple");
    insert("apply");
    cout << "Search 'apple': " << (search("apple") ? "true" : "false") << endl; // true
    cout << "Search 'banana': " << (search("banana") ? "true" : "false") << endl; // false
    insert("app");
    cout << "Search 'app': " << (search("app") ? "true" : "false") << endl; // true
    cout << "Search 'apply': " << (search("apply") ? "true" : "false") << endl; // true
    cout << "Search 'appl': " << (search("appl") ? "true" : "false") << endl; // false (因为'appl'没有被单独插入)

    return 0;
}
*/
```

**复杂度分析**：
*   **时间复杂度**：
    *   `init()`: `O(MAX_NODES * ALPHABET_SIZE)`，通常在程序开始时只执行一次。
    *   `insert(string s)`: `O(L)`，其中 `L` 是字符串 `s` 的长度。
    *   `search(string s)`: `O(L)`，其中 `L` 是字符串 `s` 的长度。
*   **空间复杂度**：`O(总字符数 * ALPHABET_SIZE)`。`MAX_NODES` 应该设置为所有插入字符串的总长度上限。例如，如果插入 `N` 个字符串，每个最长 `L`，则 `MAX_NODES` 至少为 `N * L`。

---

### 例题 2：统计具有特定前缀的单词数量

**题目描述**：
实现一个 Trie 数据结构，支持以下两种操作：
1.  `insert(string s)`: 向 Trie 中插入一个字符串 `s`。
2.  `countPrefix(string prefix)`: 返回 Trie 中有多少个单词以 `prefix` 作为前缀。
假设所有字符串都只包含小写英文字母。

**输入示例**：
```
insert apple
insert apply
insert app
insert banana
countPrefix ap
countPrefix ban
countPrefix zzz
insert application
countPrefix app
```

**输出示例**：
```
3
1
0
4
```

**思路分析**：
这道题在基本 Trie 的基础上，要求统计前缀数量。
1.  **插入操作**：与例题 1 相同。
2.  **统计前缀操作**：
    *   首先，我们需要找到 `prefix` 字符串在 Trie 中对应的最后一个节点。这个过程与 `search` 操作的前半部分相同。
    *   如果 `prefix` 对应的路径不存在，那么就没有单词以它为前缀，返回 0。
    *   如果路径存在，我们到达了 `prefix` 对应的节点 `u`。现在问题变成了：从节点 `u` 出发，向下有多少个 `is_end` 标记为 `true` 的节点？
    *   这可以通过**深度优先搜索 (DFS)** 来实现：从节点 `u` 开始，遍历它所有可能的子节点，递归地统计每个子树中 `is_end` 为 `true` 的节点数量。
    *   在 DFS 过程中，如果当前节点 `curr` 的 `is_end[curr]` 为 `true`，就说明我们找到一个以 `prefix` 为前缀的完整单词，计数加 1。然后继续向下搜索，因为一个单词也可能是另一个单词的前缀。

**代码实现**：

```cpp
#include <bits/stdc++.h>

using namespace std;

const int MAX_NODES = 100005; 
const int ALPHABET_SIZE = 26; 

int children[MAX_NODES][ALPHABET_SIZE]; 
bool is_end[MAX_NODES]; 
int node_count; 

void init() {
    for (int i = 0; i <= node_count; ++i) {
        for (int j = 0; j < ALPHABET_SIZE; ++j) {
            children[i][j] = 0;
        }
        is_end[i] = false;
    }
    node_count = 0;
}

void insert(string s) {
    int u = 0;
    for (char c : s) {
        int v = c - 'a';
        if (children[u][v] == 0) {
            children[u][v] = ++node_count;
        }
        u = children[u][v];
    }
    is_end[u] = true;
}

// 辅助函数：从给定节点开始，深度优先搜索统计所有子树中的完整单词数量
int dfs_count_words(int u) {
    int count = 0;
    if (is_end[u]) { // 如果当前节点是一个单词的结尾，计数加1
        count++;
    }

    // 遍历所有可能的子节点
    for (int i = 0; i < ALPHABET_SIZE; ++i) {
        if (children[u][i] != 0) { // 如果子节点存在
            count += dfs_count_words(children[u][i]); // 递归统计子树中的单词
        }
    }
    return count;
}


// 统计以prefix为前缀的单词数量
int countPrefix(string prefix) {
    int u = 0; // 从根节点开始
    for (char c : prefix) { // 遍历前缀字符串
        int v = c - 'a';
        if (children[u][v] == 0) { // 如果前缀路径中断，说明没有单词以它为前缀
            return 0;
        }
        u = children[u][v]; // 移动到下一个节点
    }
    // 找到前缀最后一个字符对应的节点u，现在从u开始DFS统计所有以它为前缀的单词
    return dfs_count_words(u);
}

/*
int main() {
    init();

    insert("apple");
    insert("apply");
    insert("app");
    insert("banana");

    cout << "Count prefix 'ap': " << countPrefix("ap") << endl; // 3 (apple, apply, app)
    cout << "Count prefix 'ban': " << countPrefix("ban") << endl; // 1 (banana)
    cout << "Count prefix 'zzz': " << countPrefix("zzz") << endl; // 0
    
    insert("application");
    cout << "Count prefix 'app': " << countPrefix("app") << endl; // 4 (apple, apply, app, application)

    return 0;
}
*/
```

**复杂度分析**：
*   **时间复杂度**：
    *   `insert(string s)`: `O(L)`，其中 `L` 是字符串 `s` 的长度。
    *   `countPrefix(string prefix)`: 
        *   查找前缀路径：`O(L_prefix)`，其中 `L_prefix` 是 `prefix` 的长度。
        *   DFS 遍历子树：最坏情况下，会遍历以该前缀开头的所有子树，可能达到 `O(总节点数)`。但在实际应用中，通常是 `O(L_prefix + 匹配的单词总长度)`。
*   **空间复杂度**：`O(总字符数 * ALPHABET_SIZE)`。

---

### 例题 3：优化统计前缀单词数量 (更高效的方法)

例题2的 `dfs_count_words` 方法在每次查询时都需要遍历子树，如果前缀很短，子树很大，效率会比较低。我们可以通过在每个节点额外存储一个信息来优化。

**题目描述**：
同例题 2，但要求 `countPrefix` 操作更快。

**思路分析**：
在每个节点上，除了 `children` 数组和 `is_end` 标记外，我们再增加一个整型变量 `count` (或者叫 `prefix_count`)。
*   `count[u]` 存储的含义是：**有多少个单词经过了节点 `u`**。

**操作变化**：
1.  **插入 (Insert) 操作**：
    *   每当遍历到一个字符，移动到下一个节点时，新节点或已存在的节点 `u` 的 `count[u]` 都应该加 1。
    *   **注意**：`is_end` 仍然只在单词的最终节点标记。
2.  **统计前缀 (countPrefix) 操作**：
    *   首先，找到 `prefix` 字符串在 Trie 中对应的最后一个节点 `u`。
    *   如果路径不存在，返回 0。
    *   如果路径存在，直接返回 `count[u]` 的值即可！因为 `count[u]` 已经记录了有多少个单词经过了它，这些单词自然就都以 `prefix` 为前缀。

**代码实现**：

```cpp
#include <bits/stdc++.h>

using namespace std;

const int MAX_NODES = 100005; 
const int ALPHABET_SIZE = 26; 

int children[MAX_NODES][ALPHABET_SIZE]; 
bool is_end[MAX_NODES]; 
int prefix_count[MAX_NODES]; // 新增：记录有多少个单词经过此节点
int node_count; 

void init() {
    for (int i = 0; i <= node_count; ++i) {
        for (int j = 0; j < ALPHABET_SIZE; ++j) {
            children[i][j] = 0;
        }
        is_end[i] = false;
        prefix_count[i] = 0; // 新增：初始化为0
    }
    node_count = 0;
}

void insert(string s) {
    int u = 0;
    for (char c : s) {
        int v = c - 'a';
        if (children[u][v] == 0) {
            children[u][v] = ++node_count;
        }
        u = children[u][v];
        prefix_count[u]++; // 经过此节点，计数加1
    }
    is_end[u] = true;
}

int countPrefix(string prefix) {
    int u = 0;
    for (char c : prefix) {
        int v = c - 'a';
        if (children[u][v] == 0) {
            return 0; // 前缀路径中断
        }
        u = children[u][v];
    }
    return prefix_count[u]; // 直接返回该节点记录的经过次数
}

/*
int main() {
    init();

    insert("apple");
    insert("apply");
    insert("app");
    insert("banana");

    cout << "Count prefix 'ap': " << countPrefix("ap") << endl; // 3
    cout << "Count prefix 'ban': " << countPrefix("ban") << endl; // 1
    cout << "Count prefix 'zzz': " << countPrefix("zzz") << endl; // 0
    
    insert("application");
    cout << "Count prefix 'app': " << countPrefix("app") << endl; // 4

    return 0;
}
*/
```

**复杂度分析**：
*   **时间复杂度**：
    *   `insert(string s)`: `O(L)`，其中 `L` 是字符串 `s` 的长度。每次遍历一个字符，除了创建节点外，还需要更新 `prefix_count`，仍然是 `O(1)` 操作。
    *   `countPrefix(string prefix)`: `O(L_prefix)`，其中 `L_prefix` 是 `prefix` 的长度。查找路径并直接返回计数，非常高效。
*   **空间复杂度**：`O(总字符数 * ALPHABET_SIZE)`，额外增加一个 `prefix_count` 数组，空间复杂度不变。

这个优化非常常见且实用，因为它将前缀查询的时间复杂度从 `O(L_prefix + 匹配单词总长度)` 优化到了 `O(L_prefix)`。

===NEXT===

## 代码实现模板

以下是一个包含了 Trie 基本操作的 C++ 代码模板，使用原生数组和全局变量实现。

```cpp
#include <bits/stdc++.h> // 包含常用头文件，如 iostream, string 等

using namespace std; // 使用标准命名空间

// 定义常量
const int MAX_NODES = 100005; // Trie 中可能的最大节点数，根据题目数据范围估算
                              // 如果有 N 个字符串，每个最长 L，则 MAX_NODES 至少为 N * L
const int ALPHABET_SIZE = 26; // 字母表大小，例如小写英文字母是 26

// Trie 的核心数据结构
// children[i][j] 存储第 i 个节点的第 j 个字符（'a'+j）对应的子节点索引
// 如果 children[i][j] 为 0，表示当前节点没有这个字符对应的子节点
int children[MAX_NODES][ALPHABET_SIZE]; 
// is_end[i] 标记第 i 个节点是否是某个完整单词的结尾
bool is_end[MAX_NODES]; 
// prefix_count[i] 记录有多少个单词（或前缀）经过了第 i 个节点
// 这个用于优化统计前缀数量，如果不需要，可以省略
int prefix_count[MAX_NODES]; 
// node_count 记录当前Trie中已分配的节点总数
// 0 号节点通常作为根节点，不占用字符，也不算在 node_count 内
// 新节点从 1 号开始分配
int node_count; 

// 函数：初始化Trie
// 在每次使用Trie前（例如多组测试数据），都需要调用此函数清空Trie
void init() {
    // 清空所有已使用的节点的子节点指针、is_end标记和prefix_count计数
    // 注意：清空范围是 0 到 node_count，因为 node_count 记录的是已分配的最大节点索引
    for (int i = 0; i <= node_count; ++i) {
        for (int j = 0; j < ALPHABET_SIZE; ++j) {
            children[i][j] = 0; // 将子节点指针设为0，表示无子节点
        }
        is_end[i] = false;     // 将is_end标记设为false
        prefix_count[i] = 0;   // 将prefix_count计数设为0
    }
    node_count = 0; // 重置节点计数器，Trie回到初始状态（只剩根节点0）
}

// 函数：向Trie中插入一个字符串 s
void insert(string s) {
    int u = 0; // 从根节点（0号节点）开始遍历
    for (char c : s) { // 遍历字符串 s 中的每一个字符
        int v = c - 'a'; // 将字符 'a'...'z' 映射到 0...25 的索引
        
        // 如果当前节点 u 没有字符 v 对应的子节点
        if (children[u][v] == 0) {
            // 分配一个新的节点
            children[u][v] = ++node_count; // node_count 自增，然后将新节点的索引赋值给 children[u][v]
        }
        
        // 移动到下一个节点
        u = children[u][v]; 
        
        // 更新经过此节点的单词/前缀计数 (如果需要统计前缀数量)
        prefix_count[u]++; 
    }
    // 字符串 s 的所有字符遍历完毕后，当前节点 u 就是 s 的最后一个字符对应的节点
    is_end[u] = true; // 标记此节点为一个完整单词的结尾
}

// 函数：查找字符串 s 是否在Trie中
// 如果存在，返回 true；否则返回 false
bool search(string s) {
    int u = 0; // 从根节点（0号节点）开始遍历
    for (char c : s) { // 遍历字符串 s 中的每一个字符
        int v = c - 'a'; // 将字符映射为索引
        
        // 如果当前节点 u 没有字符 v 对应的子节点，说明路径中断
        if (children[u][v] == 0) {
            return false; // 字符串 s 不存在于Trie中
        }
        
        // 移动到下一个节点
        u = children[u][v];
    }
    // 所有字符遍历完毕，到达 s 的最后一个字符对应的节点 u
    // 还需要检查 is_end[u] 是否为 true，确保 s 是一个完整的单词，而不是某个单词的前缀
    return is_end[u]; 
}

// 函数：判断Trie中是否存在以 prefix 为前缀的字符串
// 如果存在，返回 true；否则返回 false
bool startsWith(string prefix) {
    int u = 0; // 从根节点（0号节点）开始遍历
    for (char c : prefix) { // 遍历前缀字符串 prefix 中的每一个字符
        int v = c - 'a'; // 将字符映射为索引
        
        // 如果当前节点 u 没有字符 v 对应的子节点，说明路径中断
        if (children[u][v] == 0) {
            return false; // 没有字符串以 prefix 为前缀
        }
        
        // 移动到下一个节点
        u = children[u][v];
    }
    // 所有字符遍历完毕，路径存在，说明至少有一个字符串以 prefix 为前缀
    return true; 
}

// 函数：统计Trie中以 prefix 为前缀的单词数量
// 使用 prefix_count 优化后的版本
int countPrefixWords(string prefix) {
    int u = 0; // 从根节点（0号节点）开始遍历
    for (char c : prefix) { // 遍历前缀字符串 prefix 中的每一个字符
        int v = c - 'a'; // 将字符映射为索引
        
        // 如果当前节点 u 没有字符 v 对应的子节点，说明路径中断
        if (children[u][v] == 0) {
            return 0; // 没有字符串以 prefix 为前缀
        }
        
        // 移动到下一个节点
        u = children[u][v];
    }
    // 路径存在，直接返回 prefix_count[u] 的值
    // 因为 prefix_count[u] 记录了有多少个单词经过了此节点，这些单词都以 prefix 为前缀
    return prefix_count[u];
}

/*
// 示例 main 函数，用于测试
int main() {
    init(); // 初始化Trie

    // 插入操作
    insert("apple");
    insert("apply");
    insert("app");
    insert("banana");
    insert("band");

    // 查找操作
    cout << "Search 'apple': " << (search("apple") ? "true" : "false") << endl;    // true
    cout << "Search 'banana': " << (search("banana") ? "true" : "false") << endl;  // true
    cout << "Search 'app': " << (search("app") ? "true" : "false") << endl;        // true
    cout << "Search 'appl': " << (search("appl") ? "true" : "false") << endl;      // false (因为 'appl' 没有被单独插入)
    cout << "Search 'orange': " << (search("orange") ? "true" : "false") << endl;  // false

    cout << "--------------------" << endl;

    // 前缀查找操作
    cout << "Starts with 'app': " << (startsWith("app") ? "true" : "false") << endl; // true
    cout << "Starts with 'ban': " << (startsWith("ban") ? "true" : "false") << endl; // true
    cout << "Starts with 'ora': " << (startsWith("ora") ? "true" : "false") << endl; // false

    cout << "--------------------" << endl;

    // 统计前缀单词数量操作
    cout << "Count words with prefix 'ap': " << countPrefixWords("ap") << endl;      // 3 (apple, apply, app)
    cout << "Count words with prefix 'app': " << countPrefixWords("app") << endl;    // 3 (apple, apply, app)
    cout << "Count words with prefix 'ban': " << countPrefixWords("ban") << endl;    // 2 (banana, band)
    cout << "Count words with prefix 'z': " << countPrefixWords("z") << endl;        // 0

    return 0;
}
*/
```

**使用说明**：
1.  **宏定义**：`MAX_NODES` 必须根据题目给定的字符串总长度和数量来预估，确保不会数组越界。`ALPHABET_SIZE` 根据字符集调整。
2.  **`init()` 函数**：在每次测试案例开始时（如果有多组测试数据）务必调用 `init()` 来清空 Trie。
3.  **字符映射**：当前模板只处理小写英文字母。如果需要处理大写字母、数字或其他字符，需要调整 `ALPHABET_SIZE` 和字符到索引的映射 (`c - 'a'`)。
4.  **`main` 函数**：模板中的 `main` 函数被注释掉了，实际使用时请根据题目要求编写 `main` 函数，调用 Trie 的相关操作。

===NEXT===

## 课堂互动

### 思考题

1.  **Trie 和哈希表 (Hash Table) 在处理字符串查找时有什么不同？**
    *   **提示**：想想它们的底层原理，哈希冲突，以及对前缀查询的支持。
2.  **如果我们要存储的字符串包含大写字母和数字，Trie 的结构需要怎么修改？**
    *   **提示**：`ALPHABET_SIZE` 和 `c - 'a'` 应该如何变化？
3.  **我们说 Trie 节省空间，但最坏情况下，它的空间复杂度可能比直接存储所有字符串还大，这是为什么？**
    *   **提示**：想想每个节点需要存储哪些信息，以及什么时候会创建大量节点。
4.  **Trie 能否用来判断两个字符串是否有公共前缀？如何判断？**
    *   **提示**：思考 `startsWith` 操作的变种。

### 小组任务：绘制 Trie

**任务**：将以下字符串插入到一个空的 Trie 中，并绘制出最终的 Trie 结构图。
**字符串集合**：`{"cat", "car", "dog", "cut", "cute"}`

**要求**：
1.  画出根节点。
2.  每个节点