<template>
  <div class="quiz-issue-admin-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Quiz Maintenance</p>
        <h1>问题题目维护</h1>
        <p class="page-copy">学员在刷题页标记后，管理员可在这里查看反馈、添加备注，并直接修订答案、解析和标签。</p>
      </div>
      <button class="btn-refresh" :disabled="loading" @click="fetchIssues">
        {{ loading ? '刷新中...' : '刷新列表' }}
      </button>
    </header>

    <section class="stats-row">
      <article class="stat-card">
        <span>待处理</span>
        <strong>{{ statusStats.pending || 0 }}</strong>
      </article>
      <article class="stat-card">
        <span>处理中</span>
        <strong>{{ statusStats.reviewing || 0 }}</strong>
      </article>
      <article class="stat-card">
        <span>已处理</span>
        <strong>{{ statusStats.resolved || 0 }}</strong>
      </article>
      <article class="stat-card muted">
        <span>已忽略</span>
        <strong>{{ statusStats.ignored || 0 }}</strong>
      </article>
    </section>

    <section class="filter-bar">
      <input v-model="searchQuery" class="search-input" placeholder="搜索题号、题目来源、学员、说明" @keyup.enter="handleSearch">
      <select v-model="selectedStatus" class="filter-select" @change="handleSearch">
        <option value="">全部状态</option>
        <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <select v-model="selectedIssueType" class="filter-select" @change="handleSearch">
        <option value="">全部问题类型</option>
        <option v-for="item in issueTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <button class="btn-search" :disabled="loading" @click="handleSearch">筛选</button>
    </section>

    <div v-if="loading" class="state-card">正在加载反馈列表...</div>
    <div v-else-if="error" class="state-card error">{{ error }}</div>
    <div v-else-if="issues.length === 0" class="state-card">当前没有匹配的问题反馈。</div>

    <section v-else class="issue-list">
      <article v-for="item in issues" :key="item._id" class="issue-card">
        <div class="issue-card-top">
          <div>
            <div class="issue-title-row">
              <strong>{{ item.questionUid }}</strong>
              <span class="chip">{{ issueTypeLabel(item.issueType) }}</span>
              <span class="chip status" :class="`status-${item.status}`">{{ statusLabel(item.status) }}</span>
              <span class="chip" :class="item.questionEnabled ? 'question-on' : 'question-off'">
                {{ item.questionEnabled ? '题目启用中' : '题目已停用' }}
              </span>
              <span class="chip review" :class="`review-${item.questionReviewStatus || 'pending'}`">
                {{ reviewStatusLabel(item.questionReviewStatus) }}
              </span>
            </div>
            <p class="issue-source">{{ item.sourceTitle || '未知来源' }}<span v-if="item.paperQuestionNo"> · 第 {{ item.paperQuestionNo }} 题</span></p>
            <p class="issue-stem">{{ item.stemPreview || '无预览' }}</p>
          </div>
          <div class="issue-meta">
            <span>学员：{{ item.reporterName || item.userId }}</span>
            <span>提交：{{ formatDateTime(item.reportedAt) }}</span>
            <span v-if="item.handledAt">处理：{{ formatDateTime(item.handledAt) }}</span>
          </div>
        </div>

        <div class="issue-body-grid">
          <div class="issue-block">
            <span class="block-label">学员说明</span>
            <p>{{ item.detail || '学员未填写补充说明' }}</p>
          </div>
          <div class="issue-block">
            <span class="block-label">题目标签</span>
            <div class="tag-row">
              <span class="tag-pill level">{{ item.questionLevelTag || item.levelTag || '未分级' }}</span>
              <span v-for="tag in item.questionTags || item.tags || []" :key="`${item._id}-${tag}`" class="tag-pill">{{ tag }}</span>
            </div>
          </div>
        </div>

        <div class="issue-actions-grid">
          <label class="field-inline">
            <span>处理状态</span>
            <select v-model="item._draftStatus" :disabled="item._saving">
              <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
            </select>
          </label>
          <label class="field-inline note-field">
            <span>管理员备注</span>
            <input v-model="item._draftAdminNote" :disabled="item._saving" maxlength="500" placeholder="例如：确认是坏题，已先停用，等待修订后重开">
          </label>
        </div>

        <div class="issue-actions-row">
          <button class="btn-action primary" :disabled="item._saving" @click="saveIssue(item)">
            {{ item._saving ? '保存中...' : '保存处理结果' }}
          </button>
          <button class="btn-action" :disabled="item._saving" @click="toggleQuestionEnabled(item, !item.questionEnabled)">
            {{ item.questionEnabled ? '停用这道题' : '重新启用题目' }}
          </button>
          <button class="btn-action" :disabled="item._saving || item._editorLoading" @click="toggleQuestionEditor(item)">
            {{ item._editorOpen ? '收起题目编辑' : '编辑题目内容' }}
          </button>
          <button class="btn-action subtle" :disabled="item._saving" @click="openQuestionSearch(item)">
            复制题号去排查
          </button>
        </div>

        <section v-if="item._editorOpen" class="question-editor-card">
          <div v-if="item._editorLoading" class="editor-loading">正在加载题目详情...</div>
          <div v-else-if="item._editorError" class="editor-error">{{ item._editorError }}</div>
          <template v-else-if="item._questionDraft">
            <div class="editor-preview">
              <span class="block-label">当前题干</span>
              <p>{{ item._questionDraft.stemText || item._questionDraft.stem || '无题干' }}</p>
              <div v-if="item._questionDraft.options?.length" class="option-list">
                <div v-for="option in item._questionDraft.options" :key="`${item._id}-${option.key}`" class="option-item">
                  <strong>{{ option.key }}.</strong>
                  <span>{{ option.textPlain || option.text }}</span>
                </div>
              </div>
            </div>

            <label class="field-inline textarea-field">
              <span>题干</span>
              <textarea v-model="item._questionDraft.stem" :disabled="item._editorSaving" rows="5" placeholder="支持保留原有 Markdown 内容"></textarea>
            </label>

            <section v-if="item._questionDraft.type === 'single'" class="option-editor-section">
              <div class="option-editor-header">
                <span class="block-label">题目选项</span>
                <button class="btn-action" type="button" :disabled="item._editorSaving" @click="addQuestionOption(item)">
                  添加选项
                </button>
              </div>
              <div class="option-editor-list">
                <div v-for="(option, index) in item._questionDraft.options" :key="`${item._id}-edit-${index}`" class="option-editor-item">
                  <label class="field-inline option-key-field">
                    <span>标识</span>
                    <input v-model="option.key" :disabled="item._editorSaving" maxlength="8" placeholder="A">
                  </label>
                  <label class="field-inline option-text-field">
                    <span>内容</span>
                    <textarea v-model="option.text" :disabled="item._editorSaving" rows="2" placeholder="输入选项内容"></textarea>
                  </label>
                  <button class="btn-action subtle option-remove-button" type="button" :disabled="item._editorSaving || item._questionDraft.options.length <= 2" @click="removeQuestionOption(item, index)">
                    删除
                  </button>
                </div>
              </div>
            </section>

            <div class="editor-grid">
              <label class="field-inline">
                <span>正确答案</span>
                <input v-model="item._questionDraft.answer" :disabled="item._editorSaving" :placeholder="item._questionDraft.type === 'judge' ? 'true / false' : '如 A'">
              </label>
              <label class="field-inline">
                <span>审核状态</span>
                <select v-model="item._questionDraft.reviewStatus" :disabled="item._editorSaving">
                  <option v-for="status in reviewStatusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
                </select>
              </label>
              <label class="field-inline">
                <span>级别标签</span>
                <input v-model="item._questionDraft.levelTag" :disabled="item._editorSaving" placeholder="如 GESP 四级">
              </label>
              <label class="field-inline">
                <span>题目状态</span>
                <select v-model="item._questionDraft.enabled" :disabled="item._editorSaving">
                  <option :value="true">启用</option>
                  <option :value="false">停用</option>
                </select>
              </label>
            </div>

            <label class="field-inline textarea-field">
              <span>知识标签</span>
              <textarea v-model="item._questionDraft.tagsText" :disabled="item._editorSaving" rows="2" placeholder="多个标签用逗号、顿号或换行分隔"></textarea>
            </label>

            <label class="field-inline textarea-field">
              <span>题目解析</span>
              <textarea v-model="item._questionDraft.explanation" :disabled="item._editorSaving" rows="6" placeholder="支持保留原有 Markdown 内容"></textarea>
            </label>

            <div class="editor-actions-row">
              <button class="btn-action primary" :disabled="item._editorSaving" @click="saveQuestionEditor(item)">
                {{ item._editorSaving ? '保存题目中...' : '保存题目修改' }}
              </button>
              <button class="btn-action" :disabled="item._editorSaving || item._editorLoading" @click="loadQuestionEditor(item, true)">
                重新加载题目
              </button>
              <span class="editor-meta" v-if="item._questionDraft.updatedAt">最近更新：{{ formatDateTime(item._questionDraft.updatedAt) }}</span>
            </div>
          </template>
        </section>
      </article>
    </section>

    <footer class="pagination" v-if="totalPages > 1">
      <button class="btn-page" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页，共 {{ total }} 条</span>
      <button class="btn-page" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </footer>
  </div>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue'
