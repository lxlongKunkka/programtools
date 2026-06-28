<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ topic._id ? '编辑知识点' : '新建知识点' }}</h2>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>标题:</label>
        <input v-model="topic.title" class="form-input">
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="topic.visible" 
            :true-value="true" 
            :false-value="false"
            class="form-checkbox"
          />
          <span class="checkbox-text">对学员可见</span>
          <span class="hint-inline">取消勾选后，学员将无法看到此专题</span>
        </label>
      </div>
    </div>

    <!-- AI Assistant Section -->
    <div class="ai-assistant-box">
      <div class="ai-header">
        <h3>🤖 AI 章节规划</h3>
        <div v-if="aiLoading" class="status-container">
          <span class="ai-status">{{ aiStatus }}</span>
          <button @click="onResetAi" class="btn-reset" title="如果长时间未响应，点击重置状态">重置状态</button>
        </div>
      </div>
      <div class="ai-controls" :class="{ disabled: aiLoading }">
        <button @click="onGenerateDesc"         class="btn-ai"            :disabled="aiLoading">📝 自动生成描述</button>
        <button @click="onGenerateChapters"     class="btn-ai"            :disabled="aiLoading">📑 自动生成章节列表</button>
        <button @click="onBatchLessonPlans"     class="btn-ai btn-ai-purple" :disabled="aiLoading">📚 一键生成所有教案</button>
        <button @click="onBatchPpts"            class="btn-ai btn-ai-pink"   :disabled="aiLoading">📊 一键生成所有PPT</button>
        <button @click="onBatchSolutionPlans"   class="btn-ai btn-ai-blue"   :disabled="aiLoading">📘 一键生成所有题解教案</button>
        <button @click="onBatchSolutionReports" class="btn-ai btn-ai-green"  :disabled="aiLoading">💡 一键生成所有题解PPT</button>
        <button @click="onExportAllReviews"     class="btn-ai btn-ai-orange" :disabled="exporting">📦 导出所有复习内容</button>
      </div>
    </div>

    <div class="form-group">
      <label>描述 (Markdown):</label>
      <div class="split-view">
        <textarea v-model="topic.description" class="form-input" rows="10"></textarea>
        <div class="preview-box">
          <MarkdownViewer :content="topic.description" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MarkdownViewer from '../MarkdownViewer.vue'

export default {
  name: 'TopicEditor',
  components: { MarkdownViewer },
  props: {
    topic:                  { type: Object,   required: true },
    aiLoading:              { type: Boolean,  default: false },
    aiStatus:               { type: String,   default: '' },
    exporting:              { type: Boolean,  default: false },
    onResetAi:              { type: Function, default: () => {} },
    onGenerateDesc:         { type: Function, default: () => {} },
    onGenerateChapters:     { type: Function, default: () => {} },
    onBatchLessonPlans:     { type: Function, default: () => {} },
    onBatchPpts:            { type: Function, default: () => {} },
    onBatchSolutionPlans:   { type: Function, default: () => {} },
    onBatchSolutionReports: { type: Function, default: () => {} },
    onExportAllReviews:     { type: Function, default: () => {} }
  }
}
</script>

<style>
@import '../../styles/editor-common.css';
</style>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 8px;
  padding: 8px 0;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6366f1;
}

.checkbox-text {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.hint-inline {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 4px;
}

.form-group .checkbox-label {
  padding-top: 0;
}
</style>
