# 中国剩余定理（CRT）

## 教学目标

**知识目标：**
1.  理解中国剩余定理（CRT）的起源、背景和应用场景，特别是“韩信点兵”问题。
2.  掌握CRT的核心思想：如何将多个模数互质的同余方程合并为一个。
3.  理解CRT中模数两两互质的重要性，以及它与乘法逆元存在的关联。
4.  掌握扩展欧几里得算法（`exgcd`）的原理和实现，并能用它求解乘法逆元。
5.  掌握CRT的数学公式和推导过程，并能用C++代码实现。

**能力目标：**
1.  能够将实际问题抽象为同余方程组，并判断是否适用CRT。
2.  能够运用`exgcd`算法求解模意义下的乘法逆元。
3.  能够独立编写C++代码实现中国剩余定理，求解同余方程组的最小非负整数解。
4.  培养分析问题、拆解问题、逐步构建解决方案的计算思维能力。

**素养目标：**
1.  感受古代数学家解决复杂问题的智慧，体会数论在计算机科学中的应用价值。
2.  培养严谨细致的编程习惯，尤其是在处理模运算、负数和大整数时的准确性。
3.  激发对数论知识的兴趣，体会数学之美和解决问题的成就感。

===NEXT===

## 趣味引入

同学们，你们有没有听过一个关于“韩信点兵”的故事？

话说汉朝开国大将韩信，带兵打仗，每次清点人数都非常迅速。有一次，刘邦问他：“你点兵怎么这么快啊？”韩信笑了笑说：“我不用一个个去数，我让士兵排成3人一队，最后剩下2人；再排成5人一队，最后剩下3人；最后排成7人一队，最后剩下2人。这样我立刻就能知道总兵力是多少了！”

刘邦听得一头雾水：“光知道剩下几个人，怎么就能知道总人数呢？”

这就是一个非常经典的数学问题！我们用数学语言来描述一下：
假设总兵力是 `x` 人。
*   `x` 除以 3 余 2，也就是 `x ≡ 2 (mod 3)`
*   `x` 除以 5 余 3，也就是 `x ≡ 3 (mod 5)`
*   `x` 除以 7 余 2，也就是 `x ≡ 2 (mod 7)`

我们现在面临的问题就是：如何根据这三个条件，找出最小的那个 `x` 呢？

这个问题在古代中国被称为“物不知数”问题，我们的祖先在《孙子算经》中就给出了巧妙的解法。今天，我们就来学习这个强大的工具——**中国剩余定理（Chinese Remainder Theorem, 简称 CRT）**！它能帮助我们解决这类看似复杂，实则有规律可循的问题。

准备好了吗？让我们一起穿越时空，去探索古人的智慧和现代算法的奥秘吧！

===NEXT===

## 深度知识点讲解

### 1. CRT的背景与核心问题

“韩信点兵”的故事，就是中国剩余定理最经典的例子。它解决的是这样一个问题：
给定一个同余方程组：
$x \equiv a_1 \pmod{m_1}$
$x \equiv a_2 \pmod{m_2}$
...
$x \equiv a_n \pmod{m_n}$

其中，$m_1, m_2, \ldots, m_n$ 是**两两互质**的正整数（这是CRT最关键的条件之一），$a_1, a_2, \ldots, a_n$ 是整数。我们要找到一个整数 $x$，同时满足所有这些条件。

### 2. CRT的核心思想：构造解

我们来一步步地理解 CRT 是如何构造出这个 $x$ 的。

**生活类比：** 想象你有一个特殊的时钟，它有多个表盘，每个表盘的刻度数都不一样（比如一个3刻度的，一个5刻度的，一个7刻度的）。每个表盘都有一个指针，指向不同的数字。现在你需要找到一个时刻，让所有表盘的指针同时指向你想要的刻度。

CRT的构造方法可以理解为“分而治之”：
对于每个方程 $x \equiv a_i \pmod{m_i}$，我们尝试构造一个特殊的数 $k_i$，使得：
1.  $k_i \equiv a_i \pmod{m_i}$
2.  $k_i \equiv 0 \pmod{m_j}$ (对于所有 $j \ne i$)

如果能构造出这样的 $k_i$，那么我们把所有的 $k_i$ 加起来：
$x = k_1 + k_2 + \ldots + k_n$

