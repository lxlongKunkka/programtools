<template>
<div class="translate-root">
<h2>AI 智能翻译助手</h2>

<div class="toolbar-container">
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
</div><!-- end toolbar-container -->

<!-- URL 抓取栏 -->
<div class="url-bar">
  <span class="url-label">🔗</span>
  <input v-model="urlInput" class="url-input" placeholder="支持 AtCoder / Codeforces 题目链接，自动抓取格式化题面" @keydown.enter="fetchUrl" :disabled="urlLoading" />
  <button @click="fetchUrl" :disabled="!urlInput.trim() || urlLoading" class="btn-fetch">
    {{ urlLoading ? '⏳' : '抓取' }}
  </button>
</div>

<!-- ── Task info bar ─────────────────────────────────────────── -->
<div class="task-info-bar">
  <span class="task-count-label">共 {{ tasks.length }} 个任务</span>
  <div class="task-bulk-right">
    <button class="btn-primary btn-sm" @click="runBatch" :disabled="isBatchRunning || loading">
      {{ isBatchRunning ? '⏳ 翻译中...' : '🚀 批量翻译' }}
    </button>
    <button class="btn-secondary btn-sm" @click="downloadBatch" :disabled="isBatchRunning || !hasCompletedTasks">
      📦 批量下载
    </button>
  </div>
</div>

<!-- ── Main layout ───────────────────────────────────────────── -->
<div class="main-layout">
  <!-- Task list panel (220px) -->
  <div class="task-list-panel">
    <div class="task-list-header">
      <span>任务列表</span>
      <div style="display:flex;gap:4px">
        <button @click="addNewTask" class="btn-icon" title="添加新任务">➕</button>
        <button @click="clearAllTasks" class="btn-icon" title="清空" style="color:#ef4444">🗑️</button>
      </div>
    </div>
    <div class="task-list">
      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        :class="['task-item', { active: currentTaskIndex === index }]"
        @click="switchTask(index)"
      >
        <div class="task-status-dot" :class="task.status"></div>
        <div class="task-info-col">
          <div class="task-title">{{ getTaskTitle(task) }}</div>
          <div class="task-meta">{{ getTaskStatusText(task) }}</div>
        </div>
      </div>
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
</div><!-- /main-layout -->
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
history: [],
// 批量模式
isBatchRunning: false,
currentTaskIndex: 0,
tasks: [
  { id: Date.now(), status: 'pending', taskTitle: '', taskUrl: '', prompt: '', result: '', englishResult: '' }
]
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
    hasCompletedTasks() {
      return this.tasks.some(t => t.status === 'completed')
    }
},
watch: {
    prompt(val) { this.updateCurrentTask('prompt', val); this.saveState() },
    result(val) { this.updateCurrentTask('result', val); this.saveState() },
    englishResult(val) { this.updateCurrentTask('englishResult', val); this.saveState() },
    model(val) { this.saveState() },
    tasks: {
      handler(val) { localStorage.setItem('translate_tasks', JSON.stringify(val)) },
      deep: true
    }
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

    // Restore tasks
    try {
      const savedTasks = localStorage.getItem('translate_tasks')
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tasks = parsed
          this.loadTask(0)
        }
      }
    } catch (e) { console.error('Failed to load tasks', e) }

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
async translate(skipHistory = false) {
if (!this.prompt.trim()) return false
this.loading = true
this.result = ''
this.englishResult = ''
this.streamCharsCount = 0
let success = false
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
          if (!skipHistory) {
            this.saveHistory({ prompt: this.prompt, result: ev.result, englishResult: ev.english || '', title: ev.meta?.title || '' })
          }
          success = true
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
return success
},
clear() {
this.prompt = ''
this.result = ''
this.englishResult = ''
this.urlInput = ''
},
isContestUrl(url) {
  if (/atcoder\.jp\/contests\/[^/]+\/?$/.test(url)) return true
  if (/codeforces\.com\/contest(s)?\/\d+\/?$/.test(url)) return true
  if (/codeforces\.com\/gym\/\d+\/?$/.test(url)) return true
  return false
},

