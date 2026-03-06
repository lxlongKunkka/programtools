<template>
  <div class="content-view level-view">
    <div class="view-header">
      <div class="breadcrumb">
        <span @click="$emit('select-group', level.group)">{{ level.group }}</span> / {{ level.title }}
      </div>
      <div class="view-header-row">
        <h1>{{ level.title }}</h1>
        <button v-if="canEdit" @click="$emit('enter-edit')" class="btn-inline-edit">✏️ 编辑</button>
      </div>
      <div class="level-status">
        <span v-if="isLevelCompletedFn()" class="badge completed">已完成</span>
        <span v-else-if="isLevelUnlockedFn()" class="badge unlocked">进行中</span>
        <span v-else class="badge locked">未解锁</span>
      </div>
    </div>

    <div
      v-if="level.description"
      class="description-box markdown-content"
      v-html="renderMarkdown(level.description)"
    ></div>

    <div class="topics-list">
      <div
        v-for="topic in level.topics"
        :key="topic._id"
        class="topic-card"
        @click="$emit('select-topic', topic, level)"
      >
        <div class="topic-card-header">
          <h3>{{ topic.title }}</h3>
          <div class="topic-stats-group">
            <span class="topic-count" title="已完成章节 / 总章节">
              {{ getTopicProgress(userProgress, topic) }} / {{ (topic.chapters || []).length }} 章节
            </span>
            <span class="topic-count" title="题目总数">{{ getTopicTotalProblems(topic) }} 题</span>
          </div>
        </div>
        <div class="topic-card-desc" v-if="topic.description">{{ stripMarkdown(topic.description) }}</div>
        <div class="topic-chapters-preview">
          <span
            v-for="chapter in (topic.chapters || []).slice(0, 3)"
            :key="chapter.id"
            class="chapter-dot"
            :class="getChapterStatusClass(level, chapter)"
          ></span>
          <span v-if="(topic.chapters || []).length > 3" class="more-dots">...</span>
        </div>
      </div>
    </div>

    <LearnersSection
      v-if="level._id"
      :item-id="level._id"
      item-type="level"
      label="正在学习本等级的同学"
      @view-learner="learner => $emit('view-learner', learner, null)"
    />
  </div>
</template>

<script>
import {
  stripMarkdown, renderMarkdown,
  getTopicProgress, getTopicTotalProblems,
  getChapterStatusClass, isLevelCompleted, isLevelUnlocked
} from '../../utils/courseUtils'
import { canEditLevel } from '../../utils/permissionUtils'
import LearnersSection from './LearnersSection.vue'

export default {
  name: 'LevelView',
  components: { LearnersSection },
  props: {
    level:        { type: Object, required: true },
    userProgress: { type: Object, default: null },
    treeData:     { type: Array,  default: () => [] }
  },
  emits: ['select-topic', 'select-group', 'enter-edit', 'view-learner'],
  computed: {
    canEdit() { return canEditLevel(this.level, this.treeData) }
  },
  methods: {
    stripMarkdown,
    renderMarkdown,
    getTopicProgress,
    getTopicTotalProblems,
    getChapterStatusClass(level, chapter) {
      return getChapterStatusClass(level, chapter, this.userProgress, this.treeData)
    },
    isLevelCompletedFn() { return isLevelCompleted(this.level, this.userProgress, this.treeData) },
    isLevelUnlockedFn()  { return isLevelUnlocked(this.level,  this.userProgress, this.treeData) }
  }
}
</script>

<style scoped>
.view-header { margin-bottom: 30px; }
.view-header-row { display: flex; align-items: center; gap: 12px; }
.view-header-row h1 { margin: 0; }
.view-header h1 { margin: 0 0 10px 0; font-size: 28px; color: #2c3e50; }
.breadcrumb { font-size: 14px; color: #7f8c8d; margin-bottom: 10px; }
.breadcrumb span { cursor: pointer; color: #3498db; }
.breadcrumb span:hover { text-decoration: underline; }

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
}
.btn-inline-edit:hover { background: #4f46e5; }

.level-status { margin-top: 8px; }

.description-box {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 30px;
  color: #555;
  line-height: 1.6;
}

.topics-list { display: flex; flex-direction: column; gap: 15px; }

.topic-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
  border-left: 4px solid #3498db;
}
.topic-card:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.topic-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.topic-card-header h3 { margin: 0; font-size: 18px; color: #2c3e50; }
.topic-stats-group { display: flex; gap: 8px; }
.topic-count {
  font-size: 13px;
  color: #7f8c8d;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 10px;
}
.topic-card-desc { font-size: 14px; color: #666; margin-bottom: 12px; }

.topic-chapters-preview { display: flex; gap: 5px; align-items: center; }
.chapter-dot { width: 10px; height: 10px; border-radius: 50%; background: #eee; }
.chapter-dot.status-completed { background: #2ecc71; }
.chapter-dot.status-unlocked  { background: #3498db; }
.chapter-dot.status-locked    { background: #e0e0e0; }
.more-dots { font-size: 12px; color: #999; }

.badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.badge.completed { background: #eafaf1; color: #2ecc71; }
.badge.unlocked  { background: #ebf5fb; color: #3498db; }
.badge.locked    { background: #f5f5f5; color: #95a5a6; }
</style>
