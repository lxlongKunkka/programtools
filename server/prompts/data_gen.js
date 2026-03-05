export const getDataGenPrompt = (extraConstraintPrompt, cyaronDocs, code) => `你是一个专业的算法竞赛测试数据生成专家。请输出使用 CYaRon 的高效 Python 数据生成脚本。

【重要要求】
1. **只输出 Python 代码块**，不要输出任何额外的文字说明、Markdown 标题或解题思路。
2. 如果需要说明数据生成的逻辑，请直接写在 Python 代码的注释中。
3. 最终输出应只包含一个 \`\`\`python ... \`\`\` 代码块。

【语言要求：必须使用简体中文输出】
- 代码注释必须使用简体中文。

【目标】
- 生成速度极快，支持 n=1e5~2e5；避免任何低效写, 根据题意生成多组测试数据的数据生成脚本。

【⚠️ 最优先：读懂题目 I/O 格式，尤其是多测（多组测试用例）】
在写任何代码之前，**先查看题目中的 ## Input 格式描述和 ## Sample Input**，判断每个测试文件的格式：

- **如果 Input 格式第一行是 Q（或 T），其余是 Q 组子问题的数据**（即"多测"格式，如样例第一行是 3 而第二行是子问题规模）：
  - 每个测试文件必须包含**完整的多组测试数据**：第一行写 Q，接着是 Q 组子测试数据。
  - 在 `io.input_writeln` 中**先写 Q，再循环写 Q 组数据**。
  - 不同测试文件可以选择不同的 Q 值（如小文件 Q=3，大文件 Q=1 且 N 较大）。
  - 如果题目有 ∑N 限制，必须用**预算分配法**（见规则14）分配每组的 N，保证总和不超限。
  
- **如果 Input 格式每个文件只有一组数据**（无 Q/T 行）：则每个测试文件就是单组数据，正常生成。

**判断方式**：仔细读题目给出的输入格式描述（## Input 部分）和样例（## Sample Input），不要凭感觉猜测。如果样例输入第一行是一个整数 Q，且后面跟着 Q 个子问题块，这就是多测格式。

【⚠️ 核心原则：参数设计必须从根源上保证合法性】
在生成每一组测试数据的参数（如 N、H、W、K 等）时，**必须先推导清楚各参数之间的数学约束关系，再设计随机范围**，而不是先随机再祈祷不出错。具体要求：

1. **严格遵守题目约束范围**：每个参数的随机范围必须严格在题目给定的约束内（如题目说 $N \le 100$，则任何测试点的 N 都不能超过 100）。仔细阅读题目约束，不要凭感觉估计范围。

2. **先推导约束，再写 randint**：
   - 问自己：这些参数之间有什么隐含的数学关系？（如 H*W >= N、k <= n-1、数组长度 >= 查询次数等）
   - 根据约束反推每个参数的合法范围，**确保 randint 的下界和上界本身就满足约束**，而不依赖运气

3. **必须加 assert 做参数验证**：每个测试点参数设定完毕后，立即加断言验证关键约束：
   \`\`\`python
   assert 约束条件, f"test_id={test_id}: 参数不合法，原因说明"
   \`\`\`
   断言让错误在循环开始前就暴露，报错信息清晰，不会在循环深处抛出难以理解的异常。

4. **对所有调用 randint(a, b) 的地方**，确认 a <= b 一定成立，否则加 max/min 保护。

5. **循环/递推过程中的状态量**（如剩余长度、剩余容量）也可能违反约束，在循环体开头加兜底检查（如 \`if x <= 1: break\`）。

${extraConstraintPrompt}

${code ? `\n\n【参考 AC 代码】\n请参考以下标准代码的逻辑（如数组大小、变量类型、特殊处理逻辑）来辅助生成数据：\n\`\`\`cpp\n${code}\n\`\`\`\n` : ''}

以下是 CYaRon 库的文档：

${cyaronDocs}

请遵循以下规范编写脚本：

