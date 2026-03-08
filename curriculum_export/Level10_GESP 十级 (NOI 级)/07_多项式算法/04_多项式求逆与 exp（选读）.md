# 多项式求逆与 exp（选读）

## 教学目标

亲爱的小伙伴们，今天我们要一起探索多项式世界的两个超级魔法：**多项式求逆**和**多项式指数函数 (exp)**！它们是高级算法中解决复杂问题的秘密武器！

### 知识目标
1.  **理解多项式求逆的定义**：知道给定多项式 $A(x)$，如何找到另一个多项式 $B(x)$ 使得 $A(x)B(x) \equiv 1 \pmod{x^n}$。
2.  **掌握牛顿迭代法的核心思想**：理解如何通过“倍增精度”的方法，从低次模意义下的解推导出高次模意义下的解。
3.  **理解多项式指数函数 (exp) 的定义**：知道给定多项式 $A(x)$，如何找到另一个多项式 $B(x)$ 使得 $B(x) \equiv e^{A(x)} \pmod{x^n}$。
4.  **了解多项式对数函数 (ln) 的计算方法**：理解它是实现多项式 exp 的前置知识。

### 能力目标
1.  **能够实现多项式求逆算法**：使用牛顿迭代法结合快速傅里叶变换（NTT）高效计算多项式逆。
2.  **能够实现多项式对数函数算法**：结合多项式求导、求逆和积分操作。
3.  **能够实现多项式指数函数 (exp) 算法**：使用牛顿迭代法结合多项式对数函数高效计算多项式 exp。
4.  **熟练运用NTT进行多项式乘法**：这是所有高级多项式算法的基础。

### 素养目标
1.  **培养严谨的数学思维**：在理解和推导复杂算法时，注重逻辑性和准确性。
2.  **提升抽象问题解决能力**：将数学定义转化为可编程的算法步骤。
3.  **激发对高级算法的兴趣**：感受多项式算法在组合计数、生成函数等领域的强大威力。
4.  **学会模块化编程思想**：将NTT、求逆、求对数、求指数等功能封装成独立的函数，提高代码复用性。

===NEXT===

## 趣味引入

同学们，你们玩过“密码锁”吗？比如一个三位密码锁，密码是 `123`。如果你输入 `321`，它就打不开。但是，如果你输入 `123`，它就“逆转”了锁住的状态，让门打开！这就像数字的“逆”：对于数字 2，它的逆是 1/2，因为 2 * (1/2) = 1。

现在，我们把这个想法搬到多项式世界里！想象我们有一个“多项式密码锁” $A(x)$，它是一个多项式，比如 $A(x) = 1 + x$。我们要找一个“多项式钥匙” $B(x)$，使得 $A(x) \cdot B(x)$ 乘起来能变成一个特殊的“解锁信号” $1$！是不是很酷？这个 $B(x)$ 就是 $A(x)$ 的**多项式逆**！

再来一个魔法！你们知道 $e^x$ 这个神奇的函数吗？它在数学和科学中无处不在，代表着“指数级增长”。比如，细胞分裂、银行存款利息增长，都可能和它有关。现在，我们把这个 $e^x$ 的概念也搬到多项式世界里！如果我们有一个多项式 $A(x)$，我们想计算 $e^{A(x)}$，也就是把 $A(x)$ 作为指数，这又会得到一个新的多项式！这个就是**多项式指数函数 (exp)**！

听起来是不是很玄乎？别担心，今天我们就来揭秘这些多项式魔法背后的原理和实现方法！准备好了吗？让我们一起进入多项式魔法学院的深层探险吧！

===NEXT===

## 深度知识点讲解

在深入学习多项式求逆和 exp 之前，我们先快速回顾一下基础：**多项式乘法**和**模运算**。多项式乘法我们通常使用**快速傅里叶变换 (FFT)** 或其在模意义下的变体 **数论变换 (NTT)** 来实现，时间复杂度为 $O(N \log N)$。所有的多项式运算都将在一个模数 $P$ 下进行，并且系数都是在模 $P$ 意义下的整数。

