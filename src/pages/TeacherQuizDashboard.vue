<template>
  <div class="teacher-quiz-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">教师学员看板</p>
        <h2>{{ activeTab === 'quiz' ? '关注学员的 Quiz 刷题情况' : '关注学员的 Course 学习进度' }}</h2>
        <p class="hero-copy">
          {{ activeTab === 'quiz'
            ? '先关注自己的学员，再按最近 7 天或 30 天查看答题活跃度、正确率、错题堆积和最近作答明细。'
            : '沿用同一批关注学员，直接查看课程完成率、当前等级、已开始 Level 与 Topic 分布。' }}
        </p>
      </div>
      <div class="hero-actions">
        <div class="tab-switch">
          <button :class="['tab-btn', activeTab === 'quiz' ? 'active' : '']" @click="activeTab = 'quiz'">Quiz</button>
          <button :class="['tab-btn', activeTab === 'course' ? 'active' : '']" @click="activeTab = 'course'">Course</button>
        </div>
        <label v-if="activeTab === 'quiz'" class="days-select">
          <span>观察窗口</span>
          <select v-model.number="selectedDays" @change="loadQuizDashboard">
            <option :value="7">最近 7 天</option>
            <option :value="14">最近 14 天</option>
            <option :value="30">最近 30 天</option>
          </select>
        </label>
      </div>
    </section>

    <section v-if="activeTab === 'quiz'" class="summary-grid">
      <article class="summary-card accent">
        <span class="summary-label">已关注学员</span>
        <strong class="summary-value">{{ quizDashboard.summary.followedCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">窗口内活跃</span>
        <strong class="summary-value">{{ quizDashboard.summary.activeLearnerCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">今日已参与</span>
        <strong class="summary-value">{{ quizDashboard.summary.activeTodayCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">平均正确率</span>
        <strong class="summary-value">{{ quizDashboard.summary.averageAccuracy }}%</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">人均答题</span>
        <strong class="summary-value">{{ quizDashboard.summary.averageAnsweredCount }}</strong>
      </article>
    </section>

    <section v-else class="summary-grid">
      <article class="summary-card accent">
        <span class="summary-label">已关注学员</span>
        <strong class="summary-value">{{ courseDashboard.summary.followedCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">已开始课程</span>
        <strong class="summary-value">{{ courseDashboard.summary.startedLearnerCount }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">平均完成率</span>
        <strong class="summary-value">{{ courseDashboard.summary.averageCompletionRate }}%</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">人均完成章节</span>
        <strong class="summary-value">{{ courseDashboard.summary.averageCompletedChapters }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">平均 C++ 等级</span>
        <strong class="summary-value">L{{ courseDashboard.summary.averageCurrentCppLevel }}</strong>
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
            <h3>{{ activeTab === 'quiz' ? 'Quiz 关注看板' : 'Course 关注看板' }}</h3>
            <p>{{ activeTab === 'quiz' ? '按风险优先看最近掉队的孩子。' : '先看完成率和已开始进度，再点开单个学员详情。' }}</p>
          </div>
        </div>

        <template v-if="activeTab === 'quiz'">
          <div v-if="quizDashboardLoading" class="empty-state">看板加载中...</div>
          <div v-else-if="quizDashboard.items.length === 0" class="empty-state">还没有关注学员，先从左侧添加。</div>
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
                <tr v-for="item in sortedQuizItems" :key="item.learnerId">
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
                      <button class="link-btn" @click="openQuizDetail(item)">详情</button>
                      <button class="link-btn danger" @click="unfollowLearner(item)">取消</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <template v-else>
          <div v-if="courseDashboardLoading" class="empty-state">看板加载中...</div>
          <div v-else-if="courseDashboard.items.length === 0" class="empty-state">还没有关注学员，先从左侧添加。</div>
          <div v-else class="follow-table-wrap">
            <table class="follow-table">
              <thead>
                <tr>
                  <th>学员</th>
                  <th>当前等级</th>
                  <th>已完成章节</th>
                  <th>完成率</th>
                  <th>已开始 Level</th>
                  <th>已完成 Level</th>
                  <th>已开始 Topic</th>
                  <th>风险</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in sortedCourseItems" :key="item.learnerId">
                  <td>
                    <div class="name-cell">
                      <strong>{{ item.learnerName }}</strong>
                      <span>ID {{ item.learnerId }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="name-cell">
                      <strong>L{{ item.currentCppLevel }}</strong>
                      <span>{{ item.currentCppLevelTitle || '未匹配标题' }}</span>
                    </div>
                  </td>
                  <td>{{ item.completedChaptersCount }} / {{ item.totalChapters }}</td>
                  <td>{{ item.completionRate }}%</td>
                  <td>{{ item.startedLevelCount }}</td>
                  <td>{{ item.completedLevelCount }}</td>
                  <td>{{ item.startedTopicCount }} / {{ item.totalTopicCount }}</td>
                  <td>
                    <div class="risk-list">
                      <span v-if="!item.riskFlags.length" class="risk-pill safe">稳定</span>
                      <span v-for="flag in item.riskFlags" :key="flag" class="risk-pill">{{ flag }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="link-btn" @click="openCourseDetail(item)">详情</button>
                      <button class="link-btn danger" @click="unfollowLearner(item)">取消</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>

    <section v-if="activeTab === 'quiz' && quizDetail.learner" class="panel detail-panel">
      <div class="panel-header detail-header">
        <div>
          <h3>{{ quizDetail.learner.learnerName }} 的 Quiz 明细</h3>
          <p>错题本 {{ quizDetail.learner.wrongbookActiveCount }} 题，收藏 {{ quizDetail.learner.favoriteActiveCount }} 题</p>
        </div>
        <button class="btn-secondary" @click="quizDetail = createEmptyQuizDetail()">关闭</button>
      </div>

      <div v-if="quizDetailLoading" class="empty-state">正在加载明细...</div>
      <template v-else>
        <div class="detail-grid">
          <div class="mini-panel">
            <h4>最近打卡</h4>
            <div v-if="quizDetail.recentProgress.length === 0" class="empty-state small">暂无记录</div>
            <div v-else class="progress-list">
              <div v-for="item in quizDetail.recentProgress" :key="item.date" class="progress-row">
                <span>{{ item.date }}</span>
                <span>{{ item.answeredCount }} 题 / {{ item.correctCount }} 对</span>
                <span>{{ item.completed ? '完成' : '未完成' }}</span>
              </div>
            </div>
          </div>

          <div class="mini-panel">
            <h4>薄弱知识点</h4>
            <div v-if="quizDetail.weakTags.length === 0" class="empty-state small">近 {{ detailDays }} 天没有明显薄弱点</div>
            <div v-else class="tag-list">
              <span v-for="tag in quizDetail.weakTags" :key="tag.tag" class="tag-pill">{{ tag.tag }} · {{ tag.wrongCount }}</span>
            </div>
          </div>
        </div>

        <div class="mini-panel attempts-panel">
          <h4>最近作答</h4>
          <div v-if="quizDetail.recentAttempts.length === 0" class="empty-state small">暂无作答记录</div>
          <div v-else class="attempt-list">
            <article v-for="attempt in quizDetail.recentAttempts" :key="`${attempt.questionUid}-${attempt.answeredAt}`" class="attempt-item">
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

    <section v-if="activeTab === 'course' && courseDetail.learner" class="panel detail-panel">
      <div class="panel-header detail-header">
        <div>
          <h3>{{ courseDetail.learner.learnerName }} 的 Course 明细</h3>
          <p>当前 C++ 等级 L{{ courseDetail.learner.currentCppLevel }}，总完成率 {{ courseDetail.learner.completionRate }}%</p>
        </div>
        <button class="btn-secondary" @click="courseDetail = createEmptyCourseDetail()">关闭</button>
      </div>

      <div v-if="courseDetailLoading" class="empty-state">正在加载明细...</div>
      <template v-else>
        <div class="detail-grid course-summary-grid">
          <div class="mini-panel">
            <h4>课程总览</h4>
            <div class="progress-list">
              <div class="progress-row"><span>当前等级</span><span>L{{ courseDetail.learner.currentCppLevel }} {{ courseDetail.learner.currentCppLevelTitle || '' }}</span></div>
              <div class="progress-row"><span>已完成章节</span><span>{{ courseDetail.learner.completedChaptersCount }} / {{ courseDetail.learner.totalChapters }}</span></div>
              <div class="progress-row"><span>已开始 Level</span><span>{{ courseDetail.learner.startedLevelCount }}</span></div>
              <div class="progress-row"><span>已完成 Level</span><span>{{ courseDetail.learner.completedLevelCount }}</span></div>
              <div class="progress-row"><span>已开始 Topic</span><span>{{ courseDetail.learner.startedTopicCount }} / {{ courseDetail.learner.totalTopicCount }}</span></div>
            </div>
          </div>

          <div class="mini-panel">
            <h4>学科学级</h4>
            <div class="tag-list">
              <span v-for="(level, subject) in courseDetail.learner.subjectLevels" :key="subject" class="tag-pill">{{ subject }} · L{{ level }}</span>
            </div>
          </div>
        </div>

        <div class="mini-panel attempts-panel">
          <h4>各 Level 完成情况</h4>
          <div v-if="courseDetail.levels.length === 0" class="empty-state small">暂无课程进度</div>
          <div v-else class="course-level-list">
            <article v-for="level in courseDetail.levels" :key="level.levelId" class="course-level-item">
              <div class="course-level-head">
                <div>
                  <strong>{{ level.subject }} · L{{ level.level }} · {{ level.title }}</strong>
                  <p>{{ level.group || '未分组' }}</p>
                </div>
                <span>{{ level.completedChapters }} / {{ level.totalChapters }} · {{ level.completionRate }}%</span>
              </div>
              <div class="course-progress-bar">
                <div class="course-progress-fill" :style="{ width: `${level.completionRate}%` }"></div>
              </div>
              <div class="tag-list level-topic-list">
                <span v-for="topic in level.topics" :key="topic.topicId" class="tag-pill topic-pill">{{ topic.title }} {{ topic.completedCount }}/{{ topic.totalCount }}</span>
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

function createEmptyQuizDashboard() {
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

function createEmptyCourseDashboard() {
  return {
    summary: {
      followedCount: 0,
      startedLearnerCount: 0,
      averageCompletionRate: 0,
      averageCompletedChapters: 0,
      averageCurrentCppLevel: 0
    },
    items: []
  }
}

function createEmptyQuizDetail() {
  return {
    learner: null,
    recentProgress: [],
    recentAttempts: [],
    weakTags: []
  }
}

function createEmptyCourseDetail() {
  return {
    learner: null,
    levels: []
  }
}

export default {
  name: 'TeacherQuizDashboard',
  inject: ['showToastMessage'],
  data() {
    return {
      activeTab: 'quiz',
      levels: [],
      selectedGroup: '',
      selectedLevelId: '',
      selectedTopicId: '',
      candidateQuery: '',
      candidates: [],
      candidateLoading: false,
      selectedDays: 7,
      quizDashboard: createEmptyQuizDashboard(),
      quizDashboardLoading: false,
      courseDashboard: createEmptyCourseDashboard(),
      courseDashboardLoading: false,
      followSavingId: null,
      quizDetail: createEmptyQuizDetail(),
      quizDetailLoading: false,
      courseDetail: createEmptyCourseDetail(),
      courseDetailLoading: false,
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
      return new Set([
        ...this.quizDashboard.items.map((item) => Number(item.learnerId)),
        ...this.courseDashboard.items.map((item) => Number(item.learnerId))
      ])
    },
    filteredCandidates() {
      const keyword = this.candidateQuery.trim().toLowerCase()
      if (!keyword) return this.candidates
      return this.candidates.filter((item) => String(item.uname || '').toLowerCase().includes(keyword))
    },
    sortedQuizItems() {
      return [...this.quizDashboard.items].sort((a, b) => {
        if (a.riskFlags.length !== b.riskFlags.length) return b.riskFlags.length - a.riskFlags.length
        if ((a.todayAnsweredCount || 0) !== (b.todayAnsweredCount || 0)) return (a.todayAnsweredCount || 0) - (b.todayAnsweredCount || 0)
        return (a.answeredCount || 0) - (b.answeredCount || 0)
      })
    },
    sortedCourseItems() {
      return [...this.courseDashboard.items].sort((a, b) => {
        if (a.riskFlags.length !== b.riskFlags.length) return b.riskFlags.length - a.riskFlags.length
        if ((a.completionRate || 0) !== (b.completionRate || 0)) return (a.completionRate || 0) - (b.completionRate || 0)
        return (a.completedChaptersCount || 0) - (b.completedChaptersCount || 0)
      })
    }
  },
  async mounted() {
    await Promise.all([this.loadLevels(), this.loadQuizDashboard(), this.loadCourseDashboard()])
  },
  methods: {
    createEmptyQuizDetail,
    createEmptyCourseDetail,
    async loadLevels() {
      try {
        const data = await request('/api/course/levels')
        this.levels = Array.isArray(data) ? data : []
      } catch (e) {
        this.showToastMessage(`加载课程失败: ${e.message}`)
      }
    },
    async loadQuizDashboard() {
      this.quizDashboardLoading = true
      try {
        const data = await request(`/api/quiz/teacher/follows?days=${this.selectedDays}`)
        this.quizDashboard = {
          summary: data?.summary || createEmptyQuizDashboard().summary,
          items: Array.isArray(data?.items) ? data.items : []
        }
      } catch (e) {
        this.showToastMessage(`加载 Quiz 看板失败: ${e.message}`)
      } finally {
        this.quizDashboardLoading = false
      }
    },
    async loadCourseDashboard() {
      this.courseDashboardLoading = true
      try {
        const data = await request('/api/course/teacher/follows')
        this.courseDashboard = {
          summary: data?.summary || createEmptyCourseDashboard().summary,
          items: Array.isArray(data?.items) ? data.items : []
        }
      } catch (e) {
        this.showToastMessage(`加载 Course 看板失败: ${e.message}`)
      } finally {
        this.courseDashboardLoading = false
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
        await Promise.all([this.loadQuizDashboard(), this.loadCourseDashboard()])
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
        if (Number(this.quizDetail.learner?.learnerId) === learnerId) {
          this.quizDetail = createEmptyQuizDetail()
        }
        if (Number(this.courseDetail.learner?.learnerId) === learnerId) {
          this.courseDetail = createEmptyCourseDetail()
        }
        await Promise.all([this.loadQuizDashboard(), this.loadCourseDashboard()])
        this.showToastMessage(`已取消关注 ${learner.uname || learner.learnerName}`)
      } catch (e) {
        this.showToastMessage(`取消关注失败: ${e.message}`)
      } finally {
        this.followSavingId = null
      }
    },
    async openQuizDetail(item) {
      this.quizDetailLoading = true
      this.quizDetail = createEmptyQuizDetail()
      try {
        const data = await request(`/api/quiz/teacher/follows/${item.learnerId}/detail?days=${this.detailDays}`)
        this.quizDetail = {
          learner: data?.learner || null,
          recentProgress: Array.isArray(data?.recentProgress) ? data.recentProgress : [],
          recentAttempts: Array.isArray(data?.recentAttempts) ? data.recentAttempts : [],
          weakTags: Array.isArray(data?.weakTags) ? data.weakTags : []
        }
      } catch (e) {
        this.showToastMessage(`加载 Quiz 详情失败: ${e.message}`)
      } finally {
        this.quizDetailLoading = false
      }
    },
    async openCourseDetail(item) {
      this.courseDetailLoading = true
      this.courseDetail = createEmptyCourseDetail()
      try {
        const data = await request(`/api/course/teacher/follows/${item.learnerId}/detail`)
        this.courseDetail = {
          learner: data?.learner || null,
          levels: Array.isArray(data?.levels) ? data.levels : []
        }
      } catch (e) {
        this.showToastMessage(`加载 Course 详情失败: ${e.message}`)
      } finally {
        this.courseDetailLoading = false
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

.hero-actions {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.tab-switch {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: #eaf1f8;
  gap: 4px;
}

.tab-btn {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  color: #486175;
  font-weight: 600;
}

.tab-btn.active {
  background: #0f62fe;
  color: #fff;
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
.mini-panel p,
.course-level-head p {
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
.progress-list,
.course-level-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.candidate-item,
.attempt-item,
.progress-row,
.course-level-item {
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
.row-actions,
.level-topic-list {
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

.topic-pill {
  background: #eef5ff;
  color: #1f4e8c;
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

.course-summary-grid {
  grid-template-columns: 1.1fr 1fr;
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

.attempt-head,
.course-level-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.course-progress-bar {
  margin: 12px 0;
  height: 8px;
  border-radius: 999px;
  background: #deebfb;
  overflow: hidden;
}

.course-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #0f62fe, #37a6ff);
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

  .hero-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
