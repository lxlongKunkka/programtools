# NTT（模意义下的 FFT）

---

> **章节 ID：** `10-7-2`  
> **所属专题：** 专题 7 — 多项式算法  
> **所属等级：** Level 10 — GESP 十级 (NOI 竞赛提高)

## 教案内容

## 教学目标

### 知识目标
1.  理解并掌握NTT（Number Theoretic Transform）的核心思想，认识其与FFT的联系与区别。
2.  理解模意义下“原根”（Primitive Root）的概念及其在NTT中扮演的角色，知道如何选择合适的模数和原根。
3.  掌握NTT算法的实现细节，包括位翻转（Bit-Reversal Permutation）、蝴蝶操作（Butterfly Operation）以及逆NTT（Inverse NTT）。

### 能力目标
1.  能够独立编写并调试NTT算法，解决模意义下的多项式乘法问题。
2.  能够分析NTT算法的时间复杂度，并将其应用于解决更复杂的组合计数、字符串匹配等问题。
3.  培养将数学理论转化为计算机算法的抽象思维能力和问题解决能力。

### 素养目标
1.  体会数学之美，认识到数论与算法的巧妙结合如何解决实际计算问题。
2.  培养严谨的编程习惯和调试能力，尤其是在处理模运算和大数问题时。
3.  激发对高级算法和数学理论的探索兴趣，为未来学习更复杂的计算几何、密码学等领域打下基础。

===NEXT===

## 趣味引入

同学们，还记得我们之前学过的FFT（快速傅里叶变换）吗？它就像一个魔法棒，能把两个多项式乘法从慢悠悠的 $O(N^2)$ 瞬间加速到 $O(N \log N)$！这在处理大规模数据时，简直是神来之笔！

但是，FFT有一个小小的“脾气”：它依赖于复数运算。复数虽然强大，但在计算机里用浮点数表示时，会带来一个问题——精度误差。想象一下，你用计算器算 $1/3 \times 3$，结果可能是 $0.9999999999999999$ 而不是精确的 $1$。在很多竞赛题目中，我们需要的可是**精确的整数结果**，尤其是在模意义下！如果答案算出来是 $100.000000000001$ 模 $998244353$，那可就麻烦了！

那么，有没有一种“魔法”，既能拥有FFT的速度，又能保证整数运算的精确性，特别是在模意义下呢？

答案是：有！今天我们要学习的NTT（Number Theoretic Transform），就是这样一位“精确计算的超级英雄”！它在数论的世界里，找到了一群特殊的“数字”，它们拥有和复数单位根一样的神奇性质，可以帮助我们完美地完成模意义下的多项式乘法，而且**一个误差都没有！** 就像把FFT的“魔法”从浮点数世界搬到了整数的模运算世界，是不是很酷？

===NEXT===

## 深度知识点讲解

### 1. FFT 的“回忆杀”与 NTT 的“登场”

我们先快速回顾一下FFT的核心思想：
FFT之所以快，是因为它巧妙地利用了复数“单位根”的周期性和对称性。这些单位根 $\omega_N^k = e^{2\pi i k / N}$ 满足：
1.  周期性：$\omega_N^{k+N} = \omega_N^k$
2.  对称性：$\omega_N^{k+N/2} = -\omega_N^k$
3.  求和性质：$\sum_{j=0}^{N-1} (\omega_N^k)^j = 0$ (当 $k$ 不是 $N$ 的倍数时)

这些性质让FFT可以通过分治法，将大问题拆解成小问题，从而实现 $O(N \log N)$ 的复杂度。

但正如我们引入时所说，复数浮点运算的精度问题让人头疼。NTT的思路是：**我们能不能在模意义下，找到一些“数字”，它们也拥有和复数单位根类似的周期性、对称性和求和性质呢？**

答案是肯定的！这些“数字”就是——**原根（Primitive Root）的幂**。

### 2. 模意义下的“单位根”——原根

在模 $P$ 意义下，我们寻找一个整数 $g$，它被称为模 $P$ 的**原根**，如果 $g$ 的幂次 $g^1, g^2, \dots, g^{P-1}$ 在模 $P$ 意义下互不相同，并且遍历了 $1$ 到 $P-1$ 所有的数。
更重要的是，对于NTT，我们需要找到一个整数 $g$，使得 $g^0, g^1, \dots, g^{N-1}$ 在模 $P$ 意义下互不相同，其中 $N$ 是我们要处理的多项式长度（通常是 $2^k$）。并且，我们希望 $g^N \equiv 1 \pmod P$。