import request from '../utils/request'

const showToastMessage = inject('showToastMessage', () => {})

const loading = ref(false)
const error = ref('')
const issues = ref([])
const searchQuery = ref('')
const selectedStatus = ref('pending')
const selectedIssueType = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(1)
const statusStats = ref({})

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'reviewing', label: '处理中' },
  { value: 'resolved', label: '已处理' },
  { value: 'ignored', label: '已忽略' }
]

const reviewStatusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'reviewed', label: '已审核' },
  { value: 'rejected', label: '已驳回' }
]

const issueTypeOptions = [
  { value: 'wrong_answer', label: '答案不对' },
  { value: 'wrong_explanation', label: '解析有问题' },
  { value: 'wrong_options', label: '选项有误' },
  { value: 'ambiguous', label: '题意不清 / 疑似多解' },
  { value: 'formatting', label: '排版或内容缺失' },
  { value: 'other', label: '其他问题' }
]

function statusLabel(value) {
  return statusOptions.find((item) => item.value === value)?.label || value || '待处理'
}

function issueTypeLabel(value) {
  return issueTypeOptions.find((item) => item.value === value)?.label || value || '其他问题'
}

function reviewStatusLabel(value) {
  return reviewStatusOptions.find((item) => item.value === value)?.label || value || '待审核'
}

