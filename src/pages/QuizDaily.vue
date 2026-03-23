<template>
  <div class="quiz-daily-page">
    <section class="hero-panel" :class="{ collapsed: isMobileView && heroCollapsed }">
      <div class="hero-summary-row">
        <div class="hero-summary-main">
          <strong>客观题日刷</strong>
          <span>{{ progress.correctCount }}/{{ progress.answeredCount }} · 连续 {{ progress.streak }} 天</span>
        </div>
        <button v-if="isMobileView" class="collapse-toggle" type="button" @click="heroCollapsed = !heroCollapsed">
          {{ heroCollapsed ? '展开' : '收起' }}
        </button>
      </div>
      <div v-show="!isMobileView || !heroCollapsed" class="hero-content">
        <div class="hero-copy">
          <p class="eyebrow">GESP 客观题</p>
          <h1>每日打卡，按记忆曲线刷题</h1>
          <p class="hero-text">系统会结合你的答题记录智能推荐：做错过的题更常出现，做对的题会适当降频，隔一段时间再安排复习。</p>
        </div>
        <div class="hero-stats">
          <div class="stat-card">
            <span class="stat-label">今日进度</span>
            <strong>{{ progress.answeredCount }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">答对</span>
            <strong>{{ progress.correctCount }}</strong>
          </div>
          <div class="stat-card accent">
            <span class="stat-label">连续打卡</span>
            <strong>{{ progress.streak }}</strong>
          </div>
        </div>
      </div>
    </section>

    <div class="page-grid">
      <section class="main-panel">
        <div class="toolbar">
          <div>
            <p class="toolbar-label">今日日期</p>
            <h2>{{ currentDateText }}</h2>
          </div>
          <div class="toolbar-actions">
            <div class="mode-switch">
              <button class="mode-button" :class="{ active: activeMode === 'daily' }" :disabled="loading || submitting" @click="switchToDailyMode">今日刷题</button>
              <button v-if="isLoggedIn" class="mode-button" :class="{ active: activeMode === 'wrongbook' }" :disabled="loading || submitting || wrongbook.length === 0" @click="switchToWrongbookMode">错题重做</button>
              <button v-if="isLoggedIn" class="mode-button" :class="{ active: activeMode === 'favorite' }" :disabled="loading || submitting || favorites.length === 0" @click="switchToFavoriteMode">收藏夹</button>
            </div>
            <label class="filter-field">
              <span>级别</span>
              <select v-model="selectedLevelTag" :disabled="loading || submitting" @change="handleLevelChange">
                <option value="">全部级别</option>
                <option v-for="item in levelOptions" :key="item.value" :value="item.value">
                  {{ item.label }}（{{ item.count }}）
                </option>
              </select>
            </label>
            <label class="filter-field">
              <span>知识点</span>
              <select v-model="selectedKnowledgeTag" :disabled="loading || submitting" @change="handleLevelChange">
                <option value="">全部知识点</option>
                <option v-for="item in knowledgeTagOptions" :key="item.value" :value="item.value">
                  {{ item.label }}（{{ item.count }}）
                </option>
              </select>
            </label>
            <button class="btn-refresh" :disabled="loading || submitting" @click="refreshAll">
              {{ loading ? '加载中...' : '刷新题目' }}
            </button>
          </div>
        </div>

        <div v-if="!isLoggedIn" class="guest-limit-banner" :class="{ exhausted: guestLimitReached }">
          <div>
            <strong>游客模式：每天可体验 5 题</strong>
            <p>
              <span v-if="guestLimitReached">今日 5 题已完成。现在登录即可继续下一题，并自动保存错题本、收藏夹和打卡记录。</span>
              <span v-else>今天已做 {{ progress.answeredCount }} 题，还可体验 {{ guestRemainingCount }} 题。登录后可继续不限量刷题。</span>
            </p>
          </div>
          <button class="btn-login-continue" type="button" @click="goToLogin">
            {{ guestLimitReached ? '登录后继续刷题' : '登录解锁完整练习' }}
          </button>
        </div>

        <div v-if="loading" class="state-card">正在加载今日题目...</div>
        <div v-else-if="error" class="state-card error">{{ error }}</div>

        <template v-else>
          <div v-if="question" ref="questionCardRef" class="question-card">
            <div class="question-meta">
              <span class="meta-chip">{{ question.levelTag || '未分级' }}</span>
              <span class="meta-chip">{{ question.type === 'judge' ? '判断题' : '单选题' }}</span>
              <span v-for="tag in question.tags || []" :key="tag" class="meta-chip knowledge-chip">{{ tag }}</span>
              <span v-if="question.sourceTitle" class="meta-source">{{ question.sourceTitle }}</span>
            </div>

            <div v-if="activeMode === 'daily' && question.recommendationReason?.text" class="recommendation-reason">
              <span class="recommendation-label">智能推荐</span>
              <p>{{ question.recommendationReason.text }}</p>
            </div>

            <div class="question-body">
              <MarkdownViewer :content="question.stem" />
            </div>

            <div class="question-actions-bar">
              <button v-if="activeMode === 'daily' && !result" class="btn-secondary" :disabled="submitting || loading" @click="skipCurrentQuestion">跳过这题</button>
              <button v-if="isLoggedIn" class="btn-secondary" :class="{ active: question.isFavorite }" :disabled="submitting || favoriteSubmitting" @click="toggleFavoriteCurrentQuestion">
                {{ question.isFavorite ? '取消收藏' : '加入收藏夹' }}
              </button>
              <button v-if="isLoggedIn" class="btn-secondary btn-report-issue" :class="{ active: issuePanelOpen }" :disabled="submitting || issueSubmitting" @click="toggleIssuePanel">
                {{ issueState.reported ? '已标记题目问题' : '题目有问题' }}
              </button>
            </div>

            <div v-if="isLoggedIn && issuePanelOpen" class="issue-panel-card">
              <div class="issue-panel-header">
                <strong>标记问题题目</strong>
                <span v-if="issueState.reported" class="issue-state-chip">当前状态：{{ issueStatusLabel }}</span>
              </div>
              <p class="issue-panel-copy">学员标记后，管理员可以在后台查看、备注并手动停用这道题。</p>
              <div class="issue-form-grid">
                <label class="issue-field">
                  <span>问题类型</span>
                  <select v-model="issueType" :disabled="issueSubmitting">
                    <option v-for="item in issueTypeOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                </label>
                <label class="issue-field full">
                  <span>补充说明</span>
                  <textarea
                    v-model="issueDetail"
                    :disabled="issueSubmitting"
                    maxlength="300"
                    rows="3"
                    placeholder="例如：答案与题干不一致、选项缺字、题目排版错乱、这题像是多选题等"
                  ></textarea>
                </label>
              </div>
              <div class="issue-panel-actions">
                <span class="issue-length">{{ issueDetail.length }}/300</span>
                <button class="btn-mini" type="button" :disabled="issueSubmitting" @click="issuePanelOpen = false">取消</button>
                <button class="btn-mini primary" type="button" :disabled="issueSubmitting" @click="submitIssueReport">
                  {{ issueSubmitting ? '提交中...' : (issueState.reported ? '更新标记' : '提交标记') }}
                </button>
              </div>
            </div>

            <div class="options-list">
              <button
                v-for="option in question.options"
                :key="option.key"
                class="option-button"
                :class="optionClass(option.key)"
                :disabled="submitting || !!result"
                @click="selectedAnswer = option.key"
              >
                <span class="option-key">{{ optionLabel(option.key) }}</span>
                <div class="option-text">
                  <MarkdownViewer :content="option.text" :inline="true" />
                </div>
              </button>
            </div>

            <div v-if="!result" class="submit-row">
              <button class="btn-submit" :disabled="!selectedAnswer || submitting" @click="submitAnswer">
                {{ submitting ? '提交中...' : activeMode === 'wrongbook' ? '提交错题本答案' : activeMode === 'favorite' ? '提交收藏题答案' : '提交答案' }}
              </button>
            </div>

            <div v-if="result" class="result-panel" :class="result.correct ? 'correct' : 'wrong'">
              <div class="result-title-row">
                <h3>{{ result.correct ? '回答正确' : '回答错误' }}</h3>
                <div class="result-top-actions">
                  <span class="answer-pill">正确答案：{{ optionLabel(result.correctAnswer) }}</span>
                  <button class="btn-next btn-next-inline" :class="{ 'is-login-cta': guestLimitReached }" :disabled="loading" @click="guestLimitReached ? goToLogin() : goToNextQuestion()">
                    {{ guestLimitReached ? '登录后继续刷题' : activeMode === 'wrongbook' ? '下一道错题' : activeMode === 'favorite' ? '下一道收藏题' : '再来一题' }}
                  </button>
                </div>
              </div>
              <p class="result-copy">
                {{ resultCopy }}
              </p>
              <div v-if="result.explanation" class="explanation-box">
                <h4>题目解析</h4>
                <MarkdownViewer :content="result.explanation" />
              </div>
            </div>
          </div>

          <div v-else class="state-card success" :class="{ 'guest-limit-card': guestLimitReached }">
            <h3>{{ emptyStateTitle }}</h3>
            <p>{{ emptyStateCopy }}</p>
            <div v-if="guestLimitReached" class="guest-limit-actions">
              <button class="btn-submit guest-login-primary" type="button" @click="goToLogin">登录后继续刷题</button>
              <p class="guest-limit-tip">登录后自动解锁不限量刷题、错题本、收藏夹和每日打卡记录。</p>
            </div>
          </div>
        </template>
      </section>

      <aside class="side-panel">
        <div class="side-card progress-card">
          <div class="side-card-header">
            <h3>今日状态</h3>
            <div class="side-card-header-actions">
              <span class="status-badge" :class="progress.completed ? 'done' : 'pending'">
                {{ isLoggedIn ? (progress.completed ? '已打卡' : '未打卡') : (progress.completed ? '已体验完' : '可继续体验') }}
              </span>
              <button v-if="isMobileView" class="collapse-toggle small" type="button" @click="progressCollapsed = !progressCollapsed">
                {{ progressCollapsed ? '展开' : '收起' }}
              </button>
            </div>
          </div>
          <div v-show="!isMobileView || !progressCollapsed" class="progress-grid">
            <div>
              <span>已答题</span>
              <strong>{{ progress.answeredCount }}</strong>
            </div>
            <div>
              <span>答对数</span>
              <strong>{{ progress.correctCount }}</strong>
            </div>
            <div>
              <span>连续天数</span>
              <strong>{{ progress.streak }}</strong>
            </div>
          </div>
        </div>

        <div v-if="!isLoggedIn" class="side-card guest-side-card">
          <div class="side-card-header">
            <h3>登录后解锁</h3>
          </div>
          <ul class="guest-feature-list">
            <li>继续不限量刷题</li>
            <li>自动保存错题本</li>
            <li>收藏题目反复练习</li>
            <li>查看个人打卡记录</li>
          </ul>
          <button class="btn-login-continue full" type="button" @click="goToLogin">立即登录</button>
        </div>

        <div v-if="isLoggedIn" class="side-card">
          <div class="side-card-header">
            <h3>{{ leaderboardScope === 'overall' ? '总刷题榜' : '今日排行榜' }}</h3>
            <div class="side-card-header-actions">
              <span class="muted-text">Top 20</span>
              <button v-if="isMobileView" class="collapse-toggle small" type="button" @click="leaderboardCollapsed = !leaderboardCollapsed">
                {{ leaderboardCollapsed ? '展开' : '收起' }}
              </button>
            </div>
          </div>
          <template v-if="!isMobileView || !leaderboardCollapsed">
            <div class="leaderboard-scope-switch">
              <button class="scope-button" :class="{ active: leaderboardScope === 'today' }" :disabled="leaderboardLoading" @click="switchLeaderboardScope('today')">今日榜</button>
              <button class="scope-button" :class="{ active: leaderboardScope === 'overall' }" :disabled="leaderboardLoading" @click="switchLeaderboardScope('overall')">总刷题榜</button>
            </div>
            <div v-if="leaderboardLoading" class="small-state">加载中...</div>
            <div v-else-if="leaderboard.length === 0" class="small-state">{{ leaderboardEmptyText }}</div>
            <ul v-else class="leaderboard-list">
              <li v-for="(item, index) in leaderboard" :key="item.userId" class="leaderboard-item">
                <span class="rank">{{ index + 1 }}</span>
                <div class="leaderboard-meta">
                  <span class="name">{{ item.uname }}</span>
                  <span v-if="leaderboardScope === 'overall'" class="leaderboard-subline">答对 {{ item.correctCount }} 题 · 正确率 {{ formatLeaderboardAccuracy(item.accuracy) }}</span>
                </div>
                <span class="score">{{ leaderboardScope === 'overall' ? `${item.answeredCount} 题` : `${item.correctCount}/${item.answeredCount}` }}</span>
              </li>
            </ul>
          </template>
        </div>

        <div v-if="isLoggedIn" class="side-card">
          <div class="side-card-header">
            <h3>最近打卡</h3>
            <div class="side-card-header-actions">
              <span class="muted-text">最近 {{ history.length }} 天</span>
              <button v-if="isMobileView" class="collapse-toggle small" type="button" @click="historyCollapsed = !historyCollapsed">
                {{ historyCollapsed ? '展开' : '收起' }}
              </button>
            </div>
          </div>
          <template v-if="!isMobileView || !historyCollapsed">
            <div v-if="historyLoading" class="small-state">加载中...</div>
            <div v-else-if="history.length === 0" class="small-state">还没有历史记录</div>
            <ul v-else class="history-list">
              <li v-for="item in history" :key="item.date" class="history-item">
                <div>
                  <strong>{{ item.date }}</strong>
                  <p>{{ item.correctCount }}/{{ item.answeredCount }} 题</p>
                </div>
                <span class="status-badge" :class="item.completed ? 'done' : 'pending'">
                  {{ item.completed ? '完成' : '未完成' }}
                </span>
              </li>
            </ul>
          </template>
        </div>

        <div v-if="isLoggedIn" class="side-card favorite-card">
          <div class="side-card-header">
            <h3>收藏夹</h3>
            <div class="side-card-header-actions">
              <span class="muted-text">最近 {{ favorites.length }} 题</span>
              <button v-if="isMobileView" class="collapse-toggle small" type="button" @click="favoritesCollapsed = !favoritesCollapsed">
                {{ favoritesCollapsed ? '展开' : '收起' }}
              </button>
            </div>
          </div>
          <template v-if="!isMobileView || !favoritesCollapsed">
            <div v-if="favoritesLoading" class="small-state">加载中...</div>
            <div v-else-if="favorites.length === 0" class="small-state">暂时还没有收藏题</div>
            <ul v-else class="wrongbook-list">
              <li v-for="item in favorites" :key="item.questionUid" class="wrongbook-item favorite-item">
                <div class="wrongbook-head">
                  <span class="meta-chip small">{{ item.levelTag || '未分级' }}</span>
                  <span v-for="tag in item.tags || []" :key="`${item.questionUid}-${tag}`" class="meta-chip small knowledge-chip">{{ tag }}</span>
                </div>
                <p class="wrongbook-stem">{{ item.stem }}</p>
                <p class="favorite-time">收藏时间：{{ formatDateTime(item.collectedAt) }}</p>
                <div class="wrongbook-actions">
                  <button class="btn-mini primary" :disabled="submitting" @click="reviewFavoriteItem(item)">做这题</button>
                  <button class="btn-mini" :disabled="submitting" @click="toggleFavoriteByQuestionUid(item.questionUid, false)">移出收藏</button>
                </div>
              </li>
            </ul>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownViewer from '../components/MarkdownViewer.vue'
import request from '../utils/request'

const showToastMessage = inject('showToastMessage', () => {})
const QUIZ_LEVEL_STORAGE_KEY = 'quiz_daily_level_tag'
const QUIZ_KNOWLEDGE_STORAGE_KEY = 'quiz_daily_knowledge_tag'
const GUEST_DAILY_LIMIT = 5
const GUEST_PROGRESS_STORAGE_KEY = 'quiz_daily_guest_progress'
const router = useRouter()

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user_info')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getLocalDateString() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeGuestProgress(raw = {}, expectedDate = getLocalDateString()) {
  const date = typeof raw.date === 'string' && raw.date.trim() ? raw.date.trim() : expectedDate
  if (date !== expectedDate) {
    return {
      date: expectedDate,
      answeredCount: 0,
      correctCount: 0,
      streak: 0,
      completed: false,
      questionUids: [],
      skippedQuestionUids: []
    }
  }

  const questionUids = [...new Set((Array.isArray(raw.questionUids) ? raw.questionUids : []).map((item) => String(item || '').trim()).filter(Boolean))]
  const skippedQuestionUids = [...new Set((Array.isArray(raw.skippedQuestionUids) ? raw.skippedQuestionUids : []).map((item) => String(item || '').trim()).filter(Boolean))]
  const answeredCountValue = Number(raw.answeredCount)
  const correctCountValue = Number(raw.correctCount)
  const answeredCount = Number.isFinite(answeredCountValue)
    ? Math.max(questionUids.length, Math.min(Math.max(Math.floor(answeredCountValue), 0), GUEST_DAILY_LIMIT))
    : Math.min(questionUids.length, GUEST_DAILY_LIMIT)
  const correctCount = Number.isFinite(correctCountValue)
    ? Math.min(Math.max(Math.floor(correctCountValue), 0), answeredCount)
    : 0

  return {
    date,
    answeredCount,
    correctCount,
    streak: 0,
    completed: answeredCount >= GUEST_DAILY_LIMIT,
    questionUids,
    skippedQuestionUids
  }
}