这听起来很像复数单位根 $\omega_N^k$ 的性质：$\omega_N^N = 1$。
如果 $g^N \equiv 1 \pmod P$，那么 $g$ 就相当于模 $P$ 意义下的 $N$ 次单位根。
并且，我们还需要 $N$ 是 $P-1$ 的一个因子。为什么呢？因为根据费马小定理，如果 $P$ 是素数，那么 $a^{P-1} \equiv 1 \pmod P$ (对于不被 $P$ 整除的 $a$)。所以，如果 $g^N \equiv 1 \pmod P$，那么 $N$ 必须是 $P-1$ 的一个因子，这样 $g$ 才能是 $P$ 的原根的 $ (P-1)/N $ 次幂，或者说 $g$ 是一个 $N$ 次单位根。

**关键性质：**
假设我们找到了模 $P$ 意义下的 $N$ 次原根 $g$ (即 $g^N \equiv 1 \pmod P$，且 $g^k \not\equiv 1 \pmod P$ 对于 $1 \le k < N$)。那么，它将拥有以下与复数单位根类似的性质：
1.  **周期性**：$g^{k+N} \equiv g^k \pmod P$。
2.  **对称性**：$g^{k+N/2} \equiv -g^k \pmod P$。 (这要求 $N$ 是偶数，且 $g^{N/2} \equiv -1 \pmod P$)
3.  **求和性质**：$\sum_{j=0}^{N-1} (g^k)^j \equiv 0 \pmod P$ (当 $k$ 不是 $N$ 的倍数时)。

有了这些性质，我们就可以把FFT的算法框架原封不动地搬到模意义下，用原根 $g$ 来替代复数单位根 $\omega_N$！

### 3. 选择合适的模数 $P$ 和原根 $g$

对于NTT来说，选择一个合适的模数 $P$ 至关重要。这个 $P$ 需要满足：
1.  $P$ 是一个**素数**。
2.  $P-1$ 包含足够多的因子 $2$。具体来说，如果我们的多项式长度最大需要 $N_{max}$，那么我们需要 $P-1$ 能被 $2^k$ 整除，其中 $2^k \ge N_{max}$。这样我们才能找到 $N$ 次单位根。
3.  $P$ 的大小要适中，通常在 $10^9$ 级别，这样 $P^2$ 才不会超过 `long long` 的范围。

一个最常用的模数是 **$P = 998244353$**。
*   它是一个素数。
*   $P-1 = 998244352 = 119 \times 2^{23}$。这意味着它可以支持最多 $2^{23}$ 长度的多项式，这对于大多数竞赛题目来说已经足够了。
*   它的原根是 $g=3$。

有了 $P$ 和 $g$，我们就可以定义模意义下的“单位根”了：
*   $N$ 次单位根 $g_N = g^{(P-1)/N} \pmod P$。
*   NTT 运算中使用的 $N$ 次单位根是 $g_N^k \pmod P$。
*   逆NTT 运算中使用的 $N$ 次单位根是 $g_N^{-k} \pmod P$ (即 $g_N^{N-k} \pmod P$)。

### 4. NTT 算法步骤

NTT的算法结构与FFT几乎完全一致，只是将复数运算替换为模运算。

1.  **多项式系数准备**：将多项式 $A(x)$ 和 $B(x)$ 的系数填充到 $N$ 长度（$N$ 是大于等于 $A(x)$ 和 $B(x)$ 乘积结果的最高次幂，且为 $2$ 的幂次）的数组中。不足的补 $0$。
2.  **位翻转（Bit-Reversal Permutation）**：将系数数组重新排列。这一步是为了在后续的蝴蝶操作中，让需要合并的元素在空间上相邻，从而实现原地计算。对于下标 $i$，将其二进制表示翻转后得到新的下标 $rev[i]$。
3.  **迭代蝴蝶操作**：
    *   外层循环控制当前合并的子问题的长度 `len`，从 $2$ 逐步翻倍到 $N$。
    *   内层循环遍历每个长度为 `len` 的块的起始位置 `i`。
    *   在每个块内部，计算当前层所需的“单位根” $w_len = g^{(P-1)/len} \pmod P$。
    *   再内层循环遍历块内元素，进行蝴蝶操作：
        *   `u = a[i + j]`
        *   `v = a[i + j + len/2] * w_k % P` (其中 `w_k` 是 $w_{len}^j$ 的当前幂次)
        *   `a[i + j] = (u + v) % P`
        *   `a[i + j + len/2] = (u - v + P) % P`
        *   这里需要注意 `(u - v + P) % P` 是为了保证结果为正。
