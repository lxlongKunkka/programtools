import { readFileSync, writeFileSync } from 'fs'

const file = 'e:\\webapp\\programtools\\src\\pages\\Design.vue'
let content = readFileSync(file, 'utf8')

// ===== 替换 1: 移除 embedded-exit-bar，引入双栏 editor-layout =====
const old1 = `      <!-- 嵌入模式下顶部退出栏（侧边栏隐藏时） -->
      <div v-if="hideSidebar" class="embedded-exit-bar">
        <span class="embedded-edit-title">编辑模式</span>
        <button @click="$emit('close')" class="btn-exit-embedded">← 退出编辑</button>
      </div>
      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑<span v-if="isAdmin">，或点击"添加分组"开始</span>。</p>
      </div>

      <!-- Group Editor -->
      <div v-else-if="selectedNode.type === 'group'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingGroup._id ? '编辑分组' : '新建分组' }}</h2>
          <div class="header-actions" v-if="canEditGroup(editingGroup)">
            <div v-if="editingGroup._id" class="move-actions">
               <button @click="moveGroup('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveGroup('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="btn-small btn-download-md">⬇️ 下载资料包</button>
            <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="btn-delete">删除分组</button>
            <button @click="saveGroup" class="btn-save">保存更改</button>
          </div>
          <div v-else class="header-actions">
              <span class="badge-readonly">只读模式 (无编辑权限)</span>
          </div>
        </div>`

