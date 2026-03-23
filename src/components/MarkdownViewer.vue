<template>
  <div class="markdown-viewer" :class="{ 'inline-mode': inline }" ref="content" v-html="renderedContent"></div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import { nextTick } from 'vue'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeLanguageLabel(language) {
  const text = String(language || '').trim().toLowerCase()
  if (!text) return 'TEXT'
  if (text === 'cpp' || text === 'c++') return 'C++'
  if (text === 'py' || text === 'python') return 'Python'
  if (text === 'js' || text === 'javascript') return 'JavaScript'
  if (text === 'ts' || text === 'typescript') return 'TypeScript'
  if (text === 'text' || text === 'plaintext') return 'TEXT'
  return text.toUpperCase()
}

export default {
  name: 'MarkdownViewer',
  props: {
    content: {
      type: String,
      default: ''
    },
    inline: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    renderedContent() {
      try {
        const raw = this.content || ''
        const pre = this.preprocessMarkdown(raw)
        const renderer = new marked.Renderer()

        renderer.code = (code, infoString) => {
          const language = String(infoString || '').trim().split(/\s+/)[0]
          const languageLabel = normalizeLanguageLabel(language)
          const languageClass = language ? ` language-${language}` : ''

          return `
            <div class="code-block-card">
              <div class="code-block-toolbar">
                <span class="code-block-dot"></span>
                <span class="code-block-dot"></span>
                <span class="code-block-dot"></span>
                <span class="code-block-language">${escapeHtml(languageLabel)}</span>
              </div>
              <pre><code class="${languageClass.trim()}">${escapeHtml(code)}</code></pre>
            </div>
          `
        }

        const html = marked.parse(pre, {
          mangle: false,
          headerIds: false,
          breaks: true,
          renderer
        })
        let sanitized = DOMPurify.sanitize(html, {
          ADD_TAGS: ['iframe'],
          ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
        })

        // Inject Token to prevent 401 on initial load
        const token = localStorage.getItem('auth_token')
        if (token) {
           // Replace src="/public/..." with src="/public/...?token=..."
           // Also match /api/public/
           sanitized = sanitized.replace(/(src=["'])((\/public\/|\/api\/public\/)[^"']*)(["'])/g, (match, prefix, url, pathPrefix, suffix) => {
               // Force /api/public prefix for production compatibility
               let finalUrl = url;
               if (finalUrl.startsWith('/public/')) {
                   finalUrl = '/api' + finalUrl;
               }

               const separator = finalUrl.includes('?') ? '&' : '?'
               return `${prefix}${finalUrl}${separator}token=${token}${suffix}`
           })
        }

        return sanitized
      } catch (e) {
        console.error('Markdown render error:', e)
        return `<pre>${escapeHtml(this.content)}</pre>`
      }
    }
  },
  watch: {
    content: {
      handler() {
        this.renderMath()
      },
      immediate: true
    }
  },
  updated() {
    this.renderMath()
    this.secureContent()
  },
  mounted() {
    this.renderMath()
    this.secureContent()
  },
  methods: {
    secureContent() {
      const el = this.$refs.content
      if (!el) return

      // 1. 保护视频
      const videos = el.querySelectorAll('video')
      videos.forEach(video => {
        video.setAttribute('controlsList', 'nodownload')
        video.oncontextmenu = (e) => {
          e.preventDefault()
          return false
        }
      })

      // 2. 保护图片
      const images = el.querySelectorAll('img')
      images.forEach(img => {
        img.setAttribute('draggable', 'false')
        img.oncontextmenu = (e) => {
          e.preventDefault()
          return false
        }
      })

      // 3. 保护 Iframe (PDF/PPT)
      const iframes = el.querySelectorAll('iframe')
      const token = localStorage.getItem('auth_token')

      iframes.forEach(iframe => {
        // 注入 Token (解决 Unauthorized 问题)
        try {
          let src = iframe.getAttribute('src')
          if (src && (src.startsWith('/public/') || src.startsWith('/api/public/'))) {
            let finalUrl = src;
            // Force /api/public prefix
            if (finalUrl.startsWith('/public/')) {
               finalUrl = '/api' + finalUrl;
            }
            
            if (!finalUrl.includes('token=') && token) {
               const separator = finalUrl.includes('?') ? '&' : '?'
               finalUrl = finalUrl + separator + 'token=' + token
            }
            
            if (finalUrl !== src) {
               iframe.setAttribute('src', finalUrl)
            }
          }
        } catch (e) {}

        // 禁用右键
        iframe.oncontextmenu = (e) => {
          e.preventDefault()
          return false
        }
        
        // PDF 特殊处理：隐藏工具栏
        try {
          const src = iframe.getAttribute('src')
          if (src && src.toLowerCase().includes('.pdf') && !src.includes('#toolbar=0')) {
            iframe.setAttribute('src', src + '#toolbar=0')
          }
        } catch (e) {
          // 忽略跨域等错误
        }
      })
    },
    preprocessMarkdown(raw) {
      let s = raw || ''
      // Handle input/output blocks
      s = s.replace(/```\s*input(\d+)\s*\n([\s\S]*?)```/g, (m, n, code) => {
        const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `\n<div class="sample-block">\n<div class="sample-label">输入样例${n}</div>\n<pre class="sample-code">${esc}</pre>\n</div>\n`
      })
      s = s.replace(/```\s*output(\d+)\s*\n([\s\S]*?)```/g, (m, n, code) => {
        const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `\n<div class="sample-block">\n<div class="sample-label">输出样例${n}</div>\n<pre class="sample-code">${esc}</pre>\n</div>\n`
      })
      // Handle math blocks
      s = s.replace(/\$\$([\s\S]*?)\$\$/g, (m, content) => {
        return `\n<div class="math-block">\n$$${content}$$\n</div>\n`
      })
      return s
    },
    async renderMath() {
      await nextTick()
      const el = this.$refs.content
      if (!el) return
      try {
        renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false,
          strict: false,
          ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
        })
      } catch (e) {
        console.warn('KaTeX render error', e)
      }
    }
  }
}
</script>