function formatTagsInput(tags) {
  return Array.isArray(tags) ? tags.join('，') : ''
}

function createQuestionDraft(question) {
  return {
    questionUid: question.questionUid,
    type: question.type,
    stem: question.stem || '',
    stemText: question.stemText || '',
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
        key: option?.key || '',
        text: option?.text || '',
        textPlain: option?.textPlain || '',
        images: Array.isArray(option?.images) ? option.images : []
      }))
      : [],
    answer: question.answer || '',
    explanation: question.explanation || '',
    tags: Array.isArray(question.tags) ? question.tags : [],
    tagsText: formatTagsInput(question.tags),
    levelTag: question.levelTag || '',
    reviewStatus: question.reviewStatus || 'pending',
    enabled: question.enabled !== false,
    updatedAt: question.updatedAt || null
  }
}

function normalizeDraftOptionKey(value, fallbackIndex) {
  const raw = String(value || '').trim().toUpperCase()
  if (raw) return raw
  return String.fromCharCode(65 + fallbackIndex)
}

function serializeQuestionOptions(draft) {
  if (draft.type === 'judge') return []
  return (draft.options || []).map((option, index) => ({
    key: normalizeDraftOptionKey(option?.key, index),
    text: String(option?.text || '').trim(),
    images: Array.isArray(option?.images) ? option.images : []
  }))
}

function hydrateItem(item) {
  return {
    ...item,
    _saving: false,
    _draftStatus: item.status || 'pending',
    _draftAdminNote: item.adminNote || '',
    _editorOpen: false,
    _editorLoading: false,
    _editorSaving: false,
    _editorError: '',
    _questionDraft: null
  }
}

function formatDateTime(value) {
  if (!value) return '未处理'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未处理'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function fetchIssues() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(limit.value)
    })
    if (searchQuery.value.trim()) params.set('q', searchQuery.value.trim())
    if (selectedStatus.value) params.set('status', selectedStatus.value)
    if (selectedIssueType.value) params.set('issueType', selectedIssueType.value)

    const data = await request(`/api/admin/quiz-issues?${params.toString()}`)
    issues.value = Array.isArray(data?.items) ? data.items.map(hydrateItem) : []
    total.value = Number(data?.total || 0)
    totalPages.value = Math.max(1, Number(data?.totalPages || 1))
    page.value = Number(data?.page || 1)
    statusStats.value = data?.statusStats || {}
  } catch (e) {
    error.value = e.message || '加载反馈列表失败'
    issues.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchIssues()
}