4.  **逆NTT (Inverse NTT)**：
    *   将NTT的结果数组进行一次NTT操作，但这次使用的“单位根”是其**逆元**。
    *   即，如果NTT用的是 $g^{(P-1)/N}$，那么逆NTT就用 $g^{-(P-1)/N}$ (也就是 $g^{N - (P-1)/N}$) 作为基本单位根。
    *   最后，将所有结果除以 $N$ (即乘以 $N$ 在模 $P$ 意义下的逆元)。

### 5. 常见误区与注意点

*   **模运算的负数问题**：`a - b` 的结果可能是负数，在模运算中需要 `(a - b % P + P) % P` 来确保结果非负。
*   **中间结果溢出**：在进行 `u * v` 这样的乘法时，即使 `u` 和 `v` 都在模 $P$ 范围内，它们的乘积也可能超过 `int` 的范围。所以，涉及乘法的地方，一定要使用 `long long` 来存储中间结果，再对 $P$ 取模。
*   **模数和原根的选择**：务必使用合适的模数和其对应的原根。常用的 $998244353$ 和 $3$ 是一个安全的选择。
*   **N 的逆元**：逆NTT的最后一步是除以 $N$，这在模意义下是乘以 $N$ 的模逆元。可以使用费马小定理 `pow(N, P-2, P)` 来计算。

**时间复杂度**：NTT 和 FFT 一样，时间复杂度为 $O(N \log N)$，其中 $N$ 是 $2$ 的幂次，且大于等于多项式乘积的最高次。

===NEXT===

## 典型例题精讲

**例题：多项式乘法**

给定两个多项式 $A(x)$ 和 $B(x)$，它们的系数在模 $P$ 意义下给出。请计算 $C(x) = A(x) \cdot B(x)$ 的系数，结果也模 $P$ 输出。

$A(x) = a_0 + a_1x + \dots + a_nx^n$
$B(x) = b_0 + b_1x + \dots + b_mx^m$

**输入示例：**
$n=1, m=1$
$A = [1, 2]$ (表示 $1 + 2x$)
$B = [3, 4]$ (表示 $3 + 4x$)
$P = 998244353$

**输出示例：**
$C = [3, 10, 8]$ (表示 $3 + 10x + 8x^2$)

**思路分析：**

1.  **确定 $N$**: 两个多项式 $A(x)$ 和 $B(x)$ 的最高次分别为 $n$ 和 $m$。它们的乘积 $C(x)$ 的最高次为 $n+m$。因此，我们需要一个长度 $N$ 满足 $N \ge n+m+1$，且 $N$ 是 $2$ 的幂次。
    例如，如果 $n=1, m=1$，则 $n+m+1 = 3$。我们需要取 $N=4$。
2.  **系数填充**: 将 $A$ 的系数填入数组 `a`，将 $B$ 的系数填入数组 `b`。不足 $N$ 长度的部分用 $0$ 填充。
3.  **正向 NTT**: 对数组 `a` 和 `b` 分别进行NTT操作。这会将多项式从系数表示转换为点值表示。
    设NTT后的结果分别为 `A'(k)` 和 `B'(k)`。
4.  **点值相乘**: 在点值表示下，多项式乘法就是对应点值相乘。
    `C'(k) = A'(k) * B'(k) % P`。
5.  **逆向 NTT**: 对 `C'` 进行逆NTT操作，将其从点值表示转换回系数表示。
    别忘了最后要乘以 $N$ 的模逆元。
6.  **输出结果**: 逆NTT得到的数组的前 $n+m+1$ 个元素就是 $C(x)$ 的系数。

**代码实现：**

