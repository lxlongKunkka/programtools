# sqrt / pow / abs 的用法

## 教学目标

**知识目标：**
1.  理解平方根、幂（指数）和绝对值的数学概念，并能用生活实例进行解释。
2.  掌握 C++ 中 `sqrt()`、`pow()` 和 `abs()` 函数的基本用法，包括它们所需的头文件、参数类型和返回值类型。
3.  了解 `sqrt()` 和 `pow()` 函数通常返回 `double` 类型的原因，以及进行类型转换的必要性。

**能力目标：**
1.  能够独立运用 `sqrt()`、`pow()` 和 `abs()` 函数解决简单的数学计算问题。
2.  在编写 C++ 程序时，能够正确选择并使用这些数学函数，完成特定的计算任务。
3.  通过调试和测试，发现并修正在使用这些函数时可能出现的类型错误或逻辑错误。

**素养目标：**
1.  培养学生对数学计算和编程的兴趣，体会数学知识在编程中的实际应用。
2.  养成严谨细致的编程习惯，关注数据类型匹配和函数参数要求。
3.  在解决问题的过程中，锻炼逻辑思维能力和问题分析能力。

===NEXT===

## 趣味引入

同学们，大家好！我是你们的编程探险队长！今天我们要去一个充满数字魔力的世界探险。

想象一下，你是一个小小建筑师，接到一个任务：用 16 块正方形地砖铺一个正方形的地面，每块地砖边长是 1 米。那么，这个正方形地面的一条边到底有多长呢？（学生可能会回答：4 米！）

再想象一下，你发现了一种神奇的植物，它每天会分裂成原来的 2 倍！如果一开始只有 1 棵，3 天后会有多少棵呢？（学生可能会计算：1 -> 2 -> 4 -> 8 棵！）

最后，假设你和你的朋友在玩一个寻宝游戏。你的宝藏藏在坐标轴的 -5 位置，你朋友的宝藏藏在 +3 位置。你们想知道两个人宝藏之间的“距离”是多少，但距离总是正的，对不对？我们不在乎谁在左边谁在右边，只关心隔了多少格。

这些问题，在我们的 C++ 编程世界里，都有魔法函数来帮助我们轻松解决！它们就是 `sqrt`、`pow` 和 `abs`！是不是听起来就很有趣？让我们一起揭开它们神秘的面纱吧！

===NEXT===

## 深度知识点讲解

### 1. `sqrt()` - 平方根函数：找回“根”的力量

#### 数学概念：平方与平方根
还记得我们建筑师的故事吗？16 块地砖拼成一个正方形，每边是 4 块。这里的 4 就是 16 的“平方根”。
*   **平方**：一个数乘以它自己，比如 $4 \times 4 = 16$。我们说 4 的平方是 16，记作 $4^2 = 16$。
*   **平方根**：如果 $a \times a = b$，那么 $a$ 就是 $b$ 的平方根。比如 4 是 16 的平方根。
*   生活类比：想象你有一块面积是 36 平方厘米的正方形蛋糕，你想知道它的边长是多少？你需要找到一个数，它自己乘以自己等于 36。答案是 6！所以 6 就是 36 的平方根。`sqrt()` 函数就像一个侦探，专门帮我们找到这个“根”！

#### C++ 用法：`sqrt(x)`
在 C++ 中，`sqrt()` 函数用来计算一个数的平方根。
*   **头文件**：`#include <cmath>` (或者更方便的 `#include <bits/stdc++.h>`，它包含了大部分常用库函数)。
*   **函数原型**：`double sqrt(double x);`
*   **参数**：`x`，一个 `double` 类型的数，表示你要计算平方根的数字。注意：`x` 必须是非负数！如果你给它一个负数，它会得到一个“无意义”的结果（NaN，Not a Number），或者程序报错。
*   **返回值**：计算出的平方根，它是一个 `double` 类型的数。这是因为很多数的平方根都不是整数，比如 2 的平方根约是 1.414。

**为什么返回 `double`？**
想想看，16 的平方根是 4，是整数。但 2 的平方根是多少？1.41421356... 是一个小数。为了能精确表示这些小数，`sqrt()` 函数的设计者就让它返回 `double` 类型，这样就能处理整数和小数两种情况了。

**代码示例：**

