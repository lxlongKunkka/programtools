---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section {
    background-image: url('https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/images/qimailogo.png');
    background-repeat: no-repeat;
    background-position: top 16px right 26px;
    background-size: 72px;
    overflow-y: auto !important;
  }
  section::after { position: fixed !important; }
  details {
    margin: 8px 0; padding: 6px 14px;
    border: 2px dashed #e74c3c; border-radius: 8px;
    background: #fff5f5;
  }
  summary {
    font-weight: bold; font-size: 0.85em;
    color: #c0392b; cursor: pointer; padding: 4px 0;
  }
  details[open] summary {
    color: #27ae60; border-bottom: 1px solid #eee;
    padding-bottom: 8px; margin-bottom: 6px;
  }
  .question { margin: 8px 0; }
  table { font-size: 0.85em; }
---

<!-- _class: lead -->

# CSP-J 初赛第5节 · 算法专题（下）

**排序 + 递归 + 枚举 + 图论 + BFS + DFS**

<div style="text-align: center; margin-top: 60px;">

### 岐麦教育

</div>

<div style="text-align: center; margin-top: 80px; font-size: 14px; color: #888;">

📅 第5节 | ⏱️ 约 4 小时 | 📝 约 160 道题

</div>

---

<!-- _class: lead -->

# 本节目标

<div style="margin: 30px 0;">

| 目标 | 内容 |
|------|------|
| ⭐ 掌握五大排序算法 | 冒泡 / 选择 / 插入 / 快排 / 归并 |
| ⭐ 理解递归思想 | 递归基础 + 经典问题 + 时间复杂度分析 |
| ⭐ 掌握枚举策略 | 朴素枚举 + 二进制枚举 + 优化技巧 |
| ⭐ 掌握图的概念与存储 | 邻接矩阵 vs 邻接表，适用场景 |
| ⭐ 掌握 BFS + DFS | 队列/递归实现、最短路/连通性应用 |
| ⭐ 了解搜索剪枝 | 可行性剪枝 + 最优性剪枝 |

</div>

---

<!-- _class: lead -->

# 📦 上半场：排序 + 递归 + 枚举

---

# 一、排序算法总览

## 什么是排序？

**排序（Sorting）**：把一组无序的数据按**关键字**从小到大（或从大到小）排列成有序序列。

**生活中的排序**：成绩排名、字典索引、网购按价格排序……

**排序的稳定性**：相同关键字的元素在排序后**相对顺序不变**，称为稳定排序。

> 💡 稳定排序：冒泡、插入、归并 | 不稳定排序：选择、快排

---

## 五种排序算法对比

| 排序算法 | 最好 | 平均 | 最坏 | 空间 | 稳定性 |
|---------|------|------|------|------|--------|
| 冒泡排序 | O(n) | O(n²) | O(n²) | O(1) | 稳定 |
| 选择排序 | O(n²) | O(n²) | O(n²) | O(1) | 不稳定 |
| 插入排序 | O(n) | O(n²) | O(n²) | O(1) | 稳定 |
| 快速排序 | O(n log n) | O(n log n) | O(n²) | O(log n)~O(n) | 不稳定 |
| 归并排序 | O(n log n) | O(n log n) | O(n log n) | O(n) | 稳定 |

---

# 二、冒泡排序（Bubble Sort）

## 核心思想

> 每趟比较相邻两个元素，**大的往后冒**，每趟将当前最大元素放到末尾。

```cpp
for (int i = 0; i < n - 1; i++) {       // 共 n-1 趟
    for (int j = 0; j < n - 1 - i; j++) {
        if (a[j] > a[j + 1])
            swap(a[j], a[j + 1]);       // 相邻交换（大值右移）
    }
}
```

---

## 冒泡排序图解

```
第1趟: [5 3 8 1 4] → 比较(5,3)交换 → [3 5 8 1 4]
                          比较(5,8)不换 → [3 5 8 1 4]
                          比较(8,1)交换 → [3 5 1 8 4]
                          比较(8,4)交换 → [3 5 1 4 8]  ← 最大值归位

第2趟: [3 5 1 4] → [3 1 5 4] → [3 1 4 5]            ← 第2大归位
...
```

---

## 冒泡排序的性质

| 性质 | 说明 |
|------|------|
| 时间复杂度（最坏/平均）| O(n²) |
| 时间复杂度（最好/O(n)）| 已排序 + `swapped` 标志，提前终止 |
| 空间复杂度 | O(1)，原地排序 |
| 稳定性 | ✅ 稳定（相邻交换） |
| 交换次数 | 最坏 n(n-1)/2 次 |

> 🔴 **易错**：最多 n-1 趟，不是 n 趟！

---

## 冒泡排序课堂真题

<div class="question">

**题目1** 对 n 个元素进行冒泡排序，最少的比较次数是（ ）。

A. 0  
B. n - 1  
C. n × (n - 1) / 2  
D. n²

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（n - 1）**

当数组已经有序时，第一趟比较 n-1 次后没有交换发生，算法终止（`swapped` 优化）。最少比较次数为 n-1。

</details>

---

<div class="question">

**题目2** 冒泡排序的最好时间复杂度是（ ）。

A. O(1)  
B. O(n)  
C. O(n log n)  
D. O(n²)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（O(n)）**

使用 `swapped` 优化后，已有序数组只需一趟，O(n) 即可结束。若不优化则始终是 O(n²)。

</details>

---

<div class="question">

**题目3** 以下关于冒泡排序的说法，正确的是（ ）。

A. 冒泡排序是不稳定的  
B. 冒泡排序每趟将一个最小元素放到最前面  
C. 冒泡排序最多进行 n 趟排序  
D. 冒泡排序可以优化为提前结束

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

A 错：冒泡排序稳定（相邻交换不会跨越相等元素）；B 错：是最大元素放到最后，不是最小放最前；C 错：最多 n-1 趟；D 正确：设置 flag 检测是否交换即可提前终止。

</details>

---

<div class="question">

**题目4** 对序列 `[5, 3, 8, 1, 4]` 进行冒泡排序，第1趟后的结果是（ ）。

A. `[3, 5, 1, 4, 8]`  
B. `[3, 5, 8, 1, 4]`  
C. `[3, 1, 4, 5, 8]`  
D. `[3, 5, 1, 8, 4]`

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A**

5>3交换, 5<8不换, 8>1交换, 8>4交换 → `[3, 5, 1, 4, 8]`。最大8归位。

</details>

---

# 三、选择排序（Selection Sort）

## 核心思想

> 每一趟从**未排序部分**选出最小（或最大）元素，放到已排序序列的末尾。

```cpp
for (int i = 0; i < n - 1; i++) {      // 共 n-1 趟
    int k = i;
    for (int j = i + 1; j < n; j++)   // 在[i+1, n)中找最小值
        if (a[j] < a[k]) k = j;
    swap(a[i], a[k]);                   // 交换到位置 i
}
```

---

## 选择排序图解

```
初始: [3 1 4 1 5]
第1趟: 在[3,1,4,1,5]中找最小1(下标1) → swap(a[0],a[1])
       → [1 3 4 1 5]

第2趟: 在[3,4,1,5]中找最小1(下标3) → swap(a[1],a[3])
       → [1 1 4 3 5]

第3趟: 在[4,3,5]中找最小3 → swap(a[2],a[3])
       → [1 1 3 4 5]
...
```

---

## 选择排序的性质

| 性质 | 说明 |
|------|------|
| 时间复杂度 | O(n²)，与数据状态无关 |
| 空间复杂度 | O(1)，原地排序 |
| 稳定性 | ❌ 不稳定（跨距离交换） |
| 交换次数 | 最多 n-1 次（所有 O(n²) 排序中最少）|

> 🔴 **不稳定示例**：`[5a, 8, 5b, 2]` → 第1趟 swap(5a,2) → `[2, 8, 5b, 5a]`，5a 和 5b 顺序改变。

---

## 选择排序课堂真题

<div class="question">

**题目5** 选择排序对 n 个元素排序，交换操作的次数最多是（ ）。

A. n  
B. n - 1  
C. n × (n - 1) / 2  
D. 0

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（n - 1）**

