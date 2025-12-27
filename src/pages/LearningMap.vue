<template>
  <div class="learning-map-container">
    <div class="course-layout">
      <!-- Left Sidebar: Tree Navigation -->
      <div class="course-sidebar">
        <div class="sidebar-header">
          <h3>课程目录</h3>
        </div>
        <div v-if="loading" class="loading-text">加载中...</div>
        <div v-else class="tree-nav">
          <div v-for="group in treeData" :key="group.name" class="tree-group">
            <!-- Group Node -->
            <div 
              class="tree-item group-item" 
              :class="{ active: selectedNode && selectedNode.type === 'group' && selectedNode.id === group.name }"
              @click="handleGroupClick(group)"
            >
              <span class="tree-icon" @click.stop="toggleGroup(group)">{{ group.collapsed ? '▶' : '▼' }}</span>
              <span class="tree-label">{{ group.title || group.name }}</span>
            </div>

            <!-- Levels -->
            <div v-show="!group.collapsed" class="tree-children">
              <div v-for="level in group.levels" :key="level._id" class="tree-level">
                <div 
                  class="tree-item level-item"
                  :class="{ active: selectedNode && selectedNode.type === 'level' && selectedNode.id === level._id }"
                  @click="handleLevelClick(level)"
                >
                  <span class="tree-icon" @click.stop="toggleLevel(level)">{{ level.collapsed ? '▶' : '▼' }}</span>
                  <span class="tree-label">{{ level.title }}</span>
                  <span v-if="isLevelCompleted(level)" class="status-dot completed" title="已完成">●</span>
                  <span v-else-if="isLevelUnlocked(level)" class="status-dot unlocked" title="进行中">●</span>
                  <span v-else class="status-dot locked" title="未解锁">●</span>
                </div>

                <!-- Topics -->
                <div v-show="!level.collapsed" class="tree-children">
                  <div v-for="topic in level.topics" :key="topic._id" class="tree-topic">
                    <div 
                      class="tree-item topic-item"
                      :class="{ active: selectedNode && selectedNode.type === 'topic' && selectedNode.id === topic._id }"
                      @click="selectNode('topic', topic, level)"
                    >
                      <span class="tree-label">{{ topic.title }}</span>
                    </div>
                  </div>
                  <div v-if="!level.topics || level.topics.length === 0" class="empty-node">暂无内容</div>
                </div>
              </div>
              <div v-if="!group.levels || group.levels.length === 0" class="empty-node">暂无课程</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Content Area -->
      <div class="course-content">
        <div v-if="loading" class="loading">加载中...</div>
        
        <!-- Group View -->
        <div v-else-if="selectedNode && selectedNode.type === 'group'" class="content-view group-view">
          <div class="view-header">
            <h1>{{ selectedData.title || selectedData.name }}</h1>
            <div class="progress-badge" v-if="userProgress">
              当前进度: {{ getLevelTitle(selectedData.name, getCurrentSubjectLevel(selectedData.name)) || ('Level ' + getCurrentSubjectLevel(selectedData.name)) }}
            </div>
          </div>
          <div class="levels-grid">
            <div v-for="level in selectedData.levels" :key="level._id" class="level-card-mini" @click="selectNode('level', level)">
              <div class="level-mini-header">
                <h3>{{ level.title }}</h3>
                <span v-if="isLevelCompleted(level)" class="badge completed">已完成</span>
                <span v-else-if="isLevelUnlocked(level)" class="badge unlocked">进行中</span>
                <span v-else class="badge locked">未解锁</span>
              </div>
              <p class="level-mini-desc" v-if="level.description">{{ stripMarkdown(level.description) }}</p>
              <div class="level-mini-stats">
                {{ level.topics ? level.topics.length : 0 }} 个知识点
              </div>
            </div>
          </div>
        </div>

        <!-- Level View -->
        <div v-else-if="selectedNode && selectedNode.type === 'level'" class="content-view level-view">
          <div class="view-header">
            <div class="breadcrumb">
              <span @click="selectNode('group', findGroup(selectedData.group))">{{ selectedData.group }}</span> / {{ selectedData.title }}
            </div>
            <h1>{{ selectedData.title }}</h1>
            <div class="level-status">
              <span v-if="isLevelCompleted(selectedData)" class="badge completed">已完成</span>
              <span v-else-if="isLevelUnlocked(selectedData)" class="badge unlocked">进行中</span>
              <span v-else class="badge locked">未解锁</span>
            </div>
          </div>
          
          <div v-if="selectedData.description" class="description-box markdown-content" v-html="renderMarkdown(selectedData.description)"></div>

          <div class="topics-list">
            <div v-for="topic in selectedData.topics" :key="topic._id" class="topic-card" @click="selectNode('topic', topic, selectedData)">
              <div class="topic-card-header">
                <h3>{{ topic.title }}</h3>
                <div class="topic-stats-group">
                    <span class="topic-count" title="已完成章节 / 总章节">{{ getTopicProgress(userProgress, topic) }} / {{ (topic.chapters || []).length }} 章节</span>
                    <span class="topic-count" title="题目总数">{{ getTopicTotalProblems(topic) }} 题</span>
                </div>
              </div>
              <div class="topic-card-desc" v-if="topic.description">{{ stripMarkdown(topic.description) }}</div>
              <div class="topic-chapters-preview">
                <span v-for="chapter in (topic.chapters || []).slice(0, 3)" :key="chapter.id" class="chapter-dot" :class="getChapterStatusClass(selectedData, chapter)"></span>
                <span v-if="(topic.chapters || []).length > 3" class="more-dots">...</span>
              </div>
            </div>
          </div>

          <!-- Learners Section (Level) -->
          <div class="learners-section">
            <div class="learners-header" @click="toggleLevelLearners(selectedData)">
              <span class="toggle-icon">{{ isLevelLearnersExpanded(selectedData) ? '▼' : '▶' }}</span>
              <span class="learners-label">正在学习本等级的同学</span>
            </div>
            <div v-show="isLevelLearnersExpanded(selectedData)" class="learners-content">
              <div v-if="loadingLearners[selectedData._id]" class="loading-small">加载中...</div>
              <div v-else-if="levelLearners[selectedData._id] && levelLearners[selectedData._id].length > 0" class="learners-grid">
                <div 
                  v-for="learner in levelLearners[selectedData._id]" 
                  :key="learner._id" 
                  class="learner-card"
                  @click.stop="viewLearnerProgress(learner, null)" 
                >
                  <div class="learner-avatar">{{ learner.uname ? learner.uname.charAt(0).toUpperCase() : '?' }}</div>
                  <div class="learner-info">
                    <div class="learner-name">{{ learner.uname }}</div>
                    <div class="learner-detail" v-if="learner.completedCount !== undefined">已完成 {{ learner.completedCount }} 节</div>
                  </div>
                </div>
              </div>
              <div v-else class="no-learners">暂无同学记录</div>
            </div>
          </div>
        </div>

        <!-- Topic View -->
        <div v-else-if="selectedNode && selectedNode.type === 'topic'" class="content-view topic-view">
          <div class="view-header">
            <div class="breadcrumb">
              <span @click="selectNode('group', findGroup(selectedLevel.group))">{{ selectedLevel.group }}</span> / 
              <span @click="selectNode('level', selectedLevel)">{{ selectedLevel.title }}</span> / 
              {{ selectedData.title }}
            </div>
            <h1>{{ selectedData.title }}</h1>
          </div>

          <div v-if="selectedData.description" class="description-box markdown-content" v-html="renderMarkdown(selectedData.description)"></div>

          <div class="chapters-grid">
            <div 
              v-for="chapter in selectedData.chapters" 
              :key="chapter.id" 
              class="chapter-card"
              :class="getChapterStatusClass(selectedLevel, chapter)"
              @click="goToChapter(selectedLevel, chapter)"
            >
              <div class="chapter-icon">
                <span v-if="isChapterCompleted(selectedLevel, chapter)">✅</span>
                <span v-else-if="isChapterUnlocked(selectedLevel, chapter)">🔓</span>
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
            <div class="learners-header" @click="toggleLearners(selectedData)">
              <span class="toggle-icon">{{ isLearnersExpanded(selectedData) ? '▼' : '▶' }}</span>
              <span class="learners-label">正在学习本课程的同学</span>
            </div>
            <div v-show="isLearnersExpanded(selectedData)" class="learners-content">
              <div v-if="loadingLearners[selectedData._id]" class="loading-small">加载中...</div>
              <div v-else-if="topicLearners[selectedData._id] && topicLearners[selectedData._id].length > 0" class="learners-grid">
                <div 
                  v-for="learner in topicLearners[selectedData._id]" 
                  :key="learner._id" 
                  class="learner-card"
                  @click.stop="viewLearnerProgress(learner, selectedData)"
                >
                  <div class="learner-avatar">{{ learner.uname ? learner.uname.charAt(0).toUpperCase() : '?' }}</div>
                  <div class="learner-info">
                    <div class="learner-name">{{ learner.uname }}</div>
                    <div class="learner-detail" v-if="learner.completedCount !== undefined">已完成 {{ learner.completedCount }} 节</div>
                  </div>
                </div>
              </div>
              <div v-else class="no-learners">暂无同学记录</div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          请在左侧选择课程
        </div>
      </div>
    </div>

    <!-- Learner Progress Modal -->
    <div v-if="showLearnerModal" class="modal-overlay" @click.self="closeLearnerModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedLearner ? selectedLearner.uname : '' }} 的学习进度</h3>
          <button class="btn-close" @click="closeLearnerModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loadingLearnerProgress" class="loading">加载中...</div>
          <div v-else-if="selectedLearnerProgress" class="progress-details">
            <div class="progress-stat-card">
               <h4>当前等级</h4>
               <div class="levels-list">
                 <div v-for="(lvl, subj) in selectedLearnerProgress.subjectLevels" :key="subj" class="stat-level-item">
                   <div class="stat-level-header">
                     <span class="stat-subj-name">{{ subj }}</span>
                     <span class="stat-lvl-badge">Lv.{{ lvl }}</span>
                   </div>
                   <div class="stat-lvl-title">{{ getLevelTitle(subj, lvl) || '未知等级' }}</div>
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
  </div>
