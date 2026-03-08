# Lucas 定理与大组合数取模

## 教学目标

### 知识目标
1.  **理解 Lucas 定理的原理**：学生能够理解 Lucas 定理如何将大组合数取模问题分解为小组合数取模问题的乘积。
2.  **掌握 Lucas 定理的应用场景**：学生能够识别当 `n, m` 很大而模数 `p` 是质数时，Lucas 定理是解决组合数取模问题的有效工具。
3.  **掌握模数 p 内阶乘和逆元的预处理方法**：学生能够实现高效的快速幂、费马小定理求逆元，并预处理小于 `p` 的阶乘和阶乘逆元。

### 能力目标
1.  **能够运用 Lucas 定理解决问题**：学生能够编写代码实现 Lucas 定理，并正确计算 `C(n, m) % p`。
2.  **具备分析算法复杂度的能力**：学生能够分析 Lucas 定理算法的时间和空间复杂度。
3.  **提升问题分解与递归思维**：通过 Lucas 定理的递归结构，培养学生将复杂问题分解为简单子问题的能力。

### 素养目标
1.  **培养数学建模思想**：通过将实际问题（大组合数取模）抽象为数学模型，提升学生用数学工具解决问题的意识。
2.  **激发对数论的兴趣**：通过 Lucas 定理的巧妙设计，激发学生对数论在算法中应用的兴趣，感受数学之美。
3.  **提升严谨的编程习惯**：在实现过程中注重边界条件、模运算的正确性，培养严谨细致的编程习惯。

===NEXT===

## 趣味引入

同学们，想象一下这样的场景：

我们班级要选出参加“未来科学家”夏令营的代表。假设我们班有 `n` 位同学，但是夏令营只招收 `m` 位代表。那么，总共有多少种不同的选择方案呢？当然是 `C(n, m)` 种啦！

现在问题来了，如果 `n` 和 `m` 都非常非常大，比如 `n = 10^18`, `m = 5 * 10^17`，这个数字会大到什么程度？恐怕我们地球上所有的计算机加起来也存不下这个结果！

但是，夏令营的组织者有一个奇怪的要求：他们不关心具体的选择方案总数，他们只关心这个巨大的数字除以一个特定的质数 `p` 之后，剩下的余数是多少。比如，他们只关心结果对 `101` 取模后的值。

这下可把我们难住了！直接算 `C(n, m)` 会溢出，根本无法取模。那有没有什么魔法咒语，能让我们在不计算出完整 `C(n, m)` 的情况下，直接算出它对 `p` 的余数呢？

今天，我们就来学习一个超级酷炫的数学定理——**Lucas 定理**，它就像一个“大变小”的魔术师，能把巨大的组合数取模问题，巧妙地分解成许多小小的组合数取模问题！

===NEXT===

## 深度知识点讲解

### 1. 回顾：组合数 C(n, m)

我们知道，从 `n` 个不同物品中选择 `m` 个物品的方案数，称为组合数，记作 `C(n, m)` 或 `(n m)`。
它的计算公式是：
`C(n, m) = n! / (m! * (n-m)!)`

其中，`n!` 表示 `n` 的阶乘，即 `1 * 2 * ... * n`。
需要注意的是，当 `m > n` 时，`C(n, m)` 的值为 0。

### 2. 组合数取模：C(n, m) % p

当我们需要计算 `C(n, m) % p` 时，情况就变得复杂起来。
除法在模运算中不能直接进行，我们需要使用**逆元**。

#### 2.1 基础情况：n, m 较小，p 是一个质数

如果 `n` 和 `m` 都不大（比如 `n < 10^5`），并且 `p` 是一个质数。
我们可以这样做：
1.  计算 `n! % p`。
2.  计算 `m! % p`。
3.  计算 `(n-m)! % p`。
4.  根据费马小定理，如果 `p` 是质数，且 `a` 不是 `p` 的倍数，那么 `a^(p-1) ≡ 1 (mod p)`。
    因此，`a^(-1) ≡ a^(p-2) (mod p)`。
    这意味着，`m! % p` 的逆元是 `(m!)^(p-2) % p`。
    同理，`(n-m)! % p` 的逆元是 `((n-m)!)^(p-2) % p`。
