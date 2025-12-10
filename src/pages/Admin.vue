<template>
  <div class="admin-container">
    <div class="admin-tabs">
      <button 
        v-if="isAdmin"
        :class="['tab-btn', { active: activeTab === 'users' }]" 
        @click="activeTab = 'users'"
      >
        用户管理
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'courses' }]" 
        @click="switchTab('courses')"
      >
        课程管理 (C++)
      </button>
    </div>

    <!-- User Management Tab -->
    <div v-if="activeTab === 'users'">
      <div class="search-bar">
        <input 
          v-model="searchQuery" 
          @keyup.enter="handleSearch" 
          placeholder="搜索用户名、邮箱或 ID..." 
          class="search-input"
        />
        <button @click="handleSearch" class="btn-search">搜索</button>
        <button @click="togglePremiumFilter" :class="['btn-filter', { active: filterRole === 'premium' }]">
          {{ filterRole === 'premium' ? '显示全部用户' : '只看高级用户' }}
        </button>
      </div>

      <div v-if="loading">加载中...</div>
      <div v-else>
        <table class="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>权限值 (Priv)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u._id">
              <td>{{ u._id }}</td>
              <td>{{ u.uname }}</td>
              <td>{{ u.mail }}</td>
              <td>
                <span :class="['role-badge', u.role]">{{ u.role || 'user' }}</span>
              </td>
              <td>{{ u.priv }}</td>
              <td>
                <div class="actions">
                  <button v-if="u.role !== 'premium' && u.role !== 'admin' && u.role !== 'teacher'" @click="setRole(u, 'premium')" class="btn-small btn-premium">设为高级用户</button>
                  <button v-if="u.role === 'premium'" @click="setRole(u, 'user')" class="btn-small btn-user">取消高级用户</button>
                  
                  <button v-if="u.role !== 'teacher' && u.role !== 'admin'" @click="setRole(u, 'teacher')" class="btn-small btn-teacher">设为教师</button>
                  <button v-if="u.role === 'teacher'" @click="setRole(u, 'user')" class="btn-small btn-user">取消教师</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="pagination">
          <button :disabled="page <= 1" @click="changePage(page - 1)" class="btn-page">上一页</button>
          <span class="page-info">第 {{ page }} / {{ totalPages }} 页 (共 {{ total }} 条)</span>
          <button :disabled="page >= totalPages" @click="changePage(page + 1)" class="btn-page">下一页</button>
        </div>
      </div>

      <div class="system-tools">
        <h3>系统工具</h3>
        <div class="tool-group">
          <button @click="sendTestEmail" class="btn-tool">发送测试邮件</button>
          <button @click="sendDailyReport" class="btn-tool">发送昨日日报</button>
          <button @click="$router.push('/problems')" class="btn-tool">题目管理 (翻译/标签)</button>
        </div>
      </div>
    </div>

    <!-- Course Management Tab -->
    <div v-if="activeTab === 'courses'" class="course-management">
      <div class="course-header">
        <h3>课程关卡管理</h3>
        <button @click="openLevelModal()" class="btn-add">添加等级 (Level)</button>
      </div>

      <div v-if="loadingCourses">加载中...</div>
      <div v-else class="level-list">
        <div v-for="level in levels" :key="level._id" class="level-item">
          <div class="level-header">
            <span class="level-title">Level {{ level.level }}: {{ level.title }}</span>
            <div class="level-actions">
              <button @click="openLevelModal(level)" class="btn-small btn-edit">编辑</button>
              <button @click="deleteLevel(level._id)" class="btn-small btn-delete">删除</button>
              <button @click="openChapterModal(level)" class="btn-small btn-add-sub">添加章节</button>
            </div>
          </div>
          <div class="level-desc">{{ level.description }}</div>
          
          <div class="chapter-list">
            <div v-for="chapter in level.chapters" :key="chapter.id" class="chapter-item">
              <div class="chapter-header">
                <span class="chapter-title">
                  Chapter {{ chapter.id }}: {{ chapter.title }}
                  <span v-if="chapter.optional" class="badge-optional">选做</span>
                </span>
                <div class="chapter-actions">
                  <button @click="openChapterModal(level, chapter)" class="btn-small btn-edit">编辑</button>
                  <button @click="deleteChapter(level._id, chapter.id)" class="btn-small btn-delete">删除</button>
                </div>
              </div>
              <div class="chapter-problems">
                <strong>题目ID:</strong> {{ formatProblemIds(chapter.problemIds) }}
              </div>
            </div>
            <div v-if="!level.chapters || level.chapters.length === 0" class="no-chapters">
              暂无章节
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Level Modal -->
    <div v-if="showLevelModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingLevel._id ? '编辑等级' : '添加等级' }}</h3>
        <div class="form-group">
          <label>Level (数字 1-6):</label>
          <input v-model.number="editingLevel.level" type="number" class="form-input">
        </div>
        <div class="form-group">
          <label>标题:</label>
          <input v-model="editingLevel.title" class="form-input">
        </div>
        <div class="form-group">
          <label>描述:</label>
          <textarea v-model="editingLevel.description" class="form-input" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showLevelModal = false" class="btn-cancel">取消</button>
          <button @click="saveLevel" class="btn-save">保存</button>
        </div>
      </div>
    </div>

    <!-- Chapter Modal -->
    <div v-if="showChapterModal" class="modal-overlay">
      <div class="modal-content large-modal">
        <h3>{{ editingChapter.isNew ? '添加章节' : '编辑章节' }} (Level {{ editingLevelForChapter.level }})</h3>
        <div class="form-group">
          <label>Chapter ID (例如 1-1):</label>
          <input v-model="editingChapter.id" class="form-input">
        </div>
        <div class="form-group">
          <label>标题:</label>
          <input v-model="editingChapter.title" class="form-input">
        </div>
        <div class="form-group">
          <label>内容 (Markdown):</label>
          <textarea v-model="editingChapter.content" class="form-input" rows="10"></textarea>
        </div>
        <div class="form-group">
          <label>题目 ID (逗号分隔，支持 "domain:id" 或 "id"):</label>
          <input v-model="editingChapter.problemIdsStr" class="form-input" placeholder="例如: system:1001, 1002 (默认system域)">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="editingChapter.optional"> 选做章节 (Optional)
          </label>
          <p style="font-size: 12px; color: #666; margin-top: 4px;">选做章节不会阻塞后续章节的解锁。</p>
        </div>
        <div class="modal-actions">
          <button @click="showChapterModal = false" class="btn-cancel">取消</button>
          <button @click="saveChapter" class="btn-save">保存</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import request from '../utils/request'

