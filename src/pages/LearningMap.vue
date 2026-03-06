<template>
  <div class="learning-map-container">
    <!-- Sidebar -->
    <div class="course-sidebar">
      <div class="sidebar-header">
        <h3>{{ editMode ? '课程结构' : '课程目录' }}</h3>
        <button v-if="!editMode && canEdit" @click="enterEditMode" class="btn-edit-mode">✏️ 编辑课程</button>
        <div v-if="editMode" class="edit-header-actions">
          <button v-if="isAdmin" @click="createNewGroup" class="btn-add-level">+ 添加分组</button>
          <button @click="exitEditMode" class="btn-exit-edit"> 退出编辑</button>
        </div>
      </div>

      <div v-if="loading || loadingCourses" class="loading-text">加载中...</div>

      <!-- VIEW MODE TREE -->
      <div v-else-if="!editMode" class="tree-nav">
        <div v-for="group in treeData" :key="group.name" class="tree-group">
          <div class="tree-item group-item"
            :class="{ active: selectedNode && selectedNode.type === 'group' && selectedNode.id === group.name }"
            @click="handleGroupClick(group)">
            <span class="tree-icon" @click.stop="toggleGroup(group)">{{ group.collapsed ? '▶' : '' }}</span>
            <span class="tree-label">{{ group.title || group.name }}</span>
            <span v-if="group.problemCount" class="tree-count-badge">{{ group.problemCount }}题</span>
          </div>
          <div v-show="!group.collapsed" class="tree-children">
            <div v-for="level in group.levels" :key="level._id" class="tree-level">
              <div class="tree-item level-item"
                :class="{ active: selectedNode && selectedNode.type === 'level' && selectedNode.id === level._id }"
                @click="handleLevelClick(level)">
                <span class="tree-icon" @click.stop="toggleLevel(level)">{{ level.collapsed ? '▶' : '' }}</span>
                <span class="tree-label">{{ level.title }}</span>
                <span v-if="level.problemCount" class="tree-count-badge">{{ level.problemCount }}题</span>
                <span v-if="isLevelCompleted(level)" class="status-dot completed"></span>
                <span v-else-if="isLevelUnlocked(level)" class="status-dot unlocked"></span>
                <span v-else class="status-dot locked"></span>
              </div>
              <div v-show="!level.collapsed" class="tree-children">
                <div v-for="topic in level.topics" :key="topic._id" class="tree-topic">
                  <div class="tree-item topic-item"
                    :class="{ active: selectedNode && selectedNode.type === 'topic' && selectedNode.id === topic._id }"
                    @click="selectViewNode('topic', topic, level)">
                    <span class="tree-label">{{ topic.title }}</span>
                    <span v-if="topic.problemCount" class="tree-count-badge">{{ topic.problemCount }}题</span>
                  </div>
                </div>
                <div v-if="!level.topics || level.topics.length === 0" class="empty-node">暂无内容</div>
              </div>
            </div>
            <div v-if="!group.levels || group.levels.length === 0" class="empty-node">暂无课程</div>
          </div>
        </div>
      </div>

      <!-- EDIT MODE TREE -->
      <div v-else class="tree-container">
        <div v-for="group in displayGroups" :key="group.name" class="tree-node-group">
          <div :class="['tree-item','group-item',{active:isSelected('group',group._id||group.name)}]"
            @click="editSelectNode('group',group); toggleGroupCollapse(group)">
            <span class="tree-icon" @click.stop="toggleGroupCollapse(group)">{{ group.collapsed ? '▶' : '' }}</span>
            <span class="tree-label">{{ group.title || group.name }}</span>
            <span v-if="group.problemCount" class="tree-count-badge">{{ group.problemCount }}题</span>
            <div class="tree-actions">
              <button @click.stop="createNewLevel(group)" class="btn-icon" title="添加模块">+</button>
            </div>
          </div>
          <div v-show="!group.collapsed" class="tree-children">
            <div v-for="level in getLevelsForGroup(group.name)" :key="level._id" class="tree-node-level">
              <div :class="['tree-item','level-item',{active:isSelected('level',level._id)}]"
                @click="editSelectNode('level',level); toggleLevelDesc(level)">
                <span class="tree-icon" @click.stop="toggleLevelDesc(level)">{{ level.descCollapsed ? '▶' : '' }}</span>
                <span class="tree-label">{{ level.title }}</span>
                <span v-if="level.problemCount" class="tree-count-badge">{{ level.problemCount }}题</span>
                <div class="tree-actions">
                  <button @click.stop="createNewTopic(level)" class="btn-icon" title="添加Topic">+</button>
                </div>
              </div>
              <div v-show="!level.descCollapsed" class="tree-children">
                <div v-for="(topic,tIdx) in level.topics" :key="topic._id" class="tree-node-topic">
                  <div :class="['tree-item','topic-item',{active:isSelected('topic',topic._id)}]"
                    @click="editSelectNode('topic',topic,level); toggleTopicCollapse(topic)">
                    <span class="tree-icon" @click.stop="toggleTopicCollapse(topic)">{{ topic.collapsed ? '▶' : '' }}</span>
                    <span class="tree-label">{{ topic.title }}</span>
                    <span v-if="topic.problemCount" class="tree-count-badge">{{ topic.problemCount }}题</span>
                    <div class="tree-actions">
                      <button @click.stop="createNewChapter(level,topic)" class="btn-icon" title="添加章节">+</button>
                      <button @click.stop="createNewTopic(level,tIdx)" class="btn-icon" title="在前插入">↰</button>
                    </div>
                  </div>
                  <div v-show="!topic.collapsed" class="tree-children">
                    <div v-for="(chapter,cIdx) in topic.chapters" :key="chapter.id"
                      :class="['tree-item','chapter-item',{active:isSelected('chapter',chapter._id||chapter.id)}]"
                      @click="editSelectNode('chapter',chapter,level,topic)">
                      <span class="tree-label">{{ chapter.title }}</span>
                      <div class="tree-meta">
                        <span class="meta-badge" :class="chapter.contentType==='html'?'badge-html':'badge-md'">{{ chapter.contentType==='html'?'HTML':'MD' }}</span>
                      </div>
                      <div class="tree-actions">
                        <button @click.stop="createNewChapter(level,topic,cIdx)" class="btn-icon" title="在前插入">↰</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!level.topics||level.topics.length===0" class="empty-node">无Topic</div>
              </div>
            </div>
            <div v-if="getLevelsForGroup(group.name).length===0" class="empty-node">无模块</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== RIGHT CONTENT AREA ===== -->
    <div class="course-content">

      <!-- VIEW MODE CONTENT -->
      <template v-if="!editMode">

        <!-- Empty state -->
        <div v-if="!selectedNode" class="empty-state">
          <p>请从左侧选择一个节点开始学习</p>
        </div>

        <!-- GROUP VIEW -->
        <div v-else-if="selectedNode.type === 'group'" class="group-view">
          <div class="view-header">
            <div class="breadcrumb">{{ selectedNode.title }}</div>
            <h1>{{ selectedNode.title }}</h1>
            <div v-if="selectedData && selectedData.description" class="description-box" v-html="renderMarkdown(selectedData.description)"></div>
          </div>
          <div class="levels-grid">
            <div v-for="level in (selectedData ? selectedData.levels : [])" :key="level._id"
              class="level-card-mini" @click="handleLevelClick(level)">
              <div class="level-mini-header">
                <h3>{{ level.title }}</h3>
                <span :class="['badge', isLevelCompleted(level) ? 'completed' : isLevelUnlocked(level) ? 'unlocked' : 'locked']">
                  {{ isLevelCompleted(level) ? '已完成' : isLevelUnlocked(level) ? '学习中' : '未解锁' }}
                </span>
              </div>
              <div v-if="level.description" class="level-mini-desc">{{ stripMarkdown(level.description).slice(0,80) }}...</div>
              <div class="level-mini-stats">{{ (level.topics||[]).length }} 个专题</div>
            </div>
          </div>
          <div class="learners-section">
            <div class="learners-header" @click="toggleGroupLearners(selectedNode)">
              <span>▶</span><span>学习此路线的学员 ({{ levelLearners.length }})</span>
            </div>
            <div v-if="selectedNode.learnersExpanded" class="learners-grid">
              <div v-for="l in levelLearners" :key="l.uid" class="learner-card" @click="showLearnerDetail(l, 'group')">
                <div class="learner-avatar">{{ (l.uname||'??')[0] }}</div>
                <div><div class="learner-name">{{ l.uname }}</div></div>
              </div>
              <div v-if="!levelLearners.length" class="no-learners">暂无学员</div>
            </div>
          </div>
        </div>

        <!-- LEVEL VIEW -->
        <div v-else-if="selectedNode.type === 'level'" class="level-view">
          <div class="view-header">
            <div class="breadcrumb">
              <span @click="handleGroupClick(selectedNode.group)">{{ selectedNode.groupTitle }}</span> / {{ selectedNode.title }}
            </div>
            <h1>{{ selectedNode.title }}</h1>
            <div v-if="selectedData && selectedData.description" class="description-box" v-html="renderMarkdown(selectedData.description)"></div>
          </div>
          <div class="topics-list">
            <div v-for="topic in (selectedData ? selectedData.topics : [])" :key="topic._id"
              class="topic-card" @click="selectViewNode({type:'topic', _id:topic._id, title:topic.title, level:selectedData, group:selectedNode.group, groupTitle:selectedNode.groupTitle})">
              <div class="topic-card-header">
                <h3>{{ topic.title }}</h3>
                <div class="topic-stats-group">
                  <span class="topic-count">{{ (topic.chapters||[]).length }} 章</span>
                  <span :class="['badge', getTopicProgress(topic).pct>=100?'completed':getTopicProgress(topic).pct>0?'unlocked':'locked']">
                    {{ getTopicProgress(topic).pct }}%
                  </span>
                </div>
              </div>
              <div v-if="topic.description" class="topic-card-desc">{{ stripMarkdown(topic.description).slice(0,100) }}</div>
              <div class="topic-chapters-preview">
                <div v-for="(ch,ci) in (topic.chapters||[]).slice(0,8)" :key="ci"
                  :class="['chapter-dot', 'status-'+getChapterStatusClass(ch)]"></div>
                <span v-if="(topic.chapters||[]).length>8" class="more-dots">+{{ (topic.chapters||[]).length-8 }}</span>
              </div>
            </div>
          </div>
          <div class="learners-section">
            <div class="learners-header" @click="toggleLevelLearners(selectedData)">
              <span>▶</span><span>学习此模块的学员 ({{ topicLearners.length }})</span>
            </div>
            <div v-if="selectedData && selectedData.learnersExpanded" class="learners-grid">
              <div v-for="l in topicLearners" :key="l.uid" class="learner-card" @click="showLearnerDetail(l, 'level')">
                <div class="learner-avatar">{{ (l.uname||'??')[0] }}</div>
                <div><div class="learner-name">{{ l.uname }}</div></div>
              </div>
              <div v-if="!topicLearners.length" class="no-learners">暂无学员</div>
            </div>
          </div>
        </div>

        <!-- TOPIC VIEW -->
        <div v-else-if="selectedNode.type === 'topic'" class="topic-view">
          <div class="view-header">
            <div class="breadcrumb">
              <span @click="handleGroupClick(selectedNode.group)">{{ selectedNode.groupTitle }}</span> /
              <span @click="handleLevelClick(selectedNode.level)">{{ selectedNode.level ? selectedNode.level.title : '' }}</span> /
              {{ selectedNode.title }}
            </div>
            <h1>{{ selectedNode.title }}</h1>
            <div v-if="selectedData && selectedData.description" class="description-box" v-html="renderMarkdown(selectedData.description)"></div>
          </div>
          <div class="chapters-grid">
            <div v-for="chapter in (selectedData ? selectedData.chapters : [])" :key="chapter._id||chapter.id"
              :class="['chapter-card', 'status-'+getChapterStatusClass(chapter)]"
              @click="goToChapter(chapter, selectedNode)">
              <div class="chapter-icon">
                {{ getChapterStatusClass(chapter)=='completed' ? '✅' : getChapterStatusClass(chapter)=='unlocked' ? '📖' : '🔒' }}
              </div>
              <div class="chapter-info">
                <h4>{{ chapter.title }}<span v-if="chapter.optional" class="tag-optional">选</span></h4>
                <p class="chapter-id">{{ chapter.id }}</p>
              </div>
            </div>
          </div>
        </div>

      </template>
      <!-- END VIEW MODE -->


      <!-- ===== EDIT MODE ===== -->
      <template v-if="editMode">
        <div v-if="!editSelectedNode" class="empty-state">
          <p>??????????????<span v-if="isAdmin">????"????"??</span></p>
        </div>

        <!-- Group Editor -->
        <div v-else-if="editSelectedNode.type==='group'" class="editor-form">
          <div class="editor-header">
            <h2>{{ editingGroup._id ? '????' : '????' }}</h2>
            <div class="header-actions" v-if="canEditGroup(editingGroup)">
              <div v-if="editingGroup._id" class="move-actions">
                <button @click="moveGroup('up')" class="btn-small"> ??</button>
                <button @click="moveGroup('down')" class="btn-small"> ??</button>
              </div>
              <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="btn-delete">??</button>
              <button @click="saveGroup" class="btn-save" :disabled="isSaving">??</button>
            </div>
          </div>
          <div class="form-group">
            <label>????(ID):</label>
            <input v-model="editingGroup.name" class="form-input" :disabled="!!editingGroup._id||!canEditGroup(editingGroup)">
          </div>
          <div class="form-group">
            <label>????:</label>
            <input v-model="editingGroup.title" class="form-input" :disabled="!canEditGroup(editingGroup)">
          </div>
          <div class="form-group">
            <label>????:</label>
            <select v-model="editingGroup.language" class="form-input" :disabled="!canEditGroup(editingGroup)">
              <option v-for="lang in languageOptions" :key="lang" :value="lang">{{ lang }}</option>
            </select>
          </div>
          <div class="form-group" v-if="isAdmin">
            <label>???????:</label>
            <div class="checkbox-list" v-if="teachers.length>0">
              <label v-for="teacher in teachers" :key="teacher._id" class="checkbox-item">
                <input type="checkbox" :value="teacher._id" v-model="editingGroup.editors"> {{ teacher.uname }}
              </label>
            </div>
          </div>
        </div>

        <!-- Level Editor -->
        <div v-else-if="editSelectedNode.type==='level'" class="editor-form">
          <div class="editor-header">
            <h2>{{ editingLevel._id ? '??????' : '??????' }}</h2>
            <div class="header-actions" v-if="canEditLevel(editingLevel)">
              <div v-if="editingLevel._id" class="move-actions">
                <button @click="moveLevel('up')" class="btn-small"> ??</button>
                <button @click="moveLevel('down')" class="btn-small"> ??</button>
              </div>
              <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="btn-delete">??</button>
              <button @click="saveLevel" class="btn-save" :disabled="isSaving">??</button>
            </div>
          </div>
          <div class="form-group"><label>????:</label><input v-model="editingLevel.group" class="form-input" disabled></div>
          <div class="form-group"><label>??:</label><input v-model="editingLevel.title" class="form-input"></div>
          <div class="ai-assistant-box">
            <div class="ai-header"><h3>?? AI ????</h3></div>
            <div class="ai-controls" :class="{disabled:currentAiLoading}">
              <select v-model="selectedModel" class="model-select">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <button @click="batchGenerateLevelLessonPlans" class="btn-ai" :disabled="currentAiLoading">?? ????????</button>
              <button @click="batchGenerateLevelPPTs" class="btn-ai" :disabled="currentAiLoading">?? ??????PPT</button>
              <button @click="batchGenerateLevelSolutionReports" class="btn-ai" :disabled="currentAiLoading">?? ????????</button>
            </div>
          </div>
          <div class="form-group">
            <label>??(Markdown):</label>
            <div class="split-view">
              <textarea v-model="editingLevel.description" class="form-input" rows="10"></textarea>
              <div class="preview-box markdown-content" v-html="renderMarkdown(editingLevel.description)"></div>
            </div>
          </div>
          <div class="form-group" v-if="isAdmin">
            <label>???????(???):</label>
            <div class="checkbox-list" v-if="teachers.length>0">
              <label v-for="teacher in teachers" :key="teacher._id" class="checkbox-item">
                <input type="checkbox" :value="teacher._id" v-model="editingLevel.editors"> {{ teacher.uname }}
              </label>
            </div>
          </div>
        </div>

        <!-- Topic Editor -->
        <div v-else-if="editSelectedNode.type==='topic'" class="editor-form">
          <div class="editor-header">
            <h2>{{ editingTopic._id ? '?????' : '?????' }}</h2>
            <div class="header-actions">
              <select v-model="selectedModel" class="model-select">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <div v-if="editingTopic._id" class="move-actions">
                <button @click="moveTopic('up')" class="btn-small"> ??</button>
                <button @click="moveTopic('down')" class="btn-small"> ??</button>
              </div>
              <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id,editingTopic._id)" class="btn-delete">??</button>
              <button @click="saveTopic" class="btn-save" :disabled="isSaving">??</button>
            </div>
          </div>
          <div class="form-group"><label>??:</label><input v-model="editingTopic.title" class="form-input"></div>
          <div class="ai-assistant-box">
            <div class="ai-header">
              <h3>?? AI ????</h3>
              <span v-if="currentAiLoading" class="ai-status">{{ currentAiStatus }}</span>
            </div>
            <div class="ai-controls" :class="{disabled:currentAiLoading}">
              <button @click="generateTopicDescription" class="btn-ai" :disabled="currentAiLoading">?? ????</button>
              <button @click="generateTopicChapters" class="btn-ai" :disabled="currentAiLoading">?? ??????</button>
              <button @click="batchGenerateLessonPlans" class="btn-ai" :disabled="currentAiLoading">?? ????</button>
              <button @click="batchGeneratePPTs" class="btn-ai" :disabled="currentAiLoading">?? ??PPT</button>
              <button @click="batchGenerateSolutionPlans" class="btn-ai" :disabled="currentAiLoading">?? ??????</button>
              <button @click="batchGenerateSolutionReports" class="btn-ai" :disabled="currentAiLoading">?? ????PPT</button>
            </div>
          </div>
          <div class="form-group">
            <label>??(Markdown):</label>
            <div class="split-view">
              <textarea v-model="editingTopic.description" class="form-input" rows="10"></textarea>
              <div class="preview-box markdown-content" v-html="renderMarkdown(editingTopic.description)"></div>
            </div>
          </div>
        </div>

        <!-- Chapter Editor -->
        <div v-else-if="editSelectedNode.type==='chapter'" class="editor-form">
          <div class="editor-header">
            <h2>{{ editingChapter.isNew ? '????' : '????' }}</h2>
            <div class="header-actions">
              <select v-model="selectedModel" class="model-select">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <div v-if="!editingChapter.isNew" class="move-actions">
                <button @click="moveChapter('up')" class="btn-small"> ??</button>
                <button @click="moveChapter('down')" class="btn-small"> ??</button>
              </div>
              <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id,editingTopicForChapter._id,editingChapter._id||editingChapter.id)" class="btn-delete">??</button>
              <button @click="saveChapter" class="btn-save" :disabled="isSaving">??</button>
            </div>
          </div>
          <div class="ai-assistant-box">
            <div class="ai-header">
              <h3>?? AI ????</h3>
              <span v-if="currentAiLoading" class="ai-status">{{ currentAiStatus }}</span>
            </div>
            <div class="ai-controls" :class="{disabled:currentAiLoading}">
              <input v-model="aiRequirements" placeholder="????..." class="form-input ai-input">
              <div class="ai-buttons">
                <button @click="generateLessonPlan" class="btn-ai" :disabled="currentAiLoading">?? ????</button>
                <button @click="generatePPT" class="btn-ai" :disabled="currentAiLoading">?? ??PPT</button>
                <button @click="generateSolutionPlan" class="btn-ai" :disabled="currentAiLoading">?? ????</button>
                <button @click="generateSolutionReport" class="btn-ai" :disabled="currentAiLoading">?? ??PPT</button>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half"><label>Chapter ID:</label><input v-model="editingChapter.id" class="form-input" disabled></div>
            <div class="form-group half"><label>??:</label><input v-model="editingChapter.title" class="form-input"></div>
          </div>
          <div class="form-group">
            <label>????:</label>
            <select v-model="editingChapter.contentType" class="form-input">
              <option value="markdown">Markdown</option>
              <option value="html">HTML??(Iframe)</option>
            </select>
          </div>
          <div class="form-group">
            <div class="label-row">
              <label>??:</label>
              <div v-if="editingChapter.contentType==='html'">
                <button @click="openInNewWindow" class="btn-small">?????</button>
                <button @click="showPreview=!showPreview" class="btn-small">{{ showPreview?'????':'????' }}</button>
              </div>
            </div>
            <div v-if="editingChapter.contentType==='markdown'" class="split-view" style="height:700px">
              <textarea v-model="editingChapter.content" class="form-input code-font" style="height:100%"></textarea>
              <div class="preview-box markdown-content" style="height:100%" v-html="renderMarkdown(editingChapter.content)"></div>
            </div>
            <div v-if="editingChapter.contentType==='html'">
              <input v-if="!showPreview" v-model="editingChapter.resourceUrl" class="form-input" placeholder="/public/courseware/xxx.html">
              <div v-if="showPreview" class="preview-container-large">
                <iframe :src="getPreviewUrl(editingChapter.resourceUrl)" class="preview-iframe"></iframe>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>????ID(????):</label>
            <input v-model="editingChapter.problemIdsStr" class="form-input" placeholder="??: system:1001,1002">
            <div v-if="problemLinks && problemLinks.length>0" class="problem-links-preview">
              <a v-for="(link,idx) in problemLinks" :key="idx" :href="link.url" target="_blank" class="problem-link-tag">{{ link.text }} </a>
            </div>
          </div>
          <div class="form-group">
            <label>????ID(????):</label>
            <input v-model="editingChapter.optionalProblemIdsStr" class="form-input">
          </div>
          <div class="form-group checkbox-group">
            <label><input type="checkbox" v-model="editingChapter.optional"> ????</label>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Learner Progress Modal -->
  <div v-if="showLearnerModal" class="modal-overlay" @click.self="closeLearnerModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ selectedLearner ? selectedLearner.uname : '' }} ?????</h3>
        <button class="btn-close" @click="closeLearnerModal"></button>
      </div>
      <div class="modal-body">
        <div v-if="loadingLearnerProgress" class="loading">???...</div>
        <div v-else-if="selectedLearnerProgress" class="progress-details">
          <div class="progress-stat-card" v-for="(level,idx) in learnerActiveLevels" :key="idx">
            <h4>{{ level.group }} - {{ level.title }}</h4>
            <div class="modal-topics-list">
              <div v-for="(topic,tIdx) in level.topics" :key="tIdx" class="stat-topic-item">
                <div class="stat-topic-header">
                  <span class="stat-topic-title">{{ topic.title }}</span>
                  <span class="stat-topic-pct">{{ topic.percentage }}%</span>
                </div>
                <div class="stat-topic-bar"><div class="stat-topic-fill" :style="{width:topic.percentage+'%'}"></div></div>
                <div class="stat-topic-detail">??? {{ topic.completed }} / {{ topic.total }} ??</div>
              </div>
            </div>
          </div>
          <div class="progress-stat-card"><h4>??????</h4><div class="stat-value">{{ selectedLearnerProgress.completedChaptersCount }}</div></div>
        </div>
        <div v-else class="error">????????</div>
      </div>
    </div>
  </div>
