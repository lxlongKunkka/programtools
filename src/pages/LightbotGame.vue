<template>
  <div class="lightbot-page" :class="`screen-${screen}`">
    <section v-if="screen === 'tutorial'" class="tutorial-screen">
      <div class="tutorial-hero">
        <div class="hero-copy">
          <p class="screen-kicker">Lightbot Lab</p>
          <h1>Learn programming logic by guiding a robot across light tiles.</h1>
          <p class="hero-text">
            先对齐教程入口，再进入选关和正式关卡。当前这版把流程拆成教程页、关卡页和完成页，不再把所有信息堆在一个界面里。
          </p>
          <div class="hero-actions">
            <button class="hero-btn primary" @click="goToLevelSelect">Start Learning</button>
            <button class="hero-btn" @click="openLevelBrief(0)">Jump To Level 1</button>
          </div>
        </div>

        <div class="hero-gallery">
          <article v-for="card in tutorialCards" :key="card.title" class="tutorial-card">
            <div class="tutorial-card-visual" :class="card.theme">
              <div class="mini-board">
                <span v-for="n in 6" :key="n" class="mini-tile"></span>
              </div>
              <div class="mini-program">
                <span v-for="step in card.steps" :key="step" class="mini-chip">{{ step }}</span>
              </div>
            </div>
            <h2>{{ card.title }}</h2>
            <p>{{ card.copy }}</p>
          </article>
        </div>
      </div>

      <div class="tutorial-learn">
        <h2>What you'll learn</h2>
        <ul>
          <li v-for="item in learningPoints" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>

    <section v-else-if="screen === 'select'" class="select-screen">
      <header class="select-header">
        <div>
          <p class="screen-kicker">Choose A Puzzle</p>
          <h1>Level Select</h1>
          <p>先进入关卡简介，再开始编程。</p>
        </div>
        <div class="select-actions">
          <button class="pill-btn" @click="screen = 'tutorial'">Tutorial</button>
          <div class="progress-chip">{{ completedLevelIds.length }}/{{ levels.length }} complete</div>
        </div>
      </header>

      <div class="level-grid">
        <button
          v-for="(level, index) in levels"
          :key="level.id"
          class="level-card"
          :class="{ done: completedLevelIds.includes(level.id), current: index === selectedLevelIndex }"
          @click="openLevelBrief(index)"
        >
          <div class="level-card-head">
            <span class="level-card-index">{{ index + 1 }}</span>
            <span class="level-card-tag">{{ level.skill }}</span>
          </div>
          <strong>{{ level.title }}</strong>
          <p>{{ level.goal }}</p>
          <div class="level-card-foot">
            <span>Main {{ level.mainLimit }}</span>
            <span v-if="level.procLimits.p1">P1 {{ level.procLimits.p1 }}</span>
            <span v-else>No proc</span>
          </div>
        </button>
      </div>
    </section>

    <section v-else-if="screen === 'brief'" class="brief-screen">
      <div class="brief-shell">
        <button class="back-chip" @click="screen = 'select'">← Back</button>
        <div class="brief-copy">
          <p class="screen-kicker">Level Brief</p>
          <h1>{{ currentLevel.title }}</h1>
          <p class="brief-summary">{{ currentLevel.description }}</p>
          <p class="brief-goal">{{ currentLevel.goal }}</p>

          <div class="brief-meta">
            <div>
              <span>Main</span>
              <strong>{{ currentLevel.mainLimit }} slots</strong>
            </div>
            <div>
              <span>P1</span>
              <strong>{{ currentLevel.procLimits.p1 || 0 }} slots</strong>
            </div>
            <div>
              <span>Skill</span>
              <strong>{{ currentLevel.skill }}</strong>
            </div>
          </div>

          <div class="brief-tips">
            <article v-for="tip in currentLevel.tips" :key="tip.title">
              <h2>{{ tip.title }}</h2>
              <p>{{ tip.copy }}</p>
            </article>
          </div>

          <div class="hero-actions">
            <button class="hero-btn primary" @click="startLevel">Enter Puzzle</button>
            <button class="hero-btn" @click="loadDemoAndStart">Load Demo</button>
          </div>
        </div>

        <div class="brief-preview">
          <div class="brief-preview-board">
            <div class="preview-badge">Preview</div>
            <div class="scene-frame preview-frame">
              <div ref="briefSceneHost" class="three-scene-host preview-scene-host"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="play-screen">
      <div class="play-shell">
        <aside class="hud-rail">
          <button class="rail-btn" @click="screen = 'select'">←</button>
          <button class="rail-btn" @click="resetLevel(false)">↺</button>
          <button class="rail-btn muted" @click="screen = 'brief'">?</button>
        </aside>

        <main class="board-stage">
          <header class="board-topbar">
            <div class="board-topbar-copy">
              <p class="screen-kicker">{{ currentLevel.skill }}</p>
              <h1>{{ currentLevel.title }}</h1>
            </div>
            <div class="board-topbar-actions">
              <button class="run-btn" :disabled="isRunning || mainProcedure.length === 0" @click="runCode">
                <img src="/lightbot/run.png" alt="Run">
              </button>
              <button class="reset-btn" :disabled="isRunning" @click="resetLevel(false)">
                <img src="/lightbot/stop.png" alt="Reset">
              </button>
            </div>
          </header>

          <div class="scene-frame">
            <div class="status-float">
              <span>{{ directionLabel }}</span>
              <strong>{{ litKeys.length }}/{{ targetKeys.length }}</strong>
              <em :class="statusTone">{{ statusText }}</em>
            </div>

            <div ref="playSceneHost" class="three-scene-host play-scene-host"></div>
          </div>

          <footer class="command-bar">
            <button
              v-for="operation in operationPalette"
              :key="operation.id"
              class="command-btn"
              :disabled="isRunning || (operation.id === 'p1' && !availableProcedureKeys.includes('p1'))"
              @click="appendOperation(operation.id)"
            >
              <img :src="operationSprite(operation.id)" :alt="operation.label">
            </button>

            <div class="speed-box">
              <span>Speed</span>
              <input v-model="speedValue" type="range" min="1" max="5" step="1">
            </div>
          </footer>

          <div v-if="showFinishPanel" class="finish-panel">
            <div class="finish-card">
              <p class="screen-kicker">Puzzle Complete</p>
              <h2>{{ currentLevel.title }}</h2>
              <p>所有目标格已经点亮。现在可以继续下一关或返回选关。</p>
              <div class="finish-actions">
                <button class="hero-btn primary" @click="goToNextLevel">Next Level</button>
                <button class="hero-btn" @click="resetLevel(false)">Replay</button>
                <button class="hero-btn" @click="screen = 'select'">Level Select</button>
              </div>
            </div>
          </div>
        </main>

        <aside class="program-sidebar">
          <section class="program-panel main-tone" :class="{ active: activeProcedureKey === 'main' }">
            <div class="program-header">
              <span>MAIN</span>
              <button class="tab-btn" :class="{ active: activeProcedureKey === 'main' }" @click="activeProcedureKey = 'main'">Edit</button>
            </div>
            <div class="program-grid big">
              <button
                v-for="(operation, index) in mainProcedure"
                :key="`main-${index}`"
                class="program-slot filled"
                :class="{ active: runningProcedureKey === 'main' && runningOperationIndex === index }"
                @click="removeOperation('main', index)"
              >
                <img :src="operationSprite(operation)" :alt="operationLabel(operation)">
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.mainLimit, mainProcedure.length)"
                :key="`main-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </section>

          <section class="program-panel proc-tone" :class="{ disabled: !availableProcedureKeys.includes('p1'), active: activeProcedureKey === 'p1' }">
            <div class="program-header">
              <span>PROC1</span>
              <button
                class="tab-btn"
                :class="{ active: activeProcedureKey === 'p1' }"
                :disabled="!availableProcedureKeys.includes('p1')"
                @click="activeProcedureKey = 'p1'"
              >
                Edit
              </button>
            </div>
            <div class="program-grid">
              <button
                v-for="(operation, index) in procedures.p1"
                :key="`p1-${index}`"
                class="program-slot filled"
                :class="{ active: runningProcedureKey === 'p1' && runningOperationIndex === index }"
                :disabled="!availableProcedureKeys.includes('p1')"
                @click="removeOperation('p1', index)"
              >
                <img :src="operationSprite(operation)" :alt="operationLabel(operation)">
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.procLimits.p1 || 0, procedures.p1.length)"
                :key="`p1-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </section>

          <section class="program-tools">
            <button class="tool-btn" :disabled="isRunning" @click="undoLastOperation">Undo</button>
            <button class="tool-btn" :disabled="isRunning" @click="clearActiveProcedure">Clear Active</button>
            <button class="tool-btn" :disabled="isRunning" @click="loadDemoProgram">Load Demo</button>
            <button class="tool-btn" :disabled="isRunning" @click="resetLevel(true)">Clear All</button>
          </section>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'

