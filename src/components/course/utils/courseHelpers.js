// 文件名安全化：只保留字母数字下划线中文与连字符
export function sanitizeFileName(str) {
  return (str || '').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')
}

// 触发浏览器下载
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 章节链接（题目/作业/考试）通用解析
function parseDomainPid(raw, defaultDomain = 'system') {
  let domain = defaultDomain
  let pid = raw
  if (raw.includes(':')) {
    [domain, pid] = raw.split(':')
  }
  return { domain, pid }
}

function splitIds(idsStr) {
  return (idsStr || '').split(/[,，]/).map(s => s.trim()).filter(Boolean)
}

// 题目（问题/可选题）链接
export function buildProblemLinks(idsStr, problemTitles = {}) {
  return splitIds(idsStr).map(s => {
    const { domain, pid } = parseDomainPid(s)
    const title = problemTitles[s]
    return {
      text: title ? `${domain}:${pid}: ${title}` : s,
      url: `https://acjudge.com/d/${domain}/p/${pid}`
    }
  })
}

// 作业 / 考试链接（kind: 'homework' | 'contest'）
export function buildContestLinks(idsStr, contestTitles = {}, kind = 'homework') {
  return splitIds(idsStr).map(s => {
    const { domain, pid: cid } = parseDomainPid(s)
    const title = contestTitles[s]
    return {
      text: title ? `${domain}: ${title}` : s,
      url: `https://acjudge.com/d/${domain}/${kind}/${cid}`
    }
  })
}

// 合并 DB groups 与 levels 中孤儿 group，返回排序后的展示分组
export function computeDisplayGroups(groups = [], levels = []) {
  const result = [...groups]
  const dbGroupNames = new Set(groups.map(g => g.name))

  const orphanedNames = new Set()
  if (levels) {
    levels.forEach(l => {
      if (l.group && !dbGroupNames.has(l.group)) {
        orphanedNames.add(l.group)
      }
    })
  }

  orphanedNames.forEach(name => {
    result.push({
      _id: null,
      name: name,
      title: name,
      order: 999,
      collapsed: false
    })
  })

  return result.sort((a, b) => (a.order || 0) - (b.order || 0))
}

// 在树中按 topicId 查找
export function findTopicInTree(levels, topicId) {
  if (!levels) return null
  for (const level of levels) {
    if (level.topics) {
      const topic = level.topics.find(t => t._id === topicId || t.id === topicId)
      if (topic) return topic
    }
  }
  return null
}

// 在树中更新章节字段（先在当前编辑上下文中找，再退化到全树搜索）
export function updateChapterInTree(levels, contextTopic, chapterId, updates) {
  if (contextTopic && contextTopic.chapters) {
    const chapter = contextTopic.chapters.find(c => c.id === chapterId || c._id === chapterId)
    if (chapter) {
      Object.assign(chapter, updates)
      return true
    }
  }

  if (levels) {
    for (const level of levels) {
      if (level.topics) {
        for (const topic of level.topics) {
          if (topic.chapters) {
            const chapter = topic.chapters.find(c => c.id === chapterId || c._id === chapterId)
            if (chapter) {
              Object.assign(chapter, updates)
              return true
            }
          }
        }
      }
    }
  }
  return false
}

// 把章节资源 URL 解析为后端可访问的 fetch URL
export function resolveResourceFetchUrl(resourceUrl, token = null) {
  let fetchUrl = resourceUrl
  if (fetchUrl.startsWith('http')) {
    return `/api/course/proxy?url=${encodeURIComponent(fetchUrl)}`
  }
  if (fetchUrl.indexOf('public/courseware') !== -1) {
    if (fetchUrl.startsWith('/public/')) fetchUrl = '/api' + fetchUrl
    else if (fetchUrl.startsWith('public/')) fetchUrl = '/api/' + fetchUrl
    if (token) {
      const separator = fetchUrl.includes('?') ? '&' : '?'
      fetchUrl = `${fetchUrl}${separator}token=${token}`
    }
  }
  return fetchUrl
}

// 根据资源 URL 后缀决定下载文件扩展名
export function resourceUrlToExtension(resourceUrl) {
  const lowerUrl = (resourceUrl || '').toLowerCase()
  if (lowerUrl.endsWith('.ppt')) return 'ppt'
  if (lowerUrl.endsWith('.pptx')) return 'pptx'
  if (lowerUrl.endsWith('.pdf')) return 'pdf'
  if (lowerUrl.endsWith('.doc')) return 'doc'
  if (lowerUrl.endsWith('.docx')) return 'docx'
  return 'html'
}

// 把章节加入 zip：包含 .md 内容（含按需懒加载）和资源文件
export async function addChapterToZip(zip, folderPath, chapter, { request, fetchChapterContent }) {
  const safeTitle = sanitizeFileName(chapter.title)

  let content = chapter.content
  if (!content) {
    try {
      const chId = chapter.id || chapter._id
      if (chId) {
        const res = await request(`/api/course/chapter/${chId}`)
        if (res && res.content) {
          content = res.content
          chapter.content = content
        }
      }
    } catch (e) {
      console.error(`Failed to fetch content for ${chapter.title}`, e)
    }
  }

  if (content) {
    zip.file(`${folderPath}/${safeTitle}.md`, content)
  }

  if (chapter.contentType === 'html' && chapter.resourceUrl) {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const fetchUrl = resolveResourceFetchUrl(chapter.resourceUrl, token)
      const response = await fetch(fetchUrl, { headers })
      if (response.ok) {
        const blob = await response.blob()
        const extension = resourceUrlToExtension(chapter.resourceUrl)
        zip.file(`${folderPath}/${safeTitle}.${extension}`, blob)
      }
    } catch (e) {
      console.error(`Failed to download HTML for ${chapter.title}`, e)
    }
  }
}