每趟最多交换 1 次，共 n-1 趟，最多 n-1 次交换。选择排序的交换次数是所有 O(n²) 排序中最少的。

</details>

---

<div class="question">

**题目6** 以下关于选择排序的说法，错误的是（ ）。

A. 选择排序的时间复杂度与数据初始状态无关  
B. 选择排序是不稳定的排序  
C. 选择排序最多交换 n - 1 次  
D. 选择排序的最坏时间复杂度为 O(n²)，最好为 O(n)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

D 错误：选择排序无论数据是否有序，始终执行 n-1 趟，时间复杂度恒为 O(n²)。最好情况也是 O(n²)，无法优化到 O(n)。

</details>

---

# 四、插入排序（Insertion Sort）

## 核心思想

> 将数组分为"已排序区"和"未排序区"，从未排序区逐个取元素，插入到已排序区的正确位置。

```cpp
for (int i = 1; i < n; i++) {         // 从第2个元素开始
    int key = a[i];
    int j = i - 1;
    while (j >= 0 && a[j] > key) {    // 在已排序区从后往前找位置
        a[j + 1] = a[j];                // 元素右移
        j--;
    }
    a[j + 1] = key;                     // 插入
}
```

---

## 插入排序图解

```
初始已排序区: [6]
第1轮插入4:  key=4, 6>4右移 → [6 6], 插入 → [4 6]
第2轮插入7:  key=7, 6<7不移动 → [4 6 7]
第3轮插入2:  key=2, 7>2,6>2,4>2右移 → [4 6 7 7]→[4 6 6 7]→[4 4 6 7]→插入2 → [2 4 6 7]
...
```

---

## 插入排序的性质

| 性质 | 说明 |
|------|------|
| 时间复杂度（最坏/平均）| O(n²) |
| 时间复杂度（最好）| O(n)，数组已有序 |
| 空间复杂度 | O(1)，原地排序 |
| 稳定性 | ✅ 稳定 |
| 特点 | 数据基本有序时效率高（接近 O(n)）|

> 💡 插入排序像整理扑克牌：每次摸一张，插入到已排序牌的正确位置。

---

## 插入排序课堂真题

<div class="question">

**题目7** 插入排序在最好情况下的时间复杂度是（ ）。

A. O(1)  
B. O(n)  
C. O(n log n)  
D. O(n²)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（O(n)）**

数组已经有序时，每次只需与已排序区域的最后一个元素比较一次即可，共 n-1 次比较，O(n)。

</details>

---

<div class="question">

**题目8** 以下关于插入排序的说法，正确的是（ ）。

A. 插入排序是稳定的  
B. 插入排序适合数据完全逆序的情况  
C. 插入排序的空间复杂度为 O(n)  
D. 插入排序的最坏时间复杂度为 O(n)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A**

A 正确：相等时不右移，稳定；B 错：逆序时 O(n²)，效率最低；C 错：空间 O(1)；D 错：最坏 O(n²)。

</details>

---

# 五、快速排序（Quick Sort）

## 核心思想

> 选取一个 **pivot（基准）**，将数组分为两部分：左侧 ≤ pivot，右侧 ≥ pivot，递归处理两侧。

```cpp
void quickSort(int a[], int L, int R) {
    if (L >= R) return;
    int i = L, j = R, pivot = a[L];    // 以左端为 pivot
    while (i < j) {
        while (i < j && a[j] >= pivot) j--;  // 右找小
        if (i < j) a[i++] = a[j];
        while (i < j && a[i] <= pivot) i++;  // 左找大
        if (i < j) a[j--] = a[i];
    }
    a[i] = pivot;                          // pivot 归位
    quickSort(a, L, i - 1);
    quickSort(a, i + 1, R);
}
```

---

## 快速排序图解

```
pivot = 6
[6 3 5 1 8 4 7]
 从右找小(4)←───────
 从左找大(x)──→  ←找不到，i=j，交换
→ [4 3 5 1 6 8 7]   pivot归位，下标i

左区[4 3 5 1]  递归处理
右区[8 7]      递归处理
```

---

## 快速排序的性质

| 性质 | 说明 |
|------|------|
| 时间复杂度（平均）| O(n log n) |
| 时间复杂度（最坏）| O(n²)，数据有序且选首元素 pivot |
| 空间复杂度 | O(log n)~O(n)（递归栈）|
| 稳定性 | ❌ 不稳定 |
| 优化技巧 | 随机选 pivot，三数取中 |

> 🔴 **易错**：最坏情况发生在数组**已有序**且选第一个元素为 pivot 时！不是逆序！

---

## 快速排序课堂真题

<div class="question">

**题目9** 快速排序的最坏时间复杂度出现在（ ）。

A. 数组完全逆序  
B. 数组已经有序且每次取第一个元素为 pivot  
C. 数组中有大量重复元素  
D. 数组元素很少

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

当数组已有序且每次选第一个元素为 pivot 时，分区极不平衡，每次只排除一个元素，退化为 O(n²)。

</details>

---

<div class="question">

**题目10** 以下关于快速排序的说法，正确的是（ ）。

A. 快速排序是稳定的排序算法  
B. 快速排序的空间复杂度为 O(1)  
C. 快速排序的最坏时间复杂度为 O(n²)  
D. 快速排序在任何情况下都比归并排序快

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

A 错：快排不稳定；B 错：递归栈空间 O(log n)~O(n)；C 正确；D 错：最坏时归变更优。

</details>

---

<div class="question">

**题目11** 以下关于快速排序 pivot 的说法，错误的是（ ）。

A. 固定选第一个元素有可能退化到 O(n²)  
B. 随机选 pivot 可以降低最坏情况概率  
C. 选中间元素作为 pivot 比选第一个一定更好  
D. pivot 的选择不影响排序的稳定性

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

C 错误：选中间元素在某些情况下也可能退化，没有"一定更好"的说法。A/B/D 均正确。

</details>

---

# 六、归并排序（Merge Sort）

## 核心思想

> 1. **分解**：将数组从中间分成两半，递归排序子数组
> 2. **合并**：将两个有序子数组合并为一个有序数组

```cpp
void merge(int a[], int L, int mid, int R) {
    int i = L, j = mid + 1, k = 0;
    int tmp[MaxSize];
    while (i <= mid && j <= R)          // 合并两有序数组
        tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= R)   tmp[k++] = a[j++];
    for (int i = 0; i < k; i++) a[L + i] = tmp[i];  // 拷贝回原数组
}

void mergeSort(int a[], int L, int R) {
    if (L >= R) return;
    int mid = (L + R) / 2;
    mergeSort(a, L, mid);               // 递归排序左半
    mergeSort(a, mid + 1, R);          // 递归排序右半
    merge(a, L, mid, R);               // 合并
}
```

---

## 归并排序图解

```
[8, 3, 5, 1, 7, 4, 6, 2]
   分解          合并
 [8,3,5,1]    [7,4,6,2]
  [8,3] [5,1]    [7,4] [6,2]
  [8][3] [5][1]  [7][4] [6][2]
    ↘↗  ↘↗        ↘↗  ↘↗
  [3,8] [1,5]    [4,7] [2,6]
       ↘↗           ↘↗
    [1,3,5,8]     [2,4,6,7]
          ↘↗
    [1,2,3,4,5,6,7,8]
```

---

## 归并排序的性质

| 性质 | 说明 |
|------|------|
| 时间复杂度 | O(n log n)，**与数据状态无关** |
| 空间复杂度 | O(n)，需要临时数组 |
| 稳定性 | ✅ 稳定 |
| 特点 | **稳定 + 始终 O(n log n)**，适合要求稳定性的场景 |

> 💡 归并排序 vs 快速排序：归并"先分后合"，快排"边分边排"。

---

## 归并排序课堂真题

<div class="question">

**题目12** 归并排序的时间复杂度和空间复杂度分别是（ ）。

A. O(n log n), O(1)  
B. O(n²), O(1)  
C. O(n log n), O(n)  
D. O(n log n), O(n log n)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（O(n log n), O(n)）**