const new1 = `      <div v-if="!selectedNode" class="empty-state">
        <p>请在左侧选择一个节点进行编辑<span v-if="isAdmin">，或点击"添加分组"开始</span>。</p>
      </div>

      <div v-else class="editor-layout">
        <!-- 右侧操作栏 -->
        <div class="editor-action-sidebar">
          <button v-if="hideSidebar" @click="$emit('close')" class="eas-btn eas-exit">← 退出编辑</button>

          <template v-if="selectedNode.type === 'group'">
            <template v-if="canEditGroup(editingGroup)">
              <button @click="saveGroup" class="eas-btn eas-save">💾 保存更改</button>
              <button v-if="editingGroup._id" @click="deleteGroup(editingGroup._id)" class="eas-btn eas-delete">🗑 删除分组</button>
              <div class="eas-divider"></div>
              <button v-if="editingGroup._id" @click="moveGroup('up')" class="eas-btn eas-move">↑ 上移</button>
              <button v-if="editingGroup._id" @click="moveGroup('down')" class="eas-btn eas-move">↓ 下移</button>
              <button v-if="editingGroup._id && isAdmin" @click="downloadGroupMaterials" class="eas-btn eas-download">⬇️ 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
          </template>

          <template v-if="selectedNode.type === 'level'">
            <template v-if="canEditLevel(editingLevel)">
              <button @click="saveLevel" class="eas-btn eas-save">💾 保存更改</button>
              <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="eas-btn eas-delete">🗑 删除模块</button>
              <div class="eas-divider"></div>
              <button v-if="editingLevel._id" @click="moveLevel('up')" class="eas-btn eas-move">↑ 上移</button>
              <button v-if="editingLevel._id" @click="moveLevel('down')" class="eas-btn eas-move">↓ 下移</button>
              <button v-if="editingLevel._id && isAdmin" @click="downloadLevelMaterials" class="eas-btn eas-download">⬇️ 下载资料包</button>
            </template>
            <span v-else class="eas-readonly">只读 (无权限)</span>
          </template>

          <template v-if="selectedNode.type === 'topic'">
            <button @click="saveTopic" class="eas-btn eas-save">💾 保存更改</button>
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-delete">🗑 删除知识点</button>
            <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="eas-btn eas-warn">🧹 清空章节</button>
            <div class="eas-divider"></div>
            <button v-if="editingTopic._id" @click="moveTopic('up')" class="eas-btn eas-move">↑ 上移</button>
            <button v-if="editingTopic._id" @click="moveTopic('down')" class="eas-btn eas-move">↓ 下移</button>
            <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="eas-btn eas-download">⬇️ 下载资料包</button>
            <div class="eas-divider"></div>
            <label class="eas-label">AI 模型</label>
            <select v-model="selectedModel" class="eas-select">
              <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>

          <template v-if="selectedNode.type === 'chapter'">
            <button @click="saveChapter" class="eas-btn eas-save">💾 保存更改</button>
            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="eas-btn eas-delete">🗑 删除章节</button>
            <div class="eas-divider"></div>
            <button v-if="!editingChapter.isNew" @click="moveChapter('up')" class="eas-btn eas-move">↑ 上移</button>
            <button v-if="!editingChapter.isNew" @click="moveChapter('down')" class="eas-btn eas-move">↓ 下移</button>
            <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="eas-btn eas-download">⬇️ 下载 {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>
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

// ===== 替换 2: Level editor header =====
const old2 = `      <!-- Level Editor -->
      <div v-else-if="selectedNode.type === 'level'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingLevel._id ? '编辑课程模块' : '新建课程模块' }}</h2>
          <div class="header-actions" v-if="canEditLevel(editingLevel)">
            <div v-if="editingLevel._id" class="move-actions">
               <button @click="moveLevel('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveLevel('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="editingLevel._id && isAdmin" @click="downloadLevelMaterials" class="btn-small btn-download-md">⬇️ 下载资料包</button>
            <button v-if="editingLevel._id" @click="deleteLevel(editingLevel._id)" class="btn-delete">删除模块</button>
            <button @click="saveLevel" class="btn-save">保存更改</button>
          </div>
          <div v-else class="header-actions">
              <span class="badge-readonly">只读模式 (无编辑权限)</span>
          </div>
        </div>`

const new2 = `      <!-- Level Editor -->
      <div v-if="selectedNode.type === 'level'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingLevel._id ? '编辑课程模块' : '新建课程模块' }}</h2>
        </div>`

// ===== 替换 3: Topic editor header =====
const old3 = `      <!-- Topic Editor -->
      <div v-else-if="selectedNode.type === 'topic'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingTopic._id ? '编辑知识点' : '新建知识点' }}</h2>
          <div class="header-actions">
            <select v-model="selectedModel" class="model-select" title="选择 AI 模型">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div v-if="editingTopic._id" class="move-actions">
               <button @click="moveTopic('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveTopic('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="editingTopic._id && isAdmin" @click="downloadTopicMaterials" class="btn-small btn-download-md">⬇️ 下载资料包</button>
            <button v-if="editingTopic._id" @click="deleteAllChapters(editingLevelForTopic._id, editingTopic._id)" class="btn-delete" style="background-color: #f59e0b; margin-right: 8px;">清空章节</button>
            <button v-if="editingTopic._id" @click="deleteTopic(editingLevelForTopic._id, editingTopic._id)" class="btn-delete">删除知识点</button>
            <button @click="saveTopic" class="btn-save">保存更改</button>
          </div>
        </div>`

const new3 = `      <!-- Topic Editor -->
      <div v-if="selectedNode.type === 'topic'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingTopic._id ? '编辑知识点' : '新建知识点' }}</h2>
        </div>`

// ===== 替换 4: Chapter editor header =====
const old4 = `      <!-- Chapter Editor -->
      <div v-else-if="selectedNode.type === 'chapter'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingChapter.isNew ? '新建章节' : '编辑章节' }}</h2>
          <div class="header-actions">
            <select v-model="selectedModel" class="model-select" title="选择 AI 模型">
                <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <div v-if="!editingChapter.isNew" class="move-actions">
               <button @click="moveChapter('up')" class="btn-small btn-move">↑ 上移</button>
               <button @click="moveChapter('down')" class="btn-small btn-move">↓ 下移</button>
            </div>
            <button v-if="isAdmin && !editingChapter.isNew" @click="downloadChapter" class="btn-small btn-download-md">⬇️ 下载 {{ editingChapter.contentType === 'html' ? 'PPT' : 'MD' }}</button>
            <button v-if="!editingChapter.isNew" @click="deleteChapter(editingLevelForChapter._id, editingTopicForChapter._id, editingChapter._id || editingChapter.id)" class="btn-delete">删除章节</button>
            <button @click="saveChapter" class="btn-save">保存更改</button>
          </div>
        </div>`

const new4 = `      <!-- Chapter Editor -->
      <div v-if="selectedNode.type === 'chapter'" class="editor-form">
        <div class="editor-header">
          <h2>{{ editingChapter.isNew ? '新建章节' : '编辑章节' }}</h2>
        </div>`

// ===== 替换 5: 末尾关闭 editor-main-area 和 editor-layout =====
const old5 = `        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="editingChapter.optional"> 选做章节 (Optional)
          </label>
          <span class="hint">选做章节不会阻塞后续章节的解锁。</span>
        </div>
      </div>

    </div>
  </div>
</template>`

const new5 = `        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" v-model="editingChapter.optional"> 选做章节 (Optional)
          </label>
          <span class="hint">选做章节不会阻塞后续章节的解锁。</span>
        </div>
      </div>

        </div><!-- /editor-main-area -->
      </div><!-- /editor-layout -->

    </div>
  </div>
</template>`

let changed = 0
for (const [o, n, label] of [[old1,new1,'1'],[old2,new2,'2'],[old3,new3,'3'],[old4,new4,'4'],[old5,new5,'5']]) {
  if (content.includes(o)) {
    content = content.replace(o, n)
    console.log(`Replacement ${label}: OK`)
    changed++
  } else {
    console.log(`Replacement ${label}: NOT FOUND`)
  }
}

if (changed > 0) {
  writeFileSync(file, content, 'utf8')
  console.log(`Wrote file. Total replacements: ${changed}`)
} else {
  console.log('No changes made.')
}
