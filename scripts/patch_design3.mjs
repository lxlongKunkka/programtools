import { readFileSync, writeFileSync } from 'fs'

const file = 'e:\\webapp\\programtools\\src\\pages\\Design.vue'
let content = readFileSync(file, 'utf8')

// Construct old1 by reading the existing exact text from file
const startMarker = '<!-- \u5d4c\u5165\u6a21\u5f0f\u4e0b\u9876\u90e8\u9000\u51fa\u680f'  // 嵌入模式下顶部退出栏
const endMarker = '        </div>\n          <div v-else class="header-actions">\n              <span class="badge-readonly">\u53ea\u8bfb\u6a21\u5f0f (\u65e0\u7f16\u8f91\u6743\u9650)</span>\n          </div>\n        </div>'

const startIdx = content.indexOf('<!-- \u5d4c\u5165\u6a21\u5f0f\u4e0b\u9876\u90e8\u9000\u51fa\u680f')
const endIdx = content.indexOf(endMarker)

if (startIdx < 0) { console.log('START not found'); process.exit(1) }
if (endIdx < 0) { console.log('END not found'); process.exit(1) }

const old1 = content.substring(startIdx - 6, endIdx + endMarker.length)
console.log('old1 starts at:', startIdx - 6, 'ends at:', endIdx + endMarker.length)
console.log('old1 snippet:', JSON.stringify(old1.substring(0, 100)))

const new1 = `      <div v-if="!selectedNode" class="empty-state">
        <p>\u8bf7\u5728\u5de6\u4fa7\u9009\u62e9\u4e00\u4e2a\u8282\u70b9\u8fdb\u884c\u7f16\u8f91<span v-if="isAdmin">\uff0c\u6216\u70b9\u51fb\u201c\u6dfb\u52a0\u5206\u7ec4\u201d\u5f00\u59cb</span>\u3002</p>
      </div>

      <div v-else class="editor-layout">
        <!-- \u53f3\u4fa7\u64cd\u4f5c\u680f -->
        <div class="editor-action-sidebar">
          <button v-if="hideSidebar" @click="$emit('close')" class="eas-btn eas-exit">\u2190 \u9000\u51fa\u7f16\u8f91</button>

          <template v-if="selectedNode.type === 'group'">
            <template v-if="canEditGroup(editingGroup)">
              <button @click="saveGroup" class="eas-btn eas-save">\ud83d\udcbe \u4fdd\u5b58\u66f4\u6539</button>
              <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="eas-btn eas-delete">\ud83d\uddd1 \u5220\u9664\u5206\u7ec4</button>
              <div class="eas-divider"></div>
              <button v-if="editingGroup._id" @click="moveGroup('up')" class="eas-btn eas-move">\u2191 \u4e0a\u79fb</button>
              <button v-if="editingGroup._id" @click="moveGroup('down')" class="eas-btn eas-move">\u2193 \u4e0b\u79fb</button>
              <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="eas-btn eas-download">\u2b07\ufe0f \u4e0b\u8f7d\u8d44\u6599\u5305</button>
            </template>
            <span v-else class="eas-readonly">\u53ea\u8bfb (\u65e0\u6743\u9650)</span>
          </template>

          <template v-if="selectedNode.type === 'level'">
            <template v-if="canEditLevel(editingLevel)">
              <button @click="saveLevel" class="eas-btn eas-save">\ud83d\udcbe \u4fdd\u5b58\u66f4\u6539</button>
              <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="eas-btn eas-delete">\ud83d\uddd1 \u5220\u9664\u6a21\u5757</button>
              <div class="eas-divider"></div>
              <button v-if="editingLevel._id" @click="moveLevel('up')" class="eas-btn eas-move">\u2191 \u4e0a\u79fb</button>
              <button v-if="editingLevel._id" @click="moveLevel('down')" class="eas-btn eas-move">\u2193 \u4e0b\u79fb</button>
              <button v-if="editingLevel._id && isAdmin" @click="downloadLevelMaterials" class="eas-btn eas-download">\u2b07\ufe0f \u4e0b\u8f7d\u8d44\u6599\u5305</button>
            </template>
            <span v-else class="eas-readonly">\u53ea\u8bfb (\u65e0\u6743\u9650)</span>
          </template>

          <template v-if="selectedNode.type === 'topic'">
            <button @click="saveTopic" class="eas-btn eas-save">\ud83d\udcbe \u4fdd\u5b58\u66f4\u6539</button>
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-delete">\ud83d\uddd1 \u5220\u9664\u77e5\u8bc6\u70b9</button>
            <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-warn">\ud83e\uddf9 \u6e05\u7a7a\u7ae0\u8282</button>
            <div class="eas-divider"></div>
            <button v-if="editingTopic._id" @click="moveTopic('up')" class="eas-btn eas-move">\u2191 \u4e0a\u79fb</button>
            <button v-if="editingTopic._id" @click="moveTopic('down')" class="eas-btn eas-move">\u2193 \u4e0b\u79fb</button>
            <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="eas-btn eas-download">\u2b07\ufe0f \u4e0b\u8f7d\u8d44\u6599\u5305</button>
            <div class="eas-divider"></div>
            <label class="eas-label">AI \u6a21\u578b</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>

          <template v-if="selectedNode.type === 'chapter'">
            <button @click="saveChapter" class="eas-btn eas-save">\ud83d\udcbe \u4fdd\u5b58\u66f4\u6539</button>
            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="eas-btn eas-delete">\ud83d\uddd1 \u5220\u9664\u7ae0\u8282</button>
            <div class="eas-divider"></div>
            <button v-if="!editingChapter.isNew" @click="moveChapter('up')" class="eas-btn eas-move">\u2191 \u4e0a\u79fb</button>
            <button v-if="!editingChapter.isNew" @click="moveChapter('down')" class="eas-btn eas-move">\u2193 \u4e0b\u79fb</button>
            <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="eas-btn eas-download">\u2b07\ufe0f \u4e0b\u8f7d {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>
            <div class="eas-divider"></div>
            <label class="eas-label">AI \u6a21\u578b</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>
        </div>

        <!-- \u4e3b\u5185\u5bb9\u533a -->
        <div class="editor-main-area">

      <!-- Group Editor -->
      <div v-if="selectedNode.type === 'group'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingGroup._id ? '\u7f16\u8f91\u5206\u7ec4' : '\u65b0\u5efa\u5206\u7ec4' }}</h2>
        </div>`

content = content.substring(0, startIdx - 6) + new1 + content.substring(endIdx + endMarker.length)
writeFileSync(file, content, 'utf8')
console.log('Replacement 1: DONE')
console.log('File size after:', content.length)
