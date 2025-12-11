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
            </h2>
            <p>{{ level.title }}</p>
          </div>
          <div class="level-status">
            <span v-if="isLevelCompleted(level)" class="badge completed">已完成</span>
            <span v-else-if="isLevelUnlocked(level)" class="badge unlocked">进行中</span>
            <span v-else class="badge locked">未解锁</span>
          </div>
        </div>
        
        <div v-show="isExpanded(level)" class="level-content">
          <div class="level-description markdown-content" v-html="renderMarkdown(level.description)"></div>

          <!-- Topics Rendering -->
          <div v-if="level.topics && level.topics.length > 0" class="topics-container">
            <div v-for="topic in level.topics" :key="topic._id" class="topic-section">
              <div class="topic-header">
                <h3>{{ topic.title }}</h3>
                <div v-if="topic.description" class="topic-desc markdown-content" v-html="renderMarkdown(topic.description)"></div>
              </div>
              
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
                    <span v-else>🔒</span>
                  </div>
                  <div class="chapter-info">
                    <h4>
                      {{ chapter.title }}
                      <span v-if="chapter.optional" class="tag-optional">选做</span>
                    </h4>
                    <p class="chapter-id">Chapter {{ chapter.id }}</p>
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
                <span v-else>🔒</span>
              </div>
              <div class="chapter-info">
                <h3>
                  Chapter {{ chapter.id }}
                  <span v-if="chapter.optional" class="tag-optional">选做</span>
                </h3>
                <p>{{ chapter.title }}</p>
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
      expandedLevelIds: []
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
      } else if (this.levels.length > 0) {
        // If current level is beyond the last level (completed all), expand the last one
        // Or if current level is 1 but not found (shouldn't happen if levels exist), expand first
        if (currentLevel > this.levels.length) {
           this.expandedLevelIds = [this.levels[this.levels.length - 1]._id]
        } else {
           this.expandedLevelIds = [this.levels[0]._id]
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
      }
    },
    isExpanded(level) {
      return this.expandedLevelIds.includes(level._id)
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
      if (this.userProgress.unlockedChapterUids && chapter._id) {
        if (this.userProgress.unlockedChapterUids.includes(chapter._id)) return true
      }
      
      // Fallback to String ID (Legacy)
      return this.userProgress.unlockedChapters.includes(chapter.id)
    },
    isChapterCompleted(level, chapter) {
      if (!this.userProgress) return false
      
      // Check by UID first (Robust)
      if (this.userProgress.completedChapterUids && chapter._id) {
        if (this.userProgress.completedChapterUids.includes(chapter._id)) return true
      }

      // Fallback to String ID (Legacy)
      return this.userProgress.completedChapters.includes(chapter.id)
    },
    getChapterStatusClass(level, chapter) {
      if (this.isChapterCompleted(level, chapter)) return 'status-completed'
      if (this.isChapterUnlocked(level, chapter)) return 'status-unlocked'
      return 'status-locked'
    },
    goToChapter(level, chapter) {
      if (!this.isChapterUnlocked(level, chapter) && !this.isChapterCompleted(level, chapter)) {
        return // Locked
      }
      // Use level.level instead of level.levelId if levelId is not present
      const lvl = level.level || level.levelId
      this.$router.push(`/course/${lvl}/${chapter.id}`)
    },
    renderMarkdown(text) {
      if (!text) return ''
      return marked(text)
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
  margin: 0 0 5px 0;
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
}
.topic-header h3 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 5px 0;
}
.topic-desc {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0;
}
.chapter-info h4 {
  font-size: 16px;
  margin: 0 0 5px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.chapter-id {
  font-size: 12px;
  color: #95a5a6;
  margin: 0;
}
.no-content {
  text-align: center;
  color: #bdc3c7;
  padding: 20px;
  font-style: italic;
}

.markdown-content {
  line-height: 1.6;
  color: #2c3e50;
}
.markdown-content :deep(p) {
  margin-bottom: 10px;
}
.markdown-content :deep(ul), .markdown-content :deep(ol) {
  padding-left: 20px;
  margin-bottom: 10px;
}
</style>