```cpp
#include <bits/stdc++.h>

// 定义模数 P 和原根 G
const int P = 998244353; // 常用模数，P-1 = 119 * 2^23
const int G = 3;         // P 的原根

// 快速幂函数：计算 base^exp % P
long long power(long long base, long long exp) {
    long long res = 1;
    base %= P;
    while (exp > 0) {
        if (exp % 2 == 1) {
            res = (res * base) % P;
        }
        base = (base * base) % P;
        exp /= 2;
    }
    return res;
}

// 模逆元函数：计算 num 的模 P 逆元
long long inv(long long num) {
    return power(num, P - 2); // 根据费马小定理
}

// NTT 函数
// a: 多项式系数数组
// n: 数组长度 (必须是2的幂)
// opt: 1 表示正向NTT，-1 表示逆向NTT
void ntt(std::vector<long long>& a, int n, int opt) {
    // 1. 位翻转 (Bit-Reversal Permutation)
    std::vector<int> rev(n);
    for (int i = 0; i < n; ++i) {
        rev[i] = (rev[i >> 1] >> 1) | ((i & 1) ? (n >> 1) : 0);
        if (i < rev[i]) { // 避免重复交换
            std::swap(a[i], a[rev[i]]);
        }
    }

    // 2. 迭代蝴蝶操作
    for (int len = 2; len <= n; len <<= 1) { // len 是当前合并的子问题长度
        // w_len 是当前层的基本单位根
        long long w_len = power(G, (P - 1) / len);
        if (opt == -1) { // 逆NTT使用单位根的逆元
            w_len = inv(w_len);
        }

        for (int i = 0; i < n; i += len) { // 遍历每个长度为 len 的块
            long long w_k = 1; // w_k 是当前块内使用的单位根的幂次
            for (int j = 0; j < len / 2; ++j) { // 遍历块内上半部分元素
                long long u = a[i + j];
                long long v = (a[i + j + len / 2] * w_k) % P;
                
                a[i + j] = (u + v) % P;
                a[i + j + len / 2] = (u - v + P) % P; // 保证结果非负
                
                w_k = (w_k * w_len) % P;
            }
        }
    }

    // 3. 逆NTT的最后一步：除以 N
    if (opt == -1) {
        long long inv_n = inv(n);
        for (int i = 0; i < n; ++i) {
            a[i] = (a[i] * inv_n) % P;
        }
    }
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n_a, n_b; // 多项式 A, B 的最高次幂
    std::cin >> n_a >> n_b;

    std::vector<long long> a(n_a + 1);
    std::vector<long long> b(n_b + 1);

    for (int i = 0; i <= n_a; ++i) {
        std::cin >> a[i];
    }
    for (int i = 0; i <= n_b; ++i) {
        std::cin >> b[i];
    }

    // 确定 NTT 的长度 N (2的幂次，且 >= n_a + n_b + 1)
    int n = 1;
    while (n <= n_a + n_b) {
        n <<= 1;
    }

    // 调整向量大小并填充0
    a.resize(n, 0);
    b.resize(n, 0);

    // 进行正向 NTT
    ntt(a, n, 1);
    ntt(b, n, 1);

    // 点值相乘
    std::vector<long long> c(n);
    for (int i = 0; i < n; ++i) {
        c[i] = (a[i] * b[i]) % P;
    }

    // 进行逆向 NTT
    ntt(c, n, -1);

    // 输出结果 (最高次为 n_a + n_b)
    for (int i = 0; i <= n_a + n_b; ++i) {
        std::cout << c[i] << (i == n_a + n_b ? "" : " ");
    }
    std::cout << std::endl;

    return 0;
}
```

**复杂度分析：**

*   **时间复杂度**：
    *   `power` 和 `inv` 函数：$O(\log P)$。
    *   `ntt` 函数：位翻转 $O(N)$，迭代蝴蝶操作 $O(N \log N)$。
    *   主函数中的两次NTT，一次点值乘法，一次逆NTT：总共 $O(N \log N)$。
    *   因此，总时间复杂度为 $O(N \log N)$。
*   **空间复杂度**：$O(N)$，用于存储多项式系数和中间结果。

其中 $N$ 是NTT的长度，是大于等于 $n+m+1$ 的最小 $2$ 的幂次。

---
**例题 2: 快速计算 $A(x)^K \pmod P$**

给定一个多项式 $A(x)$ 和一个整数 $K$，计算 $A(x)^K \pmod P$ 的系数。

**思路分析：**
这本质上是多项式快速幂。我们可以借鉴整数快速幂的思路：
$A(x)^K = A(x) \cdot A(x) \cdot \dots \cdot A(x)$ (K次)
如果 $K$ 是偶数， $A(x)^K = (A(x)^{K/2})^2$
如果 $K$ 是奇数， $A(x)^K = A(x) \cdot (A(x)^{(K-1)/2})^2$

