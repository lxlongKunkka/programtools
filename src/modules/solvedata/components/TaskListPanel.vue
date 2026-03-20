<template>
  <div class="task-list-panel">
    <div class="task-list-header">
      <span>任务列表</span>
      <div style="display:flex;gap:4px">
        <button @click="$emit('add-task')" class="btn-icon" title="添加新任务">➕</button>
        <button @click="$emit('clear-completed')" class="btn-icon" title="清除已完成" style="color:#10b981">✅</button>
        <button @click="$emit('clear-all')" class="btn-icon" title="清空任务列表" style="color:#ef4444">🗑️</button>
      </div>
    </div>
    <div class="task-list">
      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        :class="['task-item', { active: currentTaskIndex === index }]"
        @click="$emit('switch-task', index)"
      >
        <div class="task-status-dot" :class="task.status"></div>
        <div class="task-info">
          <div class="task-title">{{ getTaskTitle(task) }}</div>
          <div class="task-meta">{{ getTaskStatusText(task) }}</div>
        </div>
        <div class="step-dots">
          <span class="dot" :class="{ done: !!task.translationText }" title="翻译"></span>
          <span class="dot" :class="{ done: !!task.codeOutput }" title="题解"></span>
          <span class="dot" :class="{ done: !!task.dataOutput }" title="数据"></span>
          <span class="dot" :class="{ done: !!task.reportHtml }" title="报告"></span>
        </div>
        <button
          v-if="task.status === 'completed'"
          @click.stop="$emit('reset-task-status', index)"
          class="btn-icon-small"
          title="重置为等待中"
        >↺</button>
        <button @click.stop="$emit('remove-task', index)" class="btn-icon-small">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getTaskStatusText, getTaskTitle } from '../taskState'

export default {
  name: 'TaskListPanel',
  props: {
    tasks: {
      type: Array,
      required: true,
    },
    currentTaskIndex: {
      type: Number,
      required: true,
    },
  },
  methods: {
    getTaskTitle,
    getTaskStatusText,
  },
}
</script>