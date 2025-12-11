import express from 'express'
import mongoose from 'mongoose'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import Document from '../models/Document.js'
import Submission from '../models/Submission.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// --- Public / User Routes ---

// Get all course levels (structure)
router.get('/levels', async (req, res) => {
  try {
    const { subject } = req.query
    const query = {}
    if (subject) {
      if (subject === 'C++') {
        // Handle legacy data where subject might be missing
        query.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
      } else {
        query.subject = subject
      }
    }
    const levels = await CourseLevel.find(query)
      .sort({ level: 1 })
      .populate('topics.chapters.problemIds', 'title docId domainId')
      .populate('chapters.problemIds', 'title docId domainId') // Legacy support
    res.json(levels)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get user progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    let progress = await UserProgress.findOne({ userId })
    
    if (!progress) {
      // Initialize progress for new user
      progress = new UserProgress({ userId })
      // Initialize default subject levels
      progress.subjectLevels.set('C++', 1)
      await progress.save()
    } else {
      // Migration: Ensure subjectLevels has C++ if missing
      if (!progress.subjectLevels) {
        progress.subjectLevels = new Map()
      }
      if (!progress.subjectLevels.has('C++')) {
        progress.subjectLevels.set('C++', progress.currentLevel || 1)
        await progress.save()
      }
    }
    
    res.json(progress)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Helper to unlock next chapter
async function unlockNext(progress, currentChapterId) {
  // Find the level containing this chapter. 
  // Note: If multiple subjects have the same chapter ID, this might pick the wrong one.
  // We assume chapter IDs are unique across the system or at least across active courses.
  const level = await CourseLevel.findOne({ 'chapters.id': currentChapterId })
  if (level) {
    let currentIdx = level.chapters.findIndex(c => c.id === currentChapterId)
    const currentChapterObj = level.chapters[currentIdx]

    // --- NEW: Update UIDs ---
    if (currentChapterObj && currentChapterObj._id) {
      if (!progress.completedChapterUids) progress.completedChapterUids = []
      // Add to completed UIDs if not present
      const uidStr = currentChapterObj._id.toString()
      if (!progress.completedChapterUids.some(id => id.toString() === uidStr)) {
        progress.completedChapterUids.push(currentChapterObj._id)
      }
    }
    // ------------------------
    
    // Loop to unlock subsequent chapters if they are optional
    // We use a loop to handle consecutive optional chapters
    while (true) {
      if (currentIdx !== -1 && currentIdx < level.chapters.length - 1) {
        const nextChapter = level.chapters[currentIdx + 1]
        
        // Unlock the next chapter (Legacy String ID)
        if (!progress.unlockedChapters.includes(nextChapter.id)) {
          progress.unlockedChapters.push(nextChapter.id)
        }
        // Unlock the next chapter (New UID)
        if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
        if (nextChapter._id && !progress.unlockedChapterUids.some(id => id.toString() === nextChapter._id.toString())) {
          progress.unlockedChapterUids.push(nextChapter._id)
        }
        
        // If next chapter is optional, we treat it as "virtually completed" for unlocking purposes
        // so we move to the next one immediately
        if (nextChapter.optional) {
          currentIdx++
          continue
        } else {
          // If next chapter is required, we stop here. User must complete it.
          break
        }
      } else {
        // End of level reached. Unlock next level.
        const currentSubject = level.subject || 'C++'
        const nextLevelQuery = { level: level.level + 1 }
        if (currentSubject === 'C++') {
             nextLevelQuery.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
        } else {
             nextLevelQuery.subject = currentSubject
        }
        
        const nextLevel = await CourseLevel.findOne(nextLevelQuery)
        if (nextLevel && nextLevel.chapters.length > 0) {
           // Update subject-specific level
           if (!progress.subjectLevels) progress.subjectLevels = new Map()
           
           const currentSubjectLevel = progress.subjectLevels.get(currentSubject) || 1
           if (currentSubjectLevel < nextLevel.level) {
             progress.subjectLevels.set(currentSubject, nextLevel.level)
             
             // Sync legacy currentLevel if it's C++
             if (currentSubject === 'C++') {
               progress.currentLevel = nextLevel.level
             }
           }
           
           // Unlock chapters in the next level, handling initial optional chapters
           let nextLvlIdx = 0
           while (nextLvlIdx < nextLevel.chapters.length) {
             const ch = nextLevel.chapters[nextLvlIdx]
             // Legacy
             if (!progress.unlockedChapters.includes(ch.id)) {
               progress.unlockedChapters.push(ch.id)
             }
             // UID
             if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
             if (ch._id && !progress.unlockedChapterUids.some(id => id.toString() === ch._id.toString())) {
               progress.unlockedChapterUids.push(ch._id)
             }
             
             if (ch.optional) {
               nextLvlIdx++
             } else {
               break
             }
           }
        }
        break // Break the outer loop
      }
    }
  }
}

// Submit a problem solution (Simulated for now, or called by the judge system)
// In a real system, this would be triggered by the judge callback
router.post('/submit-problem', authenticateToken, async (req, res) => {
  try {
    const { chapterId, problemId, passed } = req.body
    const userId = req.user.id
    
    if (!passed) {
      return res.json({ message: 'Keep trying!' })
    }

    let progress = await UserProgress.findOne({ userId })
    if (!progress) {
      progress = new UserProgress({ userId })
    }

    // Update solved problems for this chapter
    if (!progress.chapterProgress.has(chapterId)) {
      progress.chapterProgress.set(chapterId, { solvedProblems: [] })
    }
    
    const chapterData = progress.chapterProgress.get(chapterId)
    if (!chapterData.solvedProblems.includes(problemId)) {
      chapterData.solvedProblems.push(problemId)
    }
    
    // Check if chapter is completed
    const level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    if (level) {
      const chapter = level.chapters.find(c => c.id === chapterId)
      if (chapter) {
        const requiredIds = chapter.problemIds.map(p => p.toString())
        const solvedIds = chapterData.solvedProblems
        
        const allSolved = requiredIds.every(id => solvedIds.includes(id))
        
        if (allSolved && !progress.completedChapters.includes(chapterId)) {
          progress.completedChapters.push(chapterId)
          await unlockNext(progress, chapterId)
        }
      }
    }
    
    await progress.save()
    res.json({ success: true, progress })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Complete a reading/watching chapter (No problems)
router.post('/complete-chapter', authenticateToken, async (req, res) => {
  try {
    const { chapterId } = req.body
    const userId = req.user.id

    let progress = await UserProgress.findOne({ userId })
    if (!progress) {
      progress = new UserProgress({ userId })
    }

    // Verify chapter exists and has no problems (optional strictness)
    const level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    if (!level) {
      return res.status(404).json({ error: 'Chapter not found' })
    }
    const chapter = level.chapters.find(c => c.id === chapterId)
    
    // Allow completion if it's not already completed
    if (!progress.completedChapters.includes(chapterId)) {
      progress.completedChapters.push(chapterId)
      await unlockNext(progress, chapterId)
    }

    await progress.save()
    res.json({ success: true, progress })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Check if a problem is passed in the real system
router.post('/check-problem', authenticateToken, async (req, res) => {
  try {
    const { chapterId, problemId } = req.body
    const userId = req.user.id

    // 1. Get Document info
    const doc = await Document.findById(problemId)
    if (!doc) return res.status(404).json({ error: 'Problem not found' })

    // 2. Check Submission
    // Assuming status 1 is Accepted (Hydro standard). 
    // We check for uid, pid (docId), and status.
    const query = { uid: userId, pid: doc.docId, status: 1 }
    if (doc.domainId) query.domainId = doc.domainId
    
    console.log('[CheckProblem] User:', userId)
    console.log('[CheckProblem] Doc:', { docId: doc.docId, domainId: doc.domainId })
    console.log('[CheckProblem] Query:', query)

    const submission = await Submission.findOne(query)
    console.log('[CheckProblem] Result:', submission ? 'Found' : 'Not Found')
    
    if (submission) {
       // Reuse logic by calling internal function or just duplicating update logic
       // Duplicating for now to avoid refactoring risk in this step
       let progress = await UserProgress.findOne({ userId })
       if (!progress) progress = new UserProgress({ userId })

       if (!progress.chapterProgress.has(chapterId)) {
         progress.chapterProgress.set(chapterId, { solvedProblems: [] })
       }
       
       const chapterData = progress.chapterProgress.get(chapterId)
       if (!chapterData.solvedProblems.includes(problemId)) {
         chapterData.solvedProblems.push(problemId)
       }
       
       // Check completion
       const level = await CourseLevel.findOne({ 'chapters.id': chapterId })
       if (level) {
         const chapter = level.chapters.find(c => c.id === chapterId)
         if (chapter) {
           const requiredIds = chapter.problemIds.map(p => p.toString())
           const solvedIds = chapterData.solvedProblems
           const allSolved = requiredIds.every(id => solvedIds.includes(id))
           
           if (allSolved && !progress.completedChapters.includes(chapterId)) {
             progress.completedChapters.push(chapterId)
             await unlockNext(progress, chapterId)
           }
         }
       }
       
       await progress.save()
       return res.json({ passed: true, progress })
    } else {
       return res.json({ passed: false, message: '未找到 AC 提交记录' })
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// --- Admin Routes ---

// Create a Level
router.post('/levels', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { level, title, description, subject } = req.body
    const newLevel = new CourseLevel({ level, title, description, subject: subject || 'C++', chapters: [] })
    await newLevel.save()
    res.json(newLevel)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Level
router.put('/levels/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { level, title, description, subject } = req.body
    const updatedLevel = await CourseLevel.findByIdAndUpdate(
      req.params.id, 
      { level, title, description, subject },
      { new: true }
    )
    res.json(updatedLevel)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Level
router.delete('/levels/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    await CourseLevel.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Topic Management ---

// Add a Topic
router.post('/levels/:id/topics', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, description, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const newTopic = { title, description, chapters: [] }

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= level.topics.length) {
      level.topics.splice(insertIndex, 0, newTopic)
    } else {
      level.topics.push(newTopic)
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Topic
router.put('/levels/:id/topics/:topicId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, description } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    
    topic.title = title
    topic.description = description
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Topic
router.delete('/levels/:id/topics/:topicId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    level.topics.pull(req.params.topicId)
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Helper to resolve problem IDs (ObjectId or domain:docId or docId)
async function resolveProblemIds(ids) {
  const resolved = []
  for (const idStr of ids) {
    if (mongoose.Types.ObjectId.isValid(idStr)) {
      resolved.push(idStr)
    } else {
      let query = {}
      if (idStr.includes(':')) {
        const [domain, pid] = idStr.split(':')
        query = { domainId: domain, docId: isNaN(pid) ? pid : Number(pid) }
      } else {
        // Default to system domain or just search by docId
        // Try to find in 'system' domain first if exists, else any
        const pid = isNaN(idStr) ? idStr : Number(idStr)
        const docInSystem = await Document.findOne({ domainId: 'system', docId: pid })
        if (docInSystem) {
          resolved.push(docInSystem._id)
          continue
        }
        query = { docId: pid }
      }
      
      const doc = await Document.findOne(query)
      if (doc) resolved.push(doc._id)
    }
  }
  return resolved
}

// --- Chapter Management (Topic Based) ---

// Add a Chapter to a Topic
router.post('/levels/:id/topics/:topicId/chapters', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id, title, content, problemIds, optional, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const resolvedIds = await resolveProblemIds(problemIds || [])
    
    const newChapter = { id, title, content, problemIds: resolvedIds, optional: !!optional }

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= topic.chapters.length) {
      topic.chapters.splice(insertIndex, 0, newChapter)
    } else {
      topic.chapters.push(newChapter)
    }

    // Auto-renumber chapters? Maybe not strictly required if ID is manual, but good for consistency if ID is auto-generated.
    // If ID is passed, use it. If not, maybe generate?
    // The frontend usually generates ID.

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Chapter in a Topic
router.put('/levels/:id/topics/:topicId/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, content, problemIds, optional } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const chapter = topic.chapters.id(req.params.chapterId) // Use .id() for subdocument search by _id
    // OR find by custom id string if that's what we use
    // The schema has `id` (string) and `_id` (ObjectId).
    // The route param `chapterId` usually refers to the custom string ID in legacy, but for subdocs it's better to use _id if possible.
    // However, the frontend might send the string ID.
    // Let's try to find by _id first, then by id string.
    
    let targetChapter = topic.chapters.id(req.params.chapterId)
    if (!targetChapter) {
       targetChapter = topic.chapters.find(c => c.id === req.params.chapterId)
    }
    
    if (!targetChapter) return res.status(404).json({ error: 'Chapter not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])

    targetChapter.title = title
    targetChapter.content = content
    targetChapter.problemIds = resolvedIds
    targetChapter.optional = !!optional
    
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Chapter from a Topic
router.delete('/levels/:id/topics/:topicId/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    
    // Try to remove by _id or id string
    let targetChapter = topic.chapters.id(req.params.chapterId)
    if (targetChapter) {
        targetChapter.remove()
    } else {
        // Filter out by string ID
        const initialLen = topic.chapters.length
        topic.chapters = topic.chapters.filter(c => c.id !== req.params.chapterId)
        if (topic.chapters.length === initialLen) return res.status(404).json({ error: 'Chapter not found' })
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Add a Chapter (Legacy)
router.post('/levels/:id/chapters', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id, title, content, problemIds, optional, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])
    
    const newChapter = { id, title, content, problemIds: resolvedIds, optional: !!optional }

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= level.chapters.length) {
      level.chapters.splice(insertIndex, 0, newChapter)
    } else {
      level.chapters.push(newChapter)
    }

    // Auto-renumber chapters to keep IDs consistent (e.g. 1-1, 1-2, 1-3)
    level.chapters.forEach((ch, index) => {
      ch.id = `${level.level}-${index + 1}`
    })

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Chapter
router.put('/levels/:id/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, content, problemIds, optional } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const chapter = level.chapters.find(c => c.id === req.params.chapterId)
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])

    chapter.title = title
    chapter.content = content
    chapter.problemIds = resolvedIds
    chapter.optional = !!optional
    
    // No renumbering needed for update unless we support moving chapters (not yet)
    
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Chapter
router.delete('/levels/:id/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    level.chapters = level.chapters.filter(c => c.id !== req.params.chapterId)
    
    // Auto-renumber chapters after deletion
    level.chapters.forEach((ch, index) => {
      ch.id = `${level.level}-${index + 1}`
    })

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
