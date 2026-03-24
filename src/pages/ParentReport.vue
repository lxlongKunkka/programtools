<template>
  <div class="parent-report-page">
    <section class="hero-card">
      <p class="eyebrow">家长日报</p>
      <h1>{{ learnerName }} 的学习情况</h1>
      <p class="hero-copy">无需登录即可查看孩子最近的 Quiz 刷题与 Course 学习进展。</p>
      <div class="hero-meta">
        <span>生成时间：{{ formatDateTime(report.share?.createdAt) }}</span>
        <span>失效时间：{{ formatDateTime(report.share?.expiresAt) }}</span>
        <span>最近访问：{{ formatDateTime(report.share?.lastAccessAt) }}</span>
      </div>
    </section>

    <section v-if="loading" class="panel empty-panel">加载中...</section>
    <section v-else-if="error" class="panel empty-panel">{{ error }}</section>
    <template v-else>
      <section class="narrative-grid">
        <article class="panel narrative-panel">
          <h3>今天表现</h3>
          <p class="narrative-copy">{{ report.narrative.todayPerformance }}</p>
        </article>
        <article class="panel narrative-panel">
          <h3>最近需要关注的点</h3>
          <div v-if="!report.narrative.recentFocus.length" class="empty-inline">整体状态稳定，近期没有明显风险。</div>
          <ul v-else class="narrative-list">
            <li v-for="item in report.narrative.recentFocus" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article class="panel narrative-panel">
          <h3>老师建议</h3>
          <ul class="narrative-list">
            <li v-for="item in report.narrative.teacherAdvice" :key="item">{{ item }}</li>
          </ul>
        </article>
      </section>

      <section class="section-block report-tabs-wrap">
        <div class="report-tabs">
          <button :class="['report-tab', activeTab === 'quiz' ? 'active' : '']" @click="activeTab = 'quiz'">
            <span>Quiz</span>
            <strong>{{ report.quiz.learner.answeredCount }} 题</strong>
          </button>
          <button :class="['report-tab', activeTab === 'course' ? 'active' : '']" @click="activeTab = 'course'">
            <span>Course</span>
            <strong>{{ report.course.learner.completedChaptersCount }} / {{ report.course.learner.totalChapters }}</strong>
          </button>
        </div>

        <section v-if="activeTab === 'quiz'" class="tab-panel">
          <div class="section-head">
            <h2>Quiz 日报</h2>
            <p>最近 14 天刷题活跃度、正确率与最近作答。</p>
          </div>
          <div class="summary-grid">
            <article class="summary-card accent"><span>最近答题</span><strong>{{ report.quiz.learner.answeredCount }}</strong></article>
            <article class="summary-card"><span>正确率</span><strong>{{ report.quiz.learner.accuracy }}%</strong></article>
            <article class="summary-card"><span>活跃天数</span><strong>{{ report.quiz.learner.activeDays }}</strong></article>
            <article class="summary-card"><span>连续打卡</span><strong>{{ report.quiz.learner.streak }}</strong></article>
            <article class="summary-card"><span>错题本</span><strong>{{ report.quiz.learner.wrongbookActiveCount }}</strong></article>
            <article class="summary-card"><span>已收藏</span><strong>{{ report.quiz.learner.favoriteActiveCount }}</strong></article>
          </div>

          <div class="content-grid">
            <article class="panel">
              <h3>最近打卡</h3>
              <div v-if="!report.quiz.recentProgress.length" class="empty-inline">最近暂无打卡记录</div>
              <div v-else class="list-block">
                <div v-for="item in report.quiz.recentProgress" :key="item.date" class="row-item">
                  <strong>{{ item.date }}</strong>
                  <span>{{ item.answeredCount }} 题 / {{ item.correctCount }} 对</span>
                  <span>{{ item.completed ? '已完成' : '未完成' }}</span>
                </div>
              </div>
            </article>

            <article class="panel">
              <h3>最近 14 天练习标签</h3>
              <div v-if="!report.quiz.practicedTags.length" class="empty-inline">最近 14 天暂无标签分布</div>
              <div v-else class="practice-tag-list">
                <article v-for="tag in report.quiz.practicedTags" :key="tag.tag" class="practice-tag-item">
                  <div>
                    <strong>{{ tag.tag }}</strong>
                    <p>{{ tag.attemptCount }} 题 · 正确率 {{ tag.accuracy }}%</p>
                  </div>
                  <span class="tag-meta">错 {{ tag.wrongCount }}</span>
                </article>
              </div>
            </article>
          </div>

          <div class="content-grid single-column-grid">
            <article class="panel">
              <h3>薄弱知识点</h3>
              <div v-if="!report.quiz.weakTags.length" class="empty-inline">近 14 天没有明显薄弱点</div>
              <div v-else class="tag-list">
                <span v-for="tag in report.quiz.weakTags" :key="tag.tag" class="tag-pill">{{ tag.tag }} · {{ tag.wrongCount }}</span>
              </div>
            </article>
          </div>

          <article class="panel">
            <h3>最近作答</h3>
            <div v-if="!report.quiz.recentAttempts.length" class="empty-inline">暂无作答记录</div>
            <div v-else class="attempt-list">
              <article v-for="attempt in report.quiz.recentAttempts" :key="`${attempt.questionUid}-${attempt.answeredAt}`" class="attempt-item">
                <div class="attempt-head">
                  <strong>{{ attempt.sourceTitle || attempt.questionUid }}</strong>
                  <span :class="['status-pill', attempt.isCorrect ? 'ok' : 'bad']">{{ attempt.isCorrect ? '正确' : '错误' }}</span>
                </div>
                <p class="attempt-stem">{{ attempt.stemPreview }}</p>
                <div class="attempt-meta">
                  <span>作答：{{ attempt.selectedAnswer || '-' }}</span>
                  <span>正确：{{ attempt.correctAnswer || '-' }}</span>
                  <span>{{ formatDateTime(attempt.answeredAt) }}</span>
                </div>
              </article>
            </div>
          </article>
        </section>

        <section v-else class="tab-panel">
          <div class="section-head">
            <h2>Course 日报</h2>
            <p>课程完成率、当前等级与最近学习轨迹。</p>
          </div>
          <div class="summary-grid">
            <article class="summary-card accent">
              <span>当前等级</span>
              <strong>L{{ report.course.learner.currentCppLevel }}</strong>
              <em>{{ report.course.learner.currentCppLevelTitle || '未匹配等级标题' }}</em>
            </article>
            <article class="summary-card"><span>当前专题</span><strong>{{ report.course.learner.currentTopicTitle || '暂无' }}</strong></article>
            <article class="summary-card"><span>当前章节</span><strong>{{ report.course.learner.currentChapterTitle || '暂无' }}</strong></article>
            <article class="summary-card"><span>完成率</span><strong>{{ report.course.learner.completionRate }}%</strong></article>
            <article class="summary-card"><span>已完成章节</span><strong>{{ report.course.learner.completedChaptersCount }} / {{ report.course.learner.totalChapters }}</strong></article>
            <article class="summary-card"><span>最近学习</span><strong>{{ formatDateTime(report.course.learner.lastActivityAt) }}</strong></article>
          </div>

          <article class="panel">
            <h3>近期关联作业</h3>
            <div v-if="!report.course.recentHomeworks.length" class="empty-inline">近期没有检测到关联作业</div>
            <div v-else class="homework-list">
              <article v-for="item in report.course.recentHomeworks" :key="item.homeworkId" class="homework-item">
                <div class="homework-head">
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>L{{ item.level }} {{ item.levelTitle }}<span v-if="item.topicTitle"> · {{ item.topicTitle }}</span><span v-if="item.chapterTitle"> · {{ item.chapterTitle }}</span></p>
                  </div>
                  <span :class="['status-pill', item.score !== null ? 'ok' : (item.attend ? 'warn' : 'bad')]">
                    {{ item.score !== null ? `得分 ${item.score}` : item.statusLabel }}
                  </span>
                </div>
                <div class="attempt-meta">
                  <span>题目数：{{ item.problemCount || 0 }}</span>
                  <span>状态：{{ item.statusLabel }}</span>
                  <a v-if="item.homeworkUrl" :href="item.homeworkUrl" target="_blank" rel="noreferrer">查看作业</a>
                </div>
              </article>
            </div>
          </article>

          <article class="panel">
            <h3>各 Level 完成情况</h3>
            <div v-if="!report.course.levels.length" class="empty-inline">暂无课程进度</div>
            <div v-else class="level-list">
              <article v-for="level in report.course.levels" :key="level.levelId" class="level-item">
                <div class="level-head">
                  <div>
                    <strong>{{ level.subject }} · L{{ level.level }} · {{ level.title }}</strong>
                    <p>{{ level.group || '未分组' }}</p>
                  </div>
                  <span>{{ level.completedChapters }} / {{ level.totalChapters }} · {{ level.completionRate }}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" :style="{ width: `${level.completionRate}%` }"></div></div>
                <div class="tag-list">
                  <span v-for="topic in level.topics" :key="topic.topicId" class="tag-pill">{{ topic.title }} {{ topic.completedCount }}/{{ topic.totalCount }}</span>
                </div>
              </article>
            </div>
          </article>

          <article class="panel">
            <h3>最近学习轨迹</h3>
            <div v-if="!report.course.recentActivities.length" class="empty-inline">近 30 天暂无学习记录</div>
            <div v-else class="attempt-list">
              <article v-for="activity in report.course.recentActivities" :key="`${activity.action}-${activity.chapterId}-${activity.sessionDate}`" class="attempt-item">
                <div class="attempt-head">
                  <strong>{{ formatCourseAction(activity.action) }} · {{ activity.chapterTitle || activity.chapterId }}</strong>
                  <span>{{ formatDateTime(activity.lastActiveAt) }}</span>
                </div>
                <p class="attempt-stem">{{ activity.subject }} · L{{ activity.level }} {{ activity.levelTitle }}<span v-if="activity.topicTitle"> · {{ activity.topicTitle }}</span></p>
                <div class="attempt-meta">
                  <span>日期：{{ activity.sessionDate }}</span>
                  <span v-if="activity.problemId">题目：{{ activity.problemId }}</span>
                  <span v-if="activity.group">分组：{{ activity.group }}</span>
                </div>
              </article>
            </div>
          </article>
        </section>
      </section>
    </template>
  </div>
