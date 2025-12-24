<template>
  <div class="design-container">
    <!-- Left Sidebar: Tree View -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>课程结构</h3>
        <button v-if="isAdmin" @click="createNewGroup" class="btn-add-level" style="margin-bottom: 8px;">+ 添加分组 (Group)</button>
      </div>

      <div v-if="loadingCourses" class="loading-text">加载中...</div>
      <div v-else class="tree-container">
        <div v-for="group in displayGroups" :key="group.name" class="tree-node-group">
            <!-- Group Node -->
            <div 
                :class="['tree-item', 'group-item', { active: isSelected('group', group._id || group.name) }]"
                @click="selectNode('group', group); toggleGroupCollapse(group)"
            >
                <span class="tree-icon" @click.stop="toggleGroupCollapse(group)">{{ group.collapsed ? '▶' : '▼' }}</span>
                <span class="tree-label">{{ group.title || group.name }}</span>
                <span v-if="isExplicitEditor(group)" class="permission-icon" title="您拥有此分组的编辑权限" style="margin-left: 5px; font-size: 12px;">✏️</span>
                <div class="tree-actions">
                    <button @click.stop="createNewLevel(group)" class="btn-icon" title="添加模块">+</button>
                </div>
            </div>

            <!-- Levels (Children of Group) -->
            <div v-show="!group.collapsed" class="tree-children">
                <div v-for="level in getLevelsForGroup(group.name)" :key="level._id" class="tree-node-level">
                <!-- Level Node -->
                <div 
                    :class="['tree-item', 'level-item', { active: isSelected('level', level._id) }]"
                    @click="selectNode('level', level); toggleLevelDesc(level)"
                >
                    <span class="tree-icon" @click.stop="toggleLevelDesc(level)">{{ level.descCollapsed ? '▶' : '▼' }}</span>
                    <span class="tree-label">{{ level.title }}</span>
                    <span v-if="isExplicitLevelEditor(level)" class="permission-icon" title="您拥有此模块的编辑权限" style="margin-left: 5px; font-size: 12px;">✏️</span>
                    <div class="tree-actions">
                    <button @click.stop="createNewTopic(level)" class="btn-icon" title="添加 Topic">+</button>
                    </div>
                </div>

                <!-- Topics (Children of Level) -->
                <div v-show="!level.descCollapsed" class="tree-children">
                    <div v-for="topic in level.topics" :key="topic._id" class="tree-node-topic">
                    <!-- Topic Node -->
                    <div 
                        :class="['tree-item', 'topic-item', { active: isSelected('topic', topic._id) }]"
                        @click="selectNode('topic', topic, level); toggleTopicCollapse(topic)"
                    >
                        <span class="tree-icon" @click.stop="toggleTopicCollapse(topic)">{{ topic.collapsed ? '▶' : '▼' }}</span>
                        <span class="tree-label">{{ topic.title }}</span>
                        <div class="tree-actions">
                        <button @click.stop="createNewChapter(level, topic)" class="btn-icon" title="添加 Chapter">+</button>
                        </div>
                    </div>

                    <!-- Chapters (Children of Topic) -->
                    <div v-show="!topic.collapsed" class="tree-children">
                        <div 
                        v-for="chapter in topic.chapters" 
                        :key="chapter.id" 
                        :class="['tree-item', 'chapter-item', { active: isSelected('chapter', chapter._id || chapter.id) }]"
                        @click="selectNode('chapter', chapter, level, topic)"
                        >
                        <span class="tree-label">{{ chapter.title }}</span>
                        <div class="tree-meta">
                            <span class="meta-badge" :class="chapter.contentType === 'html' ? 'badge-html' : 'badge-md'">
                            {{ chapter.contentType === 'html' ? 'HTML' : 'MD' }}
                            </span>
                            <span v-if="chapter.problemIds && chapter.problemIds.length > 0" class="meta-count" title="题目数量">
                            {{ chapter.problemIds.length }}题
                            </span>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div v-if="!level.topics || level.topics.length === 0" class="empty-node">无 Topic</div>
                </div>
                </div>
                <div v-if="getLevelsForGroup(group.name).length === 0" class="empty-node">无模块</div>
            </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Editor -->
    <div class="editor-panel">
      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑<span v-if="isAdmin">，或点击“添加分组”开始</span>。</p>
      </div>

      <!-- Group Editor -->
      <div v-else-if="selectedNode.type === 'group'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingGroup._id ? '编辑分组' : '新建分组' }}</h2>
          <div class="header-actions" v-if="canEditGroup(editingGroup)">
            <div v-if="editingGroup._id" class="move-actions">
               <button @click="moveGroup('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveGroup('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="btn-delete">删除分组</button>
            <button @click="saveGroup" class="btn-save">保存更改</button>
          </div>
          <div v-else class="header-actions">
              <span class="badge-readonly">只读模式 (无编辑权限)</span>
          </div>
        </div>
        
        <div class="form-group">
          <label>分组名称 (ID):</label>
          <input v-model="editingGroup.name" class="form-input" placeholder="例如: C++基础" :disabled="!!editingGroup._id || !canEditGroup(editingGroup)">
          <span class="hint" v-if="editingGroup._id">分组ID不可修改，请修改显示标题。</span>
        </div>
        <div class="form-group">
          <label>显示标题:</label>
          <input v-model="editingGroup.title" class="form-input" placeholder="例如: C++ 基础课程" :disabled="!canEditGroup(editingGroup)">
        </div>

        <div class="form-group">
          <label>编程语言:</label>
          <select v-model="editingGroup.language" class="form-input" :disabled="!canEditGroup(editingGroup)">
            <option v-for="lang in languageOptions" :key="lang" :value="lang">{{ lang }}</option>
          </select>
        </div>
        
        <div class="form-group" v-if="isAdmin">
          <label>允许编辑的教师:</label>
          <div class="checkbox-list" v-if="teachers.length > 0">
             <label v-for="teacher in teachers" :key="teacher._id" class="checkbox-item">
                <input type="checkbox" :value="teacher._id" v-model="editingGroup.editors">
                {{ teacher.uname }}
             </label>
          </div>
          <div v-else class="hint">暂无教师账号可选</div>
          <div class="hint" style="margin-top: 5px; font-size: 12px; color: #888;">
            注意: 列表仅显示角色为"教师"的用户。如果某用户既是高级用户又是教师, 请在后台将其角色设置为"教师" (教师默认拥有高级用户权限)。
          </div>
        </div>
      </div>

      <!-- Level Editor -->
      <div v-else-if="selectedNode.type === 'level'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingLevel._id ? '编辑课程模块' : '新建课程模块' }}</h2>
          <div class="header-actions" v-if="canEditLevel(editingLevel)">
            <div v-if="editingLevel._id" class="move-actions">
               <button @click="moveLevel('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveLevel('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="btn-delete">删除模块</button>
            <button @click="saveLevel" class="btn-save">保存更改</button>
          </div>
          <div v-else class="header-actions">
              <span class="badge-readonly">只读模式 (无编辑权限)</span>
          </div>
        </div>
        
        <div class="form-group">
          <label>所属分组 (Tab):</label>
          <input v-model="editingLevel.group" class="form-input" disabled>
        </div>

        <!-- Hidden Level Input (Managed by Move Up/Down) -->
        <!-- <div class="form-group">
          <label>排序序号 (数字, 越小越靠前):</label>
          <input v-model.number="editingLevel.level" type="number" class="form-input" step="0.1">
        </div> -->

        <!-- Hidden Label Input (Not needed per user request) -->
        <!-- <div class="form-group">
          <label>显示标签 (Label):</label>
          <input v-model="editingLevel.label" class="form-input" placeholder="例如: Level 1 或 语法思维训练">
        </div> -->

        <div class="form-group">
          <label>标题 (Title):</label>
          <input v-model="editingLevel.title" class="form-input" placeholder="例如: 基础语法">
        </div>
        <div class="form-group">
          <label>描述 (Markdown):</label>
          <div class="split-view">
            <textarea v-model="editingLevel.description" class="form-input" rows="10"></textarea>
            <div class="preview-box">
              <MarkdownViewer :content="editingLevel.description" />
            </div>
          </div>
        </div>

        <div class="form-group" v-if="isAdmin">
          <label>允许编辑的教师 (仅限此模块):</label>
          <div class="checkbox-list" v-if="teachers.length > 0">
             <label v-for="teacher in teachers" :key="teacher._id" class="checkbox-item">
                <input type="checkbox" :value="teacher._id" v-model="editingLevel.editors">
                {{ teacher.uname }}
             </label>
          </div>
          <div v-else class="hint">暂无教师账号可选</div>
          <div class="hint" style="margin-top: 5px; font-size: 12px; color: #888;">
            注意: 分组管理员默认拥有该分组下所有模块的编辑权限。此处设置的是额外的模块级编辑权限。
          </div>
        </div>
      </div>

      <!-- Topic Editor -->
      <div v-else-if="selectedNode.type === 'topic'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingTopic._id ? '编辑知识点' : '新建知识点' }}</h2>
          <div class="header-actions">
            <select v-model="selectedModel" class="model-select" title="选择 AI 模型">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div v-if="editingTopic._id" class="move-actions">
               <button @click="moveTopic('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveTopic('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="btn-delete" style="background-color: #f59e0b; margin-right: 8px;">清空章节</button>
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="btn-delete">删除知识点</button>
            <button @click="saveTopic" class="btn-save">保存更改</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>标题:</label>
            <input v-model="editingTopic.title" class="form-input">
          </div>
        </div>

        <!-- AI Assistant Section for Topic -->
        <div class="ai-assistant-box">
          <div class="ai-header">
            <h3>🤖 AI 章节规划</h3>
            <div v-if="currentAiLoading" class="status-container">
                <span class="ai-status">{{ currentAiStatus }}</span>
                <button @click="resetAiStatus" class="btn-reset" title="如果长时间未响应，点击重置状态">重置状态</button>
            </div>
          </div>
          <div class="ai-controls" :class="{ disabled: currentAiLoading }">
            <button @click="generateTopicDescription" class="btn-ai" :disabled="currentAiLoading">📝 自动生成描述</button>
            <button @click="generateTopicChapters" class="btn-ai" :disabled="currentAiLoading">📑 自动生成章节列表</button>
          </div>
        </div>
        <div class="form-group">
          <label>描述 (Markdown):</label>
          <div class="split-view">
            <textarea v-model="editingTopic.description" class="form-input" rows="10"></textarea>
            <div class="preview-box">
              <MarkdownViewer :content="editingTopic.description" />
            </div>
          </div>
        </div>
      </div>

      <!-- Chapter Editor -->
      <div v-else-if="selectedNode.type === 'chapter'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingChapter.isNew ? '新建章节' : '编辑章节' }}</h2>
          <div class="header-actions">
            <select v-model="selectedModel" class="model-select" title="选择 AI 模型">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div v-if="!editingChapter.isNew" class="move-actions">
               <button @click="moveChapter('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveChapter('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="btn-delete">删除章节</button>
            <button @click="saveChapter" class="btn-save">保存更改</button>
          </div>
        </div>

        <!-- AI Assistant Section -->
        <div class="ai-assistant-box">
          <div class="ai-header">
            <h3>🤖 AI 备课助手</h3>
            <div v-if="currentAiLoading" class="status-container">
                <span class="ai-status">{{ currentAiStatus }}</span>
                <button @click="resetAiStatus" class="btn-reset" title="如果长时间未响应，点击重置状态">重置状态</button>
            </div>
          </div>
          <div class="ai-controls" :class="{ disabled: currentAiLoading }">
            <input v-model="aiRequirements" placeholder="输入额外要求 (例如: 多一些生活例子, 侧重C++语法...)" class="form-input ai-input">
            <div class="ai-buttons">
              <button @click="generateLessonPlan" class="btn-ai" :disabled="currentAiLoading">📝 生成教案</button>
              <button @click="generatePPT" class="btn-ai" :disabled="currentAiLoading">📊 生成 PPT</button>
              <button @click="generateSolutionReport" class="btn-ai" :disabled="currentAiLoading">💡 生成题解</button>
            </div>
          </div>
        </div>

        <div class="form-row">
           <div class="form-group half">
             <label>Chapter ID:</label>
             <input v-model="editingChapter.id" class="form-input disabled" disabled>
           </div>
           <div class="form-group half">
             <label>标题:</label>
             <input v-model="editingChapter.title" class="form-input">
           </div>
        </div>

        <div class="form-group">
          <label>内容类型:</label>
          <select v-model="editingChapter.contentType" class="form-input">
            <option value="markdown">Markdown 文本</option>
            <option value="html">HTML 课件 (Iframe)</option>
          </select>
        </div>

        <div class="form-group">
          <div class="label-row">
             <label>内容 ({{ editingChapter.contentType === 'html' ? 'HTML URL' : 'Markdown' }}):</label>
             <button v-if="editingChapter.contentType === 'html'" @click="showPreview = !showPreview" class="btn-small btn-preview" type="button">
               {{ showPreview ? '关闭预览' : '开启预览' }}
             </button>
          </div>

          <!-- Markdown Mode: Split View -->
          <div v-if="editingChapter.contentType === 'markdown'" class="split-view" style="height: 700px;">
            <textarea v-model="editingChapter.content" class="form-input code-font" style="height: 100%;" placeholder="在此输入教案/大纲内容..."></textarea>
            <div class="preview-box" style="height: 100%;">
              <MarkdownViewer :content="editingChapter.content" />
            </div>
          </div>

          <!-- HTML Mode: Input or Preview -->
          <div v-if="editingChapter.contentType === 'html'">
            <div style="margin: 10px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                <strong>PPT 课件已生成</strong>
                <div v-if="!showPreview" style="margin-top: 8px;">
                    <input v-model="editingChapter.resourceUrl" class="form-input" placeholder="/public/courseware/bfs.html">
                </div>
            </div>
            <div v-if="showPreview" class="preview-container-large">
               <iframe :src="getPreviewUrl(editingChapter.resourceUrl)" class="preview-iframe"></iframe>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>关联题目 ID (逗号分隔):</label>
          <input v-model="editingChapter.problemIdsStr" class="form-input" placeholder="例如: system:1001, 1002">
        </div>
        
        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="editingChapter.optional"> 选做章节 (Optional)
          </label>
          <span class="hint">选做章节不会阻塞后续章节的解锁。</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { request } from '../utils/request.js'
