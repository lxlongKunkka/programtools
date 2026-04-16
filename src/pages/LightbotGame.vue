<template>
  <div class="lightbot-page" :class="`screen-${screen}`">
    <section v-if="screen === 'select'" class="select-screen">
      <header class="select-header">
        <div>
          <p class="screen-kicker">Choose A Puzzle</p>
          <h1>Level Select</h1>
          <p>点关卡卡片直接开始，右下角可以看简介。</p>
        </div>
        <div class="select-actions">
          <button class="hero-btn primary" @click="quickStartLevel()">Continue</button>
          <button class="pill-btn" @click="openEditor()">Level Editor</button>
          <div class="progress-chip">{{ completedLevelIds.length }}/{{ levels.length }} complete</div>
        </div>
      </header>

      <section v-if="recentActivity.length" class="activity-strip">
        <div class="activity-strip-header">
          <div>
            <p class="screen-kicker">Community Pulse</p>
            <h2>最近谁在玩</h2>
          </div>
          <span>最新 {{ recentActivity.length }} 条通关</span>
        </div>

        <div class="activity-strip-list">
          <article
            v-for="item in recentActivity"
            :key="`${item.levelId}-${item.userId}-${item.completedAt}`"
            class="activity-strip-item"
          >
            <div class="activity-strip-top">
              <strong>{{ item.username }}</strong>
              <em>{{ formatRelativeTime(item.completedAt) }}</em>
            </div>
            <p>{{ item.levelTitle }}</p>
            <span>总代码 {{ item.totalCommands }} · 执行 {{ item.executionSteps }}</span>
          </article>
        </div>
      </section>

      <div class="chapter-groups">
        <section v-for="group in levelGroups" :key="group.id" class="chapter-group">
          <header class="chapter-group-header">
            <div class="chapter-group-copy">
              <p class="screen-kicker">Chapter {{ group.order + 1 }}</p>
              <h2>{{ group.title }}</h2>
              <p v-if="group.summary" class="chapter-summary">{{ group.summary }}</p>
              <div v-if="group.learningGoals?.length" class="chapter-goals">
                <span v-for="goal in group.learningGoals" :key="goal" class="chapter-goal-chip">{{ goal }}</span>
              </div>
            </div>
            <div class="chapter-group-side">
              <div class="chapter-progress">
                {{ completedCountForGroup(group) }}/{{ group.levels.length }} complete
              </div>
              <p class="chapter-mastery-text">{{ chapterMasteryStatus(group) }}</p>
              <div v-if="group.mechanicTags?.length" class="chapter-mechanics">
                <span v-for="tag in group.mechanicTags" :key="tag" class="chapter-mechanic-chip">{{ tag }}</span>
              </div>
            </div>
          </header>

          <div class="level-grid">
            <button
              v-for="(level, index) in group.levels"
              :key="level.id"
              class="level-card"
              :class="{ done: completedLevelIds.includes(level.id), current: levelGlobalIndex(group, index) === selectedLevelIndex }"
              @click="quickStartLevel(levelGlobalIndex(group, index))"
            >
              <div class="level-card-head">
                <span class="level-card-index">{{ index + 1 }}</span>
                <span class="level-card-tag">{{ level.skill }}</span>
              </div>
              <strong>{{ level.title }}</strong>
              <p>{{ level.goal }}</p>
              <p class="level-card-author">{{ getLevelAuthorLabel(level) }}</p>
              <div class="level-card-foot">
                <span>Main {{ level.mainLimit }}</span>
                <span v-if="level.procLimits.p1">P1 {{ level.procLimits.p1 }}</span>
                <span v-if="level.procLimits.p2">P2 {{ level.procLimits.p2 }}</span>
                <span v-if="!level.procLimits.p1 && !level.procLimits.p2">No proc</span>
                <button class="level-brief-btn" :disabled="!canEditLevel(level)" :title="getLevelEditHint(level)" @click.stop="openEditor(level)">编辑</button>
                <button class="level-brief-btn" @click.stop="openLevelBrief(levelGlobalIndex(group, index))">简介</button>
              </div>
            </button>
          </div>
        </section>
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
              <span>P2</span>
              <strong>{{ currentLevel.procLimits.p2 || 0 }} slots</strong>
            </div>
            <div>
              <span>Skill</span>
              <strong>{{ currentLevel.skill }}</strong>
            </div>
            <div>
              <span>Author</span>
              <strong>{{ getLevelAuthorName(currentLevel) }}</strong>
            </div>
          </div>

          <div class="brief-teaching-panel">
            <article>
              <span class="brief-panel-label">本关聚焦</span>
              <h2>{{ briefTeachingFocus }}</h2>
              <p>{{ briefTeachingSummary }}</p>
            </article>
            <article>
              <span class="brief-panel-label">开局建议</span>
              <h2>{{ briefFirstMoveTitle }}</h2>
              <p>{{ briefFirstMoveCopy }}</p>
            </article>
            <article>
              <span class="brief-panel-label">Demo 该看什么</span>
              <h2>{{ briefDemoTitle }}</h2>
              <p>{{ briefDemoCopy }}</p>
            </article>
          </div>

          <div class="brief-tips">
            <article v-for="tip in currentLevel.tips" :key="tip.title">
              <h2>{{ tip.title }}</h2>
              <p>{{ tip.copy }}</p>
            </article>
          </div>

          <div class="hero-actions">
            <button class="hero-btn primary" @click="startLevel">Enter Puzzle</button>
            <button class="hero-btn" :disabled="!hasCurrentDemo" @click="loadDemoAndStart">Load Demo</button>
            <button class="hero-btn" :disabled="!canEditLevel(currentLevel)" :title="getLevelEditHint(currentLevel)" @click="openEditor(currentLevel)">编辑此关</button>
          </div>
        </div>

        <div class="brief-preview">
          <div class="brief-preview-board">
            <div class="preview-badge">Preview</div>
            <div class="scene-frame preview-frame">
              <div ref="briefSceneHost" class="three-scene-host preview-scene-host"></div>
            </div>
          </div>

          <section class="brief-ranking">
            <div class="brief-ranking-header">
              <div>
                <p class="screen-kicker">Leaderboard</p>
                <h2>本关排行榜</h2>
              </div>
              <span v-if="levelLeaderboard.length">Top {{ levelLeaderboard.length }}</span>
            </div>

            <div v-if="levelLeaderboard.length" class="lightbot-leaderboard-list">
              <div
                v-for="(record, index) in levelLeaderboard"
                :key="`${record.userId}-${record.completedAt}`"
                class="lightbot-leaderboard-item"
                :class="{ me: record.userId === currentUserId }"
              >
                <span class="rank">{{ index + 1 }}</span>
                <div class="lightbot-leaderboard-copy">
                  <strong>{{ record.username }}</strong>
                  <span>总代码 {{ record.totalCommands }} · 执行 {{ record.executionSteps }}</span>
                </div>
                <div class="lightbot-leaderboard-meta">
                  <span>MAIN {{ record.mainLength }}</span>
                  <span v-if="record.p1Length">P1 {{ record.p1Length }}</span>
                  <span v-if="record.p2Length">P2 {{ record.p2Length }}</span>
                </div>
              </div>
            </div>
            <p v-else class="brief-ranking-empty">还没人通关这关，你可以先拿第一。</p>
          </section>
        </div>
      </div>
    </section>

    <section v-else-if="screen === 'editor'" class="editor-screen">
      <div class="editor-shell">
        <aside class="editor-sidebar">
          <div class="editor-card">
            <div class="program-header">
              <span>Level Editor</span>
              <button class="pill-btn" @click="leaveEditor">Back</button>
            </div>

            <div class="editor-form-grid">
              <label>
                <span>Title</span>
                <input v-model="editorDraft.title" type="text" maxlength="40">
              </label>
              <label>
                <span>Skill</span>
                <input v-model="editorDraft.skill" type="text" maxlength="24">
              </label>
              <label class="full-span">
                <span>Description</span>
                <input v-model="editorDraft.description" type="text" maxlength="120">
              </label>
              <label class="full-span">
                <span>Goal</span>
                <input v-model="editorDraft.goal" type="text" maxlength="120">
              </label>
              <label>
                <span>Main Slots</span>
                <input v-model.number="editorDraft.mainLimit" type="number" min="1" max="20">
              </label>
              <label>
                <span>P1 Slots</span>
                <input v-model.number="editorDraft.p1Limit" type="number" min="0" max="12">
              </label>
              <label>
                <span>P2 Slots</span>
                <input v-model.number="editorDraft.p2Limit" type="number" min="0" max="12">
              </label>
              <div class="editor-form-toggle full-span">
                <span>Special Blocks</span>
                <label class="toggle-check">
                  <input v-model="editorDraft.enableIfDark" type="checkbox">
                  <span>启用 If Dark 条件块</span>
                </label>
              </div>
              <label>
                <span>Facing</span>
                <select v-model="editorDraft.start.dir">
                  <option value="forward">East</option>
                  <option value="right">South</option>
                  <option value="backward">West</option>
                  <option value="left">North</option>
                </select>
              </label>
              <label>
                <span>Height</span>
                <input v-model.number="editorHeight" type="number" min="1" max="5">
              </label>
            </div>
          </div>

          <div class="editor-card">
            <p class="screen-kicker">Tools</p>
            <div class="editor-tool-row">
              <button class="tool-btn" :class="{ selected: editorTool === 'platform' }" @click="editorTool = 'platform'">Platform</button>
              <button class="tool-btn" :class="{ selected: editorTool === 'target' }" @click="editorTool = 'target'">Target</button>
              <button class="tool-btn" :class="{ selected: editorTool === 'start' }" @click="editorTool = 'start'">Start</button>
              <button class="tool-btn" :class="{ selected: editorTool === 'erase' }" @click="editorTool = 'erase'">Erase</button>
            </div>

            <p class="editor-grid-hint">先选 Platform，再在左侧网格或右侧 3D 预览中点击或拖拽刷地板。画布会按地图内容自动扩展。</p>

            <div class="editor-grid-board">
              <div
                v-for="(row, y) in editorDraft.board"
                :key="`editor-row-${y}`"
                class="editor-grid-row"
                :style="{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }"
              >
                <button
                  v-for="(_, x) in row"
                  :key="`editor-cell-${x}-${y}`"
                  class="editor-grid-cell"
                  :class="editorCellClass(x, y)"
                  @pointerdown.prevent="beginEditorPaint(x, y)"
                  @pointerenter="continueEditorPaint(x, y)"
                >
                  <span v-if="editorCellAt(x, y)" class="cell-height">{{ editorCellAt(x, y).h }}</span>
                  <span v-if="editorDraft.start.x === x && editorDraft.start.y === y" class="cell-start">S</span>
                  <span v-else-if="editorCellAt(x, y)?.target" class="cell-target">T</span>
                </button>
              </div>
            </div>

            <div class="editor-action-row">
              <button class="pill-btn" @click="saveEditorDraft">保存草稿</button>
              <button v-if="canDeleteEditorLevel" class="pill-btn" @click="deleteEditorData">{{ editorDeleteLabel }}</button>
              <button class="pill-btn" @click="resetEditorDraft">Reset Draft</button>
              <button class="pill-btn" @click="verifyEditorLevelForPublish">验证通关</button>
              <button class="hero-btn primary" @click="startCustomPlaytest">Playtest</button>
              <button class="hero-btn" :disabled="!canSaveEditorLevel" @click="saveEditorLevelToGame">保存到游戏</button>
            </div>

            <div class="editor-publish-card" :class="editorPublishToneClass">
              <strong>{{ editorPublishTitle }}</strong>
              <p>{{ editorPublishMessage }}</p>
              <template v-if="editorSolvedProgram">
                <div class="editor-solution-line">MAIN: {{ formatOps(editorSolvedProgram.main) }}</div>
                <div v-if="editorSolvedProgram.p1?.length" class="editor-solution-line">P1: {{ formatOps(editorSolvedProgram.p1) }}</div>
                <div v-if="editorSolvedProgram.p2?.length" class="editor-solution-line">P2: {{ formatOps(editorSolvedProgram.p2) }}</div>
              </template>
            </div>
          </div>
        </aside>

        <div class="editor-preview-pane">
          <div class="editor-card grow">
            <div class="program-header">
              <span>Preview</span>
              <span class="editor-preview-hint">在左侧网格编辑，右侧 3D 预览会同步更新。</span>
            </div>
            <div class="scene-frame editor-frame">
              <div ref="editorSceneHost" class="three-scene-host editor-scene-host"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="play-screen">
      <div class="play-shell">
        <aside class="hud-rail">
          <button class="rail-btn" @click="leavePlayScreen">←</button>
          <button class="rail-btn" @click="resetLevel(false)">↺</button>
        </aside>

        <main class="board-stage">
          <header class="board-topbar">
            <div class="board-topbar-copy">
              <p class="screen-kicker">{{ currentLevel.skill }}</p>
              <h1>{{ currentLevel.title }}</h1>
              <p class="board-author">{{ getLevelAuthorLabel(currentLevel) }}</p>
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

          <div class="play-context-row">
            <button class="meta-btn" :disabled="!canEditLevel(currentLevel)" :title="getLevelEditHint(currentLevel)" @click="openEditor(currentLevel)">编辑此关</button>
            <button class="meta-btn" @click="showPlayLeaderboard = !showPlayLeaderboard">{{ showPlayLeaderboard ? '隐藏排行榜' : '显示排行榜' }}</button>
          </div>

          <div class="scene-frame">
            <div class="status-float">
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
              :class="{
                active: (isRepeatPaletteOperation(operation) && pendingRepeatCount === operation.count)
                  || (isConditionalPaletteOperation(operation) && pendingConditionTest === operation.test)
              }"
              :disabled="isRunning || (PROCEDURE_KEYS.includes(operation.id) && !availableProcedureKeys.includes(operation.id))"
              @click="appendPaletteOperation(operation)"
            >
              <template v-if="isRepeatPaletteOperation(operation)">
                <span class="repeat-palette-label">x{{ operation.count }}</span>
              </template>
              <template v-else-if="isConditionalPaletteOperation(operation)">
                <span class="condition-palette-label">IF</span>
              </template>
              <img v-else :src="operationSprite(operation.id)" :alt="operation.label">
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
              <div v-if="lastCompletionMetrics" class="finish-stats">
                <div>
                  <span>总代码</span>
                  <strong>{{ lastCompletionMetrics.totalCommands }}</strong>
                </div>
                <div>
                  <span>{{ procedureLengthLabel(lastCompletionMetrics) }}</span>
                  <strong>{{ procedureLengthValue(lastCompletionMetrics) }}</strong>
                </div>
                <div>
                  <span>执行步数</span>
                  <strong>{{ lastCompletionMetrics.executionSteps }}</strong>
                </div>
              </div>
              <div v-if="chapterMasteryUnlocked" class="finish-chapter-unlock">
                <span class="finish-chapter-label">Chapter Mastery</span>
                <strong>{{ chapterMasteryUnlocked.title }}</strong>
                <p>{{ chapterMasteryUnlocked.message }}</p>
              </div>
              <div v-if="finishLeaderboard.length" class="finish-ranking">
                <div class="finish-ranking-title">本关前 {{ finishLeaderboard.length }} 名</div>
                <div class="lightbot-leaderboard-list compact">
                  <div
                    v-for="(record, index) in finishLeaderboard"
                    :key="`finish-${record.userId}-${record.completedAt}`"
                    class="lightbot-leaderboard-item"
                    :class="{ me: record.userId === currentUserId }"
                  >
                    <span class="rank">{{ index + 1 }}</span>
                    <div class="lightbot-leaderboard-copy">
                      <strong>{{ record.username }}</strong>
                      <span>总代码 {{ record.totalCommands }} · 执行 {{ record.executionSteps }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="finish-actions">
                <button class="hero-btn primary" @click="goToNextLevel">{{ isCustomPlaytest ? 'Back To Editor' : 'Next Level' }}</button>
                <button class="hero-btn" @click="resetLevel(false)">Replay</button>
                <button class="hero-btn" @click="leavePlayScreen">{{ isCustomPlaytest ? 'Leave Test' : 'Level Select' }}</button>
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
                <template v-if="isRepeatOperation(operation)">
                  <div class="repeat-slot">
                    <img :src="operationSprite(operation.body)" :alt="operationLabel(operation)">
                    <span class="repeat-slot-badge">x{{ operation.count }}</span>
                  </div>
                </template>
                <template v-else-if="isConditionalOperation(operation)">
                  <div class="repeat-slot condition-slot">
                    <img :src="operationSprite(operation.body)" :alt="operationLabel(operation)">
                    <span class="repeat-slot-badge condition-slot-badge">IF</span>
                  </div>
                </template>
                <img v-else :src="operationSprite(operation)" :alt="operationLabel(operation)">
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.mainLimit, mainProcedure.length)"
                :key="`main-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </section>

          <section
            v-for="procKey in PROCEDURE_KEYS"
            :key="procKey"
            class="program-panel proc-tone"
            :class="{ disabled: !availableProcedureKeys.includes(procKey), active: activeProcedureKey === procKey }"
          >
            <div class="program-header">
              <span>{{ PROCEDURE_META[procKey].title }}</span>
              <button
                class="tab-btn"
                :class="{ active: activeProcedureKey === procKey }"
                :disabled="!availableProcedureKeys.includes(procKey)"
                @click="activeProcedureKey = procKey"
              >
                Edit
              </button>
            </div>
            <div class="program-grid">
              <button
                v-for="(operation, index) in procedures[procKey]"
                :key="`${procKey}-${index}`"
                class="program-slot filled"
                :class="{ active: runningProcedureKey === procKey && runningOperationIndex === index }"
                :disabled="!availableProcedureKeys.includes(procKey)"
                @click="removeOperation(procKey, index)"
              >
                <template v-if="isRepeatOperation(operation)">
                  <div class="repeat-slot">
                    <img :src="operationSprite(operation.body)" :alt="operationLabel(operation)">
                    <span class="repeat-slot-badge">x{{ operation.count }}</span>
                  </div>
                </template>
                <template v-else-if="isConditionalOperation(operation)">
                  <div class="repeat-slot condition-slot">
                    <img :src="operationSprite(operation.body)" :alt="operationLabel(operation)">
                    <span class="repeat-slot-badge condition-slot-badge">IF</span>
                  </div>
                </template>
                <img v-else :src="operationSprite(operation)" :alt="operationLabel(operation)">
              </button>
              <div
                v-for="slot in emptySlots(currentLevel.procLimits[procKey] || 0, procedures[procKey].length)"
                :key="`${procKey}-empty-${slot}`"
                class="program-slot"
              ></div>
            </div>
          </section>
        </aside>

        <section class="program-tools play-tools">
          <button class="tool-btn" :disabled="isRunning" @click="undoLastOperation">Undo</button>
          <button class="tool-btn" :disabled="isRunning" @click="clearActiveProcedure">Clear Active</button>
          <button class="tool-btn" :disabled="isRunning || !hasCurrentDemo" @click="loadDemoProgram">Load Demo</button>
          <button class="tool-btn" :disabled="isRunning" @click="resetLevel(true)">Clear All</button>
        </section>

        <section v-if="showPlayLeaderboard" class="play-leaderboard play-leaderboard-bottom">
          <div class="play-leaderboard-header">
            <div>
              <p class="screen-kicker">Leaderboard</p>
              <h2>本关排行榜</h2>
            </div>
            <span v-if="levelLeaderboard.length">Top {{ levelLeaderboard.length }}</span>
          </div>

          <div v-if="levelLeaderboard.length" class="lightbot-leaderboard-list compact">
            <div
              v-for="(record, index) in levelLeaderboard"
              :key="`play-${record.userId}-${record.completedAt}`"
              class="lightbot-leaderboard-item"
              :class="{ me: record.userId === currentUserId }"
            >
              <span class="rank">{{ index + 1 }}</span>
              <div class="lightbot-leaderboard-copy">
                <strong>{{ record.username }}</strong>
                <span>总代码 {{ record.totalCommands }} · 执行 {{ record.executionSteps }}</span>
              </div>
              <div class="lightbot-leaderboard-meta">
                <span>MAIN {{ record.mainLength }}</span>
                <span v-if="record.p1Length">P1 {{ record.p1Length }}</span>
                <span v-if="record.p2Length">P2 {{ record.p2Length }}</span>
              </div>
            </div>
          </div>
          <p v-else class="brief-ranking-empty">还没人通关这关，你可以先拿第一。</p>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { LIGHTBOT_LEVEL_GROUPS, LIGHTBOT_LEVELS, VALID_LEVEL_IDS, makeTile } from '../data/lightbotLevels'
