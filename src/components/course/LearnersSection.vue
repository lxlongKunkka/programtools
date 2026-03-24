<template>
  <div class="learners-section">
    <div class="learners-header" @click="toggle">
      <span class="toggle-icon">{{ expanded ? '▼' : '▶' }}</span>
      <span class="learners-label">{{ label }}</span>
    </div>
    <div v-show="expanded" class="learners-content">
      <div v-if="loading" class="loading-small">加载中...</div>
      <div v-else-if="rankedLearners.length > 0" class="learners-grid">
        <div
          v-for="(learner, index) in rankedLearners"
          :key="learner._id"
          :class="['learner-card', { featured: isFeaturedLearner(learner) }]"
          @click.stop="$emit('view-learner', learner)"
        >
          <div class="learner-rank">{{ index + 1 }}</div>
          <div class="learner-avatar">{{ learner.uname ? learner.uname.charAt(0).toUpperCase() : '?' }}</div>
          <div class="learner-info">
            <div class="learner-name-row">
              <div class="learner-name">{{ learner.uname }}</div>
              <span v-if="isFeaturedLearner(learner)" class="featured-badge">最活跃</span>
            </div>
            <div class="learner-detail" v-if="learner.completedCount !== undefined">已完成 {{ learner.completedCount }} 节</div>
            <div class="learner-detail" v-if="learner.solvedProblemCount !== undefined">已做 {{ learner.solvedProblemCount }} 题</div>
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
  computed: {
    rankedLearners() {
      return [...this.learners].sort((a, b) => (
        (b.solvedProblemCount || 0) - (a.solvedProblemCount || 0)
        || (b.completedCount || 0) - (a.completedCount || 0)
        || String(a.uname || '').localeCompare(String(b.uname || ''), 'zh-CN')
      ))
    },
    topSolvedProblemCount() {
      return this.rankedLearners.reduce((max, learner) => Math.max(max, Number(learner.solvedProblemCount || 0)), 0)
    }
  },
  methods: {
    isFeaturedLearner(learner) {
      return this.topSolvedProblemCount > 0 && Number(learner?.solvedProblemCount || 0) === this.topSolvedProblemCount
    },
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
  gap: 10px;
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
.learner-card.featured {
  background: linear-gradient(135deg, #fff5d6 0%, #fffaf0 100%);
  border-color: #f59e0b;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.16);
}
.learner-rank {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.learner-card.featured .learner-rank {
  background: #f59e0b;
  color: #fff;
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
.learner-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.learner-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.featured-badge {
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 999px;
  background: #f59e0b;
  color: white;
  font-weight: 700;
}
.learner-detail { font-size: 11px; color: #95a5a6; margin-top: 2px; }
</style>
