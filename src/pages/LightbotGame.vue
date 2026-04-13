<template>
  <div class="lightbot-page">
    <div class="lightbot-shell">
      <section class="board-panel">
        <header class="board-header">
          <div>
            <p class="eyebrow">Robot Puzzle</p>
            <h1>{{ currentLevel.title }}</h1>
            <p class="subtitle">{{ currentLevel.description }}</p>
          </div>
          <div class="level-strip">
            <button
              v-for="(level, index) in levels"
              :key="level.id"
              class="level-pill"
              :class="{ active: index === selectedLevelIndex, done: completedLevelIds.includes(level.id) }"
              @click="selectLevel(index)"
            >
              {{ index + 1 }}
            </button>
          </div>
        </header>

        <div class="board-stage">
          <div class="board-grid"></div>

          <div class="status-cluster">
            <div class="status-card">
              <span>方向</span>
              <strong>{{ directionLabel }}</strong>
            </div>
            <div class="status-card">
              <span>点亮</span>
              <strong>{{ litKeys.length }}/{{ targetKeys.length }}</strong>
            </div>
            <div class="status-card" :class="statusTone">
              <span>状态</span>
              <strong>{{ statusText }}</strong>
            </div>
          </div>

          <div class="scene-shell">
            <div class="scene-viewport" :style="sceneViewportStyle">
              <div class="iso-scene" :style="sceneStyle">
                <div
                  v-for="cell in sceneCells"
                  :key="cell.key"
                  class="platform"
                  :class="{ target: cell.isTarget, lit: cell.isLit }"
                  :style="cell.style"
                >
                  <div class="platform-shadow"></div>
                  <div class="platform-top">
                    <span v-if="cell.isTarget" class="target-ring"></span>
                    <span v-if="cell.isStart" class="start-badge">S</span>
                    <div v-if="cell.hasRobot" class="bot" :class="robotDirClass">
                      <span class="bot-eye left"></span>
                      <span class="bot-eye right"></span>
                      <span class="bot-mark"></span>
                    </div>
                  </div>
                  <div class="platform-left"></div>
                  <div class="platform-right"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="control-bar">
          <button class="control-btn icon" :disabled="isRunning || mainProcedure.length === 0" @click="runCode">
            <img class="control-sprite" src="/lightbot/run.png" alt="Run">
          </button>
          <button class="control-btn icon" :disabled="isRunning" @click="resetCode">
            <img class="control-sprite" src="/lightbot/stop.png" alt="Reset">
          </button>
          <button class="control-btn" :disabled="isRunning || activeProcedure.length === 0" @click="undoLastOperation">↶</button>
          <button class="control-btn" :disabled="isRunning || activeProcedure.length === 0" @click="clearActiveProcedure">🗑</button>

          <div class="speed-box">
            <span>Speed</span>
            <input v-model="speedValue" class="speed-slider" type="range" min="1" max="5" step="1">
          </div>

          <button v-if="canGoNextLevel" class="next-btn" @click="goToNextLevel">下一关</button>
        </footer>
      </section>

      <aside class="sidebar-panel">
        <section class="panel-card brief-card">
          <div class="panel-title">Map Brief</div>
          <p class="brief-copy">{{ currentLevel.goal }}</p>
          <div class="brief-row">
            <span>Main</span>
            <strong>{{ currentLevel.mainLimit }} 格</strong>
          </div>
          <div
            v-for="procKey in availableProcedureKeys"
            :key="procKey"
            class="brief-row"
          >
            <span>{{ procKey.toUpperCase() }}</span>
            <strong>{{ currentLevel.procLimits[procKey] }} 格</strong>
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-title">Instructions</div>
          <div class="instruction-grid">
            <button
              v-for="operation in operationPalette"
              :key="operation.id"
              class="instruction-btn"
              :disabled="operation.id.startsWith('proc') && !availableProcedureKeys.includes(operation.id)"
              @click="appendOperation(operation.id)"
            >
              <span class="instruction-icon">
                <img class="instruction-sprite" :src="operationSprite(operation.id)" :alt="operation.label">
              </span>
              <span class="instruction-label">{{ operation.label }}</span>
              <small>{{ operation.tip }}</small>
            </button>
          </div>
        </section>

        <section class="panel-card program-card">
          <div class="program-head">
            <div class="panel-title">Program</div>
            <div class="proc-tabs">
              <button
                v-for="procKey in procedureTabs"
                :key="procKey"
                :class="{ active: activeProcedureKey === procKey }"
                :disabled="procKey !== 'main' && !availableProcedureKeys.includes(procKey)"
                @click="activeProcedureKey = procKey"
              >
                {{ procKey.toUpperCase() }}
              </button>
            </div>
          </div>

          <div class="program-block">
            <div class="program-label">{{ activeProcedureKey.toUpperCase() }}</div>
            <div class="program-grid">
              <button
                v-for="(operation, index) in activeProcedure"
                :key="`${activeProcedureKey}-${index}`"
                class="program-slot filled"
                :class="{ active: runningProcedureKey === activeProcedureKey && runningOperationIndex === index }"
                @click="removeOperation(activeProcedureKey, index)"
              >
                <span class="slot-icon">
                  <img class="program-sprite" :src="operationSprite(operation)" :alt="operationLabel(operation)">
                </span>
                <span class="slot-label">{{ operationLabel(operation) }}</span>
              </button>
              <div
                v-for="slot in emptySlots(activeLimit, activeProcedure.length)"
                :key="`${activeProcedureKey}-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </div>

          <div class="program-actions">
            <button class="ghost-btn" :disabled="isRunning" @click="loadDemoProgram">示例</button>
            <button class="ghost-btn" :disabled="isRunning" @click="clearAllPrograms">清空程序</button>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'programtools-lightbot-progress-v4'
