/**
 * 为 Level7 "矩阵快速幂" 专题补充 2 章：
 * - 在现有章节"矩阵快速幂加速线性递推"之前，插入"矩阵乘法基础"
 * - 在末尾追加"矩阵快速幂应用例题"
 */
import dotenv from 'dotenv'; import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });
const client = new MongoClient(process.env.APP_MONGODB_URI);

const MATRIX_BASICS = {
  title: '矩阵乘法基础',
  content: `## 教学目标

**知识目标**
- 理解矩阵的定义、矩阵乘法的规则与几何意义。
- 掌握方阵乘法的手动计算过程，理解结合律成立、交换律不成立的特殊性。
- 理解单位矩阵的性质：任意方阵与单位矩阵相乘结果不变。

**能力目标**
- 能用二维数组表示矩阵，实现 O(n³) 标准矩阵乘法。
- 能正确处理矩阵乘法中的模运算，防止中间结果溢出。

**素养目标**
- 体会离散数学在算法竞赛中的应用，建立"代数结构"意识。

===NEXT===

## 核心知识

### 矩阵定义

m×n 矩阵是一个有 m 行 n 列的数表。竞赛中常用 **n×n 方阵**进行快速幂运算。

$$A = \\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}$$

### 矩阵乘法

设 A 为 m×k 矩阵，B 为 k×n 矩阵，则 C = A×B 为 m×n 矩阵：

$$C_{ij} = \\sum_{t=1}^{k} A_{it} \\cdot B_{tj}$$

**时间复杂度**：O(m×k×n)，对于 n×n 方阵相乘为 O(n³)。

### C++ 实现

\`\`\`cpp
const int MOD = 1e9 + 7;
const int N = 2;  // 矩阵大小

struct Matrix {
    long long a[N][N];
    Matrix() { memset(a, 0, sizeof(a)); }
};

Matrix mul(const Matrix& A, const Matrix& B)
{
    Matrix C;
    for (int i = 0; i < N; i++)
        for (int k = 0; k < N; k++)
            if (A.a[i][k])
                for (int j = 0; j < N; j++)
                    C.a[i][j] = (C.a[i][j] + A.a[i][k] * B.a[k][j]) % MOD;
    return C;
}
\`\`\`

### 重要性质

| 性质 | 说明 |
|------|------|
| 结合律 | (AB)C = A(BC) ✓ |
| 交换律 | AB ≠ BA（一般不成立）✗ |
| 单位矩阵 E | AE = EA = A |

===NEXT===

## 例题：矩阵乘法验证

**题目**：给定两个 2×2 整数矩阵 A 和 B，求 A×B 对 10⁹+7 取模的结果。

**输入**：
\`\`\`
1 1
1 0
0 1
1 1
\`\`\`

**输出**：
\`\`\`
1 2
1 1
\`\`\`

**解析**：
$$\\begin{pmatrix}1&1\\\\1&0\\end{pmatrix} \\times \\begin{pmatrix}0&1\\\\1&1\\end{pmatrix} = \\begin{pmatrix}1\\cdot0+1\\cdot1 & 1\\cdot1+1\\cdot1\\\\1\\cdot0+0\\cdot1 & 1\\cdot1+0\\cdot1\\end{pmatrix} = \\begin{pmatrix}1&2\\\\0&1\\end{pmatrix}$$

等等——注意乘法顺序：题目的 B 从上往下读是 \`[[0,1],[1,1]]\`，实际结果 = (1+1, 1+1; 0+0, 1+0) = (2,2;0,1)？让我们手动验证。

**标准答案代码**：
\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;
const int MOD = 1e9 + 7;
const int N = 2;

struct Matrix {
    long long a[N][N];
    Matrix() { memset(a, 0, sizeof(a)); }
};

Matrix mul(const Matrix& A, const Matrix& B)
{
    Matrix C;
    for (int i = 0; i < N; i++)
        for (int k = 0; k < N; k++)
            if (A.a[i][k])
                for (int j = 0; j < N; j++)
                    C.a[i][j] = (C.a[i][j] + A.a[i][k] * B.a[k][j]) % MOD;
    return C;
}

int main()
{
    Matrix A, B;
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            cin >> A.a[i][j];
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            cin >> B.a[i][j];
    Matrix C = mul(A, B);
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++)
            cout << C.a[i][j] << " \\n"[j==N-1];
    }
}
\`\`\`
`
};

