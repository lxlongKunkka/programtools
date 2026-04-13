<template>
  <div class="lightbot-page">
    <div class="lightbot-layout">
      <section class="board-panel">
        <div class="board-header">
          <div>
            <p class="board-kicker">Robot Puzzle</p>
            <h1>{{ currentLevel.title }}</h1>
            <p class="board-copy">{{ currentLevel.description }}</p>
          </div>
          <div class="level-switcher">
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
        </div>

        <div class="board-stage">
          <div class="scene-shell">
            <div class="iso-scene" :style="sceneStyle">
              <div
                v-for="cell in sceneCells"
                :key="cell.key"
                class="iso-tile"
                :class="{ target: cell.isTarget, lit: cell.isLit }"
                :style="cell.style"
              >
                <div class="iso-top">
                  <span v-if="cell.isTarget && !cell.isLit" class="lamp lamp-off"></span>
                  <span v-else-if="cell.isLit" class="lamp lamp-on"></span>
                  <span v-if="cell.hasRobot" class="robot-sprite" :style="robotStyle">🤖</span>
                </div>
                <div class="iso-left"></div>
                <div class="iso-right"></div>
              </div>
            </div>
          </div>

          <div class="board-status">
            <div class="status-box">
              <span>方向</span>
              <strong>{{ directionLabel }}</strong>
            </div>
            <div class="status-box">
              <span>点亮</span>
              <strong>{{ litKeys.length }}/{{ targetKeys.length }}</strong>
            </div>
            <div class="status-box" :class="statusTone">
              <span>状态</span>
              <strong>{{ statusText }}</strong>
            </div>
          </div>
        </div>

        <div class="control-bar">
          <button class="control-btn" :disabled="isRunning || activeSequence.length === 0" @click="undoLastCommand">↶</button>
          <button class="control-btn" :disabled="isRunning" @click="resetLevelState">🔈</button>
          <button class="control-btn" :disabled="isRunning || activeSequence.length === 0" @click="clearActiveSequence">🗑</button>
          <button class="control-btn play" :disabled="isRunning || mainProgram.length === 0" @click="runProgram">▶</button>

          <div class="speed-box">
            <span>Speed:</span>
            <input v-model="speedValue" class="speed-slider" type="range" min="1" max="5" step="1">
          </div>
        </div>
      </section>

      <aside class="sidebar-panel">
        <section class="side-card">
          <div class="side-title">Instructions</div>
          <button
            v-for="command in commandPalette"
            :key="command.id"
            class="instruction-btn"
            :disabled="command.id === 'call1' && !currentLevel.allowProcedure"
            @click="appendCommand(command.id)"
          >
            <span>{{ command.label }}</span>
            <small>{{ command.id === 'repeat2' ? '把下一条动作执行 2 次' : command.tip }}</small>
          </button>
        </section>

        <section class="side-card program-card">
          <div class="program-head">
            <div class="side-title">Program</div>
            <div class="editor-tabs">
              <button :class="{ active: activeEditor === 'main' }" @click="activeEditor = 'main'">Main</button>
              <button :class="{ active: activeEditor === 'proc1' }" :disabled="!currentLevel.allowProcedure" @click="activeEditor = 'proc1'">P1</button>
            </div>
          </div>

          <div class="program-section">
            <div class="sequence-label">Main</div>
            <div class="program-grid">
              <button
                v-for="(command, index) in mainProgram"
                :key="`main-${index}`"
                class="program-slot filled"
                :class="[command, { active: runningProgram === 'main' && runningIndex === index }]"
                @click="removeCommand('main', index)"
              >
                {{ commandLabel(command) }}
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.mainLimit, mainProgram.length)"
                :key="`main-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </div>

          <div class="program-section" :class="{ disabled: !currentLevel.allowProcedure }">
            <div class="sequence-label">P1</div>
            <div class="program-grid">
              <button
                v-for="(command, index) in proc1Program"
                :key="`proc1-${index}`"
                class="program-slot filled"
                :class="[command, { active: runningProgram === 'proc1' && runningIndex === index }]"
                :disabled="!currentLevel.allowProcedure"
                @click="removeCommand('proc1', index)"
              >
                {{ commandLabel(command) }}
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.procLimit, proc1Program.length)"
                :key="`proc1-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </div>

          <div class="program-actions">
            <button class="ghost-btn" :disabled="isRunning" @click="loadDemoSolution">示例</button>
            <button class="ghost-btn" :disabled="isRunning" @click="resetEditorAndLevel">重置全部</button>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'programtools-lightbot-progress-v2'
