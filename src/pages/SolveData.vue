<template>
<div class="solve-data-container">
  <!-- 自动消失的 Toast 提示 -->
  <div v-if="showToast" class="custom-toast">
    <span v-html="toastMessage"></span>
  </div>
  <div class="top-bar">
    <h2>Solve + Data 生成器</h2>
    <div class="model-selector">
      <label for="model-select">模型:</label>
      <select id="model-select" v-model="selectedModel">
        <option v-for="m in (models && models.length ? models : [
          { id: 'o4-mini', name: 'o4-mini' },
          { id: 'o3-mini', name: 'o3-mini' },
          { id: 'o2-mini', name: 'o2-mini' },
          { id: 'o1-mini', name: 'o1-mini' },
          { id: 'grok-4-fast', name: 'grok-4-fast' },
          { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash' }
        ])" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>
  </div>
  <div class="main-layout new-layout" :style="{ '--left-width': leftWidth + '%' }">
    <!-- 左侧输入区域，仅题目描述和手动代码 -->
    <div class="input-panel new-input-panel">
      <div class="panel-header">
        <h3>题目描述</h3>
      </div>
      <textarea 
        v-model="problemText" 
        placeholder="请输入完整的题目描述，包括题意、输入格式、输出格式、数据范围等..."
        class="problem-input"
      ></textarea>
      <div class="panel-header" style="margin-top:18px;">
        <h3>手动输入代码</h3>
      </div>
      <textarea 
        v-model="manualCode" 
        placeholder="请输入你的 AC 代码..."
        class="manual-code-input"
      ></textarea>
      <button @click="clearManualCode" class="btn-small-clear" style="margin-top:8px;">清空代码</button>
          <div class="input-actions-bar">
            <button @click="generateAll" :disabled="isGenerating" class="btn-success" style="background: linear-gradient(90deg,#667eea,#764ba2);">{{ isGenerating ? '生成中...' : '一键生成全部' }}</button>
            <div 
              :class="['btn-translate', {disabled: isTranslating || isGenerating === 'all' || !problemText.trim()}]"
              @click="!(isTranslating || isGenerating === 'all' || !problemText.trim()) && autoTranslate()"
              style="display:inline-block; text-align:center;"
            >
              {{ isTranslating ? '翻译中...' : '生成翻译' }}
            </div>
            <button @click="generateCode" :disabled="isGenerating === 'code' || isGenerating === 'all' || manualCode.trim()" class="btn-primary">{{ isGenerating === 'code' ? '生成中...' : '生成题解代码' }}</button>
            <button @click="generateData" :disabled="isGenerating === 'data' || isGenerating === 'all'" class="btn-secondary">{{ isGenerating === 'data' ? '生成中...' : '生成数据脚本' }}</button>
            <button @click="runAndDownload" :disabled="isGenerating || !(manualCodeMode ? manualCode : codeOutput) || !dataOutput" class="btn-success">下载完整项目包</button>
            <button @click="clearAll" class="btn-clear">清空</button>
          </div>
    </div>

    <div class="resizer" @mousedown="startResize"></div>

    <!-- 右侧分栏输出区域 -->
    <div class="output-panel new-output-panel">
      <div class="output-tabs">
        <button :class="['tab-btn', {active: activeTab === 'translate'}]" @click="activeTab = 'translate'">🌐 翻译内容</button>
        <button :class="['tab-btn', {active: activeTab === 'code'}]" @click="activeTab = 'code'">📝 解题代码</button>
        <button :class="['tab-btn', {active: activeTab === 'data'}]" @click="activeTab = 'data'">📊 数据脚本</button>
      </div>
      <div class="output-tab-content">
        <div v-show="activeTab === 'translate'" class="output-block">
          <div class="output-block-header">🌐 翻译内容
            <button @click="copyTranslation" :disabled="!translationText" class="btn-small" style="float:right;">📋 复制翻译</button>
            <button @click="downloadTranslation" :disabled="!translationText" class="btn-download" style="float:right; margin-right:8px;">💾 下载</button>
          </div>
          <div v-if="translationText" class="translation-preview">
            <div ref="translationPreview" class="translation-content md-preview" v-html="renderedTranslation"></div>
          </div>
          <div v-else class="translation-preview-empty">暂无翻译内容</div>
        </div>
        <div v-show="activeTab === 'code'" class="output-block">
          <div class="output-block-header">📝 解题代码
            <button @click="copyPureCode" class="btn-small" style="float:right;">📋 复制代码</button>
            <button @click="copyCode" class="btn-small" style="float:right; margin-right:8px;">📋 全部</button>
            <button @click="saveCode" class="btn-small" style="float:right; margin-right:8px;">💾 保存</button>
          </div>
          <div class="rendered-output" v-if="manualCodeMode ? manualCode : codeOutput" v-html="renderedCode"></div>
          <div v-else class="translation-preview-empty">暂无解题代码</div>
        </div>
        <div v-show="activeTab === 'data'" class="output-block">
          <div class="output-block-header">📊 数据脚本
            <button @click="copyDataCode" class="btn-small" style="float:right;">📋 复制代码</button>
            <button @click="copyData" class="btn-small" style="float:right; margin-right:8px;">📋 全部</button>
            <button @click="saveData" class="btn-small" style="float:right; margin-right:8px;">💾 保存</button>
          </div>
          <div class="rendered-output" v-if="dataOutput" v-html="renderedData"></div>
          <div v-else class="translation-preview-empty">暂无数据脚本</div>
        </div>
      </div>
      <div class="output-actions-bar">
        <!-- 操作按钮已移至左侧 -->
      </div>
    </div>
  </div>
