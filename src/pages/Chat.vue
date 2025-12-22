@media (max-width: 900px) {
	.chat-root {
		max-width: 100vw;
		padding: 10px 2vw 10px 2vw;
		min-height: 90vh;
	}
	.chat-window {
		height: 36vh;
		min-height: 160px;
		max-height: 40vh;
		padding: 10px 2px 10px 2px;
	}
	.chat-input-area textarea {
		font-size: 14px;
		min-height: 36px;
		max-height: 120px;
		padding: 8px;
	}
	.chat-content {
		font-size: 14px;
		padding: 10px 8px;
	}
	.settings-panel {
		padding: 10px 4px 8px 4px;
	}
}
@media (max-width: 600px) {
	.chat-root {
		border-radius: 0;
		box-shadow: none;
		padding: 2vw 0 2vw 0;
	}
	.chat-toolbar {
		flex-direction: column;
		gap: 6px;
		align-items: stretch;
	}
	.chat-toolbar > div {
		flex-direction: column;
		gap: 4px;
		align-items: stretch;
	}
	.chat-window {
		min-height: 100px;
		height: 28vh;
		max-height: 32vh;
		padding: 4px 0 4px 0;
	}
	.chat-input-area {
		flex-direction: column;
		gap: 6px;
	}
	.input-actions button {
		width: 100%;
		padding: 10px 0;
		font-size: 15px;
	}
}

<template>
	<div class="chat-root">
		<div class="chat-toolbar">
			<div class="toolbar-left">
				<span class="chat-title">对话 (上下文模式)</span>
				<label class="label">模型:</label>
				<select v-model="model">
					<option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
				</select>
			</div>
			<div class="toolbar-right">
				<button @click="showSettings = !showSettings">{{ showSettings ? '隐藏设置' : '高级设置' }}</button>
				<button @click="clearChat">清空对话</button>
			</div>
		</div>

		<!-- 高级设置面板 -->
		<div v-if="showSettings" class="settings-panel">
			<div class="setting-row">
				<label>系统提示词 (System Prompt):</label>
				<textarea v-model="systemPrompt" placeholder="定义 AI 的角色、性格、说话风格等，例如：你是一个温柔体贴的陪聊AI，性格活泼开朗..." rows="4"></textarea>
			</div>
			<div class="setting-row">
				<label>助手初始消息 (可选):</label>
				<textarea v-model="initialAssistant" placeholder="AI 的第一句话，例如：你好呀！我是你的专属陪聊助手，有什么想聊的吗？" rows="2"></textarea>
			</div>
			<div class="setting-actions">
				<button @click="applySettings">应用设置</button>
				<button @click="resetSettings">重置为默认</button>
			</div>
		</div>

		<div class="chat-window">
			<div v-for="(m, i) in messages" :key="m.id" :id="'msg-'+m.id" :class="['chat-line', m.role]">
				<div class="chat-meta">{{ m.role === 'user' ? '你' : (m.role === 'assistant' ? 'AI' : m.role) }} <span class="time">{{ m.time || '' }}</span></div>
				<div class="chat-bubble">
					<MarkdownViewer :content="m.content" class="chat-content" />
					<div class="chat-actions">
						<button @click="copyMessage(m)">复制</button>
					</div>
				</div>
			</div>
		</div>

		<div class="chat-input-area">
			<textarea v-model="inputText" :disabled="loading" placeholder="输入消息，Shift+Enter 换行，Enter 发送" @keydown.enter.exact.prevent="send" @keydown.enter.shift="newline"></textarea>
			<div class="input-actions">
				<button @click="send" :disabled="loading || !inputText.trim()">发送</button>
			</div>
		</div>
	</div>
</template>

<script>
import request from '../utils/request'
import { getModels } from '../utils/models'

