# scanf 和 printf

## 教学目标

知识  
- 理解 `scanf` 和 `printf` 的基本作用：分别用于从标准输入读取数据和向标准输出打印数据。  
- 掌握常用格式控制符及其对应的数据类型：  
  - `%d` → int  
  - `%lld` → long long  
  - `%f` → float  
  - `%lf` → double  
  - `%c` → char  

能力  
- 能够根据变量类型，选择并正确使用相应的格式控制符完成数据的输入与输出。  
- 能够在程序中正确使用取地址符 `&`，避免常见的格式错误。  

素养  
- 培养代码规范意识，学会仔细匹配格式控制符与变量类型。  
- 养成调试习惯，通过观察输入输出结果验证程序正确性。  

===NEXT===

## 趣味引入

同学们，你们有没有想过游戏里“角色属性面板”是怎么输入并显示的？  
- 比如：输入你的等级（int 型）、累计经验（long long 型）、命中率（float 型）、暴击率（double 型）、性别（char 型），然后立刻显示在屏幕上。  
- 今天，我们就来学习 `scanf` 和 `printf`，帮游戏把你的数据“吃”进去，再“吐”出来！

已知：  
  - 你在游戏里有不同类型的属性。  
未知：  
  - 我们如何用 C++ 代码读入和打印这些属性？  

===NEXT===

## 知识点讲解

1. `scanf` 与 `printf` 的作用  
   - `scanf`：从标准输入（键盘）读取数据到变量。  
   - `printf`：把变量的值按指定格式输出到屏幕。  

2. 语法格式  
   - scanf: `int scanf(const char *format, ...);`  
   - printf: `int printf(const char *format, ...);`  

3. 格式控制符与类型对应关系  
   - `%d`  → `int`  
   - `%lld`→ `long long`  
   - `%f`  → `float`  
   - `%lf` → `double`  
   - `%c`  → `char`  

4. 注意事项  
   - `scanf` 中变量前必须加取地址符 `&`（`char` 除外也需 `&`）。  
   - 格式控制符必须与变量类型一一对应，顺序一致。  
   - 输出多个不同类型时，要在格式字符串中依次写出对应的控制符，并在后面依次列出变量。

===NEXT===

## 代码示例

```cpp
#include <bits/stdc++.h>
using namespace std;

int main()
{
    int a;               // 等级
    long long b;         // 累计经验
    float c;             // 命中率
    double d;            // 暴击率
    char e;              // 性别 ('M' 或 'F')

    // 提示输入
    printf("请输入等级、经验、命中率、暴击率、性别（以空格分隔）：\n");
    // 读取五种类型的数据
    scanf("%d %lld %f %lf %c", &a, &b, &c, &d, &e);

    // 输出读取到的值
    printf("————— 角色属性 —————\n");
    printf("等级（int）：%d\n", a);
    printf("经验（long long）：%lld\n", b);
    printf("命中率（float）：%.2f\n", c);    // 保留两位小数
    printf("暴击率（double）：%.3lf\n", d); // 保留三位小数
    printf("性别（char）：%c\n", e);

    return 0;
}
```

===NEXT===

## 课堂互动

1. 提问  
   - Q1: 如果我想读入一个 `double` 类型变量，应该使用哪个格式化字符串？  
   - Q2: 为什么 `scanf` 要在变量前面加 `&`？  

2. 小组任务  
   - 分组编写代码，分别实现以下功能：  
     1. 读入两个 `int`，输出它们的和与差。  
     2. 读入一个 `float` 和一个 `double`，输出它们的乘积与商。  
     3. 读入一个 `char`，判断它是否为大写字母，并输出结果。

===NEXT===

## 练习题目

基础题 (选择题/填空题，共 5 题)

1. `%d` 对应的数据类型是（  ）。  
   A. char   B. int   C. float   D. double  

2. 要输出一个 `long long` 变量 `b`，正确的写法是（  ）。  
   A. printf("%d", b);  
   B. printf("%lld", b);  
   C. printf("%f", b);  
   D. printf("%c", b);  

3. scanf 读入 `float` 变量 `c`，下列哪项是正确的？（多选）  
   A. scanf("%f", c);  
   B. scanf("%f", &c);  
   C. scanf("%lf", &c);  
   D. scanf("%d", &c);  

4. 如果要读入并输出一个 `char` 变量 `e`，正确的代码段是（  ）。  
   A. scanf("%c", &e); printf("%c", e);  
   B. scanf("%c", e); printf("%c", &e);  
   C. scanf("%d", &e); printf("%d", e);  
   D. scanf("%c", &e); printf("%d", e);  

5. （填空题）  
   若要保留两位小数地输出 `double` 变量 `d`，`printf` 的格式字符串可以写成 `"__________"`（只写引号里的内容）。

---

答案与解析：

1. 答案：B  
   解析：`%d` 是用于 `int` 类型的格式控制符。  

2. 答案：B  
   解析：`long long` 对应 `%lld`。  

3. 答案：B  
   解析：`float` 类型要用 `%f`，并且要加 `&` 才能将数据读入变量。  

4. 答案：A  
   解析：`char` 也需要用 `%c`，`scanf` 时要加 `&`，`printf` 直接用变量名。  

5. 答案：`%.2lf`  
   解析：`%lf` 用于 `double`，`.2` 表示保留两位小数。

===NEXT===

## 教学评价与作业

过程性评价  
- 教师巡视小组讨论，及时纠正同学对格式控制符与类型不匹配的问题。  
- 随堂提问检查对 `%d`、`%lld`、`%f`、`%lf`、`%c` 的掌握情况。  

结果性检验  
- 小测：给出变量类型，写出相应的 `scanf`/`printf` 语句片段。  

课后作业  
1. 编写程序，读入一个 `int`、一个 `double` 和一个 `char`，然后输出：  
   - `int` 的平方  
   - `double` 保留一位小数后的值  
   - `char` 的 ASCII 码值  
2. 写一份小报告，总结 `scanf`/`printf` 使用中常见的三种错误及解决方法。  

鼓励同学们多动手、多练习，下节课我们将学习更丰富的格式控制符和字符串操作。加油！