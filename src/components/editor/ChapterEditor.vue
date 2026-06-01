<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ chapter.isNew ? '新建章节' : '编辑章节' }}</h2>
    </div>

    <!-- Basic Info (always visible) -->
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

    <!-- Editor Tab Navigation -->
    <div class="editor-tabs">
      <button :class="['editor-tab', { active: activeTab === 'preview' }]" @click="activeTab = 'preview'" type="button">🔍 预习</button>
      <button :class="['editor-tab', { active: activeTab === 'markdown' }]" @click="activeTab = 'markdown'" type="button">📄 Markdown 教案</button>
      <button :class="['editor-tab', { active: activeTab === 'html' }]" @click="activeTab = 'html'" type="button">🖥 HTML 课件</button>
      <button :class="['editor-tab', { active: activeTab === 'ppt' }]" @click="activeTab = 'ppt'" type="button">📊 Office PPT</button>
      <button :class="['editor-tab', { active: activeTab === 'resources' }]" @click="activeTab = 'resources'" type="button">🔗 关联资源</button>
      <button :class="['editor-tab', { active: activeTab === 'review' }]" @click="activeTab = 'review'" type="button">📋 复习</button>
      <button :class="['editor-tab', { active: activeTab === 'video' }]" @click="activeTab = 'video'" type="button">🎬 视频</button>
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
          <button @click="onGenerateLessonPlan"    class="btn-ai btn-ai-triple" :disabled="aiLoading">✨ 生成全部 (预习/教案/复习)</button>
          <button @click="onGeneratePpt"           class="btn-ai"          :disabled="aiLoading">📊 生成 PPT</button>
          <button @click="onGenerateSolutionPlan"  class="btn-ai btn-ai-blue" :disabled="aiLoading">📘 生成题解教案</button>
          <button @click="onGenerateSolutionReport" class="btn-ai"         :disabled="aiLoading">💡 生成题解PPT</button>
        </div>
      </div>
    </div>

    <!-- Markdown Tab -->
    <div v-show="activeTab === 'markdown'">
    <div class="split-view" style="height: 700px;">
      <textarea v-model="chapter.content" class="form-input code-font" style="height: 100%;"
                placeholder="在此输入教案/大纲内容..."></textarea>
      <div class="preview-box" style="height: 100%;">
        <MarkdownViewer :content="chapter.content" />
      </div>
    </div>
    </div><!-- end markdown tab -->

    <!-- Video Tab -->
    <div v-show="activeTab === 'video'">
    <div class="form-group">
      <label>视频链接 (可选，每行一个):</label>
      <textarea v-model="chapter.videoUrl" class="form-input" rows="5"
        placeholder="每行一个视频资源，支持 Bilibili 链接 / 纯 BV 号 / 直链视频（.mp4）/ embed 地址 / 整段 iframe 代码"
        style="resize: vertical; font-family: monospace;"></textarea>
      <div style="margin-top: 8px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.6;">
        <div><strong>可选格式：</strong></div>
        <div>1. 直接填地址：https://example.com/embed/lesson-1</div>
        <div>2. 直接粘 iframe：支持整段多行 iframe，不必压成一行</div>
        <div>3. 自定义标题：第一课导学 | https://example.com/embed/lesson-1</div>
        <div>4. 自定义标题 + iframe：第一课导学 | &lt;iframe src="https://example.com/embed/lesson-1" ...&gt;&lt;/iframe&gt;</div>
      </div>
      <div v-if="chapter.videoUrl" style="margin-top: 6px; font-size: 12px; color: #64748b;">
        <div v-for="(entry, i) in videoEntriesPreview" :key="entry.raw + '-' + i">
          {{ getVideoTypeIcon(entry.raw) }} {{ getVideoDisplayTitle(entry, i) }}：{{ getVideoPreviewText(entry.raw) }}
        </div>
      </div>
    </div>
    </div><!-- end video tab -->

    <!-- HTML Tab -->
    <div v-show="activeTab === 'html'">
    <!-- Section 1: Local HTML courseware -->
    <div style="margin: 10px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
      <strong>HTML 课件路径：</strong>
      <div style="margin-top: 8px;">
        <input v-model="chapter.resourceUrl" class="form-input" placeholder="/public/courseware/bfs.html">
      </div>
    </div>
    <div class="label-row" style="margin-bottom: 8px;">
      <button v-if="isAdmin" @click="handleOpenInNewWindow" class="btn-small btn-preview"
              style="margin-right: 8px;" type="button">新窗口打开</button>
      <button @click="showPreview = !showPreview" class="btn-small btn-preview" type="button">
        {{ showPreview ? '关闭预览' : '开启预览' }}
      </button>
    </div>
    <div v-if="showPreview" class="preview-container-large">
      <iframe :src="getPreviewUrl(chapter.resourceUrl)" class="preview-iframe"></iframe>
    </div>

    </div><!-- end html tab -->

    <!-- Office PPT Tab -->
    <div v-show="activeTab === 'ppt'">
    <div style="padding: 12px; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px;">
      <div v-if="chapter.pptxUrl">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="font-size: 13px; color: #374151;">✅ 已上传：</span>
          <a :href="chapter.pptxUrl" target="_blank" style="font-size: 12px; color: #2563eb; word-break: break-all;">{{ chapter.pptxUrl }}</a>
          <button @click="togglePptxPreview" class="btn-small btn-preview" type="button">
            {{ showPptxPreview ? '关闭预览' : '在线预览 PPT' }}
          </button>
          <button @click="deletePpt" class="btn-small" style="background:#fee2e2; border:1px solid #fca5a5; color:#b91c1c;" :disabled="pptUploading" type="button">🗑 删除 PPT</button>
        </div>
        <div v-if="showPptxPreview" style="margin-top: 10px;">
          <iframe :src="`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(chapter.pptxUrl)}`"
                  style="width: 100%; height: 600px; border: 1px solid #e2e8f0; border-radius: 6px;"
                  allowfullscreen></iframe>
        </div>
      </div>
      <div v-else style="margin-bottom: 8px; color: #92400e; font-size: 13px;">尚未上传 Office PPT 文件</div>
      <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <input ref="pptFileInput" type="file" accept=".pptx,.ppt,.pptm" @change="onPptFileSelected" style="display:none">
        <button @click="$refs.pptFileInput.click()" class="btn-small btn-preview" :disabled="pptUploading" type="button">📂 选择文件</button>
        <span v-if="selectedPptFile" style="font-size: 13px; color: #374151;">{{ selectedPptFile.name }}</span>
        <button v-if="selectedPptFile" @click="uploadPpt" class="btn-small" style="background:#dcfce7; border:1px solid #86efac; color:#166534;" :disabled="pptUploading" type="button">
          {{ pptUploading ? '上传中...' : '⬆ 上传到 COS' }}
        </button>
      </div>
    </div>
    </div><!-- end ppt tab -->

    <div v-show="activeTab === 'resources'">
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

    <div class="form-group">
      <label>关联作业 (逗号分隔, 格式: domainId:contestId):</label>
      <input v-model="chapter.homeworkIdsStr" class="form-input" placeholder="例如: class1:hw1, class2:hw2">
      <div v-if="homeworkLinks && homeworkLinks.length > 0" class="problem-links-preview">
        <a v-for="(link, idx) in homeworkLinks" :key="idx" :href="link.url" target="_blank"
           class="problem-link-tag"
           style="background-color: #fffbeb; border: 1px solid #fde68a; color: #92400e;">
          {{ link.text }} ↗
        </a>
      </div>
    </div>

    <div class="form-group">
      <label>关联考试 (逗号分隔, 格式: domainId:contestId):</label>
      <input v-model="chapter.examIdsStr" class="form-input" placeholder="例如: class1:exam1, class2:exam2">
      <div v-if="examLinks && examLinks.length > 0" class="problem-links-preview">
        <a v-for="(link, idx) in examLinks" :key="idx" :href="link.url" target="_blank"
           class="problem-link-tag"
           style="background-color: #fdf2f8; border: 1px solid #f5d0fe; color: #701a75;">
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

    </div><!-- end resources tab -->

    <div v-show="activeTab === 'preview'">
    <div class="form-group preview-review-group">
      <div class="label-row">
        <label>🔍 预习内容 (AI生成，Markdown)：</label>
        <button @click="onGeneratePreviewContent" class="btn-small btn-ai-mini" :disabled="aiLoading" type="button">✨ 单独生成预习</button>
      </div>
      <div class="split-view" style="height: 400px;">
        <textarea v-model="chapter.previewContent" class="form-input code-font" style="height: 100%;"
                  placeholder="预习内容（AI生成后显示在此，也可手动编辑）..."></textarea>
        <div class="preview-box" style="height: 100%;">
          <MarkdownViewer :content="chapter.previewContent || ''" />
        </div>
      </div>
    </div>

    </div><!-- end preview tab -->

    <div v-show="activeTab === 'review'">
    <div class="form-group preview-review-group">
      <div class="label-row">
        <label>📋 复习总结 (AI生成，Markdown)：</label>
        <button @click="onGenerateReviewContent" class="btn-small btn-ai-mini" :disabled="aiLoading" type="button">✨ 单独生成复习</button>
      </div>
      <div class="split-view" style="height: 400px;">
        <textarea v-model="chapter.reviewContent" class="form-input code-font" style="height: 100%;"
                  placeholder="复习总结（AI生成后显示在此，也可手动编辑）..."></textarea>
        <div class="preview-box" style="height: 100%;">
          <MarkdownViewer :content="chapter.reviewContent || ''" />
        </div>
      </div>
    </div>
    </div><!-- end review tab -->
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
    homeworkLinks:            { type: Array,    default: () => [] },
    examLinks:                { type: Array,    default: () => [] },
    onResetAi:                { type: Function, default: () => {} },
    onGenerateLessonPlan:     { type: Function, default: () => {} },
    onGeneratePpt:            { type: Function, default: () => {} },
    onGenerateSolutionPlan:   { type: Function, default: () => {} },
    onGenerateSolutionReport: { type: Function, default: () => {} },
    onGeneratePreviewContent: { type: Function, default: () => {} },
    onGenerateReviewContent:  { type: Function, default: () => {} }
  },
  emits: ['update:aiRequirements'],
  data() {
    return {
      showPreview: false,
      showPptxPreview: false,
      activeTab: 'markdown',
      pptUploading: false,
      selectedPptFile: null
    }
  },
  computed: {
    localAiRequirements: {
      get() { return this.aiRequirements },
      set(v) { this.$emit('update:aiRequirements', v) }
    },
    videoEntriesPreview() {
      return this.parseVideoEntries(this.chapter?.videoUrl || '')
    }
  },
  watch: {
    // Reset preview when switching to a different chapter
    'chapter.id'() { this.showPreview = false; this.showPptxPreview = false; this.selectedPptFile = null; this.activeTab = 'markdown' },
    'chapter._id'() { this.showPreview = false; this.showPptxPreview = false; this.selectedPptFile = null; this.activeTab = 'markdown' }
  },
  methods: {
    parseVideoEntries(text) {
      const lines = (text || '').split('\n')
      const entries = []
      let iframeBuffer = []
      let inIframeBlock = false

      lines.forEach(line => {
        const trimmed = line.trim()

        if (!inIframeBlock) {
          if (!trimmed) return

          if (trimmed.includes('<iframe') && !trimmed.includes('</iframe>')) {
            iframeBuffer = [line]
            inIframeBlock = true
            return
          }

          entries.push(this.parseVideoEntry(trimmed))
          return
        }

        iframeBuffer.push(line)
        if (trimmed.includes('</iframe>')) {
          entries.push(this.parseVideoEntry(iframeBuffer.join('\n')))
          iframeBuffer = []
          inIframeBlock = false
        }
      })

      if (iframeBuffer.length > 0) {
        entries.push(this.parseVideoEntry(iframeBuffer.join('\n')))
      }

      return entries.filter(entry => entry.raw)
    },
    parseVideoEntry(url) {
      const rawLine = (url || '').trim()
      if (!rawLine) return { title: '', raw: '' }
      const separatorIndex = rawLine.indexOf(' | ')
      if (separatorIndex > 0) {
        return {
          title: rawLine.slice(0, separatorIndex).trim(),
          raw: rawLine.slice(separatorIndex + 3).trim()
        }
      }
      return { title: '', raw: rawLine }
    },
    getVideoDisplayTitle(entry, index) {
      if (!entry) return `视频${index + 1}`
      return entry.title || `视频${index + 1}`
    },
    extractIframeSrc(url) {
      if (!url) return ''
      const raw = url.trim()
      const match = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i)
      return match ? match[1].trim() : ''
    },
    isBilibili(url) {
      if (!url) return false
      const s = (this.extractIframeSrc(url) || url).trim()
      if (/^BV[a-zA-Z0-9]+$/.test(s)) return true
      return s.includes('bilibili.com') || s.includes('b23.tv')
    },
    isDirectVideo(url) {
      if (!url) return false
      const src = (this.extractIframeSrc(url) || url).trim()
      return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(src)
    },
    isIframeVideo(url) {
      if (!url) return false
      if (this.isBilibili(url)) return false
      if (this.extractIframeSrc(url)) return true
      return !this.isDirectVideo(url) && /^https?:\/\//i.test(url.trim())
    },
    getVideoTypeIcon(url) {
      if (this.isBilibili(url)) return '🎬'
      if (this.isIframeVideo(url)) return '🖼'
      return '🎥'
    },
    getVideoPreviewText(url) {
      const raw = (this.extractIframeSrc(url) || url || '').trim()
      return raw.length > 60 ? raw.slice(0, 60) + '…' : raw
    },
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
    },
    togglePptxPreview() {
      this.showPptxPreview = !this.showPptxPreview
    },
    onPptFileSelected(e) {
      this.selectedPptFile = e.target.files[0] || null
    },
    async uploadPpt() {
      if (!this.selectedPptFile) return
      const chapterId = this.chapter._id || this.chapter.id
      if (!chapterId) {
        this.showToastMessage('请先保存章节再上传 PPT')
        return
      }
      this.pptUploading = true
      try {
        const formData = new FormData()
        formData.append('file', this.selectedPptFile)
        formData.append('chapterId', String(chapterId))
        const token = localStorage.getItem('auth_token')
        const resp = await fetch('/api/course/upload-ppt', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || '上传失败')
        this.chapter.pptxUrl = data.url
        this.chapter.pptxCosKey = data.key
        this.selectedPptFile = null
        if (this.$refs.pptFileInput) this.$refs.pptFileInput.value = ''
        this.showToastMessage('PPT 上传成功！')
      } catch (e) {
        this.showToastMessage('PPT 上传失败：' + e.message)
      } finally {
        this.pptUploading = false
      }
    },
    async deletePpt() {
      if (!this.chapter.pptxCosKey && !this.chapter.pptxUrl) return
      if (!confirm('确定删除 COS 上的 PPT 文件？')) return
      this.pptUploading = true
      try {
        const token = localStorage.getItem('auth_token')
        const resp = await fetch('/api/course/delete-ppt', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: this.chapter.pptxCosKey })
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || '删除失败')
        this.chapter.pptxUrl = ''
        this.chapter.pptxCosKey = ''
        this.showPptxPreview = false
        this.showToastMessage('PPT 已删除')
      } catch (e) {
        this.showToastMessage('删除失败：' + e.message)
      } finally {
        this.pptUploading = false
      }
    }
  }
}
</script>

<style>
@import '../../styles/editor-common.css';

.btn-ai-triple {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  color: #fff !important;
  font-weight: 600;
}
.btn-ai-triple:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
}
.btn-ai-mini {
  padding: 4px 10px;
  font-size: 12px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
  border-radius: 6px;
  cursor: pointer;
}
.btn-ai-mini:hover:not(:disabled) {
  background: #dcfce7;
}
.preview-review-group {
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  padding: 12px;
  background: #f0f9ff;
}
.editor-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}
.editor-tab {
  padding: 8px 20px;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-right: 4px;
  position: relative;
  bottom: -2px;
  transition: background 0.15s, color 0.15s;
}
.editor-tab.active {
  background: #fff;
  color: #2563eb;
  border-color: #e2e8f0;
  border-bottom-color: #fff;
  z-index: 1;
}
.editor-tab:hover:not(.active) {
  background: #f1f5f9;
  color: #334155;
}
.content-type-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 8px;
  width: fit-content;
}
.content-type-tab {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.content-type-tab.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.content-type-tab:hover:not(.active) {
  background: #e2e8f0;
  color: #334155;
}
</style>
