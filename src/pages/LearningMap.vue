<template>
  <div class="learning-map-container">
    <div class="header">
      <h1>{{ selectedSubject }} 闯关学习</h1>
      <div class="subject-selector">
        <button 
          v-for="sub in availableSubjects" 
          :key="sub"
          :class="['btn-subject', { active: selectedSubject === sub }]"
          @click="selectedSubject = sub; fetchData()"
        >
          {{ sub }}
        </button>
      </div>
      <div class="progress-summary" v-if="userProgress">
        当前等级: Level {{ getCurrentSubjectLevel() }}
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="levels-container">
      <div v-for="level in levels" :key="level._id" class="level-card">
        <div class="level-header" @click="toggleLevel(level)">
          <div class="level-info">
            <h2>
              <span class="toggle-icon">{{ isExpanded(level) ? '▼' : '▶' }}</span>
              Level {{ level.level }}
              <span class="level-title-text">{{ level.title }}</span>
            </h2>
          </div>
          <div class="level-status">
            <span v-if="isLevelCompleted(level)" class="badge completed">已完成</span>
            <span v-else-if="isLevelUnlocked(level)" class="badge unlocked">进行中</span>
            <span v-else class="badge locked">未解锁</span>
          </div>
        </div>
        
        <div v-show="isExpanded(level)" class="level-content">
          <div v-if="level.description" class="level-desc-section">
             <div class="level-desc-header" @click="toggleDesc(level)">
                <span class="toggle-icon">{{ isDescExpanded(level) ? '▼' : '▶' }}</span>
                <span class="desc-label">等级简介</span>
             </div>
             <div v-show="isDescExpanded(level)" class="level-description markdown-content" v-html="renderMarkdown(level.description)"></div>
          </div>

          <!-- Topics Rendering -->
          <div v-if="level.topics && level.topics.length > 0" class="topics-container">
            <div v-for="topic in level.topics" :key="topic._id" class="topic-section">
              <div class="topic-header" @click="toggleTopic(topic)">
                <span class="toggle-icon">{{ isTopicExpanded(topic) ? '▼' : '▶' }}</span>
                <h3>
                  {{ topic.title }}
                  <span class="topic-stats" v-if="getTopicTotalProblems(topic) > 0">({{ getTopicTotalProblems(topic) }} 题)</span>
                </h3>
              </div>
              
              <div v-show="isTopicExpanded(topic)" class="topic-content">
                <div v-if="topic.description" class="topic-desc markdown-content" v-html="renderMarkdown(topic.description)"></div>
                
                <div class="chapters-grid">
                  <div 
                    v-for="chapter in topic.chapters" 
                    :key="chapter.id" 
                    class="chapter-card"
                    :class="getChapterStatusClass(level, chapter)"
                    @click="goToChapter(level, chapter)"
                  >
                    <div class="chapter-icon">
                      <span v-if="isChapterCompleted(level, chapter)">✅</span>
                      <span v-else-if="isChapterUnlocked(level, chapter)">🔓</span>
                      <span v-else-if="isTeacherOrAdmin()">🔓</span>
                      <span v-else>🔒</span>
                    </div>
                    <div class="chapter-info">
                      <h4>
                        {{ chapter.title }}
                        <span v-if="chapter.optional" class="tag-optional">选做</span>
                        <span v-if="chapter.contentType === 'html'" class="tag-type html">HTML</span>
                        <span v-else class="tag-type markdown">MD</span>
                      </h4>
                      <p class="chapter-id">
                        Chapter {{ chapter.id }}
                        <span v-if="getChapterProblemCount(chapter) > 0"> · {{ getChapterProblemCount(chapter) }} 题</span>
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Learners Section -->
                <div class="learners-section">
                  <div class="learners-header" @click="toggleLearners(topic)">
                    <span class="toggle-icon">{{ isLearnersExpanded(topic) ? '▼' : '▶' }}</span>
                    <span class="learners-label">正在学习本课程的同学</span>
                  </div>
                  <div v-show="isLearnersExpanded(topic)" class="learners-content">
                    <div v-if="loadingLearners[topic._id]" class="loading-small">加载中...</div>
                    <div v-else-if="topicLearners[topic._id] && topicLearners[topic._id].length > 0" class="learners-grid">
                      <div 
                        v-for="user in topicLearners[topic._id]" 
                        :key="user._id" 
                        class="learner-tag" 
                        @click.stop="viewLearnerProgress(user, topic)"
                        title="点击查看进度"
                      >
                        {{ user.uname }}
                      </div>
                    </div>
                    <div v-else class="no-learners">
                      暂无同学正在学习
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Legacy Chapters Fallback -->
          <div v-else-if="level.chapters && level.chapters.length > 0" class="chapters-grid">
            <div 
              v-for="chapter in level.chapters" 
              :key="chapter.id" 
              class="chapter-card"
              :class="getChapterStatusClass(level, chapter)"
              @click="goToChapter(level, chapter)"
            >
              <div class="chapter-icon">
                <span v-if="isChapterCompleted(level, chapter)">✅</span>
                <span v-else-if="isChapterUnlocked(level, chapter)">🔓</span>
                <span v-else-if="isTeacherOrAdmin()">🔓</span>
                <span v-else>🔒</span>
              </div>
              <div class="chapter-info">
                <h3>
                  Chapter {{ chapter.id }}
                  <span v-if="chapter.optional" class="tag-optional">选做</span>
                  <span v-if="chapter.contentType === 'html'" class="tag-type html">HTML</span>
                  <span v-else class="tag-type markdown">MD</span>
                </h3>
                <p>
                  {{ chapter.title }}
                  <span v-if="getChapterProblemCount(chapter) > 0"> · {{ getChapterProblemCount(chapter) }} 题</span>
                </p>
              </div>
            </div>
          </div>
          
          <div v-else class="no-content">
            暂无内容
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Learner Progress Modal -->
    <div v-if="showLearnerModal" class="modal-overlay" @click="closeLearnerModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedLearner ? selectedLearner.uname : '学员' }} 的学习进度</h3>
          <button class="btn-close" @click="closeLearnerModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loadingLearnerProgress" class="loading">加载中...</div>
          <div v-else-if="selectedLearnerProgress" class="progress-details">
            <div class="progress-stat-card">
               <h4>当前等级</h4>
               <div class="levels-list">
                 <div v-for="(lvl, subj) in selectedLearnerProgress.subjectLevels" :key="subj" class="level-item">
                   <span class="subj-name">{{ subj }}</span>
                   <span class="lvl-val">Level {{ lvl }}</span>
                 </div>
               </div>
            </div>
            <div class="progress-stat-card" v-if="selectedLearnerTopic">
               <h4>{{ selectedLearnerTopic.title }} 进度</h4>
               <div class="stat-row">
                 <div class="stat-item">
                   <div class="stat-value">
                     {{ getLearnerTopicSolvedCount(selectedLearnerProgress, selectedLearnerTopic) }} / {{ getTopicTotalProblems(selectedLearnerTopic) }}
                     <span class="stat-label">题目</span>
                   </div>
                 </div>
                 <div class="stat-item">
                   <div class="stat-value">
                     {{ getTopicProgress(selectedLearnerProgress, selectedLearnerTopic) }} / {{ selectedLearnerTopic.chapters.length }}
                     <span class="stat-label">章节</span>
                   </div>
                 </div>
               </div>
            </div>
            <div class="progress-stat-card">
               <h4>累计完成章节</h4>
               <div class="stat-value">{{ selectedLearnerProgress.completedChaptersCount }}</div>
            </div>
          </div>
          <div v-else class="error">无法获取进度信息</div>
        </div>
      </div>
    </div>
