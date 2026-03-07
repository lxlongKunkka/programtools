# 栈 (Stack) 与 STL

---

## 必做题（1）

- `atcoder:2226`

> **章节 ID：** `6-1-1`  
> **所属专题：** 专题 1 — 数据结构进阶  
> **所属等级：** Level 6 — GESP 六级 (数据结构)
`https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/courseware/GESPC认证课程/GESP六级数据结构/线性结构进阶/栈Stack与STL.html`

## 教案内容

## 教学目标

**知识目标：**
1.  理解栈（Stack）作为一种抽象数据类型（ADT）的定义及其“后进先出”（LIFO, Last In, First Out）的核心原则。
2.  掌握栈的基本操作：入栈（push）、出栈（pop）、查看栈顶元素（top）、判断栈是否为空（empty）以及获取栈中元素数量（size）。
3.  理解并能够使用 C++ 标准模板库（STL）中的 `std::stack` 容器适配器，掌握其常用方法。

**能力目标：**
1.  能够分析常见问题，判断其是否适合使用栈来解决。
2.  能够独立设计并实现基于数组的栈模拟，加深对栈底层机制的理解。
3.  能够熟练运用 `std::stack` 解决实际编程问题，如括号匹配、表达式求值等。

**素养目标：**
1.  培养抽象思维能力，理解从具体实现中抽象出数据结构概念的重要性。
2.  树立数据结构对算法效率优化和代码简洁性提升的认知，体会“选择合适的数据结构是解决问题的第一步”。
3.  培养严谨的编程习惯和解决问题的逻辑思维能力。

===NEXT===

## 趣味引入

同学们，大家有没有玩过叠盘子游戏？或者在家里帮忙把洗好的盘子一个一个叠起来？

想象一下，你有一个高高的盘子架。
1.  当你洗好第一个盘子，你会把它放在架子的最底部。
2.  洗好第二个盘子，你会把它叠在第一个盘子的上面。
3.  以此类推，新洗的盘子总是叠在最上面。

现在，如果我们要用盘子吃饭，你会先拿哪个盘子呢？是不是总是拿最上面的那个？因为下面的盘子被压住了，不好拿。

这就是我们今天要学习的一种非常有趣、也非常重要的数据结构——**栈（Stack）**！

它就像叠盘子一样，有一个非常特别的规则：**后进来的，先出去！**（LIFO: Last In, First Out）。

再举个例子：你用浏览器上网，是不是经常会点“后退”按钮？
当你访问页面A -> 页面B -> 页面C时：
- 你访问页面A，它进入一个“历史记录栈”。
- 你访问页面B，它叠在页面A上面。
- 你访问页面C，它叠在页面B上面。
现在，你点“后退”，是不是回到了页面B？再点“后退”，是不是回到了页面A？
最晚访问的页面C，最先被“后退”出去；页面B次之，页面A最后。这不就是“后进先出”吗？

今天，我们就来揭开栈的神秘面纱，看看它在编程世界里都有哪些神奇的应用！

===NEXT===

## 深度知识点讲解

### 1. 什么是栈 (Stack)？

栈是一种特殊的线性数据结构，它只允许在表的一端进行插入和删除操作。这一端被称为**栈顶 (Top)**，另一端被称为**栈底 (Bottom)**。

栈最核心的特点就是它的操作规则：**后进先出 (LIFO: Last In, First Out)**。就像我们前面说的叠盘子，最新放进去的盘子，总是最先被拿出来。

**生活类比：**
*   **叠盘子：** 新盘子总是放在最上面，拿盘子也总是从最上面拿。
*   **子弹弹夹：** 最后一颗压入弹夹的子弹，总是第一颗被射出。
*   **扑克牌堆：** 如果你只能从牌堆顶部摸牌或放牌，那么最后放上去的牌，最先被摸到。
*   **浏览器的“后退”功能：** 你访问的页面历史记录就是一个栈，最后访问的页面会先被“后退”出去。

**栈的基本操作：**

| 操作名称      | 英文术语 | 描述                                       | 形象比喻                  |
| :------------ | :------- | :----------------------------------------- | :------------------------ |
| **入栈**      | push     | 将一个新元素添加到栈顶。                   | 往盘子堆上放一个新盘子。  |
| **出栈**      | pop      | 移除栈顶元素。                             | 从盘子堆上拿走最上面的盘子。|
| **查看栈顶**  | top      | 获取栈顶元素的值，但不移除它。             | 看看最上面的盘子是什么。  |
| **判断为空**  | empty    | 检查栈中是否包含任何元素。                 | 看看盘子堆上还有没有盘子。|
| **获取大小**  | size     | 返回栈中元素的数量。                       | 数数盘子堆上有多少个盘子。|

