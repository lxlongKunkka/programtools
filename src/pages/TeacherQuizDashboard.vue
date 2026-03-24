<template>
  <div class="teacher-quiz-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">教师 Quiz 看板</p>
        <h2>关注学员的刷题参与情况</h2>
        <p class="hero-copy">先关注自己的学员，再按最近 7 天或 30 天查看答题活跃度、正确率、错题堆积和最近作答明细。</p>
      </div>
      <div class="hero-actions">
        <label class="days-select">
          <span>观察窗口</span>
          <select v-model.number="selectedDays" @change="loadDashboard">
            <option :value="7">最近 7 天</option>
            <option :value="14">最近 14 天</option>
            <option :value="30">最近 30 天</option>
          </select>
        </label>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card accent">
        <span class="summary-label">已关注学员</span>
        <strong class="summary-value">{{ dashboard.summary.followedCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">窗口内活跃</span>
        <strong class="summary-value">{{ dashboard.summary.activeLearnerCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">今日已参与</span>
        <strong class="summary-value">{{ dashboard.summary.activeTodayCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">平均正确率</span>
        <strong class="summary-value">{{ dashboard.summary.averageAccuracy }}%</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">人均答题</span>
        <strong class="summary-value">{{ dashboard.summary.averageAnsweredCount }}</strong>
      </article>
    </section>

    <div class="content-grid">
      <section class="panel candidate-panel">
        <div class="panel-header">
          <div>
            <h3>添加关注学员</h3>
            <p>先按课程层级筛出学员，再加入关注列表。</p>
          </div>
        </div>

        <div class="filter-grid">
          <label>
            <span>课程分组</span>
            <select v-model="selectedGroup" @change="handleGroupChange">
              <option value="">请选择</option>
              <option v-for="group in groupOptions" :key="group" :value="group">{{ group }}</option>
            </select>
          </label>
          <label>
            <span>Level</span>
            <select v-model="selectedLevelId" @change="handleLevelChange">
              <option value="">请选择</option>
              <option v-for="level in filteredLevels" :key="level._id" :value="level._id">L{{ level.level }} · {{ level.title }}</option>
            </select>
          </label>
          <label>
            <span>Topic</span>
            <select v-model="selectedTopicId" @change="loadCandidates" :disabled="!selectedLevel">
              <option value="">查看整个 Level</option>
              <option v-for="topic in topicOptions" :key="topic._id" :value="topic._id">{{ topic.title }}</option>
            </select>
          </label>
        </div>

        <label class="search-box">
          <span>搜索学员</span>
          <input v-model.trim="candidateQuery" type="text" placeholder="输入学员名过滤" />
        </label>

        <div v-if="candidateLoading" class="empty-state">学员列表加载中...</div>
        <div v-else-if="!selectedLevel" class="empty-state">先选择一个 Level 或 Topic。</div>
        <div v-else-if="filteredCandidates.length === 0" class="empty-state">当前范围内没有匹配学员。</div>
        <div v-else class="candidate-list">
          <article v-for="learner in filteredCandidates" :key="learner._id" class="candidate-item">
            <div>
              <strong>{{ learner.uname }}</strong>
              <p>课程完成章节：{{ learner.completedCount || 0 }}</p>
            </div>
            <button
              v-if="!followedIdSet.has(Number(learner._id))"
              class="btn-primary"
              :disabled="followSavingId === Number(learner._id)"
              @click="followLearner(learner)"
            >
              {{ followSavingId === Number(learner._id) ? '添加中...' : '关注' }}
            </button>
            <button
              v-else
              class="btn-secondary"
              :disabled="followSavingId === Number(learner._id)"
              @click="unfollowLearner(learner)"
            >
              {{ followSavingId === Number(learner._id) ? '处理中...' : '取消关注' }}
            </button>
          </article>
        </div>
      </section>

      <section class="panel follow-panel">
        <div class="panel-header">
          <div>
            <h3>关注学员看板</h3>
            <p>按风险优先看最近掉队的孩子。</p>
          </div>
        </div>

        <div v-if="dashboardLoading" class="empty-state">看板加载中...</div>
        <div v-else-if="dashboard.items.length === 0" class="empty-state">还没有关注学员，先从左侧添加。</div>
        <div v-else class="follow-table-wrap">
          <table class="follow-table">
            <thead>
              <tr>
                <th>学员</th>
                <th>近{{ selectedDays }}天答题</th>
                <th>正确率</th>
                <th>活跃天数</th>
                <th>今日情况</th>
                <th>错题本</th>
                <th>最近作答</th>
                <th>风险</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sortedFollowedItems" :key="item.learnerId">
                <td>
                  <div class="name-cell">
                    <strong>{{ item.learnerName }}</strong>
                    <span>ID {{ item.learnerId }}</span>
                  </div>
                </td>
                <td>{{ item.answeredCount }}</td>
                <td>{{ item.accuracy }}%</td>
                <td>{{ item.activeDays }}</td>
                <td>{{ item.todayAnsweredCount }} / {{ item.todayCorrectCount }}</td>
                <td>{{ item.wrongbookActiveCount }}</td>
                <td>{{ formatDateTime(item.lastAnsweredAt) }}</td>
                <td>
                  <div class="risk-list">
                    <span v-if="!item.riskFlags.length" class="risk-pill safe">稳定</span>
                    <span v-for="flag in item.riskFlags" :key="flag" class="risk-pill">{{ flag }}</span>
                  </div>
                </td>
                <td>
                  <div class="row-actions">
                    <button class="link-btn" @click="openLearnerDetail(item)">详情</button>
                    <button class="link-btn danger" @click="unfollowLearner(item)">取消</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section v-if="detail.learner" class="panel detail-panel">
      <div class="panel-header detail-header">
        <div>
          <h3>{{ detail.learner.learnerName }} 的 Quiz 明细</h3>
          <p>错题本 {{ detail.learner.wrongbookActiveCount }} 题，收藏 {{ detail.learner.favoriteActiveCount }} 题</p>
        </div>
        <button class="btn-secondary" @click="detail = createEmptyDetail()">关闭</button>
      </div>

      <div v-if="detailLoading" class="empty-state">正在加载明细...</div>
      <template v-else>
        <div class="detail-grid">
          <div class="mini-panel">
            <h4>最近打卡</h4>
            <div v-if="detail.recentProgress.length === 0" class="empty-state small">暂无记录</div>
            <div v-else class="progress-list">
              <div v-for="item in detail.recentProgress" :key="item.date" class="progress-row">
                <span>{{ item.date }}</span>
                <span>{{ item.answeredCount }} 题 / {{ item.correctCount }} 对</span>
                <span>{{ item.completed ? '完成' : '未完成' }}</span>
              </div>
            </div>
          </div>

          <div class="mini-panel">
            <h4>薄弱知识点</h4>
            <div v-if="detail.weakTags.length === 0" class="empty-state small">近 {{ detailDays }} 天没有明显薄弱点</div>
            <div v-else class="tag-list">
              <span v-for="tag in detail.weakTags" :key="tag.tag" class="tag-pill">{{ tag.tag }} · {{ tag.wrongCount }}</span>
            </div>
          </div>
        </div>

        <div class="mini-panel attempts-panel">
          <h4>最近作答</h4>
          <div v-if="detail.recentAttempts.length === 0" class="empty-state small">暂无作答记录</div>
          <div v-else class="attempt-list">
            <article v-for="attempt in detail.recentAttempts" :key="`${attempt.questionUid}-${attempt.answeredAt}`" class="attempt-item">
              <div class="attempt-head">
                <strong>{{ attempt.sourceTitle || attempt.questionUid }}</strong>
                <span :class="['attempt-result', attempt.isCorrect ? 'correct' : 'wrong']">{{ attempt.isCorrect ? '正确' : '错误' }}</span>
              </div>
              <p class="attempt-stem">{{ attempt.stemPreview }}</p>
              <div class="attempt-meta">
                <span>作答：{{ attempt.selectedAnswer || '-' }}</span>
                <span>正确：{{ attempt.correctAnswer || '-' }}</span>
                <span>{{ formatDateTime(attempt.answeredAt) }}</span>
              </div>
            </article>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script>
import request from '../utils/request'

function createEmptyDashboard() {
  return {
    summary: {
      followedCount: 0,
      activeLearnerCount: 0,
      activeTodayCount: 0,
      averageAccuracy: 0,
      averageAnsweredCount: 0
    },
    items: []
  }
}

function createEmptyDetail() {
  return {
    learner: null,
    recentProgress: [],
    recentAttempts: [],
    weakTags: []
  }
}

export default {
  name: 'TeacherQuizDashboard',
  inject: ['showToastMessage'],
  data() {
    return {
      levels: [],
      selectedGroup: '',
      selectedLevelId: '',
      selectedTopicId: '',
      candidateQuery: '',
      candidates: [],
      candidateLoading: false,
      selectedDays: 7,
      dashboard: createEmptyDashboard(),
      dashboardLoading: false,
      followSavingId: null,
      detail: createEmptyDetail(),
      detailLoading: false,
      detailDays: 14
    }
  },
  computed: {
    groupOptions() {
      return [...new Set(this.levels.map((item) => item.group || '未分组').filter(Boolean))]
    },
    filteredLevels() {
      if (!this.selectedGroup) return this.levels
      return this.levels.filter((item) => (item.group || '未分组') === this.selectedGroup)
    },
    selectedLevel() {
      return this.levels.find((item) => String(item._id) === String(this.selectedLevelId)) || null
    },
    topicOptions() {
      return Array.isArray(this.selectedLevel?.topics) ? this.selectedLevel.topics : []
    },
    followedIdSet() {
      return new Set((this.dashboard.items || []).map((item) => Number(item.learnerId)))
    },
    filteredCandidates() {
      const keyword = this.candidateQuery.trim().toLowerCase()
      if (!keyword) return this.candidates
      return this.candidates.filter((item) => String(item.uname || '').toLowerCase().includes(keyword))
    },
    sortedFollowedItems() {
      return [...(this.dashboard.items || [])].sort((a, b) => {
        if (a.riskFlags.length !== b.riskFlags.length) return b.riskFlags.length - a.riskFlags.length
        if ((a.todayAnsweredCount || 0) !== (b.todayAnsweredCount || 0)) return (a.todayAnsweredCount || 0) - (b.todayAnsweredCount || 0)
        return (a.answeredCount || 0) - (b.answeredCount || 0)
      })
    }
  },
  async mounted() {
    await Promise.all([this.loadLevels(), this.loadDashboard()])
  },
  methods: {
    async loadLevels() {
      try {
        const data = await request('/api/course/levels')
        this.levels = Array.isArray(data) ? data : []
      } catch (e) {
        this.showToastMessage(`加载课程失败: ${e.message}`)
      }
    },
    async loadDashboard() {
      this.dashboardLoading = true
      try {
        const data = await request(`/api/quiz/teacher/follows?days=${this.selectedDays}`)
        this.dashboard = {
          summary: data?.summary || createEmptyDashboard().summary,
          items: Array.isArray(data?.items) ? data.items : []
        }
      } catch (e) {
        this.showToastMessage(`加载看板失败: ${e.message}`)
      } finally {
        this.dashboardLoading = false
      }
    },
    handleGroupChange() {
      this.selectedLevelId = ''
      this.selectedTopicId = ''
      this.candidates = []
    },
    handleLevelChange() {
      this.selectedTopicId = ''
      this.loadCandidates()
    },
    async loadCandidates() {
      if (!this.selectedLevelId) {
        this.candidates = []
        return
      }
      this.candidateLoading = true
      try {
        const endpoint = this.selectedTopicId
          ? `/api/course/topic/${this.selectedTopicId}/learners`
          : `/api/course/level/${this.selectedLevelId}/learners`
        const data = await request(endpoint)
        this.candidates = Array.isArray(data) ? data : []
      } catch (e) {
        this.showToastMessage(`加载学员失败: ${e.message}`)
        this.candidates = []
      } finally {
        this.candidateLoading = false
      }
    },
    async followLearner(learner) {
      const learnerId = Number(learner._id || learner.learnerId)
      if (!learnerId) return
      this.followSavingId = learnerId
      try {
        await request.post('/api/quiz/teacher/follows', { learnerId })
        await this.loadDashboard()
        this.showToastMessage(`已关注 ${learner.uname || learner.learnerName}`)
      } catch (e) {
        this.showToastMessage(`关注失败: ${e.message}`)
      } finally {
        this.followSavingId = null
      }
    },
    async unfollowLearner(learner) {
      const learnerId = Number(learner._id || learner.learnerId)
      if (!learnerId) return
      this.followSavingId = learnerId
      try {
        await request.delete(`/api/quiz/teacher/follows/${learnerId}`)
        if (Number(this.detail.learner?.learnerId) === learnerId) {
          this.detail = createEmptyDetail()
        }
        await this.loadDashboard()
        this.showToastMessage(`已取消关注 ${learner.uname || learner.learnerName}`)
      } catch (e) {
        this.showToastMessage(`取消关注失败: ${e.message}`)
      } finally {
        this.followSavingId = null
      }
    },
    async openLearnerDetail(item) {
      this.detailLoading = true
      this.detail = createEmptyDetail()
      try {
        const data = await request(`/api/quiz/teacher/follows/${item.learnerId}/detail?days=${this.detailDays}`)
        this.detail = {
          learner: data?.learner || null,
          recentProgress: Array.isArray(data?.recentProgress) ? data.recentProgress : [],
          recentAttempts: Array.isArray(data?.recentAttempts) ? data.recentAttempts : [],
          weakTags: Array.isArray(data?.weakTags) ? data.weakTags : []
        }
      } catch (e) {
        this.showToastMessage(`加载学员详情失败: ${e.message}`)
      } finally {
        this.detailLoading = false
      }
    },
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
    }
  }
}
</script>

<style scoped>
.teacher-quiz-page {
  max-width: 1380px;
  margin: 0 auto;
  padding: 28px 20px 56px;
  color: #16202a;
}

.hero-card,
.panel,
.summary-card {
  background: #fff;
  border: 1px solid #d8e0ea;
  border-radius: 18px;
  box-shadow: 0 18px 45px rgba(15, 34, 58, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, #fffdf8 0%, #eef6ff 100%);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7a5c00;
}

.hero-card h2 {
  margin: 0;
  font-size: 28px;
}

.hero-copy {
  margin: 10px 0 0;
  max-width: 760px;
  line-height: 1.7;
  color: #506173;
}

.days-select,
.filter-grid label,
.search-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #5f7082;
}

.days-select select,
.filter-grid select,
.search-box input {
  min-width: 180px;
  border: 1px solid #c9d5e3;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  background: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-card {
  padding: 20px;
}

.summary-card.accent {
  background: linear-gradient(135deg, #113b6f 0%, #1e64b5 100%);
  color: #fff;
  border-color: #113b6f;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: inherit;
  opacity: 0.78;
}

.summary-value {
  display: block;
  margin-top: 10px;
  font-size: 30px;
}

.content-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;
}

.panel {
  padding: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h3,
.mini-panel h4 {
  margin: 0;
}

.panel-header p,
.mini-panel p {
  margin: 6px 0 0;
  color: #647587;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.search-box {
  margin-bottom: 12px;
}

.candidate-list,
.attempt-list,
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.candidate-item,
.attempt-item,
.progress-row {
  border: 1px solid #dbe4ed;
  border-radius: 14px;
  padding: 14px;
  background: #f9fbfd;
}

.candidate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.candidate-item p,
.attempt-stem,
.attempt-meta {
  margin: 6px 0 0;
}

.btn-primary,
.btn-secondary,
.link-btn {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.btn-primary,
.btn-secondary {
  padding: 9px 16px;
  font-weight: 600;
}

.btn-primary {
  background: #0f62fe;
  color: #fff;
}

.btn-secondary {
  background: #edf2f8;
  color: #17324d;
}

.follow-table-wrap {
  overflow: auto;
}

.follow-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}

.follow-table th,
.follow-table td {
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 10px;
  text-align: left;
  vertical-align: top;
}

.follow-table th {
  font-size: 12px;
  color: #647587;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name-cell span,
.attempt-meta {
  color: #6a7a89;
  font-size: 12px;
}

.risk-list,
.tag-list,
.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.risk-pill,
.tag-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  background: #fff3e8;
  color: #9a4d00;
}

.risk-pill.safe {
  background: #e9f8ef;
  color: #1d7b46;
}

.link-btn {
  padding: 0;
  background: transparent;
  color: #0f62fe;
}

.link-btn.danger {
  color: #ba1b1b;
}

.detail-panel {
  margin-top: 18px;
}

.detail-header {
  margin-bottom: 18px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.mini-panel {
  border: 1px solid #dce5ee;
  border-radius: 16px;
  padding: 16px;
  background: #fbfdff;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.attempt-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.attempt-result.correct {
  color: #1d7b46;
}

.attempt-result.wrong {
  color: #ba1b1b;
}

.empty-state {
  padding: 22px 12px;
  text-align: center;
  color: #728295;
}

.empty-state.small {
  padding: 12px 0;
}

@media (max-width: 1100px) {
  .summary-grid,
  .content-grid,
  .detail-grid,
  .hero-card {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .teacher-quiz-page {
    padding: 18px 14px 40px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>