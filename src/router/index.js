import { createRouter, createWebHistory } from 'vue-router'
import request from '../utils/request'

const Translate = () => import('../pages/Translate.vue')
const Checker = () => import('../pages/Checker.vue')
const Solution = () => import('../pages/Solution.vue')
const SolveData = () => import('../pages/SolveData.vue')
const Chat = () => import('../pages/Chat.vue')
const Login = () => import('../pages/Login.vue')
const Profile = () => import('../pages/Profile.vue')
const Admin = () => import('../pages/Admin.vue')
const QuizIssueAdmin = () => import('../pages/QuizIssueAdmin.vue')
const TeacherQuizDashboard = () => import('../pages/TeacherQuizDashboard.vue')
const ParentReport = () => import('../pages/ParentReport.vue')
const ProblemManager = () => import('../pages/ProblemManager.vue')
const Typing = () => import('../pages/Typing.vue')
const LearningMap = () => import('../pages/LearningMap.vue')
const ChapterDetail = () => import('../pages/ChapterDetail.vue')
const DailyProblem = () => import('../pages/DailyProblem.vue')
const QuizDaily = () => import('../pages/QuizDaily.vue')
const SolutionReport = () => import('../pages/SolutionReport.vue')
const PromptEditor = () => import('../pages/PromptEditor.vue')
const GespTool = () => import('../pages/GespTool.vue')
const GespMap = () => import('../pages/GespMap.vue')
const GameSudoku = () => import('../pages/GameSudoku.vue')
const SokobanGame = () => import('../pages/SokobanGame.vue')
const ProgressDashboard = () => import('../pages/ProgressDashboard.vue')

const routes = [
  { path: '/', component: QuizDaily },
  { path: '/quiz-daily', redirect: '/' },
  { path: '/gesp', component: GespTool, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/gesp-map', component: GespMap, meta: { requiresAuth: true } },
  { path: '/login', component: Login },
  { path: '/profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/admin', component: Admin, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/admin/quiz-issues', component: QuizIssueAdmin, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/quiz-following', component: TeacherQuizDashboard, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/report/:token', component: ParentReport },
  { path: '/parent-report/:token', redirect: to => `/report/${to.params.token}` },
  { path: '/admin/prompts', component: PromptEditor, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/problems', component: ProblemManager, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/translate', component: Translate },
  { path: '/checker', component: Checker, meta: { requiresAuth: true } },
  { path: '/solution', component: Solution, meta: { requiresAuth: true } },
  { path: '/solution-report', component: SolutionReport, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/solvedata', component: SolveData, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/chat', component: Chat, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/typing', component: Typing },
  { path: '/course', component: LearningMap, meta: { requiresAuth: true } },
  { path: '/progress', component: ProgressDashboard, meta: { requiresAuth: true } },
  { path: '/course/:chapterId', component: ChapterDetail, meta: { requiresAuth: true } },
  { path: '/daily', component: DailyProblem, meta: { requiresAuth: true } },
  { path: '/sudoku', component: GameSudoku, meta: { requiresAuth: true } },
  { path: '/sokoban', component: SokobanGame, meta: { requiresAuth: true } },
  { path: '/atcoder', redirect: '/solvedata' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const GAME_PATHS = new Set(['/sudoku', '/sokoban'])
let cachedSettings = null
let settingsPromise = null
let settingsFetchedAt = 0
const SETTINGS_TTL = 60 * 1000

async function getSettings() {
  const now = Date.now()
  if (cachedSettings && (now - settingsFetchedAt) < SETTINGS_TTL) return cachedSettings
  if (settingsPromise) return settingsPromise

  settingsPromise = request('/api/settings')
    .then((data) => {
      cachedSettings = { gamesEnabled: data?.gamesEnabled !== false }
      settingsFetchedAt = Date.now()
      return cachedSettings
    })
    .catch((e) => {
      console.warn('Failed to load settings:', e)
      return { gamesEnabled: true }
    })
    .finally(() => {
      settingsPromise = null
    })

  return settingsPromise
}

router.beforeEach(async (to, from, next) => {
  const userStr = localStorage.getItem('user_info')
  let user = null
  try {
    user = JSON.parse(userStr)
  } catch (e) {}

  if (to.meta.requiresAuth && !user) {
    return next('/login')
  }

  if (to.meta.requiresAdmin) {
    const isAdmin = user && (user.role === 'admin' || user.priv === -1)
    if (!isAdmin) {
      return next('/')
    }
  }

  if (to.meta.allowedRoles) {
    const isAdmin = user && (user.role === 'admin' || user.priv === -1)
    const hasRole = user && to.meta.allowedRoles.includes(user.role)
    if (!isAdmin && !hasRole) {
      return next('/')
    }
  }

  if (to.meta.requiresPremium) {
    const isPremium = user && (user.role === 'admin' || user.role === 'premium' || user.role === 'teacher' || user.priv === -1)
    if (!isPremium) {
      alert('此功能需要会员权限，请升级账号后再访问')
      return next('/')
    }
  }

  if (GAME_PATHS.has(to.path)) {
    const isStaff = user && (user.role === 'admin' || user.role === 'teacher' || user.priv === -1)
    if (!isStaff) {
      const settings = await getSettings()
      if (settings && settings.gamesEnabled === false) {
        alert('游戏已被管理员关闭')
        return next('/')
      }
    }
  }

  next()
})

// 页面访问统计
router.afterEach((to) => {
  try {
    // 避免在登录页重复上报（如果需要）
    // 使用 request.js 中的 request 实例可能更好，但这里为了解耦直接用 fetch
    // 注意：这里假设后端地址是相对路径 /api，如果配置了代理
    const token = localStorage.getItem('auth_token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    fetch('/api/log/visit', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        path: to.fullPath,
        name: to.name || to.path,
        title: to.meta.title || document.title
      })
    }).catch(e => console.error('Log visit failed', e))
  } catch (e) {}
})

export default router