import { formatOps, solveLevelProgram } from '../utils/lightbotSolver'
import request from '../utils/request'

const STORAGE_KEY = 'programtools-lightbot-progress-v5'
const EDITOR_DRAFT_STORAGE_KEY = 'programtools-lightbot-editor-draft-v1'
const EDITOR_GRID_SIZE = 6
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
const PROCEDURE_KEYS = ['p1', 'p2']
const PROCEDURE_META = {
  p1: { label: 'P1', title: 'PROC1', editorLabel: 'P1 Slots', commandLabel: 'Call P1' },
  p2: { label: 'P2', title: 'PROC2', editorLabel: 'P2 Slots', commandLabel: 'Call P2' }
}
const CONDITION_TEST_META = {
  'dark-target': { label: 'If Dark', shortLabel: 'IF', description: '仅当脚下是未点亮目标格时执行下一条' }
}
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
const BASE_OPERATION_PALETTE = [
  { id: 'walk', label: 'Walk' },
  { id: 'light', label: 'Light' },
  { id: 'left', label: 'Turn left' },
  { id: 'right', label: 'Turn right' },
  { id: 'jump', label: 'Jump' },
  { id: 'p1', label: 'Call P1' },
  { id: 'p2', label: 'Call P2' },
  { id: 'repeat-2', label: 'Repeat x2', kind: 'repeat', count: 2 },
  { id: 'repeat-3', label: 'Repeat x3', kind: 'repeat', count: 3 },
  { id: 'repeat-4', label: 'Repeat x4', kind: 'repeat', count: 4 }
]

const VALID_OPERATION_IDS = new Set(['walk', 'light', 'left', 'right', 'jump', ...PROCEDURE_KEYS])

function createEmptyProcedures() {
  return Object.fromEntries(PROCEDURE_KEYS.map((key) => [key, []]))
}

function cloneProcedureMap(procedures = {}) {
  return Object.fromEntries(PROCEDURE_KEYS.map((key) => [key, cloneOperationList(procedures[key] || [])]))
}

function procedureLengthLabel(metrics) {
  return [
    'MAIN',
    ...PROCEDURE_KEYS
      .filter((key) => Number(metrics?.[`${key}Length`] || 0) > 0 || Number(currentLevel.value?.procLimits?.[key] || 0) > 0)
      .map((key) => PROCEDURE_META[key].label)
  ].join(' / ')
}

function procedureLengthValue(metrics) {
  return [metrics?.mainLength || 0, ...PROCEDURE_KEYS.filter((key) => Number(metrics?.[`${key}Length`] || 0) > 0 || Number(currentLevel.value?.procLimits?.[key] || 0) > 0)
    .map((key) => metrics?.[`${key}Length`] || 0)].join(' / ')
}

function isRepeatOperation(operation) {
  return Boolean(
    operation
    && typeof operation === 'object'
    && operation.type === 'repeat'
    && typeof operation.body === 'string'
    && VALID_OPERATION_IDS.has(operation.body)
    && Number.isInteger(operation.count)
    && operation.count > 1
  )
}

function isConditionalOperation(operation) {
  return Boolean(
    operation
    && typeof operation === 'object'
    && operation.type === 'condition'
    && typeof operation.body === 'string'
    && VALID_OPERATION_IDS.has(operation.body)
    && typeof operation.test === 'string'
    && CONDITION_TEST_META[operation.test]
  )
}

function isRepeatPaletteOperation(operation) {
  return Boolean(operation?.kind === 'repeat' && Number.isInteger(operation?.count))
}

function isConditionalPaletteOperation(operation) {
  return Boolean(operation?.kind === 'condition' && typeof operation?.test === 'string' && CONDITION_TEST_META[operation.test])
}

function createRepeatOperation(body, count = 2) {
  return {
    type: 'repeat',
    body,
    count: Math.max(2, Math.min(9, Number(count) || 2))
  }
}