const TILE_WIDTH = 92
const TILE_HEIGHT = 46
const TILE_DEPTH = 24
const DIRECTIONS = ['north', 'east', 'south', 'west']
const DIRECTION_LABELS = { north: '向上', east: '向右', south: '向下', west: '向左' }
const DIRECTION_VECTORS = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] }
const SPEED_MAP = { 1: 560, 2: 420, 3: 300, 4: 220, 5: 140 }
const COMMANDS = [
  { id: 'walk', label: 'Walk forward', tip: '同高度前进一步' },
  { id: 'right', label: 'Turn 90 degrees to the right', tip: '顺时针转向' },
  { id: 'left', label: 'Turn 90 degrees to the left', tip: '逆时针转向' },
  { id: 'jump', label: 'Jump', tip: '上跳一层或向下落' },
  { id: 'light', label: 'Light', tip: '点亮当前蓝灯格' },
  { id: 'repeat2', label: 'Repeat 2 times', tip: '重复下一条动作' },
  { id: 'call1', label: 'Call P1', tip: '调用子程序 P1' }
]

const levels = [
  {
    id: 'intro-grid',
    title: 'Level 1: First Lights',
    description: '先学会走路和点灯。主程序够长，不需要子程序。',
    mainLimit: 8,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [null, null, null, null],
      [{ h: 1 }, { h: 1, target: true }, { h: 1 }, { h: 1, target: true }],
      [null, null, null, null]
    ],
    start: { row: 1, col: 0, dir: 'east' },
    demo: { main: ['walk', 'light', 'walk', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'jump-path',
    title: 'Level 2: Jump Up',
    description: '中间有高台，必须通过 jump 才能继续点灯。',
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
    id: 'repeat-lights',
    title: 'Level 3: Repeat',
    description: '这一关可以用 Repeat 2 times 缩短主程序。',
    mainLimit: 8,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [null, null, null, null, null],
      [{ h: 1 }, { h: 1, target: true }, { h: 1, target: true }, { h: 1, target: true }, null],
      [null, null, null, null, null]
    ],
    start: { row: 1, col: 0, dir: 'east' },
    demo: { main: ['repeat2', 'walk', 'light', 'walk', 'light', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'procedure-square',
    title: 'Level 4: Procedure',
    description: '开始使用 P1，把重复动作折叠成一个子程序。',
    mainLimit: 6,
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
    id: 'bridge-loop',
    title: 'Level 5: Bridge',
    description: '最后一关同时用到 jump、转向和 P1。',
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
  return { row: start.row, col: start.col, dir: start.dir }
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
const activeEditor = ref('main')
const mainProgram = ref([])
const proc1Program = ref([])
const completedLevelIds = ref(loadProgress())
const litKeys = ref([])
const robot = ref(cloneRobot(levels[0].start))
const statusText = ref('Program is empty')
const statusTone = ref('neutral')
const isRunning = ref(false)
const runningProgram = ref('')
const runningIndex = ref(-1)
const executionNonce = ref(0)
const speedValue = ref(3)

const currentLevel = computed(() => levels[selectedLevelIndex.value])
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
const activeSequence = computed(() => activeEditor.value === 'proc1' ? proc1Program.value : mainProgram.value)
const commandPalette = computed(() => COMMANDS.filter((command) => command.id !== 'call1' || currentLevel.value.allowProcedure))
const robotStyle = computed(() => {
  const rotation = { north: '-90deg', east: '0deg', south: '90deg', west: '180deg' }[robot.value.dir] || '0deg'
  return { transform: `translate(-50%, -74%) rotate(${rotation})` }
})
const sceneMetrics = computed(() => {
  const existingCells = []
  currentLevel.value.board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return
      const x = (colIndex - rowIndex) * TILE_WIDTH / 2
      const y = (colIndex + rowIndex) * TILE_HEIGHT / 2 - Number(cell.h || 1) * TILE_DEPTH
      existingCells.push({ row: rowIndex, col: colIndex, cell, x, y })
    })
  })
  const minX = Math.min(...existingCells.map((item) => item.x))
  const minY = Math.min(...existingCells.map((item) => item.y))
  const maxX = Math.max(...existingCells.map((item) => item.x + TILE_WIDTH))
  const maxY = Math.max(...existingCells.map((item) => item.y + TILE_HEIGHT + Number(item.cell.h || 1) * TILE_DEPTH))
  return {
    cells: existingCells,
    minX,
    minY,
    width: Math.ceil(maxX - minX + 48),
    height: Math.ceil(maxY - minY + 48)
  }
})
const sceneStyle = computed(() => ({ width: `${sceneMetrics.value.width}px`, height: `${sceneMetrics.value.height}px` }))
const sceneCells = computed(() => sceneMetrics.value.cells.map((item) => ({
  key: keyOf(item.row, item.col),
  isTarget: Boolean(item.cell.target),
  isLit: litKeys.value.includes(keyOf(item.row, item.col)),
  hasRobot: robot.value.row === item.row && robot.value.col === item.col,
  style: {
    left: `${item.x - sceneMetrics.value.minX + 24}px`,
    top: `${item.y - sceneMetrics.value.minY + 24}px`,
    '--tile-depth': `${Number(item.cell.h || 1) * TILE_DEPTH}px`
  }
})))

