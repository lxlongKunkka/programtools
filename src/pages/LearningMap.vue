<template>
  <div class="learning-map-container" :class="{ 'is-edit-mode': editMode }">
    <div class="course-layout">
      <!-- Left: tree navigation -->
      <CourseSidebar
        :tree-data="treeData"
        :selected-node="selectedNode"
        :edit-mode="editMode"
        :edit-mode-node="editModeNode"
        :user-progress="userProgress"
        @select-group="g => selectNode('group', g, null, true)"
        @select-level="l => selectNode('level', l)"
        @select-topic="(t, l) => selectNode('topic', t, l)"
        @select-chapter="selectChapterInTree"
      />

      <!-- Right: content area -->
      <div class="course-content">
        <!-- Embedded Design editor (edit mode) -->
        <Design
          v-if="editMode"
          ref="designer"
          embedded
          :hide-sidebar="true"
          :initial-node="editModeNode"
          @close="onDesignClose"
        />

        <template v-else>
          <div v-if="loading" class="loading">加载中...</div>

          <GroupView
            v-else-if="selectedNode && selectedNode.type === 'group'"
            :group="selectedData"
            :user-progress="userProgress"
            :tree-data="treeData"
            @select-level="l => selectNode('level', l)"
            @enter-edit="enterEditMode"
          />

          <LevelView
            v-else-if="selectedNode && selectedNode.type === 'level'"
            :level="selectedData"
            :user-progress="userProgress"
            :tree-data="treeData"
            @select-topic="(t, l) => selectNode('topic', t, l)"
            @select-group="name => selectNode('group', findGroup(name))"
            @enter-edit="enterEditMode"
            @view-learner="viewLearnerProgress"
          />

          <TopicView
            v-else-if="selectedNode && selectedNode.type === 'topic'"
            :topic="selectedData"
            :level="selectedLevel"
            :user-progress="userProgress"
            :tree-data="treeData"
            @go-to-chapter="goToChapter"
            @enter-edit-chapter="enterEditModeForChapter"
            @select-level="l => selectNode('level', l)"
            @select-group="name => selectNode('group', findGroup(name))"
            @view-learner="viewLearnerProgress"
            @enter-edit="enterEditMode"
          />

          <div v-else class="empty-state">请在左侧选择课程</div>
        </template>
      </div>
    </div>

    <LearnerModal
      :show="showLearnerModal"
      :learner="selectedLearner"
      :loading="loadingLearnerProgress"
      :progress="selectedLearnerProgress"
      :active-levels="learnerActiveLevels"
      @close="closeLearnerModal"
    />
  </div>
</template>

<script>
import request from '../utils/request'
import { getChapterStatusClass } from '../utils/courseUtils'
import { defineAsyncComponent } from 'vue'
import CourseSidebar from '../components/course/CourseSidebar.vue'
import GroupView     from '../components/course/GroupView.vue'
import LevelView     from '../components/course/LevelView.vue'
import TopicView     from '../components/course/TopicView.vue'
import LearnerModal  from '../components/course/LearnerModal.vue'

// Lazy-load the heavy Design editor — students never load it
const Design = defineAsyncComponent(() => import('./Design.vue'))

