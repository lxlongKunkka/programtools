<template>
<div class="solution-root">
<h2>AI 题解整理助手</h2>

<div class="toolbar">
<div class="toolbar-left">
<label class="label">模型:</label>
<select v-model="model">
<option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
</select>
</div>
<div class="toolbar-right">
<button @click="generate" :disabled="loading || !codeText.trim()" class="btn-primary" :title="!codeText.trim() ? '请先粘贴 AC 代码' : ''">
{{ loading ? '⏳ 整理中...' : '🚀 开始整理' }}
</button>
<button @click="clear" class="btn-secondary">🧹 清空</button>
<button @click="copyResult" :disabled="!result" class="btn-secondary">📋 复制结果</button>
<button @click="saveResult" :disabled="!result" class="btn-secondary">💾 保存 Markdown</button>
</div>
</div>

    <div class="content-area" ref="contentArea">
      <div class="input-panel" :style="{ width: leftWidth + '%' }">
        <div class="panel-header">
          <h3>输入原题解析</h3>
          <span class="hint">分别粘贴题目和代码</span>
        </div>
        <div class="input-group">
          <div class="input-section">
            <label class="section-label">📝 题目描述</label>
            <textarea 
              v-model="problemText" 
              placeholder="粘贴题目内容...&#10;&#10;示例：&#10;给定一个数组 nums 和一个目标值 target..."
              :disabled="loading"
            ></textarea>
          </div>
          <div class="input-section">
            <label class="section-label">💻 AC 代码</label>
            <textarea 
              v-model="codeText" 
              placeholder="粘贴通过的代码...&#10;&#10;示例：&#10;#include <iostream>&#10;using namespace std;&#10;..."
              :disabled="loading"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="resizer" @mousedown="startResize"></div>

      <div class="output-panel">
        <div class="panel-header">
          <h3>整理后结果</h3>
          <span class="hint">Markdown 格式题解</span>
        </div>
        <div class="result-area" v-if="result">
          <MarkdownViewer :content="result" />
        </div>

        <div class="result-area empty" v-else>
          <p>✨ 整理结果将显示在这里</p>
          <p class="tip">支持题意分析、算法标签、思路讲解和示例代码</p>
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
problemText: '',
codeText: '',
result: '',
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
inputText() {
let combined = ''
if (this.problemText.trim()) {
combined += '题目：\n' + this.problemText.trim() + '\n\n'
}
if (this.codeText.trim()) {
combined += 'AC代码：\n' + this.codeText.trim()
}
return combined
}
},
watch: {
    problemText(val) { this.saveState() },
    codeText(val) { this.saveState() },
    result(val) { this.saveState() },
    model(val) { this.saveState() }
},
async mounted() {
try {
    // Restore state
    const saved = localStorage.getItem('solution_storage')
    if (saved) {
        const data = JSON.parse(saved)
        if (data.problemText) this.problemText = data.problemText
        if (data.codeText) this.codeText = data.codeText
        if (data.result) this.result = data.result
        if (data.model) this.model = data.model
    }

const list = await getModels()
if (Array.isArray(list)) this.rawModelOptions = list
      
      if (this.modelOptions.length > 0) {
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
        localStorage.setItem('solution_storage', JSON.stringify({
            problemText: this.problemText,
            codeText: this.codeText,
            result: this.result,
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
async generate() {
if (!this.codeText.trim()) {
  this.showToastMessage('请先提供 AC 代码，不能不劳而获哦~')
  return
}
const text = this.inputText.trim()
if (!text) return

this.loading = true
this.result = ''

try {
const data = await request('/api/solution', {
method: 'POST',
body: JSON.stringify({
text: text,
model: this.model,
requireAC: true // Solution page requires AC code check
})
})

this.result = data.result || ''

} catch (e) {
console.error('Solution error:', e)
this.showToastMessage(`整理失败: ${e.message}`)
} finally {
this.loading = false
}
},
clear() {
this.problemText = ''
this.codeText = ''
this.result = ''
},
copyResult() {
if (!this.result) return
navigator.clipboard.writeText(this.result)
.then(() => this.showToastMessage('✅ 结果已复制到剪贴板'))
.catch(err => {
console.error('copy failed', err)
this.showToastMessage('复制失败: ' + err.message)
})
},
saveResult() {
if (!this.result) return

const blob = new Blob([this.result], { type: 'text/markdown;charset=utf-8' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `solution_${Date.now()}.md`
a.click()
URL.revokeObjectURL(url)
this.showToastMessage('已下载文件')
}
}
}
</script>

<style scoped>
.solution-root {
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
  border-color: #4f46e5;
  outline: none;
  box-shadow: 0 0 0 2px rgba(79,70,229,0.1);
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
  background-color: #4f46e5;
  color: white;
  box-shadow: 0 1px 3px rgba(79,70,229,0.25);
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
  font-weight: 600;
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

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #7f8c8d;
  margin-bottom: 8px;
  display: block;
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

/* Responsive */
@media (max-width: 1024px) {
  .solution-root {
    height: auto;
    min-height: 100vh;
  }
  .content-area {
    flex-direction: column;
    height: auto;
  }
  .input-panel, .output-panel {
    width: 100% !important;
    height: 600px;
  }
  .resizer {
    display: none;
  }
}
</style>
