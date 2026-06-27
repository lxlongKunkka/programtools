<template>
  <div class="pdf-export-page">
    <div class="header">
      <h1>📄 课程内容批量导出 PDF</h1>
      <p class="subtitle">选择课程级别和章节，批量导出为标准格式的 PDF 文件</p>
    </div>

    <div class="export-container">
      <!-- 步骤 1: 选择课程组 -->
      <div class="step-section">
        <h2>1️⃣ 选择课程体系</h2>
        <div class="course-groups">
          <button 
            v-for="group in courseGroups" 
            :key="group"
            :class="['group-btn', { active: selectedGroup === group }]"
            @click="selectGroup(group)"
          >
            {{ group }}
          </button>
        </div>
      </div>

      <!-- 步骤 2: 选择级别 -->
      <div v-if="selectedGroup" class="step-section">
        <h2>2️⃣ 选择级别</h2>
        <div class="level-selector">
          <button 
            class="select-all-btn" 
            @click="toggleAllLevels"
          >
            {{ allLevelsSelected ? '取消全选' : '全选' }}
          </button>
          <div class="level-list">
            <label 
              v-for="level in availableLevels" 
              :key="level._id"
              class="level-item"
            >
              <input 
                type="checkbox" 
                v-model="selectedLevels" 
                :value="level._id"
              />
              <span class="level-name">Level {{ level.level }}: {{ level.title }}</span>
              <span class="level-stats">{{ level.topicCount }} topics</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 步骤 3: 导出选项 -->
      <div v-if="selectedLevels.length > 0" class="step-section">
        <h2>3️⃣ 导出选项</h2>
        <div class="export-options">
          <label class="option-item">
            <input type="checkbox" v-model="options.includeEmptyChapters" />
            <span>包含空章节（无内容的章节）</span>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="options.includeDescription" />
            <span>包含课程描述</span>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="options.oneFilePerTopic" />
            <span>每个 Topic 单独一个 PDF</span>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="options.oneFilePerChapter" />
            <span>每个 Chapter 单独一个 PDF</span>
          </label>
          <label class="option-item">
            <span>页眉显示：</span>
            <select v-model="options.headerStyle">
              <option value="title">标题</option>
              <option value="level-topic">级别 + Topic</option>
              <option value="none">无</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 步骤 4: 开始导出 -->
      <div v-if="selectedLevels.length > 0" class="step-section">
        <h2>4️⃣ 开始导出</h2>
        <div class="action-buttons">
          <button 
            class="btn-primary" 
            @click="startExport"
            :disabled="exporting"
          >
            {{ exporting ? '导出中...' : `导出 ${selectedLevels.length} 个级别` }}
          </button>
          <button 
            v-if="exportedFiles.length > 0"
            class="btn-secondary" 
            @click="downloadAll"
          >
            下载全部 ({{ exportedFiles.length }} 个文件)
          </button>
        </div>
      </div>

      <!-- 导出进度 -->
      <div v-if="exporting || exportedFiles.length > 0" class="progress-section">
        <h3>导出进度</h3>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: progressPercent + '%' }"
          ></div>
          <span class="progress-text">{{ progressText }}</span>
        </div>
        <div v-if="currentTask" class="current-task">
          正在处理: {{ currentTask }}
        </div>
        
        <!-- 已完成的文件列表 -->
        <div v-if="exportedFiles.length > 0" class="exported-files">
          <h4>已完成 ({{ exportedFiles.length }})</h4>
          <div class="file-list">
            <div 
              v-for="file in exportedFiles" 
              :key="file.path"
              class="file-item"
            >
              <span class="file-icon">📄</span>
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatSize(file.size) }}</span>
              <button 
                class="btn-download" 
                @click="downloadFile(file)"
              >
                下载
              </button>
            </div>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="errors.length > 0" class="errors">
          <h4>错误 ({{ errors.length }})</h4>
          <div 
            v-for="(error, index) in errors" 
            :key="index"
            class="error-item"
          >
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const courseGroups = ref([])
const selectedGroup = ref('')
const availableLevels = ref([])
const selectedLevels = ref([])
const options = ref({
  includeEmptyChapters: false,
  includeDescription: true,
  oneFilePerTopic: false,
  oneFilePerChapter: false,
  headerStyle: 'level-topic'
})

const exporting = ref(false)
const exportedFiles = ref([])
const errors = ref([])
const currentTask = ref('')
const totalTasks = ref(0)
const completedTasks = ref(0)

