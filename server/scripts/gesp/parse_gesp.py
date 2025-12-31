import re
import json
import sys
import os
import base64
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams

def extract_content_with_fitz(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = ""
    
    # Create images directory
    base_name = os.path.basename(pdf_path)
    images_dir = os.path.join(os.path.dirname(pdf_path), f"{base_name}_images")
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
        
    img_count = 0
    
    for page_num, page in enumerate(doc):
        # Get blocks (text and images)
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if block["type"] == 0: # Text
                for line in block["lines"]:
                    for span in line["spans"]:
                        full_text += span["text"]
                    full_text += "\n"
                full_text += "\n"
            elif block["type"] == 1: # Image
                img_count += 1
                image_bytes = block["image"]
                img_ext = block["ext"]
                img_filename = f"img_{page_num}_{img_count}.{img_ext}"
                img_path = os.path.join(images_dir, img_filename)
                
                with open(img_path, "wb") as f:
                    f.write(image_bytes)
                
                b64_str = base64.b64encode(image_bytes).decode('utf-8')
                mime_type = f"image/{img_ext}"
                
                # Insert markdown image placeholder
                # Check image size to decide if it should be inline or block
                # block["bbox"] is [x0, y0, x1, y1]
                width = block["bbox"][2] - block["bbox"][0]
                height = block["bbox"][3] - block["bbox"][1]
                
                # If image is small (e.g. height < 20pt), treat as inline symbol
                if height < 20:
                     full_text += f" ![Image](data:{mime_type};base64,{b64_str}) "
                else:
                     full_text += f"\n\n![Image](data:{mime_type};base64,{b64_str})\n\n"

    return full_text

def extract_text_fallback(pdf_path):
    print("PyMuPDF (fitz) not found. Falling back to pdfminer. Images will be ignored.")
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams
    laparams = LAParams()
    text = extract_text(pdf_path, laparams=laparams)
    return text

def parse_answers(text):
    # Try to find the answer table
    # Pattern: 题号 ... 1 2 3 ...
    #          答案 ... A B C ...
    
    answers = {}
    
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        if "题" in line and "号" in line:
            nums = re.findall(r'\b\d+\b', line)
            if nums:
                # Check next few lines for "答案"
                for j in range(1, 5):
                    if i + j < len(lines):
                        ans_line = lines[i+j]
                        if "答案" in ans_line:
                            ans = re.findall(r'\b[A-E]\b', ans_line)
                            if len(nums) == len(ans):
                                for k in range(len(nums)):
                                    answers[int(nums[k])] = ans[k]
                            elif len(nums) > 0 and len(ans) > 0:
                                limit = min(len(nums), len(ans))
                                for k in range(limit):
                                    answers[int(nums[k])] = ans[k]
    return answers

def clean_text(text):
    # Remove page numbers
    text = re.sub(r'第\s*\d+\s*页\s*/\s*共\s*\d+\s*页', '', text)
    return text

def parse_questions(text, answers_map):
    questions = []
    
    # Split by "第 X 题" or "3.X 编程题"
    pattern = re.compile(r'(?:第\s*(\d+)\s*题)|(?:(\d+\.\d+)\s*编程题)')
    
    matches = list(pattern.finditer(text))
    
    for i in range(len(matches)):
        start_idx = matches[i].start()
        
        if matches[i].group(1):
            q_num_str = matches[i].group(1)
            q_type = "choice"
        else:
            q_num_str = matches[i].group(2)
            q_type = "programming"
            
        try:
            q_num = int(q_num_str)
        except ValueError:
            q_num = q_num_str 
        
        if i < len(matches) - 1:
            end_idx = matches[i+1].start()
            content = text[start_idx:end_idx]
        else:
            content = text[start_idx:]
            
        content = content[len(matches[i].group(0)):]
        
        q_data = {
            "id": q_num,
            "type": q_type,
            "stem": "",
            "options": {},
            "answer": answers_map.get(q_num, "") if q_type == "choice" else "",
            "input_format": "",
            "output_format": "",
            "samples": [],
            "source_code": ""
        }

        if q_type == "choice":
            opt_pattern = re.compile(r'\n\s*([A-E])[\.\、\s]')
            opt_matches = list(opt_pattern.finditer(content))
            
            stem = ""
            options = {}
            
            if opt_matches:
                stem = content[:opt_matches[0].start()].strip()
                
                for j in range(len(opt_matches)):
                    opt_label = opt_matches[j].group(1)
                    opt_start = opt_matches[j].end()
                    
                    if j < len(opt_matches) - 1:
                        opt_end = opt_matches[j+1].start()
                        opt_text = content[opt_start:opt_end].strip()
                    else:
                        opt_text = content[opt_start:].strip()
                    
                    options[opt_label] = opt_text
            else:
                stem = content.strip()
            
            q_data["stem"] = stem
            q_data["options"] = options
            
        elif q_type == "programming":
            sections = re.split(r'\n\s*\d+\.\d+\.\d+\s+', content)
            if len(sections) > 0:
                title_match = re.search(r'试题名称：(.*?)\n', sections[0])
                if title_match:
                    q_data["title"] = title_match.group(1).strip()
            
            section_headers = list(re.finditer(r'\n\s*(\d+\.\d+\.\d+)\s+(.*?)\n', content))
            
            parsed_sections = {}
            
            for j in range(len(section_headers)):
                header_match = section_headers[j]
                header_title = header_match.group(2).strip()
                start_pos = header_match.end()
                
                if j < len(section_headers) - 1:
                    end_pos = section_headers[j+1].start()
                else:
                    end_pos = len(content)
                
                section_content = content[start_pos:end_pos].strip()
                parsed_sections[header_title] = section_content
            
            q_data["stem"] = parsed_sections.get("题目描述", "")
            q_data["input_format"] = parsed_sections.get("输入格式", "")
            q_data["output_format"] = parsed_sections.get("输出格式", "")
            
            sample_inputs = []
            sample_outputs = []
            
            sample_pattern = re.compile(r'\n\s*\d+\.\d+\.\d+\.\d+\s+(输入样例|输出样例)\s*(\d+)?')
            sample_matches = list(sample_pattern.finditer(content))
            
            for j in range(len(sample_matches)):
                s_type = sample_matches[j].group(1)
                s_start = sample_matches[j].end()
                if j < len(sample_matches) - 1:
                    s_end = sample_matches[j+1].start()
                else:
                    next_main_header = re.search(r'\n\s*\d+\.\d+\.\d+\s+', content[s_start:])
                    if next_main_header:
                        s_end = s_start + next_main_header.start()
                    else:
                        s_end = len(content)

                s_text = content[s_start:s_end].strip()
                
                if "输入" in s_type:
                    sample_inputs.append(s_text)
                else:
                    sample_outputs.append(s_text)
            
            for k in range(max(len(sample_inputs), len(sample_outputs))):
                inp = sample_inputs[k] if k < len(sample_inputs) else ""
                out = sample_outputs[k] if k < len(sample_outputs) else ""
                q_data["samples"].append({"input": inp, "output": out})
                
            q_data["source_code"] = parsed_sections.get("参考程序", "")
            
            if "数据范围" in parsed_sections:
                q_data["stem"] += "\n\n**数据范围**\n\n" + parsed_sections["数据范围"]
            if "样例解释" in parsed_sections:
                 q_data["stem"] += "\n\n**样例解释**\n\n" + parsed_sections["样例解释"]

        questions.append(q_data)
        
    return questions

def main():
    pdf_path = r"e:\webapp\1720331276386336.pdf"
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        
    print(f"Processing {pdf_path}...")
    
    if fitz:
        print("Using PyMuPDF (fitz) for extraction...")
        raw_text = extract_content_with_fitz(pdf_path)
    else:
        raw_text = extract_text_fallback(pdf_path)
        
    cleaned_text = clean_text(raw_text)
    
    answers = parse_answers(cleaned_text)
    print(f"Found {len(answers)} answers.")
    
    questions = parse_questions(cleaned_text, answers)
    print(f"Found {len(questions)} questions.")
    
    output_file = pdf_path + ".json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
        
    print(f"Saved to {output_file}")

if __name__ == "__main__":
    main()