export default {
  inject: ['showToastMessage'],
  data() {
    return {
      currentUser: null,
      // Tabs
      activeTab: 'users',

      // User Management Data
      users: [],
      loading: false,
      searchQuery: '',
      filterRole: '',
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,

      // Course Management Data
      levels: [],
      loadingCourses: false,
      showLevelModal: false,
      showChapterModal: false,
      editingLevel: {},
      editingChapter: {},
      editingLevelForChapter: null // The level object the chapter belongs to
    }
  },
  computed: {
    isAdmin() {
      return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.priv === -1)
    }
  },
  mounted() {
    const userStr = localStorage.getItem('user_info')
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr)
      } catch (e) {}
    }

    if (!this.isAdmin) {
      this.activeTab = 'courses'
    }

    if (this.activeTab === 'users') {
      this.fetchUsers()
    } else {
      this.fetchLevels()
    }
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab
      if (tab === 'courses') {
        this.fetchLevels()
      }
    },
    // --- User Management Methods ---
    handleSearch() {
      this.page = 1
      this.fetchUsers()
    },
    togglePremiumFilter() {
      this.filterRole = this.filterRole === 'premium' ? '' : 'premium'
      this.page = 1
      this.fetchUsers()
    },
    async changePage(newPage) {
      if (newPage < 1 || newPage > this.totalPages) return
      this.page = newPage
      await this.fetchUsers()
    },
    async fetchUsers() {
      this.loading = true
      try {
        let url = `/api/admin/users?page=${this.page}&limit=${this.limit}`
        if (this.searchQuery) {
          url += `&q=${encodeURIComponent(this.searchQuery)}`
        }
        if (this.filterRole) {
          url += `&role=${this.filterRole}`
        }
        const data = await request(url)
        if (data && Array.isArray(data.users)) {
          this.users = data.users
          this.total = data.total
          this.totalPages = data.totalPages
          this.page = data.page
        } else if (Array.isArray(data)) {
          this.users = data
          this.total = data.length
          this.totalPages = 1
        }
      } catch (e) {
        this.showToastMessage('加载用户失败: ' + e.message)
      } finally {
        this.loading = false
      }
    },
    async setRole(user, role) {
      try {
        await request(`/api/admin/users/${user._id}/role`, {
          method: 'POST',
          body: JSON.stringify({ role })
        })
        this.showToastMessage(`已将用户 ${user.uname} 设置为 ${role}`)
        user.role = role
      } catch (e) {
        this.showToastMessage('设置失败: ' + e.message)
      }
    },
    async sendTestEmail() {
      if (!confirm('确定要发送测试邮件吗？请确保服务器已配置 MAIL_TO')) return
      try {
        await request('/api/admin/send-test-email', { method: 'POST' })
        this.showToastMessage('测试邮件已发送')
      } catch (e) {
        this.showToastMessage('发送失败: ' + e.message)
      }
    },
    async sendDailyReport() {
      if (!confirm('确定要手动触发昨日日报发送吗？')) return
      try {
        await request('/api/admin/send-daily-report', { method: 'POST' })
        this.showToastMessage('日报发送任务已触发')
      } catch (e) {
        this.showToastMessage('触发失败: ' + e.message)
      }
    },

    // --- Course Management Methods ---
    async fetchLevels() {
      this.loadingCourses = true
      try {
        const data = await request('/api/course/levels')
        this.levels = data
      } catch (e) {
        this.showToastMessage('加载课程失败: ' + e.message)
      } finally {
        this.loadingCourses = false
      }
    },
    openLevelModal(level = null) {
      if (level) {
        this.editingLevel = { ...level }
      } else {
        this.editingLevel = { level: this.levels.length + 1, title: '', description: '' }
      }
      this.showLevelModal = true
    },
    async saveLevel() {
      try {
        if (this.editingLevel._id) {
          // Update
          await request(`/api/course/levels/${this.editingLevel._id}`, {
            method: 'PUT',
            body: JSON.stringify(this.editingLevel)
          })
        } else {
          // Create
          await request('/api/course/levels', {
            method: 'POST',
            body: JSON.stringify(this.editingLevel)
          })
        }
        this.showToastMessage('保存成功')
        this.showLevelModal = false
        this.fetchLevels()
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
      } catch (e) {
        this.showToastMessage('删除失败: ' + e.message)
      }
    },
    openChapterModal(level, chapter = null) {
      this.editingLevelForChapter = level
      if (chapter) {
        // Convert populated problem objects back to string format
        const problemIdsStr = (chapter.problemIds || []).map(p => {
          if (typeof p === 'string') return p
          // If it's a populated object
          if (p.domainId && p.domainId !== 'system') {
            return `${p.domainId}:${p.docId}`
          }
          return p.docId
        }).join(', ')

        this.editingChapter = { 
          ...chapter, 
          problemIdsStr: problemIdsStr,
          optional: !!chapter.optional,
          isNew: false
        }
      } else {
        const nextIndex = (level.chapters ? level.chapters.length : 0) + 1
        const nextId = `${level.level}-${nextIndex}`
        this.editingChapter = { 
          id: nextId, 
          title: '', 
          content: '', 
          problemIdsStr: '',
          optional: false,
          isNew: true
        }
      }
      this.showChapterModal = true
    },
    async saveChapter() {
      try {
        // Parse problem IDs
        const problemIds = this.editingChapter.problemIdsStr
          .split(/[,，]/) // Split by comma (English or Chinese)
          .map(s => s.trim())
          .filter(s => s)
          .map(String)

        const chapterData = {
          id: this.editingChapter.id,
          title: this.editingChapter.title,
          content: this.editingChapter.content,
          problemIds: problemIds,
          optional: this.editingChapter.optional
        }

        if (this.editingChapter.isNew) {
          await request(`/api/course/levels/${this.editingLevelForChapter._id}/chapters`, {
            method: 'POST',
            body: JSON.stringify(chapterData)
          })
        } else {
          await request(`/api/course/levels/${this.editingLevelForChapter._id}/chapters/${this.editingChapter.id}`, {
            method: 'PUT',
            body: JSON.stringify(chapterData)
          })
        }
        this.showToastMessage('保存章节成功')
        this.showChapterModal = false
        this.fetchLevels()
      } catch (e) {
        this.showToastMessage('保存章节失败: ' + e.message)
      }
    },
    async deleteChapter(levelId, chapterId) {
      if (!confirm('确定要删除这个章节吗？')) return
      try {
        await request(`/api/course/levels/${levelId}/chapters/${chapterId}`, { method: 'DELETE' })
        this.showToastMessage('删除章节成功')
        this.fetchLevels()
      } catch (e) {
        this.showToastMessage('删除章节失败: ' + e.message)
      }
    },
    formatProblemIds(ids) {
      if (!ids || ids.length === 0) return '无 (纯阅读章节)'
      return ids.map(p => {
        if (typeof p === 'string') return p
        // If it's a populated object
        if (p.domainId && p.domainId !== 'system') {
          return `${p.domainId}:${p.docId}`
        }
        return p.docId || p._id
      }).join(', ')
    }
  }
}
</script>