const TILE_WIDTH = 96
const TILE_HEIGHT = 48
const TILE_DEPTH = 22
const PROCEDURE_TABS = ['main', 'p1']
const DIRECTION_ORDER = ['forward', 'right', 'backward', 'left']
const DIRECTION_LABELS = {
  forward: '向右',
  right: '向下',
  backward: '向左',
  left: '向上'
}
const DIRECTION_VECTORS = {
  forward: { x: 1, y: 0 },
  right: { x: 0, y: 1 },
  backward: { x: -1, y: 0 },
  left: { x: 0, y: -1 }
}
const SPEED_MAP = { 1: 540, 2: 420, 3: 300, 4: 210, 5: 140 }
const OPERATION_PALETTE = [
  { id: 'walk', label: 'Walk forward', tip: '前进到同高度相邻平台' },
  { id: 'light', label: 'Light', tip: '切换当前目标灯状态' },
  { id: 'left', label: 'Turn left', tip: '逆时针转 90 度' },
  { id: 'right', label: 'Turn right', tip: '顺时针转 90 度' },
  { id: 'jump', label: 'Jump', tip: '向前跳上一层或跳下任意层' },
  { id: 'p1', label: 'Call P1', tip: '调用子程序 P1' }
]

function makeTile(height = 1, target = false) {
  return { h: height, target }
}

