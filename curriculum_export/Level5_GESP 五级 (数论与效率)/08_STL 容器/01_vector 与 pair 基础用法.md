# vector 与 pair 基础用法

---

> **章节 ID：** `5-8-1`  
> **所属专题：** 专题 8 — STL 容器  
> **所属等级：** Level 5 — GESP 五级 (数论与效率)

## 教案内容

## 教学目标

亲爱的编程小探险家们，今天我们要去探索C++编程世界里两个非常方便的“魔术工具”——`vector`（动态数组）和`pair`（配对数据）。它们能让我们的编程变得更灵活、更高效！

**特别提醒：** 虽然`vector`和`pair`在实际编程和高级竞赛中非常常用，但根据GESP 1-5级的考试规定，**严禁使用STL容器（包括`vector`、`stack`、`queue`等），必须使用原生数组**。今天我们学习它们，是为了开阔眼界，为将来的学习打下基础，但在GESP 1-5级考试中，大家一定要使用原生数组来解决问题哦！我会同时讲解用原生数组如何实现类似功能。

### 知识目标
1.  **理解 `vector` 的概念与优势**：理解 `vector` 是一种可以自动调整大小的动态数组，能够克服原生数组大小固定的局限性。
2.  **掌握 `vector` 的基本操作**：学会如何声明 `vector`、添加元素 (`push_back`)、访问元素 (`[]` 或 `at()`)、获取大小 (`size()`) 和清空 (`clear()`)。
3.  **理解 `pair` 的概念与用途**：理解 `pair` 是一种能将两个不同（或相同）类型的数据组合在一起的结构体。
4.  **掌握 `pair` 的基本操作**：学会如何声明 `pair`、创建 `pair` (`make_pair` 或 `{}`) 以及访问 `pair` 的元素 (`first` 和 `second`)。

### 能力目标
1.  **灵活选择数据结构**：在需要存储不确定数量数据时，能够想到使用 `vector`（或用原生数组模拟）。
2.  **高效组织关联数据**：在需要将两个相关联的数据作为一个整体处理时，能够使用 `pair`（或用两个数组/结构体模拟）。
3.  **解决实际问题**：能够运用 `vector` 和 `pair`（或其原生数组替代方案）解决简单的编程问题，如存储一系列数据并进行处理。

### 素养目标
1.  **提升编程兴趣**：通过学习方便强大的STL工具，激发对C++编程更深层次的兴趣。
2.  **培养解决问题思维**：认识到不同工具有不同的适用场景，学会分析问题，选择或设计合适的数据组织方式。
3.  **遵循考试规范**：理解并记住GESP考试的特定要求，做到在学习新知识的同时，也能应对考试规则。

===NEXT===

## 趣味引入

同学们，想象一下，我们现在要整理一大堆玩具！

我们以前学过的**原生数组**，就像一个**固定大小的玩具箱**。比如，你有一个只能装10个玩具的箱子，如果你有12个玩具，就装不下了；如果你只有5个玩具，那箱子里还有一半是空的，有点浪费空间。是不是有点不方便？

那如果有一种**“魔术收纳箱”**呢？它能根据你玩具的数量，自动变大或变小！如果你有10个玩具，它就变成10个格子的箱子；如果你又买来5个新玩具，它就自动变成15个格子的箱子，一个不多，一个不少！是不是很酷？这个“魔术收纳箱”在C++里，就叫做 **`vector`**！

再来一个场景。你和你的好朋友小明一起去参加一个寻宝游戏。每次找到一个宝藏，都会得到**“宝藏的名字”**和**“宝藏的价值”**两样东西。这两样东西总是形影不离，它们是一对儿！你希望把它们一起记录下来，而不是把所有宝藏的名字写在一张纸上，所有宝藏的价值写在另一张纸上，那样多容易搞混啊！在C++里，我们有一个叫做 **`pair`** 的小工具，就能把这两个形影不离的数据打包在一起，就像一个“双胞胎盒子”！

今天，我们就来揭开`vector`和`pair`的神秘面纱，看看它们如何让我们的编程生活变得更美好！