function readGuestProgress(expectedDate = getLocalDateString()) {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) || 'null')
    return normalizeGuestProgress(raw || {}, expectedDate)
  } catch {
    return normalizeGuestProgress({}, expectedDate)
  }
}

function writeGuestProgress(nextProgress) {
  localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(nextProgress))
}

const loading = ref(true)
const submitting = ref(false)
const activeMode = ref('daily')
const currentUser = ref(getCurrentUser())
const leaderboardLoading = ref(false)
const historyLoading = ref(false)
const wrongbookLoading = ref(false)
const favoritesLoading = ref(false)
const favoriteSubmitting = ref(false)
const error = ref('')
const question = ref(null)
const selectedAnswer = ref('')
const selectedLevelTag = ref(localStorage.getItem(QUIZ_LEVEL_STORAGE_KEY) || '')
const selectedKnowledgeTag = ref(localStorage.getItem(QUIZ_KNOWLEDGE_STORAGE_KEY) || '')
const levelOptions = ref([])
const knowledgeTagOptions = ref([])
const result = ref(null)
const today = ref('')
const activeWrongbookQuestionUid = ref('')
const activeFavoriteQuestionUid = ref('')
const questionCardRef = ref(null)
const isMobileView = ref(false)
const heroCollapsed = ref(false)
const progressCollapsed = ref(false)
const leaderboardCollapsed = ref(false)
const historyCollapsed = ref(false)
const wrongbookCollapsed = ref(false)
const favoritesCollapsed = ref(false)
const leaderboardScope = ref('today')
const issuePanelOpen = ref(false)
const issueSubmitting = ref(false)
const issueType = ref('wrong_answer')
const issueDetail = ref('')
const issueState = ref({
  reported: false,
  status: '',
  issueType: '',
  reportedAt: null,
  updatedAt: null
})
const progress = ref({
  answeredCount: 0,
  correctCount: 0,
  streak: 0,
  completed: false,
  questionUids: [],
  skippedQuestionUids: []
})
const leaderboard = ref([])
const history = ref([])
const wrongbook = ref([])
const favorites = ref([])
const isLoggedIn = computed(() => !!currentUser.value)
const issueTypeOptions = [
  { value: 'wrong_answer', label: '答案不对' },
  { value: 'wrong_explanation', label: '解析有问题' },
  { value: 'wrong_options', label: '选项有误' },
  { value: 'ambiguous', label: '题意不清 / 疑似多解' },
  { value: 'formatting', label: '排版或内容缺失' },
  { value: 'other', label: '其他问题' }
]

