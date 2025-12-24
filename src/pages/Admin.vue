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
                  <span v-if="u.role === 'admin'" class="role-badge admin">ADMIN</span>
                  <span v-if="u.role === 'teacher'" class="role-badge teacher">TEACHER</span>
                  <span v-if="u.role === 'premium'" class="role-badge premium">PREMIUM</span>
                  <span v-if="u.role === 'user' || !u.role" class="role-badge user">USER</span>
                </div>
              </td>
              <td>{{ u.priv }}</td>
              <td>
                <div class="actions">
                  <select 
                    v-if="u.role !== 'admin'" 
                    :value="getDisplayRole(u)" 
                    @change="handleRoleChange(u, $event.target.value)"
                    class="role-select"
                  >
                    <option value="user">普通用户</option>
                    <option value="premium">高级用户</option>
                    <option value="teacher">教师</option>
                  </select>
                  <span v-else class="admin-label">管理员</span>
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
          <button @click="$router.push('/design')" class="btn-tool">课程设计 (Design)</button>
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
      
      isInitialLoad: true
    }
  },
  computed: {
    isAdmin() {
      return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.priv === -1)
    }
  },
  beforeRouteLeave(to, from, next) {
    localStorage.setItem('admin_page_scroll_position', window.scrollY)
    next()
  },
  mounted() {
    const userStr = localStorage.getItem('user_info')
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr)
      } catch (e) {}
    }

    this.fetchUsers()
  },
  methods: {
    restoreScrollPosition() {
      const savedScroll = localStorage.getItem('admin_page_scroll_position')
      if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll))
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
        if (this.isInitialLoad) {
          this.$nextTick(() => {
            this.restoreScrollPosition()
            this.isInitialLoad = false
          })
        }
      }
    },
    getDisplayRole(user) {
      return user.role || 'user'
    },
    getRoleName(role) {
      const map = {
        'user': '普通用户',
        'premium': '高级用户',
        'teacher': '教师',
        'admin': '管理员'
      }
      return map[role] || role
    },
    async handleRoleChange(user, newRole) {
      try {
        await request(`/api/admin/users/${user._id}/role`, {
          method: 'POST',
          body: JSON.stringify({ role: newRole })
        })
        this.showToastMessage(`已将用户 ${user.uname} 设置为 ${this.getRoleName(newRole)}`)
        user.role = newRole
      } catch (e) {
        this.showToastMessage('设置失败: ' + e.message)
        this.fetchUsers()
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

.badge-type {
  display: inline-block;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  margin-left: 8px;
  vertical-align: middle;
  font-weight: bold;
  text-decoration: none; /* Ensure links don't have underline */
}
.badge-type:hover {
  opacity: 0.9;
}
.badge-type.html {
  background-color: #e67e22;
  color: white;
}
.badge-type.markdown {
  background-color: #3498db;
  color: white;
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
.markdown-content :deep(p) {
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

</style>