### 2. 为什么需要栈？

栈的“后进先出”特性，让它天生就适合处理那些需要“逆序”操作或需要“回溯”的问题。
*   **括号匹配：** 当我们遇到一个左括号，就把它“记住”（入栈），遇到右括号时，就去检查最近的那个左括号是否匹配（出栈并比较）。
*   **函数调用：** 程序在执行函数时，会把当前函数的执行上下文（参数、局部变量、返回地址等）压入“调用栈”。当函数调用另一个函数时，新的上下文会压入栈顶。当一个函数执行完毕，它的上下文会从栈顶弹出，程序回到上一个函数的执行点。
*   **表达式求值：** 例如将中缀表达式转换为后缀表达式，或直接计算后缀表达式。
*   **深度优先搜索 (DFS)：** 在图或树的遍历中，DFS 可以使用栈来模拟递归过程。

### 3. 栈的实现方式 (从底层到高层)

理解栈的底层原理非常重要，这样你才能在没有现成工具时也能自己实现，也能更好地理解 STL 栈的内部机制。

#### 3.1 数组模拟栈 (底层原理揭秘)

我们可以用一个普通的数组来模拟栈的行为。我们需要一个数组来存储元素，还需要一个变量来指示**栈顶**在哪里。

**核心思想：**
*   用一个数组 `a` 存储栈中的元素。
*   用一个整数变量 `t` (top) 来表示栈顶元素的索引。通常，`t = -1` 表示栈为空，`t` 指向栈顶元素的下一个空位置，或者 `t` 直接指向栈顶元素。这里我们让 `t` 指向栈顶元素，初始化为 `-1`。

```cpp
#include <iostream>

const int MAXN = 1005; // 栈的最大容量

int a[MAXN]; // 用数组a存储栈的元素
int t = -1;  // 栈顶指针，初始化为-1表示栈为空

// 入栈操作
void push(int x) {
    if (t >= MAXN - 1) { // 检查栈是否已满
        std::cout << "Error: Stack overflow!" << std::endl;
        return;
    }
    t++;         // 栈顶指针上移
    a[t] = x;    // 将元素放入栈顶
}

// 出栈操作
void pop() {
    if (t < 0) { // 检查栈是否为空
        std::cout << "Error: Stack underflow!" << std::endl;
        return;
    }
    t--;         // 栈顶指针下移，元素逻辑上被移除
}

// 查看栈顶元素
int top() {
    if (t < 0) { // 检查栈是否为空
        std::cout << "Error: Stack is empty!" << std::endl;
        return -1; // 返回一个无效值或抛出异常
    }
    return a[t]; // 返回栈顶元素
}

// 判断栈是否为空
bool empty() {
    return t < 0; // 栈顶指针小于0表示为空
}

// 获取栈中元素数量
int size() {
    return t + 1; // 栈顶指针从-1开始，所以大小是t+1
}

int main() {
    push(10);
    push(20);
    std::cout << "Top element: " << top() << std::endl; // 输出 20
    pop();
    std::cout << "Top element after pop: " << top() << std::endl; // 输出 10
    std::cout << "Is stack empty? " << (empty() ? "Yes" : "No") << std::endl; // 输出 No
    pop();
    std::cout << "Is stack empty? " << (empty() ? "Yes" : "No") << std::endl; // 输出 Yes
    pop(); // 尝试对空栈进行pop操作
    return 0;
}
```
**优点：**
*   **直观易懂：** 帮助你理解栈的底层工作原理。
*   **效率高：** 直接操作数组，没有额外的封装开销。

**缺点：**
*   **固定大小：** 需要预先设定最大容量 `MAXN`，如果元素数量超过这个值，就会发生栈溢出 (Stack Overflow)。
*   **手动管理：** 需要自己编写所有操作函数，代码量稍大。

#### 3.2 C++ STL `std::stack` (高级工具)

在 C++ 中，标准模板库 (STL) 为我们提供了一个非常方便、安全且功能强大的栈实现：`std::stack`。它是一个**容器适配器 (Container Adapter)**，这意味着它不是一个独立的容器，而是将现有的容器（如 `std::deque` 或 `std::list`）包装起来，并提供栈的接口。

**为什么是容器适配器？**
想象一下，你有一个万能的工具箱（比如 `std::deque`，双端队列），它有很多功能。但你现在只需要它的“叠盘子”功能。`std::stack` 就是一个“适配器”，它把这个工具箱包起来，只暴露给你“push”、“pop”、“top”这些栈特有的功能，让你用起来更简单、更不容易出错。