```cpp
#include <iostream> // 用于输入输出
#include <cmath>    // 用于sqrt函数，如果使用了<bits/stdc++.h>则可以省略

int main() {
    double a = 16.0;
    double b = sqrt(a); // 计算16的平方根
    std::cout << "16的平方根是: " << b << std::endl; // 输出 4

    double c = 2.0;
    double d = sqrt(c); // 计算2的平方根
    std::cout << "2的平方根是: " << d << std::endl; // 输出 1.41421...

    // 思考：如果想把结果存到int变量里怎么办？
    int e = static_cast<int>(sqrt(25.0)); // 先计算，再强制转换为int
    std::cout << "25的平方根取整数部分是: " << e << std::endl; // 输出 5

    return 0;
}
```

#### 常见误区：
1.  **参数为负数**：`sqrt(-9)` 会得到一个错误的结果。
2.  **返回值类型**：忘记 `sqrt()` 返回的是 `double`，直接赋给 `int` 类型的变量可能会丢失小数部分，或者编译器警告。如果确实需要整数部分，请进行类型转换（如 `static_cast<int>(...)`）。

---

### 2. `pow()` - 幂函数：指数级增长的秘密

#### 数学概念：幂与指数
还记得神奇植物的故事吗？每天分裂成 2 倍。1天后 $1 \times 2 = 2$；2天后 $1 \times 2 \times 2 = 4$；3天后 $1 \times 2 \times 2 \times 2 = 8$。这里的“2倍”重复乘了多少次，就是“指数”。
*   **幂（power）**：$2 \times 2 \times 2$ 可以写成 $2^3$。这里 2 是**底数 (base)**，3 是**指数 (exponent)**。
*   **生活类比**：
    *   **叠罗汉**：想象你叠乐高积木，第一层 1 块，第二层 2 块，第三层 4 块，第四层 8 块... 每一层都是上一层的 2 倍。这就是 2 的幂次增长。
    *   **病毒传播**：一个病毒感染一个人，这个人又感染两个人，这两个人又各感染两个人... 这也是一个指数增长的过程。
    *   `pow()` 函数就像一个超级计算器，能帮我们快速计算底数乘以自己多少次。

#### C++ 用法：`pow(base, exp)`
在 C++ 中，`pow()` 函数用来计算一个数的指定次幂。
*   **头文件**：`#include <cmath>` (或 `#include <bits/stdc++.h>`)。
*   **函数原型**：`double pow(double base, double exp);`
*   **参数**：
    *   `base`：`double` 类型的底数。
    *   `exp`：`double` 类型的指数。指数可以是小数，比如 `pow(8, 1.0/3.0)` 就是计算 8 的立方根。
*   **返回值**：计算出的结果，它是一个 `double` 类型的数。

**为什么返回 `double`？**
和 `sqrt()` 类似，很多幂的计算结果都不是整数，比如 $2^{1.5}$ 就会得到一个小数。为了能处理所有情况，`pow()` 也返回 `double` 类型。

**`pow(a, 2)` 和 `a * a` 的区别？**
*   `a * a` 只能计算平方，简单直接。
*   `pow(a, 2)` 不仅能计算平方，还能计算立方 (`pow(a, 3)`)、四次方甚至小数次方，功能更强大、更通用。当指数不是固定值时，`pow` 函数尤其有用。

**代码示例：**

```cpp
#include <iostream> // 用于输入输出
#include <cmath>    // 用于pow函数

int main() {
    double a = 2.0;
    double b = 3.0;
    double c = pow(a, b); // 计算2的3次方，即 2 * 2 * 2 = 8
    std::cout << "2的3次方是: " << c << std::endl; // 输出 8

    double x = 5.0;
    double y = 2.0;
    double z = pow(x, y); // 计算5的2次方，即 5 * 5 = 25
    std::cout << "5的2次方是: " << z << std::endl; // 输出 25

    // 思考：如果想计算整数的幂，结果想要整数怎么办？
    int m = 10;
    int n = 3;
    // 注意：pow返回double，需要强制转换
    int p = static_cast<int>(pow(m, n)); // 计算10的3次方，1000
    std::cout << "10的3次方取整数部分是: " << p << std::endl; // 输出 1000

    return 0;
}
```

#### 常见误区：
1.  **参数类型**：虽然 `pow(2, 3)` 这样写通常也能工作（编译器会自动将整数转换为 `double`），但最好还是保持参数类型一致，写成 `pow(2.0, 3.0)`。
2.  **返回值类型**：和 `sqrt` 一样，记得 `pow` 返回 `double`。

