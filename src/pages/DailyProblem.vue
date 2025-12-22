<template>
  <div class="daily-problem-container">
    <div class="header">
      <h1>每日一题</h1>
      <p class="date">{{ currentDate }}</p>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="content-wrapper">
      <div class="side-column left-sidebar">
        <div class="history-panel">
          <h3>📅 往期回顾</h3>
          <div v-if="history.length === 0" class="empty-state">暂无历史题目</div>
          <div v-else class="history-list">
            <div v-for="day in history" :key="day.date" class="history-item">
              <div class="history-date">{{ day.date }}</div>
              <div class="history-problems">
                <a v-if="day.problems.A" :href="getProblemLink(day.problems.A)" target="_blank" class="history-link" :class="day.problems.A.solved ? 'solved' : 'unsolved'" title="A营">A</a>
                <a v-if="day.problems.B" :href="getProblemLink(day.problems.B)" target="_blank" class="history-link" :class="day.problems.B.solved ? 'solved' : 'unsolved'" title="B营">B</a>
                <a v-if="day.problems.C" :href="getProblemLink(day.problems.C)" target="_blank" class="history-link" :class="day.problems.C.solved ? 'solved' : 'unsolved'" title="C营">C</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="main-column">
        <!-- Sunday View -->
        <div v-if="isSunday" class="sunday-view">
          <div class="sunday-header">
            <h2>☕ 周日休息日 · 本周题目回顾</h2>
            <p>今天不生成新题目，快来补全本周未完成的挑战吧！</p>
          </div>
          
          <div class="weekly-review-grid">
            <div v-for="camp in camps" :key="camp.id" class="weekly-camp-column">
              <div class="camp-header-small" :class="'camp-' + camp.id.toLowerCase()">
                <h3>{{ camp.name }}</h3>
                <span>{{ camp.desc }}</span>
              </div>
              
              <div class="weekly-problems-list">
                <div v-for="p in problems[camp.id]" :key="p._id" class="weekly-problem-item">
                  <div class="wp-date">{{ p.date.slice(5) }}</div>
                  <div class="wp-info">
                    <a :href="getProblemLink(p)" target="_blank" class="wp-title">
                      <span v-if="p.docId" style="margin-right: 4px;">{{ p.docId }}.</span>{{ p.title }}
                    </a>
                    <span class="wp-status" :class="p.solved ? 'solved' : 'unsolved'">
                      {{ p.solved ? '已完成' : '未完成' }}
                    </span>
                  </div>
                </div>
                <div v-if="!problems[camp.id] || problems[camp.id].length === 0" class="empty-state-small">
                  本周暂无题目
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Normal Day View -->
        <div v-else>
          <div class="camps-grid">
            <div v-for="camp in camps" :key="camp.id" class="camp-card">
              <div class="camp-header">
                <h3>{{ camp.name }}</h3>
                <span class="camp-desc">{{ camp.desc }}</span>
              </div>

              <div v-if="problems[camp.id]" class="problem-content">
                <div class="problem-title-row">
                  <h4>
                    <span v-if="problems[camp.id].docId" style="margin-right: 5px;">{{ problems[camp.id].docId }}.</span>{{ problems[camp.id].title }}
                  </h4>
                  <span v-if="solvedStatus[camp.id]" class="status-badge solved">已完成</span>
                  <span v-else class="status-badge unsolved">未完成</span>
                </div>
                
                <div class="tags-row" v-if="problems[camp.id].tag && problems[camp.id].tag.length">
                  <span v-for="tag in problems[camp.id].tag" :key="tag" class="tag-badge">{{ tag }}</span>
                </div>

                <div class="actions">
                  <a :href="getProblemLink(problems[camp.id])" target="_blank" class="btn-challenge">
                    <span class="icon">🚀</span> 去挑战
                  </a>
                </div>
              </div>
              <div v-else class="no-problem">
                <p>今日暂无题目</p>
              </div>
            </div>
          </div>

          <div class="check-all-section">
            <button @click="checkAllStatus" class="btn-check-all" :disabled="checking">
                <span class="icon">🔄</span> {{ checking ? '检查所有状态...' : '一键检查状态' }}
              </button>
          </div>
        </div>

        <div class="participation-section">
          <h3>📅 今日打卡英雄榜</h3>
          <div v-if="todayStats.length === 0" class="empty-state">还没有同学打卡，快来抢沙发！</div>
          <div v-else class="participants-grid">
            <div v-for="user in todayStats" :key="user.uid" class="participant-card" @click="openUserModal(user)" style="cursor: pointer;">
              <div class="p-avatar">{{ user.uname ? user.uname.charAt(0).toUpperCase() : '?' }}</div>
              <div class="p-info">
                <div class="p-name">{{ user.uname }}</div>
                <div class="p-score">已过 {{ user.count }} 关</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="side-column right-sidebar">
        <div class="leaderboard-panel">
          <div class="lb-header">
            <h3>🏆 排行榜</h3>
            <div class="lb-tabs">
              <span :class="{ active: leaderboardTab === 'total' }" @click="leaderboardTab = 'total'">总榜</span>
              <span :class="{ active: leaderboardTab === 'weekly' }" @click="leaderboardTab = 'weekly'">周榜</span>
            </div>
          </div>
          
          <ul class="leaderboard-list" v-if="leaderboardTab === 'total'">
            <li v-for="(user, index) in leaderboard" :key="user.uid" class="lb-item">
              <span class="lb-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="lb-name">{{ user.uname }}</span>
              <span class="lb-count">{{ user.count }}题</span>
            </li>
          </ul>
          <div v-if="leaderboardTab === 'total' && leaderboard.length === 0" class="empty-state">暂无数据</div>

          <ul class="leaderboard-list" v-if="leaderboardTab === 'weekly'">
            <li v-for="(user, index) in weeklyLeaderboard" :key="user.uid" class="lb-item">
              <span class="lb-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
              <span class="lb-name">{{ user.uname }}</span>
              <span class="lb-count">{{ user.count }}题</span>
            </li>
          </ul>
          <div v-if="leaderboardTab === 'weekly' && weeklyLeaderboard.length === 0" class="empty-state">本周暂无数据</div>

        </div>
      </div>
    </div>

    <!-- User Detail Modal -->
    <div v-if="showUserModal" class="modal-overlay" @click="closeUserModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedUser.uname }} 的今日战绩</h3>
          <button class="close-btn" @click="closeUserModal">×</button>
        </div>
        <div class="modal-body">
          <div class="user-summary">
            <div class="modal-avatar">{{ selectedUser.uname ? selectedUser.uname.charAt(0).toUpperCase() : '?' }}</div>
            <div class="modal-stats">
              <p class="stat-text">今日已解决 <strong>{{ selectedUser.count }}</strong> 题</p>
              <p class="stat-text">本周已解决 <strong>{{ selectedUser.weeklyCount || 0 }}</strong> 题</p>
              <p class="stat-text">累计已解决 <strong>{{ selectedUser.totalCount || 0 }}</strong> 题</p>
            </div>
          </div>
          <div class="solved-list">
            <h4>已完成题目：</h4>
            <div class="solved-badges">
               <span v-for="p in selectedUser.solved" :key="p.pid" class="solved-badge" :class="getCampClass(p.domainId)">
                 {{ getCampName(p.domainId) }}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import request from '../utils/request'