function createConditionalOperation(body, test = 'dark-target') {
  return {
    type: 'condition',
    body,
    test: CONDITION_TEST_META[test] ? test : 'dark-target'
  }
}

function normalizeOperationEntry(operation) {
  if (typeof operation === 'string') {
    const normalized = operation.trim()
    return VALID_OPERATION_IDS.has(normalized) ? normalized : null
  }

  if (isRepeatOperation(operation)) {
    return createRepeatOperation(operation.body, operation.count)
  }

  if (isConditionalOperation(operation)) {
    return createConditionalOperation(operation.body, operation.test)
  }

  if (operation && typeof operation === 'object' && operation.type === 'repeat') {
    const body = typeof operation.body === 'string' ? operation.body.trim() : ''
    if (!VALID_OPERATION_IDS.has(body)) return null
    return createRepeatOperation(body, operation.count)
  }

  if (operation && typeof operation === 'object' && operation.type === 'condition') {
    const body = typeof operation.body === 'string' ? operation.body.trim() : ''
    const test = typeof operation.test === 'string' ? operation.test.trim() : ''
    if (!VALID_OPERATION_IDS.has(body) || !CONDITION_TEST_META[test]) return null
    return createConditionalOperation(body, test)
  }

  return null
}

function cloneOperation(operation) {
  const normalized = normalizeOperationEntry(operation)
  if (!normalized) return null
  return isRepeatOperation(normalized) ? { ...normalized } : normalized
}

function cloneOperationList(list = []) {
  if (!Array.isArray(list)) return []
  return list.map((operation) => cloneOperation(operation)).filter(Boolean)
}

function createEmptyEditorBoard(size = EDITOR_GRID_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null))
}

function getStoredLightbotUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem('user_info') || 'null')
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function getLightbotStorageKey(baseKey) {
  const user = getStoredLightbotUser()
  const userKey = user?.id || user?._id || user?.username || 'guest'
  return `${baseKey}:${String(userKey)}`
}

function readLightbotStorage(baseKey) {
  const scopedKey = getLightbotStorageKey(baseKey)
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue !== null) {
    return scopedValue
  }

  const legacyValue = localStorage.getItem(baseKey)
  if (legacyValue !== null) {
    localStorage.setItem(scopedKey, legacyValue)
    return legacyValue
  }

  return null
}

function writeLightbotStorage(baseKey, value) {
  localStorage.setItem(getLightbotStorageKey(baseKey), value)
}

function removeLightbotStorage(baseKey) {
  localStorage.removeItem(getLightbotStorageKey(baseKey))
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

function cloneLevelDefinition(level) {
  return {
    ...level,
    commandOptions: { ...(level.commandOptions || {}) },
    procLimits: { ...(level.procLimits || {}) },
    tips: (level.tips || []).map((tip) => ({ ...tip })),
    board: cloneBoard(level.board),
    start: { ...level.start },
    demo: {
      main: cloneOperationList(level.demo?.main || []),
      p1: cloneOperationList(level.demo?.p1 || []),
      p2: cloneOperationList(level.demo?.p2 || [])
    }
  }
}

function isCustomLevel(level) {
  return Boolean(level?.isCustom)
}

function getLevelAuthorName(level) {
  if (!level) return '系统默认'
  return String(level.createdByName || level.updatedByName || (isCustomLevel(level) ? '未知作者' : '系统默认')).trim() || '系统默认'
}

function getLevelAuthorLabel(level) {
  return `作者：${getLevelAuthorName(level)}`
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return '刚刚'

  const diff = Date.now() - timestamp
  if (diff < 60 * 1000) return '刚刚'

  const minutes = Math.floor(diff / (60 * 1000))
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function findOccupiedBounds(board) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })
  })

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

function normalizeEditorBoard(board, minimumSize = EDITOR_GRID_SIZE) {
  const bounds = findOccupiedBounds(board)
  if (!bounds) {
    return {
      board: createEmptyEditorBoard(minimumSize),
      remapPoint(point) {
        return { ...point }
      }
    }
  }

  const contentWidth = bounds.maxX - bounds.minX + 1
  const contentHeight = bounds.maxY - bounds.minY + 1
  const width = Math.max(minimumSize, contentWidth + 2)
  const height = Math.max(minimumSize, contentHeight + 2)
  const offsetX = Math.floor((width - contentWidth) / 2)
  const offsetY = Math.floor((height - contentHeight) / 2)
  const normalized = Array.from({ length: height }, () => Array.from({ length: width }, () => null))

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const cell = board[y]?.[x] || null
      if (!cell) continue
      normalized[offsetY + y - bounds.minY][offsetX + x - bounds.minX] = { ...cell }
    }
  }

  return {
    board: normalized,
    remapPoint(point) {
      return {
        ...point,
        x: offsetX + point.x - bounds.minX,
        y: offsetY + point.y - bounds.minY
      }
    }
  }
}

function normalizeEditorState(board, start) {
  const normalized = normalizeEditorBoard(board)
  const remappedStart = normalized.remapPoint(start)
  const fallbackStart = findFirstPlatform(normalized.board) || { x: 0, y: 0 }
  const nextStart = normalized.board[remappedStart.y]?.[remappedStart.x]
    ? remappedStart
    : fallbackStart

  return {
    board: normalized.board,
    start: {
      ...start,
      x: nextStart.x,
      y: nextStart.y
    }
  }
}

function findFirstPlatform(board) {
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x]) {
        return { x, y }
      }
    }
  }
  return null
}

function createDefaultEditorDraft() {
  const board = createEmptyEditorBoard()
  board[0][0] = makeTile(1)
  board[0][1] = makeTile(1, true)
  return {
    sourceLevelId: null,
    sourceIsCustom: false,
    sourceCreatedBy: null,
    title: 'My Level',
    skill: 'Custom',
    description: '学员自制关卡。',
    goal: '点亮所有目标格。',
    mainLimit: 8,
    p1Limit: 0,
    p2Limit: 0,
    enableIfDark: false,
    demo: { main: [], p1: [], p2: [] },
    start: { x: 0, y: 0, dir: 'forward' },
    board
  }
}

function serializeEditorDraft(draft) {
  return {
    sourceLevelId: draft.sourceLevelId || null,
    sourceIsCustom: Boolean(draft.sourceIsCustom),
    sourceCreatedBy: Number.isFinite(Number(draft.sourceCreatedBy)) ? Number(draft.sourceCreatedBy) : null,
    chapterId: draft.chapterId || null,
    chapterTitle: draft.chapterTitle || null,
    chapterOrder: Number.isFinite(draft.chapterOrder) ? draft.chapterOrder : null,
    demo: {
      main: cloneOperationList(draft.demo?.main || []),
      p1: cloneOperationList(draft.demo?.p1 || []),
      p2: cloneOperationList(draft.demo?.p2 || [])
    },
    title: draft.title,
    skill: draft.skill,
    description: draft.description,
    goal: draft.goal,
    mainLimit: Number(draft.mainLimit) || 8,
    p1Limit: Number(draft.p1Limit) || 0,
    p2Limit: Number(draft.p2Limit) || 0,
    enableIfDark: Boolean(draft.enableIfDark),
    start: { ...draft.start },
    board: cloneBoard(draft.board)
  }
}

function loadSavedEditorDraft() {
  try {
    const raw = readLightbotStorage(EDITOR_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.board)) return null

    const normalized = normalizeEditorState(parsed.board, parsed.start || { x: 0, y: 0, dir: 'forward' })
    return {
      sourceLevelId: typeof parsed.sourceLevelId === 'string' ? parsed.sourceLevelId : null,
      sourceIsCustom: typeof parsed.sourceLevelId === 'string'
        ? (typeof parsed.sourceIsCustom === 'boolean' ? parsed.sourceIsCustom : !VALID_LEVEL_IDS.has(parsed.sourceLevelId))
        : false,
      sourceCreatedBy: Number.isFinite(Number(parsed.sourceCreatedBy)) ? Number(parsed.sourceCreatedBy) : null,
      chapterId: typeof parsed.chapterId === 'string' ? parsed.chapterId : null,
      chapterTitle: typeof parsed.chapterTitle === 'string' ? parsed.chapterTitle : null,
      chapterOrder: Number.isFinite(parsed.chapterOrder) ? parsed.chapterOrder : null,
      demo: {
        main: cloneOperationList(parsed.demo?.main || []),
        p1: cloneOperationList(parsed.demo?.p1 || []),
        p2: cloneOperationList(parsed.demo?.p2 || [])
      },
      title: typeof parsed.title === 'string' ? parsed.title : 'My Level',
      skill: typeof parsed.skill === 'string' ? parsed.skill : 'Custom',
      description: typeof parsed.description === 'string' ? parsed.description : '学员自制关卡。',
      goal: typeof parsed.goal === 'string' ? parsed.goal : '点亮所有目标格。',
      mainLimit: Number(parsed.mainLimit) || 8,
      p1Limit: Number(parsed.p1Limit) || 0,
      p2Limit: Number(parsed.p2Limit) || 0,
      enableIfDark: Boolean(parsed.enableIfDark || parsed.commandOptions?.ifDark),
      start: { ...normalized.start, dir: parsed.start?.dir || 'forward' },
      board: normalized.board
    }
  } catch {
    return null
  }
}

function createEditorDraftFromLevel(level) {
  const normalized = normalizeEditorBoard(level.board)
  const start = normalized.remapPoint(level.start)

  return {
    sourceLevelId: level.id,
    sourceIsCustom: Boolean(level.isCustom),
    sourceCreatedBy: Number.isFinite(Number(level.createdBy)) ? Number(level.createdBy) : null,
    chapterId: level.chapterId || null,
    chapterTitle: level.chapterTitle || null,
    chapterOrder: Number.isFinite(level.chapterOrder) ? level.chapterOrder : null,
    demo: {
      main: cloneOperationList(level.demo?.main || []),
      p1: cloneOperationList(level.demo?.p1 || []),
      p2: cloneOperationList(level.demo?.p2 || [])
    },
    title: level.title,
    skill: level.skill,
    description: level.description,
    goal: level.goal,
    mainLimit: Number(level.mainLimit) || 8,
    p1Limit: Number(level.procLimits?.p1) || 0,
    p2Limit: Number(level.procLimits?.p2) || 0,
    enableIfDark: Boolean(level.commandOptions?.ifDark),
    start,
    board: normalized.board
  }
}

function applyDraftToEditor(draft) {
  Object.assign(editorDraft, {
    ...draft,
    start: { ...draft.start },
    board: cloneBoard(draft.board)
  })
  editorVerification.value = null
  editorTool.value = 'platform'
  editorHeight.value = 1
}

function buildCustomLevel(draft) {
  return {
    id: draft.sourceLevelId || 'custom-level',
    chapterId: draft.chapterId || 'custom',
    chapterTitle: draft.chapterTitle || '自定义',
    chapterOrder: Number.isFinite(draft.chapterOrder) ? draft.chapterOrder : -1,
    title: draft.title.trim() || 'My Level',
    skill: draft.skill.trim() || 'Custom',
    description: draft.description.trim() || '学员自制关卡。',
    goal: draft.goal.trim() || '点亮所有目标格。',
    mainLimit: Number(draft.mainLimit) || 8,
    procLimits: {
      ...(Number(draft.p1Limit) > 0 ? { p1: Number(draft.p1Limit) } : {}),
      ...(Number(draft.p2Limit) > 0 ? { p2: Number(draft.p2Limit) } : {})
    },
    commandOptions: {
      ...(draft.enableIfDark ? { ifDark: true } : {})
    },
    tips: [
      { title: 'Editor', copy: '这是当前编辑器生成的预览关卡。' },
      { title: 'Playtest', copy: '可以直接进入试玩，验证是否能被正常完成。' }
    ],
    board: cloneBoard(draft.board),
    start: { ...draft.start },
    demo: {
      main: cloneOperationList(draft.demo?.main || []),
      p1: cloneOperationList(draft.demo?.p1 || []),
      p2: cloneOperationList(draft.demo?.p2 || [])
    }
  }
}

