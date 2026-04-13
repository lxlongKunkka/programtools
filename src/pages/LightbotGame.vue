<template>
  <div class="lightbot-page">
    <div class="lightbot-shell">
      <aside class="sidebar level-sidebar">
        <div class="panel brand-panel">
          <p class="eyebrow">Logic Game</p>
          <h1>Robot Light Lab</h1>
          <p class="subtitle">像 lightbot 一样，把动作编成程序，让机器人按顺序点亮所有蓝灯。</p>
        </div>

        <div class="panel level-panel">
          <div class="panel-head">
            <h2>关卡</h2>
            <span class="panel-meta">{{ completedCount }}/{{ levels.length }}</span>
          </div>
          <button
            v-for="(level, index) in levels"
            :key="level.id"
            class="level-chip"
            :class="{
              active: index === selectedLevelIndex,
              done: completedLevelIds.includes(level.id)
            }"
            @click="selectLevel(index)"
          >
            <span class="level-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="level-copy">
              <strong>{{ level.title }}</strong>
              <small>{{ level.objective }}</small>
            </span>
          </button>
        </div>

        <div class="panel guide-panel">
          <div class="panel-head">
            <h2>规则</h2>
          </div>
          <ul>
            <li>前进只能走到同高度方块。</li>
            <li>跳跃可以上升一层，或向更低的平台落下。</li>
            <li>只有站在蓝灯格上时才能点灯。</li>
            <li>主程序太短时，可以调用 P1 子程序复用动作。</li>
          </ul>
        </div>
      </aside>

      <main class="stage-column">
        <section class="panel stage-panel">
          <div class="stage-topbar">
            <div>
              <p class="eyebrow">Level {{ selectedLevelIndex + 1 }}</p>
              <h2>{{ currentLevel.title }}</h2>
              <p class="stage-copy">{{ currentLevel.description }}</p>
            </div>
            <div class="status-cluster">
              <div class="status-pill">
                <span>朝向</span>
                <strong>{{ directionLabel }}</strong>
              </div>
              <div class="status-pill">
                <span>点亮</span>
                <strong>{{ litKeys.length }}/{{ targetKeys.length }}</strong>
              </div>
              <div class="status-pill" :class="messageToneClass">
                <span>状态</span>
                <strong>{{ statusText }}</strong>
              </div>
            </div>
          </div>

          <div class="board-wrap">
            <div class="board" :style="boardStyle">
              <div
                v-for="cell in boardCells"
                :key="cell.key"
                class="tile"
                :class="{
                  hole: !cell.exists,
                  target: cell.isTarget,
                  lit: cell.isLit,
                  robot: cell.hasRobot,
                  raised: cell.height > 1
                }"
                :style="cell.style"
              >
                <div v-if="cell.exists" class="tile-stack">
                  <div class="tile-top">
                    <span v-if="cell.isTarget" class="lamp-dot"></span>
                    <span v-if="cell.hasRobot" class="robot-glyph" :style="robotGlyphStyle">R</span>
                    <span v-else-if="cell.isLit" class="lamp-glow"></span>
                  </div>
                  <div class="tile-height">{{ cell.height }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="legend-row">
            <span><i class="legend-square target-swatch"></i> 未点亮灯格</span>
            <span><i class="legend-square lit-swatch"></i> 已点亮</span>
            <span><i class="legend-square robot-swatch"></i> 机器人</span>
          </div>
        </section>

        <section class="panel program-panel">
          <div class="program-head">
            <div>
              <p class="eyebrow">Program Builder</p>
              <h2>把动作装进程序</h2>
            </div>
            <div class="program-tabs">
              <button :class="{ active: activeEditor === 'main' }" @click="activeEditor = 'main'">
                Main {{ mainProgram.length }}/{{ currentLevel.mainLimit }}
              </button>
              <button :class="{ active: activeEditor === 'proc1' }" @click="activeEditor = 'proc1'" :disabled="!currentLevel.allowProcedure">
                P1 {{ proc1Program.length }}/{{ currentLevel.procLimit }}
              </button>
            </div>
          </div>

          <div class="command-bank">
            <button
              v-for="command in commandPalette"
              :key="command.id"
              class="command-card"
              :class="command.id"
              @click="appendCommand(command.id)"
              :disabled="command.id === 'call1' && !currentLevel.allowProcedure"
            >
              <strong>{{ command.label }}</strong>
              <small>{{ command.tip }}</small>
            </button>
          </div>

          <div class="editor-grid">
            <div class="sequence-card">
              <div class="sequence-head">
                <h3>Main</h3>
                <button class="soft-btn" @click="clearSequence('main')">清空</button>
              </div>
              <div class="sequence-strip">
                <button
                  v-for="(command, index) in mainProgram"
                  :key="`main-${index}`"
                  class="slot filled"
                  :class="[command, { running: runningProgram === 'main' && runningIndex === index }]"
                  @click="removeCommand('main', index)"
                >
                  {{ commandShortLabel(command) }}
                </button>
                <div
                  v-for="slot in emptySlots(currentLevel.mainLimit, mainProgram.length)"
                  :key="`main-empty-${slot}`"
                  class="slot empty"
                >
                  +
                </div>
              </div>
            </div>

            <div class="sequence-card" :class="{ disabled: !currentLevel.allowProcedure }">
              <div class="sequence-head">
                <h3>P1</h3>
                <button class="soft-btn" @click="clearSequence('proc1')" :disabled="!currentLevel.allowProcedure">清空</button>
              </div>
              <div class="sequence-strip">
                <button
                  v-for="(command, index) in proc1Program"
                  :key="`proc1-${index}`"
                  class="slot filled"
                  :class="[command, { running: runningProgram === 'proc1' && runningIndex === index }]"
                  @click="removeCommand('proc1', index)"
                  :disabled="!currentLevel.allowProcedure"
                >
                  {{ commandShortLabel(command) }}
                </button>
                <div
                  v-for="slot in emptySlots(currentLevel.procLimit, proc1Program.length)"
                  :key="`proc-empty-${slot}`"
                  class="slot empty"
                >
                  +
                </div>
              </div>
            </div>
          </div>

          <div class="control-row">
            <button class="primary-btn" @click="runProgram" :disabled="isRunning || mainProgram.length === 0">运行程序</button>
            <button class="soft-btn" @click="resetLevelState">重置关卡</button>
            <button class="soft-btn" @click="loadDemoSolution">载入示例</button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'programtools-lightbot-progress-v1'
const STEP_DELAY = 320
const DIRECTIONS = ['north', 'east', 'south', 'west']
const DIRECTION_LABELS = {
  north: '上',
  east: '右',
  south: '下',
  west: '左'
}
const DIRECTION_VECTORS = {
  north: [-1, 0],
  east: [0, 1],
  south: [1, 0],
  west: [0, -1]
}
const COMMAND_PALETTE = [
  { id: 'walk', label: '前进', tip: '走到同高度格子' },
  { id: 'jump', label: '跳跃', tip: '跳上下一层或往下落' },
  { id: 'left', label: '左转', tip: '逆时针转向' },
  { id: 'right', label: '右转', tip: '顺时针转向' },
  { id: 'light', label: '点灯', tip: '点亮当前蓝灯格' },
  { id: 'call1', label: '调用 P1', tip: '执行子程序' }
]

const levels = [
  {
    id: 'intro-line',
    title: '直线点灯',
    objective: '学会前进与点灯',
    description: '先从最简单的线性路径开始。机器人需要一路向右，把两盏灯点亮。',
    mainLimit: 6,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [null, null, null, null],
      [{ h: 1 }, { h: 1, target: true }, { h: 1, target: true }, { h: 1 }],
      [null, null, null, null]
    ],
    start: { row: 1, col: 0, dir: 'east' },
    demo: { main: ['walk', 'light', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'stair-turn',
    title: '转向上楼',
    objective: '引入跳跃与转向',
    description: '先走到第一盏灯，再跳上高台，最后转向去点亮第二盏灯。',
    mainLimit: 10,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [null, null, { h: 2, target: true }, null],
      [null, null, { h: 2 }, null],
      [{ h: 1 }, { h: 1, target: true }, { h: 1 }, null],
      [null, null, null, null]
    ],
    start: { row: 2, col: 0, dir: 'east' },
    demo: { main: ['walk', 'light', 'jump', 'left', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'repeat-square',
    title: '重复动作',
    objective: '第一次使用 P1',
    description: '每次都执行“走一步、点灯、右转”，这种重复模式适合装进 P1。',
    mainLimit: 5,
    procLimit: 4,
    allowProcedure: true,
    board: [
      [null, { h: 1, target: true }, { h: 1, target: true }, null],
      [null, { h: 1, target: true }, { h: 1, target: true }, null],
      [null, null, null, null]
    ],
    start: { row: 1, col: 1, dir: 'east' },
    demo: { main: ['light', 'call1', 'call1', 'call1'], proc1: ['walk', 'light', 'right'] }
  },
  {
    id: 'bridge-drop',
    title: '高台落差',
    objective: '理解 jump 的上下差异',
    description: '中间高桥会让前进失效，必须通过 jump 跨到高台，再跳下去点亮终点。',
    mainLimit: 12,
    procLimit: 4,
    allowProcedure: true,
    board: [
      [null, null, { h: 1, target: true }, { h: 1 }, null],
      [{ h: 1 }, { h: 2 }, { h: 2 }, { h: 2 }, { h: 1, target: true }],
      [null, null, null, null, null]
    ],
    start: { row: 1, col: 0, dir: 'east' },
    demo: { main: ['jump', 'walk', 'walk', 'right', 'jump', 'light', 'left', 'left', 'jump', 'light'], proc1: [] }
  },
  {
    id: 'procedural-loop',
    title: '程序员收官',
    objective: '主程序负责节拍，P1 负责细节',
    description: '这一关需要把“前进、点灯、跳回高台、左转”拆成一个稳定的套路。',
    mainLimit: 8,
    procLimit: 6,
    allowProcedure: true,
    board: [
      [null, { h: 2 }, { h: 2 }, { h: 2 }, null],
      [{ h: 1, target: true }, { h: 1 }, { h: 1, target: true }, { h: 1 }, { h: 1, target: true }],
      [null, { h: 2 }, { h: 2 }, { h: 2 }, null]
    ],
    start: { row: 0, col: 1, dir: 'east' },
    demo: { main: ['call1', 'call1', 'call1'], proc1: ['jump', 'light', 'left', 'jump', 'walk', 'right'] }
  }
]

function keyOf(row, col) {
  return `${row},${col}`
}

function cloneRobot(start) {
  return {
    row: start.row,
    col: start.col,
    dir: start.dir
  }
}

function loadStoredProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = JSON.parse(raw || '{}')
    return Array.isArray(parsed.completedLevelIds) ? parsed.completedLevelIds : []
  } catch {
    return []
  }
}

const selectedLevelIndex = ref(0)
const activeEditor = ref('main')
const mainProgram = ref([])
const proc1Program = ref([])
const completedLevelIds = ref(loadStoredProgress())
const litKeys = ref([])
const robot = ref(cloneRobot(levels[0].start))
const statusText = ref('准备开始')
const statusTone = ref('neutral')
const isRunning = ref(false)
const runningProgram = ref('')
const runningIndex = ref(-1)
const executionNonce = ref(0)

const currentLevel = computed(() => levels[selectedLevelIndex.value])
const completedCount = computed(() => completedLevelIds.value.length)
const targetKeys = computed(() => {
  const keys = []
  currentLevel.value.board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell?.target) keys.push(keyOf(rowIndex, colIndex))
    })
  })
  return keys
})
const directionLabel = computed(() => DIRECTION_LABELS[robot.value.dir] || '')
const messageToneClass = computed(() => ({
  success: statusTone.value === 'success',
  danger: statusTone.value === 'danger'
}))
const commandPalette = computed(() => COMMAND_PALETTE)
const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${currentLevel.value.board[0].length}, minmax(72px, 1fr))`
}))
const robotGlyphStyle = computed(() => {
  const rotation = {
    north: '-90deg',
    east: '0deg',
    south: '90deg',
    west: '180deg'
  }[robot.value.dir] || '0deg'
  return { transform: `rotate(${rotation})` }
})
const boardCells = computed(() => {
  const cells = []
  currentLevel.value.board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const exists = Boolean(cell)
      const key = keyOf(rowIndex, colIndex)
      const height = Number(cell?.h || 0)
      cells.push({
        key,
        exists,
        height,
        isTarget: Boolean(cell?.target),
        isLit: litKeys.value.includes(key),
        hasRobot: robot.value.row === rowIndex && robot.value.col === colIndex,
        style: exists ? { '--stack-height': String(height) } : {}
      })
    })
  })
  return cells
})

watch(selectedLevelIndex, () => {
  resetEditorAndLevel()
})

watch(completedLevelIds, (value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLevelIds: value }))
}, { deep: true })

function emptySlots(limit, used) {
  return Array.from({ length: Math.max(limit - used, 0) }, (_, index) => index)
}

function commandShortLabel(command) {
  return {
    walk: 'W',
    jump: 'J',
    left: 'L',
    right: 'R',
    light: 'B',
    call1: 'P1'
  }[command] || '?'
}

function tileAt(row, col) {
  return currentLevel.value.board[row]?.[col] || null
}

function setStatus(text, tone = 'neutral') {
  statusText.value = text
  statusTone.value = tone
}

function resetLevelState() {
  executionNonce.value += 1
  isRunning.value = false
  runningProgram.value = ''
  runningIndex.value = -1
  litKeys.value = []
  robot.value = cloneRobot(currentLevel.value.start)
  setStatus('已重置关卡')
}

function resetEditorAndLevel() {
  activeEditor.value = 'main'
  mainProgram.value = []
  proc1Program.value = []
  resetLevelState()
}

function selectLevel(index) {
  selectedLevelIndex.value = index
}

function currentSequenceRef(name) {
  return name === 'proc1' ? proc1Program : mainProgram
}

function appendCommand(command) {
  if (command === 'call1' && !currentLevel.value.allowProcedure) return
  const target = currentSequenceRef(activeEditor.value)
  const limit = activeEditor.value === 'proc1' ? currentLevel.value.procLimit : currentLevel.value.mainLimit
  if (target.value.length >= limit) {
    setStatus('该程序槽位已满', 'danger')
    return
  }
  target.value = [...target.value, command]
  setStatus(`已添加 ${commandShortLabel(command)}`)
}

function removeCommand(name, index) {
  const target = currentSequenceRef(name)
  target.value = target.value.filter((_, itemIndex) => itemIndex !== index)
  setStatus('已删除该动作')
}

function clearSequence(name) {
  const target = currentSequenceRef(name)
  target.value = []
  setStatus(`已清空 ${name === 'main' ? 'Main' : 'P1'}`)
}

function loadDemoSolution() {
  mainProgram.value = [...currentLevel.value.demo.main]
  proc1Program.value = [...currentLevel.value.demo.proc1]
  setStatus('已载入示例解法')
}

function rotateLeft(dir) {
  const currentIndex = DIRECTIONS.indexOf(dir)
  return DIRECTIONS[(currentIndex + DIRECTIONS.length - 1) % DIRECTIONS.length]
}

function rotateRight(dir) {
  const currentIndex = DIRECTIONS.indexOf(dir)
  return DIRECTIONS[(currentIndex + 1) % DIRECTIONS.length]
}

function nextPosition() {
  const [rowOffset, colOffset] = DIRECTION_VECTORS[robot.value.dir]
  return {
    row: robot.value.row + rowOffset,
    col: robot.value.col + colOffset
  }
}

function markCompleteIfNeeded() {
  if (targetKeys.value.every((key) => litKeys.value.includes(key))) {
    if (!completedLevelIds.value.includes(currentLevel.value.id)) {
      completedLevelIds.value = [...completedLevelIds.value, currentLevel.value.id]
    }
    setStatus('全部点亮，通关成功', 'success')
    return true
  }
  return false
}

function failRun(message) {
  setStatus(message, 'danger')
  throw new Error(message)
}

async function runCommand(command, nonce) {
  if (nonce !== executionNonce.value) return
  if (command === 'left') {
    robot.value = { ...robot.value, dir: rotateLeft(robot.value.dir) }
  } else if (command === 'right') {
    robot.value = { ...robot.value, dir: rotateRight(robot.value.dir) }
  } else if (command === 'light') {
    const currentKey = keyOf(robot.value.row, robot.value.col)
    const tile = tileAt(robot.value.row, robot.value.col)
    if (!tile?.target) failRun('这里没有灯，不能点亮')
    if (!litKeys.value.includes(currentKey)) {
      litKeys.value = [...litKeys.value, currentKey]
    }
    markCompleteIfNeeded()
  } else {
    const currentTile = tileAt(robot.value.row, robot.value.col)
    const next = nextPosition()
    const nextTile = tileAt(next.row, next.col)
    if (!currentTile || !nextTile) failRun('机器人掉出了平台')
    const currentHeight = Number(currentTile.h || 0)
    const nextHeight = Number(nextTile.h || 0)

    if (command === 'walk') {
      if (nextHeight !== currentHeight) failRun('前进只能走到同高度平台')
      robot.value = { ...robot.value, row: next.row, col: next.col }
    }

    if (command === 'jump') {
      const canJumpUp = nextHeight === currentHeight + 1
      const canDropDown = nextHeight < currentHeight
      if (!canJumpUp && !canDropDown) failRun('跳跃只能上升一层，或跳向更低的平台')
      robot.value = { ...robot.value, row: next.row, col: next.col }
    }
  }

  await new Promise((resolve) => window.setTimeout(resolve, STEP_DELAY))
}

async function runSequence(sequenceName, sequence, nonce, depth = 0, budget = { steps: 0 }) {
  if (depth > 6) failRun('子程序调用层数过深')
  for (let index = 0; index < sequence.length; index += 1) {
    if (nonce !== executionNonce.value) return
    if (budget.steps > 80) failRun('程序步数过多，疑似死循环')
    budget.steps += 1
    runningProgram.value = sequenceName
    runningIndex.value = index
    const command = sequence[index]
    if (command === 'call1') {
      if (!currentLevel.value.allowProcedure || proc1Program.value.length === 0) failRun('P1 还没有内容')
      await runSequence('proc1', proc1Program.value, nonce, depth + 1, budget)
    } else {
      await runCommand(command, nonce)
    }
    if (markCompleteIfNeeded()) return
  }
}

async function runProgram() {
  if (isRunning.value || mainProgram.value.length === 0) return
  resetLevelState()
  isRunning.value = true
  const nonce = executionNonce.value
  setStatus('程序运行中')
  try {
    await runSequence('main', mainProgram.value, nonce)
    if (nonce !== executionNonce.value) return
    if (!targetKeys.value.every((key) => litKeys.value.includes(key))) {
      setStatus('程序结束了，但还有灯未点亮', 'danger')
    }
  } catch {
    // failRun 已经设置状态
  } finally {
    if (nonce === executionNonce.value) {
      isRunning.value = false
      runningProgram.value = ''
      runningIndex.value = -1
    }
  }
}
</script>

<style scoped>
.lightbot-page {
  --bg-top: #f4f0ff;
  --bg-bottom: #d9ecff;
  --ink: #1f2840;
  --muted: #66728f;
  --line: rgba(89, 110, 160, 0.18);
  --panel: rgba(255, 255, 255, 0.78);
  --purple: #5f4bff;
  --teal: #2aa8a1;
  --orange: #ff9151;
  min-height: calc(100vh - 80px);
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(116, 107, 255, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(58, 187, 215, 0.22), transparent 24%),
    linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
  color: var(--ink);
}

.lightbot-shell {
  max-width: 1380px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
}

.sidebar,
.stage-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(53, 67, 110, 0.12);
  backdrop-filter: blur(18px);
}

.brand-panel,
.level-panel,
.guide-panel,
.stage-panel,
.program-panel {
  padding: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--purple);
  font-weight: 700;
}

.brand-panel h1,
.stage-topbar h2,
.program-head h2 {
  margin: 0;
  font-size: 34px;
  line-height: 1.05;
}

.subtitle,
.stage-copy {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.panel-head,
.program-head,
.sequence-head,
.stage-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h2,
.sequence-head h3 {
  margin: 0;
  font-size: 18px;
}

.panel-meta {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(95, 75, 255, 0.1);
  color: var(--purple);
  font-size: 12px;
  font-weight: 700;
}

.level-chip {
  width: 100%;
  margin-top: 10px;
  padding: 14px;
  border: 1px solid rgba(104, 120, 164, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.level-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(95, 75, 255, 0.4);
}

.level-chip.active {
  border-color: rgba(95, 75, 255, 0.55);
  box-shadow: 0 10px 24px rgba(95, 75, 255, 0.16);
}

.level-chip.done .level-no {
  background: linear-gradient(135deg, #27c49a, #17936f);
  color: #fff;
}

.level-no {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  background: rgba(95, 75, 255, 0.12);
  color: var(--purple);
}

.level-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.level-copy strong {
  font-size: 15px;
}

.level-copy small,
.guide-panel li {
  color: var(--muted);
  line-height: 1.5;
}

.guide-panel ul {
  margin: 12px 0 0;
  padding-left: 18px;
}

.status-cluster {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.status-pill {
  min-width: 96px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(96, 114, 161, 0.16);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-pill span {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-pill strong {
  font-size: 15px;
}

.status-pill.success {
  background: rgba(39, 196, 154, 0.16);
}

.status-pill.danger {
  background: rgba(255, 122, 100, 0.16);
}

.board-wrap {
  margin-top: 22px;
  overflow-x: auto;
}

.board {
  display: grid;
  gap: 14px;
  min-width: fit-content;
  align-items: end;
}

.tile {
  width: 100%;
  min-width: 72px;
  aspect-ratio: 1;
  position: relative;
}

.tile.hole {
  visibility: hidden;
}

.tile-stack {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.tile-top {
  position: relative;
  height: calc(52px + (var(--stack-height) - 1) * 12px);
  border-radius: 20px;
  background: linear-gradient(180deg, #fcfdff 0%, #d9ebff 100%);
  border: 1px solid rgba(111, 143, 206, 0.35);
  box-shadow:
    inset 0 -10px 20px rgba(94, 135, 199, 0.1),
    0 14px 28px rgba(79, 101, 145, 0.16);
  display: grid;
  place-items: center;
}

.tile.raised .tile-top {
  background: linear-gradient(180deg, #f7f5ff 0%, #dce8ff 100%);
}

.tile.target .tile-top {
  background: linear-gradient(180deg, #f9fbff 0%, #d8f0ff 100%);
}

.tile.lit .tile-top {
  background: linear-gradient(180deg, #fff4bd 0%, #ffd65b 100%);
}

.lamp-dot,
.lamp-glow {
  width: 20px;
  height: 20px;
  border-radius: 999px;
}

.lamp-dot {
  background: radial-gradient(circle at 30% 30%, #d7f6ff, #3aa7d8 70%);
  box-shadow: 0 0 0 6px rgba(58, 167, 216, 0.12);
}

.lamp-glow {
  background: radial-gradient(circle at 35% 35%, #fffef3, #ffca2a 72%);
  box-shadow: 0 0 22px rgba(255, 197, 46, 0.72);
}

.robot-glyph {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #5f4bff, #2ba5e6);
  color: #fff;
  font-weight: 900;
  box-shadow: 0 10px 20px rgba(59, 86, 167, 0.3);
  transition: transform 0.2s ease;
}

.tile-height {
  position: absolute;
  right: 10px;
  bottom: 10px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(43, 64, 97, 0.46);
}

.legend-row {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: var(--muted);
  font-size: 13px;
}

.legend-square {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  margin-right: 6px;
  vertical-align: -2px;
}

.target-swatch { background: #52b3e3; }
.lit-swatch { background: #ffcb39; }
.robot-swatch { background: #5f4bff; }

.program-tabs {
  display: flex;
  gap: 8px;
}

.program-tabs button,
.soft-btn,
.primary-btn {
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.16s ease, opacity 0.16s ease, background 0.16s ease;
}

.program-tabs button {
  background: rgba(98, 110, 159, 0.1);
  color: var(--muted);
}

.program-tabs button.active {
  background: linear-gradient(135deg, #5f4bff, #2aa8a1);
  color: #fff;
}

.program-tabs button:disabled,
.soft-btn:disabled,
.primary-btn:disabled,
.command-card:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.command-bank {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.command-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(97, 115, 163, 0.14);
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
}

.command-card strong {
  font-size: 15px;
}

.command-card small {
  color: var(--muted);
  line-height: 1.4;
}

.command-card.walk { border-color: rgba(72, 146, 255, 0.24); }
.command-card.jump { border-color: rgba(255, 145, 81, 0.24); }
.command-card.left, .command-card.right { border-color: rgba(95, 75, 255, 0.24); }
.command-card.light { border-color: rgba(255, 198, 46, 0.28); }
.command-card.call1 { border-color: rgba(42, 168, 161, 0.3); }

.editor-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.sequence-card {
  border: 1px solid rgba(97, 115, 163, 0.12);
  border-radius: 20px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.62);
}

.sequence-card.disabled {
  opacity: 0.52;
}

.sequence-strip {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
  gap: 10px;
}

.slot {
  min-height: 54px;
  border-radius: 16px;
  border: 1px dashed rgba(99, 117, 166, 0.28);
  display: grid;
  place-items: center;
  font-weight: 800;
}

.slot.filled {
  border-style: solid;
  background: rgba(255, 255, 255, 0.84);
  cursor: pointer;
}

.slot.running {
  box-shadow: 0 0 0 3px rgba(95, 75, 255, 0.22);
  transform: translateY(-1px);
}

.slot.walk { color: #2570d6; }
.slot.jump { color: #d96d2b; }
.slot.left, .slot.right { color: #5f4bff; }
.slot.light { color: #d59d00; }
.slot.call1 { color: #0f8d88; }

.slot.empty {
  color: rgba(104, 123, 173, 0.42);
}

.control-row {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-btn {
  background: linear-gradient(135deg, #5f4bff, #2aa8a1);
  color: #fff;
}

.soft-btn {
  background: rgba(100, 117, 162, 0.1);
  color: var(--ink);
}

@media (max-width: 1120px) {
  .lightbot-shell {
    grid-template-columns: 1fr;
  }

  .command-bank {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .lightbot-page {
    padding: 12px;
  }

  .brand-panel h1,
  .stage-topbar h2,
  .program-head h2 {
    font-size: 28px;
  }

  .stage-topbar,
  .program-head,
  .panel-head,
  .sequence-head {
    flex-direction: column;
  }

  .status-cluster {
    justify-content: flex-start;
  }

  .command-bank,
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .board {
    grid-template-columns: repeat(4, minmax(64px, 1fr)) !important;
  }
}
</style>