const levels = [
  {
    id: 'level-1',
    title: 'Level 1: First Light',
    description: '按 Another-LightBot 的方式，从最基础的平面开灯开始。',
    goal: '沿平台向前，点亮两个目标格。',
    mainLimit: 8,
    procLimits: {},
    board: [
      [makeTile(), makeTile(), makeTile(1, true), makeTile(), makeTile(1, true)]
    ],
    start: { x: 0, y: 0, dir: 'forward' },
    demo: { main: ['walk', 'walk', 'light', 'walk', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-2',
    title: 'Level 2: Jump',
    description: '第二关加入一级高差，逻辑按照参考仓库的 jump 规则执行。',
    goal: '先点亮低处灯，再跳上一级高台点亮第二个灯。',
    mainLimit: 8,
    procLimits: {},
    board: [
      [null, null, makeTile(2), makeTile(2, true)],
      [makeTile(), makeTile(1, true), makeTile(), makeTile(2)]
    ],
    start: { x: 0, y: 1, dir: 'forward' },
    demo: { main: ['walk', 'light', 'walk', 'jump', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-3',
    title: 'Level 3: Turns',
    description: '第三关需要转向，方向系统与参考仓库的四向枚举一致。',
    goal: '通过左右转在 L 形平台上点亮两盏灯。',
    mainLimit: 10,
    procLimits: {},
    board: [
      [makeTile(), makeTile(), makeTile(1, true)],
      [null, null, makeTile()],
      [null, null, makeTile(1, true)]
    ],
    start: { x: 0, y: 0, dir: 'forward' },
    demo: { main: ['walk', 'walk', 'light', 'right', 'walk', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-4',
    title: 'Level 4: Procedure',
    description: '从这一关开始启用子程序 P1，流程接近参考仓库的 SubProcedure。',
    goal: '利用 P1 复用重复动作，点亮四个目标格。',
    mainLimit: 6,
    procLimits: { p1: 4 },
    board: [
      [null, makeTile(1, true), makeTile(1, true)],
      [makeTile(), makeTile(), makeTile()],
      [null, makeTile(1, true), makeTile(1, true)]
    ],
    start: { x: 0, y: 1, dir: 'forward' },
    demo: { main: ['p1', 'right', 'p1'], p1: ['walk', 'light'] }
  },
  {
    id: 'level-5',
    title: 'Level 5: Bridge',
    description: '最后一关综合 walk、jump 和 P1。',
    goal: '跨过桥面并使用 P1 完成连续开灯。',
    mainLimit: 8,
    procLimits: { p1: 3 },
    board: [
      [null, makeTile(2), null, makeTile(2)],
      [makeTile(), makeTile(1, true), makeTile(), makeTile(1, true)],
      [null, makeTile(2), null, makeTile(2, true)]
    ],
    start: { x: 0, y: 1, dir: 'forward' },
    demo: { main: ['p1', 'jump', 'light'], p1: ['walk', 'light', 'walk'] }
  }
]

function platformKey(x, y) {
  return `${x},${y}`
}

function cloneBot(start) {
  return { x: start.x, y: start.y, dir: start.dir }
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return Array.isArray(parsed.completedLevelIds) ? parsed.completedLevelIds : []
  } catch {
    return []
  }
}

const selectedLevelIndex = ref(0)
const activeProcedureKey = ref('main')
const mainProcedure = ref([])
const procedures = ref({ p1: [] })
const completedLevelIds = ref(loadProgress())
const litKeys = ref([])
const bot = ref(cloneBot(levels[0].start))
const statusText = ref('Program is empty')
const statusTone = ref('neutral')
const isRunning = ref(false)
const runningProcedureKey = ref('')
const runningOperationIndex = ref(-1)
const runNonce = ref(0)
const speedValue = ref(3)

const currentLevel = computed(() => levels[selectedLevelIndex.value])
const procedureTabs = computed(() => PROCEDURE_TABS)
const availableProcedureKeys = computed(() => Object.keys(currentLevel.value.procLimits || {}))
const activeProcedure = computed(() => activeProcedureKey.value === 'main' ? mainProcedure.value : (procedures.value[activeProcedureKey.value] || []))
const activeLimit = computed(() => activeProcedureKey.value === 'main' ? currentLevel.value.mainLimit : (currentLevel.value.procLimits[activeProcedureKey.value] || 0))
const directionLabel = computed(() => DIRECTION_LABELS[bot.value.dir])
const robotDirClass = computed(() => `dir-${bot.value.dir}`)

const boardPlatforms = computed(() => {
  const platforms = []
  currentLevel.value.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      platforms.push({ x, y, cell, key: platformKey(x, y) })
    })
  })
  return platforms
})

const boardLookup = computed(() => {
  const lookup = new Map()
  boardPlatforms.value.forEach((item) => {
    lookup.set(item.key, item.cell)
  })
  return lookup
})

const targetKeys = computed(() => boardPlatforms.value.filter((item) => item.cell.target).map((item) => item.key))

const sceneMetrics = computed(() => {
  const cells = boardPlatforms.value.map((item) => {
    const x = (item.x - item.y) * TILE_WIDTH / 2
    const y = (item.x + item.y) * TILE_HEIGHT / 2 - item.cell.h * TILE_DEPTH
    return { ...item, sceneX: x, sceneY: y }
  })
  const minX = Math.min(...cells.map((cell) => cell.sceneX))
  const minY = Math.min(...cells.map((cell) => cell.sceneY))
  const maxX = Math.max(...cells.map((cell) => cell.sceneX + TILE_WIDTH))
  const maxY = Math.max(...cells.map((cell) => cell.sceneY + TILE_HEIGHT + cell.cell.h * TILE_DEPTH))
  return {
    cells,
    minX,
    minY,
    width: Math.ceil(maxX - minX + 96),
    height: Math.ceil(maxY - minY + 96)
  }
})

const sceneScale = computed(() => {
  const widthScale = 920 / sceneMetrics.value.width
  const heightScale = 520 / sceneMetrics.value.height
  return Math.max(1.2, Math.min(2.6, widthScale, heightScale))
})

const sceneStyle = computed(() => ({ width: `${sceneMetrics.value.width}px`, height: `${sceneMetrics.value.height}px` }))
const sceneViewportStyle = computed(() => ({
  width: `${sceneMetrics.value.width}px`,
  height: `${sceneMetrics.value.height}px`,
  transform: `scale(${sceneScale.value})`
}))

const sceneCells = computed(() => sceneMetrics.value.cells.map((item) => ({
  key: item.key,
  isTarget: Boolean(item.cell.target),
  isLit: litKeys.value.includes(item.key),
  isStart: currentLevel.value.start.x === item.x && currentLevel.value.start.y === item.y,
  hasRobot: bot.value.x === item.x && bot.value.y === item.y,
  style: {
    left: `${item.sceneX - sceneMetrics.value.minX + 48}px`,
    top: `${item.sceneY - sceneMetrics.value.minY + 48}px`,
    '--stack-height': `${item.cell.h * TILE_DEPTH}px`
  }
})))

const canGoNextLevel = computed(() => targetKeys.value.length > 0 && targetKeys.value.every((key) => litKeys.value.includes(key)) && selectedLevelIndex.value < levels.length - 1)

watch(selectedLevelIndex, () => initializeLevelState())
watch(completedLevelIds, (value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLevelIds: value }))
}, { deep: true })

