<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ learner ? learner.uname : '' }} 的学习进度</h3>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="progress" class="progress-details">
          <div
            v-for="(level, idx) in activeLevels"
            :key="idx"
            class="progress-stat-card"
          >
            <h4>{{ level.group }} - {{ level.title }}</h4>
            <div class="modal-topics-list">
              <div
                v-for="(topic, tIdx) in level.topics"
                :key="tIdx"
                class="stat-topic-item"
              >
                <div class="stat-topic-header">
                  <span class="stat-topic-title">{{ topic.title }}</span>
                  <span class="stat-topic-pct">{{ topic.percentage }}%</span>
                </div>
                <div class="stat-topic-bar">
                  <div class="stat-topic-fill" :style="{ width: topic.percentage + '%' }"></div>
                </div>
                <div class="stat-topic-detail">
                  已完成 {{ topic.completed }} / {{ topic.total }} 章节
                </div>
              </div>
            </div>
          </div>

          <div class="progress-stat-card">
            <h4>累计完成章节</h4>
            <div class="stat-value">{{ progress.completedChaptersCount }}</div>
          </div>
        </div>
        <div v-else class="error">无法获取进度信息</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LearnerModal',
  props: {
    show:         { type: Boolean, default: false },
    learner:      { type: Object,  default: null },
    loading:      { type: Boolean, default: false },
    progress:     { type: Object,  default: null },
    activeLevels: { type: Array,   default: () => [] }
  },
  emits: ['close']
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  width: 440px;
  max-height: 80vh;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.modal-header {
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-body {
  padding: 20px;
  overflow-y: auto;
}
.btn-close { background: none; border: none; font-size: 20px; cursor: pointer; line-height: 1; }
.loading, .error { color: #999; text-align: center; padding: 20px; }

.progress-stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.progress-stat-card h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #2c3e50;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}
.stat-value { font-size: 28px; font-weight: bold; color: #3498db; text-align: center; padding: 8px; }

.modal-topics-list { display: flex; flex-direction: column; gap: 10px; }
.stat-topic-item { background: white; padding: 10px; border-radius: 6px; border: 1px solid #f0f0f0; }
.stat-topic-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.stat-topic-title { font-size: 13px; font-weight: 500; color: #2c3e50; }
.stat-topic-pct { font-size: 12px; color: #3498db; font-weight: bold; }
.stat-topic-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.stat-topic-fill { height: 100%; background: #3498db; border-radius: 3px; }
.stat-topic-detail { font-size: 11px; color: #95a5a6; text-align: right; }
</style>