export default {
  inject: ['showToastMessage'],
  data() {
    return {
      loading: true,
      error: null,
      problems: { A: null, B: null, C: null },
      solvedStatus: { A: false, B: false, C: false },
      checking: false,
      currentDate: new Date().toLocaleDateString(),
      camps: [
        { id: 'A', name: 'A营', desc: 'L1-L2 基础' },
        { id: 'B', name: 'B营', desc: 'L3-L4 进阶' },
        { id: 'C', name: 'C营', desc: 'L5-L6 提高' }
      ],
      todayStats: [],
      leaderboard: [],
      weeklyLeaderboard: [],
      leaderboardTab: 'total', // 'total' or 'weekly'
      history: [],
      showUserModal: false,
      selectedUser: {},
      isSunday: false
    }
  },
  async created() {
    await this.fetchAllDailyProblems()
    this.fetchStats()
    this.fetchHistory()
  },
  methods: {
    openUserModal(user) {
      this.selectedUser = user
      this.showUserModal = true
    },
    closeUserModal() {
      this.showUserModal = false
      this.selectedUser = {}
    },
    getCampName(domainId) {
      const map = { 'gymA': 'A营', 'gymB': 'B营', 'gymC': 'C营' }
      return map[domainId] || '未知'
    },
    getCampClass(domainId) {
      const map = { 'gymA': 'badge-a', 'gymB': 'badge-b', 'gymC': 'badge-c' }
      return map[domainId] || ''
    },
    async fetchHistory() {
      try {
        const res = await request('/api/daily/history')
        this.history = res
      } catch (e) {
        console.error('Failed to fetch history', e)
      }
    },
    async fetchStats() {
      try {
        const res = await request('/api/daily/stats')
        this.todayStats = res.today || []
        this.leaderboard = res.leaderboard || []
        this.weeklyLeaderboard = res.weeklyLeaderboard || []
      } catch (e) {
        console.error('Failed to fetch stats', e)
      }
    },
    getProblemLink(problem) {
      if (problem && problem.domainId && problem.docId) {
        return `https://acjudge.com/d/${problem.domainId}/p/${problem.docId}`
      }
      return '#'
    },
    async fetchAllDailyProblems() {
      try {
        this.loading = true
        this.error = null
        const res = await request('/api/daily/all')
        this.isSunday = res.isSunday
        this.problems = res.problems
        
        if (!this.isSunday) {
          await this.checkAllStatus(false) // Check status silently
        }
      } catch (e) {
        this.error = '获取每日一题失败: ' + (e.response?.data?.error || e.message)
      } finally {
        this.loading = false
      }
    },
    async checkAllStatus(showToast = true) {
      try {
        this.checking = true
        const res = await request('/api/daily/status-all')
        this.solvedStatus = res
        
        if (showToast) {
          const solvedCount = Object.values(res).filter(s => s).length
          if (solvedCount > 0) {
             this.showToastMessage(`状态已更新，你已完成 ${solvedCount} 个营的题目！`)
          } else {
             this.showToastMessage('尚未检测到通过记录，请稍后再试。')
          }
        }
      } catch (e) {
        if (showToast) this.showToastMessage('检查状态失败')
      } finally {
        this.checking = false
      }
    }
  }
}
</script>

