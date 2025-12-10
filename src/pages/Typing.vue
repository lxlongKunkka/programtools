<template>
  <div class="typing-page">
    <div class="header-section">
      <h2>⌨️ 打字练习场</h2>
      <div class="mode-selector">
        <button :class="{ active: mode === 'practice' }" @click="setMode('practice')">单人练习</button>
        <button :class="{ active: mode === 'pk' }" @click="setMode('pk')">在线 PK</button>
        <button :class="{ active: mode === 'leaderboard' }" @click="setMode('leaderboard')">🏆 排行榜</button>
      </div>
    </div>

    <!-- 排行榜模式 -->
    <div v-if="mode === 'leaderboard'" class="leaderboard-area">
      <div class="leaderboard-tabs">
        <button :class="{ active: leaderboardType === 'speed' }" @click="leaderboardType = 'speed'; fetchLeaderboard()">🚀 速度榜</button>
        <button :class="{ active: leaderboardType === 'accuracy' }" @click="leaderboardType = 'accuracy'; fetchLeaderboard()">🎯 准确率榜</button>
        <button :class="{ active: leaderboardType === 'volume' }" @click="leaderboardType = 'volume'; fetchLeaderboard()">💪 练习量榜</button>
      </div>
      
      <div class="leaderboard-content">
        <div v-if="loadingLeaderboard" class="loading">加载中...</div>
        <table v-else class="leaderboard-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>用户</th>
              <th v-if="leaderboardType !== 'volume'">WPM</th>
              <th v-if="leaderboardType !== 'volume'">准确率</th>
              <th v-if="leaderboardType === 'volume'">练习次数</th>
              <th v-if="leaderboardType === 'volume'">平均 WPM</th>
              <th v-if="leaderboardType !== 'volume'">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in leaderboardData" :key="index">
              <td>
                <span :class="['rank-badge', `rank-${index + 1}`]">{{ index + 1 }}</span>
              </td>
              <td>{{ item.username }}</td>
              <td v-if="leaderboardType !== 'volume'">{{ item.wpm }}</td>
              <td v-if="leaderboardType !== 'volume'">{{ item.accuracy }}%</td>
              <td v-if="leaderboardType === 'volume'">{{ item.count }}</td>
              <td v-if="leaderboardType === 'volume'">{{ item.wpm }}</td>
              <td v-if="leaderboardType !== 'volume'">{{ new Date(item.createdAt).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="leaderboardData.length === 0">
              <td colspan="5" class="empty-tip">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 单人练习模式 -->
    <div v-if="mode === 'practice'" class="practice-area">
      <div class="stats-bar">
        <div class="stat-item">
          <span class="label">WPM</span>
          <span class="value">{{ wpm }}</span>
        </div>
        <div class="stat-item">
          <span class="label">正确率</span>
          <span class="value">{{ accuracy }}%</span>
        </div>
        <div class="stat-item">
          <span class="label">时间</span>
          <span class="value">{{ timeElapsed }}s</span>
        </div>
        <div class="stat-item action" v-if="finished">
           <button @click="resetPractice" class="btn-primary btn-restart">再来一局</button>
        </div>
      </div>

      <div class="code-display" ref="codeDisplay">
        <span 
          v-for="(char, index) in targetText" 
          :key="index"
          :class="getCharClass(index)"
        >{{ char }}</span>
      </div>

      <textarea
        ref="typingInput"
        v-model="userInput"
        class="typing-input"
        placeholder="点击此处开始输入..."
        @input="handleInput"
        @paste.prevent
        :disabled="finished"
      ></textarea>
    </div>

    <!-- PK 模式 -->
    <div v-else class="pk-area">
      <div v-if="pkState === 'idle'" class="pk-lobby">
        <h3>准备开始 PK</h3>
        <div v-if="!username" class="guest-input">
           <input v-model="guestName" placeholder="输入你的昵称" class="username-input" />
        </div>
        <div v-else class="user-info">
           <p>当前用户: <strong>{{ username }}</strong></p>
        </div>
        <p class="queue-info" v-if="queueCount > 0">当前有 {{ queueCount }} 人正在等待匹配</p>
        <button @click="findMatch" class="btn-primary btn-large" :disabled="!username && !guestName">🔍 寻找对手</button>
      </div>

      <div v-if="pkState === 'matching'" class="pk-matching">
        <div class="spinner"></div>
        <p>正在寻找对手...</p>
        <button @click="cancelMatch" class="btn-secondary">取消</button>
      </div>

      <div v-if="pkState === 'playing' || pkState === 'finished'" class="pk-game">
        <div class="players-info">
          <div class="player me">
            <span class="name">{{ username || guestName }} (我)</span>
            <div class="progress-bar">
              <div class="fill" :style="{ width: myProgress + '%' }"></div>
            </div>
            <span class="wpm">{{ wpm }} WPM</span>
          </div>
          <div class="player opponent">
            <span class="name">{{ opponentName }}</span>
            <div class="progress-bar opponent-bar">
              <div class="fill" :style="{ width: opponentProgress + '%' }"></div>
            </div>
            <span class="wpm">{{ opponentWpm }} WPM</span>
          </div>
        </div>

        <div class="code-display" ref="pkCodeDisplay">
          <span 
            v-for="(char, index) in targetText" 
            :key="index"
            :class="getCharClass(index)"
          >{{ char }}</span>
        </div>

        <textarea
          ref="typingInput"
          v-model="userInput"
          class="typing-input"
          @input="handlePkInput"
          @paste.prevent
          :disabled="pkState === 'finished'"
          placeholder="点击此处开始输入..."
          autofocus
        ></textarea>
        
        <div v-if="pkState === 'finished'" class="pk-result">
           <h3>{{ pkResultText }}</h3>
           <button @click="resetPk" class="btn-primary">返回大厅</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'
import request from '../utils/request'

export default {
  data() {
    return {
      mode: 'practice', // 'practice' | 'pk' | 'leaderboard'
      
      // Common
      targetText: "hello world",
      userInput: '',
      startTime: null,
      endTime: null,
      timer: null,
      timeElapsed: 0,
      
      // Leaderboard
      leaderboardType: 'speed', // 'speed' | 'accuracy' | 'volume'
      leaderboardData: [],
      loadingLeaderboard: false,

      // PK State
      socket: null,
      roomId: null,
      pkState: 'idle', // 'idle' | 'matching' | 'playing' | 'finished'
      queueCount: 0,
      username: '',
      guestName: '',
      opponentName: '对手',
      opponentProgress: 0,
      opponentWpm: 0,
      myProgress: 0,
      pkResultText: ''
    }
  },
  mounted() {
    const userStr = localStorage.getItem('user_info')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.username) this.username = user.username
      } catch (e) {}
    }
  },
  computed: {
    wpm() {
      if (!this.startTime || this.timeElapsed === 0) return 0
      const words = this.userInput.length / 5
      const minutes = this.timeElapsed / 60
      return Math.round(words / minutes)
    },
    accuracy() {
      if (this.userInput.length === 0) return 100
      let correct = 0
      for (let i = 0; i < this.userInput.length; i++) {
        if (this.userInput[i] === this.targetText[i]) correct++
      }
      return Math.round((correct / this.userInput.length) * 100)
    },
    finished() {
      return this.userInput === this.targetText
    }
  },
  methods: {
    setMode(m) {
      if (this.mode === m) return
      this.mode = m
      if (m === 'practice') {
        this.resetPractice()
      } else if (m === 'pk') {
        if (!this.socket) this.initSocket()
      } else if (m === 'leaderboard') {
        this.fetchLeaderboard()
      }
    },
    // Practice Logic
    resetPractice() {
      this.userInput = ''
      this.startTime = null
      this.endTime = null
      this.timeElapsed = 0
      clearInterval(this.timer)
      this.targetText = this.getRandomText()
      this.$nextTick(() => {
        if (this.$refs.typingInput) this.$refs.typingInput.focus()
      })
    },
    async saveResult() {
      try {
        await request('/api/typing/results', {
          method: 'POST',
          body: JSON.stringify({
            username: this.username || 'Guest',
            wpm: this.wpm,
            accuracy: this.accuracy,
            timeElapsed: this.timeElapsed
          })
        })
      } catch (e) {
        console.error('Failed to save result', e)
      }
    },
    async fetchLeaderboard() {
      this.loadingLeaderboard = true
      try {
        const res = await request(`/api/typing/leaderboard?type=${this.leaderboardType}`)
        this.leaderboardData = res || []
      } catch (e) {
        console.error('Failed to fetch leaderboard', e)
      } finally {
        this.loadingLeaderboard = false
      }
    },
    handleInput() {
      if (!this.startTime) {
        this.startTime = Date.now()
        this.timer = setInterval(() => {
          this.timeElapsed = Math.floor((Date.now() - this.startTime) / 1000)
        }, 1000)
      }
      // 自动滚动代码显示区域
      this.$nextTick(() => {
        const codeBox = this.$refs.codeDisplay
        if (codeBox) {
          const chars = codeBox.querySelectorAll('span')
          const idx = this.userInput.length - 1
          if (chars[idx]) {
            chars[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
          }
        }
      })
      if (this.userInput === this.targetText) {
        this.endTime = Date.now()
        clearInterval(this.timer)
        this.saveResult()
      }
    },
    getCharClass(index) {
      if (index >= this.userInput.length) return ''
      return this.userInput[index] === this.targetText[index] ? 'correct' : 'wrong'
    },
    getRandomText() {
      const texts = [
        "#include <bits/stdc++.h>",
        "using namespace std;",
        "int main()",
        "int a = 10;",
        "if(a > b)\n{\n    cout << \"a > b\";\n}\nelse\n{\n    cout << \"a < b\";\n}",
        "#include <bits/stdc++.h>\nusing namespace std;\nint main()\n{\n    return 0;\n}",
        "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    cout << \"hello world\";\n    return 0;\n}",
        "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    int x, y, z;\n    cin >> x >> y >> z;\n    cout << y;\n    return 0;\n}",
        "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    cin >> a;\n    cout << fixed << setprecision(3);\n    cout << a << endl; \n    return 0;\n}",
        "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    int a, b;\n    cin >> a >> b;\n    cout << a/b << ' ' << a%b;\n    return 0;\n}",
        "#include <bits/stdc++.h>\n\nusing namespace std;\n\nint main()\n{\n    char c;\n    cin >> c;\n    cout << \"  \" << c << endl;\n    cout << \" \" << c << c << c << endl;\n    cout << c << c << c << c << c << endl;\n    return 0;\n}"
      ]
      return texts[Math.floor(Math.random() * texts.length)]
    },

    // PK Logic
    initSocket() {
      // Connect to backend (relative path works if proxied, else need full URL)
      const url = import.meta.env.DEV ? 'http://localhost:3000' : '/'
      this.socket = io(url)
      
      this.socket.on('connect', () => {
        console.log('Socket connected')
      })

      this.socket.on('queue_count', (count) => {
        this.queueCount = count
      })

      this.socket.on('waiting_for_match', () => {
        this.pkState = 'matching'
      })

      this.socket.on('match_start', ({ roomId, text, players }) => {
        this.pkState = 'playing'
        this.roomId = roomId
        this.targetText = text
        this.userInput = ''
        this.startTime = Date.now()
        this.timeElapsed = 0
        this.myProgress = 0
        this.opponentProgress = 0
        
        const opp = players.find(p => p.id !== this.socket.id)
        this.opponentName = opp ? opp.username : '对手'
        
        this.timer = setInterval(() => {
          this.timeElapsed = Math.floor((Date.now() - this.startTime) / 1000)
        }, 1000)
        
        this.$nextTick(() => this.$refs.typingInput && this.$refs.typingInput.focus())
      })

      this.socket.on('opponent_progress', ({ progress, wpm }) => {
        this.opponentProgress = progress
        this.opponentWpm = wpm
      })

      this.socket.on('player_finished', ({ id, username }) => {
        if (id !== this.socket.id) {
           // Opponent finished
           this.opponentProgress = 100
           if (this.pkState !== 'finished') {
             this.pkState = 'finished'
             this.pkResultText = '❌ 你输了!'
             clearInterval(this.timer)
           }
        }
      })
    },
    findMatch() {
      if (!this.socket) this.initSocket()
      const name = this.username || this.guestName
      this.socket.emit('find_match', { username: name })
      this.pkState = 'matching'
    },
    cancelMatch() {
      // Implement cancel logic if needed
      this.pkState = 'idle'
    },
    handlePkInput() {
      if (this.pkState !== 'playing') return
      // Calculate progress
      const progress = Math.floor((this.userInput.length / this.targetText.length) * 100)
      this.myProgress = progress
      this.socket.emit('update_progress', {
        roomId: this.roomId,
        progress,
        wpm: this.wpm
      })
      // 自动滚动代码显示区域
      this.$nextTick(() => {
        const codeBox = this.$refs.pkCodeDisplay
        if (codeBox) {
          // 滚动到当前输入字符位置
          const chars = codeBox.querySelectorAll('span')
          const idx = this.userInput.length - 1
          if (chars[idx]) {
            chars[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
          }
        }
      })
      if (this.userInput === this.targetText) {
        this.pkState = 'finished'
        this.pkResultText = '🏆 你赢了!'
        clearInterval(this.timer)
        this.socket.emit('match_finish', {
          roomId: this.roomId,
          time: this.timeElapsed,
          wpm: this.wpm
        })
      }
    },
    resetPk() {
      this.pkState = 'idle'
      this.userInput = ''
    }
  },
  beforeUnmount() {
    if (this.socket) this.socket.disconnect()
    clearInterval(this.timer)
  }
}
</script>

<style scoped>
.typing-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.mode-selector button {
  padding: 8px 16px;
  margin-left: 10px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.mode-selector button.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  background: #f7fafc;
  padding: 15px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item .label {
  font-size: 12px;
  color: #718096;
}

.stat-item .value {
  font-size: 24px;
  font-weight: bold;
  color: #2d3748;
}

.code-display {
  font-family: 'Consolas', monospace;
  font-size: 24px;
  line-height: 1.6;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  white-space: pre-wrap;
  user-select: none;
}

.code-display.small {
  font-size: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.code-display span.correct {
  color: #48bb78;
}

.code-display span.wrong {
  color: #f56565;
  background: #fed7d7;
}

.typing-input {
  width: 100%;
  height: 200px;
  padding: 15px;
  font-family: 'Consolas', monospace;
  font-size: 18px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  resize: none;
}

.typing-input:focus {
  outline: none;
  border-color: #4299e1;
}

/* Leaderboard Styles */
.leaderboard-area {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.leaderboard-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}
.leaderboard-tabs button {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.leaderboard-tabs button.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}
.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}
.leaderboard-table th, .leaderboard-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
}
.leaderboard-table th {
  color: #718096;
  font-weight: 600;
}
.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  background: #edf2f7;
  color: #718096;
  font-size: 12px;
  font-weight: bold;
}
.rank-1 { background: #ecc94b; color: white; }
.rank-2 { background: #a0aec0; color: white; }
.rank-3 { background: #ed8936; color: white; }
.empty-tip {
  text-align: center;
  color: #a0aec0;
  padding: 40px;
}

/* PK Styles */
.pk-lobby, .pk-matching {
  text-align: center;
  padding: 50px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.queue-info {
  color: #718096;
  font-size: 14px;
  margin: 10px 0;
}

.username-input {
  padding: 10px;
  font-size: 16px;
  margin-right: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.players-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.player {
  width: 48%;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.progress-bar {
  height: 10px;
  background: #edf2f7;
  border-radius: 5px;
  margin: 10px 0;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: #4299e1;
  transition: width 0.3s ease;
}

.opponent-bar .fill {
  background: #ed8936;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4299e1;
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-restart {
  padding: 6px 12px;
  font-size: 14px;
  margin-left: 10px;
}

.stat-item.action {
  margin-left: auto;
  display: flex;
  align-items: center;
}
</style>