5.  所以，`C(n, m) % p = (n! % p * (m!)^(p-2) % p * ((n-m)!)^(p-2) % p) % p`。

为了提高效率，我们可以预处理出 `0` 到 `n` 的所有阶乘 `fact[i] = i! % p`，以及它们的逆元 `invFact[i] = (i!)^(-1) % p`。
其中 `invFact[i]` 可以通过 `invFact[i] = invFact[i+1] * (i+1) % p` 倒推得到，或者直接通过 `power(fact[i], p-2, p)` 计算。

**关键工具：快速幂 (Modular Exponentiation)**
用于高效计算 `a^b % p`。

```cpp
// 快速幂函数：计算 (a^b) % p
long long power(long long a, long long b, long long p) {
    long long res = 1;
    a %= p; // 确保a在模p的范围内
    while (b > 0) {
        if (b % 2 == 1) { // 如果b是奇数
            res = (res * a) % p;
        }
        a = (a * a) % p; // a自乘
        b /= 2;          // b减半
    }
    return res;
}

// 费马小定理求逆元：计算 a^(-1) % p
// 前提：p是质数，a不是p的倍数
long long inv(long long a, long long p) {
    return power(a, p - 2, p);
}
```

#### 2.2 挑战：n, m 很大，p 是一个质数（Lucas 定理的舞台！）

现在，考虑我们的引入问题：`n` 和 `m` 巨大，比如 `n = 10^18`，而 `p` 相对较小，比如 `p = 101`。
这时，`n` 远大于 `p`。我们不能简单地预处理到 `n!`，因为 `n` 太大了！
更重要的是，`n!` 中可能包含 `p` 的倍数，导致 `n! % p = 0`。如果 `m!` 或 `(n-m)!` 中也包含 `p` 的倍数，那么它们的逆元就不能用费马小定理求了，因为 `a` 必须不是 `p` 的倍数。

这正是 Lucas 定理登场的时候！

**Lucas 定理**
如果 `p` 是一个质数，那么对于任意非负整数 `n` 和 `m`，有：
`C(n, m) % p = (C(n/p, m/p) * C(n%p, m%p)) % p`

其中，`n/p` 和 `m/p` 表示整数除法。
这个定理将一个大组合数取模问题，分解成了两个小组合数取模问题，并且这两个小组合数中的 `n'` 和 `m'` 都比原来的 `n` 和 `m` 小，而且 `n%p` 和 `m%p` 肯定都小于 `p`。

**生活类比：大队伍分批次挑选**
想象一下，你有一个巨大的队伍（`n` 个人），要从中挑选出 `m` 个人。
现在，我们把这 `n` 个人按照 `p` 个人一组进行分组。
*   `n/p` 组是完整的 `p` 人小组。
*   `n%p` 个人是剩下不足 `p` 人的零散小组。

同样地，要选出的 `m` 个人也可以看作是：
*   从完整的 `p` 人小组中选出 `m/p` 组。
*   从零散小组中选出 `m%p` 个人。

Lucas 定理的精髓在于，它告诉我们，从大队伍中挑选 `m` 人的方法数对 `p` 取模的结果，等价于：
1.  从所有“完整小组”中，选出 `m/p` 个“完整小组”的方案数（即 `C(n/p, m/p)`）。
2.  再从所有“零散个人”中，选出 `m%p` 个“零散个人”的方案数（即 `C(n%p, m%p)`）。
将这两个方案数相乘，再对 `p` 取模，就是最终结果。