const deletedLevelIds = ref([])
const deletedLevelIdSet = computed(() => new Set(deletedLevelIds.value))
const levelOverrides = ref({})
const customLevels = ref([])
const levels = computed(() => {
  const builtInLevels = LIGHTBOT_LEVELS
    .filter((level) => !deletedLevelIdSet.value.has(level.id))
    .map((level) => cloneLevelDefinition(levelOverrides.value[level.id] || level))

  return [...builtInLevels, ...customLevels.value.map((level) => cloneLevelDefinition(level))]
})
const levelGroups = computed(() => {
  const levelById = new Map(levels.value.map((level) => [level.id, level]))

  const builtInGroups = LIGHTBOT_LEVEL_GROUPS.map((group, order) => {
    const visibleLevels = group.levels
      .filter((level) => !deletedLevelIdSet.value.has(level.id))
      .map((level) => levelById.get(level.id) || cloneLevelDefinition(level))

    return {
      ...group,
      order,
      levels: visibleLevels,
      startIndex: visibleLevels.length ? levels.value.findIndex((level) => level.id === visibleLevels[0]?.id) : -1
    }
  }).filter((group) => group.levels.length)

  if (!customLevels.value.length) {
    return builtInGroups
  }

  const customGroupLevels = customLevels.value.map((level) => levelById.get(level.id) || cloneLevelDefinition(level))
  return [
    ...builtInGroups,
    {
      id: 'custom-shared',
      title: '自定义关卡',
      order: builtInGroups.length,
      levels: customGroupLevels,
      startIndex: customGroupLevels.length ? levels.value.findIndex((level) => level.id === customGroupLevels[0]?.id) : -1
    }
  ]
})

function platformKey(x, y) {
  return `${x},${y}`
}

function cloneBot(start) {
  return { x: start.x, y: start.y, dir: start.dir }
}

function loadProgress() {
  try {
    const parsed = JSON.parse(readLightbotStorage(STORAGE_KEY) || '{}')
    return Array.isArray(parsed.completedLevelIds)
      ? parsed.completedLevelIds.filter((levelId) => VALID_LEVEL_IDS.has(levelId))
      : []
  } catch {
    return []
  }
}

function findRecommendedLevelIndex() {
  const completedIds = loadProgress()
  const nextIndex = levels.value.findIndex((level) => !completedIds.includes(level.id))
  return nextIndex >= 0 ? nextIndex : 0
}

function normalizeServerLevelOverrides(items) {
  if (!Array.isArray(items)) {
    return { overrides: {}, customLevels: [], deletedIds: [] }
  }

  const overrides = {}
  const customLevels = []
  const deletedIds = []

  items.forEach((level) => {
    if (!level || typeof level !== 'object' || !level.id) return
    if (level.isDeleted) {
      if (VALID_LEVEL_IDS.has(level.id)) {
        deletedIds.push(level.id)
      }
      return
    }
    if (!Array.isArray(level.board)) return
    if (level.isCustom) {
      customLevels.push(cloneLevelDefinition(level))
      return
    }
    if (!VALID_LEVEL_IDS.has(level.id)) return
    overrides[level.id] = cloneLevelDefinition(level)
  })

  customLevels.sort((a, b) => {
    const aTime = new Date(a.updatedAt || 0).getTime()
    const bTime = new Date(b.updatedAt || 0).getTime()
    return aTime - bTime
  })

  return { overrides, customLevels, deletedIds }
}

async function fetchSharedLevelOverrides() {
  const response = await request.get('/api/lightbot/levels')
  const normalized = normalizeServerLevelOverrides(response?.data)
  levelOverrides.value = normalized.overrides
  customLevels.value = normalized.customLevels
  deletedLevelIds.value = normalized.deletedIds
}

async function fetchLevelLeaderboard(levelId = currentLevel.value.id) {
  if (!levelId || isCustomPlaytest.value) {
    levelLeaderboard.value = []
    return
  }

  try {
    const response = await request.get(`/api/lightbot/levels/${encodeURIComponent(levelId)}/leaderboard`)
    levelLeaderboard.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('Failed to fetch Lightbot leaderboard:', error)
    levelLeaderboard.value = []
  }
}

async function fetchRecentActivity() {
  try {
    const response = await request.get('/api/lightbot/activity?limit=10')
    recentActivity.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('Failed to fetch Lightbot activity:', error)
    recentActivity.value = []
  }
}

async function submitCurrentResult(runToken) {
  if (isCustomPlaytest.value || !currentLevel.value?.id) {
    return
  }

  if (reportedCompletionToken.value === runToken) {
    return
  }

  reportedCompletionToken.value = runToken

  try {
    await request.post(`/api/lightbot/levels/${encodeURIComponent(currentLevel.value.id)}/complete`, lastCompletionMetrics.value || currentProgramMetrics.value)
    await Promise.all([
      fetchLevelLeaderboard(currentLevel.value.id),
      fetchRecentActivity()
    ])
  } catch (error) {
    console.error('Failed to submit Lightbot result:', error)
  }
}

function levelGlobalIndex(group, index) {
  return group.startIndex + index
}

function completedCountForGroup(group) {
  return group.levels.filter((level) => completedLevelIds.value.includes(level.id)).length
}

function findGroupForLevel(levelId) {
  return levelGroups.value.find((group) => group.levels.some((level) => level.id === levelId)) || null
}

function chapterMasteryStatus(group) {
  const completed = completedCountForGroup(group)
  const remaining = Math.max(group.levels.length - completed, 0)
  if (remaining === 0) {
    return group.learningGoals?.length
      ? `已掌握：${group.learningGoals.join(' / ')}`
      : '本章已全部完成'
  }
  return remaining === 1 ? '再完成 1 关即可完成本章' : `再完成 ${remaining} 关即可完成本章`
}

const screen = ref('select')
const selectedLevelIndex = ref(findRecommendedLevelIndex())
const activeProcedureKey = ref('main')
const mainProcedure = ref([])
const procedures = ref(createEmptyProcedures())
const completedLevelIds = ref(loadProgress())
const levelLeaderboard = ref([])
const recentActivity = ref([])
const litKeys = ref([])
const bot = ref(cloneBot((levels.value[0] || LIGHTBOT_LEVELS[0]).start))
const isRunning = ref(false)
const runningProcedureKey = ref('')
const runningOperationIndex = ref(-1)
const runNonce = ref(0)
const runExecutionSteps = ref(0)
const activeRunToken = ref(null)
const reportedCompletionToken = ref(null)
const pendingRepeatCount = ref(null)
const pendingConditionTest = ref(null)
const speedValue = ref(3)
const statusText = ref('Ready')
const statusTone = ref('neutral')
const showFinishPanel = ref(false)
const showPlayLeaderboard = ref(true)
const lastCompletionMetrics = ref(null)
const chapterMasteryUnlocked = ref(null)
const briefSceneHost = ref(null)
const playSceneHost = ref(null)
const editorSceneHost = ref(null)
const activeCustomLevel = ref(null)
const editorTool = ref('platform')
const editorHeight = ref(1)
const editorReturnScreen = ref('select')
const currentUser = ref(getStoredLightbotUser())
const editorDraft = reactive(createDefaultEditorDraft())
const editorBaseDraft = ref(createDefaultEditorDraft())
const editorVerification = ref(null)
let editorPaintActive = false
let editorPaintedKeys = new Set()

let briefSceneController = null
let playSceneController = null
let editorSceneController = null

const currentLevel = computed(() => activeCustomLevel.value || levels.value[selectedLevelIndex.value] || levels.value[0] || LIGHTBOT_LEVELS[0])
const currentLevelSupportsIfDark = computed(() => Boolean(currentLevel.value.commandOptions?.ifDark))
const operationPalette = computed(() => {
  const palette = [...BASE_OPERATION_PALETTE]
  if (currentLevelSupportsIfDark.value) {
    palette.splice(7, 0, { id: 'if-dark', label: 'If Dark', kind: 'condition', test: 'dark-target' })
  }
  return palette
})
const currentLevelGroup = computed(() => findGroupForLevel(currentLevel.value.id))
const isCustomPlaytest = computed(() => Boolean(activeCustomLevel.value))
const currentUserId = computed(() => {
  const raw = currentUser.value?.id ?? currentUser.value?._id
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : null
})
const isAdmin = computed(() => Boolean(currentUser.value && (currentUser.value.role === 'admin' || currentUser.value.priv === -1)))
const hasCurrentDemo = computed(() => {
  const demo = currentLevel.value.demo || { main: [], p1: [], p2: [] }
  return [demo.main, ...PROCEDURE_KEYS.map((key) => demo[key])].reduce((sum, list) => sum + (list?.length || 0), 0) > 0
})
const availableProcedureKeys = computed(() => PROCEDURE_KEYS.filter((key) => Number(currentLevel.value.procLimits?.[key] || 0) > 0))
const directionLabel = computed(() => DIRECTION_LABELS[bot.value.dir])
const robotDirClass = computed(() => `dir-${bot.value.dir}`)
const currentTargetCount = computed(() => targetKeys.value.length)
const currentDemoFeatureText = computed(() => {
  const demo = currentLevel.value.demo || { main: [], p1: [], p2: [] }
  const features = []
  if ([demo.main, demo.p1, demo.p2].some((list) => list?.some((entry) => isRepeatOperation(entry)))) {
    features.push('重复压缩')
  }
  if ([demo.main, demo.p1, demo.p2].some((list) => list?.some((entry) => isConditionalOperation(entry)))) {
    features.push('条件点灯')
  }
  if (demo.p1?.length) {
    features.push('P1 模板')
  }
  if (demo.p2?.length) {
    features.push('P2 分工')
  }
  return features.length ? features.join(' + ') : '基础动作顺序'
})
const briefTeachingFocus = computed(() => {
  if (!currentLevelGroup.value) return currentLevel.value.skill
  return `${currentLevelGroup.value.title} · ${currentLevel.value.skill}`
})
const briefTeachingSummary = computed(() => {
  const goals = currentLevelGroup.value?.learningGoals?.slice(0, 2).join('、')
  const procedureCount = availableProcedureKeys.value.length
  const summaryParts = [`这关需要点亮 ${currentTargetCount.value || 0} 个目标格。`]
  if (goals) {
    summaryParts.push(`它属于本章的 ${goals} 练习段。`)
  }
  if (currentLevelSupportsIfDark.value) {
    summaryParts.push('这关开放了 If Dark 条件块，适合把同一段点灯动作安全地重复使用。')
  }
  if (procedureCount > 0) {
    summaryParts.push(`你已经可以使用 ${procedureCount} 个子程序槽位来整理重复片段。`)
  } else {
    summaryParts.push('先用 MAIN 把路线和转向顺序想清楚。')
  }
  return summaryParts.join(' ')
})
const briefFirstMoveTitle = computed(() => {
  if (currentLevelSupportsIfDark.value) return '先标出会被二次经过的灯'
  if (availableProcedureKeys.value.length >= 2) return '先切块，再决定谁放进 P1 / P2'
  if (availableProcedureKeys.value.length === 1) return '先找会重复出现的动作模板'
  return '先在脑中跑一遍路线'
})
const briefFirstMoveCopy = computed(() => {
  if (currentLevelSupportsIfDark.value) {
    return '先找出哪些灯会被反复踩到。把 If Dark Light 放在这些位置，你就能复用同一段路线，而不用为“第一次点灯”和“第二次经过”分别写两套程序。'
  }
  if (availableProcedureKeys.value.length >= 2) {
    return '先把整条路线按“直走段、转角段、跳跃段”分成几块，再判断哪一块最值得交给 P1 或 P2。这样更容易同时压缩总代码和执行结构。'
  }
  if (availableProcedureKeys.value.length === 1) {
    return '先不要急着往 MAIN 里填满。观察是否有两次以上出现的同一段拐弯或跳跃模板，把它抽成 P1，MAIN 只负责调用顺序。'
  }
  return '从起点朝向出发，先确定第一段需要前进、转向还是跳跃。前 3 到 5 步想清楚以后，后面的路径通常会自然展开。'
})
const briefDemoTitle = computed(() => (hasCurrentDemo.value ? currentDemoFeatureText.value : '先自己试，再决定是否看演示'))
const briefDemoCopy = computed(() => {
  if (!hasCurrentDemo.value) {
    return '这关暂时没有内置 demo。建议先自己尝试一版，再回来看提示卡片里的解题重点。'
  }
  if (currentLevelSupportsIfDark.value) {
    return '看 demo 时重点盯住每一个 If Dark Light 出现的位置。它们通常都落在“这盏灯会被再次经过”的地方，这正是条件块存在的理由。'
  }
  if (availableProcedureKeys.value.length >= 2) {
    return '观察 demo 里 MAIN 负责串联、P1 / P2 负责复用的边界。真正要学的不是照抄顺序，而是为什么这两段值得单独拆出去。'
  }
  if (availableProcedureKeys.value.length === 1) {
    return '看 demo 时重点找“哪一段被重复调用”。如果一眼看不出复用价值，说明你还没有真正抓住本关的压缩点。'
  }
  return '看 demo 时先记住机器人前几步的朝向变化，再对照版面理解为什么要先转、再走、最后点灯。'
})
const currentProgramMetrics = computed(() => {
  const mainLength = mainProcedure.value.length
  const metrics = {
    totalCommands: mainLength,
    mainLength,
    executionSteps: runExecutionSteps.value
  }

  for (const key of PROCEDURE_KEYS) {
    const length = procedures.value[key].length
    metrics[`${key}Length`] = length
    metrics.totalCommands += length
  }

  return {
    ...metrics
  }
})
const editorLevelPreview = computed(() => buildCustomLevel(editorDraft))
const editorSignature = computed(() => JSON.stringify(editorLevelPreview.value))
const editorSolvedProgram = computed(() => editorVerification.value?.solvable ? editorVerification.value.program : null)
const finishLeaderboard = computed(() => levelLeaderboard.value.slice(0, 5))
const editorCanModifySource = computed(() => {
  if (!editorDraft.sourceLevelId) return true
  if (editorDraft.sourceIsCustom) {
    if (isAdmin.value) return true
    if (editorDraft.sourceCreatedBy == null || currentUserId.value == null) return true
    return Number(editorDraft.sourceCreatedBy) === Number(currentUserId.value)
  }
  return isAdmin.value
})
const canDeleteEditorLevel = computed(() => Boolean(editorDraft.sourceLevelId) && editorCanModifySource.value)
const editorDeleteLabel = computed(() => (editorDraft.sourceIsCustom ? '删除自定义关卡' : '删除默认关卡'))
const canSaveEditorLevel = computed(() => {
  return editorCanModifySource.value && Boolean(editorVerification.value?.solvable) && editorVerification.value.signature === editorSignature.value
})
const editorPublishToneClass = computed(() => {
  if (!editorCanModifySource.value) return 'danger'
  if (!editorVerification.value) return 'pending'
  return editorVerification.value.solvable ? 'success' : 'danger'
})
const editorPublishTitle = computed(() => {
  if (!editorCanModifySource.value) return '无权修改此关卡'
  if (!editorVerification.value) return '保存前验证'
  if (!editorDraft.sourceLevelId) return editorVerification.value.solvable ? '可新建关卡' : '当前是新建草稿'
  return editorVerification.value.solvable ? '可保存到游戏' : '验证未通过'
})
const editorPublishMessage = computed(() => {
  if (!editorCanModifySource.value) {
    return editorDraft.sourceIsCustom ? '这个自定义关卡只能由创建者本人或管理员修改。' : '默认关卡只能由管理员修改。'
  }
  if (!editorVerification.value) {
    return '保存到游戏前需要先验证当前草稿能在现有 MAIN / P1 / P2 槽位限制内通关。'
  }
  if (editorVerification.value.signature !== editorSignature.value) {
    return '草稿已经修改，必须重新验证后才能保存到游戏。'
  }
  if (!editorDraft.sourceLevelId) {
    return `${editorVerification.value.message}。点击“保存到游戏”后，会创建一个新的共享关卡，并出现在“自定义关卡”章节里。`
  }
  return `${editorVerification.value.message}。点击“保存到游戏”后，数据库中的共享关卡会被更新，所有人都会看到最新版本。`
})