每次多项式乘法都可以用NTT在 $O(N \log N)$ 时间内完成。
整个过程需要 $O(\log K)$ 次多项式乘法。
因此，总时间复杂度为 $O(N \log N \log K)$。

**代码实现（仅核心逻辑，基于例题1的NTT模板）：**

```cpp
// 假设已包含例题1的NTT模板及相关函数
// P, G, power, inv, ntt 函数已定义

std::vector<long long> poly_multiply(std::vector<long long> a, std::vector<long long> b, int n_a, int n_b) {
    int max_degree = n_a + n_b;
    int n = 1;
    while (n <= max_degree) {
        n <<= 1;
    }

    a.resize(n, 0);
    b.resize(n, 0);

    ntt(a, n, 1);
    ntt(b, n, 1);

    std::vector<long long> c(n);
    for (int i = 0; i < n; ++i) {
        c[i] = (a[i] * b[i]) % P;
    }

    ntt(c, n, -1);
    c.resize(max_degree + 1); // 截取有效系数

    return c;
}

std::vector<long long> poly_power(std::vector<long long> base_poly, int k, int max_n) {
    // max_n 是最终多项式的最大可能长度
    // 假设 base_poly 初始长度为 n_0
    // 结果多项式长度可能为 n_0 * k
    // 但通常题目会限制结果多项式的最高次，或者我们只关心前 max_n 项
    
    // 这里我们假设 max_n 是最终多项式的最高次+1，用来控制NTT的N
    // 或者说，我们只关心结果的前 max_n 项

    int current_degree = base_poly.size() - 1;

    std::vector<long long> res_poly;
    res_poly.push_back(1); // 结果多项式初始化为 1 (常数多项式)
    int res_degree = 0;

    while (k > 0) {
        if (k % 2 == 1) {
            res_poly = poly_multiply(res_poly, base_poly, res_degree, current_degree);
            res_degree = std::min((int)res_poly.size() - 1, max_n -1); // 更新结果多项式的最高次
            // 确保 res_poly 不会变得太长，可以根据题目要求截断
            if (res_poly.size() > max_n) res_poly.resize(max_n);
        }
        base_poly = poly_multiply(base_poly, base_poly, current_degree, current_degree);
        current_degree = std::min((int)base_poly.size() - 1, max_n - 1); // 更新 base_poly 的最高次
        // 确保 base_poly 不会变得太长
        if (base_poly.size() > max_n) base_poly.resize(max_n);
        
        k /= 2;
    }
    return res_poly;
}

int main() {
    // ... (输入 n_a, k, base_poly 的系数)
    // std::vector<long long> a_coeffs(n_a + 1);
    // for (int i = 0; i <= n_a; ++i) std::cin >> a_coeffs[i];
    // int K; std::cin >> K;

    // 假设我们只关心结果的前 max_degree_result + 1 项
    // 通常 max_degree_result = n_a * K，但题目可能有限制
    // 这里为了演示，我们假设 max_degree_result 是一个预设值，或者取 n_a * K
    int max_degree_result = n_a * K; // 最坏情况
    if (max_degree_result == 0) { // 特殊处理常数多项式
        std::cout << power(a_coeffs[0], K) << std::endl;
        return 0;
    }

    std::vector<long long> result = poly_power(a_coeffs, K, max_degree_result + 1);

    for (int i = 0; i < result.size(); ++i) {
        std::cout << result[i] << (i == result.size() - 1 ? "" : " ");
    }
    std::cout << std::endl;

    return 0;
}
```

**注意**：在实际应用中，`poly_power` 函数可能需要根据题目对最终多项式长度的限制进行更精确的控制。例如，如果题目只要求前 $M$ 项，那么每次乘法后的多项式长度都应该截断到 $M$。这里为了简化，采取了 `std::min` 和 `resize` 的方式。

===NEXT===

## 代码实现模板