**不过，别忘了！** 就像前面说的，在GESP 1-5级的考试中，这些“魔术工具”是不能直接用的。考试时，我们需要用我们以前学的“固定玩具箱”（原生数组）和一些巧妙的方法，来模拟出“魔术收纳箱”和“双胞胎盒子”的效果。但先学会它们，能帮助我们更好地理解编程思想，将来在高阶学习中大放异彩！

===NEXT===

## 深度知识点讲解

### 1. `vector`：会变大的“魔术收纳箱”

#### 1.1 什么是 `vector`？
`vector` 是 C++ 标准模板库 (STL) 中的一个容器，它实现了一个**动态数组**。这意味着，与传统数组（固定大小）不同，`vector` 的大小可以在运行时（程序执行时）根据需要自动增长或缩小。当 `vector` 空间不足时，它会自动分配一个更大的内存块，并将现有元素复制过去，然后释放旧内存。

#### 1.2 `vector` 的本质与优势
*   **本质**：`vector` 在底层仍然是使用**原生数组**来实现的。只不过，它帮你管理了数组的内存分配、扩容、数据搬运这些复杂的工作，让你用起来感觉它像一个“无限大”的数组。
*   **生活类比**：
    *   **伸缩自如的收纳盒**：你往里面放东西，盒子会自动变大；你拿走东西，盒子会合理地调整大小（虽然不一定马上变小，但会管理好空间）。
    *   **排队等候的队伍**：队伍的人数不是固定的，新人来了就排到队尾，有人离开队伍就少一个人。`vector` 就像这样一个灵活的队伍。
*   **优势**：
    1.  **动态大小**：无需在编译时确定大小，可以根据程序运行情况动态调整。
    2.  **方便操作**：提供了许多便捷的成员函数，如添加元素、获取大小、清空等。
    3.  **随机访问**：和原生数组一样，可以通过下标 `[]` 在常数时间 O(1) 内访问任意位置的元素。

#### 1.3 `vector` 的基本用法

要使用 `vector`，首先需要包含头文件 `#include <vector>`。

```cpp
#include <iostream> // 输入输出
#include <vector>   // vector 的头文件
#include <string>   // 可能会用到字符串

int main() {
    // 1. 声明一个 vector
    // 声明一个存储整数的 vector，名字叫 v
    std::vector<int> v; 
    // 声明一个存储字符串的 vector，名字叫 names
    std::vector<std::string> names; 

    // 2. 添加元素 (push_back)：把新元素放到 vector 的末尾
    std::cout << "--- 添加元素 ---" << std::endl;
    v.push_back(10); // v: [10]
    v.push_back(20); // v: [10, 20]
    v.push_back(30); // v: [10, 20, 30]
    std::cout << "v 中添加了 10, 20, 30" << std::endl;

    names.push_back("Alice");
    names.push_back("Bob");
    std::cout << "names 中添加了 Alice, Bob" << std::endl;

    // 3. 获取 vector 的大小 (size())：里面有多少个元素
    std::cout << "--- 获取大小 ---" << std::endl;
    std::cout << "v 的大小: " << v.size() << std::endl;       // 输出 3
    std::cout << "names 的大小: " << names.size() << std::endl; // 输出 2

    // 4. 访问元素：和数组一样用下标 []，或者用 at()
    // 注意：vector 的下标也是从 0 开始的！
    std::cout << "--- 访问元素 ---" << std::endl;
    std::cout << "v 的第一个元素 (下标 0): " << v[0] << std::endl; // 输出 10
    std::cout << "v 的第二个元素 (下标 1): " << v.at(1) << std::endl; // 输出 20 (at() 会检查下标是否越界)

    std::cout << "names 的第一个元素: " << names[0] << std::endl; // 输出 Alice

    // 5. 遍历 vector：用循环访问所有元素
    std::cout << "--- 遍历 v 中的所有元素 ---" << std::endl;
    for (int i = 0; i < v.size(); ++i) {
        std::cout << v[i] << " ";
    }
    std::cout << std::endl;

    // C++11 之后更简洁的遍历方式 (范围for循环)
    std::cout << "--- 再次遍历 names 中的所有元素 (范围for) ---" << std::endl;
    for (const std::string& name : names) { // 推荐用 const & 避免复制和修改
        std::cout << name << " ";
    }
    std::cout << std::endl;

    // 6. 清空 vector (clear())：把所有元素都移除，大小变为 0
    std::cout << "--- 清空 vector ---" << std::endl;
    v.clear();
    std::cout << "清空后 v 的大小: " << v.size() << std::endl; // 输出 0

    return 0;
}
```

