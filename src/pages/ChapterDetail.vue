<template>
  <div class="chapter-detail-container">
    <div class="header-nav">
      <button @click="$router.push('/course')" class="btn-back">← 返回学习地图</button>
      <span v-if="level && chapter">{{ level.title }} - {{ chapter.title }}</span>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!chapter" class="error">章节不存在</div>
    <div v-else class="content-wrapper">
      
      <!-- Left: Tutorial Content -->
      <div class="tutorial-section">
        <!-- Watermark -->
        <div class="watermark-container" v-if="userInfo">
          <div class="watermark-text" v-for="n in 30" :key="n">
            {{ watermarkText }}
          </div>
        </div>

        <h1 class="chapter-title">{{ chapter.title }}</h1>
        
        <!-- HTML Content Mode -->
        <div v-if="chapter.contentType === 'html'" :class="['html-content-container', { maximized: isMaximized }]">
           <!-- Watermark for Fullscreen -->
           <div class="watermark-container" v-if="userInfo">
             <div class="watermark-text" v-for="n in 30" :key="n">
               {{ watermarkText }}
             </div>
           </div>
           
           <div class="controls-bar">
             <button @click="isMaximized = !isMaximized" class="btn-control btn-maximize">
               {{ isMaximized ? '退出全屏' : '全屏显示' }}
             </button>
           </div>
           <iframe :src="getHtmlUrl(chapter.resourceUrl)" class="courseware-iframe" allowfullscreen></iframe>
        </div>

        <!-- Markdown Content Mode -->
        <div v-else :class="['markdown-content-container', { maximized: isMaximized }]">
            <!-- Watermark for Fullscreen -->
            <div class="watermark-container" v-if="userInfo && isMaximized">
              <div class="watermark-text" v-for="n in 30" :key="n">
                {{ watermarkText }}
              </div>
            </div>

            <div class="controls-bar">
              <button @click="adjustFontSize(-2)" class="btn-control" title="减小字体">A-</button>
              <button @click="adjustFontSize(2)" class="btn-control" title="增大字体">A+</button>
              <button @click="isMaximized = !isMaximized" class="btn-control btn-maximize">
                {{ isMaximized ? '退出全屏' : '全屏显示' }}
              </button>
            </div>

            <div class="markdown-scroll-wrapper">
                <div v-for="(stepHtml, index) in parsedSteps" :key="index">
                  <div v-if="index < visibleSteps" class="markdown-content step-container" :style="{ fontSize: fontSize + 'px' }" v-html="stepHtml"></div>
                </div>
                
                <div v-if="parsedSteps.length > visibleSteps" class="step-action">
                  <button @click="showNextStep" class="btn-next-step">
                    点击继续阅读 ({{ visibleSteps }}/{{ parsedSteps.length }}) ↓
                  </button>
                </div>
            </div>
        </div>
      </div>

      <!-- Right: Problems or Reading Completion -->
      <div class="problems-section">
        <div v-if="totalProblems > 0">
          <div class="problems-header">
            <h3>本章挑战</h3>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <span class="progress-text">{{ solvedCount }} / {{ totalProblems }} 已解决</span>
          </div>

          <div class="problem-list">
            <div v-for="problem in chapter.problemIds" :key="problem._id" class="problem-item">
              <div class="problem-info">
                <span class="problem-title">{{ problem.title }}</span>
                <span v-if="isSolved(problem._id)" class="status-badge solved">已通过</span>
                <span v-else class="status-badge unsolved">未通过</span>
              </div>
              <div class="problem-actions">
                <a :href="getProblemLink(problem)" target="_blank" class="btn-action btn-challenge">
                  <span class="icon">🚀</span> 去挑战
                </a>
                <button @click="checkStatus(problem)" class="btn-action btn-check" :disabled="checking === problem._id">
                  <span class="icon">🔄</span> {{ checking === problem._id ? '检查中...' : '检查状态' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="reading-section">
          <h3>学习任务</h3>
          <p>请仔细阅读左侧教程内容，观看相关视频。</p>
          <div v-if="!isChapterCompleted" class="action-area">
            <button @click="completeReading" class="btn-complete-reading" :disabled="submitting">
              {{ submitting ? '提交中...' : '我已完成阅读/观看' }}
            </button>
          </div>
        </div>

        <div v-if="isChapterCompleted" class="chapter-complete-msg">
          🎉 恭喜！本章已完成。
          <button @click="goToNextChapter" class="btn-next" v-if="hasNextChapter">下一章 →</button>
        </div>
      </div>

    </div>

    <!-- Solve Modal -->
    <div v-if="showSolveModal" class="modal-overlay">
      <div class="modal-content solve-modal">
        <div class="modal-header">
          <h3>{{ currentProblem.title }}</h3>
          <button @click="closeSolveModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p class="problem-desc">请编写代码解决此问题 (模拟提交)</p>
          <textarea v-model="code" class="code-editor" placeholder="// Write your C++ code here..."></textarea>
        </div>
        <div class="modal-footer">
          <button @click="submitSolution" class="btn-submit" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交运行' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import request from '../utils/request'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import { SUBJECTS_CONFIG } from '../utils/courseConfig'

export default {
  inject: ['showToastMessage'],
  data() {
    return {
      loading: true,
      level: null,
      chapter: null,
      userProgress: null,
      showSolveModal: false,
      currentProblem: null,
      code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}',
      submitting: false,
      isMaximized: false,
      fontSize: 18,
      checking: null,
      visibleSteps: 1
    }
  },
  watch: {
    '$route.params': {
      handler() {
        this.fetchData()
      },
      immediate: true
    }
  },
  computed: {
    chapterId() {
      return this.$route.params.chapterId // String ID
    },
    userInfo() {
      try {
        return JSON.parse(localStorage.getItem('user_info')) || null
      } catch (e) {
        return null
      }
    },
    watermarkText() {
      const user = this.userInfo
      if (!user) return ''
      return `${user.uname || user.username || 'User'} (${user.uid || user._id || 'ID'})`
    },
    parsedSteps() {
      if (!this.chapter || !this.chapter.content) return []
      // Split content by "===NEXT===" (case insensitive, allowing whitespace)
      const steps = this.chapter.content.split(/\n\s*===\s*NEXT\s*===\s*\n/i).map(part => {
        try {
           const html = marked.parse(part, { 
             breaks: true,
             mangle: false,
             headerIds: false
           })
           return DOMPurify.sanitize(html, {
             ADD_TAGS: ['iframe'],
             ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
           })
        } catch (e) {
           console.error('Markdown parse error:', e)
           return part
        }
      })

      // Inject Token
      const token = localStorage.getItem('auth_token')
      if (token) {
        return steps.map(html => {
           return html.replace(/(src=["'])((\/public\/|\/api\/public\/)[^"']*)(["'])/g, (match, prefix, url, pathPrefix, suffix) => {
               // Force /api/public prefix for production compatibility
               let finalUrl = url;
               if (finalUrl.startsWith('/public/')) {
                   finalUrl = '/api' + finalUrl;
               }

               const separator = finalUrl.includes('?') ? '&' : '?'
               return `${prefix}${finalUrl}${separator}token=${token}${suffix}`
           })
        })
      }

      return steps
    },
    totalProblems() {
      return this.chapter?.problemIds?.length || 0
    },
    solvedCount() {
      if (!this.chapter || !this.userProgress) return 0
      const chapterData = this.userProgress.chapterProgress[this.chapter.id]
      if (!chapterData || !chapterData.solvedProblems) return 0
      
      // Count how many of the chapter's problems are in the solved list
      // problemIds in chapter are objects (populated), solvedProblems are strings (IDs)
      const solvedIds = chapterData.solvedProblems
      return this.chapter.problemIds.filter(p => solvedIds.includes(p._id)).length
    },
    progressPercentage() {
      if (this.totalProblems === 0) return 100
      return (this.solvedCount / this.totalProblems) * 100
    },
    isChapterCompleted() {
      if (!this.userProgress || !this.chapter) return false
      return this.userProgress.completedChapters.includes(this.chapter.id)
    },
    hasNextChapter() {
      // Simple check if there's a next chapter in the current level
      if (!this.level || !this.chapter) return false
      
      // Check legacy
      let idx = this.level.chapters.findIndex(c => c.id === this.chapter.id)
      if (idx !== -1) {
        return idx < this.level.chapters.length - 1
      }
      
      // Check topics
      if (this.level.topics) {
        for (let t = 0; t < this.level.topics.length; t++) {
          const topic = this.level.topics[t]
          idx = topic.chapters.findIndex(c => c.id === this.chapter.id)
          if (idx !== -1) {
            // Check next in topic
            if (idx < topic.chapters.length - 1) return true
            // Check next topic
            let nextT = t + 1
            while (nextT < this.level.topics.length) {
               if (this.level.topics[nextT].chapters && this.level.topics[nextT].chapters.length > 0) return true
               nextT++
            }
            return false
          }
        }
      }
      return false
    }
  },
  mounted() {
    this.fetchData()
    this.renderMath()
  },
  updated() {
    this.secureContent()
    this.renderMath()
  },
  methods: {
    renderMath() {
      this.$nextTick(() => {
        const container = this.$el.querySelector('.markdown-scroll-wrapper')
        if (container) {
          renderMathInElement(container, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          })
        }
      })
    },
    secureContent() {
      this.$nextTick(() => {
        const container = this.$el.querySelector('.tutorial-section')
        if (!container) return
        
        // 1. 保护视频
        const videos = container.querySelectorAll('video')
        videos.forEach(video => {
          if (!video.hasAttribute('controlsList')) {
            video.setAttribute('controlsList', 'nodownload')
          }
          video.oncontextmenu = (e) => {
            e.preventDefault()
            return false
          }
        })

        // 2. 保护图片
        const images = container.querySelectorAll('img')
        images.forEach(img => {
          img.setAttribute('draggable', 'false')
          img.oncontextmenu = (e) => {
            e.preventDefault()
            return false
          }
        })

        // 3. 保护 Iframe (PDF/PPT)
        const iframes = container.querySelectorAll('iframe')
        const token = localStorage.getItem('auth_token')

        iframes.forEach(iframe => {
          // Inject Token
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

          iframe.oncontextmenu = (e) => {
            e.preventDefault()
            return false
          }
          
          // PDF 特殊处理
          try {
            const src = iframe.getAttribute('src')
            if (src && src.toLowerCase().includes('.pdf') && !src.includes('#toolbar=0')) {
              iframe.setAttribute('src', src + '#toolbar=0')
            }
          } catch (e) {}
        })
      })
    },
    async fetchData() {
      this.loading = true
      try {
        const [levelsData, progressData] = await Promise.all([
          request('/api/course/levels'),
          request('/api/course/progress')
        ])
        
        // 1. Determine the correct Subject Context
        const selectedSubjectName = localStorage.getItem('selected_subject') || 'C++基础'
        const subjectConfig = SUBJECTS_CONFIG.find(s => s.name === selectedSubjectName)
        const realSubject = subjectConfig ? subjectConfig.realSubject : 'C++'

        // 2. Find the correct level object
        // Priority 1: Match by explicit Mongo ID from query (Most robust)
        if (this.$route.query.lid) {
             this.level = levelsData.find(l => l._id === this.$route.query.lid)
        }

        // Priority 2: Find level by chapterId (Fallback if no lid)
        if (!this.level) {
             // Helper to check if a level contains the chapter
             const hasChapter = (lvl, chId) => {
                 if (lvl.chapters && lvl.chapters.some(c => c.id === chId)) return true;
                 if (lvl.topics) {
                     return lvl.topics.some(t => t.chapters && t.chapters.some(c => c.id === chId));
                 }
                 return false;
             };

             // Filter levels by subject first
             const subjectLevels = levelsData.filter(l => l.subject === realSubject || (!l.subject && realSubject === 'C++'))
             
             // Try to find in subject levels first
             this.level = subjectLevels.find(l => hasChapter(l, this.chapterId))
             
             // If not found, try all levels
             if (!this.level) {
                 this.level = levelsData.find(l => hasChapter(l, this.chapterId))
             }
        }
        
        if (this.level) {
          // Update selected subject in localStorage based on current level
          const matchedConfig = SUBJECTS_CONFIG.find(s => {
             // Default to C++ if subject not present, or match subject
             const levelSubject = this.level.subject || 'C++'
             if (s.realSubject !== levelSubject) return false
             if (s.minLevel && this.level.level < s.minLevel) return false
             if (s.maxLevel && this.level.level > s.maxLevel) return false
             return true
          })
          
          if (matchedConfig) {
            localStorage.setItem('selected_subject', matchedConfig.name)
          }
        }
        
        this.userProgress = progressData

        // Fetch specific chapter content (Secure)
        try {
            // Pass levelId to disambiguate chapters with same ID (e.g. 1-2-1) across subjects
            const query = this.level ? `?levelId=${this.level._id}` : ''
            const chapterDetail = await request(`/api/course/chapter/${this.chapterId}${query}`)
            this.chapter = chapterDetail
            this.visibleSteps = 1
        } catch (err) {
            if (err.message.includes('locked') || err.message.includes('Access denied') || err.message.includes('403')) {
                this.showToastMessage('Chapter is locked')
                this.$router.push('/course')
                return
            }
            throw err
        }
      } catch (e) {
        this.showToastMessage('加载失败: ' + e.message)
      } finally {
        this.loading = false
      }
    },
    isSolved(problemId) {
      if (!this.userProgress || !this.chapter) return false
      const chapterData = this.userProgress.chapterProgress[this.chapter.id]
      return chapterData && chapterData.solvedProblems && chapterData.solvedProblems.includes(problemId)
    },
    getProblemLink(problem) {
      if (problem.domainId && problem.docId) {
        return `https://acjudge.com/d/${problem.domainId}/p/${problem.docId}`
      }
      return '#'
    },
    getHtmlUrl(url) {
      if (!url) return ''
      if (url.startsWith('http')) return url
      
      // If relative path, assume it's served by our backend
      // Append token for protected resources (like courseware)
      if (url.indexOf('public/courseware') !== -1) {
        // [Fix] Use /api/public prefix to ensure we hit the backend proxy in production
        // instead of being caught by the frontend router
        if (url.startsWith('/public/')) {
           url = '/api' + url
        } else if (url.startsWith('public/')) {
           url = '/api/' + url
        }

        const token = localStorage.getItem('auth_token')
        if (token) {
          const separator = url.includes('?') ? '&' : '?'
          return `${url}${separator}token=${token}`
        }
      }
      
      return url
    },
    async checkStatus(problem) {
      this.checking = problem._id
      try {
        const res = await request('/api/course/check-problem', {
          method: 'POST',
          body: JSON.stringify({
            chapterId: this.chapter.id,
            problemId: problem._id
          })
        })
        
        if (res.passed) {
          this.userProgress = res.progress
          this.showToastMessage('恭喜！检测到已通过！')
        } else {
          this.showToastMessage(res.message || '未检测到通过记录，请先去完成题目')
        }
      } catch (e) {
        this.showToastMessage('检查失败: ' + e.message)
      } finally {
        this.checking = null
      }
    },
    openSolveModal(problem) {
      this.currentProblem = problem
      this.showSolveModal = true
    },
    closeSolveModal() {
      this.showSolveModal = false
      this.currentProblem = null
    },
    async submitSolution() {
      this.submitting = true
      try {
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const res = await request('/api/course/submit-problem', {
          method: 'POST',
          body: JSON.stringify({
            chapterId: this.chapter.id,
            problemId: this.currentProblem._id,
            passed: true // Simulate success
          })
        })
        
        if (res.progress) {
          this.userProgress = res.progress
          this.showToastMessage('提交成功！')
          this.closeSolveModal()
        }
      } catch (e) {
        this.showToastMessage('提交失败: ' + e.message)
      } finally {
        this.submitting = false
      }
    },
    async completeReading() {
      this.submitting = true
      try {
        const res = await request('/api/course/complete-chapter', {
          method: 'POST',
          body: JSON.stringify({
            chapterId: this.chapter.id
          })
        })
        
        if (res.progress) {
          this.userProgress = res.progress
          this.showToastMessage('章节已完成！')
        }
      } catch (e) {
        this.showToastMessage('操作失败: ' + e.message)
      } finally {
        this.submitting = false
      }
    },
    showNextStep() {
      if (this.visibleSteps < this.parsedSteps.length) {
        this.visibleSteps++
        this.$nextTick(() => {
          const steps = document.querySelectorAll('.step-container')
          if (steps.length > 0) {
            // Scroll the last visible step into view
            steps[this.visibleSteps - 1].scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
      }
    },
    goToNextChapter() {
      if (!this.level || !this.chapter) return
      
      let nextChapter = null
      
      // Check legacy
      let idx = this.level.chapters.findIndex(c => c.id === this.chapter.id)
      if (idx !== -1 && idx < this.level.chapters.length - 1) {
        nextChapter = this.level.chapters[idx + 1]
      } else if (this.level.topics) {
        // Check topics
        for (let t = 0; t < this.level.topics.length; t++) {
          const topic = this.level.topics[t]
          idx = topic.chapters.findIndex(c => c.id === this.chapter.id)
          if (idx !== -1) {
            if (idx < topic.chapters.length - 1) {
              nextChapter = topic.chapters[idx + 1]
            } else {
              // Find next topic with chapters
              let nextT = t + 1
              while (nextT < this.level.topics.length) {
                if (this.level.topics[nextT].chapters && this.level.topics[nextT].chapters.length > 0) {
                  nextChapter = this.level.topics[nextT].chapters[0]
                  break
                }
                nextT++
              }
            }
            break
          }
        }
      }
      
      if (nextChapter) {
        this.$router.push({
            path: `/course/${nextChapter.id}`,
            query: { lid: this.level._id }
        })
      }
    },
    adjustFontSize(delta) {
      this.fontSize += delta
      if (this.fontSize < 12) this.fontSize = 12
      if (this.fontSize > 36) this.fontSize = 36
    }
  },
  watch: {
    '$route.params': {
      handler() {
        this.fetchData()
      },
      immediate: false
    }
  }
}
</script>

<style scoped>
.chapter-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  height: calc(100vh - 60px); /* Adjust based on navbar */
  display: flex;
  flex-direction: column;
}

.header-nav {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 18px;
  color: #555;
}
.btn-back {
  background: none;
  border: none;
  color: #2b9af3;
  cursor: pointer;
  font-size: 16px;
}
.btn-back:hover {
  text-decoration: underline;
}

.content-wrapper {
  display: flex;
  gap: 30px;
  flex: 1;
  overflow: hidden;
}

.tutorial-section {
  flex: 2;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  overflow-y: auto;
  position: relative; /* For watermark */
}

.watermark-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-content: space-around;
  opacity: 0.08;
  overflow: hidden;
}

.watermark-text {
  transform: rotate(-30deg);
  font-size: 24px;
  color: #000;
  font-weight: bold;
  white-space: nowrap;
  margin: 80px;
  user-select: none;
}

.chapter-title {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 28px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
}
.markdown-content {
  line-height: 1.6;
  color: #333;
}

.html-content-container {
  position: relative;
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}
.html-content-container.maximized {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
  margin: 0;
  border: none;
  background: white;
}

.markdown-content-container {
  position: relative;
  width: 100%;
  transition: all 0.3s ease;
}

.markdown-content-container.maximized {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
  padding: 40px;
  overflow: hidden; /* Scroll wrapper handles scroll */
  box-sizing: border-box;
}

.markdown-scroll-wrapper {
  /* Default for non-maximized: auto height */
}

.markdown-content-container.maximized .markdown-scroll-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 0 20px 40px 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.controls-bar {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 10000; /* Ensure it's above everything */
  display: flex;
  gap: 5px;
}

.html-content-container.maximized .controls-bar {
  position: fixed;
  top: 20px;
  right: 40px;
}

.markdown-content-container.maximized .controls-bar {
  position: fixed; /* Keep it fixed relative to viewport in fullscreen */
  top: 20px;
  right: 40px;
}

.btn-control {
  padding: 6px 12px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-control:hover {
  background: rgba(0,0,0,0.8);
}

.courseware-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.markdown-content {
  line-height: 1.8;
  color: #2c3e50;
  font-size: 18px;
}
.markdown-content h1, .markdown-content h2, .markdown-content h3 {
  margin-top: 20px;
  margin-bottom: 10px;
}
.markdown-content p {
  margin-bottom: 15px;
}
.markdown-content img, 
.markdown-content video {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 10px 0;
}
.markdown-content iframe {
  width: 100%;
  min-height: 400px;
  border: none;
  border-radius: 4px;
  margin: 10px 0;
  background: #f9f9f9;
}
.markdown-content pre {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 16px;
}
.markdown-content code {
  background: #f8f9fa;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.step-container {
  margin-bottom: 30px;
  animation: fadeIn 0.5s ease-in-out;
}

.step-action {
  margin-top: 20px;
  text-align: center;
  padding-bottom: 20px;
}

.btn-next-step {
  padding: 12px 30px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(52, 152, 219, 0.2);
  transition: all 0.3s ease;
}
.btn-next-step:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(52, 152, 219, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.problems-section {
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.problems-header {
  margin-bottom: 20px;
}
.problems-header h3 {
  margin: 0 0 10px 0;
}
.progress-bar {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}
.progress-fill {
  height: 100%;
  background: #2ecc71;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 12px;
  color: #7f8c8d;
}

.problem-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.problem-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}
.problem-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.problem-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.problem-title {
  font-weight: 600;
  color: #34495e;
  font-size: 15px;
}
.status-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  display: inline-block;
  font-weight: 500;
}
.status-badge.solved {
  background: #eafaf1;
  color: #2ecc71;
  border: 1px solid #d5f5e3;
}
.status-badge.unsolved {
  background: #f5f5f5;
  color: #95a5a6;
  border: 1px solid #eee;
}

.problem-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.btn-action {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-challenge {
  background-color: #3498db;
  color: white;
  box-shadow: 0 2px 5px rgba(52, 152, 219, 0.2);
}
.btn-challenge:hover {
  background-color: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.btn-check {
  background-color: #fff;
  color: #34495e;
  border-color: #ddd;
}
.btn-check:hover {
  background-color: #f8f9fa;
  border-color: #bbb;
  color: #2c3e50;
}
.btn-check:disabled {
  background-color: #f5f5f5;
  color: #aaa;
  cursor: not-allowed;
  border-color: #eee;
}

.icon {
  font-size: 14px;
}

.chapter-complete-msg {
  margin-top: 30px;
  padding: 15px;
  background: #eafaf1;
  border: 1px solid #2ecc71;
  border-radius: 6px;
  color: #27ae60;
  text-align: center;
}
.btn-next {
  display: block;
  margin: 10px auto 0;
  padding: 8px 20px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.reading-section {
  padding: 20px;
  text-align: center;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
}
.reading-section h3 {
  margin-top: 0;
  color: #2c3e50;
}
.reading-section p {
  color: #7f8c8d;
  margin-bottom: 20px;
}
.btn-complete-reading {
  padding: 10px 25px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}
.btn-complete-reading:hover {
  background-color: #2980b9;
}
.btn-complete-reading:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.solve-modal {
  width: 600px;
  height: 500px;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}
.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.code-editor {
  flex: 1;
  width: 100%;
  padding: 10px;
  font-family: monospace;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
}
.modal-footer {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}
.btn-submit {
  padding: 10px 25px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
.btn-submit:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}
</style>