function changePage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
  fetchIssues()
}

async function saveIssue(item) {
  item._saving = true
  try {
    const data = await request(`/api/admin/quiz-issues/${item._id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: item._draftStatus,
        adminNote: item._draftAdminNote
      })
    })
    Object.assign(item, hydrateItem(data?.item || item))
    showToastMessage('处理结果已保存')
    await fetchIssues()
  } catch (e) {
    showToastMessage(e.message || '保存失败')
    item._saving = false
  }
}

async function toggleQuestionEnabled(item, nextEnabled) {
  item._saving = true
  try {
    const data = await request(`/api/admin/quiz-issues/${item._id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        questionEnabled: nextEnabled
      })
    })
    Object.assign(item, hydrateItem(data?.item || { ...item, questionEnabled: nextEnabled }))
    showToastMessage(nextEnabled ? '题目已重新启用' : '题目已停用')
    await fetchIssues()
  } catch (e) {
    showToastMessage(e.message || '更新题目状态失败')
    item._saving = false
  }
}

async function loadQuestionEditor(item, forceReload = false) {
  if (!forceReload && item._questionDraft) {
    item._editorError = ''
    return
  }

  item._editorLoading = true
  item._editorError = ''
  try {
    const data = await request(`/api/admin/quiz-questions/${encodeURIComponent(item.questionUid)}`)
    item._questionDraft = createQuestionDraft(data?.item || {})
  } catch (e) {
    item._editorError = e.message || '加载题目详情失败'
  } finally {
    item._editorLoading = false
  }
}

async function toggleQuestionEditor(item) {
  item._editorOpen = !item._editorOpen
  if (item._editorOpen) {
    await loadQuestionEditor(item)
  }
}

