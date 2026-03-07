"""
无题章节问题推荐工具
- 扫描 curriculum_export 中没有必做题的章节
- 分析同专题有题章节的题号范围
- 推断可能的空隙位置，给出推荐题号
- 输出 CSV 报告供人工审核
"""
import os
import re
import csv
import sys

CURRICULUM_ROOT = r"e:\app\programtools\curriculum_export"
OUTPUT_CSV = r"e:\app\programtools\curriculum_export\no_prob_report.csv"

# 只处理哪些等级（None=全部）
ONLY_LEVELS = None  # e.g. ["Level1", "Level2", "Level3", "Level4"]


def extract_problem_ids(content):
    """从章节 Markdown 中提取题目 ID 列表"""
    prob_ids = []
    # 找 ## 必做题 或 ## 选做题 块
    sections = re.split(r'^## ', content, flags=re.MULTILINE)
    for sec in sections:
        if sec.startswith('必做题') or sec.startswith('选做题'):
            # 找所有 `LevelN:M` 格式
            ids = re.findall(r'`(Level\d+:\d+)`', sec)
            prob_ids.extend(ids)
    return prob_ids


def extract_chapter_meta(content):
    """提取章节元数据（ID、专题、等级）"""
    meta = {}
    m = re.search(r'\*\*章节 ID：\*\*\s*`([^`]+)`', content)
    if m:
        meta['chapter_id'] = m.group(1)
    else:
        # 尝试备用格式
        m2 = re.search(r'章节 ID[：:]\s*`([^`]+)`', content)
        if m2:
            meta['chapter_id'] = m2.group(1)
    return meta


def has_problems(content):
    """判断章节是否有必做题"""
    if '## 必做题' not in content:
        return False
    # 必做题后面有题号
    ids = extract_problem_ids(content)
    return len(ids) > 0


def get_level_prefix(level_dir):
    """从等级目录名提取题号前缀，如 Level1_GESP... -> Level1"""
    m = re.match(r'(Level\d+)', level_dir)
    return m.group(1) if m else level_dir


def main():
    rows = []  # CSV 行

    print("=" * 70)
    print("无题章节问题推荐分析")
    print("=" * 70)

    # 统计每个等级已用的所有题号
    all_used_ids = {}  # level_prefix -> sorted list of int ids

    # 两遍扫描：第 1 遍收集所有已用 ID
    for level_dir in sorted(os.listdir(CURRICULUM_ROOT)):
        level_path = os.path.join(CURRICULUM_ROOT, level_dir)
        if not os.path.isdir(level_path):
            continue
        if level_dir == 'RESTRUCTURE_PROPOSAL.md':
            continue
        prefix = get_level_prefix(level_dir)
        used = set()
        for topic_dir in sorted(os.listdir(level_path)):
            topic_path = os.path.join(level_path, topic_dir)
            if not os.path.isdir(topic_path):
                continue
            for ch_file in sorted(os.listdir(topic_path)):
                if not ch_file.endswith('.md'):
                    continue
                content = open(os.path.join(topic_path, ch_file), encoding='utf-8').read()
                ids = extract_problem_ids(content)
                for pid in ids:
                    m = re.match(r'Level\d+:(\d+)', pid)
                    if m:
                        used.add(int(m.group(1)))
        all_used_ids[prefix] = sorted(used)

    # 第 2 遍：找无题章节，分析上下文
    total_no_prob = 0
    
    for level_dir in sorted(os.listdir(CURRICULUM_ROOT)):
        level_path = os.path.join(CURRICULUM_ROOT, level_dir)
        if not os.path.isdir(level_path):
            continue
        if ONLY_LEVELS and not any(level_dir == l or level_dir.startswith(l + '_') for l in ONLY_LEVELS):
            continue
        
        prefix = get_level_prefix(level_dir)
        used_nums = all_used_ids.get(prefix, [])
        max_used = max(used_nums, default=0)

        no_prob_in_level = []

        for topic_dir in sorted(os.listdir(level_path)):
            topic_path = os.path.join(level_path, topic_dir)
            if not os.path.isdir(topic_path):
                continue
            topic_name = topic_dir[3:] if len(topic_dir) > 3 and topic_dir[:2].isdigit() else topic_dir

            # 收集整个专题的章节，按顺序分析
            chapters_in_topic = []
            for ch_file in sorted(os.listdir(topic_path)):
                if not ch_file.endswith('.md'):
                    continue
                content = open(os.path.join(topic_path, ch_file), encoding='utf-8').read()
                ids = extract_problem_ids(content)
                chapters_in_topic.append({
                    'file': ch_file,
                    'content': content,
                    'ids': ids,
                    'has_prob': len(ids) > 0
                })

            # 找专题内最大最小题号
            topic_nums = []
            for ch in chapters_in_topic:
                for pid in ch['ids']:
                    m = re.match(r'Level\d+:(\d+)', pid)
                    if m:
                        topic_nums.append(int(m.group(1)))
            topic_min = min(topic_nums, default=None)
            topic_max = max(topic_nums, default=None)

            for idx, ch in enumerate(chapters_in_topic):
                if not ch['has_prob']:
                    title_match = re.search(r'^# (.+)$', ch['content'], re.MULTILINE)
                    title = title_match.group(1).strip() if title_match else ch['file']
                    meta = extract_chapter_meta(ch['content'])
                    chapter_id = meta.get('chapter_id', '?')

                    # 推断推荐题号：基于专题内相邻章节
                    suggested = []
                    if topic_max:
                        # 在专题末尾追加 3 题
                        next_num = topic_max + 1
                        for i in range(3):
                            while (next_num + i) in used_nums:
                                next_num += 1
                            suggested.append(f"{prefix}:{next_num + i}")
                    else:
                        # 专题全无题，从当前最大 ID 后追加
                        next_num = max_used + 1
                        for i in range(3):
                            suggested.append(f"{prefix}:{next_num + i}")
                        max_used += 3  # 更新估计的最大值

                    reason = "专题内无相邻题号，从全局末尾分配" if topic_max is None else f"专题题号范围 {prefix}:{topic_min}~{prefix}:{topic_max}，在末尾追加"
                    
                    no_prob_in_level.append({
                        'level': level_dir,
                        'topic': topic_name,
                        'chapter_id': chapter_id,
                        'file': ch['file'],
                        'title': title,
                        'suggested_3': ', '.join(suggested[:3]),
                        'reason': reason
                    })
                    total_no_prob += 1

        if no_prob_in_level:
            print(f"\n[{level_dir}] — {len(no_prob_in_level)} 个无题章节:")
            for item in no_prob_in_level:
                print(f"  {item['chapter_id']:8s} | {item['title'][:30]:30s} | 推荐: {item['suggested_3']}")
            rows.extend(no_prob_in_level)

    # 写 CSV
    print(f"\n{'='*70}")
    print(f"共 {total_no_prob} 个无题章节，报告已写入: {OUTPUT_CSV}")

    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=['level', 'topic', 'chapter_id', 'file', 'title', 'suggested_3', 'reason'])
        writer.writeheader()
        writer.writerows(rows)


if __name__ == '__main__':
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    main()