**如何使用 `std::stack`：**

1.  **引入头文件：** `#include <stack>`
2.  **声明：** `std::stack<DataType> s;` (其中 `DataType` 是你要存储的元素类型，比如 `int`, `char`, `string` 等)

**`std::stack` 的常用方法：**

| 方法名称      | 描述                                       | 对应数组实现 |
| :------------ | :----------------------------------------- | :----------- |
| `s.push(x)`   | 将元素 `x` 入栈。                          | `a[++t] = x;`|
| `s.pop()`     | 移除栈顶元素。注意：不返回元素。           | `t--;`       |
| `s.top()`     | 返回栈顶元素的引用。注意：不移除元素。     | `return a[t];`|
| `s.empty()`   | 判断栈是否为空，返回 `true` 或 `false`。   | `return t < 0;`|
| `s.size()`    | 返回栈中元素的数量。                       | `return t + 1;`|

```cpp
#include <iostream>
#include <stack> // 引入stack头文件
#include <string> // 如果需要存储字符串

int main() {
    std::stack<int> s; // 声明一个存储int类型元素的栈

    // 入栈操作
    s.push(100);
    s.push(200);
    s.push(300);

    std::cout << "Current stack size: " << s.size() << std::endl; // 输出 3

    // 查看栈顶元素
    std::cout << "Top element: " << s.top() << std::endl; // 输出 300

    // 出栈操作
    s.pop(); // 300被移除
    std::cout << "After pop, top element: " << s.top() << std::endl; // 输出 200
    std::cout << "Current stack size: " << s.size() << std::endl; // 输出 2

    // 判断栈是否为空
    if (s.empty()) {
        std::cout << "Stack is empty." << std::endl;
    } else {
        std::cout << "Stack is not empty." << std::endl; // 输出 Stack is not empty.
    }

    s.pop(); // 200被移除
    s.pop(); // 100被移除

    if (s.empty()) {
        std::cout << "Stack is empty." << std::endl; // 输出 Stack is empty.
    }

    // 尝试对空栈进行top()或pop()操作会导致未定义行为！
    // 总是先检查s.empty()再进行top()或pop()
    if (!s.empty()) {
        std::cout << "Top element: " << s.top() << std::endl;
    } else {
        std::cout << "Cannot get top element, stack is empty." << std::endl;
    }

    std::stack<char> sc; // 存储char类型的栈
    sc.push('A');
    sc.push('B');
    std::cout << "Char stack top: " << sc.top() << std::endl; // 输出 B

    return 0;
}
```

**优点：**
*   **方便易用：** 无需自己管理底层数组和指针，代码简洁。
*   **安全可靠：** 自动处理内存分配和释放，避免了栈溢出等问题（除非系统内存耗尽）。
*   **泛型：** 可以存储任何数据类型。

**缺点：**
*   **封装开销：** 相比原生数组，可能会有微小的性能开销（通常可以忽略不计）。
*   **限制访问：** 只能访问栈顶元素，不能像数组那样随机访问中间元素。

### 4. 常见误区和注意事项

*   **栈和队列的区别：**
    *   **栈 (Stack):** LIFO (后进先出)，只有一个口进出。
    *   **队列 (Queue):** FIFO (先进先出)，一个口进，另一个口出。
*   **栈溢出 (Stack Overflow)：**
    *   **数组模拟栈：** 当你尝试向一个已经满了的栈 (数组) 中继续 `push` 元素时，会导致数组越界。
    *   **函数调用栈：** 当函数递归调用层数过深，或者局部变量占用内存过大，导致系统为函数调用分配的栈空间耗尽时，会发生栈溢出。
*   **`pop()` 不返回元素：** `std::stack::pop()` 函数只负责移除栈顶元素，它不返回被移除的元素。如果你需要知道被移除的元素是什么，应该先调用 `s.top()` 获取，然后再调用 `s.pop()` 移除。
*   **空栈操作：** 在对 `std::stack` 进行 `top()` 或 `pop()` 操作之前，务必使用 `s.empty()` 检查栈是否为空，否则会导致程序崩溃（未定义行为）。

===NEXT===

## 典型例题精讲

### 例题1：括号匹配

**问题描述：**
给定一个只包含 `'('`，`')'`，`'{'`，`'}'`，`'['`，`']'` 这些字符的字符串，判断输入的字符串是否有效。
有效字符串需满足：
1.  左括号必须用相同类型的右括号闭合。
2.  左括号必须以正确的顺序闭合。
3.  空字符串被认为是有效字符串。

