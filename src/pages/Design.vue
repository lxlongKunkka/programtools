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
            <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="btn-small btn-download-md">⬇️ 下载资料包</button>
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
            <button v-if="editingLevel._id && isAdmin" @click="downloadLevelMaterials" class="btn-small btn-download-md">⬇️ 下载资料包</button>
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

        <!-- AI Assistant Section for Level -->
        <div class="ai-assistant-box">
          <div class="ai-header">
            <h3>🤖 AI 模块规划</h3>
            <div v-if="currentAiLoading" class="status-container">
                <span class="ai-status">{{ currentAiStatus }}</span>
                <button @click="resetAiStatus" class="btn-reset" title="如果长时间未响应，点击重置状态">重置状态</button>
            </div>
          </div>
          <div class="ai-controls" :class="{ disabled: currentAiLoading }">
            <button @click="batchGenerateLevelLessonPlans" class="btn-ai btn-ai-purple" :disabled="currentAiLoading">📚 一键生成所有教案</button>
            <button @click="batchGenerateLevelPPTs" class="btn-ai btn-ai-pink" :disabled="currentAiLoading">📊 一键生成所有PPT</button>
            <button @click="batchGenerateLevelSolutionReports" class="btn-ai btn-ai-green" :disabled="currentAiLoading">💡 一键生成所有题解</button>
          </div>
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
            <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="btn-small btn-download-md">⬇️ 下载资料包</button>
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
            <button @click="batchGenerateLessonPlans" class="btn-ai btn-ai-purple" :disabled="currentAiLoading">📚 一键生成所有教案</button>
            <button @click="batchGeneratePPTs" class="btn-ai btn-ai-pink" :disabled="currentAiLoading">📊 一键生成所有PPT</button>
            <button @click="batchGenerateSolutionPlans" class="btn-ai btn-ai-blue" :disabled="currentAiLoading">📘 一键生成所有题解教案</button>
            <button @click="batchGenerateSolutionReports" class="btn-ai btn-ai-green" :disabled="currentAiLoading">💡 一键生成所有题解PPT</button>
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
            <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="btn-small btn-download-md">⬇️ 下载 {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>
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
              <button @click="generateSolutionPlan" class="btn-ai btn-ai-blue" :disabled="currentAiLoading">📘 生成题解教案</button>
              <button @click="generateSolutionReport" class="btn-ai" :disabled="currentAiLoading">💡 生成题解PPT</button>
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
import JSZip from 'jszip'

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
      languageOptions: ['C++', 'Python'],
      
      // Auto-save state
      isSelecting: false
    }
  },
  watch: {
    editingGroup: {
        handler() {
            if (this.isSelecting) return
            if (!this.selectedNode || this.selectedNode.type !== 'group') return
            this.debouncedSaveGroup(true)
        },
        deep: true
    },
    editingLevel: {
        handler() {
            if (this.isSelecting) return
            if (!this.selectedNode || this.selectedNode.type !== 'level') return
            this.debouncedSaveLevel(true)
        },
        deep: true
    },
    editingTopic: {
        handler() {
            if (this.isSelecting) return
            if (!this.selectedNode || this.selectedNode.type !== 'topic') return
            this.debouncedSaveTopic(true)
        },
        deep: true
    },
    editingChapter: {
        handler() {
            if (this.isSelecting) return
            if (!this.selectedNode || this.selectedNode.type !== 'chapter') return
            this.debouncedSaveChapter(true)
        },
        deep: true
    }
  },
  created() {
    this.debouncedSaveGroup = this.debounce(this.saveGroup, 2000)
    this.debouncedSaveLevel = this.debounce(this.saveLevel, 2000)
    this.debouncedSaveTopic = this.debounce(this.saveTopic, 2000)
    this.debouncedSaveChapter = this.debounce(this.saveChapter, 2000)
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
                             // Optimistic update from event data
                             if (data.resourceUrl) {
                                 this.editingChapter.resourceUrl = data.resourceUrl
                                 this.editingChapter.contentType = 'html'
                                 this.updateChapterInTree(data.chapterId, { 
                                     contentType: 'html'
                                 })
                             }

                             // Delay fetch slightly to ensure DB consistency
                             setTimeout(() => {
                                 this.fetchChapterContent(data.chapterId)
                             }, 500)
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
    debounce(func, wait) {
      let timeout;
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
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
      this.isSelecting = true
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
      
      this.$nextTick(() => {
          this.isSelecting = false
      })
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
                // If AI is currently generating content for this chapter, do not overwrite local loading state with server content
                if (this.aiLoadingMap[chapterId] || this.aiLoadingMap[fullChapter._id]) {
                    return
                }

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
            
            this.groups = groups.map(g => ({ ...g, collapsed: false }))
            this.levels = levels.map(l => ({ ...l, descCollapsed: false }))
            // Initialize topics collapsed state default false
            this.levels.forEach(l => {
                if (l.topics) l.topics.forEach(t => t.collapsed = false)
            })

            this.restoreTreeState()
            
            // Re-bind selection to new objects to avoid stale references
            if (this.selectedNode) {
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

    getLevelsForGroup(groupName) {
        if (!this.levels) return []
        return this.levels.filter(l => l.group === groupName)
    },

    async saveGroup(isAutoSave = false) {
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
            
            if (!isAutoSave) {
                this.showToastMessage('保存分组成功')
                this.fetchData()
            } else {
                // Update local tree node
                const group = this.groups.find(g => g._id === this.editingGroup._id)
                if (group) {
                    group.name = this.editingGroup.name
                    group.title = this.editingGroup.title
                    group.language = this.editingGroup.language
                }
            }
        } catch (e) {
            if (!isAutoSave) this.showToastMessage('保存分组失败: ' + e.message)
            else console.error('Auto-save group failed', e)
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

    async saveLevel(isAutoSave = false) {
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
          res = await request('/api/course/levels', {
            method: 'POST',
            body: JSON.stringify(this.editingLevel)
          })
          if (res && res._id) {
              this.editingLevel._id = res._id
              this.selectedNode.id = res._id
              this.levels.push({ ...res, descCollapsed: false })
          }
        }
        
        if (!isAutoSave) {
            this.showToastMessage('保存成功')
            this.fetchData()
        } else {
            // Update local tree node
            const level = this.levels.find(l => l._id === this.editingLevel._id)
            if (level) {
                level.title = this.editingLevel.title
                level.description = this.editingLevel.description
            }
        }
      } catch (e) {
        if (!isAutoSave) this.showToastMessage('保存失败: ' + e.message)
        else console.error('Auto-save level failed', e)
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
    async saveTopic(isAutoSave = false) {
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
        
        if (!isAutoSave) {
            this.showToastMessage('保存知识点成功')
            await this.fetchData()
        } else {
            // Update local tree node
            if (updatedLevel) {
                 const levelIndex = this.levels.findIndex(l => l._id === updatedLevel._id)
                 if (levelIndex !== -1) {
                     // Preserve collapsed state
                     const oldLevel = this.levels[levelIndex]
                     updatedLevel.descCollapsed = oldLevel.descCollapsed
                     if (updatedLevel.topics) {
                         updatedLevel.topics.forEach(t => {
                             const oldT = oldLevel.topics ? oldLevel.topics.find(ot => ot._id === t._id) : null
                             if (oldT) t.collapsed = oldT.collapsed
                         })
                     }
                     this.levels[levelIndex] = updatedLevel
                 }
            }
        }
      } catch (e) {
        if (!isAutoSave) this.showToastMessage('保存知识点失败: ' + e.message)
        else console.error('Auto-save topic failed', e)
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
          method: 'POST',
          body: JSON.stringify({ direction })
        })
        this.showToastMessage('移动成功')
        this.fetchData()
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
    async saveChapter(isAutoSave = false) {
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
        
        if (!isAutoSave) {
            this.showToastMessage('保存章节成功')
            await this.fetchData()
        } else {
            // Update local tree node
            if (updatedLevel) {
                 const levelIndex = this.levels.findIndex(l => l._id === updatedLevel._id)
                 if (levelIndex !== -1) {
                     // Preserve collapsed state
                     const oldLevel = this.levels[levelIndex]
                     updatedLevel.descCollapsed = oldLevel.descCollapsed
                     if (updatedLevel.topics) {
                         updatedLevel.topics.forEach(t => {
                             const oldT = oldLevel.topics ? oldLevel.topics.find(ot => ot._id === t._id) : null
                             if (oldT) t.collapsed = oldT.collapsed
                         })
                     }
                     this.levels[levelIndex] = updatedLevel
                 }
            }
        }
      } catch (e) {
        if (!isAutoSave) this.showToastMessage('保存章节失败: ' + e.message)
        else console.error('Auto-save chapter failed', e)
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

      const id = this.editingChapter._id || this.editingChapter.id
      const targetChapterId = this.editingChapter.id // Capture current chapter ID
      const targetTopicId = this.editingTopicForChapter._id // Capture current topic ID
      
      this.aiLoadingMap[id] = true
      this.aiStatusMap[id] = '正在获取题目信息...'
      
      // Switch to Markdown mode
      this.editingChapter.contentType = 'markdown'
      this.editingChapter.content = '正在生成解题教案中，请稍候...'
      this.updateChapterInTree(id, { contentType: 'markdown', content: '正在生成解题教案中，请稍候...' })

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
        if (doc.title && this.editingChapter.title !== doc.title) {
            this.editingChapter.title = doc.title
            await this.saveChapter()
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

      const id = this.editingChapter._id || this.editingChapter.id
      const targetChapterId = this.editingChapter.id // Capture current chapter ID
      const targetTopicId = this.editingTopicForChapter._id // Capture current topic ID
      const targetChapterTitle = this.editingChapter.title // Capture title
      const targetLevel = this.editingLevelForChapter.level
      const targetTopicTitle = this.editingTopicForChapter.title
      const targetLanguage = this.editingLevelForChapter.subject || 'C++'
      const targetGroup = this.editingLevelForChapter.group
      const targetLevelTitle = this.editingLevelForChapter.title

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
                    clientKey: chapterId
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
                chapterContent: '', 
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
                        clientKey: chapterId
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
                    chapterContent: '', 
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
  height: calc(100vh - 60px);
  overflow: hidden;
  background: var(--bg-color);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-main);
}

/* Sidebar */
.sidebar {
  width: 340px;
  min-width: 340px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
  background: #fff;
}

.sidebar-header h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.025em;
}

.subject-selector {
  margin-bottom: 16px;
}

.subject-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-main);
  background-color: #fff;
  transition: all 0.2s;
  cursor: pointer;
}
.subject-select:hover { border-color: #cbd5e1; }
.subject-select:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }

.btn-add-level {
  width: 100%;
  padding: 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
}
.btn-add-level:hover { 
  background: var(--primary-hover); 
  transform: translateY(-1px); 
  box-shadow: var(--shadow-md);
}
.btn-add-level:active { transform: translateY(0); }

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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
.tree-node-group { margin-bottom: 12px; }
.tree-node-level { margin-bottom: 4px; }

.tree-item {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.15s ease;
  border-radius: var(--radius-md);
  margin-bottom: 2px;
  border: 1px solid transparent;
  position: relative;
  color: var(--text-secondary);
}

.tree-item:hover { 
  background: #f1f5f9; 
  color: var(--text-main);
}

.tree-item.active { 
  background: var(--active-bg); 
  color: var(--primary-color); 
  font-weight: 500;
}

.tree-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 10px;
  margin-right: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}
.tree-item:hover .tree-icon { color: var(--text-secondary); }
.tree-item.active .tree-icon { color: var(--primary-color); }

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
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.tree-item:hover .tree-actions { display: flex; }

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}
.btn-icon:hover { 
  color: var(--primary-color); 
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.group-item {
    font-weight: 700;
    color: var(--text-main);
    background: #fff;
    border: 1px solid var(--border-color);
    margin-bottom: 4px;
}
.group-item:hover { background: #f8fafc; border-color: #cbd5e1; }
.group-item.active { 
  background: #f1f5f9; 
  border-color: #cbd5e1;
  color: var(--text-main);
}
.group-item.active .tree-icon { color: var(--primary-color); }

.level-item { 
  font-weight: 600; 
  color: var(--text-main); 
  margin-left: 8px; 
  border-left: 2px solid transparent;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
.level-item.active { border-left-color: var(--primary-color); }

.topic-item { 
  padding-left: 24px; 
  font-size: 13.5px; 
  margin-left: 8px;
  border-left: 1px solid var(--border-color);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
.topic-item.active { border-left-color: var(--primary-color); }

.chapter-item { 
  padding-left: 36px; 
  font-size: 13px; 
  margin-left: 8px;
  border-left: 1px solid var(--border-color);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding-top: 8px;
  padding-bottom: 8px;
  font-style: italic;
}
.chapter-item.active { border-left-color: var(--primary-color); }

.empty-node {
  padding: 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  font-style: italic;
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
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1.2;
  letter-spacing: 0.05em;
}

.badge-md {
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.badge-html {
  background-color: #eff6ff;
  color: #3b82f6;
  border: 1px solid #dbeafe;
}

.meta-count {
  font-size: 10px;
  color: var(--text-muted);
  background: #f8fafc;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
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
</style>
