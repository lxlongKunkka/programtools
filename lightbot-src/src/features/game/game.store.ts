import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { playExecutionEvents } from '../animation/player'
import { createIdleRobotAction, mapExecutionEventToRobotAction, type RobotActionClip } from '../animation/robot-actions'
import type { RunStatus } from '../animation/animation.types'
import { createWorldState, interpretProgram } from '../engine/interpreter'
import type { ExecutionEvent, WorldState } from '../engine/engine.types'
import { loadLevelsFromApi, loadUserLevelsFromApi, loadCommunityLevelsFromApi, beginnerLesson, beginnerLevel } from './level-loader'
import { trackEvent } from '../../utils/track'
import { emptyProgramDocument } from '../editor/editor.utils'
import type { LevelConfig, LessonConfig } from '../../domain/map/map.types'
import type { ProgramDocument } from '../../domain/program/ast.types'
import type { BlockBlueprint, BranchTarget, InsertTarget } from '../editor/editor.helpers'
import {
  appendNode as appendProgramNode,
  clearTarget as clearProgramTarget,
  defaultBranchTarget,
  insertNode as insertProgramNode,
  moveNode as moveProgramNode,
  moveNodeToTarget as moveProgramNodeToTarget,
  removeNode as removeProgramNode,
  updateConditionType as updateProgramConditionType,
  updateRepeatTimes as updateProgramRepeatTimes,
} from '../editor/editor.helpers'
import { countProgramNodes } from '../editor/editor.utils'

function applyEvent(world: WorldState, event: ExecutionEvent): WorldState {
  switch (event.type) {
    case 'cursor':
      return { ...world, activeBlockId: event.blockId, focusTileKey: `${world.robot.x}:${world.robot.y}` }
    case 'condition-check':
      return {
        ...world,
        focusTileKey: event.tileKey,
        lastCondition: { type: event.condition, result: event.result, tileKey: event.tileKey },
      }
    case 'turn':
      return {
        ...world,
        robot: { ...world.robot, direction: event.direction },
      }
    case 'move':
    case 'jump':
      return {
        ...world,
        focusTileKey: `${event.to.x}:${event.to.y}`,
        robot: { ...world.robot, x: event.to.x, y: event.to.y, z: event.to.z },
      }
    case 'pickup':
      return world.collectedCoins.includes(event.tileKey)
        ? { ...world, focusTileKey: event.tileKey }
        : { ...world, focusTileKey: event.tileKey, collectedCoins: [...world.collectedCoins, event.tileKey] }
    case 'fail':
      return { ...world, failureReason: event.reason, focusTileKey: `${world.robot.x}:${world.robot.y}` }
    case 'complete':
      return world
  }
}

