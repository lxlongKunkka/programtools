<template>
  <div class="pony-page">
    <section v-if="currentLevel" class="marmot-shell">
      <header class="game-hud">
        <div class="hud-side left">
          <div class="resource-pill coin-pill">
            <span class="resource-icon">◎</span>
            <strong>{{ profile.coins }}</strong>
          </div>
          <div class="resource-stack">
            <div class="resource-pill energy-pill">
              <span class="resource-icon">⚡</span>
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
            <span>剩余: {{ remainingMarmots }}</span>
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
                <span v-if="isPlaced(rowIndex, colIndex)" class="marmot-token">🐹</span>
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
        <button class="dock-btn soft" type="button" @click="mode = 'erase'">
          <span class="dock-icon">⌫</span>
          <span>清除</span>
        </button>
        <button class="dock-btn" :class="{ active: mode === 'pony' }" type="button" @click="mode = 'pony'">
          <span class="dock-icon">🐹</span>
          <span>放土拨鼠</span>
        </button>
        <button class="dock-btn" :class="{ active: mode === 'mark' }" type="button" @click="mode = 'mark'">
          <span class="dock-icon">×</span>
          <span>打叉</span>
        </button>
        <button class="dock-btn" type="button" :disabled="!session || session.status !== 'active' || hintLoading" @click="buyHint">
          <span class="dock-icon">💡</span>
          <span>{{ hintLoading ? '提示中' : '提示' }}</span>
        </button>
        <button class="dock-btn accent" type="button" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">
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

const TUTORIAL_STORAGE_KEY = 'programtools-pony-tutorial-v2'

const LEVEL_ONE_SCRIPT = [
  {
    kind: 'modal',
    badge: '教学 1/6',
    title: '先看规则',
    text: '一种颜色区域里，只能放 1 只土拨鼠。先记住这个最基础的规则。',
    ctaText: '明白了',
    highlightKeys: ['0,2', '0,3', '1,2', '1,3']
  },
  {
    kind: 'tip',
    badge: '教学 2/6',
    text: '先从最容易的位置开始，点一下高亮格子，把第一只土拨鼠放进去。',
    autoMode: 'pony',
    focusKeys: ['3,1'],
    highlightKeys: ['3,1'],
    requirement: { type: 'placedAll', keys: ['3,1'] },
    showTap: true
  },
  {
    kind: 'success',
    badge: '不错',
    text: '土拨鼠不能出现在同一行或同一列。现在切到打叉模式，把这些格子排除掉。',
    autoMode: 'mark',
    highlightKeys: ['0,1', '1,1', '2,1', '3,0', '3,2', '3,3'],
    requirement: { type: 'blockedAll', keys: ['0,1', '1,1', '2,1', '3,0', '3,2', '3,3'] }
  },
  {
    kind: 'tip',
    badge: '教学 4/6',
    text: '还不够，土拨鼠四周也不能挨着。把高亮的相邻格也打叉。',
    autoMode: 'mark',
    highlightKeys: ['2,0', '2,2'],
    requirement: { type: 'blockedAll', keys: ['2,0', '2,2'] }
  },
  {
    kind: 'success',
    badge: '做得好',
    text: '现在这个颜色块只剩一个位置了，点亮它，继续往前推。',
    autoMode: 'pony',
    focusKeys: ['0,2'],
    highlightKeys: ['0,2'],
    requirement: { type: 'placedAll', keys: ['0,2'] },
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
    text: '先点这个高亮格子，放下第一只土拨鼠。',
    autoMode: 'pony',
    focusKeys: ['0,2'],
    highlightKeys: ['0,2'],
    requirement: { type: 'placedAll', keys: ['0,2'] },
    showTap: true
  },
  {
    kind: 'success',
    badge: '不错',
    text: '同一行和同一列不能再有土拨鼠，把高亮位置全部打叉。',
    autoMode: 'mark',
    highlightKeys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'],
    requirement: { type: 'blockedAll', keys: ['0,0', '0,1', '0,3', '1,2', '2,2', '3,2'] }
  },
  {
    kind: 'tip',
    badge: '教学 4/5',
    text: '四周相邻也不行，再把这两个贴边格打叉。',
    autoMode: 'mark',
    highlightKeys: ['1,1', '1,3'],
    requirement: { type: 'blockedAll', keys: ['1,1', '1,3'] }
  },
  {
    kind: 'success',
    badge: '继续',
    text: '现在下方这块颜色只剩一个合理位置了，点亮它。',
    autoMode: 'pony',
    focusKeys: ['3,1'],
    highlightKeys: ['3,1'],
    requirement: { type: 'placedAll', keys: ['3,1'] },
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
    text: '先放这一只土拨鼠，给后面制造排除条件。',
    autoMode: 'pony',
    focusKeys: ['1,0'],
    highlightKeys: ['1,0'],
    requirement: { type: 'placedAll', keys: ['1,0'] },
    showTap: true
  },
  {
    kind: 'success',
    badge: '很好',
    text: '先把同一行、同一列里不可能的位置全部打叉。',
    autoMode: 'mark',
    highlightKeys: ['0,0', '2,0', '3,0', '1,1', '1,2', '1,3'],
    requirement: { type: 'blockedAll', keys: ['0,0', '2,0', '3,0', '1,1', '1,2', '1,3'] }
  },
  {
    kind: 'tip',
    badge: '教学 4/5',
    text: '再把它四周挨着的位置打叉，这样右上颜色块就快只剩一个点了。',
    autoMode: 'mark',
    highlightKeys: ['0,1', '2,1'],
    requirement: { type: 'blockedAll', keys: ['0,1', '2,1'] }
  },
  {
    kind: 'success',
    badge: '就是这样',
    text: '现在右上颜色块只剩一个安全格，点它落子。',
    autoMode: 'pony',
    focusKeys: ['0,2'],
    highlightKeys: ['0,2'],
    requirement: { type: 'placedAll', keys: ['0,2'] },
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
        this.elapsedSeconds = 0
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
        this.placedKeys = this.placedKeys.filter((item) => item !== key)
        this.blockedKeys = this.blockedKeys.filter((item) => item !== key)
        if (this.hintKey === key) this.hintKey = ''
        this.syncTutorialProgress()
        return
      }

      if (this.mode === 'mark') {
        if (this.placedKeys.includes(key)) return
        this.blockedKeys = this.blockedKeys.includes(key)
          ? this.blockedKeys.filter((item) => item !== key)
          : [...this.blockedKeys, key]
        this.syncTutorialProgress()
        return
      }

      if (this.placedKeys.includes(key)) {
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
      let hash = 0
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(index)
        hash |= 0
      }
      const hue = Math.abs(hash) % 360
      return `hsl(${hue}deg 72% 88%)`
    }
  }
}
</script>