#### 1.4 GESP 1-5 考试替代方案：原生数组模拟 `vector`
在 GESP 1-5 考试中，我们不能直接使用 `vector`。但我们可以用一个**足够大的原生数组**和一个**计数器变量**来模拟 `vector` 的 `push_back` 和 `size` 功能。

```cpp
#include <iostream>

const int MAXN = 1005; // 定义一个足够大的数组最大容量，例如 1005

int a[MAXN]; // 原生数组，用于存储数据
int cnt = 0; // 计数器，表示当前数组中有多少个元素，模拟 vector 的 size()

int main() {
    // 模拟 push_back
    std::cout << "--- 原生数组模拟 vector ---" << std::endl;
    a[cnt++] = 10; // 存入 10，然后 cnt 变成 1
    a[cnt++] = 20; // 存入 20，然后 cnt 变成 2
    a[cnt++] = 30; // 存入 30，然后 cnt 变成 3
    std::cout << "模拟添加了 10, 20, 30" << std::endl;

    // 模拟 size()
    std::cout << "模拟数组的大小: " << cnt << std::endl; // 输出 3

    // 访问元素 (和 vector 一样用下标)
    std::cout << "模拟数组的第一个元素: " << a[0] << std::endl; // 输出 10

    // 遍历元素 (用 cnt 作为循环上限)
    std::cout << "遍历模拟数组中的所有元素: " << std::endl;
    for (int i = 0; i < cnt; ++i) {
        std::cout << a[i] << " ";
    }
    std::cout << std::endl;

    // 模拟 clear()
    cnt = 0; // 只需要将计数器清零，逻辑上就认为数组空了
    std::cout << "模拟清空后的大小: " << cnt << std::endl; // 输出 0

    return 0;
}
```
**小结：** 只要我们维护好 `cnt` 这个变量，它就是我们数组的“实际大小”，通过 `a[cnt++] = value` 就可以实现向“动态数组”末尾添加元素的效果。

### 2. `pair`：形影不离的“双胞胎盒子”

#### 2.1 什么是 `pair`？
`pair` 是 C++ 标准库中的一个简单模板类，它允许你将**两个不同类型（或相同类型）的值组合成一个单一的对象**。它就像一个迷你结构体，但你不需要为它定义一个新类型。

#### 2.2 `pair` 的本质与优势
*   **本质**：`pair` 的底层实现就是一个简单的结构体，里面有两个成员变量，通常叫做 `first` 和 `second`。
*   **生活类比**：
    *   **钥匙和锁**：它们总是配套出现。
    *   **学生和分数**：一个学生对应一个分数。
    *   **坐标点 (x, y)**：一个点由横坐标和纵坐标组成。
*   **优势**：
    1.  **方便快捷**：不需要像 `struct` 那样提前定义类型，可以直接使用。
    2.  **打包数据**：将两个相关数据作为一个整体进行传递或存储，避免了参数过多或数据混乱。

#### 2.3 `pair` 的基本用法

要使用 `pair`，通常包含头文件 `#include <utility>`，但如果你使用了 `<bits/stdc++.h>`，它也已经被包含了。

