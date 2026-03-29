<template>
  <div class="pony-page">
    <section v-if="currentLevel" class="marmot-shell">
      <header class="game-hud">
        <div class="hud-side left">
          <div class="resource-pill coin-pill">
            <span class="resource-icon coin">●</span>
            <strong>{{ profile.coins }}</strong>
          </div>
          <div class="resource-stack">
            <div class="resource-pill energy-pill">
              <span class="resource-icon energy">♥</span>
              <strong>{{ profile.energy }}</strong>
              <button class="mini-plus" type="button" :disabled="storeLoading" @click="buyEnergyPack">+</button>
            </div>
            <span class="recovery-text">{{ config.energyRecoveryMinutes }} 分钟回 1 点</span>
          </div>
        </div>

        <div class="hud-center">
          <div class="stage-title">第{{ currentLevel.levelId }}关</div>
          <div class="life-row" aria-label="剩余机会">
            <span v-for="index in 3" :key="`life-${index}`" class="life-heart" :class="{ lost: index > currentMistakesLeft }">♥</span>
          </div>
          <div class="remaining-pill">
            <span class="remaining-icon">🐹</span>
            <span>剩余土拨鼠: {{ remainingMarmots }}</span>
          </div>
        </div>

        <div class="hud-side right">
          <button class="mini-ghost" type="button" @click="selectLevelById(selectedLevelId)">关卡</button>
          <button class="mini-ghost" type="button" @click="showToastMessage(`已通关 ${completedCount} / ${levels.length}`)">进度</button>
        </div>
      </header>

      <section class="rules-strip">
        <article class="rule-chip">
          <strong>每种颜色 1 只土拨鼠</strong>
        </article>
        <article class="rule-chip">
          <strong>每行每列仅 1 只</strong>
        </article>
        <article class="rule-chip">
          <strong>土拨鼠不能相邻</strong>
        </article>
      </section>

      <section v-if="currentLevel.tutorialTips?.length && !isScriptedTutorialActive" class="tutorial-panel">
        <div class="tutorial-head">
          <strong>{{ currentLevel.tutorialTitle || '教学提示' }}</strong>
          <span>前 3 关建议先学会打叉</span>
        </div>
        <ol class="tutorial-list">
          <li v-for="(tip, index) in currentLevel.tutorialTips" :key="`tip-${index}`">{{ tip }}</li>
        </ol>
      </section>

      <section class="level-strip">
        <button
          v-for="level in levels"
          :key="level.levelId"
          class="level-pill"
          :class="{
            active: Number(level.levelId) === Number(selectedLevelId),
            locked: !level.unlocked,
            done: level.completed
          }"
          @click="selectLevel(level)"
        >
          <span>Lv{{ level.levelId }}</span>
        </button>
      </section>

      <div v-if="message" class="message-bar" :class="messageTone">{{ message }}</div>

      <section v-if="currentTutorialStep" class="tutorial-stage" :class="`kind-${currentTutorialStep.kind || 'tip'}`">
        <div class="tutorial-bubble">
          <span v-if="currentTutorialStep.badge" class="tutorial-badge">{{ currentTutorialStep.badge }}</span>
          <strong v-if="currentTutorialStep.title" class="tutorial-title">{{ currentTutorialStep.title }}</strong>
          <p class="tutorial-copy">{{ currentTutorialStep.text }}</p>
          <div class="tutorial-actions">
            <button
              v-if="currentTutorialStep.ctaText"
              class="tutorial-cta"
              type="button"
              @click="advanceTutorialStep"
            >
              {{ currentTutorialStep.ctaText }}
            </button>
            <button v-else class="tutorial-skip" type="button" @click="skipTutorial">跳过教学</button>
          </div>
        </div>
      </section>

      <section class="board-panel">
        <div class="board-meta">
          <div class="meta-card">
            <span>奖励</span>
            <strong>{{ currentLevel.rewardCoins }} 金币</strong>
          </div>
          <div class="meta-card">
            <span>模式</span>
            <strong>{{ modeLabel }}</strong>
          </div>
          <div class="meta-card">
            <span>用时</span>
            <strong>{{ formatTime(elapsedSeconds) }}</strong>
          </div>
        </div>

        <div class="board-shell">
          <div class="board" :class="{ guided: isScriptedTutorialActive }" :style="boardStyle" @contextmenu.prevent>
            <template v-for="(row, rowIndex) in currentLevel.regionBoard" :key="`row-${rowIndex}`">
              <button
                v-for="(regionId, colIndex) in row"
                :key="`${rowIndex}-${colIndex}`"
                class="cell"
                :class="cellClass(rowIndex, colIndex)"
                :style="{ '--region-color': regionColor(regionId) }"
                @click="handleCellClick(rowIndex, colIndex)"
              >
                <span v-if="isPlaced(rowIndex, colIndex)" class="marmot-token">
                  <span class="marmot-token-face">🐹</span>
                </span>
                <span v-else-if="isBlocked(rowIndex, colIndex)" class="mark-icon">×</span>
                <span v-if="tutorialFocusKey === cellKeyAt(rowIndex, colIndex) && currentTutorialStep?.showTap" class="tutorial-hand">👆</span>
              </button>
            </template>
          </div>

          <div v-if="!session" class="overlay-card subtle">
            <strong>开始一局会消耗 {{ config.energyCostPerGame }} 点体力</strong>
            <p>本局共有 3 次失误机会。错误放置土拨鼠会扣机会，打叉标记不会。</p>
          </div>

          <div v-else-if="session.status === 'failed'" class="overlay-card danger">
            <strong>这局翻车了</strong>
            <p>机会已经用完，点击重开继续挑战当前关。</p>
            <button class="primary-btn" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">重新开始</button>
          </div>

          <div v-else-if="session.status === 'completed'" class="overlay-card success">
            <strong>通关成功</strong>
            <p>本关{{ lastRewardCoins > 0 ? `获得 ${lastRewardCoins} 金币` : '奖励已经领取过' }}，用时 {{ formatTime(elapsedSeconds) }}。</p>
            <div class="overlay-actions">
              <button class="primary-btn" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">重玩本关</button>
              <button class="soft-btn" :disabled="!nextUnlockedLevel" @click="selectLevelById(nextUnlockedLevel)">下一关</button>
            </div>
          </div>
        </div>
      </section>

      <section class="economy-panel">
        <div class="economy-row">
          <span>提示价格</span>
          <strong>{{ config.hintCost }} 金币</strong>
        </div>
        <div class="economy-row">
          <span>体力包</span>
          <strong>{{ config.energyPackCost }} 金币换 {{ config.energyPackAmount }} 体力</strong>
        </div>
        <div class="economy-row">
          <span>金币来源</span>
          <strong>Quiz +{{ config.quizCorrectCoins }} / 课程题 +{{ config.courseProblemCoins }} / 完章 +{{ config.courseChapterCoins }}</strong>
        </div>
      </section>

      <footer class="tool-dock">
        <button class="dock-btn soft erase" type="button" @click="mode = 'erase'">
          <span class="dock-icon">⌫</span>
          <span>清除</span>
        </button>
        <button class="dock-btn pony" :class="{ active: mode === 'pony' }" type="button" @click="mode = 'pony'">
          <span class="dock-icon">🐹</span>
          <span>放土拨鼠</span>
        </button>
        <button class="dock-btn mark" :class="{ active: mode === 'mark' }" type="button" @click="mode = 'mark'">
          <span class="dock-icon">×</span>
          <span>打叉</span>
        </button>
        <button class="dock-btn hint" type="button" :disabled="!session || session.status !== 'active' || hintLoading" @click="buyHint">
          <span class="dock-icon">💡</span>
          <span>{{ hintLoading ? '提示中' : '提示' }}</span>
        </button>
        <button class="dock-btn accent start" type="button" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">
          <span class="dock-icon">▶</span>
          <span>{{ session && session.status === 'active' ? '重开' : '开始' }}</span>
        </button>
      </footer>
    </section>

    <section v-else class="loading-shell">
      <div class="loading-card">土拨鼠关卡加载中...</div>
    </section>
  </div>
