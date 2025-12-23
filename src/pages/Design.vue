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
            @click="selectNode('level', level)"
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
                @click="selectNode('topic', topic, level)"
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
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="btn-delete">删除知识点</button>
            <button @click="saveTopic" class="btn-save">保存更改</button>
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
            <div v-if="!editingChapter.isNew" class="move-actions">
               <button @click="moveChapter('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveChapter('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="btn-delete">删除章节</button>
            <button @click="saveChapter" class="btn-save">保存更改</button>
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
             <button @click="showPreview = !showPreview" class="btn-small btn-preview" type="button">
               {{ showPreview ? '关闭预览' : '开启预览' }}
             </button>
          </div>

          <div v-if="!showPreview">
            <input v-if="editingChapter.contentType === 'html'" v-model="editingChapter.resourceUrl" class="form-input" placeholder="/public/courseware/bfs.html">
            <textarea v-else v-model="editingChapter.content" class="form-input code-font" rows="15"></textarea>
          </div>

          <div v-else class="preview-container-large">
             <iframe v-if="editingChapter.contentType === 'html'" :src="getPreviewUrl(editingChapter.resourceUrl)" class="preview-iframe"></iframe>
             <div v-else class="markdown-preview">
               <MarkdownViewer :content="editingChapter.content" />
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

export default {
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
      isInitialLoad: true
    }
  },
  computed: {
    currentSubjectConfig() {
      return SUBJECTS_CONFIG.find(s => s.name === this.selectedSubject)
    }
  },
  mounted() {
    this.fetchLevels()
  },
  methods: {
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
        if (this.editingTopic._id) {
          await request(`/api/course/levels/${this.editingLevelForTopic._id}/topics/${this.editingTopic._id}`, {
            method: 'PUT',
            body: JSON.stringify(this.editingTopic)
          })
        } else {
          await request(`/api/course/levels/${this.editingLevelForTopic._id}/topics`, {
            method: 'POST',
            body: JSON.stringify(this.editingTopic)
          })
        }
        this.showToastMessage('保存知识点成功')
        this.fetchLevels()
        this.selectedNode = null
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
        const problemIds = this.editingChapter.problemIdsStr
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

        if (this.editingChapter.isNew) {
           await request(`/api/course/levels/${this.editingLevelForChapter._id}/topics/${this.editingTopicForChapter._id}/chapters`, {
             method: 'POST',
             body: JSON.stringify(chapterData)
           })
        } else {
           const chId = this.editingChapter._id || this.editingChapter.id
           await request(`/api/course/levels/${this.editingLevelForChapter._id}/topics/${this.editingTopicForChapter._id}/chapters/${chId}`, {
             method: 'PUT',
             body: JSON.stringify(chapterData)
           })
        }
        
        this.showToastMessage('保存章节成功')
        this.fetchLevels()
        this.selectedNode = null
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

.header-actions { display: flex; gap: 10px; }
.move-actions { display: flex; gap: 5px; margin-right: 10px; }

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
</style>