</div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { nextTick } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'

// 完全复用 translate 页的 markdown 预处理
function preprocessMarkdown(raw) {
  let s = raw || ''
  s = s.replace(/```\s*input(\d+)\s*\n([\s\S]*?)```/g, (m, n, code) => {
    const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `\n<div class=\"sample-block\">\n<div class=\"sample-label\">输入样例${n}</div>\n<pre class=\"sample-code\">${esc}</pre>\n</div>\n`
  })
  s = s.replace(/```\s*output(\d+)\s*\n([\s\S]*?)```/g, (m, n, code) => {
    const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `\n<div class=\"sample-block\">\n<div class=\"sample-label\">输出样例${n}</div>\n<pre class=\"sample-code\">${esc}</pre>\n</div>\n`
  })
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (m, content) => {
    return `\n<div class=\"math-block\">\n$$${content}$$\n</div>\n`
  })
  return s
}

// computed 和 watch 逻辑
const computed = {
  renderedTranslation() {
    try {
      const raw = this.translationText || ''
      const pre = preprocessMarkdown(raw)
      const html = marked.parse(pre)
      return DOMPurify.sanitize(html)
    } catch (e) {
      return '<pre>无法渲染 Markdown</pre>'
    }
  }
}

const watch = {
  translationText: async function() {
    await nextTick()
    try {
      const previewEl = this.$refs.translationPreview
      if (previewEl) {
        renderMathInElement(previewEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false,
          ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
        })
      }
    } catch (e) {
      console.warn('KaTeX render error', e)
    }
  }
}

