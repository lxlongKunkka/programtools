<template>
  <div class="course-sidebar" :class="{ 'edit-active': editMode }">
    <div class="sidebar-header">
      <h3>课程目录</h3>
    </div>

    <div v-if="!treeData || treeData.length === 0" class="loading-text">加载中...</div>
    <div v-else class="tree-nav">
      <div v-for="group in treeData" :key="group.name" class="tree-group">

        <!-- Group node -->
        <div
          class="tree-item group-item"
          :class="{ active: selectedNode && selectedNode.type === 'group' && selectedNode.id === group.name }"
          @click="onGroupClick(group)"
        >
          <span class="tree-icon" @click.stop="group.collapsed = !group.collapsed">{{ group.collapsed ? '▶' : '▼' }}</span>
          <span class="tree-label">{{ group.title || group.name }}</span>
          <span v-if="group.problemCount" class="tree-count-badge">{{ group.problemCount }}题</span>
          <div v-if="editMode && canCreateLevel(group)" class="tree-actions">
            <button class="btn-node-action" title="新建课程" @click.stop="$emit('create-level', group)">+</button>
          </div>
        </div>

        <!-- Levels -->
        <div v-show="!group.collapsed" class="tree-children">
          <div v-for="level in group.levels" :key="level._id" class="tree-level">
            <div
              class="tree-item level-item"
              :class="{ active: selectedNode && selectedNode.type === 'level' && selectedNode.id === level._id }"
              @click="onLevelClick(level)"
            >
              <span class="tree-icon" @click.stop="level.collapsed = !level.collapsed">{{ level.collapsed ? '▶' : '▼' }}</span>
              <span class="tree-label">{{ level.title }}</span>
              <span v-if="level.problemCount" class="tree-count-badge">{{ level.problemCount }}题</span>
              <span v-if="isLevelCompletedFn(level)" class="status-dot completed" title="已完成">●</span>
              <span v-else-if="isLevelUnlockedFn(level)" class="status-dot unlocked" title="进行中">●</span>
              <span v-else class="status-dot locked" title="未解锁">●</span>
              <div v-if="editMode && canCreateLevel(group)" class="tree-actions">
                <button class="btn-node-action" title="在此前插入课程" @click.stop="$emit('insert-level', group, level)">↰</button>
              </div>
              <div v-if="editMode && canEditLevelNode(level)" class="tree-actions">
                <button class="btn-node-action" title="新建知识点" @click.stop="$emit('create-topic', level)">+</button>
              </div>
            </div>

            <!-- Topics -->
            <div v-show="!level.collapsed" class="tree-children">
              <div v-for="topic in level.topics" :key="topic._id" class="tree-topic">
                <div
                  class="tree-item topic-item"
                  :class="{ active: selectedNode && selectedNode.type === 'topic' && selectedNode.id === topic._id }"
                  @click="onTopicClick(topic, level)"
                >
                  <span v-if="editMode" class="tree-icon" @click.stop="toggleTopicInTree(topic)">{{ isTopicExpanded(topic) ? '▼' : '▶' }}</span>
                  <span class="tree-label">{{ topic.title }}</span>
                  <span v-if="topic.problemCount" class="tree-count-badge">{{ topic.problemCount }}题</span>
                  <div v-if="editMode && canEditLevelNode(level)" class="tree-actions">
                    <button class="btn-node-action" title="在此前插入知识点" @click.stop="$emit('insert-topic', level, getTopicIndex(level, topic))">↰</button>
                    <button class="btn-node-action" title="新建章节" @click.stop="$emit('create-chapter', level, topic)">+</button>
                  </div>
                </div>

                <!-- Chapters in edit mode -->
                <div v-if="editMode && isTopicExpanded(topic)" class="tree-children">
                  <div
                    v-for="chapter in (topic.chapters || [])"
                    :key="chapter.id"
                    class="tree-item chapter-item-tree"
                    :class="{ active: editModeNode && editModeNode.type === 'chapter' && (editModeNode.id === chapter._id || editModeNode.id === chapter.id) }"
                    @click.stop="$emit('select-chapter', chapter, level, topic)"
                  >
                    <span class="tree-label">{{ chapter.title }}</span>
                    <div v-if="canEditLevelNode(level)" class="tree-actions">
                      <button
                        class="btn-node-action"
                        title="在此前插入章节"
                        @click.stop="$emit('insert-chapter', level, topic, getChapterIndex(topic, chapter))"
                      >↰</button>
                    </div>
                  </div>
                  <div v-if="!topic.chapters || topic.chapters.length === 0" class="empty-node">无章节</div>
                </div>
              </div>
              <div v-if="!level.topics || level.topics.length === 0" class="empty-node">暂无内容</div>
            </div>
          </div>
          <div v-if="!group.levels || group.levels.length === 0" class="empty-node">暂无课程</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { isLevelCompleted, isLevelUnlocked } from '../../utils/courseUtils'
import { canEditLevel, isTeacherOrAdmin } from '../../utils/permissionUtils'

