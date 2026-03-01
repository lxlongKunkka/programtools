<template>
<div class="translate-root">
<h2>AI 智能翻译助手</h2>

<div class="toolbar">
<div class="toolbar-left">
<label class="label">模型:</label>
<select v-model="model">
<option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
</select>
</div>
<div class="toolbar-right">
<button @click="translate" :disabled="loading || !prompt.trim()" class="btn-primary">
{{ loading ? '⏳ 翻译中...' : '🌐 开始翻译' }}
</button>
<button @click="clear" class="btn-secondary">🧹 清空</button>
</div>
</div>

    <div class="content-area" ref="contentArea">
      <!-- 输入栏 -->
      <div class="input-panel" :style="{ width: leftWidth + '%' }">
        <div class="panel-header">
          <h3>输入原文</h3>
          <span class="hint">支持各种语言的题目或文本</span>
        </div>
        <div class="input-group">
          <div class="input-section">
            <textarea 
              v-model="prompt" 
              placeholder="在此输入需要翻译的题面或文本...&#10;&#10;示例：&#10;You are given an array of integers..."
              :disabled="loading"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="resizer" @mousedown="startResize"></div>

      <!-- 右侧两栏 -->
      <div class="output-columns">
        <!-- 中文栏 -->
        <div class="output-panel">
          <div class="panel-header">
            <div class="header-left">
              <h3>🇨🇳 中文翻译</h3>
            </div>
            <div class="header-right">
              <div class="header-tabs">
                <button :class="['tab-btn', { active: activeTabZh === 'preview' }]" @click="activeTabZh = 'preview'">预览</button>
                <button :class="['tab-btn', { active: activeTabZh === 'raw' }]" @click="activeTabZh = 'raw'">源码</button>
              </div>
              <button @click="copyText(result)" :disabled="!result" class="btn-icon" title="复制">📋</button>
              <button @click="saveText(result, 'zh')" :disabled="!result" class="btn-icon" title="保存">💾</button>
            </div>
          </div>
          <div class="result-area" v-if="result">
            <MarkdownViewer v-if="activeTabZh === 'preview'" :content="result" />
            <textarea v-else class="raw-output" readonly :value="result"></textarea>
          </div>
          <div class="result-area empty" v-else>
            <p>🇨🇳 中文翻译结果</p>
            <p class="tip">点击"开始翻译"后显示</p>
          </div>
        </div>

        <div class="col-resizer"></div>

        <!-- 英文栏 -->
        <div class="output-panel">
          <div class="panel-header">
            <div class="header-left">
              <h3>🇺🇸 英文题面</h3>
            </div>
            <div class="header-right">
              <div class="header-tabs">
                <button :class="['tab-btn', { active: activeTabEn === 'preview' }]" @click="activeTabEn = 'preview'">预览</button>
                <button :class="['tab-btn', { active: activeTabEn === 'raw' }]" @click="activeTabEn = 'raw'">源码</button>
              </div>
              <button @click="copyText(englishResult)" :disabled="!englishResult" class="btn-icon" title="复制">📋</button>
              <button @click="saveText(englishResult, 'en')" :disabled="!englishResult" class="btn-icon" title="保存">💾</button>
            </div>
          </div>
          <div class="result-area" v-if="englishResult">
            <MarkdownViewer v-if="activeTabEn === 'preview'" :content="englishResult" />
            <textarea v-else class="raw-output" readonly :value="englishResult"></textarea>
          </div>
          <div class="result-area empty" v-else>
            <p>🇺🇸 英文题面结果</p>
            <p class="tip">点击"开始翻译"后显示</p>
          </div>
        </div>
      </div>
    </div>
</div>
</template>

<script>
import request from '../utils/request'
import { getModels } from '../utils/models'
import MarkdownViewer from '../components/MarkdownViewer.vue'

