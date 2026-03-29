<template>
  <div class="teacher-quiz-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">学员学习看板</p>
        <h2>{{ activeTab === 'quiz' ? 'Quiz 学习看板' : 'Course 学习看板' }}</h2>
        <p class="hero-copy">
          {{ activeTab === 'quiz'
            ? '先关注自己的学员，再按最近 7 天或 30 天查看答题活跃度、正确率、错题堆积和最近作答明细。'
            : '沿用同一批关注学员，直接查看课程完成率、当前等级、已开始 Level 与 Topic 分布。' }}
        </p>
      </div>
      <div class="hero-actions">
        <div class="tab-switch">
          <button :class="['tab-btn', activeTab === 'course' ? 'active' : '']" @click="activeTab = 'course'">Course</button>
          <button :class="['tab-btn', activeTab === 'quiz' ? 'active' : '']" @click="activeTab = 'quiz'">Quiz</button>
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
        <span class="summary-label">近 14 天活跃</span>
        <strong class="summary-value">{{ courseDashboard.summary.activeLearnerCount }}</strong>
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
            <p>既可以按课程层级筛学员，也可以直接搜索只参加 Quiz 的学员。</p>
          </div>
        </div>

        <div class="candidate-search-panel">
          <div class="candidate-search-head">
            <strong>直接搜索 Quiz 学员</strong>
            <p>适用于还没参加 Course、但已经在做 Quiz 的学员。支持学员名或 ID。</p>
          </div>
          <div class="candidate-search-row">
            <label class="search-box quiz-search-box">
              <span>Quiz 学员搜索</span>
              <input v-model.trim="quizCandidateQuery" type="text" placeholder="输入学员名或 ID" @keyup.enter="searchQuizCandidates" />
            </label>
            <button class="btn-primary" :disabled="quizCandidateLoading || !quizCandidateQuery.trim()" @click="searchQuizCandidates">{{ quizCandidateLoading ? '搜索中...' : '搜索' }}</button>
          </div>
          <div v-if="quizCandidateLoading" class="empty-state small">正在搜索 Quiz 学员...</div>
          <div v-else-if="quizCandidateSearched && quizCandidates.length === 0" class="empty-state small">没有找到符合条件的 Quiz 学员。</div>
          <div v-else-if="quizCandidates.length > 0" class="candidate-list candidate-list-compact">
            <article v-for="learner in quizCandidates" :key="learner.learnerId" class="candidate-item">
              <div>
                <strong>{{ learner.learnerName }}</strong>
                <p>Quiz 共答 {{ learner.answeredCount || 0 }} 题 · 正确率 {{ learner.accuracy || 0 }}%<span v-if="learner.lastAnsweredAt"> · 最近作答 {{ formatDateTime(learner.lastAnsweredAt) }}</span></p>
              </div>
              <button
                v-if="!followedIdSet.has(Number(learner.learnerId))"
                class="btn-primary"
                :disabled="followSavingId === Number(learner.learnerId)"
                @click="followLearner(learner)"
              >
                {{ followSavingId === Number(learner.learnerId) ? '添加中...' : '关注' }}
              </button>
              <button
                v-else
                class="btn-secondary"
                :disabled="followSavingId === Number(learner.learnerId)"
                @click="unfollowLearner(learner)"
              >
                {{ followSavingId === Number(learner.learnerId) ? '处理中...' : '取消关注' }}
              </button>
            </article>
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
              <p>课程完成章节：{{ learner.completedCount || 0 }} · 已做 {{ learner.solvedProblemCount || 0 }} 题</p>
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
            <p>{{ activeTab === 'quiz' ? '按风险优先看最近掉队的孩子。' : '列表里直接设当前 Level，学员日报作为统一查看入口。' }}</p>
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
                      <span v-if="activeParentShare(item.learnerId)">已开启家长日报</span>
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
                      <button class="link-btn" :disabled="parentShareLoadingId === item.learnerId" @click="openParentReport(item)">{{ parentShareLoadingId === item.learnerId ? '处理中...' : '学员日报' }}</button>
                      <button v-if="activeParentShare(item.learnerId)" class="link-btn" :disabled="parentShareLoadingId === item.learnerId" @click="copyParentShare(item)">复制链接</button>
                      <button v-if="activeParentShare(item.learnerId)" class="link-btn danger-soft" :disabled="parentShareClosingId === item.learnerId" @click="closeParentShare(item)">{{ parentShareClosingId === item.learnerId ? '关闭中...' : '关闭链接' }}</button>
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
                  <th>近 14 天活跃</th>
                  <th>已开始 Level</th>
                  <th>最近学习</th>
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
                      <span v-if="activeParentShare(item.learnerId)">已开启家长日报</span>
                    </div>
                  </td>
                  <td>
                    <div class="name-cell course-level-cell">
                      <strong>L{{ item.currentCppLevel }}</strong>
                      <span>{{ item.currentCppLevelTitle || '未匹配标题' }}</span>
                      <span v-if="item.currentCppLevelSource === 'manual'">老师设定</span>
                      <div class="inline-level-editor">
                        <select :value="getCourseRowDraft(item)" :disabled="courseRowSavingId === item.learnerId" @change="updateCourseRowDraft(item.learnerId, $event.target.value)">
                          <option v-for="option in cppLevelOptions" :key="`row-${item.learnerId}-${option.level}`" :value="option.level">L{{ option.level }}</option>
                        </select>
                        <button class="btn-primary compact-btn" :disabled="courseRowSavingId === item.learnerId || Number(getCourseRowDraft(item)) === Number(item.currentCppLevel)" @click="saveCourseRowLevel(item)">
                          {{ courseRowSavingId === item.learnerId ? '保存中...' : '保存' }}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>{{ item.completedChaptersCount }} / {{ item.totalChapters }}</td>
                  <td>{{ item.completionRate }}%</td>
                  <td>{{ item.activeDays }} 天 / 完成 {{ item.recentCompletedCount }} 节</td>
                  <td>{{ item.startedLevelCount }}</td>
                  <td>{{ formatDateTime(item.lastActivityAt) }}</td>
                  <td>{{ item.startedTopicCount }} / {{ item.totalTopicCount }}</td>
                  <td>
                    <div class="risk-list">
                      <span v-if="!item.riskFlags.length" class="risk-pill safe">稳定</span>
                      <span v-for="flag in item.riskFlags" :key="flag" class="risk-pill">{{ flag }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="link-btn" :disabled="parentShareLoadingId === item.learnerId" @click="openParentReport(item)">{{ parentShareLoadingId === item.learnerId ? '处理中...' : '学员日报' }}</button>
                      <button v-if="activeParentShare(item.learnerId)" class="link-btn" :disabled="parentShareLoadingId === item.learnerId" @click="copyParentShare(item)">复制链接</button>
                      <button v-if="activeParentShare(item.learnerId)" class="link-btn danger-soft" :disabled="parentShareClosingId === item.learnerId" @click="closeParentShare(item)">{{ parentShareClosingId === item.learnerId ? '关闭中...' : '关闭链接' }}</button>
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
      activeLearnerCount: 0,
      averageCompletionRate: 0,
      averageCompletedChapters: 0,
      averageCurrentCppLevel: 0
    },
    items: []
  }
}

