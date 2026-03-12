<template>
  <div class="chapter-detail-container">
    <div class="header-nav">
      <button @click="$router.push('/course')" class="btn-back">← 学习地图</button>
      <button v-if="currentTopic" @click="goBackToTopic" class="btn-back-topic">📚 {{ currentTopic.title }}</button>
      <span v-if="level && chapter" class="nav-title">{{ chapter.title }}</span>
      <button v-if="canEdit && chapter" @click="openEditMode" class="btn-edit-chapter">✏️ 编辑此章节</button>
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

        <!-- View mode toggle: shown when multiple content types exist -->
        <div v-if="availableTabs.length > 1" class="view-toggle-bar">
          <button v-if="availableTabs.includes('ppt')" :class="['btn-view-toggle', { active: viewMode === 'ppt' }]" @click="viewMode = 'ppt'">🖥 PPT 课件</button>
          <button v-if="availableTabs.includes('md')" :class="['btn-view-toggle', { active: viewMode === 'md' }]" @click="viewMode = 'md'">📄 教案</button>
          <button v-if="availableTabs.includes('video')" :class="['btn-view-toggle', { active: viewMode === 'video' }]" @click="viewMode = 'video'">🎬 视频</button>
        </div>

        <!-- HTML Content Mode -->
        <div v-if="viewMode === 'ppt' && chapter.resourceUrl" :class="['html-content-container', { maximized: isMaximized }]">
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
        <div v-if="viewMode === 'md'" :class="['markdown-content-container', { maximized: isMaximized }]">
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

        <!-- Video Content Mode -->
        <div v-if="viewMode === 'video' && currentVideo">
          <!-- 多视频选择器 -->
          <div v-if="videoList.length > 1" class="video-selector-bar">
            <button
              v-for="(url, idx) in videoList"
              :key="idx"
              :class="['btn-video-tab', { active: currentVideoIndex === idx }]"
              @click="currentVideoIndex = idx">
              {{ isBilibiliVideo(url) ? '🎬' : '🎥' }} 视频{{ idx + 1 }}
            </button>
          </div>
          <!-- Bilibili 嵌入（带保护层） -->
          <template v-if="isBilibiliVideo(currentVideo)">
            <div class="lesson-video-iframe-wrap">
              <iframe
                ref="bilibiliIframeRef"
                :src="getBilibiliEmbedUrl(currentVideo)"
                class="lesson-video-iframe"
                frameborder="0"
                allowfullscreen
                scrolling="no"
                allow="autoplay; encrypted-media; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-modals allow-fullscreen">
              </iframe>
              <!-- 拦截顶部 B站 Logo/标题点击，防止跳转 -->
              <div class="bilibili-click-blocker bilibili-click-blocker-top"></div>
              <!-- 透明遗罩：拦截右键，左键穿透给 iframe -->
              <div class="bilibili-rclick-blocker" @contextmenu.prevent @mousedown="handleBilibiliOverlay"></div>
            </div>
            <div class="lesson-video-toolbar">
              <button class="lesson-video-fs-btn" @click="requestBilibiliFullscreen">⛶ 全屏播放</button>
            </div>
          </template>
          <!-- 直链视频 -->
          <template v-else>
            <video
              ref="directVideoRef"
              :src="currentVideo"
              controls
              controlsList="nodownload"
              class="direct-video"
              @contextmenu.prevent
              @loadedmetadata="reapplySpeed">
            </video>
            <div class="lesson-video-toolbar">
              <span class="speed-label">倍速：</span>
              <button
                v-for="s in [1, 1.25, 1.5, 1.75, 2]"
                :key="s"
                class="lesson-video-speed-btn"
                :class="{ active: currentSpeed === s }"
                @click="setSpeed(s)">
                {{ s }}x
              </button>
            </div>
          </template>
        </div>
      </div>
      <div class="problems-section">
        <div v-if="totalProblems > 0">
          <div class="problems-header">
            <h3>必做挑战</h3>
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

        <!-- Optional Section -->
        <div v-if="chapter.optionalProblemIds && chapter.optionalProblemIds.length > 0" class="optional-section" style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 16px;">
          <div class="problems-header" style="margin-bottom: 12px;">
            <h3>选做挑战 <span style="font-size: 12px; font-weight: normal; color: #64748b;">(额外练习，不计入进度)</span></h3>
          </div>
          <div class="problem-list">
            <div v-for="problem in chapter.optionalProblemIds" :key="problem._id" class="problem-item">
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

        <div v-if="totalProblems === 0" class="reading-section">
          <h3>学习任务</h3>
          <p>请仔细阅读左侧教程内容，观看相关视频。</p>
          <div v-if="!isChapterCompleted" class="action-area">
            <button @click="completeReading" class="btn-complete-reading" :disabled="submitting">
              {{ submitting ? '提交中...' : '我已完成阅读/观看' }}
            </button>
          </div>
        </div>

        <!-- Homework Section -->
        <div v-if="chapter.homeworkIds && chapter.homeworkIds.length > 0" class="homework-section" style="margin-top: 24px; border-top: 1px dashed #fde68a; padding-top: 16px;">
          <div class="problems-header" style="margin-bottom: 12px;">
            <h3>📝 关联作业</h3>
          </div>
          <div class="problem-list">
            <div v-for="hid in chapter.homeworkIds" :key="hid" class="problem-item">
              <div class="problem-info">
                <span class="problem-title">{{ contestInfo[hid] ? (hid.split(':')[0] + ': ' + contestInfo[hid].title) : hid }}</span>
                <span v-if="contestInfo[hid] && contestInfo[hid].score !== null"
                      class="status-badge solved">得分: {{ contestInfo[hid].score }}</span>
                <span v-else-if="contestInfo[hid] && !contestInfo[hid].attend"
                      class="status-badge unsolved">未参加</span>
              </div>
              <div class="problem-actions">
                <a :href="getContestLink(hid, 'homework')" target="_blank" class="btn-action btn-homework">
                  <span class="icon">📋</span> 去作业
                </a>
                <button @click="checkContestScore(hid, 'homework')" class="btn-action btn-check"
                        :disabled="checkingContest === hid">
                  <span class="icon">🔄</span> {{ checkingContest === hid ? '查询中...' : '查看分数' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Exam Section -->
        <div v-if="chapter.examIds && chapter.examIds.length > 0" class="exam-section" style="margin-top: 24px; border-top: 1px dashed #f5d0fe; padding-top: 16px;">
          <div class="problems-header" style="margin-bottom: 12px;">
            <h3>📊 关联考试</h3>
          </div>
          <div class="problem-list">
            <div v-for="eid in chapter.examIds" :key="eid" class="problem-item">
              <div class="problem-info">
                <span class="problem-title">{{ contestInfo[eid] ? (eid.split(':')[0] + ': ' + contestInfo[eid].title) : eid }}</span>
                <span v-if="contestInfo[eid] && contestInfo[eid].score !== null"
                      class="status-badge solved">得分: {{ contestInfo[eid].score }}</span>
                <span v-else-if="contestInfo[eid] && !contestInfo[eid].attend"
                      class="status-badge unsolved">未参加</span>
              </div>
              <div class="problem-actions">
                <a :href="getContestLink(eid, 'exam')" target="_blank" class="btn-action btn-exam">
                  <span class="icon">📊</span> 去考试
                </a>
                <button @click="checkContestScore(eid, 'exam')" class="btn-action btn-check"
                        :disabled="checkingContest === eid">
                  <span class="icon">🔄</span> {{ checkingContest === eid ? '查询中...' : '查看分数' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isChapterCompleted" class="chapter-complete-msg">
          🎉 恭喜！本章已完成。
          <button @click="goToNextChapter" class="btn-next" v-if="hasNextChapter">下一章 →</button>
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
      viewMode: 'ppt',
      currentSpeed: 1,
      currentVideoIndex: 0,
      loading: true,
      level: null,
      allLevels: [],
      chapter: null,
      userProgress: null,
      submitting: false,
      isMaximized: false,
      fontSize: 18,
      checking: null,
      visibleSteps: 1,
      contestInfo: {},      // { [id]: { title, score, attend } }
      checkingContest: null // id of contest being queried
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
    canEdit() {
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return u.role === 'admin' || u.role === 'teacher'
      } catch { return false }
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
    availableTabs() {
      if (!this.chapter) return []
      const tabs = []
      if (this.chapter.resourceUrl) tabs.push('ppt')
      if (this.chapter.content) tabs.push('md')
      if (this.videoList.length > 0) tabs.push('video')
      return tabs
    },
    videoList() {
      return (this.chapter?.videoUrl || '').split('\n').map(s => s.trim()).filter(Boolean)
    },
    currentVideo() {
      return this.videoList[this.currentVideoIndex] || ''
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
    currentTopic() {
      if (!this.level?.topics || !this.chapter) return null
      return this.level.topics.find(t => t.chapters?.some(c => c.id === this.chapter.id)) || null
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
      // 有必做题目：必须全部做对，completedChapters 标记不能绕过
      if (this.totalProblems > 0) {
        return this.solvedCount >= this.totalProblems
      }
      // 无题目章节：依赖显式完成标记（点击"我已完成阅读/观看"）
      return this.userProgress.completedChapters.includes(this.chapter.id)
    },
    hasNextChapter() {
      // Simple check if there's a next chapter in the current level
      if (!this.level || !this.chapter) return false
      
      // Check legacy
      let idx = this.level.chapters.findIndex(c => c.id === this.chapter.id)
      if (idx !== -1) {
        if (idx < this.level.chapters.length - 1) return true
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
            break
          }
        }
      }

      // Check next level
      if (this.allLevels.length > 0) {
          let contextLevels = []
          if (this.level.group) {
              contextLevels = this.allLevels.filter(l => l.group === this.level.group)
          } else {
              const currentSubject = this.level.subject || 'C++'
              contextLevels = this.allLevels.filter(l => !l.group && (l.subject || 'C++') === currentSubject)
          }
          
          contextLevels.sort((a, b) => a.level - b.level)
          
          const currentLevelIdx = contextLevels.findIndex(l => l._id === this.level._id)
          if (currentLevelIdx !== -1 && currentLevelIdx < contextLevels.length - 1) {
              const nextLevel = contextLevels[currentLevelIdx + 1]
              if (nextLevel.topics && nextLevel.topics.length > 0) {
                  return nextLevel.topics.some(t => t.chapters && t.chapters.length > 0)
              }
              if (nextLevel.chapters && nextLevel.chapters.length > 0) return true
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
    isBilibiliVideo(url) {
      if (!url) return false
      const s = url.trim()
      // 纯 BV 号，如 BV1teP4zUEzN
      if (/^BV[a-zA-Z0-9]+$/.test(s)) return true
      return s.includes('bilibili.com') || s.includes('b23.tv')
    },
    getBilibiliEmbedUrl(url) {
      if (!url) return ''
      const s = url.trim()
      // 纯 BV 号
      if (/^BV[a-zA-Z0-9]+$/.test(s)) {
        return `//player.bilibili.com/player.html?bvid=${s}&high_quality=1&danmaku=0`
      }
      // 已经是嵌入链接
      if (s.includes('player.bilibili.com')) return s
      // URL 中提取 BV 号
      const bvMatch = s.match(/BV[a-zA-Z0-9]+/)
      if (bvMatch) {
        return `//player.bilibili.com/player.html?bvid=${bvMatch[0]}&high_quality=1&danmaku=0`
      }
      // av 号
      const avMatch = s.match(/av(\d+)/i)
      if (avMatch) {
        return `//player.bilibili.com/player.html?aid=${avMatch[1]}&high_quality=1&danmaku=0`
      }
      return s
    },
    handleBilibiliOverlay(e) {
      if (e.button === 2) return
      const el = e.currentTarget
      el.style.pointerEvents = 'none'
      setTimeout(() => { el.style.pointerEvents = 'auto' }, 200)
    },
    setSpeed(speed) {
      this.currentSpeed = speed
      const el = this.$refs.directVideoRef
      if (el) el.playbackRate = speed
    },

    reapplySpeed() {
      const el = this.$refs.directVideoRef
      if (el) el.playbackRate = this.currentSpeed
    },
    requestBilibiliFullscreen() {
      const el = this.$refs.bilibiliIframeRef
      if (!el) return
      try {
        if (el.requestFullscreen) el.requestFullscreen()
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
        else if (el.msRequestFullscreen) el.msRequestFullscreen()
      } catch (e) {}
    },
    goBackToTopic() {
      const topic = this.currentTopic
      if (topic) {
        localStorage.setItem('learning_map_last_node', JSON.stringify({
          type: 'topic',
          id: topic._id || null,
          levelId: this.level?._id || null,
          title: topic.title
        }))
      }
      this.$router.push('/course')
    },
    openEditMode() {
      if (!this.chapter) return
      localStorage.setItem('pending_edit_node', JSON.stringify({
        type: 'chapter',
        id: this.chapter._id,
        docId: this.chapter.id,
        levelId: this.$route.query.lid || undefined
      }))
      localStorage.setItem('pending_edit_return', this.$route.fullPath)
      this.$router.push('/course')
    },
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
        this.allLevels = levelsData
        
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
            this.currentVideoIndex = 0
            if (chapterDetail.resourceUrl) {
              this.viewMode = 'ppt'
            } else if (chapterDetail.content) {
              this.viewMode = 'md'
            } else if (chapterDetail.videoUrl) {
              this.viewMode = 'video'
            } else {
              this.viewMode = 'md'
            }
        } catch (err) {
            if (err.message.includes('locked') || err.message.includes('Access denied') || err.message.includes('403')) {
                this.showToastMessage('Chapter is locked')
                this.$router.push('/course')
                return
            }
            throw err
        }
        // Fetch contest/homework titles and user scores in background
        this.contestInfo = {}
        this.fetchContestInfos()
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
    getContestLink(idStr, type) {
      if (!idStr) return '#'
      let domain = 'system'
      let cid = idStr
      if (idStr.includes(':')) {
        [domain, cid] = idStr.split(':')
      }
      const pathSegment = type === 'exam' ? 'contest' : type
      return `https://acjudge.com/d/${domain}/${pathSegment}/${cid}`
    },
    async fetchContestInfos() {
      const ids = [
        ...(this.chapter.homeworkIds || []).map(id => ({ id, type: 'homework' })),
        ...(this.chapter.examIds || []).map(id => ({ id, type: 'exam' }))
      ]
      if (!ids.length) return
      await Promise.all(ids.map(async ({ id, type }) => {
        try {
          const res = await request(`/api/course/contest-info?id=${encodeURIComponent(id)}&type=${type}`)
          this.contestInfo = { ...this.contestInfo, [id]: res }
        } catch (e) {
          this.contestInfo = { ...this.contestInfo, [id]: { title: id, score: null, attend: false } }
        }
      }))
    },
    async checkContestScore(id, type) {
      this.checkingContest = id
      try {
        const res = await request(`/api/course/contest-info?id=${encodeURIComponent(id)}&type=${type}`)
        this.contestInfo = { ...this.contestInfo, [id]: res }
        if (res.score !== null) {
          this.showToastMessage(`${res.title}: ${res.score} 分`)
        } else if (!res.attend) {
          this.showToastMessage('暂无参加记录')
        } else {
          this.showToastMessage('暂无得分记录')
        }
      } catch (e) {
        this.showToastMessage('查询失败: ' + e.message)
      } finally {
        this.checkingContest = null
      }
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
      let nextLevelId = this.level._id
      
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
      
      // If not found in current level, check next level
      if (!nextChapter && this.allLevels.length > 0) {
          let contextLevels = []
          if (this.level.group) {
              contextLevels = this.allLevels.filter(l => l.group === this.level.group)
          } else {
              const currentSubject = this.level.subject || 'C++'
              contextLevels = this.allLevels.filter(l => !l.group && (l.subject || 'C++') === currentSubject)
          }
          
          contextLevels.sort((a, b) => a.level - b.level)
          
          const currentLevelIdx = contextLevels.findIndex(l => l._id === this.level._id)
          if (currentLevelIdx !== -1 && currentLevelIdx < contextLevels.length - 1) {
              const nextLevel = contextLevels[currentLevelIdx + 1]
              
              if (nextLevel.topics && nextLevel.topics.length > 0) {
                  for (const t of nextLevel.topics) {
                      if (t.chapters && t.chapters.length > 0) {
                          nextChapter = t.chapters[0]
                          break
                      }
                  }
              } else if (nextLevel.chapters && nextLevel.chapters.length > 0) {
                  nextChapter = nextLevel.chapters[0]
              }
              
              if (nextChapter) {
                  nextLevelId = nextLevel._id
              }
          }
      }
      
      if (nextChapter) {
        this.$router.push({
            path: `/course/${nextChapter.id}`,
            query: { lid: nextLevelId }
        })
      } else {
        this.showToastMessage('这是本课程的最后一章')
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
  height: calc(100vh - 52px);
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
  white-space: nowrap;
}
.btn-back:hover {
  text-decoration: underline;
}
.btn-back-topic {
  background: #2b9af3;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 5px 14px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-back-topic:hover {
  background: #1a7fd4;
}
.nav-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  color: #333;
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

.btn-homework {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
  box-shadow: 0 2px 5px rgba(251, 191, 36, 0.15);
}
.btn-homework:hover {
  background-color: #fde68a;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(251, 191, 36, 0.25);
}

.btn-exam {
  background-color: #fdf4ff;
  color: #701a75;
  border-color: #e9d5ff;
  box-shadow: 0 2px 5px rgba(192, 86, 220, 0.15);
}
.btn-exam:hover {
  background-color: #f3e8ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(192, 86, 220, 0.25);
}

.contest-link-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contest-link-item {
  display: flex;
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

/* View mode toggle */
.view-toggle-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.btn-view-toggle {
  padding: 6px 18px;
  border-radius: 20px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-view-toggle.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  font-weight: 600;
}
.btn-view-toggle:hover:not(.active) {
  background: #e2e8f0;
  color: #334155;
}

/* Video content container */
.video-content-container {
  position: relative;
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  background: #000;
  transition: all 0.3s ease;
}
.video-content-container.maximized {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
  margin: 0;
  border: none;
}
.video-content-container.maximized .controls-bar {
  position: fixed;
  top: 20px;
  right: 40px;
}
.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.direct-video {
  width: 100%;
  display: block;
  max-height: 540px;
  background: #000;
  border-radius: 8px;
  outline: none;
  margin-bottom: 4px;
}

/* Bilibili 视频保护层 */
.lesson-video-iframe-wrap {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  background: #000;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}
.lesson-video-iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border: none;
}
/* 全局透明遗罩：拦截右键，左键自动穿透给 iframe */
.bilibili-rclick-blocker {
  position: absolute;
  top: 0; left: 0; right: 0;
  bottom: 28%; /* 露出底部播放器控件栏＋倒速弹出面板 */
  z-index: 3;
  background: transparent;
  pointer-events: auto;
}
/* 拦截 B站顶部 Logo/标题点击区域 */
.bilibili-click-blocker {
  position: absolute;
  left: 0;
  width: 100%;
  z-index: 2;
  cursor: default;
  background: transparent;
  pointer-events: auto;
}
.bilibili-click-blocker-top {
  top: 0;
  height: 12%;
}
/* 底部工具栏 */
.lesson-video-toolbar {
  background: #1a1a2e;
  border-radius: 0 0 8px 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}
.lesson-video-fs-btn {
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}
.lesson-video-fs-btn:hover {
  background: rgba(255,255,255,0.2);
}
.speed-label {
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  margin-right: 2px;
  white-space: nowrap;
}
.lesson-video-speed-btn {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.lesson-video-speed-btn:hover {
  background: rgba(255,255,255,0.18);
  color: #fff;
}
.lesson-video-speed-btn.active {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}
/* 多视频切换选项卡 */
.video-selector-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 0 6px;
  margin-bottom: 4px;
}
.btn-video-tab {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.75);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 6px;
  padding: 5px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.btn-video-tab:hover {
  background: rgba(255,255,255,0.15);
  color: #fff;
}
.btn-video-tab.active {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

</style>