const STORAGE_KEY = 'programtools-lightbot-progress-v5'
const TILE_WIDTH = 96
const TILE_HEIGHT = 48
const TILE_DEPTH = 22
const DIRECTION_ORDER = ['forward', 'right', 'backward', 'left']
const DIRECTION_LABELS = {
  forward: 'Facing east',
  right: 'Facing south',
  backward: 'Facing west',
  left: 'Facing north'
}
const DIRECTION_VECTORS = {
  forward: { x: 1, y: 0 },
  right: { x: 0, y: 1 },
  backward: { x: -1, y: 0 },
  left: { x: 0, y: -1 }
}
const SPEED_MAP = { 1: 560, 2: 420, 3: 300, 4: 200, 5: 130 }
const BLOCK_SIZE = 1
const BLOCK_HEIGHT = 0.5
const BOARD_GAP = 0.04
const MATERIAL_COLORS = {
  topNormal: '#565e68',
  topTarget: '#1e4d6f',
  topLit: '#fffd00',
  side: '#646a71',
  line: '#2e3438',
  player: '#38ff00',
  antenna: '#d8a8ff',
  eye: '#171c22',
  shadow: '#465666'
}
const operationPalette = [
  { id: 'walk', label: 'Walk' },
  { id: 'light', label: 'Light' },
  { id: 'left', label: 'Turn left' },
  { id: 'right', label: 'Turn right' },
  { id: 'jump', label: 'Jump' },
  { id: 'p1', label: 'Call P1' }
]

const tutorialCards = [
  { title: 'Sequencing', copy: '把动作按顺序放入 MAIN，让机器人一步一步执行。', theme: 'mint', steps: ['↑', '💡', '↺'] },
  { title: 'Procedures', copy: '把重复片段放进 PROC1，然后在 MAIN 里调用它。', theme: 'cream', steps: ['P1', '↑', 'P1'] },
  { title: 'Loops By Recursion', copy: 'PROC1 里再调用 P1，就能得到递归式循环。', theme: 'sky', steps: ['P1', '⟳', '💡'] }
]

const learningPoints = ['Sequencing', 'Decomposition', 'Procedures', 'Recursive loops', 'Spatial reasoning']

function makeTile(height = 1, target = false) {
  return { h: height, target }
}