function isOwnedCustomLevel(level) {
  if (!isCustomLevel(level)) return false
  if (level.createdBy == null || currentUserId.value == null) return false
  return Number(level.createdBy) === Number(currentUserId.value)
}

function canEditLevel(level) {
  if (!level) return true
  return isCustomLevel(level) ? (isAdmin.value || isOwnedCustomLevel(level)) : isAdmin.value
}

function getLevelEditHint(level) {
  if (!level) return '新建自定义关卡'
  if (isCustomLevel(level)) {
    return canEditLevel(level) ? (isOwnedCustomLevel(level) ? '编辑你创建的自定义关卡' : '以管理员身份编辑用户创建的自定义关卡') : '这个自定义关卡只能由创建者本人或管理员编辑'
  }
  return isAdmin.value ? '编辑默认关卡' : '默认关卡只能由管理员编辑'
}

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
  writeLightbotStorage(STORAGE_KEY, JSON.stringify({ completedLevelIds: value }))
}, { deep: true })

watch(levels, (value) => {
  if (!value.length) return
  if (selectedLevelIndex.value >= value.length) {
    selectedLevelIndex.value = value.length - 1
  }
}, { deep: true })

watch(availableProcedureKeys, (value) => {
  if (activeProcedureKey.value !== 'main' && !value.includes(activeProcedureKey.value)) {
    activeProcedureKey.value = 'main'
  }
})

function setStatus(text, tone = 'neutral') {
  statusText.value = text
  statusTone.value = tone
}

function editorCellAt(x, y) {
  return editorDraft.board[y]?.[x] || null
}

function editorCellClass(x, y) {
  const cell = editorCellAt(x, y)
  return {
    filled: Boolean(cell),
    target: Boolean(cell?.target),
    start: editorDraft.start.x === x && editorDraft.start.y === y,
    empty: !cell
  }
}

function resetEditorDraft() {
  applyDraftToEditor(editorBaseDraft.value)
  setStatus('Editor reset')
}

function openEditor(level = null) {
  if (level && !canEditLevel(level)) {
    setStatus(getLevelEditHint(level), 'danger')
    return
  }

  activeCustomLevel.value = null
  editorReturnScreen.value = screen.value === 'brief' ? 'brief' : 'select'
  const nextDraft = level ? createEditorDraftFromLevel(level) : (loadSavedEditorDraft() || createDefaultEditorDraft())
  editorBaseDraft.value = {
    ...nextDraft,
    start: { ...nextDraft.start },
    board: cloneBoard(nextDraft.board)
  }
  applyDraftToEditor(nextDraft)
  screen.value = 'editor'
  setStatus(level ? 'Loaded level into editor' : (loadSavedEditorDraft() ? '已载入保存草稿' : 'Editor ready'))
}

function leaveEditor() {
  activeCustomLevel.value = null
  screen.value = editorReturnScreen.value === 'brief' ? 'brief' : 'select'
}

function saveEditorDraft() {
  const payload = serializeEditorDraft(editorDraft)
  writeLightbotStorage(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(payload))
  setStatus('草稿已保存到当前账号的本地浏览器数据', 'success')
}

function replaceEditorDraft(nextDraft) {
  editorBaseDraft.value = {
    ...nextDraft,
    start: { ...nextDraft.start },
    board: cloneBoard(nextDraft.board)
  }
  applyDraftToEditor(nextDraft)
}

async function deleteEditorData() {
  if (!editorCanModifySource.value) {
    setStatus(editorDraft.sourceIsCustom ? '这个自定义关卡只能由创建者本人或管理员删除' : '默认关卡只能由管理员删除', 'danger')
    return
  }

  if (!editorDraft.sourceLevelId) {
    setStatus('当前草稿还不是正式关卡，无法删除关卡', 'danger')
    return
  }

  if (!window.confirm('删除后，这个关卡会从所有人的章节列表里消失。继续吗？')) {
    return
  }

  try {
    const deletedLevelId = editorDraft.sourceLevelId
    await request.delete(`/api/lightbot/levels/${encodeURIComponent(deletedLevelId)}`)

    const nextOverrides = { ...levelOverrides.value }
    delete nextOverrides[deletedLevelId]
    levelOverrides.value = nextOverrides
    customLevels.value = customLevels.value.filter((level) => level.id !== deletedLevelId)
    if (VALID_LEVEL_IDS.has(deletedLevelId)) {
      deletedLevelIds.value = Array.from(new Set([...deletedLevelIds.value, deletedLevelId]))
    }
    removeLightbotStorage(EDITOR_DRAFT_STORAGE_KEY)

    if (completedLevelIds.value.includes(deletedLevelId)) {
      completedLevelIds.value = completedLevelIds.value.filter((levelId) => levelId !== deletedLevelId)
    }

    selectedLevelIndex.value = Math.min(selectedLevelIndex.value, Math.max(levels.value.length - 1, 0))
    leaveEditor()
    setStatus('关卡已删除，所有人的列表中都不会再显示它', 'success')
  } catch (error) {
    setStatus(error.message || '删除共享关卡失败', 'danger')
  }
}

function applyEditorCell(x, y) {
  const board = cloneBoard(editorDraft.board)
  const currentCell = board[y][x]
  let nextStart = { ...editorDraft.start }

  if (editorTool.value === 'erase') {
    board[y][x] = null
    if (editorDraft.start.x === x && editorDraft.start.y === y) {
      const fallbackStart = findFirstPlatform(board)
      if (fallbackStart) {
        nextStart = { ...nextStart, ...fallbackStart }
      }
    }
  } else if (editorTool.value === 'start') {
    if (!currentCell) {
      board[y][x] = makeTile(editorHeight.value)
    }
    nextStart = { ...nextStart, x, y }
  } else {
    board[y][x] = makeTile(editorHeight.value, editorTool.value === 'target')
  }

  const normalized = normalizeEditorState(board, nextStart)
  editorDraft.board = normalized.board
  editorDraft.start = normalized.start
}

function beginEditorPaint(x, y) {
  editorPaintActive = true
  editorPaintedKeys = new Set()
  continueEditorPaint(x, y)
}

function continueEditorPaint(x, y) {
  if (!editorPaintActive) return

  const key = platformKey(x, y)
  if (editorPaintedKeys.has(key)) return

  editorPaintedKeys.add(key)
  applyEditorCell(x, y)
}

function endEditorPaint() {
  editorPaintActive = false
  editorPaintedKeys.clear()
}

function validateEditorLevel() {
  const level = editorLevelPreview.value
  const cells = level.board.flat().filter(Boolean)
  if (!cells.length) {
    return { ok: false, message: 'Place at least one platform' }
  }
  if (!level.board[level.start.y]?.[level.start.x]) {
    return { ok: false, message: 'Start must be on a platform' }
  }
  if (!cells.some((cell) => cell.target)) {
    return { ok: false, message: 'Add at least one target tile' }
  }
  return { ok: true }
}

function verifyEditorLevelForPublish() {
  const validation = validateEditorLevel()
  if (!validation.ok) {
    editorVerification.value = {
      solvable: false,
      signature: editorSignature.value,
      message: validation.message
    }
    setStatus(validation.message, 'danger')
    return
  }

  const level = editorLevelPreview.value
  if (level.commandOptions?.ifDark) {
    editorVerification.value = {
      solvable: true,
      signature: editorSignature.value,
      program: null,
      message: '已通过基础校验：含条件块的关卡暂不支持自动求解，可手动保存并进入试玩验证'
    }
    setStatus('Conditional level verified for manual publish', 'success')
    return
  }
  const solveResult = solveLevelProgram(level)
  if (!solveResult.solvable) {
    editorVerification.value = {
      solvable: false,
      signature: editorSignature.value,
      message: solveResult.reason
    }
    setStatus(solveResult.reason, 'danger')
    return
  }

  editorVerification.value = {
    solvable: true,
    signature: editorSignature.value,
    program: {
      main: cloneOperationList(solveResult.main),
      p1: cloneOperationList(solveResult.p1),
      p2: cloneOperationList(solveResult.p2)
    },
    message: `已验证通过：最短 ${solveResult.rawLength} 步，MAIN ${solveResult.main.length}/${level.mainLimit}${level.procLimits.p1 ? `，P1 ${solveResult.p1.length}/${level.procLimits.p1}` : ''}${level.procLimits.p2 ? `，P2 ${solveResult.p2.length}/${level.procLimits.p2}` : ''}`
  }
  setStatus('Level verified for publish', 'success')
}