<style scoped>
.pony-page {
  --bg-top: #f7fbff;
  --bg-bottom: #eef5ff;
  --ink: #1d2b3c;
  --muted: #6e7b8c;
  --line: #c8d9ef;
  --blue: #2d78d2;
  --blue-deep: #0f5fb8;
  --pill: rgba(255, 255, 255, 0.92);
  min-height: calc(100vh - 80px);
  padding: 18px 12px 104px;
  background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
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
  border: 1px solid rgba(140, 174, 215, 0.42);
  box-shadow: 0 10px 30px rgba(66, 97, 142, 0.08);
}

.resource-pill {
  min-height: 32px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 15px;
  font-weight: 800;
}

.coin-pill {
  color: #cc8a00;
}

.energy-pill {
  color: #1792d4;
}

.resource-icon {
  font-size: 14px;
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
  background: #3b92ff;
  color: #fff;
  margin-left: auto;
}

.mini-ghost {
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
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 1px;
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
  min-width: 126px;
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
  font-size: 18px;
}

.rules-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 20px;
  border: 2px solid rgba(90, 145, 212, 0.72);
  background: rgba(255, 255, 255, 0.88);
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
  font-size: 13px;
  line-height: 1.35;
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
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
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
  border-radius: 28px;
  padding: 18px 14px 24px;
}

.board-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.meta-card {
  border-radius: 18px;
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
}

.board {
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  gap: 6px;
}

.board.guided {
  filter: drop-shadow(0 18px 30px rgba(102, 158, 230, 0.16));
}

.cell {
  position: relative;
  border: 0;
  border-radius: 14px;
  background: var(--region-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.cell:active {
  transform: scale(0.96);
}

.cell.placed {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.88), 0 4px 10px rgba(64, 76, 104, 0.12);
}

.cell.hinted {
  outline: 3px solid rgba(255, 192, 72, 0.84);
}

.cell.tutorial-highlight {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.92), 0 0 0 2px rgba(38, 127, 255, 0.38), 0 0 18px rgba(47, 136, 255, 0.42);
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
  font-size: clamp(26px, 7vw, 38px);
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(76, 48, 24, 0.22));
}

.mark-icon {
  font-size: clamp(28px, 7vw, 38px);
  line-height: 1;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 900;
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
  box-shadow: 0 18px 40px rgba(63, 90, 126, 0.16);
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
  border-radius: 20px;
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
  gap: 8px;
  z-index: 12;
}

.dock-btn,
.primary-btn,
.soft-btn {
  border: 0;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 24px rgba(52, 88, 137, 0.16);
  cursor: pointer;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #43607e;
  font-weight: 800;
}

.dock-btn.active,
.dock-btn.accent,
.primary-btn {
  background: linear-gradient(180deg, #38a6ff 0%, #0b70d7 100%);
  color: #fff;
}

.dock-btn.soft {
  background: rgba(220, 239, 249, 0.94);
}

.dock-icon {
  font-size: 22px;
  line-height: 1;
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