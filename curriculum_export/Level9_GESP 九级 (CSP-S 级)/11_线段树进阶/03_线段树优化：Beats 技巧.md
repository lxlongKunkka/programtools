# 线段树优化：Beats 技巧

## 教学目标

知识  
- 理解线段树的基本结构和操作  
- 掌握 Beats 技巧中的核心思想：维护区间最大值、第二大值、最大值个数及区间和  
- 理解如何在区间上高效执行 chmin 更新  

能力  
- 能够在已有线段树框架中加入 Beats 优化  
- 能编写支持区间 chmin 与区间求和的线段树代码，并分析其时间复杂度  

素养  
- 培养分治与递归思维，面对复杂区间操作能拆解子问题  
- 养成阅读和调试高性能数据结构代码的习惯  

===NEXT===

## 趣味引入

真实场景：幻想游戏中有一排防御塔，每栋塔都有一个耐久度。  
- 当敌军炮击时，只要某一区域内的塔耐久度超过阈值，就会被削弱到该阈值，否则保持不变。  
- 同时，我们需要实时统计某一区域内所有塔的耐久度总和。  

已知：普通线段树能做区间赋值、加值、求和等，但面对“只降低超过阈值的元素”时会退化为 O(n)  
未知：如何在保证 O(log n) 复杂度下完成上述“区间 chmin”操作？  
引出：Beats 技巧，专门用来“打击”超出阈值的最大元素  

===NEXT===

## 知识点讲解

1. 基础回顾  
   - 线段树节点需维护：区间和 sum  
   - 普通区间更新的懒标记思想  

2. Beats 核心思想  
   - 额外维护：区间最大值 mx1、第二大值 mx2、最大值个数 cnt  
   - 区间 chmin：若 mx1 ≤ v，则跳过；若 mx2 < v < mx1，则可直接更新节点，无需下钻  

3. 三大函数  
   - pushUp：合并子节点的 mx1、mx2、cnt、sum  
   - applyChmin：给节点打 chmin 标记，更新 sum 和 mx1  
   - pushDown：将父节点的 chmin 传播给子节点  

4. 操作流程  
   - build：初始化 mx1、mx2、cnt、sum  
   - updateChmin：遇到合适区间直接 applyChmin，否则下钻  
   - querySum：标准区间求和，遇到标记要 pushDown  

5. 时间复杂度分析  
   - 均摊 O(log n) 执行一次区间 chmin 或查询  

===NEXT===

## 代码示例

