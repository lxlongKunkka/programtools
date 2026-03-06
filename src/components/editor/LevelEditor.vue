<template>
  <div class="editor-form">
    <div class="editor-header">
      <h2>{{ level._id ? '编辑课程模块' : '新建课程模块' }}</h2>
    </div>

    <div class="form-group">
      <label>所属分组 (Tab):</label>
      <input v-model="level.group" class="form-input" disabled>
    </div>

    <div class="form-group">
      <label>标题 (Title):</label>
      <input v-model="level.title" class="form-input" placeholder="例如: 基础语法">
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
        <button @click="onBatchLessonPlans" class="btn-ai btn-ai-purple" :disabled="aiLoading">📚 一键生成所有教案</button>
        <button @click="onBatchPpts"         class="btn-ai btn-ai-pink"   :disabled="aiLoading">📊 一键生成所有PPT</button>
        <button @click="onBatchSolutionReports" class="btn-ai btn-ai-green" :disabled="aiLoading">💡 一键生成所有题解</button>
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
    level:                  { type: Object,   required: true },
    isAdmin:                { type: Boolean,  default: false },
    teachers:               { type: Array,    default: () => [] },
    aiLoading:              { type: Boolean,  default: false },
    aiStatus:               { type: String,   default: '' },
    onResetAi:              { type: Function, default: () => {} },
    onBatchLessonPlans:     { type: Function, default: () => {} },
    onBatchPpts:            { type: Function, default: () => {} },
    onBatchSolutionReports: { type: Function, default: () => {} }
  }
}
</script>