export default {
  components: { MarkdownViewer },
  inject: ['showToastMessage'],
data() {
return {
      leftWidth: 40,
      isDragging: false,
      activeTabZh: 'preview',
      activeTabEn: 'preview',
prompt: '',
result: '',
englishResult: '',
loading: false,
model: 'gemini-2.5-flash',
rawModelOptions: []
}
},
computed: {
    user() {
      try {
        return JSON.parse(localStorage.getItem('user_info'))
      } catch (e) { return null }
    },
    isPremium() {
      return this.user && (this.user.role === 'admin' || this.user.role === 'premium' || this.user.role === 'teacher' || this.user.priv === -1)
    },
    modelOptions() {
      const all = this.rawModelOptions || []
      if (this.isPremium) return all
      return all.filter(m => m.id === 'gemini-2.5-flash')
    },
},
watch: {
    prompt(val) { this.saveState() },
    result(val) { this.saveState() },
    englishResult(val) { this.saveState() },
    model(val) { this.saveState() }
},
async mounted() {
try {
    // Restore state
    const saved = localStorage.getItem('translate_storage')
    if (saved) {
        const data = JSON.parse(saved)
        if (data.prompt) this.prompt = data.prompt
        if (data.result) this.result = data.result
        if (data.englishResult) this.englishResult = data.englishResult
        if (data.model) this.model = data.model
    }

const list = await getModels()
if (Array.isArray(list)) this.rawModelOptions = list
      
      if (this.modelOptions.length > 0) {
        // If saved model is not in list (and not premium), fallback
        const current = this.modelOptions.find(m => m.id === this.model)
        if (!current) {
          this.model = this.modelOptions[0].id
        }
      }
} catch (e) {
console.warn('failed to load models', e)
}
},
methods: {
    saveState() {
        localStorage.setItem('translate_storage', JSON.stringify({
            prompt: this.prompt,
            result: this.result,
            englishResult: this.englishResult,
            model: this.model
        }))
    },
    startResize() {
      this.isDragging = true
      document.addEventListener('mousemove', this.onMouseMove)
      document.addEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    },
    onMouseMove(e) {
      if (!this.isDragging) return
      const container = this.$refs.contentArea
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
      document.body.style.cursor = ''
    },
async translate() {
if (!this.prompt.trim()) return

this.loading = true
this.result = ''
this.englishResult = ''

try {
const data = await request('/api/translate', {
method: 'POST',
body: JSON.stringify({
text: this.prompt,
model: this.model
})
})

let finalResult = data.result || data.rawText || ''

// 尝试解析可能存在的 JSON 格式（兜底后端解析失败的情况）
try {
    let jsonStr = finalResult.trim()
    // 1. 尝试提取 Markdown 代码块中的 JSON
    const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/i)
    if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1].trim()
    }
    
    // 2. 尝试寻找最外层的 {}
    const firstBrace = jsonStr.indexOf('{')
    const lastBrace = jsonStr.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = jsonStr.substring(firstBrace, lastBrace + 1)
            
            try {
                const jsonObj = JSON.parse(potentialJson)
                if (jsonObj.translation) {
                    finalResult = jsonObj.translation
                }
            } catch (parseErr) {
                // JSON.parse 失败，尝试使用正则提取 translation 字段
                // 匹配 "translation": "..." 结构，支持转义字符
                // 使用 [\s\S]*? 非贪婪匹配直到遇到引号后跟逗号或大括号
                const regex = /"translation"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*})/
                const match = potentialJson.match(regex)
                if (match) {
                    try {
                        // 尝试用 JSON.parse 解码字符串值
                        finalResult = JSON.parse(`"${match[1]}"`)
                    } catch (e) {
                        // 如果解码失败，手动处理常见的转义符
                        finalResult = match[1]
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\')
                            .replace(/\\t/g, '\t')
                    }
                }
            }
    }
} catch (e) {
    // ignore
}

this.result = finalResult

// 提取英文题面
if (data.meta && data.meta.english) {
  this.englishResult = data.meta.english
} else {
  this.englishResult = ''
}

} catch (e) {
console.error('Translate error:', e)
this.showToastMessage(`翻译失败: ${e.message}`)
} finally {
this.loading = false
}
},
clear() {
this.prompt = ''
this.result = ''
this.englishResult = ''
},
copyText(content) {
if (!content) return
navigator.clipboard.writeText(content)
.then(() => this.showToastMessage('✅ 已复制到剪贴板'))
.catch(err => this.showToastMessage('复制失败: ' + err.message))
},
saveText(content, lang) {
if (!content) return
const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `translation_${lang}_${Date.now()}.md`
a.click()
URL.revokeObjectURL(url)
this.showToastMessage('已下载文件')
}
}
}
</script>

<style scoped>
.translate-root {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  font-weight: 600;
  color: #34495e;
  font-size: 14px;
}

select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  color: #2c3e50;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 150px;
}

select:focus {
  border-color: #3498db;
  outline: none;
}