const levels = [
  {
    id: 'level-1',
    title: 'Level 1: First Light',
    skill: 'Sequencing',
    description: '最基础的关卡。先学会沿着平地前进并打开灯。',
    goal: '从起始蓝色方块出发，走到右上角点亮目标格。',
    mainLimit: 6,
    procLimits: {},
    tips: [
      { title: 'Walk', copy: '只有前方存在同高度平台时，Walk 才会生效。' },
      { title: 'Light', copy: '机器人站在目标格上时，Light 才会切换灯的状态。' }
    ],
    board: [
      [makeTile(2), makeTile(2), makeTile(2, true)],
      [makeTile(), makeTile(), makeTile()],
      [makeTile(), makeTile(), null]
    ],
    start: { x: 0, y: 0, dir: 'forward' },
    demo: { main: ['right', 'walk', 'left', 'jump', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-2',
    title: 'Level 2: Step Up',
    skill: 'Jump',
    description: '这一关引入一级高差，用 Jump 上台阶。',
    goal: '沿着折线路径走到尽头，点亮唯一的目标格。',
    mainLimit: 10,
    procLimits: {},
    tips: [
      { title: 'Bend path', copy: '这一关的地图不再是直线，而是参考项目里的折线小岛。' },
      { title: 'Turn', copy: '在拐角处先转向，再继续前进。' }
    ],
    board: [
      [makeTile(), makeTile(), makeTile(1, true)],
      [makeTile(), null, null],
      [makeTile(), makeTile(), makeTile()]
    ],
    start: { x: 2, y: 2, dir: 'backward' },
    demo: { main: ['walk', 'walk', 'left', 'walk', 'walk', 'right', 'walk', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-3',
    title: 'Level 3: Corner Path',
    skill: 'Turns',
    description: '转向系统开始生效，路径变成拐角。',
    goal: '顺着台阶一路跳上去，点亮高处目标格。',
    mainLimit: 10,
    procLimits: {},
    tips: [
      { title: 'Jump up', copy: '这张图来自参考项目的三级关卡，是连续上升的阶梯。' },
      { title: 'Plan ahead', copy: '每次上升一层都要用 Jump，而不是 Walk。' }
    ],
    board: [
      [makeTile(), makeTile(4, true)],
      [makeTile(2), makeTile(3)]
    ],
    start: { x: 0, y: 0, dir: 'right' },
    demo: { main: ['jump', 'left', 'jump', 'left', 'jump', 'light'], p1: [] }
  },
  {
    id: 'level-4',
    title: 'Level 4: Procedure',
    skill: 'Procedures',
    description: 'MAIN 空间不够了，需要把重复动作塞进 PROC1。',
    goal: '沿着参考项目的阶梯平台前进到高处，只点亮终点。',
    mainLimit: 10,
    procLimits: { p1: 4 },
    tips: [
      { title: 'Real map shape', copy: '这一关的地图骨架已经按开源项目的坐标改成阶梯状。' },
      { title: 'Procedure', copy: '现在仍然保留 PROC1，让后续流程能继续对齐参考项目。' }
    ],
    board: [
      [makeTile(), makeTile(2), makeTile(), makeTile(2), makeTile(3, true)],
      [makeTile(), makeTile(2), makeTile(), makeTile(2), makeTile(3)],
      [makeTile(), makeTile(2), makeTile(), makeTile(2), makeTile(3)]
    ],
    start: { x: 0, y: 2, dir: 'forward' },
    demo: { main: ['p1', 'p1', 'left', 'walk', 'walk', 'light'], p1: ['jump', 'jump'] }
  },
  {
    id: 'level-5',
    title: 'Level 5: Bridge Loop',
    skill: 'Procedures + Jump',
    description: '综合关卡，带跳跃和过程调用。',
    goal: '对齐参考项目的三目标地图，依次点亮所有目标格。',
    mainLimit: 8,
    procLimits: { p1: 3 },
    tips: [
      { title: 'Three targets', copy: '这张图改成了参考项目第五关的三目标布局。' },
      { title: 'Timing', copy: '跨层移动时先确认高度，再决定用 Walk 还是 Jump。' }
    ],
    board: [
      [makeTile(1, true), makeTile(), makeTile(3, true)],
      [makeTile(), makeTile(), makeTile(2)],
      [makeTile(), makeTile(2, true), makeTile(2)]
    ],
    start: { x: 0, y: 2, dir: 'right' },
    demo: { main: ['walk', 'p1', 'left', 'light', 'right', 'p1'], p1: ['jump', 'light', 'jump'] }
  },
  {
    id: 'level-6',
    title: 'Level 6: Twin Lamps',
    skill: 'Multi-target pathing',
    description: '开始要求一次路线中依次点亮多个目标格。',
    goal: '沿着外圈平台前进，点亮顶部左右两端的目标格。',
    mainLimit: 12,
    procLimits: {},
    tips: [
      { title: 'Route order', copy: '先走到一端点灯，再沿着同一条边回到另一端。' },
      { title: 'Stay flat', copy: '这一关没有高度变化，重点是路径规划和转向。' }
    ],
    board: [
      [makeTile(2, true), makeTile(2), makeTile(2, true)],
      [makeTile(2), null, makeTile(2)],
      [makeTile(2), makeTile(2), makeTile(2)]
    ],
    start: { x: 0, y: 2, dir: 'forward' },
    demo: { main: ['walk', 'walk', 'left', 'walk', 'walk', 'light', 'left', 'walk', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-7',
    title: 'Level 7: Double Height',
    skill: 'Jump chain',
    description: '把平地转向和连续 Jump 放在同一关里。',
    goal: '先点亮起点灯，再转向爬上高台，点亮最顶端的目标格。',
    mainLimit: 8,
    procLimits: {},
    tips: [
      { title: 'Light first', copy: '起点本身就是目标格，别忘了先点亮。' },
      { title: 'Jump chain', copy: '连续升高的平台只能用 Jump，Walk 无法上台阶。' }
    ],
    board: [
      [makeTile(1), makeTile(2), makeTile(3), makeTile(4, true)],
      [makeTile(1, true), null, null, null]
    ],
    start: { x: 0, y: 1, dir: 'left' },
    demo: { main: ['light', 'walk', 'right', 'jump', 'jump', 'jump', 'light'], p1: [] }
  },
  {
    id: 'level-8',
    title: 'Level 8: Procedure Rail',
    skill: 'Procedure reuse',
    description: '把重复的“前进一步并点灯”抽成过程调用。',
    goal: '沿着一条直线连续点亮三个目标格。',
    mainLimit: 4,
    procLimits: { p1: 2 },
    tips: [
      { title: 'Repeatable chunk', copy: '这关适合把重复动作抽到 PROC1，避免 MAIN 过长。' },
      { title: 'Final lamp', copy: '最后一个目标格上不需要再移动，只需要补一次 Light。' }
    ],
    board: [
      [makeTile(2, true), makeTile(2), makeTile(2, true), makeTile(2), makeTile(2, true)]
    ],
    start: { x: 0, y: 0, dir: 'forward' },
    demo: { main: ['light', 'p1', 'p1'], p1: ['walk', 'light'] }
  },
  {
    id: 'level-9',
    title: 'Level 9: Corner Tower',
    skill: 'Turns + height mix',
    description: '路径先在平地上横向展开，再在拐角跳上高台。',
    goal: '先点亮右下角灯，再转向跳上高台，点亮顶部目标格。',
    mainLimit: 10,
    procLimits: {},
    tips: [
      { title: 'Two phases', copy: '先完成平地部分，再处理拐角后的上台阶动作。' },
      { title: 'Jump at corner', copy: '拐角后的第一步是升高一层，所以这里必须用 Jump。' }
    ],
    board: [
      [makeTile(1), makeTile(1), makeTile(2), makeTile(2, true)],
      [makeTile(1), null, null, makeTile(2)],
      [makeTile(1), makeTile(1), makeTile(1), makeTile(1, true)]
    ],
    start: { x: 0, y: 2, dir: 'forward' },
    demo: { main: ['walk', 'walk', 'walk', 'light', 'left', 'jump', 'walk', 'light'], p1: [] }
  }
]

const VALID_LEVEL_IDS = new Set(levels.map((level) => level.id))

function platformKey(x, y) {
  return `${x},${y}`
}

function cloneBot(start) {
  return { x: start.x, y: start.y, dir: start.dir }
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return Array.isArray(parsed.completedLevelIds)
      ? parsed.completedLevelIds.filter((levelId) => VALID_LEVEL_IDS.has(levelId))
      : []
  } catch {
    return []
  }
}

const screen = ref('tutorial')
const selectedLevelIndex = ref(0)
const activeProcedureKey = ref('main')
const mainProcedure = ref([])
const procedures = ref({ p1: [] })
const completedLevelIds = ref(loadProgress())
const litKeys = ref([])
const bot = ref(cloneBot(levels[0].start))
const isRunning = ref(false)
const runningProcedureKey = ref('')
const runningOperationIndex = ref(-1)
const runNonce = ref(0)
const speedValue = ref(3)
const statusText = ref('Ready')
const statusTone = ref('neutral')
const showFinishPanel = ref(false)
const briefSceneHost = ref(null)
const playSceneHost = ref(null)

let briefSceneController = null
let playSceneController = null

const currentLevel = computed(() => levels[selectedLevelIndex.value])
const availableProcedureKeys = computed(() => Object.keys(currentLevel.value.procLimits || {}))
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
    width: Math.ceil(maxX - minX + 120),
    height: Math.ceil(maxY - minY + 120)
  }
})

const sceneScale = computed(() => {
  const widthScale = 860 / sceneMetrics.value.width
  const heightScale = 480 / sceneMetrics.value.height
  return Math.max(1.15, Math.min(2.3, widthScale, heightScale))
})

const sceneStyle = computed(() => ({
  width: `${sceneMetrics.value.width}px`,
  height: `${sceneMetrics.value.height}px`
}))

const sceneViewportStyle = computed(() => ({
  width: `${sceneMetrics.value.width}px`,
  height: `${sceneMetrics.value.height}px`,
  transform: `scale(${sceneScale.value})`
}))

const sceneStacks = computed(() => sceneMetrics.value.cells.map((item) => {
  const left = item.sceneX - sceneMetrics.value.minX + 58
  const baseTop = item.sceneY - sceneMetrics.value.minY + 56
  const isTarget = Boolean(item.cell.target)
  const isLit = litKeys.value.includes(item.key)

  return {
    key: item.key,
    stackStyle: {
      left: `${left}px`,
      top: `${baseTop}px`,
      '--shadow-top': `${item.cell.h * TILE_DEPTH + 38}px`
    },
    blocks: Array.from({ length: item.cell.h }, (_, layerIndex) => {
      const isTopBlock = layerIndex === item.cell.h - 1
      return {
        blockKey: `${item.key}-${layerIndex}`,
        isStart: isTopBlock && currentLevel.value.start.x === item.x && currentLevel.value.start.y === item.y,
        isTarget: isTopBlock && isTarget,
        isLit: isTopBlock && isLit,
        style: {
          left: '0px',
          top: `${(item.cell.h - layerIndex - 1) * TILE_DEPTH}px`
        }
      }
    })
  }
}))

const robotStyle = computed(() => {
  const cell = sceneMetrics.value.cells.find((item) => item.x === bot.value.x && item.y === bot.value.y)
  if (!cell) {
    return { display: 'none' }
  }

  return {
    left: `${cell.sceneX - sceneMetrics.value.minX + 106}px`,
    top: `${cell.sceneY - sceneMetrics.value.minY + 64 - cell.cell.h * 0}px`
  }
})

watch(completedLevelIds, (value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLevelIds: value }))
}, { deep: true })