```cpp
#include <iostream>
#include <utility>  // pair 的头文件
#include <string>

int main() {
    // 1. 声明一个 pair
    // 声明一个 pair，第一个元素是 int 类型，第二个元素是 string 类型
    std::pair<int, std::string> student; 
    // 声明一个 pair，两个元素都是 double 类型
    std::pair<double, double> point;

    // 2. 初始化/赋值 pair
    // 方式一：直接赋值给 first 和 second
    student.first = 101;
    student.second = "小明";
    std::cout << "学生信息: 学号 " << student.first << ", 姓名 " << student.second << std::endl;

    // 方式二：使用大括号初始化 (C++11 以后)
    std::pair<int, double> item = {1001, 19.99}; // 商品编号和价格
    std::cout << "商品信息: 编号 " << item.first << ", 价格 " << item.second << std::endl;

    // 方式三：使用 make_pair 函数 (更通用)
    point = std::make_pair(3.14, 2.71); // 坐标 (x, y)
    std::cout << "坐标点: (" << point.first << ", " << point.second << ")" << std::endl;

    // 3. 访问 pair 的元素
    // 通过 .first 访问第一个元素，通过 .second 访问第二个元素
    std::cout << "小明的学号是: " << student.first << std::endl;
    std::cout << "小明的姓名是: " << student.second << std::endl;

    // pair 还可以作为 vector 的元素
    std::vector<std::pair<std::string, int>> scores; // 存储学生姓名和分数
    scores.push_back({"Alice", 95}); // C++11 列表初始化
    scores.push_back(std::make_pair("Bob", 88));
    scores.push_back({"Charlie", 92});

    std::cout << "--- 遍历学生分数 ---" << std::endl;
    for (const auto& s : scores) { // auto 自动推断类型为 std::pair<std::string, int>
        std::cout << "姓名: " << s.first << ", 分数: " << s.second << std::endl;
    }

    return 0;
}
```

#### 2.4 GESP 1-5 考试替代方案：两个原生数组或自定义结构体
在 GESP 1-5 考试中，我们不能直接使用 `pair`。我们可以用以下两种方式实现类似功能：

1.  **使用两个独立的数组**：
    如果需要存储 N 对数据，可以声明两个大小为 N 的数组，一个存储 `first` 元素，一个存储 `second` 元素。通过相同的下标来关联它们。

    ```cpp
    #include <iostream>
    #include <string>

    const int MAXN = 1005; // 最大学生数量

    std::string names[MAXN]; // 存储学生姓名
    int scores[MAXN];        // 存储学生分数
    int student_count = 0;   // 当前学生数量

    int main() {
        std::cout << "--- 原生数组模拟 pair ---" << std::endl;
        // 添加学生信息
        names[student_count] = "Alice";
        scores[student_count] = 95;
        student_count++;

        names[student_count] = "Bob";
        scores[student_count] = 88;
        student_count++;

        names[student_count] = "Charlie";
        scores[student_count] = 92;
        student_count++;

        std::cout << "--- 遍历学生分数 ---" << std::endl;
        for (int i = 0; i < student_count; ++i) {
            std::cout << "姓名: " << names[i] << ", 分数: " << scores[i] << std::endl;
        }
        return 0;
    }
    ```

2.  **自定义结构体 (struct)**：
    这是更接近 `pair` 思想的替代方案，也更推荐。你可以定义一个自己的结构体来打包相关数据。

    ```cpp
    #include <iostream>
    #include <string>

    // 定义一个结构体来存储学生信息
    struct StudentInfo {
        std::string name;
        int score;
    };

    const int MAXN = 1005;
    StudentInfo students[MAXN]; // 声明一个结构体数组
    int student_count = 0;      // 计数器

    int main() {
        std::cout << "--- 自定义结构体模拟 pair ---" << std::endl;
        // 添加学生信息
        students[student_count].name = "Alice";
        students[student_count].score = 95;
        student_count++;

        students[student_count] = {"Bob", 88}; // C++11 结构体初始化
        student_count++;

        students[student_count].name = "Charlie";
        students[student_count].score = 92;
        student_count++;

        std::cout << "--- 遍历学生分数 ---" << std::endl;
        for (int i = 0; i < student_count; ++i) {
            std::cout << "姓名: " << students[i].name << ", 分数: " << students[i].score << std::endl;
        }
        return 0;
    }
    ```
    **小结：** `struct` 是 `pair` 的“升级版”，它能存储更多种类、更多数量的数据，并且给每个数据起了更有意义的名字。在 GESP 考试中，`struct` 是被允许使用的，也是组织复杂数据的最佳方式。

