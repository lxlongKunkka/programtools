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
<button @click="showHistory = !showHistory" class="btn-secondary">📋 历史{{ history.length ? ` (${history.length})` : '' }}</button>
<button @click="clear" class="btn-secondary">🧹 清空</button>
</div>
</div>

<!-- 历史记录面板 -->
<div v-if="showHistory" class="history-panel">
  <div class="history-header"><span>最近翻译记录（点击恢复）</span><button @click="clearHistory" class="btn-clear-history">🗑 清空</button></div>
  <div v-if="!history.length" class="history-empty">暂无历史记录</div>
  <div v-for="item in history" :key="item.id" class="history-item" @click="restoreHistory(item)">
    <div class="history-meta">
      <span class="history-title">{{ item.title || '无标题' }}</span>
      <span class="history-time">{{ formatTime(item.ts) }}</span>
    </div>
    <div class="history-preview">{{ item.prompt.slice(0, 80) }}{{ item.prompt.length > 80 ? '...' : '' }}</div>
  </div>
</div>

<!-- URL 抓取栏 -->
<div class="url-bar">
  <span class="url-label">🔗</span>
  <input v-model="urlInput" class="url-input" placeholder="支持 Codeforces / AtCoder 题目链接，自动抓取题面" @keydown.enter="fetchUrl" :disabled="urlLoading" />
  <button @click="fetchUrl" :disabled="!urlInput.trim() || urlLoading" class="btn-fetch">
    {{ urlLoading ? '⏳' : '抓取' }}
  </button>
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
          <div class="result-area streaming-area" v-else-if="loading">
            <div class="streaming-indicator">
              <div class="dot-pulse"></div>
              <span>AI 正在生成... 已收到 {{ streamCharsCount }} 字</span>
            </div>
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
          <div class="result-area streaming-area" v-else-if="loading">
            <div class="streaming-indicator">
              <div class="dot-pulse"></div>
              <span>等待生成...</span>
            </div>
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
streamCharsCount: 0,
model: 'gemini-2.5-flash',
rawModelOptions: [],
urlInput: '',
urlLoading: false,
showHistory: false,
history: []
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
    this.history = JSON.parse(localStorage.getItem('translate_history') || '[]')

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
this.streamCharsCount = 0
try {
  const token = localStorage.getItem('auth_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch('/api/translate/stream', {
    method: 'POST', headers,
    body: JSON.stringify({ text: this.prompt, model: this.model })
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (!d || d === '[DONE]') continue
      try {
        const ev = JSON.parse(d)
        if (ev.type === 'chunk') {
          this.streamCharsCount += ev.text.length
        } else if (ev.type === 'result') {
          this.result = ev.result
          this.englishResult = ev.english || ''
          this.saveState()
          this.saveHistory({ prompt: this.prompt, result: ev.result, englishResult: ev.english || '', title: ev.meta?.title || '' })
        } else if (ev.type === 'error') {
          throw new Error(ev.message)
        }
      } catch (pe) {
        if (pe.message && !pe.message.includes('JSON') && !pe.message.includes('Unexpected')) throw pe
      }
    }
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
this.urlInput = ''
},
async fetchUrl() {
if (!this.urlInput.trim()) return
this.urlLoading = true
try {
const data = await request(`/api/translate/fetch-url?url=${encodeURIComponent(this.urlInput.trim())}`)
if (data.text) {
this.prompt = data.text
this.showToastMessage('✅ 题面抓取成功，可以开始翻译')
this.urlInput = ''
} else if (data.error) {
this.showToastMessage('抓取失败: ' + data.error)
}
} catch (e) {
this.showToastMessage('抓取失败: ' + e.message)
} finally {
this.urlLoading = false
}
},
saveHistory({ prompt, result, englishResult, title }) {
const item = { id: Date.now(), ts: Date.now(), prompt, result, englishResult, title }
this.history = [item, ...this.history.filter(h => h.prompt !== prompt)].slice(0, 10)
localStorage.setItem('translate_history', JSON.stringify(this.history))
},
restoreHistory(item) {
this.prompt = item.prompt
this.result = item.result
this.englishResult = item.englishResult || ''
this.showHistory = false
this.showToastMessage('已恢复历史记录')
},
clearHistory() {
this.history = []
localStorage.removeItem('translate_history')
},
formatTime(ts) {
const d = new Date(ts)
return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
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
  height: calc(100vh - 52px);
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  box-sizing: border-box;
  background-color: #f5f7fa;
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

/* URL bar */
.url-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  align-items: center;
}
.url-input {
  flex: 1;
  padding: 7px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.url-input:focus {
  border-color: #667eea;
}
.btn-fetch {
  padding: 7px 14px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-fetch:hover:not(:disabled) {
  background: #5a6fd6;
}
.btn-fetch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* History panel */
.history-panel {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #f5f6fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}
.btn-clear-history {
  font-size: 12px;
  padding: 3px 8px;
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #888;
}
.btn-clear-history:hover {
  background: #fee;
  border-color: #f88;
  color: #c00;
}
.history-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.history-item:last-child { border-bottom: none; }
.history-item:hover { background: #f0f4ff; }
.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.history-title {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
}
.history-time {
  font-size: 11px;
  color: #aaa;
}
.history-preview {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Streaming indicator */
.streaming-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #667eea;
  font-size: 13px;
}
.dot-pulse {
  display: flex;
  gap: 4px;
  align-items: center;
}
.dot-pulse span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #667eea;
  display: inline-block;
  animation: pulse 1.2s infinite ease-in-out;
}
.dot-pulse span:nth-child(2) { animation-delay: .2s; }
.dot-pulse span:nth-child(3) { animation-delay: .4s; }
@keyframes pulse {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