function setStatus(text, tone = 'neutral') {
  statusText.value = text
  statusTone.value = tone
}

function operationLabel(operationId) {
  return {
    walk: 'Walk',
    light: 'Light',
    left: 'Left',
    right: 'Right',
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

function emptySlots(limit, used) {
  return Array.from({ length: Math.max(limit - used, 0) }, (_, index) => index)
}

function resetLevel(clearPrograms = false) {
  runNonce.value += 1
  isRunning.value = false
  runningProcedureKey.value = ''
  runningOperationIndex.value = -1
  showFinishPanel.value = false
  litKeys.value = []
  bot.value = cloneBot(currentLevel.value.start)
  if (clearPrograms) {
    mainProcedure.value = []
    procedures.value = { p1: [] }
    activeProcedureKey.value = 'main'
  }
  setStatus(mainProcedure.value.length ? 'Code reset' : 'Program is empty')
}

function goToLevelSelect() {
  screen.value = 'select'
}

function openLevelBrief(index) {
  selectedLevelIndex.value = index
  resetLevel(true)
  screen.value = 'brief'
}

function startLevel() {
  resetLevel(false)
  screen.value = 'play'
}

function loadDemoProgram() {
  mainProcedure.value = [...currentLevel.value.demo.main]
  procedures.value = { p1: [...(currentLevel.value.demo.p1 || [])] }
  setStatus('Demo loaded')
}

function loadDemoAndStart() {
  loadDemoProgram()
  startLevel()
}

function appendOperation(operationId) {
  if (activeProcedureKey.value === 'p1' && !availableProcedureKeys.value.includes('p1')) {
    return
  }

  const isMain = activeProcedureKey.value === 'main'
  const currentList = isMain ? mainProcedure.value : procedures.value.p1
  const limit = isMain ? currentLevel.value.mainLimit : (currentLevel.value.procLimits.p1 || 0)
  if (currentList.length >= limit) {
    setStatus('No empty slot left', 'danger')
    return
  }

  if (isMain) {
    mainProcedure.value = [...mainProcedure.value, operationId]
  } else {
    procedures.value = { ...procedures.value, p1: [...procedures.value.p1, operationId] }
  }

  setStatus(`${operationLabel(operationId)} added`)
}

function removeOperation(procKey, index) {
  if (isRunning.value) return
  if (procKey === 'main') {
    mainProcedure.value = mainProcedure.value.filter((_, itemIndex) => itemIndex !== index)
  } else {
    procedures.value = {
      ...procedures.value,
      p1: procedures.value.p1.filter((_, itemIndex) => itemIndex !== index)
    }
  }
  setStatus('Operation removed')
}

function undoLastOperation() {
  if (isRunning.value) return
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = mainProcedure.value.slice(0, -1)
  } else {
    procedures.value = { ...procedures.value, p1: procedures.value.p1.slice(0, -1) }
  }
  setStatus('Last operation removed')
}

function clearActiveProcedure() {
  if (isRunning.value) return
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = []
  } else {
    procedures.value = { ...procedures.value, p1: [] }
  }
  setStatus('Procedure cleared')
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
  if (!targetKeys.value.length || !targetKeys.value.every((key) => litKeys.value.includes(key))) {
    return false
  }
  if (!completedLevelIds.value.includes(currentLevel.value.id)) {
    completedLevelIds.value = [...completedLevelIds.value, currentLevel.value.id]
  }
  showFinishPanel.value = true
  setStatus('Level complete', 'success')
  return true
}