这个 $x$ 就满足：
$x \equiv k_1 + k_2 + \ldots + k_n \equiv a_i + 0 + \ldots + 0 \equiv a_i \pmod{m_i}$
对所有的 $i$ 都成立！是不是很神奇？

那么，如何构造这个 $k_i$ 呢？

### 3. 构建 $k_i$ 的步骤

我们先定义一个总模数 $M = m_1 \times m_2 \times \ldots \times m_n$。
然后，对于每一个 $m_i$，我们定义 $M_i = M / m_i$。
注意，$M_i$ 是除了 $m_i$ 之外所有模数的乘积。

由于 $m_1, m_2, \ldots, m_n$ 两两互质，所以 $M_i$ 和 $m_i$ 也是互质的。
（思考：为什么 $M_i$ 和 $m_i$ 互质？因为 $M_i$ 里不包含 $m_i$ 的任何质因子，而 $m_i$ 只包含自己的质因子，所以它们没有共同的质因子。）

因为 $M_i$ 和 $m_i$ 互质，所以根据扩展欧几里得定理，我们一定能找到一个整数 $t_i$，使得：
$M_i \cdot t_i \equiv 1 \pmod{m_i}$
这个 $t_i$ 就是 $M_i$ 在模 $m_i$ 意义下的乘法逆元！

现在我们有了 $M_i$ 和 $t_i$，我们就可以构造 $k_i$ 了：
$k_i = a_i \cdot M_i \cdot t_i$

来检验一下这个 $k_i$：
1.  $k_i \pmod{m_i}$:
    $k_i = a_i \cdot M_i \cdot t_i \equiv a_i \cdot (M_i \cdot t_i) \equiv a_i \cdot 1 \equiv a_i \pmod{m_i}$
    第一个条件满足！
2.  $k_i \pmod{m_j}$ (对于所有 $j \ne i$):
    因为 $M_i$ 包含了 $m_j$ 这个因子（因为 $M_i = M / m_i$，$m_j$ 是 $M$ 的因子），所以 $M_i$ 是 $m_j$ 的倍数。
    因此，$M_i \equiv 0 \pmod{m_j}$。
    所以 $k_i = a_i \cdot M_i \cdot t_i \equiv a_i \cdot 0 \cdot t_i \equiv 0 \pmod{m_j}$
    第二个条件也满足！

完美！我们成功构造了 $k_i$。

### 4. CRT的最终公式

将所有 $k_i$ 加起来，就得到了一个特解 $X_0$:
$X_0 = \sum_{i=1}^{n} (a_i \cdot M_i \cdot t_i)$

这个 $X_0$ 是一个解，但它不一定是最小的正整数解。
由于 $X_0$ 同时满足所有同余方程，并且所有模数 $m_i$ 都是 $M$ 的因子，所以 $X_0$ 模 $M$ 之后，仍然满足所有同余方程。
因此，同余方程组的通解是：
$x \equiv X_0 \pmod{M}$
即 $x = X_0 + k \cdot M$ (其中 $k$ 为任意整数)。
最小非负整数解就是 $(X_0 \pmod{M} + M) \pmod{M}$。

**总结一下 CRT 的步骤：**
1.  计算所有模数的乘积 $M = m_1 \times m_2 \times \ldots \times m_n$。
2.  对于每个 $i$ 从 1 到 $n$：
    a.  计算 $M_i = M / m_i$。
    b.  使用扩展欧几里得算法求解 $M_i$ 在模 $m_i$ 意义下的乘法逆元 $t_i$（即 $M_i \cdot t_i \equiv 1 \pmod{m_i}$）。
3.  计算 $X_0 = \sum_{i=1}^{n} (a_i \cdot M_i \cdot t_i)$。
4.  最终的最小非负整数解为 $(X_0 \pmod{M} + M) \pmod{M}$。

### 5. 扩展欧几里得算法 (Extended Euclidean Algorithm)

既然 CRT 依赖于求解乘法逆元，我们就需要深入了解 `exgcd`。

**回顾欧几里得算法 (GCD)：**
它用于求两个正整数 $a, b$ 的最大公约数 `gcd(a, b)`。
`gcd(a, b) = gcd(b, a % b)`
当 `b` 为 0 时，`gcd(a, 0) = a`。

**扩展欧几里得算法：**
它不仅能求 `gcd(a, b)`，还能找到一对整数 $x, y$，使得：
$a \cdot x + b \cdot y = \text{gcd}(a, b)$

