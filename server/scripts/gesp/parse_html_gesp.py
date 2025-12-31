import sys
import os
from bs4 import BeautifulSoup
import re

def parse_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    
    # Determine section title
    title_elem = soup.find(class_='exam-problem-title')
    section_title = title_elem.get_text(strip=True) if title_elem else "题目列表"
    
    print(f"# {section_title}")
    
    questions = soup.find_all(class_='exam-question-item-ctn')
    
    for i, q in enumerate(questions):
        # Index
        index_elem = q.find(class_='exam-question-index')
        index = index_elem.get_text(strip=True).replace('.', '') if index_elem else str(i + 1)
        
        # Stem
        stem_elem = q.find(class_='xm-markdown-displayer-wrap')
        stem = ""
        if stem_elem:
            # Handle katex
            for katex in stem_elem.find_all(class_='katex'):
                # Try to find the tex annotation
                annotation = katex.find('annotation', attrs={'encoding': 'application/x-tex'})
                if annotation:
                    tex = annotation.get_text()
                    katex.replace_with(f" ${tex}$ ")
                else:
                    # Fallback: remove katex-html (visual) and keep mathml text or just text
                    # If we can't find annotation, we might just get the text.
                    # But katex usually has duplicate content (mathml + html).
                    # We should remove one.
                    katex_html = katex.find(class_='katex-html')
                    if katex_html:
                        katex_html.decompose()
                    katex.replace_with(katex.get_text())

            # Handle code blocks
            # The HTML has <pre><code class="hljs language-cpp">...</code></pre>
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

        
        print(f"\n{index}), {stem} {{ select({index}) }}")
        
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
                # We need to assign A, B, C, D...
                # But the HTML might not have A, B, C labels, just the text.
                # We should output them as list items.
                for j, opt in enumerate(options):
                    text_span = opt.find(class_='ant-space-item')
                    text = text_span.get_text(strip=True) if text_span else ""
                    # Assuming standard order A, B, C, D
                    label = chr(65 + j)
                    print(f"- {label}. {text}")

if __name__ == "__main__":
    # Force stdout to utf-8 to avoid encoding issues on Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    if len(sys.argv) < 2:
        print("Usage: python parse_html_gesp.py <html_file>")
        sys.exit(1)
    file_path = sys.argv[1]
    parse_html(file_path)