function waitStep() {
  return new Promise((resolve) => window.setTimeout(resolve, SPEED_MAP[String(speedValue.value)] || SPEED_MAP[3]))
}

async function executeOperation(operationId, nonce, depth) {
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
    if (!toggleCurrentTarget()) {
      setStatus('Light ignored: no target here', 'danger')
    }
    await waitStep()
    markFinished()
    return
  }

  if (operationId === 'p1') {
    await runProcedure('p1', procedures.value.p1, nonce, depth + 1)
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
  if (depth > 8 || nonce !== runNonce.value) return
  for (let index = 0; index < operations.length; index += 1) {
    if (nonce !== runNonce.value) return
    runningProcedureKey.value = procKey
    runningOperationIndex.value = index
    await executeOperation(operations[index], nonce, depth)
    if (markFinished()) return
  }
}

async function runCode() {
  if (!mainProcedure.value.length || isRunning.value) return
  resetLevel(false)
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
  if (selectedLevelIndex.value < levels.length - 1) {
    openLevelBrief(selectedLevelIndex.value + 1)
  } else {
    screen.value = 'select'
  }
}

function createSceneController(host) {
  if (!host) return null

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = false
  host.innerHTML = ''
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100)
  const boardGroup = new THREE.Group()
  const robotGroup = new THREE.Group()

  scene.add(boardGroup)
  scene.add(robotGroup)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.9)
  const keyLight = new THREE.DirectionalLight(0xf7fbff, 1.35)
  const fillLight = new THREE.DirectionalLight(0xd8f0ff, 0.55)
  keyLight.position.set(8, 14, 10)
  fillLight.position.set(-6, 9, -8)
  scene.add(ambientLight, keyLight, fillLight)

  let currentViewSize = 3.55
  let currentMaxHeight = 1

  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 40),
    new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.shadow, transparent: true, opacity: 0.2 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -0.6
  scene.add(shadowPlane)

  const sharedMaterials = {
    topNormal: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topNormal }),
    topTarget: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topTarget }),
    topLit: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topLit }),
    side: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.side }),
    line: new THREE.LineBasicMaterial({ color: MATERIAL_COLORS.line }),
    player: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.player }),
    antenna: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.antenna }),
    eye: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.eye }),
    targetRing: new THREE.MeshBasicMaterial({ color: 0xf3fbff }),
    targetCore: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.topLit })
  }

  const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE)
  const outlineGeometry = new THREE.EdgesGeometry(blockGeometry)

  function resize() {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    const aspect = width / height
    camera.left = -currentViewSize * aspect
    camera.right = currentViewSize * aspect
    camera.top = currentViewSize
    camera.bottom = -currentViewSize
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  }

  function clearGroup(group) {
    group.children.slice().forEach((child) => {
      child.traverse?.((node) => {
        if (!node.geometry) return
        if (node.geometry !== blockGeometry && node.geometry !== outlineGeometry) {
          node.geometry.dispose()
        }
      })
      group.remove(child)
    })
  }

  function buildBoard(level, litKeyList) {
    clearGroup(boardGroup)
    const litSet = new Set(litKeyList)
    const tiles = []

    level.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return
        tiles.push({ x, y, cell })
      })
    })

    if (!tiles.length) {
      render()
      return
    }

    const xs = tiles.map((item) => item.x * (BLOCK_SIZE + BOARD_GAP))
    const zs = tiles.map((item) => item.y * (BLOCK_SIZE + BOARD_GAP))
    const heights = tiles.map((item) => item.cell.h)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2
    const spanX = Math.max(...xs) - Math.min(...xs) + BLOCK_SIZE
    const spanZ = Math.max(...zs) - Math.min(...zs) + BLOCK_SIZE
    currentMaxHeight = Math.max(...heights, 1)
    currentViewSize = Math.max(2.15, Math.min(3.55, Math.max(spanX, spanZ) * 0.56 + currentMaxHeight * 0.18))
    boardGroup.position.set(-centerX, 0, -centerZ)
    shadowPlane.position.x = -centerX
    shadowPlane.position.z = -centerZ
    shadowPlane.scale.setScalar(Math.max(spanX, spanZ) / 2.8)

    tiles.forEach((item) => {
      const tileGroup = new THREE.Group()
      tileGroup.position.set(item.x * (BLOCK_SIZE + BOARD_GAP), 0, item.y * (BLOCK_SIZE + BOARD_GAP))

      for (let layer = 0; layer < item.cell.h; layer += 1) {
        const isTop = layer === item.cell.h - 1
        const isLit = isTop && litSet.has(platformKey(item.x, item.y))
        const topMaterial = isTop
          ? (isLit ? sharedMaterials.topLit : item.cell.target ? sharedMaterials.topTarget : sharedMaterials.topNormal)
          : sharedMaterials.side
        const materials = [sharedMaterials.side, sharedMaterials.side, topMaterial, sharedMaterials.side, sharedMaterials.side, sharedMaterials.side]
        const block = new THREE.Mesh(blockGeometry, materials)
        block.position.y = (layer + 0.5) * BLOCK_HEIGHT
        tileGroup.add(block)

        const outline = new THREE.LineSegments(outlineGeometry, sharedMaterials.line)
        outline.position.copy(block.position)
        tileGroup.add(outline)
      }

      if (item.cell.target) {
        const topY = item.cell.h * BLOCK_HEIGHT + 0.03
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 12, 32), sharedMaterials.targetRing)
        ring.rotation.x = Math.PI / 2
        ring.position.set(0, topY, 0)
        tileGroup.add(ring)

        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24), sharedMaterials.targetCore)
        core.position.set(0, topY, 0)
        tileGroup.add(core)
      }

      boardGroup.add(tileGroup)
    })

    render()
  }

  function updateRobot(level, robotState) {
    clearGroup(robotGroup)
    const cell = level.board[robotState.y]?.[robotState.x]
    if (!cell) {
      render()
      return
    }

    const robotBase = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.44), sharedMaterials.player)
    body.position.y = 0.56
    robotBase.add(body)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.32), sharedMaterials.player)
    head.position.y = 0.96
    robotBase.add(head)

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 12), sharedMaterials.antenna)
    antenna.position.y = 1.18
    robotBase.add(antenna)

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), sharedMaterials.antenna)
    antennaTip.position.y = 1.34
    robotBase.add(antennaTip)

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sharedMaterials.eye)
    const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sharedMaterials.eye)
    eyeLeft.position.set(-0.075, 0.985, 0.172)
    eyeRight.position.set(0.075, 0.985, 0.172)
    robotBase.add(eyeLeft, eyeRight)

    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.03), sharedMaterials.eye)
    facePlate.position.set(0, 0.85, 0.225)
    robotBase.add(facePlate)

    const browPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.04), sharedMaterials.antenna)
    browPlate.position.set(0, 1.055, 0.18)
    robotBase.add(browPlate)

    const frontNose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), sharedMaterials.antenna)
    frontNose.position.set(0, 0.86, 0.26)
    robotBase.add(frontNose)

    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.03), sharedMaterials.eye)
    chestPanel.position.set(0, 0.57, 0.235)
    robotBase.add(chestPanel)

    const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), sharedMaterials.side)
    const footRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), sharedMaterials.side)
    footLeft.position.set(-0.1, 0.14, 0)
    footRight.position.set(0.1, 0.14, 0)
    robotBase.add(footLeft, footRight)

    const dirRotation = {
      forward: Math.PI / 2,
      right: 0,
      backward: -Math.PI / 2,
      left: Math.PI
    }

    robotBase.rotation.y = dirRotation[robotState.dir] || 0
    robotGroup.position.set(
      robotState.x * (BLOCK_SIZE + BOARD_GAP) + boardGroup.position.x,
      cell.h * BLOCK_HEIGHT,
      robotState.y * (BLOCK_SIZE + BOARD_GAP) + boardGroup.position.z
    )
    robotGroup.add(robotBase)
    render()
  }

  function update(level, robotState, litKeyList) {
    buildBoard(level, litKeyList)
    updateRobot(level, robotState)
    resize()

    camera.position.set(5.6, 6.5 + currentMaxHeight * 0.44, 5.6)
    camera.lookAt(0, currentMaxHeight * BLOCK_HEIGHT * 0.58, 0)
    render()
  }

  function render() {
    renderer.render(scene, camera)
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => resize())
    : null

  if (resizeObserver) {
    resizeObserver.observe(host)
  }
  resize()

  return {
    host,
    update,
    resize,
    dispose() {
      resizeObserver?.disconnect()
      renderer.dispose()
      blockGeometry.dispose()
      outlineGeometry.dispose()
      Object.values(sharedMaterials).forEach((material) => material.dispose())
      host.innerHTML = ''
    }
  }
}