**示例：**
*   输入: `s = "([{}])"`
    输出: `true`
*   输入: `s = "({[)]}"`
    输出: `false`
*   输入: `s = "{[]}"`
    输出: `true`
*   输入: `s = "("`
    输出: `false`

**思路分析：**
这个问题是栈最经典的用途之一。
1.  **遇到左括号：** 我们需要“记住”这个左括号，等待它被匹配。所以，把它**入栈**。
2.  **遇到右括号：** 这时，我们需要检查栈顶元素。
    *   如果栈为空，说明没有左括号可以匹配，直接返回 `false`。
    *   如果栈不为空，取出栈顶元素，检查它是否与当前右括号类型匹配。
        *   如果匹配，说明这对括号是有效的，将栈顶元素**出栈**。
        *   如果不匹配，说明括号类型不正确，返回 `false`。
3.  **遍历结束：**
    *   如果字符串遍历完毕，且栈为空，说明所有的左括号都被成功匹配了，返回 `true`。
    *   如果字符串遍历完毕，但栈不为空，说明还有未匹配的左括号，返回 `false`。

**代码实现 (使用 `std::stack`)：**

```cpp
#include <iostream>
#include <string>
#include <stack> // 引入stack头文件

// 判断字符是否为左括号
bool isLeftBracket(char c) {
    return c == '(' || c == '{' || c == '[';
}

// 判断两个括号是否匹配
bool isMatch(char left, char right) {
    return (left == '(' && right == ')') ||
           (left == '{' && right == '}') ||
           (left == '[' && right == ']');
}

bool isValid(std::string s) {
    std::stack<char> st; // 创建一个字符栈

    for (char c : s) { // 遍历字符串中的每一个字符
        if (isLeftBracket(c)) {
            // 如果是左括号，入栈
            st.push(c);
        } else {
            // 如果是右括号
            if (st.empty()) {
                // 栈为空，没有左括号可以匹配，直接无效
                return false;
            }
            // 栈不为空，取出栈顶元素（最近的左括号）进行匹配
            char topChar = st.top();
            st.pop(); // 匹配成功，栈顶元素出栈

            if (!isMatch(topChar, c)) {
                // 不匹配，无效
                return false;
            }
        }
    }

    // 遍历结束后，如果栈为空，说明所有括号都匹配成功
    return st.empty();
}

int main() {
    std::string s1 = "([{}])";
    std::cout << s1 << " is valid: " << (isValid(s1) ? "true" : "false") << std::endl; // true

    std::string s2 = "({[)]}";
    std::cout << s2 << " is valid: " << (isValid(s2) ? "true" : "false") << std::endl; // false

    std::string s3 = "{[]}";
    std::cout << s3 << " is valid: " << (isValid(s3) ? "true" : "false") << std::endl; // true

    std::string s4 = "(";
    std::cout << s4 << " is valid: " << (isValid(s4) ? "true" : "false") << std::endl; // false

    std::string s5 = "(()";
    std::cout << s5 << " is valid: " << (isValid(s5) ? "true" : "false") << std::endl; // false

    std::string s6 = "())";
    std::cout << s6 << " is valid: " << (isValid(s6) ? "true" : "false") << std::endl; // false
    
    return 0;
}
```

**复杂度分析：**
*   **时间复杂度：** 遍历字符串一次，每个字符最多进行一次入栈和一次出栈操作。因此，时间复杂度为 O(n)，其中 n 是字符串的长度。
*   **空间复杂度：** 在最坏情况下（例如字符串全是左括号 `((((`），栈会存储所有左括号。因此，空间复杂度为 O(n)。

---

### 例题2：逆波兰表达式求值 (后缀表达式求值)

**问题描述：**
根据逆波兰表示法，求表达式的值。
逆波兰表达式是一种后缀表达式，它不需要括号来表示运算的优先级。运算符放在操作数的后面。
例如：`"2 1 + 3 *"` 对应的中缀表达式是 `(2 + 1) * 3 = 9`。
`"4 13 5 / +"` 对应的中缀表达式是 `4 + (13 / 5) = 4 + 2 = 6` (整数除法)。

**示例：**
*   输入: `tokens = ["2", "1", "+", "3", "*"]`
    输出: `9`
    解释: `((2 + 1) * 3) = 9`
*   输入: `tokens = ["4", "13", "5", "/", "+"]`
    输出: `6`
    解释: `(4 + (13 / 5)) = 6`