**推导过程：**
假设我们已经求得了 `b` 和 `a % b` 的 `exgcd` 结果：
$b \cdot x_1 + (a \pmod b) \cdot y_1 = \text{gcd}(b, a \pmod b)$
我们知道 $a \pmod b = a - \lfloor a/b \rfloor \cdot b$。
代入上式：
$b \cdot x_1 + (a - \lfloor a/b \rfloor \cdot b) \cdot y_1 = \text{gcd}(a, b)$ (因为 `gcd(a, b) = gcd(b, a % b)`)
整理得到：
$a \cdot y_1 + b \cdot (x_1 - \lfloor a/b \rfloor \cdot y_1) = \text{gcd}(a, b)$

对比 $a \cdot x + b \cdot y = \text{gcd}(a, b)$，我们可以得到：
$x = y_1$
$y = x_1 - \lfloor a/b \rfloor \cdot y_1$

这就是 `exgcd` 的递归推导关系。
**边界条件：** 当 `b = 0` 时，`gcd(a, 0) = a`。此时，我们令 $x = 1, y = 0$ 即可满足 $a \cdot 1 + 0 \cdot 0 = a$。

**如何用 `exgcd` 求解 $M_i \cdot t_i \equiv 1 \pmod{m_i}$？**
这个同余方程可以转化为：
$M_i \cdot t_i - 1 = k \cdot m_i$ (其中 $k$ 为某个整数)
移项得到：
$M_i \cdot t_i - m_i \cdot k = 1$
这正好是 `exgcd` 的形式：$a \cdot x + b \cdot y = \text{gcd}(a, b)$，其中 $a=M_i$, $b=m_i$, $x=t_i$, $y=-k$, 且 `gcd(M_i, m_i) = 1`。
所以，我们用 `exgcd(M_i, m_i, t_i, k)` 求解出 $t_i$ 即可。
注意，`exgcd` 求出的 $t_i$ 可能是负数，我们需要将其调整到 $[0, m_i-1]$ 的范围内。
`t_i = (t_i % m_i + m_i) % m_i`。

### 6. 常见误区与注意事项

1.  **模数互质！** 这是CRT能直接使用的前提。如果模数不互质，需要用更通用的方法（如合并两个同余方程的迭代法）。
2.  **大数溢出：** $M$ 和 $X_0$ 可能会非常大，需要使用 `long long` 类型。中间计算 $a_i \cdot M_i \cdot t_i$ 时也要注意乘法溢出。
3.  **负数处理：** `exgcd` 求出的逆元可能是负数，需要 `(ans % m + m) % m` 转换为正数。同样，最终结果 $X_0$ 也需要进行类似处理。
4.  **`long long` 的乘法溢出：** 即使使用了 `long long`，如果 $M_i$ 和 $t_i$ 都接近 `LLONG_MAX` 的平方根，它们的乘积也可能溢出。但在 GESP 九级范围，通常 $M$ 不会大到导致 $a_i \cdot M_i \cdot t_i$ 溢出 `long long` 的地步（除非题目模数特别大，如 $10^{18}$ 级别）。如果 $M$ 超过 $10^9$，那么 $M_i$ 也会很大，需要用“龟速乘”（或称“二进制乘法”）来避免溢出，或者在每次加法后都取模。对于CRT的公式 $X_0 = \sum (a_i \cdot M_i \cdot t_i)$，由于最终结果是模 $M$，我们可以写成 $X_0 = (\sum (a_i \cdot M_i \cdot t_i \pmod M)) \pmod M$，但这样每个 $a_i \cdot M_i \cdot t_i$ 还是可能溢出。更安全的做法是：
    `res = (res + (a[i] * M_i % M * t_i % M)) % M;`
    在计算 `a[i] * M_i % M` 时，$M_i$ 可能已经接近 $M$，乘以 $a[i]$ 仍然可能溢出。所以，最好的方式是：
    `res = (res + mul(a[i], mul(M_i, t_i, M), M)) % M;`
    其中 `mul` 是一个龟速乘函数。但对于 GESP 9 级，通常 $M$ 不会超过 $10^{12}$ 级别，直接乘法一般够用。如果 $M$ 达到 $10^{18}$，则必须用龟速乘。

**对于GESP九级，我们通常假设 $M$ 不会大到需要龟速乘，直接 `long long` 乘法后取模即可。**

