<template>
  <div class="md2pdf-page">
    <div class="header">
      <h1>📄 Markdown 转 PDF</h1>
      <p class="subtitle">上传 .md 文件，在线转换为精美的 PDF 文档</p>
    </div>

    <div class="main-container">
      <!-- 上传区域 -->
      <div class="upload-section">
        <div class="upload-box" @dragover.prevent @drop.prevent="handleDrop">
          <input 
            type="file" 
            ref="fileInput"
            accept=".md,.markdown"
            @change="handleFileSelect"
            style="display: none"
            multiple
          />
          
          <div v-if="!selectedFiles.length" class="upload-prompt">
            <div class="upload-icon">📤</div>
            <p class="upload-text">拖拽 Markdown 文件到这里</p>
            <p class="upload-hint">或</p>
            <button class="btn-upload" @click="$refs.fileInput.click()">
              选择文件
            </button>
            <p class="upload-note">支持 .md 和 .markdown 文件</p>
          </div>

          <div v-else class="file-list">
            <h3>已选择 {{ selectedFiles.length }} 个文件</h3>
            <div 
              v-for="(file, index) in selectedFiles" 
              :key="index"
              class="file-item"
            >
              <span class="file-icon">📝</span>
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatSize(file.size) }}</span>
              <button class="btn-remove" @click="removeFile(index)">✕</button>
            </div>
            <button class="btn-add-more" @click="$refs.fileInput.click()">
              + 添加更多文件
            </button>
          </div>
        </div>
      </div>

      <!-- 转换选项 -->
      <div v-if="selectedFiles.length > 0" class="options-section">
        <h3>转换选项</h3>
        <div class="options-grid">
          <label class="option-item">
            <span class="option-label">纸张大小</span>
            <select v-model="options.paperSize">
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="A3">A3 (297 × 420 mm)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
            </select>
          </label>

          <label class="option-item">
            <span class="option-label">方向</span>
            <select v-model="options.orientation">
              <option value="portrait">纵向</option>
              <option value="landscape">横向</option>
            </select>
          </label>

          <label class="option-item">
            <span class="option-label">页边距</span>
            <select v-model="options.margin">
              <option value="standard">标准 (2.54 cm)</option>
              <option value="narrow">窄 (1.27 cm)</option>
              <option value="wide">宽 (3.81 cm)</option>
              <option value="custom">自定义...</option>
            </select>
          </label>

          <label v-if="options.margin === 'custom'" class="option-item">
            <span class="option-label">自定义边距 (cm)</span>
            <input 
              type="number" 
              v-model.number="options.customMargin" 
              min="0" 
              max="10" 
              step="0.1" 
              placeholder="例如: 0.508"
            />
          </label>

          <label class="option-item checkbox-item">
            <input type="checkbox" v-model="options.displayHeaderFooter" />
            <span>显示页眉页脚</span>
          </label>

          <label class="option-item checkbox-item">
            <input type="checkbox" v-model="options.printBackground" />
            <span>打印背景颜色</span>
          </label>

          <label class="option-item checkbox-item">
            <input type="checkbox" v-model="options.preferCSSPageSize" />
            <span>使用紧凑格式（CSS 预设：A4 纸张，5mm 边距）</span>
          </label>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="selectedFiles.length > 0" class="actions-section">
        <button 
          class="btn-convert" 
          @click="convertToPdf"
          :disabled="converting"
        >
          {{ converting ? '转换中...' : `转换为 PDF (${selectedFiles.length} 个文件)` }}
        </button>
        <button 
          class="btn-clear" 
          @click="clearFiles"
          :disabled="converting"
        >
          清除全部
        </button>
      </div>

      <!-- 转换进度 -->
      <div v-if="converting || convertedFiles.length > 0" class="progress-section">
        <h3>转换进度</h3>
        
        <div v-if="converting" class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: progressPercent + '%' }"
          ></div>
          <span class="progress-text">{{ progressText }}</span>
        </div>

        <div v-if="currentFile" class="current-file">
          正在处理: {{ currentFile }}
        </div>

        <!-- 转换结果 -->
        <div v-if="convertedFiles.length > 0" class="results">
          <h4>已完成 ({{ convertedFiles.length }})</h4>
          <div class="result-list">
            <div 
              v-for="file in convertedFiles" 
              :key="file.url"
              class="result-item"
            >
              <span class="result-icon">✅</span>
              <span class="result-name">{{ file.name }}</span>
              <span class="result-size">{{ formatSize(file.size) }}</span>
              <div class="result-actions">
                <button class="btn-preview" @click="previewPdf(file)">
                  👁️ 预览
                </button>
                <button class="btn-download" @click="downloadFile(file)">
                  ⬇️ 下载
                </button>
              </div>
            </div>
          </div>

          <button 
            v-if="convertedFiles.length > 1"
            class="btn-download-all"
            @click="downloadAll"
          >
            下载全部 PDF (ZIP)
          </button>
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

    <!-- PDF 预览弹窗 -->
    <div v-if="previewFile" class="preview-modal" @click.self="closePreview">
      <div class="preview-container">
        <div class="preview-header">
          <h3>{{ previewFile.name }}</h3>
          <button class="btn-close" @click="closePreview">✕</button>
        </div>
        <iframe :src="previewFile.blobUrl" class="preview-iframe"></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const fileInput = ref(null)