**思路分析：**
逆波兰表达式求值是栈的另一个经典应用。
1.  **遍历表达式：** 从左到右遍历逆波兰表达式的每一个元素（操作数或运算符）。
2.  **遇到数字：** 如果当前元素是数字，直接将其**入栈**。
3.  **遇到运算符：** 如果当前元素是运算符（`+`, `-`, `*`, `/`），说明需要进行一次运算。
    *   从栈中**弹出**两个数字（注意顺序：先弹出的是右操作数，后弹出的是左操作数）。
    *   对这两个数字执行对应的运算。
    *   将运算结果**入栈**。
4.  **遍历结束：** 表达式遍历完毕后，栈中应该只剩下一个元素，这个元素就是最终的计算结果。将其**弹出**并作为结果返回。

**代码实现 (使用 `std::stack`)：**

```cpp
#include <iostream>
#include <vector> // 存储表达式的字符串数组
#include <string>
#include <stack>  // 引入stack头文件
#include <cstdlib> // 用于atoi函数

// 判断一个字符串是否为运算符
bool isOperator(const std::string& s) {
    return s == "+" || s == "-" || s == "*" || s == "/";
}

int evalRPN(std::vector<std::string>& tokens) {
    std::stack<int> st; // 创建一个整数栈，用于存储操作数

    for (const std::string& token : tokens) { // 遍历表达式中的每一个token
        if (!isOperator(token)) {
            // 如果是数字，将其转换为整数并入栈
            st.push(std::stoi(token)); // std::stoi 将字符串转换为整数
        } else {
            // 如果是运算符
            // 注意：先弹出的是右操作数，后弹出的是左操作数
            int b = st.top(); // 获取右操作数
            st.pop();
            int a = st.top(); // 获取左操作数
            st.pop();

            int result;
            if (token == "+") {
                result = a + b;
            } else if (token == "-") {
                result = a - b;
            } else if (token == "*") {
                result = a * b;
            } else { // token == "/"
                result = a / b; // 整数除法
            }
            st.push(result); // 将运算结果入栈
        }
    }
    // 遍历结束后，栈中唯一的元素就是最终结果
    return st.top();
}

int main() {
    std::vector<std::string> tokens1 = {"2", "1", "+", "3", "*"};
    std::cout << "RPN: [2, 1, +, 3, *] = " << evalRPN(tokens1) << std::endl; // 输出 9

    std::vector<std::string> tokens2 = {"4", "13", "5", "/", "+"};
    std::cout << "RPN: [4, 13, 5, /, +] = " << evalRPN(tokens2) << std::endl; // 输出 6

    std::vector<std::string> tokens3 = {"10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"};
    // ( (10 * (6 / ( (9 + 3) * -11 ) ) ) + 17) + 5
    // 10 6 9 3 + -11 * / * 17 + 5 +
    // 10 6 12 -11 * / * 17 + 5 +
    // 10 6 -132 / * 17 + 5 +
    // 10 0 * 17 + 5 + (6/-132 为 0)
    // 0 + 17 + 5
    // 22
    std::cout << "RPN: [..., ...] = " << evalRPN(tokens3) << std::endl; // 输出 22

    return 0;
}
```

**复杂度分析：**
*   **时间复杂度：** 遍历表达式一次，每个元素最多进行一次入栈和两次出栈操作（对于运算符）。`std::stoi` 操作的时间复杂度与字符串长度相关，但通常可以视为常数时间（如果数字长度有限）。因此，时间复杂度为 O(n)，其中 n 是表达式中 token 的数量。
*   **空间复杂度：** 在最坏情况下（例如表达式全是数字），栈会存储所有数字。因此，空间复杂度为 O(n)。

===NEXT===

## 代码实现模板

### 1. 数组模拟栈模板 (用于理解底层原理)