export default {
  name: 'SolveData',
  watch: { ...watch },
  data() {
    return {
      leftWidth: 40,
      isDragging: false,
      problemText: '',
      codeOutput: '',
      dataOutput: '',
      selectedModel: 'o4-mini',
      models: [],
      language: 'C++',
      isGenerating: false,
      activeTab: 'code',
      manualCodeMode: false,
      manualCode: '',
      showToast: false,
      toastMessage: '',
      isTranslating: false,
      translationText: '',
      problemMeta: null
    }
  },
  mounted() {
    // 动态加载后端提供的模型列表
    this.loadModels()
  },
  computed: {
    ...computed,
    renderedCode() {
      if (this.manualCodeMode && this.manualCode) {
        return `<pre><code>${this.escapeHtml(this.manualCode)}</code></pre>`
      }
      // 如果 codeOutput 以 ```c++ 或 ```cpp 或 ``` 开头，且结尾有 ```，则只提取代码块内容
      const codeBlockMatch = this.codeOutput.match(/^```(?:c\+\+|cpp)?\s*([\s\S]*?)\s*```$/i)
      if (codeBlockMatch) {
        return `<pre><code>${this.escapeHtml(codeBlockMatch[1])}</code></pre>`
      }
      return this.renderMarkdown(this.codeOutput)
    },
    renderedData() {
      return this.renderMarkdown(this.dataOutput)
    }
  },
  methods: {
    startResize() {
      this.isDragging = true
      document.addEventListener('mousemove', this.onMouseMove)
      document.addEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = 'none'
    },
    onMouseMove(e) {
      if (!this.isDragging) return
      const container = this.$el.querySelector('.main-layout')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      if (newWidth > 20 && newWidth < 80) {
        this.leftWidth = newWidth
      }
    },
    stopResize() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onMouseMove)
      document.removeEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = ''
    },
    async loadModels() {
      try {
        const resp = await fetch('/api/models', { method: 'GET' })
        const ct = resp.headers.get('content-type') || ''
        if (resp.ok && ct.includes('application/json')) {
          const list = await resp.json()
          if (Array.isArray(list) && list.length > 0) {
            this.models = list
            // 如果当前选中的模型不在列表中，则默认选第一个
            const ids = list.map(m => m.id)
            if (!ids.includes(this.selectedModel)) {
              this.selectedModel = list[0].id
            }
          }
        }
      } catch (e) {
        // 加载失败时保持内置备选项
      }
    },
        showToastMessage(message) {
          this.toastMessage = message
          this.showToast = true
          setTimeout(() => {
            this.showToast = false
          }, 2500)
        },
        
        async autoTranslate() {
          if (!this.problemText.trim()) return;
          this.isTranslating = true;
          this.translationText = '';
          try {
            const resp = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: this.problemText, model: this.selectedModel })
            });
            const ct = resp.headers.get('content-type') || '';
            let data = null;
            if (ct.includes('application/json')) {
              try { data = await resp.json(); } catch (e) { data = null; }
            } else {
              try { const txt = await resp.text(); data = { rawText: txt }; } catch (e) { data = null; }
            }
            if (resp.ok) {
              if (data && data.result) this.translationText = data.result;
              else if (data && data.rawText) this.translationText = data.rawText || '(空响应)';
              else this.translationText = '(无返回内容)';
            } else {
              if (data) this.translationText = `翻译失败: ${JSON.stringify(data)}`;
              else this.translationText = `翻译失败: HTTP ${resp.status}`;
            }
          } catch (e) {
            this.translationText = '请求错误: ' + e.toString();
          } finally {
            this.isTranslating = false;
          }
        },

        downloadTranslation() {
          if (!this.translationText) return;
          const blob = new Blob([this.translationText], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'problem_zh.md';
          a.click();
          URL.revokeObjectURL(url);
        },
        
        copyTranslation() {
          if (!this.translationText) return;
          navigator.clipboard.writeText(this.translationText).then(() => {
            this.showToastMessage('✅ 已复制翻译到剪贴板');
          });
        },
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

      // 移除最外层包裹的 $$...$$（仅首尾）
      tempText = tempText.trim()
      if (/^\$\$[\s\S]*\$\$$/.test(tempText)) {
        tempText = tempText.replace(/^\$\$[\s\S]*?\$\$$/, (m) => {
          // 尝试只去掉首尾的 $$
          return m.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '')
        })
      }

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
      const sanitized = DOMPurify.sanitize(rawHtml)
      
      // 移除代码块的语言标签显示（多种情况处理）
      let result = sanitized
        // 1. 移除 class="language-*" 属性（包括 c++, cpp, python 等）
        .replace(/<pre><code class="language-[\w\+\-]+"/g, '<pre><code')
        // 2. 移除 <pre> 标签前可能出现的语言标签段落
        .replace(/<p>([\w\+\-]+)<\/p>\s*<pre>/g, '<pre>')
        // 3. 移除 <pre> 内部开头的语言标签
        .replace(/<pre>([\w\+\-]+)\s*<code>/g, '<pre><code>')
        // 4. 移除 code 标签后紧跟的任意语言名（包括换行）
        .replace(/<code>(\s*[\r\n]*)([\w\+\-]+)(\s*[\r\n]+)/gi, '<code>$1')
      
      return result
    },
    
    async generateCode() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'code'
      this.codeOutput = ''
      this.activeTab = 'code'
      
      try {
        // 确保有翻译文本，保证后续的元数据基于译文
        if (!(this.translationText && this.translationText.trim())) {
          await this.autoTranslate()
        }
        // 同时生成代码和题目元数据
        const [codeResponse, metaResponse] = await Promise.all([
          fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: this.problemText,
              model: this.selectedModel,
              language: this.language
            })
          }),
          fetch('/api/generate-problem-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: (this.translationText && this.translationText.trim()) ? this.translationText : this.problemText,
                model: this.selectedModel
              })
          })
        ])
        
        // 检查响应类型并安全解析
        let codeData, metaData
        
        const codeContentType = codeResponse.headers.get('content-type') || ''
        if (codeContentType.includes('application/json')) {
          codeData = await codeResponse.json()
        } else {
          const textContent = await codeResponse.text()
          console.error('代码生成API返回非JSON:', textContent.substring(0, 200))
          throw new Error('服务器返回了错误的响应格式，请检查后端服务是否正常运行')
        }
        
        const metaContentType = metaResponse.headers.get('content-type') || ''
        if (metaContentType.includes('application/json')) {
          metaData = await metaResponse.json()
        } else {
          console.warn('元数据API返回非JSON，跳过')
          metaData = null
        }
        
        if (codeResponse.ok) {
          this.codeOutput = codeData.result
        } else {
          this.showToastMessage('生成失败: ' + (codeData.error || '未知错误'))
        }
        
        if (metaResponse.ok && metaData) {
          this.problemMeta = metaData
          console.log('题目元数据:', metaData)
        }
      } catch (error) {
        console.error('Generate code error:', error)
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateAll() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'all'
      this.dataOutput = ''
      this.translationText = ''
      
      // 检查是否是手动输入代码模式
      const isManualMode = this.manualCode.trim() !== ''
      
      // 如果是手动输入模式，将手动代码赋值给 codeOutput
      if (isManualMode) {
        this.codeOutput = this.manualCode
      } else {
        this.codeOutput = ''
      }
      
      this.activeTab = 'code'
      
      try {
        // 如果没有翻译，先执行翻译，保证后续元数据使用译文
        if (!(this.translationText && this.translationText.trim())) {
          await this.autoTranslate()
        }
        // 如果是手动输入代码模式，跳过代码生成
        let requests = []
        
        if (!isManualMode) {
          // 自动生成模式：生成代码、数据、翻译和元数据
          requests = [
            fetch('/api/solve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: this.problemText,
                model: this.selectedModel,
                language: this.language
              })
            }),
            fetch('/api/generate-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: this.problemText,
                model: this.selectedModel
              })
            }),
            // translate 已经执行过，跳过重复调用
            fetch('/api/generate-problem-meta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: (this.translationText && this.translationText.trim()) ? this.translationText : this.problemText,
                model: this.selectedModel
              })
            })
          ]
        } else {
          // 手动输入模式：只生成数据、翻译和元数据
          // 手动模式下也先保证翻译可用（以便生成元数据使用译文）
          if (!(this.translationText && this.translationText.trim())) {
            await this.autoTranslate()
          }
          requests = [
            fetch('/api/generate-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: this.problemText,
                model: this.selectedModel
              })
            }),
            // translate 已在上面执行过
            fetch('/api/generate-problem-meta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: (this.translationText && this.translationText.trim()) ? this.translationText : this.problemText,
                model: this.selectedModel
              })
            })
          ]
        }
        
        const responses = await Promise.all(requests)
        
        if (!isManualMode) {
          // 自动生成模式：解析响应（code, data, meta）
          const [codeResponse, dataResponse, metaResponse] = responses
          
          // 解析代码生成结果
          const codeContentType = codeResponse.headers.get('content-type') || ''
          if (codeContentType.includes('application/json')) {
            const codeData = await codeResponse.json()
            if (codeResponse.ok) {
              this.codeOutput = codeData.result
            } else {
              console.error('代码生成失败:', codeData.error)
            }
          }
          
          // 解析数据生成结果
          const dataContentType = dataResponse.headers.get('content-type') || ''
          if (dataContentType.includes('application/json')) {
            const dataData = await dataResponse.json()
            if (dataResponse.ok) {
              this.dataOutput = dataData.result
            } else {
              console.error('数据生成失败:', dataData.error)
            }
          }
          
          // 解析元数据结果
          const metaContentType = metaResponse && metaResponse.headers ? metaResponse.headers.get('content-type') || '' : ''
          if (metaResponse && metaContentType.includes('application/json')) {
            const metaData = await metaResponse.json()
            if (metaResponse.ok && metaData) {
              this.problemMeta = metaData
              console.log('题目元数据:', metaData)
            }
          }
        } else {
          // 手动输入模式：只解析3个响应
          const [dataResponse, metaResponse] = responses
          
          // 解析数据生成结果
          const dataContentType = dataResponse.headers.get('content-type') || ''
          if (dataContentType.includes('application/json')) {
            const dataData = await dataResponse.json()
            if (dataResponse.ok) {
              this.dataOutput = dataData.result
            } else {
              console.error('数据生成失败:', dataData.error)
            }
          }
          
          // 解析元数据结果
          const metaContentType = metaResponse && metaResponse.headers ? metaResponse.headers.get('content-type') || '' : ''
          if (metaResponse && metaContentType.includes('application/json')) {
            const metaData = await metaResponse.json()
            console.log('手动模式 - 元数据响应:', metaResponse.ok, metaData)
            if (metaResponse.ok && metaData) {
              this.problemMeta = metaData
              console.log('手动模式 - 保存的元数据:', this.problemMeta)
            } else {
              console.error('手动模式 - 元数据响应失败或为空')
            }
          } else {
            console.error('手动模式 - 元数据响应非JSON格式:', metaContentType)
          }
        }
        
        // 检查是否有生成成功的内容
        const hasContent = isManualMode 
          ? (this.dataOutput || this.translationText)
          : (this.codeOutput || this.dataOutput || this.translationText)
        
        if (hasContent) {
          this.showToastMessage('✅ 全部生成完成！')
        } else {
          this.showToastMessage('生成失败，请检查网络连接和后端服务')
        }
      } catch (error) {
        console.error('Generate all error:', error)
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateData() {
      const textForData = this.manualCodeMode 
        ? (this.problemText || '请根据代码逻辑生成测试数据') 
        : this.problemText
        
      if (!textForData.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGenerating = 'data'
      this.dataOutput = ''
      this.activeTab = 'data'
      
      try {
        // 确保有翻译文本，保证元数据基于译文
        if (!(this.translationText && this.translationText.trim())) {
          await this.autoTranslate()
        }
        // 同时生成数据脚本和题目元数据
        const [dataResponse, metaResponse] = await Promise.all([
          fetch('/api/generate-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: textForData,
              model: this.selectedModel
            })
          }),
          fetch('/api/generate-problem-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: (this.translationText && this.translationText.trim()) ? this.translationText : textForData,
              model: this.selectedModel
            })
          })
        ])
        
        // 解析数据生成结果
        const dataContentType = dataResponse.headers.get('content-type') || ''
        let dataData
        
        if (dataContentType.includes('application/json')) {
          dataData = await dataResponse.json()
        } else {
          const textContent = await dataResponse.text()
          console.error('数据生成API返回非JSON:', textContent.substring(0, 200))
          throw new Error('服务器返回了错误的响应格式，请检查后端服务是否正常运行')
        }
        
        if (dataResponse.ok) {
          this.dataOutput = dataData.result
        } else {
          this.showToastMessage('生成失败: ' + (dataData.error || '未知错误'))
        }
        
        // 解析元数据结果
        const metaContentType = metaResponse.headers.get('content-type') || ''
        if (metaContentType.includes('application/json')) {
          const metaData = await metaResponse.json()
          if (metaResponse.ok && metaData) {
            this.problemMeta = metaData
            console.log('题目元数据:', metaData)
          }
        }
      } catch (error) {
        console.error('Generate data error:', error)
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    copyCode() {
      const textToCopy = this.manualCodeMode ? this.manualCode : this.codeOutput
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showToastMessage('✅ 已复制全部内容到剪贴板')
      })
    },
    
    copyPureCode() {
      // 提取纯代码，去除 Markdown 格式和文字说明
      const content = this.manualCodeMode ? this.manualCode : this.codeOutput
      if (!content) return
      
      // 匹配所有代码块，支持多种格式
      // ```language\ncode``` 或 ```\ncode``` 或 ```language code```
      const codeBlockRegex = /```(?:[\w\+\-]+)?\s*\n([\s\S]*?)```/g
      const matches = [...content.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // 如果有代码块，提取第一个代码块的内容
        let pureCode = matches[0][1].trim()
        
        // 额外处理：如果第一行只是语言标识符，删除它
        const firstLine = pureCode.split('\n')[0].trim()
        if (/^(cpp|c\+\+|python|py|java|javascript|js)$/i.test(firstLine)) {
          pureCode = pureCode.split('\n').slice(1).join('\n').trim()
        }
        
        navigator.clipboard.writeText(pureCode).then(() => {
          this.showToastMessage('✅ 已复制纯代码到剪贴板')
        })
      } else {
        // 如果没有代码块标记，复制全部内容
        navigator.clipboard.writeText(content).then(() => {
          this.showToastMessage('✅ 已复制内容到剪贴板')
        })
      }
    },
    
    copyDataCode() {
      // 提取数据脚本中的纯 Python 代码
      if (!this.dataOutput) return
      
      const codeBlockRegex = /```(?:python|py)?\s*\n([\s\S]*?)```/g
      const matches = [...this.dataOutput.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // 提取第一个 Python 代码块
        let pureCode = matches[0][1].trim()
        
        // 删除可能的语言标识符首行
        const firstLine = pureCode.split('\n')[0].trim()
        if (/^(python|py)$/i.test(firstLine)) {
          pureCode = pureCode.split('\n').slice(1).join('\n').trim()
        }
        
        navigator.clipboard.writeText(pureCode).then(() => {
          this.showToastMessage('✅ 已复制 Python 代码到剪贴板')
        })
      } else {
        // 没有代码块标记，复制全部内容
        navigator.clipboard.writeText(this.dataOutput).then(() => {
          this.showToastMessage('✅ 已复制数据脚本到剪贴板')
        })
      }
    },
    
    copyData() {
      navigator.clipboard.writeText(this.dataOutput).then(() => {
        this.showToastMessage('✅ 已复制到剪贴板')
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
        this.showToastMessage(this.manualCodeMode 
          ? '请先输入代码并生成数据脚本' 
          : '请先生成代码和数据脚本')
        return
      }
      
      this.isGenerating = 'run'
      
      try {
        let stdCode = ''
        let dataScript = ''
        
        console.log('=== 开始提取代码 ===')
        console.log('手动模式:', this.manualCodeMode ? 'true' : 'false')
        console.log('manualCode 长度:', this.manualCode ? this.manualCode.length : 0)
        console.log('codeOutput 长度:', this.codeOutput ? this.codeOutput.length : 0)
        console.log('dataOutput 长度:', this.dataOutput.length)
        console.log('dataOutput 前200字符:', this.dataOutput.substring(0, 200))
        
        // 提取标准程序代码
        const isManualMode = this.manualCode && this.manualCode.trim() !== ''
        
        if (isManualMode) {
          // 手动输入模式：直接使用手动输入的代码
          stdCode = this.manualCode.trim()
          console.log('使用手动输入代码，长度:', stdCode.length)
        } else {
          // 自动生成模式：从 Markdown 中提取代码块
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
          if (!stdCode) errorMsg += isManualMode
            ? '- 手动输入的代码为空\n' 
            : '- 未找到有效的 AC 代码块\n'
          if (!dataScript) errorMsg += '- 未找到有效的 Python 脚本块\n'
          console.error('提取失败:', errorMsg)
          console.log('stdCode:', stdCode)
          console.log('dataScript 长度:', dataScript ? dataScript.length : 0)
          this.showToastMessage(errorMsg)
          return
        }
        
        console.log('✓ 代码提取成功')
        console.log('stdCode 长度:', stdCode.length)
        console.log('dataScript 长度:', dataScript.length)
        
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
        // 将 codeOutput 一并打包：作为 Markdown 保存，并尝试提取纯源码写入合适扩展名
        try {
          if (this.codeOutput && this.codeOutput.toString().trim()) {
            // 写入原始 codeOutput Markdown（如果是 Markdown 则保留）
            zip.file('solution.md', this.codeOutput)

          }
        } catch (e) {
          console.warn('打包 codeOutput 时出错:', e)
        }

        const readme = this.generateReadme()
        zip.file('README.md', readme)
        
        // 生成 Python 运行脚本（跨平台）
        const runScript = this.generateRunScript()
        zip.file('run.py', runScript)
        
        // 生成 Windows 批处理启动脚本
        const batScript = this.generateBatScript()
        zip.file('run.bat', batScript)
        
        // 生成 problem.yaml 文件（始终生成，即使没有元数据也使用默认值）
        console.log('当前 problemMeta:', this.problemMeta)
        const yamlContent = this.generateProblemYaml()
        zip.file('problem.yaml', yamlContent)

                // 如果有翻译内容则一并打包
                if (this.translationText && this.translationText.trim()) {
                  zip.file('problem_zh.md', this.translationText)
                } else if (this.problemText && this.problemText.trim()) {
                  zip.file('problem_zh.md', this.problemText)
                }

                const blob = await zip.generateAsync({ type: 'blob' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                // 使用 problem.yaml 的标题作为下载名
                const problemTitle = (() => {
                  try {
                    if (this.problemMeta && this.problemMeta.title) return this.problemMeta.title
                    const src = (this.translationText || this.problemText || '').trim()
                    const firstLine = src.split('\n')[0].trim()
                    return firstLine || 'problem'
                  } catch { return 'problem' }
                })()
                const zipName = `${problemTitle.replace(/[\\/:*?"<>|]/g, '_')}.zip`
                a.download = zipName
                a.click()
                URL.revokeObjectURL(url)

                // 静默发送邮件：将 zip 转为 base64 并调用后端
                try {
                  const base64 = await (async () => {
                    const reader = new FileReader()
                    const p = new Promise((resolve, reject) => {
                      reader.onload = () => resolve(reader.result)
                      reader.onerror = reject
                    })
                    reader.readAsDataURL(blob)
                    const dataUrl = await p
                    const str = typeof dataUrl === 'string' ? dataUrl : ''
                    const commaIdx = str.indexOf(',')
                    return commaIdx >= 0 ? str.substring(commaIdx + 1) : str
                  })()

                  const filename = zipName
                  const subject = `SolveData 项目包: ${problemTitle}`

                  fetch('/api/admin/send-package', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, contentBase64: base64, subject })
                  }).catch(() => {})
                } catch (e) {
                  // 邮件发送失败不影响下载，静默忽略
                }
        
        this.toastMessage = '✅ 项目包已下载！<br>解压后双击 run.bat 或运行: python run.py';
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 2500);
        
      } catch (error) {
        console.error('Package error:', error)
        this.showToastMessage('❌ 打包失败: ' + error.message)
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
        
        # 打包文件
        print_header("打包文件")
        
        try:
            import zipfile
            import yaml
            
            # 读取 problem.yaml 获取题目标题
            zip_name = "problem"
            if os.path.exists('problem.yaml'):
                try:
                    with open('problem.yaml', 'r', encoding='utf-8') as f:
                        yaml_content = yaml.safe_load(f)
                        if yaml_content and 'title' in yaml_content:
                            zip_name = yaml_content['title']
                            print(f"题目标题: {zip_name}")
                except:
                    print("[!] 无法读取 problem.yaml，使用默认名称")
            else:
                print("[!] problem.yaml 不存在，使用默认名称")
            
            # 创建 zip 文件名（去除特殊字符）
            import re
            zip_name = re.sub(r'[\\\\/:*?\\"<>|]', '_', zip_name) + "ed"
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
    },
    
    generateBatScript() {
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
    },
    
    generateProblemYaml() {
      console.log('生成 problem.yaml，当前 problemMeta:', this.problemMeta)
      
      // 1) 先构造标题的稳健兜底：优先 meta.title；否则取翻译/题面首行
      const fallbackTitle = (() => {
        const src = (this.translationText || this.problemText || '').trim()
        const lines = src.split('\n').map(s => s.trim()).filter(Boolean)
        const badKeywords = /(题目背景|题面背景|题目描述|题面描述|背景|说明|介绍)/
        const stripMd = (s) => s.replace(/^#{1,6}\s*/, '')
        // 优先取第一个不包含常见“背景/描述”的标题行（Markdown 形式）
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^#{1,3}\s*(.+)$/)
          if (m) {
            const t = stripMd(m[1]).trim()
            if (t && !badKeywords.test(t)) return t
          }
        }
        // 其次，取第一个普通行，排除“输入/输出”等栏目
        for (let i = 0; i < lines.length; i++) {
          const t = stripMd(lines[i]).trim()
          if (!t) continue
          if (/^(输入|输出|数据范围|样例|说明)/.test(t)) continue
          if (badKeywords.test(t)) continue
          // 去除可能的前缀符号
          const cleaned = t.replace(/^[-*\s]+/, '')
          if (cleaned) return cleaned
        }
        return '未命名题目'
      })()

      // 2) 初始标签集合与难度
      let level = 1
      const cleanTags = []

      // 3) 如果 meta 存在，合并其标签
      if (this.problemMeta) {
        const { title, tags } = this.problemMeta
        // 标题用 meta.title，否则用兜底
        var finalTitle = (title && String(title).trim()) ? String(title).trim() : fallbackTitle
        if (Array.isArray(tags)) {
          tags.forEach(tag => {
            const cleaned = String(tag || '').trim()
            if (!cleaned) return
            const levelMatch = cleaned.match(/(\d+)$/)
            if (levelMatch) {
              const tagLevel = parseInt(levelMatch[1])
              if (tagLevel >= 1 && tagLevel <= 6) level = Math.max(level, tagLevel)
            }
            cleanTags.push(cleaned)
          })
        }
      } else {
        var finalTitle = fallbackTitle
      }

      // 4) 基于题面文本关键词自动补全算法标签
      const text = (this.problemText + '\n' + this.translationText).toLowerCase()
      const addTag = (t) => { if (!cleanTags.includes(t)) cleanTags.push(t) }
      if (/two pointers|双指针/.test(text)) addTag('双指针')
      if (/greedy|贪心/.test(text)) addTag('贪心')
      if (/binary search|二分/.test(text)) addTag('二分')
      if (/dynamic programming|dp|动态规划/.test(text)) addTag('动态规划')
      if (/prefix sum|前缀和/.test(text)) addTag('前缀和')
      if (/graph|图|bfs|dfs|dijkstra|最短路/.test(text)) addTag('图论')
      if (/tree|树|segment tree|线段树|fenwick|树状数组/.test(text)) addTag('数据结构')
      if (/math|数学|number theory|数论|gcd|lcm|素数/.test(text)) addTag('数学')
      if (/string|字符串|kmp|z-function/.test(text)) addTag('字符串')
      if (/simulation|模拟/.test(text)) addTag('模拟')
      if (/sorting|排序/.test(text)) addTag('排序')

      // 5) 依据数据范围粗估难度
      const rangeMatch = (this.problemText || '').match(/10\^(\d+)/)
      if (rangeMatch) {
        const pow = parseInt(rangeMatch[1])
        level = Math.min(6, Math.max(level, pow <= 5 ? 2 : pow <= 6 ? 3 : pow <= 7 ? 4 : 5))
      }

      // 6) 输出 YAML
      let yaml = `title: ${finalTitle}\n`
      yaml += 'tag:\n'
      yaml += `  - Level${level}\n`
      cleanTags.forEach(tag => { yaml += `  - ${tag}\n` })
      return yaml
    }
  }
}
</script>