const currentDateText = computed(() => {
  if (!today.value) return '今日'
  return today.value
})

const guestRemainingCount = computed(() => Math.max(0, GUEST_DAILY_LIMIT - (progress.value.answeredCount || 0)))
const guestLimitReached = computed(() => !isLoggedIn.value && (progress.value.answeredCount || 0) >= GUEST_DAILY_LIMIT)

const resultCopy = computed(() => {
  if (!result.value) return ''
  if (!isLoggedIn.value && guestLimitReached.value && activeMode.value === 'daily') {
    return '今日 5 题游客体验已完成。现在登录即可继续下一题，并自动保存错题本、收藏夹和打卡记录。'
  }

  if (activeMode.value === 'wrongbook') {
    return result.value.correct
      ? '这道错题已订正，系统已将它移出错题本。'
      : '这道错题仍然保留在错题本中，后面可以继续重做。'
  }

  if (activeMode.value === 'favorite') {
    return result.value.correct
      ? '收藏题已答对，你可以继续保留在收藏夹中反复练习。'
      : '这道收藏题答错了，系统也会同步加入错题本。'
  }

  return result.value.correct
    ? '今天这道题已经完成，系统已为你记录打卡。'
    : '今天这道题已经提交，系统已为你记录打卡，下次可以再来复习。'
})

const emptyStateTitle = computed(() => {
  if (guestLimitReached.value) return '今日游客体验已完成'
  if (activeMode.value === 'wrongbook') return '当前筛选下没有错题'
  if (activeMode.value === 'favorite') return '当前筛选下没有收藏题'
  return '今天可做的题目已经刷完'
})