### 1. 多项式求逆 (Polynomial Inverse)

#### 概念本质
给定一个 $N-1$ 次多项式 $A(x) = \sum_{i=0}^{N-1} a_i x^i$，我们想找到一个多项式 $B(x)$，使得 $A(x)B(x) \equiv 1 \pmod{x^N}$。这里的 $\pmod{x^N}$ 意思是只关心结果的前 $N$ 项（即 $x^0$ 到 $x^{N-1}$ 的系数），所有 $x^N$ 及更高次的项都当作 0。

**生活类比**：
想象你有一个魔术盒子，输入一个多项式 $A(x)$，它能吐出另一个多项式 $B(x)$。这两个多项式相乘后，会把所有 $x^N$ 及更高次的“杂质”都清除掉，只留下一个纯净的“1”！这个 $B(x)$ 就是 $A(x)$ 的“净化器”或“逆转器”。

**关键条件**：
为了使 $A(x)$ 的逆 $B(x)$ 存在，**$A(x)$ 的常数项 $A(0)$ 必须不为 $0$**。因为 $A(x)B(x) \equiv 1 \pmod{x^N}$ 意味着 $A(0)B(0) \equiv 1 \pmod P$。如果 $A(0)=0$，那么 $A(0)B(0)$ 永远是 $0$，不可能等于 $1$。所以 $A(0)$ 必须在模 $P$ 意义下有乘法逆元。

#### 怎么想到的？—— 牛顿迭代法 (Newton's Method)

牛顿迭代法是一种非常强大的数值方法，用于寻找方程的根。在多项式算法中，它被巧妙地用来“倍增精度”。

假设我们已经找到了 $A(x)$ 在 $\pmod{x^k}$ 意义下的逆 $B_k(x)$，即 $A(x)B_k(x) \equiv 1 \pmod{x^k}$。我们的目标是找到 $A(x)$ 在 $\pmod{x^{2k}}$ 意义下的逆 $B_{2k}(x)$。

1.  **初始状态**：
    当 $k=1$ 时，我们要求 $A(x)B_1(x) \equiv 1 \pmod{x^1}$。这意味着 $A(0)B_1(0) \equiv 1 \pmod P$。所以 $B_1(0)$ 就是 $A(0)$ 在模 $P$ 意义下的逆元。这是一个非常简单的基准情况。

