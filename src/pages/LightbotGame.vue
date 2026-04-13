<template>
  <div class="lightbot-page">
    <div class="lightbot-layout">
      <section class="board-panel">
        <div class="board-header">
          <div class="board-copy-block">
            <p class="board-kicker">Robot Puzzle</p>
            <h1>{{ currentLevel.title }}</h1>
            <p class="board-copy">{{ currentLevel.description }}</p>
            <div class="board-meta">
              <span class="meta-chip">关卡 {{ selectedLevelIndex + 1 }}/{{ levels.length }}</span>
              <span class="meta-chip">{{ currentLevel.skill }}</span>
              <span class="meta-chip">地块 {{ currentLevelStats.tiles }}</span>
              <span class="meta-chip">最高 {{ currentLevelStats.maxHeight }} 层</span>
            </div>
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
          <div class="scene-backdrop"></div>

          <div class="scene-shell">
            <div class="scene-viewport" :style="sceneViewportStyle">
              <div class="iso-scene" :style="sceneStyle">
                <div
                  v-for="cell in sceneCells"
                  :key="cell.key"
                  class="iso-tile"
                  :class="[cell.themeClass, { target: cell.isTarget, lit: cell.isLit, start: cell.isStart, flat: cell.isFlat }]"
                  :style="cell.style"
                >
                  <div class="tile-shadow"></div>
                  <div class="iso-top">
                    <span v-if="cell.height > 1" class="height-badge">{{ cell.height }}</span>
                    <span v-if="cell.isTarget && !cell.isLit" class="lamp lamp-off"></span>
                    <span v-else-if="cell.isLit" class="lamp lamp-on"></span>
                    <span v-if="cell.isStart" class="start-badge">S</span>
                    <span v-if="cell.hasRobot" class="robot-sprite" :style="robotStyle">🤖</span>
                  </div>
                  <div class="iso-left"></div>
                  <div class="iso-right"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="board-overlay right">
            <div class="board-status compact">
              <div class="status-box mini">
                <span>方向</span>
                <strong>{{ directionLabel }}</strong>
              </div>
              <div class="status-box mini">
                <span>点亮</span>
                <strong>{{ litKeys.length }}/{{ targetKeys.length }}</strong>
              </div>
              <div class="status-box mini" :class="statusTone">
                <span>状态</span>
                <strong>{{ statusText }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="control-bar">
          <button class="control-btn" :disabled="isRunning || activeSequence.length === 0" @click="undoLastCommand">↶</button>
          <button class="control-btn" :disabled="isRunning" @click="resetLevelState">⟲</button>
          <button class="control-btn" :disabled="isRunning || activeSequence.length === 0" @click="clearActiveSequence">🗑</button>
          <button class="control-btn play" :disabled="isRunning || mainProgram.length === 0" @click="runProgram">▶</button>

          <div class="speed-box">
            <span>Speed</span>
            <input v-model="speedValue" class="speed-slider" type="range" min="1" max="5" step="1">
          </div>

          <div class="progress-box">
            <span>完成度</span>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>

          <button v-if="canGoNextLevel" class="next-btn" @click="goToNextLevel">下一关</button>
        </div>
      </section>

      <aside class="sidebar-panel">
        <section class="side-card map-card">
          <div class="side-title">Map Brief</div>
          <p class="map-copy">{{ currentLevel.goal }}</p>
          <div class="mission-row">
            <span>起点方向</span>
            <strong>{{ DIRECTION_LABELS[currentLevel.start.dir] }}</strong>
          </div>
          <div class="mission-row">
            <span>Main</span>
            <strong>{{ currentLevel.mainLimit }} 格</strong>
          </div>
          <div class="mission-row" v-if="currentLevel.allowProcedure">
            <span>P1</span>
            <strong>{{ currentLevel.procLimit }} 格</strong>
          </div>
          <div class="mission-row" v-else>
            <span>P1</span>
            <strong>未启用</strong>
          </div>

          <div class="legend-grid">
            <div class="legend-item">
              <span class="legend-swatch route"></span>
              <span>主路地块</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch decor"></span>
              <span>装饰平台</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch lamp"></span>
              <span>目标灯格</span>
            </div>
            <div class="legend-item">
              <span class="legend-swatch start">S</span>
              <span>起点</span>
            </div>
          </div>
        </section>

        <section class="side-card">
          <div class="side-title">Instructions</div>
          <div class="instruction-grid">
            <button
              v-for="command in commandPalette"
              :key="command.id"
              class="instruction-btn"
              :class="command.id"
              :disabled="command.id === 'call1' && !currentLevel.allowProcedure"
              @click="appendCommand(command.id)"
            >
              <span class="instruction-icon">{{ commandGlyph(command.id) }}</span>
              <span class="instruction-label">{{ command.label }}</span>
              <small>{{ command.id === 'repeat2' ? '把紧随其后的动作执行两次' : command.tip }}</small>
            </button>
          </div>
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
                <span class="program-glyph">{{ commandGlyph(command) }}</span>
                <span class="program-name">{{ commandLabel(command) }}</span>
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
                <span class="program-glyph">{{ commandGlyph(command) }}</span>
                <span class="program-name">{{ commandLabel(command) }}</span>
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

const STORAGE_KEY = 'programtools-lightbot-progress-v3'
const TILE_WIDTH = 92
const TILE_HEIGHT = 46
const TILE_DEPTH = 24
const DIRECTIONS = ['north', 'east', 'south', 'west']
const DIRECTION_LABELS = { north: '向上', east: '向右', south: '向下', west: '向左' }
const DIRECTION_VECTORS = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] }
const SPEED_MAP = { 1: 560, 2: 420, 3: 300, 4: 220, 5: 140 }
const COMMANDS = [
  { id: 'walk', label: 'Walk forward', tip: '同高度向前移动一格' },
  { id: 'right', label: 'Turn right', tip: '顺时针转 90 度' },
  { id: 'left', label: 'Turn left', tip: '逆时针转 90 度' },
  { id: 'jump', label: 'Jump', tip: '向前跳上一层或向下跳落' },
  { id: 'light', label: 'Light', tip: '点亮当前蓝灯格' },
  { id: 'repeat2', label: 'Repeat 2', tip: '重复下一条动作两次' },
  { id: 'call1', label: 'Call P1', tip: '调用子程序 P1' }
]

