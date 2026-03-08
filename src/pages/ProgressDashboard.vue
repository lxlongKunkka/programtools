<template>
  <div class="dashboard-container">
    <div class="dash-header">
      <div class="dash-title">
        <h2>📊 学习进度统计</h2>
        <span class="dash-subtitle">{{ userInfo?.uname || userInfo?.username || '' }}</span>
      </div>
      <div class="dash-actions">
        <select v-model="selectedGroup" class="group-select">
          <option value="">全部课程</option>
          <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
        </select>
        <router-link to="/course" class="btn-go-course">← 返回课程</router-link>
      </div>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="stat-card primary">
          <div class="stat-num">{{ totalCompleted }}</div>
          <div class="stat-label">已完成章节</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ totalChapters }}</div>
          <div class="stat-label">课程总章节</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-num">{{ overallPct }}%</div>
          <div class="stat-label">总体完成率</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">L{{ currentCppLevel }}</div>
          <div class="stat-label">当前C++等级</div>
        </div>
      </div>

      <!-- Overall bar -->
      <div class="overall-bar-wrap">
        <div class="overall-bar-bg">
          <div class="overall-bar-fill" :style="{ width: overallPct + '%' }"></div>
        </div>
        <span class="overall-bar-text">{{ totalCompleted }} / {{ totalChapters }}</span>
      </div>

      <!-- Per-level breakdown -->
      <div v-for="group in visibleGroups" :key="group.name" class="group-section">
        <h3 class="group-title">{{ group.name }}</h3>
        <div class="levels-grid">
          <div
            v-for="lv in group.levels"
            :key="lv.level"
            class="level-card"
            :class="{ 'lv-done': lv.pct === 100, 'lv-started': lv.pct > 0 && lv.pct < 100 }"
            @click="goToLevel(lv, group.name)"
          >
            <div class="lv-header">
              <span class="lv-badge">L{{ lv.level }}</span>
              <span class="lv-title">{{ lv.title }}</span>
              <span class="lv-pct-label">{{ lv.pct }}%</span>
            </div>

            <div class="lv-bar-bg">
              <div class="lv-bar-fill" :style="{ width: lv.pct + '%' }"></div>
            </div>

            <div class="lv-topics">
              <div
                v-for="topic in lv.topics"
                :key="topic.title"
                class="topic-row"
                :title="`${topic.title}: ${topic.completed}/${topic.total}`"
              >
                <span class="topic-name">{{ topic.title }}</span>
                <div class="topic-dots">
                  <span
                    v-for="i in topic.total"
                    :key="i"
                    class="dot"
                    :class="i <= topic.completed ? 'dot-done' : 'dot-empty'"
                  ></span>
                </div>
                <span class="topic-frac">{{ topic.completed }}/{{ topic.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import request from '../utils/request'

export default {
  name: 'ProgressDashboard',

  data() {
    return {
      loading: true,
      levels: [],
      progress: null,
      groups: [],
      selectedGroup: '',
    }
  },

  computed: {
    userInfo() {
      try { return JSON.parse(localStorage.getItem('user_info')) || null } catch { return null }
    },

    completedIds() {
      if (!this.progress) return new Set()
      return new Set([
        ...(this.progress.completedChapters || []),
      ])
    },

    completedUids() {
      if (!this.progress) return new Set()
      return new Set((this.progress.completedChapterUids || []).map(String))
    },

    currentCppLevel() {
      return this.progress?.subjectLevels?.['C++'] || this.progress?.currentLevel || 1
    },

    /** All groups with per-level stats computed */
    allGroups() {
      const groupMap = {}
      for (const lv of this.levels) {
        const gName = lv.group || 'C++ 基础'
        if (!groupMap[gName]) groupMap[gName] = { name: gName, levels: [] }

        let total = 0, completed = 0
        const topicStats = []

        const topics = lv.topics || []
        for (const t of topics) {
          const chs = t.chapters || []
          let tDone = 0
          for (const ch of chs) {
            total++
            const done =
              this.completedIds.has(ch.id) ||
              (ch._id && this.completedUids.has(String(ch._id)))
            if (done) { completed++; tDone++ }
          }
          if (chs.length > 0) {
            topicStats.push({ title: t.title, completed: tDone, total: chs.length })
          }
        }

        // Legacy flat chapters
        for (const ch of (lv.chapters || [])) {
          total++
          if (this.completedIds.has(ch.id) || (ch._id && this.completedUids.has(String(ch._id)))) completed++
        }

        groupMap[gName].levels.push({
          level: lv.level,
          title: lv.title,
          _id: lv._id,
          total,
          completed,
          pct: total > 0 ? Math.round((completed / total) * 100) : 0,
          topics: topicStats,
        })
      }

      // Sort levels within each group
      for (const g of Object.values(groupMap)) {
        g.levels.sort((a, b) => a.level - b.level)
      }

      return Object.values(groupMap).sort((a, b) => {
        // GESP C++ first
        if (a.name.includes('GESP') && !b.name.includes('GESP')) return -1
        if (!a.name.includes('GESP') && b.name.includes('GESP')) return 1
        return a.name.localeCompare(b.name)
      })
    },

    visibleGroups() {
      if (!this.selectedGroup) return this.allGroups
      return this.allGroups.filter(g => g.name === this.selectedGroup)
    },

    totalChapters() {
      return this.allGroups.reduce((s, g) => s + g.levels.reduce((ls, l) => ls + l.total, 0), 0)
    },

    totalCompleted() {
      return this.allGroups.reduce((s, g) => s + g.levels.reduce((ls, l) => ls + l.completed, 0), 0)
    },

    overallPct() {
      if (!this.totalChapters) return 0
      return Math.round((this.totalCompleted / this.totalChapters) * 100)
    },
  },

  async mounted() {
    await this.fetchData()
  },

  methods: {
    async fetchData() {
      this.loading = true
      try {
        const [levelsData, progressData] = await Promise.all([
          request('/api/course/levels'),
          request('/api/course/progress'),
        ])
        this.levels   = levelsData
        this.progress = progressData
        this.groups   = [...new Set(levelsData.map(l => l.group || 'C++ 基础').filter(Boolean))]
      } catch (e) {
        console.error('Dashboard fetch failed', e)
      } finally {
        this.loading = false
      }
    },

    goToLevel(lv, groupName) {
      // Save the level to localStorage so LearningMap auto-selects it
      localStorage.setItem('learning_map_last_node', JSON.stringify({ type: 'level', id: lv._id }))
      if (groupName) localStorage.setItem('selected_subject', groupName)
      this.$router.push('/course')
    },
  },
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 20px 60px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── Header ── */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
}
.dash-title h2 { margin: 0; font-size: 22px; color: #1a1a2e; }
.dash-subtitle  { font-size: 14px; color: #888; margin-left: 4px; }
.dash-actions   { display: flex; gap: 10px; align-items: center; }

.group-select {
  border: 1px solid #dde; border-radius: 8px; padding: 6px 12px;
  font-size: 13px; background: #fff; cursor: pointer; outline: none;
}
.btn-go-course {
  background: #f0f4ff; color: #2b9af3; border: 1px solid #cce;
  border-radius: 8px; padding: 6px 14px; font-size: 13px;
  text-decoration: none; white-space: nowrap;
}
.btn-go-course:hover { background: #e0eaff; }

/* ── Summary cards ── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
@media (max-width: 640px) { .summary-cards { grid-template-columns: repeat(2, 1fr); } }

.stat-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,.06);
  padding: 20px 16px;
  text-align: center;
}
.stat-card.primary { background: linear-gradient(135deg, #2b9af3 0%, #1a7fd4 100%); color: #fff; }
.stat-card.accent  { background: linear-gradient(135deg, #36d67e 0%, #1fbb60 100%); color: #fff; }
.stat-num   { font-size: 32px; font-weight: 700; line-height: 1; }
.stat-label { font-size: 13px; margin-top: 6px; opacity: .8; }

/* ── Overall bar ── */
.overall-bar-wrap {
  display: flex; align-items: center; gap: 12px; margin-bottom: 30px;
}
.overall-bar-bg {
  flex: 1; height: 10px; background: #e8ecf2; border-radius: 99px; overflow: hidden;
}
.overall-bar-fill {
  height: 100%; background: linear-gradient(90deg, #2b9af3, #36d67e);
  border-radius: 99px; transition: width .6s ease;
}
.overall-bar-text { font-size: 13px; color: #666; white-space: nowrap; }

/* ── Group section ── */
.group-section { margin-bottom: 32px; }
.group-title {
  font-size: 16px; font-weight: 600; color: #444;
  margin: 0 0 14px; padding-bottom: 8px;
  border-bottom: 2px solid #e8ecf2;
}

/* ── Levels grid ── */
.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.level-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color .2s, box-shadow .2s, transform .15s;
}
.level-card:hover {
  border-color: #2b9af3;
  box-shadow: 0 4px 16px rgba(43,154,243,.12);
  transform: translateY(-2px);
}
.level-card.lv-done  { border-color: #36d67e; background: #f0fff7; }
.level-card.lv-started { border-color: #f7ba2a; background: #fffde8; }

.lv-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.lv-badge {
  font-size: 11px; font-weight: 700; padding: 2px 8px;
  background: #eef4ff; color: #2b9af3; border-radius: 20px; white-space: nowrap;
}
.lv-done  .lv-badge { background: #e0fff0; color: #1fbb60; }
.lv-started .lv-badge { background: #fff8e0; color: #c89a00; }
.lv-title  { flex: 1; font-size: 13px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lv-pct-label { font-size: 12px; color: #999; white-space: nowrap; }

.lv-bar-bg {
  height: 6px; background: #eef0f4; border-radius: 99px; overflow: hidden; margin-bottom: 12px;
}
.lv-bar-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #2b9af3, #36d67e);
  transition: width .5s ease;
}
.lv-done  .lv-bar-fill { background: #36d67e; }
.lv-started .lv-bar-fill { background: linear-gradient(90deg, #f7ba2a, #2b9af3); }

/* ── Topic dots ── */
.lv-topics { display: flex; flex-direction: column; gap: 6px; }
.topic-row  { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
.topic-name { color: #666; width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.topic-dots { flex: 1; display: flex; flex-wrap: wrap; gap: 3px; }
.dot        { width: 8px; height: 8px; border-radius: 50%; }
.dot-done   { background: #36d67e; }
.dot-empty  { background: #dde; }
.topic-frac { color: #aaa; font-size: 10px; white-space: nowrap; }

/* ── Loading ── */
.loading-state { text-align: center; color: #aaa; padding: 80px 0; font-size: 16px; }
</style>
