<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h3>{{ detail?.learner?.learnerName || learner?.uname || '' }} 的课程明细</h3>
          <p v-if="detail?.learner" class="modal-subtitle">
            {{ detail.learner.scopeType === 'topic' ? '当前 Topic' : '当前 Level' }}：{{ detail.learner.scopeTitle }}
          </p>
        </div>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="detail?.learner" class="progress-details">
          <div class="summary-grid">
            <div class="progress-stat-card compact-card">
              <h4>章节完成</h4>
              <div class="stat-value">{{ detail.learner.completedChaptersCount }} / {{ detail.learner.totalChapters }}</div>
              <div class="stat-subvalue">完成率 {{ detail.learner.completionRate }}%</div>
            </div>
            <div class="progress-stat-card compact-card">
              <h4>课程做题</h4>
              <div class="stat-value">{{ detail.learner.solvedProblemCount }}</div>
              <div class="stat-subvalue">按当前课程范围统计</div>
            </div>
            <div class="progress-stat-card compact-card">
              <h4>最近学习</h4>
              <div class="stat-text">{{ formatDateTime(detail.learner.lastActivityAt) }}</div>
              <div class="stat-subvalue">{{ detail.learner.group }} · L{{ detail.learner.level }} {{ detail.learner.levelTitle }}</div>
            </div>
          </div>

          <div
            v-for="topic in detail.topics"
            :key="topic.topicId"
            class="progress-stat-card"
          >
            <div class="topic-summary-header">
              <div>
                <h4>{{ topic.title }}</h4>
                <div class="stat-topic-detail">已完成 {{ topic.completedCount }} / {{ topic.totalCount }} 章节</div>
              </div>
              <div class="topic-summary-metrics">
                <span class="stat-topic-pct">{{ topic.completionRate }}%</span>
                <span class="topic-solved-count">已做 {{ topic.solvedProblemCount }} 题</span>
              </div>
            </div>

            <div class="stat-topic-bar">
              <div class="stat-topic-fill" :style="{ width: topic.completionRate + '%' }"></div>
            </div>

            <div class="chapter-list">
              <article
                v-for="chapter in topic.chapters"
                :key="chapter.chapterUid || chapter.chapterId || chapter.title"
                :class="['chapter-item', { completed: chapter.completed }]"
              >
                <div class="chapter-row">
                  <div>
                    <div class="chapter-title">{{ chapter.title }}</div>
                    <div class="chapter-meta">{{ chapter.completed ? '已完成章节' : '未完成章节' }}</div>
                  </div>
                  <div class="chapter-solved">已做 {{ chapter.solvedProblemCount }} 题</div>
                </div>

                <div v-if="chapter.solvedProblems.length" class="chapter-problems">
                  <a
                    v-for="problem in chapter.solvedProblems"
                    :key="problem.id || problem.displayName"
                    class="problem-chip problem-link"
                    :class="{ disabled: !problem.problemUrl }"
                    :href="problem.problemUrl || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    :title="problem.displayName"
                  >
                    {{ problem.displayName }}
                  </a>
                </div>
              </article>
            </div>
          </div>

          <div class="progress-stat-card">
            <h4>最近学习轨迹</h4>
            <div v-if="detail.recentActivities?.length" class="activity-list">
              <div
                v-for="activity in detail.recentActivities"
                :key="`${activity.action}-${activity.chapterId}-${activity.lastActiveAt}`"
                class="activity-item"
              >
                <div class="activity-title">{{ formatCourseAction(activity.action) }} · {{ activity.chapterTitle || '未命名章节' }}</div>
                <div class="activity-meta">
                  <span v-if="activity.topicTitle">{{ activity.topicTitle }}</span>
                  <span>{{ formatDateTime(activity.lastActiveAt) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-inline">最近 30 天暂无学习轨迹</div>
          </div>
        </div>
        <div v-else class="error">无法获取课程详情</div>
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
    detail:       { type: Object,  default: null }
  },
  emits: ['close'],
  methods: {
    formatDateTime(value) {
      if (!value) return '暂无'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '暂无'
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatCourseAction(value) {
      if (value === 'view_chapter') return '查看章节'
      if (value === 'complete_chapter') return '完成章节'
      if (value === 'pass_problem') return '通过题目'
      return '学习行为'
    }
  }
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
  width: min(760px, calc(100vw - 32px));
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
.modal-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
}
.btn-close { background: none; border: none; font-size: 20px; cursor: pointer; line-height: 1; }
.loading, .error { color: #999; text-align: center; padding: 20px; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

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
.compact-card {
  margin-bottom: 0;
}
.stat-value { font-size: 24px; font-weight: bold; color: #3498db; text-align: center; padding: 8px; }
.stat-subvalue {
  font-size: 12px;
  color: #64748b;
  text-align: center;
}
.stat-text {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  padding: 12px 8px;
}

.topic-summary-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}
.topic-summary-metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.stat-topic-title { font-size: 13px; font-weight: 500; color: #2c3e50; }
.stat-topic-pct { font-size: 12px; color: #3498db; font-weight: bold; }
.topic-solved-count {
  font-size: 12px;
  color: #475569;
}
.stat-topic-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.stat-topic-fill { height: 100%; background: #3498db; border-radius: 3px; }
.stat-topic-detail { font-size: 11px; color: #95a5a6; }

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.chapter-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}
.chapter-item.completed {
  border-color: #86efac;
  background: #f0fdf4;
}
.chapter-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.chapter-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}
.chapter-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}
.chapter-solved {
  flex-shrink: 0;
  font-size: 12px;
  color: #0f766e;
  font-weight: 600;
}
.chapter-problems {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.problem-chip {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
}
.problem-link {
  text-decoration: none;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}
.problem-link:hover {
  background: #dbeafe;
  color: #1d4ed8;
  transform: translateY(-1px);
}
.problem-link.disabled {
  pointer-events: none;
  opacity: 0.72;
}
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.activity-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e2e8f0;
}
.activity-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}
.activity-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  margin-top: 6px;
}
.empty-inline {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  padding: 16px 8px 4px;
}

@media (max-width: 720px) {
  .modal-content {
    width: min(440px, calc(100vw - 24px));
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .chapter-row,
  .topic-summary-header,
  .activity-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .topic-summary-metrics {
    align-items: flex-start;
  }
}
</style>