async function saveQuestionEditor(item) {
  if (!item._questionDraft) return

  item._editorSaving = true
  item._editorError = ''
  try {
    const data = await request(`/api/admin/quiz-questions/${encodeURIComponent(item.questionUid)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stem: item._questionDraft.stem,
        options: serializeQuestionOptions(item._questionDraft),
        answer: item._questionDraft.answer,
        explanation: item._questionDraft.explanation,
        tags: item._questionDraft.tagsText,
        levelTag: item._questionDraft.levelTag,
        reviewStatus: item._questionDraft.reviewStatus,
        enabled: item._questionDraft.enabled
      })
    })

    item._questionDraft = createQuestionDraft(data?.item || {})
    item.questionEnabled = item._questionDraft.enabled
    item.questionReviewStatus = item._questionDraft.reviewStatus
    item.questionUpdatedAt = item._questionDraft.updatedAt
    item.questionTags = [...item._questionDraft.tags]
    item.questionLevelTag = item._questionDraft.levelTag
    showToastMessage('题目内容已更新')
    await fetchIssues()
  } catch (e) {
    item._editorError = e.message || '保存题目失败'
    showToastMessage(item._editorError)
  } finally {
    item._editorSaving = false
  }
}

function addQuestionOption(item) {
  if (!item?._questionDraft || item._questionDraft.type !== 'single') return
  const nextIndex = item._questionDraft.options.length
  item._questionDraft.options.push({
    key: String.fromCharCode(65 + nextIndex),
    text: '',
    textPlain: '',
    images: []
  })
}

function removeQuestionOption(item, index) {
  if (!item?._questionDraft || item._questionDraft.type !== 'single') return
  if (item._questionDraft.options.length <= 2) return
  item._questionDraft.options.splice(index, 1)
}

async function openQuestionSearch(item) {
  try {
    await navigator.clipboard.writeText(item.questionUid || '')
    showToastMessage(`已复制题号：${item.questionUid}`)
  } catch {
    showToastMessage(item.questionUid || '复制失败')
  }
}

onMounted(() => {
  fetchIssues()
})
</script>

<style scoped>
.quiz-issue-admin-page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px;
  color: #1f2937;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #9a3412;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
}

.page-copy {
  margin: 8px 0 0;
  color: #6b7280;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.stat-card {
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff7ed, #fffbeb);
  border: 1px solid rgba(217, 119, 6, 0.14);
}

.stat-card.muted {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-color: rgba(148, 163, 184, 0.2);
}

.stat-card span {
  display: block;
  font-size: 13px;
  color: #78716c;
}

.stat-card strong {
  display: block;
  margin-top: 6px;
  font-size: 26px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.search-input,
.filter-select,
.field-inline select,
.field-inline input {
  border: 1px solid #d6d3d1;
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
}

.search-input {
  flex: 1;
}

.btn-search,
.btn-refresh,
.btn-action,
.btn-page {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  font: inherit;
  cursor: pointer;
}

.btn-search,
.btn-refresh,
.btn-action.primary {
  background: #c2410c;
  color: #fff;
}

.btn-action {
  background: #f3f4f6;
  color: #111827;
}

.btn-action.subtle {
  background: #fff7ed;
  color: #9a3412;
}

.state-card {
  padding: 18px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.state-card.error {
  border-color: rgba(220, 38, 38, 0.18);
  background: #fef2f2;
  color: #991b1b;
}

.issue-list {
  display: grid;
  gap: 14px;
}

.issue-card {
  padding: 18px;
  border-radius: 20px;
  border: 1px solid #e7e5e4;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.issue-card-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.issue-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.issue-source,
.issue-stem,
.issue-meta,
.issue-block p {
  margin: 8px 0 0;
}

.issue-source {
  color: #78716c;
}

.issue-stem {
  color: #374151;
}

.issue-meta {
  min-width: 220px;
  display: grid;
  gap: 6px;
  color: #6b7280;
  font-size: 13px;
  text-align: right;
}

.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.chip.status-pending { background: #fef3c7; color: #92400e; }
.chip.status-reviewing { background: #dbeafe; color: #1d4ed8; }
.chip.status-resolved { background: #dcfce7; color: #166534; }
.chip.status-ignored { background: #e5e7eb; color: #4b5563; }
.chip.question-on { background: #ecfccb; color: #3f6212; }
.chip.question-off { background: #fee2e2; color: #b91c1c; }
.chip.review-pending { background: #f3f4f6; color: #4b5563; }
.chip.review-reviewed { background: #dbeafe; color: #1d4ed8; }
.chip.review-rejected { background: #fee2e2; color: #b91c1c; }

.issue-body-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.issue-block {
  padding: 14px;
  border-radius: 16px;
  background: #fafaf9;
  border: 1px solid #f1f5f9;
}

.block-label {
  display: block;
  margin-bottom: 8px;
  color: #78716c;
  font-size: 12px;
  font-weight: 700;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.tag-pill.level {
  background: #dbeafe;
  color: #1d4ed8;
}

.issue-actions-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  margin-top: 16px;
}

.field-inline {
  display: grid;
  gap: 6px;
}

.field-inline span {
  font-size: 12px;
  font-weight: 700;
  color: #78716c;
}

.issue-actions-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.question-editor-card {
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #dbe4ee;
}

.editor-loading,
.editor-error {
  padding: 14px;
  border-radius: 14px;
  background: #fff;
}

.editor-error {
  color: #991b1b;
  border: 1px solid rgba(220, 38, 38, 0.18);
  background: #fef2f2;
}

.editor-preview {
  margin-bottom: 14px;
}

.editor-preview p {
  margin: 8px 0 0;
  color: #334155;
}

.option-editor-section {
  margin: 14px 0;
}

.option-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.option-editor-list {
  display: grid;
  gap: 10px;
}

.option-editor-item {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.option-key-field input,
.option-text-field textarea {
  border: 1px solid #d6d3d1;
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
}

.option-text-field textarea {
  resize: vertical;
}

.option-remove-button {
  align-self: center;
}

.option-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.option-item {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.textarea-field textarea {
  border: 1px solid #d6d3d1;
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
  resize: vertical;
}

.editor-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.editor-meta {
  color: #6b7280;
  font-size: 13px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-top: 24px;
}

.btn-page:disabled,
.btn-action:disabled,
.btn-search:disabled,
.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .stats-row,
  .issue-body-grid,
  .issue-actions-grid,
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar,
  .issue-card-top,
  .issue-actions-row,
  .editor-actions-row,
  .page-header {
    flex-direction: column;
  }

  .issue-meta {
    text-align: left;
    min-width: 0;
  }

  .option-editor-item {
    grid-template-columns: 1fr;
  }
}
</style>