export default {
  name: 'CourseSidebar',
  props: {
    treeData:     { type: Array,  default: () => [] },
    selectedNode: { type: Object, default: null },
    editMode:     { type: Boolean, default: false },
    editModeNode: { type: Object, default: null },
    userProgress: { type: Object, default: null }
  },
  emits: ['select-group', 'select-level', 'select-topic', 'select-chapter', 'create-level', 'insert-level', 'create-topic', 'insert-topic', 'create-chapter', 'insert-chapter'],
  data() {
    return {
      treeExpandedTopics: {}
    }
  },
  methods: {
    onGroupClick(group) {
      group.collapsed = !group.collapsed
      this.$emit('select-group', group)
    },
    onLevelClick(level) {
      level.collapsed = !level.collapsed
      this.$emit('select-level', level)
    },
    onTopicClick(topic, level) {
      if (this.editMode) {
        this.toggleTopicInTree(topic)
      }
      this.$emit('select-topic', topic, level)
    },
    toggleTopicInTree(topic) {
      this.treeExpandedTopics[topic._id] = !this.isTopicExpanded(topic)
    },
    isTopicExpanded(topic) {
      // Default to collapsed (false) in edit mode
      if (this.treeExpandedTopics[topic._id] === undefined) return false
      return !!this.treeExpandedTopics[topic._id]
    },
    canCreateLevel(group) {
      if (!this.editMode) return false
      if (!isTeacherOrAdmin()) return false
      if (!group) return false
      if (group.editors && group.editors.length > 0) {
        try {
          const user = JSON.parse(localStorage.getItem('user_info') || '{}')
          const uid = user._id || user.uid
          if (!uid) return false
          if (user.role === 'admin') return true
          return group.editors.some(e => {
            const id = typeof e === 'object' ? (e._id || e.id) : e
            return String(id) === String(uid)
          })
        } catch {
          return false
        }
      }
      return true
    },
    canEditLevelNode(level) {
      return this.editMode && canEditLevel(level, this.treeData)
    },
    getChapterIndex(topic, chapter) {
      if (!topic || !topic.chapters) return -1
      return topic.chapters.findIndex(c => c._id === chapter._id || c.id === chapter.id)
    },
    getTopicIndex(level, topic) {
      if (!level || !level.topics) return -1
      return level.topics.findIndex(t => t._id === topic._id)
    },
    isLevelCompletedFn(level) {
      return isLevelCompleted(level, this.userProgress, this.treeData)
    },
    isLevelUnlockedFn(level) {
      return isLevelUnlocked(level, this.userProgress, this.treeData)
    }
  }
}
</script>

<style scoped>
.course-sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.edit-active {
  border-right: 2px solid #6366f1;
}
.edit-active .sidebar-header {
  background: #f0f0ff;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.loading-text { padding: 20px; color: #999; font-size: 14px; }

.tree-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.tree-item {
  padding: 10px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  font-size: 14px;
  color: #34495e;
}
.tree-item:hover { background: #f8f9fa; }
.tree-item.active { background: #e3f2fd; color: #1976d2; font-weight: 500; }

.group-item {
  font-weight: 600;
  font-size: 15px;
  background: #f8fafc;
  border-left: 4px solid #94a3b8;
  margin-bottom: 2px;
}
.group-item.active { background: #e2e8f0; border-left-color: #475569; color: #0f172a; }

.level-item {
  padding-left: 30px;
  border-left: 4px solid #60a5fa;
  background: #fff;
  margin-bottom: 1px;
}
.level-item.active { background: #eff6ff; border-left-color: #2563eb; color: #1e40af; }

.topic-item {
  padding-left: 50px;
  font-size: 13px;
  color: #555;
  border-left: 4px solid #34d399;
  background: #fff;
  margin-bottom: 1px;
}
.topic-item.active { background: #ecfdf5; border-left-color: #059669; color: #065f46; }

.chapter-item-tree {
  padding-left: 64px;
  font-size: 12px;
  color: #888;
  border-left: 3px solid #a78bfa;
  background: #fafafa;
  margin-bottom: 1px;
}
.chapter-item-tree:hover { background: #f5f0ff; color: #6d28d9; }
.chapter-item-tree.active { background: #ede9fe; border-left-color: #7c3aed; color: #5b21b6; font-weight: 600; }

.tree-icon {
  width: 20px;
  text-align: center;
  margin-right: 5px;
  font-size: 12px;
  color: #95a5a6;
}
.tree-label { flex: 1; }

.tree-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.btn-node-action {
  border: 1px solid #dbe3f0;
  background: #fff;
  color: #475569;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
}

.btn-node-action:hover {
  background: #eef2ff;
  color: #3730a3;
  border-color: #c7d2fe;
}

.tree-count-badge {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.status-dot { margin-left: auto; font-size: 10px; }
.status-dot.completed { color: #2ecc71; }
.status-dot.unlocked  { color: #3498db; }
.status-dot.locked    { color: #bdc3c7; }

.tree-children { }
.empty-node {
  padding: 8px 15px;
  color: #bdc3c7;
  font-size: 13px;
  font-style: italic;
}
.tree-children > .empty-node    { padding-left: 45px; }
.tree-children .tree-children > .empty-node { padding-left: 65px; }


</style>
