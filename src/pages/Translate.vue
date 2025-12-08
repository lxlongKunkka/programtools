<template>
  <div>
    <textarea v-model="prompt" rows="6" cols="80" placeholder="在此输入题面或文本"></textarea>
    <div class="top-bar">
      <div class="top-left">
        <h2>翻译</h2>
      </div>
      <div class="top-right">
        <label>模型</label>
        <select v-model="model">
          <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <button @click="translate" :disabled="loading">翻译为中文 (调用 AI)</button>
        <button @click="copyMarkdown">复制 Markdown</button>
        <button @click="downloadMarkdown">下载 Markdown</button>
      </div>
    </div>
    <div class="result-area">
      <div class="result-panel">
        <div class="panel-header">原始 Markdown</div>
        <pre class="panel-body code-body">{{result}}</pre>
      </div>
      <div class="result-panel">
        <div class="panel-header">渲染预览</div>
        <MarkdownViewer :content="result" class="panel-body md-preview" />
      </div>
    </div>
  </div>
</template>


<script>
import request from '../utils/request'
import { getModels } from '../utils/models'
import { nextTick } from 'vue'

export default {
  inject: ['showToastMessage'],
  data() { return { prompt: '', result: '', loading: false, model: 'o4-mini', modelOptions: [] } },
  async mounted() {
    try {
      const list = await getModels()
      if (Array.isArray(list)) this.modelOptions = list
    } catch (e) { console.warn('failed to load models', e) }
  },

  computed: {
    modelOptions() {
      return this.modelOptions || []
    }
  },
  methods: {
    async translate() {
      if (!this.prompt.trim()) { this.result = '请输入要翻译的题面或文本。'; return }
      this.loading = true
      this.result = '正在翻译，请稍候...'
      try {
        const data = await request('/api/translate', {
          method: 'POST',
          body: JSON.stringify({ text: this.prompt, model: this.model })
        })

        this.result = data.result || data.rawText || '(无返回内容)'

      } catch (e) {
        this.result = '请求错误: ' + e.message
      } finally {
        this.loading = false
      }
    },

    copyMarkdown() {
      const text = this.result || ''
      navigator.clipboard.writeText(text).then(() => {
        this.showToastMessage('✅ 已复制 Markdown 到剪贴板')
      }).catch(err => {
        console.error('copy failed', err)
        this.showToastMessage('复制失败: ' + err)
      })
    },
    downloadMarkdown() {
      const text = this.result || ''
      if (!text) {
        this.showToastMessage('没有可下载的内容！')
        return
      }
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'translation.md'
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
/* 页面基调：字体与背景 */
:host, .translate-page-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Microsoft YaHei", "PingFang SC", "Source Han Sans SC", sans-serif;
  background: var(--bg-page);
  color: var(--text);
}

/* 标题与基础排版 */
h2 { margin: 0; color: var(--title); font-weight: 700; font-size: 18px; letter-spacing: .2px }
h3, h4 { color: var(--title); font-weight: 700; margin: 8px 0 }
label { color: var(--text); font-weight: 600 }
/* 细灰小标题样式的 label，与 SolveData 更贴近 */
.top-bar label {
  font-weight: 600;
  color: #6b7280; /* 灰度更柔和 */
  padding-left: 0;
  margin-left: 0;
}
/* 仅在存在控件分组时显示分隔线：非第一个 label 作为分组标题 */
.top-right label:not(:first-child) {
  border-left: 1px solid var(--border);
  padding-left: 10px;
  margin-left: 8px;
}

/* 全局正文排版微调 */
* { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale }
body, .md-preview { line-height: 1.7 }
p { margin: 0 0 10px 0 }
ul, ol { margin: 6px 0 10px 22px }
code { font-family: Consolas, Monaco, "SFMono-Regular", Menlo, monospace; font-size: 13px }

/* 顶部工具栏：粘性 + 背景与分隔线 */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 0;
  background: var(--bg-surface);
  backdrop-filter: saturate(180%) blur(4px);
  border-bottom: 1px solid var(--border);
}
/* 让标题与控件紧凑排布，SolveData 风格 */
.top-bar h2 { margin-right: 8px }
/* 顶部标题以按钮同款风格呈现（轻量渐变徽章） */
.top-left h2 {
  background: linear-gradient(90deg,#667eea,#764ba2);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 700;
}
.top-left { display: flex; align-items: center }
.top-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap }
.top-right button,
.top-right select {
  flex: 0 0 auto;
}

/* 窄屏断点适配：按钮与选择器全宽排列，提升可用性 */
@media (max-width: 768px) {
  .top-bar { gap: 6px 8px; padding: 8px 0 }
  .top-left, .top-right { width: 100% }
  .top-right { gap: 6px }
  .top-right button,
  .top-right select {
    width: 100%;
    height: 36px;
  }
}
/* 大屏轻微收紧间距，保持紧凑视觉 */
@media (min-width: 1024px) {
  .top-bar { gap: 8px 10px }
  .top-right { gap: 8px }
  .result-area { gap: 12px }
}

/* 输入控件：textarea 与 select */
textarea {
  width: 100%;
  border: 1px solid #cbd5e1; /* 更高对比度的默认边框 */
  border-radius: var(--radius);
  background: #ffffff;
  color: var(--text);
  padding: 12px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.02); /* 轻微内阴影，未聚焦也更立体 */
  line-height: 1.6;
  transition: border-color .15s ease, box-shadow .15s ease;
}
textarea::placeholder { color: #9ca3af; font-style: italic }
textarea:hover { border-color: var(--border-hover) }
textarea:focus { outline: none; border-color: var(--border-hover); box-shadow: 0 0 0 2px rgba(66,153,225,0.15) inset }

select {
  height: 30px;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius);
  background: #ffffff;
  color: var(--text);
  transition: border-color .15s ease, box-shadow .15s ease;
}
select:hover { border-color: var(--border-hover) }
select:focus { outline: none; border-color: var(--border-hover); box-shadow: 0 0 0 2px rgba(66,153,225,0.15) inset }
.top-bar select { align-self: center }

