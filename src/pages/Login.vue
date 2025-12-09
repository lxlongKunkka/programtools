<template>
  <div class="login-container">
    <div class="login-box">
      <h2>登录</h2>
      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="请输入用户名" @keyup.enter="handleLogin" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin" />
      </div>
      <button @click="handleLogin" :disabled="loading" class="btn-primary full-width">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import request from '../utils/request'

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: ''
    }
  },
  inject: ['showToastMessage'],
  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        this.error = '请输入用户名和密码'
        return
      }
      this.loading = true
      this.error = ''
      
      try {
        const data = await request('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            username: this.username,
            password: this.password
          })
        })

        if (data.token) {
          localStorage.setItem('auth_token', data.token)
          localStorage.setItem('user_info', JSON.stringify(data.user))
          window.dispatchEvent(new Event('login-success'))
          this.showToastMessage('登录成功')
          this.$router.push('/')
        } else {
          this.error = data.error || '登录失败'
        }
      } catch (e) {
        this.error = e.message || '登录请求失败'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
}
.login-box {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}
.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}
.full-width {
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  font-size: 16px;
}
.error-msg {
  color: #ff4d4f;
  margin-top: 12px;
  text-align: center;
}
</style>