<style>
/* Shared styles for markdown content */
.markdown-viewer {
  padding-bottom: 80px;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.9;
}
.markdown-viewer.inline-mode {
  padding-bottom: 0;
  font-size: inherit;
  line-height: inherit;
}
.markdown-viewer > :first-child {
  margin-top: 0;
}
.markdown-viewer > :last-child {
  margin-bottom: 0;
}
.markdown-viewer.inline-mode > * {
  margin: 0;
}
.markdown-viewer.inline-mode p,
.markdown-viewer.inline-mode ul,
.markdown-viewer.inline-mode ol,
.markdown-viewer.inline-mode blockquote,
.markdown-viewer.inline-mode table,
.markdown-viewer.inline-mode .code-block-card,
.markdown-viewer.inline-mode .sample-block,
.markdown-viewer.inline-mode .math-block {
  margin: 0;
}
.markdown-viewer.inline-mode p {
  display: inline;
}
.markdown-viewer.inline-mode .math-block {
  display: inline-block;
  padding: 4px 8px;
  vertical-align: middle;
}
.markdown-viewer p,
.markdown-viewer ul,
.markdown-viewer ol,
.markdown-viewer blockquote,
.markdown-viewer table,
.markdown-viewer .code-block-card,
.markdown-viewer .sample-block,
.markdown-viewer .math-block {
  margin: 14px 0;
}
.markdown-viewer ul,
.markdown-viewer ol {
  padding-left: 1.4em;
}
.markdown-viewer li + li {
  margin-top: 6px;
}
.markdown-viewer strong {
  color: #102a43;
}
.markdown-viewer h1,
.markdown-viewer h2,
.markdown-viewer h3,
.markdown-viewer h4,
.markdown-viewer h5,
.markdown-viewer h6 {
  margin: 20px 0 10px;
  color: #102a43;
  line-height: 1.35;
}
.markdown-viewer pre {
  margin: 0;
  padding: 18px 20px;
  background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
  color: #e5eefb;
  border-radius: 0 0 18px 18px;
  overflow-x: auto;
}
.markdown-viewer code {
  font-family: 'Cascadia Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 0.92em;
  background: rgba(15, 23, 42, 0.06);
  color: #9a3412;
  padding: 0.18em 0.42em;
  border-radius: 6px;
}
.markdown-viewer pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: 14px;
  line-height: 1.7;
}
.markdown-viewer .code-block-card {
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
}
.markdown-viewer .code-block-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
}
.markdown-viewer .code-block-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
}
.markdown-viewer .code-block-dot:nth-child(1) {
  background: #f87171;
}
.markdown-viewer .code-block-dot:nth-child(2) {
  background: #fbbf24;
}
.markdown-viewer .code-block-dot:nth-child(3) {
  background: #34d399;
}
.markdown-viewer .code-block-language {
  margin-left: auto;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.8);
}
.markdown-viewer blockquote {
  border-left: 4px solid #f59e0b;
  color: #475569;
  padding: 8px 0 8px 16px;
  margin: 0;
  background: rgba(245, 158, 11, 0.06);
  border-radius: 0 12px 12px 0;
}
.markdown-viewer table {
  border-collapse: collapse;
  width: 100%;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px #dbe4ef;
}
.markdown-viewer th, .markdown-viewer td {
  border: 1px solid #dbe4ef;
  padding: 10px 13px;
}
.markdown-viewer th {
  background: #eff6ff;
  color: #123458;
}
.markdown-viewer tr:nth-child(2n) {
  background-color: #f8fafc;
}
.markdown-viewer img {
  max-width: 100%;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

/* Custom blocks from preprocess */
.sample-block {
  border: 1px solid #dbe4ef;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}
.sample-label {
  background: linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
  color: #1d4ed8;
  border-bottom: 1px solid #dbe4ef;
}
.sample-code {
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
.math-block {
  overflow-x: auto;
  padding: 14px 18px;
  text-align: center;
  background: linear-gradient(180deg, #fffdf4 0%, #fff 100%);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 16px;
}
</style>