async function saveEditorLevelToGame() {
  if (!editorCanModifySource.value) {
    setStatus(editorDraft.sourceIsCustom ? '这个自定义关卡只能由创建者本人或管理员修改' : '默认关卡只能由管理员修改', 'danger')
    return
  }

  if (!canSaveEditorLevel.value) {
    setStatus('Save blocked: verify current draft first', 'danger')
    return
  }

  const program = editorSolvedProgram.value || { main: [], p1: [], p2: [] }
  const savedLevel = cloneLevelDefinition({
    ...editorLevelPreview.value,
    demo: {
      main: cloneOperationList(program.main),
      p1: cloneOperationList(program.p1),
      p2: cloneOperationList(program.p2)
    }
  })

  try {
    const response = editorDraft.sourceLevelId
      ? await request.put(`/api/lightbot/levels/${encodeURIComponent(savedLevel.id)}`, { level: savedLevel })
      : await request.post('/api/lightbot/levels', { level: savedLevel })
    const sharedLevel = cloneLevelDefinition(response?.data || savedLevel)
    if (sharedLevel.isCustom) {
      customLevels.value = [...customLevels.value.filter((level) => level.id !== sharedLevel.id), sharedLevel]
    } else {
      levelOverrides.value = {
        ...levelOverrides.value,
        [sharedLevel.id]: sharedLevel
      }
    }
    if (sharedLevel.isCustom) {
      Object.assign(editorDraft, createEditorDraftFromLevel(sharedLevel))
    }
    editorDraft.demo = {
      main: cloneOperationList(sharedLevel.demo.main),
      p1: cloneOperationList(sharedLevel.demo.p1),
      p2: cloneOperationList(sharedLevel.demo.p2)
    }
    editorBaseDraft.value = serializeEditorDraft(editorDraft)

    saveEditorDraft()
    setStatus(sharedLevel.isCustom ? '已创建新关卡；所有人现在都能在“自定义关卡”章节看到它' : '已保存到数据库；所有人现在看到的都是这个关卡的最新版本', 'success')
  } catch (error) {
    setStatus(error.message || '保存共享关卡失败', 'danger')
  }
}

function startCustomPlaytest() {
  const validation = validateEditorLevel()
  if (!validation.ok) {
    setStatus(validation.message, 'danger')
    return
  }
  activeCustomLevel.value = editorLevelPreview.value
  resetLevel(true)
  screen.value = 'play'
  setStatus('Custom level ready')
}

function operationLabel(operationId) {
  if (isRepeatOperation(operationId)) {
    return `Repeat x${operationId.count} ${operationLabel(operationId.body)}`
  }

  if (isConditionalOperation(operationId)) {
    return `${CONDITION_TEST_META[operationId.test]?.label || 'If'} ${operationLabel(operationId.body)}`
  }

  if (PROCEDURE_META[operationId]) {
    return PROCEDURE_META[operationId].label
  }

  return {
    walk: 'Walk',
    light: 'Light',
    left: 'Left',
    right: 'Right',
    jump: 'Jump'
  }[operationId] || operationId
}

function operationSprite(operationId) {
  if (isRepeatOperation(operationId)) {
    return operationSprite(operationId.body)
  }

  if (isConditionalOperation(operationId)) {
    return operationSprite(operationId.body)
  }

  if (operationId === 'p1' || operationId === 'p2') {
    return '/lightbot/operation-proc.png'
  }

  return {
    walk: '/lightbot/operation-move.png',
    light: '/lightbot/operation-lamp.png',
    left: '/lightbot/operation-turn-left.png',
    right: '/lightbot/operation-turn-right.png',
    jump: '/lightbot/operation-jump.png'
  }[operationId] || '/lightbot/operation-move.png'
}

function emptySlots(limit, used) {
  return Array.from({ length: Math.max(limit - used, 0) }, (_, index) => index)
}

function resetLevel(clearPrograms = false) {
  runNonce.value += 1
  isRunning.value = false
  activeRunToken.value = null
  reportedCompletionToken.value = null
  pendingRepeatCount.value = null
  pendingConditionTest.value = null
  runExecutionSteps.value = 0
  runningProcedureKey.value = ''
  runningOperationIndex.value = -1
  showFinishPanel.value = false
  lastCompletionMetrics.value = null
  chapterMasteryUnlocked.value = null
  litKeys.value = []
  bot.value = cloneBot(currentLevel.value.start)
  if (clearPrograms) {
    mainProcedure.value = []
    procedures.value = createEmptyProcedures()
    activeProcedureKey.value = 'main'
  }
  setStatus(mainProcedure.value.length ? 'Code reset' : 'Program is empty')
}

function goToLevelSelect() {
  activeCustomLevel.value = null
  screen.value = 'select'
}

function quickStartLevel(index = selectedLevelIndex.value) {
  activeCustomLevel.value = null
  selectedLevelIndex.value = index
  resetLevel(true)
  screen.value = 'play'
  setStatus('Level ready')
}

function openLevelBrief(index) {
  activeCustomLevel.value = null
  selectedLevelIndex.value = index
  resetLevel(true)
  screen.value = 'brief'
}

function startLevel() {
  resetLevel(false)
  screen.value = 'play'
}

function loadDemoProgram() {
  if (!hasCurrentDemo.value) {
    setStatus('No demo for this level', 'danger')
    return
  }
  pendingRepeatCount.value = null
  pendingConditionTest.value = null
  mainProcedure.value = cloneOperationList(currentLevel.value.demo.main)
  procedures.value = cloneProcedureMap(currentLevel.value.demo)
  setStatus('Demo loaded')
}

function loadDemoAndStart() {
  loadDemoProgram()
  startLevel()
}

function appendPaletteOperation(operation) {
  if (isRepeatPaletteOperation(operation)) {
    pendingConditionTest.value = null
    pendingRepeatCount.value = pendingRepeatCount.value === operation.count ? null : operation.count
    setStatus(pendingRepeatCount.value ? `Repeat x${operation.count}: choose next instruction` : 'Repeat cancelled')
    return
  }

  if (isConditionalPaletteOperation(operation)) {
    pendingRepeatCount.value = null
    pendingConditionTest.value = pendingConditionTest.value === operation.test ? null : operation.test
    setStatus(pendingConditionTest.value ? `${CONDITION_TEST_META[operation.test].label}: choose next instruction` : 'Condition cancelled')
    return
  }

  appendOperation(operation.id)
}

function appendOperation(operationId) {
  if (activeProcedureKey.value !== 'main' && !availableProcedureKeys.value.includes(activeProcedureKey.value)) {
    return
  }

  const normalizedOperationId = normalizeOperationEntry(operationId)
  if (!normalizedOperationId || typeof normalizedOperationId !== 'string') {
    pendingRepeatCount.value = null
    pendingConditionTest.value = null
    return
  }

  const isMain = activeProcedureKey.value === 'main'
  const currentList = isMain ? mainProcedure.value : procedures.value[activeProcedureKey.value]
  const limit = isMain ? currentLevel.value.mainLimit : (currentLevel.value.procLimits[activeProcedureKey.value] || 0)
  if (currentList.length >= limit) {
    setStatus('No empty slot left', 'danger')
    return
  }

  const operationToStore = pendingRepeatCount.value
    ? createRepeatOperation(normalizedOperationId, pendingRepeatCount.value)
    : (pendingConditionTest.value ? createConditionalOperation(normalizedOperationId, pendingConditionTest.value) : normalizedOperationId)
  pendingRepeatCount.value = null
  pendingConditionTest.value = null

  if (isMain) {
    mainProcedure.value = [...mainProcedure.value, cloneOperation(operationToStore)]
  } else {
    procedures.value = { ...procedures.value, [activeProcedureKey.value]: [...procedures.value[activeProcedureKey.value], cloneOperation(operationToStore)] }
  }

  setStatus(`${operationLabel(operationToStore)} added`)
}

function removeOperation(procKey, index) {
  if (isRunning.value) return
  if (procKey === 'main') {
    mainProcedure.value = mainProcedure.value.filter((_, itemIndex) => itemIndex !== index)
  } else {
    procedures.value = {
      ...procedures.value,
      [procKey]: procedures.value[procKey].filter((_, itemIndex) => itemIndex !== index)
    }
  }
  setStatus('Operation removed')
}

function undoLastOperation() {
  if (isRunning.value) return
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = mainProcedure.value.slice(0, -1)
  } else {
    procedures.value = { ...procedures.value, [activeProcedureKey.value]: procedures.value[activeProcedureKey.value].slice(0, -1) }
  }
  setStatus('Last operation removed')
}

