export const getDataGenPrompt = (extraConstraintPrompt, cyaronDocs, code) => `你是一个专业的算法竞赛测试数据生成专家。请输出使用 CYaRon 的高效 Python 数据生成脚本。

【重要要求】
1. **只输出 Python 代码块**，不要输出任何额外的文字说明、Markdown 标题或解题思路。
2. 如果需要说明数据生成的逻辑，请直接写在 Python 代码的注释中。
3. 最终输出应只包含一个 \`\`\`python ... \`\`\` 代码块。

【语言要求：必须使用简体中文输出】
- 代码注释必须使用简体中文。

【目标】
- 生成速度极快，支持 n=1e5~2e5；避免任何低效写, 根据题意生成多组测试数据的数据生成脚本。

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
   - 生成随机整数需要使用 CYaRon 提供的随机数生成函数 randint
   - 生成一维数组使用 [random.randint(0, 100000) for _ in range(n)] 这种方式
   - 只在 CYaRon 未提供的功能（如 shuffle、choice、seed）时使用 \`py_random\`
   - **如果需要使用 random() 生成0到1之间的随机浮点数，必须使用 \`py_random.random()\`，不能直接使用 random()**
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
   - 对矩形/线段进行分割时，水平切割要求 \`H >= 2\`，垂直切割要求 \`W >= 2\`；若两个维度都为 1（1×1）则无法分割，需提前 \`break\`
   - 方向判断应使用 \`<= 1\` 而非 \`== 1\`，更安全：
     \`\`\`python
     if hold_H <= 1:
         orient = 'V'
     elif hold_W <= 1:
         orient = 'H'
     else:
         orient = py_random.choice(['H', 'V'])
     \`\`\`
   - 需要生成 N 个分块时，必须保证初始总量 \`>= N\`；若某维度可能取到 1，则另一维度必须 \`>= N\`，防止根本切不出 N 块
   - **【重要】必须保证 `H * W >= N`**，否则矩形面积不够，切不出 N 块就会崩溃。具体做法：
     - 若 H、W 均随机，需确保 \`H * W >= N\`，例如先固定 H，再令 \`W = randint(max(1, (N + H - 1) // H), upper)\`
     - 或者直接保证 \`H >= N\` 或 \`W >= N\`（面积必然 >= N）
     - 循环体开头加安全兜底：\`if cur_h <= 1 and cur_w <= 1: break\`
`
