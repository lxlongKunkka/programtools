# list 与 deque 的使用场景

## list 与 deque 的使用场景

STL 除了 `vector` 之外，还提供了 `list`（双向链表）和 `deque`（双端队列）两种容器，它们在特定场景下比 `vector` 更高效。

---

### std::list —— 双向链表

`list` 内部是一个**双向链表**，每个节点存储前驱和后继指针。

#### 核心特性

| 操作 | 时间复杂度 |
|------|-----------|
| 头尾插入/删除 | O(1) |
| 任意位置插入/删除（已有迭代器） | O(1) |
| 随机访问（下标） | ❌ 不支持 |
| 查找 | O(n) |

#### 基本用法

```cpp
#include <list>
using namespace std;

list<int> lst;
lst.push_back(3);   // 尾插
lst.push_front(1);  // 头插
lst.push_back(5);
// lst: 1 3 5

// 遍历（只能用迭代器）
for (int x : lst) cout << x << " ";

// 删除值为 3 的元素
lst.remove(3);

// 在迭代器位置插入
auto it = lst.begin();
++it;
lst.insert(it, 2); // 在第二个位置前插入
```

#### 适用场景

- 需要**频繁在中间插入/删除**的数据（如 LRU 缓存、任务调度队列）
- 竞赛中极少直接使用 `list`，了解概念即可

---

### std::deque —— 双端队列

`deque`（double-ended queue）支持**在头尾两端高效插入和删除**，同时支持随机访问。

#### 核心特性

| 操作 | 时间复杂度 |
|------|-----------|
| 头尾插入/删除 | O(1) |
| 随机访问（`deque[i]`） | O(1) |
| 中间插入/删除 | O(n) |

#### 基本用法

```cpp
#include <deque>
using namespace std;

deque<int> dq;
dq.push_back(3);    // 尾插
dq.push_front(1);   // 头插
dq.push_back(5);
// dq: 1 3 5

cout << dq[1] << endl;  // 随机访问，输出 3
dq.pop_front();          // 头删
dq.pop_back();           // 尾删
```

#### 与单调队列的关系

竞赛中的**单调队列**通常用 `deque` 实现（或直接用数组模拟头尾指针）：

```cpp
deque<int> dq; // 存下标
for (int i = 0; i < n; i++) {
    // 弹出窗口外的元素
    while (!dq.empty() && dq.front() < i - k + 1)
        dq.pop_front();
    // 维护单调递减（求最大值）
    while (!dq.empty() && a[dq.back()] <= a[i])
        dq.pop_back();
    dq.push_back(i);
    if (i >= k - 1) cout << a[dq.front()] << " ";
}
```

---

### 选择建议

| 需求 | 推荐容器 |
|------|---------|
| 频繁尾部操作 + 随机访问 | `vector` |
| 频繁头尾操作 + 随机访问 | `deque` |
| 频繁中间插入/删除 | `list` |
| 竞赛单调队列 | `deque` 或数组模拟 |
