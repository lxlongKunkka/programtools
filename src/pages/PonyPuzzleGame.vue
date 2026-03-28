<template>
  <div class="pony-page">
    <section class="pony-hero">
      <div>
        <p class="pony-eyebrow">Logic Game</p>
        <h1>小马放置</h1>
        <p class="pony-copy">每个颜色区块恰好放 1 只小马，同时满足行列不重复，且任意两只小马不能 8 方向相邻。</p>
      </div>
      <div class="hero-metrics">
        <article class="metric-card accent">
          <span>金币</span>
          <strong>{{ profile.coins }}</strong>
        </article>
        <article class="metric-card">
          <span>体力</span>
          <strong>{{ profile.energy }} / {{ profile.energyMax }}</strong>
        </article>
        <article class="metric-card">
          <span>已通关</span>
          <strong>{{ completedCount }} / {{ levels.length }}</strong>
        </article>
      </div>
    </section>

    <div class="pony-layout">
      <aside class="side-column">
        <section class="panel profile-panel">
          <div class="panel-head">
            <h3>资源</h3>
            <button class="soft-btn" :disabled="storeLoading" @click="buyEnergyPack">购买体力</button>
          </div>
          <div class="resource-list">
            <div class="resource-row"><span>开局消耗</span><strong>{{ config.energyCostPerGame }} 体力</strong></div>
            <div class="resource-row"><span>提示价格</span><strong>{{ config.hintCost }} 金币</strong></div>
            <div class="resource-row"><span>体力恢复</span><strong>{{ config.energyRecoveryMinutes }} 分钟 +1</strong></div>
            <div class="resource-row"><span>体力包</span><strong>{{ config.energyPackCost }} 金币换 {{ config.energyPackAmount }} 体力</strong></div>
          </div>
          <p class="economy-note">Quiz 答对和 Course 完成题目/章节都会自动给金币，可直接拿来买体力和提示。</p>
        </section>

        <section class="panel levels-panel">
          <div class="panel-head">
            <h3>关卡</h3>
            <span class="small-meta">已解锁到 L{{ profile.unlockedLevel || 1 }}</span>
          </div>
          <div class="level-list">
            <button
              v-for="level in levels"
              :key="level.levelId"
              class="level-card"
              :class="{
                active: Number(level.levelId) === Number(selectedLevelId),
                locked: !level.unlocked,
                done: level.completed
              }"
              @click="selectLevel(level)"
            >
              <div class="level-row">
                <strong>第 {{ level.levelId }} 关</strong>
                <span>{{ level.size }}x{{ level.size }}</span>
              </div>
              <p>{{ level.name }}</p>
              <div class="level-row small-row">
                <span>{{ level.difficultyLabel }}</span>
                <span v-if="level.completed">已通关</span>
                <span v-else-if="level.unlocked">可开始</span>
                <span v-else>未解锁</span>
              </div>
            </button>
          </div>
        </section>
      </aside>

      <main class="main-column">
        <section class="panel stage-panel" v-if="currentLevel">
          <div class="stage-head">
            <div>
              <p class="small-meta">{{ currentLevel.difficultyLabel }} · 奖励 {{ currentLevel.rewardCoins }} 金币</p>
              <h2>{{ currentLevel.name }}</h2>
              <p class="stage-desc">{{ currentLevel.description }}</p>
            </div>
            <div class="stage-stats">
              <div class="stat-pill">
                <span>剩余机会</span>
                <strong>{{ currentMistakesLeft }}</strong>
              </div>
              <div class="stat-pill">
                <span>用时</span>
                <strong>{{ formatTime(elapsedSeconds) }}</strong>
              </div>
              <div class="stat-pill">
                <span>已放小马</span>
                <strong>{{ placedKeys.length }} / {{ currentLevel.regionCount }}</strong>
              </div>
            </div>
          </div>

          <div class="toolbar">
            <button :class="['tool-btn', mode === 'pony' ? 'active' : '']" @click="mode = 'pony'">放小马</button>
            <button :class="['tool-btn', mode === 'mark' ? 'active' : '']" @click="mode = 'mark'">标记排除</button>
            <button :class="['tool-btn', mode === 'erase' ? 'active' : '']" @click="mode = 'erase'">擦除</button>
            <button class="tool-btn" :disabled="!session || session.status !== 'active' || hintLoading" @click="buyHint">{{ hintLoading ? '提示中...' : '购买提示' }}</button>
            <button class="tool-btn" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">{{ session && session.status === 'active' ? '重新开始' : '开始本关' }}</button>
          </div>

          <div v-if="message" class="message-bar" :class="messageTone">{{ message }}</div>

          <div class="board-shell">
            <div class="board" :style="boardStyle" @contextmenu.prevent>
              <template v-for="(row, rowIndex) in currentLevel.regionBoard" :key="`row-${rowIndex}`">
                <button
                  v-for="(regionId, colIndex) in row"
                  :key="`${rowIndex}-${colIndex}`"
                  class="cell"
                  :class="cellClass(rowIndex, colIndex)"
                  :style="{ '--region-color': regionColor(regionId) }"
                  @click="handleCellClick(rowIndex, colIndex)"
                >
                  <span v-if="isPlaced(rowIndex, colIndex)" class="pony-icon">♞</span>
                  <span v-else-if="isBlocked(rowIndex, colIndex)" class="mark-icon">×</span>
                </button>
              </template>
            </div>

            <div v-if="!session" class="overlay-card subtle">
              <strong>开始一局会消耗 {{ config.energyCostPerGame }} 体力</strong>
              <p>进入后共有 3 次失败机会。标记不会扣机会，只有错误放置小马会扣机会。</p>
            </div>

            <div v-else-if="session.status === 'failed'" class="overlay-card danger">
              <strong>本局失败</strong>
              <p>三次机会已用完，可以重新开始本关继续挑战。</p>
              <button class="primary-btn" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">再来一局</button>
            </div>

            <div v-else-if="session.status === 'completed'" class="overlay-card success">
              <strong>通关成功</strong>
              <p>用时 {{ formatTime(elapsedSeconds) }}，本关{{ lastRewardCoins > 0 ? `获得 ${lastRewardCoins} 金币` : '奖励已领取过' }}。</p>
              <div class="overlay-actions">
                <button class="primary-btn" :disabled="startLoading" @click="startLevel(currentLevel.levelId)">重玩本关</button>
                <button class="soft-btn" :disabled="!nextUnlockedLevel" @click="selectLevelById(nextUnlockedLevel)">下一关</button>
              </div>
            </div>
          </div>

          <div class="rules-grid">
            <article class="rule-card">
              <strong>放置规则</strong>
              <p>每个颜色区块恰好 1 只小马，每行每列最多 1 只，且小马之间不能贴着放。</p>
            </article>
            <article class="rule-card">
              <strong>金币来源</strong>
              <p>答对 1 道 Quiz 自动 +{{ config.quizCorrectCoins }} 金币；Course 题目和章节完成也会自动发放。</p>
            </article>
          </div>
        </section>

        <section v-else class="panel stage-panel empty-panel">
          <p>关卡加载中...</p>
        </section>
      </main>
    </div>
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
      lastRewardCoins: 0
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
    }
  },
  mounted() {
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
        this.showToastMessage(`加载小马游戏失败: ${error.message}`)
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
        this.message = '本局已开始，先观察颜色区块，再下手放小马。'
        this.messageTone = 'info'
        this.startTimer()
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
        hinted: this.hintKey === key
      }
    },
    async handleCellClick(row, col) {
      if (!this.session || this.session.status !== 'active') {
        this.showToastMessage('请先开始本关')
        return
      }

      const key = cellKey(row, col)
      if (this.mode === 'erase') {
        this.placedKeys = this.placedKeys.filter((item) => item !== key)
        this.blockedKeys = this.blockedKeys.filter((item) => item !== key)
        if (this.hintKey === key) this.hintKey = ''
        return
      }

      if (this.mode === 'mark') {
        if (this.placedKeys.includes(key)) return
        this.blockedKeys = this.blockedKeys.includes(key)
          ? this.blockedKeys.filter((item) => item !== key)
          : [...this.blockedKeys, key]
        return
      }

      if (this.placedKeys.includes(key)) {
        this.placedKeys = this.placedKeys.filter((item) => item !== key)
        return
      }

      try {
        const data = await request.post(`/api/pony/sessions/${this.session.sessionId}/place`, { row, col })
        this.session = data?.session || this.session
        if (data?.correct) {
          this.placedKeys = [...this.placedKeys, key]
          this.blockedKeys = this.blockedKeys.filter((item) => item !== key)
          this.hintKey = ''
          this.message = '这一步是对的。'
          this.messageTone = 'success'
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
          this.message = data.hint.message || '已为你揭示一格正确位置。'
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
  max-width: 1380px;
  margin: 0 auto;
  padding: 24px 18px 48px;
  color: #16202a;
}

.pony-hero,
.panel,
.metric-card,
.rule-card {
  background: #fff;
  border: 1px solid #d8e0ea;
  border-radius: 18px;
  box-shadow: 0 18px 45px rgba(15, 34, 58, 0.08);
}

.pony-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  background: linear-gradient(135deg, #fffdf3 0%, #eef7ff 100%);
}

.pony-eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a5a00;
}

.pony-hero h1 {
  margin: 0;
  font-size: 34px;
}

.pony-copy {
  margin: 10px 0 0;
  max-width: 760px;
  color: #526272;
  line-height: 1.7;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  min-width: 420px;
}

.metric-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-card span,
.small-meta,
.stage-desc,
.economy-note {
  color: #647587;
}

.metric-card strong {
  font-size: 28px;
}

.metric-card.accent {
  background: linear-gradient(135deg, #153f72 0%, #2a73c9 100%);
  color: #fff;
  border-color: #153f72;
}

.metric-card.accent span {
  color: rgba(255, 255, 255, 0.82);
}

.pony-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
}

.side-column,
.main-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  padding: 20px;
}