const emptyStateCopy = computed(() => {
  if (guestLimitReached.value) {
    return '你今天已经完成 5 题游客体验。登录后可继续刷题，并保存错题本、收藏夹和打卡记录。'
  }
  if (activeMode.value === 'wrongbook') {
    return '你可以切换筛选条件，或者回到今日刷题继续练习。'
  }
  if (activeMode.value === 'favorite') {
    return '你可以先在日刷题里把题加入收藏夹，稍后再集中回看。'
  }
  return '今天这组题已经没有新的未做题目了。你可以查看右侧排行榜、最近打卡、错题本和收藏夹。'
})

const issueStatusLabel = computed(() => {
  const map = {
    pending: '待处理',
    reviewing: '处理中',
    resolved: '已处理',
    ignored: '已忽略'
  }
  return map[issueState.value.status] || '待处理'
})

const leaderboardEmptyText = computed(() => (leaderboardScope.value === 'overall'
  ? '还没有同学进入总榜'
  : '今天还没有同学打卡'))

watch(
  () => [question.value?.questionUid || '', isLoggedIn.value],
  async ([questionUid, loggedIn]) => {
    issuePanelOpen.value = false
    issueType.value = 'wrong_answer'
    issueDetail.value = ''
    issueState.value = {
      reported: false,
      status: '',
      issueType: '',
      reportedAt: null,
      updatedAt: null
    }

    if (!loggedIn || !questionUid) return
    await loadIssueState(questionUid)
  },
  { immediate: true }
)

onMounted(async () => {
  syncMobileSectionState()
  currentUser.value = getCurrentUser()
  window.addEventListener('resize', syncMobileSectionState)
  window.addEventListener('quiz-daily-next-question', handleExternalNextQuestion)
  await fetchLevelOptions()
  await refreshAll()
})

onUnmounted(() => {
  window.removeEventListener('resize', syncMobileSectionState)
  window.removeEventListener('quiz-daily-next-question', handleExternalNextQuestion)
})

async function handleExternalNextQuestion() {
  if (!question.value || loading.value || submitting.value) return

  if (guestLimitReached.value) {
    goToLogin()
    return
  }

  if (result.value) {
    goToNextQuestion()
    return
  }

  if (activeMode.value === 'daily') {
    await skipCurrentQuestion()
    return
  }

  goToNextQuestion()
}

function syncMobileSectionState() {
  const nextIsMobile = window.innerWidth <= 720
  if (nextIsMobile === isMobileView.value) return

  isMobileView.value = nextIsMobile

  if (nextIsMobile) {
    heroCollapsed.value = true
    progressCollapsed.value = true
    leaderboardCollapsed.value = true
    historyCollapsed.value = true
    wrongbookCollapsed.value = true
    favoritesCollapsed.value = true
    return
  }

  heroCollapsed.value = false
  progressCollapsed.value = false
  leaderboardCollapsed.value = false
  historyCollapsed.value = false
  wrongbookCollapsed.value = false
  favoritesCollapsed.value = false
}

async function scrollToQuestionTop(behavior = 'smooth') {
  await nextTick()
  await new Promise((resolve) => window.requestAnimationFrame(resolve))
  const element = questionCardRef.value
  if (!element) return

  const top = window.scrollY + element.getBoundingClientRect().top - 12
  window.scrollTo({
    top: Math.max(0, top),
    behavior
  })
}

async function refreshAll() {
  if (!isLoggedIn.value) {
    leaderboard.value = []
    history.value = []
    wrongbook.value = []
    favorites.value = []
    await fetchCurrentQuestion()
    return
  }

  await Promise.all([
    fetchLeaderboard(),
    fetchHistory(),
    fetchWrongbook(),
    fetchFavorites()
  ])

  if (activeMode.value === 'wrongbook') {
    if (wrongbook.value.length > 0) {
      retryWrongbookItem(wrongbook.value[0])
    } else {
      question.value = null
      selectedAnswer.value = ''
      result.value = null
    }
    return
  }

  if (activeMode.value === 'favorite') {
    if (favorites.value.length > 0) {
      reviewFavoriteItem(favorites.value[0])
    } else {
      question.value = null
      selectedAnswer.value = ''
      result.value = null
    }
    return
  }

  await fetchCurrentQuestion()
}

async function fetchCurrentQuestion() {
  loading.value = true
  error.value = ''
  selectedAnswer.value = ''
  result.value = null

  try {
    const guestProgress = !isLoggedIn.value ? readGuestProgress(today.value || getLocalDateString()) : null
    if (guestProgress) {
      today.value = guestProgress.date
      progress.value = {
        answeredCount: guestProgress.answeredCount,
        correctCount: guestProgress.correctCount,
        streak: 0,
        completed: guestProgress.completed,
        questionUids: guestProgress.questionUids,
        skippedQuestionUids: guestProgress.skippedQuestionUids
      }

      if (guestProgress.completed) {
        question.value = null
        return
      }
    }

    const params = new URLSearchParams()
    if (selectedLevelTag.value) params.set('levelTag', selectedLevelTag.value)
    if (selectedKnowledgeTag.value) params.set('tag', selectedKnowledgeTag.value)
    if (guestProgress) {
      params.set('answeredCount', String(guestProgress.answeredCount))
      params.set('correctCount', String(guestProgress.correctCount))
      params.set('questionUids', guestProgress.questionUids.join(','))
      params.set('skippedQuestionUids', guestProgress.skippedQuestionUids.join(','))
    }
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const data = await request(`/api/quiz/daily/current${suffix}`)
    today.value = data?.date || ''
    question.value = data?.question || null
    if (guestProgress) {
      const syncedGuestProgress = data?.date && data.date !== guestProgress.date
        ? normalizeGuestProgress({}, data.date)
        : guestProgress
      progress.value = {
        answeredCount: syncedGuestProgress.answeredCount,
        correctCount: syncedGuestProgress.correctCount,
        streak: 0,
        completed: syncedGuestProgress.completed,
        questionUids: syncedGuestProgress.questionUids,
        skippedQuestionUids: syncedGuestProgress.skippedQuestionUids
      }
      writeGuestProgress(syncedGuestProgress)
    } else {
      progress.value = {
        answeredCount: data?.progress?.answeredCount || 0,
        correctCount: data?.progress?.correctCount || 0,
        streak: data?.progress?.streak || 0,
        completed: !!data?.completed,
        questionUids: data?.progress?.questionUids || [],
        skippedQuestionUids: data?.progress?.skippedQuestionUids || []
      }
    }
  } catch (e) {
    error.value = e.message || '获取今日题目失败'
  } finally {
    loading.value = false
    if (question.value) {
      await scrollToQuestionTop('smooth')
    }
  }
}

async function fetchLevelOptions() {
  try {
    const data = await request('/api/quiz/daily/options')
    levelOptions.value = Array.isArray(data?.levels) ? data.levels : []
    knowledgeTagOptions.value = Array.isArray(data?.knowledgeTags) ? data.knowledgeTags : []
    const validLevelTags = new Set(levelOptions.value.map((item) => item.value))
    if (selectedLevelTag.value && !validLevelTags.has(selectedLevelTag.value)) {
      selectedLevelTag.value = ''
      localStorage.removeItem(QUIZ_LEVEL_STORAGE_KEY)
    }
    const validKnowledgeTags = new Set(knowledgeTagOptions.value.map((item) => item.value))
    if (selectedKnowledgeTag.value && !validKnowledgeTags.has(selectedKnowledgeTag.value)) {
      selectedKnowledgeTag.value = ''
      localStorage.removeItem(QUIZ_KNOWLEDGE_STORAGE_KEY)
    }
  } catch {
    levelOptions.value = []
    knowledgeTagOptions.value = []
    selectedKnowledgeTag.value = ''
    localStorage.removeItem(QUIZ_KNOWLEDGE_STORAGE_KEY)
  }
}