watch(selectedLevelIndex, () => resetEditorAndLevel())
watch(completedLevelIds, (value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLevelIds: value }))
}, { deep: true })

function setStatus(text, tone = 'neutral') {
  statusText.value = text
  statusTone.value = tone
}

function emptySlots(limit, used) {
  return Array.from({ length: Math.max(limit - used, 0) }, (_, index) => index)
}

function commandLabel(command) {
  return {
    walk: 'Walk',
    right: 'Turn R',
    left: 'Turn L',
    jump: 'Jump',
    light: 'Light',
    repeat2: 'R2',
    call1: 'P1'
  }[command] || command
}

function delayForSpeed() {
  return SPEED_MAP[String(speedValue.value)] || SPEED_MAP[3]
}

function tileAt(row, col) {
  return currentLevel.value.board[row]?.[col] || null
}

function rotateLeft(dir) {
  const index = DIRECTIONS.indexOf(dir)
  return DIRECTIONS[(index + DIRECTIONS.length - 1) % DIRECTIONS.length]
}

function rotateRight(dir) {
  const index = DIRECTIONS.indexOf(dir)
  return DIRECTIONS[(index + 1) % DIRECTIONS.length]
}

function nextPosition() {
  const [rowOffset, colOffset] = DIRECTION_VECTORS[robot.value.dir]
  return { row: robot.value.row + rowOffset, col: robot.value.col + colOffset }
}

function markCompleteIfNeeded() {
  if (!targetKeys.value.every((key) => litKeys.value.includes(key))) return false
  if (!completedLevelIds.value.includes(currentLevel.value.id)) {
    completedLevelIds.value = [...completedLevelIds.value, currentLevel.value.id]
  }
  setStatus('Level complete', 'success')
  return true
}