归并排序合并时需要临时数组存储，空间复杂度 O(n)。时间复杂度始终为 O(n log n)，不受输入数据影响。

</details>

---

<div class="question">

**题目13** 归并排序中，当合并两个有序子数组时，若 `a[i] == a[j]`（a[i] 来自左边），先取 a[i]，这保证了归并排序的（ ）。

A. 高效性  
B. 稳定性  
C. 原地性  
D. 最好时间复杂度

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（稳定性）**

相等元素来自两个不同子数组时，先取左边的，保证原顺序不变 → 稳定排序。

</details>

---

# 七、递归（Recursion）

## 什么是递归？

**递归**：函数调用自身来解决问题。包含两个要素：

> 1. **递归终止条件**（边界）：不再调用自身，直接返回
> 2. **递归式**（递推）：调用自身处理更小规模的子问题

```cpp
// 递归求阶乘
int fact(int n) {
    if (n <= 1) return 1;      // 递归终止条件
    return n * fact(n - 1);     // 递归式
}
```

> 💡 递归就像**俄罗斯套娃**：打开一个，里面还有一个更小的，直到最小的那个（终止条件）。

---

## 递归的执行过程

```
fact(4) = 4 * fact(3)
          4 * (3 * fact(2))
          4 * (3 * (2 * fact(1)))
          4 * (3 * (2 * 1))
          = 24
```

**函数调用栈**：每次递归调用在栈上分配栈帧（参数+局部变量+返回地址），递归深度 = 栈帧数。

---

## 递归的经典问题

### 问题1：斐波那契数列

```cpp
int fib(int n) {
    if (n <= 1) return 1;
    return fib(n - 1) + fib(n - 2);
}
```

> ⚠️ **效率问题**：此递归有大量重复计算，时间复杂度 O(2^n)，实际使用用循环或记忆化。

---

### 问题2：汉诺塔

> 将 n 个盘子从 A 柱借助 B 柱移动到 C 柱，每次只能移动一个，大盘不能放在小盘上。

```cpp
void hanoi(int n, char from, char to, char aux) {
    if (n == 1) { cout << n << ": " << from << " -> " << to << endl; return; }
    hanoi(n - 1, from, aux, to);   // 把 n-1 个移到辅助柱
    cout << n << ": " << from << " -> " << to << endl; // 移动最大盘
    hanoi(n - 1, aux, to, from);   // 把 n-1 个移回来
}
```

**移动次数**：T(n) = 2T(n-1) + 1 → T(n) = **2^n - 1**

---

### 问题3：递归求数组和

```cpp
// 求数组前 n 项和
int sum(int a[], int n) {
    if (n <= 0) return 0;
    return a[n - 1] + sum(a, n - 1);
}
```

---

## 递归与栈的关系

| 递归调用 | 栈行为 |
|---------|--------|
| 调用自身 | 压栈（push）|
| 函数返回 | 弹栈（pop）|
| 递归深度过深 | 栈溢出（Stack Overflow）|

> 🔴 **易错**：递归深度受栈空间限制，n 过大时需改写为迭代或增大栈空间。

---

## 递归课堂真题

<div class="question">

**题目14** 以下递归函数 `func(3)` 的返回值是（ ）。

```cpp
int func(int n) {
    if (n <= 1) return 1;
    return n * func(n - 1);
}
```

A. 3  
B. 6  
C. 1  
D. 9

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（6）**

func(3) = 3 × func(2) = 3 × (2 × func(1)) = 3 × 2 × 1 = 6。

</details>

---

<div class="question">

**题目15** 以下递归函数执行后 `func(3, 5)` 的返回值是（ ）。

```cpp
int func(int a, int b) {
    if (b == 0) return a;
    return func(b, a % b);
}
```

A. 1  
B. 3  
C. 5  
D. 15

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A（1）**

这是欧几里得算法（辗转相除法），求最大公约数。func(3,5) → func(5,3) → func(3,2) → func(2,1) → func(1,0) → return 1。

</details>

---

<div class="question">

**题目16** 关于递归的说法，错误的是（ ）。

A. 递归函数必须有终止条件  
B. 递归可以转化为迭代  
C. 递归调用的深度受栈空间限制  
D. 递归一定比迭代快

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

D 错误：递归通常比迭代慢（函数调用开销 + 可能的重复计算），且占用更多栈空间。

</details>

---

<div class="question">

**题目17** 以下代码中 `f(6)` 的返回值是（ ）。

```cpp
int f(int n) {
    if (n <= 2) return 1;
    return f(n - 1) + f(n - 2);
}
```

A. 5  
B. 6  
C. 8  
D. 13

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（8）**

斐波那契数列：f(1)=1, f(2)=1, f(3)=2, f(4)=3, f(5)=5, f(6)=8。

</details>

---

<div class="question">

**题目18** 汉诺塔问题中，移动 n 个盘子最少需要（ ）步。

A. n  
B. 2n - 1  
C. 2^n - 1  
D. 2^(n-1) - 1

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（2^n - 1）**

递推公式：T(1) = 1, T(n) = 2T(n-1) + 1 → T(n) = 2^n - 1。

</details>

---

# 八、枚举（Enumeration）

## 什么是枚举？

**枚举**：根据问题的约束条件，**逐个列举**所有可能的解，从中找出正确答案。

> 枚举的本质是**搜索空间遍历**，核心问题：**搜索空间有多大**？

---

## 枚举的基本类型

### 类型1：计数枚举

统计满足条件的解的个数（不需要输出每个解）。

### 类型2：全排列枚举

利用 `next_permutation` 枚举所有排列。

```cpp
#include <algorithm>
sort(a, a + n);                    // 必须先排成升序
do {
    // 处理当前排列 a[0..n-1]
} while (next_permutation(a, a + n));
```

**排列数量**：n!（n 个不同元素）

---

### 类型3：子集枚举

枚举一个集合的所有子集（n 个元素 → 2^n 个子集）。

```cpp
for (int mask = 0; mask < (1 << n); mask++) {  // 遍历 0 ~ 2^n-1
    // 检查子集 mask（第 i 位为 1 表示选第 i 个元素）
}
```

**子集数量**：2^n（包含空集）

---

## 枚举的优化

> 枚举的核心是**搜索空间的大小**，优化方向：

| 优化方向 | 方法 |
|---------|------|
| 减少无效枚举 | 利用约束条件剪枝（如只枚举和已知的情况）|
| 减少重复枚举 | 记忆化（dp）、去重 |
| 缩小搜索范围 | 利用单调性（有序→二分）|

**经典优化示例**：判断质数

- 朴素枚举：O(n²) → 对每个数检查到 n
- 优化枚举：O(n√n) → 只需检查到 √n

---

## 枚举课堂真题

<div class="question">

**题目19** 使用 `next_permutation` 枚举排列时，对于序列 `[1, 2, 3]`，会生成（ ）个不同的排列。

A. 3  
B. 4  
C. 6  
D. 9

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（6）**

3 个不同元素的全排列 = 3! = 6。依次为：123, 132, 213, 231, 312, 321。

</details>

---

<div class="question">

**题目20** 在枚举子集时，有 n 个元素的集合，共有（ ）个非空子集。

A. n  
B. 2n  
C. 2^n  
D. 2^n - 1

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D（2^n - 1）**

总子集数 = 2^n（每个元素选/不选），减去空集得 2^n - 1。

</details>

---

<div class="question">

**题目21** 以下代码的输出结果是（ ）。

```cpp
int cnt = 0;
for (int i = 0; i < 5; i++)
    for (int j = 0; j < 5; j++)
        for (int k = 0; k < 5; k++)
            if (i + j + k == 4) cnt++;
cout << cnt;
```

A. 10  
B. 12  
C. 15  
D. 20

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（15）**

求 x+y+z=4 的非负整数解个数，即 C(4+3-1, 3-1) = C(6,2) = 15。

</details>

---

<div class="question">

**题目22** 以下关于 `next_permutation` 的说法，正确的是（ ）。

A. 可以对任意顺序的数组使用next_permutation  
B. next_permutation 返回 void  
C. 初始数组为升序时，next_permutation 才能枚举所有排列  
D. next_permutation 的时间复杂度为 O(n)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