```cpp
// 龟速乘函数 (如果 M 特别大，例如超过 10^9 * 10^9 这种级别)
// long long mul(long long a, long long b, long long m) {
//     long long res = 0;
//     a %= m;
//     while (b > 0) {
//         if (b & 1) res = (res + a) % m;
//         a = (a + a) % m;
//         b >>= 1;
//     }
//     return res;
// }
```
在CRT中，我们计算 $a_i \cdot M_i \cdot t_i$ 这一项时，可以直接对 $M_i \cdot t_i$ 进行模 $M$ 的运算，再乘以 $a_i$。
`term = a[i];`
`term = (term * M_i) % M;`
`term = (term * t_i) % M;`
`ans = (ans + term) % M;`
这样可以避免中间结果过大，但前提是 `a[i] * M_i` 不会溢出 `long long`。
更安全但稍微慢一点：
`ans = (ans + a[i] * (M_i * t_i % M) % M) % M;`
或者
`ans = (ans + mul(a[i], mul(M_i, t_i, M), M)) % M;`

对于 GESP 9 级，我们通常假设 $a_i \cdot M_i \cdot t_i$ 不会直接溢出 `long long`，或者 $M$ 足够小，使得 `(a[i] % M * M_i % M * t_i % M) % M` 能够工作。最稳妥的是在每次乘法后都取模。
`term = a[i];`
`term = term * M_i;` // 这里可能溢出
`term = term % M;`
`term = term * t_i;` // 这里可能溢出
`term = term % M;`
`ans = (ans + term) % M;`

为了避免中间溢出，我们可以这样写：
`long long current_term = a[i];`
`current_term = (current_term * M_i) % M; // 注意，M_i 已经很大，这里可能溢出`
`current_term = (current_term * t_i) % M; // 注意，t_i 也可能很大，这里也可能溢出`
`ans = (ans + current_term) % M;`

**最安全的写法（针对 GESP 9 级，假设 $M < 2^{62}$ 左右，不需要龟速乘，但需要防止中间 $A \cdot B$ 溢出）**
计算 $A \cdot B \pmod M$：
`long long multiply_mod(long long A, long long B, long long M_total)`
`{`
`    A %= M_total;`
`    B %= M_total;`
`    return (A * B) % M_total;`
`}`
然后 `ans = (ans + multiply_mod(a[i], multiply_mod(M_i, t_i, M), M)) % M;`
或者更直接点，对于 $a \cdot M_i \cdot t_i \pmod M$:
`term = (a[i] % M + M) % M;`
`term = (term * (M_i % M + M) % M) % M;`
`term = (term * (t_i % M + M) % M) % M;`
`ans = (ans + term) % M;`
这样写可以避免中间结果溢出，只要 $M < \sqrt{LLONG\_MAX}$ 即可。在 GESP 9 级，模数一般不会大到这个程度。

### 7. 复杂度和分析

*   **计算 $M$：** $O(n)$ 次乘法。
*   **计算 $M_i$：** $O(n)$ 次除法。
*   **计算 $t_i$ (逆元)：** 每次调用 `exgcd` 的复杂度是 $O(\log m_i)$。总共 $n$ 次，所以是 $O(n \log(\max m_i))$。
*   **计算 $X_0$：** $O(n)$ 次乘法和加法。
*   **总复杂度：** $O(n \log(\max m_i))$。

这是一个非常高效的算法！

===NEXT===

## 典型例题精讲

### 例题 1：韩信点兵问题

**题目描述：**
韩信带兵，3人一队剩2人，5人一队剩3人，7人一队剩2人。请问他至少有多少士兵？

**数学模型：**
$x \equiv 2 \pmod 3$
$x \equiv 3 \pmod 5$
$x \equiv 2 \pmod 7$

**思路分析：**
1.  **检查互质：** 模数 3, 5, 7 都是质数，所以它们两两互质。可以使用 CRT。
2.  **计算总模数 $M$：** $M = 3 \times 5 \times 7 = 105$。
3.  **计算 $M_i$：**
    *   $m_1=3, a_1=2 \implies M_1 = 105 / 3 = 35$
    *   $m_2=5, a_2=3 \implies M_2 = 105 / 5 = 21$
    *   $m_3=7, a_3=2 \implies M_3 = 105 / 7 = 15$
