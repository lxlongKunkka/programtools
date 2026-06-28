<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ level._id ? '编辑课程模块' : '新建课程模块' }}</h2>
    </div>

    <div class="form-group">
      <label>所属分组 (Tab):</label>
      <input v-model="level.group" class="form-input" disabled>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>标题 (Title):</label>
        <input v-model="level.title" class="form-input" placeholder="例如: 基础语法">
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="level.visible" 
            :true-value="true" 
            :false-value="false"
            class="form-checkbox"
          />
          <span class="checkbox-text">对学员可见</span>
          <span class="hint-inline">取消勾选后，学员将无法看到此模块</span>
        </label>
      </div>
    </div>

    <!-- AI Assistant Section -->
    <div class="ai-assistant-box">
      <div class="ai-header">
        <h3>🤖 AI 模块规划</h3>
        <div v-if="aiLoading" class="status-container">
          <span class="ai-status">{{ aiStatus }}</span>
          <button @click="onResetAi" class="btn-reset" title="如果长时间未响应，点击重置状态">重置状态</button>
        </div>
      </div>
      <div class="ai-controls" :class="{ disabled: aiLoading }">
        <button @click="onBatchGenerateTopicChapters" class="btn-ai btn-ai-blue" :disabled="aiLoading">📋 一键生成所有章节列表</button>
        <button @click="onBatchLessonPlans" class="btn-ai btn-ai-purple" :disabled="aiLoading">📚 一键生成所有教案</button>
        <button @click="onBatchPpts"         class="btn-ai btn-ai-pink"   :disabled="aiLoading">📊 一键生成所有PPT</button>
        <button @click="onBatchSolutionReports" class="btn-ai btn-ai-green" :disabled="aiLoading">💡 一键生成所有题解</button>
        <button @click="onExportAllReviews"     class="btn-ai btn-ai-orange" :disabled="exporting">📦 导出所有复习内容</button>
      </div>
    </div>

    <div class="form-group">
      <label>描述 (Markdown):</label>
      <div class="split-view">
        <textarea v-model="level.description" class="form-input" rows="10"></textarea>
        <div class="preview-box">
          <MarkdownViewer :content="level.description" />
        </div>
      </div>
    </div>

    <div class="form-group" v-if="isAdmin">
      <label>允许编辑的教师 (仅限此模块):</label>
      <div class="checkbox-list" v-if="teachers.length > 0">
        <label v-for="teacher in teachers" :key="teacher._id" class="checkbox-item">
          <input type="checkbox" :value="teacher._id" v-model="level.editors">
          {{ teacher.uname }}
        </label>
      </div>
      <div v-else class="hint">暂无教师账号可选</div>
      <div class="hint" style="margin-top: 5px; font-size: 12px; color: #888;">
        注意: 分组管理员默认拥有该分组下所有模块的编辑权限。此处设置的是额外的模块级编辑权限。
      </div>
    </div>
  </div>
</template>

<script>
import MarkdownViewer from '../MarkdownViewer.vue'

export default {
  name: 'LevelEditor',
  components: { MarkdownViewer },
  props: {
    level:                       { type: Object,   required: true },
    isAdmin:                     { type: Boolean,  default: false },
    teachers:                    { type: Array,    default: () => [] },
    aiLoading:                   { type: Boolean,  default: false },
    aiStatus:                    { type: String,   default: '' },
    exporting:                   { type: Boolean,  default: false },
    onResetAi:                   { type: Function, default: () => {} },
    onBatchGenerateTopicChapters:{ type: Function, default: () => {} },
    onBatchLessonPlans:          { type: Function, default: () => {} },
    onBatchPpts:                 { type: Function, default: () => {} },
    onBatchSolutionReports:      { type: Function, default: () => {} },
    onExportAllReviews:          { type: Function, default: () => {} }
  }
}
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

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
