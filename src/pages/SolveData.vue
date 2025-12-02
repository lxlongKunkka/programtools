<template>
  <div class="solve-data-container">
    <div class="top-bar">
      <h2>Solve + Data 生成器</h2>
      <div class="model-selector">
        <label for="model-select">模型:</label>
        <select id="model-select" v-model="selectedModel">
          <option value="o4-mini">o4-mini</option>
          <option value="o4">o4</option>
          <option value="claude-3.7-sonnet">claude-3.7-sonnet</option>
          <option value="gemini-2.0-flash">gemini-2.0-flash</option>
          <option value="gemini-2.0-pro">gemini-2.0-pro</option>
        </select>
      </div>
    </div>
    
    <div class="main-layout">
      <!-- 左侧输入区域 -->
      <div class="input-panel">
        <div class="panel-header">
          <h3>题目描述</h3>
          <div class="header-controls">
            <div class="lang-selector">
              <label>代码语言:</label>
              <select v-model="language">
                <option value="C++">C++</option>
                <option value="Python">Python</option>
                <option value="Java">Java</option>
              </select>
            </div>
            <div class="mode-selector">
              <label>
                <input type="checkbox" v-model="manualCodeMode" @change="onModeChange">
                手动输入代码
              </label>
            </div>
          </div>
        </div>
        
        <!-- 手动代码输入模式 -->
        <div v-if="manualCodeMode" class="manual-code-section">
          <div class="code-input-header">
            <span>📝 AC 代码（标准程序）</span>
            <button @click="clearManualCode" class="btn-small-clear">清空代码</button>
          </div>
          <textarea 
            v-model="manualCode" 
            placeholder="请输入你的 AC 代码..."
            class="manual-code-input"
          ></textarea>
          <div class="code-input-header" style="border-top: 2px solid #dee2e6;">
            <span>📄 题目描述（用于生成数据脚本）</span>
          </div>
          <textarea 
            v-model="problemText" 
            placeholder="请输入题目描述，包括输入格式、输出格式、数据范围等..."
            class="problem-input-small"
          ></textarea>
        </div>
        
        <!-- 原有的题目描述输入 -->
        <textarea 
          v-show="!manualCodeMode"
          v-model="problemText" 
          placeholder="请输入完整的题目描述，包括题意、输入格式、输出格式、数据范围等..."
          class="problem-input"
        ></textarea>
        
        <div class="button-group">
          <button 
            v-if="!manualCodeMode"
            @click="generateCode" 
            :disabled="isGenerating" 
            class="btn-primary"
          >
            {{ isGenerating === 'code' ? '生成中...' : '🚀 生成解题代码' }}
          </button>
          <button @click="generateData" :disabled="isGenerating" class="btn-secondary">
            {{ isGenerating === 'data' ? '生成中...' : '📊 生成数据脚本' }}
          </button>
          <button 
            @click="runAndDownload" 
            :disabled="isGenerating || !(manualCodeMode ? manualCode : codeOutput) || !dataOutput" 
            class="btn-success"
            :title="manualCodeMode ? '使用你的代码生成项目包' : '使用AI生成的代码生成项目包'"
          >
            {{ isGenerating === 'run' ? '打包中...' : '📦 下载完整项目包' }}
          </button>
          <button @click="clearAll" class="btn-clear">🗑️ 清空</button>
        </div>
      </div>

      <!-- 右侧输出区域 -->
      <div class="output-panel">
        <!-- 代码输出标签页 -->
        <div class="tabs">
          <div 
            :class="['tab', { active: activeTab === 'code' }]" 
            @click="activeTab = 'code'"
          >
            解题代码
          </div>
          <div 
            :class="['tab', { active: activeTab === 'data' }]" 
            @click="activeTab = 'data'"
          >
            数据脚本
          </div>
        </div>

        <!-- 代码输出内容 -->
        <div v-show="activeTab === 'code'" class="output-content">
          <div v-if="manualCodeMode ? manualCode : codeOutput" class="output-wrapper">
            <div class="output-actions">
              <button @click="copyCode" class="btn-small">📋 复制结果</button>
              <button @click="saveCode" class="btn-small">💾 保存代码</button>
            </div>
            <div class="rendered-output" v-html="renderedCode"></div>
          </div>
          <div v-else class="empty-state">
            <p>👈 {{ manualCodeMode ? '请在左侧输入代码' : '点击"生成解题代码"按钮开始生成' }}</p>
          </div>
        </div>

        <!-- 数据脚本输出内容 -->
        <div v-show="activeTab === 'data'" class="output-content">
          <div v-if="dataOutput" class="output-wrapper">
            <div class="output-actions">
              <button @click="copyData" class="btn-small">📋 复制结果</button>
              <button @click="saveData" class="btn-small">💾 保存脚本</button>
            </div>
            <div class="rendered-output" v-html="renderedData"></div>
          </div>
          <div v-else class="empty-state">
            <p>👈 点击"生成数据脚本"按钮开始生成</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import katex from 'katex'

