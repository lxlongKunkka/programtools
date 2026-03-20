<template>
  <div class="task-list-panel">
    <div class="task-list-header">
      <div class="task-list-header-copy">
        <div class="task-list-title">任务列表</div>
        <div class="task-list-summary">共 {{ tasks.length }} 题 · 当前 {{ currentTaskIndex + 1 }}</div>
      </div>
      <div class="task-list-actions">
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
        <div class="task-index">{{ formatIndex(index) }}</div>
        <div class="task-body">
          <div class="task-main-row">
            <div class="task-title-wrap">
              <div class="task-title">{{ getTaskTitle(task) }}</div>
              <div class="task-meta-row">
                <span class="task-status-pill" :class="task.status">
                  <span class="task-status-dot" :class="task.status"></span>
                  {{ getTaskStatusText(task) }}
                </span>
                <span class="task-progress-text">{{ getCompletedStepCount(task) }}/4 步</span>
              </div>
            </div>
            <div class="task-actions">
              <button
                v-if="task.status === 'completed'"
                @click.stop="$emit('reset-task-status', index)"
                class="btn-icon-small"
                title="重置为等待中"
              >↺</button>
              <button @click.stop="$emit('remove-task', index)" class="btn-icon-small danger">✕</button>
            </div>
          </div>
          <div class="step-dots">
            <span class="dot" :class="{ done: !!task.translationText }" title="翻译">译</span>
            <span class="dot" :class="{ done: !!task.codeOutput }" title="题解">解</span>
            <span class="dot" :class="{ done: !!task.dataOutput }" title="数据">数</span>
            <span class="dot" :class="{ done: !!task.reportHtml }" title="报告">报</span>
          </div>
        </div>
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
    formatIndex(index) {
      return String(index + 1).padStart(2, '0')
    },
    getCompletedStepCount(task) {
      return [task?.translationText, task?.codeOutput, task?.dataOutput, task?.reportHtml]
        .filter((value) => !!String(value || '').trim())
        .length
    },
  },
}
</script>

<style scoped>
.task-list-panel {
  width: 268px;
  min-width: 228px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  border: 1px solid #dbe3f1;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.task-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #6d28d9 55%, #7c3aed 100%);
  color: #fff;
  flex-shrink: 0;
}

.task-list-header-copy {
  min-width: 0;
}

.task-list-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.task-list-summary {
  margin-top: 3px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.78);
}

.task-list-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.btn-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  border-radius: 8px;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.24);
  border-color: rgba(255, 255, 255, 0.35);
  transform: translateY(-1px);
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.task-item {
  display: flex;
  align-items: stretch;
  gap: 9px;
  padding: 8px 9px;
  cursor: pointer;
  border: 1px solid #e5ebf5;
  border-radius: 11px;
  background: #fff;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.task-item:hover {
  transform: translateY(-1px);
  border-color: #cfd9ee;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
}

.task-item.active {
  background: linear-gradient(180deg, #eef3ff 0%, #f7f9ff 100%);
  border-color: #a5b4fc;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.1);
}

.task-index {
  width: 28px;
  min-width: 28px;
  border-radius: 9px;
  background: #f3f6fb;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.task-item.active .task-index {
  background: #4f46e5;
  color: #fff;
}

.task-body {
  flex: 1;
  min-width: 0;
}

.task-main-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.task-title-wrap {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.32;
  color: #1f2937;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-item.active .task-title {
  color: #3730a3;
}

.task-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
}

.task-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: #f3f4f6;
  color: #6b7280;
}

.task-status-pill.pending {
  background: #f3f4f6;
  color: #6b7280;
}

.task-status-pill.processing {
  background: #fff7ed;
  color: #c2410c;
}

.task-status-pill.completed {
  background: #ecfdf5;
  color: #047857;
}

.task-status-pill.failed {
  background: #fef2f2;
  color: #b91c1c;
}

.task-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-status-dot.pending { background: #9ca3af; }
.task-status-dot.processing { background: #f59e0b; animation: pulse 1.5s infinite; }
.task-status-dot.completed { background: #10b981; }
.task-status-dot.failed { background: #ef4444; }

.task-progress-text {
  font-size: 10px;
  color: #94a3b8;
}

.step-dots {
  display: flex;
  gap: 5px;
  margin-top: 8px;
}

.dot {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: #eef2f7;
  color: #94a3b8;
  border: 1px solid #e2e8f0;
}

.dot.done {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.btn-icon-small {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  font-size: 11px;
  border-radius: 7px;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.task-item:hover .btn-icon-small,
.task-item.active .btn-icon-small {
  opacity: 1;
}

.btn-icon-small:hover {
  background: #eef2ff;
  color: #4338ca;
  border-color: #c7d2fe;
}

.btn-icon-small.danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

@keyframes pulse {
  0%,
  100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (max-width: 768px) {
  .task-list-panel {
    width: 100%;
    min-width: auto;
    border-radius: 12px;
  }

  .task-list-header {
    padding: 11px 11px 9px;
  }

  .task-list {
    max-height: 210px;
    padding: 7px;
  }

  .task-item {
    padding: 8px;
  }

  .task-title {
    -webkit-line-clamp: 1;
  }

  .task-progress-text {
    display: none;
  }

  .dot {
    width: 18px;
    height: 18px;
    font-size: 9px;
  }

  .btn-icon-small {
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .task-list-header {
    align-items: flex-start;
  }

  .task-list-summary {
    display: none;
  }

  .task-index {
    width: 24px;
    min-width: 24px;
  }

  .task-status-pill {
    padding-inline: 6px;
  }
}
</style>