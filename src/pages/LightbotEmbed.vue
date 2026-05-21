<template>
  <div class="lightbot-embed-page">
    <div v-if="!loaded" class="lightbot-embed-loading">
      <div class="spinner"></div>
      <p>正在加载新的 Lightbot…</p>
    </div>
    <iframe
      class="lightbot-embed-frame"
      :class="{ ready: loaded }"
      src="/lightbot-app/index.html"
      title="Lightbot"
      allow="clipboard-read; clipboard-write"
      @load="handleLoad"
    ></iframe>
  </div>
</template>

<script>
export default {
  name: 'LightbotEmbed',
  data() {
    return {
      loaded: false,
    }
  },
  methods: {
    handleLoad() {
      this.loaded = true
    },
  },
}
</script>

<style scoped>
.lightbot-embed-page {
  position: fixed;
  inset: 0;
  background: #0c1222;
}

.lightbot-embed-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  opacity: 0;
  transition: opacity 0.25s ease;
  background: #0c1222;
}

.lightbot-embed-frame.ready {
  opacity: 1;
}

.lightbot-embed-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #e8eefc;
  z-index: 1;
  pointer-events: none;
}

.lightbot-embed-loading p {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.spinner {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #8fd3ff;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>