A 错：必须先 sort 成升序才能枚举所有排列；B 错：返回 bool；D 错：O(n)；C 正确。

</details>

---

# 九、综合练习

---

<div class="question">

**题目23** 以下代码段执行后，输出结果是（ ）。

```cpp
int a[5] = {3, 1, 4, 1, 5};
for (int i = 0; i < 4; i++) {
    for (int j = 0; j < 4 - i; j++) {
        if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
    }
}
for (int i = 0; i < 5; i++) cout << a[i] << " ";
```

A. `1 3 1 4 5`  
B. `1 1 3 4 5`  
C. `3 1 4 1 5`  
D. `1 1 4 3 5`

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（1 1 3 4 5）**

冒泡排序标准写法，5个元素经4趟后一定有序。

</details>

---

<div class="question">

**题目24** 以下排序算法中，**不稳定**的是（ ）。

A. 冒泡排序  
B. 插入排序  
C. 归并排序  
D. 选择排序

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

稳定排序：冒泡、插入、归并。不稳定排序：选择排序（跨距离交换）、快速排序。

</details>

---

<div class="question">

**题目25** C++ 的 `std::sort()` 使用的是什么排序算法？

A. 纯快排  
B. 归并排序  
C. 堆排序  
D. 快排+堆排+插排混合（内省排序）

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

`std::sort()` 使用**内省排序（Introsort）**：开始用快排，若递归过深则切换堆排，数据量小时切换插排。**不稳定**。

</details>

---

<div class="question">

**题目26** 递归函数 `f(123)` 的返回值是（ ）。

```cpp
int f(int n) {
    if (n == 0) return 0;
    return n % 10 + f(n / 10);
}
```

A. 6  
B. 123  
C. 3  
D. 1

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A（6）**

递归求**各位数字之和**：f(123) = 3 + f(12) = 3 + (2 + f(1)) = 3 + 2 + 1 = 6。

</details>

---

<div class="question">

**题目27** 以下代码执行后，输出的是（ ）。

```cpp
void mystery(int n) {
    if (n <= 0) return;
    cout << n << " ";
    mystery(n - 1);
    cout << n << " ";
}
mystery(4);
```

A. `4 3 2 1 1 2 3 4`  
B. `4 3 2 1 4 3 2 1`  
C. `4 3 2 1 2 3 4`  
D. `1 2 3 4 4 3 2 1`

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A**

递归前输出递减，递归后输出递增。输出 `4 3 2 1 1 2 3 4`。

</details>

---

<div class="question">

**题目28** 以下关于排序算法稳定性的说法，正确的是（ ）。

A. 冒泡排序和插入排序都是不稳定的  
B. 归并排序和快速排序都是稳定的  
C. 快速排序在任何情况下都是不稳定的  
D. 排序的稳定性是指相同关键字元素的相对顺序保持不变

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

A 错：冒泡和插入都稳定；B 错：快排不稳定；C 错：稳定性取决于具体实现；D 正确，是稳定性的定义。

</details>

---

<div class="question">

**题目29** 递归函数 `f(n)` 的时间复杂度是（ ）。

```cpp
int f(int n) {
    if (n <= 1) return 1;
    int sum = 0;
    for (int i = 0; i < n; i++) sum += i;
    return f(n / 2) + f(n / 2) + sum;
}
```

A. O(n)  
B. O(n log n)  
C. O(n² log n)  
D. O(n²)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（O(n² log n)）**

> ⚠️ **原题答案有误，已更正为 C。**

分析：`sum` 循环累加 0+1+...+(n-1) = n(n-1)/2 = **O(n²)**。  
递推式：T(n) = 2T(n/2) + O(n²)  
递归树：每层合并代价 O(n²)，共 log n 层 → **O(n² log n)**。

</details>

---

<div class="question">

**题目30** 递归函数 `f(n)` 的时间复杂度是（ ）。

```cpp
int f(int n) {
    if (n <= 1) return 1;
    return f(n - 1) + f(n - 1);
}
```

A. O(n)  
B. O(n log n)  
C. O(2^n)  
D. O(n²)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（O(2^n)）**

递推式 T(n) = 2T(n-1)，展开为 2^n 个叶子调用，复杂度 O(2^n)。

</details>

---

<!-- _class: lead -->

# 📦 下半场：图论基础 + BFS + DFS

---

# 十、图的基本概念

## 什么是图？

**图（Graph）** = 顶点（Vertex）+ 边（Edge）

```
G = (V, E)
V = {顶点集合}
E = {边集合}
```

**生活中的图**：
- 城市地图（城市=顶点，道路=边）
- 社交网络（人=顶点，关注关系=边）
- 网络拓扑（主机=顶点，连接=边）

> 💡 图是比树更一般的数据结构，树是一种特殊的图（无环连通图）！

---

## 图的分类

| 类型 | 说明 | 图示 |
|------|------|------|
| **无向图** | 边无方向，A-B等价于B-A | A — B |
| **有向图** | 边有方向（弧），A→B ≠ B→A | A → B |
| **带权图** | 边带有权值（距离、费用等）| A —5— B |
| **无权图** | 边无权值，仅表示连通关系 | A — B |

> 💡 有向图的边叫"**弧**"，无向图的边叫"**边**"。

---

## 图的重要术语

| 术语 | 定义 |
|------|------|
| **度（Degree）** | 无向图中，顶点相连的边数；有向图分**入度**和**出度** |
| **路径（Path）** | 从顶点 u 到 v 经过的顶点序列 |
| **路径长度** | 路径上边的条数（无权）或权值之和（带权）|
| **简单路径** | 路径中顶点不重复 |
| **回路/环** | 起点和终点相同的路径 |
| **连通** | 无向图中，u 和 v 之间存在路径 |
| **连通图** | 任意两顶点都连通的无向图 |
| **强连通** | 有向图中，u→v 和 v→u 都有路径 |

---

## 互动设计：图的概念辨析

**快速判断（举手回答）：**

1. 有 5 个顶点的无向完全图，共有多少条边？
2. 一个有向图中，所有顶点的入度之和等于什么？
3. 树是有环的还是无环的？

---

**答案揭晓：**

**①** 完全图每对顶点之间都有边，C(5,2) = **10 条边**

**②** 有向图中，每条弧贡献1个入度和1个出度，所以**入度之和 = 出度之和 = 边数**

**③** 树是**无环连通图**（n个顶点，n-1条边，无环）

---

## 图的基本概念课堂真题

<div class="question">

**题目31** 一个有向图中有 `n` 个顶点，若每个顶点的出度都为 2，则该图共有多少条弧？

A. n  
B. 2n  
C. n(n-1)  
D. 2n(n-1)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（2n）**

每个顶点出度为 2，n 个顶点共有 n×2 = **2n** 条弧。

</details>

---

<div class="question">

**题目32** 关于无向图中顶点的度，以下说法**正确**的是（ ）。

A. 所有顶点度之和等于边数  
B. 所有顶点度之和等于边数的 2 倍  
C. 各顶点度之和一定是奇数  
D. 度最大的顶点度等于顶点总数

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

无向图中，每条边贡献两个端点各 1 的度，所以**度之和 = 2 × 边数**（握手定理）。

</details>

---

<div class="question">

**题目33** 以下关于图的说法，**错误**的是（ ）。

A. 树是一种特殊的图  
B. 有 n 个顶点的无向连通图，至少有 n-1 条边  
C. 有向图中每个顶点的入度和出度相等  
D. 图中可以存在度为 0 的顶点（孤立顶点）

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

C 错误：有向图每个顶点的入度和出度**不一定**相等，只有所有顶点的入度之和等于出度之和（均等于边数）。

</details>

---

# 十一、图的存储结构

## 邻接矩阵

用二维数组 `adj[i][j]` 存储边的信息：

```cpp
const int MAXN = 105;
int adj[MAXN][MAXN];  // 无权图：0/1；带权图：权值/INF

// 无向图添加边
void addEdge(int u, int v) {
    adj[u][v] = 1;
    adj[v][u] = 1;  // 无向图对称
}
```