**如何应用 Lucas 定理？**
Lucas 定理是递归的！我们可以不断地应用它，直到 `n` 或 `m` 小于 `p`。
当 `n` 和 `m` 都小于 `p` 时，我们就可以用前面讲的“基础情况”方法来计算 `C(n, m) % p` 了，因为此时 `n!`、`m!`、`(n-m)!` 中都不可能包含 `p` 的因子，它们的阶乘和逆元都可以预处理。

**Lucas 定理的关键点：**
1.  **模数 `p` 必须是质数**。这是费马小定理和 Lucas 定理本身成立的前提。
2.  **边界条件 `m > n`**：如果 `m > n`，`C(n, m)` 结果为 0。在递归过程中要特别注意。
3.  **预处理**：在 Lucas 定理的递归最底层，我们需要计算 `C(a, b) % p`，其中 `a, b < p`。为了高效，我们需要预处理 `0` 到 `p-1` 的阶乘和阶乘逆元。

**常见误区：**
*   **忘记 `p` 必须是质数**：如果 `p` 是合数，Lucas 定理不成立。
*   **忽略 `m > n` 的情况**：在计算 `C(a, b)` 时，如果 `b > a`，结果应为 0。
*   **模运算的遗漏**：在每次乘法操作后都应该进行 `% p`，防止中间结果溢出。

#### 2.3 扩展：复合模数 P（了解即可）

如果模数 `P` 不是质数，怎么办？
例如 `P = P1 * P2 * ...`，其中 `P1, P2` 是互质的因子。
我们可以先分别计算 `C(n, m) % P1`，`C(n, m) % P2`，等等。
然后，利用**中国剩余定理 (CRT)** 将这些结果合并起来，得到 `C(n, m) % P`。
这涉及到更复杂的**扩展 Lucas 定理**，属于 CSP-S 甚至更高阶的知识，我们本次课程主要聚焦于 `p` 为质数的情况。

===NEXT===

## 典型例题精讲

### 例题1：基础 Lucas 定理应用

**题目描述：**
计算 `C(100, 50) % 11`。

**思路分析：**
1.  `n = 100`, `m = 50`, `p = 11`。`n` 和 `m` 都比 `p` 大，所以可以使用 Lucas 定理。
2.  我们需要一个辅助函数 `C(a, b, p)` 来计算 `a, b < p` 时的组合数。这个函数需要预处理 `p` 以内的阶乘和逆元。
3.  应用 Lucas 定理：
    `C(100, 50) % 11 = (C(100/11, 50/11) * C(100%11, 50%11)) % 11`
    `= (C(9, 4) * C(1, 6)) % 11`
4.  继续分解：
    *   `C(9, 4)`：`9 < 11`, `4 < 11`。直接用预处理的阶乘和逆元计算。
        `C(9, 4) = 9! / (4! * 5!) = (9*8*7*6) / (4*3*2*1) = 9*2*7 = 126`
        `C(9, 4) % 11 = 126 % 11 = 5`
    *   `C(1, 6)`：`6 > 1`。根据组合数定义，`C(1, 6) = 0`。
5.  所以，`C(100, 50) % 11 = (5 * 0) % 11 = 0`。

**代码实现 (针对此例题的 Lucas 函数调用)：**
为了展示方便，这里只给出 Lucas 函数的调用和关键预处理部分。完整的代码模板会在下一节给出。

