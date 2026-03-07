"""
批量为空章节生成教案内容
- 扫描 curriculum_export 中的所有 EMPTY 章节
- 调用 AI API 生成完整教案
- 写回 markdown 文件
- 生成完成后，可用 import_to_db.js 导入数据库
"""
import os
import sys
import json
import time
import requests

# Windows 终端 UTF-8 输出
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# 同时写到日志文件
import io

class TeeWriter(io.TextIOBase):
    def __init__(self, *streams):
        self.streams = streams
    def write(self, s):
        for st in self.streams:
            st.write(s)
            st.flush()
        return len(s)

_logfile = open(os.path.join(os.path.dirname(__file__), 'batch_gen_log.txt'), 'w', encoding='utf-8')
sys.stdout = TeeWriter(sys.__stdout__, _logfile)

# ========== 配置 ==========
API_URL = "https://yunwu.ai/v1/chat/completions"
API_KEY = "sk-OJYtBCN6HtbAN1XtoWgjxEe43CHiEbHhHnOJF4TUZ5ArMMXn"
MODEL   = "gemini-2.5-flash"
LANG    = "C++"
CURRICULUM_ROOT = r"e:\app\programtools\curriculum_export"
# 只处理哪些等级 (None=全部)
ONLY_LEVELS = ["Level5", "Level6", "Level7", "Level8", "Level9"]
DELAY_SECONDS = 2   # 每次请求之间的间隔（秒）

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


def is_empty(content):
    """判断章节内容是否为空（需要生成）"""
    if '暂无教案' in content:
        return True
    if len(content.strip()) < 300:
        return True
    # 只有元数据没有实际内容
    lines = [l.strip() for l in content.split('\n') if l.strip() and not l.startswith('>') and not l.startswith('#') and not l.startswith('`')]
    return len('\n'.join(lines)) < 100


def get_level_name(level_dir):
    """从目录名提取等级名称，如 'Level1_GESP 一级 (语法与顺序逻辑)' -> 'GESP一级(语法与顺序逻辑)'"""
    # Remove "Level1_" prefix
    parts = level_dir.split('_', 1)
    return parts[1] if len(parts) > 1 else level_dir


def extract_existing_meta(content):
    """从现有内容中提取已有信息（题目、资源链接等）"""
    lines = content.split('\n')
    prob_section = []
    meta_lines = []
    in_prob = False
    
    for line in lines:
        if line.startswith('## 必做题') or line.startswith('## 选做题'):
            in_prob = True
            prob_section.append(line)
        elif line.startswith('## ') and in_prob:
            in_prob = False
        elif in_prob:
            prob_section.append(line)
        elif line.startswith('>') or line.strip().startswith('`https://'):
            meta_lines.append(line)
    
    return '\n'.join(prob_section), '\n'.join(meta_lines)