| 特点 | 说明 |
|------|------|
| 空间复杂度 | O(n²) |
| 查询 u-v 是否有边 | O(1) |
| 适合 | **稠密图**（边很多）|

---

## 邻接表

用链表（或 `vector`）存储每个顶点的邻居：

```cpp
#include <vector>
using namespace std;

const int MAXN = 100005;
vector<int> adj[MAXN];  // 无权图

// 添加边
void addEdge(int u, int v) {
    adj[u].push_back(v);
    adj[v].push_back(u);  // 无向图
}
```

| 特点 | 说明 |
|------|------|
| 空间复杂度 | O(n + m)，m 为边数 |
| 查询邻居 | O(degree) |
| 适合 | **稀疏图**（边较少）|

---

## 两种存储方式对比

| 对比项 | 邻接矩阵 | 邻接表 |
|--------|----------|--------|
| 空间 | O(n²) | O(n+m) |
| 查询 u→v 是否相邻 | O(1) | O(degree) |
| 遍历所有邻居 | O(n) | O(degree) |
| 适用图 | 稠密图 | 稀疏图 |
| 代码复杂度 | 简单 | 稍复杂 |

> 🔴 **易错**：n=1000 时邻接矩阵需要 10⁶ 的空间，大部分 CSP-J 题目用邻接表更安全！

---

## 图的存储课堂真题

<div class="question">

**题目34** 有 `n` 个顶点、`m` 条边的**稀疏**无向图，用邻接矩阵和邻接表存储，空间占用分别为（ ）。

A. O(n²) 和 O(n+m)  
B. O(nm) 和 O(n+m)  
C. O(n²) 和 O(m)  
D. O(n+m) 和 O(n²)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A**

邻接矩阵固定 n×n 空间 = O(n²)；邻接表总大小 = 顶点数 + 边数 = O(n+m)。

</details>

---

<div class="question">

**题目35** 有 5 个顶点的无向完全图，用邻接矩阵存储时，矩阵中非零元素（1）的个数为（ ）。

A. 10  
B. 20  
C. 25  
D. 5

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（20）**

完全图共 C(5,2) = 10 条边，无向图邻接矩阵对称，每条边贡献 2 个 1，共 10×2 = **20** 个。

</details>

---

<div class="question">

**题目36** 以下关于邻接矩阵的说法，**正确**的是（ ）。

A. 有向图的邻接矩阵一定是对称矩阵  
B. 无向图的邻接矩阵一定是对称矩阵  
C. 邻接矩阵只能用于无权图  
D. 邻接矩阵比邻接表更省空间

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

A 错：有向图邻接矩阵不一定对称；B 正确：无向图 adj[i][j]=adj[j][i]，必然对称；C 错：带权图可用权值填充；D 错：稀疏图时邻接矩阵浪费空间。

</details>

---

# 十二、BFS 广度优先搜索

## BFS 的核心思想

**BFS（Breadth-First Search，广度优先搜索）**：

> 从起点出发，**一圈一圈**向外扩展，先访问距离近的，再访问距离远的。

类比：**投石入水**，水波一圈一圈扩散。

```
起点 → 距离1的邻居 → 距离2的邻居 → ...
```

**核心数据结构：队列（FIFO）**

> 💡 BFS = **队列** 实现！DFS = **栈/递归** 实现！

---

## BFS 代码模板

```cpp
#include <queue>
#include <vector>
using namespace std;

const int MAXN = 100005;
vector<int> adj[MAXN];
bool visited[MAXN];
int dist[MAXN];  // 记录到起点的距离

void bfs(int start) {
    queue<int> q;
    q.push(start);
    visited[start] = true;
    dist[start] = 0;
    
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) {
            if (!visited[v]) {
                visited[v] = true;
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
}
```

> 🔴 **易错**：visited 标记应在**入队时**设置（防止重复入队），而非出队时！

---

## BFS 执行过程（图示）

```
1 - 2 - 5
|    |
3 - 4
```

| 步骤 | 当前处理 | 队列变化 | dist |
|------|---------|----------|------|
| 初始 | — | [1] | d[1]=0 |
| 出1 | 1 | [2, 3] | d[2]=1, d[3]=1 |
| 出2 | 2 | [3, 4, 5] | d[4]=2, d[5]=2 |
| 出3 | 3 | [4, 5] | d[4]已标 |
| 出4 | 4 | [5] | — |
| 出5 | 5 | [] | — |

> 最终：dist = {1:0, 2:1, 3:1, 4:2, 5:2}

---

## BFS 的性质

| 性质 | 说明 |
|------|------|
| **时间复杂度** | O(n + m)，n 为顶点数，m 为边数 |
| **空间复杂度** | O(n)，队列最多存 n 个顶点 |
| **最短路** | BFS 能求**无权图**的最短路径（边数最少）|
| **层序遍历** | 二叉树层序遍历本质就是 BFS |
| **连通性** | 一次 BFS 能访问到起点所在连通分量 |

> 🔴 **易错**：BFS 求最短路只适用于**无权图**！带权图要用 Dijkstra。

---

## BFS 课堂真题

<div class="question">

**题目37** BFS 广度优先搜索使用的数据结构是（ ）。

A. 栈  
B. 队列  
C. 优先队列  
D. 双端队列

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（队列）**

BFS 按"先进先出"的顺序扩展节点，天然对应**队列**。DFS 使用栈（或递归调用栈）。

</details>

---

<div class="question">

**题目38** 对无权无向图进行 BFS，以 s 为起点，则 BFS 求出的 dist[v] 表示（ ）。

A. 从 s 到 v 的路径经过的顶点数  
B. 从 s 到 v 的最短路径的边数  
C. 从 s 到 v 的最长路径的边数  
D. s 和 v 的距离的平方

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

BFS 按层扩展，dist[v] 记录从 s 到 v 最少需要几条边（最短路径的边数）。

</details>

---

<div class="question">

**题目39** 以下关于 BFS 的说法，**错误**的是（ ）。

A. BFS 可以求无权图的单源最短路  
B. BFS 的时间复杂度为 O(n + m)  
C. BFS 适合用队列实现  
D. BFS 能求带权图的最短路径

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

BFS 只能求**无权图**的最短路。带权图需用 Dijkstra 或 Bellman-Ford 算法。

</details>

---

# 十三、DFS 深度优先搜索

## DFS 的核心思想

**DFS（Depth-First Search，深度优先搜索）**：

> 从起点出发，**一条路走到黑**，走不通再回头（回溯），直到所有路径都搜完。

类比：**走迷宫**，不撞南墙不回头。

```
起点 → 邻居A → A的邻居B → B的邻居C（走不通，回溯）→ ...
```

**核心数据结构：栈（或递归）**

> 💡 递归函数的调用栈 = DFS 所用的栈，两者本质等价！

---

## DFS 代码模板（递归版）

```cpp
#include <vector>
using namespace std;

const int MAXN = 100005;
vector<int> adj[MAXN];
bool visited[MAXN];

void dfs(int u) {
    visited[u] = true;
    cout << u << " ";  // 处理当前节点
    
    for (int v : adj[u]) {
        if (!visited[v]) {
            dfs(v);  // 递归深入
        }
    }
    // 函数返回 = 回溯
}
```

> 💡 竞赛中优先使用**递归版**，代码更简洁。

---

## DFS 代码模板（栈迭代版）

```cpp
void dfs_iterative(int start) {
    stack<int> s;
    s.push(start);
    
    while (!s.empty()) {
        int u = s.top(); s.pop();
        if (visited[u]) continue;
        visited[u] = true;
        cout << u << " ";
        
        for (int i = adj[u].size() - 1; i >= 0; i--) {
            int v = adj[u][i];
            if (!visited[v]) s.push(v);
        }
    }
}
```

---

## BFS vs DFS 对比

| 对比项 | BFS | DFS |
|--------|-----|-----|
| 实现方式 | 队列 | 栈/递归 |
| 搜索方式 | 按层扩展（横向）| 一条路到底（纵向）|
| 求最短路 | ✅（无权图）| ❌ |
| 求连通分量 | ✅ | ✅ |
| 检测环 | ✅ | ✅ |
| 迷宫/全路径 | ❌ | ✅ |
| 空间复杂度 | O(n)（队列）| O(n)（栈深度）|