type GameStore = {
  levels: LevelConfig[]
  levelIndex: number
  level: LevelConfig
  lesson: LessonConfig
  completedLevels: number[]
  program: ProgramDocument
  selectedTarget: BranchTarget
  world: WorldState
  runStatus: RunStatus
  currentRobotAction: RobotActionClip
  speedMs: number
  executionLog: ExecutionEvent[]
  eventIndex: number
  loadLevel: (index: number) => void
  resetWorld: () => void
  setSpeedMs: (speedMs: number) => void
  setSelectedTarget: (target: BranchTarget) => void
  appendNode: (target: BranchTarget, blueprint: BlockBlueprint) => void
  insertNode: (target: InsertTarget, blueprint: BlockBlueprint) => void
  clearSelectedTarget: (target?: BranchTarget) => void
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, direction: 'up' | 'down') => void
  moveNodeToTarget: (nodeId: string, target: InsertTarget) => void
  updateRepeatTimes: (nodeId: string, times: number) => void
  updateConditionType: (nodeId: string, conditionType: Parameters<typeof updateProgramConditionType>[2]) => void
  setProgram: (program: ProgramDocument) => void
  stepProgram: () => void
  runProgram: () => Promise<void>
  loadCustomLevel: (cfg: LevelConfig) => void
  updateLevel: (cfg: LevelConfig) => void
  addUserLevel: (cfg: LevelConfig) => void
  levelsLoaded: boolean
  loadLevels: () => Promise<void>
  /** 编辑器测试通关自定义关卡时的执行步数（0 表示尚未通关） */
  customLevelSolutionSteps: number
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  levels: [],
  levelIndex: 0,
  level: beginnerLevel,
  lesson: beginnerLesson,
  completedLevels: [],
  program: emptyProgramDocument,
  selectedTarget: defaultBranchTarget,
  world: createWorldState(beginnerLevel),
  runStatus: 'idle',
  currentRobotAction: createIdleRobotAction(),
  speedMs: 320,
  executionLog: [],
  eventIndex: 0,
  levelsLoaded: false,
  customLevelSolutionSteps: 0,
  loadLevels: async () => {
    try {
      // 解析 JWT 取 userId（排除自己的关卡不出现在「社区关卡」）
      let currentUserId: number | undefined
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          currentUserId = payload?.id ?? payload?.userId
        }
      } catch { /* ignore */ }

      const [officialLevels, userLevels, communityLevels] = await Promise.all([
        loadLevelsFromApi(),
        loadUserLevelsFromApi(),
        loadCommunityLevelsFromApi(currentUserId),
      ])
      const userLevelsWithChapter = userLevels.map((l) => ({
        ...l,
        chapter: { id: 'my-levels', title: '\uD83C\uDFAE \u6211\u7684\u5173\u5361', order: 98 },
      }))
      // 去重：已在「我的关卡」的 id 不再出现在「社区关卡」
      const myIds = new Set(userLevels.map((l) => l.id))
      const communityLevelsWithChapter = communityLevels
        .filter((l) => !myIds.has(l.id))
        .map((l) => ({
          ...l,
          chapter: { id: 'community', title: '\uD83C\uDF0D \u793E\u533A\u5173\u5361', order: 97 },
        }))
      const levels = [...officialLevels, ...communityLevelsWithChapter, ...userLevelsWithChapter]
      const { levelIndex } = get()
      const idx = Math.max(0, Math.min(levelIndex, levels.length - 1))
      const level = levels[idx]
      set({
        levels,
        levelsLoaded: true,
        levelIndex: idx,
        level,
        world: createWorldState(level),
        program: emptyProgramDocument,
      })
    } catch (err) {
      console.error('[game] loadLevels failed:', err)
      // 失败时标记完成以解除加载锁，继续用占位关卡
      set({ levelsLoaded: true })
    }
  },
  loadLevel: (index) => {
    const { levels } = get()
    const next = levels[index]
    if (!next) return
    set({
      levelIndex: index,
      level: next,
      world: createWorldState(next),
      program: emptyProgramDocument,
      selectedTarget: defaultBranchTarget,
      runStatus: 'idle',
      currentRobotAction: createIdleRobotAction(),
      executionLog: [],
      eventIndex: 0,
    })
  },
  resetWorld: () => {
    const { level } = get()
    set({
      world: createWorldState(level),
      runStatus: 'idle',
      currentRobotAction: createIdleRobotAction(),
      executionLog: [],
      eventIndex: 0,
    })
  },
  setSpeedMs: (speedMs) => set({ speedMs }),
  setSelectedTarget: (selectedTarget) => set({ selectedTarget }),
  appendNode: (target, blueprint) => {
    const { program, level } = get()
    const next = appendProgramNode(program, target, blueprint)
    const max = level.constraints?.maxMainBlocks
    if (max !== undefined && next.main.length > max) return
    const F_MAX = 12
    if (next.functions.f1.length > F_MAX || next.functions.f2.length > F_MAX) return
    set({ program: next })
  },
  insertNode: (target, blueprint) => {
    const { program, level } = get()
    const next = insertProgramNode(program, target, blueprint)
    const max = level.constraints?.maxMainBlocks
    if (max !== undefined && next.main.length > max) return
    const F_MAX = 12
    if (next.functions.f1.length > F_MAX || next.functions.f2.length > F_MAX) return
    set({ program: next })
  },
  clearSelectedTarget: (target) => {
    const { program, selectedTarget } = get()
    set({ program: clearProgramTarget(program, target ?? selectedTarget) })
  },
  removeNode: (nodeId) => {
    const { program } = get()
    set({ program: removeProgramNode(program, nodeId) })
  },
  moveNode: (nodeId, direction) => {
    const { program } = get()
    set({ program: moveProgramNode(program, nodeId, direction) })
  },
  moveNodeToTarget: (nodeId, target) => {
    const { program, level } = get()
    const next = moveProgramNodeToTarget(program, nodeId, target)
    const max = level.constraints?.maxMainBlocks
    if (max !== undefined && next.main.length > max) return
    const F_MAX = 12
    if (next.functions.f1.length > F_MAX || next.functions.f2.length > F_MAX) return
    set({ program: next })
  },
  updateRepeatTimes: (nodeId, times) => {
    const { program } = get()
    set({ program: updateProgramRepeatTimes(program, nodeId, Math.max(2, Math.min(8, times))) })
  },
  updateConditionType: (nodeId, conditionType) => {
    const { program } = get()
    set({ program: updateProgramConditionType(program, nodeId, conditionType) })
  },
  setProgram: (program) => set({ program }),
  updateLevel: (cfg) => {
    const { levels, levelIndex, level } = get()
    const idx = levels.findIndex((l) => l.id === cfg.id)
    if (idx < 0) return
    const newLevels = [...levels]
    newLevels[idx] = cfg
    // 如果正在游玩该关卡，一并更新当前 level
    const isCurrent = level.id === cfg.id
    set({
      levels: newLevels,
      ...(isCurrent ? { level: cfg, world: createWorldState(cfg) } : {}),
    })
    void levelIndex // suppress unused warning
  },
  addUserLevel: (cfg) => {
    const { levels } = get()
    const userCfg: LevelConfig = {
      ...cfg,
      chapter: { id: 'my-levels', title: '\uD83C\uDFAE \u6211\u7684\u5173\u5361', order: 98 },
    }
    const existingIdx = levels.findIndex((l) => l.id === cfg.id)
    const newLevels =
      existingIdx >= 0
        ? [...levels.slice(0, existingIdx), userCfg, ...levels.slice(existingIdx + 1)]
        : [...levels, userCfg]
    set({ levels: newLevels })
  },
  loadCustomLevel: (cfg) => {
    const { levels } = get()
    const customCfg: LevelConfig = {
      ...cfg,
      chapter: { id: 'custom', title: '🛠 自定义关卡', order: 99 },
    }
    const existingIdx = levels.findIndex((l) => l.id.startsWith('custom-'))
    const newLevels =
      existingIdx >= 0
        ? [...levels.slice(0, existingIdx), customCfg, ...levels.slice(existingIdx + 1)]
        : [...levels, customCfg]
    const customIndex = existingIdx >= 0 ? existingIdx : newLevels.length - 1
    set({
      levels: newLevels,
      levelIndex: customIndex,
      level: customCfg,
      world: createWorldState(customCfg),
      program: emptyProgramDocument,
      runStatus: 'idle',
      currentRobotAction: createIdleRobotAction(),
      executionLog: [],
      eventIndex: 0,
      customLevelSolutionSteps: 0, // 切换新版关卡时重置解题状态
    })
  },
  stepProgram: () => {
    const { executionLog, eventIndex, level, program, world, runStatus } = get()
    if (runStatus === 'running') {
      return
    }

    if (executionLog.length === 0 || eventIndex >= executionLog.length) {
      const result = interpretProgram(level, program)
      set({
        world: createWorldState(level),
        currentRobotAction: createIdleRobotAction(),
        executionLog: result.events,
        eventIndex: 0,
        runStatus: 'idle',
      })
      return
    }

    const event = executionLog[eventIndex]
    const nextWorld = applyEvent(world, event)
    set({
      world: nextWorld,
      currentRobotAction: mapExecutionEventToRobotAction(event),
      eventIndex: eventIndex + 1,
      runStatus: event.type === 'fail' ? 'failed' : event.type === 'complete' ? 'complete' : 'idle',
    })
  },
  runProgram: async () => {
    const { level, program, speedMs, runStatus } = get()
    if (runStatus === 'running') {
      return
    }

    const result = interpretProgram(level, program)
    set({
      world: createWorldState(level),
      currentRobotAction: createIdleRobotAction(),
      executionLog: result.events,
      eventIndex: 0,
      runStatus: 'running',
    })

    await playExecutionEvents(result.events, speedMs, (event) => {
      const current = get()
      const nextWorld = applyEvent(current.world, event)
      set({
        world: nextWorld,
        currentRobotAction: mapExecutionEventToRobotAction(event),
        eventIndex: current.eventIndex + 1,
        runStatus: event.type === 'fail' ? 'failed' : event.type === 'complete' ? 'complete' : 'running',
        ...(event.type === 'complete' ? {
          completedLevels: Array.from(new Set([...current.completedLevels, current.levelIndex])),
        } : {}),
      })
      if (event.type === 'complete') {
        trackEvent('level_complete', { levelId: current.level.id })
        // 提交排行榜成绩（非临时测试关卡，即 chapter.id !== 'custom'；需登录）
        if (current.level.chapter?.id !== 'custom') {
          const token = localStorage.getItem('auth_token')
          if (token) {
            const prog = current.program
            const totalCommands = countProgramNodes(prog)
            const executionSteps = result.events.filter(
              (e) => e.type === 'move' || e.type === 'turn' || e.type === 'jump' || e.type === 'pickup'
            ).length
            void fetch(`/api/codebot/levels/${encodeURIComponent(current.level.id)}/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ totalCommands, executionSteps }),
            }).catch(() => {/* 静默失败 */})
          }
        }
      }
    })

    const finalState = get()
    if (finalState.runStatus === 'running') {
      set({ runStatus: 'idle', currentRobotAction: createIdleRobotAction() })
    }
    // 自定义关卡通关时，记录解题步数（仅计机器人实际动作步数）
    if (level.chapter?.id === 'custom' && result.events.some((e) => e.type === 'complete')) {
      const steps = result.events.filter(
        (e) => e.type === 'move' || e.type === 'turn' || e.type === 'jump' || e.type === 'pickup'
      ).length
      set({ customLevelSolutionSteps: steps })
    }
  },
}),
{
  name: 'lightbot-progress',
  // 只持久化需要的字段
  partialize: (state) => ({
    levelIndex:      state.levelIndex,
    completedLevels: state.completedLevels,
  }),
  // rehydrate 后 level/world 会在 loadLevels() 完成时重建，这里只做安全重置
  onRehydrateStorage: () => (_state) => { /* levels are loaded async in App.tsx */ },
},
  )
)