// 单题抓取 + 入任务列表（与 SolveData.addProblemAsTask 相同模式）
async addTranslationTask(url, fallbackTitle) {
  const data = await request(`/api/atcoder/problem?url=${encodeURIComponent(url)}`)
  const title = data.title || fallbackTitle || url
  const content = data.content || ''
  // 第一个任务且为空，直接填充而不新增
  const cur = this.tasks[this.currentTaskIndex]
  if (this.tasks.length === 1 && cur && !cur.prompt.trim()) {
    this.tasks[this.currentTaskIndex] = {
      ...cur,
      status: 'pending',
      taskTitle: title,
      taskUrl: url,
      prompt: content,
      result: '',
      englishResult: ''
    }
    this.loadTask(this.currentTaskIndex)
    return
  }
  const newTask = {
    id: Date.now() + Math.random(),
    status: 'pending',
    taskTitle: title,
    taskUrl: url,
    prompt: content,
    result: '',
    englishResult: ''
  }
  this.tasks.push(newTask)
  this.switchTask(this.tasks.length - 1)
},

async fetchUrl() {
  if (!this.urlInput.trim()) return
  this.urlLoading = true
  const url = this.urlInput.trim()
  // 明确的单题链接，直接跳过比赛流程（与 SolveData.isSingleProblem 逻辑一致）
  const isSingleProblem = (
    /atcoder\.jp\/contests\/[^/]+\/tasks\/[^/]+_[a-z0-9][^/]*$/i.test(url) ||
    /codeforces\.com\/(contest|gym)\/\d+\/problem\//i.test(url)
  )
  try {
    if (!isSingleProblem && this.isContestUrl(url)) {
      // ── 比赛链接：串行抓取每道题 ───────────────────────
      const contestData = await request(`/api/atcoder/contest?url=${encodeURIComponent(url)}`)
      const problems = contestData.problems || []
      if (!problems.length) throw new Error('未找到题目列表')
      this.urlInput = ''
      let added = 0
      for (const p of problems) {
        this.showToastMessage(`抓取 ${p.label}. ${p.title} (${added + 1}/${problems.length})...`)
        try {
          await this.addTranslationTask(p.url, `${p.label}. ${p.title}`)
          added++
        } catch { /* 单题失败不阻断 */ }
      }
      this.showToastMessage(`✅ 已添加 ${added} 道题目，可批量翻译`)
    } else {
      // ── 单题链接 ────────────────────────────────────────
      await this.addTranslationTask(url)
      this.urlInput = ''
      this.showToastMessage('✅ 题面抓取成功')
    }
  } catch (e) {
    // 比赛接口失败时回退为单题（与 SolveData 容错逻辑一致）
    if (!isSingleProblem && this.isContestUrl(url)) {
      try {
        await this.addTranslationTask(url)
        this.urlInput = ''
        this.showToastMessage('✅ 题面抓取成功')
        return
      } catch { /* fallback 也失败则继续报原始错误 */ }
    }
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
},

// ── Batch methods ────────────────────────────────────────────────────────────────────
getTaskTitle(task) {
  if (task.taskTitle) return task.taskTitle
  if (task.prompt && task.prompt.trim()) {
    const firstLine = task.prompt.split('\n').find(l => l.trim())
    return firstLine ? firstLine.trim().replace(/^#+\s*/, '').slice(0, 28) : '未命名任务'
  }
  return '未命名任务'
},
getTaskStatusText(task) {
  const m = { pending: '待翻译', fetching: '抓取题面...', processing: '翻译中...', completed: '已完成', failed: '失败' }
  return m[task.status] || task.status
},
updateCurrentTask(key, val) {
  const t = this.tasks[this.currentTaskIndex]
  if (t) t[key] = val
},
loadTask(index) {
  const t = this.tasks[index]
  if (!t) return
  this.prompt = t.prompt || ''
  this.result = t.result || ''
  this.englishResult = t.englishResult || ''
},
switchTask(index) {
  this.currentTaskIndex = index
  this.loadTask(index)
},
addNewTask() {
  const task = { id: Date.now(), status: 'pending', taskTitle: '', taskUrl: '', prompt: '', result: '', englishResult: '' }
  this.tasks.push(task)
  this.switchTask(this.tasks.length - 1)
},
clearAllTasks() {
  if (this.isBatchRunning) return
  if (!confirm('确定清空所有任务？')) return
  this.tasks = [{ id: Date.now(), status: 'pending', taskTitle: '', taskUrl: '', prompt: '', result: '', englishResult: '' }]
  this.switchTask(0)
},
async runBatch() {
  const toRunIndices = this.tasks.reduce((acc, t, i) => {
    if (t.status === 'pending' || t.status === 'failed') acc.push(i)
    return acc
  }, [])
  if (!toRunIndices.length) { this.showToastMessage('没有待翻译的任务'); return }
  this.isBatchRunning = true
  for (const idx of toRunIndices) {
    this.switchTask(idx)
    this.tasks[idx].status = 'processing'
    const ok = await this.translate(true)
    await this.$nextTick()
    this.tasks[idx].status = ok ? 'completed' : 'failed'
    if (ok) {
      const t = this.tasks[idx]
      this.saveHistory({ prompt: t.prompt, result: t.result, englishResult: t.englishResult, title: t.taskTitle || this.getTaskTitle(t) })
    }
  }
  this.isBatchRunning = false
  this.showToastMessage('批量翻译完成')
},
async downloadBatch() {
  const completed = this.tasks.filter(t => t.status === 'completed' && (t.result || t.englishResult))
  if (!completed.length) { this.showToastMessage('没有已完成的翻译'); return }
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    completed.forEach((task, i) => {
      const title = this.getTaskTitle(task).replace(/[\/\\?%*:|"<>]/g, '_')
      const label = `${String(i + 1).padStart(2, '0')}_${title}`
      if (task.result) zip.file(`${label}_zh.md`, task.result)
      if (task.englishResult) zip.file(`${label}_en.md`, task.englishResult)
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translations_${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
    this.showToastMessage(`已下载 ${completed.length} 个翻译`)
  } catch (e) {
    this.showToastMessage('下载失败: ' + e.message)
  }
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
  background-color: #f0f2f8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

h2 {
  margin: 0 0 16px 0;
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.3px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  background: white;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(79, 70, 229, 0.07);
  border: 1px solid #ede9fe;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  font-weight: 600;
  color: #6b7280;
  font-size: 13px;
}

select {
  padding: 6px 12px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 150px;
  outline: none;
}

select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

button {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 13px;
  padding: 7px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  color: white;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}

.btn-primary:disabled {
  background: #c4b5fd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: white;
  color: #6b7280;
  border: 1.5px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #c4b5fd;
  color: #4f46e5;
  background: #faf8ff;
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
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.08);
  border: 1px solid #ede9fe;
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
  background-color: #f5f3ff;
  cursor: col-resize;
  transition: background-color 0.2s;
  border-left: 1px solid #ede9fe;
  border-right: 1px solid #ede9fe;
  flex-shrink: 0;
  z-index: 10;
}

.col-resizer:hover, .col-resizer:active {
  background-color: #7c3aed;
}

.input-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #fefefe;
  min-width: 200px;
}

.resizer {
  width: 6px;
  background-color: #f5f3ff;
  cursor: col-resize;
  transition: background-color 0.2s;
  border-left: 1px solid #ede9fe;
  border-right: 1px solid #ede9fe;
  z-index: 10;
}

.resizer:hover, .resizer:active {
  background-color: #7c3aed;
}

.output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #fefefe;
  min-width: 200px;
  overflow: hidden;
  border-left: 1px solid #ede9fe;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1.5px solid #ede9fe;
  flex-shrink: 0;
}

.header-left h3 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  font-size: 13px;
  background: #f5f3ff;
  border: 1px solid #ede9fe;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  line-height: 1;
}

.btn-icon:hover:not(:disabled) {
  background: #ede9fe;
  border-color: #c4b5fd;
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header-tabs {
  display: flex;
  gap: 3px;
  background: #f5f3ff;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid #ede9fe;
}

.tab-btn {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.tab-btn:hover {
  color: #4f46e5;
}

.tab-btn.active {
  background: white;
  color: #4f46e5;
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.15);
}

.hint {
  font-size: 12px;
  color: #9ca3af;
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
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  min-height: 0;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: #fafafa;
}

textarea:focus {
  outline: none;
  border-color: #7c3aed;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
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
  padding: 16px;
  background: #fff;
  border: 1.5px solid #ede9fe;
  border-radius: 10px;
  overflow-y: auto;
  min-height: 0;
}

.result-area.empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #9ca3af;
  background-color: #faf8ff;
  border: 2px dashed #c4b5fd;
}

.result-area.empty p {
  margin: 8px 0;
  font-size: 15px;
  font-weight: 500;
  color: #a78bfa;
}

.result-area.empty .tip {
  font-size: 12px;
  color: #c4b5fd;
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
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #ede9fe;
  border-left: 4px solid #7c3aed;
}

.result-area :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  background: #f5f3ff;
  padding: 2px 6px;
  border-radius: 4px;
  color: #5b21b6;
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
  margin-bottom: 12px;
  align-items: center;
  background: linear-gradient(90deg, #faf8ff, #f5f3ff50);
  border: 1px solid #ede9fe;
  border-radius: 12px;
  padding: 8px 14px;
}
.url-label {
  font-size: 15px;
  flex-shrink: 0;
}
.url-input {
  flex: 1;
  padding: 7px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}
.url-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}
.btn-fetch {
  padding: 7px 18px;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.1s;
}
.btn-fetch:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-fetch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* History panel */
.toolbar-container {
  position: relative;
}
.history-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 200;
  width: min(700px, calc(100vw - 40px));
  max-height: 420px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ede9fe;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(79, 70, 229, 0.18);
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-bottom: none;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
}
.btn-clear-history {
  font-size: 12px;
  padding: 3px 9px;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-weight: 600;
}
.btn-clear-history:hover {
  background: rgba(255,255,255,0.3);
}
.history-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f5f3ff;
  transition: background 0.15s;
}
.history-item:last-child { border-bottom: none; }
.history-item:hover { background: #f5f3ff; }
.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.history-title {
  font-size: 12px;
  font-weight: 600;
  color: #7c3aed;
}
.history-time {
  font-size: 11px;
  color: #9ca3af;
}
.history-preview {
  font-size: 12px;
  color: #6b7280;
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
  color: #4f46e5;
  font-size: 13px;
  font-weight: 500;
}
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
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
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: inline-block;
  animation: pulse 1.2s infinite ease-in-out;
}
.dot-pulse span:nth-child(2) { animation-delay: .2s; }
.dot-pulse span:nth-child(3) { animation-delay: .4s; }
@keyframes pulse {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ── Batch mode ─────────────────────────────────────────────── */
.task-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #ede9fe;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(79, 70, 229, 0.06);
}
.task-count-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}
.task-bulk-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-sm {
  padding: 5px 14px !important;
  font-size: 12px !important;
}