---

## DFS 课堂真题

<div class="question">

**题目40** DFS 深度优先搜索使用的数据结构是（ ）。

A. 队列  
B. 优先队列  
C. 栈（或递归）  
D. 哈希表

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（栈或递归）**

DFS 沿一条路径深入，需要"后进先出"记录回溯路径，对应**栈**；递归实现本质上利用程序调用栈。

</details>

---

<div class="question">

**题目41** 对连通图做一次 DFS，可以得到（ ）。

A. 图的最短路径  
B. 图的生成树（DFS 树）  
C. 图的最小生成树  
D. 图中所有的环

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

DFS 访问过程中，把走过的边保留下来，就形成一棵覆盖所有顶点的 **DFS 树**（即生成树）。

</details>

---

<div class="question">

**题目42** 下列哪种情况下，DFS **不适合**使用？

A. 判断图是否有环  
B. 求图中两点的最短路  
C. 求图的连通分量数  
D. 生成所有可能的路径

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

DFS 不保证找到最短路，求最短路应用 **BFS**（无权）或 **Dijkstra**（带权）。

</details>

---

# 十四、搜索剪枝初步

## 什么是剪枝？

**剪枝（Pruning）**：在搜索过程中，提前判断当前分支**不可能得到有效结果**，直接放弃该分支，减少搜索量。

```
搜索树
├── 分支A（继续搜）
├── 分支B ← ✂️ 剪枝！提前判断必然失败
└── 分支C（继续搜）
```

---

## 两种剪枝策略

| 类型 | 说明 | 触发条件 |
|------|------|---------|
| **可行性剪枝** | 当前状态不可能满足约束条件 | 超出范围、矛盾条件 |
| **最优性剪枝** | 当前路径已经不可能比已知最优解更好 | 当前代价 ≥ 已知最小代价 |

```cpp
// 可行性剪枝：超出棋盘范围
if (x < 0 || x >= n || y < 0 || y >= m) return;

// 最优性剪枝：当前路径已比最优解长
if (cur_cost >= best_cost) return;
```

---

## DFS + 剪枝 代码框架

```cpp
int best = INF;

void dfs(int step, int cur_cost, /* 其他状态 */) {
    if (step == n) { best = min(best, cur_cost); return; }
    
    // 最优性剪枝
    if (cur_cost >= best) return;
    
    for (int next : choices) {
        // 可行性剪枝
        if (!valid(next)) continue;
        
        visited[next] = true;
        dfs(step + 1, cur_cost + cost[next], ...);
        visited[next] = false;  // 回溯
    }
}
```

> 💡 剪枝本质是**利用问题约束条件提前排除无效搜索**，越早剪越好！

---

## 搜索剪枝课堂真题

<div class="question">

**题目43** 以下关于搜索剪枝的说法，**正确**的是（ ）。

A. 剪枝会影响搜索的正确性  
B. 剪枝只能用于 DFS，不能用于 BFS  
C. 可行性剪枝提前排除不可能满足约束的分支  
D. 剪枝后一定能将复杂度降到 O(n log n)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

A 错：正确的剪枝不影响答案；B 错：BFS 也可以剪枝；C 正确；D 错：剪枝效果取决于问题。

</details>

---

<div class="question">

**题目44** DFS 搜索时，"visited 数组防止重复访问"本质上是哪种剪枝？

A. 最优性剪枝  
B. 可行性剪枝  
C. 对称性剪枝  
D. 记忆化剪枝

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（可行性剪枝）**

visited 标记防止重复访问，属于**可行性剪枝**：已访问的节点不可能再提供新的有效路径，直接排除。

</details>

---

# 十五、综合应用

## 迷宫最短路（BFS 经典）

```cpp
// 二维迷宫 BFS 模板
int dx[] = {0, 0, 1, -1};
int dy[] = {1, -1, 0, 0};

int bfs(int sx, int sy, int ex, int ey) {
    queue<pair<int,int>> q;
    q.push({sx, sy});
    visited[sx][sy] = true;
    dist[sx][sy] = 0;
    
    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        if (x == ex && y == ey) return dist[x][y];
        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (valid(nx, ny) && !visited[nx][ny]) {
                visited[nx][ny] = true;
                dist[nx][ny] = dist[x][y] + 1;
                q.push({nx, ny});
            }
        }
    }
    return -1;
}
```

---

## 图的连通性判断（DFS 经典）

```cpp
// 求连通分量数
int countComponents(int n) {
    int cnt = 0;
    for (int i = 1; i <= n; i++)
        if (!visited[i]) { dfs(i); cnt++; }
    return cnt;
}
```

> 💡 **连通分量数 = 需要调用 DFS/BFS 的次数**

---

## 易错提醒

> 🔴 **易错1**：忘记 `visited` 标记，导致死循环或无限递归

> 🔴 **易错2**：BFS 中忘记在**入队时**标记 visited，可能导致重复入队

> 🔴 **易错3**：DFS 递归深度过大导致栈溢出（解决：改迭代版或增大栈空间）

> 🔴 **易错4**：混淆 BFS 和 DFS 的适用场景，用 DFS 求最短路（错误！）

> 🔴 **易错5**：图不连通时，只从一个起点出发，漏掉其他连通分量的顶点

---

## 综合应用课堂真题

<div class="question">

**题目45** 在迷宫问题中，求从入口到出口的**最少步数**，应该使用（ ）。

A. DFS  
B. BFS  
C. 二分搜索  
D. 贪心算法

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（BFS）**

求最少步数 = 求最短路（无权图），用 **BFS** 按层扩展，第一次到达终点时即为最短路。

</details>

---

<div class="question">

**题目46** 以下哪种问题**最适合**用 DFS 解决？

A. 无权图的单源最短路径  
B. 求两点之间的最短距离  
C. 枚举所有从 s 到 t 的路径  
D. 按距离从近到远访问所有顶点

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

A、B、D 都是 BFS 适合的场景；枚举**所有路径**需要深度优先 + 回溯，是 **DFS** 的强项。

</details>

---

<div class="question">

**题目47** 以下代码中，BFS 求到顶点 v 的距离，存在一个 bug，是哪一行？

```cpp
void bfs(int start) {
    queue<int> q;
    q.push(start);
    dist[start] = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        visited[u] = true;          // (*)
        for (int v : adj[u]) {
            if (!visited[v]) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
}
```

A. `dist[start] = 0` 赋值有误  
B. `(*)` 行：应在入队时标记 visited，而非出队时  
C. while 循环条件有误  
D. `dist[v] = dist[u]+1` 有误

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

应在**入队时**立即标记 visited，否则同一节点可能被多次加入队列，导致重复处理。

</details>

---

<!-- _class: lead -->

# 📋 课后练习

---

**练习1** 冒泡排序对 n 个元素进行排序，最坏情况下的比较次数是（ ）。

A. n - 1  
B. n × (n - 1) / 2  
C. n × (n + 1) / 2  
D. n²

<details><summary>答案与解析</summary>

**答案：B**

最坏（逆序）时需要执行全部 n-1 趟，总比较次数 = (n-1)+(n-2)+...+1 = n(n-1)/2。

</details>

---

**练习2** 以下哪种排序算法在平均情况下时间复杂度为 O(n log n)？

A. 冒泡排序  
B. 选择排序  
C. 快速排序  
D. 插入排序

<details><summary>答案与解析</summary>

**答案：C**

A/B/D 均为 O(n²)，快速排序平均 O(n log n)。

</details>

---

**练习3** 递归求最大公约数 `gcd(a, b)` 的终止条件是（ ）。

A. a < b  
B. a == b  
C. b == 0  
D. a == 0

<details><summary>答案与解析</summary>

**答案：C**

欧几里得算法：gcd(a, b) → if b==0 return a; else return gcd(b, a%b)。

</details>

---

**练习4** 递归函数调用自身的次数最多由什么决定？

A. 由程序员的设置  
B. 由栈空间大小决定  
C. 由函数的返回值决定  
D. 由编译器优化决定