<style scoped>
.daily-problem-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f4f6f9;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px 30px;
  border-radius: 16px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.03);
}

.header h1 {
  font-size: 1.5rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2c3e50;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.header h1::before {
  content: '📅';
  font-size: 1.5rem;
}

.date {
  margin: 0;
  font-size: 0.95rem;
  color: #596e79;
  background: #f8f9fa;
  display: inline-block;
  padding: 6px 20px;
  border-radius: 50px;
  font-weight: 500;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.side-column {
  width: 260px;
  flex-shrink: 0;
}

.main-column {
  flex: 1;
  min-width: 0;
}

/* Common Card Style */
.camp-card, .history-panel, .leaderboard-panel, .participation-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.camp-card:hover, .history-panel:hover, .leaderboard-panel:hover, .participation-section:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.06);
}

/* Camp Cards */
.camps-grid {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.camp-card {
  flex: 0 1 220px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-height: 180px;
}

/* Subtle top border instead of gradient bar */
.camp-card { border-top: 4px solid transparent; }
.camp-card:nth-child(1) { border-top-color: #3498db; }
.camp-card:nth-child(2) { border-top-color: #9b59b6; }
.camp-card:nth-child(3) { border-top-color: #e74c3c; }

.camp-header {
  margin-bottom: 10px;
  text-align: center;
}

.camp-header h3 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 800;
}

.camp-desc {
  color: #95a5a6;
  font-size: 0.8rem;
  font-weight: 500;
}

.problem-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.problem-title-row {
  margin-bottom: 10px;
  text-align: center;
}

.problem-title-row h4 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: #34495e;
  font-weight: 700;
  line-height: 1.3;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.status-badge.solved {
  background-color: #e8f8f5;
  color: #27ae60;
}

.status-badge.unsolved {
  background-color: #fff5f5;
  color: #e74c3c;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin: 8px 0 20px 0;
}

.tag-badge {
  background-color: #f1f3f5;
  color: #495057;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.actions {
  display: flex;
  justify-content: center;
  margin-top: auto;
}

.btn-challenge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: #2c3e50;
  color: white;
  box-shadow: 0 4px 10px rgba(44, 62, 80, 0.2);
}

.btn-challenge:hover {
  transform: translateY(-2px);
  background: #34495e;
  box-shadow: 0 6px 15px rgba(44, 62, 80, 0.3);
}

/* Check All Button */
.check-all-section {
  text-align: center;
  margin-bottom: 20px;
}

.btn-check-all {
  background: white;
  color: #2c3e50;
  border: 2px solid #f0f2f5;
  padding: 10px 30px;
  border-radius: 50px;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-weight: 700;
}

.btn-check-all:hover {
  border-color: #2c3e50;
  background: #2c3e50;
  color: white;
}

.btn-check-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f8f9fa;
  color: #95a5a6;
  border-color: #f0f2f5;
}

/* History Panel */
.history-panel {
  padding: 20px;
}

.history-panel h3 {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 15px;
}

.history-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 5px;
  bottom: 5px;
  width: 2px;
  background: #f0f2f5;
  border-radius: 2px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  position: relative;
}

.history-item::before {
  content: '';
  position: absolute;
  left: -13px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #bdc3c7;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #f0f2f5;
  z-index: 1;
}

.history-item:first-child::before {
  background: #3498db;
  box-shadow: 0 0 0 2px #d6eaf8;
}

.history-date {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-weight: 600;
  font-family: 'Monaco', 'Consolas', monospace;
}

.history-problems {
  display: flex;
  gap: 6px;
}

.history-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: white;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 700;
  transition: all 0.2s;
  opacity: 0.9;
}

