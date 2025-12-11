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
        <button @click="toggleTeacherFilter" :class="['btn-filter', { active: filterRole === 'teacher' }]">
          {{ filterRole === 'teacher' ? '显示全部用户' : '只看教师' }}
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
                <div class="role-badges">
                  <span v-if="u.isAdmin" class="role-badge admin">ADMIN</span>
                  <span v-if="u.isTeacher" class="role-badge teacher">TEACHER</span>
                  <span v-if="u.isPremium" class="role-badge premium">PREMIUM</span>
                  <span v-if="!u.isAdmin && !u.isTeacher && !u.isPremium" class="role-badge user">USER</span>
                </div>
              </td>
              <td>{{ u.priv }}</td>
              <td>
                <div class="actions">
                  <button v-if="!u.isPremium && !u.isAdmin" @click="toggleRole(u, 'premium', true)" class="btn-small btn-premium">设为高级用户</button>
                  <button v-if="u.isPremium && !u.isAdmin" @click="toggleRole(u, 'premium', false)" class="btn-small btn-user">取消高级用户</button>
                  
                  <button v-if="!u.isTeacher && !u.isAdmin" @click="toggleRole(u, 'teacher', true)" class="btn-small btn-teacher">设为教师</button>
                  <button v-if="u.isTeacher && !u.isAdmin" @click="toggleRole(u, 'teacher', false)" class="btn-small btn-user">取消教师</button>
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
        <div class="subject-selector">
          <button 
            v-for="sub in availableSubjects" 
            :key="sub"
            :class="['btn-subject', { active: selectedSubject === sub }]"
            @click="selectedSubject = sub; fetchLevels()"
          >
            {{ sub }}
          </button>
        </div>
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
            </div>
          </div>
          <div class="level-desc markdown-content" v-html="renderMarkdown(level.description)"></div>
          
          <!-- Topics List -->
          <div class="topic-list">
             <div v-for="topic in level.topics" :key="topic._id" class="topic-item">
                <div class="topic-header">
                   <span class="topic-title">{{ topic.title }}</span>
                   <div class="topic-actions">
                      <button @click="openTopicModal(level, topic)" class="btn-small btn-edit">编辑</button>
                      <button @click="deleteTopic(level._id, topic._id)" class="btn-small btn-delete">删除</button>
                      <button @click="openChapterModal(level, topic)" class="btn-small btn-add-sub">添加章节</button>
                   </div>
                </div>
                <div class="topic-desc">{{ topic.description }}</div>
                
                <div class="chapter-list">
                  <div v-for="chapter in topic.chapters" :key="chapter.id" class="chapter-item">
                    <div class="chapter-header">
                      <span class="chapter-title">
                        Chapter {{ chapter.id }}: {{ chapter.title }}
                        <span v-if="chapter.optional" class="badge-optional">选做</span>
                      </span>
                      <div class="chapter-actions">
                        <button @click="openChapterModal(level, topic, null, topic.chapters.indexOf(chapter))" class="btn-small btn-insert" title="在此之前插入">插入</button>
                        <button @click="openChapterModal(level, topic, chapter)" class="btn-small btn-edit">编辑</button>
                        <button @click="deleteChapter(level._id, topic._id, chapter._id || chapter.id)" class="btn-small btn-delete">删除</button>
                      </div>
                    </div>
                    <div class="chapter-problems">
                      <strong>题目ID:</strong> {{ formatProblemIds(chapter.problemIds) }}
                    </div>
                  </div>
                  <div v-if="!topic.chapters || topic.chapters.length === 0" class="no-chapters">
                    暂无章节
                  </div>
                </div>
             </div>
             <button @click="openTopicModal(level)" class="btn-add-topic">添加知识点 (Topic)</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Level Modal -->
    <div v-if="showLevelModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingLevel._id ? '编辑等级' : '添加等级' }}</h3>
        <div class="form-group">
          <label>科目 (Subject):</label>
          <select v-model="editingLevel.subject" class="form-input">
            <option v-for="sub in availableSubjects" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Level (数字):</label>
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

    <!-- Topic Modal -->
    <div v-if="showTopicModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingTopic._id ? '编辑知识点' : '添加知识点' }}</h3>
        <div class="form-group">
          <label>标题:</label>
          <input v-model="editingTopic.title" class="form-input">
        </div>
        <div class="form-group">
          <label>描述:</label>
          <textarea v-model="editingTopic.description" class="form-input" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showTopicModal = false" class="btn-cancel">取消</button>
          <button @click="saveTopic" class="btn-save">保存</button>
        </div>
      </div>
    </div>

    <!-- Chapter Modal -->
    <div v-if="showChapterModal" class="modal-overlay">
      <div class="modal-content large-modal">
        <h3>{{ editingChapter.isNew ? '添加章节' : '编辑章节' }} (Level {{ editingLevelForChapter.level }})</h3>
        <div class="form-group">
          <label>Chapter ID (自动生成):</label>
          <input v-model="editingChapter.id" class="form-input" disabled style="background-color: #f5f5f5; cursor: not-allowed;">
          <p style="font-size: 12px; color: #666; margin-top: 4px;">章节 ID 会根据章节顺序自动维护 (例如 1-1, 1-2)。</p>
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
import { marked } from 'marked'

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
      showTopicModal: false,
      showChapterModal: false,
      editingLevel: {},
      editingTopic: {},
      editingChapter: {},
      editingLevelForTopic: null,
      editingLevelForChapter: null, // The level object the chapter belongs to
      editingTopicForChapter: null,
      insertIndex: null, // For inserting chapters
      selectedSubject: 'C++',
      availableSubjects: ['C++', 'Python', 'Web']
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
    toggleTeacherFilter() {
      this.filterRole = this.filterRole === 'teacher' ? '' : 'teacher'
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
    async toggleRole(user, role, enable) {
      try {
        await request(`/api/admin/users/${user._id}/role`, {
          method: 'POST',
          body: JSON.stringify({ role, enable })
        })
        const actionText = enable ? '设置' : '取消'
        const roleText = role === 'premium' ? '高级用户' : '教师'
        this.showToastMessage(`已${actionText}用户 ${user.uname} 为 ${roleText}`)
        
        // Update local state
        if (role === 'premium') user.isPremium = enable
        if (role === 'teacher') user.isTeacher = enable
        
        // Refresh list to be safe or just update local
        // this.fetchUsers() 
      } catch (e) {
        this.showToastMessage('设置失败: ' + e.message)
      }
    },
    // Deprecated but kept for reference if needed, replaced by toggleRole
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
        const data = await request(`/api/course/levels?subject=${encodeURIComponent(this.selectedSubject)}`)
        this.levels = data
      } catch (e) {
        this.showToastMessage('加载课程失败: ' + e.message)
      } finally {
        this.loadingCourses = false
      }
    },
    openTopicModal(level, topic = null) {
      this.editingLevelForTopic = level
      if (topic) {
        this.editingTopic = { ...topic }
      } else {
        this.editingTopic = { title: '', description: '' }
      }
      this.showTopicModal = true
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
        this.showTopicModal = false
        this.fetchLevels()
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
      } catch (e) {
        this.showToastMessage('删除知识点失败: ' + e.message)
      }
    },
    openLevelModal(level = null) {
      if (level) {
        this.editingLevel = { ...level }
      } else {
        this.editingLevel = { 
          level: this.levels.length + 1, 
          title: '', 
          description: '',
          subject: this.selectedSubject
        }
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
    openChapterModal(level, topic = null, chapter = null, insertIndex = null) {
      this.editingLevelForChapter = level
      this.editingTopicForChapter = topic
      this.insertIndex = insertIndex // Store insert index

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
        // New Chapter
        let nextId = 'Auto'
        // Simple auto-id logic for display
        if (topic) {
           const nextIndex = (topic.chapters ? topic.chapters.length : 0) + 1
           nextId = `${level.level}-${nextIndex} (Topic)`
        } else {
           const nextIndex = (level.chapters ? level.chapters.length : 0) + 1
           nextId = `${level.level}-${nextIndex}`
        }

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

        if (this.editingTopicForChapter) {
           // Topic-based Chapter
           if (this.editingChapter.isNew) {
             if (this.insertIndex !== null) chapterData.insertIndex = this.insertIndex
             await request(`/api/course/levels/${this.editingLevelForChapter._id}/topics/${this.editingTopicForChapter._id}/chapters`, {
               method: 'POST',
               body: JSON.stringify(chapterData)
             })
           } else {
             // Use _id for update if available, else id string
             const chId = this.editingChapter._id || this.editingChapter.id
             await request(`/api/course/levels/${this.editingLevelForChapter._id}/topics/${this.editingTopicForChapter._id}/chapters/${chId}`, {
               method: 'PUT',
               body: JSON.stringify(chapterData)
             })
           }
        } else {
           // Legacy Level-based Chapter
           if (this.editingChapter.isNew) {
             if (this.insertIndex !== null) chapterData.insertIndex = this.insertIndex
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
        }
        
        this.showToastMessage('保存章节成功')
        this.showChapterModal = false
        this.fetchLevels()
      } catch (e) {
        this.showToastMessage('保存章节失败: ' + e.message)
      }
    },
    async deleteChapter(levelId, topicId, chapterId) {
      if (!confirm('确定要删除这个章节吗？')) return
      try {
        if (topicId) {
           await request(`/api/course/levels/${levelId}/topics/${topicId}/chapters/${chapterId}`, { method: 'DELETE' })
        } else {
           await request(`/api/course/levels/${levelId}/chapters/${chapterId}`, { method: 'DELETE' })
        }
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
    },
    renderMarkdown(text) {
      if (!text) return ''
      return marked(text)
    }
  }
}
</script>

<style scoped>
.admin-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Tabs */
.admin-tabs {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0;
}
.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: #7f8c8d;
  transition: all 0.3s ease;
  margin-bottom: -2px;
}
.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}
.tab-btn:hover:not(.active) {
  color: #34495e;
}

