import { create } from 'zustand'

export type AppMode = 'game' | 'editor'

/** 解码 JWT payload，从 auth_token 中读取用户角色判断是否管理员 */
function resolveAdminState(): boolean {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    // base64url → base64 → JSON
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return payload?.role === 'admin' || payload?.priv === -1
  } catch {
    return false
  }
}

/** 从 user_info 读取用户名（与平台共享 localStorage） */
function resolveUsername(): string {
  try {
    const raw = localStorage.getItem('user_info')
    if (!raw) return ''
    const info = JSON.parse(raw)
    return info?.username || info?.uname || ''
  } catch {
    return ''
  }
}

type AppStore = {
  appMode: AppMode
  setAppMode: (mode: AppMode) => void
  isTestingCustomLevel: boolean
  setIsTestingCustomLevel: (v: boolean) => void
  isAdmin: boolean
  username: string
}

export const useAppStore = create<AppStore>((set) => ({
  appMode: 'game',
  setAppMode: (appMode) => set({ appMode }),
  isTestingCustomLevel: false,
  setIsTestingCustomLevel: (isTestingCustomLevel) => set({ isTestingCustomLevel }),
  isAdmin: resolveAdminState(),
  username: resolveUsername(),
}))

export const useAppStoreActions = () => ({
  setAppMode: (appMode: AppMode) => useAppStore.setState({ appMode }),
  setIsTestingCustomLevel: (v: boolean) => useAppStore.setState({ isTestingCustomLevel: v }),
})