function initializeLevelState() {
  activeProcedureKey.value = 'main'
  mainProcedure.value = []
  procedures.value = { p1: [] }
  resetCode()
}

function setStatus(text, tone = 'neutral') {
  statusText.value = text
  statusTone.value = tone
}

function selectLevel(index) {
  selectedLevelIndex.value = index
}

function resetCode() {
  runNonce.value += 1
  isRunning.value = false
  runningProcedureKey.value = ''
  runningOperationIndex.value = -1
  litKeys.value = []
  bot.value = cloneBot(currentLevel.value.start)
  setStatus(mainProcedure.value.length ? 'Code reset' : 'Program is empty')
}

function clearAllPrograms() {
  mainProcedure.value = []
  procedures.value = { p1: [] }
  activeProcedureKey.value = 'main'
  resetCode()
}

function emptySlots(limit, used) {
  return Array.from({ length: Math.max(limit - used, 0) }, (_, index) => index)
}

function appendOperation(operationId) {
  const limit = activeLimit.value
  if (activeProcedure.value.length >= limit) {
    setStatus('No empty slot left', 'danger')
    return
  }

  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = [...mainProcedure.value, operationId]
  } else {
    procedures.value = {
      ...procedures.value,
      [activeProcedureKey.value]: [...(procedures.value[activeProcedureKey.value] || []), operationId]
    }
  }

  setStatus(`${operationLabel(operationId)} added`)
}

function removeOperation(procKey, index) {
  if (procKey === 'main') {
    mainProcedure.value = mainProcedure.value.filter((_, itemIndex) => itemIndex !== index)
  } else {
    procedures.value = {
      ...procedures.value,
      [procKey]: (procedures.value[procKey] || []).filter((_, itemIndex) => itemIndex !== index)
    }
  }
  setStatus('Operation removed')
}

function undoLastOperation() {
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = mainProcedure.value.slice(0, -1)
  } else {
    procedures.value = {
      ...procedures.value,
      [activeProcedureKey.value]: (procedures.value[activeProcedureKey.value] || []).slice(0, -1)
    }
  }
  setStatus('Last operation removed')
}

