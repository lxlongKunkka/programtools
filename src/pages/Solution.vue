<template>
	<div class="solution-root">
		<h2>AI 题解整理助手</h2>
		
		<div class="toolbar">
			<div class="toolbar-left">
				<label class="label">模型:</label>
				<select v-model="model">
					<option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
				</select>
			</div>
			<div class="toolbar-right">
				<button @click="generate" :disabled="loading || !inputText.trim()" class="btn-primary">
					{{ loading ? '⏳ 整理中...' : '🚀 开始整理' }}
				</button>
				<button @click="clear" class="btn-secondary">🧹 清空</button>
				<button @click="copyResult" :disabled="!result" class="btn-secondary">📋 复制结果</button>
				<button @click="saveResult" :disabled="!result" class="btn-secondary">💾 保存 Markdown</button>
			</div>
		</div>

		<div class="content-area">
			<div class="input-panel">
				<div class="panel-header">
					<h3>输入原题解析</h3>
					<span class="hint">分别粘贴题目和代码</span>
				</div>
				<div class="input-group">
					<div class="input-section">
						<label class="section-label">📝 题目描述</label>
						<textarea 
							v-model="problemText" 
							placeholder="粘贴题目内容...&#10;&#10;示例：&#10;给定一个数组 nums 和一个目标值 target..."
							:disabled="loading"
						></textarea>
					</div>
					<div class="input-section">
						<label class="section-label">💻 AC 代码</label>
						<textarea 
							v-model="codeText" 
							placeholder="粘贴通过的代码...&#10;&#10;示例：&#10;#include <iostream>&#10;using namespace std;&#10;..."
							:disabled="loading"
						></textarea>
					</div>
				</div>
			</div>

			<div class="output-panel">
				<div class="panel-header">
					<h3>整理后结果</h3>
					<span class="hint">Markdown 格式题解</span>
				</div>
				<div class="result-area" v-if="result" v-html="renderedResult"></div>
				<div class="result-area empty" v-else>
					<p>✨ 整理结果将显示在这里</p>
					<p class="tip">支持题意分析、算法标签、思路讲解和示例代码</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'

// 配置 marked 支持代码高亮
marked.setOptions({
	mangle: false,
	headerIds: false,
	breaks: true
})

export default {
	data() {
		return {
			problemText: '',
			codeText: '',
			result: '',
			loading: false,
			model: 'o4-mini',
			modelOptions: []
		}
	},
	computed: {
		inputText() {
			// 合并题目和代码
			let combined = ''
			if (this.problemText.trim()) {
				combined += '题目：\n' + this.problemText.trim() + '\n\n'
			}
			if (this.codeText.trim()) {
				combined += 'AC代码：\n' + this.codeText.trim()
			}
			return combined
		},
		renderedResult() {
			if (!this.result) return ''
			try {
				const html = marked.parse(this.result)
				return DOMPurify.sanitize(html)
			} catch (e) {
				return `<pre>${this.result}</pre>`
			}
		}
	},
	async mounted() {
		// 加载模型列表
		try {
			const r = await fetch('/api/models')
			if (r.ok) this.modelOptions = await r.json()
		} catch (e) {
			console.warn('failed to load models', e)
		}
	},
	updated() {
		// 渲染数学公式
		this.$nextTick(() => {
			const el = this.$el.querySelector('.result-area')
			if (el && this.result) {
				try {
					renderMathInElement(el, {
						delimiters: [
							{ left: '$$', right: '$$', display: true },
							{ left: '$', right: '$', display: false }
						],
						throwOnError: false,
						ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
					})
				} catch (e) {
					console.warn('KaTeX render error', e)
				}
			}
		})
	},
	methods: {
		async generate() {
			const text = this.inputText.trim()
			if (!text) return

			this.loading = true
			this.result = ''

			try {
				const resp = await fetch('/api/solution', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: text,
						model: this.model
					})
				})

				if (!resp.ok) {
					const errData = await resp.json().catch(() => ({}))
					throw new Error(errData.error || `HTTP ${resp.status}`)
				}

				const data = await resp.json()
				this.result = data.result || ''

			} catch (e) {
				console.error('Solution error:', e)
				alert(`整理失败: ${e.message}`)
			} finally {
				this.loading = false
			}
		},
		clear() {
			this.problemText = ''
			this.codeText = ''
			this.result = ''
		},
		copyResult() {
			if (!this.result) return
			navigator.clipboard.writeText(this.result)
				.then(() => alert('✅ 结果已复制到剪贴板'))
				.catch(err => {
					console.error('copy failed', err)
					alert('复制失败: ' + err.message)
				})
		},
		saveResult() {
			if (!this.result) return
			
			const blob = new Blob([this.result], { type: 'text/markdown;charset=utf-8' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `solution_${Date.now()}.md`
			a.click()
			URL.revokeObjectURL(url)
		}
	}
}
</script>

