/**
 * Pure utility functions for course progress & display.
 * Importable by any component — no Vue state dependencies.
 */
import { marked } from 'marked'
import { getRealSubject } from './courseConfig'

export function stripMarkdown(text) {
  if (!text) return ''
  return text.replace(/[#*`]/g, '').slice(0, 100) + (text.length > 100 ? '...' : '')
}

export function renderMarkdown(text) {
  if (!text) return ''
  try {
    return marked.parse(text, { breaks: true, mangle: false, headerIds: false })
  } catch (e) {
    console.error('Markdown render error:', e)
    return text
  }
}

export function getChapterProblemCount(chapter) {
  const required = chapter.problemIds ? chapter.problemIds.length : 0
  const optional = chapter.optionalProblemIds ? chapter.optionalProblemIds.length : 0
  return required + optional
}

export function getTopicTotalProblems(topic) {
  if (!topic || !topic.chapters) return 0
  return topic.chapters.reduce((sum, ch) => sum + getChapterProblemCount(ch), 0)
}

export function getTopicProgress(progress, topic) {
  if (!progress || !topic || !topic.chapters) return 0
  const completedIds = progress.completedChapters || []
  const completedUids = progress.completedChapterUids || []
  return topic.chapters.filter(ch => {
    if (ch._id && completedUids.includes(ch._id)) return true
    return completedIds.includes(ch.id)
  }).length
}

export function getLearnerTopicSolvedCount(progress, topic) {
  if (!progress || !progress.chapterProgress || !topic || !topic.chapters) return 0
  return topic.chapters.reduce((sum, ch) => {
    const p = progress.chapterProgress[ch.id]
    return sum + (p && p.solvedProblems ? p.solvedProblems.length : 0)
  }, 0)
}

export function getCurrentSubjectLevel(subjectName, userProgress, treeData) {
  if (!userProgress) return 1
  const realSubject = getRealSubject(subjectName)
  if (userProgress.subjectLevels && userProgress.subjectLevels[realSubject]) {
    return userProgress.subjectLevels[realSubject]
  }
  if (realSubject === 'C++') return userProgress.currentLevel || 1
  return 1
}

export function getLevelTitle(subject, levelNum, treeData) {
  if (!treeData) return ''
  const group = treeData.find(g => g.name === subject)
  if (group) {
    const level = group.levels.find(l => l.level === levelNum)
    if (level) return level.title
  }
  for (const g of treeData) {
    const level = g.levels.find(
      l => l.level === levelNum && (l.subject === subject || (!l.subject && subject === 'C++'))
    )
    if (level) return level.title
  }
  return ''
}

export function isLevelUnlocked(level, userProgress, treeData) {
  if (!userProgress) return false
  const lvl = level.level || level.levelId
  return lvl <= getCurrentSubjectLevel(level.group, userProgress, treeData)
}

export function isChapterCompleted(level, chapter, userProgress) {
  if (!userProgress) return false
  if (userProgress.completedChapterUids && userProgress.completedChapterUids.length > 0 && chapter._id) {
    return userProgress.completedChapterUids.includes(chapter._id)
  }
  return (userProgress.completedChapters || []).includes(chapter.id)
}

export function isLevelCompleted(level, userProgress, treeData) {
  if (!userProgress) return false
  let chapters = []
  if (level.topics && level.topics.length > 0) {
    level.topics.forEach(t => { if (t.chapters) chapters.push(...t.chapters) })
  } else if (level.chapters) {
    chapters = level.chapters
  }
  if (chapters.length > 0) {
    const required = chapters.filter(c => !c.optional)
    if (required.length > 0) {
      return required.every(c => isChapterCompleted(level, c, userProgress))
    }
  }
  const lvl = level.level || level.levelId
  return lvl < getCurrentSubjectLevel(level.group, userProgress, treeData)
}

export function isChapterUnlocked(level, chapter, userProgress, treeData) {
  if (!userProgress) return false
  const lvl = level.level || level.levelId
  const currentLvl = getCurrentSubjectLevel(level.group, userProgress, treeData)
  if (lvl < currentLvl) return true
  if (level.topics) {
    for (const topic of level.topics) {
      if (topic.chapters && topic.chapters.length > 0) {
        const first = topic.chapters[0]
        if (first === chapter || first.id === chapter.id) return true
        if (first._id && chapter._id && first._id === chapter._id) return true
      }
    }
  }
  if (userProgress.unlockedChapterUids && userProgress.unlockedChapterUids.length > 0 && chapter._id) {
    return userProgress.unlockedChapterUids.includes(chapter._id)
  }
  return (userProgress.unlockedChapters || []).includes(chapter.id)
}

export function getChapterStatusClass(level, chapter, userProgress, treeData) {
  if (isChapterCompleted(level, chapter, userProgress)) return 'status-completed'
  if (isChapterUnlocked(level, chapter, userProgress, treeData)) return 'status-unlocked'
  try {
    const u = JSON.parse(localStorage.getItem('user_info') || '{}')
    if (u.role === 'teacher' || u.role === 'admin') return 'status-unlocked'
  } catch {}
  return 'status-locked'
}