```cpp
#include <iostream>

// 假设我们已经有了 power, inv, C_small_mod_p 这些函数
// 以及 fact 和 invFact 数组
long long fact[12]; // 存储0到11的阶乘
long long invFact[12]; // 存储0到11的阶乘逆元

// 快速幂函数
long long power(long long a, long long b, long long p) {
    long long res = 1;
    a %= p;
    while (b > 0) {
        if (b % 2 == 1) res = (res * a) % p;
        a = (a * a) % p;
        b /= 2;
    }
    return res;
}

// 费马小定理求逆元
long long inv(long long a, long long p) {
    return power(a, p - 2, p);
}

// 计算 C(n, m) % p，当 n, m < p 时使用
long long C_small_mod_p(long long n, long long m, long long p) {
    if (m < 0 || m > n) { // 边界条件
        return 0;
    }
    // C(n, m) = n! * (m!)^(-1) * ((n-m)!)^(-1) % p
    return (((fact[n] * invFact[m]) % p) * invFact[n - m]) % p;
}

// Lucas 定理递归函数
long long Lucas(long long n, long long m, long long p) {
    if (m < 0 || m > n) { // 边界条件
        return 0;
    }
    if (m == 0 || m == n) { // C(n, 0) = 1, C(n, n) = 1
        return 1;
    }
    if (n < p && m < p) { // 当 n, m 都小于 p 时，直接计算
        return C_small_mod_p(n, m, p);
    }
    // 递归调用 Lucas 定理
    return (Lucas(n / p, m / p, p) * Lucas(n % p, m % p, p)) % p;
}

int main() {
    long long n = 100;
    long long m = 50;
    long long p = 11;

    // 预处理阶乘和逆元
    fact[0] = 1;
    invFact[0] = 1;
    for (int i = 1; i < p; ++i) {
        fact[i] = (fact[i - 1] * i) % p;
        invFact[i] = inv(fact[i], p); // 计算每个阶乘的逆元
    }

    long long result = Lucas(n, m, p);
    std::cout << "C(" << n << ", " << m << ") % " << p << " = " << result << std::endl;
    // 预期输出：C(100, 50) % 11 = 0

    return 0;
}
```

**复杂度分析：**
*   **预处理**：`O(p)` 时间，用于计算 `p` 以内的阶乘和逆元。
*   **Lucas 函数**：每次递归，`n` 和 `m` 都被除以 `p`。递归深度大约是 `log_p(n)`。
*   每次递归内部调用 `C_small_mod_p` 是 `O(1)`。
*   总时间复杂度：`O(p + log_p(n))`。
*   空间复杂度：`O(p)`，用于存储阶乘和逆元数组。

### 例题2：多次查询 Lucas 定理

**题目描述：**
给定 `T` 组测试数据，每组数据包含 `n, m, p`。计算 `C(n, m) % p`。
`T` 可以很大（例如 `T = 10^5`），`n` 可以达到 `10^18`，`m` 达到 `10^18`，`p` 是一个质数（例如 `p <= 10^5`）。

**思路分析：**
1.  由于 `p` 的范围相对较小，而 `n, m` 很大，并且有多组查询，每次都重新预处理阶乘和逆元会很慢。
2.  解决方案：预处理 `fact` 和 `invFact` 数组，它们的长度为 `p`。对于每次查询，只要 `p` 相同，就可以复用预处理的结果。如果 `p` 不同，就需要重新预处理。
3.  因为 `p` 可以是不同的，所以我们不能在 `main` 函数外预处理一次。常见的做法是，在每次输入 `p` 后，检查是否需要重新预处理。如果 `p` 相同，则跳过预处理。

**代码实现：**

