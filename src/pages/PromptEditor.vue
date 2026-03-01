<template>
  <div class="prompt-editor-container">
    <div class="header">
      <h2>Prompts Editor</h2>
      <div class="actions">
        <button @click="savePrompts" class="btn save" :disabled="saving || !currentFile">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
    
    <div class="main-content">
      <div class="sidebar">
        <div class="file-list">
          <div 
            v-for="file in files" 
            :key="file.name"
            class="file-item"
            :class="{ active: currentFile === file.name }"
            @click="selectFile(file.name)"
          >
            <div class="file-name">{{ file.label }}</div>
            <div class="file-id">{{ file.name }}</div>
          </div>
        </div>
      </div>
      
      <div class="editor-wrapper">
        <div v-if="!currentFile" class="empty-state">
          Please select a prompt file to edit
        </div>
        <textarea 
          v-else
          v-model="content" 
          class="code-editor" 
          spellcheck="false"
          placeholder="Loading content..."
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '../utils/request'

const files = ref([])
const currentFile = ref('')
const content = ref('')
const saving = ref(false)

const fileLabels = {
  'translate.js': '题目翻译 (Translate)',
  'solution.js': '题解生成 (Solution)',
  'checker.js': '代码纠错 (Checker)',
  'solve.js': 'AI做题 (Solve)',
  'meta.js': '题目元数据分析 (Meta)',
  'data_gen.js': '数据生成 (Data Gen)',
  'solution_report.js': '解题报告PPT (Report)',
  'lesson_plan.js': '教案生成 (Lesson Plan)',
  'ppt.js': '课件生成 (Courseware PPT)',
  'topic_plan.js': '知识点大纲 (Topic Plan)',
  'topic_desc.js': '知识点介绍 (Topic Desc)'
}

const loadFileList = async () => {
  try {
    const res = await request('/api/admin/prompts/list')
    files.value = res.files.map(f => ({
      name: f,
      label: fileLabels[f] || f
    }))
    
    // Select first file by default if available
    if (files.value.length > 0 && !currentFile.value) {
      selectFile(files.value[0].name)
    }
  } catch (err) {
    alert('Failed to load file list: ' + (err.message || 'Unknown error'))
  }
}

const selectFile = async (filename) => {
  if (currentFile.value === filename) return
  
  currentFile.value = filename
  content.value = 'Loading...'
  
  try {
    const res = await request(`/api/admin/prompts?filename=${filename}`)
    content.value = res.content
  } catch (err) {
    content.value = ''
    alert('Failed to load file content: ' + (err.message || 'Unknown error'))
  }
}

const savePrompts = async () => {
  if (!currentFile.value) return
  if (!confirm(`Are you sure you want to save changes to ${currentFile.value}?`)) return
  
  saving.value = true
  try {
    await request('/api/admin/prompts', {
      method: 'POST',
      body: JSON.stringify({ 
        content: content.value,
        filename: currentFile.value
      })
    })
    alert('Saved successfully!')
  } catch (err) {
    alert('Failed to save: ' + (err.message || 'Unknown error'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadFileList()
})
</script>

<style scoped>
.prompt-editor-container {
  padding: 16px 20px;
  height: calc(100vh - 52px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sidebar {
  width: 250px;
  background-color: #f8f9fa;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.file-list {
  display: flex;
  flex-direction: column;
}

.file-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #e9ecef;
}

.file-item.active {
  background-color: #007bff;
  color: white;
}

.file-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.file-id {
  font-size: 12px;
  opacity: 0.8;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.code-editor {
  width: 100%;
  height: 100%;
  padding: 15px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  resize: none;
  outline: none;
  background-color: #fff;
  color: #333;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999;
  font-size: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn.save {
  background-color: #28a745;
  color: white;
}

.btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