const allLevelsSelected = computed(() => {
  return selectedLevels.value.length === availableLevels.value.length && availableLevels.value.length > 0
})

const progressPercent = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

const progressText = computed(() => {
  return `${completedTasks.value} / ${totalTasks.value}`
})

// 加载课程组列表
async function loadCourseGroups() {
  try {
    const response = await axios.get('/api/course/groups')
    courseGroups.value = response.data.groups || []
  } catch (error) {
    console.error('加载课程组失败:', error)
    alert('加载课程组失败')
  }
}

// 选择课程组
async function selectGroup(group) {
  selectedGroup.value = group
  selectedLevels.value = []
  await loadLevels(group)
}

// 加载级别列表
async function loadLevels(group) {
  try {
    const response = await axios.get('/api/course/levels', {
      params: { group }
    })
    availableLevels.value = (response.data.levels || []).map(l => ({
      ...l,
      topicCount: l.topics?.length || 0
    }))
  } catch (error) {
    console.error('加载级别失败:', error)
    alert('加载级别失败')
  }
}

// 切换全选
function toggleAllLevels() {
  if (allLevelsSelected.value) {
    selectedLevels.value = []
  } else {
    selectedLevels.value = availableLevels.value.map(l => l._id)
  }
}

// 开始导出
async function startExport() {
  if (selectedLevels.value.length === 0) {
    alert('请至少选择一个级别')
    return
  }

  exporting.value = true
  exportedFiles.value = []
  errors.value = []
  completedTasks.value = 0
  totalTasks.value = selectedLevels.value.length
  currentTask.value = ''

  try {
    const response = await axios.post('/api/course/export-pdf', {
      levelIds: selectedLevels.value,
      options: options.value
    }, {
      onDownloadProgress: (progressEvent) => {
        // 可以在这里处理流式进度更新
      }
    })

    if (response.data.success) {
      exportedFiles.value = response.data.files || []
      completedTasks.value = totalTasks.value
    } else {
      errors.value.push(response.data.error || '导出失败')
    }
  } catch (error) {
    console.error('导出失败:', error)
    errors.value.push(error.response?.data?.error || error.message || '导出失败')
  } finally {
    exporting.value = false
    currentTask.value = ''
  }
}

// 下载单个文件
function downloadFile(file) {
  const link = document.createElement('a')
  link.href = file.url
  link.download = file.name
  link.click()
}

// 下载全部文件
async function downloadAll() {
  try {
    const response = await axios.post('/api/course/export-pdf/download-all', {
      files: exportedFiles.value.map(f => f.path)
    }, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `course-export-${Date.now()}.zip`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载失败:', error)
    alert('打包下载失败')
  }
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(() => {
  loadCourseGroups()
})
</script>

<style scoped>
.pdf-export-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1rem;
}

.export-container {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.step-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #ecf0f1;
}

.step-section:last-child {
  border-bottom: none;
}

.step-section h2 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: #34495e;
}

.course-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.group-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #bdc3c7;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.95rem;
}

.group-btn:hover {
  border-color: #3498db;
  background: #ecf0f1;
}

.group-btn.active {
  border-color: #3498db;
  background: #3498db;
  color: white;
}

.level-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.select-all-btn {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.select-all-btn:hover {
  background: #7f8c8d;
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-item {
  display: flex;
  align-items: center;
  padding: 0.8rem;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.level-item:hover {
  background: #e9ecef;
}

.level-item input[type="checkbox"] {
  margin-right: 0.8rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.level-name {
  flex: 1;
  font-weight: 500;
}

.level-stats {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-item select {
  padding: 0.3rem 0.6rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #2ecc71;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #27ae60;
}

.btn-primary:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #3498db;
  color: white;
}

.btn-secondary:hover {
  background: #2980b9;
}

.progress-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.progress-section h3 {
  margin-bottom: 1rem;
  color: #34495e;
}

.progress-bar {
  position: relative;
  height: 30px;
  background: #ecf0f1;
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: #2c3e50;
}

.current-task {
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 1rem;
}

.exported-files,
.errors {
  margin-top: 1.5rem;
}

.exported-files h4,
.errors h4 {
  margin-bottom: 0.8rem;
  color: #2c3e50;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 0.8rem;
  background: white;
  border-radius: 4px;
  gap: 1rem;
}

.file-icon {
  font-size: 1.5rem;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.file-size {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.btn-download {
  padding: 0.4rem 0.8rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-download:hover {
  background: #2980b9;
}

.error-item {
  padding: 0.6rem;
  background: #e74c3c;
  color: white;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
</style>
