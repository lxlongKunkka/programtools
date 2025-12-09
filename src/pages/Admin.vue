<template>
  <div class="admin-container">
    <h2>用户管理</h2>
    
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
                <button v-if="u.role !== 'premium' && u.role !== 'admin'" @click="setRole(u, 'premium')" class="btn-small btn-premium">设为高级用户</button>
                <button v-if="u.role === 'premium'" @click="setRole(u, 'user')" class="btn-small btn-user">取消高级用户</button>
                <!-- Admin role is usually managed by priv, but we can allow setting it here too if needed -->
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
      users: [],
      loading: false,
      searchQuery: '',
      filterRole: '', // '' or 'premium'
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    }
  },
  mounted() {
    this.fetchUsers()
  },
  methods: {
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
          // Fallback for old API
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
        user.role = role // Optimistic update
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
.role-badge.user { background-color: #95a5a6; color: white; }

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