export default {
  name: 'SolveData',
  data() {
    return {
      problemText: '',
      codeOutput: '',
      dataOutput: '',
      selectedModel: 'o4-mini',
      language: 'C++',
      isGenerating: false,
      activeTab: 'code',
      manualCodeMode: false,
      manualCode: ''
    }
  },
  computed: {
    renderedCode() {
      if (this.manualCodeMode && this.manualCode) {
        return `<pre><code>${this.escapeHtml(this.manualCode)}</code></pre>`
      }
      return this.renderMarkdown(this.codeOutput)
    },
    renderedData() {
      return this.renderMarkdown(this.dataOutput)
    }
  },
  methods: {
    escapeHtml(text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    },
    
    onModeChange() {
      if (this.manualCodeMode) {
        this.activeTab = 'code'
      }
    },
    
    clearManualCode() {
      this.manualCode = ''
    },
    
    renderMarkdown(text) {
      if (!text) return ''
      
      // 先保护代码块，避免其中的 $ 被当作数学公式
      const codeBlocks = []
      let tempText = text.replace(/```[\s\S]*?```/g, (match) => {
        codeBlocks.push(match)
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`
      })
      
      // 处理行内数学公式 $...$
      tempText = tempText.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula, { throwOnError: false })
        } catch (e) {
          return match
        }
      })
      
      // 处理块级数学公式 $$...$$
      tempText = tempText.replace(/\$\$([^\$]+?)\$\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula, { displayMode: true, throwOnError: false })
        } catch (e) {
          return match
        }
      })
      
      // 恢复代码块
      codeBlocks.forEach((block, index) => {
        tempText = tempText.replace(`__CODE_BLOCK_${index}__`, block)
      })
      
      // 转换 Markdown
      const rawHtml = marked.parse(tempText)
      return DOMPurify.sanitize(rawHtml)
    },
    
    async generateCode() {
      if (!this.problemText.trim()) {
        alert('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'code'
      this.codeOutput = ''
      this.activeTab = 'code'
      
      try {
        const response = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: this.problemText,
            model: this.selectedModel,
            language: this.language
          })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          this.codeOutput = data.result
        } else {
          alert('生成失败: ' + (data.error || '未知错误'))
        }
      } catch (error) {
        console.error('Generate code error:', error)
        alert('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateData() {
      const textForData = this.manualCodeMode 
        ? (this.problemText || '请根据代码逻辑生成测试数据') 
        : this.problemText
        
      if (!textForData.trim()) {
        alert('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'data'
      this.dataOutput = ''
      this.activeTab = 'data'
      
      try {
        const response = await fetch('/api/generate-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textForData,
            model: this.selectedModel
          })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          this.dataOutput = data.result
        } else {
          alert('生成失败: ' + (data.error || '未知错误'))
        }
      } catch (error) {
        console.error('Generate data error:', error)
        alert('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    copyCode() {
      const textToCopy = this.manualCodeMode ? this.manualCode : this.codeOutput
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('已复制到剪贴板')
      })
    },
    
    copyData() {
      navigator.clipboard.writeText(this.dataOutput).then(() => {
        alert('已复制到剪贴板')
      })
    },
    
    saveCode() {
      const extension = this.language === 'C++' ? 'cpp' : this.language === 'Python' ? 'py' : 'java'
      const contentToSave = this.manualCodeMode ? this.manualCode : this.codeOutput
      const blob = new Blob([contentToSave], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solution.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    },
    
    saveData() {
      const blob = new Blob([this.dataOutput], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'data_generator.py'
      a.click()
      URL.revokeObjectURL(url)
    },
    
    clearAll() {
      this.problemText = ''
      this.codeOutput = ''
      this.dataOutput = ''
      this.manualCode = ''
      this.manualCodeMode = false
    },
    
    async runAndDownload() {
      const hasCode = this.manualCodeMode ? this.manualCode : this.codeOutput
      
      if (!hasCode || !this.dataOutput) {
        alert(this.manualCodeMode 
          ? '请先输入代码并生成数据脚本' 
          : '请先生成代码和数据脚本')
        return
      }
      
      this.isGenerating = 'run'
      
      try {
        let stdCode = ''
        let dataScript = ''
        
        console.log('=== 开始提取代码 ===')
        console.log('dataOutput 长度:', this.dataOutput.length)
        console.log('dataOutput 前200字符:', this.dataOutput.substring(0, 200))
        
        if (this.manualCodeMode) {
          stdCode = this.manualCode.trim()
        } else {
          const codePatterns = [
            /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/i,
            /```cpp([\s\S]*?)```/i,
            /```c\+\+([\s\S]*?)```/i,
            /```(?:python|py)\s*\n([\s\S]*?)```/i,
            /```python([\s\S]*?)```/i,
            /```py([\s\S]*?)```/i,
            /```java\s*\n([\s\S]*?)```/i,
            /```java([\s\S]*?)```/i,
            /```\s*\n([\s\S]*?)```/
          ]
          
          for (const pattern of codePatterns) {
            const match = this.codeOutput.match(pattern)
            if (match && match[1]) {
              stdCode = match[1].trim()
              stdCode = stdCode.replace(/^(?:c\+\+|cpp|python|py|java)\s+/i, '')
              break
            }
          }
        }
        
        const scriptPatterns = [
          /```python\s*\n([\s\S]*?)```/i,
          /```python([\s\S]*?)```/i,
          /```py\s*\n([\s\S]*?)```/i,
          /```py([\s\S]*?)```/i,
          /```\s*\n([\s\S]*?)```/
        ]
        
        for (const pattern of scriptPatterns) {
          const match = this.dataOutput.match(pattern)
          if (match && match[1]) {
            dataScript = match[1].trim()
            console.log('匹配到脚本，长度:', dataScript.length)
            console.log('脚本前100字符:', dataScript.substring(0, 100))
            // 移除可能残留的 "python " 标识符
            dataScript = dataScript.replace(/^(?:python|py)\s+/i, '')
            // 移除 shebang 行
            dataScript = dataScript.replace(/^#!\/usr\/bin\/env python[0-9]?\s*\n/, '')
            console.log('清理后脚本前100字符:', dataScript.substring(0, 100))
            break
          }
        }
        
        console.log('提取完成，脚本长度:', dataScript.length)
        
        // 额外清理：如果提取的脚本中包含 Markdown 说明文本，尝试智能清理
        // 检查是否在代码中间出现了 Markdown 格式（通常在注释外）
        if (dataScript) {
          // 如果在字符串或注释外发现 Markdown 标记，说明可能混入了文档
          const lines = dataScript.split('\n')
          let cleanedLines = []
          let inString = false
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const trimmed = line.trim()
            
            // 检测是否是明显的 Markdown 内容（不在注释或字符串中）
            if (!trimmed.startsWith('#') && 
                !trimmed.startsWith('"""') && 
                !trimmed.startsWith("'''")) {
              // 如果发现独立的 Markdown 标题或说明（## 或 **说明：**），停止收集
              if (/^##\s+/.test(trimmed) || /^\*\*说明[：:]\*\*/.test(trimmed)) {
                break
              }
            }
            
            cleanedLines.push(line)
          }
          
          dataScript = cleanedLines.join('\n').trim()
        }
        
        if (!stdCode || !dataScript) {
          let errorMsg = '无法提取代码或脚本：\n'
          if (!stdCode) errorMsg += this.manualCodeMode 
            ? '- 请输入有效的代码\n' 
            : '- 未找到有效的 AC 代码块\n'
          if (!dataScript) errorMsg += '- 未找到有效的 Python 脚本块\n'
          alert(errorMsg)
          return
        }
        
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        
        const extension = this.language === 'C++' ? 'cpp' : this.language === 'Python' ? 'py' : 'java'
        const stdFileName = this.language === 'Java' ? 'Main.java' : `std.${extension}`
        zip.file(stdFileName, stdCode)
        
        let modifiedScript = dataScript
          .replace(/file_prefix\s*=\s*['"].*?['"]/g, `file_prefix='./testdata/data'`)
        
        if (this.language === 'C++') {
          modifiedScript = modifiedScript.replace(
            /output_gen\s*\(\s*['"].*?['"]\s*\)/g,
            `output_gen('std.exe')`
          )
        } else if (this.language === 'Python') {
          modifiedScript = modifiedScript.replace(
            /output_gen\s*\(\s*['"].*?['"]\s*\)/g,
            `output_gen('python std.py')`
          )
        } else if (this.language === 'Java') {
          modifiedScript = modifiedScript.replace(
            /output_gen\s*\(\s*['"].*?['"]\s*\)/g,
            `output_gen('java Main')`
          )
        }
        
        console.log('=== 修改后的脚本 ===')
        console.log(modifiedScript)
        console.log('脚本总长度:', modifiedScript.length)
        console.log('脚本行数:', modifiedScript.split('\n').length)
        
        zip.file('data_generator.py', modifiedScript)
        
        const readme = this.generateReadme()
        zip.file('README.md', readme)
        
        // 生成 Python 运行脚本（跨平台）
        const runScript = this.generateRunScript()
        zip.file('run.py', runScript)
        
        const blob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'test_data_project.zip'
        a.click()
        URL.revokeObjectURL(url)
        
        alert('✅ 项目包已下载！\n\n解压后运行命令: python run.py')
        
      } catch (error) {
        console.error('Package error:', error)
        alert('❌ 打包失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    generateRunScript() {
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
    
    ${this.language === 'C++' ? `
    if not os.path.exists('std.cpp'):
        print("[X] 错误: 找不到 std.cpp 文件！")
        sys.exit(1)
    
    exe_name = 'std.exe' if is_windows else 'std'
    compile_cmd = f"g++ std.cpp -o {exe_name} -std=c++17 -O2"
    
    print(f"正在编译: {compile_cmd}")
    if not run_command(compile_cmd):
        print("\\n[X] 编译失败！请检查代码是否有语法错误\\n")
        sys.exit(1)
    print(f"[√] 编译成功: {exe_name}\\n")
    ` : this.language === 'Python' ? `
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
        sys.exit(1)
`
      return script
    },
    
    generateReadme() {
      const langInfo = this.language === 'C++' 
        ? { file: 'std.cpp', compiler: 'g++', compile: 'g++ std.cpp -o std -std=c++17 -O2' }
        : this.language === 'Python'
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

- **${langInfo.compiler}**: ${this.language === 'C++' ? '编译标准程序 (推荐 TDM-GCC 或 MinGW)' : this.language === 'Python' ? '运行标准程序' : '编译 Java 程序'}
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
  }
}
</script>

<style scoped>
.solve-data-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.top-bar h2 {
  margin: 0;
  color: #667eea;
  font-size: 24px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-selector label {
  font-weight: bold;
  color: #333;
}

.model-selector select {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.main-layout {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

.input-panel, .output-panel {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
}

.header-controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

.lang-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-selector label {
  font-size: 14px;
}

.lang-selector select {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.mode-selector {
  display: flex;
  align-items: center;
}

.mode-selector label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.mode-selector input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.manual-code-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e9ecef;
}

.code-input-header {
  padding: 10px 20px;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
}

.code-input-header span {
  font-weight: bold;
  color: #495057;
}

.btn-small-clear {
  padding: 4px 10px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  color: #6c757d;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small-clear:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.manual-code-input {
  flex: 1;
  padding: 15px 20px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  background: #f8f9fa;
}

.problem-input-small {
  height: 120px;
  padding: 15px 20px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  background: #fff;
  border-top: 1px solid #e9ecef;
}

.problem-input {
  flex: 1;
  padding: 20px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
}

.button-group {
  padding: 15px 20px;
  background: #f8f9fa;
  display: flex;
  gap: 10px;
  border-top: 1px solid #e9ecef;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
}

.btn-clear {
  background: #6c757d;
  color: white;
  margin-left: auto;
}

.btn-clear:hover {
  background: #5a6268;
}

.tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
}

.tab {
  flex: 1;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  font-weight: bold;
  color: #6c757d;
  transition: all 0.3s;
}

.tab.active {
  background: white;
  color: #667eea;
  border-bottom: 3px solid #667eea;
}

.tab:hover {
  background: rgba(102, 126, 234, 0.1);
}

.output-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.output-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.output-actions {
  padding: 10px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  gap: 10px;
}

.btn-small {
  padding: 6px 12px;
  background: white;
  border: 1px solid #dee2e6;
  color: #495057;
  font-size: 13px;
}

.btn-small:hover {
  background: #e9ecef;
}

.rendered-output {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #adb5bd;
  font-size: 16px;
}

.rendered-output :deep(h2) {
  color: #667eea;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
  margin-top: 24px;
  margin-bottom: 16px;
}

.rendered-output :deep(h3) {
  color: #495057;
  margin-top: 20px;
  margin-bottom: 12px;
}

.rendered-output :deep(p) {
  line-height: 1.8;
  margin-bottom: 12px;
}

.rendered-output :deep(pre) {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 16px 0;
}

.rendered-output :deep(code) {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.rendered-output :deep(pre code) {
  background: none;
  padding: 0;
}

.rendered-output :deep(ul), .rendered-output :deep(ol) {
  margin-left: 20px;
  line-height: 1.8;
}
</style>
