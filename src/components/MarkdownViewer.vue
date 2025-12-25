<template>
  <div class="markdown-viewer" ref="content" v-html="renderedContent"></div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import { nextTick } from 'vue'

export default {
  name: 'MarkdownViewer',
  props: {
    content: {
      type: String,
      default: ''
    }
  },
  computed: {
    renderedContent() {
      try {
        const raw = this.content || ''
        const pre = this.preprocessMarkdown(raw)
        const html = marked.parse(pre, {
          mangle: false,
          headerIds: false,
          breaks: true
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
        return `<pre>${this.escapeHtml(this.content)}</pre>`
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
    escapeHtml(text) {
      if (!text) return ''
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
  padding-bottom: 80px; /* Ensure last element is visible */
}
.markdown-viewer pre {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}
.markdown-viewer code {
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background: rgba(175, 184, 193, 0.2);
  padding: 0.2em 0.4em;
  border-radius: 6px;
}
.markdown-viewer pre code {
  background: transparent;
  padding: 0;
}
.markdown-viewer blockquote {
  border-left: 4px solid #dfe2e5;
  color: #6a737d;
  padding-left: 16px;
  margin: 0;
}
.markdown-viewer table {
  border-collapse: collapse;
  width: 100%;
}
.markdown-viewer th, .markdown-viewer td {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}
.markdown-viewer tr:nth-child(2n) {
  background-color: #f6f8fa;
}
.markdown-viewer img {
  max-width: 100%;
}

/* Custom blocks from preprocess */
.sample-block {
  margin: 10px 0;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
}
.sample-label {
  background: #f1f8ff;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: bold;
  color: #0366d6;
  border-bottom: 1px solid #e1e4e8;
}
.sample-code {
  margin: 0;
  padding: 8px 10px;
  background: #fff;
  font-family: Consolas, monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
.math-block {
  overflow-x: auto;
  padding: 10px 0;
  text-align: center;
}
</style>