function clearActiveProcedure() {
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = []
  } else {
    procedures.value = {
      ...procedures.value,
      [activeProcedureKey.value]: []
    }
  }
  setStatus('Procedure cleared')
}

function loadDemoProgram() {
  mainProcedure.value = [...currentLevel.value.demo.main]
  procedures.value = { p1: [...(currentLevel.value.demo.p1 || [])] }
  setStatus('Demo loaded')
}

function operationLabel(operationId) {
  return {
    walk: 'Walk',
    light: 'Light',
    left: 'Turn L',
    right: 'Turn R',
    jump: 'Jump',
    p1: 'P1'
  }[operationId] || operationId
}

function operationSprite(operationId) {
  return {
    walk: '/lightbot/operation-move.png',
    light: '/lightbot/operation-lamp.png',
    left: '/lightbot/operation-turn-left.png',
    right: '/lightbot/operation-turn-right.png',
    jump: '/lightbot/operation-jump.png',
    p1: '/lightbot/operation-proc.png'
  }[operationId] || '/lightbot/operation-move.png'
}

function platformAt(x, y) {
  return boardLookup.value.get(platformKey(x, y)) || null
}

function nextPosition() {
  const vector = DIRECTION_VECTORS[bot.value.dir]
  return { x: bot.value.x + vector.x, y: bot.value.y + vector.y }
}

function rotateRight() {
  const index = DIRECTION_ORDER.indexOf(bot.value.dir)
  bot.value = { ...bot.value, dir: DIRECTION_ORDER[(index + 1) % DIRECTION_ORDER.length] }
}

function rotateLeft() {
  const index = DIRECTION_ORDER.indexOf(bot.value.dir)
  bot.value = { ...bot.value, dir: DIRECTION_ORDER[(index + 3) % DIRECTION_ORDER.length] }
}

function toggleCurrentTarget() {
  const key = platformKey(bot.value.x, bot.value.y)
  if (!targetKeys.value.includes(key)) return false
  if (litKeys.value.includes(key)) {
    litKeys.value = litKeys.value.filter((item) => item !== key)
  } else {
    litKeys.value = [...litKeys.value, key]
  }
  return true
}

function markFinished() {
  if (!targetKeys.value.length || !targetKeys.value.every((key) => litKeys.value.includes(key))) return false
  if (!completedLevelIds.value.includes(currentLevel.value.id)) {
    completedLevelIds.value = [...completedLevelIds.value, currentLevel.value.id]
  }
  setStatus('Level complete', 'success')
  return true
}

function waitStep() {
  return new Promise((resolve) => window.setTimeout(resolve, SPEED_MAP[String(speedValue.value)] || SPEED_MAP[3]))
}

async function executeOperation(operationId, nonce) {
  if (nonce !== runNonce.value) return

  if (operationId === 'right') {
    rotateRight()
    await waitStep()
    return
  }

  if (operationId === 'left') {
    rotateLeft()
    await waitStep()
    return
  }

  if (operationId === 'light') {
    const switched = toggleCurrentTarget()
    if (!switched) {
      setStatus('Switch ignored: no target on this platform', 'danger')
    }
    await waitStep()
    markFinished()
    return
  }

  if (operationId === 'p1') {
    await runProcedure('p1', procedures.value.p1 || [], nonce)
    return
  }

  const next = nextPosition()
  const currentPlatform = platformAt(bot.value.x, bot.value.y)
  const nextPlatform = platformAt(next.x, next.y)

  if (!currentPlatform || !nextPlatform) {
    setStatus(`${operationLabel(operationId)} ignored`, 'danger')
    await waitStep()
    return
  }

  if (operationId === 'walk') {
    if (currentPlatform.h === nextPlatform.h) {
      bot.value = { ...bot.value, x: next.x, y: next.y }
    } else {
      setStatus('Walk ignored: different height', 'danger')
    }
    await waitStep()
    return
  }

  if (operationId === 'jump') {
    const heightDiff = nextPlatform.h - currentPlatform.h
    if (heightDiff === 1 || heightDiff < 0) {
      bot.value = { ...bot.value, x: next.x, y: next.y }
    } else {
      setStatus('Jump ignored', 'danger')
    }
    await waitStep()
  }
}