export default {
  inject: ['showToastMessage'],
	data() {
		return {
			inputText: '',
			messages: [],
			loading: false,
			model: 'grok-4-fast',
			modelOptions: [],
			sessionId: null,
			showSettings: false,
			systemPrompt: '',
			initialAssistant: ''
		}
	},
	async mounted() {
		// load models
		try {
			const list = await getModels()
			if (Array.isArray(list)) this.modelOptions = list
		} catch (e) { console.warn('failed to load models', e) }

		// 从 localStorage 加载设置
		try {
			const savedSystem = localStorage.getItem('chat_system_prompt')
			const savedInitial = localStorage.getItem('chat_initial_assistant')
			if (savedSystem) this.systemPrompt = savedSystem
			if (savedInitial) this.initialAssistant = savedInitial
		} catch (e) { console.warn('failed to load settings', e) }

		// session persistence: load or create sessionId in localStorage
		let sid = localStorage.getItem('chat_sessionId')
		if (!sid) { sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }
		this.sessionId = sid
		localStorage.setItem('chat_sessionId', sid)
		try {
			const data = await request(`/api/sessions/${sid}`)
			if (Array.isArray(data) && data.length > 0) this.messages = data
		} catch (e) { console.warn('failed to load session', e) }
	},
	methods: {
		makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` },
		async send() {
			const text = this.inputText.trim()
			if (!text || this.loading) return
			const now = new Date().toLocaleTimeString()
			const looksLikeLatex = /\\[a-zA-Z]+|\\\(|\\\)|\^\{|\\frac|\\int|\\sum|\\sqrt/.test(text)
			const userContent = (!text.includes('$') && looksLikeLatex) ? `$$${text}$$` : text
			const uid = this.makeId()
			this.messages.push({ id: uid, role: 'user', content: userContent, time: now })
			this.$nextTick(() => { const el = this.$el.querySelector('.chat-window'); if (el) el.scrollTop = el.scrollHeight })

			// 构建发送给后端的消息数组，插入 system 和 initial assistant
			const apiMessages = []
			if (this.systemPrompt && this.systemPrompt.trim()) {
				apiMessages.push({ role: 'system', content: this.systemPrompt.trim() })
			}
			if (this.initialAssistant && this.initialAssistant.trim() && this.messages.length === 1) {
				// 只在第一次用户发消息时插入 initial assistant
				apiMessages.push({ role: 'assistant', content: this.initialAssistant.trim() })
			}
			// 添加所有历史消息
			apiMessages.push(...this.messages.map(m => ({ role: m.role, content: m.content })))

			const payload = { messages: apiMessages, model: this.model, sessionId: this.sessionId }
			this.inputText = ''
			this.loading = true
			try {
				const data = await request('/api/chat', { method: 'POST', body: JSON.stringify(payload) })
				
				if (data && data.result) {
					const assistantContent = data.result
					const aid = this.makeId()
					this.messages.push({ id: aid, role: 'assistant', content: assistantContent, time: new Date().toLocaleTimeString() })
					this.$nextTick(() => { const el = this.$el.querySelector('.chat-window'); if (el) el.scrollTop = el.scrollHeight })
				} else {
					const err = (data && (data.error || data.detail)) || 'Chat request failed'
					this.showToastMessage(`Error: ${err}`)
				}
			} catch (e) {
				console.error('chat request error', e)
				this.showToastMessage('Network error: ' + e.message)
			} finally {
				this.loading = false
			}
		},
		newline(e) { const textarea = e.target; const pos = textarea.selectionStart; this.inputText = this.inputText.slice(0,pos) + '\n' + this.inputText.slice(pos); this.$nextTick(() => { textarea.selectionStart = textarea.selectionEnd = pos + 1 }) },
		copyMessage(m) { const text = m.content || ''; navigator.clipboard.writeText(text).then(()=>{ this.showToastMessage('已复制消息到剪贴板') }).catch(err => { console.error('copy failed', err); this.showToastMessage('复制失败: ' + err) }) },
		clearChat() { this.messages = []; request(`/api/sessions/${this.sessionId}/clear`, { method: 'POST' }).catch(()=>{}) },
		applySettings() {
			// 保存设置到 localStorage
			localStorage.setItem('chat_system_prompt', this.systemPrompt)
			localStorage.setItem('chat_initial_assistant', this.initialAssistant)
			this.showToastMessage('设置已保存')
		},
		resetSettings() {
			this.systemPrompt = ''
			this.initialAssistant = ''
			localStorage.removeItem('chat_system_prompt')
			localStorage.removeItem('chat_initial_assistant')
			this.showToastMessage('设置已重置')
		}
	}
}
</script>

<style scoped>
.chat-root {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100vw;
	min-width: 0;
	min-height: 80vh;
	background: #f4f7fb;
	border-radius: 0;
	box-shadow: none;
	padding: 32px 3vw 18px 3vw;
	font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
	box-sizing: border-box;
}
.chat-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px;
	flex-wrap: wrap;
	margin-bottom: 8px;
	padding: 0;
}
.toolbar-left {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
}
.toolbar-right {
	display: flex;
	align-items: center;
	gap: 10px;
}
.chat-title {
	font-size: 1.25rem;
	font-weight: 700;
	margin-right: 18px;
	color: #3a4a6b;
}
.chat-toolbar button {
	background: linear-gradient(90deg,#4f8cff,#6edfff);
	color: #fff;
	border: none;
	border-radius: 6px;
	padding: 7px 16px;
	font-size: 15px;
	cursor: pointer;
	font-weight: 600;
	transition: background 0.2s, color 0.2s;
	box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}
.chat-toolbar button:hover {
	background: linear-gradient(90deg,#6edfff,#4f8cff);
}
.label {
	margin-right: 6px;
	font-weight: 600;
	color: #4f8cff;
}
.settings-panel {
	border: 1.5px solid #e0e6ef;
	padding: 18px 14px 14px 14px;
	background: #fafdff;
	border-radius: 12px;
	margin-bottom: 12px;
	box-shadow: 0 1px 6px rgba(80,120,200,0.04);
}
.setting-row {
	margin-bottom: 14px;
}
.setting-row label {
	display: block;
	font-weight: 600;
	margin-bottom: 6px;
	color: #4f8cff;
}
.setting-row textarea {
	width: 100%;
	padding: 10px;
	border: 1.5px solid #b3c6e2;
	border-radius: 8px;
	font-family: inherit;
	resize: vertical;
	font-size: 15px;
	background: #fafdff;
	transition: border 0.2s;
}
.setting-row textarea:focus {
	border: 1.5px solid #4f8cff;
	outline: none;
}
.setting-actions {
	display: flex;
	gap: 10px;
	margin-top: 10px;
}
.setting-actions button {
	padding: 8px 18px;
	background: linear-gradient(90deg,#4f8cff,#6edfff);
	color: #fff;
	border: none;
	border-radius: 8px;
	font-size: 15px;
	font-weight: 600;
	cursor: pointer;
	box-shadow: 0 1px 4px rgba(0,0,0,0.07);
	transition: background 0.2s, color 0.2s;
}
.setting-actions button:hover {
	background: linear-gradient(90deg,#6edfff,#4f8cff);
}
.chat-window {
	border: 1.5px solid #e0e6ef;
	padding: 18px 12px 18px 12px;
	height: 48vh;
	min-height: 260px;
	max-height: 60vh;
	overflow-y: auto;
	background: #f9fbff;
	border-radius: 12px;
	box-shadow: 0 2px 12px rgba(80,120,200,0.06);
	margin-bottom: 8px;
	transition: box-shadow 0.2s;
}
.chat-window::-webkit-scrollbar {
	width: 8px;
	background: #f0f4fa;
}
.chat-window::-webkit-scrollbar-thumb {
	background: #dbeafe;
	border-radius: 6px;
}
.chat-line {
	margin-bottom: 18px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}
.chat-meta {
	font-size: 12px;
	color: #888;
	margin-bottom: 4px;
	margin-left: 2px;
}
.chat-bubble {
	display: flex;
	justify-content: flex-start;
	gap: 8px;
	width: 100%;
}
.chat-content {
	flex: 1;
	white-space: pre-wrap;
	padding: 14px 16px;
	border-radius: 14px;
	background: #fff;
	font-size: 16px;
	box-shadow: 0 1px 6px rgba(80,120,200,0.04);
	word-break: break-word;
	line-height: 1.7;
	max-width: 90%;
}
.chat-line.user .chat-content {
	background: linear-gradient(90deg,#e0f7fa,#e6f7ff);
	align-self: flex-end;
}
.chat-line.assistant .chat-content {
	background: linear-gradient(90deg,#fffbe6,#fff7e6);
	align-self: flex-start;
}
.chat-line.system .chat-content {
	background: #f0f1f5;
	color: #888;
}
.chat-actions {
	display: flex;
	align-items: center;
	margin-left: 8px;
}
.chat-input-area {
	display: flex;
	gap: 10px;
	align-items: flex-end;
	margin-top: 10px;
	flex-wrap: wrap;
}
.chat-input-area textarea {
	flex: 1 1 200px;
	min-height: 48px;
	max-height: 180px;
	padding: 12px;
	border-radius: 10px;
	border: 1.5px solid #b3c6e2;
	font-size: 15px;
	resize: vertical;
	background: #fafdff;
	transition: border 0.2s;
	box-shadow: 0 1px 4px rgba(80,120,200,0.04);
}
.chat-input-area textarea:focus {
	border: 1.5px solid #4f8cff;
	outline: none;
}
.input-actions button {
	padding: 10px 22px;
	background: linear-gradient(90deg,#4f8cff,#6edfff);
	color: #fff;
	border: none;
	border-radius: 8px;
	font-size: 16px;
	font-weight: 600;
	cursor: pointer;
	box-shadow: 0 1px 4px rgba(0,0,0,0.07);
	transition: background 0.2s, color 0.2s;
}
.input-actions button:disabled {
	background: #b3c6e2;
	color: #fff;
	cursor: not-allowed;
}
</style>
