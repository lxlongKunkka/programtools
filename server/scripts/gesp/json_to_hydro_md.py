import json
import sys
import os
import re

def clean_option_text(text):
    """去除选项开头的 A. B. 等标记"""
    # 匹配 "A.", "A、", "A ", "(A)" 等
    return re.sub(r'^(\s*[\(（]?[A-Z][\)）]?\s*[.、．]?\s*)', '', text).strip()

def convert_to_hydro_md(json_file):
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            problems = json.load(f)
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return

    md_lines = []
    answer_lines = []
    
    md_lines.append("# GESP 题目导出")
    md_lines.append("")
    md_lines.append("## 题目列表")
    md_lines.append("")

    global_index = 1
    
    for prob in problems:
        p_type = prob.get('type_name', '未知题型')
        stem = prob.get('stem', '').strip()
        
        # 构造题目行: 1), 题目内容 {{ select(1) }}
        # 注意：Hydro 格式要求 {{ select(N) }}
        md_lines.append(f"{global_index}), {stem} {{{{ select({global_index}) }}}}")
        
        options = prob.get('options', [])
        answers = prob.get('answer', [])
        
        # 判断题特殊处理
        if "判断" in p_type:
            # 强制生成两个选项
            md_lines.append("- 正确")
            md_lines.append("- 错误")
            
            # 处理答案用于 answer.txt
            # 假设 JSON 答案是 ["正确"] 或 ["错误"] 或 ["T"] 或 ["F"]
            ans_str = ",".join(answers)
            if any(x in ans_str for x in ["正确", "T", "√", "True"]):
                answer_lines.append(f"{global_index}: A (正确)")
            elif any(x in ans_str for x in ["错误", "F", "×", "False"]):
                answer_lines.append(f"{global_index}: B (错误)")
            else:
                answer_lines.append(f"{global_index}: {ans_str} (未知)")
                
        else:
            # 选择题
            if options:
                if isinstance(options, dict):
                    # 如果是字典 {"A": "xxx", "B": "yyy"}，按键排序输出
                    for key in sorted(options.keys()):
                        val = options[key]
                        # 字典的值通常是纯文本，不需要去除 A. 前缀，但 strip 一下
                        md_lines.append(f"- {val.strip()}")
                elif isinstance(options, list):
                    # 如果是列表 ["A. xxx", "B. yyy"]
                    for opt in options:
                        cleaned_opt = clean_option_text(opt)
                        md_lines.append(f"- {cleaned_opt}")
            else:
                # 如果没有选项，可能是填空题，但用户要求的是 select 格式
                # 暂时留空或标记
                md_lines.append("- (无选项数据)")
            
            # 处理答案
            # 假设答案是 ["A"]
            answer_lines.append(f"{global_index}: {','.join(answers)}")

        md_lines.append("") # 空行分隔
        global_index += 1

    # 输出 Markdown 文件
    output_md = json_file.replace('.json', '.md')
    with open(output_md, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))
    
    # 输出答案文件 (方便核对)
    output_ans = json_file.replace('.json', '_answers.txt')
    with open(output_ans, 'w', encoding='utf-8') as f:
        f.write('\n'.join(answer_lines))
    
    print(f"Markdown file generated: {output_md}")
    print(f"Answer file generated: {output_ans}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python json_to_hydro_md.py <json_file>")
        sys.exit(1)
    
    convert_to_hydro_md(sys.argv[1])
