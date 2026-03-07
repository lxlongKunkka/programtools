# 优先队列(priority_queue) 与 STL

> **章节 ID：** `6-1-3`  
> **所属专题：** 专题 1 — 数据结构进阶  
> **所属等级：** Level 6 — GESP 六级 (数据结构)

---

## 必做题（1）

- `atcoder:2240`

## 教案内容

## 教学目标

知识目标  
- 掌握 priority_queue 的定义、用途及常见操作（push、pop、top、empty）。  
- 理解 STL 中 priority_queue 默认是最大堆，并能使用自定义比较器实现最小堆。  
- 了解 priority_queue 底层容器及操作的时间复杂度（O(log n)）。

能力目标  
- 能在 C++ 中正确使用 priority_queue 解决实际问题。  
- 能根据需求编写自定义比较器，灵活调整优先级规则。  
- 能分析并描述 priority_queue 操作的时间和空间复杂度。

素养目标  
- 培养算法思维，理解“贪心”“优先级队列”在真实场景中的应用。  
- 强化代码规范意识，使用统一的命名和 Allman 风格。  
- 增强团队协作和表达能力，通过小组讨论分享解决思路。

===NEXT===

## 趣味引入

真实场景：医院急诊室  
- 医院急诊室需要根据病情紧急程度安排就诊顺序。  
- 病情越危急的患者，优先就诊。  
已知：每个患者都有一个“紧急程度”评分，分数越高代表病情越危急。  
未知：如何在程序中模拟“分数越高优先处理”这一过程？  
引出：使用 priority_queue，让最高紧急度的患者优先出队。

===NEXT===

## 知识点讲解

1. 抽象概念  
   - 优先队列是一种每次取出元素会依据“优先级”决定顺序的队列。  
   - 与普通队列 FIFO 不同，优先队列出队顺序由优先级决定。

2. STL 实现  
   - `priority_queue<T, Container, Compare>`  
     - 默认：`priority_queue<int>` 相当于 `priority_queue<int, vector<int>, less<int>>`，即最大堆。  
     - 底层容器可选 `vector` 或 `deque`，默认 `vector`。

3. 常用操作  
   - `push(x)`：插入元素，O(log n)  
   - `pop()`：删除队首元素（优先级最高），O(log n)  
   - `top()`：访问队首元素，O(1)  
   - `empty()`：判断是否为空，O(1)

4. 自定义比较器  
   - 最小堆：`priority_queue<int, vector<int>, greater<int>>`  
   - 结构体比较器：  
     ```cpp
     struct Cmp
     {
         bool operator()(const Node &a, const Node &b)
         {
             return a.priority > b.priority; // 小顶堆：priority 小的优先
         }
     };
     ```

5. 复杂度分析  
   - 插入和删除操作均为 O(log n)，查询 top 为 O(1)。  
   - 空间复杂度为 O(n)，n 为队列元素个数。

===NEXT===

## 代码示例

```cpp
#include <bits/stdc++.h>
using namespace std;

// 示例1：默认最大堆
int main()
{
    priority_queue<int> q;
    q.push(5);
    q.push(2);
    q.push(9);
    cout << "Max-heap top: " << q.top() << "\n"; // 输出 9
    q.pop();
    cout << "After pop, top: " << q.top() << "\n"; // 输出 5
    return 0;
}
```

```cpp
#include <bits/stdc++.h>
using namespace std;

// 示例2：最小堆
int main()
{
    priority_queue<int, vector<int>, greater<int>> q;
    q.push(5);
    q.push(2);
    q.push(9);
    cout << "Min-heap top: " << q.top() << "\n"; // 输出 2
    q.pop();
    cout << "After pop, top: " << q.top() << "\n"; // 输出 5
    return 0;
}
```

```cpp
#include <bits/stdc++.h>
using namespace std;

// 示例3：自定义结构和比较器
struct Patient
{
    int id;
    int severity;
};

struct Cmp
{
    bool operator()(const Patient &a, const Patient &b)
    {
        return a.severity < b.severity; // 大顶堆：severity 大的先出
    }
};

int main()
{
    priority_queue<Patient, vector<Patient>, Cmp> q;
    q.push({1, 5});
    q.push({2, 9});
    q.push({3, 7});
    Patient topPatient = q.top();
    cout << "Next patient ID: " << topPatient.id << "\n"; // 输出 2
    return 0;
}
```

===NEXT===

## 课堂互动

1. 提问  
   - 优先队列和普通队列的区别是什么？  
   - 默认情况下 priority_queue 的底层容器是什么？  
   - 实现最小堆需要做哪些修改？

2. 小组任务  
   - 分组模拟“任务调度”：给定一组任务，每个任务有优先级和执行时间，设计调度方案（用 priority_queue）并输出执行顺序。  
   - 展示各组代码，高效性与可读性是评分要点。

3. 现场挑战  
   - 请在 5 分钟内编写一段代码，实现从输入的 n 个数中快速找出前 k 大的数。

===NEXT===

## 练习题目

请先完成下列题目，再对照答案自测。

1. (单选) 默认的 `priority_queue<int>` 使用的底层容器是  
   A. list  
   B. deque  
   C. vector  
   D. set

2. (填空) 要构造一个最小堆，可声明  
   `priority_queue<int, ___, ___> q;`

3. (单选) 在最大堆中，执行 `pop()` 操作的时间复杂度是  
   A. O(1)  
   B. O(n)  
   C. O(log n)  
   D. O(n log n)

4. (判断) `priority_queue<int, vector<int>, greater<int>>` 是实现最大堆。(  )

5. (应用) 给定序列 [3, 1, 4, 1, 5, 9]，先全部 push 到最大堆，然后依次 pop，得到的序列是________。

答案与解析：

1. 答案：C  
   解析：STL 默认 priority_queue 底层使用 vector。

2. 答案：vector, greater<int>  
   解析：第二个模板参数为容器类型，第三个为比较器。

3. 答案：C  
   解析：入队和出队操作需维护堆性质，时间复杂度 O(log n)。

4. 答案：错误  
   解析：greater<int> 定义的是最小堆。

5. 答案：9,5,4,3,1,1  
   解析：最大堆依次弹出从大到小的元素。

===NEXT===

## 教学评价与作业

过程性反馈  
- 教师通过提问和小组展示，及时点评学生代码思路、可读性和正确性。  
- 引导发现常见错误，如比较器方向搞反、未初始化结构体等。

结果性检验  
- 通过练习题正确率评估对 priority_queue 的掌握程度。  
- 现场编程任务完成情况作为能力考核参考。

课后巩固  
- 作业：  
  1. 编写“数据流中位数维护”程序，要求动态插入数字并能实时输出中位数，推荐使用两个 priority_queue。  
  2. 阅读并手写实现堆排序，理解底层原理并与 priority_queue 区别。

下节预告  
- 线性结构专题：`deque` 与 `list` 在实际应用中的优势对比。欢迎预习！
