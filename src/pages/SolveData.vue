<template>
<div class="solve-data-container">

  <!-- ── Top bar ────────────────────────────────────────── -->
  <div class="top-bar">
    <h2>Solve + Data 生成器</h2>
    <div class="top-controls">
      <label>模型:</label>
      <select v-model="selectedModel" @change="updateMainModelPreference">
        <option v-for="m in modelOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
      <label style="margin-left:12px;">语言:</label>
      <select v-model="language">
        <option value="C++">C++</option>
        <option value="Python">Python</option>
      </select>
      <div class="translation-model-config">
        <button type="button" class="btn-secondary btn-sm" @click="showTranslationModelConfig = !showTranslationModelConfig">
          翻译模型: {{ translationModelLabel }}
        </button>
        <div v-if="showTranslationModelConfig" class="translation-model-popover">
          <label>默认翻译/解释模型</label>
          <select v-model="translationModel" @change="updateTranslationModelPreference">
            <option v-for="m in modelOptions" :key="`translation-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
          <p>自动翻译、解释代码、独立翻译页共用这个设置。</p>
        </div>
      </div>
      <div class="translation-model-config">
        <button type="button" class="btn-secondary btn-sm" @click="showReportModelConfig = !showReportModelConfig">
          报告模型: {{ reportModelLabel }}
        </button>
        <div v-if="showReportModelConfig" class="translation-model-popover">
          <label>标题/元数据/报告模型</label>
          <select v-model="reportModel" @change="updateReportModelPreference">
            <option v-for="m in modelOptions" :key="`report-${m.id}`" :value="m.id">{{ m.name }}</option>
          </select>
          <p>总结标题、补元数据、生成解题报告都会使用这个设置。</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ── URL bar ─────────────────────────────────────────── -->
  <div class="url-bar">
    <input
      v-model="fetchUrl"
      class="url-input"
      placeholder="输入题目/比赛链接：AtCoder / Codeforces / 核桃OJ"
      @keydown.enter="fetchFromUrl"
      :disabled="isFetchingUrl"
    />
    <button class="btn-primary btn-fetch-top" @click="fetchFromUrl" :disabled="isFetchingUrl || !fetchUrl.trim()">
      {{ isFetchingUrl ? '⏳ 获取中...' : '🔍 获取题目' }}
    </button>
    <span v-if="fetchUrlError" class="url-hint url-error">❌ {{ fetchUrlError }}</span>
    <span v-else-if="isFetchingUrl && fetchProgress" class="url-hint url-progress">⏳ {{ fetchProgress }}</span>
  </div>

  <!-- ── Task info bar ────────────────────────────────────── -->
  <div class="task-info-bar">
    <span class="task-count-label">共 {{ tasks.length }} 个任务</span>
    <div class="task-bulk-right">
      <input ref="folderImporter" type="file" webkitdirectory directory multiple style="display:none" @change="handleFolderImport" />

      <!-- 第1行：通用操作 -->
      <div class="toolbar-row">
        <button class="btn-secondary btn-sm" @click="openFolderImport" :disabled="isBatchRunning">📥 导入目录</button>

        <!-- 导入比赛下拉 -->
        <div class="dropdown-wrap" :class="{ open: showContestDropdown }">
          <button class="btn-secondary btn-sm" @click="showContestDropdown = !showContestDropdown" :disabled="isBatchRunning">
            🗂️ 导入比赛 ▾
          </button>
          <div v-if="showContestDropdown" class="dropdown-menu" @click.stop>
            <button class="dropdown-item" @click="openNflsojModal(); showContestDropdown = false">🏫 NFLSOJ</button>
            <button class="dropdown-item" @click="openLyrioModal(); showContestDropdown = false">🎓 Lyrio</button>
            <button class="dropdown-item" @click="openHtojModal(); showContestDropdown = false">🌰 核桃OJ</button>
          </div>
        </div>

        <!-- 批量生成下拉 -->
        <div class="dropdown-wrap" :class="{ open: showBatchDropdown }">
          <button class="btn-primary btn-sm" @click="showBatchDropdown = !showBatchDropdown" :disabled="isBatchRunning">
            🚀 批量生成 ▾
          </button>
          <div v-if="showBatchDropdown" class="dropdown-menu" @click.stop>
            <button class="dropdown-item" @click="batchMode = 'code_data'; runBatch(); showBatchDropdown = false">📝 仅代码和数据</button>
            <button class="dropdown-item" @click="batchMode = 'code_data_report'; runBatch(); showBatchDropdown = false">📦 代码、数据和报告</button>
            <button class="dropdown-item" @click="batchMode = 'report_only'; runBatch(); showBatchDropdown = false">📄 仅解题报告</button>
          </div>
        </div>

        <button class="btn-secondary btn-sm" @click="downloadBatch" :disabled="isBatchRunning || !hasCompletedTasks">📦 批量下载</button>
        <button class="btn-secondary btn-sm" @click="downloadPendingRawMaterials" :disabled="isBatchRunning || !hasPendingRawMaterialTasks">📥 下载素材</button>
        <button class="btn-secondary btn-sm" @click="batchSearchAllCpret" :disabled="isBatchRunning || isBatchCpretSearching">
          {{ isBatchCpretSearching ? '⏳ 检索中...' : '🔍 检索原题' }}
        </button>
      </div>

      <!-- 第2行：htoj 自动解题（仅 htoj 任务时显示） -->
      <div v-if="hasHtojTasks" class="toolbar-row htoj-toolbar">
        <button class="btn-primary btn-sm" @click="batchAutoSolveHtoj" :disabled="isAutoSolving || isBatchRunning" style="background:#ff6b35;border-color:#ff6b35;">
          {{ isAutoSolving ? '⏳ 批量解题中...' : '🤖 批量自动解题（验证AC）' }}
        </button>
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;cursor:pointer;">
          <input type="checkbox" v-model="autoGenerateDataAfterAC" style="margin:0;" /> AC后生成数据
        </label>
        <span style="font-size:11px;color:#9ca3af;">（AI 生成代码 → 提交 htoj → 不 AC 则自动修复重试，最多5次）</span>
      </div>
    </div>
    </div>
  </div>

  <!-- ── Main layout ──────────────────────────────────────── -->
  <div class="main-layout">

    <!-- Task list (260px) -->
    <TaskListPanel
      :tasks="tasks"
      :current-task-index="currentTaskIndex"
      :live-current-task-fields="liveCurrentTaskFields"
      @add-task="addNewTask"
      @clear-completed="clearCompletedTasks"
      @clear-all="clearAllTasks"
      @switch-task="switchTask"
      @reset-task-status="resetTaskStatus"
      @remove-task="removeTask"
    />

    <!-- Detail panel -->
    <div class="detail-panel">

      <!-- Detail header -->
      <div class="detail-header">
        <div class="detail-title-area">
          <input
            v-if="problemMeta"
            v-model="problemMeta.title"
            class="meta-title-input"
            placeholder="题目标题"
          />
          <span v-else class="detail-title-placeholder">暂无标题 — 请输入题目或从 URL 获取</span>
          <button @click="generateTitle" :disabled="isGeneratingTitle || !problemText" class="btn-outline btn-sm">
            {{ isGeneratingTitle ? '生成中...' : '✨ 总结标题' }}
          </button>
          <div class="meta-tags" v-if="problemMeta && problemMeta.tags && problemMeta.tags.length">
            <span v-for="tag in problemMeta.tags" :key="tag" class="meta-tag">{{ tag }}</span>
          </div>
          <span
            v-if="tasks[currentTaskIndex]?.additionalFile"
            :class="['sample-zip-badge', { 'has-base64': tasks[currentTaskIndex].additionalFile.base64 }]"
            :title="getAdditionalFileTitle(tasks[currentTaskIndex].additionalFile)"
            @click="openAdditionalFile()"
          >📦 {{ tasks[currentTaskIndex].additionalFile.filename }} ({{ formatAdditionalFileSize(tasks[currentTaskIndex].additionalFile) }})</span>
          <span v-if="problemMeta?.timeLimit" class="problem-limit-badge">⏱ {{ problemMeta.timeLimit }}ms</span>
          <span v-if="problemMeta?.memoryLimit" class="problem-limit-badge">💾 {{ problemMeta.memoryLimit }}MB</span>
          <a v-if="problemMeta?.fetchUrl || problemMeta?.sourceUrl" :href="problemMeta.fetchUrl || problemMeta.sourceUrl" target="_blank" rel="noopener" class="problem-limit-badge source-url-badge" title="查看原题">🔗 原题</a>
        </div>
        <div class="detail-actions">
          <button @click="generateAll" :disabled="tasks[currentTaskIndex]?.status === 'processing' || isBatchRunning" class="btn-primary btn-sm">
            {{ tasks[currentTaskIndex]?.status === 'processing' ? '⏳ 生成中...' : '⚡ 一键生成' }}
          </button>
          <button @click="downloadCurrentRawMaterials" :disabled="!currentTaskHasRawMaterials" class="btn-secondary btn-sm">
            📥 下载原始素材
          </button>
          <button @click="runAndDownload" :disabled="!(manualCode || codeOutput) || !dataOutput" class="btn-secondary btn-sm">
            📦 下载项目包
          </button>
          <button @click="clearAll" :disabled="isBatchRunning" class="btn-ghost btn-sm">🗑️ 清空</button>
        </div>
      </div>

      <!-- Generation status bar -->
      <div v-if="generationStatus || showStepIndicators" class="generation-status-bar">
        <div v-if="generationStatus" class="status-text">
          <span v-if="isGenerating || isTranslating || isGeneratingReport || isGeneratingTitle">⏳</span>
          {{ generationStatus }}
        </div>
        <div v-if="showStepIndicators" class="generation-steps">
          <div class="step-item" :class="currentGenerationSteps.translate"><div class="step-dot"></div><span>翻译</span></div>
          <div class="step-item" :class="currentGenerationSteps.solution"><div class="step-dot"></div><span>题解</span></div>
          <div class="step-item" :class="currentGenerationSteps.report"><div class="step-dot"></div><span>PPT报告</span></div>
          <div class="step-item" :class="currentGenerationSteps.data"><div class="step-dot"></div><span>数据</span></div>
          <div class="step-item" :class="currentGenerationSteps.meta"><div class="step-dot"></div><span>元数据</span></div>
        </div>
      </div>

      <!-- Step tabs -->
      <div class="step-tabs">
        <button :class="['step-tab', { active: activeTab === 'problem' }]" @click="activeTab = 'problem'">📋 题目</button>
        <button :class="['step-tab', { active: activeTab === 'reference' }]" @click="activeTab = 'reference'">💡 参考</button>
        <button :class="['step-tab', { active: activeTab === 'translate' }]" @click="activeTab = 'translate'">
          🌐 翻译<span v-if="translationText" class="tab-done">✓</span>
        </button>
        <button :class="['step-tab', { active: activeTab === 'code' }]" @click="activeTab = 'code'">
          � 代码<span v-if="pureAcCode" class="tab-done">✓</span>
        </button>
        <button :class="['step-tab', { active: activeTab === 'lesson' }]" @click="activeTab = 'lesson'">
          📝 教案<span v-if="codeOutput" class="tab-done">✓</span>
        </button>
        <button :class="['step-tab', { active: activeTab === 'data' }]" @click="activeTab = 'data'">
          📊 数据脚本<span v-if="dataOutput" class="tab-done">✓</span>
        </button>
        <button :class="['step-tab', { active: activeTab === 'report' }]" @click="activeTab = 'report'">
          📽️ 报告<span v-if="reportHtml" class="tab-done">✓</span>
        </button>
      </div>

      <!-- Step content -->
      <div class="step-content">

        <!-- 题目描述 -->
        <template v-if="activeTab === 'problem'">
          <div class="tab-action-bar">
            <button @click="searchCpret" :disabled="isCpretSearching || !problemText.trim()" class="btn-secondary btn-sm">
              {{ isCpretSearching ? '⏳ 检索中...' : '🔍 检索原题' }}
            </button>
            <button v-if="cpretResults" @click="cpretResults = null" class="btn-ghost btn-sm">✕ 清除</button>
            <span v-if="cpretResults" class="cpret-count-hint">
              {{ cpretResults.length ? `找到 ${cpretResults.length} 个相似题目` : '未找到相似题目' }}
            </span>
          </div>
          <div v-if="cpretResults && cpretResults.length" class="cpret-results-bar">
            <div v-for="(r, i) in cpretResults" :key="i" class="cpret-result-row">
              <span class="cpret-score">{{ (r.score * 100).toFixed(0) }}%</span>
              <a :href="r.url || r.detailUrl" target="_blank" rel="noopener" class="cpret-result-title">{{ r.title }}</a>
              <span class="cpret-source">{{ r.source }}</span>
              <button @click="insertCpretLink(r)" class="btn-ghost btn-sm">插入</button>
            </div>
          </div>
          <textarea
            v-model="problemText"
            placeholder="请输入完整的题目描述，包括题意、输入格式、输出格式、数据范围等..."
            class="content-textarea"
          ></textarea>
        </template>

        <!-- 手动代码 -->
        <template v-else-if="activeTab === 'reference'">
          <div class="reference-pane">
            <div class="ref-section-label">
              🔧 手动 AC 代码（可选）
              <button @click="clearManualCode" class="btn-ghost btn-sm" style="margin-left:8px;">清空</button>
            </div>
            <textarea
              v-model="manualCode"
              placeholder="在此输入标准 AC 代码。如果提供，将直接使用此代码生成数据和报告..."
              class="content-textarea ref-textarea"
            ></textarea>
          </div>
        </template>

        <!-- 翻译 -->
        <template v-else-if="activeTab === 'translate'">
          <div class="tab-action-bar">
            <button @click="autoTranslate()" :disabled="isTranslating || !problemText.trim()" class="btn-primary btn-sm">
              {{ isTranslating ? '⏳ 翻译中...' : '🌐 生成翻译' }}
            </button>
            <button @click="copyTranslation" :disabled="!translationText" class="btn-secondary btn-sm">📋 复制中文</button>
            <button @click="copyTranslationEnglish" :disabled="!translationEnglish" class="btn-secondary btn-sm">📋 复制英文</button>
            <button @click="downloadTranslation" :disabled="!translationText" class="btn-secondary btn-sm">💾 中文MD</button>
            <button @click="downloadTranslationEnglish" :disabled="!translationEnglish" class="btn-secondary btn-sm">💾 英文MD</button>
          </div>
          <div v-if="translationText || translationEnglish" class="translation-dual-pane">
            <div v-if="translationText" class="translation-pane">
              <div class="translation-pane-header">🌐 中文版</div>
              <div class="scroll-content">
                <MarkdownViewer :content="translationText" />
              </div>
            </div>
            <div v-if="translationEnglish" class="translation-pane">
              <div class="translation-pane-header">🇺🇸 English</div>
              <div class="scroll-content">
                <MarkdownViewer :content="translationEnglish" />
              </div>
            </div>
          </div>
          <div v-else class="empty-hint">
            <span v-if="isTranslating">⏳ 正在翻译...</span>
            <span v-else>暂无翻译内容，点击上方"生成翻译"</span>
          </div>
        </template>

        <!-- 💻 代码：纯代码，可直接提交 -->
        <template v-else-if="activeTab === 'code'">
          <div class="tab-action-bar">
            <button @click="generateCode" :disabled="isGenerating === 'code' || tasks[currentTaskIndex]?.status === 'processing'" class="btn-primary btn-sm">
              {{ isGenerating === 'code' ? '⏳ 生成中...' : '📝 生成代码' }}
            </button>
            <button @click="copyPureCode" :disabled="!pureAcCode" class="btn-secondary btn-sm">📋 复制</button>
            <button
              v-if="isHtojProblem"
              @click="autoSolveHtoj"
              :disabled="isAutoSolving || tasks[currentTaskIndex]?.status === 'processing'"
              class="btn-primary btn-sm"
              style="background:#ff6b35;border-color:#ff6b35;"
            >
              {{ isAutoSolving ? `⏳ 自动解题中 (${autoSolveAttempts}/${autoSolveMaxAttempts})...` : '🤖 自动解题（重试到AC）' }}
            </button>
            <label v-if="isHtojProblem" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;cursor:pointer;margin-left:4px;">
              <input type="checkbox" v-model="autoGenerateDataAfterAC" style="margin:0;" />
              解题后生成数据
            </label>
            <span v-if="htojSubmitResult" :class="['htoj-result-tag', htojResultClass]">{{ htojSubmitResult }}</span>
            <span v-if="isAutoSolving" style="font-size:12px;color:#6b7280;margin-left:8px;">第 {{ autoSolveAttempts }} 次尝试</span>
          </div>
          <div v-if="pureAcCode" class="scroll-content">
            <MarkdownViewer :content="formattedPureCode" />
          </div>
          <div v-else class="empty-hint">
            <span v-if="isGenerating === 'code'">⏳ 正在生成...</span>
            <span v-else>暂无代码，点击"生成代码"</span>
          </div>
        </template>

        <!-- 📝 教案：完整 AI 输出，含算法讲解 + 代码 -->
        <template v-else-if="activeTab === 'lesson'">
          <div class="tab-action-bar">
            <button @click="copyCode" class="btn-secondary btn-sm">📋 复制全部</button>
            <button @click="saveCode" class="btn-secondary btn-sm">💾 保存</button>
          </div>
          <div v-if="manualCode || codeOutput" class="scroll-content">
            <MarkdownViewer :content="displayCode" />
          </div>
          <div v-else class="empty-hint">
            <span v-if="isGenerating === 'code'">⏳ 正在生成...</span>
            <span v-else>暂无教案，先生成代码后查看</span>
          </div>
        </template>

        <!-- 数据脚本 -->
        <template v-else-if="activeTab === 'data'">
          <div class="tab-action-bar">
            <button @click="generateData" :disabled="isGenerating === 'data' || tasks[currentTaskIndex]?.status === 'processing'" class="btn-primary btn-sm">
              {{ isGenerating === 'data' ? '⏳ 生成中...' : '📊 生成数据脚本' }}
            </button>
            <button @click="copyDataCode" class="btn-secondary btn-sm">📋 复制代码</button>
            <button @click="copyData" class="btn-secondary btn-sm">📋 全部</button>
            <button @click="saveData" class="btn-secondary btn-sm">💾 保存</button>
          </div>
          <div v-if="dataOutput" class="scroll-content">
            <MarkdownViewer :content="dataOutput" />
          </div>
          <div v-else class="empty-hint">
            <span v-if="isGenerating === 'data'">⏳ 正在生成...</span>
            <span v-else>暂无数据脚本</span>
          </div>
        </template>

        <!-- 解题报告 -->
        <template v-else-if="activeTab === 'report'">
          <div class="tab-action-bar">
            <button @click="generateReportInline" :disabled="isGeneratingReport" class="btn-primary btn-sm">
              {{ isGeneratingReport ? '⏳ 生成中...' : '⚡ 生成报告' }}
            </button>
            <button @click="openReportNewWindow" :disabled="!reportHtml" class="btn-secondary btn-sm">↗️ 新窗口</button>
            <button @click="downloadReport" :disabled="!reportHtml" class="btn-secondary btn-sm">💾 下载</button>
          </div>
          <div v-if="reportHtml" class="report-frame">
            <iframe :srcdoc="reportHtml" style="width:100%;height:100%;border:none;" :style="{ 'pointer-events': isDragging ? 'none' : 'auto' }"></iframe>
          </div>
          <div v-else class="empty-hint">
            <span v-if="isGeneratingReport">⏳ 正在生成报告...</span>
            <span v-else>暂无解题报告，请点击上方"生成报告"</span>
          </div>
        </template>

      </div><!-- /step-content -->
    </div><!-- /detail-panel -->
  </div><!-- /main-layout -->

  <!-- NFLSOJ 批量导入比赛模态框 -->
  <div v-if="showNflsojModal" class="modal-overlay" @click.self="showNflsojModal = false">
    <div class="nflsoj-modal">
      <div class="nflsoj-modal-header">
        <span>🗂️ NFLSOJ 比赛列表（第 {{ nflsojModalPage }} / {{ nflsojModalTotalPages }} 页）</span>
        <button class="btn-ghost btn-sm" @click="showNflsojModal = false">✕</button>
      </div>
      <div class="nflsoj-search-bar">
        <input
          v-model="nflsojFilterKeyword"
          class="nflsoj-search-input"
          placeholder="🔍 按比赛名称或编号筛选..."
          @keydown.esc="nflsojFilterKeyword = ''"
        />
        <span v-if="nflsojFilterKeyword" class="nflsoj-filter-count">{{ nflsojFilteredContests.length }} / {{ nflsojModalContests.length }}</span>
      </div>
      <div class="nflsoj-modal-toolbar">
        <button class="btn-secondary btn-sm" @click="nflsojSelectAll">全选当前结果</button>
        <button class="btn-ghost btn-sm" @click="nflsojClearSelected">清除选择</button>
        <span class="flex-spacer"></span>
        <button class="btn-ghost btn-sm" :disabled="nflsojModalPage <= 1 || isLoadingNflsojList" @click="loadNflsojContestPage(nflsojModalPage - 1)">◀ 上一页</button>
        <button class="btn-ghost btn-sm" :disabled="!nflsojModalHasMore || isLoadingNflsojList" @click="loadNflsojContestPage(nflsojModalPage + 1)">下一页 ▶</button>
      </div>
      <div class="nflsoj-contest-list">
        <div v-if="isLoadingNflsojList" class="nflsoj-loading">⏳ 加载中...</div>
        <template v-else>
          <label v-for="c in nflsojFilteredContests" :key="c.id" class="nflsoj-contest-row">
            <input type="checkbox" :checked="!!nflsojModalSelected[c.id]" @change="nflsojToggle(c.id, $event.target.checked)" />
            <span class="nflsoj-contest-id">#{{ c.id }}</span>
            <span class="nflsoj-contest-title">{{ c.title }}</span>
          </label>
          <div v-if="!nflsojFilteredContests.length" class="nflsoj-loading">{{ nflsojFilterKeyword ? '没有匹配的比赛' : '暂无比赛' }}</div>
        </template>
      </div>
      <div class="nflsoj-modal-footer">
        <span class="nflsoj-selected-count">已选 {{ nflsojSelectedCount }} 个比赛</span>
        <span v-if="isImportingNflsoj" class="nflsoj-import-status">{{ nflsojImportStatus }}</span>
        <button class="btn-primary btn-sm" @click="importSelectedNflsojContests" :disabled="nflsojSelectedCount === 0 || isImportingNflsoj">
          {{ isImportingNflsoj ? '⏳ 导入中...' : '导入选中比赛 →' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Lyrio 比赛列表模态框 -->
  <div v-if="showLyrioModal" class="modal-overlay" @click.self="showLyrioModal = false">
    <div class="nflsoj-modal">
      <div class="nflsoj-modal-header">
        <span>🗂️ Lyrio 比赛列表（第 {{ lyrioModalPage }} 页）</span>
        <button class="btn-ghost btn-sm" @click="showLyrioModal = false">✕</button>
      </div>
      <div class="nflsoj-search-bar">
        <input v-model="lyrioFilterKeyword" class="nflsoj-search-input" placeholder="🔍 按比赛名称或编号筛选..." @keydown.esc="lyrioFilterKeyword = ''" />
        <span v-if="lyrioFilterKeyword" class="nflsoj-filter-count">{{ lyrioFilteredContests.length }} / {{ lyrioModalContests.length }}</span>
      </div>
      <div class="nflsoj-modal-toolbar">
        <button class="btn-secondary btn-sm" @click="lyrioSelectAll">全选当前结果</button>
        <button class="btn-ghost btn-sm" @click="lyrioClearSelected">清除选择</button>
        <span class="flex-spacer"></span>
        <button class="btn-ghost btn-sm" :disabled="lyrioModalPage <= 1 || isLoadingLyrioList" @click="loadLyrioContestPage(lyrioModalPage - 1)">◀ 上一页</button>
        <button class="btn-ghost btn-sm" :disabled="!lyrioModalHasMore || isLoadingLyrioList" @click="loadLyrioContestPage(lyrioModalPage + 1)">下一页 ▶</button>
      </div>
      <div class="nflsoj-contest-list">
        <div v-if="isLoadingLyrioList" class="nflsoj-loading">⏳ 加载中...</div>
        <template v-else>
          <label v-for="c in lyrioFilteredContests" :key="c.id" class="nflsoj-contest-row">
            <input type="checkbox" :checked="!!lyrioModalSelected[c.id]" @change="lyrioToggle(c.id, $event.target.checked)" />
            <span class="nflsoj-contest-id">#{{ c.id }}</span>
            <span class="nflsoj-contest-title">{{ c.name }}</span>
          </label>
          <div v-if="!lyrioFilteredContests.length" class="nflsoj-loading">{{ lyrioFilterKeyword ? '没有匹配的比赛' : '暂无比赛' }}</div>
        </template>
      </div>
      <div class="nflsoj-modal-footer">
        <span class="nflsoj-selected-count">已选 {{ lyrioSelectedCount }} 个比赛</span>
        <span v-if="isImportingLyrio" class="nflsoj-import-status">{{ lyrioImportStatus }}</span>
        <button class="btn-primary btn-sm" @click="importSelectedLyrioContests" :disabled="lyrioSelectedCount === 0 || isImportingLyrio">
          {{ isImportingLyrio ? '⏳ 导入中...' : '导入选中比赛 →' }}
        </button>
      </div>
    </div>
  </div>

  <!-- 核桃OJ 比赛列表模态框 -->
  <div v-if="showHtojModal" class="modal-overlay" @click.self="showHtojModal = false">
    <div class="nflsoj-modal">
      <div class="nflsoj-modal-header">
        <span>🗂️ 核桃OJ 比赛列表（第 {{ htojModalPage }} / {{ htojModalTotalPages }} 页）</span>
        <button class="btn-ghost btn-sm" @click="showHtojModal = false">✕</button>
      </div>
      <div class="nflsoj-search-bar">
        <input v-model="htojFilterKeyword" class="nflsoj-search-input" placeholder="🔍 按比赛名称筛选..." @keydown.esc="htojFilterKeyword = ''" />
        <span v-if="htojFilterKeyword" class="nflsoj-filter-count">{{ htojFilteredContests.length }} / {{ htojModalContests.length }}</span>
      </div>
      <div class="nflsoj-modal-toolbar">
        <button class="btn-secondary btn-sm" @click="htojSelectAll">全选当前结果</button>
        <button class="btn-ghost btn-sm" @click="htojClearSelected">清除选择</button>
        <span class="flex-spacer"></span>
        <button class="btn-ghost btn-sm" :disabled="htojModalPage <= 1 || isLoadingHtojList" @click="loadHtojContestPage(htojModalPage - 1)">◀ 上一页</button>
        <button class="btn-ghost btn-sm" :disabled="!htojModalHasMore || isLoadingHtojList" @click="loadHtojContestPage(htojModalPage + 1)">下一页 ▶</button>
      </div>
      <div class="nflsoj-contest-list">
        <div v-if="isLoadingHtojList" class="nflsoj-loading">⏳ 加载中...</div>
        <template v-else>
          <label v-for="c in htojFilteredContests" :key="c.id" class="nflsoj-contest-row">
            <input type="checkbox" :checked="!!htojModalSelected[c.id]" @change="htojToggle(c.id, $event.target.checked)" />
            <span class="nflsoj-contest-id">#{{ c.id.slice(-6) }}</span>
            <span class="nflsoj-contest-title">{{ c.title }}</span>
            <span class="nflsoj-contest-meta">{{ c.type }} · {{ c.problemCount }}题 · {{ c.status }}</span>
          </label>
          <div v-if="!htojFilteredContests.length" class="nflsoj-loading">{{ htojFilterKeyword ? '没有匹配的比赛' : '暂无比赛' }}</div>
        </template>
      </div>
      <div class="nflsoj-modal-footer">
        <span class="nflsoj-selected-count">已选 {{ htojSelectedCount }} 个比赛</span>
        <span v-if="isImportingHtoj" class="nflsoj-import-status">{{ htojImportStatus }}</span>
        <button class="btn-primary btn-sm" @click="importSelectedHtojContests" :disabled="htojSelectedCount === 0 || isImportingHtoj">
          {{ isImportingHtoj ? '⏳ 导入中...' : '导入选中比赛 →' }}
        </button>
      </div>
    </div>
  </div>

  <!-- 加载附加文件等 -->

</div>
</template>

<script>
import { nextTick } from 'vue'
import request from '../utils/request'
import { retryRequest } from '../utils/request'
import { getModels } from '../utils/models'
import { getDefaultMainModel, getDefaultReportModel, getDefaultTranslationModel, resolvePreferredModel, setDefaultMainModel, setDefaultReportModel, setDefaultTranslationModel } from '../utils/modelPreferences'
import TaskListPanel from '../modules/solvedata/components/TaskListPanel.vue'
import { loadJsZip } from '../utils/loadJsZip'
import { createEmptyTask, createTaskId, hasValidTaskMeta } from '../modules/solvedata/taskState'
import { buildBatchReportRequest, getPendingBatchTaskEntries, runBatchTasks } from '../modules/solvedata/batchHelpers'
import { hydrateTaskAttachmentCache, syncTaskAttachmentCache } from '../modules/solvedata/attachmentCache'
import { applyTitleToTranslation, cleanDataOutput, detectLanguage, extractPureCode, getBestCodeContent, getSmartTitle, processDataScript, stripFreopenStatements } from '../modules/solvedata/codeCleaning'
import { generateBatScript, generateProblemYaml, generateReadme, generateRunScript } from '../modules/solvedata/scriptTemplates'
import { blobToBase64, createBatchExportBundle, createRawMaterialsExportBundle, hasTaskPendingRawMaterials, hasTaskRawMaterials } from '../modules/solvedata/exportHelpers'
import { buildMetaRequestPayload, buildSolutionReportPayload, buildSolutionRequestConfig, createInitialGenerationSteps, mergeGeneratedMeta, resolveDataGenerationInput } from '../modules/solvedata/generationHelpers'
import { createExtensionImportedTask, createFetchedProblemTask, getExtensionImportSuccessMessage, mergeImportedTasks, normalizeExtensionImportRequest, readFolderImportedTasks } from '../modules/solvedata/importHelpers'
import { normalizeProblemMetaTitle, normalizeProblemTitle } from '../modules/solvedata/titleNormalization'
import { buildReportAutoSolutionPrompt, extractStreamingFieldPreview, hasResolvedMetaTitle, mergeTranslationMeta } from '../modules/solvedata/translationReportHelpers'

const SOLVE_DATA_TASKS_STORAGE_KEY = 'solve_data_tasks'

export default {
  name: 'SolveData',
  inject: ['showToastMessage'],
  components: {
    TaskListPanel,
  },
  data() {
    return {
      leftWidth: 40,
      isDragging: false,
      problemText: '',
      cpretResults: null,
      isCpretSearching: false,
      dataOutput: '',
      selectedModel: getDefaultMainModel(),
      translationModel: getDefaultTranslationModel(),
      reportModel: getDefaultReportModel(),
      showTranslationModelConfig: false,
      showReportModelConfig: false,
      models: [],
      language: 'C++',
      isGenerating: false,
      generationStatus: '', // 用于显示详细的生成进度
      isGeneratingTitle: false,
      isGeneratingReport: false,
      activeTab: 'problem',
      editorialText: '',
      manualCode: '',
      codeOutput: '',
      referenceText: '',
      isTranslating: false,
      translationText: '',
      translationEnglish: '',
      serverPureCode: '',
      isTranslationStale: false, // 标记翻译是否过期
      problemMeta: null,
      reportHtml: '',

      // URL 抓取相关
      fetchUrl: '',
      isFetchingUrl: false,
      contestProblems: [],
      selectedContestProblemIdx: '',
      fetchUrlError: '',
      fetchProgress: '',
      
      // 批量模式相关数据
      isBatchMode: true,
      isBatchRunning: false,
      isBatchCpretSearching: false,
      showContestDropdown: false,
      showBatchDropdown: false,
      batchMode: localStorage.getItem('solvedata_batch_mode') || 'code_data', // code_data, code_data_report, report_only
      showBatchImport: false,
      batchImportText: '',
      currentTaskIndex: 0,
      // NFLSOJ 比赛列表模态框
      showNflsojModal: false,
      nflsojModalPage: 1,
      nflsojModalContests: [],
      nflsojModalTotalPages: 1,
      nflsojModalSelected: {},
      isLoadingNflsojList: false,
      isImportingNflsoj: false,
      nflsojImportStatus: '',
      nflsojFilterKeyword: '',

      // Lyrio 比赛列表模态框
      showLyrioModal: false,
      lyrioModalPage: 1,
      lyrioModalContests: [],
      lyrioModalSelected: {},
      isLoadingLyrioList: false,
      isImportingLyrio: false,
      lyrioImportStatus: '',
      lyrioFilterKeyword: '',

      // 核桃OJ 比赛列表模态框
      showHtojModal: false,
      htojModalPage: 1,
      htojModalContests: [],
      htojModalTotalPages: 1,
      htojModalSelected: {},
      isLoadingHtojList: false,
      isImportingHtoj: false,
      htojImportStatus: '',
      htojFilterKeyword: '',
      
      // htoj 自动提交
      isHtojSubmitting: false,
      isAutoSolving: false,
      autoSolveAttempts: 0,
      autoSolveMaxAttempts: 5,
      autoGenerateDataAfterAC: false,
      htojSubmitResult: '',
      
      // 进度条状态
      showStepIndicators: false,
      generationSteps: {
        translate: 'pending', // pending, processing, success, failed
        solution: 'pending',
        report: 'pending',
        data: 'pending',
        meta: 'pending'
      },
      
      tasks: [createEmptyTask()]
    }
  },
  mounted() {
    // 动态加载后端提供的模型列表
    this.loadModels()

    window.addEventListener('message', this.handleExtensionImportMessage)
    window.addEventListener('storage', this.handleExtensionStorageChange)
    document.addEventListener('click', this.closeToolbarDropdowns)
    
    // 尝试从 localStorage 恢复任务列表
    try {
      const savedTasks = this.loadStoredTasksSnapshot()
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks)
        this.tasks = this.tasks.map((task) => {
          if (!task) return task
          if (task.editorialText || !task.referenceText) return task
          const importedVia = task.problemMeta?.importedVia
          if (importedVia !== 'edge-extension') return task
          return {
            ...task,
            editorialText: task.referenceText,
            referenceText: '',
          }
        })
        // 重置上次未完成的 processing 任务（页面刷新导致流中断）
        this.tasks.forEach(t => { if (t.status === 'processing') t.status = 'pending' })
        if (this.tasks.length > 0) {
          this.loadTask(0)
        }
      }
    } catch (e) { console.error('Failed to load tasks', e) }

    this.restoreTaskAttachmentCache()

    // 恢复上次输入的 URL
    const savedUrl = localStorage.getItem('solve_fetch_url')
    if (savedUrl) this.fetchUrl = savedUrl

    this.consumePendingExtensionImport()

  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleExtensionImportMessage)
    window.removeEventListener('storage', this.handleExtensionStorageChange)
    if (this._taskAttachmentCacheSyncTimer) {
      window.clearTimeout(this._taskAttachmentCacheSyncTimer)
      this._taskAttachmentCacheSyncTimer = null
    }
  },
  watch: {
    // 监听当前任务数据的变化，同步到 tasks 数组
    problemText(val) { 
      this.updateCurrentTask('problemText', val)
      if (!val || !val.trim()) {
        this.problemMeta = null
      } else {
        // 如果题目内容发生变化，标记翻译为过期
        // 这样下次点击"一键生成"时，会重新触发翻译
        this.isTranslationStale = true
      }
    },
    editorialText(val) { this.updateCurrentTask('editorialText', val) },
    manualCode(val) { this.updateCurrentTask('manualCode', val) },
    referenceText(val) { this.updateCurrentTask('referenceText', val) },
    fetchUrl(val) { localStorage.setItem('solve_fetch_url', val) },
    batchMode(val) { localStorage.setItem('solvedata_batch_mode', val) },
    codeOutput(val) {
      // 守卫：如果 tasks[currentTaskIndex].codeOutput 已与 val 一致（来自 loadTask 或 saveToTask watcher-path 的直接写入），
      // 则跳过冗余写回，防止 pre-flush 在 currentTaskIndex 已切换后污染错误任务
      if (this.tasks[this.currentTaskIndex]?.codeOutput === val) return
      this.updateCurrentTask('codeOutput', val)
    },
    dataOutput(val) { this.updateCurrentTask('dataOutput', val) },
    translationText(val) { this.updateCurrentTask('translationText', val) },
    translationEnglish(val) { this.updateCurrentTask('translationEnglish', val) },
    serverPureCode(val) {
      // 同上，saveToTask/loadTask 已直接写入 tasks[]，watcher 无需重复写回
      const normalized = stripFreopenStatements(val)
      if (this.tasks[this.currentTaskIndex]?.serverPureCode === normalized) return
      this.updateCurrentTask('serverPureCode', val)
    },
    reportHtml(val) { this.updateCurrentTask('reportHtml', val) },
    problemMeta: {
      handler(val) {
        const normalizedMeta = normalizeProblemMetaTitle(val)
        if (val?.title !== normalizedMeta?.title || val?.rawTitle !== normalizedMeta?.rawTitle) {
          this.problemMeta = normalizedMeta
          return
        }
        this.updateCurrentTask('problemMeta', normalizedMeta)
      },
      deep: true
    },
    tasks: {
      handler(val) {
        this.persistTasksSnapshot(val)
        this.queueTaskAttachmentCacheSync(val)
      },
      deep: true
    }
  },
  computed: {
    liveCurrentTaskFields() {
      return {
        translationText: this.translationText,
        codeOutput: this.codeOutput,
        dataOutput: this.dataOutput,
        reportHtml: this.reportHtml,
      }
    },
    // 读取当前任务的步骤状态（per-task，支持并行生成时切换任务查看各自进度）
    currentGenerationSteps() {
      return this.tasks[this.currentTaskIndex]?.generationSteps || {}
    },
    modelOptions() {
      if (Array.isArray(this.models) && this.models.length > 0) return this.models
      return [
        { id: 'o4-mini', name: 'o4-mini' },
        { id: 'gpt-5.5', name: 'gpt-5.5' },
        { id: 'gpt-5.4', name: 'gpt-5.4' },
        { id: 'gpt-5.4-mini', name: 'gpt-5.4-mini' },
        { id: 'gpt-5.4-nano', name: 'gpt-5.4-nano' },
        { id: 'claude-opus-4-7', name: 'claude-opus-4-7' },
        { id: 'claude-opus-4-6', name: 'claude-opus-4-6' },
        { id: 'claude-sonnet-4-6', name: 'claude-sonnet-4-6' },
        { id: 'o3-mini', name: 'o3-mini' },
        { id: 'o2-mini', name: 'o2-mini' },
        { id: 'o1-mini', name: 'o1-mini' },
        { id: 'grok-4-fast', name: 'grok-4-fast' },
        { id: 'gemini-3.5-flash', name: 'gemini-3.5-flash' }
      ]
    },
    translationModelLabel() {
      return this.modelOptions.find(item => item.id === this.translationModel)?.name || this.translationModel
    },
    reportModelLabel() {
      return this.modelOptions.find(item => item.id === this.reportModel)?.name || this.reportModel
    },
    displayCode() {
      if (this.codeOutput && this.codeOutput.trim()) {
        // 移除 <!-- AC_CODE --> 标记，避免在界面上显示
        return this.codeOutput.replace(/<!--\s*AC_CODE\s*-->/g, '')
      }
      // codeOutput 为空时，优先用 serverPureCode（AI 注释版），避免退化成无注释的原始代码
      if (this.serverPureCode && this.serverPureCode.trim()) {
        const lang = this.language === 'C++' ? 'cpp' : 'python'
        return '```' + lang + '\n' + stripFreopenStatements(this.serverPureCode) + '\n```'
      }
      if (this.manualCode && this.manualCode.trim()) {
        return '```\n' + stripFreopenStatements(this.manualCode) + '\n```'
      }
      return ''
    },
    pureAcCode() {
      // 优先使用服务端直接返回的纯净代码（最可靠，无需二次提取）
      if (this.serverPureCode && this.serverPureCode.trim()) {
        return stripFreopenStatements(this.serverPureCode)
      }
      if (this.codeOutput && this.codeOutput.trim()) {
        return stripFreopenStatements(this.extractPureCode(this.codeOutput))
      }
      if (this.manualCode && this.manualCode.trim()) {
        // 也对 manualCode 进行提取，以防用户粘贴了包含 Markdown 格式的代码
        const extracted = this.extractPureCode(this.manualCode)
        return stripFreopenStatements(extracted || this.manualCode.trim())
      }
      return ''
    },
    formattedPureCode() {
      const lang = this.language === 'C++' ? 'cpp' : 'python'
      return '```' + lang + '\n' + this.pureAcCode + '\n```'
    },
    // 翻译完成后就应该有 title + tags，此后不需要再单独调用 /api/generate-problem-meta
    hasValidMeta() {
      return hasValidTaskMeta({ problemMeta: this.problemMeta })
    },
    hasCompletedTasks() {
      return this.tasks.some(t => t.status === 'completed')
    },
    hasPendingRawMaterialTasks() {
      return this.tasks.some(task => hasTaskPendingRawMaterials(task))
    },
    currentTaskHasRawMaterials() {
      return hasTaskRawMaterials(this.tasks[this.currentTaskIndex])
    },
    nflsojSelectedCount() {
      return Object.values(this.nflsojModalSelected).filter(Boolean).length
    },
    nflsojModalHasMore() {
      return this.nflsojModalPage < this.nflsojModalTotalPages
    },
    nflsojFilteredContests() {
      const kw = this.nflsojFilterKeyword.trim().toLowerCase()
      if (!kw) return this.nflsojModalContests
      return this.nflsojModalContests.filter(c =>
        c.title.toLowerCase().includes(kw) || c.id.includes(kw)
      )
    },

    lyrioSelectedCount() {
      return Object.values(this.lyrioModalSelected).filter(Boolean).length
    },
    lyrioModalHasMore() {
      return this.lyrioModalContests.length >= 50
    },
    lyrioFilteredContests() {
      const kw = this.lyrioFilterKeyword.trim().toLowerCase()
      if (!kw) return this.lyrioModalContests
      return this.lyrioModalContests.filter(c =>
        (c.name || '').toLowerCase().includes(kw) || String(c.id).includes(kw)
      )
    },

    htojSelectedCount() {
      return Object.values(this.htojModalSelected).filter(Boolean).length
    },
    htojModalHasMore() {
      return this.htojModalPage < this.htojModalTotalPages
    },
    htojFilteredContests() {
      const kw = this.htojFilterKeyword.trim().toLowerCase()
      if (!kw) return this.htojModalContests
      return this.htojModalContests.filter(c =>
        (c.title || '').toLowerCase().includes(kw) || c.id.includes(kw)
      )
    },

    // ─── htoj 自动提交 ───
    isHtojProblem() {
      const task = this.tasks[this.currentTaskIndex]
      const url = task?.problemMeta?.sourceUrl || task?.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl || this.problemMeta?.fetchUrl || ''
      return /htoj\.com\.cn/i.test(url)
    },
    htojResultClass() {
      if (!this.htojSubmitResult) return ''
      if (this.htojSubmitResult.includes('Accepted') || this.htojSubmitResult.includes('答案正确')) return 'htoj-ac'
      if (this.htojSubmitResult.includes('Compile Error') || this.htojSubmitResult.includes('编译错误')) return 'htoj-ce'
      if (this.htojSubmitResult.includes('Wrong Answer') || this.htojSubmitResult.includes('答案错误')) return 'htoj-wa'
      if (this.htojSubmitResult.includes('Time Limit') || this.htojSubmitResult.includes('时间超限')) return 'htoj-tle'
      if (this.htojSubmitResult.includes('Runtime Error') || this.htojSubmitResult.includes('运行错误')) return 'htoj-re'
      return 'htoj-pending'
    },
    hasHtojTasks() {
      return this.tasks.some(t => {
        const url = t?.problemMeta?.sourceUrl || t?.problemMeta?.fetchUrl || ''
        return /htoj\.com\.cn/i.test(url)
      })
    }
  },
  methods: {
    createTaskId() {
      return createTaskId()
    },

    async restoreTaskAttachmentCache() {
      const hydratedTasks = await hydrateTaskAttachmentCache(this.tasks)
      if (!Array.isArray(hydratedTasks) || !hydratedTasks.length) return
      this.tasks = hydratedTasks
      if (this.tasks[this.currentTaskIndex]) {
        this.loadTask(this.currentTaskIndex)
      }
    },

    queueTaskAttachmentCacheSync(taskList = this.tasks) {
      if (this._taskAttachmentCacheSyncTimer) {
        window.clearTimeout(this._taskAttachmentCacheSyncTimer)
      }
      const snapshot = Array.isArray(taskList) ? taskList.slice() : []
      this._taskAttachmentCacheSyncTimer = window.setTimeout(() => {
        syncTaskAttachmentCache(snapshot).catch((error) => {
          console.warn('Failed to sync attachment cache:', error)
        })
      }, 120)
    },

    ensureExtensionImportRequestState() {
      if (!this._activeExtensionImportRequestIds) {
        this._activeExtensionImportRequestIds = new Set()
      }
      if (!this._completedExtensionImportRequestIds) {
        this._completedExtensionImportRequestIds = new Map()
      }
    },

    tryStartExtensionImportRequest(requestId) {
      if (!requestId) return true
      this.ensureExtensionImportRequestState()
      const now = Date.now()
      const completedAt = this._completedExtensionImportRequestIds.get(requestId)
      if (this._activeExtensionImportRequestIds.has(requestId)) return false
      if (completedAt && now - completedAt < 10 * 60 * 1000) return false
      this._activeExtensionImportRequestIds.add(requestId)
      return true
    },

    finishExtensionImportRequest(requestId, completed = false) {
      if (!requestId) return
      this.ensureExtensionImportRequestState()
      this._activeExtensionImportRequestIds.delete(requestId)
      if (!completed) return
      this._completedExtensionImportRequestIds.set(requestId, Date.now())
      if (this._completedExtensionImportRequestIds.size <= 100) return
      const oldestKey = this._completedExtensionImportRequestIds.keys().next().value
      if (oldestKey) this._completedExtensionImportRequestIds.delete(oldestKey)
    },

    getPendingExtensionImportKey(requestId) {
      return `programtools_pending_solvedata_import:${requestId}`
    },

    getPendingExtensionImportPointerKey() {
      return 'programtools_pending_solvedata_import_latest'
    },

    getPendingExtensionImportResultKey(requestId) {
      return `programtools_pending_solvedata_import_result:${requestId}`
    },

    markExtensionImportResult(requestId, ok, error = '') {
      if (!requestId) return
      localStorage.setItem(this.getPendingExtensionImportResultKey(requestId), JSON.stringify({ ok, error, ts: Date.now() }))
    },

    isSingleProblemUrl(url) {
      return (
        /atcoder\.jp\/contests\/[^/]+\/tasks\/[^/]+_[a-z0-9][^/]*$/i.test(url) ||
        /codeforces\.com\/(contest|gym)\/\d+\/problem\//i.test(url) ||
        /luogu\.com\.cn\/problem\/[A-Z0-9]/i.test(url) ||
        /htoj\.com\.cn.*[?&]pid=\d+/i.test(url) ||
        /nflsoi\.cc[^/]*\/contest\/[a-z0-9]+\/problem\/[a-z0-9_]+/i.test(url) ||
        /nflsoi\.cc[^/]*\/p\/[a-zA-Z0-9_]+([?&]tid=|$)/i.test(url) ||
        /nflsoi\.cc:10999\/(?:contest|c)\/\d+\/(?:problem|p)\/\d+/i.test(url) ||
        /nflsoi\.cc:10999\/p\/\d+/i.test(url) ||
        /mna\.wang\/contest\/\d+\/problem\/\d+\/?$/i.test(url)
      )
    },

    normalizeImportedSourceUrl(url) {
      const raw = String(url || '').trim()
      if (!raw) return ''

      try {
        const parsed = new URL(raw)
        parsed.hash = ''
        if (/atcoder\.jp$/i.test(parsed.hostname)) {
          parsed.search = ''
        }
        const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
        return `${parsed.origin}${pathname}${parsed.search}`
      } catch {
        return raw.replace(/#.*$/, '').replace(/\/+$/, '')
      }
    },

    findTaskIndexBySourceUrl(url) {
      const normalizedUrl = this.normalizeImportedSourceUrl(url)
      if (!normalizedUrl) return -1

      return this.tasks.findIndex((task) => {
        const sourceUrl = task?.problemMeta?.sourceUrl
        if (!sourceUrl) return false
        return this.normalizeImportedSourceUrl(sourceUrl) === normalizedUrl
      })
    },

    async importTasksFromUrl(url, options = {}) {
      const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null

      try {
        if (this.isSingleProblemUrl(url)) throw new Error('single_problem')

        onProgress?.('获取比赛题目列表...')
        const contestData = await request(`/api/atcoder/contest?url=${encodeURIComponent(url)}`)
        const problems = contestData.problems || []
        if (problems.length === 0) throw new Error('比赛中没有找到题目')

        let added = 0
        let skipped = 0
        for (const p of problems) {
          onProgress?.(`正在获取题目 ${p.label}. ${p.title} (${added + 1}/${problems.length})...`)
          try {
            const result = await this.addProblemAsTask(p.url, p.label + '. ' + p.title, p.label, p.tags || [])
            if (result?.added) {
              added++
            } else {
              skipped++
            }
          } catch {
            // 单题失败不阻断整场导入
          }
        }

        if (added === 0 && skipped === 0) {
          throw new Error('比赛题目导入失败')
        }

        if (added === 0 && skipped > 0) {
          this.showToastMessage('当前比赛题目已在任务列表中，未重复导入')
        }

        return {
          kind: 'url',
          mode: 'contest',
          added,
          skipped,
          total: problems.length,
          contestTitle: contestData.title || '',
          url,
        }
      } catch (contestErr) {
        onProgress?.('获取题目内容...')
        await this.addProblemAsTask(url)
        return {
          kind: 'url',
          mode: 'problem',
          added: 1,
          total: 1,
          url,
        }
      }
    },

    async applyExtensionImportRequest(rawPayload) {
      const requestPayload = normalizeExtensionImportRequest(rawPayload)

      if (requestPayload.kind === 'task') {
        this.importTaskFromExtension(requestPayload.payload)
        return { kind: 'task', mode: 'problem' }
      }

      if (requestPayload.kind === 'url') {
        const url = requestPayload.payload?.url?.trim()
        if (!url) {
          throw new Error('扩展导入缺少题目链接')
        }
        return await this.importTasksFromUrl(url)
      }

      throw new Error('不支持的扩展导入类型')
    },

    async consumePendingExtensionImport() {
      const pointerKey = this.getPendingExtensionImportPointerKey()
      const requestId = localStorage.getItem(pointerKey)
      if (!requestId) return false
      if (!this.tryStartExtensionImportRequest(requestId)) return false

      const payloadKey = this.getPendingExtensionImportKey(requestId)
      const rawPayload = localStorage.getItem(payloadKey)
      if (!rawPayload) {
        this.finishExtensionImportRequest(requestId, false)
        return false
      }

      try {
        const payload = JSON.parse(rawPayload)
        const result = await this.applyExtensionImportRequest(payload)
        this.markExtensionImportResult(requestId, true)
        localStorage.removeItem(payloadKey)
        localStorage.removeItem(pointerKey)
        this.showToastMessage(getExtensionImportSuccessMessage(result))
        this.finishExtensionImportRequest(requestId, true)
        return true
      } catch (error) {
        console.error('Pending extension import failed:', error)
        this.markExtensionImportResult(requestId, false, error.message)
        this.showToastMessage('扩展导入失败: ' + error.message)
        this.finishExtensionImportRequest(requestId, false)
        return false
      }
    },

    handleExtensionStorageChange(event) {
      if (event.key !== this.getPendingExtensionImportPointerKey()) return
      this.consumePendingExtensionImport()
    },

    applyImportedTasks(importedTasks, options = {}) {
      const result = mergeImportedTasks({
        tasks: this.tasks,
        currentTaskIndex: this.currentTaskIndex,
        importedTasks,
      })

      this.tasks = result.tasks

      let targetIndex = result.lastImportedIndex
      if (options.activate === 'first') {
        targetIndex = 0
      } else if (typeof options.activateIndex === 'number') {
        targetIndex = options.activateIndex
      }

      if (targetIndex >= 0) {
        if (targetIndex === this.currentTaskIndex) {
          this.loadTask(targetIndex)
        } else {
          this.switchTask(targetIndex)
        }
      }

      if (options.mirrorProblemText) {
        for (const index of result.importedIndices) {
          this.mirrorImages(index, ['problemText'])
        }
      }

      return result
    },

    importTaskFromExtension(payload) {
      if (!payload?.content || !payload?.url) {
        throw new Error('扩展导入数据缺少题面或题目链接')
      }

      const existingIndex = this.findTaskIndexBySourceUrl(payload.url)
      if (existingIndex >= 0) {
        if (existingIndex === this.currentTaskIndex) {
          this.loadTask(existingIndex)
        } else {
          this.switchTask(existingIndex)
        }
        this.showToastMessage('该题已在任务列表中，未重复导入')
        return
      }

      const importedTask = createExtensionImportedTask(payload)
      if (importedTask?.problemMeta?.sourceUrl) {
        importedTask.problemMeta.sourceUrl = this.normalizeImportedSourceUrl(importedTask.problemMeta.sourceUrl)
      }
      this.applyImportedTasks([importedTask], { mirrorProblemText: true })
    },

    async handleExtensionImportMessage(event) {
      const data = event?.data
      if (event.source !== window) return
      if (!data || data.source !== 'programtools-edge-extension') return
      if (data.type !== 'programtools-import-solvedata') return
      if (!this.tryStartExtensionImportRequest(data.requestId)) return

      try {
        const result = await this.applyExtensionImportRequest(data.payload)
        this.markExtensionImportResult(data.requestId, true)
        window.postMessage({
          source: 'programtools-solvedata-page',
          type: 'programtools-import-solvedata-result',
          requestId: data.requestId,
          ok: true,
        }, window.location.origin)
        this.showToastMessage(getExtensionImportSuccessMessage(result))
        this.finishExtensionImportRequest(data.requestId, true)
      } catch (error) {
        console.error('Extension import failed:', error)
        this.markExtensionImportResult(data.requestId, false, error.message)
        window.postMessage({
          source: 'programtools-solvedata-page',
          type: 'programtools-import-solvedata-result',
          requestId: data.requestId,
          ok: false,
          error: error.message,
        }, window.location.origin)
        this.showToastMessage('扩展导入失败: ' + error.message)
        this.finishExtensionImportRequest(data.requestId, false)
      }
    },

    isExplainCodeMode(taskIndex = this.currentTaskIndex) {
      const task = this.tasks?.[taskIndex]
      const manualCode = task?.manualCode ?? this.manualCode
      return !!manualCode?.trim()
    },

    getSolveDataModel(taskIndex = this.currentTaskIndex) {
      return this.selectedModel
    },

    getMetaReportModel() {
      return this.reportModel
    },

    updateMainModelPreference() {
      const resolved = resolvePreferredModel(this.modelOptions, this.selectedModel, getDefaultMainModel())
      this.selectedModel = setDefaultMainModel(resolved)
      this.showToastMessage(`默认主模型已切换为 ${resolved}`)
    },

    updateTranslationModelPreference() {
      const resolved = resolvePreferredModel(this.modelOptions, this.translationModel)
      this.translationModel = setDefaultTranslationModel(resolved)
      this.showTranslationModelConfig = false
      this.showToastMessage(`默认翻译模型已切换为 ${resolved}`)
    },

    updateReportModelPreference() {
      const resolved = resolvePreferredModel(this.modelOptions, this.reportModel)
      this.reportModel = setDefaultReportModel(resolved)
      this.showReportModelConfig = false
      this.showToastMessage(`默认报告模型已切换为 ${resolved}`)
    },

    extractCodeFromProblem() {
      if (!this.problemText) return
      
      const codeBlockRegex = /```(?:[\w\+\-]+)?\s*\n([\s\S]*?)```/g
      const matches = [...this.problemText.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // Find the largest code block
        let bestMatch = matches[0]
        let maxLen = 0
        for (const m of matches) {
          if (m[1].length > maxLen) {
            maxLen = m[1].length
            bestMatch = m
          }
        }
        
        if (maxLen > 20) {
            this.manualCode = stripFreopenStatements(bestMatch[1].trim())
           this.showToastMessage('已提取代码到下方输入框')
           return
        }
      }
      this.showToastMessage('未在题目描述中发现明显的代码块')
    },

    extractPureCode(content) {
      return extractPureCode(content)
    },

    cleanDataOutput(content) {
      return cleanDataOutput(content)
    },

    // --- 统一的辅助函数 ---

    applyTitleToTranslation(text, metaTitle) {
      return applyTitleToTranslation(text, metaTitle)
    },

    getSmartTitle(meta, text, id) {
      return getSmartTitle(meta, text, id)
    },

    // 获取最佳代码内容 (整合了 manualCode 的启发式检测)
    getBestCodeContent(codeOutput, manualCode) {
      return getBestCodeContent(codeOutput, manualCode)
    },

    // 处理数据生成脚本
    processDataScript(scriptContent, language) {
      return processDataScript(scriptContent, language)
    },

    // 检测语言
    detectLanguage(codeOutput) {
      return detectLanguage(codeOutput)
    },

    // --- 批量模式方法 ---
    toggleBatchMode() {
      this.isBatchMode = !this.isBatchMode
      // 如果进入批量模式且没有任务，确保有一个空任务
      if (this.isBatchMode && this.tasks.length === 0) {
        this.addNewTask()
      }
    },
    
    addNewTask() {
      const newTask = createEmptyTask()
      this.tasks.push(newTask)
      this.switchTask(this.tasks.length - 1)
    },

    openFolderImport() {
      if (this.isBatchRunning) return
      const input = this.$refs.folderImporter
      if (!input) return
      input.value = ''
      input.click()
    },

    async handleFolderImport(event) {
      const files = Array.from(event?.target?.files || [])
      if (!files.length) return

      try {
        const importedTasks = await readFolderImportedTasks(files)

        if (!importedTasks.length) {
          this.showToastMessage('未发现可导入的题目目录，至少需要包含 problem.md')
          return
        }

        this.applyImportedTasks(importedTasks, { activate: 'first' })
        this.showToastMessage(`已导入 ${importedTasks.length} 道题目到任务列表`)
      } catch (e) {
        console.error('Folder import failed:', e)
        this.showToastMessage('导入目录失败: ' + e.message)
      }
    },
    
    removeTask(index) {
      if (this.tasks.length <= 1) {
        // 如果只剩一个，清空内容而不是删除
        this.tasks[0] = createEmptyTask({ id: this.tasks[0].id })
        this.loadTask(0)
        return
      }
      
      this.tasks.splice(index, 1)
      if (this.currentTaskIndex >= this.tasks.length) {
        this.switchTask(this.tasks.length - 1)
      } else if (index === this.currentTaskIndex) {
        this.loadTask(this.currentTaskIndex)
      } else if (index < this.currentTaskIndex) {
        this.currentTaskIndex--
      }
    },

    clearCompletedTasks() {
      const completedCount = this.tasks.filter(t => t.status === 'completed').length
      if (completedCount === 0) { this.showToastMessage('没有已完成的任务'); return }
      if (!confirm(`确认清除 ${completedCount} 个已完成的任务？`)) return
      const remaining = this.tasks.filter(t => t.status !== 'completed')
      if (remaining.length === 0) {
        // 全都是已完成，保留一个空任务
        this.tasks = [createEmptyTask()]
        this.currentTaskIndex = 0
        this.loadTask(0)
      } else {
        this.tasks = remaining
        // 保证 currentTaskIndex 有效
        if (this.currentTaskIndex >= this.tasks.length) {
          this.currentTaskIndex = this.tasks.length - 1
        }
        this.loadTask(this.currentTaskIndex)
      }
      this.showToastMessage(`已清除 ${completedCount} 个已完成任务`)
    },

    clearAllTasks() {
      if (!confirm('确认清空所有任务？此操作不可撤销。')) return
      const emptyTask = createEmptyTask()
      this.tasks = [emptyTask]
      this.currentTaskIndex = 0
      this.loadTask(0)
    },

    resetTaskStatus(index) {
      if (this.tasks[index]) {
        this.tasks[index].status = 'pending'
      }
    },
    
    switchTask(index) {
      if (index === this.currentTaskIndex) return
      this.currentTaskIndex = index
      this.loadTask(index)
    },
    
    loadTask(index) {
      const task = this.tasks[index]
      if (!task) return
      
      // 暂停 watcher 以免触发 updateCurrentTask
      // 但由于 Vue 2/3 响应式机制，直接赋值会触发 watcher
      // 我们在 updateCurrentTask 中检查是否一致来避免死循环，或者接受这次冗余更新
      this.problemText = task.problemText || ''
      this.editorialText = task.editorialText || ''
      this.manualCode = stripFreopenStatements(task.manualCode || '')
      this.referenceText = task.referenceText || ''
      this.codeOutput = task.codeOutput || ''
      this.dataOutput = task.dataOutput || ''
      this.translationText = task.translationText || ''
      this.translationEnglish = task.translationEnglish || ''
      this.serverPureCode = task.serverPureCode || ''
      this.problemMeta = task.problemMeta || null
      this.reportHtml = task.reportHtml || ''
      this.cpretResults = task.cpretResults ?? null
      // 如果切换到的任务有步骤状态（如正在后台生成），显示步骤条
      this.showStepIndicators = Object.keys(task.generationSteps || {}).length > 0
    },

    updateCurrentTask(field, value) {
      if (this.tasks[this.currentTaskIndex]) {
        const normalizedValue = field === 'manualCode' ? stripFreopenStatements(value) : value
        // 如果修改了输入且值真的发生变化，重置状态为 pending (除非正在运行)
        if ((field === 'problemText' || field === 'manualCode' || field === 'referenceText') && 
            this.tasks[this.currentTaskIndex].status === 'completed' && 
            !this.isBatchRunning &&
            normalizedValue !== this.tasks[this.currentTaskIndex][field]) {
          this.tasks[this.currentTaskIndex].status = 'pending'
        }
        this.tasks[this.currentTaskIndex][field] = normalizedValue
      }
    },

    createTasksSnapshot(taskList) {
      return (Array.isArray(taskList) ? taskList : []).map(t => {
        if (!t?.additionalFile) return t
        const { base64, ...rest } = t.additionalFile
        return { ...t, additionalFile: rest }
      })
    },

    loadStoredTasksSnapshot() {
      try {
        const sessionValue = sessionStorage.getItem(SOLVE_DATA_TASKS_STORAGE_KEY)
        if (sessionValue) return sessionValue
      } catch (_) {
        // Ignore sessionStorage failures.
      }
      try {
        return localStorage.getItem(SOLVE_DATA_TASKS_STORAGE_KEY)
      } catch (_) {
        return null
      }
    },

    persistTasksSnapshot(taskList) {
      try {
        const payload = JSON.stringify(this.createTasksSnapshot(taskList))
        localStorage.setItem(SOLVE_DATA_TASKS_STORAGE_KEY, payload)
        try {
          sessionStorage.removeItem(SOLVE_DATA_TASKS_STORAGE_KEY)
        } catch (_) {
          // Ignore session cleanup failures.
        }
      } catch (e) {
        try {
          localStorage.removeItem(SOLVE_DATA_TASKS_STORAGE_KEY)
        } catch (_) {
          // Ignore cleanup failures.
        }
        try {
          const payload = JSON.stringify(this.createTasksSnapshot(taskList))
          sessionStorage.setItem(SOLVE_DATA_TASKS_STORAGE_KEY, payload)
        } catch (_) {
          console.warn('Browser storage quota exceeded, skipping SolveData task save:', e.message)
        }
      }
    },

    // 将某个字段值写入指定任务。若该任务正是当前正在查看的任务，
    // 则写入响应式属性（触发 watcher → UI 刷新）；否则直接写 tasks[] 避免污染当前视图。
    saveToTask(taskIndex, field, value, expectedTaskId = null) {
      // 通过 ID 定位任务的当前索引，避免删除/重排后索引错位导致数据写入错任务或丢失
      // 如果提供了 expectedTaskId，以 ID 为准查找实际位置，而不信任可能已过时的 taskIndex
      let actualIndex = taskIndex
      if (expectedTaskId !== null) {
        const found = this.tasks.findIndex(t => t.id === expectedTaskId)
        if (found === -1) return  // 任务已被删除，丢弃结果
        actualIndex = found
      }
      const normalizedValue = field === 'manualCode' || field === 'serverPureCode'
        ? stripFreopenStatements(value)
        : value
      if (actualIndex === this.currentTaskIndex) {
        // 同时直接写入 tasks[]，防止 watcher 异步触发时 currentTaskIndex 已切换导致数据写错任务
        // watcher 仍会触发以刷新 UI，但实际数据由此处的直接写入保障
        if (this.tasks[actualIndex]) {
          this.tasks[actualIndex][field] = normalizedValue
        }
        this[field] = normalizedValue
      } else if (this.tasks[actualIndex]) {
        this.tasks[actualIndex][field] = normalizedValue
      }
    },

    // 将指定任务的若干字段中的外部图片 URL 代理上传到 COS，防止 AtCoder/CF 防盗链导致图片无法显示
    async mirrorImages(taskIndex, fields) {
      const IMG_RE = /!\[([^\]]*)\]\((https?:\/\/(?![^)]*myqcloud\.com)[^)]+)\)/g
      const urls = new Set()
      const getVal = (f) => taskIndex === this.currentTaskIndex ? this[f] : (this.tasks[taskIndex]?.[f] || '')
      for (const f of fields) {
        const val = getVal(f)
        if (val) { let m; IMG_RE.lastIndex = 0; while ((m = IMG_RE.exec(val)) !== null) urls.add(m[2]) }
      }
      if (!urls.size) return
      const token = localStorage.getItem('auth_token')
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      const urlMap = {}
      await Promise.all([...urls].map(async url => {
        try {
          const r = await fetch('/api/proxy-image', { method: 'POST', headers, body: JSON.stringify({ url }) })
          const d = await r.json()
          if (d.cosUrl) urlMap[url] = d.cosUrl
        } catch {}
      }))
      if (!Object.keys(urlMap).length) return
      const replace = md => md.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, (m, alt, u) => urlMap[u] ? `![${alt}](${urlMap[u]})` : m)
      for (const f of fields) {
        const val = getVal(f)
        if (val) this.saveToTask(taskIndex, f, replace(val))
      }
      this.showToastMessage(`✅ 已将 ${Object.keys(urlMap).length} 张图片镜像到 COS`)
    },
    
    async runBatch() {
      if (this.isBatchRunning) return

      const pendingTasks = getPendingBatchTaskEntries(this.tasks)

      if (pendingTasks.length === 0) {
        this.showToastMessage('没有待处理的任务')
        return
      }

      this.isBatchRunning = true

      try {
        await runBatchTasks({
          tasks: this.tasks,
          batchMode: this.batchMode,
          switchTask: async (index) => {
            this.switchTask(index)
          },
          markTaskStatus: (index, status) => {
            if (this.tasks[index]) this.tasks[index].status = status
          },
          handleReportOnlyTask: async (index) => {
            if (!hasValidTaskMeta(this.tasks[index])) {
              try {
                const metaRes = await request('/api/generate-problem-meta', {
                  method: 'POST',
                  body: JSON.stringify({
                    text: this.tasks[index].problemText,
                    model: this.getMetaReportModel()
                  })
                })
                if (metaRes) {
                  const existingMeta = this.tasks[index]?.problemMeta || {}
                  this.saveToTask(index, 'problemMeta', { ...existingMeta, ...metaRes })
                }
              } catch (e) {
                console.warn('Meta generation failed in report-only mode', e)
              }
            }

            await this.generateReportForBatch(index)
          },
          handleStandardTask: async () => {
            const success = await this.generateAll()
            if (!success) throw new Error('Generation failed')
          },
          onTaskError: (index, error) => {
            console.error(`Task ${index} failed:`, error)
          },
          delayMs: 1000,
        })

        this.showToastMessage('批量任务处理完成！')
      } finally {
        this.isBatchRunning = false
      }
    },
    
    async generateReportForBatch(index) {
      const task = this.tasks[index]
      const payload = buildBatchReportRequest(task, {
        extractPureCode: (content) => this.extractPureCode(content),
        model: this.getMetaReportModel(),
        language: this.language,
      })

      if (!payload) return
      
      try {
        const res = await request.post('/api/solution-report', payload)
        
        if (res.html) {
          this.tasks[index].reportHtml = res.html
        }
      } catch (e) {
        console.error('Batch report generation failed', e)
      }
    },
    
    async downloadBatch() {
      const completedTasks = this.tasks.filter(t => t.status === 'completed')
      if (completedTasks.length === 0) {
        this.showToastMessage('没有已完成的任务可下载')
        return
      }
      
      try {
        let JSZip
        try {
          JSZip = await loadJsZip()
        } catch (e) {
          console.error('Failed to load JSZip', e)
          this.showToastMessage('下载组件加载失败')
          return
        }

        const { blob, zipName, sourceLinkLines } = await createBatchExportBundle({
          JSZip,
          completedTasks,
          helperApi: {
            storage: localStorage,
            getSmartTitle: (meta, text, id) => this.getSmartTitle(meta, text, id),
            detectLanguage: (codeOutput) => this.detectLanguage(codeOutput),
            getBestCodeContent: (codeOutput, manualCode) => this.getBestCodeContent(codeOutput, manualCode),
            processDataScript: (scriptContent, language) => this.processDataScript(scriptContent, language),
            applyTitleToTranslation: (text, metaTitle) => this.applyTitleToTranslation(text, metaTitle),
            generateProblemYaml: (meta, pText, tText) => this.generateProblemYaml(meta, pText, tText),
            generateRunScript: (lang) => this.generateRunScript(lang),
            generateBatScript: (lang) => this.generateBatScript(lang),
          },
        })

        this.downloadBlob(blob, zipName)
        const batchNotes = sourceLinkLines?.length ? sourceLinkLines.join('\n\n') : ''
        this.sendPackageEmail(blob, zipName, `SolveData 批量导出: ${zipName}`, '✅ 批量导出成功', '', batchNotes)
      } catch (e) {
        console.error('Batch download failed', e)
        this.showToastMessage('批量下载失败: ' + e.message)
      }
    },

    async downloadPendingRawMaterials() {
      const pendingTasks = this.tasks.filter(task => hasTaskPendingRawMaterials(task))
      if (pendingTasks.length === 0) {
        this.showToastMessage('没有可下载的未生成素材任务')
        return
      }

      try {
        const JSZip = await loadJsZip()
        const { blob, zipName } = await createRawMaterialsExportBundle({
          JSZip,
          tasks: pendingTasks,
          helperApi: {
            storage: localStorage,
            getSmartTitle: (meta, text, id) => this.getSmartTitle(meta, text, id),
            detectLanguage: (codeOutput) => this.detectLanguage(codeOutput),
            getBestCodeContent: (codeOutput, manualCode) => this.getBestCodeContent(codeOutput, manualCode),
          },
        })

        this.downloadBlob(blob, zipName)
        this.sendPackageEmail(blob, zipName, `SolveData 原始素材包: ${zipName}`, '✅ 未生成素材已打包下载', this.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl || '')
      } catch (error) {
        console.error('Pending raw materials download failed', error)
        this.showToastMessage('未生成素材下载失败: ' + error.message)
      }
    },

    async downloadCurrentRawMaterials() {
      const currentTask = this.tasks[this.currentTaskIndex]
      if (!hasTaskRawMaterials(currentTask)) {
        this.showToastMessage('当前任务没有可下载的原始素材')
        return
      }

      try {
        const JSZip = await loadJsZip()
        const { blob, zipName } = await createRawMaterialsExportBundle({
          JSZip,
          tasks: [currentTask],
          helperApi: {
            storage: localStorage,
            getSmartTitle: (meta, text, id) => this.getSmartTitle(meta, text, id),
            detectLanguage: (codeOutput) => this.detectLanguage(codeOutput),
            getBestCodeContent: (codeOutput, manualCode) => this.getBestCodeContent(codeOutput, manualCode),
          },
        })

        this.downloadBlob(blob, zipName)
        this.sendPackageEmail(blob, zipName, `SolveData 原始素材包: ${zipName}`, '✅ 原始素材已打包下载', this.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl || '')
      } catch (error) {
        console.error('Current raw materials download failed', error)
        this.showToastMessage('原始素材下载失败: ' + error.message)
      }
    },

    downloadBlob(blob, fileName) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },

    async sendPackageEmail(blob, filename, subject, successToast = '', sourceUrl = '', notes = '') {
      try {
        const base64 = await blobToBase64(blob)
        fetch('/api/send-package', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
          },
          body: JSON.stringify({ filename, contentBase64: base64, subject, sourceUrl, notes })
        })
          .then(async res => {
            if (!res.ok) {
              const err = await res.json()
              console.warn('邮件发送失败:', err)
              return
            }
            if (successToast) this.showToastMessage(successToast)
          })
          .catch(e => console.error('邮件请求错误:', e))
      } catch (error) {
        console.error('邮件准备失败:', error)
      }
    },

    startResize(e) {
      if (e) e.preventDefault()
      this.isDragging = true
      document.addEventListener('mousemove', this.onMouseMove)
      document.addEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = 'none'
    },
    onMouseMove(e) {
      if (!this.isDragging) return
      const container = this.$el.querySelector('.main-layout')
      if (!container) return
      
      // 获取容器的样式以计算 padding
      const style = window.getComputedStyle(container)
      const paddingLeft = parseFloat(style.paddingLeft) || 0
      const paddingRight = parseFloat(style.paddingRight) || 0
      
      const rect = container.getBoundingClientRect()
      const contentWidth = rect.width - paddingLeft - paddingRight
      
      let sidebarWidth = 0
      if (this.isBatchMode) {
        const sidebar = this.$el.querySelector('.batch-sidebar')
        if (sidebar) sidebarWidth = sidebar.offsetWidth
      }
      
      // 计算相对于内容区域的鼠标位置
      const mouseX = e.clientX - rect.left - paddingLeft
      
      // 计算新的百分比宽度
      const newWidth = ((mouseX - sidebarWidth) / contentWidth) * 100
      
      // 动态计算最大宽度，保留右侧至少 200px 或 15%
      // 这里的 newWidth 是 input-panel 的宽度百分比
      
      if (newWidth > 15 && newWidth < 85) {
        this.leftWidth = newWidth
      }
    },
    stopResize() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onMouseMove)
      document.removeEventListener('mouseup', this.stopResize)
      document.body.style.userSelect = ''
    },
    async loadModels() {
      try {
        const list = await getModels()
        if (Array.isArray(list) && list.length > 0) {
          this.models = list
          this.selectedModel = resolvePreferredModel(list, this.selectedModel, getDefaultMainModel())
          this.translationModel = resolvePreferredModel(list, this.translationModel)
          this.reportModel = resolvePreferredModel(list, this.reportModel)
          setDefaultMainModel(this.selectedModel)
          setDefaultTranslationModel(this.translationModel)
          setDefaultReportModel(this.reportModel)
        }
      } catch (e) {
        // 加载失败时保持内置备选项
      }
    },

    // ─── URL 抓取题目 ─────────────────────────────────────────────────────────
    async fetchFromUrl() {
      if (!this.fetchUrl.trim()) return
      this.isFetchingUrl = true
      this.fetchUrlError = ''
      this.fetchProgress = ''
      const url = this.fetchUrl.trim()
      try {
        const result = await this.importTasksFromUrl(url, {
          onProgress: (message) => {
            this.fetchProgress = message
          }
        })
        this.fetchUrl = ''
        this.fetchProgress = ''
        if (result.mode === 'contest') {
          this.showToastMessage(`✅ 已添加 ${result.added} 道题目到任务列表`)
        }
      } catch (e) {
        this.fetchUrlError = e.message || '获取失败，请检查链接是否正确'
        this.fetchProgress = ''
      } finally {
        this.isFetchingUrl = false
      }
    },

    async addProblemAsTask(url, fallbackTitle, contestLabel, prefetchedTags = []) {
      const existingIndex = this.findTaskIndexBySourceUrl(url)
      if (existingIndex >= 0) {
        if (existingIndex === this.currentTaskIndex) {
          this.loadTask(existingIndex)
        } else {
          this.switchTask(existingIndex)
        }
        this.showToastMessage('该题已在任务列表中，未重复导入')
        return { added: false, existingIndex }
      }

      const data = await request(`/api/atcoder/problem?url=${encodeURIComponent(url)}`)
      const { editorial, acCode, additionalFile, task } = createFetchedProblemTask({
        url,
        data,
        fallbackTitle,
        contestLabel,
        prefetchedTags,
      })
      if (task?.problemMeta?.sourceUrl) {
        task.problemMeta.sourceUrl = this.normalizeImportedSourceUrl(task.problemMeta.sourceUrl)
      }
      if (acCode) {
        this.showToastMessage('✅ 已自动抓取 AC 代码')
      } else if (editorial) {
        this.showToastMessage('✅ 已自动抓取 AtCoder 解题思路')
      }
      if (additionalFile) {
        const sizeKb = Math.round(additionalFile.size / 1024)
        this.showToastMessage(`📦 已下载附加文件 ${additionalFile.filename} (${sizeKb} KB)`)
      }

      this.applyImportedTasks([task], { mirrorProblemText: true })
      return { added: true }
    },

        async autoTranslate(forcedTargetIndex = null) {
          const taskIndex = (forcedTargetIndex !== null && forcedTargetIndex !== undefined) ? forcedTargetIndex : this.currentTaskIndex
          const isOnTask = () => this.currentTaskIndex === taskIndex
          const problemText = this.tasks[taskIndex]?.problemText ?? this.problemText
          if (!problemText.trim()) return;
          this.isTranslating = true;
          if (isOnTask()) {
            this.generationStatus = '正在自动翻译题目...'
            this.translationText = '';
            this.translationEnglish = '';
          }
          try {
            const token = localStorage.getItem('auth_token')
            const headers = { 'Content-Type': 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const response = await fetch('/api/translate/stream', {
              method: 'POST', headers,
              body: JSON.stringify({ text: problemText, model: this.translationModel })
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buf = ''
            let charsReceived = 0
            let rawBuffer = ''       // 累积 AI 原始输出，用于流式提取 translation 字段
            let translationStart = -1 // rawBuffer 中 translation 字符串内容的起始偏移
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buf += decoder.decode(value, { stream: true })
              const lines = buf.split('\n'); buf = lines.pop()
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const d = line.slice(6).trim()
                if (!d || d === '[DONE]') continue
                try {
                  const ev = JSON.parse(d)
                  if (ev.type === 'chunk') {
                    charsReceived += ev.text.length
                    if (isOnTask()) this.generationStatus = `正在翻译... 已收到 ${charsReceived} 字`
                    rawBuffer += ev.text
                    const previewState = extractStreamingFieldPreview(rawBuffer, 'translation', translationStart)
                    translationStart = previewState.startOffset
                    if (previewState.preview && isOnTask()) this.translationText = previewState.preview
                  } else if (ev.type === 'result') {
                    this.saveToTask(taskIndex, 'translationText', ev.result || '')
                    this.saveToTask(taskIndex, 'translationEnglish', ev.english || '')
                    this.mirrorImages(taskIndex, ['translationText', 'translationEnglish'])
                    if (isOnTask()) {
                      this.translationText = ev.result || ''
                      this.translationEnglish = ev.english || ''
                    }
                    if (ev.meta && (ev.meta.title || (ev.meta.tags && ev.meta.tags.length))) {
                      const existingMeta = isOnTask() ? (this.problemMeta || {}) : (this.tasks[taskIndex]?.problemMeta || {})
                      const newMeta = mergeTranslationMeta(existingMeta, ev.meta)
                      this.saveToTask(taskIndex, 'problemMeta', newMeta)
                    }
                    if (isOnTask()) this.isTranslationStale = false
                  } else if (ev.type === 'error') {
                    throw new Error(ev.message)
                  }
                } catch (pe) {
                  if (pe.message && !pe.message.includes('JSON') && !pe.message.includes('Unexpected')) throw pe
                }
              }
            }
            if (isOnTask() && this.isGenerating !== 'all' && this.isGenerating !== 'code' && this.isGenerating !== 'data') {
              this.generationStatus = '✅ 翻译完成'
              setTimeout(() => { if (this.generationStatus === '✅ 翻译完成') this.generationStatus = '' }, 3000)
            }
          } catch (e) {
            if (isOnTask()) this.translationText = '请求错误: ' + e.message;
            if (isOnTask()) this.generationStatus = '❌ 翻译失败: ' + e.message
            throw e
          } finally {
            this.isTranslating = false;
          }
        },

        downloadTranslation() {
          if (!this.translationText) return;
          const blob = new Blob([this.translationText], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const name = (this.problemMeta?.title || 'problem').replace(/[\\/:*?"<>|]/g, '_')
          a.download = `${name}_zh.md`;
          a.click();
          URL.revokeObjectURL(url);
        },
        downloadTranslationEnglish() {
          if (!this.translationEnglish) return;
          const blob = new Blob([this.translationEnglish], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const name = normalizeProblemTitle((this.problemMeta?.rawTitle || this.problemMeta?.title || 'problem').replace(/[\\/:*?"<>|]/g, '_'), 'problem')
          a.download = `${name}_en.md`;
          a.click();
          URL.revokeObjectURL(url);
        },

        downloadEditorial() {
          if (!this.editorialText) return;
          const blob = new Blob([this.editorialText], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const name = normalizeProblemTitle((this.problemMeta?.title || this.problemMeta?.rawTitle || 'problem').replace(/[\\/:*?"<>|]/g, '_'), 'problem')
          a.download = `${name}_editorial.md`;
          a.click();
          URL.revokeObjectURL(url);
        },
        
        copyTranslation() {
          if (!this.translationText) return;
          navigator.clipboard.writeText(this.translationText).then(() => {
            this.showToastMessage('✅ 已复制翻译到剪贴板');
          });
        },

        copyTranslationEnglish() {
          if (!this.translationEnglish) return;
          navigator.clipboard.writeText(this.translationEnglish).then(() => {
            this.showToastMessage('✅ 已复制英文版到剪贴板');
          });
        },

        copyEditorial() {
          if (!this.editorialText) return;
          navigator.clipboard.writeText(this.editorialText).then(() => {
            this.showToastMessage('✅ 已复制题解 Markdown 到剪贴板');
          });
        },
    
    clearManualCode() {
      this.manualCode = ''
    },

    async searchCpret() {
      if (!this.problemText.trim()) return
      this.isCpretSearching = true
      this.cpretResults = null
      try {
        const q = this.problemText.slice(0, 2000)
        const data = await request(`/api/atcoder/cpret?q=${encodeURIComponent(q)}`)
        this.cpretResults = data.results || []
        this.updateCurrentTask('cpretResults', this.cpretResults)
      } catch (e) {
        this.showToastMessage(`检索失败: ${e.message || e}`)
        this.cpretResults = []
      } finally {
        this.isCpretSearching = false
      }
    },

    insertCpretLink(r) {
      const url = r.url || r.detailUrl
      if (!url) return
      const line = `\n原题链接：[${r.title}](${url})（${r.source}）`
      this.problemText = (this.problemText || '').trimEnd() + line
    },

    async batchSearchAllCpret() {
      if (this.isBatchCpretSearching) return
      const targets = this.tasks
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.problemText?.trim())
      if (!targets.length) {
        this.showToastMessage('没有可检索的任务')
        return
      }
      this.isBatchCpretSearching = true
      let done = 0
      for (const { i } of targets) {
        await this._fetchCpretResults(i)
        done++
        this.showToastMessage(`检索原题：${done} / ${targets.length}`)
      }
      this.isBatchCpretSearching = false
      this.showToastMessage(`全部检索完成，共 ${targets.length} 个任务`)
    },

    // 内部方法：后台检索原题，不影响 UI 的 isCpretSearching 状态
    async _fetchCpretResults(targetIndex) {
      const task = this.tasks[targetIndex]
      if (!task) return null
      const targetTaskId = task.id
      const q = (task.problemText || '').slice(0, 2000).trim()
      if (!q) return null
      try {
        const data = await request(`/api/atcoder/cpret?q=${encodeURIComponent(q)}`)
        const results = data.results || []
        this.saveToTask(targetIndex, 'cpretResults', results, targetTaskId)
        if (this.currentTaskIndex === targetIndex) {
          this.cpretResults = results
        }
        return results
      } catch (e) {
        return null
      }
    },

    // ─── NFLSOJ 比赛列表模态框 ──────────────────────────────────────────────────
    closeToolbarDropdowns(e) {
      if (!e.target.closest('.dropdown-wrap')) {
        this.showContestDropdown = false
        this.showBatchDropdown = false
      }
    },

    async openNflsojModal() {
      this.showNflsojModal = true
      if (!this.nflsojModalContests.length) {
        await this.loadNflsojContestPage(1)
      }
    },

    async loadNflsojContestPage(page) {
      this.isLoadingNflsojList = true
      try {
        const data = await request(`/api/atcoder/nflsoj-contest-list?page=${page}`)
        this.nflsojModalContests = data.contests || []
        this.nflsojModalPage = data.currentPage || page
        this.nflsojModalTotalPages = data.totalPages || 1
      } catch (e) {
        this.showToastMessage(`加载比赛列表失败: ${e.message}`)
      } finally {
        this.isLoadingNflsojList = false
      }
    },

    nflsojToggle(id, checked) {
      this.nflsojModalSelected = { ...this.nflsojModalSelected, [id]: checked }
    },

    nflsojSelectAll() {
      const sel = { ...this.nflsojModalSelected }
      this.nflsojFilteredContests.forEach(c => { sel[c.id] = true })
      this.nflsojModalSelected = sel
    },

    nflsojClearSelected() {
      this.nflsojModalSelected = {}
    },

    async importSelectedNflsojContests() {
      const ids = Object.entries(this.nflsojModalSelected)
        .filter(([, v]) => v)
        .map(([id]) => id)
      if (!ids.length) return
      this.isImportingNflsoj = true
      let totalAdded = 0
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const contest = this.nflsojModalContests.find(c => c.id === id)
        const contestTitle = contest?.title || `#${id}`
        this.nflsojImportStatus = `(${i + 1}/${ids.length}) ${contestTitle}`
        try {
          const url = `http://nflsoi.cc:20035/contest/${id}`
          const result = await this.importTasksFromUrl(url)
          totalAdded += result?.added || 0
        } catch (e) {
          console.warn(`[nflsoj modal] 比赛 ${id} 导入失败:`, e.message)
        }
      }
      this.isImportingNflsoj = false
      this.nflsojImportStatus = ''
      this.showToastMessage(`✅ 导入完成，共添加 ${totalAdded} 道题目`)
    },

    // ── Lyrio 比赛列表 ────────────────────────────────────────────────────────
    async openLyrioModal() {
      this.showLyrioModal = true
      if (!this.lyrioModalContests.length) {
        await this.loadLyrioContestPage(1)
      }
    },

    async loadLyrioContestPage(page) {
      this.isLoadingLyrioList = true
      try {
        const skipCount = (page - 1) * 50
        const data = await request(`/api/atcoder/contest?url=${encodeURIComponent('https://nflsoi.cc:10999/p')}&page=${page}`)
        this.lyrioModalContests = data.contests || []
        this.lyrioModalPage = page
      } catch (e) {
        this.showToastMessage(`加载 Lyrio 比赛列表失败: ${e.message}`)
      } finally {
        this.isLoadingLyrioList = false
      }
    },

    lyrioToggle(id, checked) {
      this.lyrioModalSelected = { ...this.lyrioModalSelected, [id]: checked }
    },

    lyrioSelectAll() {
      const sel = { ...this.lyrioModalSelected }
      this.lyrioFilteredContests.forEach(c => { sel[c.id] = true })
      this.lyrioModalSelected = sel
    },

    lyrioClearSelected() {
      this.lyrioModalSelected = {}
    },

    async importSelectedLyrioContests() {
      const ids = Object.entries(this.lyrioModalSelected)
        .filter(([, v]) => v)
        .map(([id]) => id)
      if (!ids.length) return
      this.isImportingLyrio = true
      let totalAdded = 0
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const contest = this.lyrioModalContests.find(c => c.id === id)
        const contestTitle = contest?.name || `#${id}`
        this.lyrioImportStatus = `(${i + 1}/${ids.length}) ${contestTitle}`
        try {
          const url = `https://nflsoi.cc:10999/contest/${id}`
          const result = await this.importTasksFromUrl(url)
          totalAdded += result?.added || 0
        } catch (e) {
          console.warn(`[lyrio modal] 比赛 ${id} 导入失败:`, e.message)
        }
      }
      this.isImportingLyrio = false
      this.lyrioImportStatus = ''
      this.showToastMessage(`✅ 导入完成，共添加 ${totalAdded} 道题目`)
    },

    // ── 核桃OJ 比赛列表 ───────────────────────────────────────────────────────
    async openHtojModal() {
      this.showHtojModal = true
      if (!this.htojModalContests.length) {
        await this.loadHtojContestPage(1)
      }
    },

    async loadHtojContestPage(page) {
      this.isLoadingHtojList = true
      try {
        const data = await request(`/api/atcoder/htoj-contest-list?page=${page}`)
        this.htojModalContests = data.contests || []
        this.htojModalPage = data.currentPage || page
        this.htojModalTotalPages = data.totalPages || 1
      } catch (e) {
        this.showToastMessage(`加载核桃OJ比赛列表失败: ${e.message}`)
      } finally {
        this.isLoadingHtojList = false
      }
    },

    htojToggle(id, checked) {
      this.htojModalSelected = { ...this.htojModalSelected, [id]: checked }
    },

    htojSelectAll() {
      const sel = { ...this.htojModalSelected }
      this.htojFilteredContests.forEach(c => { sel[c.id] = true })
      this.htojModalSelected = sel
    },

    htojClearSelected() {
      this.htojModalSelected = {}
    },

    async importSelectedHtojContests() {
      const ids = Object.entries(this.htojModalSelected)
        .filter(([, v]) => v)
        .map(([id]) => id)
      if (!ids.length) return
      this.isImportingHtoj = true
      let totalAdded = 0
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const contest = this.htojModalContests.find(c => c.id === id)
        const contestTitle = contest?.title || `#${id}`
        this.htojImportStatus = `(${i + 1}/${ids.length}) ${contestTitle}`
        try {
          const url = `https://htoj.com.cn/cpp/oj/contest/detail?cid=${id}`
          const result = await this.importTasksFromUrl(url)
          totalAdded += result?.added || 0
        } catch (e) {
          console.warn(`[htoj modal] 比赛 ${id} 导入失败:`, e.message)
        }
      }
      this.isImportingHtoj = false
      this.htojImportStatus = ''
      this.showToastMessage(`✅ 导入完成，共添加 ${totalAdded} 道题目`)
    },

    async autoSolveHtoj() {
      const taskIndex = this.currentTaskIndex
      const task = this.tasks[taskIndex]
      const url = task?.problemMeta?.sourceUrl || task?.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl || this.problemMeta?.fetchUrl || ''
      if (!/htoj\.com\.cn/i.test(url)) {
        this.showToastMessage('当前题目不是核桃OJ题目')
        return
      }
      
      this.isAutoSolving = true
      this.autoSolveAttempts = 0
      this.htojSubmitResult = ''
      let lastCode = ''
      let lastError = ''
      
      const token = localStorage.getItem('auth_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      while (this.autoSolveAttempts < this.autoSolveMaxAttempts) {
        this.autoSolveAttempts++
        this.htojSubmitResult = ''
        
        // Step 1: 生成代码
        if (this.autoSolveAttempts === 1) {
          // 首次：用正常流程生成
          this.generationStatus = `[自动解题 ${this.autoSolveAttempts}/${this.autoSolveMaxAttempts}] 正在生成代码...`
          if (!this.codeOutput?.trim()) {
            try {
              await this.generateCodeForAutoSolve(taskIndex)
            } catch (e) {
              this.generationStatus = '❌ 代码生成失败: ' + e.message
              break
            }
          }
        } else {
          // 重试：用错误反馈重新生成
          this.generationStatus = `[自动解题 ${this.autoSolveAttempts}/${this.autoSolveMaxAttempts}] 上次 ${lastError}，正在修复...`
          try {
            await this.regenerateWithFeedback(taskIndex, lastCode, lastError)
          } catch (e) {
            this.generationStatus = '❌ 修复生成失败: ' + e.message
            break
          }
        }
        
        // Step 2: 提取纯代码
        const taskAfterGen = this.tasks[taskIndex]
        let pureCode = taskAfterGen?.serverPureCode || this.serverPureCode || ''
        if (!pureCode.trim()) {
          pureCode = extractPureCode(taskAfterGen?.codeOutput || this.codeOutput || '')
        }
        if (!pureCode.trim()) {
          this.generationStatus = '❌ 无法提取有效代码'
          break
        }
        lastCode = pureCode
        
        // Step 3: 提交到 htoj
        this.isHtojSubmitting = true
        this.generationStatus = `[自动解题 ${this.autoSolveAttempts}/${this.autoSolveMaxAttempts}] 正在提交评测...`
        
        try {
          const lang = detectLanguage(pureCode) === 'python' ? 'Python' : 'C++'
          const resp = await fetch('/api/htoj/submit', {
            method: 'POST', headers,
            body: JSON.stringify({ url, code: pureCode, language: lang })
          })
          const data = await resp.json()
          
          if (data.ok) {
            const result = data.message || '已提交'
            this.htojSubmitResult = result
            lastError = result
            
            if (result.includes('Accepted') || result.includes('答案正确')) {
              if (this.autoGenerateDataAfterAC) {
                this.generationStatus = `✅ AC！正在生成数据...`
                try {
                  await this.generateDataForAutoSolve(taskIndex, pureCode)
                  this.generationStatus = `✅ AC + 数据生成完成！第 ${this.autoSolveAttempts} 次`
                } catch {
                  this.generationStatus = `✅ AC！数据生成失败，可手动重试`
                }
              } else {
                this.generationStatus = `✅ AC了！第 ${this.autoSolveAttempts} 次尝试成功`
              }
              this.showToastMessage(`🎉 AC！第 ${this.autoSolveAttempts} 次提交`)
              break
            } else {
              this.generationStatus = `[自动解题 ${this.autoSolveAttempts}/${this.autoSolveMaxAttempts}] ${result}，即将重试...`
            }
          } else {
            lastError = data.error || '提交失败'
            this.htojSubmitResult = '提交失败: ' + lastError
          }
        } catch (e) {
          lastError = '网络错误: ' + e.message
          this.htojSubmitResult = lastError
        } finally {
          this.isHtojSubmitting = false
        }
        
        // 不是 AC，短暂等待后重试
        if (this.autoSolveAttempts < this.autoSolveMaxAttempts && !(this.htojSubmitResult || '').includes('Accepted')) {
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      
      if (!(this.htojSubmitResult || '').includes('Accepted')) {
        this.generationStatus = `❌ ${this.autoSolveMaxAttempts} 次尝试未 AC，最终结果: ${this.htojSubmitResult || '未知'}`
      }
      this.isAutoSolving = false
    },

    // 为自动解题生成代码（简化版，跳过翻译元数据等）
    async generateCodeForAutoSolve(taskIndex) {
      const task = this.tasks[taskIndex]
      const problemText = task?.problemText || this.problemText
      if (!problemText.trim()) throw new Error('无题目描述')
      
      const model = this.getSolveDataModel(taskIndex)
      const resp = await request('/api/solution', {
        method: 'POST',
        body: JSON.stringify({ text: problemText, model, language: this.language })
      })
      if (resp?.result) {
        this.saveToTask(taskIndex, 'codeOutput', resp.result)
        if (resp.pureCode) this.saveToTask(taskIndex, 'serverPureCode', resp.pureCode)
      } else {
        throw new Error('AI 未返回代码')
      }
    },

    // 用错误反馈重新生成代码
    async regenerateWithFeedback(taskIndex, previousCode, errorResult) {
      const task = this.tasks[taskIndex]
      const problemText = task?.problemText || this.problemText
      if (!problemText.trim()) throw new Error('无题目描述')
      
      const model = this.getSolveDataModel(taskIndex)
      // 构造带反馈的 prompt
      const feedbackText = `[PREVIOUS SUBMISSION RESULT: ${errorResult}]
[YOUR PREVIOUS CODE THAT FAILED:]
\`\`\`${this.language.toLowerCase()}
${previousCode}
\`\`\`

Please analyze why the code failed (${errorResult}) and write a CORRECTED version. Pay attention to edge cases, data types, and algorithm correctness.

[ORIGINAL PROBLEM:]
${problemText}`
      
      const resp = await request('/api/solution', {
        method: 'POST',
        body: JSON.stringify({ text: feedbackText, model, language: this.language })
      })
      if (resp?.result) {
        this.saveToTask(taskIndex, 'codeOutput', resp.result)
        if (resp.pureCode) this.saveToTask(taskIndex, 'serverPureCode', resp.pureCode)
      } else {
        throw new Error('AI 未返回修复代码')
      }
    },

    // 自动解题后生成数据（简化版，不重复翻译）
    async generateDataForAutoSolve(taskIndex, pureCode) {
      const task = this.tasks[taskIndex]
      const problemText = task?.problemText || this.problemText
      const translationText = task?.translationText || ''
      const textForData = translationText.trim() || problemText
      if (!textForData.trim()) return
      
      const model = this.selectedModel
      const resp = await request('/api/generate-data', {
        method: 'POST',
        body: JSON.stringify({ text: textForData, model, code: pureCode || '' })
      })
      if (resp?.result) {
        this.saveToTask(taskIndex, 'dataOutput', resp.result)
      }
    },

    // 批量自动解题：遍历所有 htoj 任务
    async batchAutoSolveHtoj() {
      const htojTasks = []
      this.tasks.forEach((t, i) => {
        const url = t?.problemMeta?.sourceUrl || t?.problemMeta?.fetchUrl || ''
        if (/htoj\.com\.cn/i.test(url)) htojTasks.push(i)
      })
      if (!htojTasks.length) { this.showToastMessage('没有核桃OJ题目'); return }
      
      this.isAutoSolving = true
      const token = localStorage.getItem('auth_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      let acCount = 0
      for (let idx = 0; idx < htojTasks.length; idx++) {
        const ti = htojTasks[idx]
        this.switchTask(ti)
        await new Promise(r => setTimeout(r, 1000))
        const task = this.tasks[ti]
        const title = task?.problemMeta?.title || `题目 ${idx + 1}`
        const url = task?.problemMeta?.sourceUrl || task?.problemMeta?.fetchUrl || ''
        const problemText = task?.problemText || ''
        if (!problemText.trim()) { this.generationStatus = `[批量 ${idx + 1}/${htojTasks.length}] ${title} - 无描述，跳过`; continue }
        
        let ac = false; let lastCode = ''; let lastError = ''
        for (let a = 0; a < this.autoSolveMaxAttempts; a++) {
          this.autoSolveAttempts = a + 1; this.htojSubmitResult = ''
          try {
            if (a === 0) await this.generateCodeForAutoSolve(ti)
            else await this.regenerateWithFeedback(ti, lastCode, lastError)
          } catch { continue }
          
          let pc = this.tasks[ti]?.serverPureCode || ''
          if (!pc.trim()) pc = extractPureCode(this.tasks[ti]?.codeOutput || '')
          if (!pc.trim()) continue
          lastCode = pc
          
          try {
            const lang = detectLanguage(pc) === 'python' ? 'Python' : 'C++'
            const r = await (await fetch('/api/htoj/submit', { method: 'POST', headers, body: JSON.stringify({ url, code: pc, language: lang }) })).json()
            if (r.ok) {
              lastError = r.message || ''; this.htojSubmitResult = lastError
              if (lastError.includes('Accepted') || lastError.includes('答案正确')) { ac = true; acCount++; if (this.autoGenerateDataAfterAC) { try { await this.generateDataForAutoSolve(ti, pc) } catch {} } break }
            }
          } catch { lastError = '网络错误' }
          await new Promise(r => setTimeout(r, 2000))
        }
        this.generationStatus = `[批量 ${idx + 1}/${htojTasks.length}] ${title} ${ac ? '✅ AC' : '❌ ' + lastError}`
      }
      this.isAutoSolving = false
      this.generationStatus = `批量解题: ${acCount}/${htojTasks.length} AC`
      this.showToastMessage(`批量解题完成: ${acCount}/${htojTasks.length} AC`)
    },

    async submitToHtoj() {
      const taskIndex = this.currentTaskIndex
      const task = this.tasks[taskIndex]
      const url = task?.problemMeta?.sourceUrl || task?.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl || this.problemMeta?.fetchUrl || ''
      if (!/htoj\.com\.cn/i.test(url)) {
        this.showToastMessage('当前题目不是核桃OJ题目')
        return
      }
      
      // 获取纯代码
      let pureCode = task?.serverPureCode || this.serverPureCode || ''
      if (!pureCode.trim()) {
        const codeOutput = task?.codeOutput || this.codeOutput || ''
        pureCode = extractPureCode(codeOutput)
      }
      if (!pureCode.trim()) {
        this.showToastMessage('请先生成题解代码')
        return
      }
      
      this.isHtojSubmitting = true
      this.htojSubmitResult = ''
      this.generationStatus = '正在提交到核桃OJ...'
      
      try {
        const token = localStorage.getItem('auth_token')
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        
        const lang = detectLanguage(pureCode) === 'python' ? 'Python' : 'C++'
        
        const resp = await fetch('/api/htoj/submit', {
          method: 'POST',
          headers,
          body: JSON.stringify({ url, code: pureCode, language: lang })
        })
        const data = await resp.json()
        
        if (data.ok) {
          this.htojSubmitResult = data.message || '已提交'
          this.generationStatus = `✅ htoj 评测: ${data.message}`
        } else {
          this.htojSubmitResult = '提交失败'
          this.generationStatus = '❌ 提交失败: ' + (data.error || '未知错误')
          this.showToastMessage('提交失败: ' + (data.error || '未知错误'))
        }
      } catch (e) {
        this.htojSubmitResult = '网络错误'
        this.generationStatus = '❌ 网络错误: ' + e.message
        this.showToastMessage('提交失败: ' + e.message)
      } finally {
        this.isHtojSubmitting = false
      }
    },

    async generateCode() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      const targetIndex = this.currentTaskIndex
      const targetTaskId = this.tasks[targetIndex]?.id  // guard against clear+reimport races
      if (this.tasks[targetIndex]?.status === 'processing') {
        this.showToastMessage('该任务正在生成中，请等待完成')
        return
      }
      // await 前先快照所有响应式输入，防止用户切换任务后读到错误内容
      const taskSnap = this.tasks[targetIndex]
      const problemText = taskSnap?.problemText || this.problemText
      const manualCode = taskSnap?.manualCode || this.manualCode || ''
      const isExplainMode = !!manualCode.trim()
      const solutionModel = this.getSolveDataModel(targetIndex)
      
      this.isGenerating = 'code'
      this.generationStatus = '正在生成题解代码...'
      this.codeOutput = ''
      this.serverPureCode = ''
      this.activeTab = 'code'
      
      try {
        // 确保有翻译文本，保证后续的元数据基于译文；翻译失败不应阻断题解代码的生成
        if (!(this.tasks[targetIndex]?.translationText?.trim())) {
          this.generationStatus = '正在自动翻译题目...'
          try {
            await this.autoTranslate(targetIndex)
            this.generationStatus = '翻译完成，正在生成题解代码...'
          } catch (translateErr) {
            console.warn('Auto-translate failed (non-fatal):', translateErr.message)
            this.generationStatus = '翻译失败，继续生成题解代码...'
          }
        }
        
        const requests = []
        const solutionRequest = buildSolutionRequestConfig({
          problemText,
          manualCode,
          model: solutionModel,
          language: this.language,
        })

        requests.push(
          request(solutionRequest.endpoint, {
            method: 'POST',
            body: JSON.stringify(solutionRequest.payload)
          }).then(res => ({ type: 'code', data: res }))
        )
        
        // 2. 如果元数据尚未完整（翻译完成后通常已有），则请求生成元数据
        if (!this.hasValidMeta) {
           requests.push(
            request('/api/generate-problem-meta', {
              method: 'POST',
              body: JSON.stringify(buildMetaRequestPayload({
                task: this.tasks[targetIndex],
                fallbackText: problemText,
                model: this.getMetaReportModel(),
              }))
            }).then(res => ({ type: 'meta', data: res })).catch(e => ({ type: 'meta', data: null }))
           )
        }
        
        const responses = await Promise.all(requests)
        
        for (const res of responses) {
           if (!res || !res.data) continue
           if (res.type === 'code' && res.data.result) {
              this.saveToTask(targetIndex, 'codeOutput', res.data.result, targetTaskId)
              if (res.data.pureCode) this.saveToTask(targetIndex, 'serverPureCode', res.data.pureCode, targetTaskId)
           } else if (res.type === 'meta') {
              const existingMeta = this.tasks[targetIndex]?.problemMeta || {}
              this.saveToTask(targetIndex, 'problemMeta', mergeGeneratedMeta(existingMeta, res.data), targetTaskId)
           }
        }
        this.generationStatus = '✅ 题解代码生成完成'
        setTimeout(() => { if(this.generationStatus === '✅ 题解代码生成完成') this.generationStatus = '' }, 3000)
      } catch (error) {
        console.error('Generate code error:', error)
        this.generationStatus = '❌ 生成失败: ' + error.message
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateAll() {
      if (!this.problemText.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      if (this.tasks[this.currentTaskIndex]?.status === 'processing') {
        this.showToastMessage('当前任务正在生成中')
        return
      }
      
      const targetIndex = this.currentTaskIndex
      const targetTaskId = this.tasks[targetIndex]?.id  // capture task ID to guard against clear+reimport races
      // isCurrentTask() 用 ID 查找当前位置，支持删除后索引发生移位的场景
      const isCurrentTask = () => {
        const idx = this.tasks.findIndex(t => t.id === targetTaskId)
        return idx !== -1 && idx === this.currentTaskIndex
      }
      this._runningGenerateAllCount = (this._runningGenerateAllCount || 0) + 1
      this.isGenerating = 'all'
      
      // 初始化 UI——仅当生成的是当前视图任务时才清空显示区（允许并行生成其他任务）
      if (isCurrentTask()) {
        this.generationStatus = '正在初始化生成任务...'
        this.dataOutput = ''
        this.reportHtml = '' // 清空旧的解题报告
        this.showStepIndicators = true
      }
      
      // 更新当前任务状态为处理中
      if (this.tasks[targetIndex]) {
        this.tasks[targetIndex].status = 'processing'
      }
      
      // 重置本任务的步骤状态（per-task，不影响其他任务的步骤显示）
      this.tasks[targetIndex].generationSteps = createInitialGenerationSteps()
      const steps = this.tasks[targetIndex].generationSteps
      
      // 注意：这里不清空 translationText，因为如果已经有了就不需要重新生成
      // this.translationText = '' 
      
      // 检查 manualCode 是否存在
      const manualContent = this.manualCode.trim()
      const solutionModel = this.getSolveDataModel(targetIndex)
      
      if (isCurrentTask()) {
        this.codeOutput = ''
        this.serverPureCode = ''
        this.activeTab = 'code'
      }
      
      try {
        // 1. 准备翻译任务 (如果需要，并行执行)
        let translationPromise = Promise.resolve()
        if (!(this.tasks[targetIndex]?.translationText?.trim()) || this.isTranslationStale) {
          steps.translate = 'processing'
          translationPromise = this.autoTranslate(targetIndex).then(() => {
            steps.translate = 'success'
          }).catch(() => {
            steps.translate = 'failed'
          })
        } else {
          steps.translate = 'success' // 已经有翻译了
        }

        // 1b. 若尚无 CPRet 检索结果，与翻译/题解并行自动检索原题
        let cpretPromise = Promise.resolve()
        if (!this.tasks[targetIndex]?.cpretResults) {
          cpretPromise = this._fetchCpretResults(targetIndex).catch(() => null)
        }
        
        // 2. 并行生成题解 (不依赖翻译结果，使用原始内容)
        if (isCurrentTask()) this.generationStatus = '正在并行生成：翻译 + 题解代码...'
        steps.solution = 'processing'

        // 有 AC 代码时走 /api/solve（解读注释模式），否则走 /api/solution（自主生成模式）
        const solutionRequest = buildSolutionRequestConfig({
          problemText: this.problemText,
          manualCode: manualContent,
          model: solutionModel,
          language: this.language,
        })

        const solutionPromise = retryRequest(solutionRequest.endpoint, {
          method: 'POST',
          body: JSON.stringify(solutionRequest.payload)
        }, {
          maxRetries: 3,
          onRetry: (attempt, max, delay) => {
            if (isCurrentTask()) this.generationStatus = `⚠️ 题解生成失败，${delay / 1000}s 后重试 (${attempt}/${max})...`
          }
        }).then(res => {
          steps.solution = 'success'
          return res
        }).catch(err => {
          steps.solution = 'failed'
          throw err
        })
        
        // 等待题解完成 (这是后续步骤的核心依赖)
        const solutionRes = await solutionPromise
        
        // 处理题解结果
        if (solutionRes && solutionRes.result) {
            this.saveToTask(targetIndex, 'codeOutput', solutionRes.result, targetTaskId)
            if (solutionRes.pureCode) this.saveToTask(targetIndex, 'serverPureCode', solutionRes.pureCode, targetTaskId)
            
            // 在进行下一步之前，确保翻译已完成 (报告和元数据依赖翻译文本)
            if (this.isTranslating) {
                if (isCurrentTask()) this.generationStatus = '题解就绪，正在等待翻译完成...'
                await translationPromise
            }
        } else {
            // 解题代码为空（API 返回空结果），标记步骤失败
            steps.solution = 'failed'
            if (this.isTranslating) await translationPromise
        }

        // 等待 CPRet 检索完成（通常与翻译同步进行，已基本结束）
        await cpretPromise

        // 如果已有 CPRet 检索结果且相似度 ≥ 85%，将原题链接附加到翻译末尾，并更新 problemMeta.sourceUrl
        const topCpretResult = this.tasks[targetIndex]?.cpretResults?.[0]
        if (topCpretResult?.url && (topCpretResult.score ?? 0) >= 0.85) {
          const currentTranslation = this.tasks[targetIndex]?.translationText || ''
          if (currentTranslation && !currentTranslation.includes(topCpretResult.url)) {
            const scoreLabel = topCpretResult.score ? `，相似度 ${(topCpretResult.score * 100).toFixed(0)}%` : ''
            const appendLine = `\n\n---\n**原题参考**：[${topCpretResult.title}](${topCpretResult.url})（${topCpretResult.source}${scoreLabel}）`
            this.saveToTask(targetIndex, 'translationText', currentTranslation.trimEnd() + appendLine, targetTaskId)
          }
          if (!this.tasks[targetIndex]?.problemMeta?.sourceUrl) {
            const existingMeta = this.tasks[targetIndex]?.problemMeta || {}
            this.saveToTask(targetIndex, 'problemMeta', { ...existingMeta, sourceUrl: topCpretResult.url }, targetTaskId)
          }
        }

        // 3. 准备并行请求：报告 + 数据生成 + 元数据生成
        if (isCurrentTask()) this.generationStatus = '正在并行生成：解题报告 + 数据脚本 + 元数据...'
        let parallelRequests = []

        // 3a. 解题报告
        // 当 targetIndex === currentTaskIndex 时，tasks[targetIndex].codeOutput 可能因 Vue watcher
        // 异步刷新而仍为空（saveToTask 走的是 this.codeOutput = val → watcher → tasks[i].codeOutput = val）。
        // 对当前任务使用响应式 this.codeOutput；对后台任务直接读 tasks[targetIndex].codeOutput。
        const codeForReport = targetIndex === this.currentTaskIndex ? this.codeOutput : this.tasks[targetIndex]?.codeOutput
        const shouldGenerateReport = (!this.isBatchMode || this.batchMode !== 'code_data') && codeForReport
        
        if (shouldGenerateReport) {
            steps.report = 'processing'
            // 并行执行报告生成
            parallelRequests.push(
                this.generateReportInline(targetIndex).then(() => {
                    steps.report = 'success'
                }).catch(() => {
                    steps.report = 'failed'
                })
            )
        } else {
            steps.report = 'skipped' // 当前模式不生成报告
        }
        
        // 3a. 数据生成 - 从 tasks[targetIndex] 读取代码，防止任务切换竞态
        const dataInputs = resolveDataGenerationInput({
          taskSnapshot: {
            ...this.tasks[targetIndex],
            manualCode: manualContent || this.tasks[targetIndex]?.manualCode || '',
          },
          extractPureCode: (content) => this.extractPureCode(content),
        })
        const textForDataAll = dataInputs.text
        
        steps.data = 'processing'
        parallelRequests.push(
          retryRequest('/api/generate-data', {
            method: 'POST',
            body: JSON.stringify({
              text: textForDataAll,
              model: this.selectedModel,
              code: dataInputs.code
            })
          }, {
            maxRetries: 3,
            onRetry: (attempt, max, delay) => {
              if (isCurrentTask()) this.generationStatus = `⚠️ 数据脚本生成失败，${delay / 1000}s 后重试 (${attempt}/${max})...`
            }
          }).then(res => {
              steps.data = 'success'
              // 立即更新数据脚本显示
              if (res && res.result) {
                  this.saveToTask(targetIndex, 'dataOutput', this.cleanDataOutput(res.result), targetTaskId)
              }
              return { type: 'data', data: res }
          }).catch(() => {
              steps.data = 'failed'
              return { type: 'data', error: true }
          })
        )
        
        // 3b. 元数据生成
        // 翻译完成后 problemMeta 通常已有 tags，此时跳过；仅在缺失时补充
        // 使用目标任务自己的 meta 判断，而非 this.hasValidMeta（后者读当前视图任务的 problemMeta）
        const shouldGenerateMeta = !hasValidTaskMeta(this.tasks[targetIndex])
        if (shouldGenerateMeta) {
            steps.meta = 'processing'
            // solution 同 shouldGenerateReport 处理：当前任务走 this.codeOutput，后台任务走 tasks[].codeOutput
            const codeForMeta = targetIndex === this.currentTaskIndex ? this.codeOutput : this.tasks[targetIndex]?.codeOutput
            parallelRequests.push(
              retryRequest('/api/generate-problem-meta', {
                method: 'POST',
                body: JSON.stringify(buildMetaRequestPayload({
                  task: this.tasks[targetIndex],
                  fallbackText: this.tasks[targetIndex]?.problemText || '',
                  solution: codeForMeta,
                  model: this.getMetaReportModel(),
                }))
              }, { maxRetries: 2 }).then(res => {
                  steps.meta = 'success'
                  // 立即更新元数据
                  if (res) {
                      try {
                          const meta = res
                          const existingMeta = this.tasks[targetIndex]?.problemMeta || {}
                          this.saveToTask(targetIndex, 'problemMeta', mergeGeneratedMeta(existingMeta, meta), targetTaskId)
                      } catch (e) { console.error('Meta update error', e) }
                  }
                  return { type: 'meta', data: res }
              }).catch(() => {
                  steps.meta = 'failed'
                  return { type: 'meta', error: true }
              })
            )
        } else {
            steps.meta = 'success' // 不需要生成
        }
        
        // 等待所有并行任务完成
        const results = await Promise.all(parallelRequests)
        
        // 处理结果
        for (const res of results) {
            if (!res) continue // 报告生成没有返回值，已经在内部处理了
            if (typeof res !== 'object') continue
            
            if (res.type === 'data') {
                if (res.data && res.data.result) {
                    this.saveToTask(targetIndex, 'dataOutput', this.cleanDataOutput(res.data.result), targetTaskId)
                }
            } else if (res.type === 'meta') {
                if (res.data) {
                    try {
                        const meta = res.data
                        const existingMeta = this.tasks[targetIndex]?.problemMeta || {}
                    this.saveToTask(targetIndex, 'problemMeta', mergeGeneratedMeta(existingMeta, meta), targetTaskId)
                    } catch (e) {
                        console.error('解析元数据失败', e)
                    }
                }
            }
        }
        
        const solutionOk = steps.solution === 'success'
        if (isCurrentTask()) this.generationStatus = solutionOk ? '全部生成完成！' : '⚠️ 解题代码未生成，其余步骤已完成'
        if (solutionOk) this.showToastMessage('一键生成全部完成')
        else this.showToastMessage('⚠️ 解题代码生成失败，请重试')
        // 通过 ID 找到任务当前位置，更新状态（防止删除后索引错位）
        const doneIdx = this.tasks.findIndex(t => t.id === targetTaskId)
        if (doneIdx !== -1) this.tasks[doneIdx].status = solutionOk ? 'completed' : 'failed'
        return true
        
      } catch (error) {
        console.error('Generate all failed:', error)
        if (isCurrentTask()) this.generationStatus = '❌ 生成出错: ' + error.message
        this.showToastMessage('一键生成失败: ' + error.message)
        const failIdx = this.tasks.findIndex(t => t.id === targetTaskId)
        if (failIdx !== -1) this.tasks[failIdx].status = 'failed'
        return false
      } finally {
        this._runningGenerateAllCount = Math.max(0, (this._runningGenerateAllCount || 0) - 1)
        if (this._runningGenerateAllCount === 0) {
          this.isGenerating = false
        }
      }
    },
    
    async generateData() {
      // すべての入力を await より前に tasks[] から確定する（タスク切り替え競合防止）
      const targetIndex = this.currentTaskIndex
      const targetTaskId = this.tasks[targetIndex]?.id  // guard against clear+reimport races
      const taskSnapshot = this.tasks[targetIndex]
      const dataInputs = resolveDataGenerationInput({
        taskSnapshot,
        extractPureCode: (content) => this.extractPureCode(content),
      })
      const textForData = dataInputs.text

      if (!textForData.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }

      this.isGenerating = 'data'
      this.generationStatus = '正在生成数据脚本...'
      this.dataOutput = ''
      this.activeTab = 'data'

      try {
        // 确保有翻译文本，保证元数据基于译文
        if (!(this.tasks[targetIndex]?.translationText?.trim())) {
          this.generationStatus = '正在自动翻译题目...'
          await this.autoTranslate(targetIndex)
          this.generationStatus = '翻译完成，正在生成数据脚本...'
        }

        let requests = []

        // 1. 生成数据脚本
        requests.push(
          request('/api/generate-data', {
            method: 'POST',
            body: JSON.stringify({
              text: textForData,
              model: this.selectedModel,
              code: dataInputs.code
            })
          }).then(res => ({ type: 'data', data: res }))
        )
        
        // 2. 如果元数据尚未完整（翻译完成后通常已有），则请求生成元数据
        if (!this.hasValidMeta) {
           requests.push(
            request('/api/generate-problem-meta', {
              method: 'POST',
              body: JSON.stringify(buildMetaRequestPayload({
                task: this.tasks[targetIndex],
                fallbackText: textForData,
                solution: this.tasks[targetIndex]?.codeOutput,
                model: this.getMetaReportModel(),
              }))
            }).then(res => ({ type: 'meta', data: res })).catch(e => ({ type: 'meta', data: null }))
           )
        }
        
        const responses = await Promise.all(requests)
        
        for (const res of responses) {
           if (!res || !res.data) continue
           if (res.type === 'data' && res.data.result) {
              this.saveToTask(targetIndex, 'dataOutput', this.cleanDataOutput(res.data.result), targetTaskId)
           } else if (res.type === 'meta') {
              const existingMeta = this.tasks[targetIndex]?.problemMeta || {}
              this.saveToTask(targetIndex, 'problemMeta', mergeGeneratedMeta(existingMeta, res.data), targetTaskId)
           }
        }
        this.generationStatus = '✅ 数据脚本生成完成'
        setTimeout(() => { if(this.generationStatus === '✅ 数据脚本生成完成') this.generationStatus = '' }, 3000)
      } catch (error) {
        console.error('Generate data error:', error)
        this.generationStatus = '❌ 生成失败: ' + error.message
        this.showToastMessage('生成失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },

    async generateTitle() {
      const targetIndex = this.currentTaskIndex
      const taskSnap = this.tasks[targetIndex]
      const targetTaskId = taskSnap?.id
      if (!(taskSnap?.problemText?.trim())) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGeneratingTitle = true
      this.generationStatus = '正在生成标题...'
      try {
        // 优先方案：直接调用翻译接口，翻译结果自带 title 和 tags
        // 这样即使原题是日文/英文也能正确处理
        await this.autoTranslate(targetIndex)
        // autoTranslate 内部已将 ev.meta.title/tags 写入 tasks[targetIndex].problemMeta
        const metaAfterTranslate = this.tasks[targetIndex]?.problemMeta
        if (hasResolvedMetaTitle(metaAfterTranslate)) {
          this.showToastMessage('✅ 标题已更新: ' + metaAfterTranslate.title)
          this.generationStatus = ''
          return
        }
        
        // 备选：翻译没有返回标题时，再调用 generate-problem-meta
        const latestSnap = this.tasks[targetIndex]
        const textToUse = (latestSnap?.translationText?.trim())
          ? latestSnap.translationText
          : (latestSnap?.problemText || taskSnap.problemText)
          
        const res = await request('/api/generate-problem-meta', {
          method: 'POST',
          body: JSON.stringify({
            text: textToUse,
            solution: latestSnap?.codeOutput || '',
            model: this.getMetaReportModel()
          })
        })
        
        if (res && res.title && res.title.trim()) {
          const existingMeta = this.tasks[targetIndex]?.problemMeta || {}
          this.saveToTask(targetIndex, 'problemMeta', mergeGeneratedMeta(existingMeta, res), targetTaskId)
          this.showToastMessage('✅ 标题已更新: ' + res.title)
        } else {
          console.warn('[generateTitle] AI 未返回标题，原始内容:', res?.rawContent)
          this.showToastMessage('❌ 未能生成有效标题，请确认题目描述是否充分')
        }
      } catch (e) {
        console.error('Generate title error:', e)
        this.showToastMessage('生成标题失败: ' + e.message)
      } finally {
        this.isGeneratingTitle = false
        if (this.generationStatus === '正在生成标题...') this.generationStatus = ''
      }
    },
    
    copyCode() {
      // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
      const textToCopy = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showToastMessage('✅ 已复制全部内容到剪贴板')
      })
    },
    
    copyPureCode() {
      // 统一使用 pureAcCode 计算属性，它已包含完整的多优先级提取逻辑
      // （AC_CODE_START 标记 → AC_CODE 标记 → 节标题 → 最后代码块）
      const code = this.pureAcCode
      if (!code) {
        this.showToastMessage('⚠️ 未找到可提取的代码')
        return
      }
      navigator.clipboard.writeText(code).then(() => {
        this.showToastMessage('✅ 已复制纯代码到剪贴板')
      })
    },
    
    copyDataCode() {
      // 提取数据脚本中的纯 Python 代码
      if (!this.dataOutput) return
      
      const codeBlockRegex = /```(?:python|py)?\s*\n([\s\S]*?)```/g
      const matches = [...this.dataOutput.matchAll(codeBlockRegex)]
      
      if (matches.length > 0) {
        // 提取第一个 Python 代码块
        let pureCode = matches[0][1].trim()
        
        // 删除可能的语言标识符首行
        const firstLine = pureCode.split('\n')[0].trim()
        if (/^(python|py)$/i.test(firstLine)) {
          pureCode = pureCode.split('\n').slice(1).join('\n').trim()
        }
        
        navigator.clipboard.writeText(pureCode).then(() => {
          this.showToastMessage('✅ 已复制 Python 代码到剪贴板')
        })
      } else {
        // 没有代码块标记，复制全部内容
        navigator.clipboard.writeText(this.dataOutput).then(() => {
          this.showToastMessage('✅ 已复制数据脚本到剪贴板')
        })
      }
    },
    
    copyData() {
      navigator.clipboard.writeText(this.dataOutput).then(() => {
        this.showToastMessage('✅ 已复制到剪贴板')
      })
    },
    
    saveCode() {
      const extension = this.language === 'C++' ? 'cpp' : this.language === 'Python' ? 'py' : 'java'
      const contentToSave = this.getBestCodeContent(this.codeOutput, this.manualCode)
      const blob = new Blob([contentToSave], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solution.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    },
    
    saveData() {
      const blob = new Blob([this.dataOutput], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'data_generator.py'
      a.click()
      URL.revokeObjectURL(url)
    },
    
    clearAll() {
      this.problemText = ''
      this.codeOutput = ''
      this.serverPureCode = ''
      this.dataOutput = ''
      this.editorialText = ''
      this.manualCode = ''
      this.referenceText = ''
      this.problemMeta = null
      this.translationText = ''
      this.isTranslationStale = false
      this.reportHtml = ''
    },

    // targetIndex: 可选，指定写入哪个任务（从 generateAll 调用时传入，防止任务切换竞态）
    async generateReportInline(targetIndex = null) {
      const taskIdx = (targetIndex !== null && targetIndex !== undefined) ? targetIndex : this.currentTaskIndex
      const taskSnap = this.tasks[taskIdx]
      const expectedTaskId = taskSnap?.id  // guard against index shift when tasks are added/removed
      const isCurrentTask = () => this.currentTaskIndex === taskIdx

      if (!taskSnap?.problemText?.trim()) {
        this.showToastMessage('请先输入题目描述')
        return
      }
      
      this.isGeneratingReport = true
      if (isCurrentTask()) this.generationStatus = '正在生成解题报告...'
      if (isCurrentTask()) this.activeTab = 'report'
      
      try {
        // 从 tasks[taskIdx] 读取，避免任务切换后读到错误内容
        let codeContent = (taskSnap.codeOutput?.trim()) ? taskSnap.codeOutput : (taskSnap.manualCode || '')
        
        // 如果没有代码内容，先自动生成题解
        if (!codeContent) {
            this.showToastMessage('正在自动生成题解思路...')
            if (isCurrentTask()) this.generationStatus = '正在自动生成题解思路...'
            try {
            const promptText = buildReportAutoSolutionPrompt(taskSnap)
            const solutionRequest = buildSolutionRequestConfig({
              problemText: promptText,
              manualCode: '',
              model: this.selectedModel,
              language: this.language
            })

            const solutionRes = await request(solutionRequest.endpoint, {
                    method: 'POST',
              body: JSON.stringify(solutionRequest.payload)
                })
                if (solutionRes && solutionRes.result) {
                    this.saveToTask(taskIdx, 'codeOutput', solutionRes.result, expectedTaskId)
                    if (solutionRes.pureCode) this.saveToTask(taskIdx, 'serverPureCode', solutionRes.pureCode, expectedTaskId)
                    codeContent = solutionRes.result
                }
            } catch (err) {
                console.error('Auto generate solution failed:', err)
                this.showToastMessage('自动生成题解失败，尝试直接生成报告...')
            }
        }

        // 优先使用服务端已提取的纯净代码，其次 extractPureCode()
        // 重新读 tasks[taskIdx] 获取可能刚写入的 serverPureCode
        const latestSnap = this.tasks[taskIdx]
        const reportPayload = buildSolutionReportPayload({
          task: {
            ...latestSnap,
            problemText: latestSnap?.problemText || taskSnap.problemText,
            codeOutput: codeContent,
          },
          extractPureCode: (content) => this.extractPureCode(content),
          model: this.getMetaReportModel(),
          language: this.language,
          codeFallbackMessage: '用户未提供代码，请根据题目描述生成标准 AC 代码（C++），并添加详细中文注释。',
        })

        if (isCurrentTask()) this.generationStatus = '正在渲染解题报告...'
        const res = await retryRequest('/api/solution-report', {
          method: 'POST',
          body: JSON.stringify(reportPayload)
        }, {
          maxRetries: 3,
          onRetry: (attempt, max, delay) => {
            if (isCurrentTask()) this.generationStatus = `⚠️ 报告生成失败，${delay / 1000}s 后重试 (${attempt}/${max})...`
          }
        })
        
        if (res.html) {
          this.saveToTask(taskIdx, 'reportHtml', res.html, expectedTaskId)
          this.showToastMessage('✅ 解题报告生成成功')
          if (isCurrentTask()) this.generationStatus = '✅ 解题报告生成成功'
          if (isCurrentTask()) setTimeout(() => { if(this.generationStatus === '✅ 解题报告生成成功') this.generationStatus = '' }, 3000)
        }
      } catch (e) {
        console.error('Generate report error:', e)
        if (isCurrentTask()) this.generationStatus = '❌ 生成报告失败: ' + e.message
        this.showToastMessage('生成报告失败: ' + e.message)
        throw e
      } finally {
        this.isGeneratingReport = false
        if (!this.isGenerating && !this.isTranslating && !this.isGeneratingTitle) {
             setTimeout(() => { 
                 if(this.generationStatus === '✅ 解题报告生成成功') this.generationStatus = '' 
             }, 3000)
        }
      }
    },

    openReportNewWindow() {
      if (!this.reportHtml) return
      const blob = new Blob([this.reportHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    },

    downloadReport() {
      if (!this.reportHtml) return
      const blob = new Blob([this.reportHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'solution_report.html'
      a.click()
      URL.revokeObjectURL(url)
    },

    // 左侧按钮点击动作：切换到报告 Tab，如果没有报告则自动生成
    goToReport() {
      this.activeTab = 'report'
      // 如果当前没有报告内容，且没有正在生成，则自动触发生成
      if (!this.reportHtml && !this.isGeneratingReport) {
        this.generateReportInline()
      }
      
      // 移动端或窄屏下自动滚动到输出区域
      if (window.innerWidth < 768) {
        const outputPanel = this.$el.querySelector('.output-panel')
        if (outputPanel) outputPanel.scrollIntoView({ behavior: 'smooth' })
      }
    },

    getAdditionalFileTitle(additionalFile) {
      if (!additionalFile) return ''
      if (additionalFile.base64) return '点击下载 ' + additionalFile.filename
      if (additionalFile.skippedBinary && additionalFile.sourceUrl) return '附件较大，点击从原站直接下载'
      if (!(Number(additionalFile.size) > 0) && additionalFile.sourceUrl) return '未获取到附件大小，点击打开原始附件链接'
      if (additionalFile.sourceUrl) return '当前未缓存二进制，点击打开原始附件链接'
      return '附件（本次会话后需重新获取）'
    },

    formatAdditionalFileSize(additionalFile) {
      const size = Number(additionalFile?.size || 0)
      if (size > 0) return `${Math.round(size / 1024)} KB`
      if (additionalFile?.base64) return '已缓存'
      return '大小未知'
    },

    async openAdditionalFile() {
      const af = this.tasks[this.currentTaskIndex]?.additionalFile
      if (!af) return
      if (af.base64) {
        await this.downloadSampleZip()
        return
      }
      if (af.sourceUrl) {
        window.open(af.sourceUrl, '_blank', 'noopener')
      }
    },
    
    async downloadSampleZip(taskIndex = this.currentTaskIndex) {
      const af = this.tasks[taskIndex]?.additionalFile
      if (!af?.base64) return
      const binaryStr = atob(af.base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = af.filename
      a.click()
      URL.revokeObjectURL(url)
    },

    async runAndDownload() {
      // 优先使用 codeOutput (AI 生成的优化代码)，其次使用 manualCode
      const hasCode = (this.codeOutput && this.codeOutput.trim()) ? this.codeOutput : this.manualCode
      
      if (!hasCode || !this.dataOutput) {
        this.showToastMessage('请先生成代码和数据脚本')
        return
      }
      
      this.isGenerating = 'run'
      
      try {
        // 1. 提取标准程序代码
        const bestCodeContent = this.getBestCodeContent(this.codeOutput, this.manualCode)
        
        // 尝试提取纯代码
        let stdCode = this.extractPureCode(bestCodeContent)
        if (!stdCode && bestCodeContent) stdCode = bestCodeContent
        
        // 2. 提取并处理数据脚本
        // 使用当前选择的语言作为目标语言
        const lang = this.language === 'C++' ? 'C++' : (this.language === 'Python' ? 'Python' : 'Java')
        const dataScript = this.processDataScript(this.dataOutput, lang)
        
        if (!stdCode || !dataScript) {
          let errorMsg = '无法提取代码或脚本：\n'
          if (!stdCode) errorMsg += '- 未找到有效的 AC 代码块\n'
          if (!dataScript) errorMsg += '- 未找到有效的 Python 脚本块\n'
          console.error('提取失败:', errorMsg)
          this.showToastMessage(errorMsg)
          return
        }
        
        const JSZip = await loadJsZip()
        const zip = new JSZip()
        // 修正 ZIP 文件时间戳为东八区 (UTC+8)
        const now = new Date()
        const beijingString = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
        const targetTime = new Date(beijingString)
        const zipOptions = { date: targetTime }
        
        const extension = this.language === 'C++' ? 'cpp' : this.language === 'Python' ? 'py' : 'java'
        const stdFileName = this.language === 'Java' ? 'Main.java' : `std.${extension}`
        zip.file(stdFileName, stdCode, zipOptions)
        
        zip.file('data_generator.py', dataScript, zipOptions)
        
        // 将 codeOutput 一并打包：作为 Markdown 保存
        try {
          if (this.codeOutput && this.codeOutput.toString().trim()) {
            zip.file('solution.md', this.codeOutput, zipOptions)
          }
        } catch (e) {
          console.warn('打包 codeOutput 时出错:', e)
        }

        const readme = this.generateReadme()
        zip.file('README.md', readme, zipOptions)
        
        // 生成 Python 运行脚本（跨平台）
        const runScript = this.generateRunScript(this.language)
        zip.file('run.py', runScript, zipOptions)
        
        // 生成 Windows 批处理启动脚本
        const batScript = this.generateBatScript(this.language)
        zip.file('run.bat', batScript, zipOptions)
        
        // 生成 problem.yaml 文件
        const yamlContent = this.generateProblemYaml()
        zip.file('problem.yaml', yamlContent, zipOptions)

        // 如果有翻译内容则一并打包
        const curTaskForSample = this.tasks[this.currentTaskIndex]
        const hasSampleZip = !!(curTaskForSample?.additionalFile?.base64)
        const sampleSuffix = hasSampleZip ? '\n\n[sample](file://sample.zip)' : ''
        // 时限/内存信息头（写入 problem 系列 md）
        const tlSingle = this.problemMeta?.timeLimit
        const mlSingle = this.problemMeta?.memoryLimit
        const limitPrefixSingle = (tlSingle || mlSingle)
          ? `**时间限制：${tlSingle ?? '-'}ms　内存限制：${mlSingle ?? '-'}MB**\n\n`
          : ''
        if (this.problemText && this.problemText.trim()) {
          zip.file('problem_zh_TW.md', limitPrefixSingle + this.problemText + sampleSuffix, zipOptions)
        }
        if (this.translationText && this.translationText.trim()) {
          zip.file('problem_zh.md', limitPrefixSingle + this.applyTitleToTranslation(this.translationText, this.problemMeta?.title) + sampleSuffix, zipOptions)
        } else if (this.problemText && this.problemText.trim()) {
          zip.file('problem_zh.md', limitPrefixSingle + this.problemText + sampleSuffix, zipOptions)
        }
        if (this.translationEnglish && this.translationEnglish.trim()) {
          const problemSourceUrl = this.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl
          const enContent = problemSourceUrl
            ? `原题链接：${problemSourceUrl}\n\n${this.translationEnglish}`
            : this.translationEnglish
          zip.file('problem_en.md', enContent + sampleSuffix, zipOptions)
        }

        // 智能获取标题
        const problemTitle = this.getSmartTitle(this.problemMeta, this.translationText || this.problemText, 'problem')

        // 如果有解题报告，打包进去
        if (this.reportHtml) {
            zip.file(`${problemTitle}.html`, this.reportHtml, zipOptions)
        }

        // 附加文件（如 NFLSOJ sample.zip），放入 additional_file/ 子目录
        const curTask = this.tasks[this.currentTaskIndex]
        if (curTask?.additionalFile?.base64) {
          try {
            const binaryStr = atob(curTask.additionalFile.base64)
            const bytes = new Uint8Array(binaryStr.length)
            for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j)
            zip.file('additional_file/sample.zip', bytes, zipOptions)
          } catch (e) {
            console.warn('附加文件添加出错:', e)
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' })
        const zipName = `${problemTitle}.zip`
        this.downloadBlob(blob, zipName)
        this.sendPackageEmail(blob, zipName, `SolveData 项目包: ${problemTitle}`, '', this.problemMeta?.fetchUrl || this.problemMeta?.sourceUrl || '')
        
        this.toastMessage = '✅ 项目包已下载！<br>解压后双击 run.bat 或运行: python run.py';
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 2500);
        
      } catch (error) {
        console.error('Package error:', error)
        this.showToastMessage('❌ 打包失败: ' + error.message)
      } finally {
        this.isGenerating = false
      }
    },
    
    generateRunScript(targetLang = null) {
      return generateRunScript(targetLang || this.language)
    },

    generateBatScript() {
      return generateBatScript()
    },

    generateReadme() {
      return generateReadme(this.language)
    },

    generateProblemYaml(meta = null, pText = '', tText = '') {
      return generateProblemYaml(
        meta || this.problemMeta,
        pText || this.problemText,
        tText || this.translationText
      )
    }
  }
}
</script>

<style scoped>
/* 
   SolveData  AtCoder-style layout
   Primary #4f46e5  BG #f5f7fa  Border #e5e7eb
    */

.solve-data-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  font-size: 14px;
  background: #f5f7fa;
}

/*  Top bar  */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.top-bar h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1a1a2e; }
.top-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.top-controls label { font-size: 13px; color: #6b7280; font-weight: 500; }
.top-controls select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  color: #374151;
  outline: none;
  cursor: pointer;
}
.top-controls select:focus { border-color: #4f46e5; }
.translation-model-config {
  position: relative;
}
.translation-model-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.translation-model-popover label {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}
.translation-model-popover p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

/*  URL bar  */
.url-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.url-input {
  flex: 1;
  padding: 7px 14px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
  background: #fafaff;
  transition: border-color .2s;
}
.url-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.1); }
.btn-fetch-top {
  border-radius: 20px !important;
  padding: 7px 18px !important;
}
.url-hint { font-size: 12px; }
.url-error { color: #ef4444; }
.url-progress { color: #4f46e5; }

/*  Task info bar  */
.task-info-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.task-count-label { font-size: 12px; color: #6b7280; font-weight: 500; }
.task-bulk-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.mode-label { font-size: 12px; color: #6b7280; }
.mode-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  outline: none;
}

/*  Main layout  */
.main-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  padding: 12px;
  gap: 10px;
}

/*  Task list panel  */
.task-list-panel {
  width: 260px;
  min-width: 220px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}
.task-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: white;
  flex-shrink: 0;
}
.task-list-header .btn-icon {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
}
.task-list-header .btn-icon:hover {
  background: rgba(255,255,255,0.28);
}
.btn-icon {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #4b5563;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 7px;
  border-radius: 5px;
  transition: background .15s;
  line-height: 1.5;
}
.btn-icon:hover { background: #e5e7eb; }

.task-list { flex: 1; overflow-y: auto; }
.task-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background .1s;
}
.task-item:hover { background: #f9fafb; }
.task-item.active { background: #eef2ff; border-left: 3px solid #4f46e5; padding-left: 7px; }

.task-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.task-status-dot.pending    { background: #d1d5db; }
.task-status-dot.processing { background: #f59e0b; animation: pulse 1.5s infinite; }
.task-status-dot.completed  { background: #10b981; }
.task-status-dot.failed     { background: #ef4444; }

.task-info { flex: 1; min-width: 0; }
.task-title {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #374151;
}
.task-item.active .task-title { color: #4f46e5; }
.task-meta { font-size: 10px; color: #9ca3af; margin-top: 1px; }

.step-dots { display: flex; gap: 3px; flex-shrink: 0; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #e5e7eb; }
.dot.done { background: #10b981; }

.btn-icon-small {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity .15s;
  flex-shrink: 0;
}
.task-item:hover .btn-icon-small { opacity: 1; }
.btn-icon-small:hover { color: #ef4444; }

/*  Detail panel  */
.detail-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafaff;
  flex-shrink: 0;
}
.detail-title-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}
.meta-title-input {
  flex: 1;
  min-width: 180px;
  padding: 5px 10px;
  border: 1.5px solid #e5e7eb;
  border-radius: 7px;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  background: #fff;
  transition: border-color .2s;
}
.meta-title-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.1); }
.detail-title-placeholder { color: #9ca3af; font-style: italic; font-size: 14px; }
.meta-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.meta-tag {
  background: #eef2ff;
  color: #4f46e5;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.sample-zip-badge {
  display: inline-flex;
  align-items: center;
  background: #fff7e6;
  color: #ad6800;
  border: 1px solid #ffd591;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: default;
}
.sample-zip-badge.has-base64 {
  cursor: pointer;
}
.sample-zip-badge.has-base64:hover {
  background: #ffe7ba;
  border-color: #ffa940;
}
.problem-limit-badge {
  display: inline-flex;
  align-items: center;
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.source-url-badge {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
  text-decoration: none;
  cursor: pointer;
}
.source-url-badge:hover {
  background: #dcfce7;
}
.detail-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

/* Generation status bar */
.generation-status-bar {
  padding: 7px 14px;
  background: #e6f7ff;
  border-bottom: 1px solid #91d5ff;
  color: #0050b3;
  font-size: 13px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.status-text { display: flex; align-items: center; gap: 6px; }
.generation-steps {
  display: flex;
  gap: 12px;
  padding-top: 3px;
  border-top: 1px solid rgba(145,213,255,.3);
}
.step-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
  opacity: .7;
  transition: all .3s;
}
.step-item .step-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all .3s;
}
.step-item.processing { opacity: 1; font-weight: 600; color: #f59e0b; }
.step-item.processing .step-dot { background: #f59e0b; animation: pulse 1.5s infinite; }
.step-item.success { opacity: 1; color: #10b981; }
.step-item.success .step-dot { background: #10b981; }
.step-item.failed { opacity: 1; color: #ef4444; }
.step-item.failed .step-dot { background: #ef4444; }
.step-item.skipped { opacity: .38; color: #9ca3af; text-decoration: line-through; }
.step-item.skipped .step-dot { background: #d1d5db; }

/*  Step tabs  */
.step-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.step-tab {
  padding: 5px 13px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  transition: all .15s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}
.step-tab:hover:not(.active) { background: #f3f4f6; }
.step-tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; font-weight: 600; }
.tab-done { font-size: 10px; color: #10b981; }
.step-tab.active .tab-done { color: #a5f3d0; }

/*  Step content  */
.step-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-action-bar {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafaff;
  flex-shrink: 0;
}

.content-textarea {
  flex: 1;
  width: 100%;
  padding: 12px 14px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}
.content-textarea:focus { background: #fafeff; }

.cpret-results-bar {
  flex-shrink: 0;
  max-height: 148px;
  overflow-y: auto;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fbff;
  padding: 4px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cpret-result-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
}
.cpret-score {
  font-size: 11px;
  color: #6b7280;
  min-width: 30px;
  text-align: right;
  flex-shrink: 0;
}
.cpret-result-title {
  flex: 1;
  color: #2563eb;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cpret-result-title:hover { text-decoration: underline; }
.cpret-source {
  font-size: 11px;
  color: #9ca3af;
  min-width: 56px;
  flex-shrink: 0;
}
.cpret-count-hint { font-size: 12px; color: #6b7280; }

.reference-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  gap: 4px;
  overflow-y: auto;
}
.ref-section-label {
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  text-transform: uppercase;
  letter-spacing: .05em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ref-textarea { height: 1000px; flex: 0 0 auto; border: 1px solid #e5e7eb; border-radius: 6px; }

.scroll-content { flex: 1; overflow-y: auto; padding: 10px 14px; }

.translation-dual-pane { flex: 1; display: flex; flex-direction: row; gap: 0; overflow: hidden; }
.translation-pane { display: flex; flex-direction: column; flex: 1; min-width: 0; border-right: 1px solid #e5e7eb; }
.translation-pane:last-child { border-right: none; }
.translation-pane-header { padding: 4px 14px; font-size: 12px; font-weight: 600; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
.translation-pane .scroll-content { flex: 1; overflow-y: auto; padding: 10px 14px; }

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 14px;
}

.report-frame { flex: 1; min-height: 0; }

/*  Buttons  */
.btn-primary {
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background .15s;
  white-space: nowrap;
}
.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background .15s;
  white-space: nowrap;
}
.btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
.btn-ghost {
  background: #fff;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background .15s;
  white-space: nowrap;
}
.btn-ghost:hover:not(:disabled) { background: #f3f4f6; }
.btn-outline {
  background: #fff;
  color: #4f46e5;
  border: 1px solid #4f46e5;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all .15s;
  white-space: nowrap;
}
.btn-outline:hover:not(:disabled) { background: #eef2ff; }
.btn-sm { padding: 5px 12px !important; font-size: 12px !important; }
button:disabled { opacity: .5; cursor: not-allowed; }

/*  Animations & utils  */
@keyframes pulse {
  0%   { transform: scale(1); opacity: 1; }
  50%  { transform: scale(1.25); opacity: .7; }
  100% { transform: scale(1); opacity: 1; }
}

:deep(.markdown-viewer) { overflow-y: auto; padding: 0 2px; }

@media (max-width: 768px) {
  .main-layout { flex-direction: column; padding: 8px; }
  .task-list-panel { width: 100%; min-width: auto; max-height: 180px; }
}

/* ─── NFLSOJ 比赛列表模态框 ─────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.nflsoj-modal {
  background: #fff; border-radius: 10px; width: 520px; max-width: 95vw;
  max-height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}
.nflsoj-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #e5e7eb;
  font-weight: 600; font-size: 14px;
}
.nflsoj-modal-toolbar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-bottom: 1px solid #e5e7eb;
}
.flex-spacer { flex: 1; }
.nflsoj-contest-list {
  flex: 1; overflow-y: auto; padding: 4px 12px;
}
.nflsoj-loading { padding: 16px 0; color: #6b7280; font-size: 13px; text-align: center; }
.nflsoj-contest-row {
  display: flex; align-items: center; gap: 8px; padding: 5px 4px;
  cursor: pointer; font-size: 13px; border-radius: 4px;
}
.nflsoj-contest-row:hover { background: #f3f4f6; }
.nflsoj-contest-row input[type=checkbox] { flex-shrink: 0; cursor: pointer; }
.nflsoj-contest-id { color: #9ca3af; font-size: 11px; min-width: 48px; flex-shrink: 0; }
.nflsoj-contest-title { flex: 1; }
.nflsoj-modal-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-top: 1px solid #e5e7eb;
}
.nflsoj-selected-count { font-size: 12px; color: #6b7280; flex: 1; }
.nflsoj-import-status { font-size: 12px; color: #4f46e5; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nflsoj-search-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
.nflsoj-search-input { flex: 1; padding: 5px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; }
.nflsoj-search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,.12); }
.nflsoj-filter-count { font-size: 12px; color: #6b7280; white-space: nowrap; }

/* htoj 自动提交结果标签 */
.htoj-result-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}
.htoj-result-tag.htoj-ac { background: #d1fae5; color: #065f46; }
.htoj-result-tag.htoj-wa { background: #fee2e2; color: #991b1b; }
.htoj-result-tag.htoj-ce { background: #fef3c7; color: #92400e; }
.htoj-result-tag.htoj-tle { background: #dbeafe; color: #1e40af; }
.htoj-result-tag.htoj-re { background: #ede9fe; color: #5b21b6; }
.htoj-result-tag.htoj-pending { background: #e5e7eb; color: #374151; }

/* ─── 工具栏布局 ─── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.toolbar-row + .toolbar-row {
  margin-top: 6px;
  padding-top: 6px;
}
.htoj-toolbar {
  border-top: 1px dashed #e5e7eb;
}

/* ─── 下拉菜单 ─── */
.dropdown-wrap {
  position: relative;
  display: inline-flex;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
  z-index: 100;
  min-width: 170px;
  padding: 4px 0;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 6px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}
.dropdown-item:hover {
  background: #f3f4f6;
}
</style>
