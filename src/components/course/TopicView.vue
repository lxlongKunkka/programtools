<template>
  <div class="content-view topic-view">
    <div class="view-header">
      <div class="breadcrumb">
        <span @click="$emit('select-group', level.group)">{{ level.group }}</span> /
        <span @click="$emit('select-level', level)">{{ level.title }}</span> /
        {{ topic.title }}
      </div>
      <div class="view-header-row">
        <h1>{{ topic.title }}</h1>
        <button v-if="canEdit" @click="$emit('enter-edit')" class="btn-inline-edit">✏️ 编辑</button>
      </div>
    </div>

    <div
      v-if="topic.description"
      class="description-box markdown-content"
      v-html="renderMarkdown(topic.description)"
    ></div>

    <div class="chapters-grid">
      <div
        v-for="chapter in topic.chapters"
        :key="chapter.id"
        class="chapter-card"
        :class="chapterStatusClass(chapter)"
        @click="onChapterClick(chapter)"
      >
        <div class="chapter-icon">
          <span v-if="isChapterCompletedFn(chapter)">✅</span>
          <span v-else-if="isChapterUnlockedFn(chapter)">🔓</span>
          <span v-else-if="isTeacherOrAdminFn">🔓</span>
          <span v-else>🔒</span>
        </div>
        <div class="chapter-info">
          <h4>
            {{ chapter.title }}
            <span v-if="chapter.optional" class="tag-optional">选做</span>
            <span v-if="chapter.contentType === 'html'" class="tag-type html">HTML</span>
            <span v-else class="tag-type markdown">MD</span>
          </h4>
          <p class="chapter-id">
            Chapter {{ chapter.id }}
            <span v-if="getChapterProblemCount(chapter) > 0"> · {{ getChapterProblemCount(chapter) }} 题</span>
          </p>
        </div>
        <button
          v-if="canEdit"
          class="btn-chapter-edit"
          @click.stop="$emit('enter-edit-chapter', chapter, level, topic)"
          title="编辑章节"
        >✏️</button>
      </div>
    </div>

    <LearnersSection
      v-if="topic._id"
      :item-id="topic._id"
      item-type="topic"
      label="正在学习本课程的同学"
      @view-learner="learner => $emit('view-learner', learner, topic)"
    />
  </div>
</template>

<script>
import {
  renderMarkdown,
  getChapterProblemCount,
  isChapterCompleted, isChapterUnlocked, getChapterStatusClass
} from '../../utils/courseUtils'
import { canEditLevel, isTeacherOrAdmin } from '../../utils/permissionUtils'
import LearnersSection from './LearnersSection.vue'

export default {
  name: 'TopicView',
  components: { LearnersSection },
  props: {
    topic:        { type: Object, required: true },
    level:        { type: Object, required: true },
    userProgress: { type: Object, default: null },
    treeData:     { type: Array,  default: () => [] }
  },
  emits: ['go-to-chapter', 'enter-edit-chapter', 'select-level', 'select-group', 'view-learner', 'enter-edit'],
  computed: {
    canEdit() { return canEditLevel(this.level, this.treeData) },
    isTeacherOrAdminFn() { return isTeacherOrAdmin() }
  },
  methods: {
    renderMarkdown,
    getChapterProblemCount,
    isChapterCompletedFn(chapter) {
      return isChapterCompleted(this.level, chapter, this.userProgress)
    },
    isChapterUnlockedFn(chapter) {
      return isChapterUnlocked(this.level, chapter, this.userProgress, this.treeData)
    },
    chapterStatusClass(chapter) {
      return getChapterStatusClass(this.level, chapter, this.userProgress, this.treeData)
    },
    onChapterClick(chapter) {
      if (this.chapterStatusClass(chapter) !== 'status-locked') {
        this.$emit('go-to-chapter', this.level, chapter)
      }
    }
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

.description-box {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 30px;
  color: #555;
  line-height: 1.6;
}

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.chapter-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}
.chapter-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
.chapter-card.status-completed { border-top: 3px solid #2ecc71; }
.chapter-card.status-unlocked  { border-top: 3px solid #3498db; }
.chapter-card.status-locked    { border-top: 3px solid #bdc3c7; opacity: 0.7; }

.chapter-icon { font-size: 24px; margin-bottom: 10px; }
.chapter-info h4 { margin: 0 0 5px 0; font-size: 15px; color: #2c3e50; }
.chapter-id { font-size: 12px; color: #95a5a6; }

.btn-chapter-edit {
  position: absolute;
  top: 6px;
  right: 6px;
  background: transparent;
  border: none;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 2px 4px;
  border-radius: 4px;
}
.chapter-card:hover .btn-chapter-edit { opacity: 1; }
.btn-chapter-edit:hover { background: #ede9fe; }

.tag-optional {
  font-size: 10px;
  background: #fef3c7;
  color: #92400e;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
}
.tag-type {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
}
.tag-type.html     { background: #fce7f3; color: #9d174d; }
.tag-type.markdown { background: #ede9fe; color: #5b21b6; }
</style>