### 常见误区
*   **`vector` 越界访问**：虽然 `vector` 是动态的，但你仍然不能访问超出其当前大小的索引。例如，一个大小为3的 `vector`，你不能访问 `v[3]` 或 `v[4]`。使用 `at()` 函数会抛出异常，而 `[]` 则会造成未定义行为。
*   **`vector` 尺寸与容量**：`size()` 返回的是 `vector` 中元素的数量，而 `capacity()` 返回的是 `vector` 当前分配的内存能容纳多少个元素。`capacity()` 总是大于等于 `size()`。在 GESP 1-5 考试中，我们模拟时只关注 `cnt` (即 `size`)。
*   **`pair` 成员名记错**：`pair` 的成员是 `first` 和 `second`，而不是 `value1` 或 `item1` 等。
*   **GESP 考试中误用 STL**：这是最大的误区！一定要记住考试规则，避免不必要的失分。

===NEXT===

## 典型例题精讲

**再次提醒：** 下面例题会给出`vector`和`pair`的解法，同时会给出GESP 1-5兼容的**原生数组/结构体**解法。请大家务必掌握原生解法！

### 例题 1: 收集神秘数字

**题目描述：**
小明在森林里探险，发现了一些神秘的数字。他不知道会发现多少个数字，可能是0个，也可能是很多个。请你编写一个程序，帮助小明把所有发现的数字记录下来，并按照发现的顺序输出。当输入数字 -1 时表示结束（-1 不记录也不输出）。

**输入示例：**
`10 20 5 15 -1`

**输出示例：**
`10 20 5 15`

#### 思路分析

1.  **数据数量不确定**：这是最关键的信息。我们需要一个可以动态调整大小的数据结构。
    *   **STL `vector` 解法**：直接使用 `vector<int>`，每次读入一个数字就 `push_back` 到 `vector` 中。
    *   **GESP 1-5 兼容解法**：使用一个足够大的原生数组 `int a[MAXN]` 和一个计数器 `int cnt`。每次读入数字，就把它放到 `a[cnt]`，然后 `cnt` 加一。

2.  **输入结束标志**：输入 -1 时结束。这需要一个 `while` 循环来不断读取输入，直到读到 -1。

3.  **按顺序输出**：无论是 `vector` 还是原生数组，它们都保持了元素的插入顺序，所以直接遍历输出即可。

#### STL `vector` 解法

```cpp
#include <iostream>
#include <vector> // 引入 vector 头文件

int main() {
    std::ios::sync_with_stdio(false); // 优化输入输出速度
    std::cin.tie(NULL); // 解除 cin 和 cout 的绑定

    std::vector<int> v; // 声明一个存储整数的 vector
    int x;

    // 循环读取数字，直到遇到 -1
    while (std::cin >> x && x != -1) {
        v.push_back(x); // 将读取的数字添加到 vector 的末尾
    }

    // 遍历并输出 vector 中的所有数字
    for (int i = 0; i < v.size(); ++i) {
        std::cout << v[i] << (i == v.size() - 1 ? "" : " "); // 最后一个数字后面没有空格
    }
    std::cout << std::endl; // 输出换行

    return 0;
}
```
**复杂度分析：**
*   时间复杂度：读取 N 个数字并存储，然后输出 N 个数字，都是 O(N) 的操作。`vector::push_back` 在均摊情况下是 O(1)。所以总时间复杂度是 O(N)。
*   空间复杂度：存储 N 个数字，需要 O(N) 的额外空间。

#### GESP 1-5 兼容解法 (原生数组模拟)

```cpp
#include <iostream>

const int MAXN = 1005; // 定义一个足够大的数组容量，根据题目数据范围设定

int a[MAXN]; // 声明一个原生数组
int cnt = 0; // 计数器，表示当前数组中元素的数量

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    int x;

    // 循环读取数字，直到遇到 -1
    while (std::cin >> x && x != -1) {
        if (cnt < MAXN) { // 检查数组是否还有空间，防止越界
            a[cnt] = x;    // 将数字存入数组
            cnt++;         // 计数器加一
        } else {
            // 理论上，如果数据量超过 MAXN，这里会出问题。
            // 考试中通常会保证数据量在 MAXN 范围内。
            // 实际编程中，如果确定会超过，就需要考虑更复杂的动态内存管理。
            std::cerr << "Error: Array capacity exceeded!" << std::endl;
            break; 
        }
    }

    // 遍历并输出数组中的所有数字 (使用 cnt 作为上限)
    for (int i = 0; i < cnt; ++i) {
        std::cout << a[i] << (i == cnt - 1 ? "" : " ");
    }
    std::cout << std::endl;

    return 0;
}
```
**复杂度分析：**
*   时间复杂度：同 `vector` 解法，O(N)。
*   空间复杂度：同 `vector` 解法，O(N) (尽管分配了 `MAXN` 空间，但实际只使用了 `N` 空间)。