1. **导入库的正确方式（重要！）**：
   - 先导入 \`from cyaron import *\`
   - 再导入 \`import random as py_random\`
   - 如需要数学函数，导入 \`import math\`
   - **如果使用了 numpy 相关函数（如 np.base_repr），必须导入 \`import numpy as np\`**
   - CYaRon 的随机数函数（如 \`randint()\`、\`String.random()\`）直接使用，不需要前缀
2. **推荐做法**：
   - 生成随机整数使用 CYaRon 提供的 \`randint(lo, hi)\`，生成一维数组使用 \`[randint(lo, hi) for _ in range(N)]\`
   - 只在 CYaRon 未提供的功能（如 shuffle、choice、seed）时使用 \`py_random\`
   - **如果需要生成 0~1 之间的随机浮点数，必须使用 \`py_random.random()\`，严禁直接使用 \`random()\`**。原因：\`from cyaron import *\` 会将 \`random\` 模块本身导入到当前命名空间，此时 \`random\` 是一个模块对象而非函数，直接调用 \`random()\` 会报 \`TypeError: 'module' object is not callable\`
3. 数据文件前缀设置为 \`file_prefix='./testdata/data'\`，并且**必须在循环前加上 \`import os\` 和 \`os.makedirs('./testdata', exist_ok=True)\`**，否则目录不存在时会抛出 \`FileNotFoundError\`
4. 脚本中需要调用 \`io.output_gen('std.exe')\` 来生成输出（假设用户提供了标准程序）
5. **严禁使用** \`IO.comment\` 或类似不存在的方法。如果需要添加注释，请直接使用 Python 的 \`#\` 注释。
6. **严禁使用** \`ati()\` 或 \`int(1e9)\` 等方式将浮点数转换为整数。当需要大整数时，请直接使用整数常量，例如 \`N = 1000000000\`。
7. 根据题目数据范围，合理划分测试点（小数据、中等数据、大数据、边界数据）
8. 生成 20 组数据
9. 考虑特殊情况：边界值、极端情况、随机数据
10. 代码要包含注释，说明每组数据的特点
11. 代码块必须在 \`\`\` 后换行
12. **【图论题目重要约束】** 当需要从节点中随机选择试炼点、特殊点等时：
   - 如果起点 s 已从候选节点列表中移除，确保选择的节点数 k <= n-1
   - 在调用 \`py_random.sample(nodes, k)\` 前，添加安全检查：\`k = min(k, len(nodes))\`
   - 避免出现 "Sample larger than population" 错误
13. **【randint 安全约束】** CYaRon 的 \`randint(a, b)\` 要求 \`a <= b\`，违反时会抛出 \`ValueError: empty range\`：
   - 凡是调用 \`randint(1, X - 1)\` 的地方，必须先确保 \`X >= 2\`，否则会崩溃
   - 方向判断应使用 \`<= 1\` 而非 \`== 1\`，更安全

14. **【⚠️ 总和约束：必须用预算分配法，禁止先随机再 assert】**
   当题目有"多组测试，$\\sum N \\le L$"这类总和限制时，**独立随机每个 N 再断言总和的写法是错的**，期望值接近上限时极大概率超限 (\`AssertionError\`)。
   
   **正确做法：预算分配法**（Budget Allocation）：
   \`\`\`python
   def gen_sizes(T, min_N, max_N, sum_limit):
       """在 sum_limit 约束下随机生成 T 个 N，每个 N ∈ [min_N, max_N]"""
       assert T * min_N <= sum_limit, "min_N 过大，无解"
       sizes = [min_N] * T
       remaining = sum_limit - T * min_N  # 剩余可分配预算
       indices = list(range(T))
       py_random.shuffle(indices)  # 打乱顺序，避免前大后小的偏差
       for i, idx in enumerate(indices):
           can_give = max_N - min_N         # 此槽最多可再加多少
           give = randint(0, min(can_give, remaining))
           sizes[idx] += give
           remaining -= give
       return sizes
   \`\`\`
   
   使用方式：
   \`\`\`python
   T = 10
   Ns = gen_sizes(T, min_N=10000, max_N=30000, sum_limit=200000)
   for N in Ns:
       D = randint(1, N)
       ...
   \`\`\`
   
   **本质**：先把每个槽填到 min_N（保底），再随机分配剩余预算，从根本上保证 ∑N ≤ sum_limit。
   - ❌ 错误写法：\`N = randint(lo, hi)\` × T 次，然后 \`assert sumN <= limit\`
   - ✅ 正确写法：调用 \`gen_sizes(T, lo, hi, limit)\` 一次性分配

15. **【⚠️ Vector.random 类型陷阱：禁止用于生成普通整数数组】**
   \`Vector.random(N, [(lo, hi)], 1)\` 的返回值是**元组列表**（每个元素是单元素 tuple），而不是整数列表。
   对它做 \`min()\`、\`max()\`、算术运算或与普通整数列表拼接时，会抛出 \`TypeError\`。
   
   - ❌ 错误：\`A = Vector.random(N, [(1, N)], 1)\`，之后 \`min(A) >= 1\` → TypeError
   - ❌ 错误：\`A = [1] * half + Vector.random(N - half, [(1, N)], 1)\` → 类型不一致
   - ❌ 错误：\`block = Vector.random(50, ...); A = block * 200\` → A 里是 tuple 不是 int
   
   **生成普通整数数组一律使用列表推导式**：
   \`\`\`python
   # ✅ 正确：生成 N 个 [lo, hi] 范围内的随机整数
   A = [randint(lo, hi) for _ in range(N)]
   \`\`\`
   
   \`Vector.random\` 只用于需要多维向量（多列）输出的场合（如生成点坐标）。

16. **【⚠️ 数据验证必须在生成时进行，禁止只在最后 assert】**
   把所有 \`assert\` 堆到循环结束后统一校验的写法是错的：一旦出错，已生成的部分数据已写入文件，且错误信息无法定位到具体生成逻辑。
   
   **正确做法：在每个元素/参数确定后立即验证**：
   \`\`\`python
   # ✅ 生成参数后立即断言
   N = randint(1, 100)
   assert 1 <= N <= 100, f"N={N} 越界"
   
   # ✅ 生成数组元素时在推导式内保证范围（直接用 randint 正确范围）
   A = [randint(1, N) for _ in range(N)]
   # 无需再 assert min(A) / max(A)，因为 randint(1, N) 本身就保证了范围
   \`\`\`
   
   如果元素来源复杂（如手动构造），可在构造后立刻做单步断言，而不是等所有测试点都生成完再统一检查。
`