.panel-head,
.stage-head,
.level-row,
.resource-row,
.overlay-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.panel-head h3,
.stage-head h2 {
  margin: 0;
}

.resource-list,
.level-list,
.rules-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-row {
  padding: 10px 0;
  border-bottom: 1px solid #e7edf3;
}

.resource-row:last-child {
  border-bottom: 0;
}

.economy-note {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.6;
}

.level-card {
  width: 100%;
  text-align: left;
  border: 1px solid #d7e2ec;
  background: #fbfdff;
  border-radius: 14px;
  padding: 14px;
  cursor: pointer;
}

.level-card.active {
  border-color: #2f7ff8;
  box-shadow: 0 12px 24px rgba(47, 127, 248, 0.12);
}

.level-card.done {
  background: #f0fdf4;
  border-color: #86efac;
}

.level-card.locked {
  opacity: 0.58;
}

.level-card p {
  margin: 8px 0;
  color: #324253;
  font-weight: 700;
}

.small-row {
  font-size: 12px;
  color: #6f8193;
}

.stage-panel {
  min-height: 780px;
}

.stage-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-pill {
  padding: 10px 12px;
  border-radius: 14px;
  background: #f5f9fd;
  border: 1px solid #dbe5ef;
  min-width: 108px;
}

.stat-pill span {
  display: block;
  font-size: 12px;
  color: #6a7a89;
}