---

### 例题 2: 记录学生成绩

**题目描述：**
班级里有若干名同学参加了一次考试。请你记录每位同学的姓名和分数，然后找出并输出分数最高的同学的姓名和分数。

**输入示例：**
```
Alice 95
Bob 88
Charlie 92
END
```
（输入 "END" 表示结束，"END" 不计入学生信息）

**输出示例：**
```
最高分学生: Alice, 分数: 95
```

#### 思路分析

1.  **关联数据**：每个学生都有姓名和分数，这两个数据是紧密关联的。
    *   **STL `pair` 解法**：可以使用 `pair<string, int>` 来表示一个学生的信息。
    *   **GESP 1-5 兼容解法**：可以使用自定义 `struct` 来表示一个学生的信息，或者使用两个独立的数组 `string names[]` 和 `int scores[]`。

2.  **数据数量不确定**：学生数量未知。
    *   **STL `vector` 解法**：将 `pair<string, int>` 放入 `vector<pair<string, int>>` 中。
    *   **GESP 1-5 兼容解法**：将自定义 `struct` 放入 `struct StudentInfo students[MAXN]` 数组中，并用计数器 `cnt` 记录学生人数。

3.  **查找最高分**：遍历所有学生信息，维护一个当前最高分和对应学生的索引（或直接记录最高分学生的姓名和分数）。

#### STL `vector` 和 `pair` 解法

```cpp
#include <iostream>
#include <vector> // 引入 vector
#include <string> // 引入 string
#include <utility> // 引入 pair (或 <bits/stdc++.h>)

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 声明一个 vector，里面存储的是 pair<string, int> 类型的数据
    std::vector<std::pair<std::string, int>> students; 

    std::string n;
    int s;

    // 循环读取学生姓名和分数，直到输入 "END"
    while (std::cin >> n && n != "END") {
        std::cin >> s; // 读取分数
        students.push_back({n, s}); // 使用列表初始化创建 pair 并添加到 vector
        // 也可以这样写：students.push_back(std::make_pair(n, s));
    }

    if (students.empty()) { // 如果没有学生数据
        std::cout << "没有学生数据。" << std::endl;
        return 0;
    }

    // 查找最高分学生
    int maxScore = -1; // 记录最高分数
    std::string maxName; // 记录最高分学生姓名

    for (const auto& student : students) { // 遍历 vector 中的每一个 pair
        if (student.second > maxScore) { // 如果当前学生分数更高
            maxScore = student.second;   // 更新最高分数
            maxName = student.first;     // 更新最高分学生姓名
        }
    }

    std::cout << "最高分学生: " << maxName << ", 分数: " << maxScore << std::endl;

    return 0;
}
```
**复杂度分析：**
*   时间复杂度：读取 N 个学生数据是 O(N)，遍历查找最高分也是 O(N)。总时间复杂度 O(N)。
*   空间复杂度：存储 N 个学生数据，每个数据是一个 `pair`，需要 O(N) 的额外空间。

#### GESP 1-5 兼容解法 (自定义结构体 + 原生数组)

```cpp
#include <iostream>
#include <string> // 引入 string

const int MAXN = 1005; // 最大学生数量

// 定义一个结构体来存储学生信息，模拟 pair
struct StudentInfo {
    std::string name;
    int score;
};

StudentInfo students[MAXN]; // 声明一个结构体数组
int student_count = 0;      // 计数器，记录当前学生数量

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string n;
    int s;

    // 循环读取学生姓名和分数，直到输入 "END"
    while (std::cin >> n && n != "END") {
        std::cin >> s; // 读取分数
        if (student_count < MAXN) { // 检查数组是否还有空间
            students[student_count].name = n;   // 存储姓名
            students[student_count].score = s;  // 存储分数
            student_count++;                    // 学生数量加一
        } else {
            std::cerr << "Error: Student capacity exceeded!" << std::endl;
            break;
        }
    }

    if (student_count == 0) { // 如果没有学生数据
        std::cout << "没有学生数据。" << std::endl;
        return 0;
    }

    // 查找最高分学生
    int maxScore = -1; // 记录最高分数
    int maxIndex = -1; // 记录最高分学生的索引

    for (int i = 0; i < student_count; ++i) { // 遍历结构体数组
        if (students[i].score > maxScore) { // 如果当前学生分数更高
            maxScore = students[i].score;   // 更新最高分数
            maxIndex = i;                   // 更新最高分学生的索引
        }
    }

    std::cout << "最高分学生: " << students[maxIndex].name << ", 分数: " << students[maxIndex].score << std::endl;

    return 0;
}
```
**复杂度分析：**
*   时间复杂度：同 STL 解法，O(N)。
*   空间复杂度：同 STL 解法，O(N)。