.main-layout {
  flex: 1;
  display: flex;
  gap: 0;
  min-height: 0;
}

.task-list-panel {
  width: 210px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #ede9fe;
  border-radius: 12px 0 0 12px;
  overflow: hidden;
  margin-right: 0;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.task-list-header .btn-icon {
  padding: 2px 6px;
  font-size: 12px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  border-radius: 5px;
}
.task-list-header .btn-icon:hover {
  background: rgba(255,255,255,0.28);
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.task-list::-webkit-scrollbar { width: 4px; }
.task-list::-webkit-scrollbar-track { background: transparent; }
.task-list::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 2px; }

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f5f3ff;
  transition: background 0.15s;
}
.task-item:last-child { border-bottom: none; }
.task-item:hover { background: #f5f3ff; }
.task-item.active {
  background: #ede9fe;
  border-left: 3px solid #7c3aed;
  padding-left: 7px;
}

.task-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #d1d5db;
}
.task-status-dot.pending    { background: #d1d5db; }
.task-status-dot.fetching   { background: #818cf8; animation: pulse-dot 1s infinite; }
.task-status-dot.processing { background: #f59e0b; animation: pulse-dot 1s infinite; }
.task-status-dot.completed  { background: #10b981; }
.task-status-dot.failed     { background: #ef4444; }
@keyframes pulse-dot {
  0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
}

.task-info-col {
  flex: 1;
  min-width: 0;
}
.task-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-meta {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 1px;
}

.main-layout > .content-area {
  flex: 1;
  border-radius: 0 14px 14px 0;
  border-left: none;
}
</style>