```cpp
#include <bits/stdc++.h> // 包含所有常用头文件

// ======================= 常量定义 =======================
const int MOD = 998244353; // 模数，是一个质数，且 MOD-1 包含很多 2 的因子
const int G = 3;           // MOD 的一个原根，用于NTT，其逆元为 G_INV

// ======================= 辅助函数 =======================

// 快速幂：计算 base^exp % MOD
// 参数：
//   base - 底数
//   exp  - 指数
// 返回：base^exp % MOD 的结果
long long power(long long base, long long exp) {
    long long res = 1;
    base %= MOD; // 确保底数在模数范围内
    while (exp > 0) {
        if (exp % 2 == 1) { // 如果指数是奇数
            res = (res * base) % MOD;
        }
        base = (base * base) % MOD; // 底数平方
        exp /= 2;                   // 指数减半
    }
    return res;
}

// 模逆元：计算 num 的模 MOD 逆元
// 参数：
//   num - 需要求逆元的数
// 返回：num 在模 MOD 意义下的逆元
// 原理：根据费马小定理，a^(MOD-2) % MOD 是 a 的逆元（当 MOD 是素数且 a % MOD != 0 时）
long long inv(long long num) {
    return power(num, MOD - 2);
}

// ======================= NTT 核心函数 =======================

// Number Theoretic Transform (数论变换)
// 参数：
//   a   - std::vector<long long> 类型的多项式系数数组，会原地修改
//   n   - 数组的长度，必须是 2 的幂次 (例如 2, 4, 8, ...)
//   opt - 1 表示正向 NTT (DFT)，-1 表示逆向 NTT (IDFT)
void ntt(std::vector<long long>& a, int n, int opt) {
    // 1. 位翻转 (Bit-Reversal Permutation)
    // 重新排列数组元素，使得后续蝴蝶操作时，需要合并的元素在内存中相邻
    std::vector<int> rev(n); // rev[i] 存储 i 翻转后的位序
    for (int i = 0; i < n; ++i) {
        // rev[i] 的计算：rev[i/2] 右移一位，然后根据 i 的最低位判断是加 n/2 还是 0
        rev[i] = (rev[i >> 1] >> 1) | ((i & 1) ? (n >> 1) : 0);
        if (i < rev[i]) { // 避免重复交换，只在 i < rev[i] 时交换一次
            std::swap(a[i], a[rev[i]]);
        }
    }

    // 2. 迭代蝴蝶操作 (Iterative Butterfly Operation)
    // len 从 2 开始，每次翻倍，直到 n
    // len 代表当前合并的子问题（块）的长度
    for (int len = 2; len <= n; len <<= 1) {
        // w_len 是当前层（长度为 len 的块）的基本单位根
        // 对于正向NTT，它是 G^((MOD-1)/len)
        // 对于逆向NTT，它是 G^((MOD-1)/len) 的逆元
        long long w_len = power(G, (MOD - 1) / len);
        if (opt == -1) { // 如果是逆向NTT，使用单位根的逆元
            w_len = inv(w_len);
        }

        // 遍历所有长度为 len 的块
        for (int i = 0; i < n; i += len) {
            long long w_k = 1; // w_k 是当前块内使用的单位根的幂次 (w_len^0, w_len^1, ...)
            // 遍历当前块的上半部分，进行蝴蝶操作
            for (int j = 0; j < len / 2; ++j) {
                // u 和 v 是蝴蝶操作的两个输入
                long long u = a[i + j];
                // a[i + j + len / 2] 是块的下半部分元素
                // v 需要乘以 w_k，并且在乘法后取模，使用 long long 防止溢出
                long long v = (a[i + j + len / 2] * w_k) % MOD;
                
                // 蝴蝶操作的两个输出
                a[i + j] = (u + v) % MOD;
                // (u - v + MOD) % MOD 确保结果为正，因为 u - v 可能为负
                a[i + j + len / 2] = (u - v + MOD) % MOD;
                
                // 更新 w_k 为下一个幂次
                w_k = (w_k * w_len) % MOD;
            }
        }
    }

    // 3. 逆NTT的最后一步：除以 N (即乘以 N 的模逆元)
    if (opt == -1) {
        long long inv_n = inv(n); // 计算 N 的模逆元
        for (int i = 0; i < n; ++i) {
            a[i] = (a[i] * inv_n) % MOD;
        }
    }
}

// ======================= 主函数示例 (多项式乘法) =======================
int main() {
    // 优化输入输出速度
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n_a, n_b; // 多项式 A 和 B 的最高次幂
    std::cin >> n_a >> n_b;

    std::vector<long long> a(n_a + 1);
    std::vector<long long> b(n_b + 1);

    for (int i = 0; i <= n_a; ++i) {
        std::cin >> a[i];
    }
    for (int i = 0; i <= n_b; ++i) {
        std::cin >> b[i];
    }

    // 确定 NTT 的长度 N
    // N 必须是 2 的幂次，且 N >= (n_a + n_b + 1)
    // n_a + n_b 是乘积多项式的最高次幂，加 1 是因为系数从 0 开始
    int n = 1;
    while (n <= n_a + n_b) {
        n <<= 1;
    }

    // 调整向量大小，不足 N 的部分用 0 填充
    a.resize(n, 0);
    b.resize(n, 0);

    // 进行正向 NTT
    ntt(a, n, 1);
    ntt(b, n, 1);

    // 点值相乘
    // c[i] = a[i] * b[i] % MOD
    std::vector<long long> c(n);
    for (int i = 0; i < n; ++i) {
        c[i] = (a[i] * b[i]) % MOD;
    }

    // 进行逆向 NTT，将点值表示转换回系数表示
    ntt(c, n, -1);

    // 输出结果 (乘积多项式的最高次为 n_a + n_b)
    for (int i = 0; i <= n_a + n_b; ++i) {
        std::cout << c[i] << (i == n_a + n_b ? "" : " ");
    }
    std::cout << std::endl;

    return 0;
}
```