</template>

<script>
import request from '../utils/request'

function createEmptyReport() {
  return {
    share: null,
    learner: null,
    narrative: {
      todayPerformance: '',
      recentFocus: [],
      teacherAdvice: []
    },
    quiz: {
      learner: { answeredCount: 0, accuracy: 0, activeDays: 0, streak: 0, wrongbookActiveCount: 0, favoriteActiveCount: 0 },
      recentProgress: [],
      recentAttempts: [],
      practicedTags: [],
      weakTags: []
    },
    course: {
      learner: {
        currentCppLevel: 1,
        currentCppLevelTitle: '',
        currentTopicTitle: '',
        currentChapterTitle: '',
        completionRate: 0,
        completedChaptersCount: 0,
        totalChapters: 0,
        lastActivityAt: null
      },
      levels: [],
      recentHomeworks: [],
      recentActivities: []
    }
  }
}

export default {
  name: 'ParentReport',
  data() {
    return {
      activeTab: 'quiz',
      loading: true,
      error: '',
      report: createEmptyReport()
    }
  },
  computed: {
    learnerName() {
      return this.report.learner?.learnerName || '孩子'
    }
  },
  watch: {
    '$route.params.token': {
      immediate: true,
      handler() {
        this.loadReport()
      }
    }
  },
  methods: {
    async loadReport() {
      const token = String(this.$route.params.token || '').trim()
      if (!token) {
        this.error = '家长日报链接无效'
        this.loading = false
        return
      }

      this.loading = true
      this.error = ''
      try {
        const data = await request(`/api/parent-report/${token}`)
        this.report = {
          share: data?.share || null,
          learner: data?.learner || null,
          narrative: data?.narrative || createEmptyReport().narrative,
          quiz: data?.quiz || createEmptyReport().quiz,
          course: data?.course || createEmptyReport().course
        }
      } catch (e) {
        this.error = e.message || '加载家长日报失败'
        this.report = createEmptyReport()
      } finally {
        this.loading = false
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
.parent-report-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 18px 48px;
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
.hero-card h1 { margin: 0 0 10px; font-size: 34px; }
.hero-copy { margin: 0; color: #51606f; line-height: 1.6; }
.hero-meta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px; color: #5a6c7e; font-size: 13px; }
.narrative-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.narrative-panel {
  min-height: 180px;
}
.narrative-copy {
  margin: 0;
  color: #475569;
  line-height: 1.8;
}
.narrative-list {
  margin: 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.8;
}
.section-block { margin-top: 22px; }
.report-tabs-wrap {
  padding: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}
.report-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.report-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid #d6e0eb;
  background: #f5f9fd;
  color: #35506b;
  cursor: pointer;
  transition: all 0.2s ease;
}
.report-tab span {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.report-tab strong {
  font-size: 20px;
}
.report-tab.active {
  border-color: #2f7ff8;
  background: linear-gradient(135deg, #eaf3ff 0%, #fff7e6 100%);
  color: #163656;
  box-shadow: 0 14px 30px rgba(47, 127, 248, 0.12);
}
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.section-head { margin-bottom: 12px; }
.section-head h2 { margin: 0 0 6px; font-size: 22px; }
.section-head p { margin: 0; color: #5f6d7b; }
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}
.summary-card { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.summary-card span { color: #627386; font-size: 13px; }
.summary-card strong { font-size: 28px; }
.summary-card em { color: #64748b; font-size: 12px; font-style: normal; line-height: 1.5; }
.summary-card.accent { background: linear-gradient(135deg, #fef4d6 0%, #fff 100%); }
.content-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 14px; margin-bottom: 14px; }
.single-column-grid { grid-template-columns: 1fr; }
.panel { padding: 18px; }
.panel h3 { margin: 0 0 12px; font-size: 18px; }
.empty-panel, .empty-inline { color: #738396; text-align: center; }
.empty-panel { padding: 48px 16px; }
.list-block, .attempt-list, .level-list, .practice-tag-list, .homework-list { display: flex; flex-direction: column; gap: 10px; }
.row-item, .attempt-item, .level-item {
  border: 1px solid #e0e7ef;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fbfdff;
}
.practice-tag-item,
.homework-item {
  border: 1px solid #e0e7ef;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fbfdff;
}
.practice-tag-item,
.homework-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.practice-tag-item p,
.homework-head p {
  margin: 8px 0 0;
  color: #5f6d7b;
}
.tag-meta {
  color: #7c3d12;
  font-size: 12px;
  font-weight: 700;
}
.row-item { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-pill {
  background: #eef4ff;
  color: #31507a;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
}
.attempt-head, .level-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.attempt-stem, .level-head p { margin: 8px 0 0; color: #5f6d7b; }
.attempt-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; color: #64748b; }
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.status-pill.ok { background: #dcfce7; color: #166534; }
.status-pill.warn { background: #fef3c7; color: #92400e; }
.status-pill.bad { background: #fee2e2; color: #991b1b; }
.progress-bar { height: 8px; border-radius: 999px; background: #e6edf5; margin-top: 12px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #2f7ff8 0%, #67b6ff 100%); }
@media (max-width: 900px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content-grid { grid-template-columns: 1fr; }
  .narrative-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .hero-card h1 { font-size: 28px; }
  .report-tabs { grid-template-columns: 1fr; }
  .report-tab { align-items: flex-start; flex-direction: column; }
  .summary-grid { grid-template-columns: 1fr; }
  .practice-tag-item,
  .homework-head,
  .row-item,
  .attempt-head,
  .level-head,
  .hero-meta { flex-direction: column; align-items: flex-start; }
}
</style>