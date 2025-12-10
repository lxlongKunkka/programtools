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
    const levels = await CourseLevel.find().sort({ level: 1 }).populate('chapters.problemIds', 'title docId domainId')
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
      await progress.save()
    }
    
    res.json(progress)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Helper to unlock next chapter
async function unlockNext(progress, currentChapterId) {
  const level = await CourseLevel.findOne({ 'chapters.id': currentChapterId })
  if (level) {
    const currentIdx = level.chapters.findIndex(c => c.id === currentChapterId)
    if (currentIdx !== -1 && currentIdx < level.chapters.length - 1) {
      const nextChapter = level.chapters[currentIdx + 1]
      if (!progress.unlockedChapters.includes(nextChapter.id)) {
        progress.unlockedChapters.push(nextChapter.id)
      }
    } else {
      // Level completed? Unlock next level's first chapter?
      const nextLevel = await CourseLevel.findOne({ level: level.level + 1 })
      if (nextLevel && nextLevel.chapters.length > 0) {
         const nextChapter = nextLevel.chapters[0]
         if (!progress.unlockedChapters.includes(nextChapter.id)) {
           progress.unlockedChapters.push(nextChapter.id)
         }
         if (progress.currentLevel < nextLevel.level) {
           progress.currentLevel = nextLevel.level
         }
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
router.post('/levels', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { level, title, description } = req.body
    const newLevel = new CourseLevel({ level, title, description, chapters: [] })
    await newLevel.save()
    res.json(newLevel)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Level
router.put('/levels/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { level, title, description } = req.body
    const updatedLevel = await CourseLevel.findByIdAndUpdate(
      req.params.id, 
      { level, title, description },
      { new: true }
    )
    res.json(updatedLevel)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Level
router.delete('/levels/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await CourseLevel.findByIdAndDelete(req.params.id)
    res.json({ success: true })
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

// Add a Chapter
router.post('/levels/:id/chapters', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id, title, content, problemIds } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])
    
    level.chapters.push({ id, title, content, problemIds: resolvedIds })
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Chapter
router.put('/levels/:id/chapters/:chapterId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { title, content, problemIds } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const chapter = level.chapters.find(c => c.id === req.params.chapterId)
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])

    chapter.title = title
    chapter.content = content
    chapter.problemIds = resolvedIds
    
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Chapter
router.delete('/levels/:id/chapters/:chapterId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    level.chapters = level.chapters.filter(c => c.id !== req.params.chapterId)
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
