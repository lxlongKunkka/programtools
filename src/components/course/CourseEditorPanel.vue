<template>
  <div class="course-editor-panel">
    <!-- Editor Panel (full width, no sidebar) -->
    <div class="editor-panel">
      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑<span v-if="isAdmin">，或点击“添加分组”开始</span>。</p>
      </div>

      <div v-else class="editor-layout">
        <!-- 右侧操作栏 -->
        <div class="editor-action-sidebar">
          <button @click="$emit('close')" class="eas-btn eas-exit">← 退出编辑</button>

          <template v-if="selectedNode.type === 'group'">
            <template v-if="canEditGroup(editingGroup)">
              <button @click="saveGroup" class="eas-btn eas-save">💾 保存更改</button>
              <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="eas-btn eas-delete">🗑 删除分组</button>
              <div class="eas-divider"></div>
              <button v-if="editingGroup._id" @click="moveGroup('up')" class="eas-btn eas-move">↑ 上移</button>
              <button v-if="editingGroup._id" @click="moveGroup('down')" class="eas-btn eas-move">↓ 下移</button>
              <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="eas-btn eas-download">⬇️ 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
          </template>

          <template v-if="selectedNode.type === 'level'">
            <template v-if="canEditLevel(editingLevel)">
              <button @click="saveLevel" class="eas-btn eas-save">💾 保存更改</button>
              <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="eas-btn eas-delete">🗑 删除模块</button>
              <div class="eas-divider"></div>
              <button v-if="editingLevel._id" @click="moveLevel('up')" class="eas-btn eas-move">↑ 上移</button>
              <button v-if="editingLevel._id" @click="moveLevel('down')" class="eas-btn eas-move">↓ 下移</button>
              <button v-if="editingLevel._id && isAdmin" @click="downloadLevelMaterials" class="eas-btn eas-download">⬇️ 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
            <div class="eas-divider"></div>
            <label class="eas-label">AI 模型</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>

          <template v-if="selectedNode.type === 'topic'">
            <template v-if="canEditLevel(editingLevelForTopic)">
              <button @click="saveTopic" class="eas-btn eas-save">💾 保存更改</button>
              <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-delete">🗑 删除知识点</button>
              <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-warn">🧹 清空章节</button>
              <div class="eas-divider"></div>
              <button v-if="editingTopic._id" @click="moveTopic('up')" class="eas-btn eas-move">↑ 上移</button>
              <button v-if="editingTopic._id" @click="moveTopic('down')" class="eas-btn eas-move">↓ 下移</button>
              <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="eas-btn eas-download">⬇️ 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
            <div class="eas-divider"></div>
            <label class="eas-label">AI 模型</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>

          <template v-if="selectedNode.type === 'chapter'">
            <template v-if="canEditLevel(editingLevelForChapter)">
              <button @click="saveChapter" class="eas-btn eas-save">💾 保存更改</button>
              <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="eas-btn eas-delete">🗑 删除章节</button>
              <div class="eas-divider"></div>
              <button v-if="!editingChapter.isNew" @click="moveChapter('up')" class="eas-btn eas-move">↑ 上移</button>
              <button v-if="!editingChapter.isNew" @click="moveChapter('down')" class="eas-btn eas-move">↓ 下移</button>
              <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="eas-btn eas-download">⬇️ 下载 {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
            <div class="eas-divider"></div>
            <label class="eas-label">AI 模型</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>
        </div>

        <!-- 主内容区 -->
        <div class="editor-main-area">

          <GroupEditor
            v-if="selectedNode.type === 'group'"
            :group="editingGroup"
            :isAdmin="isAdmin"
            :canEdit="canEditGroup(editingGroup)"
            :teachers="teachers"
            :languageOptions="languageOptions"
          />

          <LevelEditor
            v-if="selectedNode.type === 'level'"
            :level="editingLevel"
            :isAdmin="isAdmin"
            :teachers="teachers"
            :aiLoading="currentAiLoading"
            :aiStatus="currentAiStatus"
            :onResetAi="resetAiStatus"
            :onBatchLessonPlans="batchGenerateLevelLessonPlans"
            :onBatchPpts="batchGenerateLevelPPTs"
            :onBatchSolutionReports="batchGenerateLevelSolutionReports"
          />

          <TopicEditor
            v-if="selectedNode.type === 'topic'"
            :topic="editingTopic"
            :aiLoading="currentAiLoading"
            :aiStatus="currentAiStatus"
            :onResetAi="resetAiStatus"
            :onGenerateDesc="generateTopicDescription"
            :onGenerateChapters="generateTopicChapters"
            :onBatchLessonPlans="batchGenerateLessonPlans"
            :onBatchPpts="batchGeneratePPTs"
            :onBatchSolutionPlans="batchGenerateSolutionPlans"
            :onBatchSolutionReports="batchGenerateSolutionReports"
          />

          <ChapterEditor
            v-if="selectedNode.type === 'chapter'"
            :chapter="editingChapter"
            :isAdmin="isAdmin"
            :aiLoading="currentAiLoading"
            :aiStatus="currentAiStatus"
            v-model:aiRequirements="aiRequirements"
            :problemLinks="problemLinks"
            :optionalProblemLinks="optionalProblemLinks"
            :homeworkLinks="homeworkLinks"
            :examLinks="examLinks"
            :onResetAi="resetAiStatus"
            :onGenerateLessonPlan="generateLessonPlan"
            :onGeneratePpt="generatePPT"
            :onGenerateSolutionPlan="generateSolutionPlan"
            :onGenerateSolutionReport="generateSolutionReport"
          />

        </div><!-- /editor-main-area -->
      </div><!-- /editor-layout -->

    </div>
  </div>
</template>

<script>
import { request } from '../../utils/request.js'
import GroupEditor   from '../editor/GroupEditor.vue'
import LevelEditor   from '../editor/LevelEditor.vue'
import TopicEditor   from '../editor/TopicEditor.vue'
import ChapterEditor from '../editor/ChapterEditor.vue'
import { SUBJECTS_CONFIG, getRealSubject, filterLevels } from '../../utils/courseConfig'
import { getModels } from '../../utils/models'
import { io } from 'socket.io-client'
import JSZip from 'jszip'
import {
  canEditGroup as _canEditGroup,
  canEditLevelWithUser as _canEditLevelWithUser,
  isExplicitEditor as _isExplicitEditor,
  isExplicitLevelEditor as _isExplicitLevelEditor
} from '../../utils/permissionUtils'

export default {
  name: 'CourseEditorPanel',
  components: { GroupEditor, LevelEditor, TopicEditor, ChapterEditor },
  emits: ['close', 'data-changed'],
  props: {
    initialNode: { type: Object, default: null }
  },
  inject: ['showToastMessage'],
  watch: {
    // Phase A: real-time sync when parent changes the cursor while editor is open
    initialNode(newVal) {
      if (newVal && !this.loadingCourses) this.applyInitialNode()
    },
    'editingChapter._id'() {
      this.fetchContestTitles()
    }
  },
  data() {
    let currentUser = null
    try {
      currentUser = JSON.parse(localStorage.getItem('user_info'))
    } catch (e) {}

    return {
      socket: null,
      user: currentUser,
      // Data
      teachers: [],
      levels: [],
      groups: [], // DB Groups
      loadingCourses: false,
      
      // Selection State
      selectedNode: null, // { type: 'group'|'level'|'topic'|'chapter', id: string }
      
      // Editing Models
      editingGroup: { name: '', title: '', editors: [] },
      editingLevel: {},
      editingTopic: {},
      editingChapter: {},
      
      // Context for saving
      editingLevelForTopic: null,
      editingLevelForChapter: null,
      editingTopicForChapter: null,
      
      isInitialLoad: true,

      // AI State
      aiRequirements: '',
      aiLoadingMap: {},
      aiStatusMap: {},
      
      // Models
      selectedModel: 'gemini-3-flash-preview',
      rawModelOptions: [],
      
      // Language
      selectedLanguage: 'C++',
      languageOptions: ['C++', 'Python'],
      
      // Auto-save state
      isSelecting: false,
      isSaving: false,
      contestTitles: {}  // { [id]: string } cache for homework/exam titles
    }
  },
  computed: {
    problemLinks() {
        if (!this.editingChapter || !this.editingChapter.problemIdsStr) return []
        return this.editingChapter.problemIdsStr.split(/[,，]/).map(s => {
            s = s.trim()
            if (!s) return null
            let domain = 'system'
            let pid = s
            if (s.includes(':')) {
                [domain, pid] = s.split(':')
            }
            return {
                text: s,
                url: `https://acjudge.com/d/${domain}/p/${pid}`
            }
        }).filter(Boolean)
    },
    optionalProblemLinks() {
        if (!this.editingChapter || !this.editingChapter.optionalProblemIdsStr) return []
        return this.editingChapter.optionalProblemIdsStr.split(/[,，]/).map(s => {
            s = s.trim()
            if (!s) return null
            let domain = 'system'
            let pid = s
            if (s.includes(':')) {
                [domain, pid] = s.split(':')
            }
            return {
                text: s,
                url: `https://acjudge.com/d/${domain}/p/${pid}`
            }
        }).filter(Boolean)
    },
    homeworkLinks() {
        if (!this.editingChapter || !this.editingChapter.homeworkIdsStr) return []
        return this.editingChapter.homeworkIdsStr.split(/[,，]/).map(s => {
            s = s.trim()
            if (!s) return null
            let domain = 'system'
            let cid = s
            if (s.includes(':')) {
                [domain, cid] = s.split(':')
            }
            return {
                text: this.contestTitles[s] || s,
                url: `https://acjudge.com/d/${domain}/homework/${cid}`
            }
        }).filter(Boolean)
    },
    examLinks() {
        if (!this.editingChapter || !this.editingChapter.examIdsStr) return []
        return this.editingChapter.examIdsStr.split(/[,，]/).map(s => {
            s = s.trim()
            if (!s) return null
            let domain = 'system'
            let cid = s
            if (s.includes(':')) {
                [domain, cid] = s.split(':')
            }
            return {
                text: this.contestTitles[s] || s,
                url: `https://acjudge.com/d/${domain}/exam/${cid}`
            }
        }).filter(Boolean)
    },
    displayGroups() {
        // 1. Start with DB groups
        const result = [...this.groups]
        const dbGroupNames = new Set(this.groups.map(g => g.name))
        
        // 2. Find orphaned groups from levels
        const orphanedNames = new Set()
        if (this.levels) {
            this.levels.forEach(l => {
                if (l.group && !dbGroupNames.has(l.group)) {
                    orphanedNames.add(l.group)
                }
            })
        }
        
        // 3. Add virtual groups for orphans
        orphanedNames.forEach(name => {
            result.push({
                _id: null, // Virtual
                name: name,
                title: name,
                order: 999,
                collapsed: false // Default expanded?
            })
        })
        
        return result.sort((a, b) => (a.order || 0) - (b.order || 0))
    },
    // user() computed property removed, now a data property
    isPremium() {
      return this.user && (this.user.role === 'admin' || this.user.role === 'premium' || this.user.role === 'teacher')
    },
    isAdmin() {
      return this.user && (this.user.role === 'admin')
    },
    modelOptions() {
      const all = this.rawModelOptions || []
      if (this.isPremium) return all
      return all.filter(m => m.id === 'gemini-2.0-flash' || m.id === 'gemini-2.5-flash')
    },
    currentAiLoading() {
      if (!this.selectedNode) return false
      const id = this.selectedNode.id
      return !!this.aiLoadingMap[id]
    },
    currentAiStatus() {
      if (!this.selectedNode) return ''
      const id = this.selectedNode.id
      return this.aiStatusMap[id] || ''
    }
  },
  mounted() {
    this.checkUserUpdate()
    this.fetchLevels()
    this.fetchModels()
    this.fetchTeachers()
    window.addEventListener('keydown', this.handleGlobalKeydown)

    // Initialize Socket
    const url = import.meta.env.DEV ? 'http://localhost:3000' : '/'
    this.socket = io(url)
    
    this.socket.on('ai_task_log', (data) => {
        if (data && data.message) {
            console.log(data.message)
        }
    })

    this.socket.on('ai_task_complete', (data) => {
        console.log('AI Task Complete:', data)
        if (data) {
            // Use clientKey if available (preferred), otherwise fallback to chapterId
            const key = data.clientKey || data.chapterId
            
            // Always clear loading state if key matches
            if (key) {
                this.aiLoadingMap[key] = false
                this.aiStatusMap[key] = ''
            }
            
            if (data.status === 'success') {
                const taskName = data.chapterTitle ? `"${data.chapterTitle}" ` : ''
                this.showToastMessage(`${taskName}后台生成任务完成！`)
                
                // Handle Topic Plan Generation (Chapters or Description)
                if (data.type === 'topic-chapters' || data.type === 'topic-desc') {
                    // Refresh the whole tree to show new chapters
                    this.fetchLevels().then(() => {
                        // If we are currently editing this topic, refresh the editing form
                        if (this.selectedNode && this.selectedNode.type === 'topic') {
                            const currentId = this.selectedNode.id
                            // data.chapterId holds the topicId in this case
                            if (currentId === key || currentId === data.chapterId) {
                                // Find the updated topic in the fresh levels data
                                const updatedTopic = this.findTopicInTree(currentId)
                                if (updatedTopic) {
                                    this.editingTopic = JSON.parse(JSON.stringify(updatedTopic))
                                    // If chapters were generated, expand the node
                                    if (data.type === 'topic-chapters') {
                                        updatedTopic.collapsed = false
                                    }
                                }
                            }
                        }
                    })
                }
                // Handle Chapter Content Generation (Lesson Plan, PPT, Solution)
                // If currently viewing this chapter, refresh content
                else if (this.selectedNode && this.selectedNode.type === 'chapter') {
                    // Robust check for current chapter
                    const isCurrent = (id) => {
                        if (!id) return false
                        const strId = String(id)
                        return String(this.selectedNode.id) === strId || 
                                String(this.editingChapter.id) === strId || 
                                String(this.editingChapter._id) === strId
                    }

                    const isMatch = isCurrent(key) || isCurrent(data.chapterId)
                    
                    if (isMatch) {
                            // Optimistic update from event data
                            if (data.resourceUrl) {
                                this.editingChapter.resourceUrl = data.resourceUrl
                                this.editingChapter.contentType = 'html'
                                this.updateChapterInTree(data.chapterId, { 
                                    contentType: 'html',
                                    resourceUrl: data.resourceUrl
                                })
                            } else if (data.contentType === 'markdown') {
                                this.editingChapter.contentType = 'markdown'
                                // Set to loading state instead of empty
                                this.editingChapter.content = '正在刷新内容...' 
                                this.updateChapterInTree(data.chapterId, { 
                                    contentType: 'markdown',
                                    content: '正在刷新内容...' 
                                })
                            }

                            // Delay fetch slightly to ensure DB consistency
                            setTimeout(() => {
                                this.fetchChapterContent(data.chapterId || key, true)
                            }, 1000) // Increased delay to 1s to be safe
                    } else {
                        // Update tree node even if not selected
                        if (data.resourceUrl) {
                            this.updateChapterInTree(data.chapterId || key, { 
                                contentType: 'html',
                                resourceUrl: data.resourceUrl
                            })
                        } else if (data.contentType === 'markdown') {
                            this.updateChapterInTree(data.chapterId || key, { 
                                contentType: 'markdown',
                                content: '' // Clear content in tree to force re-fetch
                            })
                        }
                    }
                }
            } else {
                this.showToastMessage('生成失败: ' + (data.message || '未知错误'))
            }
        }
    })
  },
  activated() {
    this.checkUserUpdate()
    // Always reset topic collapsed state when returning to this page.
    // Topics should always be visible so chapters can be clicked.
    let resetCount = 0
    this.levels.forEach(l => {
      if (l.topics) l.topics.forEach(t => {
        if (t.collapsed) { t.collapsed = false; resetCount++ }
      })
    })
    if (resetCount > 0) console.log(`[Design] activated: reset ${resetCount} collapsed topics`)
    else console.log('[Design] activated: all topics already expanded')
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    if (this.socket) this.socket.disconnect()
  },
  methods: {
    checkUserUpdate() {
        let newUser = null
        try {
            newUser = JSON.parse(localStorage.getItem('user_info'))
        } catch(e) {}
        
        // Always update if current user is null but new user exists
        if (!this.user && newUser) {
             this.user = newUser
             this.fetchLevels()
             this.fetchTeachers()
             return
        }

        const oldId = this.user ? (this.user._id || this.user.uid) : null
        const newId = newUser ? (newUser._id || newUser.uid) : null
        
        if (oldId != newId) {
            this.user = newUser
            this.fetchLevels()
            this.fetchTeachers()
            this.selectedNode = null
        }
    },
    handleGlobalKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!this.selectedNode) return
        
        if (this.selectedNode.type === 'group') this.saveGroup()
        else if (this.selectedNode.type === 'level') this.saveLevel()
        else if (this.selectedNode.type === 'topic') this.saveTopic()
        else if (this.selectedNode.type === 'chapter') this.saveChapter()
      }
    },
    async fetchModels() {
        this.rawModelOptions = await getModels()
    },
    canEditGroup(group) {
      return _canEditGroup(group, this.user)
    },
    canEditLevel(level) {
      return _canEditLevelWithUser(level, this.user, this.groups)
    },
    isExplicitEditor(group) {
      return _isExplicitEditor(group, this.user)
    },
    isExplicitLevelEditor(level) {
      return _isExplicitLevelEditor(level, this.user)
    },
    // --- Selection Logic ---
    isSelected(type, id) {
      return this.selectedNode && this.selectedNode.type === type && this.selectedNode.id === id
    },
    selectNode(type, data, parentLevel = null, parentTopic = null) {
      this.isSelecting = true
      // Set selection ID
      const id = data._id || data.id || 'new'
      this.selectedNode = { type, id }

      // Populate Editor Data
      if (type === 'group') {
        this.editingGroup = JSON.parse(JSON.stringify(data))
        // Ensure editors is an array of IDs
        if (this.editingGroup.editors && this.editingGroup.editors.length > 0 && typeof this.editingGroup.editors[0] === 'object') {
            this.editingGroup.editors = this.editingGroup.editors.map(e => e._id)
        }
        if (!this.editingGroup.editors) this.editingGroup.editors = []
        if (!this.editingGroup.language) this.editingGroup.language = 'C++'
      } else if (type === 'level') {
        // Auto-expand level and all its topics to show chapters
        data.descCollapsed = false
        if (data.topics) data.topics.forEach(t => { t.collapsed = false })
        this.editingLevel = JSON.parse(JSON.stringify(data))
        // Ensure editors is an array of IDs
        if (this.editingLevel.editors && this.editingLevel.editors.length > 0 && typeof this.editingLevel.editors[0] === 'object') {
            this.editingLevel.editors = this.editingLevel.editors.map(e => e._id)
        }
        if (!this.editingLevel.editors) this.editingLevel.editors = []
      } else if (type === 'topic') {
        // Auto-expand topic to show chapters
        data.collapsed = false
        this.editingTopic = JSON.parse(JSON.stringify(data))
        this.editingLevelForTopic = parentLevel
      } else if (type === 'chapter') {
        this.editingLevelForChapter = parentLevel
        this.editingTopicForChapter = parentTopic
        
        // Process Chapter Data
        const chapter = JSON.parse(JSON.stringify(data))
        const problemIdsStr = (chapter.problemIds || []).map(p => {
          if (typeof p === 'string') return p
          if (p.domainId && p.domainId !== 'system') return `${p.domainId}:${p.docId}`
          return p.docId
        }).join(', ')

        const optionalProblemIdsStr = (chapter.optionalProblemIds || []).map(p => {
          if (typeof p === 'string') return p
          if (p.domainId && p.domainId !== 'system') return `${p.domainId}:${p.docId}`
          return p.docId
        }).join(', ')

        const homeworkIdsStr = (chapter.homeworkIds || []).join(', ')
        const examIdsStr = (chapter.examIds || []).join(', ')

        this.editingChapter = {
          ...chapter,
          problemIdsStr,
          optionalProblemIdsStr,
          homeworkIdsStr,
          examIdsStr,
          optional: !!chapter.optional,
          contentType: chapter.contentType || 'markdown',
          resourceUrl: chapter.resourceUrl || '',
          videoUrl: chapter.videoUrl || '',
          isNew: !!chapter.isNew,
          content: chapter.content || ''
        }

        // Fetch full content if not new and content is missing
        if (!chapter.isNew && !chapter.content) {
             this.fetchChapterContent(chapter.id)
        }
      }
      
      this.$nextTick(() => {
          this.isSelecting = false
      })
    },
    async fetchContestTitles() {
      const ids = [
        ...(this.editingChapter.homeworkIdsStr || '').split(/[,，]/).map(s => ({ id: s.trim(), type: 'homework' })),
        ...(this.editingChapter.examIdsStr || '').split(/[,，]/).map(s => ({ id: s.trim(), type: 'exam' }))
      ].filter(({ id }) => id)
      if (!ids.length) return
      await Promise.all(ids.map(async ({ id, type }) => {
        if (this.contestTitles[id]) return  // already cached
        try {
          const res = await request(`/api/course/contest-info?id=${encodeURIComponent(id)}&type=${type}`)
          if (res.title && res.title !== id) {
            this.contestTitles = { ...this.contestTitles, [id]: res.title }
          }
        } catch { /* ignore */ }
      }))
    },
    async fetchChapterContent(chapterId, force = false) {
        // Check if we are currently editing this chapter before starting
        const isEditing = this.selectedNode && 
                          this.selectedNode.type === 'chapter' && 
                          (String(this.editingChapter.id) === String(chapterId) || String(this.editingChapter._id) === String(chapterId));
        
        if (!isEditing) return;

        try {
            this.editingChapter.content = '正在刷新内容...'
            const query = this.editingLevelForChapter ? `?levelId=${this.editingLevelForChapter._id}` : ''
            // Add timestamp to prevent caching
            const separator = query ? '&' : '?'
            const url = `/api/course/chapter/${chapterId}${query}${separator}_t=${Date.now()}`
            
            const fullChapter = await request(url)
            
            // Ensure the user hasn't switched to another node while fetching
            const isSameChapter = this.selectedNode && 
                                  this.selectedNode.type === 'chapter' && 
                                  (String(this.editingChapter.id) === String(chapterId) || String(this.editingChapter._id) === String(chapterId));
            
            if (isSameChapter) {
                // If AI is currently generating content for this chapter, do not overwrite local loading state with server content
                // Unless forced (e.g. task completed)
                if (!force && (this.aiLoadingMap[chapterId] || this.aiLoadingMap[fullChapter._id])) {
                    return
                }

                this.editingChapter.content = fullChapter.content || ''
                this.editingChapter.contentType = fullChapter.contentType || 'markdown'
                this.editingChapter.resourceUrl = fullChapter.resourceUrl || ''
                this.editingChapter.videoUrl = fullChapter.videoUrl || ''
                if (fullChapter.title) this.editingChapter.title = fullChapter.title
                
                // Update tree node
                this.updateChapterInTree(chapterId, {
                    contentType: this.editingChapter.contentType,
                    title: this.editingChapter.title
                })
            }
        } catch (e) {
            console.error(e)
            const isSameChapter = this.selectedNode && 
                                  this.selectedNode.type === 'chapter' && 
                                  (String(this.editingChapter.id) === String(chapterId) || String(this.editingChapter._id) === String(chapterId));
            if (isSameChapter) {
                this.editingChapter.content = '加载失败: ' + e.message
            }
        }
    },

    // --- Creation Methods ---
    createNewGroup() {
        const newGroup = {
            name: '新分组',
            title: '新分组',
            language: 'C++',
            editors: [],
            _id: null
        }
        this.selectNode('group', newGroup)
    },
    createNewLevel(group) {
      let nextLevel = 1
      // Find max level in this group
      const groupLevels = this.getLevelsForGroup(group.name)
      if (groupLevels.length > 0) {
          const maxLevel = Math.max(...groupLevels.map(l => l.level || 0))
          nextLevel = maxLevel + 1
      }

      const newLevel = { 
        level: nextLevel, 
        title: '新课程模块', 
        description: '',
        subject: group.language || 'C++', // Inherit from group
        group: group.name, // Pre-fill group
        _id: null // Marker for new
      }
      
      this.selectNode('level', newLevel)
    },
    createLevelBefore(group, targetLevel) {
      if (!group || !targetLevel) return
      let nextLevel = 1
      const groupLevels = this.getLevelsForGroup(group.name)
      if (groupLevels.length > 0) {
        const maxLevel = Math.max(...groupLevels.map(l => l.level || 0))
        nextLevel = maxLevel + 1
      }

      const newLevel = {
        level: nextLevel,
        title: '新课程模块',
        description: '',
        subject: group.language || 'C++',
        group: group.name,
        _id: null,
        _insertBeforeLevelId: targetLevel._id || null
      }

      this.selectNode('level', newLevel)
    },
    createNewTopic(level, insertIndex = -1) {
      // Expand level if collapsed
      level.descCollapsed = false
      
      const newTopic = {
        title: '新知识点',
        description: '',
        _id: null, // Marker for new
        _insertIndex: insertIndex
      }
      this.selectNode('topic', newTopic, level)
    },
    createNewChapter(level, topic, insertIndex = -1) {
      // Expand topic if collapsed
      topic.collapsed = false
      
      const nextIndex = (topic.chapters ? topic.chapters.length : 0) + 1
      const nextId = `${level.level}-${nextIndex}-${Date.now()}`
      
      const defaultContent = `### 新章节标题

这里是章节的正文内容。支持 **Markdown** 语法。

#### 常用资源嵌入示例 (请根据需要修改路径)

**1. 嵌入视频 (Video)**
<video controls width="100%" controlsList="nodownload">
  <source src="/public/courseware/level1/videos/example.mp4" type="video/mp4">
  您的浏览器不支持 video 标签。
</video>

**2. 嵌入 PDF 文档**
<iframe src="/public/courseware/level1/pdfs/example.pdf" width="100%" height="600px" frameborder="0">
</iframe>

**3. 嵌入 HTML 课件**
<iframe src="/public/courseware/level1/topic1/example.html" width="100%" height="600px" frameborder="0">
</iframe>

**4. 嵌入 Bilibili 视频**
<iframe src="//player.bilibili.com/player.html?bvid=BV1GJ411x7h7&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" width="100%" height="500px"> </iframe>
`

      const newChapter = {
        id: nextId,
        title: '新章节',
        content: defaultContent,
        contentType: 'markdown',
        isNew: true,
        _insertIndex: insertIndex
      }
      this.selectNode('chapter', newChapter, level, topic)
    },

    // --- Data Fetching ---
    async fetchData() {
        // Save scroll position
        const treeContainer = this.$el.querySelector('.tree-container')
        let scrollTop = 0
        if (treeContainer) {
            scrollTop = treeContainer.scrollTop
        }

        this.loadingCourses = true
        try {
            const [groups, levels] = await Promise.all([
                request('/api/course/groups'),
                request('/api/course/levels')
            ])
            
            this.groups = groups.map(g => ({ ...g, collapsed: false, problemCount: 0 }))
            this.levels = levels.map(l => ({ 
                ...l, 
                descCollapsed: false, 
                problemCount: 0,
                topics: (l.topics || []).map(t => ({
                    ...t,
                    collapsed: false,
                    problemCount: 0
                }))
            }))
            
            // Calculate Counts
            this.levels.forEach(l => {
                let levelCount = 0
                if (l.topics) {
                    l.topics.forEach(t => {
                        let topicCount = 0
                        if (t.chapters) {
                            t.chapters.forEach(c => {
                                let chapterCount = 0
                                if (c.problemIds && c.problemIds.length > 0) {
                                    chapterCount += c.problemIds.length
                                }
                                if (c.optionalProblemIds && c.optionalProblemIds.length > 0) {
                                    chapterCount += c.optionalProblemIds.length
                                }
                                topicCount += chapterCount
                            })
                        }
                        t.problemCount = topicCount
                        levelCount += topicCount
                    })
                }
                l.problemCount = levelCount
            })

            // Calculate Group Counts
            this.groups.forEach(g => {
                const groupLevels = this.levels.filter(l => l.group === g.name)
                g.problemCount = groupLevels.reduce((sum, l) => sum + (l.problemCount || 0), 0)
            })

            this.restoreTreeState()
            
            // Phase A: if opened with an initialNode, navigate there on first load
            if (this.initialNode && this.isInitialLoad) {
                this.isInitialLoad = false
                this.$nextTick(() => this.applyInitialNode())
            } else if (this.selectedNode) {
                // Re-bind selection to new objects to avoid stale references
                this.rebindSelection()
            }
        } catch (e) {
            this.showToastMessage('加载失败: ' + e.message)
        } finally {
            this.loadingCourses = false
            // Restore scroll position
            this.$nextTick(() => {
                const container = this.$el.querySelector('.tree-container')
                if (container && scrollTop > 0) {
                    container.scrollTop = scrollTop
                }
            })
        }
    },
    rebindSelection() {
        if (!this.selectedNode) return
        const { type, id } = this.selectedNode
        
        if (type === 'group') {
            const group = this.groups.find(g => (g._id && g._id === id) || g.name === id)
            if (group) this.selectNode('group', group)
        } else if (type === 'level') {
            const level = this.levels.find(l => l._id === id)
            if (level) this.selectNode('level', level)
        } else if (type === 'topic') {
            for (const l of this.levels) {
                if (l.topics) {
                    const topic = l.topics.find(t => t._id === id)
                    if (topic) {
                        this.selectNode('topic', topic, l)
                        return
                    }
                }
            }
        } else if (type === 'chapter') {
            for (const l of this.levels) {
                // Check legacy chapters
                if (l.chapters) {
                    const chapter = l.chapters.find(c => c.id === id || (c._id && c._id === id))
                    if (chapter) {
                        this.selectNode('chapter', chapter, l, null)
                        return
                    }
                }
                // Check topics
                if (l.topics) {
                    for (const t of l.topics) {
                        if (t.chapters) {
                            const chapter = t.chapters.find(c => c.id === id || (c._id && c._id === id))
                            if (chapter) {
                                this.selectNode('chapter', chapter, l, t)
                                return
                            }
                        }
                    }
                }
            }
        }
    },
    async fetchTeachers() {
        if (!this.isAdmin) return
        try {
            // Fetch all users who are teachers (role=teacher)
            const res = await request('/api/admin/users?role=teacher&limit=1000')
            this.teachers = res.users || []
        } catch (e) {
            console.error('Failed to fetch teachers', e)
        }
    },
    fetchLevels() { this.fetchData() }, // Alias for compatibility

    // Phase A: navigate to the node indicated by the initialNode prop
    applyInitialNode() {
      if (!this.initialNode) return
      const { type, id, docId, levelId } = this.initialNode
      if (type === 'group') {
        const group = this.displayGroups.find(g => g._id === id || g.name === id)
        if (group) { group.collapsed = false; this.selectNode('group', group) }
      } else if (type === 'level') {
        const level = this.levels.find(l => l._id === id)
        if (level) this.selectNode('level', level)
      } else if (type === 'topic') {
        for (const level of this.levels) {
          const topic = (level.topics || []).find(t => t._id === id)
          if (topic) { this.selectNode('topic', topic, level); break }
        }
      } else if (type === 'chapter') {
        // Match by _id first; fall back to docId (stable '2-5-1' style) if _id is stale
        const matchChapter = (c) => {
          const matchById = c._id && String(c._id) === String(id)
          const matchByDocId = docId && String(c.id) === String(docId)
          return matchById || matchByDocId
        }
        // When levelId is provided, prefer the level that matches to avoid cross-level conflicts
        const levelMatchScore = (l) => (levelId && String(l._id) === String(levelId)) ? 1 : 0
        let found = false
        // Sort levels so the matching levelId comes first (avoids cross-level docId collision)
        const sortedLevels = levelId
          ? [...this.levels].sort((a, b) => levelMatchScore(b) - levelMatchScore(a))
          : this.levels
        for (const level of sortedLevels) {
          // Search in topics (standard)
          for (const topic of (level.topics || [])) {
            const chapter = (topic.chapters || []).find(matchChapter)
            if (chapter) {
              level.descCollapsed = false
              topic.collapsed = false
              this.selectNode('chapter', chapter, level, topic)
              found = true
              return
            }
          }
          // Search in legacy level.chapters (no topic structure)
          if (level.chapters && level.chapters.length) {
            const chapter = level.chapters.find(matchChapter)
            if (chapter) {
              level.descCollapsed = false
              this.selectNode('chapter', chapter, level, null)
              found = true
              return
            }
          }
        }
        if (!found) {
          console.warn('[CourseEditorPanel] chapter not found, id:', id, 'docId:', docId)
        }
      }
    },

    getLevelsForGroup(groupName) {
        if (!this.levels) return []
        return this.levels.filter(l => l.group === groupName)
    },

    async saveGroup() {
        if (this.isSaving) return
        this.isSaving = true
        try {
            let res;
            if (this.editingGroup._id) {
                res = await request(`/api/course/groups/${this.editingGroup._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(this.editingGroup)
                })
            } else {
                res = await request('/api/course/groups', {
                    method: 'POST',
                    body: JSON.stringify(this.editingGroup)
                })
                if (res && res._id) {
                    this.editingGroup._id = res._id
                    this.selectedNode.id = res._id
                    // Add to local groups list
                    this.groups.push({ ...res, collapsed: false })
                }
            }
            
            this.showToastMessage('保存分组成功')
            this.fetchData()
            this.$emit('data-changed')
        } catch (e) {
            this.showToastMessage('保存分组失败: ' + e.message)
        } finally {
            this.isSaving = false
        }
    },
    async deleteGroup(id) {
        if (!confirm('确定要删除这个分组吗？')) return
        try {
            await request(`/api/course/groups/${id}`, { method: 'DELETE' })
            this.showToastMessage('删除分组成功')
            this.fetchData()
            this.$emit('data-changed')
            this.selectedNode = null
        } catch (e) {
            this.showToastMessage('删除分组失败: ' + e.message)
        }
    },
    async moveGroup(direction) {
        if (!this.editingGroup._id) return
        try {
            await request(`/api/course/groups/${this.editingGroup._id}/move`, {
                method: 'POST',
                body: JSON.stringify({ direction })
            })
            this.showToastMessage('移动成功')
            this.fetchData()
            this.$emit('data-changed')
        } catch (e) {
            this.showToastMessage('移动失败: ' + e.message)
        }
    },

    async saveLevel() {
      if (this.isSaving) return
      this.isSaving = true
      try {
        // Ensure group is set
        if (!this.editingLevel.group) {
            // Fallback if selectedSubject is not defined (seems to be a bug in original code or missing context)
            // this.editingLevel.group = this.selectedSubject 
        }

        let res;
        if (this.editingLevel._id) {
          res = await request(`/api/course/levels/${this.editingLevel._id}`, {
            method: 'PUT',
            body: JSON.stringify(this.editingLevel)
          })
        } else {
          const insertBeforeLevelId = this.editingLevel._insertBeforeLevelId
          const groupLevels = this.getLevelsForGroup(this.editingLevel.group || '')
            .sort((a, b) => (a.level || 0) - (b.level || 0))
          const targetIndex = groupLevels.findIndex(l => l._id === insertBeforeLevelId)
          const moveUpTimes = targetIndex >= 0 ? (groupLevels.length - targetIndex) : 0

          res = await request('/api/course/levels', {
            method: 'POST',
            body: JSON.stringify(this.editingLevel)
          })

          if (res && res._id && moveUpTimes > 0) {
            for (let i = 0; i < moveUpTimes; i++) {
              await request(`/api/course/levels/${res._id}/move`, {
                method: 'POST',
                body: JSON.stringify({ direction: 'up' })
              })
            }
          }

          if (res && res._id) {
              this.editingLevel._id = res._id
              this.selectedNode.id = res._id
              this.levels.push({ ...res, descCollapsed: false })
          }
        }
        
        this.showToastMessage('保存成功')
        this.fetchData()
        this.$emit('data-changed')
      } catch (e) {
        this.showToastMessage('保存失败: ' + e.message)
      } finally {
        this.isSaving = false
      }
    },
    async deleteLevel(id) {
      if (!confirm('确定要删除这个课程模块吗？')) return
      try {
        await request(`/api/course/levels/${id}`, { method: 'DELETE' })
        this.showToastMessage('删除成功')
        this.fetchData()
        this.$emit('data-changed')
        this.selectedNode = null
      } catch (e) {
        this.showToastMessage('删除失败: ' + e.message)
      }
    },
    async moveLevel(direction) {
      if (!this.editingLevel._id) return
      try {
        await request(`/api/course/levels/${this.editingLevel._id}/move`, {
          method: 'POST',
          body: JSON.stringify({ direction })
        })
        this.showToastMessage('移动成功')
        this.fetchData()
        this.$emit('data-changed')
      } catch (e) {
        this.showToastMessage('移动失败: ' + e.message)
      }
    },

    async saveTopic() {
      if (this.isSaving) return
      this.isSaving = true
      try {
        let updatedLevel;
        if (this.editingTopic._id) {
          updatedLevel = await request(`/api/course/levels/${this.editingLevelForTopic._id}/topics/${this.editingTopic._id}`, {
            method: 'PUT',
            body: JSON.stringify(this.editingTopic)
          })
        } else {
          updatedLevel = await request(`/api/course/levels/${this.editingLevelForTopic._id}/topics`, {
            method: 'POST',
            body: JSON.stringify({
                ...this.editingTopic,
                insertIndex: this.editingTopic._insertIndex
            })
          })
          
          // Update ID for new topic (assuming appended to end)
          if (updatedLevel && updatedLevel.topics && updatedLevel.topics.length > 0) {
              this.showToastMessage('知识点创建成功')
              await this.fetchData()
              
              let newTopic;
              if (this.editingTopic._insertIndex !== undefined && this.editingTopic._insertIndex !== -1 && this.editingTopic._insertIndex < updatedLevel.topics.length) {
                  newTopic = updatedLevel.topics[this.editingTopic._insertIndex]
              } else {
                  newTopic = updatedLevel.topics[updatedLevel.topics.length - 1]
              }

              if (newTopic) {
                this.editingTopic._id = newTopic._id
                this.selectedNode.id = newTopic._id
              }
              this.$emit('data-changed')
              return
          }
        }
        
        this.showToastMessage('保存知识点成功')
        await this.fetchData()
        this.$emit('data-changed')
      } catch (e) {
        this.showToastMessage('保存知识点失败: ' + e.message)
      } finally {
        this.isSaving = false
      }
    },
    async deleteTopic(levelId, topicId) {
      if (!confirm('确定要删除这个知识点吗？')) return
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}`, { method: 'DELETE' })
        this.showToastMessage('删除知识点成功')
        this.fetchData()
        this.$emit('data-changed')
        this.selectedNode = null
      } catch (e) {
        this.showToastMessage('删除知识点失败: ' + e.message)
      }
    },
    async deleteAllChapters(levelId, topicId) {
      if (!confirm('确定要清空该知识点下的所有章节吗？此操作不可恢复！')) return
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}/chapters`, { method: 'DELETE' })
        this.showToastMessage('已清空所有章节')
        
        // Update local state immediately to reflect changes
        this.editingTopic.chapters = []
        
        await this.fetchData()
        this.$emit('data-changed')
      } catch (e) {
        this.showToastMessage('清空章节失败: ' + e.message)
      }
    },
    async moveTopic(direction) {
      const levelId = this.editingLevelForTopic._id
      const topicId = this.editingTopic._id
      
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}/move`, {
          method: 'POST',
          body: JSON.stringify({ direction })
        })
        this.showToastMessage('移动成功')
        this.fetchData()
        this.$emit('data-changed')
      } catch (e) {
        this.showToastMessage('移动失败: ' + e.message)
      }
    },
    sanitizeFileName(str) {
      return (str || '').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')
    },

    triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },

    async addChapterToZip(zip, folderPath, chapter) {
      const safeTitle = this.sanitizeFileName(chapter.title)
      
      // 1. Always try to get Markdown content (Text Lesson Plan)
      let content = chapter.content
      if (!content) {
          try {
              const chId = chapter.id || chapter._id
              if (chId) {
                  const res = await request(`/api/course/chapter/${chId}`)
                  if (res && res.content) {
                      content = res.content
                      chapter.content = content // Cache it
                  }
              }
          } catch (e) {
              console.error(`Failed to fetch content for ${chapter.title}`, e)
          }
      }

      if (content) {
        zip.file(`${folderPath}/${safeTitle}.md`, content)
      }

      // 2. If it has a resource URL (usually contentType='html'), download that too
      if (chapter.contentType === 'html' && chapter.resourceUrl) {
          try {
            let fetchUrl = chapter.resourceUrl
            const headers = {}
            const token = localStorage.getItem('auth_token')
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            if (fetchUrl.startsWith('http')) {
                fetchUrl = `/api/course/proxy?url=${encodeURIComponent(fetchUrl)}`
            } else if (fetchUrl.indexOf('public/courseware') !== -1) {
              if (fetchUrl.startsWith('/public/')) fetchUrl = '/api' + fetchUrl
              else if (fetchUrl.startsWith('public/')) fetchUrl = '/api/' + fetchUrl
              if (token) {
                const separator = fetchUrl.includes('?') ? '&' : '?'
                fetchUrl = `${fetchUrl}${separator}token=${token}`
              }
            }

            const response = await fetch(fetchUrl, { headers })
            if (response.ok) {
              const blob = await response.blob()
              let extension = 'html'
              const lowerUrl = chapter.resourceUrl.toLowerCase()
              if (lowerUrl.endsWith('.ppt')) extension = 'ppt'
              else if (lowerUrl.endsWith('.pptx')) extension = 'pptx'
              else if (lowerUrl.endsWith('.pdf')) extension = 'pdf'
              else if (lowerUrl.endsWith('.doc')) extension = 'doc'
              else if (lowerUrl.endsWith('.docx')) extension = 'docx'
              
              zip.file(`${folderPath}/${safeTitle}.${extension}`, blob)
            }
          } catch (e) {
            console.error(`Failed to download HTML for ${chapter.title}`, e)
          }
      }
    },

    async downloadTopicMaterials() {
      if (!this.isAdmin) return this.showToastMessage('无权操作')
      if (!this.editingTopic || !this.editingTopic.chapters) return
      const zip = new JSZip()
      const topicTitle = this.sanitizeFileName(this.editingTopic.title)
      this.showToastMessage('正在打包下载...')
      
      for (const chapter of this.editingTopic.chapters) {
        await this.addChapterToZip(zip, topicTitle, chapter)
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      this.triggerDownload(content, `${topicTitle}.zip`)
    },

    async downloadLevelMaterials() {
      if (!this.isAdmin) return this.showToastMessage('无权操作')
      if (!this.editingLevel || !this.editingLevel.topics) return
      const zip = new JSZip()
      const levelTitle = this.sanitizeFileName(this.editingLevel.title)
      this.showToastMessage('正在打包下载...')
      
      for (const topic of this.editingLevel.topics) {
        const topicTitle = this.sanitizeFileName(topic.title)
        if (topic.chapters) {
          for (const chapter of topic.chapters) {
            await this.addChapterToZip(zip, `${levelTitle}/${topicTitle}`, chapter)
          }
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      this.triggerDownload(content, `${levelTitle}.zip`)
    },

    async downloadGroupMaterials() {
      if (!this.isAdmin) return this.showToastMessage('无权操作')
      if (!this.editingGroup || !this.editingGroup.name) return
      const zip = new JSZip()
      const groupName = this.sanitizeFileName(this.editingGroup.name)
      this.showToastMessage('正在打包下载...')
      
      const levels = this.getLevelsForGroup(this.editingGroup.name)
      for (const level of levels) {
        const levelTitle = this.sanitizeFileName(level.title)
        if (level.topics) {
          for (const topic of level.topics) {
            const topicTitle = this.sanitizeFileName(topic.title)
            if (topic.chapters) {
              for (const chapter of topic.chapters) {
                await this.addChapterToZip(zip, `${groupName}/${levelTitle}/${topicTitle}`, chapter)
              }
            }
          }
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      this.triggerDownload(content, `${groupName}.zip`)
    },

    async downloadChapter() {
      if (!this.isAdmin) return this.showToastMessage('无权操作')
      const chapter = this.editingChapter
      const safeTitle = this.sanitizeFileName(chapter.title)
      
      if (chapter.contentType === 'markdown') {
        if (!chapter.content) return this.showToastMessage('没有内容可下载')
        const filename = `${safeTitle}.md`
        const blob = new Blob([chapter.content], { type: 'text/markdown' })
        this.triggerDownload(blob, filename)
      } else if (chapter.contentType === 'html') {
        if (!chapter.resourceUrl) return this.showToastMessage('没有资源链接')
        try {
          let fetchUrl = chapter.resourceUrl
          const headers = {}
          const token = localStorage.getItem('auth_token')
          if (token) {
              headers['Authorization'] = `Bearer ${token}`
          }

          if (fetchUrl.startsWith('http')) {
             fetchUrl = `/api/course/proxy?url=${encodeURIComponent(fetchUrl)}`
          } else if (fetchUrl.indexOf('public/courseware') !== -1) {
            if (fetchUrl.startsWith('/public/')) fetchUrl = '/api' + fetchUrl
            else if (fetchUrl.startsWith('public/')) fetchUrl = '/api/' + fetchUrl
            if (token) {
              const separator = fetchUrl.includes('?') ? '&' : '?'
              fetchUrl = `${fetchUrl}${separator}token=${token}`
            }
          }
          const response = await fetch(fetchUrl, { headers })
          if (response.ok) {
            const blob = await response.blob()
            let extension = 'html'
            const lowerUrl = chapter.resourceUrl.toLowerCase()
            if (lowerUrl.endsWith('.ppt')) extension = 'ppt'
            else if (lowerUrl.endsWith('.pptx')) extension = 'pptx'
            else if (lowerUrl.endsWith('.pdf')) extension = 'pdf'
            else if (lowerUrl.endsWith('.doc')) extension = 'doc'
            else if (lowerUrl.endsWith('.docx')) extension = 'docx'

            const filename = `${safeTitle}.${extension}`
            this.triggerDownload(blob, filename)
          } else {
            this.showToastMessage('下载失败: 无法获取文件')
          }
        } catch (e) {
          this.showToastMessage('下载失败: ' + e.message)
        }
      }
    },
    async saveChapter() {
      if (this.isSaving) return
      this.isSaving = true
      try {
        const problemIds = (this.editingChapter.problemIdsStr || '')
          .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

        const optionalProblemIds = (this.editingChapter.optionalProblemIdsStr || '')
          .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

        const homeworkIds = (this.editingChapter.homeworkIdsStr || '')
          .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

        const examIds = (this.editingChapter.examIdsStr || '')
          .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

        const chapterData = {
          id: this.editingChapter.id,
          title: this.editingChapter.title,
          content: this.editingChapter.content,
          contentType: this.editingChapter.contentType,
          resourceUrl: this.editingChapter.resourceUrl,
          videoUrl: this.editingChapter.videoUrl || '',
          problemIds: problemIds,
          optionalProblemIds: optionalProblemIds,
          homeworkIds: homeworkIds,
          examIds: examIds,
          optional: this.editingChapter.optional,
          insertIndex: this.editingChapter._insertIndex
        }

        let updatedLevel;
        if (this.editingChapter.isNew) {
           updatedLevel = await request(`/api/course/levels/${this.editingLevelForChapter._id}/topics/${this.editingTopicForChapter._id}/chapters`, {
             method: 'POST',
             body: JSON.stringify(chapterData)
           })
           
           // Update ID for new chapter
           if (updatedLevel && updatedLevel.topics) {
               const topic = updatedLevel.topics.find(t => t._id === this.editingTopicForChapter._id)
               if (topic && topic.chapters && topic.chapters.length > 0) {
                   // Find the newly created chapter to update local state immediately
                   let newCh = null
                   // Try to find by title (most reliable for immediate match)
                   const matches = topic.chapters.filter(c => c.title === this.editingChapter.title)
                   if (matches.length > 0) {
                       // Pick the last one found (assuming it's the newest)
                       newCh = matches[matches.length - 1]
                   }
                   
                   if (newCh) {
                       // Update the current editing object in place so subsequent calls (like generate) use the real ID
                       this.editingChapter._id = newCh._id
                       this.editingChapter.id = newCh._id
                       this.editingChapter.isNew = false
                       
                       // Also update selectedNode data if it exists
                       if (this.selectedNode && this.selectedNode.data) {
                           this.selectedNode.data._id = newCh._id
                           this.selectedNode.data.id = newCh._id
                           this.selectedNode.data.isNew = false
                       }
                   }

                   this.fetchData().then(() => {
                       this.showToastMessage('章节创建成功')
                       this.$emit('data-changed')
                       // Re-select the node in the new tree to ensure we have the fresh object
                       if (newCh) {
                           const newLevel = this.levels.find(l => l._id === this.editingLevelForChapter._id)
                           if (newLevel) {
                               const newTopic = newLevel.topics.find(t => t._id === this.editingTopicForChapter._id)
                               if (newTopic) {
                                   const freshChapter = newTopic.chapters.find(c => c._id === newCh._id)
                                   if (freshChapter) {
                                       this.selectNode('chapter', freshChapter, newLevel, newTopic)
                                   }
                               }
                           }
                       }
                   })
                   return // Stop here as we are refreshing
               }
           }
        } else {
           const chId = this.editingChapter._id || this.editingChapter.id
           updatedLevel = await request(`/api/course/levels/${this.editingLevelForChapter._id}/topics/${this.editingTopicForChapter._id}/chapters/${chId}`, {
             method: 'PUT',
             body: JSON.stringify(chapterData)
           })
        }
        
        this.showToastMessage('保存章节成功')
        await this.fetchData()
        this.$emit('data-changed')
      } catch (e) {
        this.showToastMessage('保存章节失败: ' + e.message)
      } finally {
        this.isSaving = false
      }
    },
    async deleteChapter(levelId, topicId, chapterId) {
      if (!confirm('确定要删除这个章节吗？')) return
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}/chapters/${chapterId}`, { method: 'DELETE' })
        this.showToastMessage('删除章节成功')
        this.fetchData()
        this.$emit('data-changed')
        this.selectedNode = null
      } catch (e) {
        this.showToastMessage('删除章节失败: ' + e.message)
      }
    },
    async moveChapter(direction) {
      const levelId = this.editingLevelForChapter._id
      const topicId = this.editingTopicForChapter._id
      const chapterId = this.editingChapter._id || this.editingChapter.id
      
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}/chapters/${chapterId}/move`, {
          method: 'PUT',
          body: JSON.stringify({ direction })
        })
        this.showToastMessage('移动成功')
        this.fetchData()
        this.$emit('data-changed')
        // Note: Selection might be lost or stale after fetch, ideally we re-select
      } catch (e) {
        this.showToastMessage('移动失败: ' + e.message)
      }
    },

    // --- Actions ---
    toggleGroupCollapse(group) { 
        group.collapsed = !group.collapsed 
        this.saveTreeState()
    },
    toggleLevelDesc(level) { 
        level.descCollapsed = !level.descCollapsed 
        this.saveTreeState()
    },
    toggleTopicCollapse(topic) { 
        topic.collapsed = !topic.collapsed 
        this.saveTreeState()
    },

    saveTreeState() {
        // Only save group/level collapsed state; topics always stay expanded
        const state = {
            groups: this.groups.filter(g => g.collapsed).map(g => g._id || g.name),
            levels: this.levels.filter(l => l.descCollapsed).map(l => l._id)
        }
        localStorage.setItem('design_tree_collapsed_state', JSON.stringify(state))
    },
    restoreTreeState() {
        try {
            const raw = localStorage.getItem('design_tree_collapsed_state')
            if (!raw) return
            const state = JSON.parse(raw)
            
            if (state.groups) {
                const collapsedGroups = new Set(state.groups)
                this.groups.forEach(g => {
                    if (collapsedGroups.has(g._id) || collapsedGroups.has(g.name)) {
                        g.collapsed = true
                    }
                })
            }
            
            if (state.levels) {
                const collapsedLevels = new Set(state.levels)
                this.levels.forEach(l => {
                    if (collapsedLevels.has(l._id)) {
                        l.descCollapsed = true
                    }
                })
            }
            
            // Note: topic collapsed state is intentionally NOT restored.
            // Topics always default to expanded so all chapters are clickable.
        } catch (e) {
            console.error('Failed to restore tree state', e)
        }
        // Clear any stale topic collapsed state from old localStorage format
        try {
            const raw = localStorage.getItem('design_tree_collapsed_state')
            if (raw) {
                const state = JSON.parse(raw)
                if (state.topics) {
                    delete state.topics
                    localStorage.setItem('design_tree_collapsed_state', JSON.stringify(state))
                }
            }
        } catch (e) {}
    },

    // --- AI Methods ---
    async ensureChapterSaved() {
        if (!this.editingChapter._id || this.editingChapter.isNew) {
            this.showToastMessage('正在自动保存章节...')
            await this.saveChapter()
            if (!this.editingChapter._id) {
                throw new Error('自动保存失败，请手动保存后再试')
            }
        }
    },

    async generateLessonPlan() {
      if (!this.editingChapter.title) return this.showToastMessage('请先填写章节标题')
      
      try { await this.ensureChapterSaved() } catch (e) { return }

      if (!confirm('确定要生成教案吗？这将覆盖当前内容。生成过程将在后台进行，您可以关闭此页面。')) return
      
      // Capture context
      const chapterId = this.editingChapter._id || this.editingChapter.id
      const levelId = this.editingLevelForChapter._id
      const topicId = this.editingTopicForChapter._id
      const levelNum = this.editingLevelForChapter.level
      const topicTitle = this.editingTopicForChapter.title
      const chapterTitle = this.editingChapter.title
      const requirements = this.aiRequirements
      const model = this.selectedModel
      
      const groupName = this.editingLevelForChapter.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const existingContent = this.editingChapter.content || ''

      this.aiLoadingMap[chapterId] = true
      this.aiStatusMap[chapterId] = '正在提交后台任务...'
      
      // Immediately switch to Markdown mode and show loading state
      this.editingChapter.contentType = 'markdown'
      this.editingChapter.content = '正在生成教案中，请稍候...'
      this.updateChapterInTree(chapterId, { contentType: 'markdown', content: '正在生成教案中，请稍候...' })
      
      try {
        await request('/api/lesson-plan/background', {
          method: 'POST',
          body: JSON.stringify({
            topic: chapterTitle,
            context: topicTitle,
            level: `Level ${levelNum}`,
            requirements: requirements,
            model: model,
            language: language,
            chapterId: chapterId,
            topicId: this.editingTopicForChapter._id,
            clientKey: chapterId,
            existingContent: existingContent
          })
        })
        
        this.showToastMessage(`"${chapterTitle}" 教案生成任务已提交后台，完成后会自动保存`)
        this.aiStatusMap[chapterId] = '正在后台生成教案中...'
      } catch (e) {
        this.showToastMessage('提交失败: ' + e.message)
        this.aiLoadingMap[chapterId] = false
        this.aiStatusMap[chapterId] = ''
        this.editingChapter.content = '生成失败，请重试'
      }
    },

    async generatePPT() {
      if (!this.editingChapter.title) return this.showToastMessage('请先填写章节标题')
      
      try { await this.ensureChapterSaved() } catch (e) { return }

      if (!confirm('确定要生成 PPT 吗？生成过程将在后台进行，您可以关闭此页面。')) return
      
      // Capture context to handle navigation during generation
      const chapterId = this.editingChapter._id || this.editingChapter.id
      const levelId = this.editingLevelForChapter._id
      const topicId = this.editingTopicForChapter._id
      const levelNum = this.editingLevelForChapter.level
      const levelTitle = this.editingLevelForChapter.title
      const topicTitle = this.editingTopicForChapter.title
      const chapterTitle = this.editingChapter.title
      const model = this.selectedModel
      
      const groupName = this.editingLevelForChapter.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'

      const chapterContent = this.editingChapter.content
      const requirements = this.aiRequirements

      console.log('[generatePPT] chapterContent length:', chapterContent ? chapterContent.length : 0)
      console.log('[generatePPT] chapterContent preview:', chapterContent ? chapterContent.slice(0, 200) : '(empty)')
      let chapterList = []
      let currentChapterIndex = -1
      if (this.editingTopicForChapter && this.editingTopicForChapter.chapters) {
          chapterList = this.editingTopicForChapter.chapters.map(c => c.title)
          currentChapterIndex = this.editingTopicForChapter.chapters.findIndex(c => c.id === chapterId || c._id === chapterId)
      }

      this.aiLoadingMap[chapterId] = true
      this.aiStatusMap[chapterId] = '正在提交后台任务...'
      
      // Immediately switch to HTML mode
      this.editingChapter.contentType = 'html'
      this.updateChapterInTree(chapterId, { contentType: 'html' })

      try {
        await request('/api/generate-ppt/background', {
          method: 'POST',
          body: JSON.stringify({
            topic: chapterTitle,
            context: topicTitle,
            level: `Level ${levelNum}`,
            model: model,
            language: language,
            chapterList: chapterList,
            currentChapterIndex: currentChapterIndex,
            chapterContent: chapterContent,
            requirements: requirements,
            chapterId: chapterId,
            topicId: topicId,
            topicTitle: topicTitle,
            chapterTitle: chapterTitle,
            levelNum: levelNum,
            levelTitle: levelTitle,
            clientKey: chapterId,
            group: groupName
          })
        })
        
        this.showToastMessage(`"${chapterTitle}" PPT 生成任务已提交后台，完成后会自动保存`)
        this.aiStatusMap[chapterId] = '正在后台生成PPT中...'
      } catch (e) {
        this.showToastMessage('提交失败: ' + e.message)
        this.aiLoadingMap[chapterId] = false
        this.aiStatusMap[chapterId] = ''
      }
    },

    async generateSolutionPlan() {
      if (!this.editingChapter.problemIdsStr) return this.showToastMessage('请先在下方关联题目 ID')
      
      try { await this.ensureChapterSaved() } catch (e) { return }

      if (!confirm('确定要生成解题教案吗？这将覆盖当前内容。生成过程将在后台进行，您可以关闭此页面。')) return
      
      const firstProblemId = this.editingChapter.problemIdsStr.split(/[,，]/)[0].trim()
      if (!firstProblemId) return this.showToastMessage('未找到有效的题目 ID')

      // Capture ALL necessary context at the start
      const id = this.editingChapter._id || this.editingChapter.id
      const targetChapterId = this.editingChapter.id 
      const targetTopicId = this.editingTopicForChapter._id 
      const targetLevelId = this.editingLevelForChapter._id
      const targetChapterTitle = this.editingChapter.title 
      
      // Capture chapter state for potential update
      const targetChapterState = {
          content: '正在生成解题教案中，请稍候...', // We are setting this
          contentType: 'markdown', // We are setting this
          resourceUrl: this.editingChapter.resourceUrl,
          problemIdsStr: this.editingChapter.problemIdsStr,
          optional: this.editingChapter.optional
      }
      
      this.aiLoadingMap[id] = true
      this.aiStatusMap[id] = '正在获取题目信息...'
      
      // Switch to Markdown mode (Update tree and current view if matches)
      this.updateChapterInTree(id, { contentType: 'markdown', content: targetChapterState.content })
      if ((this.editingChapter._id || this.editingChapter.id) === id) {
          this.editingChapter.contentType = 'markdown'
          this.editingChapter.content = targetChapterState.content
      }

      try {
        // 1. Fetch problem details
        let docId = firstProblemId
        let domainId = 'system'
        if (firstProblemId.includes(':')) {
            [domainId, docId] = firstProblemId.split(':')
        }
        
        const docsRes = await request(`/api/documents?domainId=${domainId}&limit=1000`)
        const doc = docsRes.docs.find(d => String(d.docId) === String(docId))
        
        if (!doc) throw new Error('未找到该题目')

        // Auto-update chapter title
        if (doc.title && targetChapterTitle !== doc.title) {
            // Update local tree
            this.updateChapterInTree(id, { title: doc.title })
            
            // If still editing this chapter, update the view
            if ((this.editingChapter._id || this.editingChapter.id) === id) {
                this.editingChapter.title = doc.title
            }

            // Update server using captured IDs and state
            const problemIds = (targetChapterState.problemIdsStr || '')
                .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

            await request(`/api/course/levels/${targetLevelId}/topics/${targetTopicId}/chapters/${targetChapterId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: doc.title,
                    content: targetChapterState.content,
                    contentType: targetChapterState.contentType,
                    resourceUrl: targetChapterState.resourceUrl,
                    problemIds: problemIds,
                    optional: targetChapterState.optional
                })
            })
        }

        // 1.5 Fetch User's Best Submission
        let userCode = ''
        try {
            const subRes = await request(`/api/course/submission/best?domainId=${domainId}&docId=${docId}`)
            if (subRes && subRes.code) {
                userCode = subRes.code
                this.showToastMessage('已找到您的 AC 代码，将基于此生成教案')
            }
        } catch (e) {
            console.warn('Failed to fetch submission', e)
        }

        // 2. Generate Plan (Background Mode)
        this.aiStatusMap[id] = '正在提交后台生成任务...'
        
        await request.post('/api/solution-plan/background', {
            problem: doc.content,
            code: userCode,
            chapterId: targetChapterId, // Use captured ID
            topicId: targetTopicId, // Use captured ID
            clientKey: id,
            model: this.selectedModel
        })
        
        this.aiStatusMap[id] = '正在后台生成教案中...'
        this.showToastMessage('后台生成任务已提交！请耐心等待...')

      } catch (e) {
        this.showToastMessage('生成失败: ' + e.message)
        this.aiLoadingMap[id] = false
        this.aiStatusMap[id] = ''
        this.editingChapter.content = '生成失败，请重试'
      }
    },

    async generateSolutionReport() {
      if (!this.editingChapter.problemIdsStr) return this.showToastMessage('请先在下方关联题目 ID')
      
      try { await this.ensureChapterSaved() } catch (e) { return }

      if (!confirm('确定要生成题解报告吗？生成过程将在后台进行，您可以关闭此页面。')) return
      
      // Check if we have a generated solution plan
      let solutionPlan = ''
      if (this.editingChapter.contentType === 'markdown' && this.editingChapter.content && this.editingChapter.content.length > 100) {
          if (confirm('检测到当前章节已有 Markdown 内容（可能是解题教案）。是否基于该教案生成 PPT？\n点击“确定”基于教案生成（推荐），点击“取消”基于原始题目生成。')) {
              solutionPlan = this.editingChapter.content
          }
      }

      // Get the first problem ID
      const firstProblemId = this.editingChapter.problemIdsStr.split(/[,，]/)[0].trim()
      if (!firstProblemId) return this.showToastMessage('未找到有效的题目 ID')

      // Capture ALL necessary context at the start
      const id = this.editingChapter._id || this.editingChapter.id
      const targetChapterId = this.editingChapter.id 
      const targetTopicId = this.editingTopicForChapter._id 
      const targetLevelId = this.editingLevelForChapter._id
      const targetChapterTitle = this.editingChapter.title 
      const targetLevel = this.editingLevelForChapter.level
      const targetTopicTitle = this.editingTopicForChapter.title
      const targetLanguage = this.editingLevelForChapter.subject || 'C++'
      const targetGroup = this.editingLevelForChapter.group
      const targetLevelTitle = this.editingLevelForChapter.title
      
      // Capture chapter state for potential update
      const targetChapterState = {
          content: this.editingChapter.content,
          contentType: 'html', // We are setting this
          resourceUrl: this.editingChapter.resourceUrl,
          problemIdsStr: this.editingChapter.problemIdsStr,
          optional: this.editingChapter.optional
      }

      this.aiLoadingMap[id] = true
      this.aiStatusMap[id] = '正在获取题目信息...'
      
      // Immediately switch to HTML mode (Update tree and current view if matches)
      this.updateChapterInTree(id, { contentType: 'html' })
      if ((this.editingChapter._id || this.editingChapter.id) === id) {
          this.editingChapter.contentType = 'html'
      }

      try {
        // 1. Fetch problem details
        let docId = firstProblemId
        let domainId = 'system'
        if (firstProblemId.includes(':')) {
            [domainId, docId] = firstProblemId.split(':')
        }
        
        const docsRes = await request(`/api/documents?domainId=${domainId}&limit=1000`) // Potential perf issue
        const doc = docsRes.docs.find(d => String(d.docId) === String(docId))
        
        if (!doc) throw new Error('未找到该题目')

        // Auto-update chapter title to problem title
        if (doc.title && targetChapterTitle !== doc.title) {
            // Update local tree
            this.updateChapterInTree(id, { title: doc.title })
            
            // If still editing this chapter, update the view
            if ((this.editingChapter._id || this.editingChapter.id) === id) {
                this.editingChapter.title = doc.title
            }

            // Update server using captured IDs and state
            const problemIds = (targetChapterState.problemIdsStr || '')
                .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

            await request(`/api/course/levels/${targetLevelId}/topics/${targetTopicId}/chapters/${targetChapterId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: doc.title,
                    content: targetChapterState.content,
                    contentType: targetChapterState.contentType,
                    resourceUrl: targetChapterState.resourceUrl,
                    problemIds: problemIds,
                    optional: targetChapterState.optional
                })
            })
        }

        let problemText = doc.content
        
        // 1.5 Fetch User's Best Submission
        let userCode = ''
        try {
            const subRes = await request(`/api/course/submission/best?domainId=${domainId}&docId=${docId}`)
            if (subRes && subRes.code) {
                userCode = subRes.code
                this.showToastMessage('已找到您的 AC 代码，将基于此生成讲解')
            }
        } catch (e) {
            console.warn('Failed to fetch submission', e)
        }

        // 2. Generate Report (Background Mode)
        this.aiStatusMap[id] = '正在提交后台生成任务...'
        
        await request.post('/api/solution-report/background', {
            problem: problemText,
            code: userCode,
            reference: '',
            solutionPlan: solutionPlan,
            level: targetLevel,
            topicTitle: targetTopicTitle,
            chapterTitle: targetChapterTitle,
            problemTitle: doc.title,
            chapterId: targetChapterId, // Use captured ID
            topicId: targetTopicId, // Use captured ID
            clientKey: id, // Pass the UI key (usually _id) to server
            model: this.selectedModel,
            language: targetLanguage,
            group: targetGroup,
            levelTitle: targetLevelTitle
        })
        
        this.aiStatusMap[id] = '正在后台生成题解中...'
        this.showToastMessage('后台生成任务已提交！请耐心等待...')

      } catch (e) {
        this.showToastMessage('生成失败: ' + e.message)
        this.aiLoadingMap[id] = false
        this.aiStatusMap[id] = ''
      }
    },

    async generateTopicDescription() {
      if (!this.editingTopic.title) return this.showToastMessage('请先填写知识点标题')
      if (!confirm('确定要生成描述吗？生成过程将在后台进行，您可以关闭此页面。')) return
      
      // Capture the ID and Title of the topic being generated to handle context switching
      const targetTopicId = this.editingTopic._id || this.editingTopic.id;
      const levelId = this.editingLevelForTopic._id;

      this.aiLoadingMap[targetTopicId] = true
      this.aiStatusMap[targetTopicId] = '正在提交后台任务...'
      try {
        // Prepare existing chapters info
        const existingChapters = (this.editingTopic.chapters || []).map(c => ({
            title: c.title,
            contentPreview: c.content ? c.content.slice(0, 200).replace(/\n/g, ' ') + '...' : ''
        }))

        const groupName = this.editingLevelForTopic.group
        const groupObj = this.groups.find(g => g.name === groupName)
        const language = groupObj ? (groupObj.language || 'C++') : 'C++'

        await request('/api/topic-plan/background', {
          method: 'POST',
          body: JSON.stringify({
            topic: this.editingTopic.title,
            level: `Level ${this.editingLevelForTopic.level}`,
            existingChapters: existingChapters,
            mode: 'description',
            model: this.selectedModel,
            language: language,
            topicId: targetTopicId,
            levelId: levelId,
            clientKey: targetTopicId
          })
        })
        
        this.showToastMessage('描述生成任务已提交后台，完成后会自动保存')
        this.aiStatusMap[targetTopicId] = '正在后台生成中...'
      } catch (e) {
        this.showToastMessage('提交失败: ' + e.message)
        this.aiLoadingMap[targetTopicId] = false
        this.aiStatusMap[targetTopicId] = ''
      }
    },

    async generateTopicChapters() {
      if (!this.editingTopic.title) return this.showToastMessage('请先填写知识点标题')
      if (!confirm('确定要生成章节列表吗？生成过程将在后台进行，您可以关闭此页面。')) return

      const targetTopicId = this.editingTopic._id || this.editingTopic.id;
      const levelId = this.editingLevelForTopic._id;

      this.aiLoadingMap[targetTopicId] = true
      this.aiStatusMap[targetTopicId] = '正在提交后台任务...'
      try {
        const existingChapters = (this.editingTopic.chapters || []).map(c => ({
            title: c.title,
            contentPreview: c.content ? c.content.slice(0, 200).replace(/\n/g, ' ') + '...' : ''
        }))

        const groupName = this.editingLevelForTopic.group
        const groupObj = this.groups.find(g => g.name === groupName)
        const language = groupObj ? (groupObj.language || 'C++') : 'C++'

        await request('/api/topic-plan/background', {
          method: 'POST',
          body: JSON.stringify({
            topic: this.editingTopic.title,
            level: `Level ${this.editingLevelForTopic.level}`,
            existingChapters: existingChapters,
            mode: 'chapters',
            model: this.selectedModel,
            language: language,
            topicId: targetTopicId,
            levelId: levelId,
            clientKey: targetTopicId
          })
        })
        
        this.showToastMessage('章节列表生成任务已提交后台，完成后会自动保存')
        this.aiStatusMap[targetTopicId] = '正在后台生成中...'
      } catch (e) {
        this.showToastMessage('提交失败: ' + e.message)
        this.aiLoadingMap[targetTopicId] = false
        this.aiStatusMap[targetTopicId] = ''
      }
    },

    async batchGenerateLessonPlans() {
      if (!this.editingTopic.chapters || this.editingTopic.chapters.length === 0) return this.showToastMessage('当前知识点没有章节')
      if (!confirm(`确定要为本知识点下的 ${this.editingTopic.chapters.length} 个章节生成教案吗？这将覆盖已有内容。`)) return

      const levelNum = this.editingLevelForTopic.level
      const topicTitle = this.editingTopic.title
      const groupName = this.editingLevelForTopic.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const model = this.selectedModel

      const topicId = this.selectedNode.id
      this.aiLoadingMap[topicId] = true
      let successCount = 0

      for (let i = 0; i < this.editingTopic.chapters.length; i++) {
        const chapter = this.editingTopic.chapters[i]
        const chapterId = chapter._id || chapter.id
        const chapterTitle = chapter.title

        this.aiStatusMap[topicId] = `正在提交教案任务 (${i + 1}/${this.editingTopic.chapters.length}): ${chapterTitle}`
        
        try {
            this.aiLoadingMap[chapterId] = true
            this.aiStatusMap[chapterId] = '正在后台生成教案...'

            await request('/api/lesson-plan/background', {
                method: 'POST',
                body: JSON.stringify({
                    topic: chapterTitle,
                    context: topicTitle,
                    topicId: topicId,
                    level: `Level ${levelNum}`,
                    requirements: '', 
                    model: model,
                    language: language,
                    chapterId: chapterId,
                    clientKey: chapterId,
                    existingContent: chapter.content || ''
                })
            })
            successCount++
        } catch (e) {
            console.error(`Failed to submit lesson plan for ${chapterTitle}`, e)
            this.aiLoadingMap[chapterId] = false
            this.aiStatusMap[chapterId] = '提交失败'
        }
        await new Promise(r => setTimeout(r, 500))
      }

      this.aiLoadingMap[topicId] = false
      this.aiStatusMap[topicId] = ''
      this.showToastMessage(`批量任务提交完成，共提交 ${successCount} 个任务`)
    },

    async batchGeneratePPTs() {
      if (!this.editingTopic.chapters || this.editingTopic.chapters.length === 0) return this.showToastMessage('当前知识点没有章节')
      if (!confirm(`确定要为本知识点下的 ${this.editingTopic.chapters.length} 个章节生成 PPT 吗？`)) return

      const levelNum = this.editingLevelForTopic.level
      const levelTitle = this.editingLevelForTopic.title
      const topicTitle = this.editingTopic.title
      const groupName = this.editingLevelForTopic.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const model = this.selectedModel
      
      const chapterList = this.editingTopic.chapters.map(c => c.title)

      const topicId = this.selectedNode.id
      this.aiLoadingMap[topicId] = true
      let successCount = 0

      for (let i = 0; i < this.editingTopic.chapters.length; i++) {
        const chapter = this.editingTopic.chapters[i]
        const chapterId = chapter._id || chapter.id
        const chapterTitle = chapter.title
        
        this.aiStatusMap[topicId] = `正在提交 PPT 任务 (${i + 1}/${this.editingTopic.chapters.length}): ${chapterTitle}`

        try {
            this.aiLoadingMap[chapterId] = true
            this.aiStatusMap[chapterId] = '正在后台生成 PPT...'
            
            // 始终从服务端拉取最新内容
            let chapterContent = ''
            try {
                const res = await request(`/api/course/chapter/${chapterId}`)
                if (res && res.content) chapterContent = res.content
            } catch (e) { console.warn('Failed to fetch chapter content', e) }
            
            console.log(`[batchGeneratePPTs] chapter "${chapterTitle}" content length:`, chapterContent.length)
            
            await request('/api/generate-ppt/background', {
              method: 'POST',
              body: JSON.stringify({
                topic: chapterTitle,
                context: topicTitle,
                level: `Level ${levelNum}`,
                model: model,
                language: language,
                chapterList: chapterList,
                currentChapterIndex: i,
                chapterContent: chapterContent,
                requirements: '',
                chapterId: chapterId,
                topicId: topicId,
                topicTitle: topicTitle,
                chapterTitle: chapterTitle,
                levelNum: levelNum,
                levelTitle: levelTitle,
                clientKey: chapterId,
                group: groupName
              })
            })
            successCount++
        } catch (e) {
            console.error(`Failed to submit PPT for ${chapterTitle}`, e)
            this.aiLoadingMap[chapterId] = false
            this.aiStatusMap[chapterId] = '提交失败'
        }
        await new Promise(r => setTimeout(r, 500))
      }

      this.aiLoadingMap[topicId] = false
      this.aiStatusMap[topicId] = ''
      this.showToastMessage(`批量任务提交完成，共提交 ${successCount} 个任务`)
    },

    async batchGenerateSolutionPlans() {
      if (!this.editingTopic.chapters || this.editingTopic.chapters.length === 0) return this.showToastMessage('当前知识点没有章节')
      if (!confirm(`确定要为本知识点下的所有章节生成解题教案(Markdown)吗？只有关联了题目的章节才会生成。`)) return

      const model = this.selectedModel
      const topicId = this.selectedNode.id
      this.aiLoadingMap[topicId] = true
      let successCount = 0
      let skippedCount = 0

      for (let i = 0; i < this.editingTopic.chapters.length; i++) {
        const chapter = this.editingTopic.chapters[i]
        const chapterId = chapter._id || chapter.id
        const chapterTitle = chapter.title
        
        if (!chapter.problemIds || chapter.problemIds.length === 0) {
            skippedCount++
            continue
        }

        this.aiStatusMap[topicId] = `正在提交解题教案任务 (${i + 1}/${this.editingTopic.chapters.length}): ${chapterTitle}`

        try {
            this.aiLoadingMap[chapterId] = true
            this.aiStatusMap[chapterId] = '正在获取题目信息...'

            let firstProblemId = chapter.problemIds[0]
            if (typeof firstProblemId === 'object') firstProblemId = firstProblemId.docId || firstProblemId.id
            
            let docId = firstProblemId
            let domainId = 'system'
            if (String(firstProblemId).includes(':')) {
                [domainId, docId] = String(firstProblemId).split(':')
            }

            const docsRes = await request(`/api/documents?domainId=${domainId}&limit=1000`)
            const doc = docsRes.docs.find(d => String(d.docId) === String(docId))
            if (!doc) throw new Error('未找到题目')
            
            let problemText = doc.content
            let userCode = ''
            
            try {
                const subRes = await request(`/api/course/submission/best?domainId=${domainId}&docId=${docId}`)
                if (subRes && subRes.code) userCode = subRes.code
            } catch (e) {}

            await request('/api/solution-plan/background', {
                method: 'POST',
                body: JSON.stringify({
                    problem: problemText,
                    code: userCode,
                    chapterId: chapterId,
                    topicId: topicId,
                    clientKey: chapterId,
                    model: model
                })
            })
            
            this.aiStatusMap[chapterId] = '正在后台生成解题教案...'
            successCount++
        } catch (e) {
            console.error(`Failed to submit solution plan for ${chapterTitle}`, e)
            this.aiLoadingMap[chapterId] = false
            this.aiStatusMap[chapterId] = '提交失败'
        }
        await new Promise(r => setTimeout(r, 500))
      }

      this.aiLoadingMap[topicId] = false
      this.aiStatusMap[topicId] = ''
      this.showToastMessage(`批量任务提交完成: 成功 ${successCount} 个, 跳过 ${skippedCount} 个`)
    },

    async batchGenerateSolutionReports() {
      if (!this.editingTopic.chapters || this.editingTopic.chapters.length === 0) return this.showToastMessage('当前知识点没有章节')
      if (!confirm(`确定要为本知识点下的所有章节生成题解报告吗？只有关联了题目的章节才会生成。`)) return

      const levelNum = this.editingLevelForTopic.level
      const levelTitle = this.editingLevelForTopic.title
      const topicTitle = this.editingTopic.title
      const groupName = this.editingLevelForTopic.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const model = this.selectedModel

      const topicId = this.selectedNode.id
      this.aiLoadingMap[topicId] = true
      let successCount = 0
      let skippedCount = 0

      for (let i = 0; i < this.editingTopic.chapters.length; i++) {
        const chapter = this.editingTopic.chapters[i]
        const chapterId = chapter._id || chapter.id
        const chapterTitle = chapter.title
        
        if (!chapter.problemIds || chapter.problemIds.length === 0) {
            skippedCount++
            continue
        }

        this.aiStatusMap[topicId] = `正在提交题解任务 (${i + 1}/${this.editingTopic.chapters.length}): ${chapterTitle}`

        try {
            this.aiLoadingMap[chapterId] = true
            this.aiStatusMap[chapterId] = '正在获取题目信息...'

            let firstProblemId = chapter.problemIds[0]
            if (typeof firstProblemId === 'object') firstProblemId = firstProblemId.docId || firstProblemId.id
            
            let docId = firstProblemId
            let domainId = 'system'
            if (String(firstProblemId).includes(':')) {
                [domainId, docId] = String(firstProblemId).split(':')
            }

            const docsRes = await request(`/api/documents?domainId=${domainId}&limit=1000`)
            const doc = docsRes.docs.find(d => String(d.docId) === String(docId))
            if (!doc) throw new Error('未找到题目')
            
            let problemText = doc.content
            let userCode = ''
            
            try {
                const subRes = await request(`/api/course/submission/best?domainId=${domainId}&docId=${docId}`)
                if (subRes && subRes.code) userCode = subRes.code
            } catch (e) {}

            // Check if chapter already has a solution plan (markdown content)
            let solutionPlan = ''
            if (chapter.contentType === 'markdown' && chapter.content && chapter.content.length > 100) {
                solutionPlan = chapter.content
                console.log(`[Batch] Using existing solution plan for chapter: ${chapterTitle}`)
            }

            await request('/api/solution-report/background', {
                method: 'POST',
                body: JSON.stringify({
                    problem: problemText,
                    code: userCode,
                    reference: '',
                    solutionPlan: solutionPlan,
                    level: levelNum,
                    topicTitle: topicTitle,
                    chapterTitle: chapterTitle,
                    problemTitle: doc.title,
                    chapterId: chapterId,
                    topicId: topicId,
                    clientKey: chapterId,
                    model: model,
                    language: language,
                    group: groupName,
                    levelTitle: levelTitle
                })
            })
            
            this.aiStatusMap[chapterId] = '正在后台生成题解...'
            successCount++
        } catch (e) {
            console.error(`Failed to submit solution report for ${chapterTitle}`, e)
            this.aiLoadingMap[chapterId] = false
            this.aiStatusMap[chapterId] = '提交失败'
        }
        await new Promise(r => setTimeout(r, 500))
      }

      this.aiLoadingMap[topicId] = false
      this.aiStatusMap[topicId] = ''
      this.showToastMessage(`批量任务提交完成: 成功 ${successCount} 个, 跳过 ${skippedCount} 个`)
    },

    async batchGenerateLevelLessonPlans() {
      if (!this.editingLevel.topics || this.editingLevel.topics.length === 0) return this.showToastMessage('当前模块没有知识点')
      if (!confirm(`确定要为本模块下的所有章节生成教案吗？这将覆盖已有内容。`)) return

      const levelNum = this.editingLevel.level
      const groupName = this.editingLevel.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const model = this.selectedModel

      const levelId = this.selectedNode.id
      this.aiLoadingMap[levelId] = true
      let successCount = 0

      for (const topic of this.editingLevel.topics) {
          if (!topic.chapters) continue
          const topicTitle = topic.title
          const topicId = topic._id || topic.id

          for (let i = 0; i < topic.chapters.length; i++) {
            const chapter = topic.chapters[i]
            const chapterId = chapter._id || chapter.id
            const chapterTitle = chapter.title

            this.aiStatusMap[levelId] = `正在提交教案任务: ${topicTitle} - ${chapterTitle}`
            
            try {
                this.aiLoadingMap[chapterId] = true
                this.aiStatusMap[chapterId] = '正在后台生成教案...'

                await request('/api/lesson-plan/background', {
                    method: 'POST',
                    body: JSON.stringify({
                        topic: chapterTitle,
                        context: topicTitle,
                        topicId: topicId,
                        level: `Level ${levelNum}`,
                        requirements: '', 
                        model: model,
                        language: language,
                        chapterId: chapterId,
                        clientKey: chapterId,
                        existingContent: chapter.content || ''
                    })
                })
                successCount++
            } catch (e) {
                console.error(`Failed to submit lesson plan for ${chapterTitle}`, e)
                this.aiLoadingMap[chapterId] = false
                this.aiStatusMap[chapterId] = '提交失败'
            }
            await new Promise(r => setTimeout(r, 500))
          }
      }

      this.aiLoadingMap[levelId] = false
      this.aiStatusMap[levelId] = ''
      this.showToastMessage(`批量任务提交完成，共提交 ${successCount} 个任务`)
    },

    async batchGenerateLevelPPTs() {
      if (!this.editingLevel.topics || this.editingLevel.topics.length === 0) return this.showToastMessage('当前模块没有知识点')
      if (!confirm(`确定要为本模块下的所有章节生成 PPT 吗？`)) return

      const levelNum = this.editingLevel.level
      const levelTitle = this.editingLevel.title
      const groupName = this.editingLevel.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const model = this.selectedModel
      
      const levelId = this.selectedNode.id
      this.aiLoadingMap[levelId] = true
      let successCount = 0

      for (const topic of this.editingLevel.topics) {
          if (!topic.chapters) continue
          const topicTitle = topic.title
          const topicId = topic._id || topic.id
          const chapterList = topic.chapters.map(c => c.title)

          for (let i = 0; i < topic.chapters.length; i++) {
            const chapter = topic.chapters[i]
            const chapterId = chapter._id || chapter.id
            const chapterTitle = chapter.title
            
            this.aiStatusMap[levelId] = `正在提交 PPT 任务: ${topicTitle} - ${chapterTitle}`

            try {
                this.aiLoadingMap[chapterId] = true
                this.aiStatusMap[chapterId] = '正在后台生成 PPT...'
                
                // 始终从服务端拉取最新内容
                let chapterContent = ''
                try {
                    const res = await request(`/api/course/chapter/${chapterId}`)
                    if (res && res.content) chapterContent = res.content
                } catch (e) { console.warn('Failed to fetch chapter content', e) }
                
                await request('/api/generate-ppt/background', {
                  method: 'POST',
                  body: JSON.stringify({
                    topic: chapterTitle,
                    context: topicTitle,
                    level: `Level ${levelNum}`,
                    model: model,
                    language: language,
                    chapterList: chapterList,
                    currentChapterIndex: i,
                    chapterContent: chapterContent,
                    requirements: '',
                    chapterId: chapterId,
                    topicId: topicId,
                    topicTitle: topicTitle,
                    chapterTitle: chapterTitle,
                    levelNum: levelNum,
                    levelTitle: levelTitle,
                    clientKey: chapterId,
                    group: groupName
                  })
                })
                successCount++
            } catch (e) {
                console.error(`Failed to submit PPT for ${chapterTitle}`, e)
                this.aiLoadingMap[chapterId] = false
                this.aiStatusMap[chapterId] = '提交失败'
            }
            await new Promise(r => setTimeout(r, 500))
          }
      }

      this.aiLoadingMap[levelId] = false
      this.aiStatusMap[levelId] = ''
      this.showToastMessage(`批量任务提交完成，共提交 ${successCount} 个任务`)
    },

    async batchGenerateLevelSolutionReports() {
      if (!this.editingLevel.topics || this.editingLevel.topics.length === 0) return this.showToastMessage('当前模块没有知识点')
      if (!confirm(`确定要为本模块下的所有章节生成题解报告吗？只有关联了题目的章节才会生成。`)) return

      const levelNum = this.editingLevel.level
      const groupName = this.editingLevel.group
      const groupObj = this.groups.find(g => g.name === groupName)
      const language = groupObj ? (groupObj.language || 'C++') : 'C++'
      const model = this.selectedModel

      const levelId = this.selectedNode.id
      this.aiLoadingMap[levelId] = true
      let successCount = 0
      let skippedCount = 0

      for (const topic of this.editingLevel.topics) {
          if (!topic.chapters) continue
          const topicTitle = topic.title
          const topicId = topic._id || topic.id

          for (let i = 0; i < topic.chapters.length; i++) {
            const chapter = topic.chapters[i]
            const chapterId = chapter._id || chapter.id
            const chapterTitle = chapter.title
            
            if (!chapter.problemIds || chapter.problemIds.length === 0) {
                skippedCount++
                continue
            }

            this.aiStatusMap[levelId] = `正在提交题解任务: ${topicTitle} - ${chapterTitle}`

            try {
                this.aiLoadingMap[chapterId] = true
                this.aiStatusMap[chapterId] = '正在获取题目信息...'

                let firstProblemId = chapter.problemIds[0]
                if (typeof firstProblemId === 'object') firstProblemId = firstProblemId.docId || firstProblemId.id
                
                let docId = firstProblemId
                let domainId = 'system'
                if (String(firstProblemId).includes(':')) {
                    [domainId, docId] = String(firstProblemId).split(':')
                }

                const docsRes = await request(`/api/documents?domainId=${domainId}&limit=1000`)
                const doc = docsRes.docs.find(d => String(d.docId) === String(docId))
                if (!doc) throw new Error('未找到题目')
                
                let problemText = doc.content
                let userCode = ''
                
                try {
                    const subRes = await request(`/api/course/submission/best?domainId=${domainId}&docId=${docId}`)
                    if (subRes && subRes.code) userCode = subRes.code
                } catch (e) {}

                await request('/api/solution-report/background', {
                    method: 'POST',
                    body: JSON.stringify({
                        problem: problemText,
                        code: userCode,
                        reference: '',
                        level: levelNum,
                        topicTitle: topicTitle,
                        chapterTitle: chapterTitle,
                        problemTitle: doc.title,
                        chapterId: chapterId,
                        topicId: topicId,
                        clientKey: chapterId,
                        model: model,
                        language: language,
                        group: groupName
                    })
                })
                
                this.aiStatusMap[chapterId] = '正在后台生成题解...'
                successCount++
            } catch (e) {
                console.error(`Failed to submit solution report for ${chapterTitle}`, e)
                this.aiLoadingMap[chapterId] = false
                this.aiStatusMap[chapterId] = '提交失败'
            }
            await new Promise(r => setTimeout(r, 500))
          }
      }

      this.aiLoadingMap[levelId] = false
      this.aiStatusMap[levelId] = ''
      this.showToastMessage(`批量任务提交完成: 成功 ${successCount} 个, 跳过 ${skippedCount} 个`)
    },

    findTopicInTree(topicId) {
      if (this.levels) {
        for (const level of this.levels) {
            if (level.topics) {
                const topic = level.topics.find(t => t._id === topicId || t.id === topicId)
                if (topic) return topic
            }
        }
      }
      return null
    },

    updateChapterInTree(chapterId, updates) {
      // Try to find in current context first (fastest)
      if (this.editingTopicForChapter && this.editingTopicForChapter.chapters) {
          const chapter = this.editingTopicForChapter.chapters.find(c => c.id === chapterId || c._id === chapterId)
          if (chapter) {
              Object.assign(chapter, updates)
              return
          }
      }
      
      // Fallback: Search entire tree
      if (this.levels) {
        for (const level of this.levels) {
            if (level.topics) {
                for (const topic of level.topics) {
                    if (topic.chapters) {
                        const chapter = topic.chapters.find(c => c.id === chapterId || c._id === chapterId)
                        if (chapter) {
                            Object.assign(chapter, updates)
                            return
                        }
                    }
                }
            }
        }
      }
    },

    resetAiStatus() {
      if (!this.selectedNode) return
      const id = this.selectedNode.id
      this.aiLoadingMap[id] = false
      this.aiStatusMap[id] = ''
      this.showToastMessage('状态已重置，您可以重新尝试')
    }
  }
}
</script>

