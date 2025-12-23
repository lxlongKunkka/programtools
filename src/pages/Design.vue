<template>
  <div class="design-container">
    <!-- Left Sidebar: Tree View -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>课程结构</h3>
        <div class="subject-selector">
          <select v-model="selectedSubject" @change="fetchLevels" class="subject-select">
            <option v-for="sub in availableSubjects" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>
        <button @click="createNewLevel" class="btn-add-level">+ 添加等级 (Level)</button>
      </div>

      <div v-if="loadingCourses" class="loading-text">加载中...</div>
      <div v-else class="tree-container">
        <div v-for="level in levels" :key="level._id" class="tree-node-level">
          <!-- Level Node -->
          <div 
            :class="['tree-item', 'level-item', { active: isSelected('level', level._id) }]"
            @click="selectNode('level', level); toggleLevelDesc(level)"
          >
            <span class="tree-icon" @click.stop="toggleLevelDesc(level)">{{ level.descCollapsed ? '▶' : '▼' }}</span>
            <span class="tree-label">Level {{ level.level }}</span>
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
                </div>
              </div>
            </div>
            <div v-if="!level.topics || level.topics.length === 0" class="empty-node">无 Topic</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Editor -->
    <div class="editor-panel">
      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑，或点击“添加等级”开始。</p>
      </div>

      <!-- Level Editor -->
      <div v-else-if="selectedNode.type === 'level'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingLevel._id ? '编辑等级' : '新建等级' }}</h2>
          <div class="header-actions">
            <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="btn-delete">删除等级</button>
            <button @click="saveLevel" class="btn-save">保存更改</button>
          </div>
        </div>
        
        <div class="form-group">
          <label>Level (数字):</label>
          <input v-model.number="editingLevel.level" type="number" class="form-input">
          <p v-if="currentSubjectConfig && currentSubjectConfig.minLevel" class="hint">
             当前视图范围: {{ currentSubjectConfig.minLevel }} - {{ currentSubjectConfig.maxLevel || '∞' }}
          </p>
        </div>
        <div class="form-group">
          <label>标题:</label>
          <input v-model="editingLevel.title" class="form-input">
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
      </div>

      <!-- Topic Editor -->
      <div v-else-if="selectedNode.type === 'topic'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingTopic._id ? '编辑知识点' : '新建知识点' }}</h2>
          <div class="header-actions">
            <select v-model="selectedModel" class="model-select" title="选择 AI 模型">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="btn-delete">删除知识点</button>
            <button @click="saveTopic" class="btn-save">保存更改</button>
          </div>
        </div>

        <!-- AI Assistant Section for Topic -->
        <div class="ai-assistant-box">
          <div class="ai-header">
            <h3>🤖 AI 章节规划</h3>
            <span v-if="aiLoading" class="ai-status">{{ aiStatus }}</span>
          </div>
          <div class="ai-controls" :class="{ disabled: aiLoading }">
            <button @click="generateTopicDescription" class="btn-ai" :disabled="aiLoading">📝 自动生成描述</button>
            <button @click="generateTopicChapters" class="btn-ai" :disabled="aiLoading">📑 自动生成章节列表</button>
          </div>
        </div>

        <div class="form-group">
          <label>所属等级:</label>
          <input :value="'Level ' + editingLevelForTopic.level" disabled class="form-input disabled">
        </div>
        <div class="form-group">
          <label>标题:</label>
          <input v-model="editingTopic.title" class="form-input">
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
            <span v-if="aiLoading" class="ai-status">{{ aiStatus }}</span>
          </div>
          <div class="ai-controls" :class="{ disabled: aiLoading }">
            <input v-model="aiRequirements" placeholder="输入额外要求 (例如: 多一些生活例子, 侧重C++语法...)" class="form-input ai-input">
            <div class="ai-buttons">
              <button @click="generateLessonPlan" class="btn-ai" :disabled="aiLoading">📝 生成教案</button>
              <button @click="generatePPT" class="btn-ai" :disabled="aiLoading">📊 生成 PPT</button>
              <button @click="generateSolutionReport" class="btn-ai" :disabled="aiLoading">💡 生成题解</button>
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
            <textarea v-model="editingChapter.content" class="form-input code-font" style="height: 100%;"></textarea>
            <div class="preview-box" style="height: 100%;">
              <MarkdownViewer :content="editingChapter.content" />
            </div>
          </div>

          <!-- HTML Mode: Input or Preview -->
          <div v-else>
            <div v-if="!showPreview">
              <input v-model="editingChapter.resourceUrl" class="form-input" placeholder="/public/courseware/bfs.html">
            </div>
            <div v-else class="preview-container-large">
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
import request from '../utils/request'
import { marked } from 'marked'
import MarkdownViewer from '../components/MarkdownViewer.vue'
import { SUBJECTS_CONFIG, getRealSubject, filterLevels } from '../utils/courseConfig'
import { getModels } from '../utils/models'

