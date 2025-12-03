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
      </div>
    </div>
    <div class="result-area">
      <div class="result-panel">
        <div class="panel-header">原始 Markdown</div>
        <pre class="panel-body code-body">{{result}}</pre>
      </div>
      <div class="result-panel">
        <div class="panel-header">渲染预览</div>
        <div ref="preview" class="panel-body md-preview" v-html="renderedHtml"></div>
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
// model configuration now served from backend

export default {
  data() { return { prompt: '', result: '', loading: false, model: 'o4-mini', modelOptions: [] } },
  async mounted() {
    try {
      const r = await fetch('/api/models')
      if (r.ok) this.modelOptions = await r.json()
    } catch (e) { console.warn('failed to load models', e) }
  },

  computed: {
    renderedHtml() {
      try {
        const raw = this.result || ''
        const pre = this.preprocessMarkdown(raw)
        const html = marked.parse(pre)
        return DOMPurify.sanitize(html)
      } catch (e) {
        return '<pre>无法渲染 Markdown</pre>'
      }
    }
    ,
    modelOptions() {
      return this.modelOptions || []
    }
  },
  methods: {
    preprocessMarkdown(raw) {
      let s = raw

      // 把 ```inputN ... ``` 转换为带标签的 HTML 区块
      s = s.replace(/```\s*input(\d+)\s*\n([\s\S]*?)```/g, (m, n, code) => {
        // escape HTML inside code block to keep as preformatted text
        const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `\n<div class="sample-block">\n<div class="sample-label">输入样例${n}</div>\n<pre class="sample-code">${esc}</pre>\n</div>\n`
      })

      // 把 ```outputN ... ``` 转换为带标签的 HTML 区块
      s = s.replace(/```\s*output(\d+)\s*\n([\s\S]*?)```/g, (m, n, code) => {
        const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `\n<div class="sample-block">\n<div class="sample-label">输出样例${n}</div>\n<pre class="sample-code">${esc}</pre>\n</div>\n`
      })

      // 将 $$...$$ 包裹为公式块，以便 KaTeX 渲染后我们能样式化
      s = s.replace(/\$\$([\s\S]*?)\$\$/g, (m, content) => {
        return `\n<div class="math-block">\n$$${content}$$\n</div>\n`
      })

      return s
    },
    async translate() {
      if (!this.prompt.trim()) { this.result = '请输入要翻译的题面或文本。'; return }
      this.loading = true
      this.result = '正在翻译，请稍候...'
      try {
        const resp = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: this.prompt, model: this.model })
        })

        const ct = resp.headers.get('content-type') || ''
        let data = null
        if (ct.includes('application/json')) {
          try { data = await resp.json() } catch (e) { data = null }
        } else {
          try { const txt = await resp.text(); data = { rawText: txt } } catch (e) { data = null }
        }

        if (resp.ok) {
          if (data && data.result) this.result = data.result
          else if (data && data.rawText) this.result = data.rawText || '(空响应)'
          else this.result = '(无返回内容)'
        } else {
          if (data) this.result = `翻译失败: ${JSON.stringify(data)}`
          else this.result = `翻译失败: HTTP ${resp.status}`
        }
      } catch (e) {
        this.result = '请求错误: ' + e.toString()
      } finally {
        this.loading = false
      }
    },

    copyMarkdown() {
      const text = this.result || ''
      navigator.clipboard.writeText(text).then(() => {
        this.$root.$emit && this.$root.$emit('message', '已复制 Markdown 到剪贴板')
      }).catch(err => {
        console.error('copy failed', err)
        alert('复制失败: ' + err)
      })
    }
  },

  watch: {
    result: async function() {
      // wait for DOM update then render math in preview
      await nextTick()
      try {
        const previewEl = this.$refs.preview
        if (previewEl) {
          renderMathInElement(previewEl, {
            // delimiters for block and inline math
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false,
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
          })
        }
      } catch (e) {
        // silently ignore render errors
        console.warn('KaTeX render error', e)
      }
    }
  }
}
</script>

<style scoped>
/* 同款化的中性专业风基础变量 */
:root {
  --bg-panel: #f9fafb;
  --bg-surface: #ffffff;
  --bg-page: #f3f4f6;
  --border: #e5e7eb;
  --border-hover: #4299e1;
  --title: #2d3748;
  --text: #4a5568;
  --muted: #718096;
  --primary: #4299e1;
  --radius: 8px;
  --shadow-panel: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-inner: inset 0 1px 2px rgba(0,0,0,0.03);
}

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