const selectedFiles = ref([])
const options = ref({
  paperSize: 'A4',
  orientation: 'portrait',
  margin: 'standard',
  customMargin: 0.5,
  displayHeaderFooter: false,
  printBackground: true,
  preferCSSPageSize: true  // 默认使用 CSS 紧凑格式
})

const converting = ref(false)
const convertedFiles = ref([])
const errors = ref([])
const currentFile = ref('')
const totalFiles = ref(0)
const completedFiles = ref(0)
const previewFile = ref(null)

const progressPercent = computed(() => {
  if (totalFiles.value === 0) return 0
  return Math.round((completedFiles.value / totalFiles.value) * 100)
})

const progressText = computed(() => {
  return `${completedFiles.value} / ${totalFiles.value}`
})

// 处理文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  addFiles(files)
}

// 处理拖拽上传
function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files).filter(
    file => file.name.endsWith('.md') || file.name.endsWith('.markdown')
  )
  addFiles(files)
}

// 添加文件
function addFiles(files) {
  selectedFiles.value.push(...files)
}

// 移除文件
function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

// 清除所有文件
function clearFiles() {
  selectedFiles.value = []
  convertedFiles.value = []
  errors.value = []
}

// 转换为 PDF
async function convertToPdf() {
  if (selectedFiles.value.length === 0) {
    alert('请先选择文件')
    return
  }

  converting.value = true
  convertedFiles.value = []
  errors.value = []
  totalFiles.value = selectedFiles.value.length
  completedFiles.value = 0

  for (const file of selectedFiles.value) {
    currentFile.value = file.name

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify(options.value))

      const response = await axios.post('/api/tools/md2pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        convertedFiles.value.push(response.data.file)
      } else {
        errors.value.push(`${file.name}: ${response.data.error}`)
      }
    } catch (error) {
      console.error(`转换失败 (${file.name}):`, error)
      errors.value.push(`${file.name}: ${error.response?.data?.error || error.message}`)
    }

    completedFiles.value++
  }

  converting.value = false
  currentFile.value = ''
}

// 下载单个文件
async function downloadFile(file) {
  try {
    // 使用 axios 获取文件（带认证），然后用 blob 下载
    const response = await axios.get(file.url, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    })
    
    // response.data 已经是 Blob 对象，直接使用
    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name  // 使用原始文件名（包含中文）
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载失败:', error)
    alert('下载失败: ' + (error.response?.data || error.message))
  }
}

// 预览 PDF
async function previewPdf(file) {
  try {
    // 使用 axios 获取 PDF blob，避免 iframe 跨域问题
    const response = await axios.get(file.url, {
      responseType: 'blob'
    })
    
    // response.data 已经是 Blob 对象，直接使用
    const blobUrl = window.URL.createObjectURL(response.data)
    
    // 创建带 blob URL 的文件对象用于预览
    previewFile.value = {
      ...file,
      blobUrl: blobUrl
    }
  } catch (error) {
    console.error('加载预览失败:', error)
    alert('加载预览失败，请直接下载')
  }
}

