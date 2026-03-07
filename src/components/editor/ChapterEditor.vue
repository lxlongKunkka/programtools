<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ chapter.isNew ? '鏂板缓绔犺妭' : '缂栬緫绔犺妭' }}</h2>
    </div>

    <!-- AI Assistant Section -->
    <div class="ai-assistant-box">
      <div class="ai-header">
        <h3>馃 AI 澶囪鍔╂墜</h3>
        <div v-if="aiLoading" class="status-container">
          <span class="ai-status">{{ aiStatus }}</span>
          <button @click="onResetAi" class="btn-reset" title="濡傛灉闀挎椂闂存湭鍝嶅簲锛岀偣鍑婚噸缃姸鎬?&gt;閲嶇疆鐘舵€?/button>
        </div>
      </div>
      <div class="ai-controls" :class="{ disabled: aiLoading }">
        <input v-model="localAiRequirements" placeholder="杈撳叆棰濆瑕佹眰 (渚嬪: 澶氫竴浜涚敓娲讳緥瀛? 渚ч噸C++璇硶...)" class="form-input ai-input">
        <div class="ai-buttons">
          <button @click="onGenerateLessonPlan"    class="btn-ai"          :disabled="aiLoading">馃摑 鐢熸垚鏁欐</button>
          <button @click="onGeneratePpt"           class="btn-ai"          :disabled="aiLoading">馃搳 鐢熸垚 PPT</button>
          <button @click="onGenerateSolutionPlan"  class="btn-ai btn-ai-blue" :disabled="aiLoading">馃摌 鐢熸垚棰樿В鏁欐</button>
          <button @click="onGenerateSolutionReport" class="btn-ai"         :disabled="aiLoading">馃挕 鐢熸垚棰樿ВPPT</button>
        </div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group half">
        <label>Chapter ID:</label>
        <input v-model="chapter.id" class="form-input disabled" disabled>
      </div>
      <div class="form-group half">
        <label>鏍囬:</label>
        <input v-model="chapter.title" class="form-input">
      </div>
    </div>

    <div class="form-group">
      <label>鍐呭绫诲瀷:</label>
      <select v-model="chapter.contentType" class="form-input">
        <option value="markdown">Markdown 鏂囨湰</option>
        <option value="html">HTML 璇句欢 (Iframe)</option>
      </select>
    </div>

    <div class="form-group">
      <div class="label-row">
        <label>鍐呭 ({{ chapter.contentType === 'html' ? 'HTML URL' : 'Markdown' }}):</label>
        <div v-if="chapter.contentType === 'html'" style="display: inline-block;">
          <button v-if="isAdmin" @click="handleOpenInNewWindow" class="btn-small btn-preview"
                  style="margin-right: 8px;" type="button">鏂扮獥鍙ｆ墦寮€</button>
          <button @click="showPreview = !showPreview" class="btn-small btn-preview" type="button">
            {{ showPreview ? '鍏抽棴棰勮' : '寮€鍚瑙? }}
          </button>
        </div>
      </div>

      <!-- Markdown Mode -->
      <div v-if="chapter.contentType === 'markdown'" class="split-view" style="height: 700px;">
        <textarea v-model="chapter.content" class="form-input code-font" style="height: 100%;"
                  placeholder="鍦ㄦ杈撳叆鏁欐/澶х翰鍐呭..."></textarea>
        <div class="preview-box" style="height: 100%;">
          <MarkdownViewer :content="chapter.content" />
        </div>
      </div>

      <!-- HTML Mode -->
      <div v-if="chapter.contentType === 'html'">
        <div style="margin: 10px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
          <strong>PPT 璇句欢宸茬敓鎴?/strong>
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
      <label>鍏宠仈蹇呭仛棰樼洰 ID (閫楀彿鍒嗛殧):</label>
      <input v-model="chapter.problemIdsStr" class="form-input" placeholder="渚嬪: system:1001, 1002">
      <div v-if="problemLinks && problemLinks.length > 0" class="problem-links-preview">
        <a v-for="(link, idx) in problemLinks" :key="idx" :href="link.url" target="_blank" class="problem-link-tag">
          {{ link.text }} 鈫?        </a>
      </div>
    </div>

    <div class="form-group">
      <label>鍏宠仈閫夊仛棰樼洰 ID (閫楀彿鍒嗛殧):</label>
      <input v-model="chapter.optionalProblemIdsStr" class="form-input" placeholder="渚嬪: system:1003, 1004">
      <div v-if="optionalProblemLinks && optionalProblemLinks.length > 0" class="problem-links-preview">
        <a v-for="(link, idx) in optionalProblemLinks" :key="idx" :href="link.url" target="_blank"
           class="problem-link-tag"
           style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;">
          {{ link.text }} 鈫?        </a>
      </div>
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input type="checkbox" v-model="chapter.optional"> 閫夊仛绔犺妭 (Optional)
      </label>
      <span class="hint">閫夊仛绔犺妭涓嶄細闃诲鍚庣画绔犺妭鐨勮В閿併€?/span>
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
        this.showToastMessage('鏃犳晥鐨勯摼鎺?)
      }
    }
  }
}
</script>

<style>
@import '../../styles/editor-common.css';
</style>