4.  **计算逆元 $t_i$：**
    *   **对于 $M_1=35, m_1=3$：** $35 \cdot t_1 \equiv 1 \pmod 3$
        $35 \equiv 2 \pmod 3$，所以 $2 \cdot t_1 \equiv 1 \pmod 3$。
        当 $t_1=2$ 时，$2 \cdot 2 = 4 \equiv 1 \pmod 3$。所以 $t_1=2$。
        （用`exgcd(35, 3, t1, y)`，得到 $t_1=2, y=-23$）
    *   **对于 $M_2=21, m_2=5$：** $21 \cdot t_2 \equiv 1 \pmod 5$
        $21 \equiv 1 \pmod 5$，所以 $1 \cdot t_2 \equiv 1 \pmod 5$。
        所以 $t_2=1$。
        （用`exgcd(21, 5, t2, y)`，得到 $t_2=1, y=-4$）
    *   **对于 $M_3=15, m_3=7$：** $15 \cdot t_3 \equiv 1 \pmod 7$
        $15 \equiv 1 \pmod 7$，所以 $1 \cdot t_3 \equiv 1 \pmod 7$。
        所以 $t_3=1$。
        （用`exgcd(15, 7, t3, y)`，得到 $t_3=1, y=-2$）
5.  **计算 $X_0$：**
    $X_0 = (a_1 \cdot M_1 \cdot t_1) + (a_2 \cdot M_2 \cdot t_2) + (a_3 \cdot M_3 \cdot t_3)$
    $X_0 = (2 \cdot 35 \cdot 2) + (3 \cdot 21 \cdot 1) + (2 \cdot 15 \cdot 1)$
    $X_0 = (140) + (63) + (30)$
    $X_0 = 233$
6.  **计算最小非负整数解：**
    $x = (X_0 \pmod M + M) \pmod M = (233 \pmod{105} + 105) \pmod{105}$
    $233 = 2 \times 105 + 23$
    $x = (23 + 105) \pmod{105} = 23$

所以，韩信至少有23名士兵。

**代码实现：**

```cpp
#include <iostream>

// 扩展欧几里得算法
// 计算 a*x + b*y = gcd(a, b)
// 返回值是 gcd(a, b)
long long exgcd(long long a, long long b, long long &x, long long &y) {
    if (b == 0) {
        x = 1;
        y = 0;
        return a;
    }
    long long g = exgcd(b, a % b, y, x); // 递归调用，注意 x 和 y 的顺序
    y -= (a / b) * x; // 根据推导公式更新 y
    return g;
}

// 求解 a 在模 m 意义下的乘法逆元
// 要求 gcd(a, m) = 1
long long inv(long long a, long long m) {
    long long x, y;
    long long g = exgcd(a, m, x, y);
    if (g != 1) {
        // 如果 gcd(a, m) != 1，则逆元不存在
        // 在 CRT 中，我们保证了 M_i 和 m_i 互质，所以逆元一定存在
        return -1; // 表示错误或不存在
    }
    // 将 x 调整到 [0, m-1] 的范围内
    return (x % m + m) % m;
}

// 中国剩余定理函数
// n: 方程组的数量
// a[]: 余数数组 (a_i)
// m[]: 模数数组 (m_i)
long long chinese_remainder_theorem(int n, long long a[], long long m[]) {
    long long M = 1; // 总模数 M = m_1 * m_2 * ... * m_n
    for (int i = 0; i < n; ++i) {
        M *= m[i];
    }

    long long ans = 0; // 最终的解
    for (int i = 0; i < n; ++i) {
        long long M_i = M / m[i]; // M_i = M / m_i
        long long t_i = inv(M_i, m[i]); // M_i 在模 m_i 意义下的逆元
        
        // 计算 (a_i * M_i * t_i) % M
        // 为了防止中间结果溢出 long long，每次乘法后都取模 M
        long long term = a[i];
        term = (term * M_i) % M;
        term = (term * t_i) % M;
        
        ans = (ans + term) % M;
    }

    // 确保结果是最小非负整数解
    return (ans % M + M) % M;
}

int main() {
    // 韩信点兵问题
    int n = 3;
    long long a[] = {2, 3, 2}; // 余数
    long long m[] = {3, 5, 7}; // 模数

    long long result = chinese_remainder_theorem(n, a, m);
    std::cout << "韩信至少有 " << result << " 名士兵。" << std::endl; // 输出 23

    // 另一个例子
    // x = 1 (mod 2)
    // x = 2 (mod 3)
    // x = 3 (mod 5)
    n = 3;
    long long a2[] = {1, 2, 3};
    long long m2[] = {2, 3, 5};
    result = chinese_remainder_theorem(n, a2, m2);
    std::cout << "另一个方程组的最小非负解是: " << result << std::endl; // 输出 23

    return 0;
}

```