---

### 3. `abs()` - 绝对值函数：只关心“大小”，不关心“方向”

#### 数学概念：绝对值
还记得寻宝游戏吗？你的宝藏在 -5，朋友的在 +3。我们想知道它们之间隔了多少格，也就是它们的距离。距离永远是正的！从 -5 到 0 有 5 格，从 +3 到 0 有 3 格。
*   **绝对值**：一个数到原点（0）的距离。它表示一个数的大小，不考虑它的正负方向。
*   **表示**：用两根竖线 `| |` 表示，例如 `|-5| = 5`，`|3| = 3`。
*   **生活类比**：
    *   **温度计**：今天温度从 -3 摄氏度升高到 5 摄氏度，温度变化了多少？我们只关心变化的度数，不关心是升高还是降低。`|5 - (-3)| = |8| = 8` 度。
    *   **银行账单**：你欠银行 100 块钱（-100），你朋友有 50 块钱（+50）。虽然一个是负数，一个是正数，但我们说你“有” 100 块钱的债务，朋友“有” 50 块钱的资产。这里“有”多少，就是绝对值的概念。

#### C++ 用法：`abs(x)` / `fabs(x)`
在 C++ 中，`abs()` 函数用来计算一个数的绝对值。
*   **头文件**：
    *   对于 `int` 类型的整数，使用 `#include <cstdlib>`。
    *   对于 `double`、`float` 等浮点数，使用 `#include <cmath>`。
    *   当然，`#include <bits/stdc++.h>` 是“万能头文件”，包含了它们。
*   **函数原型**：
    *   `int abs(int x);` // 用于 `int` 类型
    *   `long abs(long x);` // 用于 `long` 类型
    *   `long long abs(long long x);` // 用于 `long long` 类型
    *   `double fabs(double x);` // 用于 `double` 类型 (注意是 `fabs` 而不是 `abs`)
    *   `float fabsf(float x);` // 用于 `float` 类型
    *   **小贴士**：在实际编程中，如果你使用 `bits/stdc++.h`，直接写 `abs()` 往往也能处理 `double` 类型，编译器会根据参数类型自动选择合适的版本。但为了严谨，对于 `double` 类型，推荐使用 `fabs()`。

*   **参数**：`x`，可以是 `int`、`long`、`double` 等类型。
*   **返回值**：计算出的绝对值，返回值类型与参数类型相同。

**代码示例：**

```cpp
#include <iostream> // 用于输入输出
#include <cstdlib>  // 用于int类型的abs函数
#include <cmath>    // 用于double类型的fabs函数

int main() {
    int a = -10;
    int b = abs(a); // 计算-10的绝对值
    std::cout << "-10的绝对值是: " << b << std::endl; // 输出 10

    int c = 5;
    int d = abs(c); // 计算5的绝对值
    std::cout << "5的绝对值是: " << d << std::endl; // 输出 5

    double x = -3.14;
    double y = fabs(x); // 计算-3.14的绝对值
    std::cout << "-3.14的绝对值是: " << y << std::endl; // 输出 3.14

    double m = 7.89;
    double n = fabs(m); // 计算7.89的绝对值
    std::cout << "7.89的绝对值是: " << n << std::endl; // 输出 7.89

    return 0;
}
```

#### 常见误区：
1.  **忘记 `fabs()`**：对于 `double` 类型，虽然 `abs()` 可能也能用，但 `fabs()` 是更标准和明确的选择。
2.  **返回值类型**：`abs()` 和 `fabs()` 的返回值类型会和参数类型保持一致，这一点要记住。

---

**总结一下：**
*   `sqrt(x)`：求 `x` 的平方根，返回 `double`。
*   `pow(base, exp)`：求 `base` 的 `exp` 次幂，返回 `double`。
*   `abs(x)`：求 `x` 的绝对值，返回类型与 `x` 相同。
*   `fabs(x)`：求 `double` 类型 `x` 的绝对值，返回 `double`。
*   它们都在 `<cmath>` 或 `<cstdlib>` (整数 `abs`) 中，或者直接 `#include <bits/stdc++.h>`。

===NEXT===

## 典型例题精讲

### 例题一：正方形花园的周长

**题目描述：**
小明家有一块正方形花园，它的面积是 `S` 平方米。小明想用篱笆把花园围起来，请你帮他计算一下，一共需要多长的篱笆？（篱笆长度就是花园的周长）