function handleLevelChange() {
  localStorage.setItem(QUIZ_LEVEL_STORAGE_KEY, selectedLevelTag.value)
  localStorage.setItem(QUIZ_KNOWLEDGE_STORAGE_KEY, selectedKnowledgeTag.value)
  activeWrongbookQuestionUid.value = ''
  activeFavoriteQuestionUid.value = ''
  refreshAll()
}

function switchToDailyMode() {
  activeMode.value = 'daily'
  activeWrongbookQuestionUid.value = ''
  activeFavoriteQuestionUid.value = ''
  fetchCurrentQuestion()
}

function switchToWrongbookMode() {
  if (!isLoggedIn.value) return
  activeMode.value = 'wrongbook'
  if (wrongbook.value.length > 0) {
    retryWrongbookItem(wrongbook.value[0])
  } else {
    question.value = null
    selectedAnswer.value = ''
    result.value = null
  }
}

function switchToFavoriteMode() {
  if (!isLoggedIn.value) return
  activeMode.value = 'favorite'
  if (favorites.value.length > 0) {
    reviewFavoriteItem(favorites.value[0])
  } else {
    question.value = null
    selectedAnswer.value = ''
    result.value = null
  }
}

function goToNextQuestion() {
  if (guestLimitReached.value) {
    goToLogin()
    return
  }

  if (activeMode.value === 'wrongbook') {
    const currentIndex = wrongbook.value.findIndex((item) => item.questionUid === activeWrongbookQuestionUid.value)
    if (currentIndex >= 0 && currentIndex < wrongbook.value.length - 1) {
      retryWrongbookItem(wrongbook.value[currentIndex + 1])
      return
    }
    if (wrongbook.value.length > 0) {
      retryWrongbookItem(wrongbook.value[0])
      return
    }
  }

  if (activeMode.value === 'favorite') {
    const currentIndex = favorites.value.findIndex((item) => item.questionUid === activeFavoriteQuestionUid.value)
    if (currentIndex >= 0 && currentIndex < favorites.value.length - 1) {
      reviewFavoriteItem(favorites.value[currentIndex + 1])
      return
    }
    if (favorites.value.length > 0) {
      reviewFavoriteItem(favorites.value[0])
      return
    }
  }

  fetchCurrentQuestion()
}