export default {
  name: 'TeacherQuizDashboard',
  inject: ['showToastMessage'],
  data() {
    return {
      activeTab: 'course',
      levels: [],
      selectedGroup: '',
      selectedLevelId: '',
      selectedTopicId: '',
      candidateQuery: '',
      quizCandidateQuery: '',
      candidates: [],
      quizCandidates: [],
      candidateLoading: false,
      quizCandidateLoading: false,
      quizCandidateSearched: false,
      selectedDays: 7,
      quizDashboard: createEmptyQuizDashboard(),
      quizDashboardLoading: false,
      courseDashboard: createEmptyCourseDashboard(),
      courseDashboardLoading: false,
      followSavingId: null,
      courseRowSavingId: null,
      courseRowLevelDrafts: {},
      parentShareLoadingId: null,
      parentShareClosingId: null,
      parentShares: [],
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
    cppLevelOptions() {
      const map = new Map()
      for (const item of this.levels) {
        const text = [item?.subject, item?.group, item?.title].filter(Boolean).join(' ')
        if (!text.includes('C++') && item?.subject) continue
        const level = Number(item?.level || 0)
        if (!level || map.has(level)) continue
        map.set(level, {
          level,
          title: item?.title || ''
        })
      }
      if (!map.size) {
        for (let level = 1; level <= 10; level += 1) {
          map.set(level, { level, title: '' })
        }
      }
      return [...map.values()].sort((a, b) => a.level - b.level)
    },
    sortedQuizItems() {
      return [...this.quizDashboard.items].sort((a, b) => {
        if (a.riskFlags.length !== b.riskFlags.length) return b.riskFlags.length - a.riskFlags.length
        return Number(a.learnerId || 0) - Number(b.learnerId || 0)
      })
    },
    sortedCourseItems() {
      return [...this.courseDashboard.items].sort((a, b) => {
        if (a.riskFlags.length !== b.riskFlags.length) return b.riskFlags.length - a.riskFlags.length
        return Number(a.learnerId || 0) - Number(b.learnerId || 0)
      })
    }
  },
  async mounted() {
    await Promise.all([this.loadLevels(), this.loadQuizDashboard(), this.loadCourseDashboard(), this.loadParentShares()])
  },
  methods: {
    activeParentShare(learnerId) {
      const targetId = Number(learnerId)
      return this.parentShares.find((item) => Number(item.learnerId) === targetId && item.isActive && !item.isExpired) || null
    },
    syncCourseRowDrafts(items = []) {
      const nextDrafts = {}
      for (const item of Array.isArray(items) ? items : []) {
        const learnerId = Number(item?.learnerId)
        if (!learnerId) continue
        nextDrafts[learnerId] = Number(item?.currentCppLevel || 1)
      }
      this.courseRowLevelDrafts = nextDrafts
    },
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
        const data = await request(`/api/course/teacher/follows?t=${Date.now()}`)
        this.courseDashboard = {
          summary: data?.summary || createEmptyCourseDashboard().summary,
          items: Array.isArray(data?.items) ? data.items : []
        }
        this.syncCourseRowDrafts(this.courseDashboard.items)
      } catch (e) {
        this.showToastMessage(`加载 Course 看板失败: ${e.message}`)
      } finally {
        this.courseDashboardLoading = false
      }
    },
    async loadParentShares() {
      try {
        const data = await request('/api/parent-report/shares')
        this.parentShares = Array.isArray(data?.items) ? data.items : []
      } catch (e) {
        this.showToastMessage(`加载家长日报链接失败: ${e.message}`)
        this.parentShares = []
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
    async searchQuizCandidates() {
      const keyword = this.quizCandidateQuery.trim()
      if (!keyword) {
        this.quizCandidates = []
        this.quizCandidateSearched = false
        return
      }

      this.quizCandidateLoading = true
      this.quizCandidateSearched = true
      try {
        const data = await request(`/api/quiz/teacher/follow-candidates?q=${encodeURIComponent(keyword)}`)
        this.quizCandidates = Array.isArray(data?.items) ? data.items : []
      } catch (e) {
        this.showToastMessage(`搜索 Quiz 学员失败: ${e.message}`)
        this.quizCandidates = []
      } finally {
        this.quizCandidateLoading = false
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
        await Promise.all([this.loadQuizDashboard(), this.loadCourseDashboard(), this.loadParentShares()])
        this.showToastMessage(`已取消关注 ${learner.uname || learner.learnerName}`)
      } catch (e) {
        this.showToastMessage(`取消关注失败: ${e.message}`)
      } finally {
        this.followSavingId = null
      }
    },
    async ensureParentShare(item) {
      const learnerId = Number(item._id || item.learnerId)
      if (!learnerId) return ''
      const existing = this.activeParentShare(learnerId)?.publicUrl || ''
      if (existing) return existing

      try {
        const data = await request.post('/api/parent-report/shares', { learnerId })
        const shareUrl = data?.publicUrl || ''
        await this.loadParentShares()
        return shareUrl
      } catch (e) {
        this.showToastMessage(`生成家长日报失败: ${e.message}`)
        return ''
      }
    },
    async openParentReport(item) {
      const learnerId = Number(item._id || item.learnerId)
      if (!learnerId) return
      this.parentShareLoadingId = learnerId
      try {
        const shareUrl = await this.ensureParentShare(item)
        if (!shareUrl) return
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
      } finally {
        this.parentShareLoadingId = null
      }
    },
    async copyParentShare(item) {
      const learnerId = Number(item._id || item.learnerId)
      if (!learnerId) return
      this.parentShareLoadingId = learnerId
      try {
        const shareUrl = await this.ensureParentShare(item)
        if (!shareUrl) return
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl)
          this.showToastMessage('学员日报链接已复制')
        } else {
          this.showToastMessage(`学员日报链接：${shareUrl}`)
        }
      } finally {
        this.parentShareLoadingId = null
      }
    },
    async closeParentShare(item) {
      const learnerId = Number(item._id || item.learnerId)
      if (!learnerId) return
      this.parentShareClosingId = learnerId
      try {
        await request.delete(`/api/parent-report/shares/${learnerId}`)
        await this.loadParentShares()
        this.showToastMessage('家长日报链接已关闭')
      } catch (e) {
        this.showToastMessage(`关闭家长日报失败: ${e.message}`)
      } finally {
        this.parentShareClosingId = null
      }
    },
    getCourseRowDraft(item) {
      const learnerId = Number(item?.learnerId)
      const draft = this.courseRowLevelDrafts[learnerId]
      return Number.isFinite(Number(draft)) && Number(draft) > 0 ? Number(draft) : Number(item?.currentCppLevel || 1)
    },
    updateCourseRowDraft(learnerId, level) {
      const targetId = Number(learnerId)
      const nextLevel = Number(level)
      this.courseRowLevelDrafts = {
        ...this.courseRowLevelDrafts,
        [targetId]: nextLevel
      }
    },
    async saveCourseRowLevel(item) {
      const learnerId = Number(item?.learnerId)
      const level = Number(this.getCourseRowDraft(item))
      if (!learnerId || !Number.isInteger(level)) return

      this.courseRowSavingId = learnerId
      try {
        const levelOption = this.cppLevelOptions.find((option) => Number(option.level) === level) || null
        const data = await request.put(`/api/course/teacher/follows/${learnerId}/current-level`, { level })
        const learner = data?.learner || null
        this.courseDashboard = {
          ...this.courseDashboard,
          items: this.courseDashboard.items.map((entry) => (
            Number(entry?.learnerId) === learnerId
              ? {
                ...entry,
                currentCppLevel: level,
                currentCppLevelTitle: levelOption?.title || learner?.currentCppLevelTitle || entry?.currentCppLevelTitle || '',
                currentCppLevelSource: 'manual',
                ...(learner || {}),
                learnerId
              }
              : entry
          ))
        }
        this.updateCourseRowDraft(learnerId, learner?.currentCppLevel || level)
        await this.loadCourseDashboard()
        this.showToastMessage(`已将当前 C++ 等级设置为 L${level}`)
      } catch (e) {
        this.showToastMessage(`设置当前等级失败: ${e.message}`)
      } finally {
        this.courseRowSavingId = null
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
    },
    formatCourseAction(value) {
      if (value === 'view_chapter') return '查看章节'
      if (value === 'complete_chapter') return '完成章节'
      if (value === 'pass_problem') return '通过题目'
      return value || '学习行为'
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

.detail-hint {
  font-size: 13px;
  color: #506173;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.candidate-search-panel {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid #dbe4ed;
  border-radius: 14px;
  background: #f8fbff;
}

.candidate-search-head p {
  margin: 6px 0 0;
  color: #647587;
}

.candidate-search-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 12px;
}

.quiz-search-box {
  flex: 1;
  margin-bottom: 0;
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

.candidate-list-compact {
  margin-top: 12px;
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

.level-setting-row {
  align-items: center;
}

.level-setting-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-setting-controls select {
  min-width: 190px;
  border: 1px solid #c9d5e3;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
}

.compact-btn {
  padding: 8px 14px;
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

.course-level-cell {
  min-width: 180px;
}

.inline-level-editor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.inline-level-editor select {
  min-width: 84px;
  border: 1px solid #c9d5e3;
  border-radius: 10px;
  padding: 7px 10px;
  font-size: 13px;
  background: #fff;
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

.link-btn.danger-soft {
  color: #b45309;
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

  .candidate-search-row {
    flex-direction: column;
    align-items: stretch;
  }

  .inline-level-editor {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