```cpp
#include <iostream> // For input/output
#include <vector> // Although vector is restricted for GESP 1-5, for GESP 9 and general competitive programming, it's common.
                  // But for this problem, we'll use raw arrays as per instructions.
#include <bits/stdc++.h> // GESP 9 allows this.

// Allman style for curly braces {}

// 定义为全局数组，或者作为参数传递
// 注意：p 最大可达 10^5，所以数组大小要足够
const int MAX_P = 100005;
long long fact[MAX_P];
long long invFact[MAX_P];

// 快速幂函数：计算 (a^b) % p
long long power(long long a, long long b, long long p) {
    long long res = 1;
    a %= p;
    while (b > 0) {
        if (b % 2 == 1) {
            res = (res * a) % p;
        }
        a = (a * a) % p;
        b /= 2;
    }
    return res;
}

// 费马小定理求逆元：计算 a^(-1) % p
// 前提：p是质数，a不是p的倍数
long long inv(long long a, long long p) {
    return power(a, p - 2, p);
}

// 计算 C(n, m) % p，当 n, m < p 时使用
// 依赖全局的 fact 和 invFact 数组
long long C_small_mod_p(long long n, long long m, long long p) {
    if (m < 0 || m > n) {
        return 0;
    }
    // C(n, m) = n! * (m!)^(-1) * ((n-m)!)^(-1) % p
    // fact[n] % p
    // invFact[m] % p
    // invFact[n-m] % p
    long long term1 = fact[n];
    long long term2 = invFact[m];
    long long term3 = invFact[n - m];
    return (((term1 * term2) % p) * term3) % p;
}

// Lucas 定理递归函数
long long Lucas(long long n, long long m, long long p) {
    if (m < 0 || m > n) { // 边界条件：m大于n，组合数为0
        return 0;
    }
    if (m == 0 || m == n) { // C(n, 0) = 1, C(n, n) = 1
        return 1;
    }
    if (n < p && m < p) { // 当 n, m 都小于 p 时，直接计算
        return C_small_mod_p(n, m, p);
    }
    // 递归调用 Lucas 定理
    long long res1 = Lucas(n / p, m / p, p);
    long long res2 = Lucas(n % p, m % p, p);
    return (res1 * res2) % p;
}

int main() {
    std::ios_base::sync_with_stdio(false); // 加速IO
    std::cin.tie(NULL);

    int t;
    std::cin >> t;

    long long current_p = -1; // 记录当前预处理的p值，用于避免重复预处理

    while (t--) {
        long long n, m, p;
        std::cin >> n >> m >> p;

        // 如果当前的 p 和上一次的不同，则需要重新预处理
        if (p != current_p) {
            // 预处理阶乘和逆元
            fact[0] = 1;
            invFact[0] = 1;
            for (int i = 1; i < p; ++i) {
                fact[i] = (fact[i - 1] * i) % p;
                invFact[i] = inv(fact[i], p);
            }
            current_p = p; // 更新当前预处理的p值
        }

        long long result = Lucas(n, m, p);
        std::cout << result << "\n";
    }

    return 0;
}
```

**复杂度分析：**
*   **预处理**：最坏情况下，`p` 不同，需要 `O(p)`。
*   **Lucas 函数**：`O(log_p(n))`。
*   **总时间复杂度**：对于 `T` 组数据，如果 `p` 每次都不同，最坏是 `T * (O(p) + O(log_p(n)))`。如果 `p` 相同，则 `O(p) + T * O(log_p(n))`。考虑到 `p` 最大 `10^5`，`T` 最大 `10^5`，`T * O(p)` 可能会超时。
    *   **更精确的分析**：如果所有 `p` 都相同，总复杂度是 `O(p + T * log_p(n))`。
    *   如果所有 `p` 都不同，但 `p` 的总和不大，比如 `Sum(p) <= 10^6`，则总复杂度是 `O(Sum(p) + T * log_p(n))`。
    *   在竞赛中，通常 `p` 的范围和 `T` 的范围会确保 `T * log_p(n)` 是主要部分，或者 `Sum(p)` 在可接受范围内。

===NEXT===

## 代码实现模板

