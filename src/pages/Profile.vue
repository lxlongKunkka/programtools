<template>
  <div class="profile-page">
    <div class="profile-card">
      <h2>个人信息</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="info-list">
        <div class="info-item">
          <label>用户名:</label>
          <span>{{ userInfo.username }}</span>
        </div>
        <div class="info-item">
          <label>角色:</label>
          <span :class="['role-badge', userInfo.role]">{{ userInfo.role }}</span>
        </div>
        <div class="info-item">
          <label>权限值 (Priv):</label>
          <span>{{ userInfo.priv }}</span>
        </div>
        <div class="info-item">
          <label>ID:</label>
          <span class="id-text">{{ userInfo.id || userInfo._id }}</span>
        </div>
      </div>
      
      <div class="actions">
        <button @click="fetchUserInfo" class="btn-refresh">刷新信息</button>
        <button @click="logout" class="btn-logout">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {},
      loading: false,
      error: ''
    }
  },
  mounted() {
    this.fetchUserInfo()
  },
  methods: {
    async fetchUserInfo() {
      this.loading = true
      this.error = ''
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          throw new Error('未登录')
        }
        
        const res = await fetch('/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            this.logout()
            return
          }
          throw new Error('获取用户信息失败')
        }
        
        this.userInfo = await res.json()
        // 更新本地存储的简略信息
        localStorage.setItem('user_info', JSON.stringify({
          username: this.userInfo.username,
          role: this.userInfo.role,
          priv: this.userInfo.priv
        }))
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },
    logout() {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      // 触发全局事件通知 App.vue 更新状态
      window.dispatchEvent(new Event('storage'))
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 40px auto;
  padding: 0 20px;
}

.profile-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  padding: 30px;
}

h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-item label {
  width: 120px;
  color: #666;
  font-weight: bold;
}

.info-item span {
  color: #333;
  font-size: 16px;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px !important;
  font-weight: bold;
}

.role-badge.admin {
  background-color: #e6f7ff;
  color: #1890ff !important;
  border: 1px solid #91d5ff;
}

.role-badge.user {
  background-color: #f6ffed;
  color: #52c41a !important;
  border: 1px solid #b7eb8f;
}

.id-text {
  font-family: monospace;
  color: #888 !important;
}

.actions {
  margin-top: 30px;
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

button {
  padding: 8px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-refresh {
  background-color: #f0f0f0;
  color: #333;
}

.btn-refresh:hover {
  background-color: #e0e0e0;
}

.btn-logout {
  background-color: #ff4d4f;
  color: white;
}

.btn-logout:hover {
  background-color: #ff7875;
}

.loading {
  text-align: center;
  color: #999;
  padding: 20px;
}

.error {
  color: #ff4d4f;
  padding: 20px;
  text-align: center;
  background: #fff1f0;
  border-radius: 4px;
}
</style>
