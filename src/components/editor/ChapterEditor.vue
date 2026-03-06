<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ chapter.isNew ? '新建章节' : '编辑章节' }}</h2>
    </div>

    <!-- AI Assistant Section -->
    <div class="ai-assistant-box">
      <div class="ai-header">
        <h3>🤖 AI 备课助手</h3>
        <div v-if="aiLoading" class="status-container">
          <span class="ai-status">{{ aiStatus }}</span>
          <button @click="onResetAi" class="btn-reset" title="如果长时间未响应，点击重置状态">重置状态</button>
        </div>
      </div>
      <div class="ai-controls" :class="{ disabled: aiLoading }">
        <input v-model="localAiRequirements" placeholder="输入额外要求 (例如: 多一些生活例子, 侧重C++语法...)" class="form-input ai-input">
        <div class="ai-buttons">
          <button @click="onGenerateLessonPlan"    class="btn-ai"          :disabled="aiLoading">📝 生成教案</button>
          <button @click="onGeneratePpt"           class="btn-ai"          :disabled="aiLoading">📊 生成 PPT</button>
          <button @click="onGenerateSolutionPlan"  class="btn-ai btn-ai-blue" :disabled="aiLoading">📘 生成题解教案</button>
          <button @click="onGenerateSolutionReport" class="btn-ai"         :disabled="aiLoading">💡 生成题解PPT</button>
        </div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group half">
        <label>Chapter ID:</label>
        <input v-model="chapter.id" class="form-input disabled" disabled>
      </div>
      <div class="form-group half">
        <label>标题:</label>
        <input v-model="chapter.title" class="form-input">
      </div>
    </div>

    <div class="form-group">
      <label>内容类型:</label>
      <select v-model="chapter.contentType" class="form-input">
        <option value="markdown">Markdown 文本</option>
        <option value="html">HTML 课件 (Iframe)</option>
      </select>
    </div>

    <div class="form-group">
      <div class="label-row">
        <label>内容 ({{ chapter.contentType === 'html' ? 'HTML URL' : 'Markdown' }}):</label>
        <div v-if="chapter.contentType === 'html'" style="display: inline-block;">
          <button v-if="isAdmin" @click="handleOpenInNewWindow" class="btn-small btn-preview"
                  style="margin-right: 8px;" type="button">新窗口打开</button>
          <button @click="showPreview = !showPreview" class="btn-small btn-preview" type="button">
            {{ showPreview ? '关闭预览' : '开启预览' }}
          </button>
        </div>
      </div>

      <!-- Markdown Mode -->
      <div v-if="chapter.contentType === 'markdown'" class="split-view" style="height: 700px;">
        <textarea v-model="chapter.content" class="form-input code-font" style="height: 100%;"
                  placeholder="在此输入教案/大纲内容..."></textarea>
        <div class="preview-box" style="height: 100%;">
          <MarkdownViewer :content="chapter.content" />
        </div>
      </div>

      <!-- HTML Mode -->
      <div v-if="chapter.contentType === 'html'">
        <div style="margin: 10px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
          <strong>PPT 课件已生成</strong>
          <div v-if="!showPreview" style="margin-top: 8px;">
            <input v-model="chapter.resourceUrl" class="form-input" placeholder="/public/courseware/bfs.html">
          </div>
        </div>
        <div v-if="showPreview" class="preview-container-large">
          <iframe :src="getPreviewUrl(chapter.resourceUrl)" class="preview-iframe"></iframe>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>关联必做题目 ID (逗号分隔):</label>
      <input v-model="chapter.problemIdsStr" class="form-input" placeholder="例如: system:1001, 1002">
      <div v-if="problemLinks && problemLinks.length > 0" class="problem-links-preview">
        <a v-for="(link, idx) in problemLinks" :key="idx" :href="link.url" target="_blank" class="problem-link-tag">
          {{ link.text }} ↗
        </a>
      </div>
    </div>

    <div class="form-group">
      <label>关联选做题目 ID (逗号分隔):</label>
      <input v-model="chapter.optionalProblemIdsStr" class="form-input" placeholder="例如: system:1003, 1004">
      <div v-if="optionalProblemLinks && optionalProblemLinks.length > 0" class="problem-links-preview">
        <a v-for="(link, idx) in optionalProblemLinks" :key="idx" :href="link.url" target="_blank"
           class="problem-link-tag"
           style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;">
          {{ link.text }} ↗
        </a>
      </div>
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input type="checkbox" v-model="chapter.optional"> 选做章节 (Optional)
      </label>
      <span class="hint">选做章节不会阻塞后续章节的解锁。</span>
    </div>
  </div>
</template>

<script>
import MarkdownViewer from '../MarkdownViewer.vue'

export default {
  name: 'ChapterEditor',
  components: { MarkdownViewer },
  inject: ['showToastMessage'],
  props: {
    chapter:                  { type: Object,   required: true },
    isAdmin:                  { type: Boolean,  default: false },
    aiLoading:                { type: Boolean,  default: false },
    aiStatus:                 { type: String,   default: '' },
    aiRequirements:           { type: String,   default: '' },
    problemLinks:             { type: Array,    default: () => [] },
    optionalProblemLinks:     { type: Array,    default: () => [] },
    onResetAi:                { type: Function, default: () => {} },
    onGenerateLessonPlan:     { type: Function, default: () => {} },
    onGeneratePpt:            { type: Function, default: () => {} },
    onGenerateSolutionPlan:   { type: Function, default: () => {} },
    onGenerateSolutionReport: { type: Function, default: () => {} }
  },
  emits: ['update:aiRequirements'],
  data() {
    return {
      showPreview: false
    }
  },
  computed: {
    localAiRequirements: {
      get() { return this.aiRequirements },
      set(v) { this.$emit('update:aiRequirements', v) }
    }
  },
  watch: {
    // Reset preview when switching to a different chapter
    'chapter.id'() { this.showPreview = false },
    'chapter._id'() { this.showPreview = false }
  },
  methods: {
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
    },
    handleOpenInNewWindow() {
      const url = this.getPreviewUrl(this.chapter.resourceUrl)
      if (url) {
        window.open(url, '_blank')
      } else {
        this.showToastMessage('无效的链接')
      }
    }
  }
}
</script>