**复杂度分析：**
*   `exgcd` 函数的复杂度是 $O(\log(\min(a, b)))$。
*   `inv` 函数调用一次 `exgcd`，复杂度也是 $O(\log m)$。
*   `chinese_remainder_theorem` 函数中，有一个循环 $n$ 次。每次循环计算 $M_i$ (常数时间)，调用 `inv` ( $O(\log m_i)$ )，以及几次模乘。
*   所以总时间复杂度为 $O(n \cdot \log(\max m_i))$。
*   空间复杂度为 $O(1)$ (不计输入数组)。

### 例题 2：周期性事件同步

**题目描述：**
假设有三盏灯，它们分别每隔 $m_1$ 秒、 $m_2$ 秒、 $m_3$ 秒闪烁一次。已知它们在某个时刻同时闪烁过。现在，第一盏灯在第 $a_1$ 秒闪烁，第二盏灯在第 $a_2$ 秒闪烁，第三盏灯在第 $a_3$ 秒闪烁（这里的 $a_i$ 是从某个共同起始时间点开始计算的相对时间）。请问下一次三盏灯同时闪烁的最早时间是什么？
（为了简化，我们假设 $m_1=4, m_2=6, m_3=7$，并且它们在 $t=0$ 时刻同时闪烁过。现在发现：第一盏灯在 $t=3$ 秒闪烁，第二盏灯在 $t=2$ 秒闪烁，第三盏灯在 $t=5$ 秒闪烁。求下一次同时闪烁的时间。）

**注意：** 这里的 $m_i$ 可能不互质。为了适配 CRT，我们修改题目条件，让 $m_i$ 互质。

**修改后的题目描述：**
有三盏灯，它们分别每隔 $m_1=4$ 秒、 $m_2=5$ 秒、 $m_3=7$ 秒闪烁一次。已知它们在某个时刻同时闪烁过。现在，第一盏灯在第 $a_1=3$ 秒闪烁，第二盏灯在第 $a_2=2$ 秒闪烁，第三盏灯在第 $a_3=5$ 秒闪烁（这里的 $a_i$ 是从某个共同起始时间点开始计算的相对时间）。请问下一次三盏灯同时闪烁的最早时间是什么？

**数学模型：**
$x \equiv 3 \pmod 4$
$x \equiv 2 \pmod 5$
$x \equiv 5 \pmod 7$

**思路分析：**
1.  **检查互质：** 模数 4, 5, 7 两两互质吗？`gcd(4,5)=1`, `gcd(4,7)=1`, `gcd(5,7)=1`。是的，它们两两互质。可以使用 CRT。
2.  **计算总模数 $M$：** $M = 4 \times 5 \times 7 = 140$。
3.  **计算 $M_i$：**
    *   $m_1=4, a_1=3 \implies M_1 = 140 / 4 = 35$
    *   $m_2=5, a_2=2 \implies M_2 = 140 / 5 = 28$
    *   $m_3=7, a_3=5 \implies M_3 = 140 / 7 = 20$
4.  **计算逆元 $t_i$：**
    *   **对于 $M_1=35, m_1=4$：** $35 \cdot t_1 \equiv 1 \pmod 4$
        $35 \equiv 3 \pmod 4$，所以 $3 \cdot t_1 \equiv 1 \pmod 4$。
        当 $t_1=3$ 时，$3 \cdot 3 = 9 \equiv 1 \pmod 4$。所以 $t_1=3$。
    *   **对于 $M_2=28, m_2=5$：** $28 \cdot t_2 \equiv 1 \pmod 5$
        $28 \equiv 3 \pmod 5$，所以 $3 \cdot t_2 \equiv 1 \pmod 5$。
        当 $t_2=2$ 时，$3 \cdot 2 = 6 \equiv 1 \pmod 5$。所以 $t_2=2$。
    *   **对于 $M_3=20, m_3=7$：** $20 \cdot t_3 \equiv 1 \pmod 7$
        $20 \equiv 6 \pmod 7$，所以 $6 \cdot t_3 \equiv 1 \pmod 7$。
        当 $t_3=6$ 时，$6 \cdot 6 = 36 \equiv 1 \pmod 7$。所以 $t_3=6$。
