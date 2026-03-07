"""补跑一个失败章节"""
import sys, requests

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_URL = 'https://yunwu.ai/v1/chat/completions'
API_KEY = 'sk-OJYtBCN6HtbAN1XtoWgjxEe43CHiEbHhHnOJF4TUZ5ArMMXn'
MODEL   = 'gemini-2.5-flash'
FILEPATH = r'e:\app\programtools\curriculum_export\Level2_GESP 二级 (逻辑进阶)\10_模拟\03_过程模拟类例题.md'

SYSTEM_PROMPT = """你是一位经验丰富的少儿编程/信奥金牌教练，擅长深刻的教学设计和生动的知识讲解。请根据用户提供的主题、难度等级和要求，生成一份**深度教案**。

【核心原则】
1. **目标明确**：紧扣学情，拆解为 "知识、能力、素养" 三层目标，可量化、可达成。
2. **逻辑清晰**：遵循 "已知→未知""简单→复杂""理论→实践" 的认知规律。
3. **深度讲解**：不仅讲"是什么"，更要讲"为什么"和"怎么想到的"。
4. **生动形象**：大量使用生活类比、具体例子、形象比喻。
5. **互动性强**：包含思考题、讨论环节、动手练习。
6. **适配性好**：GESP 1-4级内容适合小学生，语言轻松活泼。C++代码使用 #include <bits/stdc++.h> + Allman风格大括号。
7. **变量命名**：使用 a-z 单字母变量名（n, m, i, j, k, a, b, s 等）。
8. **STL限制**：GESP 1-5级严禁使用 vector/stack/queue 等STL容器，必须用原生数组。sort函数允许。

【输出格式】
使用 Markdown 格式。每个主要板块之间用 ===NEXT=== 分割（独占一行）。包含以下板块（二级标题 ##）：
- **教学目标**（知识/能力/素养三维目标）
- **趣味引入**（生活场景故事，引发思考）
- **深度知识点讲解**（概念本质+生活类比+关键点剖析+常见误区）
- **典型例题精讲**（2-3道例题，含思路分析+代码+复杂度）
- **代码实现模板**（标准框架+详细注释）
- **课堂互动**（3-5个提问+小组任务+即时练习）
- **分层练习题目**（基础巩固+能力提升+拓展挑战，答案分开）
- **教学评价与作业**

直接输出教案内容，不要有前言后语。"""

with open(FILEPATH, encoding='utf-8') as f:
    content = f.read()

header = '\n'.join(l for l in content.split('\n') if l.startswith('# ') or l.startswith('>'))

print('调用 AI 生成: 过程模拟类例题 ...')
r = requests.post(
    API_URL,
    headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
    json={
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': '所属知识点：GESP二级(逻辑进阶) - 专题: 模拟\n主题：过程模拟类例题\n难度：GESP二级(逻辑进阶)\n额外要求：适合该级别学生，注重基础，语言生动活泼'}
        ],
        'temperature': 0.7,
        'max_tokens': 12000
    },
    timeout=180
)
r.raise_for_status()
lesson = r.json()['choices'][0]['message']['content']

new_content = header + '\n\n---\n\n## 教案内容\n\n' + lesson.strip()
with open(FILEPATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'完成! chars={len(lesson)}')