**总结：** 通过这两种解法对比，我们可以看到，虽然 `vector` 和 `pair` 用起来更简洁方便，但我们完全可以使用原生数组和自定义结构体，通过一些额外的代码管理（如计数器 `cnt`），来实现相同的功能。这正是 GESP 考试所期望的能力！

===NEXT===

## 代码实现模板

**特别提醒：** 以下模板是使用 `vector` 和 `pair` 的标准写法。在 GESP 1-5 考试中，请务必使用其对应的原生数组/结构体替代方案！

### `vector` 基础模板

```cpp
#include <iostream>
#include <vector>   // 包含 vector 头文件
#include <string>   // 如果 vector 存储的是 string 类型

int main() {
    // 优化输入输出 (GESP 考试中也推荐使用)
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 1. 声明一个 vector
    // vector<数据类型> 变量名;
    std::vector<int> v; // 存储整数的 vector
    // std::vector<std::string> names; // 存储字符串的 vector

    // 2. 添加元素到 vector 末尾
    // 变量名.push_back(要添加的元素);
    v.push_back(100);
    v.push_back(200);
    // names.push_back("Hello");

    // 3. 获取 vector 的当前元素数量
    // 变量名.size(); 返回一个 size_t 类型的值 (通常是无符号整数)
    std::cout << "Vector v 的大小: " << v.size() << std::endl; // 输出 2

    // 4. 访问 vector 中的元素 (下标从 0 开始)
    // 变量名[下标]; 或 变量名.at(下标);
    std::cout << "v[0] 的值: " << v[0] << std::endl; // 输出 100

    // 5. 遍历 vector 中的所有元素
    // 方式一：传统 for 循环
    std::cout << "遍历 v (传统 for): ";
    for (int i = 0; i < v.size(); ++i) {
        std::cout << v[i] << " ";
    }
    std::cout << std::endl;

    // 方式二：C++11 范围 for 循环 (更简洁)
    std::cout << "遍历 v (范围 for): ";
    for (int element : v) { // element 会依次取到 v 中的每一个值
        std::cout << element << " ";
    }
    std::cout << std::endl;

    // 6. 清空 vector
    // 变量名.clear();
    v.clear();
    std::cout << "清空后 v 的大小: " << v.size() << std::endl; // 输出 0

    return 0;
}
```

### `pair` 基础模板

```cpp
#include <iostream>
#include <string>    // 如果 pair 包含 string 类型
#include <utility>   // 包含 pair 头文件 (或 <bits/stdc++.h>)
#include <vector>    // 如果 pair 作为 vector 的元素

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 1. 声明一个 pair
    // pair<数据类型1, 数据类型2> 变量名;
    std::pair<std::string, int> p1; // 存储姓名和年龄
    std::pair<double, double> p2;   // 存储坐标 (x, y)

    // 2. 初始化/赋值 pair
    // 方式一：分别赋值给 first 和 second
    p1.first = "Zhang San";
    p1.second = 18;
    std::cout << "p1: 姓名=" << p1.first << ", 年龄=" << p1.second << std::endl;

    // 方式二：使用列表初始化 (C++11 以后)
    std::pair<std::string, int> p3 = {"Li Si", 20};
    std::cout << "p3: 姓名=" << p3.first << ", 年龄=" << p3.second << std::endl;

    // 方式三：使用 make_pair 函数
    p2 = std::make_pair(10.5, 20.3);
    std::cout << "p2: x=" << p2.first << ", y=" << p2.second << std::endl;

    // 3. 访问 pair 的元素
    // 变量名.first; 访问第一个元素
    // 变量名.second; 访问第二个元素
    std::cout << "p1 的姓名是: " << p1.first << std::endl;
    std::cout << "p3 的年龄是: " << p3.second << std::endl;

    // 4. pair 作为 vector 的元素
    std::vector<std::pair<std::string, int>> studentScores;
    studentScores.push_back({"Wang Wu", 98});
    studentScores.push_back(std::make_pair("Zhao Liu", 85));

    std::cout << "--- 遍历学生分数列表 ---" << std::endl;
    for (const auto& s : studentScores) { // 遍历 vector 中的 pair
        std::cout << "姓名: " << s.first << ", 分数: " << s.second << std::endl;
    }

    return 0;
}
```