===NEXT===

## 课堂互动

1.  **思考题**：为什么NTT需要模数 $P$ 必须是素数？如果 $P$ 不是素数，会有什么问题？
    *   **提示**：想想费马小定理和模逆元的计算。如果 $P$ 不是素数，可能很多数就没有模逆元了，NTT的求和性质也可能失效。
2.  **讨论环节**：
    *   除了 $998244353$ 和 $3$ 这对经典的模数与原根组合，你还能找到其他的吗？例如，如果题目要求模数是 $10^9+7$，那我们能直接用NTT吗？如果不能，有什么办法可以解决？
    *   **提示**：$10^9+7$ 是素数，但 $10^9+6 = 2 \times 3 \times \dots$ 它的 $2$ 因子不够多。这时可能需要**三模NTT**（使用三个不同的NTT模数，然后用中国剩余定理CRT合并结果）。
3.  **即时练习**：
    *   如果多项式 $A(x) = 1 + x$ ($n_a=1$) 和 $B(x) = 1 + x$ ($n_b=1$)，模数 $P=5$，原根 $G=2$ (因为 $5-1=4$, $2^1=2, 2^2=4, 2^3=3, 2^4=1 \pmod 5$)。
    *   请你手动模拟一下 $N=4$ 时的位翻转操作。
    *   (进一步，如果时间允许) 在纸上模拟 $A(x)$ 的NTT (长度 $N=4$) 的第一层蝴蝶操作。
4.  **小组任务**：
    *   给定一个多项式 $A(x) = 1 + 2x + 3x^2$ 和 $B(x) = 4 + 5x$。
    *   请小组讨论并确定：NTT的长度 $N$ 应该取多少？
    *   如果模数是 $P=998244353$，原根 $G=3$，那么在 `len=2` 的第一层蝴蝶操作中，`w_len` 会是多少？在 `len=4` 时呢？
5.  **纠错挑战**：
    *   在我的NTT模板中，如果我把 `long long v = (a[i + j + len / 2] * w_k) % MOD;` 这一行中的 `long long` 去掉，会发生什么？为什么？

===NEXT===

## 分层练习题目

### 基础巩固

1.  **多项式乘法**
    给定两个多项式 $A(x) = 1 + x + x^2$ 和 $B(x) = 2 + 3x$。
    请使用NTT计算 $C(x) = A(x) \cdot B(x)$ 的系数，结果模 $998244353$。
    **输入：**
    $n=2, m=1$
    $A: 1 \ 1 \ 1$
    $B: 2 \ 3$
    **输出：**
    $2 \ 5 \ 5 \ 3$

2.  **序列卷积**
    给定两个长度为 $N$ 的序列 $A = [a_0, \dots, a_{N-1}]$ 和 $B = [b_0, \dots, b_{N-1}]$。
    计算它们的卷积 $C = [c_0, \dots, c_{2N-2}]$，其中 $c_k = \sum_{i=0}^k a_i b_{k-i}$ (注意 $i \le N-1, k-i \le N-1$)。结果模 $998244353$。
    **输入：**
    $N=3$
    $A: 1 \ 2 \ 3$
    $B: 4 \ 5 \ 6$
    **输出：**
    $4 \ 13 \ 28 \ 27 \ 18$