function syncSceneControllers() {
  if (screen.value === 'brief' && briefSceneHost.value) {
    if (!briefSceneController) {
      briefSceneController = createSceneController(briefSceneHost.value)
    }
    briefSceneController?.update(currentLevel.value, currentLevel.value.start, [])
  } else if (briefSceneController) {
    briefSceneController.dispose()
    briefSceneController = null
  }

  if (screen.value === 'play' && playSceneHost.value) {
    if (!playSceneController) {
      playSceneController = createSceneController(playSceneHost.value)
    }
    playSceneController?.update(currentLevel.value, bot.value, litKeys.value)
  } else if (playSceneController) {
    playSceneController.dispose()
    playSceneController = null
  }
}

watch(
  () => [screen.value, currentLevel.value.id],
  async () => {
    await nextTick()
    syncSceneControllers()
  },
  { immediate: true }
)

watch(
  () => [currentLevel.value.id, bot.value.x, bot.value.y, bot.value.dir, litKeys.value.join('|')],
  () => {
    playSceneController?.update(currentLevel.value, bot.value, litKeys.value)
    briefSceneController?.update(currentLevel.value, currentLevel.value.start, [])
  }
)

onMounted(async () => {
  await nextTick()
  syncSceneControllers()
})

onBeforeUnmount(() => {
  briefSceneController?.dispose()
  playSceneController?.dispose()
  briefSceneController = null
  playSceneController = null
})

resetLevel(true)
</script>

<style scoped>
.lightbot-page {
  min-height: calc(100vh - 80px);
  padding: 12px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 32%),
    linear-gradient(180deg, #eff4f1 0%, #e1ebf5 100%);
  color: #34414d;
}