function tile(height = 1, extras = {}) {
  return { h: height, theme: 'stone', ...extras }
}

function lightTile(height = 1, extras = {}) {
  return tile(height, { target: true, ...extras })
}

const levels = [
  {
    id: 'intro-garden',
    title: 'Level 1: Garden Walk',
    description: '第一关先回到最清楚的教学地图，主路线集中，避免一上来就看花。',
    goal: '沿着中间主桥前进，依次点亮两盏蓝灯。',
    skill: 'Walk + Light',
    mainLimit: 8,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [tile(1), tile(1), lightTile(1), tile(1), lightTile(1)]
    ],
    start: { row: 0, col: 0, dir: 'east' },
    demo: { main: ['walk', 'walk', 'light', 'walk', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'jump-spire',
    title: 'Level 2: Jump Spire',
    description: '第二关保留跳跃教学，但把路线收紧成一条清楚的阶梯。',
    goal: '先点亮低处灯，再跳上高台前进，点亮第二盏灯。',
    skill: 'Jump + Turn',
    mainLimit: 10,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [null, null, tile(2, { theme: 'slate' }), lightTile(2, { theme: 'slate' })],
      [tile(1), lightTile(1), tile(1), tile(2)]
    ],
    start: { row: 1, col: 0, dir: 'east' },
    demo: { main: ['walk', 'light', 'walk', 'jump', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'repeat-promenade',
    title: 'Level 3: Repeat Promenade',
    description: '长廊地图更完整了，周围加了辅路和高台，适合练习 Repeat。',
    goal: '把三盏连续蓝灯全部点亮，用 Repeat 缩短开局移动。',
    skill: 'Repeat 2',
    mainLimit: 8,
    procLimit: 0,
    allowProcedure: false,
    board: [
      [null, null, tile(2, { theme: 'slate' }), null, tile(2, { theme: 'slate' }), null, null],
      [tile(1, { theme: 'moss' }), tile(1), tile(1), lightTile(1), lightTile(1), lightTile(1), tile(1, { theme: 'moss' })],
      [null, tile(1, { theme: 'copper' }), null, null, null, tile(1, { theme: 'copper' }), null]
    ],
    start: { row: 1, col: 1, dir: 'east' },
    demo: { main: ['repeat2', 'walk', 'light', 'walk', 'light', 'walk', 'light'], proc1: [] }
  },
  {
    id: 'procedure-court',
    title: 'Level 4: Procedure Court',
    description: '把地图做成了一座中庭，适合用 P1 把循环路线折叠起来。',
    goal: '起点就在目标格上，先点亮起点，再用 P1 绕中庭一圈。',
    skill: 'P1 Function',
    mainLimit: 6,
    procLimit: 4,
    allowProcedure: true,
    board: [
      [null, tile(1, { theme: 'moss' }), tile(1, { theme: 'moss' }), null],
      [tile(1, { theme: 'copper' }), null, null, tile(1, { theme: 'copper' })],
      [null, lightTile(1), lightTile(1), null],
      [null, lightTile(1), lightTile(1), null]
    ],
    start: { row: 2, col: 1, dir: 'east' },
    demo: { main: ['light', 'call1', 'call1', 'call1'], proc1: ['walk', 'light', 'right'] }
  },
  {
    id: 'signal-bridge',
    title: 'Level 5: Signal Bridge',
    description: '最后一关补成了完整桥面，主桥负责过关，两侧塔楼只做视觉地标。',
    goal: '使用短小的 P1 沿主桥推进，依次点亮三盏灯。',
    skill: 'Procedure Route',
    mainLimit: 5,
    procLimit: 2,
    allowProcedure: true,
    board: [
      [null, tile(2, { theme: 'slate' }), null, tile(2, { theme: 'slate' }), null],
      [tile(1), lightTile(1), lightTile(1), lightTile(1), tile(1)],
      [null, tile(2, { theme: 'copper' }), null, tile(2, { theme: 'copper' }), null]
    ],
    start: { row: 1, col: 0, dir: 'east' },
    demo: { main: ['call1', 'call1', 'call1'], proc1: ['walk', 'light'] }
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
const isLevelComplete = computed(() => targetKeys.value.length > 0 && targetKeys.value.every((key) => litKeys.value.includes(key)))
const progressPercent = computed(() => {
  if (!targetKeys.value.length) return 0
  return Math.round((litKeys.value.length / targetKeys.value.length) * 100)
})
const canGoNextLevel = computed(() => isLevelComplete.value && selectedLevelIndex.value < levels.length - 1)
const robotStyle = computed(() => {
  const rotation = { north: '-90deg', east: '0deg', south: '90deg', west: '180deg' }[robot.value.dir] || '0deg'
  return { transform: `translate(-50%, -74%) rotate(${rotation})` }
})
const sceneMetrics = computed(() => {
  const existingCells = []
  currentLevel.value.board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return
      const height = Number(cell.h || 1)
      const elevationDepth = Math.max(height - 1, 0) * TILE_DEPTH
      const x = (colIndex - rowIndex) * TILE_WIDTH / 2
      const y = (colIndex + rowIndex) * TILE_HEIGHT / 2 - elevationDepth
      existingCells.push({ row: rowIndex, col: colIndex, cell, x, y, height, elevationDepth })
    })
  })
  const minX = Math.min(...existingCells.map((item) => item.x))
  const minY = Math.min(...existingCells.map((item) => item.y))
  const maxX = Math.max(...existingCells.map((item) => item.x + TILE_WIDTH))
  const maxY = Math.max(...existingCells.map((item) => item.y + TILE_HEIGHT + item.elevationDepth))
  return {
    cells: existingCells,
    minX,
    minY,
    width: Math.ceil(maxX - minX + 88),
    height: Math.ceil(maxY - minY + 96)
  }
})
const currentLevelStats = computed(() => ({
  tiles: sceneMetrics.value.cells.length,
  maxHeight: Math.max(...sceneMetrics.value.cells.map((item) => item.height))
}))
const sceneScale = computed(() => {
  const widthScale = 980 / sceneMetrics.value.width
  const heightScale = 540 / sceneMetrics.value.height
  return Math.max(1.55, Math.min(3.4, widthScale, heightScale))
})
const sceneStyle = computed(() => ({ width: `${sceneMetrics.value.width}px`, height: `${sceneMetrics.value.height}px` }))
const sceneViewportStyle = computed(() => ({
  width: `${sceneMetrics.value.width}px`,
  height: `${sceneMetrics.value.height}px`,
  transform: `scale(${sceneScale.value})`
}))
const sceneCells = computed(() => sceneMetrics.value.cells.map((item) => ({
  key: keyOf(item.row, item.col),
  themeClass: `theme-${item.cell.theme || 'stone'}`,
  isTarget: Boolean(item.cell.target),
  isLit: litKeys.value.includes(keyOf(item.row, item.col)),
  hasRobot: robot.value.row === item.row && robot.value.col === item.col,
  isStart: currentLevel.value.start.row === item.row && currentLevel.value.start.col === item.col,
  isFlat: item.elevationDepth === 0,
  height: item.height,
  style: {
    left: `${item.x - sceneMetrics.value.minX + 32}px`,
    top: `${item.y - sceneMetrics.value.minY + 34}px`,
    '--tile-depth': `${item.elevationDepth}px`
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

function commandGlyph(command) {
  return {
    walk: '↑',
    right: '↱',
    left: '↰',
    jump: '⤴',
    light: '✦',
    repeat2: '×2',
    call1: 'P1'
  }[command] || '?'
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

function goToNextLevel() {
  if (!canGoNextLevel.value) return
  selectedLevelIndex.value += 1
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
    const tileData = tileAt(robot.value.row, robot.value.col)
    const currentKey = keyOf(robot.value.row, robot.value.col)
    if (!tileData?.target) failRun('No light tile here')
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
    // failRun already updated the status.
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
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.35), transparent 32%),
    linear-gradient(180deg, #dbd9d4 0%, #cfcbc5 100%);
  color: #fff;
}

.lightbot-layout {
  min-height: calc(100vh - 96px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 286px;
  gap: 10px;
}

.board-panel,
.side-card {
  background: linear-gradient(180deg, #6f6966 0%, #625d5a 100%);
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 20px 40px rgba(58, 49, 44, 0.12);
}

.board-panel {
  display: flex;
  flex-direction: column;
  padding: 16px 16px 10px;
}

.board-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.board-copy-block {
  max-width: 620px;
}

.board-kicker {
  margin: 0 0 4px;
  color: #e2dbd4;
  font-size: 11px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.board-header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  color: #fff;
}

.board-copy {
  margin: 8px 0 0;
  color: #efe7df;
  line-height: 1.5;
}

.board-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.meta-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.11);
  color: #fff;
  font-size: 12px;
}

.level-switcher {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 220px;
}

.level-pill {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 11px;
  background: #807977;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: transform .16s ease, background-color .16s ease;
}

.level-pill:hover {
  transform: translateY(-1px);
}

.level-pill.active {
  background: #a6d7ce;
  color: #314541;
}

.level-pill.done:not(.active) {
  background: #8eb08a;
}

.board-stage {
  position: relative;
  flex: 1;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(180deg, #edf1f4 0%, #e3e8ed 100%);
}

.board-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 16%, transparent 84%, rgba(52, 67, 86, 0.08));
}

.scene-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.82), transparent 36%),
    radial-gradient(circle at 50% 78%, rgba(137, 179, 217, 0.18), transparent 30%),
    linear-gradient(30deg, rgba(213, 219, 225, 0.8) 12%, transparent 12.5%, transparent 87%, rgba(213, 219, 225, 0.8) 87.5%, rgba(213, 219, 225, 0.8)),
    linear-gradient(150deg, rgba(213, 219, 225, 0.8) 12%, transparent 12.5%, transparent 87%, rgba(213, 219, 225, 0.8) 87.5%, rgba(213, 219, 225, 0.8));
  background-size: auto, auto, 58px 102px, 58px 102px;
}

.scene-shell {
  position: absolute;
  inset: 0;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 72px 28px 36px;
}

.scene-viewport {
  position: relative;
  transform-origin: center center;
  flex: 0 0 auto;
}

.iso-scene {
  position: relative;
}

.iso-tile {
  position: absolute;
  width: 92px;
  height: 74px;
}

.iso-tile.flat {
  height: 46px;
}

.tile-shadow {
  position: absolute;
  left: 12px;
  top: calc(34px + var(--tile-depth));
  width: 68px;
  height: 22px;
  border-radius: 50%;
  background: rgba(33, 43, 58, 0.12);
  filter: blur(6px);
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
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.iso-left {
  left: 0;
  top: 22px;
  width: 46px;
  height: var(--tile-depth);
  clip-path: polygon(100% 0, 100% 100%, 0 78%, 0 24%);
}

.iso-right {
  right: 0;
  top: 22px;
  width: 46px;
  height: var(--tile-depth);
  clip-path: polygon(0 0, 100% 24%, 100% 78%, 0 100%);
}

.iso-tile.flat .tile-shadow,
.iso-tile.flat .iso-left,
.iso-tile.flat .iso-right {
  display: none;
}

.theme-stone .iso-top { background: #7a7a77; }
.theme-stone .iso-left { background: #666663; }
.theme-stone .iso-right { background: #555553; }

.theme-moss .iso-top { background: #6f7f68; }
.theme-moss .iso-left { background: #5d6d56; }
.theme-moss .iso-right { background: #4e5c48; }

.theme-slate .iso-top { background: #718196; }
.theme-slate .iso-left { background: #5f6f84; }
.theme-slate .iso-right { background: #506075; }

.theme-copper .iso-top { background: #9b7863; }
.theme-copper .iso-left { background: #825f4d; }
.theme-copper .iso-right { background: #714e3f; }

.theme-stone .tile-shadow,
.theme-moss .tile-shadow {
  background: rgba(33, 43, 58, 0.12);
}

.theme-slate .tile-shadow,
.theme-copper .tile-shadow {
  background: rgba(24, 32, 42, 0.19);
}

.iso-tile.target .iso-top {
  box-shadow: inset 0 0 0 2px rgba(92, 149, 255, 0.24), 0 0 0 2px rgba(255, 255, 255, 0.06);
}

.iso-tile.lit .iso-top {
  box-shadow: inset 0 0 0 2px rgba(255, 229, 108, 0.28), 0 0 16px rgba(255, 226, 77, 0.18);
}

.iso-tile.start .iso-top::after {
  content: '';
  position: absolute;
  inset: 8px 18px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.lamp,
.start-badge,
.height-badge,
.robot-sprite {
  position: absolute;
}

.lamp {
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
  box-shadow: 0 0 18px rgba(255, 226, 77, 0.78);
}

.start-badge {
  left: 12px;
  top: 12px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.88);
  color: #546161;
  font-size: 10px;
  font-weight: 800;
}

.height-badge {
  right: 12px;
  top: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(38, 44, 49, 0.44);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.robot-sprite {
  left: 50%;
  top: 50%;
  font-size: 36px;
  filter: drop-shadow(0 8px 8px rgba(0, 0, 0, 0.18));
}

.board-overlay {
  position: absolute;
  z-index: 2;
}

.board-overlay.left {
  left: 14px;
  top: 14px;
}

.board-overlay.right {
  right: 14px;
  top: 14px;
}

.board-status.compact {
  max-width: 260px;
}

.status-box.mini {
  min-width: 78px;
  padding: 8px 9px;
}

.mission-card {
  width: 220px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(84, 76, 72, 0.82);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 24px rgba(39, 29, 24, 0.12);
}

.mission-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #efe7df;
}

.mission-card p {
  margin: 0 0 12px;
  line-height: 1.5;
  color: #f5eee7;
}

.mission-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.mission-row span {
  color: #d7cac1;
}

.board-status {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 340px;
  justify-content: flex-end;
}

.status-box {
  min-width: 104px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(74, 68, 66, 0.86);
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
  background: rgba(92, 128, 89, 0.9);
}

.status-box.danger {
  background: rgba(139, 88, 78, 0.92);
}

.control-bar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 14px;
  background: #6b6562;
}

.control-btn,
.ghost-btn,
.editor-tabs button,
.instruction-btn,
.program-slot.filled,
.next-btn {
  border: 0;
  cursor: pointer;
}

.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #575351;
  color: #fff;
}

.control-btn.play,
.next-btn {
  background: #a6d7ce;
  color: #314541;
  font-weight: 800;
}

.control-btn:disabled,
.ghost-btn:disabled,
.editor-tabs button:disabled,
.instruction-btn:disabled,
.program-slot.filled:disabled,
.next-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.speed-box,
.progress-box {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 700;
}

.speed-slider {
  width: 92px;
  accent-color: #9fd3cb;
}

.progress-track {
  width: 120px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f7da6c 0%, #9fd3cb 100%);
}

.next-btn {
  padding: 9px 14px;
  border-radius: 10px;
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-card {
  padding: 12px;
}

.map-card {
  background: linear-gradient(180deg, #6d6662 0%, #595350 100%);
}

.map-copy {
  margin: 0 0 12px;
  line-height: 1.55;
  color: #f3ece4;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #efe7df;
  font-size: 12px;
}

.legend-swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 800;
}

.legend-swatch.route {
  background: linear-gradient(180deg, #8b8b86, #666663);
}

.legend-swatch.decor {
  background: linear-gradient(180deg, #73849b, #506075);
}

.legend-swatch.lamp {
  background: #1e74ea;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12) inset;
}

.legend-swatch.start {
  background: rgba(255, 255, 255, 0.9);
  color: #4e5d5c;
}

.side-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
}

.instruction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.instruction-btn {
  width: 100%;
  min-height: 92px;
  padding: 12px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 6px;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform .15s ease, background-color .15s ease, border-color .15s ease;
}

.instruction-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.14);
}

.instruction-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(16, 23, 32, 0.2);
  font-size: 18px;
  font-weight: 800;
}

.instruction-label {
  font-weight: 700;
  line-height: 1.15;
}

.instruction-btn.walk .instruction-icon { background: #6c7d92; }
.instruction-btn.right .instruction-icon,
.instruction-btn.left .instruction-icon { background: #7d6c92; }
.instruction-btn.jump .instruction-icon { background: #92786c; }
.instruction-btn.light .instruction-icon { background: #8e8959; }
.instruction-btn.repeat2 .instruction-icon { background: #6e8a66; }
.instruction-btn.call1 .instruction-icon { background: #4f7f78; }

.instruction-btn small {
  color: #d7cdca;
  line-height: 1.35;
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
  background: #595654;
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
  opacity: 0.45;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.14);
}

.program-slot.filled {
  border-style: solid;
  background: #7a7471;
  color: #fff;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 2px;
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

.program-glyph {
  font-size: 16px;
  line-height: 1;
}

.program-name {
  font-size: 10px;
  line-height: 1;
}

.program-actions {
  margin-top: auto;
  display: flex;
  gap: 8px;
  padding-top: 16px;
}

@media (max-width: 1080px) {
  .lightbot-layout {
    grid-template-columns: 1fr;
  }

  .sidebar-panel {
    order: -1;
  }
}

@media (max-width: 760px) {
  .board-header,
  .program-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .level-switcher {
    max-width: none;
    justify-content: flex-start;
  }

  .board-overlay.left,
  .board-overlay.right {
    position: static;
  }

  .board-stage {
    display: flex;
    flex-direction: column;
  }

  .scene-shell {
    position: relative;
    min-height: 360px;
    align-items: flex-start;
    padding-top: 24px;
  }

  .board-status {
    width: auto;
    max-width: none;
    margin: 12px;
  }

  .board-status {
    justify-content: flex-start;
  }

  .instruction-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .program-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>