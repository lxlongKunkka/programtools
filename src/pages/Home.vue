<template>
  <div class="home">
    <section class="hero">
      <div class="hero-content">
        <h1>Program Tools</h1>
        <p class="subtitle">一站式题目处理、代码生成与数据脚本平台</p>
        <div class="hero-actions">
          <router-link class="btn primary" to="/solution">开始题解生成</router-link>
          <router-link class="btn" to="/translate">快速题目翻译</router-link>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="grid">
        <router-link to="/solvedata" class="card">
          <div class="card-icon">📦</div>
          <div class="card-title">一键打包</div>
          <div class="card-desc">题目翻译、代码与数据脚本，自动生成并打包。</div>
        </router-link>

        <router-link to="/checker" class="card">
          <div class="card-icon">🔍</div>
          <div class="card-title">代码校验</div>
          <div class="card-desc">定位常见错误，提供修改建议与测试样例。</div>
        </router-link>

        <router-link to="/chat" class="card">
          <div class="card-icon">💬</div>
          <div class="card-title">上下文助手</div>
          <div class="card-desc">与模型对话，保留会话上下文，提升效率。</div>
        </router-link>

        <router-link to="/translate" class="card">
          <div class="card-icon">🌐</div>
          <div class="card-title">智能翻译</div>
          <div class="card-desc">按模板输出中文题面，自动处理公式与格式。</div>
        </router-link>
      </div>
    </section>

    <section class="tips">
      <h3>快速上手</h3>
      <ul>
        <li>支持手动代码模式，跳过题解生成，仅打包。</li>
        <li>problem.yaml 自动生成标题与 Level 标签。</li>
        <li>run.py 自动处理工作目录并打包 zip。</li>
      </ul>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero {
  background: linear-gradient(135deg, #4f8cff 0%, #6edfff 100%);
  color: #fff;
  border-radius: 16px;
  padding: 40px 28px;
}

.hero-content {
  max-width: 960px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 40px;
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.95;
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  text-decoration: none;
  transition: transform 0.15s ease, background 0.15s ease;
}

.btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.24); }
.btn.primary { background: #fff; color: #2463eb; }
.btn.primary:hover { background: #f5f7ff; }

.features .grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.card {
  display: block;
  border: 1px solid #e6e8eb;
  border-radius: 12px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  background: #fff;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.08);
  transform: translateY(-2px);
}

.card-icon {
  font-size: 24px;
}

.card-title {
  font-weight: 600;
  margin-top: 10px;
}

.card-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #4b5563;
}

.tips h3 { margin: 0 0 8px; }
.tips ul { margin: 0; padding-left: 18px; color: #374151; }
.tips li { line-height: 1.8; }

@media (max-width: 1024px) {
  .features .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .hero { padding: 28px 20px; }
  .hero h1 { font-size: 28px; }
  .features .grid { grid-template-columns: 1fr; }
}
</style>