.screen-kicker {
  margin: 0 0 8px;
  color: #5ba9d6;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.tutorial-screen,
.select-screen,
.brief-screen,
.play-screen {
  min-height: calc(100vh - 104px);
}

.tutorial-screen {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tutorial-hero {
  display: grid;
  grid-template-columns: minmax(300px, 420px) 1fr;
  gap: 24px;
}

.hero-copy,
.tutorial-card,
.tutorial-learn,
.select-header,
.level-card,
.brief-shell,
.board-stage,
.program-panel,
.program-tools {
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(103, 126, 157, 0.18);
}

.hero-copy {
  padding: 32px;
  background: linear-gradient(180deg, rgba(188, 239, 224, 0.95), rgba(226, 245, 235, 0.95));
}

.hero-copy h1,
.select-header h1,
.brief-copy h1,
.board-topbar h1 {
  margin: 0;
  line-height: 1.04;
}

.hero-copy h1 {
  font-size: clamp(36px, 4.2vw, 58px);
}

.hero-text,
.brief-summary,
.brief-goal,
.level-card p,
.tutorial-card p {
  line-height: 1.6;
  color: #425363;
}

.hero-actions,
.finish-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.hero-btn,
.pill-btn,
.tab-btn,
.tool-btn,
.rail-btn,
.level-card,
.command-btn,
.program-slot.filled,
.back-chip,
.run-btn,
.reset-btn {
  border: 0;
  cursor: pointer;
}

.hero-btn,
.pill-btn,
.back-chip,
.tool-btn {
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: #314454;
  font-weight: 800;
}

.hero-btn.primary,
.run-btn,
.tab-btn.active {
  background: linear-gradient(180deg, #68d16f, #43b653);
  color: #fff;
}

.hero-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.tutorial-card {
  padding: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.tutorial-card-visual {
  min-height: 180px;
  padding: 16px;
  border-radius: 18px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tutorial-card-visual.mint { background: linear-gradient(180deg, #c8efe0, #f0f5d9); }
.tutorial-card-visual.cream { background: linear-gradient(180deg, #fbf0d7, #f7f8ea); }
.tutorial-card-visual.sky { background: linear-gradient(180deg, #dbe6ff, #eef2ff); }

.mini-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mini-tile {
  display: block;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(180deg, #66a9df, #8ecdf0);
  box-shadow: inset 0 -6px 0 rgba(255, 255, 255, 0.35);
}

.mini-program {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-chip {
  min-width: 40px;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  display: grid;
  place-items: center;
  font-weight: 800;
}

.tutorial-learn {
  padding: 28px 32px;
  background: rgba(255, 255, 255, 0.82);
}

.tutorial-learn h2 {
  margin: 0 0 12px;
  font-size: 34px;
  color: #5ba9d6;
}

.tutorial-learn ul {
  margin: 0;
  padding-left: 22px;
  columns: 2;
  line-height: 1.8;
}

.select-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: rgba(255, 255, 255, 0.9);
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-chip {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  background: #edf5cf;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.level-card {
  padding: 22px;
  background: rgba(255, 255, 255, 0.88);
  text-align: left;
}

.level-card.current {
  outline: 3px solid #8dc9ef;
}

.level-card.done {
  background: linear-gradient(180deg, #e5f6de, #ffffff);
}

.level-card-head,
.level-card-foot,
.program-header,
.board-topbar,
.select-header,
.brief-meta,
.status-float,
.program-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.level-card-index {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #66c7dc;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.level-card-tag {
  color: #5e7f98;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.brief-shell {
  display: grid;
  grid-template-columns: minmax(360px, 460px) 1fr;
  gap: 24px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.88);
  position: relative;
}

.back-chip {
  position: absolute;
  top: 18px;
  left: 18px;
}

.brief-copy {
  padding: 60px 10px 10px 10px;
}

.brief-meta {
  margin: 24px 0;
  padding: 18px 20px;
  border-radius: 18px;
  background: #f7f8ea;
}

.brief-meta span {
  display: block;
  margin-bottom: 6px;
  color: #6b7c88;
  font-size: 12px;
  text-transform: uppercase;
}

.brief-tips {
  display: grid;
  gap: 14px;
}

.brief-tips article {
  padding: 16px 18px;
  border-radius: 18px;
  background: #eef6fb;
}

.brief-tips h2,
.tutorial-card h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.brief-preview {
  display: grid;
  place-items: center;
}

.brief-preview-board {
  width: 100%;
  padding: 20px;
  border-radius: 26px;
  background: linear-gradient(180deg, #f9efdc, #fdfbf3);
}

.preview-badge {
  width: fit-content;
  margin: 0 auto 14px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff;
  color: #6d8190;
  font-weight: 800;
}

.play-shell {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) 320px;
  gap: 18px;
}

.hud-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rail-btn {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(180deg, #90d4e8, #5db4d2);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
}

.rail-btn.muted {
  background: rgba(255, 255, 255, 0.86);
  color: #5f7e91;
}

.board-stage {
  position: relative;
  overflow: hidden;
  padding: 22px;
  background: linear-gradient(180deg, #eff5ec, #dff0e7 58%, #e3ebf9);
}

.board-topbar {
  margin-bottom: 14px;
}

.board-topbar-actions {
  display: flex;
  gap: 10px;
}

.run-btn,
.reset-btn {
  width: 74px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
}

.run-btn img,
.reset-btn img,
.command-btn img,
.program-slot.filled img {
  width: 28px;
  height: 28px;
}

.reset-btn {
  background: linear-gradient(180deg, #f9f9f9, #e4e6eb);
}

.scene-frame {
  position: relative;
  min-height: 560px;
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 38%),
    linear-gradient(180deg, rgba(203, 239, 221, 0.8), rgba(242, 248, 250, 0.92));
}

.preview-frame {
  min-height: 440px;
}

.three-scene-host {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.three-scene-host :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}

.scene-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(30deg, rgba(112, 154, 160, 0.12) 12%, transparent 12.5%, transparent 87%, rgba(112, 154, 160, 0.12) 87.5%, rgba(112, 154, 160, 0.12)),
    linear-gradient(150deg, rgba(112, 154, 160, 0.12) 12%, transparent 12.5%, transparent 87%, rgba(112, 154, 160, 0.12) 87.5%, rgba(112, 154, 160, 0.12));
  background-size: 58px 102px;
}

.status-float {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 4;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
}

.status-float strong {
  font-size: 22px;
}

.status-float em {
  font-style: normal;
  font-weight: 700;
  color: #657686;
}

.status-float em.success {
  color: #42a351;
}

.status-float em.danger {
  color: #d6605c;
}

.scene-viewport {
  position: absolute;
  left: 50%;
  top: 58%;
  transform-origin: center center;
}

.preview-viewport {
  top: 63%;
}

.play-viewport {
  top: 59%;
}

.iso-scene {
  position: relative;
  transform: translate(-50%, -50%);
}

.platform-stack,
.platform-block,
.block-top,
.block-left,
.block-right {
  position: absolute;
}

.platform-stack {
  width: 96px;
  height: 96px;
}

.stack-shadow {
  position: absolute;
  left: 18px;
  top: var(--shadow-top);
  width: 64px;
  height: 20px;
  border-radius: 50%;
  background: rgba(45, 56, 69, 0.16);
  filter: blur(8px);
}

.platform-block {
  width: 96px;
  height: 96px;
}

.block-top {
  left: 0;
  top: 0;
  width: 96px;
  height: 48px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: #565e68;
  border: 3px solid #2e3438;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.block-top::after {
  content: '';
  position: absolute;
  inset: 7px 9px 11px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.block-left {
  left: 0;
  top: 24px;
  width: 48px;
  height: 22px;
  clip-path: polygon(100% 0, 100% 100%, 0 78%, 0 24%);
  background: #646a71;
  border-left: 3px solid #2e3438;
  border-bottom: 3px solid #2e3438;
}

.block-right {
  right: 0;
  top: 24px;
  width: 48px;
  height: 22px;
  clip-path: polygon(0 0, 100% 24%, 100% 78%, 0 100%);
  background: #646a71;
  border-right: 3px solid #2e3438;
  border-bottom: 3px solid #2e3438;
}

.block-top.target {
  background: #1e4d6f;
}

.block-top.start:not(.target):not(.lit) {
  background: #1e4d6f;
}

.block-top.lit {
  background: #fffd00;
}

.target-ring,
.target-core {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
}

.target-ring {
  width: 28px;
  height: 28px;
  border: 5px solid rgba(232, 245, 255, 0.92);
}

.target-core {
  width: 16px;
  height: 16px;
  background: rgba(255, 252, 165, 0.96);
  box-shadow: 0 0 18px rgba(255, 235, 59, 0.9);
  animation: lampPulse 1.2s ease-in-out infinite;
}

.robot-layer {
  position: absolute;
  z-index: 5;
  width: 42px;
  height: 62px;
  margin-left: -21px;
  margin-top: -52px;
  transition: left 260ms cubic-bezier(.22, 1, .36, 1), top 260ms cubic-bezier(.22, 1, .36, 1), transform 220ms ease;
}

.robot-body {
  position: relative;
  width: 38px;
  height: 56px;
  margin-left: 2px;
  border-radius: 18px 18px 20px 20px;
  background: #38ff00;
  border: 3px solid #2e3438;
  box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.16), 0 8px 16px rgba(88, 90, 121, 0.12);
  animation: robotBob 1.25s ease-in-out infinite;
}

.robot-eye,
.robot-antenna,
.robot-shadow,
.robot-foot {
  position: absolute;
}

.robot-eye {
  top: 18px;
  width: 6px;
  height: 10px;
  border-radius: 999px;
  background: #171c22;
}

.robot-eye.left { left: 10px; }
.robot-eye.right { right: 11px; }

.robot-antenna {
  left: 50%;
  top: -13px;
  width: 4px;
  height: 16px;
  background: #7b8292;
  transform: translateX(-50%);
}

.robot-antenna::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -6px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 999px;
  background: #d8a8ff;
  border: 2px solid #7b8292;
}

.robot-shadow {
  left: 50%;
  bottom: -14px;
  width: 34px;
  height: 12px;
  margin-left: -17px;
  border-radius: 50%;
  background: rgba(65, 79, 95, 0.18);
  filter: blur(4px);
}

.robot-foot {
  bottom: -10px;
  width: 7px;
  height: 16px;
  border-radius: 999px;
  background: #727790;
}

.robot-foot.left { left: 10px; }
.robot-foot.right { right: 10px; }

.robot-layer.dir-right { transform: rotate(90deg); }
.robot-layer.dir-backward { transform: rotate(180deg); }
.robot-layer.dir-left { transform: rotate(-90deg); }

.command-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.command-btn {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: linear-gradient(180deg, #eef2f6, #c5ced7);
  box-shadow: inset 0 0 0 3px #58646f, 0 8px 16px rgba(79, 94, 111, 0.14);
  display: grid;
  place-items: center;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.command-btn:hover:not(:disabled),
.program-slot.filled:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 3px #58646f, 0 12px 18px rgba(79, 94, 111, 0.18);
}

.command-btn:disabled,
.run-btn:disabled,
.reset-btn:disabled,
.tool-btn:disabled,
.tab-btn:disabled,
.program-slot.filled:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.speed-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-weight: 700;
}

.speed-box input {
  width: 110px;
  accent-color: #60c883;
}

.program-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.program-panel {
  padding: 16px;
}

.program-panel.main-tone {
  background: linear-gradient(180deg, #f9eea3, #f2e37d);
}

.program-panel.proc-tone {
  background: linear-gradient(180deg, #d5d7dd, #bcc2cb);
}

.program-panel.disabled {
  opacity: 0.55;
}

.program-panel.active {
  box-shadow: 0 24px 60px rgba(103, 126, 157, 0.18), inset 0 0 0 3px rgba(88, 200, 124, 0.45);
}

.program-header span {
  font-weight: 900;
  letter-spacing: 0.08em;
}

.tab-btn {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 800;
}

.program-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.program-grid.big {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.program-slot {
  min-height: 62px;
  border-radius: 14px;
  border: 2px dashed rgba(58, 71, 84, 0.3);
  background: rgba(255, 255, 255, 0.26);
}

.program-slot.filled {
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.86);
  border-style: solid;
  box-shadow: inset 0 0 0 3px #58646f;
}

.program-slot.filled.active {
  outline: 3px solid #4ec96b;
}

.program-tools {
  padding: 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.84);
  flex-wrap: wrap;
}

.tool-btn {
  flex: 1 1 44%;
}

.finish-panel {
  position: absolute;
  inset: 0;
  z-index: 7;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
}

.finish-card {
  width: min(520px, calc(100% - 40px));
  padding: 30px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  text-align: center;
  box-shadow: 0 24px 80px rgba(86, 118, 145, 0.26);
}

.finish-card h2 {
  margin: 0;
  font-size: 34px;
}

@keyframes robotBob {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes lampPulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.92;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.08);
    opacity: 1;
  }
}

@media (max-width: 1180px) {
  .tutorial-hero,
  .brief-shell,
  .play-shell {
    grid-template-columns: 1fr;
  }

  .hud-rail {
    flex-direction: row;
  }

  .level-grid,
  .hero-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .lightbot-page {
    padding: 8px;
  }

  .hero-copy,
  .select-header,
  .brief-shell,
  .board-stage,
  .program-panel,
  .program-tools,
  .tutorial-learn {
    border-radius: 18px;
  }

  .hero-gallery,
  .level-grid,
  .program-grid,
  .program-grid.big {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .select-header,
  .board-topbar,
  .status-float,
  .brief-meta,
  .program-tools {
    flex-direction: column;
    align-items: flex-start;
  }

  .scene-frame {
    min-height: 420px;
  }

  .tutorial-learn ul {
    columns: 1;
  }

  .speed-box {
    width: 100%;
    margin-left: 0;
  }
}
</style>