# SPFA 算法与负环判断

## SPFA 算法与负环判断

**SPFA**（Shortest Path Faster Algorithm）是 Bellman-Ford 的**队列优化版本**，只对刚被更新的节点的邻居进行松弛，平均性能远优于 Bellman-Ford。

---

### 核心思想

Bellman-Ford 每轮遍历所有边，浪费大量时间在"没有更新"的边上。SPFA 用一个队列只处理**距离被更新过**的顶点，类似 BFS。

---

### 代码模板

```cpp
#include <bits/stdc++.h>
using namespace std;

const int INF = 1e9;
const int N = 1e5 + 5;

vector<pair<int,int>> adj[N]; // {邻居, 权值}
int dist[N], cnt[N];          // cnt[v] = 入队次数（用于判负环）
bool inQueue[N];
int n, m;

bool spfa(int src) {
    fill(dist + 1, dist + n + 1, INF);
    fill(cnt + 1, cnt + n + 1, 0);
    fill(inQueue + 1, inQueue + n + 1, false);

    dist[src] = 0;
    queue<int> q;
    q.push(src);
    inQueue[src] = true;
    cnt[src] = 1;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        inQueue[u] = false;

        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (!inQueue[v]) {
                    q.push(v);
                    inQueue[v] = true;
                    cnt[v]++;
                    // 若某顶点入队 n 次，说明存在负权环
                    if (cnt[v] >= n) return false; // 有负环
                }
            }
        }
    }
    return true; // 无负环
}

int main() {
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});
        // adj[v].push_back({u, w}); // 无向图加这行
    }

    if (!spfa(1)) {
        cout << "存在负权环" << endl;
    } else {
        for (int i = 1; i <= n; i++)
            cout << (dist[i] == INF ? -1 : dist[i]) << endl;
    }
}
```

---

### 负环判断原理

若不存在负权环，最短路最多经过 $n-1$ 条边，即每个顶点最多入队 $n-1$ 次。  
若某顶点入队次数 $\geq n$，则必然存在负权环。

---

### SPFA 的性能

- **平均**：$O(km)$，其中 $k$ 很小（实践中接近 $O(m)$）
- **最坏**：$O(nm)$（与 Bellman-Ford 相同，可被特殊数据卡）

> ⚠️ 竞赛注意：部分题目会专门构造数据卡 SPFA，此时需要用 Dijkstra+堆或其他方法代替。判断是否需要 SPFA 的标准：**图中是否含负权边**。无负权边优先用 Dijkstra。

---

### 三种最短路算法对比

| 算法 | 负权边 | 负环检测 | 时间复杂度 | 推荐场景 |
|------|--------|---------|-----------|---------|
| Dijkstra（堆优化） | ❌ | ❌ | $O((n+m)\log n)$ | 无负权，常规最短路 |
| Bellman-Ford | ✅ | ✅ | $O(nm)$ | 边数少，差分约束 |
| SPFA | ✅ | ✅ | $O(km)$ 平均 | 含负权，数据不卡 |
| Floyd | ✅ | ✅ | $O(n^3)$ | 多源最短路，$n \leq 500$ |