async function runProcedure(procKey, operations, nonce, depth = 0) {
  if (depth > 6 || nonce !== runNonce.value) return
  for (let index = 0; index < operations.length; index += 1) {
    if (nonce !== runNonce.value) return
    runningProcedureKey.value = procKey
    runningOperationIndex.value = index
    await executeOperation(operations[index], nonce)
    if (markFinished()) return
  }
}

async function runCode() {
  if (!mainProcedure.value.length || isRunning.value) return
  resetCode()
  const nonce = runNonce.value
  isRunning.value = true
  setStatus('Program running')
  try {
    await runProcedure('main', mainProcedure.value, nonce)
    if (nonce === runNonce.value && !markFinished()) {
      setStatus('Program finished', 'neutral')
    }
  } finally {
    if (nonce === runNonce.value) {
      isRunning.value = false
      runningProcedureKey.value = ''
      runningOperationIndex.value = -1
    }
  }
}

function goToNextLevel() {
  if (!canGoNextLevel.value) return
  selectedLevelIndex.value += 1
}

initializeLevelState()
</script>

<style scoped>
.lightbot-page {
  min-height: calc(100vh - 80px);
  padding: 8px;
  background: #d5dde4;
  color: #fff;
}

.lightbot-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 10px;
  min-height: calc(100vh - 96px);
}

.board-panel,
.panel-card {
  border-radius: 14px;
  background: #6a6462;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.board-panel {
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.board-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #e6ddd5;
}

.board-header h1 {
  margin: 0;
  font-size: 28px;
}

.subtitle {
  margin: 6px 0 0;
  color: #efe6de;
}

.level-strip {
  display: flex;
  gap: 6px;
}

.level-pill {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.level-pill.active {
  background: #9fd3cb;
  color: #354542;
}

.level-pill.done:not(.active) {
  background: #85b48d;
}

.board-stage {
  position: relative;
  flex: 1;
  overflow: hidden;
  border-radius: 14px;
  background: #dce3ea;
}

.board-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(30deg, rgba(153, 168, 183, 0.18) 12%, transparent 12.5%, transparent 87%, rgba(153, 168, 183, 0.18) 87.5%, rgba(153, 168, 183, 0.18)),
    linear-gradient(150deg, rgba(153, 168, 183, 0.18) 12%, transparent 12.5%, transparent 87%, rgba(153, 168, 183, 0.18) 87.5%, rgba(153, 168, 183, 0.18));
  background-size: 58px 102px;
}

.status-cluster {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-card {
  min-width: 92px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(93, 87, 84, 0.9);
}

.status-card span {
  display: block;
  font-size: 11px;
  color: #ddd0c6;
  text-transform: uppercase;
}

.status-card.success {
  background: rgba(86, 132, 88, 0.92);
}

.status-card.danger {
  background: rgba(135, 83, 75, 0.92);
}

.scene-shell {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px 20px;
}

.scene-viewport {
  position: relative;
  transform-origin: center center;
}

.iso-scene {
  position: relative;
}

.platform {
  position: absolute;
  width: 96px;
  height: 96px;
}

.platform-shadow {
  position: absolute;
  left: 18px;
  top: calc(38px + var(--stack-height));
  width: 64px;
  height: 20px;
  border-radius: 50%;
  background: rgba(45, 56, 69, 0.15);
  filter: blur(8px);
}

.platform-top,
.platform-left,
.platform-right {
  position: absolute;
}

.platform-top {
  left: 0;
  top: 0;
  width: 96px;
  height: 48px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: #565e68;
  border: 2px solid #2e3438;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.platform-left {
  left: 0;
  top: 24px;
  width: 48px;
  height: var(--stack-height);
  clip-path: polygon(100% 0, 100% 100%, 0 78%, 0 24%);
  background: #c0cad7;
  border-left: 2px solid #2e3438;
}

.platform-right {
  right: 0;
  top: 24px;
  width: 48px;
  height: var(--stack-height);
  clip-path: polygon(0 0, 100% 24%, 100% 78%, 0 100%);
  background: #aab3bf;
  border-right: 2px solid #2e3438;
}

.platform.target .platform-top {
  background: #1e4d6f;
}

.platform.lit .platform-top {
  background: #ffef00;
}

.target-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34px;
  height: 20px;
  transform: translate(-50%, -50%);
  border-radius: 8px;
  border: 4px solid rgba(75, 144, 255, 0.8);
  background: transparent;
}