```cpp
#include <iostream> // 包含输入输出流库

// 定义栈的最大容量
const int MAXN = 100005; 

// 存储栈元素的数组
// g_a 代表全局数组，避免与局部变量冲突
int g_a[MAXN]; 
// 栈顶指针，初始化为-1表示栈为空
// g_t 代表全局top指针
int g_t = -1; 

// ---------------- 栈的基本操作 ----------------

// 入栈操作：将元素x添加到栈顶
void push_array(int x) {
    if (g_t >= MAXN - 1) { // 检查栈是否已满
        std::cout << "Error: Stack overflow! Cannot push " << x << std::endl;
        return;
    }
    g_t++;         // 栈顶指针上移
    g_a[g_t] = x;  // 将元素x放入栈顶位置
    // std::cout << "Pushed: " << x << std::endl;
}

// 出栈操作：移除栈顶元素
void pop_array() {
    if (g_t < 0) { // 检查栈是否为空
        std::cout << "Error: Stack underflow! Cannot pop from empty stack." << std::endl;
        return;
    }
    // std::cout << "Popped: " << g_a[g_t] << std::endl;
    g_t--;         // 栈顶指针下移，逻辑上移除栈顶元素
}

// 查看栈顶元素：获取栈顶元素的值，但不移除
int top_array() {
    if (g_t < 0) { // 检查栈是否为空
        std::cout << "Error: Stack is empty! No top element." << std::endl;
        return -1; // 返回一个特殊值表示错误，实际应用中可能抛出异常
    }
    return g_a[g_t]; // 返回栈顶元素
}

// 判断栈是否为空
bool empty_array() {
    return g_t < 0; // 栈顶指针小于0表示栈为空
}

// 获取栈中元素数量
int size_array() {
    return g_t + 1; // 栈顶指针从-1开始，所以元素数量是t+1
}

// ---------------- 示例用法 ----------------
void test_array_stack() {
    std::cout << "--- Testing Array Stack ---" << std::endl;
    push_array(1);
    push_array(2);
    std::cout << "Top: " << top_array() << ", Size: " << size_array() << std::endl; // Top: 2, Size: 2
    pop_array();
    std::cout << "Top: " << top_array() << ", Size: " << size_array() << std::endl; // Top: 1, Size: 1
    pop_array();
    std::cout << "Is empty? " << (empty_array() ? "Yes" : "No") << std::endl; // Is empty? Yes
    pop_array(); // 尝试对空栈进行pop
    std::cout << std::endl;
}

/*
int main() {
    test_array_stack();
    return 0;
}
*/
```

### 2. `std::stack` 基本使用模板 (推荐用于实际编程)

```cpp
#include <iostream> // 包含输入输出流库
#include <stack>    // 包含STL栈头文件
#include <string>   // 如果需要存储字符串类型

// ---------------- 栈的基本操作 ----------------

template <typename T> // 使用模板，让栈可以存储任何类型的数据
void test_stl_stack() {
    std::cout << "--- Testing STL Stack ---" << std::endl;

    std::stack<T> s; // 声明一个存储T类型元素的栈

    // 1. push() - 入栈操作
    std::cout << "Pushing elements: 10, 20, 30" << std::endl;
    s.push(10); // 将10入栈
    s.push(20); // 将20入栈
    s.push(30); // 将30入栈

    // 2. size() - 获取栈中元素数量
    std::cout << "Current stack size: " << s.size() << std::endl; // 输出 3

    // 3. top() - 查看栈顶元素 (不移除)
    if (!s.empty()) { // 总是先检查是否为空
        std::cout << "Top element: " << s.top() << std::endl; // 输出 30
    }

    // 4. pop() - 出栈操作 (移除栈顶元素，不返回)
    std::cout << "Popping top element..." << std::endl;
    s.pop(); // 30 被移除

    if (!s.empty()) {
        std::cout << "After pop, top element: " << s.top() << std::endl; // 输出 20
        std::cout << "Current stack size: " << s.size() << std::endl;   // 输出 2
    }

    // 5. empty() - 判断栈是否为空
    std::cout << "Is stack empty? " << (s.empty() ? "Yes" : "No") << std::endl; // 输出 No

    // 清空栈
    std::cout << "Clearing stack by popping all elements:" << std::endl;
    while (!s.empty()) {
        std::cout << "Popping: " << s.top() << std::endl;
        s.pop();
    }
    std::cout << "Is stack empty now? " << (s.empty() ? "Yes" : "No") << std::endl; // 输出 Yes

    // 尝试对空栈进行top()或pop()操作会导致程序崩溃，因此要避免！
    // if (!s.empty()) {
    //     std::cout << s.top() << std::endl; // 错误：空栈调用top()
    // }
    std::cout << std::endl;
}

int main() {
    test_stl_stack<int>(); // 测试存储int类型的栈
    test_stl_stack<char>(); // 测试存储char类型的栈
    // test_stl_stack<std::string>(); // 也可以测试存储string类型的栈
    return 0;
}
```

===NEXT===

## 课堂互动

**1. 提问与思考：**

*   **问题1：** “后进先出”除了叠盘子，生活中还有哪些例子？（鼓励学生发散思维，例如：枪的弹夹、浏览器的前进/后退、撤销/重做功能、一摞书等等）
*   **问题2：** 如果我们想要实现一个“先进先出”的数据结构，那会是什么？它和栈有什么区别？（引出队列的概念，为后续学习埋下伏笔）
*   **问题3：** 为什么 `std::stack::pop()` 不返回被移除的元素？这样设计有什么好处或坏处？（引导学生思考函数设计原则，以及安全性与便捷性的权衡。好处是可以避免返回引用或指针的复杂性，且如果栈为空，返回什么值都是问题；坏处是需要额外调用 `top()`。）