5.  **计算 $X_0$：**
    $X_0 = (a_1 \cdot M_1 \cdot t_1) + (a_2 \cdot M_2 \cdot t_2) + (a_3 \cdot M_3 \cdot t_3)$
    $X_0 = (3 \cdot 35 \cdot 3) + (2 \cdot 28 \cdot 2) + (5 \cdot 20 \cdot 6)$
    $X_0 = (315) + (112) + (600)$
    $X_0 = 1027$
6.  **计算最小非负整数解：**
    $x = (X_0 \pmod M + M) \pmod M = (1027 \pmod{140} + 140) \pmod{140}$
    $1027 = 7 \times 140 + 47$
    $x = (47 + 140) \pmod{140} = 47$

所以，下一次三盏灯同时闪烁的最早时间是第 47 秒。

**代码实现：** (与例题1代码相同，只需修改 `main` 函数中的输入数据)

```cpp
#include <iostream>

// (exgcd 和 inv 函数同上)
long long exgcd(long long a, long long b, long long &x, long long &y) {
    if (b == 0) { x = 1; y = 0; return a; }
    long long g = exgcd(b, a % b, y, x);
    y -= (a / b) * x;
    return g;
}

long long inv(long long a, long long m) {
    long long x, y;
    exgcd(a, m, x, y);
    return (x % m + m) % m;
}

long long chinese_remainder_theorem(int n, long long a[], long long m[]) {
    long long M = 1;
    for (int i = 0; i < n; ++i) {
        M *= m[i];
    }

    long long ans = 0;
    for (int i = 0; i < n; ++i) {
        long long M_i = M / m[i];
        long long t_i = inv(M_i, m[i]);
        
        long long term = a[i];
        term = (term * M_i) % M;
        term = (term * t_i) % M;
        
        ans = (ans + term) % M;
    }
    return (ans % M + M) % M;
}

int main() {
    int n = 3;
    long long a[] = {3, 2, 5}; // 余数
    long long m[] = {4, 5, 7}; // 模数

    long long result = chinese_remainder_theorem(n, a, m);
    std::cout << "三盏灯同时闪烁的最早时间是: " << result << " 秒。" << std::endl; // 输出 47

    return 0;
}

```

**复杂度分析：** 同例题 1。

===NEXT===

## 代码实现模板

