import { readFileSync, writeFileSync } from 'fs'

const file = 'e:\\webapp\\programtools\\src\\pages\\Design.vue'
let content = readFileSync(file, 'utf8')

// 替换 1: 移除 embedded-exit-bar，引入双栏 editor-layout
// 使用精确 Unicode 引号 \u201c 和 \u201d
const old1 = `      <!-- 嵌入模式下顶部退出栏（侧边栏隐藏时） -->
      <div v-if="hideSidebar" class="embedded-exit-bar">
        <span class="embedded-edit-title">编辑模式</span>
        <button @click="$emit('close')" class="btn-exit-embedded">\u2190 退出编辑</button>
      </div>
      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑<span v-if="isAdmin">，或点击\u201c添加分组\u201d开始</span>。</p>
      </div>

      <!-- Group Editor -->
      <div v-if="selectedNode.type === 'group'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingGroup._id ? '编辑分组' : '新建分组' }}</h2>
          <div class="header-actions" v-if="canEditGroup(editingGroup)">
            <div v-if="editingGroup._id" class="move-actions">
               <button @click="moveGroup('up')" class="btn-small btn-move">\u2191 上移</button>
               <button @click="moveGroup('down')" class="btn-small btn-move">\u2193 下移</button>
            </div>
            <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="btn-small btn-download-md">\u2b07\ufe0f 下载资料包</button>
            <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="btn-delete">删除分组</button>
            <button @click="saveGroup" class="btn-save">保存更改</button>
          </div>
          <div v-else class="header-actions">
              <span class="badge-readonly">只读模式 (无编辑权限)</span>
          </div>
        </div>`

const new1 = `      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑<span v-if="isAdmin">，或点击\u201c添加分组\u201d开始</span>。</p>
      </div>

      <div v-else class="editor-layout">
        <!-- 右侧操作栏 -->
        <div class="editor-action-sidebar">
          <button v-if="hideSidebar" @click="$emit('close')" class="eas-btn eas-exit">\u2190 退出编辑</button>

          <template v-if="selectedNode.type === 'group'">
            <template v-if="canEditGroup(editingGroup)">
              <button @click="saveGroup" class="eas-btn eas-save">\ud83d\udcbe 保存更改</button>
              <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="eas-btn eas-delete">\ud83d\uddd1 删除分组</button>
              <div class="eas-divider"></div>
              <button v-if="editingGroup._id" @click="moveGroup('up')" class="eas-btn eas-move">\u2191 上移</button>
              <button v-if="editingGroup._id" @click="moveGroup('down')" class="eas-btn eas-move">\u2193 下移</button>
              <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="eas-btn eas-download">\u2b07\ufe0f 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
          </template>

          <template v-if="selectedNode.type === 'level'">
            <template v-if="canEditLevel(editingLevel)">
              <button @click="saveLevel" class="eas-btn eas-save">\ud83d\udcbe 保存更改</button>
              <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="eas-btn eas-delete">\ud83d\uddd1 删除模块</button>
              <div class="eas-divider"></div>
              <button v-if="editingLevel._id" @click="moveLevel('up')" class="eas-btn eas-move">\u2191 上移</button>
              <button v-if="editingLevel._id" @click="moveLevel('down')" class="eas-btn eas-move">\u2193 下移</button>
              <button v-if="editingLevel._id && isAdmin" @click="downloadLevelMaterials" class="eas-btn eas-download">\u2b07\ufe0f 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
          </template>

          <template v-if="selectedNode.type === 'topic'">
            <button @click="saveTopic" class="eas-btn eas-save">\ud83d\udcbe 保存更改</button>
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-delete">\ud83d\uddd1 删除知识点</button>
            <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-warn">\ud83e\uddf9 清空章节</button>
            <div class="eas-divider"></div>
            <button v-if="editingTopic._id" @click="moveTopic('up')" class="eas-btn eas-move">\u2191 上移</button>
            <button v-if="editingTopic._id" @click="moveTopic('down')" class="eas-btn eas-move">\u2193 下移</button>
            <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="eas-btn eas-download">\u2b07\ufe0f 下载资料包</button>
            <div class="eas-divider"></div>
            <label class="eas-label">AI 模型</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>

          <template v-if="selectedNode.type === 'chapter'">
            <button @click="saveChapter" class="eas-btn eas-save">\ud83d\udcbe 保存更改</button>
            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="eas-btn eas-delete">\ud83d\uddd1 删除章节</button>
            <div class="eas-divider"></div>
            <button v-if="!editingChapter.isNew" @click="moveChapter('up')" class="eas-btn eas-move">\u2191 上移</button>
            <button v-if="!editingChapter.isNew" @click="moveChapter('down')" class="eas-btn eas-move">\u2193 下移</button>
            <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="eas-btn eas-download">\u2b07\ufe0f 下载 {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>
            <div class="eas-divider"></div>
            <label class="eas-label">AI 模型</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>
        </div>

        <!-- 主内容区 -->
        <div class="editor-main-area">

      <!-- Group Editor -->
      <div v-if="selectedNode.type === 'group'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingGroup._id ? '编辑分组' : '新建分组' }}</h2>
        </div>`

if (content.includes(old1)) {
  content = content.replace(old1, new1)
  writeFileSync(file, content, 'utf8')
  console.log('Replacement 1: OK — file saved')
} else {
  // Debug: find what's actually around the group header
  const idx = content.indexOf('header-actions" v-if="canEditGroup')
  console.log('NOT FOUND. Nearby content:')
  console.log(JSON.stringify(content.substring(idx - 200, idx + 100)))
}