function resetLevelState() {
  executionNonce.value += 1
  isRunning.value = false
  runningProgram.value = ''
  runningIndex.value = -1
  litKeys.value = []
  robot.value = cloneRobot(currentLevel.value.start)
  setStatus('Level reset')
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

function appendCommand(command) {
  const target = activeEditor.value === 'proc1' ? proc1Program : mainProgram
  const limit = activeEditor.value === 'proc1' ? currentLevel.value.procLimit : currentLevel.value.mainLimit
  if (target.value.length >= limit) {
    setStatus('No more slots available', 'danger')
    return
  }
  target.value = [...target.value, command]
  setStatus(`${commandLabel(command)} added`)
}

function removeCommand(sequenceName, index) {
  const target = sequenceName === 'proc1' ? proc1Program : mainProgram
  target.value = target.value.filter((_, itemIndex) => itemIndex !== index)
  setStatus('Instruction removed')
}

function undoLastCommand() {
  if (activeEditor.value === 'proc1') {
    proc1Program.value = proc1Program.value.slice(0, -1)
  } else {
    mainProgram.value = mainProgram.value.slice(0, -1)
  }
  setStatus('Last instruction removed')
}

function clearActiveSequence() {
  if (activeEditor.value === 'proc1') {
    proc1Program.value = []
  } else {
    mainProgram.value = []
  }
  setStatus('Sequence cleared')
}

function loadDemoSolution() {
  mainProgram.value = [...currentLevel.value.demo.main]
  proc1Program.value = [...currentLevel.value.demo.proc1]
  setStatus('Demo loaded')
}

function failRun(message) {
  setStatus(message, 'danger')
  throw new Error(message)
}

async function waitStep() {
  await new Promise((resolve) => window.setTimeout(resolve, delayForSpeed()))
}

async function executeAction(command, nonce) {
  if (nonce !== executionNonce.value) return

  if (command === 'left') {
    robot.value = { ...robot.value, dir: rotateLeft(robot.value.dir) }
    await waitStep()
    return
  }

  if (command === 'right') {
    robot.value = { ...robot.value, dir: rotateRight(robot.value.dir) }
    await waitStep()
    return
  }

  if (command === 'light') {
    const tile = tileAt(robot.value.row, robot.value.col)
    const currentKey = keyOf(robot.value.row, robot.value.col)
    if (!tile?.target) failRun('No light tile here')
    if (!litKeys.value.includes(currentKey)) {
      litKeys.value = [...litKeys.value, currentKey]
    }
    await waitStep()
    markCompleteIfNeeded()
    return
  }

  const currentTile = tileAt(robot.value.row, robot.value.col)
  const next = nextPosition()
  const nextTile = tileAt(next.row, next.col)

  if (!currentTile || !nextTile) failRun('Robot would fall off the board')

  const currentHeight = Number(currentTile.h || 0)
  const nextHeight = Number(nextTile.h || 0)

  if (command === 'walk') {
    if (nextHeight !== currentHeight) failRun('Walk only works on the same height')
    robot.value = { ...robot.value, row: next.row, col: next.col }
    await waitStep()
    return
  }

  if (command === 'jump') {
    const canJumpUp = nextHeight === currentHeight + 1
    const canDropDown = nextHeight < currentHeight
    if (!canJumpUp && !canDropDown) failRun('Jump must go up by 1 or down any number of levels')
    robot.value = { ...robot.value, row: next.row, col: next.col }
    await waitStep()
  }
}

async function runSequence(sequenceName, sequence, nonce, depth = 0, budget = { steps: 0 }) {
  if (depth > 6) failRun('Procedure nesting is too deep')

  for (let index = 0; index < sequence.length; index += 1) {
    if (nonce !== executionNonce.value) return
    if (budget.steps > 100) failRun('Program is too long')

    const command = sequence[index]
    runningProgram.value = sequenceName
    runningIndex.value = index

    if (command === 'repeat2') {
      const nextCommand = sequence[index + 1]
      if (!nextCommand) failRun('Repeat needs a following instruction')

      for (let repeatIndex = 0; repeatIndex < 2; repeatIndex += 1) {
        budget.steps += 1
        if (nextCommand === 'call1') {
          if (!currentLevel.value.allowProcedure || proc1Program.value.length === 0) failRun('P1 is empty')
          await runSequence('proc1', proc1Program.value, nonce, depth + 1, budget)
        } else {
          await executeAction(nextCommand, nonce)
        }

        if (markCompleteIfNeeded()) return
      }

      index += 1
      continue
    }

    budget.steps += 1
    if (command === 'call1') {
      if (!currentLevel.value.allowProcedure || proc1Program.value.length === 0) failRun('P1 is empty')
      await runSequence('proc1', proc1Program.value, nonce, depth + 1, budget)
    } else {
      await executeAction(command, nonce)
    }

    if (markCompleteIfNeeded()) return
  }
}

async function runProgram() {
  if (isRunning.value || mainProgram.value.length === 0) return

  resetLevelState()
  isRunning.value = true
  const nonce = executionNonce.value
  setStatus('Program running')

  try {
    await runSequence('main', mainProgram.value, nonce)
    if (nonce === executionNonce.value && !targetKeys.value.every((key) => litKeys.value.includes(key))) {
      setStatus('Program finished, but some lights are still off', 'danger')
    }
  } catch {
    // failRun already set the status.
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
  min-height: calc(100vh - 80px);
  padding: 8px;
  background: #d5d5d5;
  color: #fff;
}

.lightbot-layout {
  min-height: calc(100vh - 96px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 8px;
}

.board-panel,
.side-card {
  background: #676260;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.board-panel {
  display: flex;
  flex-direction: column;
  padding: 14px 14px 8px;
}

.board-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.board-kicker {
  margin: 0 0 4px;
  color: #d8d0cb;
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.board-header h1 {
  margin: 0;
  font-size: 28px;
  color: #fff;
}

.board-copy {
  margin: 6px 0 0;
  color: #e8dfd7;
  max-width: 520px;
  line-height: 1.45;
}

.level-switcher {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.level-pill {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: #7f7976;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.level-pill.active {
  background: #9fd3cb;
  color: #3f4b49;
}

.level-pill.done:not(.active) {
  background: #8eb08a;
}

.board-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background:
    linear-gradient(30deg, rgba(213, 219, 225, .8) 12%, transparent 12.5%, transparent 87%, rgba(213, 219, 225, .8) 87.5%, rgba(213, 219, 225, .8)),
    linear-gradient(150deg, rgba(213, 219, 225, .8) 12%, transparent 12.5%, transparent 87%, rgba(213, 219, 225, .8) 87.5%, rgba(213, 219, 225, .8)),
    linear-gradient(90deg, rgba(233, 237, 241, .9) 2%, transparent 2.5%, transparent 97%, rgba(233, 237, 241, .9) 97.5%, rgba(233, 237, 241, .9));
  background-size: 58px 102px;
  background-color: #eef1f4;
}

.scene-shell {
  position: absolute;
  inset: 0;
  overflow: auto;
  padding: 24px;
}

.iso-scene {
  position: relative;
  margin: 40px auto 0;
}

.iso-tile {
  position: absolute;
  width: 92px;
  height: 70px;
}

.iso-top,
.iso-left,
.iso-right {
  position: absolute;
}

.iso-top {
  left: 0;
  top: 0;
  width: 92px;
  height: 46px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: #666;
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.iso-left {
  left: 0;
  top: 22px;
  width: 46px;
  height: var(--tile-depth);
  clip-path: polygon(100% 0, 100% 100%, 0 78%, 0 24%);
  background: #747474;
}

.iso-right {
  right: 0;
  top: 22px;
  width: 46px;
  height: var(--tile-depth);
  clip-path: polygon(0 0, 100% 24%, 100% 78%, 0 100%);
  background: #555;
}

.iso-tile.target .iso-top {
  background: #6f6f6f;
}

.iso-tile.lit .iso-top {
  background: #7a7a66;
}

.lamp {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 20px;
  border-radius: 6px;
}

.lamp-off {
  background: #1e74ea;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15);
}

.lamp-on {
  background: #ffe66a;
  box-shadow: 0 0 18px rgba(255, 226, 77, .78);
}

.robot-sprite {
  position: absolute;
  left: 50%;
  top: 50%;
  font-size: 36px;
  filter: drop-shadow(0 8px 8px rgba(0, 0, 0, .18));
}

.board-status {
  position: absolute;
  right: 14px;
  top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  max-width: calc(100% - 24px);
}

.status-box {
  min-width: 100px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(74, 68, 66, .84);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.status-box span {
  font-size: 11px;
  color: #d4cbc5;
  text-transform: uppercase;
}

.status-box.success {
  background: rgba(92, 128, 89, .9);
}

.status-box.danger {
  background: rgba(139, 88, 78, .92);
}

.control-bar {
  margin-top: 8px;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: #6d6865;
}

.control-btn,
.ghost-btn,
.editor-tabs button,
.instruction-btn,
.program-slot.filled {
  border: 0;
  cursor: pointer;
}

.control-btn {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: #5d5957;
  color: #fff;
}

.control-btn.play {
  background: #a4d9d1;
  color: #334b47;
}

.control-btn:disabled,
.ghost-btn:disabled,
.editor-tabs button:disabled,
.instruction-btn:disabled,
.program-slot.filled:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.speed-box {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 700;
}

.speed-slider {
  width: 90px;
  accent-color: #9fd3cb;
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side-card {
  padding: 12px;
}

.side-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
}

.instruction-btn {
  width: 100%;
  padding: 10px 12px;
  margin-top: 2px;
  border-top: 1px solid rgba(255, 255, 255, .1);
  background: transparent;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
}

.instruction-btn small {
  color: #d7cdca;
}

.program-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.program-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.editor-tabs {
  display: flex;
  gap: 6px;
}

.editor-tabs button,
.ghost-btn {
  padding: 8px 10px;
  border-radius: 8px;
  background: #5a5755;
  color: #fff;
}

.editor-tabs button.active {
  background: #9fd3cb;
  color: #334b47;
}

.program-section {
  margin-top: 14px;
}

.program-section.disabled {
  opacity: .45;
}

.sequence-label {
  margin-bottom: 8px;
  color: #d6ceca;
  font-weight: 700;
}

.program-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.program-slot {
  min-height: 46px;
  border-radius: 8px;
  background: rgba(255, 255, 255, .05);
  border: 1px dashed rgba(255, 255, 255, .14);
}

.program-slot.filled {
  border-style: solid;
  background: #7a7471;
  color: #fff;
  font-weight: 700;
}

.program-slot.filled.active {
  outline: 2px solid #9fd3cb;
  outline-offset: 1px;
}

.program-slot.walk { background: #6c7d92; }
.program-slot.right,
.program-slot.left { background: #7d6c92; }
.program-slot.jump { background: #92786c; }
.program-slot.light { background: #8e8959; }
.program-slot.repeat2 { background: #6e8a66; }
.program-slot.call1 { background: #4f7f78; }

.program-actions {
  margin-top: auto;
  display: flex;
  gap: 8px;
  padding-top: 16px;
}

@media (max-width: 980px) {
  .lightbot-layout {
    grid-template-columns: 1fr;
  }

  .sidebar-panel {
    order: -1;
  }

  .program-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .board-header,
  .program-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .program-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .board-status {
    position: static;
    margin: 12px 12px 0;
  }

  .control-bar {
    flex-wrap: wrap;
  }
}
</style>