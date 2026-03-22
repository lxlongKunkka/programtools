<template>
  <div class="quiz-daily-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">GESP 客观题</p>
        <h1>每日打卡，可连续刷题</h1>
        <p class="hero-text">当天至少完成 1 题就算打卡成功。完成后还可以继续刷下一题，手机上也能顺手连续做。</p>
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
    </section>

    <div class="page-grid">
      <section class="main-panel">
        <div class="toolbar">
          <div>
            <p class="toolbar-label">今日日期</p>
            <h2>{{ currentDateText }}</h2>
          </div>
          <div class="toolbar-actions">
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

        <div v-if="loading" class="state-card">正在加载今日题目...</div>
        <div v-else-if="error" class="state-card error">{{ error }}</div>

        <template v-else>
          <div v-if="question" class="question-card">
            <div class="question-meta">
              <span class="meta-chip">{{ question.levelTag || '未分级' }}</span>
              <span class="meta-chip">{{ question.type === 'judge' ? '判断题' : '单选题' }}</span>
              <span v-for="tag in question.tags || []" :key="tag" class="meta-chip knowledge-chip">{{ tag }}</span>
              <span v-if="question.sourceTitle" class="meta-source">{{ question.sourceTitle }}</span>
            </div>

            <div class="question-body">
              <MarkdownViewer :content="question.stem" />
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
                <span class="option-text" v-html="renderInlineMarkdown(option.text)"></span>
              </button>
            </div>

            <div v-if="!result" class="submit-row">
              <button class="btn-submit" :disabled="!selectedAnswer || submitting" @click="submitAnswer">
                {{ submitting ? '提交中...' : '提交答案' }}
              </button>
            </div>

            <div v-if="result" class="result-panel" :class="result.correct ? 'correct' : 'wrong'">
              <div class="result-title-row">
                <h3>{{ result.correct ? '回答正确' : '回答错误' }}</h3>
                <span class="answer-pill">正确答案：{{ optionLabel(result.correctAnswer) }}</span>
              </div>
              <p class="result-copy">
                {{ result.correct ? '今天这道题已经完成，系统已为你记录打卡。' : '今天这道题已经提交，系统已为你记录打卡，下次可以再来复习。' }}
              </p>
              <div v-if="result.explanation" class="explanation-box">
                <h4>题目解析</h4>
                <MarkdownViewer :content="result.explanation" />
              </div>
              <div class="submit-row next-row">
                <button class="btn-next" :disabled="loading" @click="fetchCurrentQuestion">
                  再来一题
                </button>
              </div>
            </div>
          </div>

          <div v-else class="state-card success">
            <h3>今天可做的题目已经刷完</h3>
            <p>今天这组题已经没有新的未做题目了。你可以查看右侧排行榜和最近打卡记录。</p>
          </div>
        </template>
      </section>

      <aside class="side-panel">
        <div class="side-card progress-card">
          <div class="side-card-header">
            <h3>今日状态</h3>
            <span class="status-badge" :class="progress.completed ? 'done' : 'pending'">
              {{ progress.completed ? '已打卡' : '未打卡' }}
            </span>
          </div>
          <div class="progress-grid">
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

        <div class="side-card">
          <div class="side-card-header">
            <h3>今日排行榜</h3>
            <span class="muted-text">Top 20</span>
          </div>
          <div v-if="leaderboardLoading" class="small-state">加载中...</div>
          <div v-else-if="leaderboard.length === 0" class="small-state">今天还没有同学打卡</div>
          <ul v-else class="leaderboard-list">
            <li v-for="(item, index) in leaderboard" :key="item.userId" class="leaderboard-item">
              <span class="rank">{{ index + 1 }}</span>
              <span class="name">{{ item.uname }}</span>
              <span class="score">{{ item.correctCount }}/{{ item.answeredCount }}</span>
            </li>
          </ul>
        </div>

        <div class="side-card">
          <div class="side-card-header">
            <h3>最近打卡</h3>
            <span class="muted-text">最近 {{ history.length }} 天</span>
          </div>
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
        </div>

        <div class="side-card wrongbook-card">
          <div class="side-card-header">
            <h3>错题本</h3>
            <span class="muted-text">最近 {{ wrongbook.length }} 题</span>
          </div>
          <div v-if="wrongbookLoading" class="small-state">加载中...</div>
          <div v-else-if="wrongbook.length === 0" class="small-state">暂时还没有错题</div>
          <ul v-else class="wrongbook-list">
            <li v-for="item in wrongbook" :key="item.questionUid" class="wrongbook-item">
              <div class="wrongbook-head">
                <span class="meta-chip small">{{ item.levelTag || '未分级' }}</span>
                <span v-for="tag in item.tags || []" :key="`${item.questionUid}-${tag}`" class="meta-chip small knowledge-chip">{{ tag }}</span>
              </div>
              <p class="wrongbook-stem">{{ item.stem }}</p>
              <p class="wrongbook-answer">你的答案：{{ optionLabel(item.selectedAnswer) }} ｜ 正确答案：{{ optionLabel(item.correctAnswer) }}</p>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import MarkdownViewer from '../components/MarkdownViewer.vue'