**输入：**
一个 `double` 类型的数 `S` (0 < S <= 1000)，表示花园的面积。

**输出：**
一个 `double` 类型的数，表示花园的周长，保留两位小数。

**思路分析：**
1.  **理解问题**：要求计算正方形的周长。周长公式是：`边长 × 4`。
2.  **已知条件**：正方形的面积 `S`。
3.  **如何求边长**：正方形的面积 `S = 边长 × 边长`。所以，边长就是面积 `S` 的平方根！
4.  **使用函数**：我们需要 `sqrt()` 函数来计算边长。
5.  **数据类型**：面积 `S` 是 `double`，`sqrt()` 返回 `double`，周长也应该是 `double`。
6.  **保留小数**：输出时需要保留两位小数，可以使用 `std::fixed` 和 `std::setprecision(2)`。

**C++ 代码：**

```cpp
#include <iostream> // 用于输入输出
#include <cmath>    // 用于sqrt函数
#include <iomanip>  // 用于setprecision

int main() {
    double s; // 声明一个double变量s，用于存储面积
    std::cin >> s; // 从键盘读取面积

    double side = sqrt(s); // 计算边长，边长是面积的平方根
    double perimeter = 4.0 * side; // 计算周长，周长是边长的4倍

    // 设置输出格式：固定小数点，保留两位小数
    std::cout << std::fixed << std::setprecision(2) << perimeter << std::endl;

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度**：O(1)。因为 `sqrt()` 函数的计算时间是固定的，不随输入 `S` 的大小而显著变化。
*   **空间复杂度**：O(1)。只使用了常数个变量。

---

### 例题二：病毒传播模拟

**题目描述：**
假设某种病毒的传播速度非常快，每过一个小时，被感染的人数就会变成原来的 `K` 倍。如果一开始有 `P` 个人被感染，请问 `H` 小时后，总共有多少人被感染？（结果可能非常大，请用 `double` 类型表示）

**输入：**
三个 `double` 类型的数：`P` (初始感染人数), `K` (传播倍数), `H` (小时数)。
(1 <= P, K <= 100, 0 <= H <= 10)

**输出：**
一个 `double` 类型的数，表示 `H` 小时后的感染总人数，保留一位小数。

**思路分析：**
1.  **理解问题**：计算 `P` 乘以 `K` 的 `H` 次方。
2.  **数学模型**：`最终人数 = P * K^H`。
3.  **使用函数**：`K^H` 正好是 `K` 的 `H` 次幂，可以使用 `pow()` 函数。
4.  **数据类型**：`P`, `K`, `H` 都是 `double`，`pow()` 返回 `double`，最终结果也应该是 `double`。
5.  **保留小数**：输出时需要保留一位小数。

**C++ 代码：**

```cpp
#include <iostream> // 用于输入输出
#include <cmath>    // 用于pow函数
#include <iomanip>  // 用于setprecision

