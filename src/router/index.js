import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Translate from '../pages/Translate.vue'
import Checker from '../pages/Checker.vue'
import Solution from '../pages/Solution.vue'
import SolveData from '../pages/SolveData.vue'
import Chat from '../pages/Chat.vue'
import Login from '../pages/Login.vue'
import Profile from '../pages/Profile.vue'
import Admin from '../pages/Admin.vue'
import ProblemManager from '../pages/ProblemManager.vue'
import Typing from '../pages/Typing.vue'
import LearningMap from '../pages/LearningMap.vue'
import ChapterDetail from '../pages/ChapterDetail.vue'
import DailyProblem from '../pages/DailyProblem.vue'
import SolutionReport from '../pages/SolutionReport.vue'
import Design from '../pages/Design.vue'
import PromptEditor from '../pages/PromptEditor.vue'
import GespTool from '../pages/GespTool.vue'
import GameSudoku from '../pages/GameSudoku.vue'
import SokobanGame from '../pages/SokobanGame.vue'
import AncientGame from '../pages/AncientGame.vue'
import SpriteGallery from '../pages/SpriteGallery.vue'
import YearEndSummary from '../pages/YearEndSummary.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/sprites', component: SpriteGallery, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/gesp', component: GespTool, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/login', component: Login },
  { path: '/profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/admin', component: Admin, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/admin/prompts', component: PromptEditor, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/design', component: Design, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/problems', component: ProblemManager, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/translate', component: Translate },
  { path: '/checker', component: Checker, meta: { requiresAuth: true } },
  { path: '/solution', component: Solution, meta: { requiresAuth: true } },
  { path: '/solution-report', component: SolutionReport, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/solvedata', component: SolveData, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/chat', component: Chat, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/typing', component: Typing },
  { path: '/course', component: LearningMap, meta: { requiresAuth: true } },
  { path: '/course/:chapterId', component: ChapterDetail, meta: { requiresAuth: true } },
  { path: '/daily', component: DailyProblem, meta: { requiresAuth: true } },
  { path: '/sudoku', component: GameSudoku, meta: { requiresAuth: true } },
  { path: '/sokoban', component: SokobanGame, meta: { requiresAuth: true } },
  { path: '/ancient', component: AncientGame },
  { path: '/summary', component: YearEndSummary }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
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
      // Redirect to home or show alert? 
      // Better to redirect to home or stay put.
      // I'll redirect to home for now.
      return next('/')
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
    const token = localStorage.getItem('token')
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