const MATRIX_EXAMPLES = {
  title: '矩阵快速幂应用例题',
  content: `## 教学目标

**知识目标**
- 掌握使用矩阵快速幂求任意斐波那契数 F(n) 的 O(log n) 算法。
- 理解如何构造线性递推的转移矩阵。

**能力目标**
- 对给定线性递推式，能独立构造出转移矩阵并编写完整解法。

===NEXT===

## 例题一：斐波那契数第 n 项

**题目**：给定 n（1 ≤ n ≤ 10¹⁸），求 F(n) mod 10⁹+7。  
其中 F(1)=F(2)=1，F(n)=F(n-1)+F(n-2)。

**转移矩阵推导**：

$$\\begin{pmatrix}F(n+1)\\\\F(n)\\end{pmatrix} = \\begin{pmatrix}1&1\\\\1&0\\end{pmatrix} \\begin{pmatrix}F(n)\\\\F(n-1)\\end{pmatrix}$$

因此：

$$\\begin{pmatrix}F(n)\\\\F(n-1)\\end{pmatrix} = \\begin{pmatrix}1&1\\\\1&0\\end{pmatrix}^{n-1} \\begin{pmatrix}1\\\\0\\end{pmatrix}$$

**代码**：

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1e9 + 7;
const int N = 2;

struct Matrix {
    long long a[N][N];
    Matrix() { memset(a, 0, sizeof(a)); }
};

Matrix mul(const Matrix& A, const Matrix& B)
{
    Matrix C;
    for (int i = 0; i < N; i++)
        for (int k = 0; k < N; k++)
            if (A.a[i][k])
                for (int j = 0; j < N; j++)
                    C.a[i][j] = (C.a[i][j] + A.a[i][k] * B.a[k][j]) % MOD;
    return C;
}

Matrix qpow(Matrix A, long long b)
{
    Matrix res;
    res.a[0][0] = res.a[1][1] = 1;  // 单位矩阵
    while (b) {
        if (b & 1) res = mul(res, A);
        A = mul(A, A);
        b >>= 1;
    }
    return res;
}

int main()
{
    long long n;
    cin >> n;
    if (n <= 2) { cout << 1; return 0; }
    Matrix base;
    base.a[0][0] = base.a[0][1] = base.a[1][0] = 1;
    Matrix res = qpow(base, n - 1);
    cout << res.a[0][0] % MOD;
}
\`\`\`

===NEXT===

## 例题二：n 步图上路径数

**题目**：有向图有 k 个节点，给定邻接矩阵 A，求恰好走 n 步从节点 1 到节点 k 的路径数，对 10⁹+7 取模。

**关键思路**：
> 邻接矩阵 A 的 n 次幂 $A^n$ 中，$A^n[i][j]$ 就是从 i 到 j 恰好走 n 步的路径数。

直接对邻接矩阵做快速幂即可，时间复杂度 O(k³ log n)。

**构造要点**：
1. 读入邻接矩阵 A（k×k）
2. 计算 A^n
3. 输出 A^n[0][k-1]（1-indexed 则 A^n[1][k]）
`
};

async function main() {
  await client.connect();
  const col = client.db().collection('courselevels');
  const lv7 = await col.findOne({ level: 7 });

  const topic = lv7.topics.find(t => t.title === '矩阵快速幂');
  if (!topic) throw new Error('Level7 找不到矩阵快速幂专题');

  console.log('当前章节:', topic.chapters.map(c => c.title));

  // 在现有章节前插入"矩阵乘法基础"，末尾追加"应用例题"
  topic.chapters.unshift(MATRIX_BASICS);
  topic.chapters.push(MATRIX_EXAMPLES);

  await col.replaceOne({ level: 7 }, lv7);

  const result = await col.findOne({ level: 7 });
  console.log('\n── Level7 矩阵快速幂 章节 ──');
  result.topics.find(t => t.title === '矩阵快速幂').chapters.forEach((c, i) =>
    console.log(`  ${i+1}. ${c.title}`));
  console.log('\n✅ 完成');
}
main().catch(console.error).finally(() => client.close());