</template>

<script>
import request from '../utils/request'
import { marked } from 'marked'

export default {
  data() {
    return {
      levels: [],
      userProgress: null,
      loading: true,
      selectedSubject: 'C++',
      availableSubjects: ['C++', 'Python', 'Web'],
      expandedLevelIds: [],
      expandedDescIds: [],
      expandedTopicIds: [],
      expandedLearnerIds: [],
      topicLearners: {}, // topicId -> user array
      loadingLearners: {}, // topicId -> boolean
      showLearnerModal: false,
      selectedLearner: null,
      selectedLearnerProgress: null,
      selectedLearnerTopic: null, // The topic context for the modal
      loadingLearnerProgress: false
    }
  },
  mounted() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const [levelsData, progressData] = await Promise.all([
          request(`/api/course/levels?subject=${encodeURIComponent(this.selectedSubject)}`),
          request('/api/course/progress')
        ])
        this.levels = levelsData
        this.userProgress = progressData
        
        // Initialize topics as collapsed by default (commented out expansion logic)
        /*
        if (this.levels) {
          this.levels.forEach(l => {
            if (l.topics) {
              l.topics.forEach(t => {
                this.expandedTopicIds.push(t._id)
              })
            }
          })
        }
        */

        this.initExpandedLevels()
      } catch (e) {
        console.error('Failed to fetch course data', e)
      } finally {
        this.loading = false
      }
    },
    initExpandedLevels() {
      const currentLevel = this.getCurrentSubjectLevel()
      // Find the level object that matches the current level
      const currentLevelObj = this.levels.find(l => l.level === currentLevel)
      
      if (currentLevelObj) {
        this.expandedLevelIds = [currentLevelObj._id]
        // this.expandedDescIds = [currentLevelObj._id]
      } else if (this.levels.length > 0) {
        // If current level is beyond the last level (completed all), expand the last one
        // Or if current level is 1 but not found (shouldn't happen if levels exist), expand first
        if (currentLevel > this.levels.length) {
           const last = this.levels[this.levels.length - 1]
           this.expandedLevelIds = [last._id]
           // this.expandedDescIds = [last._id]
        } else {
           const first = this.levels[0]
           this.expandedLevelIds = [first._id]
           // this.expandedDescIds = [first._id]
        }
      }
    },
    toggleLevel(level) {
      const id = level._id
      const index = this.expandedLevelIds.indexOf(id)
      if (index > -1) {
        this.expandedLevelIds.splice(index, 1)
      } else {
        this.expandedLevelIds.push(id)
        // Auto-expand description when opening level
        /*
        if (!this.expandedDescIds.includes(id)) {
            this.expandedDescIds.push(id)
        }
        */
      }
    },
    toggleDesc(level) {
      const id = level._id
      const index = this.expandedDescIds.indexOf(id)
      if (index > -1) {
        this.expandedDescIds.splice(index, 1)
      } else {
        this.expandedDescIds.push(id)
      }
    },
    isExpanded(level) {
      return this.expandedLevelIds.includes(level._id)
    },
    isDescExpanded(level) {
      return this.expandedDescIds.includes(level._id)
    },
    toggleTopic(topic) {
      const id = topic._id
      const index = this.expandedTopicIds.indexOf(id)
      if (index > -1) {
        this.expandedTopicIds.splice(index, 1)
      } else {
        this.expandedTopicIds.push(id)
      }
    },
    isTopicExpanded(topic) {
      return this.expandedTopicIds.includes(topic._id)
    },
    toggleLearners(topic) {
      const id = topic._id
      const index = this.expandedLearnerIds.indexOf(id)
      if (index > -1) {
        this.expandedLearnerIds.splice(index, 1)
      } else {
        this.expandedLearnerIds.push(id)
        // Fetch data if not already loaded
        if (!this.topicLearners[id]) {
          this.fetchTopicLearners(id)
        }
      }
    },
    isLearnersExpanded(topic) {
      return this.expandedLearnerIds.includes(topic._id)
    },
    async fetchTopicLearners(topicId) {
      this.loadingLearners[topicId] = true
      try {
        const users = await request(`/api/course/topic/${topicId}/learners`)
        this.topicLearners[topicId] = users
      } catch (e) {
        console.error('Failed to fetch learners', e)
      } finally {
        this.loadingLearners[topicId] = false
      }
    },
    async viewLearnerProgress(user, topic) {
      console.log('View progress for user:', user, 'in topic:', topic)
      this.selectedLearner = user
      this.selectedLearnerTopic = topic
      this.showLearnerModal = true
      this.loadingLearnerProgress = true
      this.selectedLearnerProgress = null
      
      try {
        console.log(`Fetching progress from /api/course/progress/${user._id}`)
        const progress = await request(`/api/course/progress/${user._id}`)
        console.log('Received progress:', progress)
        this.selectedLearnerProgress = progress
      } catch (e) {
        console.error('Failed to fetch learner progress', e)
      } finally {
        this.loadingLearnerProgress = false
      }
    },
    closeLearnerModal() {
      this.showLearnerModal = false
      this.selectedLearner = null
      this.selectedLearnerProgress = null
      this.selectedLearnerTopic = null
    },
    getTopicProgress(progress, topic) {
      if (!progress || !topic || !topic.chapters) return 0
      
      let completedCount = 0
      const completedIds = progress.completedChapters || []
      const completedUids = progress.completedChapterUids || []
      
      topic.chapters.forEach(chapter => {
        let isCompleted = false
        // Check UID
        if (chapter._id && completedUids.includes(chapter._id)) {
          isCompleted = true
        }
        // Check ID (Legacy)
        else if (completedIds.includes(chapter.id)) {
          isCompleted = true
        }
        
        if (isCompleted) completedCount++
      })
      
      return completedCount
    },
    getChapterProblemCount(chapter) {
      return chapter.problemIds ? chapter.problemIds.length : 0
    },
    getTopicTotalProblems(topic) {
      if (!topic || !topic.chapters) return 0
      return topic.chapters.reduce((sum, ch) => sum + this.getChapterProblemCount(ch), 0)
    },
    getLearnerTopicSolvedCount(progress, topic) {
      if (!progress || !progress.chapterProgress || !topic || !topic.chapters) return 0
      
      let solvedCount = 0
      topic.chapters.forEach(ch => {
        const chProgress = progress.chapterProgress[ch.id]
        if (chProgress && chProgress.solvedProblems) {
           solvedCount += chProgress.solvedProblems.length
        }
      })
      return solvedCount
    },
    getCurrentSubjectLevel() {
      if (!this.userProgress) return 1
      if (this.userProgress.subjectLevels && this.userProgress.subjectLevels[this.selectedSubject]) {
        return this.userProgress.subjectLevels[this.selectedSubject]
      }
      // Fallback for legacy or default
      if (this.selectedSubject === 'C++') {
        return this.userProgress.currentLevel || 1
      }
      return 1
    },
    isLevelUnlocked(level) {
      if (!this.userProgress) return false
      const lvl = level.level || level.levelId
      return lvl <= this.getCurrentSubjectLevel()
    },
    isLevelCompleted(level) {
      if (!this.userProgress) return false
      const lvl = level.level || level.levelId
      return lvl < this.getCurrentSubjectLevel()
    },
    isChapterUnlocked(level, chapter) {
      if (!this.userProgress) return false
      const lvl = level.level || level.levelId
      const currentLvl = this.getCurrentSubjectLevel()
      
      if (lvl < currentLvl) return true
      if (lvl > currentLvl) return false
      
      // Check by UID first (Robust)
      // If user has UIDs recorded, we trust UIDs exclusively for chapters that have UIDs
      if (this.userProgress.unlockedChapterUids && this.userProgress.unlockedChapterUids.length > 0 && chapter._id) {
        return this.userProgress.unlockedChapterUids.includes(chapter._id)
      }
      
      // Fallback to String ID (Legacy)
      return this.userProgress.unlockedChapters.includes(chapter.id)
    },
    isChapterCompleted(level, chapter) {
      if (!this.userProgress) return false
      
      // Check by UID first (Robust)
      // If user has UIDs recorded, we trust UIDs exclusively for chapters that have UIDs
      if (this.userProgress.completedChapterUids && this.userProgress.completedChapterUids.length > 0 && chapter._id) {
        return this.userProgress.completedChapterUids.includes(chapter._id)
      }

      // Fallback to String ID (Legacy)
      return this.userProgress.completedChapters.includes(chapter.id)
    },
    getChapterStatusClass(level, chapter) {
      if (this.isChapterCompleted(level, chapter)) return 'status-completed'
      if (this.isChapterUnlocked(level, chapter)) return 'status-unlocked'
      
      // Check if user is teacher/admin to show unlocked style visually (optional, but good UX)
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      if (userInfo.role === 'teacher' || userInfo.role === 'admin') return 'status-unlocked'

      return 'status-locked'
    },
    goToChapter(level, chapter) {
      // Allow teachers/admins to access any chapter
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      const isTeacherOrAdmin = userInfo.role === 'teacher' || userInfo.role === 'admin'

      if (!isTeacherOrAdmin && !this.isChapterUnlocked(level, chapter) && !this.isChapterCompleted(level, chapter)) {
        return // Locked
      }
      // Use level.level instead of level.levelId if levelId is not present
      const lvl = level.level || level.levelId
      this.$router.push(`/course/${lvl}/${chapter.id}`)
    },
    renderMarkdown(text) {
      if (!text) return ''
      return marked.parse(text, { breaks: true, mangle: false, headerIds: false })
    },
    isTeacherOrAdmin() {
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      return userInfo.role === 'teacher' || userInfo.role === 'admin'
    }
  }
}
</script>

