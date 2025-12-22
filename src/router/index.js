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

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/admin', component: Admin, meta: { requiresAuth: true, allowedRoles: ['admin', 'teacher'] } },
  { path: '/problems', component: ProblemManager, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/translate', component: Translate },
  { path: '/checker', component: Checker, meta: { requiresAuth: true } },
  { path: '/solution', component: Solution, meta: { requiresAuth: true } },
  { path: '/solvedata', component: SolveData, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/chat', component: Chat, meta: { requiresAuth: true, requiresPremium: true } },
  { path: '/typing', component: Typing },
  { path: '/course', component: LearningMap, meta: { requiresAuth: true } },
  { path: '/course/:levelId/:chapterId', component: ChapterDetail, meta: { requiresAuth: true } },
  { path: '/daily', component: DailyProblem, meta: { requiresAuth: true } }
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

export default router
