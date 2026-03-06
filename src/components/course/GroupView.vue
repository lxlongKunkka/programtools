<template>
  <div class="content-view group-view">
    <div class="view-header">
      <div class="view-header-row">
        <h1>{{ group.title || group.name }}</h1>
        <button v-if="canEdit" @click="$emit('enter-edit')" class="btn-inline-edit">✏️ 编辑</button>
      </div>
      <div class="progress-badge" v-if="currentLevelTitle">
        当前进度: {{ currentLevelTitle }}
      </div>
    </div>

    <!-- GESP 知识图谱 (在课程列表上方) -->
    <div v-if="isGespGroup" class="gesp-map-embed">
      <GespMap :embedded="true" />
    </div>

    <div class="levels-grid">
      <div
        v-for="level in group.levels"
        :key="level._id"
        class="level-card-mini"
        @click="$emit('select-level', level)"
      >
        <div class="level-mini-header">
          <h3>{{ level.title }}</h3>
          <span v-if="isLevelCompletedFn(level)" class="badge completed">已完成</span>
          <span v-else-if="isLevelUnlockedFn(level)" class="badge unlocked">进行中</span>
          <span v-else class="badge locked">未解锁</span>
        </div>
        <p class="level-mini-desc" v-if="level.description">{{ stripMarkdown(level.description) }}</p>
        <div class="level-mini-stats">
          {{ level.topics ? level.topics.length : 0 }} 个知识点 · {{ level.problemCount || 0 }} 题
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import {
  stripMarkdown,
  isLevelCompleted, isLevelUnlocked,
  getCurrentSubjectLevel, getLevelTitle
} from '../../utils/courseUtils'
import { isAdmin } from '../../utils/permissionUtils'

const GespMap = defineAsyncComponent(() => import('../../pages/GespMap.vue'))

export default {
  name: 'GroupView',
  components: { GespMap },
  props: {
    group:        { type: Object, required: true },
    userProgress: { type: Object, default: null },
    treeData:     { type: Array,  default: () => [] }
  },
  emits: ['select-level', 'enter-edit'],
  computed: {
    canEdit() { return isAdmin() },
    isGespGroup() {
      const t = (this.group.title || this.group.name || '').toUpperCase()
      return t.includes('GESP')
    },
    currentLevelTitle() {
      if (!this.userProgress) return ''
      const lvl = getCurrentSubjectLevel(this.group.name, this.userProgress, this.treeData)
      return getLevelTitle(this.group.name, lvl, this.treeData) || ('Level ' + lvl)
    }
  },
  methods: {
    stripMarkdown,
    isLevelCompletedFn(level) { return isLevelCompleted(level, this.userProgress, this.treeData) },
    isLevelUnlockedFn(level)  { return isLevelUnlocked(level,  this.userProgress, this.treeData) }
  }
}
</script>

<style scoped>
.view-header { margin-bottom: 30px; }
.view-header-row { display: flex; align-items: center; gap: 12px; }
.view-header-row h1 { margin: 0; }
.view-header h1 { margin: 0 0 10px 0; font-size: 28px; color: #2c3e50; }

.btn-inline-edit {
  flex-shrink: 0;
  padding: 5px 14px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-inline-edit:hover { background: #4f46e5; }

.progress-badge {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
}

.levels-grid { display: flex; flex-direction: column; gap: 20px; }

.level-card-mini {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
}
.level-card-mini:hover {
  transform: translateY(-2px);
  border-color: #3498db;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}
.level-mini-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.level-mini-header h3 { margin: 0; font-size: 18px; color: #2c3e50; }
.level-mini-desc { font-size: 14px; color: #666; margin-bottom: 15px; line-height: 1.6; }
.level-mini-stats {
  font-size: 13px;
  color: #95a5a6;
  text-align: right;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.badge.completed { background: #eafaf1; color: #2ecc71; }
.badge.unlocked  { background: #ebf5fb; color: #3498db; }
.badge.locked    { background: #f5f5f5; color: #95a5a6; }

.gesp-map-embed {
  margin-bottom: 32px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  background: #f7f9fc;
}
</style>
