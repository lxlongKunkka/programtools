<template>
  <div id="app">
    <header class="header">
      <div class="branding">
        <router-link to="/" class="branding-link">
          <img src="https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/images/202403271535417.png" alt="Logo" class="app-logo" />
          <h1>Acjudge Tools</h1>
        </router-link>
      </div>
      <nav>
        <router-link to="/translate">Translate</router-link>
        <router-link to="/typing">Typing</router-link>
        <router-link v-if="user" to="/checker">Checker</router-link>
        <router-link v-if="user" to="/solution">Solution</router-link>
        <router-link v-if="isPremium" to="/solvedata">Data</router-link>
        <router-link v-if="isPremium" to="/chat">Chat</router-link>
        <router-link v-if="isAdmin" to="/admin">Admin</router-link>
        <div v-if="user" class="user-menu">
          <router-link to="/profile" class="username-link">{{ user.username }}</router-link>
          <button @click="logout" class="btn-logout">退出</button>
        </div>
        <router-link v-else to="/login">登录</router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>

    <!-- 全局 Toast -->
    <div v-if="toast.show" class="global-toast">
      <span v-html="toast.message"></span>
    </div>
  </div>
</template>

<script>
import { clearModelCache } from './utils/models'

export default {
  data() {
    return {
      user: null,
      toast: {
        show: false,
        message: ''
      }
    }
  },
  mounted() {
    this.checkLogin()
    window.addEventListener('storage', this.checkLogin)
    // Custom event for login update within the same tab
    window.addEventListener('login-success', this.checkLogin)
  },
  unmounted() {
    window.removeEventListener('storage', this.checkLogin)
    window.removeEventListener('login-success', this.checkLogin)
  },
  provide() {
    return {
      showToastMessage: this.showToastMessage
    }
  },
  computed: {
    isPremium() {
      return this.user && (this.user.role === 'admin' || this.user.role === 'premium' || this.user.priv === -1)
    },
    isAdmin() {
      return this.user && (this.user.role === 'admin' || this.user.priv === -1)
    }
  },
  methods: {
    checkLogin() {
      clearModelCache()
      const u = localStorage.getItem('user_info')
      if (u) {
        try {
          this.user = JSON.parse(u)
        } catch (e) {
          this.user = null
        }
      } else {
        this.user = null
      }
    },
    logout() {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      this.user = null
      clearModelCache()
      this.showToastMessage('已退出登录')
      this.$router.push('/login')
    },
    showToastMessage(message) {
      this.toast.message = message
      this.toast.show = true
      setTimeout(() => {
        this.toast.show = false
      }, 2500)
    }
  }
}
</script>

<style>
body { font-family: Arial, Helvetica, sans-serif; margin: 0; }
.header { background: #2b9af3; color: white; padding: 12px 18px; display:flex; align-items:center; justify-content:space-between }
.branding { display: flex; align-items: center; }
.branding-link { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.app-logo { height: 32px; width: auto; border-radius: 6px; background: white; padding: 2px; }
.header h1 { margin: 0; font-size: 20px; }
.header nav { display: flex; align-items: center; }
.header nav a { color: rgba(255,255,255,0.8); margin-left:12px; text-decoration:none; transition: color 0.2s; white-space: nowrap; }
.header nav a:hover { color: white; }
.header nav a.router-link-active { color: white; font-weight: bold; border-bottom: 2px solid white; padding-bottom: 2px; }
.user-menu { display: flex; align-items: center; gap: 10px; margin-left: 12px; color: white; }
.username-link { color: white !important; font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.6); padding-bottom: 1px; }
.username-link:hover { border-bottom-style: solid; }
.btn-logout { background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap; }
.btn-logout:hover { background: rgba(255,255,255,0.3); }
main { padding: 18px }

/* 全局 Toast 样式 */
.global-toast {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(40,40,40,0.97);
  color: #fff;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 17px;
  z-index: 9999;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  pointer-events: none;
  opacity: 0.98;
  transition: opacity 0.3s;
}
</style>