</template>

<script>
import { request } from '../utils/request.js'
import { marked } from 'marked'
import MarkdownViewer from '../components/MarkdownViewer.vue'
import { SUBJECTS_CONFIG, getRealSubject, filterLevels } from '../utils/courseConfig'
import { getModels } from '../utils/models'
import { io } from 'socket.io-client'
import JSZip from 'jszip'

export default {
  name: 'LearningMap',
  components: { MarkdownViewer },
  inject: ['showToastMessage'],
  data() {
    let currentUser = null
    try { currentUser = JSON.parse(localStorage.getItem('user_info') || 'null') } catch(e) {}
    return {
      // ===== VIEW MODE state =====
      treeData: [],
      userProgress: null,
      loading: true,
      selectedNode: null,
      selectedData: null,
      selectedLevel: null,
      expandedGroupIds: [],
      expandedLevelIds: [],
      expandedLearnerIds: [],
      topicLearners: {},
      levelLearners: {},
      loadingLearners: {},
      showLearnerModal: false,
      selectedLearner: null,
      selectedLearnerProgress: null,
      selectedLearnerTopic: null,
      loadingLearnerProgress: false,

      // ===== EDIT MODE state =====
      editMode: false,
      user: currentUser,
      socket: null,
      teachers: [],
      editLevels: [],
      editGroups: [],
      loadingCourses: false,
      editSelectedNode: null,
      editingGroup: {},
      editingLevel: {},
      editingTopic: {},
      editingChapter: {},
      editingLevelForTopic: null,
      editingLevelForChapter: null,
      editingTopicForChapter: null,
      showPreview: false,
      aiRequirements: '',
      aiLoadingMap: {},
      aiStatusMap: {},
      selectedModel: '',
      rawModelOptions: [],
      isSelecting: false,
      isSaving: false,
      languageOptions: ['C++', 'Python', 'Java', 'C', 'JavaScript'],
    }
  },
  computed: {
    canEdit() {
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return u.role === 'admin' || u.role === 'teacher'
      } catch { return false }
    },
    isAdmin() {
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return u.role === 'admin'
      } catch { return false }
    },
    isPremium() {
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return u.role === 'admin' || u.role === 'teacher' || u.isPremium
      } catch { return false }
    },
    displayGroups() {
      return this.editGroups
    },
    modelOptions() {
      return this.rawModelOptions.map(m => ({ id: m.id || m.name, name: m.name || m.id }))
    },
    currentAiLoading() {
      if (!this.editSelectedNode) return false
      return !!this.aiLoadingMap[this.editSelectedNode.id]
    },
    currentAiStatus() {
      if (!this.editSelectedNode) return ''
      return this.aiStatusMap[this.editSelectedNode.id] || ''
    },
    problemLinks() {
      if (!this.editingChapter || !this.editingChapter.problemIdsStr) return []
      return this.editingChapter.problemIdsStr.split(/[,\uff0c]/).map(s => s.trim()).filter(s => s).map(id => {
        let domainId = 'system', docId = id
        if (id.includes(':')) { [domainId, docId] = id.split(':') }
        return { text: id, url: `/${domainId}/p/${docId}` }
      })
    },
    optionalProblemLinks() {
      if (!this.editingChapter || !this.editingChapter.optionalProblemIdsStr) return []
      return this.editingChapter.optionalProblemIdsStr.split(/[,\uff0c]/).map(s => s.trim()).filter(s => s).map(id => {
        let domainId = 'system', docId = id
        if (id.includes(':')) { [domainId, docId] = id.split(':') }
        return { text: id, url: `/${domainId}/p/${docId}` }
      })
    },
    learnerActiveLevels() {
      if (!this.selectedLearnerProgress || !this.treeData) return []
      const progress = this.selectedLearnerProgress
      const completedChapterIds = new Set(progress.completedChapters || [])
      const completedChapterUids = new Set(progress.completedChapterUids || [])
      const unlockedChapterIds = new Set(progress.unlockedChapters || [])
      const unlockedChapterUids = new Set(progress.unlockedChapterUids || [])
      const isChapterDone = (c) => (c._id && completedChapterUids.has(c._id)) || completedChapterIds.has(c.id)
      const isChapterUnlocked = (c) => (c._id && unlockedChapterUids.has(c._id)) || unlockedChapterIds.has(c.id)
      const activeLevels = []
      this.treeData.forEach(group => {
        if (!group.levels) return
        group.levels.forEach(level => {
          const levelData = { title: level.title, group: group.name, levelNum: level.level, topics: [] }
          let levelHasProgress = false
          if (level.topics && level.topics.length > 0) {
            level.topics.forEach(topic => {
              const totalChapters = topic.chapters ? topic.chapters.length : 0
              if (totalChapters === 0) return
              let completedCount = 0
              topic.chapters.forEach(c => { if (isChapterDone(c)) completedCount++ })
              if (completedCount > 0) {
                levelHasProgress = true
                levelData.topics.push({ title: topic.title, completed: completedCount, total: totalChapters, percentage: Math.round((completedCount/totalChapters)*100) })
              }
            })
          }
          if (levelHasProgress) activeLevels.push(levelData)
        })
      })
      return activeLevels
    }
  },
  watch: {
    selectedNode(newVal) {
      if (newVal) localStorage.setItem('learning_map_last_node', JSON.stringify(newVal))
    }
  },
  mounted() {
    this.fetchData()
  },
  beforeUnmount() {
    this.disconnectSocket()
    document.removeEventListener('keydown', this._ctrlSHandler)
  },

  methods: {
    // ===== VIEW MODE methods =====
    async fetchData() {
      this.loading = true
      try {
        const [groupsData, levelsData, progressData] = await Promise.all([
          request('/api/course/groups'),
          request('/api/course/levels'),
          request('/api/course/progress')
        ])
        this.userProgress = progressData
        this.buildTree(groupsData, levelsData)
        this.restoreSelection()
      } catch(e) {
        console.error('Failed to fetch course data', e)
      } finally {
        this.loading = false
      }
    },
    buildTree(groups, levels) {
      const groupMap = {}
      groups.forEach(g => { groupMap[g.name] = { ...g, levels: [], collapsed: true, problemCount: 0 } })
      levels.forEach(l => {
        const levelData = { ...l, collapsed: true, problemCount: 0, topics: (l.topics||[]).map(t=>({...t,problemCount:0})) }
        if (l.group && groupMap[l.group]) {
          groupMap[l.group].levels.push(levelData)
        } else {
          const key = l.group || 'C++??'
          if (!groupMap[key]) groupMap[key] = { name: key, title: key, levels: [], collapsed: true, order: 999 }
          groupMap[key].levels.push(levelData)
        }
      })
      this.treeData = Object.values(groupMap).sort((a,b) => (a.order||0)-(b.order||0))
      this.treeData.forEach(g => {
        g.levels.sort((a,b) => a.level - b.level)
        let groupCount = 0
        g.levels.forEach(l => {
          let levelCount = 0
          if (l.topics) l.topics.forEach(t => {
            let topicCount = 0
            if (t.chapters) t.chapters.forEach(c => {
              topicCount += (c.problemIds ? c.problemIds.length : 0) + (c.optionalProblemIds ? c.optionalProblemIds.length : 0)
            })
            t.problemCount = topicCount
            levelCount += topicCount
          })
          l.problemCount = levelCount
          groupCount += levelCount
        })
        g.problemCount = groupCount
      })
    },
    restoreSelection() {
      const saved = localStorage.getItem('learning_map_last_node')
      if (saved) {
        try {
          const node = JSON.parse(saved)
          if (node.type === 'group') {
            const group = this.treeData.find(g => g.name === node.id)
            if (group) { this.selectViewNode('group', group); return }
          } else if (node.type === 'level') {
            for (const g of this.treeData) {
              const l = g.levels.find(lvl => lvl._id === node.id)
              if (l) { g.collapsed = false; this.selectViewNode('level', l); return }
            }
          } else if (node.type === 'topic') {
            for (const g of this.treeData) {
              for (const l of g.levels) {
                const t = l.topics.find(top => top._id === node.id)
                if (t) { g.collapsed = false; l.collapsed = false; this.selectViewNode('topic', t, l); return }
              }
            }
          }
        } catch(e) {}
      }
      if (!this.selectedNode && this.treeData.length > 0) this.selectViewNode('group', this.treeData[0])
    },
    selectViewNode(type, data, parentLevel = null) {
      this.selectedNode = { type, id: data._id || data.name }
      this.selectedData = data
      if (type === 'topic') this.selectedLevel = parentLevel
      if (type === 'group') data.collapsed = false
    },
    handleGroupClick(group) { group.collapsed = !group.collapsed; this.selectViewNode('group', group) },
    handleLevelClick(level) { level.collapsed = !level.collapsed; this.selectViewNode('level', level) },
    toggleGroup(group) { group.collapsed = !group.collapsed },
    toggleLevel(level) { level.collapsed = !level.collapsed },
    findGroup(groupName) { return this.treeData.find(g => g.name === groupName) },
    stripMarkdown(text) {
      if (!text) return ''
      return text.replace(/[#*]/g, '').slice(0, 100) + (text.length > 100 ? '...' : '')
    },
    renderMarkdown(text) {
      if (!text) return ''
      try { return marked.parse(text, { breaks: true, mangle: false, headerIds: false }) } catch(e) { return text }
    },
    getCurrentSubjectLevel(subjectName) {
      if (!this.userProgress) return 1
      const realSubject = getRealSubject(subjectName)
      if (this.userProgress.subjectLevels && this.userProgress.subjectLevels[realSubject]) return this.userProgress.subjectLevels[realSubject]
      if (realSubject === 'C++') return this.userProgress.currentLevel || 1
      return 1
    },
    getLevelTitle(subject, levelNum) {
      let group = this.treeData.find(g => g.name === subject)
      if (group) { const level = group.levels.find(l => l.level === levelNum); if (level) return level.title }
      for (const g of this.treeData) {
        const level = g.levels.find(l => l.level === levelNum && (l.subject === subject || (!l.subject && subject === 'C++')))
        if (level) return level.title
      }
      return ''
    },
    isLevelUnlocked(level) {
      if (!this.userProgress) return false
      return (level.level||level.levelId) <= this.getCurrentSubjectLevel(level.group)
    },
    isLevelCompleted(level) {
      if (!this.userProgress) return false
      let chapters = []
      if (level.topics && level.topics.length > 0) level.topics.forEach(t => { if (t.chapters) chapters.push(...t.chapters) })
      else if (level.chapters) chapters = level.chapters
      if (chapters.length > 0) {
        const required = chapters.filter(c => !c.optional)
        if (required.length > 0) return required.every(c => this.isChapterCompleted(level, c))
      }
      return (level.level||level.levelId) < this.getCurrentSubjectLevel(level.group)
    },
    isChapterUnlocked(level, chapter) {
      if (!this.userProgress) return false
      const lvl = level.level || level.levelId
      if (lvl < this.getCurrentSubjectLevel(level.group)) return true
      if (this.userProgress.unlockedChapterUids && chapter._id) return this.userProgress.unlockedChapterUids.includes(chapter._id)
      return this.userProgress.unlockedChapters.includes(chapter.id)
    },
    isChapterCompleted(level, chapter) {
      if (!this.userProgress) return false
      if (this.userProgress.completedChapterUids && chapter._id) return this.userProgress.completedChapterUids.includes(chapter._id)
      return this.userProgress.completedChapters.includes(chapter.id)
    },
    getChapterStatusClass(level, chapter) {
      if (this.isChapterCompleted(level, chapter)) return 'status-completed'
      if (this.isChapterUnlocked(level, chapter)) return 'status-unlocked'
      if (this.isTeacherOrAdmin()) return 'status-unlocked'
      return 'status-locked'
    },
    getChapterProblemCount(chapter) {
      return (chapter.problemIds ? chapter.problemIds.length : 0) + (chapter.optionalProblemIds ? chapter.optionalProblemIds.length : 0)
    },
    getTopicTotalProblems(topic) {
      if (!topic || !topic.chapters) return 0
      return topic.chapters.reduce((sum, ch) => sum + this.getChapterProblemCount(ch), 0)
    },
    getTopicProgress(progress, topic) {
      if (!progress || !topic || !topic.chapters) return 0
      let completedCount = 0
      const completedIds = progress.completedChapters || []
      const completedUids = progress.completedChapterUids || []
      topic.chapters.forEach(chapter => {
        if ((chapter._id && completedUids.includes(chapter._id)) || completedIds.includes(chapter.id)) completedCount++
      })
      return completedCount
    },
    goToChapter(level, chapter) {
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
      const isTA = userInfo.role === 'teacher' || userInfo.role === 'admin'
      if (!isTA && !this.isChapterUnlocked(level, chapter) && !this.isChapterCompleted(level, chapter)) return
      if (level.group) localStorage.setItem('selected_subject', level.group)
      this.$router.push({ path: '/course', query: { lid: level._id } })
    },
    isTeacherOrAdmin() {
      const u = JSON.parse(localStorage.getItem('user_info') || '{}')
      return u.role === 'teacher' || u.role === 'admin'
    },
    toggleLearners(topic) {
      const id = topic._id
      const index = this.expandedLearnerIds.indexOf(id)
      if (index > -1) this.expandedLearnerIds.splice(index, 1)
      else { this.expandedLearnerIds.push(id); if (!this.topicLearners[id]) this.fetchTopicLearners(id) }
    },
    isLearnersExpanded(topic) { return this.expandedLearnerIds.includes(topic._id) },
    async fetchTopicLearners(topicId) {
      this.loadingLearners[topicId] = true
      try { const users = await request('/api/course/topic/'+topicId+'/learners'); this.topicLearners[topicId] = users }
      catch(e) { console.error(e) } finally { this.loadingLearners[topicId] = false }
    },
    toggleLevelLearners(level) {
      const id = level._id
      const index = this.expandedLearnerIds.indexOf(id)
      if (index > -1) this.expandedLearnerIds.splice(index, 1)
      else { this.expandedLearnerIds.push(id); if (!this.levelLearners[id]) this.fetchLevelLearners(id) }
    },
    isLevelLearnersExpanded(level) { return this.expandedLearnerIds.includes(level._id) },
    async fetchLevelLearners(levelId) {
      this.loadingLearners[levelId] = true
      try { const users = await request('/api/course/level/'+levelId+'/learners'); this.levelLearners[levelId] = users }
      catch(e) { console.error(e) } finally { this.loadingLearners[levelId] = false }
    },
    async viewLearnerProgress(user, topic) {
      this.selectedLearner = user; this.selectedLearnerTopic = topic
      this.showLearnerModal = true; this.loadingLearnerProgress = true; this.selectedLearnerProgress = null
      try { this.selectedLearnerProgress = await request('/api/course/progress/'+user._id) }
      catch(e) { console.error(e) } finally { this.loadingLearnerProgress = false }
    },
    closeLearnerModal() {
      this.showLearnerModal = false; this.selectedLearner = null
      this.selectedLearnerProgress = null; this.selectedLearnerTopic = null
    },

    // ===== EDIT MODE methods =====
    enterEditMode() {
      this.editMode = true
      this.fetchEditData()
      this.fetchTeachers()
      this.fetchModels()
      this.connectSocket()
      this._ctrlSHandler = (e) => { if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); this.handleCtrlS() } }
      document.addEventListener('keydown', this._ctrlSHandler)
    },
    exitEditMode() {
      this.editMode = false
      this.disconnectSocket()
      document.removeEventListener('keydown', this._ctrlSHandler)
      this.editSelectedNode = null
      this.fetchData()
    },
    handleCtrlS() {
      if (!this.editSelectedNode) return
      const t = this.editSelectedNode.type
      if (t==='group') this.saveGroup()
      else if (t==='level') this.saveLevel()
      else if (t==='topic') this.saveTopic()
      else if (t==='chapter') this.saveChapter()
    },
    connectSocket() {
      if (this.socket) return
      const token = localStorage.getItem('auth_token')
      this.socket = io('/', { auth: { token } })
      this.socket.on('task:progress', (data) => {
        if (data.clientKey) {
          this.aiStatusMap[data.clientKey] = data.status || '???...'
          if (!this.aiLoadingMap[data.clientKey]) this.aiLoadingMap[data.clientKey] = true
        }
      })
      this.socket.on('task:complete', (data) => {
        if (data.clientKey) {
          this.aiLoadingMap[data.clientKey] = false
          this.aiStatusMap[data.clientKey] = ''
          if (data.chapterId) this.fetchChapterContent(data.chapterId, true)
          else if (data.topicId) this.fetchEditData()
          this.showToastMessage('AI ?????')
        }
      })
      this.socket.on('task:error', (data) => {
        if (data.clientKey) { this.aiLoadingMap[data.clientKey] = false; this.aiStatusMap[data.clientKey] = '' }
        this.showToastMessage('AI ????: ' + (data.error || '????'))
      })
    },
    disconnectSocket() {
      if (this.socket) { this.socket.disconnect(); this.socket = null }
    },
    async fetchModels() {
      try { const models = await getModels(); this.rawModelOptions = models; if (models.length>0 && !this.selectedModel) this.selectedModel = models[0].id||models[0].name }
      catch(e) { console.error(e) }
    },
    async fetchTeachers() {
      if (!this.isAdmin) return
      try { const res = await request('/api/admin/users?role=teacher&limit=1000'); this.teachers = res.users||[] }
      catch(e) { console.error(e) }
    },
    async fetchEditData() {
      this.loadingCourses = true
      try {
        const [groups, levels] = await Promise.all([request('/api/course/groups'), request('/api/course/levels')])
        this.editGroups = groups.map(g => ({ ...g, collapsed: false, problemCount: 0 }))
        this.editLevels = levels.map(l => ({
          ...l, descCollapsed: false, problemCount: 0,
          topics: (l.topics||[]).map(t => ({ ...t, collapsed: false, problemCount: 0 }))
        }))
        this.editLevels.forEach(l => {
          let lCount = 0
          if (l.topics) l.topics.forEach(t => {
            let tCount = 0
            if (t.chapters) t.chapters.forEach(c => { tCount += (c.problemIds?c.problemIds.length:0)+(c.optionalProblemIds?c.optionalProblemIds.length:0) })
            t.problemCount = tCount; lCount += tCount
          })
          l.problemCount = lCount
        })
        this.editGroups.forEach(g => {
          const gLevels = this.editLevels.filter(l => l.group===g.name)
          g.problemCount = gLevels.reduce((sum,l) => sum+(l.problemCount||0), 0)
        })
        this.restoreTreeState()
        if (this.editSelectedNode) this.rebindSelection()
      } catch(e) { this.showToastMessage('????: '+e.message) }
      finally { this.loadingCourses = false }
    },
    fetchLevels() { this.fetchEditData() },
    getLevelsForGroup(groupName) { return this.editLevels.filter(l => l.group===groupName) },
    canEditGroup(group) {
      if (!group) return false
      if (this.isAdmin) return true
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return group.editors && group.editors.includes(u._id)
      } catch { return false }
    },
    canEditLevel(level) {
      if (!level) return false
      if (this.isAdmin) return true
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        if (level.editors && level.editors.includes(u._id)) return true
        const group = this.editGroups.find(g => g.name===level.group)
        return group && group.editors && group.editors.includes(u._id)
      } catch { return false }
    },
    isExplicitEditor(group) {
      if (this.isAdmin) return false
      try {
        const u = JSON.parse(localStorage.getItem('user_info') || '{}')
        return group.editors && group.editors.includes(u._id)
      } catch { return false }
    },
    isSelected(type, id) { return this.editSelectedNode && this.editSelectedNode.type===type && this.editSelectedNode.id===id },
    editSelectNode(type, data, parentLevel = null, parentTopic = null) {
      if (this.isSelecting) return
      this.isSelecting = true
      const id = type==='group' ? (data._id||data.name) : (data._id||data.id)
      this.editSelectedNode = { type, id, data }
      if (type==='group') {
        this.editingGroup = { ...data, editors: [...(data.editors||[])] }
      } else if (type==='level') {
        this.editingLevel = { ...data }
        this.editingLevelForTopic = null
      } else if (type==='topic') {
        this.editingTopic = { ...data }
        this.editingLevelForTopic = parentLevel
      } else if (type==='chapter') {
        const problemIdsStr = (data.problemIds||[]).map(x=>typeof x==='object'?x.docId||x.id:x).join(', ')
        const optionalProblemIdsStr = (data.optionalProblemIds||[]).map(x=>typeof x==='object'?x.docId||x.id:x).join(', ')
        this.editingChapter = { ...data, problemIdsStr, optionalProblemIdsStr, optional:!!data.optional, contentType:data.contentType||'markdown', resourceUrl:data.resourceUrl||'', isNew:!!data.isNew, content:data.content||'' }
        this.editingLevelForChapter = parentLevel
        this.editingTopicForChapter = parentTopic
        if (!data.isNew && !data.content) this.fetchChapterContent(data.id||data._id)
      }
      this.$nextTick(() => { this.isSelecting = false })
    },
    rebindSelection() {
      if (!this.editSelectedNode) return
      const { type, id } = this.editSelectedNode
      if (type==='group') {
        const g = this.editGroups.find(g => (g._id&&g._id===id)||g.name===id)
        if (g) this.editSelectNode('group', g)
      } else if (type==='level') {
        const l = this.editLevels.find(l => l._id===id)
        if (l) this.editSelectNode('level', l)
      } else if (type==='topic') {
        for (const l of this.editLevels) {
          if (l.topics) { const t = l.topics.find(t => t._id===id); if (t) { this.editSelectNode('topic',t,l); return } }
        }
      } else if (type==='chapter') {
        for (const l of this.editLevels) {
          if (l.topics) for (const t of l.topics) {
            if (t.chapters) { const c = t.chapters.find(c => c.id===id||c._id===id); if (c) { this.editSelectNode('chapter',c,l,t); return } }
          }
        }
      }
    },
    toggleGroupCollapse(group) { group.collapsed = !group.collapsed; this.saveTreeState() },
    toggleLevelDesc(level) { level.descCollapsed = !level.descCollapsed; this.saveTreeState() },
    toggleTopicCollapse(topic) { topic.collapsed = !topic.collapsed; this.saveTreeState() },
    saveTreeState() {
      const state = {
        groups: this.editGroups.filter(g=>g.collapsed).map(g=>g._id||g.name),
        levels: this.editLevels.filter(l=>l.descCollapsed).map(l=>l._id),
        topics: []
      }
      this.editLevels.forEach(l => { if (l.topics) l.topics.forEach(t => { if (t.collapsed) state.topics.push(t._id) }) })
      localStorage.setItem('design_tree_collapsed_state', JSON.stringify(state))
    },
    restoreTreeState() {
      try {
        const raw = localStorage.getItem('design_tree_collapsed_state')
        if (!raw) return
        const state = JSON.parse(raw)
        if (state.groups) { const s = new Set(state.groups); this.editGroups.forEach(g => { if (s.has(g._id)||s.has(g.name)) g.collapsed=true }) }
        if (state.levels) { const s = new Set(state.levels); this.editLevels.forEach(l => { if (s.has(l._id)) l.descCollapsed=true }) }
        if (state.topics) { const s = new Set(state.topics); this.editLevels.forEach(l => { if (l.topics) l.topics.forEach(t => { if (s.has(t._id)) t.collapsed=true }) }) }
      } catch(e) { console.error(e) }
    },
    createNewGroup() {
      this.editSelectNode('group', { name:'???', title:'???', language:'C++', editors:[], _id:null })
    },
    createNewLevel(group) {
      const gLevels = this.getLevelsForGroup(group.name)
      const nextLevel = gLevels.length>0 ? Math.max(...gLevels.map(l=>l.level||0))+1 : 1
      this.editSelectNode('level', { level:nextLevel, title:'?????', description:'', subject:group.language||'C++', group:group.name, _id:null })
    },
    createNewTopic(level, insertIndex=-1) {
      level.descCollapsed = false
      this.editSelectNode('topic', { title:'????', description:'', _id:null, _insertIndex:insertIndex }, level)
    },
    createNewChapter(level, topic, insertIndex=-1) {
      topic.collapsed = false
      const nextIndex = (topic.chapters?topic.chapters.length:0)+1
      const nextId = level.level+'-'+nextIndex+'-'+Date.now()
      const defaultContent = '### ?????\n\n????????? **Markdown** ???\n'
      this.editSelectNode('chapter', { id:nextId, title:'???', content:defaultContent, contentType:'markdown', isNew:true, _insertIndex:insertIndex }, level, topic)
    },
    async fetchChapterContent(chapterId, force=false) {
      const isEditing = this.editSelectedNode && this.editSelectedNode.type==='chapter' && (String(this.editingChapter.id)===String(chapterId)||String(this.editingChapter._id)===String(chapterId))
      if (!isEditing) return
      try {
        this.editingChapter.content = '??????...'
        const fullChapter = await request('/api/course/chapter/'+chapterId+'?_t='+Date.now())
        const isSame = this.editSelectedNode && this.editSelectedNode.type==='chapter' && (String(this.editingChapter.id)===String(chapterId)||String(this.editingChapter._id)===String(chapterId))
        if (isSame) {
          if (!force && (this.aiLoadingMap[chapterId]||this.aiLoadingMap[fullChapter._id])) return
          this.editingChapter.content = fullChapter.content||''
          this.editingChapter.contentType = fullChapter.contentType||'markdown'
          this.editingChapter.resourceUrl = fullChapter.resourceUrl||''
          if (fullChapter.title) this.editingChapter.title = fullChapter.title
          this.updateChapterInTree(chapterId, { contentType:this.editingChapter.contentType, title:this.editingChapter.title })
        }
      } catch(e) {
        const isSame = this.editSelectedNode && this.editSelectedNode.type==='chapter' && (String(this.editingChapter.id)===String(chapterId)||String(this.editingChapter._id)===String(chapterId))
        if (isSame) this.editingChapter.content = '????: '+e.message
      }
    },
    updateChapterInTree(chapterId, updates) {
      if (this.editingTopicForChapter && this.editingTopicForChapter.chapters) {
        const c = this.editingTopicForChapter.chapters.find(c => c.id===chapterId||c._id===chapterId)
        if (c) { Object.assign(c, updates); return }
      }
      for (const l of this.editLevels) {
        if (l.topics) for (const t of l.topics) {
          if (t.chapters) { const c = t.chapters.find(c => c.id===chapterId||c._id===chapterId); if (c) { Object.assign(c, updates); return } }
        }
      }
    },
    resetAiStatus() {
      if (!this.editSelectedNode) return
      this.aiLoadingMap[this.editSelectedNode.id] = false
      this.aiStatusMap[this.editSelectedNode.id] = ''
      this.showToastMessage('?????')
    },
    openInNewWindow() {
      const url = this.getPreviewUrl(this.editingChapter.resourceUrl)
      if (url) window.open(url, '_blank')
      else this.showToastMessage('?????')
    },
    getPreviewUrl(url) {
      if (!url) return ''
      if (url.indexOf('public/courseware')!==-1) {
        if (url.startsWith('/public/')) url = '/api'+url
        else if (url.startsWith('public/')) url = '/api/'+url
        const token = localStorage.getItem('auth_token')
        if (token) { const sep = url.includes('?')?'&':'?'; return url+sep+'token='+token }
      }
      return url
    },

    // ===== CRUD methods =====
    async saveGroup() {
      if (this.isSaving) return; this.isSaving = true
      try {
        let res
        if (this.editingGroup._id) {
          res = await request('/api/course/groups/'+this.editingGroup._id, { method:'PUT', body:JSON.stringify(this.editingGroup) })
        } else {
          res = await request('/api/course/groups', { method:'POST', body:JSON.stringify(this.editingGroup) })
          if (res && res._id) { this.editingGroup._id = res._id; this.editSelectedNode.id = res._id; this.editGroups.push({...res,collapsed:false}) }
        }
        this.showToastMessage('??????'); await this.fetchEditData()
      } catch(e) { this.showToastMessage('??????: '+e.message) }
      finally { this.isSaving = false }
    },
    async deleteGroup(id) {
      if (!confirm('???????????')) return
      try { await request('/api/course/groups/'+id, {method:'DELETE'}); this.showToastMessage('??????'); this.editSelectedNode=null; await this.fetchEditData() }
      catch(e) { this.showToastMessage('??????: '+e.message) }
    },
    async moveGroup(direction) {
      if (!this.editingGroup._id) return
      try { await request('/api/course/groups/'+this.editingGroup._id+'/move', {method:'POST',body:JSON.stringify({direction})}); this.showToastMessage('????'); await this.fetchEditData() }
      catch(e) { this.showToastMessage('????: '+e.message) }
    },
    async saveLevel() {
      if (this.isSaving) return; this.isSaving = true
      try {
        let res
        if (this.editingLevel._id) {
          res = await request('/api/course/levels/'+this.editingLevel._id, {method:'PUT',body:JSON.stringify(this.editingLevel)})
        } else {
          res = await request('/api/course/levels', {method:'POST',body:JSON.stringify(this.editingLevel)})
          if (res && res._id) { this.editingLevel._id = res._id; this.editSelectedNode.id = res._id; this.editLevels.push({...res,descCollapsed:false}) }
        }
        this.showToastMessage('????'); await this.fetchEditData()
      } catch(e) { this.showToastMessage('????: '+e.message) }
      finally { this.isSaving = false }
    },
    async deleteLevel(id) {
      if (!confirm('?????????????')) return
      try { await request('/api/course/levels/'+id, {method:'DELETE'}); this.showToastMessage('????'); this.editSelectedNode=null; await this.fetchEditData() }
      catch(e) { this.showToastMessage('????: '+e.message) }
    },
    async moveLevel(direction) {
      if (!this.editingLevel._id) return
      try { await request('/api/course/levels/'+this.editingLevel._id+'/move', {method:'POST',body:JSON.stringify({direction})}); this.showToastMessage('????'); await this.fetchEditData() }
      catch(e) { this.showToastMessage('????: '+e.message) }
    },
    async saveTopic() {
      if (this.isSaving) return; this.isSaving = true
      try {
        let updatedLevel
        if (this.editingTopic._id) {
          updatedLevel = await request('/api/course/levels/'+this.editingLevelForTopic._id+'/topics/'+this.editingTopic._id, {method:'PUT',body:JSON.stringify(this.editingTopic)})
        } else {
          updatedLevel = await request('/api/course/levels/'+this.editingLevelForTopic._id+'/topics', {method:'POST',body:JSON.stringify({...this.editingTopic,insertIndex:this.editingTopic._insertIndex})})
          if (updatedLevel && updatedLevel.topics && updatedLevel.topics.length>0) {
            const newTopic = this.editingTopic._insertIndex!==-1&&this.editingTopic._insertIndex<updatedLevel.topics.length ? updatedLevel.topics[this.editingTopic._insertIndex] : updatedLevel.topics[updatedLevel.topics.length-1]
            if (newTopic) { this.editingTopic._id = newTopic._id; this.editSelectedNode.id = newTopic._id }
            this.showToastMessage('???????'); await this.fetchEditData(); return
          }
        }
        this.showToastMessage('???????'); await this.fetchEditData()
      } catch(e) { this.showToastMessage('???????: '+e.message) }
      finally { this.isSaving = false }
    },
    async deleteTopic(levelId, topicId) {
      if (!confirm('????????????')) return
      try { await request('/api/course/levels/'+levelId+'/topics/'+topicId, {method:'DELETE'}); this.showToastMessage('???????'); this.editSelectedNode=null; await this.fetchEditData() }
      catch(e) { this.showToastMessage('???????: '+e.message) }
    },
    async moveTopic(direction) {
      const levelId = this.editingLevelForTopic._id; const topicId = this.editingTopic._id
      try { await request('/api/course/levels/'+levelId+'/topics/'+topicId+'/move', {method:'POST',body:JSON.stringify({direction})}); this.showToastMessage('????'); await this.fetchEditData() }
      catch(e) { this.showToastMessage('????: '+e.message) }
    },
    async saveChapter() {
      if (this.isSaving) return; this.isSaving = true
      try {
        const problemIds = (this.editingChapter.problemIdsStr||'').split(/[,\uff0c]/).map(s=>s.trim()).filter(s=>s)
        const optionalProblemIds = (this.editingChapter.optionalProblemIdsStr||'').split(/[,\uff0c]/).map(s=>s.trim()).filter(s=>s)
        const chapterData = { id:this.editingChapter.id, title:this.editingChapter.title, content:this.editingChapter.content, contentType:this.editingChapter.contentType, resourceUrl:this.editingChapter.resourceUrl, problemIds, optionalProblemIds, optional:this.editingChapter.optional, insertIndex:this.editingChapter._insertIndex }
        let updatedLevel
        if (this.editingChapter.isNew) {
          updatedLevel = await request('/api/course/levels/'+this.editingLevelForChapter._id+'/topics/'+this.editingTopicForChapter._id+'/chapters', {method:'POST',body:JSON.stringify(chapterData)})
          if (updatedLevel && updatedLevel.topics) {
            const topic = updatedLevel.topics.find(t => t._id===this.editingTopicForChapter._id)
            if (topic && topic.chapters && topic.chapters.length>0) {
              const matches = topic.chapters.filter(c => c.title===this.editingChapter.title)
              const newCh = matches.length>0 ? matches[matches.length-1] : null
              if (newCh) { this.editingChapter._id=newCh._id; this.editingChapter.id=newCh._id; this.editingChapter.isNew=false }
              await this.fetchEditData()
              this.showToastMessage('??????')
              if (newCh) {
                const newLevel = this.editLevels.find(l=>l._id===this.editingLevelForChapter._id)
                if (newLevel) { const newTopic=newLevel.topics.find(t=>t._id===this.editingTopicForChapter._id); if (newTopic) { const freshChapter=newTopic.chapters.find(c=>c._id===newCh._id); if (freshChapter) this.editSelectNode('chapter',freshChapter,newLevel,newTopic) } }
              }
              return
            }
          }
        } else {
          const chId = this.editingChapter._id||this.editingChapter.id
          updatedLevel = await request('/api/course/levels/'+this.editingLevelForChapter._id+'/topics/'+this.editingTopicForChapter._id+'/chapters/'+chId, {method:'PUT',body:JSON.stringify(chapterData)})
        }
        this.showToastMessage('??????'); await this.fetchEditData()
      } catch(e) { this.showToastMessage('??????: '+e.message) }
      finally { this.isSaving = false }
    },
    async deleteChapter(levelId, topicId, chapterId) {
      if (!confirm('???????????')) return
      try { await request('/api/course/levels/'+levelId+'/topics/'+topicId+'/chapters/'+chapterId, {method:'DELETE'}); this.showToastMessage('??????'); this.editSelectedNode=null; await this.fetchEditData() }
      catch(e) { this.showToastMessage('??????: '+e.message) }
    },
    async moveChapter(direction) {
      const levelId=this.editingLevelForChapter._id; const topicId=this.editingTopicForChapter._id; const chapterId=this.editingChapter._id||this.editingChapter.id
      try { await request('/api/course/levels/'+levelId+'/topics/'+topicId+'/chapters/'+chapterId+'/move', {method:'PUT',body:JSON.stringify({direction})}); this.showToastMessage('????'); await this.fetchEditData() }
      catch(e) { this.showToastMessage('????: '+e.message) }
    },

    // ===== AI methods =====
    async ensureChapterSaved() {
      if (!this.editingChapter._id || this.editingChapter.isNew) {
        this.showToastMessage('????????...')
        await this.saveChapter()
        if (!this.editingChapter._id) throw new Error('???????????????')
      }
    },
    async generateLessonPlan() {
      if (!this.editingChapter.title) return this.showToastMessage('????????')
      try { await this.ensureChapterSaved() } catch(e) { return }
      if (!confirm('??????????????????')) return
      const chapterId=this.editingChapter._id||this.editingChapter.id
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForChapter.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'
      this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='????...'
      this.editingChapter.contentType='markdown'; this.editingChapter.content='???????????...'
      try {
        await request('/api/lesson-plan/background', {method:'POST',body:JSON.stringify({topic:this.editingChapter.title,context:this.editingTopicForChapter.title,level:'Level '+this.editingLevelForChapter.level,requirements:this.aiRequirements,model:this.selectedModel,language,chapterId,topicId:this.editingTopicForChapter._id,clientKey:chapterId})})
        this.showToastMessage('???????????'); this.aiStatusMap[chapterId]='??????...'
      } catch(e) { this.showToastMessage('????: '+e.message); this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='' }
    },
    async generatePPT() {
      if (!this.editingChapter.title) return this.showToastMessage('????????')
      try { await this.ensureChapterSaved() } catch(e) { return }
      if (!confirm('?????PPT??')) return
      const chapterId=this.editingChapter._id||this.editingChapter.id
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForChapter.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'
      const chapterList=this.editingTopicForChapter&&this.editingTopicForChapter.chapters?this.editingTopicForChapter.chapters.map(c=>c.title):[]
      const currentChapterIndex=chapterList.indexOf(this.editingChapter.title)
      this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='????...'
      this.editingChapter.contentType='html'; this.updateChapterInTree(chapterId,{contentType:'html'})
      try {
        await request('/api/generate-ppt/background', {method:'POST',body:JSON.stringify({topic:this.editingChapter.title,context:this.editingTopicForChapter.title,level:'Level '+this.editingLevelForChapter.level,model:this.selectedModel,language,chapterList,currentChapterIndex,chapterContent:this.editingChapter.content,requirements:this.aiRequirements,chapterId,topicId:this.editingTopicForChapter._id,topicTitle:this.editingTopicForChapter.title,chapterTitle:this.editingChapter.title,levelNum:this.editingLevelForChapter.level,levelTitle:this.editingLevelForChapter.title,clientKey:chapterId,group:this.editingLevelForChapter.group})})
        this.showToastMessage('PPT?????????'); this.aiStatusMap[chapterId]='??????PPT...'
      } catch(e) { this.showToastMessage('????: '+e.message); this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='' }
    },
    async generateSolutionPlan() {
      if (!this.editingChapter.problemIdsStr) return this.showToastMessage('??????ID')
      try { await this.ensureChapterSaved() } catch(e) { return }
      if (!confirm('???????????')) return
      const id=this.editingChapter._id||this.editingChapter.id
      const firstProblemId=this.editingChapter.problemIdsStr.split(/[,\uff0c]/)[0].trim()
      if (!firstProblemId) return this.showToastMessage('????????ID')
      this.aiLoadingMap[id]=true; this.aiStatusMap[id]='????????...'
      this.editingChapter.contentType='markdown'; this.editingChapter.content='?????????????...'
      try {
        let docId=firstProblemId; let domainId='system'
        if (firstProblemId.includes(':')) { [domainId,docId]=firstProblemId.split(':') }
        const docsRes = await request('/api/documents?domainId='+domainId+'&limit=1000')
        const doc = docsRes.docs.find(d => String(d.docId)===String(docId))
        if (!doc) throw new Error('??????')
        let userCode=''
        try { const subRes=await request('/api/course/submission/best?domainId='+domainId+'&docId='+docId); if (subRes&&subRes.code) userCode=subRes.code } catch(e) {}
        this.aiStatusMap[id]='????????...'
        await request('/api/solution-plan/background', {method:'POST',body:JSON.stringify({problem:doc.content,code:userCode,chapterId:id,topicId:this.editingTopicForChapter._id,clientKey:id,model:this.selectedModel})})
        this.aiStatusMap[id]='????????...'; this.showToastMessage('????????')
      } catch(e) { this.showToastMessage('????: '+e.message); this.aiLoadingMap[id]=false; this.aiStatusMap[id]='' }
    },
    async generateSolutionReport() {
      if (!this.editingChapter.problemIdsStr) return this.showToastMessage('??????ID')
      try { await this.ensureChapterSaved() } catch(e) { return }
      if (!confirm('???????PPT??')) return
      const id=this.editingChapter._id||this.editingChapter.id
      const firstProblemId=this.editingChapter.problemIdsStr.split(/[,\uff0c]/)[0].trim()
      if (!firstProblemId) return this.showToastMessage('????????ID')
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForChapter.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'
      this.aiLoadingMap[id]=true; this.aiStatusMap[id]='????????...'
      this.editingChapter.contentType='html'; this.updateChapterInTree(id,{contentType:'html'})
      try {
        let docId=firstProblemId; let domainId='system'
        if (firstProblemId.includes(':')) { [domainId,docId]=firstProblemId.split(':') }
        const docsRes=await request('/api/documents?domainId='+domainId+'&limit=1000')
        const doc=docsRes.docs.find(d=>String(d.docId)===String(docId))
        if (!doc) throw new Error('??????')
        let userCode=''
        try { const subRes=await request('/api/course/submission/best?domainId='+domainId+'&docId='+docId); if (subRes&&subRes.code) userCode=subRes.code } catch(e) {}
        this.aiStatusMap[id]='????????...'
        const solutionPlan=this.editingChapter.contentType==='markdown'&&this.editingChapter.content&&this.editingChapter.content.length>100?this.editingChapter.content:''
        await request('/api/solution-report/background', {method:'POST',body:JSON.stringify({problem:doc.content,code:userCode,reference:'',solutionPlan,level:this.editingLevelForChapter.level,topicTitle:this.editingTopicForChapter.title,chapterTitle:this.editingChapter.title,problemTitle:doc.title,chapterId:id,topicId:this.editingTopicForChapter._id,clientKey:id,model:this.selectedModel,language,group:this.editingLevelForChapter.group,levelTitle:this.editingLevelForChapter.title})})
        this.aiStatusMap[id]='????????...'; this.showToastMessage('????????')
      } catch(e) { this.showToastMessage('????: '+e.message); this.aiLoadingMap[id]=false; this.aiStatusMap[id]='' }
    },
    async generateTopicDescription() {
      if (!this.editingTopic.title) return this.showToastMessage('?????????')
      if (!confirm('?????????')) return
      const targetTopicId=this.editingTopic._id||this.editingTopic.id; const levelId=this.editingLevelForTopic._id
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForTopic.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'
      this.aiLoadingMap[targetTopicId]=true; this.aiStatusMap[targetTopicId]='????...'
      try {
        await request('/api/topic-plan/background', {method:'POST',body:JSON.stringify({topic:this.editingTopic.title,level:'Level '+this.editingLevelForTopic.level,existingChapters:(this.editingTopic.chapters||[]).map(c=>({title:c.title,contentPreview:c.content?c.content.slice(0,200):''})),mode:'description',model:this.selectedModel,language,topicId:targetTopicId,levelId,clientKey:targetTopicId})})
        this.showToastMessage('?????????'); this.aiStatusMap[targetTopicId]='??????...'
      } catch(e) { this.showToastMessage('????: '+e.message); this.aiLoadingMap[targetTopicId]=false; this.aiStatusMap[targetTopicId]='' }
    },
    async generateTopicChapters() {
      if (!this.editingTopic.title) return this.showToastMessage('?????????')
      if (!confirm('???????????')) return
      const targetTopicId=this.editingTopic._id||this.editingTopic.id; const levelId=this.editingLevelForTopic._id
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForTopic.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'
      this.aiLoadingMap[targetTopicId]=true; this.aiStatusMap[targetTopicId]='????...'
      try {
        await request('/api/topic-plan/background', {method:'POST',body:JSON.stringify({topic:this.editingTopic.title,level:'Level '+this.editingLevelForTopic.level,existingChapters:(this.editingTopic.chapters||[]).map(c=>({title:c.title})),mode:'chapters',model:this.selectedModel,language,topicId:targetTopicId,levelId,clientKey:targetTopicId})})
        this.showToastMessage('???????????'); this.aiStatusMap[targetTopicId]='??????...'
      } catch(e) { this.showToastMessage('????: '+e.message); this.aiLoadingMap[targetTopicId]=false; this.aiStatusMap[targetTopicId]='' }
    },
    async batchGenerateLessonPlans() {
      if (!this.editingTopic.chapters||this.editingTopic.chapters.length===0) return this.showToastMessage('?????????')
      if (!confirm('???????????????????')) return
      const levelNum=this.editingLevelForTopic.level; const topicTitle=this.editingTopic.title
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForTopic.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'; const model=this.selectedModel
      const topicId=this.editSelectedNode.id; this.aiLoadingMap[topicId]=true; let successCount=0
      for (let i=0;i<this.editingTopic.chapters.length;i++) {
        const chapter=this.editingTopic.chapters[i]; const chapterId=chapter._id||chapter.id
        this.aiStatusMap[topicId]='???????? ('+(i+1)+'/'+this.editingTopic.chapters.length+'): '+chapter.title
        try {
          this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
          await request('/api/lesson-plan/background', {method:'POST',body:JSON.stringify({topic:chapter.title,context:topicTitle,topicId,level:'Level '+levelNum,requirements:'',model,language,chapterId,clientKey:chapterId})})
          successCount++
        } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
        await new Promise(r=>setTimeout(r,500))
      }
      this.aiLoadingMap[topicId]=false; this.aiStatusMap[topicId]=''; this.showToastMessage('???????????? '+successCount+' ?')
    },
    async batchGeneratePPTs() {
      if (!this.editingTopic.chapters||this.editingTopic.chapters.length===0) return this.showToastMessage('?????????')
      if (!confirm('???????????????PPT??')) return
      const levelNum=this.editingLevelForTopic.level; const levelTitle=this.editingLevelForTopic.title; const topicTitle=this.editingTopic.title
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForTopic.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'; const model=this.selectedModel
      const chapterList=this.editingTopic.chapters.map(c=>c.title)
      const topicId=this.editSelectedNode.id; this.aiLoadingMap[topicId]=true; let successCount=0
      for (let i=0;i<this.editingTopic.chapters.length;i++) {
        const chapter=this.editingTopic.chapters[i]; const chapterId=chapter._id||chapter.id
        this.aiStatusMap[topicId]='????PPT?? ('+(i+1)+'/'+this.editingTopic.chapters.length+'): '+chapter.title
        try {
          this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
          await request('/api/generate-ppt/background', {method:'POST',body:JSON.stringify({topic:chapter.title,context:topicTitle,level:'Level '+levelNum,model,language,chapterList,currentChapterIndex:i,chapterContent:'',requirements:'',chapterId,topicId,topicTitle,chapterTitle:chapter.title,levelNum,levelTitle,clientKey:chapterId,group:this.editingLevelForTopic.group})})
          successCount++
        } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
        await new Promise(r=>setTimeout(r,500))
      }
      this.aiLoadingMap[topicId]=false; this.aiStatusMap[topicId]=''; this.showToastMessage('???????????? '+successCount+' ?')
    },
    async batchGenerateSolutionPlans() {
      if (!this.editingTopic.chapters||this.editingTopic.chapters.length===0) return this.showToastMessage('?????????')
      if (!confirm('????????????????')) return
      const model=this.selectedModel; const topicId=this.editSelectedNode.id; this.aiLoadingMap[topicId]=true; let successCount=0,skippedCount=0
      for (let i=0;i<this.editingTopic.chapters.length;i++) {
        const chapter=this.editingTopic.chapters[i]; const chapterId=chapter._id||chapter.id
        if (!chapter.problemIds||chapter.problemIds.length===0) { skippedCount++; continue }
        this.aiStatusMap[topicId]='???????? ('+(i+1)+'/'+this.editingTopic.chapters.length+'): '+chapter.title
        try {
          let firstProblemId=chapter.problemIds[0]; if (typeof firstProblemId==='object') firstProblemId=firstProblemId.docId||firstProblemId.id
          let docId=firstProblemId,domainId='system'; if (String(firstProblemId).includes(':')) { [domainId,docId]=String(firstProblemId).split(':') }
          const docsRes=await request('/api/documents?domainId='+domainId+'&limit=1000'); const doc=docsRes.docs.find(d=>String(d.docId)===String(docId))
          if (!doc) throw new Error('?????')
          let userCode=''; try { const subRes=await request('/api/course/submission/best?domainId='+domainId+'&docId='+docId); if (subRes&&subRes.code) userCode=subRes.code } catch(e) {}
          this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
          await request('/api/solution-plan/background', {method:'POST',body:JSON.stringify({problem:doc.content,code:userCode,chapterId,topicId,clientKey:chapterId,model})})
          successCount++
        } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
        await new Promise(r=>setTimeout(r,500))
      }
      this.aiLoadingMap[topicId]=false; this.aiStatusMap[topicId]=''; this.showToastMessage('????????: ?? '+successCount+' ?, ?? '+skippedCount+' ?')
    },
    async batchGenerateSolutionReports() {
      if (!this.editingTopic.chapters||this.editingTopic.chapters.length===0) return this.showToastMessage('?????????')
      if (!confirm('????????????PPT??')) return
      const levelNum=this.editingLevelForTopic.level; const levelTitle=this.editingLevelForTopic.title; const topicTitle=this.editingTopic.title
      const groupObj=this.editGroups.find(g=>g.name===this.editingLevelForTopic.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'; const model=this.selectedModel
      const topicId=this.editSelectedNode.id; this.aiLoadingMap[topicId]=true; let successCount=0,skippedCount=0
      for (let i=0;i<this.editingTopic.chapters.length;i++) {
        const chapter=this.editingTopic.chapters[i]; const chapterId=chapter._id||chapter.id
        if (!chapter.problemIds||chapter.problemIds.length===0) { skippedCount++; continue }
        this.aiStatusMap[topicId]='???????? ('+(i+1)+'/'+this.editingTopic.chapters.length+'): '+chapter.title
        try {
          let firstProblemId=chapter.problemIds[0]; if (typeof firstProblemId==='object') firstProblemId=firstProblemId.docId||firstProblemId.id
          let docId=firstProblemId,domainId='system'; if (String(firstProblemId).includes(':')) { [domainId,docId]=String(firstProblemId).split(':') }
          const docsRes=await request('/api/documents?domainId='+domainId+'&limit=1000'); const doc=docsRes.docs.find(d=>String(d.docId)===String(docId))
          if (!doc) throw new Error('?????')
          let userCode=''; try { const subRes=await request('/api/course/submission/best?domainId='+domainId+'&docId='+docId); if (subRes&&subRes.code) userCode=subRes.code } catch(e) {}
          this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
          await request('/api/solution-report/background', {method:'POST',body:JSON.stringify({problem:doc.content,code:userCode,reference:'',level:levelNum,topicTitle,chapterTitle:chapter.title,problemTitle:doc.title,chapterId,topicId,clientKey:chapterId,model,language,group:this.editingLevelForTopic.group,levelTitle})})
          successCount++
        } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
        await new Promise(r=>setTimeout(r,500))
      }
      this.aiLoadingMap[topicId]=false; this.aiStatusMap[topicId]=''; this.showToastMessage('????????: ?? '+successCount+' ?, ?? '+skippedCount+' ?')
    },
    async batchGenerateLevelLessonPlans() {
      if (!this.editingLevel.topics||this.editingLevel.topics.length===0) return this.showToastMessage('?????????')
      if (!confirm('?????????????????')) return
      const levelNum=this.editingLevel.level; const groupObj=this.editGroups.find(g=>g.name===this.editingLevel.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'; const model=this.selectedModel
      const levelId=this.editSelectedNode.id; this.aiLoadingMap[levelId]=true; let successCount=0
      for (const topic of this.editingLevel.topics) {
        if (!topic.chapters) continue
        const topicTitle=topic.title; const topicId=topic._id||topic.id
        for (const chapter of topic.chapters) {
          const chapterId=chapter._id||chapter.id
          this.aiStatusMap[levelId]='????: '+topicTitle+' - '+chapter.title
          try {
            this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
            await request('/api/lesson-plan/background', {method:'POST',body:JSON.stringify({topic:chapter.title,context:topicTitle,topicId,level:'Level '+levelNum,requirements:'',model,language,chapterId,clientKey:chapterId})})
            successCount++
          } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
          await new Promise(r=>setTimeout(r,500))
        }
      }
      this.aiLoadingMap[levelId]=false; this.aiStatusMap[levelId]=''; this.showToastMessage('???????????? '+successCount+' ?')
    },
    async batchGenerateLevelPPTs() {
      if (!this.editingLevel.topics||this.editingLevel.topics.length===0) return this.showToastMessage('?????????')
      if (!confirm('?????????????PPT??')) return
      const levelNum=this.editingLevel.level; const levelTitle=this.editingLevel.title; const groupObj=this.editGroups.find(g=>g.name===this.editingLevel.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'; const model=this.selectedModel
      const levelId=this.editSelectedNode.id; this.aiLoadingMap[levelId]=true; let successCount=0
      for (const topic of this.editingLevel.topics) {
        if (!topic.chapters) continue
        const topicTitle=topic.title; const topicId=topic._id||topic.id; const chapterList=topic.chapters.map(c=>c.title)
        for (let i=0;i<topic.chapters.length;i++) {
          const chapter=topic.chapters[i]; const chapterId=chapter._id||chapter.id
          this.aiStatusMap[levelId]='????PPT: '+topicTitle+' - '+chapter.title
          try {
            this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
            await request('/api/generate-ppt/background', {method:'POST',body:JSON.stringify({topic:chapter.title,context:topicTitle,level:'Level '+levelNum,model,language,chapterList,currentChapterIndex:i,chapterContent:'',requirements:'',chapterId,topicId,topicTitle,chapterTitle:chapter.title,levelNum,levelTitle,clientKey:chapterId,group:this.editingLevel.group})})
            successCount++
          } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
          await new Promise(r=>setTimeout(r,500))
        }
      }
      this.aiLoadingMap[levelId]=false; this.aiStatusMap[levelId]=''; this.showToastMessage('???????????? '+successCount+' ?')
    },
    async batchGenerateLevelSolutionReports() {
      if (!this.editingLevel.topics||this.editingLevel.topics.length===0) return this.showToastMessage('?????????')
      if (!confirm('???????????????PPT??')) return
      const levelNum=this.editingLevel.level; const levelTitle=this.editingLevel.title; const groupObj=this.editGroups.find(g=>g.name===this.editingLevel.group)
      const language=groupObj?(groupObj.language||'C++'):'C++'; const model=this.selectedModel
      const levelId=this.editSelectedNode.id; this.aiLoadingMap[levelId]=true; let successCount=0,skippedCount=0
      for (const topic of this.editingLevel.topics) {
        if (!topic.chapters) continue
        const topicTitle=topic.title; const topicId=topic._id||topic.id
        for (const chapter of topic.chapters) {
          const chapterId=chapter._id||chapter.id
          if (!chapter.problemIds||chapter.problemIds.length===0) { skippedCount++; continue }
          this.aiStatusMap[levelId]='??????: '+topicTitle+' - '+chapter.title
          try {
            let firstProblemId=chapter.problemIds[0]; if (typeof firstProblemId==='object') firstProblemId=firstProblemId.docId||firstProblemId.id
            let docId=firstProblemId,domainId='system'; if (String(firstProblemId).includes(':')) { [domainId,docId]=String(firstProblemId).split(':') }
            const docsRes=await request('/api/documents?domainId='+domainId+'&limit=1000'); const doc=docsRes.docs.find(d=>String(d.docId)===String(docId))
            if (!doc) throw new Error('?????')
            let userCode=''; try { const subRes=await request('/api/course/submission/best?domainId='+domainId+'&docId='+docId); if (subRes&&subRes.code) userCode=subRes.code } catch(e) {}
            this.aiLoadingMap[chapterId]=true; this.aiStatusMap[chapterId]='??????...'
            await request('/api/solution-report/background', {method:'POST',body:JSON.stringify({problem:doc.content,code:userCode,reference:'',level:levelNum,topicTitle,chapterTitle:chapter.title,problemTitle:doc.title,chapterId,topicId,clientKey:chapterId,model,language,group:this.editingLevel.group,levelTitle})})
            successCount++
          } catch(e) { this.aiLoadingMap[chapterId]=false; this.aiStatusMap[chapterId]='????' }
          await new Promise(r=>setTimeout(r,500))
        }
      }
      this.aiLoadingMap[levelId]=false; this.aiStatusMap[levelId]=''; this.showToastMessage('????????: ?? '+successCount+', ?? '+skippedCount)
    },
  }
}
</script>

<style scoped>
/* ===== LAYOUT ===== */
.learning-map-container {
  height: calc(100vh - 52px);
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
}

.course-sidebar {
  width: 300px;
  min-width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
  background: #fff;
}
.sidebar-header h3 { margin: 0 0 8px 0; font-size: 16px; color: #2c3e50; font-weight: 700; }

.btn-edit-mode {
  width: 100%; padding: 6px 0; background: #6366f1; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;
}
.btn-edit-mode:hover { background: #4f46e5; }

.edit-header-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-add-level { flex:1; padding: 6px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; }
.btn-add-level:hover { background: #4f46e5; }
.btn-exit-edit { flex:1; padding: 6px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; }
.btn-exit-edit:hover { background: #dc2626; }

.loading-text { padding: 20px; text-align: center; color: #95a5a6; }
.tree-nav, .tree-container { flex: 1; overflow-y: auto; padding: 8px 0; }

/* ===== TREE ITEMS ===== */
.tree-item {
  padding: 9px 14px; cursor: pointer; display: flex; align-items: center; transition: background 0.2s;
  font-size: 13px; color: #34495e; position: relative; border: 1px solid transparent; margin-bottom: 1px; border-radius: 4px;
}
.tree-item:hover { background: #f8f9fa; }
.tree-item.active { background: #e3f2fd; color: #1976d2; font-weight: 500; }

.group-item { font-weight: 700; font-size: 14px; background: #f8fafc; border-left: 4px solid #94a3b8; margin-bottom: 2px; }
.group-item.active { background: #e2e8f0; border-left-color: #475569; color: #0f172a; }
.level-item { padding-left: 20px; border-left: 4px solid #60a5fa; background: #fff; }
.level-item.active { background: #eff6ff; border-left-color: #2563eb; color: #1e40af; }
.topic-item { padding-left: 36px; font-size: 12px; border-left: 4px solid #34d399; background: #fff; }
.topic-item.active { background: #ecfdf5; border-left-color: #059669; color: #065f46; }
.chapter-item { padding-left: 50px; font-size: 12px; border-left: 4px solid #fbbf24; background: #fff; }
.chapter-item.active { background: #fffbeb; border-left-color: #d97706; color: #92400e; }

.tree-icon { width: 16px; text-align: center; margin-right: 6px; font-size: 9px; color: #95a5a6; flex-shrink: 0; }
.tree-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tree-count-badge { font-size: 10px; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 8px; margin-left: 4px; border: 1px solid #e2e8f0; flex-shrink: 0; }
.status-dot { margin-left: auto; font-size: 8px; flex-shrink: 0; }
.status-dot.completed { color: #2ecc71; }
.status-dot.unlocked { color: #3498db; }
.status-dot.locked { color: #bdc3c7; }
.tree-actions { display: none; margin-left: 6px; }
.tree-item:hover .tree-actions { display: flex; gap: 3px; }
.btn-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 3px; color: #64748b; cursor: pointer; font-size: 12px; }
.btn-icon:hover { color: #6366f1; border-color: #6366f1; }
.tree-meta { display: flex; align-items: center; gap: 3px; margin-left: 4px; }
.meta-badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 700; }
.badge-md { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
.badge-html { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.empty-node { padding: 6px 14px; color: #bdc3c7; font-size: 12px; font-style: italic; }

/* ===== CONTENT AREA ===== */
.course-content {
  flex: 1; overflow-y: auto; padding: 24px 32px; background: #f5f7fa;
}

.view-header { margin-bottom: 24px; }
.breadcrumb { font-size: 13px; color: #7f8c8d; margin-bottom: 8px; }
.breadcrumb span { cursor: pointer; color: #3498db; }
.breadcrumb span:hover { text-decoration: underline; }
.view-header h1 { margin: 0 0 8px 0; font-size: 24px; color: #2c3e50; }

.progress-badge { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; }

.description-box { background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 20px; color: #555; line-height: 1.6; }

/* Group view */
.levels-grid { display: flex; flex-direction: column; gap: 14px; }
.level-card-mini { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; border: 1px solid transparent; }
.level-card-mini:hover { transform: translateY(-2px); border-color: #3498db; }
.level-mini-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.level-mini-header h3 { margin: 0; font-size: 16px; color: #2c3e50; }
.level-mini-desc { font-size: 13px; color: #666; margin-bottom: 10px; }
.level-mini-stats { font-size: 12px; color: #95a5a6; text-align: right; padding-top: 8px; border-top: 1px solid #f0f0f0; }

/* Level view */
.topics-list { display: flex; flex-direction: column; gap: 12px; }
.topic-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); cursor: pointer; transition: all 0.2s; border-left: 4px solid #3498db; }
.topic-card:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.topic-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.topic-card-header h3 { margin: 0; font-size: 16px; color: #2c3e50; }
.topic-stats-group { display: flex; gap: 6px; }
.topic-count { font-size: 12px; color: #7f8c8d; background: #f0f2f5; padding: 2px 7px; border-radius: 8px; }
.topic-card-desc { font-size: 13px; color: #666; margin-bottom: 10px; }
.topic-chapters-preview { display: flex; gap: 4px; align-items: center; }
.chapter-dot { width: 9px; height: 9px; border-radius: 50%; background: #eee; }
.chapter-dot.status-completed { background: #2ecc71; }
.chapter-dot.status-unlocked { background: #3498db; }
.chapter-dot.status-locked { background: #e0e0e0; }
.more-dots { font-size: 11px; color: #999; }

/* Topic view - chapters */
.chapters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.chapter-card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; text-align: center; }
.chapter-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
.chapter-card.status-completed { border-top: 3px solid #2ecc71; }
.chapter-card.status-unlocked { border-top: 3px solid #3498db; }
.chapter-card.status-locked { border-top: 3px solid #bdc3c7; opacity: 0.75; }
.chapter-icon { font-size: 22px; margin-bottom: 8px; }
.chapter-info h4 { margin: 0 0 4px 0; font-size: 13px; color: #2c3e50; }
.chapter-id { font-size: 11px; color: #95a5a6; margin: 0; }
.tag-optional { background: #fff7e6; color: #d97706; font-size: 10px; padding: 1px 5px; border-radius: 3px; margin-left: 4px; }
.tag-type { font-size: 10px; padding: 1px 5px; border-radius: 3px; margin-left: 3px; }
.tag-type.html { background: #eff6ff; color: #3b82f6; }
.tag-type.markdown { background: #f1f5f9; color: #64748b; }

/* Badges */
.badge { padding: 3px 9px; border-radius: 10px; font-size: 11px; font-weight: bold; }
.badge.completed { background: #eafaf1; color: #2ecc71; }
.badge.unlocked { background: #ebf5fb; color: #3498db; }
.badge.locked { background: #f5f5f5; color: #95a5a6; }

/* Learners */
.learners-section { margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px; }
.learners-header { cursor: pointer; color: #7f8c8d; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.learners-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin-top: 12px; }
.learner-card { display: flex; align-items: center; background: #f8f9fa; padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.learner-card:hover { background: white; border-color: #3498db; }
.learner-avatar { width: 28px; height: 28px; border-radius: 50%; background: #3498db; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; margin-right: 8px; font-size: 12px; flex-shrink: 0; }
.learner-name { font-size: 12px; font-weight: 500; color: #2c3e50; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.learner-detail { font-size: 10px; color: #95a5a6; margin-top: 2px; }
.no-learners { color: #bdc3c7; font-size: 12px; margin-top: 8px; }
.empty-state { display: flex; justify-content: center; align-items: center; height: 100%; color: #95a5a6; font-size: 15px; }

/* ===== EDIT MODE EDITOR ===== */
:root {
  --primary-color: #6366f1; --primary-hover: #4f46e5; --primary-light: #e0e7ff;
  --danger-color: #ef4444; --border-color: #e2e8f0; --text-main: #0f172a;
  --text-secondary: #475569; --text-muted: #94a3b8; --radius-md: 8px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
.editor-form { max-width: 1100px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
.editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; background: #fff; z-index: 10; padding-top: 8px; }
.editor-header h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text-main); }
.header-actions { display: flex; gap: 10px; align-items: center; }
.move-actions { display: flex; gap: 6px; margin-right: 8px; padding-right: 8px; border-right: 1px solid var(--border-color); }

.btn-save { padding: 8px 20px; background: var(--primary-color); color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
.btn-save:hover { background: var(--primary-hover); }
.btn-save:disabled { background: #cbd5e1; cursor: not-allowed; }
.btn-delete { padding: 8px 16px; background: white; color: var(--danger-color); border: 1px solid #fecaca; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
.btn-delete:hover { background: #fef2f2; }
.btn-small { padding: 6px 12px; font-size: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: white; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-weight: 500; }
.btn-small:hover { background: #f8fafc; color: var(--primary-color); border-color: var(--primary-color); }

.form-group { margin-bottom: 20px; }
.form-row { display: flex; gap: 20px; }
.half { flex: 1; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: var(--text-main); font-size: 13px; }
.form-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; font-family: inherit; transition: all 0.2s; background: #fff; box-sizing: border-box; color: var(--text-main); }
.form-input:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.form-input:disabled { background: #f8fafc; color: var(--text-muted); cursor: not-allowed; }
.code-font { font-family: 'JetBrains Mono','Fira Code',Consolas,monospace; font-size: 12px; line-height: 1.6; }
.hint { font-size: 12px; color: var(--text-muted); margin-top: 6px; display: block; }

.split-view { display: flex; height: 500px; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; }
.split-view .form-input { flex: 1; resize: none; border: none; border-right: 1px solid var(--border-color); border-radius: 0; padding: 16px; overflow-y: auto; }
.preview-box { flex: 1; padding: 16px; overflow-y: auto; background: #fff; }

.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.label-row label { margin-bottom: 0; }
.preview-container-large { border: 1px solid var(--border-color); border-radius: var(--radius-md); height: 500px; background: #fff; overflow: hidden; }
.preview-iframe { width: 100%; height: 100%; border: none; }

.checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-weight: normal; }
.checkbox-group input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary-color); }
.checkbox-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); max-height: 160px; overflow-y: auto; }
.checkbox-item { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; padding: 4px 8px; background: white; border: 1px solid var(--border-color); border-radius: 4px; font-weight: normal; }

/* AI box */
.ai-assistant-box { background: #fff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
.ai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ai-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-main); }
.ai-status { font-size: 12px; color: var(--primary-color); font-weight: 600; background: var(--primary-light); padding: 3px 10px; border-radius: 16px; }
.ai-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.ai-controls.disabled { opacity: 0.6; pointer-events: none; }
.ai-input { flex: 1; min-width: 200px; }
.ai-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-ai { padding: 8px 14px; background: white; color: var(--primary-color); border: 1px solid var(--primary-color); border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: 12px; white-space: nowrap; transition: all 0.2s; }
.btn-ai:hover { background: var(--primary-color); color: white; }
.btn-ai:disabled { background: #f1f5f9; color: #cbd5e1; border-color: #e2e8f0; cursor: not-allowed; }
.model-select { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 12px; background: #fff; min-width: 150px; cursor: pointer; }

/* Problem links */
.problem-links-preview { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
.problem-link-tag { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; border-radius: 12px; font-size: 12px; text-decoration: none; transition: all 0.2s; }
.problem-link-tag:hover { background: #e0f2fe; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; width: 420px; max-height: 80vh; overflow-y: auto; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-header { padding: 14px 16px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 15px; }
.modal-body { padding: 16px; }
.btn-close { background: none; border: none; font-size: 18px; cursor: pointer; }
.progress-stat-card { background: white; border-radius: 8px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 14px; }
.progress-stat-card h4 { margin: 0 0 10px 0; font-size: 14px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 8px; }
.modal-topics-list { display: flex; flex-direction: column; gap: 8px; }
.stat-topic-item { background: #f8f9fa; padding: 8px; border-radius: 6px; }
.stat-topic-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.stat-topic-title { font-size: 12px; font-weight: 500; color: #2c3e50; }
.stat-topic-pct { font-size: 12px; color: #3498db; font-weight: bold; }
.stat-topic-bar { height: 5px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.stat-topic-fill { height: 100%; background: #3498db; border-radius: 3px; }
.stat-topic-detail { font-size: 10px; color: #95a5a6; text-align: right; }
.stat-value { font-size: 28px; font-weight: 700; color: #3498db; text-align: center; padding: 10px; }
.markdown-content :deep(h1),:deep(h2),:deep(h3) { margin-top: 16px; margin-bottom: 8px; }
.markdown-content :deep(p) { margin-bottom: 10px; line-height: 1.7; }
.markdown-content :deep(code) { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
.markdown-content :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 14px; border-radius: 6px; overflow-x: auto; margin-bottom: 14px; }
</style>