import { marked } from 'marked'
import MarkdownViewer from '../components/MarkdownViewer.vue'
import { SUBJECTS_CONFIG, getRealSubject, filterLevels } from '../utils/courseConfig'
import { getModels } from '../utils/models'
import { io } from 'socket.io-client'

export default {
  name: 'Design',
  components: { MarkdownViewer },
  inject: ['showToastMessage'],
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
      
      showPreview: false,
      isInitialLoad: true,

      // AI State
      aiRequirements: '',
      aiLoadingMap: {},
      aiStatusMap: {},
      
      // Models
      selectedModel: 'gemini-2.5-flash',
      rawModelOptions: [],
      
      // Language
      selectedLanguage: 'C++',
      languageOptions: ['C++', 'Python']
    }
  },
  computed: {
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
            
            if (key && this.aiLoadingMap[key]) {
                this.aiLoadingMap[key] = false
                this.aiStatusMap[key] = ''
                
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
                        const currentId = this.selectedNode.id
                        const currentChapterId = this.editingChapter.id
                        
                        if (currentId === key || currentChapterId === data.chapterId) {
                             this.fetchChapterContent(data.chapterId)
                        }
                    }
                } else {
                    this.showToastMessage('生成失败: ' + (data.message || '未知错误'))
                }
            }
        }
    })
  },
  activated() {
    this.checkUserUpdate()
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
      if (!this.user) return false
      if (this.isAdmin) return true
      return this.isExplicitEditor(group)
    },
    isExplicitEditor(group) {
      if (!this.user || !group.editors) return false
      const userId = this.user._id || this.user.uid
      return group.editors.some(e => {
          const id = typeof e === 'object' ? e._id : e
          // Use loose equality to handle string/number mismatch
          return id == userId
      })
    },
    canEditLevel(level) {
      if (!this.user) return false
      if (this.isAdmin) return true
      // Check if editor of the group
      const group = this.groups.find(g => g.name === level.group)
      if (group && this.isExplicitEditor(group)) return true
      // Check if editor of the level
      return this.isExplicitLevelEditor(level)
    },
    isExplicitLevelEditor(level) {
      if (!this.user || !level.editors) return false
      const userId = this.user._id || this.user.uid
      return level.editors.some(e => {
          const id = typeof e === 'object' ? e._id : e
          return id == userId
      })
    },
    // --- Selection Logic ---
    isSelected(type, id) {
      return this.selectedNode && this.selectedNode.type === type && this.selectedNode.id === id
    },
    selectNode(type, data, parentLevel = null, parentTopic = null) {
      // Set selection ID
      const id = data._id || data.id || 'new'
      this.selectedNode = { type, id }
      this.showPreview = false // Reset preview on switch

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
        this.editingLevel = JSON.parse(JSON.stringify(data))
        // Ensure editors is an array of IDs
        if (this.editingLevel.editors && this.editingLevel.editors.length > 0 && typeof this.editingLevel.editors[0] === 'object') {
            this.editingLevel.editors = this.editingLevel.editors.map(e => e._id)
        }
        if (!this.editingLevel.editors) this.editingLevel.editors = []
      } else if (type === 'topic') {
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

        this.editingChapter = {
          ...chapter,
          problemIdsStr,
          optional: !!chapter.optional,
          contentType: chapter.contentType || 'markdown',
          resourceUrl: chapter.resourceUrl || '',
          isNew: !!chapter.isNew,
          content: chapter.content || ''
        }

        // Fetch full content if not new and content is missing
        if (!chapter.isNew && !chapter.content) {
             this.fetchChapterContent(chapter.id)
        }
      }
    },
    async fetchChapterContent(chapterId) {
        try {
            this.editingChapter.content = '加载中...'
            const query = this.editingLevelForChapter ? `?levelId=${this.editingLevelForChapter._id}` : ''
            const fullChapter = await request(`/api/course/chapter/${chapterId}${query}`)
            // Ensure the user hasn't switched to another node while fetching
            // Check both id (string) and _id (mongo) to handle different ID types
            const isSameChapter = this.selectedNode && 
                                  this.selectedNode.type === 'chapter' && 
                                  (this.editingChapter.id === chapterId || this.editingChapter._id === chapterId);
            
            if (isSameChapter) {
                this.editingChapter.content = fullChapter.content || ''
                this.editingChapter.contentType = fullChapter.contentType || 'markdown'
                this.editingChapter.resourceUrl = fullChapter.resourceUrl || ''
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
                                  (this.editingChapter.id === chapterId || this.editingChapter._id === chapterId);
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
    createNewTopic(level) {
      // Expand level if collapsed
      level.descCollapsed = false
      
      const newTopic = {
        title: '新知识点',
        description: '',
        _id: null // Marker for new
      }
      this.selectNode('topic', newTopic, level)
    },
    createNewChapter(level, topic) {
      // Expand topic if collapsed
      topic.collapsed = false
      
      const nextIndex = (topic.chapters ? topic.chapters.length : 0) + 1
      const nextId = `${level.level}-${nextIndex}`
      
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
        isNew: true
      }
      this.selectNode('chapter', newChapter, level, topic)
    },

    // --- Data Fetching ---
    async fetchData() {
        this.loadingCourses = true
        try {
            const [groups, levels] = await Promise.all([
                request('/api/course/groups'),
                request('/api/course/levels')
            ])
            
            this.groups = groups.map(g => ({ ...g, collapsed: false }))
            this.levels = levels.map(l => ({ ...l, descCollapsed: false }))
            // Initialize topics collapsed state default false
            this.levels.forEach(l => {
                if (l.topics) l.topics.forEach(t => t.collapsed = false)
            })

            this.restoreTreeState()
        } catch (e) {
            this.showToastMessage('加载失败: ' + e.message)
        } finally {
            this.loadingCourses = false
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

    getLevelsForGroup(groupName) {
        if (!this.levels) return []
        return this.levels.filter(l => l.group === groupName)
    },

    async saveGroup() {
        try {
            if (this.editingGroup._id) {
                await request(`/api/course/groups/${this.editingGroup._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(this.editingGroup)
                })
            } else {
                await request('/api/course/groups', {
                    method: 'POST',
                    body: JSON.stringify(this.editingGroup)
                })
            }
            this.showToastMessage('保存分组成功')
            this.fetchData()
        } catch (e) {
            this.showToastMessage('保存分组失败: ' + e.message)
        }
    },
    async deleteGroup(id) {
        if (!confirm('确定要删除这个分组吗？')) return
        try {
            await request(`/api/course/groups/${id}`, { method: 'DELETE' })
            this.showToastMessage('删除分组成功')
            this.fetchData()
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
        } catch (e) {
            this.showToastMessage('移动失败: ' + e.message)
        }
    },

    async saveLevel() {
      try {
        // Ensure group is set
        if (!this.editingLevel.group) {
            this.editingLevel.group = this.selectedSubject
        }

        if (this.editingLevel._id) {
          await request(`/api/course/levels/${this.editingLevel._id}`, {
            method: 'PUT',
            body: JSON.stringify(this.editingLevel)
          })
        } else {
          await request('/api/course/levels', {
            method: 'POST',
            body: JSON.stringify(this.editingLevel)
          })
        }
        this.showToastMessage('保存成功')
        this.fetchData()
        // this.selectedNode = null // Clear selection or re-select after fetch?
      } catch (e) {
        this.showToastMessage('保存失败: ' + e.message)
      }
    },
    async deleteLevel(id) {
      if (!confirm('确定要删除这个课程模块吗？')) return
      try {
        await request(`/api/course/levels/${id}`, { method: 'DELETE' })
        this.showToastMessage('删除成功')
        this.fetchData()
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
      } catch (e) {
        this.showToastMessage('移动失败: ' + e.message)
      }
    },
    async saveTopic() {
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
            body: JSON.stringify(this.editingTopic)
          })
          
          // Update ID for new topic (assuming appended to end)
          if (updatedLevel && updatedLevel.topics && updatedLevel.topics.length > 0) {
              const newTopic = updatedLevel.topics[updatedLevel.topics.length - 1]
              this.editingTopic._id = newTopic._id
              this.selectedNode.id = newTopic._id
          }
        }
        this.showToastMessage('保存知识点成功')
        await this.fetchData()
        // this.selectedNode = null // Keep selection
      } catch (e) {
        this.showToastMessage('保存知识点失败: ' + e.message)
      }
    },
    async deleteTopic(levelId, topicId) {
      if (!confirm('确定要删除这个知识点吗？')) return
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}`, { method: 'DELETE' })
        this.showToastMessage('删除知识点成功')
        this.fetchData()
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
      } catch (e) {
        this.showToastMessage('清空章节失败: ' + e.message)
      }
    },
    async moveTopic(direction) {
      const levelId = this.editingLevelForTopic._id
      const topicId = this.editingTopic._id
      
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}/move`, {
          method: 'PUT',
          body: JSON.stringify({ direction })
        })
        this.showToastMessage('移动成功')
        this.fetchData()
      } catch (e) {
        this.showToastMessage('移动失败: ' + e.message)
      }
    },
    async saveChapter() {
      try {
        const problemIds = (this.editingChapter.problemIdsStr || '')
          .split(/[,，]/).map(s => s.trim()).filter(s => s).map(String)

        const chapterData = {
          id: this.editingChapter.id,
          title: this.editingChapter.title,
          content: this.editingChapter.content,
          contentType: this.editingChapter.contentType,
          resourceUrl: this.editingChapter.resourceUrl,
          problemIds: problemIds,
          optional: this.editingChapter.optional
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
                   // Assuming appended to end
                   const newChapter = topic.chapters[topic.chapters.length - 1]
                   this.editingChapter.id = newChapter.id
                   this.editingChapter._id = newChapter._id
                   this.editingChapter.isNew = false
                   this.selectedNode.id = newChapter.id || newChapter._id
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
        // this.selectedNode = null // Keep selection
      } catch (e) {
        this.showToastMessage('保存章节失败: ' + e.message)
      }
    },
    async deleteChapter(levelId, topicId, chapterId) {
      if (!confirm('确定要删除这个章节吗？')) return
      try {
        await request(`/api/course/levels/${levelId}/topics/${topicId}/chapters/${chapterId}`, { method: 'DELETE' })
        this.showToastMessage('删除章节成功')
        this.fetchData()
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
        const state = {
            groups: this.groups.filter(g => g.collapsed).map(g => g._id || g.name),
            levels: this.levels.filter(l => l.descCollapsed).map(l => l._id),
            topics: []
        }
        this.levels.forEach(l => {
            if (l.topics) {
                l.topics.forEach(t => {
                    if (t.collapsed) state.topics.push(t._id)
                })
            }
        })
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
            
            if (state.topics) {
                const collapsedTopics = new Set(state.topics)
                this.levels.forEach(l => {
                    if (l.topics) {
                        l.topics.forEach(t => {
                            if (collapsedTopics.has(t._id)) {
                                t.collapsed = true
                            }
                        })
                    }
                })
            }
        } catch (e) {
            console.error('Failed to restore tree state', e)
        }
    },

    async saveLevel() {
      try {
        // Ensure group is set
        if (!this.editingLevel.group) {
            this.editingLevel.group = this.selectedSubject
        }

        if (this.editingLevel._id) {
          await request(`/api/course/levels/${this.editingLevel._id}`, {
            method: 'PUT',
            body: JSON.stringify(this.editingLevel)
          })
        } else {
          await request('/api/course/levels', {
            method: 'POST',
            body: JSON.stringify(this.editingLevel)
          })
        }
        this.showToastMessage('保存成功')
        this.fetchLevels()
        this.selectedNode = null // Clear selection or re-select after fetch?
      } catch (e) {
        this.showToastMessage('保存失败: ' + e.message)
      }
    },
    // --- AI Methods ---
    async generateLessonPlan() {
      if (!this.editingChapter.title) return this.showToastMessage('请先填写章节标题')
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

      this.aiLoadingMap[chapterId] = true
      this.aiStatusMap[chapterId] = '正在提交后台任务...'
      
      // Immediately switch to Markdown mode and show loading state
      this.editingChapter.contentType = 'markdown'
      this.editingChapter.content = '正在生成教案中，请稍候...'
      this.updateChapterInTree(chapterId, { contentType: 'markdown' })
      
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
            clientKey: chapterId
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

      // Gather full chapter list for context
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
            topicTitle: topicTitle,
            chapterTitle: chapterTitle,
            levelNum: levelNum,
            levelTitle: levelTitle,
            clientKey: chapterId
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

    async generateSolutionReport() {
      if (!this.editingChapter.problemIdsStr) return this.showToastMessage('请先在下方关联题目 ID')
      if (!confirm('确定要生成题解报告吗？生成过程将在后台进行，您可以关闭此页面。')) return
      
      // Get the first problem ID
      const firstProblemId = this.editingChapter.problemIdsStr.split(/[,，]/)[0].trim()
      if (!firstProblemId) return this.showToastMessage('未找到有效的题目 ID')

      const id = this.editingChapter._id || this.editingChapter.id
      this.aiLoadingMap[id] = true
      this.aiStatusMap[id] = '正在获取题目信息...'
      
      // Immediately switch to HTML mode
      this.editingChapter.contentType = 'html'
      this.updateChapterInTree(id, { contentType: 'html' })

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
        if (doc.title && this.editingChapter.title !== doc.title) {
            this.editingChapter.title = doc.title
            await this.saveChapter()
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
            level: this.editingLevelForChapter.level,
            topicTitle: this.editingTopicForChapter.title,
            chapterTitle: this.editingChapter.title,
            problemTitle: doc.title,
            chapterId: this.editingChapter.id,
            clientKey: id, // Pass the UI key (usually _id) to server
            model: this.selectedModel,
            language: this.editingLevelForChapter.subject || 'C++'
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
    },

    getPreviewUrl(url) {
      if (!url) return ''
      if (url.indexOf('public/courseware') !== -1) {
        if (url.startsWith('/public/')) url = '/api' + url
        else if (url.startsWith('public/')) url = '/api/' + url
        const token = localStorage.getItem('auth_token')
        if (token) {
          const separator = url.includes('?') ? '&' : '?'
          return `${url}${separator}token=${token}`
        }
      }
      return url
    }
  }
}
</script>

<style scoped>
/* Variables & Reset */
.design-container {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --bg-color: #f3f4f6;
  --sidebar-bg: #ffffff;
  --border-color: #e2e8f0;
  --text-main: #1e293b;
  --text-secondary: #64748b;
  --active-bg: #eef2ff;
  --active-border: #4f46e5;
  
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
  background: var(--bg-color);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-main);
}

/* Sidebar */
.sidebar {
  width: 320px;
  min-width: 320px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0,0,0,0.02);
  z-index: 10;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background: #fff;
}

.sidebar-header h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.subject-selector {
  margin-bottom: 12px;
}

.subject-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-main);
  background-color: #f8fafc;
  transition: all 0.2s;
  cursor: pointer;
}
.subject-select:hover { border-color: #cbd5e1; }
.subject-select:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }

.btn-add-level {
  width: 100%;
  padding: 10px;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.btn-add-level:hover { background: #059669; transform: translateY(-1px); }
.btn-add-level:active { transform: translateY(0); }

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Scrollbar Styling */
.tree-container::-webkit-scrollbar,
.editor-panel::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.tree-container::-webkit-scrollbar-thumb,
.editor-panel::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.tree-container::-webkit-scrollbar-track,
.editor-panel::-webkit-scrollbar-track {
  background: transparent;
}

/* Tree Items */
.tree-node-level { margin-bottom: 4px; }

.tree-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.15s ease;
  border-radius: 6px;
  margin-bottom: 2px;
  border: 1px solid transparent;
  position: relative;
}

.tree-item:hover { background: #f1f5f9; }
.tree-item.active { 
  background: var(--active-bg); 
  color: var(--primary-color); 
  border-color: rgba(79, 70, 229, 0.1);
}
.tree-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: var(--primary-color);
  border-radius: 0 3px 3px 0;
}

.tree-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 10px;
  margin-right: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}
.tree-item:hover .tree-icon { color: #64748b; }
.tree-icon:hover { background: rgba(0,0,0,0.05); }

.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.5;
}

.tree-actions {
  display: none;
  margin-left: 8px;
}
.tree-item:hover .tree-actions { display: flex; }

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.btn-icon:hover { 
  color: var(--primary-color); 
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.level-item { font-weight: 600; color: var(--text-main); }
.topic-item { padding-left: 28px; font-size: 13.5px; color: #334155; }
.chapter-item { padding-left: 48px; font-size: 13px; color: #475569; }

.empty-node {
  padding: 12px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  font-style: italic;
}

.group-item {
    font-weight: 700;
    color: #1e293b;
    background: #e2e8f0;
    margin-top: 8px;
}
.group-item:hover { background: #cbd5e1; }
.group-item.active { background: #334155; color: white; }
.group-item.active .tree-icon { color: white; }

.level-item { font-weight: 600; color: var(--text-main); margin-left: 12px; }
.topic-item { padding-left: 28px; font-size: 13.5px; color: #334155; margin-left: 12px; }
.chapter-item { padding-left: 48px; font-size: 13px; color: #475569; margin-left: 12px;
  padding-top: 8px;
  padding-bottom: 8px;
  font-style: italic;
}

/* Editor Panel */
.editor-panel {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
  background: #f8fafc;
}

.editor-form {
  max-width: 1600px;
  margin: 0 auto;
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.empty-state {
  display: flex;
  flex-direction: column;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  text-align: center;
}
.empty-state p {
  font-size: 16px;
  margin-top: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
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
  letter-spacing: -0.5px;
}

.header-actions { display: flex; gap: 12px; align-items: center; }
.move-actions { display: flex; gap: 8px; margin-right: 12px; padding-right: 12px; border-right: 1px solid var(--border-color); }

.model-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  background-color: #f8fafc;
  color: var(--text-main);
  min-width: 160px;
  cursor: pointer;
}
.model-select:focus { border-color: var(--primary-color); outline: none; }

.btn-save {
  padding: 8px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}
.btn-save:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3); }
.btn-save:active { transform: translateY(0); }

.btn-delete {
  padding: 8px 16px;
  background: white;
  color: var(--danger-color);
  border: 1px solid #fecaca;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
}
.btn-delete:hover { background: #fef2f2; border-color: var(--danger-color); }

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}
.btn-small:hover { background: #f8fafc; color: var(--primary-color); border-color: #cbd5e1; }

/* Forms */
.form-group { margin-bottom: 24px; }
.form-row { display: flex; gap: 24px; }
.half { flex: 1; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}
.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  background: #fff;
  box-sizing: border-box; /* Ensure padding doesn't affect width/height */
}
.form-input:focus { 
  border-color: var(--primary-color); 
  outline: none; 
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); 
}
.form-input.disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; border-color: #e2e8f0; }
.code-font { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 13px; line-height: 1.6; }

.hint { font-size: 12px; color: #94a3b8; margin-top: 6px; display: block; }

.split-view {
  display: flex;
  gap: 24px;
  height: 600px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}
.split-view .form-input { 
  flex: 1; 
  resize: none; 
  border: none; 
  border-right: 1px solid var(--border-color);
  border-radius: 0;
  padding: 16px;
  padding-bottom: 80px; /* Ensure last line is visible */
  overflow-y: auto; /* Ensure scrollbar appears */
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
  border-radius: 8px;
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
  gap: 8px;
  cursor: pointer;
}
.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* AI Assistant */
.ai-assistant-box {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}
.ai-assistant-box::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
  opacity: 0.5;
  pointer-events: none;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.ai-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #3730a3;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-status {
  font-size: 13px;
  color: #4f46e5;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-status::before {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4f46e5;
  animation: pulse-dot 1.5s infinite;
}

.status-container {
    display: flex;
    align-items: center;
    gap: 10px;
}
.btn-reset {
    font-size: 12px;
    color: #64748b;
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
}
.btn-reset:hover {
    color: #ef4444;
}

.ai-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.ai-controls.disabled {
  opacity: 0.7;
  pointer-events: none;
  filter: grayscale(0.5);
}
.ai-input {
  flex: 1;
  margin-bottom: 0 !important;
  min-width: 200px;
  border-color: #c7d2fe;
}
.ai-input:focus { border-color: #4f46e5; }

.ai-buttons {
  display: flex;
  gap: 8px;
}
.btn-ai {
  padding: 10px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-ai:hover {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
}
.btn-ai:active { transform: translateY(0); }
.btn-ai:disabled {
  background: #a5b4fc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@keyframes pulse-dot {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

/* Tree Meta Info */
.tree-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  flex-shrink: 0;
}

.meta-badge {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  line-height: 1;
}

.badge-md {
  background-color: #e2e8f0;
  color: #64748b;
}

.badge-html {
  background-color: #dbeafe;
  color: #2563eb;
}

.meta-count {
  font-size: 10px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 5px;
  border-radius: 10px;
}
.checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  user-select: none;
}
.checkbox-item:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}
.badge-readonly {
  background-color: #fef2f2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #fecaca;
}
</style>
