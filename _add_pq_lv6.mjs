/**
 * 在 level 6「队列」专题下新增「优先队列 priority_queue」章节（6-2-4）
 */
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
dotenv.config({ path: './server/.env' })

const uri = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const client = new MongoClient(uri)

const NEW_CHAPTER = {
  id: '6-2-4',
  title: '优先队列 priority_queue',
  content: `## 优先队列 priority_queue

**优先队列**是一种特殊的队列，每次取出的元素总是当前优先级最高的元素（默认为最大值，即大根堆）。

C++ STL 提供了 \`priority_queue\`，位于头文件 \`<queue>\`。

---

### 基本用法

\`\`\`cpp
#include <queue>
using namespace std;

// 大根堆（默认）：每次取出最大值
priority_queue<int> pq;

pq.push(3);
pq.push(1);
pq.push(4);

cout << pq.top(); // 4，最大值
pq.pop();         // 弹出 4
cout << pq.top(); // 3
\`\`\`

---

### 小根堆

如果需要每次取出最小值，使用 \`greater<int>\`：

\`\`\`cpp
// 小根堆：每次取出最小值
priority_queue<int, vector<int>, greater<int>> minpq;

minpq.push(3);
minpq.push(1);
minpq.push(4);

cout << minpq.top(); // 1，最小值
\`\`\`

---

### 常用操作

| 操作 | 说明 |
|------|------|
| \`pq.push(x)\` | 插入元素 x |
| \`pq.top()\` | 返回堆顶元素（不删除） |
| \`pq.pop()\` | 删除堆顶元素 |
| \`pq.size()\` | 返回元素个数 |
| \`pq.empty()\` | 判断是否为空 |

---

### 自定义比较（结构体）

\`\`\`cpp
struct Node {
    int val, id;
    // 重载 < 运算符，val 越小优先级越高（小根堆效果）
    bool operator<(const Node& o) const {
        return val > o.val;
    }
};

priority_queue<Node> pq;
pq.push({5, 1});
pq.push({2, 2});
cout << pq.top().id; // 2（val=2最小）
\`\`\`

---

### 典型应用

- **贪心算法**：每次选最大/最小值（如哈夫曼树构造）
- **Dijkstra 最短路**（将在后续章节介绍）
- **任务调度**：按优先级处理任务
`,
  contentType: 'markdown',
  problemIds: [],
  optionalProblemIds: [],
  optional: false
}

async function main() {
  await client.connect()
  const db = client.db()
  const col = db.collection('courselevels')

  const lv6 = await col.findOne({ group: 'GESP C++ 认证课程', level: 6 })
  if (!lv6) { console.error('❌ level 6 not found'); return }

  // 找到队列专题（第2个topic，index=1）
  const queueTopicIdx = lv6.topics?.findIndex(t => t.title === '队列')
  if (queueTopicIdx === -1) { console.error('❌ 未找到队列专题'); return }

  const queueTopic = lv6.topics[queueTopicIdx]
  console.log(`队列专题在 index ${queueTopicIdx}, 当前有 ${queueTopic.chapters?.length || 0} 个章节`)

  // 检查是否已存在
  if (queueTopic.chapters?.some(c => c.id === '6-2-4')) {
    console.log('⚠️  6-2-4 已存在，跳过')
    return
  }

  // 新增章节
  const result = await col.updateOne(
    { group: 'GESP C++ 认证课程', level: 6 },
    { $push: { [`topics.${queueTopicIdx}.chapters`]: NEW_CHAPTER } }
  )

  console.log(`✅ 新增章节 6-2-4「优先队列 priority_queue」`)
  console.log(`   修改文档数: ${result.modifiedCount}`)
  await client.close()
}
main().catch(console.error)