```cpp
#include <bits/stdc++.h>
using namespace std;

const int N = 1000005;
int n, q;
long long sum[N << 2]; // 区间和
long long mx1[N << 2]; // 区间最大值
long long mx2[N << 2]; // 区间第二大值
int cnt[N << 2];       // 区间最大值个数

// 向上合并子节点信息
void pushUp(int o)
{
    if (mx1[o << 1] == mx1[o << 1 | 1])
    {
        mx1[o] = mx1[o << 1];
        cnt[o] = cnt[o << 1] + cnt[o << 1 | 1];
        mx2[o] = max(mx2[o << 1], mx2[o << 1 | 1]);
    }
    else if (mx1[o << 1] > mx1[o << 1 | 1])
    {
        mx1[o] = mx1[o << 1];
        cnt[o] = cnt[o << 1];
        mx2[o] = max(mx2[o << 1], mx1[o << 1 | 1]);
    }
    else
    {
        mx1[o] = mx1[o << 1 | 1];
        cnt[o] = cnt[o << 1 | 1];
        mx2[o] = max(mx1[o << 1], mx2[o << 1 | 1]);
    }
    sum[o] = sum[o << 1] + sum[o << 1 | 1];
}

// 给节点直接打 chmin 标记
void applyChmin(int o, long long v)
{
    if (mx1[o] <= v) 
        return;
    sum[o] -= (mx1[o] - v) * cnt[o]; // 更新区间和
    mx1[o] = v;                      // 更新最大值
}

// 向下传播 chmin 标记
void pushDown(int o)
{
    applyChmin(o << 1,     mx1[o]);
    applyChmin(o << 1 | 1, mx1[o]);
}

// 建树：读取初始数组
void build(int o, int l, int r)
{
    if (l == r)
    {
        long long x;
        cin >> x;
        sum[o] = mx1[o] = x;
        mx2[o] = -LLONG_MAX; // 设置第二大为极小
        cnt[o] = 1;
        return;
    }
    int mid = (l + r) >> 1;
    build(o << 1,     l,   mid);
    build(o << 1 | 1, mid+1, r);
    pushUp(o);
}

// 区间 chmin 操作
void updateChmin(int o, int l, int r, int L, int R, long long v)
{
    if (l > R || r < L || mx1[o] <= v)
        return;
    if (L <= l && r <= R && mx2[o] < v)
    {
        applyChmin(o, v);
        return;
    }
    pushDown(o);
    int mid = (l + r) >> 1;
    updateChmin(o << 1,     l,   mid, L, R, v);
    updateChmin(o << 1 | 1, mid+1, r, L, R, v);
    pushUp(o);
}

// 区间求和
long long querySum(int o, int l, int r, int L, int R)
{
    if (l > R || r < L)
        return 0;
    if (L <= l && r <= R)
        return sum[o];
    pushDown(o);
    int mid = (l + r) >> 1;
    return querySum(o << 1,     l,   mid, L, R)
         + querySum(o << 1 | 1, mid+1, r, L, R);
}

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    cin >> n >> q;
    build(1, 1, n);
    while (q--)
    {
        int op, l, r;
        long long v;
        cin >> op >> l >> r;
        if (op == 0)
        {
            cin >> v;
            updateChmin(1, 1, n, l, r, v); // 区间 chmin
        }
        else
        {
            cout << querySum(1, 1, n, l, r) << '\n'; // 区间求和
        }
    }
    return 0;
}
```

===NEXT===

## 课堂互动

1. 提问：  
   - 为什么需要维护第二大值 mx2？  
   - applyChmin 中为什么要同时更新 sum 和 mx1？  

2. 小组任务（每组 3 人）  
   - 在现有代码基础上，新增一个“区间 chmax”（只提升小于阈值的元素到阈值）操作，讨论需要维护哪些额外信息？  
   - 分析该操作与 chmin 的异同，并在纸上画出 pushUp/pushDown 流程。  

===NEXT===

## 练习题目

基础题  
1. Beats 技巧中，维护第二大值 mx2 的主要目的是 ______ 。  
2. 当一次区间 chmin 完全落到叶子节点时，最坏时间复杂度是 ______ 。  

进阶题  
3. 以下哪种操作不适合用 Beats 技巧？（单选）  
   A. 区间取模（对每个元素求余）  
   B. 区间 chmin  
   C. 区间加法  
   D. 区间求和  

4. 若区间内所有元素都相同，执行一次 chmin 更新的均摊复杂度是？（单选）  
   A. O(1)  
   B. O(log n)  
   C. O(n)  
   D. O(n log n)  

答案与解析  
1. 限制次大元素，从而判断当前节点是否可以一次性打标记，避免下钻。  
2. O(log n)（均摊分析下，一次不突破上界的操作为 O(log n)）。  
3. A。区间取模无法仅通过最大值/最小值来剪枝。  
4. A。所有元素相同，mx1=mx2，chmin 直接在根节点打标即可。  

===NEXT===

## 教学评价与作业

过程性反馈  
- 教师巡回检查小组讨论思路，点评 pushUp/pushDown 的难点  
- 随机抽取同学讲解 chmin 操作的条件判断  

结果性检验  
- 课堂小测：现场书写简化版线段树 Beats 伪代码  

课后作业  
1. 实现“区间 chmin + 区间加法 + 区间求和”三合一的 Beats 线段树，并撰写时间复杂度分析。  
2. 阅读并总结 Codeforces 上一篇使用 Beats 技巧解决的经典题目，写出核心思想。  

鼓励语：同学们，线段树 Beats 是处理复杂区间约束的利器，回家多练多思考，进步就在下一个挑战！