**2. 小组任务：设计一个“撤销/重做”功能**

*   **任务描述：** 想象你在一个画图软件里，每次操作（画线、填充颜色、删除）都会产生一个状态。你需要实现“撤销”和“重做”功能。请讨论：
    *   这个功能可以用什么数据结构来实现？
    *   需要一个栈还是两个栈？它们分别存储什么？
    *   当执行“撤销”操作时，数据结构会发生什么变化？
    *   当执行“重做”操作时，数据结构会发生什么变化？
    *   如果撤销后又进行了新的操作，重做栈应该如何处理？
*   **讨论时间：** 5-8分钟
*   **汇报：** 请1-2个小组上台分享他们的设计思路。
    *   **预期答案：** 需要两个栈，一个用于存储“操作历史”（undo_stack），另一个用于存储“被撤销的操作”（redo_stack）。
        *   每次新操作：压入 undo_stack，清空 redo_stack。
        *   撤销：undo_stack 栈顶元素弹出，压入 redo_stack。
        *   重做：redo_stack 栈顶元素弹出，压入 undo_stack。

**3. 即时练习：手动模拟括号匹配**

*   **题目：** 字符串 `s = "[{()}]"`
*   **任务：** 请同学们在纸上，模拟 `isValid(s)` 函数的执行过程。画一个表格，记录每一步：
    *   当前字符
    *   栈中内容 (用 `[]` 或 `{}` 表示)
    *   操作 (push/pop/match)
    *   结果 (true/false)
*   **示例表格开头：**

| 字符 | 栈内容 | 操作 | 结果 |
| :--- | :----- | :--- | :--- |
| `[`  | `[`    | push | -    |
| `{`  | `[ {`  | push | -    |
| `(`  | `[ { (`| push | -    |
| `)`  | `[ {`  | pop, match `(` `)` | -    |
| `]`  | `[`    | pop, match `{` `]` | -    |
| `}`  |        | pop, match `[` `}` | -    |
| 结束 |        | -    | true |

*   **检查与讲解：** 老师随机抽取几位同学的模拟结果进行检查，并快速讲解正确过程。

===NEXT===

## 分层练习题目

### 基础巩固 (使用 `std::stack`)

**1. 栈的基本操作实现：**
请编写一个程序，完成以下操作：
1.  创建一个 `std::stack<std::string>`。
2.  依次将你的名字、你最喜欢的编程语言、你最喜欢的食物入栈。
3.  输出栈中元素的数量。
4.  输出栈顶元素。
5.  将栈顶元素出栈。
6.  再次输出栈顶元素。
7.  判断栈是否为空，并输出结果。
8.  使用循环清空栈中所有元素，并在每次出栈时打印被弹出的元素。

**2. 小球入栈出栈序列：**
假设有 n 个小球，编号从 1 到 n，它们按 1, 2, ..., n 的顺序依次进入一个栈。
现在给你一个出栈序列，请判断这个出栈序列是否可能。
例如：
*   n = 3，入栈顺序 1, 2, 3。
*   出栈序列 `1, 2, 3` 是可能的。
*   出栈序列 `1, 3, 2` 是可能的。
*   出栈序列 `3, 1, 2` 是不可能的。（因为 1 在 3 之前入栈，如果 3 出来了，1 肯定在栈里，但 1 不可能在 3 后面出来）

请编写一个函数 `bool isPossiblePopSequence(int n, const std::vector<int>& popSequence)` 来判断。

### 能力提升 (使用 `std::stack` 或数组模拟)

**1. 最小栈问题：**
设计一个支持 `push`，`pop`，`top` 操作，并能在常数时间内检索到最小元素的栈。
实现 `MinStack` 类：
*   `MinStack()` 初始化栈对象。
*   `void push(int val)` 将元素 `val` 推入栈中。
*   `void pop()` 删除栈顶的元素。
*   `int top()` 获取栈顶元素。
*   `int getMin()` 获取栈中的最小元素。
所有操作均可在 O(1) 时间复杂度内完成。

**提示：** 你可能需要使用两个栈，或者一个栈存储数据，另一个栈存储与每个数据对应的当前最小值。

