<template>
  <div id="app">
    <header class="header">
      <div class="branding">
        <img src="https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/images/202403271535417.png" alt="Logo" class="app-logo" />
        <h1>Acjudge Tools</h1>
      </div>
      <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/translate">Translate</router-link>
        <router-link to="/checker">Checker</router-link>
        <router-link to="/solution">Solution</router-link>
        <router-link to="/solvedata">Solve+Data</router-link>
        <router-link to="/chat">Chat</router-link>
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
export default {
  data() {
    return {
      toast: {
        show: false,
        message: ''
      }
    }
  },
  provide() {
    return {
      showToastMessage: this.showToastMessage
    }
  },
  methods: {
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
.branding { display: flex; align-items: center; gap: 12px; }
.app-logo { height: 32px; width: auto; border-radius: 6px; background: white; padding: 2px; }
.header h1 { margin: 0; font-size: 20px; }
.header nav a { color: rgba(255,255,255,0.8); margin-left:12px; text-decoration:none; transition: color 0.2s; }
.header nav a:hover { color: white; }
.header nav a.router-link-active { color: white; font-weight: bold; border-bottom: 2px solid white; padding-bottom: 2px; }
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
