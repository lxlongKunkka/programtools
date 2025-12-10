<template>
  <div class="chapter-detail-container">
    <div class="header-nav">
      <button @click="$router.push('/course')" class="btn-back">← 返回学习地图</button>
      <span v-if="level">Level {{ level.level }} - Chapter {{ chapterId }}</span>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!chapter" class="error">章节不存在</div>
    <div v-else class="content-wrapper">
      
      <!-- Left: Tutorial Content -->
      <div class="tutorial-section">
        <h1 class="chapter-title">{{ chapter.title }}</h1>
        
        <div v-for="(stepHtml, index) in parsedSteps" :key="index">
          <div v-if="index < visibleSteps" class="markdown-content step-container" v-html="stepHtml"></div>
        </div>
        
        <div v-if="parsedSteps.length > visibleSteps" class="step-action">
          <button @click="showNextStep" class="btn-next-step">
            点击继续阅读 ({{ visibleSteps }}/{{ parsedSteps.length }}) ↓
          </button>
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
                <a :href="getProblemLink(problem)" target="_blank" class="btn-solve btn-link">
                  去挑战 ↗
                </a>
                <button @click="checkStatus(problem)" class="btn-solve btn-check" :disabled="checking === problem._id">
                  {{ checking === problem._id ? '检查中...' : '检查状态' }}
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
    levelId() {
      return parseInt(this.$route.params.levelId)
    },
    chapterId() {
      return this.$route.params.chapterId // String ID
    },
    parsedSteps() {
      if (!this.chapter || !this.chapter.content) return []
      // Split content by "===NEXT===" (case insensitive, allowing whitespace)
      return this.chapter.content.split(/\n\s*===\s*NEXT\s*===\s*\n/i).map(part => marked(part))
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
      if (!this.level) return false
      const idx = this.level.chapters.findIndex(c => c.id === this.chapter.id)
      return idx !== -1 && idx < this.level.chapters.length - 1
    }
  },
  mounted() {
    this.fetchData()
  },
  updated() {
    this.secureContent()
  },
  methods: {
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
        iframes.forEach(iframe => {
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
        
        // Find the correct level and chapter
        // Note: levelsData returns all levels. We filter by level number.
        this.level = levelsData.find(l => l.level === this.levelId)
        
        if (this.level) {
          this.chapter = this.level.chapters.find(c => c.id === this.chapterId)
          this.visibleSteps = 1
        }
        
        this.userProgress = progressData
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
      if (!this.level) return
      const idx = this.level.chapters.findIndex(c => c.id === this.chapter.id)
      if (idx !== -1 && idx < this.level.chapters.length - 1) {
        const nextChapter = this.level.chapters[idx + 1]
        this.$router.push(`/course/${this.level.level}/${nextChapter.id}`)
        // Need to reload data because we are reusing the component
        // Or watch $route
      }
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

.markdown-content {
  line-height: 1.6;
  color: #2c3e50;
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
}
.markdown-content code {
  background: #f8f9fa;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
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
  border-radius: 6px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.problem-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.problem-title {
  font-weight: 600;
  color: #34495e;
}
.status-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}
.status-badge.solved {
  background: #eafaf1;
  color: #2ecc71;
}
.status-badge.unsolved {
  background: #f5f5f5;
  color: #95a5a6;
}

.btn-solve {
  padding: 6px 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.btn-solve:hover {
  background-color: #2980b9;
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