</template>

<script>
import request from '../utils/request'

const defaultConfig = {
  energyCostPerGame: 15,
  energyRecoveryMinutes: 5,
  energyPackAmount: 15,
  energyPackCost: 40,
  hintCost: 25,
  quizCorrectCoins: 5,
  courseProblemCoins: 8,
  courseChapterCoins: 20
}

function cellKey(row, col) {
  return `${row},${col}`
}

const REGION_COLOR_PALETTE = [
  '#d86a9a',
  '#94d97b',
  '#76c5f4',
  '#f1c84c',
  '#9f87df',
  '#ffb86b',
  '#67d6c1',
  '#f58e84'
]

const TUTORIAL_STORAGE_KEY = 'programtools-pony-tutorial-v2'

const LEVEL_ONE_SCRIPT = [
  {
    kind: 'modal',
    badge: '教学 1/5',
    title: '先看规则',
    text: '开局先送你一只已经找到的土拨鼠。第一关不该靠猜，先学会围绕它做排除。',
    ctaText: '明白了',
    highlightKeys: ['0,2']
  },
  {
    kind: 'tip',
    badge: '教学 2/5',
    text: '先看这只已经找到的土拨鼠。它所在的同一行、同一列，其他格子都不可能再放。',
    autoMode: 'mark',
    highlightKeys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'],
    requirement: { type: 'blockedAll', keys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'] }
  },
  {
    kind: 'tip',
    badge: '教学 3/5',
    text: '还不够，土拨鼠四周也不能挨着。把高亮的相邻格也打叉。',
    autoMode: 'mark',
    highlightKeys: ['1,1', '1,3'],
    requirement: { type: 'blockedAll', keys: ['1,1', '1,3'] }
  },
  {
    kind: 'success',
    badge: '做得好',
    text: '这样一来，左侧粉色区域就只剩一个合理位置了。现在把它点亮。',
    autoMode: 'pony',
    focusKeys: ['1,0'],
    highlightKeys: ['1,0'],
    requirement: { type: 'placedAll', keys: ['1,0'] },
    showTap: true
  },
  {
    kind: 'modal',
    badge: '继续挑战',
    title: '你已经会基础排除了',
    text: '记住节奏：先排除，再落子。后面几关继续按这个思路推就行。',
    ctaText: '继续挑战'
  }
]

const LEVEL_TWO_SCRIPT = [
  {
    kind: 'modal',
    badge: '教学 1/5',
    title: '先占一行一列',
    text: '这一关重点学会“放下一只后，整行整列都能排除”。',
    ctaText: '开始'
  },
  {
    kind: 'tip',
    badge: '教学 2/5',
    text: '先从这只已知土拨鼠开始。把同一行、同一列里不能放的位置先打叉。',
    autoMode: 'mark',
    highlightKeys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'],
    requirement: { type: 'blockedAll', keys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'] }
  },
  {
    kind: 'success',
    badge: '不错',
    text: '再补上它四周相邻不能放的位置，这样候选会迅速缩小。',
    autoMode: 'mark',
    highlightKeys: ['1,1', '1,3'],
    requirement: { type: 'blockedAll', keys: ['1,1', '1,3'] }
  },
  {
    kind: 'tip',
    badge: '教学 4/5',
    text: '现在下方粉色区域只剩一个合理位置了，点亮它。',
    autoMode: 'pony',
    focusKeys: ['1,0'],
    highlightKeys: ['1,0'],
    requirement: { type: 'placedAll', keys: ['1,0'] },
    showTap: true
  },
  {
    kind: 'modal',
    badge: '会了',
    title: '行列排除已经上手',
    text: '后面看到确定位置时，就先拉整行整列，再考虑相邻限制。',
    ctaText: '继续挑战'
  }
]

const LEVEL_THREE_SCRIPT = [
  {
    kind: 'modal',
    badge: '教学 1/5',
    title: '先缩到唯一候选',
    text: '这一关练“先打叉，把一个颜色块收缩到只剩一个格”。',
    ctaText: '知道了'
  },
  {
    kind: 'tip',
    badge: '教学 2/5',
    text: '先围绕这只已知土拨鼠做排除，把同一行、同一列里不能放的位置打叉。',
    autoMode: 'mark',
    highlightKeys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'],
    requirement: { type: 'blockedAll', keys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'] }
  },
  {
    kind: 'success',
    badge: '很好',
    text: '再补上它四周相邻不能放的位置。',
    autoMode: 'mark',
    highlightKeys: ['1,1', '1,3'],
    requirement: { type: 'blockedAll', keys: ['1,1', '1,3'] }
  },
  {
    kind: 'tip',
    badge: '教学 4/5',
    text: '现在左侧大色块已经只剩一个安全格了，点它落子。',
    autoMode: 'pony',
    focusKeys: ['1,0'],
    highlightKeys: ['1,0'],
    requirement: { type: 'placedAll', keys: ['1,0'] },
    showTap: true
  },
  {
    kind: 'modal',
    badge: '掌握了',
    title: '你已经会“先排除再确认”',
    text: '从这一关开始，看到颜色块缩成唯一候选时，就可以果断放土拨鼠。',
    ctaText: '继续挑战'
  }
]

const TUTORIAL_SCRIPTS = {
  1: LEVEL_ONE_SCRIPT,
  2: LEVEL_TWO_SCRIPT,
  3: LEVEL_THREE_SCRIPT,
}

export default {
  name: 'PonyPuzzleGame',
  inject: ['showToastMessage'],
  data() {
    return {
      loading: true,
      startLoading: false,
      hintLoading: false,
      storeLoading: false,
      levels: [],
      selectedLevelId: 1,
      activeLevel: null,
      profile: {
        coins: 0,
        energy: 0,
        energyMax: 120,
        unlockedLevel: 1,
        completedLevels: []
      },
      config: defaultConfig,
      session: null,
      mode: 'pony',
      placedKeys: [],
      blockedKeys: [],
      elapsedSeconds: 0,
      timerHandle: null,
      message: '',
      messageTone: 'info',
      flashKey: '',
      hintKey: '',
      lastRewardCoins: 0,
      lockedPlacedKeys: [],
      tutorialSeenLevelIds: [],
      tutorialState: {
        activeLevelId: null,
        stepIndex: -1
      }
    }
  },
  computed: {
    currentLevel() {
      return this.activeLevel || this.levels.find((level) => Number(level.levelId) === Number(this.selectedLevelId)) || null
    },
    currentMistakesLeft() {
      return Number(this.session?.remainingMistakes || 3)
    },
    completedCount() {
      return this.levels.filter((level) => level.completed).length
    },
    remainingMarmots() {
      return Math.max(Number(this.currentLevel?.regionCount || 0) - this.placedKeys.length, 0)
    },
    modeLabel() {
      if (this.mode === 'mark') return '打叉排除'
      if (this.mode === 'erase') return '清除格子'
      return '放土拨鼠'
    },
    nextUnlockedLevel() {
      const next = this.levels.find((level) => Number(level.levelId) === Number(this.currentLevel?.levelId || 0) + 1)
      return next?.unlocked ? next.levelId : null
    },
    boardStyle() {
      const size = Number(this.currentLevel?.size || 5)
      return {
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`
      }
    },
    currentTutorialSteps() {
      return this.getTutorialScript(this.tutorialState.activeLevelId)
    },
    currentTutorialStep() {
      if (this.tutorialState.stepIndex < 0) return null
      return this.currentTutorialSteps[this.tutorialState.stepIndex] || null
    },
    isScriptedTutorialActive() {
      return !!this.currentTutorialStep
    },
    tutorialHighlightKeys() {
      return Array.isArray(this.currentTutorialStep?.highlightKeys) ? this.currentTutorialStep.highlightKeys : []
    },
    tutorialFocusKey() {
      return Array.isArray(this.currentTutorialStep?.focusKeys) ? this.currentTutorialStep.focusKeys[0] || '' : ''
    }
  },
  mounted() {
    this.loadTutorialProgress()
    this.loadGame()
  },
  beforeUnmount() {
    this.stopTimer()
  },
  methods: {
    async loadGame() {
      this.loading = true
      try {
        const data = await request('/api/pony/levels')
        this.levels = Array.isArray(data?.items) ? data.items : []
        this.profile = data?.profile || this.profile
        this.config = { ...defaultConfig, ...(data?.config || {}) }
        if (!this.levels.find((level) => Number(level.levelId) === Number(this.selectedLevelId))) {
          this.selectedLevelId = this.levels[0]?.levelId || 1
        }
      } catch (error) {
        this.showToastMessage(`加载土拨鼠游戏失败: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    selectLevel(level) {
      if (
        this.session?.status === 'active' &&
        Number(this.currentLevel?.levelId || 0) !== Number(level?.levelId || 0)
      ) {
        this.showToastMessage('当前对局进行中，请先完成或重新开始本关')
        return
      }
      this.selectedLevelId = Number(level?.levelId || 1)
      this.activeLevel = null
      this.resetBoardState()
      this.clearTutorialState()
      this.message = ''
    },
    selectLevelById(levelId) {
      const target = this.levels.find((level) => Number(level.levelId) === Number(levelId))
      if (target) this.selectLevel(target)
    },
    resetBoardState(clearSession = true) {
      this.placedKeys = []
      this.blockedKeys = []
      this.hintKey = ''
      this.flashKey = ''
      this.lastRewardCoins = 0
      this.lockedPlacedKeys = []
      this.stopTimer()
      this.elapsedSeconds = 0
      if (clearSession) this.session = null
      if (clearSession) this.clearTutorialState()
    },
    cellKeyAt(row, col) {
      return cellKey(row, col)
    },
    getTutorialScript(levelId) {
      return TUTORIAL_SCRIPTS[Number(levelId)] || []
    },
    applyLevelPresetState(level = null) {
      const presetCells = Array.isArray(level?.presetPlacedCells) ? level.presetPlacedCells : []
      const presetKeys = presetCells.map((cell) => cellKey(Number(cell.row), Number(cell.col)))
      this.placedKeys = [...presetKeys]
      this.lockedPlacedKeys = [...presetKeys]
    },
    loadTutorialProgress() {
      try {
        const raw = window.localStorage.getItem(TUTORIAL_STORAGE_KEY)
        const parsed = JSON.parse(raw || '[]')
        this.tutorialSeenLevelIds = Array.isArray(parsed) ? parsed.map(Number) : []
      } catch {
        this.tutorialSeenLevelIds = []
      }
    },
    saveTutorialProgress() {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(this.tutorialSeenLevelIds))
    },
    hasSeenTutorial(levelId) {
      return this.tutorialSeenLevelIds.includes(Number(levelId))
    },
    markTutorialSeen(levelId) {
      const safeLevelId = Number(levelId)
      if (!safeLevelId || this.tutorialSeenLevelIds.includes(safeLevelId)) return
      this.tutorialSeenLevelIds = [...this.tutorialSeenLevelIds, safeLevelId]
      this.saveTutorialProgress()
    },
    clearTutorialState() {
      this.tutorialState = {
        activeLevelId: null,
        stepIndex: -1
      }
    },
    activateTutorial(levelId) {
      const script = this.getTutorialScript(levelId)
      if (!script.length || this.hasSeenTutorial(levelId)) {
        this.clearTutorialState()
        return
      }
      this.tutorialState = {
        activeLevelId: Number(levelId),
        stepIndex: 0
      }
      this.applyTutorialStepEffects()
    },
    applyTutorialStepEffects() {
      if (!this.currentTutorialStep) return
      if (this.currentTutorialStep.autoMode) {
        this.mode = this.currentTutorialStep.autoMode
      }
      if (this.currentTutorialStep.kind !== 'modal') {
        this.message = this.currentTutorialStep.text
        this.messageTone = this.currentTutorialStep.kind === 'success' ? 'success' : 'info'
      }
    },
    advanceTutorialStep() {
      if (!this.currentTutorialStep) return
      if (this.tutorialState.stepIndex >= this.currentTutorialSteps.length - 1) {
        this.markTutorialSeen(this.tutorialState.activeLevelId)
        this.clearTutorialState()
        this.message = '继续按“先排除，再落子”的节奏完成本关。'
        this.messageTone = 'info'
        return
      }
      this.tutorialState.stepIndex += 1
      this.applyTutorialStepEffects()
      this.syncTutorialProgress()
    },
    skipTutorial() {
      this.markTutorialSeen(this.tutorialState.activeLevelId)
      this.clearTutorialState()
      this.message = '已跳过教学提示，你可以自由完成本关。'
      this.messageTone = 'info'
    },
    isTutorialRequirementSatisfied(requirement) {
      const keys = Array.isArray(requirement?.keys) ? requirement.keys : []
      if (!keys.length) return false
      if (requirement.type === 'placedAll') {
        return keys.every((key) => this.placedKeys.includes(key))
      }
      if (requirement.type === 'blockedAll') {
        return keys.every((key) => this.blockedKeys.includes(key))
      }
      return false
    },
    syncTutorialProgress() {
      let nextStep = this.currentTutorialStep
      while (nextStep?.requirement && this.isTutorialRequirementSatisfied(nextStep.requirement)) {
        if (this.tutorialState.stepIndex >= this.currentTutorialSteps.length - 1) {
          break
        }
        this.tutorialState.stepIndex += 1
        nextStep = this.currentTutorialStep
        this.applyTutorialStepEffects()
      }
    },
    isTutorialActionRestricted(key) {
      if (!this.currentTutorialStep?.requirement) return false
      if (!this.tutorialHighlightKeys.length) return false
      return !this.tutorialHighlightKeys.includes(key)
    },
    isLockedPlacedKey(key) {
      return this.lockedPlacedKeys.includes(key)
    },
    startTimer() {
      this.stopTimer()
      this.timerHandle = window.setInterval(() => {
        this.elapsedSeconds += 1
      }, 1000)
    },
    stopTimer() {
      if (this.timerHandle) {
        window.clearInterval(this.timerHandle)
        this.timerHandle = null
      }
    },
    async startLevel(levelId) {
      this.startLoading = true
      try {
        const data = await request.post('/api/pony/sessions/start', { levelId })
        this.activeLevel = data?.level || this.currentLevel
        this.session = data?.session || null
        this.profile = data?.profile || this.profile
        this.config = { ...defaultConfig, ...(data?.config || {}) }
        this.selectedLevelId = Number(levelId)
        this.placedKeys = []
        this.blockedKeys = []
        this.hintKey = ''
        this.flashKey = ''
        this.lastRewardCoins = 0
        this.lockedPlacedKeys = []
        this.elapsedSeconds = 0
        this.applyLevelPresetState(data?.level || this.currentLevel)
        this.message = Array.isArray(this.currentLevel?.tutorialTips) && this.currentLevel.tutorialTips.length
          ? '教学关先别急着落子，先切到“打叉”模式做排除。'
          : '本局已开始，先看颜色块和行列关系，再放土拨鼠。'
        this.messageTone = 'info'
        this.startTimer()
        this.activateTutorial(levelId)
      } catch (error) {
        this.showToastMessage(`开始游戏失败: ${error.message}`)
      } finally {
        this.startLoading = false
      }
    },
    isPlaced(row, col) {
      return this.placedKeys.includes(cellKey(row, col))
    },
    isBlocked(row, col) {
      return this.blockedKeys.includes(cellKey(row, col))
    },
    cellClass(row, col) {
      const key = cellKey(row, col)
      return {
        placed: this.placedKeys.includes(key),
        blocked: this.blockedKeys.includes(key),
        flash: this.flashKey === key,
        hinted: this.hintKey === key,
        'tutorial-highlight': this.tutorialHighlightKeys.includes(key),
        'tutorial-focus': this.tutorialFocusKey === key,
        'tutorial-muted': this.isScriptedTutorialActive && this.tutorialHighlightKeys.length > 0 && !this.tutorialHighlightKeys.includes(key)
      }
    },
    async handleCellClick(row, col) {
      if (!this.session || this.session.status !== 'active') {
        this.showToastMessage('请先开始本关')
        return
      }

      const key = cellKey(row, col)
      if (this.isTutorialActionRestricted(key)) {
        this.showToastMessage('先按当前高亮的格子操作')
        return
      }

      if (this.mode === 'erase') {
        if (this.isLockedPlacedKey(key)) {
          this.showToastMessage('教学给出的这只土拨鼠先不要清除')
          return
        }
        this.placedKeys = this.placedKeys.filter((item) => item !== key)
        this.blockedKeys = this.blockedKeys.filter((item) => item !== key)
        if (this.hintKey === key) this.hintKey = ''
        this.syncTutorialProgress()
        return
      }

      if (this.mode === 'mark') {
        if (this.placedKeys.includes(key)) {
          if (this.isLockedPlacedKey(key)) {
            this.showToastMessage('围绕这只已知土拨鼠做排除，不用给它打叉')
          }
          return
        }
        this.blockedKeys = this.blockedKeys.includes(key)
          ? this.blockedKeys.filter((item) => item !== key)
          : [...this.blockedKeys, key]
        this.syncTutorialProgress()
        return
      }

      if (this.placedKeys.includes(key)) {
        if (this.isLockedPlacedKey(key)) {
          this.showToastMessage('教学给出的这只土拨鼠位置是固定提示')
          return
        }
        this.placedKeys = this.placedKeys.filter((item) => item !== key)
        this.syncTutorialProgress()
        return
      }

      try {
        const data = await request.post(`/api/pony/sessions/${this.session.sessionId}/place`, { row, col })
        this.session = data?.session || this.session
        if (data?.correct) {
          this.placedKeys = [...this.placedKeys, key]
          this.blockedKeys = this.blockedKeys.filter((item) => item !== key)
          this.hintKey = ''
          this.message = '这一步放对了。'
          this.messageTone = 'success'
          this.syncTutorialProgress()
          if (this.placedKeys.length >= Number(this.currentLevel?.regionCount || 0)) {
            await this.completeLevel()
          }
        } else {
          this.flashKey = key
          this.message = data?.failed ? '这一步放错了，机会已用完。' : `放错了，还剩 ${this.session.remainingMistakes} 次机会。`
          this.messageTone = 'danger'
          window.setTimeout(() => {
            if (this.flashKey === key) this.flashKey = ''
          }, 450)
          if (data?.failed) this.stopTimer()
        }
      } catch (error) {
        this.showToastMessage(`落子失败: ${error.message}`)
      }
    },
    async buyHint() {
      if (!this.session || this.session.status !== 'active') return
      this.hintLoading = true
      try {
        const ponyCells = this.placedKeys.map((key) => {
          const [row, col] = key.split(',').map(Number)
          return { row, col }
        })
        const data = await request.post(`/api/pony/sessions/${this.session.sessionId}/hint`, { ponyCells })
        this.session = data?.session || this.session
        this.profile = data?.profile || this.profile
        if (data?.hint) {
          const key = cellKey(data.hint.row, data.hint.col)
          if (!this.placedKeys.includes(key)) this.placedKeys = [...this.placedKeys, key]
          this.blockedKeys = this.blockedKeys.filter((item) => item !== key)
          this.hintKey = key
          this.message = data.hint.message || '已经帮你点亮一个正确位置。'
          this.messageTone = 'success'
          if (this.placedKeys.length >= Number(this.currentLevel?.regionCount || 0)) {
            await this.completeLevel()
          }
        }
      } catch (error) {
        this.showToastMessage(`购买提示失败: ${error.message}`)
      } finally {
        this.hintLoading = false
      }
    },
    async completeLevel() {
      if (!this.session || this.session.status !== 'active') return
      try {
        const ponyCells = this.placedKeys.map((key) => {
          const [row, col] = key.split(',').map(Number)
          return { row, col }
        })
        const data = await request.post(`/api/pony/sessions/${this.session.sessionId}/complete`, {
          ponyCells,
          timeElapsed: this.elapsedSeconds
        })
        this.session = data?.session || this.session
        this.profile = data?.profile || this.profile
        this.lastRewardCoins = Number(data?.rewardCoins || 0)
        this.message = data?.firstClear ? `首通奖励 ${this.lastRewardCoins} 金币。` : '本关已通关，奖励已领取过。'
        this.messageTone = 'success'
        this.stopTimer()
        await this.loadGame()
      } catch (error) {
        this.showToastMessage(`通关结算失败: ${error.message}`)
      }
    },
    async buyEnergyPack() {
      this.storeLoading = true
      try {
        const data = await request.post('/api/pony/store/buy-energy', {})
        this.profile = data?.profile || this.profile
        this.config = { ...defaultConfig, ...(data?.config || {}) }
        this.showToastMessage('体力购买成功')
      } catch (error) {
        this.showToastMessage(`购买体力失败: ${error.message}`)
      } finally {
        this.storeLoading = false
      }
    },
    formatTime(totalSeconds) {
      const safe = Math.max(Number(totalSeconds || 0), 0)
      const minutes = Math.floor(safe / 60)
      const seconds = safe % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    },
    regionColor(regionId) {
      const text = String(regionId || '')
      const numericMatch = text.match(/(\d+)/)
      if (numericMatch) {
        const paletteIndex = (Math.max(Number(numericMatch[1]), 1) - 1) % REGION_COLOR_PALETTE.length
        return REGION_COLOR_PALETTE[paletteIndex]
      }

      let hash = 0
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(index)
        hash |= 0
      }
      return REGION_COLOR_PALETTE[Math.abs(hash) % REGION_COLOR_PALETTE.length]
    }
  }
}
</script>

<style scoped>
.pony-page {
  --bg-top: #ffffff;
  --bg-bottom: #f5f9ff;
  --ink: #1d2b3c;
  --muted: #6e7b8c;
  --line: #c8d9ef;
  --blue: #2d78d2;
  --blue-deep: #0f5fb8;
  --pill: rgba(255, 255, 255, 0.92);
  min-height: calc(100vh - 80px);
  padding: 18px 12px 104px;
  background:
    radial-gradient(circle at top center, rgba(111, 182, 255, 0.12), transparent 30%),
    linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
  color: var(--ink);
}

.marmot-shell {
  width: min(100%, 460px);
  margin: 0 auto;
}

.game-hud {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 92px;
  align-items: start;
  gap: 10px;
}

.hud-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hud-side.right {
  align-items: flex-end;
}

.resource-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resource-pill,
.remaining-pill,
.mini-ghost,
.level-pill,
.meta-card,
.economy-panel,
.rule-chip,
.board-panel,
.loading-card {
  background: var(--pill);
  border: 1px solid rgba(214, 225, 243, 0.95);
  box-shadow: 0 14px 36px rgba(79, 107, 145, 0.10);
}

.resource-pill {
  min-height: 38px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-size: 18px;
  font-weight: 800;
}

.coin-pill {
  color: #cc8a00;
}

.energy-pill {
  color: #1792d4;
}

.resource-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 14px;
}

.resource-icon.coin {
  background: radial-gradient(circle at 35% 35%, #ffe88d, #ffb600);
  color: rgba(255, 255, 255, 0.96);
}

.resource-icon.energy {
  background: radial-gradient(circle at 35% 35%, #ff8ba0, #ff3157);
  color: rgba(255, 255, 255, 0.96);
}

.mini-plus,
.mini-ghost {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.mini-plus {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(180deg, #52b2ff 0%, #167ee7 100%);
  color: #fff;
  margin-left: auto;
  box-shadow: 0 8px 14px rgba(40, 122, 218, 0.24);
}

.mini-ghost {
  min-width: 58px;
  min-height: 38px;
  padding: 7px 12px;
  border-radius: 999px;
  color: #506175;
}

.recovery-text {
  font-size: 11px;
  color: var(--muted);
  padding-left: 6px;
}

.hud-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stage-title {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #6f7077;
}

.life-row {
  display: inline-flex;
  gap: 8px;
}

.life-heart {
  font-size: 24px;
  color: #ff2f55;
  text-shadow: 0 4px 10px rgba(255, 47, 85, 0.28);
}

.life-heart.lost {
  color: #f2b5c0;
  text-shadow: none;
}

.remaining-pill {
  min-width: 152px;
  border-radius: 999px;
  padding: 6px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #de4837;
  font-weight: 800;
}

.remaining-icon {
  font-size: 22px;
}

.rules-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(223, 231, 244, 0.96);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 34px rgba(83, 102, 130, 0.12);
}

.rule-chip {
  min-height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  text-align: center;
}

.rule-chip + .rule-chip {
  border-left: 1px dashed rgba(122, 153, 194, 0.48);
}

.rule-chip strong {
  font-size: 14px;
  line-height: 1.35;
  color: #6a6d75;
}

.level-strip {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tutorial-panel {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(140, 174, 215, 0.42);
  box-shadow: 0 10px 30px rgba(66, 97, 142, 0.08);
}

.tutorial-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.tutorial-head strong {
  font-size: 15px;
}

.tutorial-head span {
  font-size: 11px;
  color: var(--muted);
}

.tutorial-list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #496076;
}

.tutorial-list li + li {
  margin-top: 6px;
}

.level-pill {
  border-radius: 999px;
  border: 0;
  padding: 9px 14px;
  white-space: nowrap;
  cursor: pointer;
  font-weight: 800;
  color: #526171;
}

.level-pill.active {
  background: linear-gradient(180deg, #3da3ff 0%, #0d71d8 100%);
  color: #fff;
}

.level-pill.done:not(.active) {
  background: #ecfdf3;
  color: #138a54;
}

.level-pill.locked {
  opacity: 0.42;
}

.message-bar {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(66, 97, 142, 0.10);
}

.message-bar.info {
  background: #eef7ff;
  color: #1769c5;
}

.message-bar.success {
  background: #ecfdf3;
  color: #15784f;
}

.message-bar.danger {
  background: #fff1f2;
  color: #c22b44;
}

.board-panel {
  margin-top: 14px;
  border-radius: 34px;
  padding: 18px 14px 18px;
}

.board-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.meta-card {
  border-radius: 22px;
  padding: 10px 12px;
  text-align: center;
}

.meta-card span {
  display: block;
  font-size: 11px;
  color: var(--muted);
}

.meta-card strong {
  display: block;
  margin-top: 4px;
  font-size: 14px;
}

.board-shell {
  position: relative;
  margin-top: 16px;
  padding: 10px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.board {
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  gap: 8px;
}

.board.guided {
  filter: drop-shadow(0 18px 30px rgba(102, 158, 230, 0.16));
}

.cell {
  position: relative;
  border: 0;
  border-radius: 18px;
  background: var(--region-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 6px 12px rgba(93, 120, 156, 0.08);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  overflow: hidden;
}

.cell:active {
  transform: scale(0.96);
}

.cell.placed {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.92), 0 10px 18px rgba(64, 76, 104, 0.14);
}

.cell.hinted {
  outline: 3px solid rgba(255, 192, 72, 0.84);
}

.cell.tutorial-highlight {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.96), 0 0 0 3px rgba(38, 127, 255, 0.42), 0 0 22px rgba(47, 136, 255, 0.50);
}

.cell.tutorial-focus {
  animation: tutorial-pulse 1.25s ease-in-out infinite;
}

.cell.tutorial-muted {
  opacity: 0.42;
  filter: saturate(0.72);
}

.cell.flash {
  animation: flash-wrong 0.45s ease;
}

.marmot-token {
  width: 72%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 40% 30%, #fff7dd, #ead4a2 72%, #d9b76a 100%);
  box-shadow: 0 10px 18px rgba(82, 62, 28, 0.18);
}

.marmot-token-face {
  font-size: clamp(26px, 7vw, 40px);
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(76, 48, 24, 0.22));
}

.mark-icon {
  font-size: clamp(34px, 8vw, 46px);
  line-height: 1;
  color: rgba(255, 255, 255, 0.98);
  font-weight: 900;
  text-shadow: 0 5px 10px rgba(122, 145, 178, 0.18);
}

.tutorial-stage {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

.tutorial-bubble {
  position: relative;
  width: min(100%, 360px);
  padding: 18px 18px 16px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(200, 217, 239, 0.8);
  box-shadow: 0 20px 42px rgba(63, 90, 126, 0.14);
  text-align: center;
}

.tutorial-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffe45d 0%, #ffcb14 100%);
  color: #7e5700;
  font-size: 12px;
  font-weight: 900;
}

.tutorial-title {
  display: block;
  margin-top: 10px;
  font-size: 20px;
}

.tutorial-copy {
  margin: 10px 0 0;
  color: #44576e;
  font-size: 16px;
  line-height: 1.65;
}

.tutorial-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
}

.tutorial-cta,
.tutorial-skip {
  min-width: 118px;
  min-height: 48px;
  border: 0;
  border-radius: 18px;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.tutorial-cta {
  color: #fff;
  background: linear-gradient(180deg, #3aa4ff 0%, #0d70d7 100%);
  box-shadow: 0 12px 24px rgba(43, 118, 211, 0.28);
}

.tutorial-skip {
  color: #5b6f84;
  background: rgba(234, 243, 255, 0.98);
}

.tutorial-hand {
  position: absolute;
  right: 6px;
  bottom: 2px;
  font-size: 24px;
  line-height: 1;
  filter: drop-shadow(0 6px 10px rgba(18, 95, 186, 0.24));
  animation: tutorial-hand-float 1s ease-in-out infinite;
}

.overlay-card {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  padding: 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 14px 30px rgba(56, 81, 120, 0.15);
}

.overlay-card strong {
  display: block;
  font-size: 17px;
}

.overlay-card p {
  margin: 8px 0 0;
  color: #536274;
  line-height: 1.6;
}

.overlay-card.success {
  border: 1px solid #86efac;
}

.overlay-card.danger {
  border: 1px solid #fecdd3;
}

.overlay-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.economy-panel {
  margin-top: 14px;
  border-radius: 22px;
  padding: 14px 16px;
}

.economy-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  color: #526171;
  font-size: 13px;
}

.economy-row strong {
  text-align: right;
  color: #223349;
}

.tool-dock {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: min(calc(100vw - 16px), 468px);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  z-index: 12;
}

.dock-btn,
.primary-btn,
.soft-btn {
  border: 0;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 24px rgba(52, 88, 137, 0.14);
  cursor: pointer;
  min-height: 74px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #43607e;
  font-weight: 800;
  border: 1px solid rgba(221, 231, 244, 0.96);
}

.dock-btn.active,
.dock-btn.accent,
.primary-btn {
  background: linear-gradient(180deg, #38a6ff 0%, #0b70d7 100%);
  color: #fff;
}

.dock-btn.soft {
  background: linear-gradient(180deg, #edf3ff 0%, #d7e5ff 100%);
}

.dock-btn.erase {
  color: #8a95ad;
}

.dock-btn.pony.active {
  background: linear-gradient(180deg, #4cb0ff 0%, #1073d8 100%);
}

.dock-btn.mark.active {
  background: linear-gradient(180deg, #59b8ff 0%, #1d7fe4 100%);
}

.dock-btn.hint {
  position: relative;
}

.dock-btn.hint::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(255, 223, 115, 0.32);
  pointer-events: none;
}

.dock-icon {
  font-size: 28px;
  line-height: 1;
}

.dock-btn span:last-child {
  font-size: 13px;
}

.loading-shell {
  display: flex;
  justify-content: center;
  padding-top: 40px;
}

.loading-card {
  border-radius: 24px;
  padding: 24px 28px;
  font-weight: 800;
}

@keyframes flash-wrong {
  0% { transform: scale(1); background: #ffd7df; }
  45% { transform: scale(0.95); background: #ffb8c4; }
  100% { transform: scale(1); }
}

@keyframes tutorial-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.96); box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.92), 0 0 0 3px rgba(38, 127, 255, 0.55), 0 0 26px rgba(47, 136, 255, 0.5); }
  100% { transform: scale(1); }
}

@keyframes tutorial-hand-float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
  100% { transform: translateY(0); }
}

@media (min-width: 860px) {
  .marmot-shell {
    width: min(100%, 720px);
  }

  .game-hud {
    grid-template-columns: 160px minmax(0, 1fr) 160px;
  }

  .tool-dock {
    position: static;
    transform: none;
    width: 100%;
    margin-top: 14px;
  }
}

@media (max-width: 420px) {
  .pony-page {
    padding-left: 10px;
    padding-right: 10px;
  }

  .game-hud {
    grid-template-columns: 80px minmax(0, 1fr) 80px;
  }

  .stage-title {
    font-size: 28px;
  }

  .rule-chip {
    min-height: 76px;
    padding: 8px;
  }

  .rule-chip strong {
    font-size: 12px;
  }

  .tutorial-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .economy-row {
    flex-direction: column;
  }
}
</style>