async function submitAnswer() {
  if (!question.value || !selectedAnswer.value) return
  if (guestLimitReached.value) {
    goToLogin()
    return
  }

  submitting.value = true
  try {
    const endpoint = activeMode.value === 'wrongbook'
      ? '/api/quiz/wrongbook/submit'
      : activeMode.value === 'favorite'
        ? '/api/quiz/favorite/submit'
        : '/api/quiz/daily/submit'
    const payload = {
      questionUid: question.value.questionUid,
      selectedAnswer: selectedAnswer.value,
      levelTag: selectedLevelTag.value,
      tag: selectedKnowledgeTag.value
    }
    if (!isLoggedIn.value) {
      payload.answeredCount = progress.value.answeredCount || 0
      payload.correctCount = progress.value.correctCount || 0
      payload.questionUids = progress.value.questionUids || []
      payload.skippedQuestionUids = progress.value.skippedQuestionUids || []
    }
    const data = await request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    result.value = {
      correct: !!data?.correct,
      correctAnswer: data?.correctAnswer || '',
      explanation: data?.explanation || ''
    }
    if (activeMode.value === 'daily') {
      const nextProgress = {
        answeredCount: data?.progress?.answeredCount || progress.value.answeredCount,
        correctCount: data?.progress?.correctCount || progress.value.correctCount,
        streak: data?.progress?.streak || progress.value.streak,
        completed: !!data?.completed,
        questionUids: data?.progress?.questionUids || progress.value.questionUids,
        skippedQuestionUids: data?.progress?.skippedQuestionUids || progress.value.skippedQuestionUids
      }
      progress.value = nextProgress
      if (!isLoggedIn.value) {
        writeGuestProgress(normalizeGuestProgress({
          date: today.value || getLocalDateString(),
          ...nextProgress
        }, today.value || getLocalDateString()))
      }
    }
    const guestCompletedNow = !isLoggedIn.value && activeMode.value === 'daily' && (data?.progress?.answeredCount || progress.value.answeredCount) >= GUEST_DAILY_LIMIT
    showToastMessage(activeMode.value === 'wrongbook'
      ? (data?.correct ? '已订正，题目已从错题本移除' : '仍未答对，题目保留在错题本')
      : activeMode.value === 'favorite'
        ? (data?.correct ? '收藏题回答正确' : '已记录，本题也加入错题本')
        : guestCompletedNow
          ? '今日 5 题体验已完成，登录后可继续'
          : (data?.correct ? '回答正确，已完成今日打卡' : '已提交，今日打卡已记录'))
    if (isLoggedIn.value) {
      await Promise.all([fetchLeaderboard(), fetchHistory(), fetchWrongbook(), fetchFavorites()])
    }
    if (activeMode.value === 'wrongbook' && data?.correct) {
      activeWrongbookQuestionUid.value = ''
    }
  } catch (e) {
    showToastMessage(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function fetchLeaderboard() {
  if (!isLoggedIn.value) {
    leaderboard.value = []
    return
  }
  leaderboardLoading.value = true
  try {
    const params = new URLSearchParams({ scope: leaderboardScope.value })
    const data = await request(`/api/quiz/daily/leaderboard?${params.toString()}`)
    leaderboard.value = Array.isArray(data?.leaderboard) ? data.leaderboard : []
  } catch {
    leaderboard.value = []
  } finally {
    leaderboardLoading.value = false
  }
}

function switchLeaderboardScope(scope) {
  if (leaderboardScope.value === scope) return
  leaderboardScope.value = scope
  void fetchLeaderboard()
}

async function fetchHistory() {
  if (!isLoggedIn.value) {
    history.value = []
    return
  }
  historyLoading.value = true
  try {
    const data = await request('/api/quiz/daily/history?limit=7')
    history.value = Array.isArray(data) ? data : []
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

async function fetchWrongbook() {
  if (!isLoggedIn.value) {
    wrongbook.value = []
    return
  }
  wrongbookLoading.value = true
  try {
    const params = new URLSearchParams({ limit: '10' })
    if (selectedLevelTag.value) params.set('levelTag', selectedLevelTag.value)
    if (selectedKnowledgeTag.value) params.set('tag', selectedKnowledgeTag.value)
    const data = await request(`/api/quiz/daily/wrongbook?${params.toString()}`)
    wrongbook.value = Array.isArray(data?.items) ? data.items : []
    if (activeMode.value === 'wrongbook') {
      const current = wrongbook.value.find((item) => item.questionUid === activeWrongbookQuestionUid.value)
      if (current) {
        retryWrongbookItem(current)
      } else if (wrongbook.value.length > 0) {
        retryWrongbookItem(wrongbook.value[0])
      } else {
        question.value = null
        result.value = null
        selectedAnswer.value = ''
      }
    }
  } catch {
    wrongbook.value = []
  } finally {
    wrongbookLoading.value = false
  }
}

async function fetchFavorites() {
  if (!isLoggedIn.value) {
    favorites.value = []
    return
  }
  favoritesLoading.value = true
  try {
    const params = new URLSearchParams({ limit: '10' })
    if (selectedLevelTag.value) params.set('levelTag', selectedLevelTag.value)
    if (selectedKnowledgeTag.value) params.set('tag', selectedKnowledgeTag.value)
    const data = await request(`/api/quiz/daily/favorites?${params.toString()}`)
    favorites.value = Array.isArray(data?.items) ? data.items : []
    if (activeMode.value === 'favorite') {
      const current = favorites.value.find((item) => item.questionUid === activeFavoriteQuestionUid.value)
      if (current) {
        reviewFavoriteItem(current)
      } else if (favorites.value.length > 0) {
        reviewFavoriteItem(favorites.value[0])
      } else {
        question.value = null
        result.value = null
        selectedAnswer.value = ''
      }
    }
  } catch {
    favorites.value = []
  } finally {
    favoritesLoading.value = false
  }
}

function retryWrongbookItem(item) {
  activeMode.value = 'wrongbook'
  activeWrongbookQuestionUid.value = item.questionUid
  activeFavoriteQuestionUid.value = ''
  question.value = {
    questionUid: item.questionUid,
    paperQuestionNo: item.paperQuestionNo,
    type: item.type,
    stem: item.stem,
    options: item.options || [],
    tags: item.tags || [],
    levelTag: item.levelTag || '',
    sourceTitle: item.sourceTitle || '',
    isFavorite: favorites.value.some((favoriteItem) => favoriteItem.questionUid === item.questionUid)
  }
  selectedAnswer.value = ''
  result.value = null
  error.value = ''
  void scrollToQuestionTop()
}

function reviewFavoriteItem(item) {
  activeMode.value = 'favorite'
  activeFavoriteQuestionUid.value = item.questionUid
  activeWrongbookQuestionUid.value = ''
  question.value = {
    questionUid: item.questionUid,
    paperQuestionNo: item.paperQuestionNo,
    type: item.type,
    stem: item.stem,
    options: item.options || [],
    tags: item.tags || [],
    levelTag: item.levelTag || '',
    sourceTitle: item.sourceTitle || '',
    isFavorite: true
  }
  selectedAnswer.value = ''
  result.value = null
  error.value = ''
  void scrollToQuestionTop()
}

async function removeWrongbookItem(questionUid) {
  try {
    await request('/api/quiz/wrongbook/remove', {
      method: 'POST',
      body: JSON.stringify({ questionUid })
    })
    showToastMessage('已从错题本移除')
    if (activeWrongbookQuestionUid.value === questionUid) {
      activeWrongbookQuestionUid.value = ''
    }
    await fetchWrongbook()
  } catch (e) {
    showToastMessage(e.message || '移除失败')
  }
}

async function skipCurrentQuestion() {
  if (!question.value || activeMode.value !== 'daily') return
  if (guestLimitReached.value) {
    goToLogin()
    return
  }

  submitting.value = true
  try {
    const payload = {
      questionUid: question.value.questionUid,
      levelTag: selectedLevelTag.value,
      tag: selectedKnowledgeTag.value
    }
    if (!isLoggedIn.value) {
      payload.answeredCount = progress.value.answeredCount || 0
      payload.correctCount = progress.value.correctCount || 0
      payload.questionUids = progress.value.questionUids || []
      payload.skippedQuestionUids = progress.value.skippedQuestionUids || []
    }

    const data = await request('/api/quiz/daily/skip', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    question.value = data?.question || null
    selectedAnswer.value = ''
    result.value = null
    const nextProgress = {
      ...progress.value,
      skippedQuestionUids: Array.isArray(data?.skippedQuestionUids) ? data.skippedQuestionUids : progress.value.skippedQuestionUids
    }
    progress.value = nextProgress
    if (!isLoggedIn.value) {
      writeGuestProgress(normalizeGuestProgress({
        date: today.value || getLocalDateString(),
        ...nextProgress
      }, today.value || getLocalDateString()))
    }
    if (question.value) {
      await scrollToQuestionTop()
    }
    showToastMessage(data?.question ? '已跳过，换一题继续' : '已跳过，当前筛选下没有更多题目了')
  } catch (e) {
    showToastMessage(e.message || '跳过失败')
  } finally {
    submitting.value = false
  }
}

async function toggleFavoriteCurrentQuestion() {
  if (!question.value?.questionUid) return
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  await toggleFavoriteByQuestionUid(question.value.questionUid, !question.value.isFavorite)
}

async function toggleFavoriteByQuestionUid(questionUid, active) {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  favoriteSubmitting.value = true
  try {
    await request('/api/quiz/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ questionUid, active })
    })
    if (question.value?.questionUid === questionUid) {
      question.value = {
        ...question.value,
        isFavorite: active
      }
    }
    if (!active && activeFavoriteQuestionUid.value === questionUid) {
      activeFavoriteQuestionUid.value = ''
    }
    showToastMessage(active ? '已加入收藏夹' : '已移出收藏夹')
    await fetchFavorites()
  } catch (e) {
    showToastMessage(e.message || (active ? '收藏失败' : '取消收藏失败'))
  } finally {
    favoriteSubmitting.value = false
  }
}

function formatDateTime(value) {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatLeaderboardAccuracy(value) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return '--'
  return `${numberValue.toFixed(1)}%`
}

function optionLabel(key) {
  if (key === 'true') return '正确'
  if (key === 'false') return '错误'
  return key
}

function optionClass(key) {
  return {
    active: selectedAnswer.value === key,
    correct: !!result.value && result.value.correctAnswer === key,
    wrong: !!result.value && selectedAnswer.value === key && result.value.correctAnswer !== key
  }
}

function goToLogin() {
  router.push({ path: '/login', query: { redirect: '/quiz-daily' } })
}

async function loadIssueState(questionUid) {
  try {
    const data = await request(`/api/quiz/issues/${encodeURIComponent(questionUid)}/state`)
    if (question.value?.questionUid !== questionUid) return
    issueState.value = data?.issue || {
      reported: false,
      status: '',
      issueType: '',
      reportedAt: null,
      updatedAt: null
    }
    if (issueState.value.issueType) {
      issueType.value = issueState.value.issueType
    }
  } catch {
    issueState.value = {
      reported: false,
      status: '',
      issueType: '',
      reportedAt: null,
      updatedAt: null
    }
  }
}

function toggleIssuePanel() {
  if (!isLoggedIn.value || !question.value?.questionUid) return
  issuePanelOpen.value = !issuePanelOpen.value
}

async function submitIssueReport() {
  if (!question.value?.questionUid || !isLoggedIn.value) return

  issueSubmitting.value = true
  try {
    const data = await request('/api/quiz/issues', {
      method: 'POST',
      body: JSON.stringify({
        questionUid: question.value.questionUid,
        issueType: issueType.value,
        detail: issueDetail.value.trim()
      })
    })
    issueState.value = data?.issue || {
      reported: true,
      status: 'pending',
      issueType: issueType.value,
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    issuePanelOpen.value = false
    showToastMessage('已标记这道题，管理员稍后会处理')
  } catch (e) {
    showToastMessage(e.message || '提交标记失败')
  } finally {
    issueSubmitting.value = false
  }
}
</script>

<style scoped>
.quiz-daily-page {
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(252, 211, 77, 0.2), transparent 28%),
    linear-gradient(180deg, #f7f6f1 0%, #eef2f7 100%);
}

.hero-panel {
  max-width: 1320px;
  margin: 0 auto 20px;
  padding: 28px;
  border-radius: 24px;
  background: linear-gradient(135deg, #123458 0%, #1e567d 52%, #d97706 160%);
  color: #fff;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  box-shadow: 0 18px 40px rgba(18, 52, 88, 0.18);
}

.hero-summary-row {
  display: none;
}

.hero-content {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

.hero-summary-main {
  display: grid;
  gap: 4px;
}

.hero-summary-main strong {
  font-size: 16px;
  font-weight: 800;
}

.hero-summary-main span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
}

.guest-limit-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 18px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(217, 119, 6, 0.2);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.96), rgba(255, 237, 213, 0.92));
  color: #7c2d12;
}

.guest-limit-banner.exhausted {
  border-color: rgba(190, 24, 93, 0.18);
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.96), rgba(255, 228, 230, 0.92));
  color: #9f1239;
}

.btn-report-issue {
  border-color: rgba(180, 83, 9, 0.24);
  color: #9a3412;
  background: rgba(255, 247, 237, 0.9);
}

.btn-report-issue.active {
  background: rgba(254, 215, 170, 0.95);
  border-color: rgba(194, 65, 12, 0.28);
}

.issue-panel-card {
  margin-bottom: 18px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(217, 119, 6, 0.18);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.96), rgba(255, 247, 237, 0.98));
}