<style scoped>
.solution-root {
	max-width: 1400px;
	margin: 0 auto;
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	height: calc(100vh - 40px);
}

h2 {
	margin: 0;
	color: #1a1a1a;
}

.toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	background: #f8f9fa;
	border-radius: 8px;
	flex-wrap: wrap;
	gap: 12px;
}

.toolbar-left, .toolbar-right {
	display: flex;
	align-items: center;
	gap: 8px;
}

.label {
	font-weight: 600;
	color: #333;
}

select {
	padding: 6px 12px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 14px;
	cursor: pointer;
}

button {
	padding: 8px 16px;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	cursor: pointer;
	transition: all 0.2s;
}

.btn-primary {
	background: #1890ff;
	color: white;
	font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
	background: #40a9ff;
}

.btn-primary:disabled {
	background: #d9d9d9;
	cursor: not-allowed;
}

.btn-secondary {
	background: white;
	color: #333;
	border: 1px solid #ddd;
}

.btn-secondary:hover:not(:disabled) {
	background: #f5f5f5;
}

.btn-secondary:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.content-area {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
	flex: 1;
	min-height: 0;
}

.input-panel, .output-panel {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-height: 0;
}

.input-group {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-height: 0;
}

.input-section {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-height: 0;
}

.section-label {
	font-size: 14px;
	font-weight: 600;
	color: #1a1a1a;
	padding: 0 4px;
}

.panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.panel-header h3 {
	margin: 0;
	font-size: 16px;
	color: #1a1a1a;
}

.hint {
	font-size: 12px;
	color: #8c8c8c;
}

textarea {
	flex: 1;
	padding: 16px;
	border: 1px solid #ddd;
	border-radius: 8px;
	font-family: 'Consolas', 'Monaco', monospace;
	font-size: 14px;
	line-height: 1.6;
	resize: none;
	min-height: 0;
}

textarea:focus {
	outline: none;
	border-color: #1890ff;
}

.result-area {
	flex: 1;
	padding: 20px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 8px;
	overflow-y: auto;
	min-height: 0;
}

.result-area.empty {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	color: #8c8c8c;
}

.result-area.empty p {
	margin: 8px 0;
}

.result-area.empty .tip {
	font-size: 12px;
}

/* Markdown 样式 */
.result-area :deep(h2) {
	margin-top: 24px;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 2px solid #eee;
	color: #1a1a1a;
}

.result-area :deep(h3) {
	margin-top: 20px;
	margin-bottom: 10px;
	color: #333;
}

.result-area :deep(p) {
	margin: 12px 0;
	line-height: 1.8;
	color: #333;
}

.result-area :deep(pre) {
	background: #f6f8fa;
	padding: 16px;
	border-radius: 6px;
	overflow-x: auto;
	margin: 16px 0;
}

.result-area :deep(code) {
	font-family: 'Consolas', 'Monaco', monospace;
	font-size: 13px;
	background: #f6f8fa;
	padding: 2px 6px;
	border-radius: 3px;
}

.result-area :deep(pre code) {
	background: none;
	padding: 0;
}

.result-area :deep(ul), .result-area :deep(ol) {
	margin: 12px 0;
	padding-left: 24px;
}

.result-area :deep(li) {
	margin: 6px 0;
	line-height: 1.6;
}

/* 响应式 */
@media (max-width: 1024px) {
	.content-area {
		grid-template-columns: 1fr;
		grid-template-rows: 1fr 1fr;
	}
}
</style>