// 关闭预览
function closePreview() {
  if (previewFile.value?.blobUrl) {
    window.URL.revokeObjectURL(previewFile.value.blobUrl)
  }
  previewFile.value = null
}

// 下载全部（ZIP）
async function downloadAll() {
  try {
    const response = await axios.post('/api/tools/md2pdf/download-all', {
      files: convertedFiles.value.map(f => ({
        path: f.path,
        name: f.name
      }))
    }, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `markdown-pdfs-${Date.now()}.zip`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('打包下载失败:', error)
    alert('打包下载失败')
  }
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.md2pdf-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.main-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* 上传区域 */
.upload-box {
  border: 3px dashed #bdc3c7;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  transition: all 0.3s;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-box:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.upload-text {
  font-size: 1.3rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.upload-hint {
  color: #95a5a6;
  margin: 1rem 0;
}

.btn-upload {
  padding: 0.8rem 2rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-upload:hover {
  background: #2980b9;
}

.upload-note {
  margin-top: 1rem;
  color: #95a5a6;
  font-size: 0.9rem;
}

/* 文件列表 */
.file-list {
  width: 100%;
}

.file-list h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 0.8rem;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.file-icon {
  font-size: 1.5rem;
}

.file-name {
  flex: 1;
  font-weight: 500;
  text-align: left;
}

.file-size {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.btn-remove {
  padding: 0.3rem 0.6rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-remove:hover {
  background: #c0392b;
}

.btn-add-more {
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-add-more:hover {
  background: #7f8c8d;
}

/* 选项区域 */
.options-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.options-section h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-label {
  font-weight: 500;
  color: #34495e;
}

.option-item select {
  padding: 0.6rem;
  border: 1px solid #bdc3c7;
  border-radius: 6px;
  font-size: 0.95rem;
}

.checkbox-item {
  flex-direction: row;
  align-items: center;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-right: 0.5rem;
  cursor: pointer;
}

/* 操作按钮 */
.actions-section {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}

.btn-convert,
.btn-clear {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-convert {
  flex: 1;
  background: #2ecc71;
  color: white;
}

.btn-convert:hover:not(:disabled) {
  background: #27ae60;
}

.btn-convert:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.btn-clear {
  background: #e74c3c;
  color: white;
}

.btn-clear:hover:not(:disabled) {
  background: #c0392b;
}

/* 进度区域 */
.progress-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.progress-section h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
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

.current-file {
  padding: 0.6rem;
  background: white;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #7f8c8d;
}

/* 结果列表 */
.results {
  margin-top: 1.5rem;
}

.results h4 {
  margin-bottom: 1rem;
  color: #27ae60;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  gap: 1rem;
}

.result-icon {
  font-size: 1.5rem;
}

.result-name {
  flex: 1;
  font-weight: 500;
}

.result-size {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-preview,
.btn-download {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-preview {
  background: #3498db;
  color: white;
}

.btn-preview:hover {
  background: #2980b9;
}

.btn-download {
  background: #2ecc71;
  color: white;
}

.btn-download:hover {
  background: #27ae60;
}

.btn-download-all {
  width: 100%;
  padding: 0.8rem;
  background: #9b59b6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.3s;
}

.btn-download-all:hover {
  background: #8e44ad;
}

/* 错误信息 */
.errors {
  margin-top: 1.5rem;
}

.errors h4 {
  margin-bottom: 1rem;
  color: #e74c3c;
}

.error-item {
  padding: 0.8rem;
  background: #e74c3c;
  color: white;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

/* 预览弹窗 */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-container {
  width: 90%;
  height: 90%;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #ecf0f1;
}

.preview-header h3 {
  margin: 0;
  color: #2c3e50;
}

.btn-close {
  padding: 0.5rem 1rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
}

.btn-close:hover {
  background: #c0392b;
}

.preview-iframe {
  flex: 1;
  border: none;
  width: 100%;
}

@media (max-width: 768px) {
  .md2pdf-page {
    padding: 1rem;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }

  .actions-section {
    flex-direction: column;
  }

  .result-item {
    flex-wrap: wrap;
  }

  .result-actions {
    width: 100%;
    justify-content: stretch;
  }

  .btn-preview,
  .btn-download {
    flex: 1;
  }
}
</style>