.platform.lit .target-ring {
  border-color: rgba(255, 247, 107, 0.92);
}

.start-badge {
  position: absolute;
  left: 16px;
  top: 14px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.88);
  color: #4a5961;
  font-weight: 800;
}

.bot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50% 50% 46% 46%;
  background: linear-gradient(180deg, #fefefe 0%, #d5d9dd 100%);
  border: 4px solid #20262c;
  transform: translate(-50%, -74%);
  box-shadow: 10px 0 0 rgba(255, 255, 255, 0.12);
}

.bot-eye,
.bot-mark {
  position: absolute;
}

.bot-eye {
  top: 16px;
  width: 8px;
  height: 14px;
  border-radius: 999px;
  background: #19d5ff;
}

.bot-eye.left { left: 12px; }
.bot-eye.right { right: 12px; }

.bot-mark {
  left: 50%;
  top: -7px;
  width: 8px;
  height: 16px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #ff552f;
}

.bot.dir-right { transform: translate(-50%, -74%) rotate(90deg); }
.bot.dir-backward { transform: translate(-50%, -74%) rotate(180deg); }
.bot.dir-left { transform: translate(-50%, -74%) rotate(-90deg); }

.control-bar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 12px;
  background: #6a6462;
}

.control-btn,
.next-btn,
.ghost-btn,
.proc-tabs button,
.instruction-btn,
.program-slot.filled {
  border: 0;
  cursor: pointer;
}

.control-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #56514f;
  color: #fff;
}

.control-btn.icon {
  display: grid;
  place-items: center;
}

.control-sprite {
  width: 24px;
  height: 24px;
}

.control-btn:disabled,
.instruction-btn:disabled,
.ghost-btn:disabled,
.proc-tabs button:disabled,
.program-slot.filled:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.speed-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
  color: #fff;
}

.speed-slider {
  width: 90px;
  accent-color: #e7df9c;
}

.next-btn {
  margin-left: auto;
  padding: 9px 14px;
  border-radius: 10px;
  background: #e7df9c;
  color: #3c434b;
  font-weight: 800;
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-card {
  padding: 12px;
}

.panel-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
}

.brief-copy {
  margin: 0 0 12px;
  color: #f1e7de;
  line-height: 1.5;
}

.brief-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.instruction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.instruction-btn {
  min-height: 92px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.instruction-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #e7df9c;
  box-shadow: inset 0 0 0 2px #56606b;
  display: grid;
  place-items: center;
}

.instruction-sprite {
  width: 24px;
  height: 24px;
}

.instruction-label {
  font-weight: 700;
}

.instruction-btn small {
  color: #ddd3cb;
  line-height: 1.35;
}

.program-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.program-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.proc-tabs {
  display: flex;
  gap: 6px;
}

.proc-tabs button,
.ghost-btn {
  padding: 8px 10px;
  border-radius: 8px;
  background: #5a5552;
  color: #fff;
}

.proc-tabs button.active {
  background: #e7df9c;
  color: #374147;
}

.program-block {
  margin-top: 14px;
}

.program-label {
  margin-bottom: 8px;
  font-weight: 700;
  color: #ece1d7;
}

.program-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.program-slot {
  min-height: 64px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.program-slot.filled {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-style: solid;
  background: #5f6975;
  color: #fff;
}

.program-slot.filled.active {
  outline: 2px solid #e7df9c;
}

.slot-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #e7df9c;
  box-shadow: inset 0 0 0 2px #56606b;
  display: grid;
  place-items: center;
}

.program-sprite {
  width: 18px;
  height: 18px;
}

.slot-label {
  font-size: 10px;
  font-weight: 700;
}

.program-actions {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  gap: 8px;
}

@media (max-width: 1080px) {
  .lightbot-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .board-header,
  .program-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .instruction-grid,
  .program-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-cluster {
    position: static;
    padding: 12px 12px 0;
    justify-content: flex-start;
  }

  .scene-shell {
    padding-top: 18px;
  }
}
</style>