2.  **迭代推导**：
    我们知道 $A(x)B_k(x) \equiv 1 \pmod{x^k}$。
    我们想找到 $B_{2k}(x)$ 使得 $A(x)B_{2k}(x) \equiv 1 \pmod{x^{2k}}$。
    由于 $B_{2k}(x)$ 是更精确的解，它在 $\pmod{x^k}$ 意义下也应该是 $B_k(x)$。
    所以我们可以写成 $B_{2k}(x) \equiv B_k(x) + \Delta(x) \pmod{x^{2k}}$，其中 $\Delta(x)$ 是一个高次多项式，其最低次项是 $x^k$。
    
    考虑函数 $F(Y) = \frac{1}{A(x)} - Y$。我们要找 $Y$ 使得 $F(Y)=0$。
    根据牛顿迭代公式（这里是多项式版本，可以理解为泰勒展开的一阶近似）：
    $Y_{new} \equiv Y_{old} - \frac{F(Y_{old})}{F'(Y_{old})} \pmod{x^{2k}}$
    这里 $F(Y) = 1 - A(x)Y$ (为了方便，我们把目标函数变为 $1 - A(x)Y = 0$)。
    那么 $F'(Y) = -A(x)$ (对 $Y$ 求导)。
    
    所以 $B_{2k}(x) \equiv B_k(x) - \frac{1 - A(x)B_k(x)}{-A(x)} \pmod{x^{2k}}$
    $B_{2k}(x) \equiv B_k(x) + \frac{1 - A(x)B_k(x)}{A(x)} \pmod{x^{2k}}$
    $B_{2k}(x) \equiv B_k(x) + \frac{1}{A(x)} - B_k(x) \pmod{x^{2k}}$
    $B_{2k}(x) \equiv \frac{1}{A(x)} \pmod{x^{2k}}$
    
    这个推导有点绕，我们换一种更直观的推导方式：
    我们知道 $A(x)B_k(x) \equiv 1 \pmod{x^k}$，这意味着 $A(x)B_k(x) = 1 + C(x)x^k$ 对于某个多项式 $C(x)$ 成立。
    我们希望 $A(x)B_{2k}(x) \equiv 1 \pmod{x^{2k}}$。
    
    我们有 $A(x)B_k(x) - 1 \equiv 0 \pmod{x^k}$。
    将这个式子平方：$(A(x)B_k(x) - 1)^2 \equiv 0 \pmod{x^{2k}}$ (因为平方后最低次项是 $x^{2k}$)
    展开：$A(x)^2 B_k(x)^2 - 2A(x)B_k(x) + 1 \equiv 0 \pmod{x^{2k}}$
    移项：$1 \equiv 2A(x)B_k(x) - A(x)^2 B_k(x)^2 \pmod{x^{2k}}$
    提取 $A(x)$：$1 \equiv A(x) \cdot (2B_k(x) - A(x)B_k(x)^2) \pmod{x^{2k}}$
    
    所以，我们就得到了 $B_{2k}(x)$ 的迭代公式：
    $B_{2k}(x) \equiv B_k(x) \left(2 - A(x)B_k(x)\right) \pmod{x^{2k}}$
    
    **哇！这个公式看起来好简洁！**
    
    **理解这个公式**：
    *   $A(x)B_k(x)$ 在 $\pmod{x^k}$ 意义下是 $1$。
    *   如果 $A(x)B_k(x)$ 很接近 $1$，那么 $2 - A(x)B_k(x)$ 也会很接近 $1$。
    *   $B_k(x) \cdot (\text{一个接近 }1\text{ 的数})$ 仍然是 $B_k(x)$ 的一个改进。
    *   关键是，这个改进能将精度从 $k$ 提升到 $2k$。
    
    **计算步骤**：
    1.  计算 $P_1(x) = A(x) \cdot B_k(x) \pmod{x^{2k}}$。这需要一次 NTT 乘法。
    2.  计算 $P_2(x) = 2 - P_1(x) \pmod{x^{2k}}$。
    3.  计算 $B_{2k}(x) = B_k(x) \cdot P_2(x) \pmod{x^{2k}}$。这又需要一次 NTT 乘法。
    
    **时间复杂度**：
    假设我们要求 $N$ 次的多项式逆。
    从 $\pmod{x^1}$ 到 $\pmod{x^2}$ 到 $\pmod{x^4}$ ... 直到 $\pmod{x^N}$。
    每次迭代，我们都需要做两次模 $x^{2k}$ 的多项式乘法。
    $T(N) = T(N/2) + O(N \log N)$
    根据主定理，这个递归关系解为 $T(N) = O(N \log N)$。非常高效！

### 2. 多项式指数函数 (Polynomial Exp)

#### 概念本质
给定一个 $N-1$ 次多项式 $A(x) = \sum_{i=0}^{N-1} a_i x^i$，我们想找到一个多项式 $B(x)$，使得 $B(x) \equiv e^{A(x)} \pmod{x^N}$。

**生活类比**：
想象你有一个魔法生长药水 $A(x)$。你把它撒在一个特殊的“多项式种子”上，它就会按照 $e^{A(x)}$ 的规则疯狂生长，最终变成一个新的多项式 $B(x)$！这个 $e^{A(x)}$ 就像是多项式世界的“万物生长公式”。

**关键条件**：
为了使 $e^{A(x)}$ 能够被计算，通常我们要求 $A(x)$ 的常数项 $A(0)$ 必须为 $0$。
为什么？因为 $B(0) = e^{A(0)}$。如果 $A(0)=0$，那么 $B(0) = e^0 = 1$。
如果 $A(0) \ne 0$，那么 $e^{A(0)}$ 会是一个常数 $C \ne 1$。我们可以先计算 $e^{A(x)-A(0)}$ (它的常数项是0)，然后再把结果乘以 $C$ 即可。为了简化，我们通常假设 $A(0)=0$。

#### 怎么想到的？—— 再次使用牛顿迭代法！

计算多项式 Exp 比求逆更复杂，它需要一个前置技能：**多项式对数函数 (Polynomial Logarithm)**。

##### 前置技能：多项式对数函数 (Polynomial Logarithm)
给定 $A(x)$，找到 $B(x)$ 使得 $B(x) \equiv \ln(A(x)) \pmod{x^N}$。
**条件**：$A(0)$ 必须为 $1$。因为 $\ln(A(0))$ 必须有意义，且 $\ln(1)=0$。
**推导**：
我们知道对于函数 $f(x)$， $(\ln f(x))' = \frac{f'(x)}{f(x)}$。
所以，对于多项式 $B(x) = \ln(A(x))$，我们有 $B'(x) \equiv A'(x) \cdot A(x)^{-1} \pmod{x^{N-1}}$。
我们可以先计算 $A(x)$ 的导数 $A'(x)$，再计算 $A(x)$ 的逆 $A(x)^{-1}$，然后将它们相乘，得到 $B'(x)$。
最后，对 $B'(x)$ 进行积分，就可以得到 $B(x)$ 了！
**注意**：积分时，常数项 $b_0$ 是 $\ln(A(0))$。由于我们要求 $A(0)=1$，所以 $b_0 = \ln(1)=0$。