function clearActiveProcedure() {
  if (isRunning.value) return
  if (activeProcedureKey.value === 'main') {
    mainProcedure.value = []
  } else {
    procedures.value = { ...procedures.value, [activeProcedureKey.value]: [] }
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
  let masteryUnlocked = null
  if (!isCustomPlaytest.value && !completedLevelIds.value.includes(currentLevel.value.id)) {
    const nextCompletedIds = [...completedLevelIds.value, currentLevel.value.id]
    completedLevelIds.value = nextCompletedIds
    const group = findGroupForLevel(currentLevel.value.id)
    if (group && group.levels.every((level) => nextCompletedIds.includes(level.id))) {
      masteryUnlocked = {
        title: `${group.title} 已完成`,
        message: group.learningGoals?.length
          ? `你已经完成本章全部关卡，并掌握了 ${group.learningGoals.join('、')}。`
          : '你已经完成本章全部关卡，可以继续挑战下一章。'
      }
    }
  }
  chapterMasteryUnlocked.value = masteryUnlocked
  lastCompletionMetrics.value = { ...currentProgramMetrics.value }
  showFinishPanel.value = true
  setStatus('Level complete', 'success')
  void submitCurrentResult(activeRunToken.value)
  return true
}

function conditionPasses(test) {
  if (test === 'dark-target') {
    const key = platformKey(bot.value.x, bot.value.y)
    return targetKeys.value.includes(key) && !litKeys.value.includes(key)
  }
  return false
}

function waitStep() {
  return new Promise((resolve) => window.setTimeout(resolve, SPEED_MAP[String(speedValue.value)] || SPEED_MAP[3]))
}

async function executeOperation(operationId, nonce, depth) {
  if (nonce !== runNonce.value) return

  const normalizedOperation = normalizeOperationEntry(operationId)
  if (!normalizedOperation) {
    await waitStep()
    return
  }

  if (isRepeatOperation(normalizedOperation)) {
    for (let iteration = 0; iteration < normalizedOperation.count; iteration += 1) {
      if (nonce !== runNonce.value) return
      runExecutionSteps.value += 1
      await executeOperation(normalizedOperation.body, nonce, depth + 1)
      if (markFinished()) return
    }
    return
  }

  if (isConditionalOperation(normalizedOperation)) {
    if (conditionPasses(normalizedOperation.test)) {
      runExecutionSteps.value += 1
      await executeOperation(normalizedOperation.body, nonce, depth + 1)
      if (markFinished()) return
    } else {
      await waitStep()
    }
    return
  }

  if (normalizedOperation === 'right') {
    rotateRight()
    await waitStep()
    return
  }

  if (normalizedOperation === 'left') {
    rotateLeft()
    await waitStep()
    return
  }

  if (normalizedOperation === 'light') {
    if (!toggleCurrentTarget()) {
      setStatus('Light ignored: no target here', 'danger')
    }
    await waitStep()
    markFinished()
    return
  }

  if (PROCEDURE_KEYS.includes(normalizedOperation)) {
    await runProcedure(normalizedOperation, procedures.value[normalizedOperation], nonce, depth + 1)
    return
  }

  const next = nextPosition()
  const currentPlatform = platformAt(bot.value.x, bot.value.y)
  const nextPlatform = platformAt(next.x, next.y)

  if (!currentPlatform || !nextPlatform) {
    setStatus(`${operationLabel(normalizedOperation)} ignored`, 'danger')
    await waitStep()
    return
  }

  if (normalizedOperation === 'walk') {
    if (currentPlatform.h === nextPlatform.h) {
      bot.value = { ...bot.value, x: next.x, y: next.y }
    } else {
      setStatus('Walk ignored: different height', 'danger')
    }
    await waitStep()
    return
  }

  if (normalizedOperation === 'jump') {
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
    runExecutionSteps.value += 1
    await executeOperation(operations[index], nonce, depth)
    if (markFinished()) return
  }
}

async function runCode() {
  if (!mainProcedure.value.length || isRunning.value) return
  resetLevel(false)
  const nonce = runNonce.value
  activeRunToken.value = nonce
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
  if (isCustomPlaytest.value) {
    activeCustomLevel.value = null
    screen.value = 'editor'
    return
  }
  if (selectedLevelIndex.value < levels.value.length - 1) {
    quickStartLevel(selectedLevelIndex.value + 1)
  } else {
    screen.value = 'select'
  }
}

function leavePlayScreen() {
  if (isCustomPlaytest.value) {
    activeCustomLevel.value = null
    screen.value = 'editor'
    return
  }
  goToLevelSelect()
}

function createSceneController(host, options = {}) {
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
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const interactiveTargets = []

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
    targetCore: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.topLit }),
    editorGhost: new THREE.MeshBasicMaterial({ color: 0x8fb0c4, transparent: true, opacity: 0.18 }),
    editorGhostLine: new THREE.LineBasicMaterial({ color: 0x8ea7bb, transparent: true, opacity: 0.4 }),
    hitArea: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  }

  const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE)
  const outlineGeometry = new THREE.EdgesGeometry(blockGeometry)
  const editorGhostGeometry = new THREE.BoxGeometry(BLOCK_SIZE * 0.94, 0.02, BLOCK_SIZE * 0.94)
  const editorGhostOutline = new THREE.EdgesGeometry(editorGhostGeometry)
  const hitPlaneGeometry = new THREE.PlaneGeometry(BLOCK_SIZE * 0.94, BLOCK_SIZE * 0.94)

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
    if (group === boardGroup) {
      interactiveTargets.length = 0
    }
    group.children.slice().forEach((child) => {
      child.traverse?.((node) => {
        if (!node.geometry) return
        if (
          node.geometry !== blockGeometry &&
          node.geometry !== outlineGeometry &&
          node.geometry !== editorGhostGeometry &&
          node.geometry !== editorGhostOutline &&
          node.geometry !== hitPlaneGeometry
        ) {
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
    const boardHeight = level.board.length
    const boardWidth = Math.max(...level.board.map((row) => row.length), 0)

    level.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return
        tiles.push({ x, y, cell })
      })
    })

    if (!tiles.length && !options.onCellSelect) {
      render()
      return
    }

    const layoutCells = options.onCellSelect
      ? Array.from({ length: boardHeight }, (_, y) => Array.from({ length: boardWidth }, (_, x) => ({ x, y }))).flat()
      : tiles

    const xs = layoutCells.map((item) => item.x * (BLOCK_SIZE + BOARD_GAP))
    const zs = layoutCells.map((item) => item.y * (BLOCK_SIZE + BOARD_GAP))
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

    if (options.onCellSelect) {
      for (let y = 0; y < boardHeight; y += 1) {
        for (let x = 0; x < boardWidth; x += 1) {
          const existingCell = level.board[y]?.[x] || null
          const hitY = (existingCell?.h || 0) * BLOCK_HEIGHT + 0.03

          if (!existingCell) {
            const ghost = new THREE.Mesh(editorGhostGeometry, sharedMaterials.editorGhost)
            ghost.position.set(x * (BLOCK_SIZE + BOARD_GAP), 0.01, y * (BLOCK_SIZE + BOARD_GAP))
            boardGroup.add(ghost)

            const ghostOutline = new THREE.LineSegments(editorGhostOutline, sharedMaterials.editorGhostLine)
            ghostOutline.position.copy(ghost.position)
            boardGroup.add(ghostOutline)
          }

          const hitArea = new THREE.Mesh(hitPlaneGeometry, sharedMaterials.hitArea)
          hitArea.rotation.x = -Math.PI / 2
          hitArea.position.set(x * (BLOCK_SIZE + BOARD_GAP), hitY, y * (BLOCK_SIZE + BOARD_GAP))
          hitArea.userData.editorCell = { x, y }
          boardGroup.add(hitArea)
          interactiveTargets.push(hitArea)
        }
      }
    }

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
        block.userData.editorCell = { x: item.x, y: item.y }
        tileGroup.add(block)
        interactiveTargets.push(block)

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

  function pickEditorCell(event) {
    if (!options.onCellSelect) return null

    if (!options.onCellSelect) return

    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const hit = raycaster.intersectObjects(interactiveTargets, false).find((entry) => entry.object.userData?.editorCell)
    return hit?.object.userData?.editorCell || null
  }

  function handleScenePointerDown(event) {
    if (!options.onCellSelect) return

    const cell = pickEditorCell(event)
    if (!cell) return

    renderer.domElement.setPointerCapture?.(event.pointerId)
    options.onPaintStart?.(cell.x, cell.y)
  }

  function handleScenePointerMove(event) {
    if (!options.onCellSelect || !editorPaintActive) return

    const cell = pickEditorCell(event)
    if (!cell) return

    options.onPaintMove?.(cell.x, cell.y)
  }

  function handleScenePointerUp(event) {
    if (!options.onCellSelect) return

    renderer.domElement.releasePointerCapture?.(event.pointerId)
    options.onPaintEnd?.()
  }

  function handleScenePointerCancel(event) {
    if (!options.onCellSelect) return

    renderer.domElement.releasePointerCapture?.(event.pointerId)
    options.onPaintEnd?.()
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => resize())
    : null

  if (resizeObserver) {
    resizeObserver.observe(host)
  }
  if (options.onCellSelect) {
    renderer.domElement.addEventListener('pointerdown', handleScenePointerDown)
    renderer.domElement.addEventListener('pointermove', handleScenePointerMove)
    renderer.domElement.addEventListener('pointerup', handleScenePointerUp)
    renderer.domElement.addEventListener('pointercancel', handleScenePointerCancel)
  }
  resize()

  return {
    host,
    update,
    resize,
    dispose() {
      resizeObserver?.disconnect()
      if (options.onCellSelect) {
        renderer.domElement.removeEventListener('pointerdown', handleScenePointerDown)
        renderer.domElement.removeEventListener('pointermove', handleScenePointerMove)
        renderer.domElement.removeEventListener('pointerup', handleScenePointerUp)
        renderer.domElement.removeEventListener('pointercancel', handleScenePointerCancel)
      }
      renderer.dispose()
      blockGeometry.dispose()
      outlineGeometry.dispose()
      editorGhostGeometry.dispose()
      editorGhostOutline.dispose()
      hitPlaneGeometry.dispose()
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

  if (screen.value === 'editor' && editorSceneHost.value) {
    if (!editorSceneController) {
      editorSceneController = createSceneController(editorSceneHost.value, {
        onCellSelect: applyEditorCell,
        onPaintStart: beginEditorPaint,
        onPaintMove: continueEditorPaint,
        onPaintEnd: endEditorPaint
      })
    }
    editorSceneController?.update(editorLevelPreview.value, editorLevelPreview.value.start, [])
  } else if (editorSceneController) {
    editorSceneController.dispose()
    editorSceneController = null
  }
}

watch(
  () => [screen.value, currentLevel.value.id, editorSignature.value],
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

watch(editorSignature, () => {
  if (editorVerification.value && editorVerification.value.signature !== editorSignature.value) {
    editorVerification.value = null
  }
  editorSceneController?.update(editorLevelPreview.value, editorLevelPreview.value.start, [])
})

watch(screen, () => {
  endEditorPaint()
})

watch(
  () => [currentLevel.value.id, isCustomPlaytest.value],
  ([levelId, customPlaytest]) => {
    if (customPlaytest) {
      levelLeaderboard.value = []
      return
    }
    void fetchLevelLeaderboard(levelId)
  },
  { immediate: true }
)

onMounted(async () => {
  window.addEventListener('pointerup', endEditorPaint)
  try {
    await fetchSharedLevelOverrides()
    await Promise.all([
      fetchLevelLeaderboard(currentLevel.value.id),
      fetchRecentActivity()
    ])
    if (!activeCustomLevel.value) {
      bot.value = cloneBot(levels.value[selectedLevelIndex.value].start)
    }
  } catch (error) {
    setStatus(error.message || '读取共享关卡失败，已回退到内置关卡', 'danger')
  }
  await nextTick()
  syncSceneControllers()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', endEditorPaint)
  briefSceneController?.dispose()
  playSceneController?.dispose()
  editorSceneController?.dispose()
  briefSceneController = null
  playSceneController = null
  editorSceneController = null
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
  gap: 14px;
}

.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
}

.select-header h1 {
  font-size: 30px;
}

.select-header p:last-child {
  margin: 4px 0 0;
  font-size: 14px;
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.progress-chip {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: #edf5cf;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.activity-strip,
.brief-ranking {
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 16px 32px rgba(103, 126, 157, 0.12);
}

.activity-strip-header,
.brief-ranking-header,
.activity-strip-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.activity-strip-header h2,
.brief-ranking-header h2 {
  margin: 0;
  font-size: 22px;
}

.activity-strip-header span,
.brief-ranking-header span,
.activity-strip-item span,
.brief-ranking-empty {
  color: #617385;
  font-size: 13px;
}

.activity-strip-list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 1fr);
  gap: 12px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.activity-strip-item {
  min-height: 118px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #eef6fb, #ffffff);
  display: grid;
  gap: 8px;
}

.activity-strip-item p,
.brief-ranking-empty {
  margin: 0;
}

.activity-strip-item strong,
.lightbot-leaderboard-copy strong {
  color: #2f4454;
}

.activity-strip-item em {
  font-style: normal;
  color: #7b8d9b;
  font-size: 12px;
}

.chapter-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chapter-group {
  padding: 14px 16px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 16px 32px rgba(103, 126, 157, 0.1);
}

.chapter-group-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.chapter-group-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chapter-group-header h2 {
  margin: 0;
  font-size: 20px;
}

.chapter-summary {
  margin: 0;
  max-width: 700px;
  color: #5d7181;
  font-size: 13px;
  line-height: 1.55;
}

.chapter-group-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.chapter-progress {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eef6ff;
  color: #456176;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.chapter-mastery-text {
  margin: 0;
  max-width: 260px;
  text-align: right;
  color: #617385;
  font-size: 12px;
  line-height: 1.5;
}

.chapter-goals,
.chapter-mechanics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chapter-goal-chip,
.chapter-mechanic-chip {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.chapter-goal-chip {
  background: rgba(107, 184, 151, 0.14);
  color: #3d6a5b;
}

.chapter-mechanic-chip {
  background: rgba(91, 169, 214, 0.14);
  color: #3d6078;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.level-card {
  padding: 14px;
  background: rgba(255, 255, 255, 0.88);
  text-align: left;
}

.level-card strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
}

.level-card p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
}

.level-card-author,
.board-author {
  margin: 8px 0 0;
  color: #6d7f8d;
  font-size: 12px;
  line-height: 1.4;
}

.level-card.current {
  outline: 3px solid #8dc9ef;
}

.level-card.done {
  background: linear-gradient(180deg, #e5f6de, #ffffff);
}

.level-brief-btn {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(91, 169, 214, 0.14);
  color: #3d6078;
  font-size: 11px;
  font-weight: 800;
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
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #66c7dc;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
}

.level-card-tag {
  color: #5e7f98;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.level-card-foot {
  margin-top: 10px;
  font-size: 13px;
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

.brief-teaching-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0 0 24px;
}

.brief-teaching-panel article {
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fff6df, #fffdf5);
  border: 1px solid rgba(210, 184, 120, 0.26);
}

.brief-panel-label {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(214, 164, 75, 0.12);
  color: #8b6220;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.brief-teaching-panel h2 {
  margin: 12px 0 8px;
  font-size: 20px;
}

.brief-teaching-panel p {
  margin: 0;
  color: #5e6e79;
  font-size: 13px;
  line-height: 1.6;
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
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brief-ranking {
  width: 100%;
}

.lightbot-leaderboard-list {
  display: grid;
  gap: 10px;
}

.lightbot-leaderboard-list.compact {
  gap: 8px;
}

.lightbot-leaderboard-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f5f8fb;
}

.lightbot-leaderboard-item.me {
  background: linear-gradient(180deg, #e8f6de, #f8fcf5);
}

.lightbot-leaderboard-item .rank {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #dfeaf5;
  color: #46617a;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.lightbot-leaderboard-item:nth-child(1) .rank {
  background: #f7e7a8;
  color: #735600;
}

.lightbot-leaderboard-item:nth-child(2) .rank {
  background: #e4e9ef;
  color: #526273;
}

.lightbot-leaderboard-item:nth-child(3) .rank {
  background: #f0d7b8;
  color: #7a4f1c;
}

.lightbot-leaderboard-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.lightbot-leaderboard-copy span,
.lightbot-leaderboard-meta span {
  color: #617385;
  font-size: 13px;
}

.lightbot-leaderboard-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.editor-screen {
  min-height: calc(100vh - 104px);
}

.editor-shell {
  display: grid;
  grid-template-columns: minmax(360px, 460px) 1fr;
  gap: 20px;
}

.editor-sidebar,
.editor-preview-pane {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.editor-card {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 60px rgba(103, 126, 157, 0.18);
}

.editor-card.grow {
  flex: 1;
}

.editor-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.editor-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #556675;
  font-size: 13px;
  font-weight: 700;
}

.editor-form-grid label.full-span {
  grid-column: 1 / -1;
}

.editor-form-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #556675;
  font-size: 13px;
  font-weight: 700;
}

.editor-form-toggle.full-span {
  grid-column: 1 / -1;
}

.toggle-check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(94, 117, 137, 0.2);
  background: #f8fbfd;
  color: #334350;
  font-weight: 700;
}

.toggle-check input {
  width: 16px;
  height: 16px;
}

.editor-form-grid input,
.editor-form-grid select {
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(94, 117, 137, 0.2);
  border-radius: 12px;
  background: #f8fbfd;
  color: #334350;
}

.editor-tool-row,
.editor-action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.editor-publish-card {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f3f7fa;
  border: 1px solid rgba(91, 113, 130, 0.16);
}

.editor-publish-card.success {
  background: #edf8ee;
  border-color: rgba(76, 176, 101, 0.28);
}

.editor-publish-card.danger {
  background: #fff2f1;
  border-color: rgba(216, 89, 89, 0.26);
}

.editor-publish-card strong {
  display: block;
  margin-bottom: 6px;
}

.editor-publish-card p {
  margin: 0;
  color: #526575;
  line-height: 1.5;
}

.editor-solution-line {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #324555;
  word-break: break-word;
}

.editor-grid-board {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-grid-hint {
  margin: 14px 0 0;
  color: #6f8190;
  font-size: 13px;
  line-height: 1.5;
}

.editor-grid-row {
  display: grid;
  gap: 8px;
}

.editor-grid-cell {
  position: relative;
  min-height: 52px;
  border-radius: 14px;
  border: 2px dashed rgba(84, 101, 119, 0.22);
  background: rgba(226, 234, 241, 0.45);
  color: #2d3f4d;
  font-weight: 800;
  user-select: none;
}

.editor-grid-cell.filled {
  border-style: solid;
  border-color: rgba(67, 77, 88, 0.54);
  background: linear-gradient(180deg, #666f79, #59616a);
  color: #fff;
}

.editor-grid-cell.target {
  background: linear-gradient(180deg, #246591, #1e4d6f);
}

.editor-grid-cell.start {
  box-shadow: inset 0 0 0 3px #5ccf7a;
}

.editor-grid-cell .cell-height {
  font-size: 18px;
}

.editor-grid-cell .cell-start,
.editor-grid-cell .cell-target {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 12px;
}

.editor-preview-hint {
  color: #6f8190;
  font-size: 13px;
}

.editor-frame {
  min-height: 640px;
}

.tool-btn.selected {
  background: linear-gradient(180deg, #68d16f, #43b653);
  color: #fff;
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
  grid-template-columns: 60px minmax(0, 1fr) 392px;
  gap: 18px;
  align-items: start;
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

.play-context-row,
.play-leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.play-context-row {
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.meta-btn {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #355067;
  font-weight: 800;
  cursor: pointer;
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
  padding: 0;
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  line-height: 0;
}

.run-btn img,
.reset-btn img,
.command-btn img,
.program-slot.filled img {
  width: 28px;
  height: 28px;
  display: block;
  object-fit: contain;
  margin: 0;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
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

.editor-scene-host :deep(canvas) {
  cursor: crosshair;
  touch-action: none;
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

.play-leaderboard {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
}

.play-leaderboard-header h2 {
  margin: 0;
  font-size: 20px;
}

.play-leaderboard-header span {
  color: #617385;
  font-size: 13px;
}

.command-btn {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: linear-gradient(180deg, #eef2f6, #c5ced7);
  box-shadow: inset 0 0 0 3px #58646f, 0 8px 16px rgba(79, 94, 111, 0.14);
  display: grid;
  place-items: center;
  padding: 0;
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  line-height: 0;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.command-btn.active {
  box-shadow: inset 0 0 0 3px #3f9b57, 0 12px 18px rgba(79, 94, 111, 0.2);
}

.repeat-palette-label,
.condition-palette-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #344454;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
}

.condition-palette-label {
  letter-spacing: 0.08em;
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

.play-tools {
  grid-column: 2 / 4;
}

.play-leaderboard-bottom {
  grid-column: 2 / 4;
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
  padding: 0;
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  line-height: 0;
}

.program-slot.filled.active {
  outline: 3px solid #4ec96b;
}

.repeat-slot {
  position: relative;
  width: 100%;
  height: 100%;
}

.repeat-slot-badge {
  position: absolute;
  right: 6px;
  top: 6px;
  min-width: 24px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #2f4355;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
  z-index: 1;
}

.condition-slot-badge {
  background: #6a5317;
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

.finish-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.finish-stats div,
.finish-ranking {
  padding: 12px 14px;
  border-radius: 18px;
  background: #f5f8fb;
}

.finish-stats span,
.finish-ranking-title {
  display: block;
  color: #617385;
  font-size: 12px;
  margin-bottom: 6px;
}

.finish-stats strong {
  color: #2f4454;
  font-size: 18px;
}

.finish-chapter-unlock {
  margin-top: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #e9f7eb, #f8fcf7);
  text-align: left;
}

.finish-chapter-label {
  display: block;
  margin-bottom: 6px;
  color: #4c7a5a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.finish-chapter-unlock strong {
  display: block;
  color: #264535;
  font-size: 20px;
}

.finish-chapter-unlock p {
  margin: 8px 0 0;
  color: #516662;
  font-size: 14px;
  line-height: 1.55;
}

.finish-ranking {
  margin-top: 14px;
  text-align: left;
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
  .play-shell,
  .editor-shell {
    grid-template-columns: 1fr;
  }

  .hud-rail {
    flex-direction: row;
  }

  .level-grid,
  .hero-gallery {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }
}

@media (max-width: 760px) {
  .lightbot-page {
    padding: 8px;
  }

  .screen-play.lightbot-page {
    min-height: calc(100dvh - 80px);
    height: auto;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .screen-play .play-screen {
    min-height: auto;
    height: auto;
  }

  .screen-play .play-shell {
    height: auto;
    gap: 6px;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto;
  }

  .screen-play .hud-rail {
    gap: 6px;
    overflow-x: auto;
  }

  .screen-play .rail-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    font-size: 16px;
    flex: 0 0 auto;
  }

  .screen-play .board-stage {
    min-height: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: visible;
  }

  .screen-play .play-context-row {
    margin-bottom: 6px;
    gap: 6px;
  }

  .screen-play .meta-btn {
    min-height: 30px;
    padding: 0 10px;
    font-size: 11px;
  }

  .screen-play .board-topbar {
    margin-bottom: 0;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .screen-play .board-topbar-copy {
    min-width: 0;
  }

  .screen-play .board-topbar-copy h1 {
    font-size: 18px;
    line-height: 1.05;
  }

  .screen-play .screen-kicker,
  .screen-play .board-author {
    margin: 0;
    font-size: 11px;
  }

  .screen-play .board-topbar-actions {
    margin-left: auto;
    gap: 6px;
    flex: 0 0 auto;
  }

  .screen-play .run-btn,
  .screen-play .reset-btn {
    width: 46px;
    height: 36px;
    border-radius: 11px;
  }

  .screen-play .run-btn img,
  .screen-play .reset-btn img,
  .screen-play .command-btn img,
  .screen-play .program-slot.filled img {
    width: 22px;
    height: 22px;
  }

  .screen-play .scene-frame {
    flex: 0 0 auto;
    min-height: clamp(150px, 24dvh, 210px);
    height: clamp(150px, 24dvh, 210px);
    border-radius: 20px;
  }

  .screen-play .status-float {
    top: 8px;
    right: 8px;
    padding: 5px 7px;
    gap: 5px;
    flex-direction: row;
    align-items: center;
    border-radius: 12px;
  }

  .screen-play .status-float strong {
    font-size: 14px;
  }

  .screen-play .status-float span,
  .screen-play .status-float em {
    font-size: 11px;
  }

  .screen-play .command-bar {
    margin-top: 0;
    padding: 7px;
    gap: 5px;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    border-radius: 14px;
  }

  .screen-play .command-bar::-webkit-scrollbar {
    display: none;
  }

  .screen-play .command-btn {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    flex: 0 0 auto;
  }

  .screen-play .speed-box {
    width: auto;
    margin-left: 2px;
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 11px;
    gap: 5px;
  }

  .screen-play .speed-box input {
    width: 64px;
  }

  .screen-play .program-sidebar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
    max-height: none;
    width: 100%;
    max-width: 100%;
    overflow-x: visible;
    overflow-y: visible;
    align-items: stretch;
    padding-bottom: 2px;
    scrollbar-width: none;
    box-sizing: border-box;
  }

  .screen-play .program-sidebar::-webkit-scrollbar {
    display: none;
  }

  .screen-play .program-panel,
  .screen-play .program-tools {
    min-width: 0;
    height: auto;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .screen-play .program-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    padding: 8px 6px;
    overflow: visible;
  }

  .screen-play .program-header {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    gap: 6px;
    justify-content: space-between;
    align-items: center;
  }

  .screen-play .program-header span {
    font-size: 12px;
    letter-spacing: 0.05em;
    min-width: 0;
  }

  .screen-play .tab-btn {
    min-height: 28px;
    padding: 0 9px;
    font-size: 11px;
    margin-left: auto;
    flex: 0 0 auto;
  }

  .screen-play .program-grid,
  .screen-play .program-grid.big {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 5px;
    min-height: auto;
    overflow-y: visible;
    align-content: start;
    margin-top: 8px;
    padding-right: 0;
  }

  .screen-play .program-slot {
    min-height: 36px;
    border-radius: 10px;
    border-width: 1px;
  }

  .screen-play .program-tools {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
    align-content: start;
    overflow-y: visible;
    padding: 8px;
  }

  .screen-play .play-tools {
    grid-column: auto;
    order: 4;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .screen-play .play-leaderboard-bottom {
    grid-column: auto;
    order: 5;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .screen-play .hud-rail {
    order: 1;
  }

  .screen-play .board-stage {
    order: 2;
  }

  .screen-play .program-sidebar {
    order: 3;
  }

  .screen-play .program-tools .tool-btn {
    min-height: 32px;
    padding: 0 8px;
    font-size: 11px;
  }

  .screen-play .play-leaderboard {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 16px;
  }

  .screen-play .play-leaderboard-header {
    flex-direction: row;
    align-items: center;
  }

  .screen-play .play-leaderboard-header h2 {
    font-size: 16px;
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
  .program-grid.big,
  .editor-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chapter-group {
    padding: 12px;
  }

  .level-card {
    padding: 12px;
  }

  .chapter-group-side {
    align-items: flex-start;
  }

  .chapter-mastery-text {
    max-width: none;
    text-align: left;
  }

  .editor-form-grid label.full-span {
    grid-column: auto;
  }

  .select-header,
  .board-topbar,
  .status-float,
  .brief-meta,
  .activity-strip-header,
  .brief-ranking-header,
  .play-leaderboard-header,
  .program-tools,
  .editor-tool-row,
  .editor-action-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .scene-frame {
    min-height: 420px;
  }

  .activity-strip-list {
    grid-auto-columns: minmax(220px, 78vw);
  }

  .lightbot-leaderboard-item {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .lightbot-leaderboard-meta {
    grid-column: 2;
    justify-content: flex-start;
  }

  .finish-stats {
    grid-template-columns: 1fr;
  }

  .brief-teaching-panel {
    grid-template-columns: 1fr;
  }

  .screen-play .scene-frame {
    min-height: clamp(150px, 24dvh, 210px);
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