def call_ai(topic, context, level_name, requirements=''):
    """调用AI生成教案"""
    user_prompt = f"所属知识点：{context}\n主题：{topic}\n难度：{level_name}\n额外要求：{requirements or '适合该级别学生，注重基础，语言生动活泼'}"
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 12000
    }
    
    resp = requests.post(
        API_URL,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=180
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']


def process_chapter_file(filepath, level_name, topic_name, chapter_name):
    """处理单个章节文件"""
    content = open(filepath, encoding='utf-8').read()
    
    if not is_empty(content):
        return False, "已有内容，跳过"
    
    # Extract existing metadata (problems, links)
    prob_section, meta_lines = extract_existing_meta(content)
    
    # Get chapter title from filename
    title = chapter_name.replace('.md', '')
    # Remove number prefix like "01_"
    if '_' in title and title[:2].isdigit():
        title = title[3:]
    
    print(f"  生成: {title} ...")
    
    try:
        lesson_plan = call_ai(
            topic=title,
            context=f"{level_name} - 专题: {topic_name}",
            level_name=level_name
        )
        
        # Reconstruct the file: keep header + problems + add lesson plan
        header_lines = []
        for line in content.split('\n'):
            if line.startswith('# ') or line.startswith('>'):
                header_lines.append(line)
            else:
                break
        
        header = '\n'.join(header_lines) if header_lines else f"# {title}"
        
        # Build new content
        new_content = header + '\n\n---\n\n'
        if prob_section.strip():
            new_content += prob_section.strip() + '\n\n'
        if meta_lines.strip():
            new_content += meta_lines.strip() + '\n\n'
        new_content += '## 教案内容\n\n' + lesson_plan.strip()
        
        open(filepath, 'w', encoding='utf-8').write(new_content)
        return True, f"成功 ({len(lesson_plan)} chars)"
    
    except Exception as e:
        return False, f"失败: {e}"


def main():
    total_generated = 0
    total_skipped = 0
    total_failed = 0
    failed_list = []
    
    print("=" * 60)
    print(f"批量教案生成 | 模型: {MODEL}")
    print("=" * 60)
    
    level_dirs = sorted(os.listdir(CURRICULUM_ROOT))
    
    for level_dir in level_dirs:
        if not os.path.isdir(os.path.join(CURRICULUM_ROOT, level_dir)):
            continue
        if ONLY_LEVELS and not any(level_dir == l or level_dir.startswith(l + '_') for l in ONLY_LEVELS):
            continue
        
        level_path = os.path.join(CURRICULUM_ROOT, level_dir)
        level_name = get_level_name(level_dir)
        
        topic_dirs = sorted([d for d in os.listdir(level_path) if os.path.isdir(os.path.join(level_path, d))])
        empty_in_level = 0
        
        # Count empties first
        for topic_dir in topic_dirs:
            topic_path = os.path.join(level_path, topic_dir)
            for ch_file in sorted(os.listdir(topic_path)):
                if not ch_file.endswith('.md'):
                    continue
                content = open(os.path.join(topic_path, ch_file), encoding='utf-8').read()
                if is_empty(content):
                    empty_in_level += 1
        
        if empty_in_level == 0:
            continue
        
        print(f"\n[{level_dir}] — {empty_in_level} 个空章节")
        
        for topic_dir in topic_dirs:
            topic_path = os.path.join(level_path, topic_dir)
            topic_name_clean = topic_dir[3:] if topic_dir[:2].isdigit() else topic_dir  # remove "01_"
            
            for ch_file in sorted(os.listdir(topic_path)):
                if not ch_file.endswith('.md'):
                    continue
                filepath = os.path.join(topic_path, ch_file)
                content = open(filepath, encoding='utf-8').read()
                if not is_empty(content):
                    continue
                
                ok, msg = process_chapter_file(filepath, level_name, topic_name_clean, ch_file)
                if ok:
                    total_generated += 1
                    print(f"    [OK] [{total_generated}] {ch_file[:40]} -> {msg}")
                    time.sleep(DELAY_SECONDS)
                elif '跳过' in msg:
                    total_skipped += 1
                else:
                    total_failed += 1
                    failed_list.append(f"{level_dir}/{topic_dir}/{ch_file}: {msg}")
                    print(f"    [ERR] {ch_file[:40]} -> {msg}")
    
    print("\n" + "=" * 60)
    print(f"完成! 生成={total_generated}, 跳过={total_skipped}, 失败={total_failed}")
    if failed_list:
        print("\n失败列表:")
        for f in failed_list:
            print(f"  {f}")


if __name__ == '__main__':
    # 先做一个dry run统计
    if '--dry-run' in sys.argv:
        count = 0
        for level_dir in sorted(os.listdir(CURRICULUM_ROOT)):
            lp = os.path.join(CURRICULUM_ROOT, level_dir)
            if not os.path.isdir(lp): continue
            for t in sorted(os.listdir(lp)):
                tp = os.path.join(lp, t)
                if not os.path.isdir(tp): continue
                for c in sorted(os.listdir(tp)):
                    if not c.endswith('.md'): continue
                    content = open(os.path.join(tp, c), encoding='utf-8').read()
                    if is_empty(content):
                        count += 1
                        print(f"  {level_dir[:8]}/{t}/{c[:40]}")
        print(f"\n共 {count} 个空章节需要生成")
    else:
        main()
