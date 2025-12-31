import sys
import os
from bs4 import BeautifulSoup
import re

def clean_katex(elem):
    """
    Clean KaTeX elements in the given soup element.
    Replaces visual HTML with TeX source if available, or just text.
    """
    if not elem:
        return
        
    for katex in elem.find_all(class_='katex'):
        # Try to find the tex annotation
        annotation = katex.find('annotation', attrs={'encoding': 'application/x-tex'})
        if annotation:
            tex = annotation.get_text()
            # If it looks like a code signature (e.g. void func(...)), wrap in backticks
            # Otherwise wrap in $
            if re.match(r'^\s*(void|int|char|double|float|bool|long)\s+', tex):
                 katex.replace_with(f" `{tex}` ")
            else:
                 katex.replace_with(f" ${tex}$ ")
        else:
            # Fallback: remove katex-html (visual) and keep mathml text or just text
            katex_html = katex.find(class_='katex-html')
            if katex_html:
                katex_html.decompose()
            katex.replace_with(katex.get_text())

def process_question(q, index):
    # Stem
    stem_elem = q.find(class_='xm-markdown-displayer-wrap')
    stem = ""
    if stem_elem:
        # Handle katex
        clean_katex(stem_elem)

        # Handle code blocks
        code_blocks = []
        for i, pre in enumerate(stem_elem.find_all('pre')):
            code = pre.find('code')
            if code:
                lang_class = code.get('class', [])
                lang = 'cpp'
                for c in lang_class:
                    if c.startswith('language-'):
                        lang = c.replace('language-', '')
                        break
                code_content = code.get_text()
                # Store code block with placeholder
                placeholder = f"[[CODE_BLOCK_{i}]]"
                code_blocks.append(f"\n```{lang}\n{code_content}\n```\n")
                pre.replace_with(placeholder)

        stem = stem_elem.get_text(strip=True)
        # Clean up multiple spaces
        stem = re.sub(r'\s+', ' ', stem)
        
        # Restore code blocks
        for i, block in enumerate(code_blocks):
            stem = stem.replace(f"[[CODE_BLOCK_{i}]]", block)

    print(f"\n{index}), {stem}")
    print(f"{{{{ select({index}) }}}}")
    
    # Options
    radio_group = q.find(class_='ant-radio-group')
    is_judgment = False
    if radio_group:
        options = radio_group.find_all('label', class_='ant-radio-wrapper')
        
        # Check if it looks like judgment
        for opt in options:
            val_input = opt.find('input')
            val = val_input['value'] if val_input else ""
            if val in ['正确', '错误', 'true', 'false']:
                is_judgment = True
                break
        
        if is_judgment:
            print("- true")
            print("- false")
        else:
            # Single choice
            for j, opt in enumerate(options):
                # Structure:
                # <label class="ant-radio-wrapper">
                #   <span class="ant-radio">...</span>
                #   <span>
                #     <div class="ant-space ...">
                #       <div class="ant-space-item"><span>A.</span></div>
                #       <div class="ant-space-item"><div>...<p>Content</p>...</div></div>
                #     </div>
                #   </span>
                # </label>
                
                # Strategy:
                # 1. Find the second 'ant-space-item' which contains the content.
                # 2. If not found, fallback to getting all text excluding radio.
                
                content_text = ""
                space_items = opt.find_all(class_='ant-space-item')
                if len(space_items) >= 2:
                    # The second item usually holds the content
                    content_div = space_items[1]
                    # Clean KaTeX in options too!
                    clean_katex(content_div)
                    content_text = content_div.get_text(strip=True)
                else:
                    # Fallback
                    radio_span = opt.find(class_='ant-radio')
                    if radio_span:
                        radio_span.extract()
                    # Clean KaTeX in fallback
                    clean_katex(opt)
                    content_text = opt.get_text(strip=True)
                    # Remove leading "A." if present in fallback
                    content_text = re.sub(r'^[A-Z]\.\s*', '', content_text)

                # Assuming standard order A, B, C, D
                label = chr(65 + j)
                print(f"- {label}. {content_text}")

def parse_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    
    # Determine section title
    # Priority 1: xm-header-name (Paper title)
    title_elem = soup.find(class_='xm-header-name')
    if not title_elem:
        # Priority 2: exam-problem-title (Old format?)
        title_elem = soup.find(class_='exam-problem-title')
        
    section_title = title_elem.get_text(strip=True) if title_elem else "题目列表"
    
    print(f"# {section_title}")
    
    # Try to find sections
    problem_lists = soup.find_all(class_='exam-problem-list')
    
    global_index = 1
    
    if problem_lists:
        for p_list in problem_lists:
            # Section Title
            header = p_list.find(class_='exam-problem-header')
            if header:
                title_span = header.find(class_='exam-problem-title')
                score_span = header.find(class_='exam-problem-score')
                
                sec_title = title_span.get_text(strip=True) if title_span else "部分"
                sec_score = score_span.get_text(strip=True) if score_span else ""
                
                print(f"\n## {sec_title} {sec_score}")
            
            questions = p_list.find_all(class_='exam-question-item-ctn')
            for q in questions:
                process_question(q, global_index)
                global_index += 1
    else:
        # Fallback: find all questions directly
        questions = soup.find_all(class_='exam-question-item-ctn')
        for i, q in enumerate(questions):
            process_question(q, i + 1)

if __name__ == "__main__":
    # Force stdout to utf-8 to avoid encoding issues on Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    if len(sys.argv) < 2:
        print("Usage: python parse_html_gesp.py <html_file>")
        sys.exit(1)
    file_path = sys.argv[1]
    parse_html(file_path)