### 能力提升

1.  **多项式求逆**
    给定一个多项式 $A(x)$，求其模 $x^N$ 意义下的逆元 $B(x)$，即 $A(x) \cdot B(x) \equiv 1 \pmod{x^N}$。
    （提示：可以使用倍增法，每次求得 $A(x) \cdot B(x) \equiv 1 \pmod{x^k}$，然后利用NTT加速多项式乘法。）
    **输入：**
    $N=4$ (表示求模 $x^4$ 意义下的逆元)
    $A: 1 \ 1 \ 1 \ 1$ (表示 $1+x+x^2+x^3$)
    **输出：**
    $1 \ 998244352 \ 1 \ 998244352$ (即 $1 - 1x + 1x^2 - 1x^3$)

2.  **组合计数问题**
    有一种排列问题，需要计算 $n$ 个不同物品分成 $k$ 组的方案数，其中每组至少有一个物品。这可以使用**斯特林数** $S(n, k)$ 来表示。
    $x^{\underline{n}} = \sum_{k=0}^n S(n,k) x^k$，其中 $x^{\underline{n}} = x(x-1)\dots(x-n+1)$ 是下降幂。
    给定 $n$，要求计算 $S(n, k)$ 对所有 $k \in [0, n]$ 的值。
    （提示：可以将下降幂展开成普通多项式，然后结合NTT进行计算。）
    **输入：**
    $n=3$
    **输出：**
    $k=0: 0$
    $k=1: 1$
    $k=2: 3$
    $k=3: 1$
    (即 $x^3 - 3x^2 + 2x = 1 \cdot x(x-1)(x-2) = 1 \cdot x^{\underline{3}}$)

### 拓展挑战

1.  **多项式指数函数**
    给定一个多项式 $A(x)$ 且 $A(0)=0$，求 $e^{A(x)} \pmod{x^N}$。
    （提示：使用 $e^{A(x)} = \sum_{k=0}^\infty \frac{A(x)^k}{k!}$，并结合多项式牛顿迭代法，需要多项式求导和积分，以及多项式求逆和NTT。）
    **输入：**
    $N=3$
    $A: 0 \ 1 \ 0$ (表示 $A(x)=x$)
    **输出：**
    $1 \ 1 \ 998244353/2+1$ (即 $1 + x + \frac{x^2}{2} \pmod{998244353}$)

---
### 练习题目答案

#### 基础巩固答案

1.  **多项式乘法**
    $A(x) = 1 + x + x^2$
    $B(x) = 2 + 3x$
    $C(x) = (1+x+x^2)(2+3x) = 2 + 3x + 2x + 3x^2 + 2x^2 + 3x^3 = 2 + 5x + 5x^2 + 3x^3$
    **输出：** `2 5 5 3`

2.  **序列卷积**
    $A = [1, 2, 3]$
    $B = [4, 5, 6]$
    $c_0 = a_0 b_0 = 1 \cdot 4 = 4$
    $c_1 = a_0 b_1 + a_1 b_0 = 1 \cdot 5 + 2 \cdot 4 = 5 + 8 = 13$
    $c_2 = a_0 b_2 + a_1 b_1 + a_2 b_0 = 1 \cdot 6 + 2 \cdot 5 + 3 \cdot 4 = 6 + 10 + 12 = 28$
    $c_3 = a_1 b_2 + a_2 b_1 = 2 \cdot 6 + 3 \cdot 5 = 12 + 15 = 27$
    $c_4 = a_2 b_2 = 3 \cdot 6 = 18$
    **输出：** `4 13 28 27 18`

#### 能力提升答案

1.  **多项式求逆**
    $A(x) = 1+x+x^2+x^3 \pmod{x^4}$
    其逆元 $B(x) = 1 - x + x^2 - x^3 \pmod{x^4}$
    （在模 $998244353$ 下，$(-1)$ 等价于 $998244352$）
    **输出：** `1 998244352 1 998244352`

2.  **组合计数问题 (斯特林数)**
    $n=3$
    $x^{\underline{3}} = x(x-1)(x-2) = x(x^2-3x+2) = x^3 - 3x^2 + 2x$
    比较 $x^{\underline{n}} = \