**2. 表达式求值 (中缀转后缀 + 后缀求值)：**
实现一个简单的计算器，支持加减乘除和括号。
输入是一个中缀表达式字符串，例如 `(3+4)*5-6`。
输出是计算结果。
**步骤：**
1.  将中缀表达式转换为后缀表达式（逆波兰表达式）。
    *   使用栈来处理运算符的优先级和括号。
2.  对转换后的后缀表达式进行求值（参考例题2）。

**提示：**
*   需要定义运算符的优先级。
*   遇到数字直接输出到后缀表达式。
*   遇到左括号入栈。
*   遇到右括号，将栈中运算符弹出直到遇到左括号。
*   遇到运算符，弹出栈中优先级更高或相等的运算符，然后将当前运算符入栈。

### 拓展挑战 (单调栈)

**1. 每日温度：**
给定一个整数数组 `temperatures`，表示每天的温度，返回一个数组 `ans`，其中 `ans[i]` 是指对于第 `i` 天，下一个更高温度出现在几天之后。如果下一天没有更高温度了，则用 `0` 代替。
**示例：**
*   输入: `temperatures = [73, 74, 75, 71, 69, 72, 76, 73]`
*   输出: `[1, 1, 4, 2, 1, 1, 0, 0]`

**提示：** 这个问题可以使用**单调栈**来解决。单调栈是一种栈，其内部元素从栈顶到栈底（或从栈底到栈顶）是单调递增或递减的。

---

## 练习题目答案 (请先独立思考和尝试，再查看答案)

### 基础巩固答案：

**1. 栈的基本操作实现：**

```cpp
#include <iostream>
#include <string>
#include <stack>

int main() {
    std::stack<std::string> s;

    // 2. 依次将你的名字、你最喜欢的编程语言、你最喜欢的食物入栈。
    s.push("你的名字"); // 假设是 "小明"
    s.push("C++");
    s.push("炸鸡");

    // 3. 输出栈中元素的数量。
    std::cout << "Stack size: " << s.size() << std::endl; // 3

    // 4. 输出栈顶元素。
    if (!s.empty()) {
        std::cout << "Top element: " << s.top() << std::endl; // 炸鸡
    }

    // 5. 将栈顶元素出栈。
    s.pop();

    // 6. 再次输出栈顶元素。
    if (!s.empty()) {
        std::cout << "Top element after pop: " << s.top() << std::endl; // C++
    }

    // 7. 判断栈是否为空，并输出结果。
    std::cout << "Is stack empty? " << (s.empty() ? "Yes" : "No") << std::endl; // No

    // 8. 使用循环清空栈中所有元素，并在每次出栈时打印被弹出的元素。
    std::cout << "Clearing stack:" << std::endl;
    while (!s.empty()) {
        std::cout << "Popping: " << s.top() << std::endl;
        s.pop();
    }
    std::cout << "Is stack empty now? " << (s.empty() ? "Yes" : "No") << std::endl; // Yes

    return 0;
}
```

**2. 小球入栈出栈序列：**

```cpp
#include <iostream>
#include <vector>
#include <stack>

bool isPossiblePopSequence(int n, const std::vector<int>& popSequence) {
    if (popSequence.size() != n) {
        return false; // 出栈序列长度必须等于n
    }

    std::stack<int> s;
    int currentPush = 1; // 模拟当前要入栈的小球编号

    for (int p : popSequence) { // 遍历出栈序列中的每一个元素
        // 尝试将小球入栈，直到栈顶元素等于当前要出栈的p，或者所有小球都已入栈
        while (s.empty() || s.top() != p) {
            if (currentPush > n) {
                // 如果所有小球都已入栈，但栈顶仍不是p，说明p不可能出栈
                return false;
            }
            s.push(currentPush); // 小球入栈
            currentPush++;
        }
        // 此时栈顶元素s.top() == p，可以出栈
        s.pop();
    }
    // 如果所有出栈序列都处理完毕，且没有返回false，则说明是可能的
    return true;
}

int main() {
    int n = 3;
    std::vector<int> seq1 = {1, 2, 3}; // true
    std::vector<int> seq2 = {1, 3, 2}; // true
    std::vector<int> seq3 = {3, 1, 2}; // false
    std::vector<int> seq4 = {2, 1, 3}; // true

    std::cout << "Sequence [1,2,3] is possible: " << (isPossiblePopSequence(n, seq1) ? "true" : "false") << std::endl;
    std::cout << "Sequence [1,3,2] is possible: " << (isPossiblePopSequence(n, seq2) ? "true" : "false") << std::endl;
    std::cout << "Sequence [3,1,2] is possible: " << (isPossiblePopSequence(n, seq3) ? "true" : "false") << std::endl;
    std::cout <<