.toolbar-right {
  display: flex;
  gap: 12px;
}

button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 14px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background-color: #3498db;
  color: white;
  box-shadow: 0 2px 5px rgba(52, 152, 219, 0.2);
}

.btn-primary:hover {
  background-color: #2980b9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background-color: #ecf0f1;
  color: #7f8c8d;
}

.btn-secondary:hover {
  background-color: #bdc3c7;
  color: #2c3e50;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.content-area {
  flex: 1;
  display: flex;
  gap: 0;
  min-height: 0;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid #eee;
  overflow: hidden;
}

.output-columns {
  flex: 1;
  display: flex;
  min-width: 0;
  overflow: hidden;
}

.col-resizer {
  width: 5px;
  background-color: #f0f0f0;
  cursor: col-resize;
  transition: background-color 0.2s;
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  flex-shrink: 0;
  z-index: 10;
}

.col-resizer:hover, .col-resizer:active {
  background-color: #3498db;
}

.input-panel {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #fff;
  min-width: 200px;
}

.resizer {
  width: 6px;
  background-color: #f0f0f0;
  cursor: col-resize;
  transition: background-color 0.2s;
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  z-index: 10;
}

.resizer:hover, .resizer:active {
  background-color: #3498db;
}

.output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #fff;
  min-width: 200px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  padding: 4px 8px;
  font-size: 14px;
  background: #f0f2f5;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s;
  line-height: 1;
}

.btn-icon:hover:not(:disabled) {
  background: #dde1e7;
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header-tabs {
  display: flex;
  gap: 4px;
  background: #f0f2f5;
  padding: 3px;
  border-radius: 6px;
}

.tab-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  background: transparent;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  background: white;
  color: #3498db;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.hint {
  font-size: 12px;
  color: #95a5a6;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 0;
}

.input-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  min-height: 0;
  transition: border-color 0.2s;
  background-color: #fcfcfc;
}

textarea:focus {
  outline: none;
  border-color: #3498db;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.raw-output {
  width: 100%;
  height: 100%;
  border: none;
  background: #f8f9fa;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.35;
  color: #333;
  resize: none;
  padding: 0;
}

.raw-output:focus {
  box-shadow: none;
  background: #f8f9fa;
}

.result-area {
  flex: 1;
  padding: 20px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow-y: auto;
  min-height: 0;
}

.result-area.empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #95a5a6;
  background-color: #f9f9f9;
  border: 2px dashed #eee;
}

.result-area.empty p {
  margin: 8px 0;
  font-size: 16px;
  font-weight: 500;
}

.result-area.empty .tip {
  font-size: 13px;
  color: #bdc3c7;
}

/* Markdown Styles */
.result-area :deep(h2) {
  margin-top: 24px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
  color: #2c3e50;
  font-size: 20px;
}

.result-area :deep(h3) {
  margin-top: 20px;
  margin-bottom: 12px;
  color: #e67e22;
  font-weight: 600;
  font-size: 18px;
}

.result-area :deep(h4) {
  margin-top: 16px;
  margin-bottom: 10px;
  color: #f39c12;
  font-size: 16px;
}

.result-area :deep(p) {
  margin: 12px 0;
  line-height: 1.8;
  color: #34495e;
  font-size: 15px;
}

.result-area :deep(strong) {
  color: #e67e22;
  font-weight: 600;
}

.result-area :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #eee;
  border-left: 4px solid #3498db;
}

.result-area :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  background: #f0f7ff;
  padding: 2px 6px;
  border-radius: 3px;
  color: #2980b9;
}

.result-area :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.result-area :deep(ul), .result-area :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
  color: #34495e;
}

.result-area :deep(li) {
  margin: 6px 0;
  line-height: 1.6;
}

.result-area :deep(blockquote) {
  border-left: 4px solid #f1c40f;
  margin: 16px 0;
  color: #7f8c8d;
  background: #fef9e7;
  padding: 12px 16px;
  border-radius: 4px;
}

@media (max-width: 1200px) {
  .translate-root {
    height: auto;
    min-height: 100vh;
  }
  .content-area {
    flex-direction: column;
    height: auto;
  }
  .input-panel {
    width: 100% !important;
    height: 300px;
  }
  .output-columns {
    flex-direction: column;
  }
  .output-panel {
    width: 100% !important;
    height: 500px;
  }
  .resizer, .col-resizer {
    display: none;
  }
}
</style>