```cpp
#include <iostream> // 标准输入输出
#include <bits/stdc++.h> // 包含大部分标准库，竞赛常用

// GESP 9 要求使用原生数组，且 p 最大可达 10^5 甚至更大
// 模数 p 的最大值决定了 fact 和 invFact 数组的大小
const int MAX_PRIME = 100005; // 假设 p 的最大值是 100000
long long fact[MAX_PRIME];    // 存储 0 到 p-1 的阶乘
long long invFact[MAX_PRIME]; // 存储 0 到 p-1 的阶乘逆元

// --------------------- 辅助函数 ---------------------

// 函数名：power
// 功能：计算 (base ^ exp) % mod，即快速幂
// 参数：
//   base: 底数
//   exp: 指数
//   mod: 模数
// 返回值：(base ^ exp) % mod 的结果
long long power(long long base, long long exp, long long mod) {
    long long res = 1;
    base %= mod; // 确保底数在模数范围内
    while (exp > 0) {
        if (exp % 2 == 1) { // 如果指数是奇数
            res = (res * base) % mod;
        }
        base = (base * base) % mod; // 底数平方
        exp /= 2;                   // 指数减半
    }
    return res;
}

// 函数名：inv
// 功能：计算 a 在模 p 意义下的乘法逆元 (a^(-1) % p)
// 参数：
//   a: 需要求逆元的数
//   p: 模数 (必须是质数)
// 返回值：a 的逆元
// 原理：根据费马小定理，a^(p-1) ≡ 1 (mod p)，所以 a^(-1) ≡ a^(p-2) (mod p)
long long inv(long long a, long long p) {
    return power(a, p - 2, p);
}

// 函数名：C_small_mod_p
// 功能：计算 C(n, m) % p，当 n, m 都小于 p 时使用
//       此函数依赖于全局预处理好的 fact 和 invFact 数组
// 参数：
//   n: 总数
//   m: 选择数
//   p: 模数 (必须是质数)
// 返回值：C(n, m) % p 的结果
long long C_small_mod_p(long long n, long long m, long long p) {
    if (m < 0 || m > n) { // 如果选择数 m 小于0 或 大于总数 n，组合数为0
        return 0;
    }
    // C(n, m) = n! / (m! * (n-m)!)
    // 模运算下，除法变为乘以逆元
    // C(n, m) % p = (fact[n] * invFact[m] % p * invFact[n - m] % p) % p
    long long numerator = fact[n];
    long long denominator_m = invFact[m];
    long long denominator_nm = invFact[n - m];

    long long res = (numerator * denominator_m) % p;
    res = (res * denominator_nm) % p;
    return res;
}

// --------------------- Lucas 定理核心函数 ---------------------

// 函数名：Lucas
// 功能：使用 Lucas 定理计算 C(n, m) % p
// 参数：
//   n: 总数 (可以非常大)
//   m: 选择数 (可以非常大)
//   p: 模数 (必须是质数, 相对 n, m 较小)
// 返回值：C(n, m) % p 的结果
long long Lucas(long long n, long long m, long long p) {
    if (m < 0 || m > n) { // 边界条件：如果 m 小于0 或 大于 n，组合数为0
        return 0;
    }
    if (m == 0 || m == n) { // C(n, 0) = 1, C(n, n) = 1
        return 1;
    }
    if (n < p && m < p) { // 当 n, m 都小于 p 时，直接调用 C_small_mod_p 计算
        return C_small_mod_p(n, m, p);
    }
    // Lucas 定理核心：C(n, m) % p = (C(n/p, m/p) * C(n%p, m%p)) % p
    long long res1 = Lucas(n / p, m / p, p); // 递归计算高位部分
    long long res2 = Lucas(n % p, m % p, p); // 递归计算低位部分
    return (res1 * res2) % p;                 // 两部分结果相乘后取模
}

// --------------------- 主函数 ---------------------

int main() {
    // 优化输入输出速度 (竞赛常用)
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int t; // 测试数据组数
    std::cin >> t;

    long long current_p_for_precomputation = -1; // 记录当前预处理的 p 值，避免重复预处理

    while (t--) {
        long long n, m, p;
        std::cin >> n >> m >> p;

        // 只有当当前的 p 和上一次预处理的 p 不同时，才重新进行预处理
        if (p != current_p_for_precomputation) {
            // 预处理 0 到 p-1 的阶乘和阶乘逆元
            fact[0] = 1;
            invFact[0] = 1; // 0! 的逆元是 1 的逆元，即 1
            for (int i = 1; i < p; ++i) {
                fact[i] = (fact[i - 1] * i) % p; // 计算 i! % p
                invFact[i] = inv(fact[i], p);    // 计算 (i!)^(-1) % p
            }
            current_p_for_precomputation = p; // 更新已预处理的 p 值
        }

        // 调用 Lucas 定理计算结果
        long long result = Lucas(n, m, p);
        std::cout << result << "\n";
    }

    return 0;
}
```