.issue-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  color: #7c2d12;
}

.issue-state-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.18);
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
}

.issue-panel-copy {
  margin: 0 0 14px;
  color: #9a3412;
  font-size: 13px;
}

.issue-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.issue-field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #7c2d12;
}

.issue-field.full {
  grid-column: 1 / -1;
}

.issue-field select,
.issue-field textarea {
  width: 100%;
  border: 1px solid rgba(180, 83, 9, 0.18);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  background: rgba(255, 255, 255, 0.94);
  color: #431407;
}

.issue-field textarea {
  resize: vertical;
  min-height: 84px;
}

.issue-panel-actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.issue-length {
  margin-right: auto;
  font-size: 12px;
  color: #9a3412;
}

.guest-limit-banner strong {
  display: block;
  margin-bottom: 4px;
  font-size: 15px;
}

.guest-limit-banner p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.btn-login-continue {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  background: #123458;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.btn-login-continue.full {
  width: 100%;
}

.guest-side-card {
  display: grid;
  gap: 14px;
}

.guest-feature-list {
  margin: 0;
  padding-left: 18px;
  color: #41566f;
  display: grid;
  gap: 8px;
}

.collapse-toggle {
  border: 1px solid rgba(18, 52, 88, 0.14);
  background: #fff;
  color: #123458;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.collapse-toggle.small {
  padding: 6px 10px;
  font-size: 11px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.72;
}

.hero-panel h1 {
  margin: 0;
  font-size: 36px;
  line-height: 1.05;
}

.hero-text {
  max-width: 620px;
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.84);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-self: end;
}

.stat-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

.stat-card.accent {
  background: rgba(251, 191, 36, 0.18);
}

.stat-label {
  display: block;
  font-size: 12px;
  opacity: 0.8;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
}

.page-grid {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 360px;
  gap: 20px;
}

.page-grid > * {
  min-width: 0;
}

.main-panel,
.side-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(18, 52, 88, 0.08);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.main-panel {
  border-radius: 24px;
  padding: 22px;
  min-width: 0;
  box-sizing: border-box;
}