.stat-pill strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
}

.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.tool-btn,
.primary-btn,
.soft-btn {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  padding: 10px 16px;
  font-weight: 700;
}

.tool-btn,
.soft-btn {
  background: #edf3fa;
  color: #24415e;
}

.tool-btn.active,
.primary-btn {
  background: #0f62fe;
  color: #fff;
}

.message-bar {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
}

.message-bar.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.message-bar.success {
  background: #ecfdf5;
  color: #15803d;
}

.message-bar.danger {
  background: #fff1f2;
  color: #be123c;
}

.board-shell {
  position: relative;
  margin-top: 18px;
  min-height: 540px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board {
  width: min(78vw, 560px);
  aspect-ratio: 1;
  display: grid;
  gap: 6px;
}

.cell {
  position: relative;
  border: 1px solid rgba(18, 32, 52, 0.08);
  border-radius: 14px;
  background: var(--region-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(18px, 2vw, 32px);
  color: #12304d;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.cell.placed {
  box-shadow: inset 0 0 0 3px rgba(15, 98, 254, 0.2);
  background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.15)), var(--region-color);
}

.cell.blocked {
  opacity: 0.7;
}

.cell.hinted {
  outline: 3px solid rgba(245, 158, 11, 0.7);
}

.cell.flash {
  animation: flash-wrong 0.45s ease;
}

.pony-icon {
  font-size: 1.05em;
  line-height: 1;
}

.mark-icon {
  font-size: 1.4em;
  color: rgba(17, 24, 39, 0.45);
}

.overlay-card {
  position: absolute;
  inset: auto 24px 24px 24px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid #dbe4ef;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 16px 32px rgba(15, 34, 58, 0.12);
}

.overlay-card strong {
  display: block;
  font-size: 18px;
}

.overlay-card p {
  margin: 8px 0 0;
  color: #526272;
}

.overlay-card.success {
  border-color: #86efac;
}

.overlay-card.danger {
  border-color: #fecdd3;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 18px;
}

.rule-card {
  padding: 14px;
}

.rule-card strong {
  display: block;
}

.rule-card p {
  margin: 8px 0 0;
  color: #5f6f80;
  line-height: 1.6;
}

.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes flash-wrong {
  0% { transform: scale(1); background: #ffe4e6; }
  40% { transform: scale(0.96); background: #fecdd3; }
  100% { transform: scale(1); }
}

@media (max-width: 1120px) {
  .pony-hero,
  .pony-layout,
  .rules-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .hero-metrics {
    min-width: 0;
    width: 100%;
  }
}

@media (max-width: 760px) {
  .pony-page {
    padding: 16px 12px 42px;
  }

  .hero-metrics,
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .stage-head,
  .panel-head,
  .level-row,
  .resource-row,
  .overlay-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .board {
    width: min(92vw, 420px);
  }
}
</style>