**具体步骤**：
1.  计算 $A'(x)$ (多项式求导)。
2.  计算 $A(x)^{-1} \pmod{x^N}$ (多项式求逆)。
3.  将 $A'(x)$ 和 $A(x)^{-1}$ 相乘，得到 $P(x) = A'(x)A(x)^{-1} \pmod{x^N}$。
4.  对 $P(x)$ 进行积分，得到 $\ln(A(x))$。积分时，常数项为 $0$。
    例如，如果 $P(x) = \sum_{i=0}^{N-1} p_i x^i$，那么 $\int P(x) dx = \sum_{i=0}^{N-1} p_i \frac{x^{i+1}}{i+1}$。注意这里的除法是模 $P$ 意义下的乘法逆元。

##### 牛顿迭代法计算 Exp

我们要求 $B(x)$ 使得 $B(x) \equiv e^{A(x)} \pmod{x^N}$。
这等价于 $\ln(B(x)) \equiv A(x) \pmod{x^N}$。
我们定义一个函数 $F(Y) = \ln(Y) - A(x)$。我们想找到 $Y$ 使得 $F(Y)=0$。

假设我们已经得到了 $B_k(x) \equiv e^{A(x)} \pmod{x^k}$。
使用牛顿迭代公式：
$B_{2k}(x) \equiv B_k(x) - \frac{F(B_k(x))}{F'(B_k(x))} \pmod{x^{2k}}$
这里 $F(Y) = \ln(Y) - A(x)$。
对 $Y$ 求导：$F'(Y) = \frac{1}{Y}$。

代入公式：
$B_{2k}(x) \equiv B_k(x) - \frac{\ln(B_k(x)) - A(x)}{1/B_k(x)} \pmod{x^{2k}}$
$B_{2k}(x) \equiv B_k(x) - B_k(x) \left( \ln(B_k(x)) - A(x) \right) \pmod{x^{2k}}$
$B_{2k}(x) \equiv B_k(x) \left( 1 - \ln(B_k(x)) + A(x) \right) \pmod{x^{2k}}$

**这就是多项式 Exp 的牛顿迭代公式！**

**理解这个公式**：
*   $B_k(x)$ 是 $e^{A(x)}$ 在 $\pmod{x^k}$ 意义下的近似。
*   $\ln(B_k(x))$ 应该很接近 $A(x)$。
*   那么 $1 - \ln(B_k(x)) + A(x)$ 应该很接近 $1 - A(x) + A(x) = 1$。
*   $B_k(x)$ 乘以一个接近 $1$ 的修正项，得到更精确的 $B_{2k}(x)$。

**计算步骤**：
1.  **基准情况**：当 $k=1$ 时，我们要求 $B_1(x) \equiv e^{A(x)} \pmod{x^1}$。这意味着 $B_1(0) = e^{A(0)}$。由于我们假设 $A(0)=0$，所以 $B_1(0) = e^0 = 1$。
2.  **迭代**：
    a.  计算 $\ln(B_k(x)) \pmod{x^{2k}}$。这需要调用多项式对数函数。
    b.  计算 $P_1(x) = A(x) - \ln(B_k(x)) \pmod{x^{2k}}$。
    c.  计算 $P_2(x) = 1 + P_1(x) \pmod{x^{2k}}$。
    d.  计算 $B_{2k}(x) = B_k(x) \cdot P_2(x) \pmod{x^{2k}}$。这需要一次 NTT 乘法。

**时间复杂度**：
每次迭代需要一次多项式对数运算和一次多项式乘法。多项式对数运算又需要多项式求逆、求导、积分和乘法。
所有这些操作的复杂度都是 $O(k \log k)$。
所以总复杂度 $T(N) = T(N/2) + O(N \log N)$，解为 $T(N) = O(N \log N)$。

**总结**：多项式求逆和 Exp 都依赖于牛顿迭代法，通过倍增精度的方式，将问题分解成更小的子问题，并最终通过 NTT 加速多项式乘法，达到 $O(N \log N)$ 的高效计算。

===NEXT===

## 典型例题精讲

### 例题 1：多项式求逆
**题目描述**：
给定一个 $N-1$ 次多项式 $A(x)$，其系数 $a_0, a_1, \dots, a_{N-1}$。请你求出 $A(x)$ 在模 $x^N$ 意义下的逆 $B(x)$。
模数 $P = 998244353$。
$N$ 为 $2$ 的幂次，且 $N \le 2^{18}$。

**输入格式**：
第一行一个整数 $N$。
第二行 $N$ 个整数，表示 $A(x)$ 的系数 $a_0, a_1, \dots, a_{N-1}$。

**输出格式**：
一行 $N$ 个整数，表示 $B(x)$ 的系数 $b_0, b_1, \dots, b_{N-1}$。

**样例输入**：
```
4
1 1 1 1
```

**样例输出**：
```
1 998244352 1 998244352
```
（注意：998244352 相当于 -1 模 998244353）

**思路分析**：
1.  **检查前提**：首先检查 $A(0)$ 是否为 $0$。如果 $A(0)=0$，则无解。题目保证 $A(0) \ne 0$ 或我们自己处理。
2.  **牛顿迭代法的基准情况**：
    当 $k=1$ 时，我们需要 $B_1(x)$ 使得 $A(x)B_1(x) \equiv 1 \pmod{x^1}$。
    这意味着 $A(0)B_1(0) \equiv 1 \pmod P$。
    所以 $B_1(0) = \text{power}(A(0), P-2)$，即 $A(0)$ 的模逆元。
    我们将 $B_1(x)$ 存储在一个长度为 $1$ 的数组中。
3.  **牛顿迭代过程**：
    从 $k=1$ 开始，每次将 $k$ 翻倍，直到 $k \ge N$。
    在每次迭代中，我们假设已经得到了 $B_k(x)$，它表示 $A(x)$ 在 $\pmod{x^k}$ 意义下的逆。
    我们要计算 $B_{2k}(x)$，它表示 $A(x)$ 在 $\pmod{x^{2k}}$ 意义下的逆。
    使用的公式是：$B_{2k}(x) \equiv B_k(x) \left(2 - A(x)B_k(x)\right) \pmod{x^{2k}}$。
    具体操作：
    *   准备好 $A(x)$ 的前 $2k$ 项，以及 $B_k(x)$ 的前 $k$ 项（并补 $0$ 到 $2k$ 项）。
    *   计算 $P_1(x) = A(x) \cdot B_k(x) \pmod{x^{2k}}$。这需要调用 NTT 进行多项式乘法。NTT 的长度需要是大于等于 $2k$ 的最小 $2$ 的幂次。
    *   计算 $P_2(x) = 2 - P_1(x) \pmod{x^{2k}}$。
    *   计算 $B_{2k}(x) = B_k(x) \cdot P_2(x) \pmod{x^{2k}}$。这再次需要 NTT。
    *   将结果 $B_{2k}(x)$ 截取前 $2k$ 项，作为下一次迭代的 $B_k(x)$。
4.  **NTT 细节**：
    *   模数 $P=998244353$ 是一个常见的 NTT 模数，原根 $G=3$。
    *   需要实现 `power(base, exp)` 函数计算模幂。
    *   需要实现 `inv(n)` 函数计算模逆元 (即 `power(n, P-2)`)。
    *   NTT 内部需要位翻转操作，以及正向和逆向变换。

**代码框架**：
```cpp
#include <bits/stdc++.h>

const int MOD = 998244353;
const int G = 3;

long long power(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e > 0) {
        if (e % 2 == 1) r = (r * b) % MOD;
        b = (b * b) % MOD;
        e /= 2;
    }
    return r;
}

long long inv(long long n) {
    return power(n, MOD - 2);
}

// NTT (Number Theoretic Transform) implementation
// type = 1 for forward NTT, type = -1 for inverse NTT
void ntt(std::vector<long long>& a, int limit, int type) {
    std::vector<long long> rev(limit);
    for (int i = 0; i < limit; ++i) {
        rev[i] = (rev[i >> 1] >> 1) | ((i & 1) ? (limit >> 1) : 0);
        if (i < rev[i]) std::swap(a[i], a[rev[i]]);
    }

    for (int mid = 1; mid < limit; mid <<= 1) {
        long long wn = power(G, (MOD - 1) / (mid << 1));
        if (type == -1) wn = inv(wn);
        for (int i = 0; i < limit; i += (mid << 1)) {
            long long w = 1;
            for (int j = 0; j < mid; ++j) {
                long long x = a[i + j];
                long long y = (a[i + mid + j] * w) % MOD;
                a[i + j] = (x + y) % MOD;
                a[i + mid + j] = (x - y + MOD) % MOD;
                w = (w * wn) % MOD;
            }
        }
    }

    if (type == -1) {
        long long inv_limit = inv(limit);
        for (int i = 0; i < limit; ++i) {
            a[i] = (a[i] * inv_limit) % MOD;
        }
    }
}

// Polynomial Multiplication using NTT
std::vector<long long> poly_mul(std::vector<long long> a, std::vector<long long> b, int n_res) {
    int len_a = a.size();
    int len_b = b.size();
    int limit = 1;
    while (limit < len_a + len_b -1) limit <<= 1;

    a.resize(limit);
    b.resize(limit);

    ntt(a, limit, 1);
    ntt(b, limit, 1);

    std::vector<long long> c(limit);
    for (int i = 0; i < limit; ++i) {
        c[i] = (a[i] * b[i]) % MOD;
    }
    ntt(c, limit, -1);
    
    c.resize(n_res); // Truncate to desired length
    return c;
}

// Polynomial Inverse
// Returns B(x) such that A(x)B(x) = 1 (mod x^n)
std::vector<long long> poly_inv(const std::vector<long long>& a, int n) {
    std::vector<long long> b;
    b.push_back(inv(a[0])); // Base case: B_0(x) = A(0)^-1 (mod x^1)

    // Iteratively double the precision
    for (int k = 1; k < n; k <<= 1) { // k is current precision, next precision is 2k
        // Prepare A_k(x) (first 2k terms of A(x)) and B_k(x) (current result)
        std::vector<long long> a_k_truncated(a.begin(), a.begin() + std::min((int)a.size(), 2 * k));
        a_k_truncated.resize(2 * k); // Pad with zeros if needed

        std::vector<long long> b_k_padded = b;
        b_k_padded.resize(2 * k); // Pad with zeros to current 2k length

        // Calculate (A_k_truncated * B_k_padded) mod x^(2k)
        std::vector<long long> tmp_mul = poly_mul(a_k_truncated, b_k_padded, 2 * k);

        // Calculate (2 - tmp_mul) mod x^(2k)
        for (int i = 0; i < 2 * k; ++i) {
            tmp_mul[i] = (2 - tmp_mul[i] + MOD) % MOD;
        }

        // Calculate B_k_padded * (2 - tmp_mul) mod x^(2k)
        b = poly_mul(b_k_padded, tmp_mul, 2 * k);
    }
    b.resize(n); // Final result truncated to N terms
    return b;
}

// Main function for example 1
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n;
    std::cin >> n;

    std::vector<long long> a(n);
    for (int i = 0; i < n; ++i) {
        std::cin >> a[i];
    }

    std::vector<long long> b = poly_inv(a, n);

    for (int i = 0; i < n; ++i) {
        std::cout << b[i] << (i == n - 1 ? "" : " ");
    }
    std::cout << std::endl;

    return 0;
}
```
**复杂度分析**：
*   **时间复杂度**：`poly_inv` 函数中，循环 `log N` 次。每次循环内部主要进行两次 NTT 多项式乘法。对于求 $2k$ 次的逆，NTT 长度至少为 $4k$。因此，每次迭代的复杂度是 $O(k \log k)$。总复杂度为 $\sum_{i=0}^{\log N - 1} O(2^i \log(2^i)) = O(N \log N)$。
*   **空间复杂度**：主要由 `std::vector` 存储多项式系数引起，最大长度为 $4N$ (NTT 内部的临时数组)。因此空间复杂度为 $O(N)$。

### 例题 2：多项式指数函数 (Exp)
**题目描述**：
给定一个 $N-1$ 次多项式 $A(x)$，其系数 $a_0, a_1, \dots, a_{N-1}$。保证 $A(0)=0$。请你求出 $B(x) \equiv e^{A(x)} \pmod{x^N}$。
模数 $P = 998244353$。
$N$ 为 $2$ 的幂次，且 $N \le 2^{18}$。

**输入格式**：
第一行一个整数 $N$。
第二行 $N$ 个整数，表示 $A(x)$ 的系数 $a_0, a_1, \dots, a_{N-1}$。

**输出格式**：
一行 $N$ 个整数，表示 $B(x)$ 的系数 $b_0, b_1, \dots, b_{N-1}$。

**样例输入**：
```
4
0 1 0 0
```
（表示 $A(x) = x$）

**样例输出**：
```
1 1 499122177 166374059
```
（$e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \dots$
$1 + x + 499122177x^2 + 166374059x^3 \pmod{998244353}$
$1/2 \equiv 499122177 \pmod{998244353}$
$1/6 \equiv 166374059 \pmod{998244353}$）

**思路分析**：
1.  **检查前提**：保证 $A(0)=0$。
2.  **牛顿迭代法的基准情况**：
    当 $k=1$ 时，我们需要 $B_1(x)$ 使得 $B_1(x) \equiv e^{A(x)} \pmod{x^1}$。
    这意味着 $B_1(0) = e^{A(0)}$。由于 $A(0)=0$，所以 $B_1(0) = e^0 = 1$。
    我们将 $B_1(x)$ 存储在一个长度为 $1$ 的数组中。
3.  **牛顿迭代过程**：
    从 $k=1$ 开始，每次将 $k$ 翻倍，直到 $k \ge N$。
    在每次迭代中，我们假设已经得到了 $B_k(x)$，它表示 $e^{A(x)}$ 在 $\pmod{x^k}$ 意义下的结果。
    我们要计算 $B_{2k}(x)$，它表示 $e^{A(x)}$ 在 $\pmod{x^{2k}}$ 意义下的结果。
    使用的公式是：$B_{2k}(x) \equiv B_k(x) \left(1 - \ln(B_k(x)) + A(x)\right) \pmod{x^{2k}}$。
    这个过程需要多项式对数函数 `poly_ln`。

4.  **多项式对数函数 `poly_ln` 的实现**：
    `poly_ln(A, n)` 计算 $\ln(A(x)) \pmod{x^n}$。
    *   **前提**：要求 $A(0)=1$。
    *   **步骤**：
        a.  计算 $A'(x)$ (多项式求导)。
        b.  计算 $A(x)^{-1} \pmod{x^n}$ (调用 `poly_inv` 函数)。
        c.  将 $A'(x)$ 和 $A(x)^{-1}$ 相乘，得到 $P(x) = A'(x)A(x)^{-1} \pmod{x^n}$。
        d.  对 $P(x)$ 进行积分，得到 $\ln(A(x))$。积分时，常数项为 $0$。

**代码框架**：
（在例题 1 的基础上添加 `poly_deriv`, `poly_int`, `poly_ln`, `poly_exp` 函数）

```cpp
#include <bits/stdc++.h>

const int MOD = 998244353;
const int G = 3;

long long power(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e > 0) {
        if (e % 2 == 1) r = (r * b) % MOD;
        b = (b * b) % MOD;
        e /= 2;
    }
    return r;
}

long long inv(long long n) {
    return power(n, MOD - 2);
}

// NTT (Number Theoretic Transform) implementation
// type = 1 for forward NTT, type = -1 for inverse NTT
void ntt(std::vector<long long>& a, int limit, int type) {
    std::vector<int> rev(limit); // Use int for rev indices
    for (int i = 0; i < limit; ++i) {
        rev[i] = (rev[i >> 1] >> 1) | ((i & 1) ? (limit >> 1) : 0);
        if (i < rev[i]) std::swap(a[i], a[rev[i]]);
    }

    for (int mid = 1; mid < limit; mid <<= 1) {
        long long wn = power(G, (MOD - 1) / (mid << 1));
        if (type == -1) wn = inv(wn);
        for (int i = 0; i < limit; i += (mid << 1)) {
            long long w = 1;
            for (int j = 0; j < mid; ++j) {
                long long x = a[i + j];
                long long y = (a[i + mid + j] * w) % MOD;
                a[i + j] = (x + y) % MOD;
                a[i + mid + j] = (x - y + MOD) % MOD;
                w = (w * wn) % MOD;
            }
        }
    }

    if (type == -1) {
        long long inv_limit = inv(limit);
        for (int i = 0; i < limit; ++i) {
            a[i] = (a[i] * inv_limit) % MOD;
        }
    }
}

// Polynomial Multiplication using NTT
std::vector<long long> poly_mul(std::vector<long long> a, std::vector<long long> b, int n_res) {
    int len_a = a.size();
    int len_b = b.size();
    int limit = 1;
    while (limit < len_a + len_b -1) limit <<= 1; // Ensure limit is large enough for convolution

    a.resize(limit);
    b.resize(limit);

    ntt(a, limit, 1);
    ntt(b, limit, 1);

    std::vector<long long> c(limit);
    for (int i = 0; i < limit; ++i) {
        c[i] = (a[i] * b[i]) % MOD;
    }
    ntt(c, limit, -1);
    
    c.resize(n_res); // Truncate to desired length
    return c;
}

// Polynomial Inverse
std::vector<long long> poly_inv(const std::vector<long long>& a, int n) {
    std::vector<long long> b;
    b.push_back(inv(a[0])); // Base case: B_0(x) = A(0)^-1 (mod x^1)

    for (int k = 1; k < n; k <<= 1) {
        std::vector<long long> a_k_truncated(a.begin(), a.begin() + std::min((int)a.size(), 2 * k));
        a_k_truncated.resize(2 * k);

        std::vector<long long> b_k_padded = b;
        b_k_padded.resize(2 * k);

        std::vector<long long> tmp_mul = poly_mul(a_k_truncated, b_k_padded, 2 * k);

        for (int i = 0; i < 2 * k; ++i) {
            tmp_mul[i] = (2 - tmp_mul[i] + MOD) % MOD;
        }
        b = poly_mul(b_k_padded, tmp_mul, 2 *