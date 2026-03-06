<template>
  <div class="learners-section">
    <div class="learners-header" @click="toggle">
      <span class="toggle-icon">{{ expanded ? '▼' : '▶' }}</span>
      <span class="learners-label">{{ label }}</span>
    </div>
    <div v-show="expanded" class="learners-content">
      <div v-if="loading" class="loading-small">加载中...</div>
      <div v-else-if="learners.length > 0" class="learners-grid">
        <div
          v-for="learner in learners"
          :key="learner._id"
          class="learner-card"
          @click.stop="$emit('view-learner', learner)"
        >
          <div class="learner-avatar">{{ learner.uname ? learner.uname.charAt(0).toUpperCase() : '?' }}</div>
          <div class="learner-info">
            <div class="learner-name">{{ learner.uname }}</div>
            <div class="learner-detail" v-if="learner.completedCount !== undefined">已完成 {{ learner.completedCount }} 节</div>
          </div>
        </div>
      </div>
      <div v-else class="no-learners">暂无同学记录</div>
    </div>
  </div>
</template>

<script>
import request from '../../utils/request'

export default {
  name: 'LearnersSection',
  props: {
    itemId:   { type: String, required: true },
    itemType: { type: String, required: true }, // 'level' | 'topic'
    label:    { type: String, default: '正在学习的同学' }
  },
  emits: ['view-learner'],
  data() {
    return {
      expanded: false,
      learners: [],
      loading: false
    }
  },
  watch: {
    itemId() {
      // Reset when item changes
      this.expanded = false
      this.learners = []
    }
  },
  methods: {
    async toggle() {
      this.expanded = !this.expanded
      if (this.expanded && this.learners.length === 0) {
        await this.fetchLearners()
      }
    },
    async fetchLearners() {
      this.loading = true
      try {
        const url = this.itemType === 'level'
          ? `/api/course/level/${this.itemId}/learners`
          : `/api/course/topic/${this.itemId}/learners`
        this.learners = await request(url)
      } catch (e) {
        console.error('Failed to fetch learners', e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.learners-section {
  margin-top: 30px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}
.learners-header {
  cursor: pointer;
  color: #7f8c8d;
  font-size: 14px;
  display: flex;
  align-items: center;
  user-select: none;
}
.toggle-icon { margin-right: 6px; }
.learners-content { margin-top: 12px; }
.loading-small { color: #999; font-size: 13px; }
.no-learners { color: #bdc3c7; font-size: 13px; margin-top: 10px; }

.learners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.learner-card {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.learner-card:hover {
  background: white;
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transform: translateY(-2px);
}
.learner-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-right: 10px;
  font-size: 14px;
  flex-shrink: 0;
}
.learner-info { flex: 1; overflow: hidden; }
.learner-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.learner-detail { font-size: 11px; color: #95a5a6; margin-top: 2px; }
</style>
