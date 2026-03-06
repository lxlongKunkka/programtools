import { readFileSync, writeFileSync } from 'fs'

const file = 'src/pages/Design.vue'
let src = readFileSync(file, 'utf8')
const orig = src

// --- Patch 1: Topic action buttons ---
const topicOld = [
  `          <template v-if="selectedNode.type === 'topic'">`,
  `            <button @click="saveTopic" class="eas-btn eas-save">\uD83D\uDCBE \u4FDD\u5B58\u66F4\u6539</button>`,
  `            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-delete">\uD83D\uDDD1 \u5220\u9664\u77E5\u8BC6\u70B9</button>`,
  `            <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-warn">\uD83E\uDDF9 \u6E05\u7A7A\u7AE0\u8282</button>`,
  `            <div class="eas-divider"></div>`,
  `            <button v-if="editingTopic._id" @click="moveTopic('up')" class="eas-btn eas-move">\u2191 \u4E0A\u79FB</button>`,
  `            <button v-if="editingTopic._id" @click="moveTopic('down')" class="eas-btn eas-move">\u2193 \u4E0B\u79FB</button>`,
  `            <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="eas-btn eas-download">\u2B07\uFE0F \u4E0B\u8F7D\u8D44\u6599\u5305</button>`,
  `            <div class="eas-divider"></div>`,
  `            <label class="eas-label">AI \u6A21\u578B</label>`,
  `            <select v-model="selectedModel" class="eas-select">`,
  `              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>`,
  `            </select>`,
  `          </template>`,
].join('\n')

const topicNew = [
  `          <template v-if="selectedNode.type === 'topic'">`,
  `            <template v-if="canEditLevel(editingLevelForTopic)">`,
  `              <button @click="saveTopic" class="eas-btn eas-save">\uD83D\uDCBE \u4FDD\u5B58\u66F4\u6539</button>`,
  `              <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-delete">\uD83D\uDDD1 \u5220\u9664\u77E5\u8BC6\u70B9</button>`,
  `              <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-warn">\uD83E\uDDF9 \u6E05\u7A7A\u7AE0\u8282</button>`,
  `              <div class="eas-divider"></div>`,
  `              <button v-if="editingTopic._id" @click="moveTopic('up')" class="eas-btn eas-move">\u2191 \u4E0A\u79FB</button>`,
  `              <button v-if="editingTopic._id" @click="moveTopic('down')" class="eas-btn eas-move">\u2193 \u4E0B\u79FB</button>`,
  `              <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="eas-btn eas-download">\u2B07\uFE0F \u4E0B\u8F7D\u8D44\u6599\u5305</button>`,
  `            </template>`,
  `            <span v-else class="eas-readonly">\u53EA\u8BFB (\u65E0\u6743\u9650)</span>`,
  `            <div class="eas-divider"></div>`,
  `            <label class="eas-label">AI \u6A21\u578B</label>`,
  `            <select v-model="selectedModel" class="eas-select">`,
  `              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>`,
  `            </select>`,
  `          </template>`,
].join('\n')

// --- Patch 2: Chapter action buttons ---
const chapterOld = [
  `          <template v-if="selectedNode.type === 'chapter'">`,
  `            <button @click="saveChapter" class="eas-btn eas-save">\uD83D\uDCBE \u4FDD\u5B58\u66F4\u6539</button>`,
  `            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="eas-btn eas-delete">\uD83D\uDDD1 \u5220\u9664\u7AE0\u8282</button>`,
  `            <div class="eas-divider"></div>`,
  `            <button v-if="!editingChapter.isNew" @click="moveChapter('up')" class="eas-btn eas-move">\u2191 \u4E0A\u79FB</button>`,
  `            <button v-if="!editingChapter.isNew" @click="moveChapter('down')" class="eas-btn eas-move">\u2193 \u4E0B\u79FB</button>`,
  `            <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="eas-btn eas-download">\u2B07\uFE0F \u4E0B\u8F7D {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>`,
  `            <div class="eas-divider"></div>`,
  `            <label class="eas-label">AI \u6A21\u578B</label>`,
  `            <select v-model="selectedModel" class="eas-select">`,
  `              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>`,
  `            </select>`,
  `          </template>`,
].join('\n')

const chapterNew = [
  `          <template v-if="selectedNode.type === 'chapter'">`,
  `            <template v-if="canEditLevel(editingLevelForChapter)">`,
  `              <button @click="saveChapter" class="eas-btn eas-save">\uD83D\uDCBE \u4FDD\u5B58\u66F4\u6539</button>`,
  `              <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="eas-btn eas-delete">\uD83D\uDDD1 \u5220\u9664\u7AE0\u8282</button>`,
  `              <div class="eas-divider"></div>`,
  `              <button v-if="!editingChapter.isNew" @click="moveChapter('up')" class="eas-btn eas-move">\u2191 \u4E0A\u79FB</button>`,
  `              <button v-if="!editingChapter.isNew" @click="moveChapter('down')" class="eas-btn eas-move">\u2193 \u4E0B\u79FB</button>`,
  `              <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="eas-btn eas-download">\u2B07\uFE0F \u4E0B\u8F7D {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>`,
  `            </template>`,
  `            <span v-else class="eas-readonly">\u53EA\u8BFB (\u65E0\u6743\u9650)</span>`,
  `            <div class="eas-divider"></div>`,
  `            <label class="eas-label">AI \u6A21\u578B</label>`,
  `            <select v-model="selectedModel" class="eas-select">`,
  `              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>`,
  `            </select>`,
  `          </template>`,
].join('\n')

// Apply patches (normalize CRLF to LF first, apply, restore CRLF if needed)
const hasCRLF = src.includes('\r\n')
if (hasCRLF) src = src.replace(/\r\n/g, '\n')

if (!src.includes(topicOld)) { console.error('TOPIC PATCH: old string not found'); process.exit(1) }
src = src.replace(topicOld, topicNew)
console.log('Topic patch applied.')

if (!src.includes(chapterOld)) { console.error('CHAPTER PATCH: old string not found'); process.exit(1) }
src = src.replace(chapterOld, chapterNew)
console.log('Chapter patch applied.')

if (hasCRLF) src = src.replace(/\n/g, '\r\n')
writeFileSync(file, src, 'utf8')
console.log('Design.vue saved.')
