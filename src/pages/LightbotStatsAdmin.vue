<template>
  <div class="lb-stats-page">
    <h2>Lightbot 运营统计</h2>

    <div v-if="loading" class="lb-loading">加载中…</div>
    <div v-else-if="error" class="lb-error">{{ error }}</div>
    <template v-else>
      <!-- 汇总卡片 -->
      <div class="lb-cards">
        <div class="lb-card">
          <div class="lb-card-num">{{ data.total_events }}</div>
          <div class="lb-card-label">总事件数</div>
        </div>
        <div class="lb-card">
          <div class="lb-card-num">{{ totalCompletions }}</div>
          <div class="lb-card-label">累计通关次数</div>
        </div>
        <div class="lb-card">
          <div class="lb-card-num">{{ data.recent_results.length }}</div>
          <div class="lb-card-label">登录用户通关记录数</div>
        </div>
      </div>

      <!-- 每日趋势 -->
      <h3>每日趋势</h3>
      <table class="lb-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>开局次数</th>
            <th>通关次数</th>
            <th>独立 IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data.daily" :key="row.day">
            <td>{{ row.day }}</td>
            <td>{{ row.game_start }}</td>
            <td>{{ row.level_complete }}</td>
            <td>{{ row.unique_ips }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 关卡通关漏斗 -->
      <h3>关卡通关次数</h3>
      <table class="lb-table">
        <thead>
          <tr>
            <th>关卡 ID</th>
            <th>通关次数</th>
            <th>占比</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(count, levelId) in sortedLevelCompletions" :key="levelId">
            <td>{{ levelId }}</td>
            <td>{{ count }}</td>
            <td>
              <div class="lb-bar-wrap">
                <div class="lb-bar" :style="{ width: barWidth(count) + '%' }"></div>
                <span>{{ Math.round(count / totalCompletions * 100) }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 最近通关记录（登录用户） -->
      <h3>最近通关记录（登录用户，最优成绩）</h3>
      <table class="lb-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>用户</th>
            <th>关卡</th>
            <th>指令数</th>
            <th>执行步数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in data.recent_results" :key="r.username + r.levelId + r.completedAt">
            <td class="lb-date">{{ fmtTime(r.completedAt) }}</td>
            <td>{{ r.username }}</td>
            <td>{{ r.levelId }}</td>
            <td>{{ r.totalCommands }}</td>
            <td>{{ r.executionSteps }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 最近通关事件（全部用户，含匿名） -->
      <h3>最近通关事件（全部用户，含匿名）</h3>
      <table class="lb-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>用户</th>
            <th>关卡</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(ev, i) in data.recent_events" :key="i">
            <td class="lb-date">{{ fmtTime(ev.t) }}</td>
            <td :class="ev.username ? '' : 'lb-anon'">{{ ev.username || '匿名' }}</td>
            <td>{{ ev.levelId }}</td>
            <td class="lb-ip">{{ ev.ip }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<script>
import request from '../utils/request'

export default {
  name: 'LightbotStatsAdmin',
  data() {
    return {
      loading: true,
      error: null,
      data: null,
    }
  },
  computed: {
    totalCompletions() {
      if (!this.data?.level_completions) return 0
      return Object.values(this.data.level_completions).reduce((s, v) => s + v, 0)
    },
    sortedLevelCompletions() {
      if (!this.data?.level_completions) return {}
      return Object.fromEntries(
        Object.entries(this.data.level_completions).sort((a, b) => b[1] - a[1])
      )
    },
  },
  async mounted() {
    try {
      const res = await request('/api/lightbot/admin/stats')
      this.data = res
    } catch (e) {
      this.error = e?.message || '加载失败'
    } finally {
      this.loading = false
    }
  },
  methods: {
    fmtTime(val) {
      if (!val) return '-'
      const d = typeof val === 'number' ? new Date(val) : new Date(val)
      return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    barWidth(count) {
      const max = Math.max(...Object.values(this.data.level_completions))
      return max > 0 ? Math.round(count / max * 100) : 0
    },
  },
}
</script>

<style scoped>
.lb-stats-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
}
h2 { font-size: 1.4rem; margin-bottom: 20px; }
h3 { font-size: 1.05rem; margin: 28px 0 10px; color: #334155; }

.lb-loading, .lb-error {
  padding: 40px;
  text-align: center;
  color: #64748b;
}
.lb-error { color: #ef4444; }

.lb-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.lb-card {
  flex: 1;
  min-width: 140px;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 18px 16px;
  text-align: center;
}
.lb-card-num {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
}
.lb-card-label {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
}

.lb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.lb-table th, .lb-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.lb-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}
.lb-table tr:hover td { background: #f8fafc; }
.lb-anon { color: #94a3b8; font-style: italic; }
.lb-ip { font-size: 0.78rem; color: #94a3b8; }

.lb-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lb-bar {
  height: 10px;
  background: #3b82f6;
  border-radius: 5px;
  min-width: 2px;
}
.lb-date {
  white-space: nowrap;
  color: #64748b;
  font-size: 0.82rem;
}
</style>
