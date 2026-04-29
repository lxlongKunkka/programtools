import { normalizeProblemTitle } from './titleNormalization'

// 生成 run.py（跨平台自动化脚本）
export function generateRunScript(language) {
  const lang = language
  const script = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试数据生成脚本
自动编译标准程序并生成测试数据
"""

import os
import sys
import subprocess
import platform
import zipfile
import re

def print_header(text):
    """打印标题"""
    print("\\n" + "=" * 50)
    print(f"  {text}")
    print("=" * 50 + "\\n")

def print_step(step, total, text):
    """打印步骤"""
    print(f"[{step}/{total}] {text}")

def run_command(cmd, check=True):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        if check and result.returncode != 0:
            print(f"错误: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

def check_command(cmd, name):
    """检查命令是否可用"""
    try:
        subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            check=False
        )
        return True
    except:
        return False

def main():
    print_header("测试数据生成工具")
    
    # 获取脚本所在目录的绝对路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if not script_dir:
        script_dir = os.getcwd()
    
    print(f"脚本所在目录: {script_dir}")
    
    # 切换到脚本所在目录
    try:
        os.chdir(script_dir)
        print(f"工作目录已切换: {os.getcwd()}\\n")
    except Exception as e:
        print(f"[!] 警告: 无法切换工作目录: {e}")
        print(f"当前工作目录: {os.getcwd()}\\n")
    
    is_windows = platform.system() == 'Windows'
    
    # 步骤 1: 检查 C++ 编译器
    print_step(1, 4, "检查 C++ 编译器...")
    if not check_command("g++ --version", "g++"):
        print("[X] 错误: 未找到 g++ 编译器！")
        print("\\n请安装以下工具之一：")
        if is_windows:
            print("  - TDM-GCC: https://jmeubank.github.io/tdm-gcc/")
            print("  - MinGW-w64")
            print("  - MSYS2")
        else:
            print("  - Linux: sudo apt install g++")
            print("  - macOS: xcode-select --install")
        sys.exit(1)
    print("[√] g++ 编译器已安装\\n")
    
    # 步骤 2: 检查 Python
    print_step(2, 4, "检查 Python...")
    python_cmd = "python" if is_windows else "python3"
    if not check_command(f"{python_cmd} --version", "Python"):
        print("[X] 错误: 未找到 Python！")
        print("\\n请从以下网址安装 Python 3.x：")
        print("  https://www.python.org/downloads/")
        sys.exit(1)
    
    result = subprocess.run(
        f"{python_cmd} --version", 
        shell=True, 
        capture_output=True, 
        text=True
    )
    print(result.stdout.strip())
    print("[√] Python 已安装\\n")
    
    # 步骤 3: 编译标准程序
    print_step(3, 4, "编译标准程序...")
    
    ${lang === 'C++' ? `
    if not os.path.exists('std.cpp'):
        print("[X] 错误: 找不到 std.cpp 文件！")
        sys.exit(1)
    
    exe_name = 'std.exe' if is_windows else 'std'
    compile_cmd = f"g++ std.cpp -o {exe_name} -std=c++17 -O2 -Wl,--stack,536870912"
    
    print(f"正在编译: {compile_cmd}")
    if not run_command(compile_cmd):
        print("\\n[X] 编译失败！请检查代码是否有语法错误\\n")
        sys.exit(1)
    print(f"[√] 编译成功: {exe_name}\\n")
    ` : lang === 'Python' ? `
    if not os.path.exists('std.py'):
        print("[X] 错误: 找不到 std.py 文件！")
        sys.exit(1)
    print("[√] 找到 std.py\\n")
    ` : `
    if not os.path.exists('Main.java'):
        print("[X] 错误: 找不到 Main.java 文件！")
        sys.exit(1)
    
    compile_cmd = "javac Main.java"
    print(f"正在编译: {compile_cmd}")
    if not run_command(compile_cmd):
        print("\\n[X] 编译失败！请检查代码是否有语法错误\\n")
        sys.exit(1)
    print("[√] 编译成功: Main.class\\n")
    `}
    
    # 步骤 4: 检查并安装 Cyaron
    print_step(4, 4, "检查 Cyaron 库...")
    
    check_cyaron = f"{python_cmd} -c \\"import cyaron\\""
    if not run_command(check_cyaron, check=False):
        print("[!] Cyaron 未安装，正在安装...\\n")
        
        install_cmd = f"{python_cmd} -m pip install cyaron"
        if not run_command(install_cmd, check=False):
            print("\\n[!] 安装失败，尝试使用国内镜像...")
            install_cmd = f"{python_cmd} -m pip install cyaron -i https://pypi.tuna.tsinghua.edu.cn/simple"
            run_command(install_cmd)
        print()
    else:
        print("[√] Cyaron 已安装\\n")
    
    # 生成测试数据
    print_header("开始生成测试数据")
    
    if not os.path.exists('testdata'):
        os.makedirs('testdata')
        print("创建 testdata 目录\\n")
    
    if not os.path.exists('data_generator.py'):
        print("[X] 错误: 找不到 data_generator.py 文件！")
        sys.exit(1)
    
    print("运行数据生成脚本...\\n")
    print("-" * 50)
    
    gen_cmd = f"{python_cmd} data_generator.py"
    result = subprocess.run(gen_cmd, shell=True)
    
    print("-" * 50)
    
    if result.returncode == 0:
        # 统计生成的文件
        data_files = [f for f in os.listdir('testdata') if f.endswith('.in') or f.endswith('.out')]
        in_files = len([f for f in data_files if f.endswith('.in')])
        out_files = len([f for f in data_files if f.endswith('.out')])
        
        print("\\n" + "=" * 50)
        print(f"  生成完成！")
        print(f"  输入文件: {in_files} 个")
        print(f"  输出文件: {out_files} 个")
        print(f"  数据目录: ./testdata/")
        print("=" * 50 + "\\n")
        
        # 打包文件
        print_header("打包文件")
        
        try:
            import yaml
            
            # 读取 problem.yaml 获取题目标题
            # zip_name = "problem"
            # if os.path.exists('problem.yaml'):
            #     try:
            #         with open('problem.yaml', 'r', encoding='utf-8') as f:
            #             yaml_content = yaml.safe_load(f)
            #             if yaml_content and 'title' in yaml_content:
            #                 zip_name = yaml_content['title']
            #                 print(f"题目标题: {zip_name}")
            #     except:
            #         print("[!] 无法读取 problem.yaml，使用默认名称")
            # else:
            #     print("[!] problem.yaml 不存在，使用默认名称")
            
            # 使用当前目录名作为文件名，以保留序号
            current_dir_name = os.path.basename(os.getcwd())
            zip_name = current_dir_name + "ed"
            
            # 创建 zip 文件名（去除特殊字符）
            import re
            # if not zip_name:
            #     zip_name = "problem"
            zip_name = re.sub(r'[\\\\/:*?\\"<>|]', '_', str(zip_name))
            zip_path = os.path.join('..', f"{zip_name}.zip")
            
            print(f"\\n正在打包到: {zip_path}")
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 打包 testdata 文件夹
                if os.path.exists('testdata'):
                    for root, dirs, files in os.walk('testdata'):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, '.')
                            zipf.write(file_path, arcname)
                            print(f"  + {arcname}")
                
                # 打包 problem.yaml
                if os.path.exists('problem.yaml'):
                    zipf.write('problem.yaml', 'problem.yaml')
                    print("  + problem.yaml")
                
                # 打包 problem_zh.md
                if os.path.exists('problem_zh.md'):
                    zipf.write('problem_zh.md', 'problem_zh.md')
                    print("  + problem_zh.md")
                
                # 打包 problem_zh_TW.md（原文）
                if os.path.exists('problem_zh_TW.md'):
                    zipf.write('problem_zh_TW.md', 'problem_zh_TW.md')
                    print("  + problem_zh_TW.md")
                
                # 打包 problem_en.md
                if os.path.exists('problem_en.md'):
                    zipf.write('problem_en.md', 'problem_en.md')
                    print("  + problem_en.md")

                # 打包 additional_file 文件夹 (包含 solution.md, std.cpp, data_generator.py, ppt)
                # 1. 如果当前目录下已经存在 additional_file 文件夹，直接打包其内容
                if os.path.exists('additional_file') and os.path.isdir('additional_file'):
                    for root, dirs, files in os.walk('additional_file'):
                        for file in files:
                            file_path = os.path.join(root, file)
                            # 保持 additional_file/xxx 的结构
                            arcname = os.path.relpath(file_path, '.')
                            zipf.write(file_path, arcname)
                            print(f"  + {arcname}")
                
                # 2. 同时也扫描当前目录下的关键文件，补充进去 (如果 additional_file 中没有的话)
                # 这样既支持批量下载时预生成的 additional_file，也支持手动运行时的文件收集
                
                candidates = ['solution.md', 'data_generator.py', 'std.cpp', 'std.py', 'Main.java']
                
                # 自动查找 PPT 相关文件
                for f in os.listdir('.'):
                    if os.path.isfile(f):
                        lower_f = f.lower()
                        if f in ['run.py', 'run.bat', 'problem.yaml', 'problem_zh.md', 'problem_zh_TW.md', 'problem_en.md', 'sample.zip'] or f in candidates:
                            continue
                        if 'ppt' in lower_f or lower_f.endswith('.html') or lower_f.endswith('.pptx') or lower_f.endswith('.pdf'):
                            candidates.append(f)

                for f in candidates:
                    if os.path.exists(f):
                        # 检查是否已经在 zip 中 (通过 additional_file 文件夹打包进去了)
                        # 简单起见，我们总是尝试写入，zipfile 允许重复路径但会增大体积，或者我们可以先检查
                        # 这里我们假设如果 additional_file 存在，里面应该已经有了这些文件
                        # 但为了保险，如果 additional_file 文件夹不存在，或者文件不在其中，我们再打包一次
                        
                        target_path = f"additional_file/{f}"
                        # 只有当 additional_file 目录不存在，或者该文件不在 additional_file 目录中时才添加
                        # 由于 zipf.namelist() 在写入过程中可能不实时更新，我们简化逻辑：
                        # 如果存在 additional_file 目录，我们假设它已经包含了所需内容 (因为批量下载时是这样生成的)
                        # 如果不存在 additional_file 目录 (比如手动创建的项目)，则执行自动收集逻辑
                        
                        if not os.path.exists(os.path.join('additional_file', f)):
                             zipf.write(f, target_path)
                             print(f"  + {target_path}")
            
            print("\\n" + "=" * 50)
            print(f"  打包完成！")
            print(f"  文件位置: {os.path.abspath(zip_path)}")
            print("=" * 50 + "\\n")
            
        except ImportError:
            print("[!] 警告: 缺少 PyYAML 库，跳过打包")
            print("    安装命令: pip install pyyaml")
        except Exception as e:
            print(f"[!] 打包时出错: {e}")
            print("    继续执行...")
    else:
        print("\\n[X] 数据生成失败！请检查脚本或标准程序\\n")
        sys.exit(1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\\n\\n[!] 用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\\n[X] 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
`
  return script
}

// 生成 run.bat（Windows 启动脚本）
export function generateBatScript() {
  return `@echo off
REM Change to script directory
cd /d "%~dp0"

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.x from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Run Python script
python run.py

REM Pause to view results
if errorlevel 1 (
    echo.
    echo [ERROR] Script execution failed!
)
echo.
pause
`
}

// 生成 README.md
export function generateReadme(language) {
  const langInfo = language === 'C++'
    ? { file: 'std.cpp', compiler: 'g++', compile: 'g++ std.cpp -o std -std=c++17 -O2 -Wl,--stack,536870912' }
    : language === 'Python'
    ? { file: 'std.py', compiler: 'Python', compile: '无需编译' }
    : { file: 'Main.java', compiler: 'javac', compile: 'javac Main.java' }

  return `# 测试数据生成项目

本项目包含算法题的标准程序和测试数据生成脚本。

## 快速开始

**运行命令：\`python run.py\`** 或 \`python3 run.py\`

脚本会自动：
1. 检查编译器和 Python 环境
2. 编译标准程序（如需要）
3. 安装 Cyaron（如需要）
4. 生成测试数据到 testdata 目录

## 环境要求

- **${langInfo.compiler}**: ${language === 'C++' ? '编译标准程序 (推荐 TDM-GCC 或 MinGW)' : language === 'Python' ? '运行标准程序' : '编译 Java 程序'}
- **Python 3.x**: 运行数据生成脚本
- **Cyaron**: 数据生成库（脚本会自动安装）

## 手动运行

\`\`\`bash
# 1. 编译（如需要）
${langInfo.compile}

# 2. 安装 Cyaron
pip install cyaron

# 3. 生成数据
python data_generator.py
\`\`\`

## 文件说明

- \`${langInfo.file}\`: 标准程序（AC 代码）
- \`data_generator.py\`: Cyaron 数据生成脚本  
- \`run.py\`: 自动化运行脚本（跨平台）
- \`testdata/\`: 测试数据输出目录

## 输出

生成的数据文件格式：
- data1.in, data1.out
- data2.in, data2.out
- ...

---
生成于 ${new Date().toLocaleString('zh-CN')}
`
}

// 生成 problem.yaml
export function generateProblemYaml(meta, problemText = '', translationText = '') {
  console.log('生成 problem.yaml，meta:', meta)

  // 1) 先构造标题的稳健兜底：优先 meta.title；否则取翻译/题面首行
  const fallbackTitle = (() => {
    const src = (translationText || problemText || '').trim()
    const lines = src.split('\n').map(s => s.trim()).filter(Boolean)
    const badKeywords = /(题目背景|题面背景|题目描述|题面描述|背景|说明|介绍)/
    const stripMd = (s) => s.replace(/^#{1,6}\s*/, '')
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^#{1,3}\s*(.+)$/)
      if (m) {
        const t = stripMd(m[1]).trim()
        if (t && !badKeywords.test(t)) return t
      }
    }
    for (let i = 0; i < lines.length; i++) {
      const t = stripMd(lines[i]).trim()
      if (!t) continue
      if (/^(输入|输出|数据范围|样例|说明)/.test(t)) continue
      if (badKeywords.test(t)) continue
      const cleaned = t.replace(/^[-*\s]+/, '')
      if (cleaned) return cleaned
    }
    return '未命名题目'
  })()

  const cleanTags = []
  let finalTitle = fallbackTitle
  if (meta) {
    const { title, tags } = meta
    finalTitle = (title && String(title).trim()) ? String(title).trim() : fallbackTitle
    if (Array.isArray(tags)) {
      tags.forEach(tag => {
        const cleaned = String(tag || '').trim()
        if (!cleaned) return
        if (/^level\d+$/i.test(cleaned)) return
        cleanTags.push(cleaned)
      })
    }
  }

  const atcoderTitleForYaml = meta?.atcoderTitle
  const htojLabel = meta?.htojLabel
  let yamlRawTitle
  if (atcoderTitleForYaml) {
    const bracketMatch = atcoderTitleForYaml.match(/^(\[[^\]]+\])/)
    const prefix = bracketMatch ? bracketMatch[1] : ''
    const titlePart = finalTitle || atcoderTitleForYaml.replace(/^\[[^\]]+\]\s*/, '')
    yamlRawTitle = prefix ? `${prefix} ${titlePart}` : titlePart
  } else if (htojLabel) {
    yamlRawTitle = `${htojLabel} ${finalTitle}`
  } else {
    yamlRawTitle = finalTitle
  }
  yamlRawTitle = normalizeProblemTitle(yamlRawTitle, finalTitle)
  const yamlTitle = /[\[\]:{}&*!|>'"%@`]/.test(yamlRawTitle) ? `"${yamlRawTitle.replace(/"/g, '\\"')}"` : yamlRawTitle
  let yaml = `title: ${yamlTitle}\n`
  yaml += 'tag:\n'
  cleanTags.forEach(tag => { yaml += `  - ${tag}\n` })
  return yaml
}