import request from '../utils/request'

const showToastMessage = inject('showToastMessage', () => {})
const QUIZ_LEVEL_STORAGE_KEY = 'quiz_daily_level_tag'
const QUIZ_KNOWLEDGE_STORAGE_KEY = 'quiz_daily_knowledge_tag'

const loading = ref(true)
const submitting = ref(false)
const leaderboardLoading = ref(false)
const historyLoading = ref(false)
const wrongbookLoading = ref(false)
const error = ref('')
const question = ref(null)
const selectedAnswer = ref('')
const selectedLevelTag = ref(localStorage.getItem(QUIZ_LEVEL_STORAGE_KEY) || '')
const selectedKnowledgeTag = ref(localStorage.getItem(QUIZ_KNOWLEDGE_STORAGE_KEY) || '')
const levelOptions = ref([])
const knowledgeTagOptions = ref([])
const result = ref(null)
const today = ref('')
const progress = ref({
  answeredCount: 0,
  correctCount: 0,
  streak: 0,
  completed: false,
  questionUids: []
})
const leaderboard = ref([])
const history = ref([])
const wrongbook = ref([])

const currentDateText = computed(() => {
  if (!today.value) return '今日'
  return today.value
})

onMounted(async () => {
  await fetchLevelOptions()
  await refreshAll()
})

async function refreshAll() {
  await Promise.all([
    fetchCurrentQuestion(),
    fetchLeaderboard(),
    fetchHistory(),
    fetchWrongbook()
  ])
}

async function fetchCurrentQuestion() {
  loading.value = true
  error.value = ''
  selectedAnswer.value = ''
  result.value = null

  try {
    const params = new URLSearchParams()
    if (selectedLevelTag.value) params.set('levelTag', selectedLevelTag.value)
    if (selectedKnowledgeTag.value) params.set('tag', selectedKnowledgeTag.value)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const data = await request(`/api/quiz/daily/current${suffix}`)
    today.value = data?.date || ''
    question.value = data?.question || null
    progress.value = {
      answeredCount: data?.progress?.answeredCount || 0,
      correctCount: data?.progress?.correctCount || 0,
      streak: data?.progress?.streak || 0,
      completed: !!data?.completed,
      questionUids: data?.progress?.questionUids || []
    }
  } catch (e) {
    error.value = e.message || '获取今日题目失败'
  } finally {
    loading.value = false
  }
}

async function fetchLevelOptions() {
  try {
    const data = await request('/api/quiz/daily/options')
    levelOptions.value = Array.isArray(data?.levels) ? data.levels : []
    knowledgeTagOptions.value = Array.isArray(data?.knowledgeTags) ? data.knowledgeTags : []
  } catch {
    levelOptions.value = []
    knowledgeTagOptions.value = []
  }
}