<details><summary>答案与解析</summary>

**答案：B**

递归深度受**栈空间大小**的限制。超过会栈溢出（Stack Overflow）。

</details>

---

**练习5** 枚举所有三位数中满足"百位数 + 十位数 = 个位数"的数，最优的枚举方式是（ ）。

A. 对每个三位数都检查  
B. 枚举百位和十位，计算个位  
C. 枚举十位和个位，计算百位  
D. 以上都一样

<details><summary>答案与解析</summary>

**答案：B**

百位1~9，十位0~9，个位 = 百位+十位（需<10）。共约90种情况，比枚举900个三位数更优。

</details>

---

**练习6** 以下关于图的说法，正确的是（ ）。

A. 树是一种特殊的图（连通无环无向图）  
B. n 个节点的树恰好有 n-1 条边  
C. 二叉树是树的特殊情况  
D. 图中不存在度为 0 的顶点

<details><summary>答案与解析</summary>

**答案：D（错误描述）**

A、B、C 都正确。D 错误：度为 0 的顶点是**孤立顶点**，图中完全可以存在。

</details>

---

**练习7** n 个顶点的无向连通图，最少需要几条边？最多需要几条边？

A. n-1 和 n(n-1)/2  
B. n 和 n²  
C. 1 和 n  
D. n-1 和 n²

<details><summary>答案与解析</summary>

**答案：A**

连通图最少边 = **n-1**（生成树）；无向完全图最多边 = **C(n,2) = n(n-1)/2**。

</details>

---

**练习8** 对稠密图（边数接近 n²）进行存储，推荐使用（ ）。

A. 邻接表  
B. 邻接矩阵  
C. 链式前向星  
D. 哈希表

<details><summary>答案与解析</summary>

**答案：B（邻接矩阵）**

稠密图边数接近 n²，邻接矩阵虽然空间 O(n²) 但查询 O(1) 且实现简单；邻接表在稠密图下不省空间。

</details>

---

**练习9** BFS 从顶点 1 出发，以下哪个不可能是 BFS 的访问顺序？  
图的边：1-2, 1-3, 2-4, 3-5

A. `1 2 3 4 5`  
B. `1 3 2 5 4`  
C. `1 2 4 3 5`  
D. `1 3 4 2 5`

<details><summary>答案与解析</summary>

**答案：D**

BFS 保证先访问距起点近的节点。4 是距离2，2 是距离1，不可能先访问4后访问2。D 选项中4在2之前，违反了 BFS 的层序规则。

</details>

---

**练习10** 以下代码统计图中连通分量的个数，输出结果是（ ）。  
图：6个顶点，边：1-2, 3-4-5，顶点6孤立。

```cpp
int cnt = 0;
for (int i = 1; i <= 6; i++)
    if (!visited[i]) { dfs(i); cnt++; }
cout << cnt;
```

A. 2  
B. 3  
C. 4  
D. 6

<details><summary>答案与解析</summary>

**答案：B（3）**

连通分量：{1,2}、{3,4,5}、{6}，共 **3** 个，cnt = 3。

</details>

---

**练习11** n 个顶点的无向图进行 DFS，递归深度最多为（ ）。

A. n  
B. m（边数）  
C. log n  
D. n/2

<details><summary>答案与解析</summary>

**答案：A**

DFS 每次递归访问一个新顶点，最多递归 **n 层**（每个顶点最多访问一次）。n 很大时需注意栈溢出风险。

</details>

---

**练习12** 以下 DFS 代码，对图（边：1-2, 2-3, 3-1）从顶点 1 出发，是否会无限递归？

```cpp
void dfs(int u) {
    for (int v : adj[u])
        dfs(v);
}
```

A. 不会，图是有环的会自动结束  
B. 会，缺少 visited 标记，3→1→2→3→1...无限循环  
C. 不会，递归有最大深度限制  
D. 会，因为图的节点太多

<details><summary>答案与解析</summary>

**答案：B**

缺少 visited 标记时，DFS 会沿 1→2→3→1→2→3... 无限递归，最终导致**栈溢出**（Stack Overflow）。

</details>

---

<!-- _class: lead -->

# 📋 GESP 精选真题

---

<div class="question">

**G01** 以下代码段实现的是（ ）。

```cpp
for (int i = 0; i < n-1; i++) {
    for (int j = 0; j < n-1-i; j++) {
        if (a[j] > a[j+1]) swap(a[j], a[j+1]);
    }
}
```

A. 选择排序  
B. 冒泡排序  
C. 插入排序  
D. 快速排序

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（冒泡排序）**

相邻元素比较交换，每趟将最大元素"冒泡"到末尾，这是冒泡排序的典型写法。

</details>

---

<div class="question">

**G02** 归并排序需要对长度为 n 的数组进行排序，合并过程中临时数组的大小至少为（ ）。

A. n  
B. n/2  
C. 2n  
D. 1

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A（n）**

合并两个有序子数组时，需要 O(n) 的临时数组来存放合并结果。

</details>

---

<div class="question">

**G03** 以下关于插入排序的描述，正确的是（ ）。

A. 插入排序的时间复杂度为 O(n log n)  
B. 插入排序是不稳定的排序  
C. 插入排序适合数据量较小或基本有序的情况  
D. 插入排序的空间复杂度为 O(n)

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

插入排序 O(n²)，稳定，空间 O(1)，但在数据基本有序时接近 O(n)。C 正确。

</details>

---

<div class="question">

**G04** 快速排序算法采用了（ ）的思想。

A. 贪心  
B. 动态规划  
C. 分治  
D. 枚举

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（分治）**

快速排序先分区，再递归处理左右子数组，是典型的分治算法。

</details>

---

<div class="question">

**G05** 以下 C++ 代码中，BFS 结束后 dist[4] 的值是（ ）。  
无向图：1-2, 1-3, 2-4, 3-4，起点为 1。

A. 0  
B. 1  
C. 2  
D. 3

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C（2）**

BFS：d[1]=0，d[2]=d[3]=1，d[4]=2（1→2→4 或 1→3→4，均为2步）。

</details>

---

<div class="question">

**G06** 以下关于 BFS 的描述，**错误**的是（ ）。

A. BFS 使用队列作为辅助数据结构  
B. BFS 可以求无权图的最短路径  
C. BFS 的时间复杂度为 O(n+m)  
D. BFS 总是先访问深度最大的节点

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：D**

BFS 先访问**距离最近**（深度最小）的节点，不是深度最大。先访问深度最大节点是 DFS 的特点。

</details>

---

<div class="question">

**G07** 递归函数 `f(n)` 的定义如下，则 `f(5) = ?`

```cpp
int f(int n) {
    if (n <= 0) return 0;
    return f(n / 2) + 1;
}
```

A. 2  
B. 3  
C. 4  
D. 5

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（3）**

f(5) = f(2)+1 = (f(1)+1)+1 = (f(0)+1+1)+1 = 0+1+1+1 = 3。

</details>

---

<div class="question">

**G08** 以下递归函数 `h(1234)` 的输出是（ ）。

```cpp
void h(int n) {
    if (n == 0) return;
    cout << n % 10;
    h(n / 10);
}
```

A. 1234  
B. 4321  
C. 1  
D. 4

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（4321）**

递归输出各位数字（倒序）：h(1234)→输出4,h(123)→输出3,h(12)→输出2,h(1)→输出1,h(0)→返回。输出 4321。

</details>

---

<div class="question">

**G09** 以下 C++ STL 代码，用于 BFS 的辅助数据结构声明正确的是（ ）。

A. `stack<int> q;`  
B. `queue<int> q;`  
C. `priority_queue<int> q;`  
D. `deque<int> q;`

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（queue<int>）**

BFS 需要 FIFO（先进先出）的队列，对应 C++ STL 的 `queue<int>`。

</details>

---

<div class="question">

**G10** 以下哪种图一定可以进行拓扑排序？

A. 无向连通图  
B. 有向完全图  
C. 有向无环图（DAG）  
D. 有环的有向图

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

拓扑排序只存在于**有向无环图（DAG）**中。有环图无法拓扑排序。