/* Course Management */
.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}
.subject-selector {
  display: flex;
  gap: 10px;
}
.btn-subject {
  padding: 8px 16px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: all 0.2s;
}
.btn-subject.active {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}
.btn-subject:hover:not(.active) {
  background-color: #e0e0e0;
}

.btn-add {
  padding: 10px 20px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(46, 204, 113, 0.2);
  transition: all 0.2s;
}
.btn-add:hover {
  background-color: #27ae60;
  transform: translateY(-1px);
}

.btn-insert {
  background-color: #9b59b6;
  color: white;
}
.btn-insert:hover {
  background-color: #8e44ad;
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 25px;
}
.level-item {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  transition: box-shadow 0.3s;
}
.level-item:hover {
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
}
.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f5f5;
}
.level-title {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
}
.level-desc {
  color: #7f8c8d;
  margin-bottom: 20px;
  font-size: 15px;
  line-height: 1.5;
}
.level-actions, .chapter-actions {
  display: flex;
  gap: 10px;
}

.chapter-list {
  margin-left: 15px;
  padding-left: 20px;
  border-left: 3px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.chapter-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #eee;
}
.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chapter-title {
  font-weight: 600;
  color: #34495e;
  font-size: 16px;
}
.chapter-problems {
  font-size: 13px;
  color: #95a5a6;
  margin-top: 8px;
  background: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  display: inline-block;
  border: 1px solid #eee;
}
.no-chapters {
  color: #bdc3c7;
  font-style: italic;
  padding: 10px;
}