.toolbar,
.side-card-header,
.result-title-row,
.history-item,
.leaderboard-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.side-card-header-actions,
.result-top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar {
  gap: 16px;
  margin-bottom: 18px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-button {
  height: 42px;
  padding: 0 14px;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #fff;
  color: #123458;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.mode-button.active {
  background: #123458;
  color: #fff;
  border-color: #123458;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 170px;
}

.filter-field span {
  font-size: 12px;
  color: #6b7280;
  font-weight: 700;
}

.filter-field select {
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid #dbe4ef;
  background: #fff;
  color: #123458;
  font-size: 14px;
  font-weight: 600;
}

.toolbar-label,
.muted-text {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.toolbar h2,
.side-card h3,
.result-panel h3 {
  margin: 4px 0 0;
}

.btn-refresh,
.btn-submit,
.btn-next,
.btn-secondary {
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.btn-refresh {
  padding: 11px 18px;
  border-radius: 999px;
  background: #e8eef6;
  color: #123458;
  font-weight: 700;
}

.btn-submit {
  min-width: 180px;
  padding: 14px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 12px 24px rgba(217, 119, 6, 0.22);
}

.btn-next {
  min-width: 180px;
  padding: 14px 22px;
  border-radius: 14px;
  background: #fff;
  color: #123458;
  font-size: 15px;
  font-weight: 800;
  border: 1px solid rgba(18, 52, 88, 0.12);
  box-shadow: 0 8px 20px rgba(18, 52, 88, 0.08);
}

.btn-next.is-login-cta,
.guest-login-primary {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fff;
  border: none;
  box-shadow: 0 12px 24px rgba(217, 119, 6, 0.22);
}

.btn-secondary {
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff;
  color: #123458;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid rgba(18, 52, 88, 0.14);
}

.btn-secondary.active {
  background: #fff3e6;
  border-color: #fdba74;
  color: #9a3412;
}

.btn-refresh:hover,
.btn-submit:hover,
.btn-next:hover,
.btn-secondary:hover {
  transform: translateY(-1px);
}

.btn-refresh:disabled,
.btn-submit:disabled,
.btn-next:disabled,
.option-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.next-row {
  margin-top: 16px;
}

.btn-next-inline {
  min-width: auto;
  padding: 10px 16px;
  border-radius: 999px;
  box-shadow: none;
}

.state-card,
.question-card,
.side-card {
  border-radius: 20px;
}

.state-card {
  padding: 24px;
  background: #f8fafc;
  color: #334155;
}

.state-card.error {
  background: #fff1f2;
  color: #be123c;
}

.state-card.success {
  background: #f0fdf4;
  color: #166534;
}

.guest-limit-card {
  display: grid;
  gap: 14px;
}

.guest-limit-actions {
  display: grid;
  gap: 12px;
  margin-top: 6px;
}

.guest-limit-tip {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(22, 101, 52, 0.82);
}

.question-card {
  padding: 22px;
  background: linear-gradient(180deg, #fffef8 0%, #ffffff 100%);
  border: 1px solid rgba(217, 119, 6, 0.12);
  min-width: 0;
  box-sizing: border-box;
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.meta-chip,
.answer-pill,
.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.meta-chip {
  padding: 6px 10px;
  background: #eff6ff;
  color: #1d4ed8;
}

.knowledge-chip {
  background: #fff3e6;
  color: #9a3412;
}

.meta-source {
  font-size: 12px;
  color: #6b7280;
  align-self: center;
}

.recommendation-reason {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.95) 0%, rgba(255, 251, 235, 0.98) 100%);
  border: 1px solid rgba(217, 119, 6, 0.22);
}

.recommendation-label {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(180, 83, 9, 0.1);
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
}

.recommendation-reason p {
  margin: 0;
  color: #7c2d12;
  line-height: 1.75;
}

.question-body {
  padding: 6px 0 14px;
  min-width: 0;
}

.question-actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 16px;
}

.question-body :deep(.markdown-viewer) {
  padding-bottom: 0;
  font-size: 17px;
  line-height: 1.95;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.question-body :deep(p) {
  line-height: 1.9;
}

.options-list {
  display: grid;
  gap: 12px;
}

.option-button {
  width: 100%;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  align-items: start;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid #dbe4ef;
  background: #fff;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.option-button:hover {
  transform: translateY(-1px);
  border-color: #9fb5ca;
}

.option-button.active {
  border-color: #123458;
  background: #eff6ff;
}

.option-button.correct {
  border-color: #16a34a;
  background: #f0fdf4;
}

.option-button.wrong {
  border-color: #dc2626;
  background: #fff1f2;
}

.option-key {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #123458;
  color: #fff;
  font-weight: 800;
}

.option-button.correct .option-key {
  background: #16a34a;
}

.option-button.wrong .option-key {
  background: #dc2626;
}

.option-text {
  color: #1f2937;
  line-height: 1.8;
  font-size: 16px;
  min-width: 0;
}

.option-text :deep(p) {
  margin: 0;
}

.option-text :deep(.markdown-viewer) {
  font-size: 16px;
  line-height: 1.85;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.result-panel {
  margin-top: 20px;
  padding: 18px;
  border-radius: 18px;
}

.result-panel.correct {
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.result-panel.wrong {
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.answer-pill {
  padding: 8px 12px;
  background: rgba(18, 52, 88, 0.08);
  color: #123458;
}

.result-copy {
  margin: 8px 0 0;
  line-height: 1.8;
  color: #475569;
}

.explanation-box {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(18, 52, 88, 0.16);
}

.explanation-box h4 {
  margin: 0 0 12px;
}

.explanation-box :deep(.markdown-viewer) {
  padding-bottom: 0;
  font-size: 16px;
  line-height: 1.9;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.question-body :deep(table),
.question-body :deep(.code-block-card),
.question-body :deep(.math-block),
.explanation-box :deep(table),
.explanation-box :deep(.code-block-card),
.explanation-box :deep(.math-block) {
  max-width: 100%;
  overflow-x: auto;
}

.question-body :deep(.katex-display),
.option-text :deep(.katex-display),
.explanation-box :deep(.katex-display) {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  padding: 18px;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 14px;
}

.progress-grid span {
  display: block;
  font-size: 12px;
  color: #6b7280;
}

.progress-grid strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  color: #123458;
}

.status-badge {
  padding: 6px 10px;
}

.status-badge.done {
  background: #dcfce7;
  color: #166534;
}

.status-badge.pending {
  background: #e5e7eb;
  color: #374151;
}

.small-state {
  margin-top: 12px;
  color: #6b7280;
  font-size: 14px;
}

.leaderboard-scope-switch {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.scope-button {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #dbe4ef;
  background: #fff;
  color: #123458;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.scope-button.active {
  background: #123458;
  color: #fff;
  border-color: #123458;
}

.leaderboard-list,
.history-list,
.wrongbook-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}

.leaderboard-item,
.history-item,
.wrongbook-item {
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.leaderboard-item:last-child,
.history-item:last-child,
.wrongbook-item:last-child {
  border-bottom: none;
}

.wrongbook-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.meta-chip.small {
  padding: 4px 8px;
  font-size: 11px;
}

.wrongbook-stem {
  margin: 0;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.6;
}

.wrongbook-answer {
  margin: 8px 0 0;
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.favorite-time {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.wrongbook-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-mini {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #dbe4ef;
  background: #fff;
  color: #123458;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-mini.primary {
  border-color: #123458;
  background: #123458;
  color: #fff;
}

.rank {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 800;
}

.name {
  font-weight: 700;
  color: #1f2937;
}

.leaderboard-meta {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
}

.leaderboard-subline {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score {
  color: #123458;
  font-weight: 700;
  white-space: nowrap;
}

.history-item strong {
  display: block;
  color: #1f2937;
}

.history-item p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 1080px) {
  .hero-content,
  .page-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats,
  .progress-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 720px) {
  .quiz-daily-page {
    padding: 12px;
  }

  .hero-panel {
    margin-bottom: 14px;
    padding: 16px;
    border-radius: 18px;
    gap: 14px;
  }

  .hero-panel.collapsed {
    gap: 0;
  }

  .hero-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .hero-content {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .hero-copy {
    display: grid;
    gap: 8px;
  }

  .eyebrow {
    margin-bottom: 0;
    font-size: 11px;
    letter-spacing: 0.14em;
  }

  .toolbar-actions,
  .mode-switch,
  .filter-field,
  .filter-field select,
  .btn-refresh,
  .btn-submit,
  .btn-next,
  .btn-secondary,
  .option-button,
  .question-card,
  .main-panel,
  .side-card,
  .state-card {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
  }

  .question-body :deep(.markdown-viewer) {
    font-size: 16px;
  }

  .option-text,
  .option-text :deep(.markdown-viewer),
  .explanation-box :deep(.markdown-viewer) {
    font-size: 15px;
  }

  .hero-panel,
  .main-panel,
  .side-card,
  .question-card {
    padding: 16px;
    border-radius: 18px;
  }

  .hero-panel h1 {
    font-size: 22px;
    line-height: 1.18;
  }

  .hero-text {
    margin-top: 0;
    font-size: 13px;
    line-height: 1.65;
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .stat-card {
    padding: 12px;
    border-radius: 16px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-card strong {
    margin-top: 6px;
    font-size: 20px;
  }

  .progress-grid {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .result-title-row,
  .history-item,
  .guest-limit-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .side-card-header {
    gap: 10px;
  }

  .side-card-header-actions,
  .result-top-actions {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar {
    gap: 14px;
  }

  .toolbar-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
  }

  .mode-switch {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    grid-column: 1 / -1;
  }

  .mode-switch,
  .toolbar-actions,
  .filter-field {
    width: 100%;
  }

  .mode-button {
    min-width: 0;
    min-height: 42px;
    height: auto;
    padding: 9px 8px;
    font-size: 13px;
    line-height: 1.25;
    white-space: normal;
    word-break: keep-all;
  }

  .filter-field {
    gap: 6px;
  }

  .filter-field span {
    font-size: 12px;
  }

  .filter-field select,
  .btn-refresh {
    min-height: 42px;
    padding-left: 10px;
    padding-right: 10px;
  }

  .btn-refresh,
  .btn-submit,
  .btn-next,
  .btn-secondary,
  .btn-login-continue,
  .filter-field select {
    width: 100%;
  }

  .btn-refresh {
    border-radius: 12px;
    font-size: 14px;
  }

  .btn-next-inline {
    width: auto;
    min-height: 42px;
    padding: 10px 14px;
    font-size: 14px;
  }

  .question-actions-bar,
  .wrongbook-actions {
    flex-direction: column;
  }

  .option-button {
    grid-template-columns: 44px 1fr;
    padding: 14px;
  }

  .option-key {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }
}
</style>