export default {
  components: { CourseSidebar, GroupView, LevelView, TopicView, LearnerModal, Design },

  data() {
    return {
      treeData: [],
      userProgress: null,
      loading: true,
      editMode: false,
      editModeNode: null,
      selectedNode: null,
      selectedData: null,
      selectedLevel: null,
      // Learner modal state
      showLearnerModal: false,
      selectedLearner: null,
      selectedLearnerProgress: null,
      selectedLearnerTopic: null,
      loadingLearnerProgress: false,
      isInitialLoad: true
    }
  },

  computed: {
    isAdmin() {
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return u.role === 'admin'
      } catch { return false }
    },

    // Computes active levels for the LearnerModal progress display
    learnerActiveLevels() {
      if (!this.selectedLearnerProgress || !this.treeData) return []
      const activeLevels = []
      const p = this.selectedLearnerProgress
      const completedIds  = new Set(p.completedChapters || [])
      const completedUids = new Set(p.completedChapterUids || [])
      const isDone = c => (c._id && completedUids.has(c._id)) || completedIds.has(c.id)

      this.treeData.forEach(group => {
        if (!group.levels) return
        group.levels.forEach(level => {
          const levelData = { title: level.title, group: group.name, levelNum: level.level, topics: [] }
          let hasProgress = false
          if (level.topics && level.topics.length > 0) {
            level.topics.forEach(topic => {
              const total = topic.chapters ? topic.chapters.length : 0
              if (total === 0) return
              const completed = topic.chapters.filter(c => isDone(c)).length
              if (completed > 0) {
                hasProgress = true
                levelData.topics.push({
                  title: topic.title, completed, total,
                  percentage: Math.round((completed / total) * 100)
                })
              }
            })
          }
          if (hasProgress) activeLevels.push(levelData)
        })
      })
      return activeLevels
    }
  },

  watch: {
    selectedNode(newVal) {
      if (newVal) localStorage.setItem('learning_map_last_node', JSON.stringify(newVal))
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
        this.restoreSelection()
      } catch (e) {
        console.error('Failed to fetch course data', e)
      } finally {
        this.loading = false
      }
    },

    buildTree(groups, levels) {
      const groupMap = {}
      groups.forEach(g => {
        groupMap[g.name] = { ...g, levels: [], collapsed: true, problemCount: 0 }
      })
      levels.forEach(l => {
        const levelData = {
          ...l,
          collapsed: true,
          problemCount: 0,
          topics: (l.topics || []).map(t => ({ ...t, problemCount: 0 }))
        }
        const gName = l.group || 'C++基础'
        if (!groupMap[gName]) {
          groupMap[gName] = { name: gName, title: gName, levels: [], collapsed: true, order: l.group ? 999 : 0 }
        }
        groupMap[gName].levels.push(levelData)
      })

      this.treeData = Object.values(groupMap).sort((a, b) => (a.order || 0) - (b.order || 0))
      this.treeData.forEach(g => {
        g.levels.sort((a, b) => a.level - b.level)
        let groupCount = 0
        g.levels.forEach(l => {
          let levelCount = 0
          ;(l.topics || []).forEach(t => {
            let topicCount = 0
            ;(t.chapters || []).forEach(c => {
              topicCount += (c.problemIds ? c.problemIds.length : 0)
              topicCount += (c.optionalProblemIds ? c.optionalProblemIds.length : 0)
            })
            t.problemCount = topicCount
            levelCount += topicCount
          })
          l.problemCount = levelCount
          groupCount += levelCount
        })
        g.problemCount = groupCount
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
              if (l) { g.collapsed = false; this.selectNode('level', l); break }
            }
          } else if (node.type === 'topic') {
            for (const g of this.treeData) {
              for (const l of g.levels) {
                const t = l.topics.find(top => top._id === node.id)
                if (t) { g.collapsed = false; l.collapsed = false; this.selectNode('topic', t, l); break }
              }
            }
          }
        } catch (e) {}
      }
      if (!this.selectedNode && this.treeData.length > 0) {
        this.selectNode('group', this.treeData[0])
      }
      // Check if redirected here from ChapterDetail edit button
      const pendingEditRaw = localStorage.getItem('pending_edit_node')
      if (pendingEditRaw) {
        try {
          const pending = JSON.parse(pendingEditRaw)
          localStorage.removeItem('pending_edit_node')
          this.editMode = true
          this.$nextTick(() => { this.editModeNode = pending })
        } catch (e) {}
      }
    },

    selectNode(type, data, parentLevel = null, preventExpand = false) {
      if (!data) return
      this.selectedNode = { type, id: data._id || data.name }
      this.selectedData = data
      if (type === 'topic') this.selectedLevel = parentLevel
      if (type === 'group' && !preventExpand) data.collapsed = false
      if (this.editMode) this.editModeNode = { type, id: data._id || data.name }
    },

    enterEditMode() {
      if (this.selectedNode) {
        this.editModeNode = { type: this.selectedNode.type, id: this.selectedNode.id }
      }
      this.editMode = true
    },

    enterEditModeForChapter(chapter, level, topic) {
      if (level && topic) {
        this.selectedNode = { type: 'topic', id: topic._id }
        this.selectedData = topic
        this.selectedLevel = level
      }
      this.editMode = true
      this.$nextTick(() => {
        this.editModeNode = { type: 'chapter', id: chapter._id || chapter.id }
      })
    },

    selectChapterInTree(chapter, level, topic) {
      if (!this.editMode) {
        this.selectedNode = { type: 'topic', id: topic._id }
        this.selectedData = topic
        this.selectedLevel = level
        this.editMode = true
        this.$nextTick(() => {
          this.editModeNode = { type: 'chapter', id: chapter._id || chapter.id }
        })
      } else {
        this.editModeNode = { type: 'chapter', id: chapter._id || chapter.id }
      }
    },

    findGroup(groupName) {
      return this.treeData.find(g => g.name === groupName)
    },

    goToChapter(level, chapter) {
      if (getChapterStatusClass(level, chapter, this.userProgress, this.treeData) === 'status-locked') return
      if (level && level.group) localStorage.setItem('selected_subject', level.group)
      this.$router.push({ path: `/course/${chapter.id}`, query: { lid: level ? level._id : undefined } })
    },

    async viewLearnerProgress(user) {
      this.selectedLearner = user
      this.showLearnerModal = true
      this.loadingLearnerProgress = true
      this.selectedLearnerProgress = null
      try {
        this.selectedLearnerProgress = await request(`/api/course/progress/${user._id}`)
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

    onDesignClose() {
      this.editMode = false
      this.editModeNode = null
      const returnPath = localStorage.getItem('pending_edit_return')
      if (returnPath) {
        localStorage.removeItem('pending_edit_return')
        this.$router.push(returnPath)
        return
      }
      this.fetchData()
    }
  }
}
</script>

<style scoped>
.learning-map-container {
  height: calc(100vh - 52px);
  overflow: hidden;
  background: #f5f7fa;
  position: relative;
}

.course-layout {
  display: flex;
  height: 100%;
}

.course-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px 40px;
  background: #f5f7fa;
}

/* Edit mode: Design editor fills the content area */
.is-edit-mode .course-content {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #95a5a6;
  font-size: 16px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #95a5a6;
}
</style>