===NEXT===

## 课堂互动

1.  **思考题 (个人)**：
    *   为什么 Lucas 定理要求模数 `p` 必须是**质数**？如果 `p` 是合数，比如 `p=6`，还能用 `a^(p-2)` 来求逆元吗？（提示：费马小定理的前提）
    *   在 `Lucas(n, m, p)` 函数中，如果 `m > n`，我们直接返回 `0`。这是为什么？`C(n, m)` 在数学上表示什么含义？

2.  **讨论环节 (小组)**：
    *   请同学们根据 Lucas 定理的公式 `C(n, m) % p = (C(n/p, m/p) * C(n%p, m%p)) % p`，结合我们前面讲的“大队伍分批次挑选”的类比，尝试用自己的话解释这个公式的含义。你们觉得这个类比形象吗？还有没有其他更形象的比喻？
    *   在 `C_small_mod_p` 函数中，我们计算了 `fact[n] * invFact[m] * invFact[n-m]`。如果 `p` 很大，比如 `p = 10^9 + 7`，`n` 和 `m` 也比较大（但都小于 `p`），那么 `fact[n]` 会是一个巨大的数，为什么我们在计算过程中不需要担心它溢出 `long long` 呢？

3.  **即时练习 (动手)**：
    *   请你和同桌一起，手动计算 `C(20, 10) % 3`。
        *   提示：`n=20, m=10, p=3`
        *   第一步：`Lucas(20, 10, 3) = (Lucas(20/3, 10/3, 3) * Lucas(20%3, 10%3, 3)) % 3`
        *   `= (Lucas(6, 3, 3) * Lucas(2, 1, 3)) % 3`
        *   继续展开 `Lucas(6, 3, 3)` 和 `Lucas(2, 1, 3)`，直到 `n, m < p`。
        *   预处理 `p=3` 时的阶乘和逆元：`fact[0]=1, fact[1]=1, fact[2]=2`。
            `invFact[0]=1, invFact[1]=1, invFact[2]=inv(2,3)=2`
        *   `C_small_mod_p(2, 1, 3) = (fact[2] * invFact[1] * invFact[1]) % 3 = (2 * 1 * 1) % 3 = 2`
        *   `Lucas(6, 3, 3) = (Lucas(6/3, 3/3, 3) * Lucas(6%3, 3%3, 3)) % 3`
        *   `= (Lucas(2, 1, 3) * Lucas(0, 0, 3)) % 3`
        *   `Lucas(2, 1, 3) = 2` (已计算)
        *   `Lucas(0, 0, 3) = 1` (边界条件)
        *   所以 `Lucas(6, 3, 3) = (2 * 1) % 3 = 2`
        *   最终结果：`(2 * 2) % 3 = 4 % 3 = 1`。

===NEXT===

## 分层练习题目

### 基础巩固

1.  请计算 `C(100, 20) % 13`。要求写出计算过程，并给出最终答案。
2.  编写程序，输入 `n, m, p`，计算 `C(n, m) % p`。
    *   `n` 和 `m` 的范围在 `[0, 200]`，`p` 的范围在 `[2, 20]` 且为质数。
    *   请在代码中添加详细注释。

### 能力提升

1.  **题目：组合数之和取模**
    给定 `n` 和质数 `p`，计算 `(C(n, 0) + C(n, 1) + ... + C(n, n)) % p`。
    其中 `n` 可以达到 `10^18`，`p` 可以达到 `10^5`。
    提示：`C(n, 0) + C(n, 1) + ... + C(n, n) = 2^n`。所以问题变成了计算 `2^n % p`。
    *   请编写程序解决此问题。