.btn-add-sub {
  background-color: #3498db;
  color: white;
}
.btn-add-sub:hover { background-color: #2980b9; }
.btn-edit {
  background-color: #f39c12;
  color: white;
}
.btn-edit:hover { background-color: #d35400; }
.btn-delete {
  background-color: #e74c3c;
  color: white;
}
.btn-delete:hover { background-color: #c0392b; }

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 22px;
}
.modal-content.large-modal {
  width: 800px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.btn-save {
  padding: 10px 24px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}
.btn-save:hover {
  background-color: #2980b9;
}
.btn-cancel {
  padding: 10px 24px;
  background-color: #ecf0f1;
  color: #7f8c8d;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}
.btn-cancel:hover {
  background-color: #bdc3c7;
  color: #2c3e50;
}

/* Existing Styles */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #eee;
}
.search-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}
.search-input:focus {
  border-color: #3498db;
  outline: none;
}
.btn-search {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.btn-search:hover {
  background-color: #2980b9;
}
.btn-filter {
  padding: 10px 20px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}
.btn-filter:hover {
  background-color: #f5f5f5;
  border-color: #ccc;
}
.btn-filter.active {
  background-color: #f1c40f;
  color: #333;
  border-color: #f39c12;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(241, 196, 15, 0.2);
}
.user-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 20px;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}
.user-table th, .user-table td {
  padding: 15px 20px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}
.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}
.user-table tr:last-child td {
  border-bottom: none;
}
.user-table tr:hover td {
  background-color: #fcfcfc;
}
.role-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.role-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.role-badge.admin { background-color: #e74c3c; color: white; }
.role-badge.premium { background-color: #f1c40f; color: #333; }
.role-badge.teacher { background-color: #8e44ad; color: white; }
.role-badge.user { background-color: #ecf0f1; color: #7f8c8d; }

.badge-optional {
  display: inline-block;
  background-color: #9b59b6;
  color: white;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  margin-left: 10px;
  vertical-align: middle;
  font-weight: normal;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-small {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-premium { background-color: #f1c40f; color: #333; }
.btn-premium:hover { background-color: #f39c12; transform: translateY(-1px); }
.btn-teacher { background-color: #8e44ad; color: white; }
.btn-teacher:hover { background-color: #9b59b6; transform: translateY(-1px); }
.btn-user { background-color: #ecf0f1; color: #7f8c8d; }
.btn-user:hover { background-color: #bdc3c7; color: #2c3e50; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}
.btn-page {
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}
.btn-page:disabled {
  background-color: #f9f9f9;
  color: #ccc;
  cursor: not-allowed;
  border-color: #eee;
}
.btn-page:not(:disabled):hover {
  background-color: #f0f0f0;
  border-color: #ccc;
  color: #333;
}
.page-info {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.system-tools {
  margin-top: 50px;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #eee;
}
.system-tools h3 {
  margin-top: 0;
  color: #2c3e50;
  font-size: 18px;
  margin-bottom: 20px;
}
.tool-group {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}
.markdown-content {
  line-height: 1.6;
  color: #2c3e50;
}
.markdown-content p {
  margin-bottom: 10px;
}
.markdown-content ul, .markdown-content ol {
  padding-left: 20px;
  margin-bottom: 10px;
}
.btn-tool {
  padding: 12px 24px;
  background-color: #34495e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(52, 73, 94, 0.2);
}
.btn-tool:hover {
  background-color: #2c3e50;
  transform: translateY(-1px);
}
.btn-tool:hover {
  background-color: #34495e;
}

/* Topic Styles */
.topic-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.topic-item {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.topic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}
.topic-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}
.topic-desc {
  color: #7f8c8d;
  margin-bottom: 15px;
  font-size: 14px;
}
.topic-actions {
  display: flex;
  gap: 8px;
}
.btn-add-topic {
  align-self: flex-start;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 10px;
  transition: background 0.2s;
}
.btn-add-topic:hover {
  background-color: #2980b9;
}
</style>