</details>

---

<div class="question">

**G11** 以下关于图的简单路径，说法正确的是（ ）。

A. 简单路径是图中最短的路径  
B. 简单路径中，每个顶点最多出现一次  
C. 有向图中不存在简单路径  
D. 简单路径一定比非简单路径短

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B**

简单路径的定义：路径上**顶点不重复**。A/C/D 均错误。

</details>

---

<div class="question">

**G12** 以下代码中，变量 `sum` 的最终值是（ ）。

```cpp
int sum = 0;
for (int i = 1; i <= 100; i++) {
    bool flag = true;
    for (int j = 2; j < i; j++)
        if (i % j == 0) { flag = false; break; }
    if (flag && i > 1) sum += i;
}
```

A. 1060  
B. 1260  
C. 2413  
D. 5050

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：A（1060）**

枚举 1~100 中的所有质数并求和 = 2+3+5+7+...+97 = 1060。

</details>

---

<div class="question">

**G13** 对有 n 个顶点的连通图，DFS 生成树的边数是（ ）。

A. n  
B. n-1  
C. m（边数）  
D. 取决于起点

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（n-1）**

DFS 生成树是原图的一棵**生成树**，包含所有 n 个顶点，有 **n-1 条边**（树的性质）。

</details>

---

<div class="question">

**G14** 以下 C++ STL 代码，用于 DFS 迭代版的辅助数据结构声明正确的是（ ）。

A. `queue<int> s;`  
B. `stack<int> s;`  
C. `vector<int> s;`  
D. `priority_queue<int> s;`

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：B（stack<int>）**

DFS 迭代版需要 LIFO（后进先出）的栈，对应 C++ STL 的 `stack<int>`。

</details>

---

<div class="question">

**G15** BFS 和 DFS 都可以解决以下哪个问题？

A. 求无权图最短路  
B. 求有权图最短路  
C. 判断图的连通性  
D. 求最小生成树

</div>

<details><summary>🔒 点击查看答案</summary>

**答案：C**

BFS 和 DFS 都能通过一次遍历判断图是否连通。求最短路和生成树各有专用算法。

</details>

---

<!-- _class: lead -->

# 📊 附录：答案速查表

---

## 一、冒泡排序（题目1-4）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目1 | B | 冒泡最少比较次数 n-1 |
| 题目2 | B | 冒泡最好复杂度 O(n) |
| 题目3 | D | 冒泡可提前终止 |
| 题目4 | A | 冒泡第1趟模拟 |

## 二、选择排序（题目5-6）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目5 | B | 选择最多交换 n-1 次 |
| 题目6 | D | 选择复杂度恒 O(n²) |

## 三、插入排序（题目7-8）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目7 | B | 插入最好 O(n) |
| 题目8 | A | 插入排序稳定 |

## 四、快速排序（题目9-11）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目9 | B | 快排最坏退化 |
| 题目10 | C | 快排最坏 O(n²) |
| 题目11 | C | pivot选择无绝对最优 |

## 五、归并排序（题目12-13）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目12 | C | 归并复杂度 O(n log n), O(n) |
| 题目13 | B | 归并稳定性原理 |

## 六、递归（题目14-18）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目14 | B | 递归阶乘 |
| 题目15 | A | 递归gcd |
| 题目16 | D | 递归vs迭代 |
| 题目17 | C | 递归斐波那契 |
| 题目18 | C | 汉诺塔步数 |

## 七、枚举（题目19-22）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目19 | C | 全排列个数 |
| 题目20 | D | 子集总数 |
| 题目21 | C | 枚举方程解个数 |
| 题目22 | C | next_permutation前提 |

## 八、综合（题目23-30）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目23 | B | 冒泡排序结果 |
| 题目24 | D | 不稳定排序识别 |
| 题目25 | D | std::sort内省排序 |
| 题目26 | A | 递归各位和 |
| 题目27 | A | 递归前后输出 |
| 题目28 | D | 稳定性定义 |
| 题目29 | C | 递归树主定理（O(n²log n)）|
| 题目30 | C | 递归指数复杂度 |

## 九、图的基本概念（题目31-33）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目31 | B | 出度×顶点数=弧数 |
| 题目32 | B | 握手定理 |
| 题目33 | C | 有向图入度≠出度 |

## 十、图的存储（题目34-36）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目34 | A | 邻接矩阵O(n²)邻接表O(n+m) |
| 题目35 | B | 完全图邻接矩阵非零元素 |
| 题目36 | B | 无向图邻接矩阵对称 |

## 十一、BFS（题目37-39）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目37 | B | BFS用队列 |
| 题目38 | B | dist[v]=最短路边数 |
| 题目39 | D | BFS不能求带权最短路 |

## 十二、DFS（题目40-42）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目40 | C | DFS用栈/递归 |
| 题目41 | B | DFS得到生成树 |
| 题目42 | B | DFS不适合最短路 |

## 十三、搜索剪枝（题目43-44）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目43 | C | 可行性剪枝 |
| 题目44 | B | visited=可行性剪枝 |

## 十四、综合（题目45-47）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 题目45 | B | 迷宫最短路用BFS |
| 题目46 | C | 枚举所有路径用DFS |
| 题目47 | B | 入队时标记visited |

## 十五、课后练习（练习1-12）

| 题号 | 答案 | 知识点 |
|------|------|--------|
| 练习1 | B | 冒泡最坏比较次数 |
| 练习2 | C | O(n log n)排序识别 |
| 练习3 | C | gcd终止条件 |
| 练习4 | B | 递归深度受栈限制 |
| 练习5 | B | 枚举优化策略 |
| 练习6 | D | 图可以有孤立顶点 |
| 练习7 | A | 连通图最少n-1最多完全图 |
| 练习8 | B | 稠密图用邻接矩阵 |
| 练习9 | D | BFS不可能先访问远的 |
| 练习10 | B | 连通分量数=3 |
| 练习11 | A | DFS递归深度最多n |
| 练习12 | B | 缺visited导致无限递归 |

## 十六、GESP 精选（G01-G15）

| 题号 | 答案 | 知识点 | 来源 |
|------|------|--------|------|
| G01 | B | 冒泡代码识别 | GESP 2023-09 |
| G02 | A | 归并临时数组大小 | GESP 2024-09 |
| G03 | C | 插入排序适用场景 | GESP 2024-06 |
| G04 | C | 快排分治思想 | GESP 2023-12 |
| G05 | C | BFS最短路dist[4]=2 | GESP 2024-06 |
| G06 | D | BFS访问最近节点 | GESP 2024-03 |
| G07 | B | 递归二进制位数 | GESP 2025-03 |
| G08 | B | 递归倒序输出 | GESP 2024-03 |
| G09 | B | BFS用queue | GESP 2023-09 |
| G10 | C | 拓扑排序只对DAG | GESP 2024-06 |
| G11 | B | 简单路径定义 | GESP 2024-03 |
| G12 | A | 枚举质数求和 | GESP 2024-09 |
| G13 | B | DFS生成树n-1条边 | GESP 2024-09 |
| G14 | B | DFS用stack | GESP 2024-03 |
| G15 | C | BFS和DFS都能判连通性 | GESP 2024-09 |

---

# 本节题目统计

| 板块 | 数量 |
|------|------|
| 排序算法（冒泡/选择/插入/快排/归并）| 13 道 |
| 递归 | 5 道 |
| 枚举 | 4 道 |
| 综合排序+递归 | 4 道 |
| 图的基本概念 | 3 道 |
| 图的存储结构 | 3 道 |
| BFS | 3 道 |
| DFS | 3 道 |
| 搜索剪枝 | 2 道 |
| 综合应用 | 3 道 |
| 课后练习 | 12 道 |
| GESP 精选 | 15 道 |
| **合计** | **约 80 道** |

---

<div style="text-align: center; padding: 40px;">

# 第5节课结束

**课后任务**：
1. 独立完成课后练习 1-12
2. 背熟快速排序和归并排序的代码模板
3. 理解 BFS 和 DFS 的适用场景
4. 预习第 6 节：排序算法 + 贪心初步

**下节课见！**

</div>