2.  **题目：多次查询 Lucas**
    给定 `T` 组测试数据。每组数据包含 `n, m, p`。
    对于每组数据，输出 `C(n, m) % p`。
    *   `T <= 10^5`
    *   `n, m <= 10^18`
    *   `p <= 10^5` 且为质数。
    *   请使用我们课堂上讲的优化方法（预处理数组，避免重复计算）。

### 拓展挑战

1.  **题目：非质数模数取模 (概念性)**
    如果模数 `P` 不是质数，例如 `P = 6`。如何计算 `C(n, m) % 6`？
    提示：`6 = 2 * 3`。可以分别计算 `C(n, m) % 2` 和 `C(n, m) % 3`，然后用中国剩余定理合并。
    请描述你的思路，不要求写代码。

---

## 分层练习题目答案

### 基础巩固答案

1.  **计算 C(100, 20) % 13**
    *   `n = 100`, `m = 20`, `p = 13`
    *   预处理 `p=13` 的阶乘和逆元：
        `fact = [1, 1, 2, 6, 24%13=11, 11*5%13=4, 4*6%13=11, 11*7%13=12, 12*8%13=5, 5*9%13=6, 6*10%13=8, 8*11%13=10, 10*12%13=3]`
        `invFact` 对应计算。
    *   `Lucas(100, 20, 13)`
        `= (Lucas(100/13, 20/13, 13) * Lucas(100%13, 20%13, 13)) % 13`
        `= (Lucas(7, 1, 13) * Lucas(9, 7, 13)) % 13`
    *   计算 `Lucas(7, 1, 13)`：`C(7, 1) % 13 = 7 % 13 = 7`
    *   计算 `Lucas(9, 7, 13)`：`C(9, 7) % 13 = C(9, 2) % 13 = (9*8 / (2*1)) % 13 = 36 % 13 = 10`
    *   最终结果：`(7 * 10) % 13 = 70 % 13 = 5`

2.  **代码实现**：请参考上面“代码实现模板”中的 `main` 函数，将 `t` 设置为 `1`，并输入 `n, m, p` 即可。

### 能力提升答案

1.  **题目：组合数之和取模**
    *   思路：根据二项式定理，`Sum(C(n, k) for k from 0 to n) = (1+1)^n = 2^n`。
    *   所以问题转化为计算 `2^n % p`。
    *   这可以直接使用快速幂 `power(2, n, p)` 来解决。
    *   代码：
        ```cpp
        #include <iostream>
        #include <bits/stdc++.h>

        long long power(long long base, long long exp, long long mod) {
            long long res = 1;
            base %= mod;
            while (exp > 0) {
                if (exp % 2 == 1) {
                    res = (res * base) % mod;
                }
                base = (base * base) % mod;
                exp /= 2;
            }
            return res;
        }

        int main() {
            std::ios_base::sync_with_stdio(false);
            std::cin.tie(NULL);

            long long n, p;
            std::cin >> n >> p; // 假设只给一组 n, p

            long long result = power(2, n, p);
            std::cout << result << "\n";

            return 0;
        }
        ```

2.  **题目：多次查询 Lucas**
    *   代码：请直接使用上面“代码实现模板”中的完整代码。

### 拓展挑战答案

1.  **题目：非质数模数取模 (概念性)**
    *   **思路**：
        1.  **质因数分解模数 P**：将复合模数 `P` 分解为互质的因子乘积，例如 `P = P1 * P2 * ... * Pk`。
            对于 `P = 6`，分解为 `P1 = 2`, `P2 = 3`。
        2.  **分别计算**：
            *   计算 `C(n, m) % P1`。
            *   计算 `C(n, m) % P2`。
            *   ...
            *   计算 `C(n, m) % Pk`。
            对于每个 `C(n, m) % Pi`，如果 `Pi` 是质数，可以使用 Lucas 定理。如果 `Pi` 是质数的幂 (例如 `8 = 2^3`)，则需要使用更复杂的扩展 Lucas 定理。
            在本例中，`C(n, m) % 2` 和 `C(n, m) %