<style scoped>
.learning-map-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}
.header {
  text-align: center;
  margin-bottom: 40px;
}
.header h1 {
  font-size: 36px;
  color: #2c3e50;
  margin-bottom: 10px;
}
.subject-selector {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 20px 0;
}
.btn-subject {
  padding: 10px 20px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  color: #555;
  transition: all 0.2s;
}
.btn-subject.active {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
  box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3);
}
.btn-subject:hover:not(.active) {
  background-color: #e0e0e0;
}

.progress-summary {
  font-size: 18px;
  color: #7f8c8d;
}

.levels-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.level-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  cursor: pointer;
  user-select: none;
}
.toggle-icon {
  display: inline-block;
  width: 24px;
  text-align: center;
  margin-right: 5px;
  font-size: 18px;
  color: #7f8c8d;
}
.level-info h2 {
  font-size: 24px;
  color: #34495e;
  margin: 0;
  display: flex;
  align-items: center;
}
.level-title-text {
  margin-left: 15px;
  font-size: 24px;
  color: #34495e;
  font-weight: normal;
}
.level-info p {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
}

.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}
.badge.completed { background-color: #2ecc71; color: white; }
.badge.unlocked { background-color: #3498db; color: white; }
.badge.locked { background-color: #95a5a6; color: white; }

.level-description {
  color: #555;
  margin-bottom: 25px;
  line-height: 1.5;
}

.level-desc-section {
  margin-bottom: 20px;
  background: #fcfcfc;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}
.level-desc-header {
  padding: 10px 15px;
  background: #f8f9fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #555;
  user-select: none;
  border-bottom: 1px solid transparent;
  transition: background 0.2s;
}
.level-desc-header:hover {
  background: #f0f0f0;
}
.level-desc-header .toggle-icon {
  margin-right: 8px;
  width: 20px;
  text-align: center;
  font-size: 12px;
}
.level-description {
  padding: 20px;
  border-top: 1px solid #eee;
  background: #fff;
  margin-bottom: 0; /* Override previous margin */
}

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.chapter-card {
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.chapter-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.chapter-card.status-completed {
  border-color: #2ecc71;
  background-color: #eafaf1;
}
.chapter-card.status-unlocked {
  border-color: #3498db;
  background-color: #ebf5fb;
}
.chapter-card.status-locked {
  border-color: #e0e0e0;
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.7;
}
.chapter-card.status-locked:hover {
  transform: none;
  box-shadow: none;
}

.chapter-icon {
  font-size: 24px;
  margin-bottom: 10px;
}
.chapter-info h3 {
  font-size: 16px;
  margin: 0 0 5px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.tag-optional {
  font-size: 10px;
  background-color: #9b59b6;
  color: white;
  padding: 2px 5px;
  border-radius: 4px;
  font-weight: normal;
}
.chapter-info p {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

/* Topic Styles */
.topics-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
.topic-section {
  background: #fff;
  padding-top: 10px;
}
.topic-header {
  margin-bottom: 15px;
  border-left: 4px solid #3498db;
  padding-left: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  user-select: none;
}
.topic-header:hover {
  opacity: 0.8;
}
.topic-header .toggle-icon {
  margin-right: 8px;
  width: 20px;
  text-align: center;
  font-size: 14px;
  color: #3498db;
}

/* Learners Section Styles */
.learners-section {
  margin-top: 25px;
  border-top: 1px dashed #eee;
  padding-top: 15px;
}
.learners-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #7f8c8d;
  font-size: 14px;
  user-select: none;
  margin-bottom: 10px;
}
.learners-header:hover {
  color: #3498db;
}
.learners-header .toggle-icon {
  margin-right: 5px;
  width: 16px;
  text-align: center;
}
.learners-content {
  padding-left: 20px;
  animation: slideDown 0.3s ease-out;
}
.loading-small {
  font-size: 12px;
  color: #95a5a6;
  padding: 10px 0;
}
.learners-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 0;
}
.learner-tag {
  background-color: #f0f2f5;
  color: #555;
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e0e0;
  user-select: none;
}
.learner-tag:hover {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
  transform: translateY(-1px);
}
.no-learners {
  font-size: 12px;
  color: #bdc3c7;
  padding: 10px 0;
  font-style: italic;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* Ensure it's on top */
  backdrop-filter: blur(2px); /* Optional: adds a nice blur effect */
}
.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
  position: relative;
  z-index: 10000;
}
.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}
.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #95a5a6;
  cursor: pointer;
  line-height: 1;
}
.btn-close:hover {
  color: #e74c3c;
}
.modal-body {
  padding: 20px;
}
.progress-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.progress-stat-card {
  background: #fcfcfc;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
}
.progress-stat-card h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.levels-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.level-item {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  color: #2c3e50;
  border-bottom: 1px dashed #eee;
  padding-bottom: 5px;
}
.level-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.stat-row {
  display: flex;
  gap: 20px;
}
.stat-item {
  flex: 1;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #3498db;
}
.stat-label {
  font-size: 14px;
  font-weight: normal;
  color: #95a5a6;
  margin-left: 5px;
}

.topic-stats {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: normal;
  margin-left: 8px;
}

.markdown-content :deep(ul), .markdown-content :deep(ol) {
  padding-left: 20px;
}

.tag-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
  font-weight: bold;
  border: 1px solid;
}
.tag-type.html {
  color: #e67e22;
  border-color: #e67e22;
  background: #fff5eb;
}
.tag-type.markdown {
  color: #3498db;
  border-color: #3498db;
  background: #ebf5fb;
}
</style>
