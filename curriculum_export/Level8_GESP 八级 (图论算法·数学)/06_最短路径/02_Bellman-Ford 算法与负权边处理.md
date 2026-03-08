# Bellman-Ford 算法与负权边处理

## Bellman-Ford 算法与负权边处理

**Bellman-Ford** 算法能处理**含负权边**的单源最短路问题，并能检测**负权环**的存在。时间复杂度 $O(nm)$。

---

### 为什么 Dijkstra 不能处理负权边

Dijkstra 基于贪心思想——已确定的最短距离不会再被更新。但负权边可能让"已确定"的节点通过负权边获得更短路径，破坏贪心假设。

---

### Bellman-Ford 核心思想

**松弛操作**：对于边 $(u, v, w)$，若 $dist[u] + w < dist[v]$，则更新 $dist[v]$。

**关键定理：** 若图中不含负权环，则最短路最多经过 $n-1$ 条边。

因此，**对所有边重复松弛 $n-1$ 轮**，即可得到最短路。

---

### 代码模板

```cpp
#include <bits/stdc++.h>
using namespace std;

const int INF = 1e9;
const int N = 1e4 + 5;
const int M = 5e4 + 5;

struct Edge { int u, v, w; } edges[M];
int dist[N];
int n, m;

void bellman_ford(int src) {
    fill(dist + 1, dist + n + 1, INF);
    dist[src] = 0;

    // 松弛 n-1 轮
    for (int i = 1; i <= n - 1; i++) {
        bool updated = false;
        for (int j = 0; j < m; j++) {
            int u = edges[j].u, v = edges[j].v, w = edges[j].w;
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break; // 提前终止优化
    }
}

// 检测负权环：第 n 轮仍能松弛说明有负环
bool hasNegativeCycle() {
    for (int j = 0; j < m; j++) {
        int u = edges[j].u, v = edges[j].v, w = edges[j].w;
        if (dist[u] != INF && dist[u] + w < dist[v])
            return true;
    }
    return false;
}

int main() {
    cin >> n >> m;
    for (int i = 0; i < m; i++)
        cin >> edges[i].u >> edges[i].v >> edges[i].w;

    bellman_ford(1);

    if (hasNegativeCycle()) {
        cout << "存在负权环" << endl;
    } else {
        for (int i = 1; i <= n; i++)
            cout << (dist[i] == INF ? -1 : dist[i]) << endl;
    }
}
```

---

### 算法流程图示

```
初始: dist[src]=0, 其余=∞

第1轮松弛所有边:
  dist 数组更新为 "经过1条边能到达的最短距离"

第2轮松弛所有边:
  dist 数组更新为 "经过2条边能到达的最短距离"

...

第n-1轮松弛所有边:
  dist 数组 = 最终最短距离

第n轮仍有更新 → 存在负权环
```

---

### 与 Dijkstra 对比

| | Bellman-Ford | Dijkstra |
|--|-------------|---------|
| 负权边 | ✅ 支持 | ❌ 不支持 |
| 负权环检测 | ✅ 支持 | ❌ 不支持 |
| 时间复杂度 | $O(nm)$ | $O((n+m)\log n)$ |
| 适用场景 | 边数少、含负权 | 边数多、非负权 |

---

### 例题模板

- 差分约束系统（转化为最短路，可能有负权边）
- 含负权的图中求最短路并判断负环