<style scoped>
.admin-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

/* Tabs */
.admin-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}
.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #666;
}
.tab-btn.active {
  color: #2b9af3;
  border-bottom-color: #2b9af3;
}
.tab-btn:hover {
  color: #2b9af3;
}

/* Course Management */
.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.btn-add {
  padding: 8px 16px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.level-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.level-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.level-title {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}
.level-desc {
  color: #7f8c8d;
  margin-bottom: 15px;
  font-size: 14px;
}
.level-actions, .chapter-actions {
  display: flex;
  gap: 8px;
}

.chapter-list {
  margin-left: 20px;
  border-left: 2px solid #eee;
  padding-left: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chapter-item {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
}
.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chapter-title {
  font-weight: 600;
  color: #34495e;
}
.chapter-problems {
  font-size: 12px;
  color: #95a5a6;
  margin-top: 5px;
}
.no-chapters {
  color: #bdc3c7;
  font-style: italic;
}

.btn-add-sub {
  background-color: #3498db;
  color: white;
}
.btn-edit {
  background-color: #f39c12;
  color: white;
}
.btn-delete {
  background-color: #e74c3c;
  color: white;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-content.large-modal {
  width: 800px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}
.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-save {
  padding: 8px 20px;
  background-color: #2b9af3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-cancel {
  padding: 8px 20px;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Existing Styles */
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
.btn-search {
  padding: 8px 16px;
  background-color: #2b9af3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-search:hover {
  background-color: #1a89e2;
}
.btn-filter {
  padding: 8px 16px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-filter:hover {
  background-color: #f5f5f5;
}
.btn-filter.active {
  background-color: #f1c40f;
  color: #333;
  border-color: #f39c12;
  font-weight: bold;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.user-table th, .user-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}
.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}
.role-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}
.role-badge.admin { background-color: #e74c3c; color: white; }
.role-badge.premium { background-color: #f1c40f; color: #333; }
.role-badge.teacher { background-color: #8e44ad; color: white; }
.role-badge.user { background-color: #95a5a6; color: white; }

.badge-optional {
  display: inline-block;
  background-color: #9b59b6;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  vertical-align: middle;
}

.actions {
  display: flex;
  gap: 8px;
}
.btn-small {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}
.btn-premium { background-color: #f1c40f; color: #333; }
.btn-premium:hover { background-color: #f39c12; }
.btn-teacher { background-color: #8e44ad; color: white; }
.btn-teacher:hover { background-color: #9b59b6; }
.btn-user { background-color: #e0e0e0; color: #333; }
.btn-user:hover { background-color: #d0d0d0; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}
.btn-page {
  padding: 6px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}
.btn-page:disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}
.btn-page:not(:disabled):hover {
  background-color: #f0f0f0;
}
.page-info {
  font-size: 14px;
  color: #666;
}

.system-tools {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.tool-group {
  display: flex;
  gap: 15px;
  margin-top: 15px;
}
.btn-tool {
  padding: 10px 20px;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-tool:hover {
  background-color: #34495e;
}
</style>
