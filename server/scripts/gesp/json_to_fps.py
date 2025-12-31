import json
import sys
import xml.etree.ElementTree as ET
from xml.dom import minidom

def create_cdata(text):
    # FPS uses CDATA for content
    # But ElementTree doesn't support CDATA natively easily
    # We will just use text and let minidom handle escaping or post-process
    return text

def clean_xml_chars(text):
    # Remove control characters that are not allowed in XML
    # XML 1.0 allows: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
    return "".join(c for c in text if (
        c == '\t' or c == '\n' or c == '\r' or
        0x20 <= ord(c) <= 0xD7FF or
        0xE000 <= ord(c) <= 0xFFFD or
        0x10000 <= ord(c) <= 0x10FFFF
    ))

def format_description(problem):
    stem = problem.get('stem', '')
    options = problem.get('options', {})
    
    stem = clean_xml_chars(stem)
    
    # Simple heuristic to clean up code blocks with detached line numbers
    # If we see a sequence of numbers 1\n2\n3\n4 followed by code, we might want to clean it
    # For now, let's just wrap the stem in markdown
    
    desc = stem + "\n\n"
    
    if options:
        desc += "### 选项\n\n"
        for key in sorted(options.keys()):
            val = clean_xml_chars(options[key])
            desc += f"- **{key}**. {val}\n"
            
    return desc

def json_to_fps(json_path, output_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        problems = json.load(f)
        
    root = ET.Element("fps", version="1.2", url="https://github.com/zhblue/freeproblemset/")
    generator = ET.SubElement(root, "generator", name="GESP-Parser", url="")
    
    for p in problems:
        item = ET.SubElement(root, "item")
        
        # Determine title based on type
        p_type = p.get('type', 'choice')
        p_id = p.get('id', '')
        
        if p_type == 'programming':
            p_title = p.get('title', f"编程题 {p_id}")
            title_text = f"GESP 2025-12 C++一级 {p_title}"
        else:
            title_text = f"GESP 2025-12 C++一级 第{p_id}题"
            
        title = ET.SubElement(item, "title")
        title.text = clean_xml_chars(title_text)
        
        time_limit = ET.SubElement(item, "time_limit", unit="s")
        time_limit.text = "1"
        
        memory_limit = ET.SubElement(item, "memory_limit", unit="mb")
        memory_limit.text = "128"
        
        desc = ET.SubElement(item, "description")
        desc.text = format_description(p)
        
        input_node = ET.SubElement(item, "input")
        input_node.text = clean_xml_chars(p.get('input_format', '无'))
        
        output_node = ET.SubElement(item, "output")
        output_node.text = clean_xml_chars(p.get('output_format', '无'))
        
        # Handle samples
        samples = p.get('samples', [])
        if samples:
            # FPS supports multiple samples? Usually just one pair in standard FPS 1.2
            # But some extensions support multiple.
            # Let's put the first one in sample_input/output
            # And others in description or hint if needed.
            # For now, just take the first one.
            
            s_in = samples[0].get('input', '无')
            s_out = samples[0].get('output', '无')
            
            sample_input = ET.SubElement(item, "sample_input")
            sample_input.text = clean_xml_chars(s_in)
            
            sample_output = ET.SubElement(item, "sample_output")
            sample_output.text = clean_xml_chars(s_out)
            
            # If more samples, append to description?
            if len(samples) > 1:
                desc.text += "\n\n### 更多样例\n\n"
                for i, s in enumerate(samples[1:]):
                    desc.text += f"#### 样例 {i+2}\n"
                    desc.text += f"**输入**:\n```\n{clean_xml_chars(s.get('input',''))}\n```\n"
                    desc.text += f"**输出**:\n```\n{clean_xml_chars(s.get('output',''))}\n```\n"
        else:
            sample_input = ET.SubElement(item, "sample_input")
            sample_input.text = "无"
            
            sample_output = ET.SubElement(item, "sample_output")
            sample_output.text = "无"
        
        hint = ET.SubElement(item, "hint")
        if p_type == 'choice':
            ans = p.get('answer', '')
            hint.text = f"答案：{clean_xml_chars(ans)}"
        else:
            # For programming, maybe put source code in hint or solution?
            # FPS has <solution language="C++">...</solution>
            # But let's put it in hint for now or check if we want to add solution tag
            src = p.get('source_code', '')
            if src:
                solution = ET.SubElement(item, "solution", language="C++")
                solution.text = clean_xml_chars(src)
            else:
                hint.text = "无"
        
        # Add a source
        source = ET.SubElement(item, "source")
        source.text = "GESP 2025-12 C++一级"

    # Pretty print
    xml_str = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")
    
    # Hack to add CDATA
    # ElementTree escapes < > &, which is good for XML, but FPS usually uses CDATA
    # However, standard XML parsers handle escaped chars fine.
    # If Hydro strictly requires CDATA, we might need to regex replace.
    # Let's try to wrap description, input, output, hint in CDATA
    
    tags_to_cdata = ['description', 'input', 'output', 'sample_input', 'sample_output', 'hint', 'source']
    
    for tag in tags_to_cdata:
        # Regex to replace <tag>content</tag> with <tag><![CDATA[content]]></tag>
        # This is risky if content contains ]]>
        pass 
        # For now, let's trust standard XML escaping. Hydro should handle it.
        
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_str)
        
    print(f"Saved FPS XML to {output_path}")

if __name__ == "__main__":
    json_path = r"e:\webapp\1720331276386336.pdf.json"
    output_path = r"e:\webapp\gesp_problems.xml"
    if len(sys.argv) > 2:
        json_path = sys.argv[1]
        output_path = sys.argv[2]
        
    json_to_fps(json_path, output_path)