int main() {
    double p, k, h; // 声明三个double变量
    std::cin >> p >> k >> h; // 从键盘读取初始人数、倍数、小时数

    // 计算K的H次方，即传播倍数K经过H小时后的总倍数
    double total_multiplier = pow(k, h); 
    // 初始人数乘以总倍数，得到最终感染人数
    double final_infected = p * total_multiplier; 

    // 设置输出格式：固定小数点，保留一位小数
    std::cout << std::fixed << std::setprecision(1) << final_infected << std::endl;

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度**：O(1)。`pow()` 函数的计算时间是固定的。
*   **空间复杂度**：O(1)。只使用了常数个变量。

---

### 例题三：计算两个整数之间的距离

**题目描述：**
在一条直线上，有两个物体分别位于整数坐标 `x1` 和 `x2` 上。请你计算它们之间的距离是多少？（距离总是非负数）

**输入：**
两个 `int` 类型的整数 `x1` 和 `x2` (-100 <= x1, x2 <= 100)。

**输出：**
一个 `int` 类型的整数，表示它们之间的距离。

**思路分析：**
1.  **理解问题**：计算两个整数坐标之间的距离。
2.  **数学模型**：距离是 `|x1 - x2|` 或者 `|x2 - x1|`。因为距离不能是负数，所以需要取绝对值。
3.  **使用函数**：我们需要 `abs()` 函数来计算绝对值。
4.  **数据类型**：`x1`, `x2` 是 `int`，`abs()` 返回 `int`，最终结果也应该是 `int`。

**C++ 代码：**

```cpp
#include <iostream> // 用于输入输出
#include <cstdlib>  // 用于int类型的abs函数

int main() {
    int x1, x2; // 声明两个int变量
    std::cin >> x1 >> x2; // 从键盘读取两个坐标

    // 计算两个坐标的差值，然后取绝对值
    int distance = abs(x1 - x2); 

    std::cout << distance << std::endl; // 输出距离

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度**：O(1)。`abs()` 函数的计算时间是固定的。
*   **空间复杂度**：O(1)。只使用了常数个变量。

===NEXT===

## 代码实现模板

下面是一个包含了 `sqrt()`、`pow()` 和 `abs()` (以及 `fabs()`) 函数基本用法的 C++ 程序模板。你可以用这个模板来测试和练习这些函数。

```cpp
#include <iostream> // 输入输出流
#include <cmath>    // 包含了数学函数，如sqrt, pow, fabs
#include <cstdlib>  // 包含了整数绝对值函数abs
#include <iomanip>  // 用于格式化输出，如setprecision

int main() {
    // --- 1. sqrt() 函数示例 ---
    std::cout << "--- sqrt() 平方根函数 ---" << std::endl;
    double n1 = 36.0;
    double r1 = sqrt(n1); // 计算36的平方根
    std::cout << n1 << " 的平方根是: " << r1 << std::endl; // 输出 6

    double n2 = 10.0;
    double r2 = sqrt(n2); // 计算10的平方根，通常是小数
    std::cout << n2 << " 的平方根是: " << std::fixed << std::setprecision(4) << r2 << std::endl; // 输出 3.1623

    // 注意：sqrt返回double，如果赋值给int需要强制类型转换
    int n3 = 81;
    int r3 = static_cast<int>(sqrt(static_cast<double>(n3))); // 先将n3转double，再计算，再转int
    std::cout << n3 << " 的平方根取整数部分是: " << r3 << std::endl; // 输出 9
    std::cout << std::endl; // 空一行

    // --- 2. pow() 幂函数示例 ---
    std::cout << "--- pow() 幂函数 ---" << std::endl;
    double base1 = 2.0;
    double exp1 = 4.0;
    double p1 = pow(base1, exp1); // 计算2的4次方
    std::cout << base1 << " 的 " << exp1 << " 次方是: " << p1 << std::endl; // 输出 16

    double base2 = 3.0;
    double exp2 = 0.5; // 0.5 次方就是开平方根
    double p2 = pow(base2, exp2); // 计算3的0.5次方，即sqrt(3)
    std::cout << base2 << " 的 " << exp2 << " 次方是: " << std::fixed << std::setprecision(4) << p2 << std::endl; // 输出 1.7321

    // 注意：pow返回double，如果赋值给int需要强制类型转换
    int base3 = 5;
    int exp3 = 3;
    int p3 = static_cast<int>(pow(static_cast<double>(base3), static_cast<double>(exp3))); // 计算5的3次方
    std::cout << base3 << " 的 " << exp3 << " 次方取整数部分是: " << p3 << std::endl; // 输出 125
    std::cout << std::endl; // 空一行

    // --- 3. abs() 和 fabs() 绝对值函数示例 ---
    std::cout << "--- abs() 和 fabs() 绝对值函数 ---" << std::endl;
    int i1 = -7;
    int abs_i1 = abs(i1); // 计算整数-7的绝对值
    std::cout << i1 << " 的绝对值是: " << abs_i1 << std::endl; // 输出 7

    int i2 = 12;
    int abs_i2 = abs(i2); // 计算整数12的绝对值
    std::cout << i2 << " 的绝对值是: " << abs_i2 << std::endl; // 输出 12

    double d1 = -9.876;
    double abs_d1 = fabs(d1); // 计算浮点数-9.876的绝对值
    std::cout << d1 << " 的绝对值是: " << std::fixed << std::setprecision(3) << abs_d1 << std::endl; // 输出 9.876

    double d2 = 0.0;
    double abs_d2 = fabs(d2); // 计算浮点数0.0的绝对值
    std::cout << d2 << " 的绝对值是: " << abs_d2 << std::endl; // 输出 0
    std::cout << std::endl; // 空一行

    return 0; // 程序正常结束
}
```

**关键点总结：**
*   **头文件**：虽然 `bits/stdc++.h` 很好用，但知道 `cmath` 和 `cstdlib` 的作用更重要。
*   **参数类型**：`sqrt` 和 `pow` 通常接受 `double` 类型的参数。`abs` 有多个重载版本，可以处理 `int`, `long` 等，`fabs` 处理 `double`。
*   **返回值类型**：`sqrt` 和 `pow` 返回 `double`。`abs` 和 `fabs` 返回类型与参数类型相同。
*   **类型转换**：当函数的 `double` 返回值需要赋值给 `int` 变量时，务必进行显式的类型转换（`static_cast<int>(...)`），否则可能导致数据丢失或编译警告。

===NEXT===

## 课堂互动

**1. 思考题 (个人思考与举手回答):**
*   **问题1**：如果我想计算 49 的平方根，我会用哪个函数？它的结果会是整数还是小数？
    *   *(提示：`sqrt(49.0)`，结果是 `7.0`，虽然是整数但类型是 `double`)*
*   **问题2**：如果我想计算 3 的 4 次方（$3^4$），我应该用哪个函数？它的两个参数分别是什么？
    *   *(提示：`pow(3.0, 4.0)`，参数是底数和指数)*
*   **问题3**：`abs(-100)` 和 `fabs(-100.0)` 的结果有什么区别？
    *   *(提示：结果都是 100，但类型分别是 `int` 和 `double`)*
*   **问题4**：如果我写 `int a = sqrt(10);` 可能会有什么问题？我应该怎么修改它？
    *   *(提示：`sqrt(10)` 返回 `double`，赋值给 `int` 会丢失小数部分。应改为 `int a = static_cast<int>(sqrt(10.0));`)*

**2. 小组讨论与任务 (5-8分钟):**
*   **任务**：请以小组为单位，设计一个简单的生活场景问题，并思考如何使用 `sqrt`、`pow` 或 `abs` 中的一个或多个函数来解决。
    *   例如：
        *   “计算一个圆形披萨的半径，如果只知道它的面积。” (需要 `sqrt`)
        *   “计算银行里钱的增长，如果每年翻倍，N 年后有多少？” (需要 `pow`)
        *   “两个人分数相差多少，只看差距大小？” (需要 `abs`)
*   **要求**：每个小组派代表上台，简述问题和解决思路。

**3. 即时练习 (笔头或口头计算):**
*   请快速计算出以下表达式的结果：
    *   `sqrt(100.0)`
    *   `pow(5.0, 2.0)`
    *   `abs(-20)`
    *   `fabs(-7.5)`
    *   `static_cast<int>(sqrt(64.0))`
    *   `static_cast<int>(pow(2.0, 5.0))`

===NEXT===

## 分层练习题目

**【基础巩固】**

1.  **计算圆的面积**：输入一个圆的半径 `r`（`double` 类型），请计算并输出它的面积。圆周率 `PI` 取 3.14159。
    *   提示：圆面积公式 `S = PI * r^2`。
    *   输入示例：`3.0`
    *   输出示例：`28.27431` (保留5位小数)

2.  **两点距离**：输入两个整数 `a` 和 `b`，请计算并输出它们之间距离的平方（即 `(a-b)^2`）。
    *   输入示例：`5 8`
    *   输出示例：`9`

3.  **温度变化**：某地今天的最高温度是 `t1` 摄氏度，最低温度是 `t2` 摄氏度。请计算并输出今天的温差（即最高温度减去最低温度的绝对值）。
    *   输入示例：`10 -5`
    *   输出示例：`15`

**【能力提升】**

4.  **直角三角形的斜边**：输入直角三角形的两条直角边 `a` 和 `b`（`double` 类型），请计算并输出斜边 `c` 的长度。
    *   提示：勾股定理 `a^2 + b^2 = c^2`，所以 `c = sqrt(a^2 + b^2)`。
    *   输入示例：`3.0 4.0`
    *   输出示例：`5.00` (保留2位小数)

5.  **复利计算**：小明在银行存入 `P` 元钱，年利率为 `R`（例如 0.05 代表 5%），存期为 `N` 年。请计算 `N` 年后，小明的本金和利息总共有多少钱？
    *   提示：复利公式 `总金额 = P * (1 + R)^N`。
    *   输入示例：`1000 0.05 2`
    *   输出示例：`1102.50` (保留2位小数)

**【拓展挑战】**

6.  **点到原点距离的整数部分**：输入一个点的坐标 `(x, y)`，其中 `x` 和 `y` 都是 `int` 类型。请计算该点到坐标原点 `(0, 0)` 的距离，并输出其整数部分。
    *   提示：两点距离公式 `dist = sqrt(x^2 + y^2)`。
    *   输入示例：`3 4`
    *   输出示例：`5`
    *   输入示例：`1 1`
    *   输出示例：`1` (因为 `sqrt(1^2+1^2) = sqrt(2)` 约等于 1.414，整数部分是 1)

---

**【参考答案】**

**基础巩固**
1.  ```cpp
    #include <iostream>
    #include <cmath>
    #include <iomanip>
    int main() {
        double r;
        std::cin >> r;
        double pi = 3.14159;
        double area = pi * pow(r, 2.0); // 或者 pi * r * r;
        std::cout << std::fixed << std::setprecision(5) << area << std::endl;
        return 0;
    }
    ```
2.  ```cpp
    #include <iostream>
    #include <cmath> // abs() for int is in cstdlib, but cmath also works or bits/stdc++.h
    #include <cstdlib> // For int abs()
    int main() {
        int a, b;
        std::cin >> a >> b;
        int diff = abs(a - b);
        int result = diff * diff; // 或者 pow(static_cast<double>(diff), 2.0) 然后转int
        std::cout << result << std::endl;
        return 0;
    }
    ```
3.  ```cpp
    #include <iostream>
    #include <cstdlib>
    int main() {
        int t1, t2;
        std::cin >> t1 >> t2;
        int diff = abs(t1 - t2);
        std::cout << diff << std::endl;
        return 0;
    }
    ```

**能力提升**
4.  ```cpp
    #include <iostream>
    #include <cmath>
    #include <iomanip>
    int main() {
        double a, b;
        std::cin >> a >> b;
        double c_squared = pow(a, 2.0) + pow(b, 2.0); // 计算a方加b方
        double c = sqrt(c_squared); // 计算斜边c
        std::cout << std::fixed << std::setprecision(2) << c << std::endl;
        return 0;
    }
    ```
5.  ```cpp
    #include <iostream>
    #include <cmath>
    #include <iomanip>
    int main() {
        double p, r;
        int n; // N是整数
        std::cin >> p >> r >> n;
        double total_amount = p * pow(1.0 + r, static_cast<double>(n)); // 注意n需要转double
        std::cout << std::fixed << std::setprecision(2) << total_amount << std::endl;
        return 0;
    }
    ```

**拓展挑战**
6.  ```cpp
    #include <iostream>
    #include <cmath>
    int main() {
        int x, y;
        std::cin >> x >> y;
        // 计算x方加y方
        double sum_of_squares = pow(static_cast<double>(x), 2.0) + pow(static_cast<double>(y), 2.0);
        // 计算距离
        double distance = sqrt(sum_of_squares);
        // 输出整数部分
        int int_distance = static_cast<int>(distance);
        std::cout << int_distance << std::endl;
        return 0;
    }
    ```

===NEXT===

## 教学评价与作业

**教学评价：**
1.  **课堂参与度**：学生在趣味引入、思考题和小组讨论环节的参与积极性。
2.  **知识掌握度**：通过即时练习和课堂提问，评估学生对 `sqrt`、`pow`、`abs` 函数概念和用法的理解程度。
3.  **编程实践能力**：观察学生在典型例题精讲和分层练习中编写代码的正确性、规范性以及独立解决问题的能力。
4.  **问题解决思路**：学生在小组任务中分析问题、设计解决方案的逻辑思维能力。

**家庭作业：**
1.  **编程练习**：完成分层练习题目中所有【基础巩固】和【能力提升】的题目，并提交代码。
2.  **思考与拓展**：
    *   查阅资料，了解 `sqrt()` 函数除了 `double` 类型参数外，是否还有其他类型的重载（例如 `float` 或 `long double`）？
    *   尝试使用 `pow()` 函数计算一个数的立方根（例如计算 27 的立方根）。
    *   思考在哪些生活场景中，你还会用到绝对值来解决问题？请举出至少两个例子。
3.  **预习任务**：预习 C++ 中的 `round()`, `floor()`, `ceil()` 等舍入函数，思考它们与我们今天学到的函数有什么不同。

通过本次课程，希望同学们不仅掌握了 `sqrt`、`pow`、`abs` 这三个强大的数学函数，更能体会到编程与数学的紧密联系，在数字世界中开启更多有趣的探险！