```cpp
#include <iostream> // 输入输出
// #include <vector> // GESP 1-5级禁用STL容器，这里不使用
// #include <numeric> // GESP 1-5级禁用，这里不使用

// 为了方便，竞赛中常用万能头文件，但实际开发中不推荐
// #include <bits/stdc++.h> 

// 1. 扩展欧几里得算法 (Extended Euclidean Algorithm)
// 功能: 求解方程 a*x + b*y = gcd(a, b)
// 参数:
//   a, b: 两个正整数
//   x, y: 用于存储解的引用，函数执行完毕后会存储一组满足方程的 x 和 y
// 返回值: a 和 b 的最大公约数 gcd(a, b)
long long exgcd(long long a, long long b, long long &x, long long &y) {
    // 边界条件: 如果 b 为 0，则 gcd(a, 0) = a
    // 此时方程变为 a*x + 0*y = a，显然 x=1, y=0 是一组解
    if (b == 0) {
        x = 1;
        y = 0;
        return a;
    }
    // 递归调用: 根据欧几里得算法，gcd(a, b) = gcd(b, a % b)
    // 假设我们已经求得了 b*y_prime + (a % b)*x_prime = gcd(b, a % b) 的解 (x_prime, y_prime)
    long long g = exgcd(b, a % b, y, x); // 注意这里 x 和 y 的位置交换了，因为对于下一层递归，
                                         // 原本的 y_prime 对应当前层的 x，
                                         // 原本的 x_prime 对应当前层的 y。
                                         // 这样，当递归返回时，x 存储的是下一层的 y_prime，y 存储的是下一层的 x_prime。
    
    // 根据推导公式: a*x + b*y = a*y_prime + b*(x_prime - (a/b)*y_prime)
    // 所以当前层的 y = x_prime - (a/b)*y_prime
    y -= (a / b) * x; // 此时 x 已经是从下一层返回的 y_prime
    
    return g; // 返回最大公约数
}

// 2. 求解乘法逆元 (Modular Multiplicative Inverse)
// 功能: 求解 a 在模 m 意义下的乘法逆元 t，即满足 a*t ≡ 1 (mod m)
//       要求 a 和 m 互质 (gcd(a, m) = 1)
// 参数:
//   a: 待求逆元的数
//   m: 模数
// 返回值: a 在模 m 意义下的最小非负乘法逆元
long long inv(long long a, long long m) {
    long long x, y;
    long long g = exgcd(a, m, x, y); // 调用 exgcd 求解 a*x + m*y = gcd(a, m)
    
    // 如果 gcd(a, m) 不为 1，说明逆元不存在
    // 在 CRT 中，我们保证了 M_i 和 m_i 互质，所以这里 g 理论上永远是 1
    if (g != 1) {
        // 通常竞赛题不会出现这种情况，如果出现说明题目条件不满足或逻辑错误
        // 这里返回 -1 表示逆元不存在，或者抛出异常
        return -1; 
    }
    
    // exgcd 求解出的 x 可能为负数，需要将其调整到 [0, m-1] 的范围内
    return (x % m + m) % m;
}

// 3. 中国剩余定理 (Chinese Remainder Theorem, CRT)
// 功能: 求解同余方程组 x ≡ a_i (mod m_i) 的最小非负整数解
//       要求所有 m_i 两两互质
// 参数:
//   n: 方程组的数量
//   a[]: 存储余数 a_i 的数组 (0-indexed)
//   m[]: 存储模数 m_i 的数组 (0-indexed)
// 返回值: 同余方程组的最小非负整数解
long long chinese_remainder_theorem(int n, long long a[], long long m[]) {
    // 计算所有模数的乘积 M = m_1 * m_2 * ... * m_n
    // M 可能会非常大，使用 long long 类型
    long long M = 1;
    for (int i = 0; i < n; ++i) {
        M *= m[i];
    }

    // 初始化最终结果为 0
    long long ans = 0; 

    // 遍历每一个同余方程 x ≡ a_i (mod m_i)
    for (int i = 0; i < n; ++i) {
        // 计算 M_i = M / m_i
        long long M_i = M / m[i];
        
        // 计算 M_i 在模 m_i 意义下的乘法逆元 t_i
        long long t_i = inv(M_i, m[i]);
        
        // 计算当前项 a_i * M_i * t_i
        // 为了防止中间结果溢出 long long (即使 M_i 和 t_i 都是 long long，它们的乘积也可能溢出)
        // 每次乘法后都对 M 取模，以避免溢出并保持结果在 M 范围内
        // 注意：这里的乘法不能直接 `(a[i] * M_i * t_i) % M`，因为 `a[i] * M_i` 可能先溢出
        // 应该逐次取模：
        long long term = a[i];
        term = (term * M_i) % M; // (a_i * M_i) % M
        term = (term * t_i) % M; // ((a_i * M_i) % M * t_i) % M
        
        // 将当前项累加到总和 ans 中，并对 M 取模
        ans = (ans + term) % M;
    }

    // 确保最终结果是最小非负整数解
    // 因为 ans 可能在计算过程中变为负数 (例如 ans = -1, M = 100，则 ans % M 仍为 -1)
    // 所以需要 (ans % M + M) % M 这样的处理
    return (ans % M + M) % M;
}

// 主函数，用于测试
int main() {
    // 示例 1: 韩信点兵
    // x ≡ 2 (mod 3)
    // x ≡ 3 (mod 5)
    // x ≡ 2 (mod 7)
    int n1 = 3;
    long long a1[] = {2, 3, 2}; // 余数数组
    long long m1[] = {3, 5, 7}; // 模数数组
    long long result1 = chinese_remainder_theorem(n1, a1, m1);
    std::cout << "韩信点兵的最小士兵数是: " << result1 << std::endl; // 预期输出 23

    std::cout << "--------------------" << std::endl;

    // 示例 2: 更多方程组
    // x ≡ 1 (mod 2)
    // x ≡ 2 (mod 3)
    // x ≡ 3 (mod 5)
    // x ≡ 4 (mod 7)
    int n2 = 4;
    long long a2[] = {1, 2, 3, 4};