</template>

<script>
import request from '../utils/request'
import { marked } from 'marked'
import { SUBJECTS_CONFIG, getRealSubject } from '../utils/courseConfig'

export default {
  data() {
    return {
      treeData: [], // Groups -> Levels -> Topics
      userProgress: null,
      loading: true,
      selectedNode: null, // { type: 'group'|'level'|'topic', id: ... }
      selectedData: null, // The actual data object
      selectedLevel: null, // Context for topic view
      
      // Expansion states
      expandedGroupIds: [],
      expandedLevelIds: [],
      expandedLearnerIds: [],
      
      topicLearners: {},
      levelLearners: {},
      loadingLearners: {},
      showLearnerModal: false,
      selectedLearner: null,
      selectedLearnerProgress: null,
      selectedLearnerTopic: null,
      loadingLearnerProgress: false,
      isInitialLoad: true
    }
  },
  watch: {
    selectedNode(newVal) {
      if (newVal) {
        localStorage.setItem('learning_map_last_node', JSON.stringify(newVal))
      }
    }
  },
  mounted() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const [groupsData, levelsData, progressData] = await Promise.all([
          request('/api/course/groups'),
          request('/api/course/levels'),
          request('/api/course/progress')
        ])
        
        this.userProgress = progressData
        this.buildTree(groupsData, levelsData)
        
        // Restore selection or default
        this.restoreSelection()
        
      } catch (e) {
        console.error('Failed to fetch course data', e)
      } finally {
        this.loading = false
      }
    },
    buildTree(groups, levels) {
      // 1. Map groups
      const groupMap = {}
      groups.forEach(g => {
        groupMap[g.name] = { ...g, levels: [], collapsed: true }
      })
      
      // 2. Handle levels
      const orphanedLevels = []
      levels.forEach(l => {
        const levelData = { ...l, collapsed: true } // Default collapsed
        if (l.group && groupMap[l.group]) {
          groupMap[l.group].levels.push(levelData)
        } else {
          // Try to find group by name if not in DB groups (legacy/virtual)
          if (l.group) {
             if (!groupMap[l.group]) {
                 groupMap[l.group] = { name: l.group, title: l.group, levels: [], collapsed: true, order: 999 }
             }
             groupMap[l.group].levels.push(levelData)
          } else {
             // Default to C++基础 if no group
             const defaultGroup = 'C++基础'
             if (!groupMap[defaultGroup]) {
                 groupMap[defaultGroup] = { name: defaultGroup, title: defaultGroup, levels: [], collapsed: true, order: 0 }
             }
             groupMap[defaultGroup].levels.push(levelData)
          }
        }
      })
      
      // 3. Sort
      this.treeData = Object.values(groupMap).sort((a, b) => (a.order || 0) - (b.order || 0))
      this.treeData.forEach(g => {
        g.levels.sort((a, b) => a.level - b.level)
      })
    },
    restoreSelection() {
      const saved = localStorage.getItem('learning_map_last_node')
      if (saved) {
        try {
          const node = JSON.parse(saved)
          if (node.type === 'group') {
             const group = this.treeData.find(g => g.name === node.id)
             if (group) this.selectNode('group', group)
          } else if (node.type === 'level') {
             for (const g of this.treeData) {
                const l = g.levels.find(lvl => lvl._id === node.id)
                if (l) {
                    g.collapsed = false // Ensure parent expanded
                    this.selectNode('level', l)
                    break
                }
             }
          } else if (node.type === 'topic') {
             for (const g of this.treeData) {
                for (const l of g.levels) {
                   const t = l.topics.find(top => top._id === node.id)
                   if (t) {
                       g.collapsed = false
                       l.collapsed = false
                       this.selectNode('topic', t, l)
                       break
                   }
                }
             }
          }
        } catch (e) {}
      }
      
      // Default: Select first group if nothing selected
      if (!this.selectedNode && this.treeData.length > 0) {
        this.selectNode('group', this.treeData[0])
      }
    },
    selectNode(type, data, parentLevel = null, preventExpand = false) {
      this.selectedNode = { type, id: data._id || data.name }
      this.selectedData = data
      if (type === 'topic') {
        this.selectedLevel = parentLevel
      }
      
      // Auto expand tree to show selection
      if (type === 'group' && !preventExpand) {
          data.collapsed = false
      }
    },
    handleGroupClick(group) {
        group.collapsed = !group.collapsed
        this.selectNode('group', group, null, true)
    },
    handleLevelClick(level) {
        level.collapsed = !level.collapsed
        this.selectNode('level', level)
    },
    toggleGroup(group) {
      group.collapsed = !group.collapsed
    },
    toggleLevel(level) {
      level.collapsed = !level.collapsed
    },
    findGroup(groupName) {
        return this.treeData.find(g => g.name === groupName)
    },
    stripMarkdown(text) {
        if (!text) return ''
        return text.replace(/[#*`]/g, '').slice(0, 100) + (text.length > 100 ? '...' : '')
    },
    
    toggleLevelLearners(level) {
      const id = level._id
      const index = this.expandedLearnerIds.indexOf(id)
      if (index > -1) {
        this.expandedLearnerIds.splice(index, 1)
      } else {
        this.expandedLearnerIds.push(id)
        if (!this.levelLearners[id]) {
          this.fetchLevelLearners(id)
        }
      }
    },
    isLevelLearnersExpanded(level) {
      return this.expandedLearnerIds.includes(level._id)
    },
    async fetchLevelLearners(levelId) {
      this.loadingLearners[levelId] = true
      try {
        const users = await request(`/api/course/level/${levelId}/learners`)
        // Vue 3 reactivity
        this.levelLearners[levelId] = users
      } catch (e) {
        console.error('Failed to fetch level learners', e)
      } finally {
        this.loadingLearners[levelId] = false
      }
    },

    // ... Keep existing helper methods ...
    toggleLearners(topic) {
      const id = topic._id
      const index = this.expandedLearnerIds.indexOf(id)
      if (index > -1) {
        this.expandedLearnerIds.splice(index, 1)
      } else {
        this.expandedLearnerIds.push(id)
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
      this.selectedLearner = user
      this.selectedLearnerTopic = topic
      this.showLearnerModal = true
      this.loadingLearnerProgress = true
      this.selectedLearnerProgress = null
      try {
        const progress = await request(`/api/course/progress/${user._id}`)
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
        if (chapter._id && completedUids.includes(chapter._id)) isCompleted = true
        else if (completedIds.includes(chapter.id)) isCompleted = true
        if (isCompleted) completedCount++
      })
      return completedCount
    },
    getLevelTitle(subject, levelNum) {
      // 1. Try to find group by name (Direct match)
      let group = this.treeData.find(g => g.name === subject)
      if (group) {
          const level = group.levels.find(l => l.level === levelNum)
          if (level) return level.title
      }

      // 2. Fallback: Search all groups for a matching level
      // This handles cases where Group Name != Subject Name (e.g. Group="C++基础", Subject="C++")
      for (const g of this.treeData) {
          const level = g.levels.find(l => l.level === levelNum && (l.subject === subject || (!l.subject && subject === 'C++')))
          if (level) return level.title
      }
      
      return ''
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
    getCurrentSubjectLevel(subjectName) {
      if (!this.userProgress) return 1
      const realSubject = getRealSubject(subjectName)
      if (this.userProgress.subjectLevels && this.userProgress.subjectLevels[realSubject]) {
        return this.userProgress.subjectLevels[realSubject]
      }
      if (realSubject === 'C++') {
        return this.userProgress.currentLevel || 1
      }
      return 1
    },
    isLevelUnlocked(level) {
      if (!this.userProgress) return false
      const lvl = level.level || level.levelId
      return lvl <= this.getCurrentSubjectLevel(level.group)
    },
    isLevelCompleted(level) {
      if (!this.userProgress) return false
      let chapters = []
      if (level.topics && level.topics.length > 0) {
        level.topics.forEach(t => {
          if (t.chapters) chapters.push(...t.chapters)
        })
      } else if (level.chapters) {
        chapters = level.chapters
      }
      if (chapters.length > 0) {
        const requiredChapters = chapters.filter(c => !c.optional)
        if (requiredChapters.length > 0) {
          return requiredChapters.every(c => this.isChapterCompleted(level, c))
        }
      }
      const lvl = level.level || level.levelId
      return lvl < this.getCurrentSubjectLevel(level.group)
    },
    isChapterUnlocked(level, chapter) {
      if (!this.userProgress) return false
      const lvl = level.level || level.levelId
      const currentLvl = this.getCurrentSubjectLevel(level.group)
      if (lvl < currentLvl) return true
      if (level.topics) {
        for (const topic of level.topics) {
          if (topic.chapters && topic.chapters.length > 0) {
            const firstChap = topic.chapters[0]
            if (firstChap === chapter || firstChap.id === chapter.id) return true
            if (firstChap._id && chapter._id && firstChap._id === chapter._id) return true
          }
        }
      }
      if (this.userProgress.unlockedChapterUids && this.userProgress.unlockedChapterUids.length > 0 && chapter._id) {
        return this.userProgress.unlockedChapterUids.includes(chapter._id)
      }
      return this.userProgress.unlockedChapters.includes(chapter.id)
    },
    isChapterCompleted(level, chapter) {
      if (!this.userProgress) return false
      if (this.userProgress.completedChapterUids && this.userProgress.completedChapterUids.length > 0 && chapter._id) {
        return this.userProgress.completedChapterUids.includes(chapter._id)
      }
      return this.userProgress.completedChapters.includes(chapter.id)
    },
    getChapterStatusClass(level, chapter) {
      if (this.isChapterCompleted(level, chapter)) return 'status-completed'
      if (this.isChapterUnlocked(level, chapter)) return 'status-unlocked'
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      if (userInfo.role === 'teacher' || userInfo.role === 'admin') return 'status-unlocked'
      return 'status-locked'
    },
    goToChapter(level, chapter) {
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      const isTeacherOrAdmin = userInfo.role === 'teacher' || userInfo.role === 'admin'
      if (!isTeacherOrAdmin && !this.isChapterUnlocked(level, chapter) && !this.isChapterCompleted(level, chapter)) {
        return
      }

      // Update selected subject context to ensure ChapterDetail finds the correct level
      if (level.group) {
        localStorage.setItem('selected_subject', level.group)
      }

      this.$router.push({
        path: `/course/${chapter.id}`,
        query: { lid: level._id }
      })
    },
    renderMarkdown(text) {
      if (!text) return ''
      try {
        return marked.parse(text, { 
          breaks: true,
          mangle: false,
          headerIds: false
        })
      } catch (e) {
        console.error('Markdown render error:', e)
        return text
      }
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
  height: calc(100vh - 60px); /* Adjust based on navbar height */
  overflow: hidden;
  background: #f5f7fa;
}

.course-layout {
  display: flex;
  height: 100%;
}

/* Sidebar */
.course-sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.tree-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.tree-item {
  padding: 10px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  font-size: 14px;
  color: #34495e;
  position: relative;
}
.tree-item:hover {
  background: #f8f9fa;
}
.tree-item.active {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}
.tree-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #1976d2;
}

.group-item {
  font-weight: 600;
  font-size: 15px;
}
.level-item {
  padding-left: 30px;
}
.topic-item {
  padding-left: 50px;
  font-size: 13px;
  color: #555;
}

.tree-icon {
  width: 20px;
  text-align: center;
  margin-right: 5px;
  font-size: 12px;
  color: #95a5a6;
}

.status-dot {
  margin-left: auto;
  font-size: 10px;
}
.status-dot.completed { color: #2ecc71; }
.status-dot.unlocked { color: #3498db; }
.status-dot.locked { color: #bdc3c7; }

/* Content Area */
.course-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px 40px;
  background: #f5f7fa;
}

.view-header {
  margin-bottom: 30px;
}
.breadcrumb {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 10px;
}
.breadcrumb span {
  cursor: pointer;
  color: #3498db;
}
.breadcrumb span:hover {
  text-decoration: underline;
}

.view-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #2c3e50;
}

.description-box {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 30px;
  color: #555;
  line-height: 1.6;
}

/* Grid Layouts */
.levels-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.level-card-mini {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
}
.level-card-mini:hover {
  transform: translateY(-2px);
  border-color: #3498db;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}
.level-mini-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.level-mini-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}
.level-mini-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
  line-height: 1.6;
}
.level-mini-stats {
  font-size: 13px;
  color: #95a5a6;
  text-align: right;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.topic-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
  border-left: 4px solid #3498db;
}
.topic-card:hover {
  box-shadow: 0 5px 15px rgba(0,0,0,0.08);
}
.topic-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.topic-card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}
.topic-stats-group {
  display: flex;
  gap: 8px;
}
.topic-count {
  font-size: 13px;
  color: #7f8c8d;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 10px;
}
.topic-card-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}
.topic-chapters-preview {
  display: flex;
  gap: 5px;
  align-items: center;
}
.chapter-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #eee;
}
.chapter-dot.status-completed { background: #2ecc71; }
.chapter-dot.status-unlocked { background: #3498db; }
.chapter-dot.status-locked { background: #e0e0e0; }
.more-dots { font-size: 12px; color: #999; }

/* Reused Chapter Card Styles */
.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.chapter-card {
  background: white;
  border: 1px solid #eee;
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
.chapter-card.status-completed { border-top: 3px solid #2ecc71; }
.chapter-card.status-unlocked { border-top: 3px solid #3498db; }
.chapter-card.status-locked { border-top: 3px solid #bdc3c7; opacity: 0.7; }

.chapter-icon { font-size: 24px; margin-bottom: 10px; }
.chapter-info h4 { margin: 0 0 5px 0; font-size: 15px; color: #2c3e50; }
.chapter-id { font-size: 12px; color: #95a5a6; }

/* Badges */
.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}
.badge.completed { background-color: #eafaf1; color: #2ecc71; }
.badge.unlocked { background-color: #ebf5fb; color: #3498db; }
.badge.locked { background-color: #f5f5f5; color: #95a5a6; }

.progress-badge {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

/* Learners */
.learners-section { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
.learners-header { cursor: pointer; color: #7f8c8d; font-size: 14px; display: flex; align-items: center; }
.learners-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 15px; }

.learner-card {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.learner-card:hover {
  background: white;
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transform: translateY(-2px);
}
.learner-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-right: 10px;
  font-size: 14px;
}
.learner-info {
  flex: 1;
  overflow: hidden;
}
.learner-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.learner-detail {
  font-size: 11px;
  color: #95a5a6;
  margin-top: 2px;
}

/* Modal Stats */
.stat-level-item {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}
.stat-level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.stat-subj-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}
.stat-lvl-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
}
.stat-lvl-title {
  font-size: 13px;
  color: #7f8c8d;
}

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; width: 400px; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-header { padding: 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-body { padding: 20px; }
.btn-close { background: none; border: none; font-size: 20px; cursor: pointer; }

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #95a5a6;
  font-size: 16px;
}

.empty-node {
  padding: 8px 15px;
  color: #bdc3c7;
  font-size: 13px;
  font-style: italic;
}

.tree-children > .empty-node {
    padding-left: 45px;
}

.tree-children .tree-children > .empty-node {
    padding-left: 65px;
}

.learner-progress-badge {
  font-size: 10px;
  margin-left: 4px;
  opacity: 0.8;
}
</style>