.history-link:hover {
  transform: scale(1.15);
  opacity: 1;
  z-index: 2;
}

.history-link.solved { background-color: #2ecc71; box-shadow: 0 2px 5px rgba(46, 204, 113, 0.3); }
.history-link.unsolved { background-color: #e74c3c; box-shadow: 0 2px 5px rgba(231, 76, 60, 0.3); }

/* Participation Section */
.participation-section {
  padding: 20px;
}

.participation-section h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 800;
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 10px;
  transition: all 0.2s;
}

.participant-card:hover {
  background: white;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
  transform: translateY(-2px);
}

.p-avatar {
  width: 36px;
  height: 36px;
  background: #3498db;
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.p-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #2c3e50;
}

.p-score {
  font-size: 0.75rem;
  color: #7f8c8d;
  margin-top: 2px;
}

/* Leaderboard Panel */
.leaderboard-panel {
  padding: 20px;
}

.lb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.lb-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 800;
}

.lb-tabs {
  display: flex;
  background: #f1f3f5;
  border-radius: 10px;
  padding: 3px;
}

.lb-tabs span {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  color: #7f8c8d;
  transition: all 0.2s;
  font-weight: 600;
}

.lb-tabs span.active {
  background: white;
  color: #2c3e50;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.leaderboard-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lb-item {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #f1f3f5;
  transition: background 0.2s;
  border-radius: 8px;
}

.lb-item:hover {
  background: #f8f9fa;
}

.lb-item:last-child {
  border-bottom: none;
}

.lb-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f1f3f5;
  color: #7f8c8d;
  font-size: 0.8rem;
  margin-right: 10px;
  font-weight: 800;
}

.lb-rank.rank-1 { background: #f1c40f; color: white; }
.lb-rank.rank-2 { background: #bdc3c7; color: white; }
.lb-rank.rank-3 { background: #e67e22; color: white; }

.lb-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.9rem;
  color: #34495e;
}

.lb-count {
  font-weight: 800;
  color: #2c3e50;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  color: #95a5a6;
  padding: 30px;
  font-size: 0.9rem;
  background: #f8f9fa;
  border-radius: 12px;
  margin-top: 10px;
}

.loading, .error, .no-problem {
  text-align: center;
  padding: 40px;
  font-size: 1rem;
  color: #7f8c8d;
}

.error {
  color: #e74c3c;
}

@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
  }
  .side-column {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .daily-problem-container {
    padding: 15px;
  }
  .header h1 {
    font-size: 1.5rem;
  }
  .side-column {
    grid-template-columns: 1fr;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.4rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #95a5a6;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #2c3e50;
}

.user-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.modal-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
  flex-shrink: 0;
}

.modal-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-text {
  font-size: 1rem;
  color: #596e79;
  margin: 0;
}

.stat-text strong {
  color: #2c3e50;
  font-size: 1.2rem;
  margin-left: 5px;
}

.solved-list h4 {
  margin: 0 0 15px 0;
  color: #7f8c8d;
  font-size: 1rem;
}

.solved-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.solved-badge {
  padding: 8px 20px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.95rem;
  color: white;
}

.badge-a { background: linear-gradient(135deg, #3498db, #2980b9); }
.badge-b { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
.badge-c { background: linear-gradient(135deg, #e74c3c, #c0392b); }

/* Sunday View Styles */
.sunday-view {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.03);
}

.sunday-header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #f0f2f5;
  padding-bottom: 20px;
}

.sunday-header h2 {
  color: #2c3e50;
  font-size: 1.8rem;
  margin: 0 0 10px 0;
}

.sunday-header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.weekly-review-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

@media (max-width: 900px) {
  .weekly-review-grid {
    grid-template-columns: 1fr;
  }
}

.weekly-camp-column {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.camp-header-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.camp-header-small h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.camp-header-small.camp-a h3 { color: #3498db; }
.camp-header-small.camp-b h3 { color: #9b59b6; }
.camp-header-small.camp-c h3 { color: #e74c3c; }

.weekly-problems-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weekly-problem-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.03);
}

.wp-date {
  font-size: 0.85rem;
  color: #95a5a6;
  font-weight: 600;
  min-width: 40px;
}

.wp-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wp-title {
  font-size: 0.95rem;
  color: #2c3e50;
  text-decoration: none;
  font-weight: 600;
  margin-right: 10px;
}

.wp-title:hover {
  color: #3498db;
}

.wp-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}

.wp-status.solved {
  background: #e8f8f5;
  color: #27ae60;
}

.wp-status.unsolved {
  background: #fff5f5;
  color: #e74c3c;
}

.empty-state-small {
  text-align: center;
  color: #bdc3c7;
  padding: 20px;
  font-size: 0.9rem;
}
</style>