<style scoped>
.course-editor-panel {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.course-editor-panel .editor-panel {
  flex: 1;
  min-width: 0;
}

.btn-close-embedded {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
  flex-shrink: 0;
}
.btn-close-embedded:hover {
  background: #dc2626;
}

/* Hydro 式双栏编辑布局 */
.editor-layout {
  display: flex;
  flex-direction: row-reverse; /* 右侧操作栏在右 */
  gap: 16px;
  align-items: flex-start;
  min-height: 100%;
}
.editor-main-area {
  flex: 1;
  min-width: 0;
}
.editor-action-sidebar {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 16px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
.eas-btn {
  display: block;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, opacity 0.15s;
}
.eas-btn:hover { opacity: 0.85; }
.eas-save    { background: #6366f1; color: #fff; }
.eas-delete  { background: #fee2e2; color: #b91c1c; }
.eas-delete:hover { background: #fecaca; }
.eas-warn    { background: #fef3c7; color: #92400e; }
.eas-warn:hover  { background: #fde68a; }
.eas-move    { background: #f1f5f9; color: #475569; }
.eas-move:hover  { background: #e2e8f0; }
.eas-download{ background: #f0fdf4; color: #166534; }
.eas-download:hover { background: #dcfce7; }
.eas-exit    { background: #4f46e5; color: #fff; }
.eas-exit:hover  { background: #3730a3; }
.eas-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 2px 0;
}
.eas-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.eas-select {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}
.eas-readonly {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 4px 0;
}

/* Variables & Reset */
.course-editor-panel {
  --primary-color: #6366f1; /* Indigo 500 */
  --primary-hover: #4f46e5; /* Indigo 600 */
  --primary-light: #e0e7ff; /* Indigo 100 */
  --secondary-color: #64748b; /* Slate 500 */
  --success-color: #10b981; /* Emerald 500 */
  --danger-color: #ef4444; /* Red 500 */
  --warning-color: #f59e0b; /* Amber 500 */
  --bg-color: #f8fafc; /* Slate 50 */
  --sidebar-bg: #ffffff;
  --border-color: #e2e8f0; /* Slate 200 */
  --text-main: #0f172a; /* Slate 900 */
  --text-secondary: #475569; /* Slate 600 */
  --text-muted: #94a3b8; /* Slate 400 */
  --active-bg: #eff6ff; /* Blue 50 */
  --active-border: #3b82f6; /* Blue 500 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-color);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-main);
}

/* Scrollbar Styling */
.editor-panel::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.editor-panel::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.editor-panel::-webkit-scrollbar-track {
  background: transparent;
}

/* Editor Panel */
.editor-panel {
  flex: 1;
  padding: 32px 48px;
  overflow-y: auto;
  background: var(--bg-color);
}

.editor-form {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
}
.empty-state p {
  font-size: 16px;
  margin-top: 16px;
  font-weight: 500;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
  padding-top: 10px;
}
.editor-header h2 { 
  margin: 0; 
  font-size: 24px; 
  font-weight: 700;
  color: var(--text-main); 
  letter-spacing: -0.025em;
}

.header-actions { display: flex; gap: 12px; align-items: center; }
.move-actions { display: flex; gap: 8px; margin-right: 12px; padding-right: 12px; border-right: 1px solid var(--border-color); }

.model-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  background-color: #fff;
  color: var(--text-main);
  min-width: 180px;
  cursor: pointer;
  transition: all 0.2s;
}
.model-select:hover { border-color: #cbd5e1; }
.model-select:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }

.btn-save {
  padding: 10px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}
.btn-save:hover { 
  background: var(--primary-hover); 
  transform: translateY(-1px); 
  box-shadow: var(--shadow-md); 
}
.btn-save:active { transform: translateY(0); }

.btn-delete {
  padding: 10px 20px;
  background: white;
  color: var(--danger-color);
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}
.btn-delete:hover { background: #fef2f2; border-color: var(--danger-color); }

.btn-small {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}
.btn-small:hover { 
  background: #f8fafc; 
  color: var(--primary-color); 
  border-color: var(--primary-color); 
}

/* Forms */
.form-group { margin-bottom: 24px; }
.form-row { display: flex; gap: 24px; }
.half { flex: 1; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-main);
  font-size: 14px;
}
.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  background: #fff;
  box-sizing: border-box;
  color: var(--text-main);
}
.form-input:hover { border-color: #cbd5e1; }
.form-input:focus { 
  border-color: var(--primary-color); 
  outline: none; 
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); 
}
.form-input.disabled { background: #f8fafc; color: var(--text-muted); cursor: not-allowed; }
.code-font { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 13px; line-height: 1.6; }

.hint { font-size: 13px; color: var(--text-muted); margin-top: 8px; display: block; }

.split-view {
  display: flex;
  gap: 0;
  height: 600px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.split-view .form-input { 
  flex: 1; 
  resize: none; 
  border: none; 
  border-right: 1px solid var(--border-color);
  border-radius: 0;
  padding: 20px;
  padding-bottom: 80px;
  overflow-y: auto;
}
.preview-box {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #fff;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.preview-container-large {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  height: 600px;
  background: #fff;
  overflow: hidden;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Checkbox */
.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

/* AI Assistant */
.ai-assistant-box {
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px -2px rgba(99, 102, 241, 0.05);
}
.ai-assistant-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), #818cf8);
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.ai-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-status {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary-light);
  padding: 4px 12px;
  border-radius: 20px;
}
.ai-status::before {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: pulse-dot 1.5s infinite;
}

.status-container {
    display: flex;
    align-items: center;
    gap: 12px;
}
.btn-reset {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
}
.btn-reset:hover { color: var(--danger-color); }

.ai-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.ai-controls.disabled {
  opacity: 0.6;
  pointer-events: none;
  filter: grayscale(0.2);
}
.ai-input {
  flex: 1;
  margin-bottom: 0 !important;
  min-width: 240px;
  border-color: #e0e7ff;
}
.ai-input:focus { border-color: var(--primary-color); }

.ai-buttons {
  display: flex;
  gap: 10px;
}
.btn-ai {
  padding: 10px 20px;
  background: white;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-ai:hover {
  background: var(--primary-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.btn-ai:active { transform: translateY(0); }
.btn-ai:disabled {
  background: #f1f5f9;
  color: #cbd5e1;
  border-color: #e2e8f0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-ai-purple {
  background-color: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}
.btn-ai-purple:hover {
  background-color: #7c3aed;
  border-color: #7c3aed;
  color: white;
}

.btn-ai-pink {
  background-color: #ec4899;
  color: white;
  border-color: #ec4899;
}
.btn-ai-pink:hover {
  background-color: #db2777;
  border-color: #db2777;
  color: white;
}

.btn-ai-green {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
}
.btn-ai-green:hover {
  background-color: #059669;
  border-color: #059669;
  color: white;
}

.btn-download-md {
  margin-right: 8px;
  background-color: #6366f1;
  color: white;
  border-color: #6366f1;
}
.btn-download-md:hover {
  background-color: #4f46e5;
  border-color: #4f46e5;
  color: white;
}


@keyframes pulse-dot {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

/* Checkbox list */
.checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  max-height: 200px;
  overflow-y: auto;
}
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 10px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  user-select: none;
  transition: all 0.2s;
}
.checkbox-item:hover {
  border-color: var(--primary-color);
  background: #f8fafc;
}
.badge-readonly {
  background-color: #fef2f2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #fecaca;
  font-weight: 600;
}

.problem-links-preview {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.problem-link-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: #f0f9ff;
  color: #0284c7;
  border: 1px solid #bae6fd;
  border-radius: 16px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s;
}

.problem-link-tag:hover {
  background-color: #e0f2fe;
  border-color: #7dd3fc;
  transform: translateY(-1px);
}
</style>