### GESP 1-5 兼容替代模板

#### 原生数组模拟 `vector`

```cpp
#include <iostream>
// #include <string> // 如果存储字符串，需要引入

const int MAXN = 1000; // 根据题目数据范围设定足够大的数组容量

int a[MAXN]; // 声明原生数组
int cnt = 0; // 计数器，表示当前数组中元素的数量，模拟 vector.size()

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 模拟 push_back
    // a[cnt] = value; cnt++;
    if (cnt < MAXN) { a[cnt++] = 10; }
    if (cnt < MAXN) { a[cnt++] = 20; }
    if (cnt < MAXN) { a[cnt++] = 30; }

    // 模拟 size()
    std::cout << "模拟数组大小: " << cnt << std::endl;

    // 访问元素
    std::cout << "a[0] 的值: " << a[0] << std::endl;

    // 遍历元素
    std::cout << "遍历模拟数组: ";
    for (int i = 0; i < cnt; ++i) {
        std::cout << a[i] << " ";
    }
    std::cout << std::endl;

    // 模拟 clear()
    cnt = 0;
    std::cout << "清空后大小: " << cnt << std::endl;

    return 0;
}
```

#### 自定义结构体模拟 `pair`

```cpp
#include <iostream>
#include <string>

const int MAXN = 1000; // 根据题目数据范围设定最大元素数量

// 定义一个结构体来模拟 pair
struct MyPair {
    std::string s; // 对应 pair.first
    int i;         // 对应 pair.second
};

MyPair myPairs[MAXN]; // 声明结构体数组
int pair_count = 0;   // 计数器

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 1. 创建并赋值结构体对象
    if (pair_count < MAXN) {
        myPairs[pair_count].s = "Apple";
        myPairs[pair_count].i = 5;
        pair_count++;
    }

    // 2. 使用列表初始化 (C++11)
    if (pair_count < MAXN) {
        myPairs[pair_count] = {"Banana", 8};
        pair_count++;
    }

    // 3. 访问结构体成员
    std::cout << "第一个 MyPair: " << myPairs[0].s << ", " << myPairs[0].i << std::endl;

    // 4. 遍历结构体数组
    std::cout << "--- 遍历 MyPair 列表 ---" << std::endl;
    for (int i = 0; i < pair_count; ++i) {
        std::cout << "Item: " << myPairs[i].s << ", Count: " << myPairs[i].i << std::endl;
    }

    return 0;
}
```

===NEXT===

## 课堂互动

同学们，学了这么多，是时候动动脑筋、练练手了！

### 思考题 (2分钟，独立思考)

1.  **`vector` vs. 原生数组**：如果我需要存储班级所有同学的考试分数，但我不知道具体有多少位同学，我应该选择 `vector` 还是原生数组？为什么？在 GESP 考试中，我又该如何处理？
2.  **`pair` vs. `struct`**：如果我要记录每个同学的姓名和年龄，用 `pair<string, int>` 和自定义 `struct Student { string name; int age; };` 有什么异同？在 GESP 考试中，哪种方式更推荐？
3.  **`push_back` 的秘密**：`vector` 的 `push_back` 操作，为什么能让 `vector` 自动变大？它在底层做了什么神奇的事情？

### 小组任务 (8分钟，小组讨论并分享)

**任务一：模拟图书馆借阅记录**
假设我们要记录图书馆的借