function handleLevelChange() {
  localStorage.setItem(QUIZ_LEVEL_STORAGE_KEY, selectedLevelTag.value)
  localStorage.setItem(QUIZ_KNOWLEDGE_STORAGE_KEY, selectedKnowledgeTag.value)
  refreshAll()
}

async function submitAnswer() {
  if (!question.value || !selectedAnswer.value) return

  submitting.value = true
  try {
    const data = await request('/api/quiz/daily/submit', {
      method: 'POST',
      body: JSON.stringify({
        questionUid: question.value.questionUid,
        selectedAnswer: selectedAnswer.value,
        levelTag: selectedLevelTag.value,
        tag: selectedKnowledgeTag.value
      })
    })

    result.value = {
      correct: !!data?.correct,
      correctAnswer: data?.correctAnswer || '',
      explanation: data?.explanation || ''
    }
    progress.value = {
      answeredCount: data?.progress?.answeredCount || progress.value.answeredCount,
      correctCount: data?.progress?.correctCount || progress.value.correctCount,
      streak: data?.progress?.streak || progress.value.streak,
      completed: !!data?.completed,
      questionUids: data?.progress?.questionUids || progress.value.questionUids
    }
    showToastMessage(data?.correct ? '回答正确，已完成今日打卡' : '已提交，今日打卡已记录')
    await Promise.all([fetchLeaderboard(), fetchHistory(), fetchWrongbook()])
  } catch (e) {
    showToastMessage(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function fetchLeaderboard() {
  leaderboardLoading.value = true
  try {
    const data = await request('/api/quiz/daily/leaderboard')
    leaderboard.value = Array.isArray(data?.leaderboard) ? data.leaderboard : []
  } catch {
    leaderboard.value = []
  } finally {
    leaderboardLoading.value = false
  }
}

async function fetchHistory() {
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
  wrongbookLoading.value = true
  try {
    const data = await request('/api/quiz/daily/wrongbook?limit=10')
    wrongbook.value = Array.isArray(data?.items) ? data.items : []
  } catch {
    wrongbook.value = []
  } finally {
    wrongbookLoading.value = false
  }
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

function renderInlineMarkdown(content) {
  const html = marked.parseInline(content || '', { mangle: false, headerIds: false })
  return DOMPurify.sanitize(html)
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

.main-panel,
.side-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(18, 52, 88, 0.08);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.main-panel {
  border-radius: 24px;
  padding: 22px;
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

.toolbar {
  gap: 16px;
  margin-bottom: 18px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
.btn-next {
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

.btn-refresh:hover,
.btn-submit:hover,
.btn-next:hover {
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

.question-card {
  padding: 22px;
  background: linear-gradient(180deg, #fffef8 0%, #ffffff 100%);
  border: 1px solid rgba(217, 119, 6, 0.12);
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

.knowledge-chip {
  background: #fff3e6;
  color: #9a3412;
}
}

.meta-chip {
  padding: 6px 10px;
  background: #eff6ff;
  color: #1d4ed8;
}

.meta-source {
  font-size: 12px;
  color: #6b7280;
  align-self: center;
}

.question-body {
  padding: 6px 0 14px;
}

.question-body :deep(.markdown-viewer) {
  padding-bottom: 0;
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
}

.option-text :deep(p) {
  margin: 0;
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
  flex: 1;
  font-weight: 700;
  color: #1f2937;
}

.score {
  color: #123458;
  font-weight: 700;
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
  .hero-panel,
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

  .hero-panel,
  .main-panel,
  .side-card,
  .question-card {
    padding: 16px;
    border-radius: 18px;
  }

  .hero-panel h1 {
    font-size: 28px;
  }

  .hero-stats,
  .progress-grid {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .result-title-row,
  .history-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-actions,
  .filter-field {
    width: 100%;
  }

  .btn-refresh,
  .btn-submit,
  .btn-next,
  .filter-field select {
    width: 100%;
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