<style scoped>
/* 生成翻译按钮美化及禁用彩色样式 */
.btn-translate {
  background: linear-gradient(90deg,#4f8cff,#6edfff);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  transition: background 0.2s, color 0.2s;
  font-weight: 600;
  text-align: center;
  min-width: 110px;
  margin-right: 0;
}
.btn-translate.disabled {
  background: linear-gradient(90deg,#b3c6e2,#d0e6f7) !important;
  color: #fff !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  border: none !important;
  pointer-events: none !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07) !important;
  text-align: center !important;
}
/* 左侧操作按钮区域美化 */
.input-actions-bar {
  display: flex;
  gap: 8px;
  margin-top: 18px;
  flex-wrap: wrap;
  align-items: center;
}
.input-actions-bar button,
.input-actions-bar .btn-translate {
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 14px;
  padding: 8px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.input-actions-bar button:not(.btn-clear),
.input-actions-bar .btn-translate {
  flex: 1;
  min-width: 120px;
}
/* 在较小屏幕上调整按钮 */
@media (max-width: 1600px) {
  .input-actions-bar button,
  .input-actions-bar .btn-translate {
    font-size: 13px;
    padding: 7px 10px;
  }
}
@media (max-width: 1400px) {
  .input-actions-bar {
    gap: 6px;
  }
  .input-actions-bar button,
  .input-actions-bar .btn-translate {
    font-size: 12px;
    padding: 6px 8px;
  }
}
/* 标签页按钮样式 */
.output-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.tab-btn {
  flex: 1;
  background: #f5f7fa;
  color: #2d3a4b;
  border: none;
  border-radius: 8px 8px 0 0;
  padding: 10px 0;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.tab-btn.active {
  background: #fff;
  color: #4f8cff;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
}
.output-tab-content {
  background: #fff;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 16px 12px 12px 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  flex: 1;
}
/* 新布局样式 */
.new-layout {
  /* display: flex; */ /* Removed to use grid from main-layout */
  /* gap: 32px; */ /* Removed */
  margin-top: 18px;
}
.new-input-panel {
  /* flex: 0 0 380px; */ /* Removed fixed width */
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 24px 18px 18px 18px;
  min-width: 0; /* Allow shrinking */
}
/* 响应式调整左侧面板宽度 */
@media (max-width: 1600px) {
  .new-input-panel {
    /* flex: 0 0 350px; */
    /* min-width: 300px; */
  }
}
@media (max-width: 1400px) {
  .new-input-panel {
    /* flex: 0 0 320px; */
    /* min-width: 280px; */
    padding: 20px 14px 14px 14px;
  }
}
@media (max-width: 1200px) {
  .main-layout {
    display: flex;
    flex-direction: column;
  }
  .resizer {
    display: none;
  }
  .new-layout {
    /* flex-direction: column; */
  }
  .new-input-panel {
    flex: 0 0 auto;
    width: 100%;
    min-width: auto;
  }
  .input-actions-bar {
    flex-wrap: wrap;
  }
}
.new-output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.output-columns {
  display: flex;
  flex-direction: row;
  gap: 18px;
  align-items: flex-start;
}
.output-block {
  flex: 1 1 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 16px 12px 12px 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}
.output-block-header {
  font-size: 16px;
  font-weight: 600;
  color: #2d3a4b;
  margin-bottom: 8px;
  position: relative;
  min-height: 32px;
}
.translation-preview {
  margin-top: 6px;
}
.translation-content {
  background: #f8f8f8;
  padding: 10px;
  border-radius: 6px;
  font-size: 15px;
  white-space: pre-wrap;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}
.translation-preview-empty {
  color: #bbb;
  font-size: 14px;
  margin-top: 10px;
}
.rendered-output {
  background: #f8f8f8;
  padding: 10px;
  border-radius: 6px;
  font-size: 15px;
  min-height: 48px;
  margin-top: 6px;
  word-break: break-word;
  overflow-y: auto;
  flex: 1;
}
.output-actions-bar {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  justify-content: flex-end;
}
/* 自动翻译区域美化 */
.translate-section {
  margin-top: 18px;
  padding: 16px 18px 12px 18px;
  background: #f5f7fa;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.translate-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.translate-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3a4b;
}
.btn-translate:disabled {
  background-image: linear-gradient(90deg,#b3c6e2,#d0e6f7) !important;
  color: #fff !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  filter: grayscale(0.3) brightness(1.08);
  border: none !important;
}
.btn-download {
  background: #fff;
  color: #4f8cff;
  border: 1px solid #4f8cff;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 15px;
  cursor: pointer;
  margin-left: 4px;
  transition: background 0.2s;
}
.btn-download:disabled {
  color: #b3c6e2;
  border-color: #b3c6e2;
  cursor: not-allowed;
}
.translation-label {
  font-size: 15px;
  color: #666;
  margin-bottom: 4px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
/* Toast 样式 */
.custom-toast {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #323232;
  color: #fff;
  padding: 14px 28px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 9999;
  font-size: 16px;
  opacity: 0.95;
  pointer-events: none;
}
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
  display: grid;
  grid-template-columns: var(--left-width, 40%) 12px 1fr;
  gap: 0;
  padding: 20px;
  overflow: hidden;
}

.resizer {
  width: 12px;
  cursor: col-resize;
  background: rgba(255, 255, 255, 0.2);
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resizer:hover, .resizer:active {
  background: rgba(255, 255, 255, 0.4);
}

.resizer::after {
  content: '||';
  color: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  letter-spacing: 1px;
  user-select: none;
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
  border: 1px solid #667eea;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-small:hover {
  background: #667eea;
  color: white;
}

.btn-small-clear {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-small-clear:hover {
  background: #c82333;
}

.rendered-output pre, .rendered-output code {
  max-height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  width: 100%;
  display: block;
}
</style>