export default {
  name: 'Design',
  components: { MarkdownViewer },
  inject: ['showToastMessage'],
  data() {
    return {
      // Data
      levels: [],
      loadingCourses: false,
      selectedSubject: 'C++基础',
      availableSubjects: SUBJECTS_CONFIG.map(s => s.name),
      
      // Selection State
      selectedNode: null, // { type: 'level'|'topic'|'chapter', id: string }
      
      // Editing Models
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
      aiLoading: false,
      aiStatus: '',
      
      // Models
      selectedModel: 'gemini-2.5-flash',
      rawModelOptions: []
    }
  },
  computed: {
    currentSubjectConfig() {
      return SUBJECTS_CONFIG.find(s => s.name === this.selectedSubject)
    },
    user() {
      try {
        return JSON.parse(localStorage.getItem('user_info'))
      } catch (e) { return null }
    },
    isPremium() {
      return this.user && (this.user.role === 'admin' || this.user.role === 'premium' || this.user.role === 'teacher' || this.user.priv === -1)
    },
    modelOptions() {
      const all = this.rawModelOptions || []
      if (this.isPremium) return all
      return all.filter(m => m.id === 'gemini-2.0-flash' || m.id === 'gemini-2.5-flash')
    }
  },
  mounted() {
    this.fetchLevels()
    this.fetchModels()
  },
  methods: {
    async fetchModels() {
        this.rawModelOptions = await getModels()
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
      if (type === 'level') {
        this.editingLevel = JSON.parse(JSON.stringify(data))
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
            const fullChapter = await request(`/api/course/chapter/${chapterId}`)
            // Ensure the user hasn't switched to another node while fetching
            if (this.selectedNode && this.selectedNode.type === 'chapter' && this.editingChapter.id === chapterId) {
                this.editingChapter.content = fullChapter.content || ''
            }
        } catch (e) {
            console.error(e)
            if (this.selectedNode && this.selectedNode.type === 'chapter' && this.editingChapter.id === chapterId) {
                this.editingChapter.content = '加载失败: ' + e.message
            }
        }
    },

    // --- Creation Methods ---
    createNewLevel() {
      let nextLevel = 1
      const subjectConfig = SUBJECTS_CONFIG.find(s => s.name === this.selectedSubject)
      if (subjectConfig && subjectConfig.minLevel) nextLevel = subjectConfig.minLevel
      if (this.levels && this.levels.length > 0) {
          const maxLevel = Math.max(...this.levels.map(l => l.level || 0))
          if (maxLevel >= nextLevel) nextLevel = maxLevel + 1
      }

      const newLevel = { 
        level: nextLevel, 
        title: '新等级', 
        description: '',
        subject: getRealSubject(this.selectedSubject),
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
    async fetchLevels() {
      if (!this.levels || this.levels.length === 0) this.loadingCourses = true
      
      // Save collapsed state
      const collapsedState = {}
      const descCollapsedState = {}
      if (this.levels) {
        this.levels.forEach(l => {
            if (l._id) descCollapsedState[l._id] = l.descCollapsed
            if (l.topics) l.topics.forEach(t => {
                if (t._id) collapsedState[t._id] = t.collapsed
            })
        })
      }

      try {
        const realSubject = getRealSubject(this.selectedSubject)
        const rawData = await request(`/api/course/levels?subject=${encodeURIComponent(realSubject)}`)
        const data = filterLevels(rawData, this.selectedSubject)
        
        // Restore state
        if (Array.isArray(data)) {
          data.forEach(level => {
            level.descCollapsed = (level._id && descCollapsedState[level._id] !== undefined) ? descCollapsedState[level._id] : true
            if (level.topics) {
              level.topics.forEach(topic => {
                topic.collapsed = (topic._id && collapsedState[topic._id] !== undefined) ? collapsedState[topic._id] : true
              })
            }
          })
        }
        this.levels = data
      } catch (e) {
        this.showToastMessage('加载课程失败: ' + e.message)
      } finally {
        this.loadingCourses = false
      }
    },

    // --- Actions ---
    toggleLevelDesc(level) { level.descCollapsed = !level.descCollapsed },
    toggleTopicCollapse(topic) { topic.collapsed = !topic.collapsed },

    async saveLevel() {
      try {
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
    async deleteLevel(id) {
      if (!confirm('确定要删除这个等级吗？')) return
      try {
        await request(`/api/course/levels/${id}`, { method: 'DELETE' })
        this.showToastMessage('删除成功')
        this.fetchLevels()
        this.selectedNode = null
      } catch (e) {
        this.showToastMessage('删除失败: ' + e.message)
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
        await this.fetchLevels()
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
        this.fetchLevels()
        this.selectedNode = null
      } catch (e) {
        this.showToastMessage('删除知识点失败: ' + e.message)
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
        await this.fetchLevels()
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
        this.fetchLevels()
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
        this.fetchLevels()
        // Note: Selection might be lost or stale after fetch, ideally we re-select
      } catch (e) {
        this.showToastMessage('移动失败: ' + e.message)
      }
    },
    // --- AI Methods ---
    async generateLessonPlan() {
      if (!this.editingChapter.title) return this.showToastMessage('请先填写章节标题')
      this.aiLoading = true
      this.aiStatus = '正在生成教案...'
      try {
        const res = await request('/api/lesson-plan', {
          method: 'POST',
          body: JSON.stringify({
            topic: this.editingChapter.title,
            context: this.editingTopicForChapter ? this.editingTopicForChapter.title : '',
            level: `Level ${this.editingLevelForChapter.level}`,
            requirements: this.aiRequirements,
            model: this.selectedModel
          })
        })
        this.editingChapter.content = res.content
        this.editingChapter.contentType = 'markdown'
        this.showToastMessage('教案生成成功')
      } catch (e) {
        this.showToastMessage('生成失败: ' + e.message)
      } finally {
        this.aiLoading = false
        this.aiStatus = ''
      }
    },

    async generatePPT() {
      if (!this.editingChapter.title) return this.showToastMessage('请先填写章节标题')
      this.aiLoading = true
      this.aiStatus = '正在生成 PPT...'
      try {
        // 1. Generate HTML
        const res = await request('/api/generate-ppt', {
          method: 'POST',
          body: JSON.stringify({
            topic: this.editingChapter.title,
            context: this.editingTopicForChapter ? this.editingTopicForChapter.title : '',
            level: `Level ${this.editingLevelForChapter.level}`,
            model: this.selectedModel
          })
        })
        
        // 2. Upload HTML
        this.aiStatus = '正在保存课件...'
        const uploadRes = await request('/api/course/upload-courseware', {
          method: 'POST',
          body: JSON.stringify({
            htmlContent: res.content,
            level: this.editingLevelForChapter.level,
            topicTitle: this.editingTopicForChapter.title,
            chapterTitle: this.editingChapter.title,
            filename: `ppt_${this.editingChapter.title}` // Fallback
          })
        })

        this.editingChapter.resourceUrl = uploadRes.url
        this.editingChapter.contentType = 'html'
        this.showToastMessage('PPT 生成并保存成功')
      } catch (e) {
        this.showToastMessage('生成失败: ' + e.message)
      } finally {
        this.aiLoading = false
        this.aiStatus = ''
      }
    },

    async generateSolutionReport() {
      if (!this.editingChapter.problemIdsStr) return this.showToastMessage('请先在下方关联题目 ID')
      
      // Get the first problem ID
      const firstProblemId = this.editingChapter.problemIdsStr.split(/[,，]/)[0].trim()
      if (!firstProblemId) return this.showToastMessage('未找到有效的题目 ID')

      this.aiLoading = true
      this.aiStatus = '正在获取题目信息...'
      
      try {
        // 1. Fetch problem details
        // We need to resolve the ID first. The backend helper `resolveProblemIds` does this, 
        // but here we are on frontend. We can try to fetch the document directly if we have an API.
        // Or we can use a new endpoint to get problem text by ID string.
        // Let's assume we can use the existing /api/data/documents endpoint with a query if we are admin,
        // but that might be complex.
        // Simpler way: Let's assume the user inputs a docId (number) or domain:docId.
        
        let docId = firstProblemId
        let domainId = 'system'
        if (firstProblemId.includes(':')) {
            [domainId, docId] = firstProblemId.split(':')
        }
        
        // We need an endpoint to get problem content by docId/domainId.
        // Currently /api/data/documents filters by domainId but returns a list.
        // Let's try to find it in the list (might be slow if many docs).
        // Better: Use the `check-problem` logic or similar? No.
        // Let's use the `problemIds` array if it's already resolved in `editingChapter`?
        // `editingChapter.problemIds` contains ObjectIds.
        // We need the TEXT content of the problem.
        
        // Let's fetch the problem content using a search or specific endpoint.
        // Since we don't have a direct "get problem by display ID" endpoint exposed easily here,
        // we will try to use the `problemIds` (ObjectIds) if available.
        
        let problemText = ''
        
        // If we have resolved ObjectIds in the original chapter data
        if (this.editingChapter.problemIds && this.editingChapter.problemIds.length > 0) {
             // But `editingChapter` here is the form data, `problemIds` might be stale or just strings if we didn't reload.
             // The `problemIdsStr` is what the user edited.
        }
        
        // Let's call a new helper endpoint or just search.
        // For now, let's try to fetch all docs in that domain and find it (inefficient but works for now)
        // OR, add a specific endpoint.
        // Let's try to use the existing `request` to get the problem content.
        // We will assume the user has access to `/api/problems/:id` if it existed.
        // Actually, `Solution.vue` uses `/api/documents?domainId=...`
        
        const docsRes = await request(`/api/documents?domainId=${domainId}&limit=1000`) // Potential perf issue
        const doc = docsRes.docs.find(d => String(d.docId) === String(docId))
        
        if (!doc) throw new Error('未找到该题目')
        problemText = doc.content
        
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
        this.aiStatus = '正在提交后台生成任务...'
        
        await request.post('/api/solution-report/background', {
            problem: problemText,
            code: userCode,
            reference: '',
            level: this.editingLevelForChapter.level,
            topicTitle: this.editingTopicForChapter.title,
            chapterTitle: this.editingChapter.title,
            problemTitle: doc.title,
            chapterId: this.editingChapter.id,
            model: this.selectedModel
        })
        
        this.aiStatus = ''
        this.showToastMessage('后台生成任务已提交！您可以关闭页面，稍后刷新查看结果。')
        
        /* Legacy Synchronous Mode
        const res = await request.post('/api/solution-report', {
            problem: problemText,
            code: userCode, // Use user code if available
            reference: ''
        })
        
        // 3. Upload HTML
        this.aiStatus = '正在保存课件...'
        const uploadRes = await request('/api/course/upload-courseware', {
          method: 'POST',
          body: JSON.stringify({
            htmlContent: res.html,
            level: this.editingLevelForChapter.level,
            topicTitle: this.editingTopicForChapter.title,
            chapterTitle: this.editingChapter.title,
            filename: `solution_${docId}`
          })
        })

        this.editingChapter.resourceUrl = uploadRes.url
        this.editingChapter.contentType = 'html'
        this.showToastMessage('解题报告生成成功')
        */

      } catch (e) {
        this.showToastMessage('生成失败: ' + e.message)
      } finally {
        this.aiLoading = false
        this.aiStatus = ''
      }
    },

    async generateTopicDescription() {
      if (!this.editingTopic.title) return this.showToastMessage('请先填写知识点标题')
      this.aiLoading = true
      this.aiStatus = '正在生成描述...'
      try {
        const res = await request('/api/topic-plan', {
          method: 'POST',
          body: JSON.stringify({
            topic: this.editingTopic.title,
            level: `Level ${this.editingLevelForTopic.level}`,
            mode: 'description',
            model: this.selectedModel
          })
        })
        
        const description = res.description || ''
        if (!description) {
            this.showToastMessage('AI 未生成有效描述')
            return
        }

        this.editingTopic.description = description
        this.showToastMessage('描述生成成功，请点击保存')
        
      } catch (e) {
        this.showToastMessage('生成失败: ' + e.message)
      } finally {
        this.aiLoading = false
        this.aiStatus = ''
      }
    },

    async generateTopicChapters() {
      if (!this.editingTopic.title) return this.showToastMessage('请先填写知识点标题')
      this.aiLoading = true
      this.aiStatus = '正在规划章节...'
      try {
        const res = await request('/api/topic-plan', {
          method: 'POST',
          body: JSON.stringify({
            topic: this.editingTopic.title,
            level: `Level ${this.editingLevelForTopic.level}`,
            mode: 'chapters', // Default mode, but explicit
            model: this.selectedModel
          })
        })
        
        const newChapters = res.chapters || []
        // Note: We ignore description here as user requested separate buttons
        // const description = res.description || ''

        if (newChapters.length === 0) {
            this.showToastMessage('AI 未生成有效章节')
            return
        }

        // Add chapters to the topic
        if (!this.editingTopic.chapters) this.editingTopic.chapters = []
        
        // We need to save these chapters one by one or update the topic.
        // Since we don't have a batch update for chapters, we will iterate and call create API.
        // But wait, `saveTopic` updates the topic object which contains chapters?
        // Let's check `server/routes/course.js` -> `PUT /levels/:id/topics/:topicId`
        // It only updates title and description. It does NOT update chapters array.
        
        // So we must call POST /chapters for each new chapter.
        
        this.aiStatus = `正在创建 ${newChapters.length} 个章节...`
        
        for (let i = 0; i < newChapters.length; i++) {
            const title = newChapters[i]
            const chapterData = {
                id: `${this.editingLevelForTopic.level}-${Date.now()}-${i}`, // Temp ID, server will renumber
                title: title,
                content: '',
                contentType: 'markdown',
                optional: false,
                problemIds: []
            }
            
            await request(`/api/course/levels/${this.editingLevelForTopic._id}/topics/${this.editingTopic._id}/chapters`, {
                method: 'POST',
                body: JSON.stringify(chapterData)
            })
        }
        
        this.showToastMessage(`成功生成 ${newChapters.length} 个章节`)
        this.fetchLevels() // Refresh tree
        
      } catch (e) {
        this.showToastMessage('规划失败: ' + e.message)
      } finally {
        this.aiLoading = false
        this.aiStatus = ''
      }
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
.design-container {
  display: flex;
  height: calc(100vh - 60px); /* Adjust based on header height */
  overflow: hidden;
  background: #f5f7fa;
}

/* Sidebar */
.sidebar {
  width: 320px;
  min-width: 320px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 5px rgba(0,0,0,0.02);
}

.sidebar-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  background: #fcfcfc;
}
.sidebar-header h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #2c3e50;
}
.subject-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}
.btn-add-level {
  width: 100%;
  padding: 8px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.btn-add-level:hover { background: #27ae60; }

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

/* Tree Items */
.tree-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.1s;
  user-select: none;
}
.tree-item:hover { background: #f0f2f5; }
.tree-item.active { background: #e3f2fd; color: #1976d2; border-right: 3px solid #1976d2; }

.tree-icon {
  width: 20px;
  text-align: center;
  color: #999;
  font-size: 10px;
  margin-right: 5px;
}
.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-actions {
  display: none;
}
.tree-item:hover .tree-actions {
  display: block;
}
.btn-icon {
  background: none;
  border: none;
  color: #666;
  font-weight: bold;
  cursor: pointer;
  padding: 0 5px;
}
.btn-icon:hover { color: #3498db; }

.level-item { font-weight: 600; color: #2c3e50; }
.topic-item { padding-left: 25px; font-size: 14px; }
.chapter-item { padding-left: 45px; font-size: 13px; color: #555; }

.empty-node {
  padding-left: 45px;
  font-size: 12px;
  color: #ccc;
  padding-top: 5px;
  padding-bottom: 5px;
}

/* Editor Panel */
.editor-panel {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  background: #fff;
}
.empty-state {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.editor-header h2 { margin: 0; font-size: 20px; color: #2c3e50; }

.header-actions { display: flex; gap: 10px; align-items: center; }
.move-actions { display: flex; gap: 5px; margin-right: 10px; }

.model-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  font-size: 14px;
  background-color: #fff;
  color: #333;
  min-width: 150px;
}

.btn-save {
  padding: 8px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.btn-save:hover { background: #2980b9; }
.btn-delete {
  padding: 8px 15px;
  background: #fff;
  color: #e74c3c;
  border: 1px solid #e74c3c;
  border-radius: 4px;
  cursor: pointer;
}
.btn-delete:hover { background: #fceae9; }
.btn-small {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 3px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}
.btn-move:hover { background: #f0f0f0; }

/* Forms */
.form-group { margin-bottom: 20px; }
.form-row { display: flex; gap: 20px; }
.half { flex: 1; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}
.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}
.form-input:focus { border-color: #3498db; outline: none; }
.form-input.disabled { background: #f9f9f9; color: #999; cursor: not-allowed; }
.code-font { font-family: Consolas, Monaco, 'Courier New', monospace; }

.hint { font-size: 12px; color: #999; margin-top: 5px; display: block; }

.split-view {
  display: flex;
  gap: 20px;
  height: 500px;
}
.split-view .form-input { flex: 1; resize: none; }
.preview-box {
  flex: 1;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
  overflow-y: auto;
  background: #fafafa;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.preview-container-large {
  border: 1px solid #ddd;
  border-radius: 4px;
  height: 600px;
  background: #fff;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.markdown-preview {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

/* AI Assistant */
.ai-assistant-box {
  background: linear-gradient(135deg, #f6f8ff 0%, #f1f4ff 100%);
  border: 1px solid #dbe4ff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ai-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-status {
  font-size: 13px;
  color: #666;
  animation: pulse 1.5s infinite;
}
.ai-controls {
  display: flex;
  gap: 10px;
}
.ai-controls.disabled {
  opacity: 0.6;
  pointer-events: none;
}
.ai-input {
  flex: 1;
  margin-bottom: 0 !important;
}
.ai-buttons {
  display: flex;
  gap: 10px;
}
.btn-ai {
  padding: 8px 15px;
  background: #6c5ce7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s;
}
.btn-ai:hover {
  background: #5b4bc4;
}
.btn-ai:disabled {
  background: #a29bfe;
  cursor: not-allowed;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
</style>