/* 按钮：第一个为主按钮，其余为次级按钮 */
button {
  height: 30px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: linear-gradient(90deg,#667eea,#764ba2);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter .15s ease;
}
button:hover { filter: brightness(.97) }
button[disabled] { opacity: .6; cursor: not-allowed }
/* 顶部所有按钮统一渐变为主按钮风格 */
.top-bar button { background: linear-gradient(90deg,#667eea,#764ba2); color: #fff; border-color: transparent }
.top-bar button:hover { filter: brightness(.97) }

/* 面板内表面：预览区域和样例块 */
.md-preview {
  border: 1px solid var(--border);
  padding: 12px;
  border-radius: 6px;
  background: #f8fafc; /* 更柔和的浅灰底 */
}
.result-area { display: flex; gap: 16px; align-items: stretch }
.result-panel { flex: 1; display: flex; flex-direction: column; gap: 0; background: var(--bg-surface); border: 1px solid #cbd5e1; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.06) }
.panel-header { padding: 10px 12px; font-weight: 700; color: #fff; background: linear-gradient(90deg,#667eea,#764ba2); border-bottom: 1px solid #cbd5e1; border-radius: 10px 10px 0 0 }
.panel-body { border-top: none; border-radius: 0 0 10px 10px; background: #ffffff; padding: 12px }
/* 更高的面板内容高度与空态可见性 */
.code-body { white-space: pre-wrap; max-height: 640px; min-height: 200px; overflow: auto; background: #f8fafc; border-top: 1px solid #eef2f7; border-radius: 6px }
/* 渲染预览对话框的内容底色与边界更明显 */
.md-preview { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 6px; min-height: 200px; max-height: 640px; overflow: auto }
/* 自适应高度：小屏更低，中屏适中，大屏更高 */
@media (max-width: 640px) {
  .code-body { max-height: 420px; min-height: 160px }
  .md-preview { max-height: 420px; min-height: 160px }
}
@media (min-width: 641px) and (max-width: 1024px) {
  .code-body { max-height: 560px; min-height: 180px }
  .md-preview { max-height: 560px; min-height: 180px }
}
@media (min-width: 1025px) {
  .code-body { max-height: 720px; min-height: 220px }
  .md-preview { max-height: 720px; min-height: 220px }
}
@media (max-width: 768px) {
  .result-area { flex-direction: column }
}
.sample-block { border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 12px; background: #ffffff }
.sample-label { font-weight: 700; margin-bottom: 6px; color: var(--title) }
.sample-code { background: #f5f5f5; padding: 10px; border-radius: 6px; border: 1px solid var(--border); white-space: pre-wrap; overflow: auto; font-family: 'Consolas','Menlo','Monaco',monospace; font-size: 13px }
.math-block { border-left: 4px solid var(--primary); padding: 8px 12px; background: #f6fbff; margin: 12px 0 }
</style>

