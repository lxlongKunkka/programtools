import express from 'express'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import User from '../models/User.js'
import Document from '../models/Document.js'
import Submission from '../models/Submission.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// --- Public / User Routes ---


// Get single chapter details (Protected)
router.get('/chapter/:chapterId', authenticateToken, async (req, res) => {
  try {
    const { chapterId } = req.params
    const userId = req.user.id

    // 1. Check if user has unlocked this chapter
    const progress = await UserProgress.findOne({ userId })
    
    // Allow admin/teacher to bypass check
    const isAdmin = req.user.role === 'admin' || req.user.role === 'teacher' || req.user.priv === -1
    
    if (!progress && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' })
    }

    // 2. Find the chapter
    let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    let chapter = null
    
    if (level) {
      chapter = level.chapters.find(c => c.id === chapterId)
    } else {
      level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
      if (level) {
        for (const topic of level.topics) {
          chapter = topic.chapters.find(c => c.id === chapterId)
          if (chapter) break
        }
      }
    }

    if (!level || !chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }

    // 3. Check permissions
    if (!isAdmin) {
        const isUnlockedId = progress.unlockedChapters.includes(chapterId)
        let isUnlocked = isUnlockedId
        if (!isUnlocked && chapter._id && progress.unlockedChapterUids) {
            isUnlocked = progress.unlockedChapterUids.some(id => id.toString() === chapter._id.toString())
        }
        
        if (!isUnlocked) {
            return res.status(403).json({ error: 'Chapter is locked' })
        }
    }

    // 4. Populate problemIds
    await level.populate('topics.chapters.problemIds', 'title docId domainId')
    await level.populate('chapters.problemIds', 'title docId domainId')
    
    // Re-find the chapter after populate to get populated fields
    if (level.topics && level.topics.length > 0) {
         for (const topic of level.topics) {
             const found = topic.chapters.find(c => c.id === chapterId)
             if (found) {
                 chapter = found
                 break
             }
         }
    } else {
         chapter = level.chapters.find(c => c.id === chapterId)
    }

    res.json(chapter)

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})


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
      .select('-topics.chapters.content -chapters.content')
      .sort({ level: 1 })
      .populate('topics.chapters.problemIds', 'title docId domainId')
      .populate('chapters.problemIds', 'title docId domainId') // Legacy support
    res.json(levels)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get learners for a specific topic
router.get('/topic/:topicId/learners', async (req, res) => {
  try {
    const { topicId } = req.params
    
    // 1. Find the topic and its chapters
    const level = await CourseLevel.findOne({ 'topics._id': topicId })
    
    if (!level) {
      return res.status(404).json({ error: 'Topic not found' })
    }
    
    const topic = level.topics.id(topicId)
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }
    
    const chapterIds = topic.chapters.map(c => c.id)
    
    if (chapterIds.length === 0) {
      return res.json([])
    }
    
    // 2. Find users who have unlocked any of these chapters
    // We fetch completedChapters/Uids to calculate progress for sorting
    const progresses = await UserProgress.find({
      unlockedChapters: { $in: chapterIds }
    }).select('userId completedChapters completedChapterUids')
    
    if (progresses.length === 0) {
      return res.json([])
    }

    // Calculate completed count for each user for THIS topic
    const userProgressMap = {} // userId -> count
    
    progresses.forEach(p => {
       let userCompletedCount = 0
       topic.chapters.forEach(chapter => {
           let isCompleted = false
           // Check UID
           if (chapter._id && p.completedChapterUids && p.completedChapterUids.some(uid => uid.toString() === chapter._id.toString())) {
               isCompleted = true
           } 
           // Check ID (Legacy)
           else if (p.completedChapters && p.completedChapters.includes(chapter.id)) {
               isCompleted = true
           }
           if (isCompleted) userCompletedCount++
       })
       userProgressMap[p.userId] = userCompletedCount
    })
    
    const userIds = [...new Set(progresses.map(p => p.userId))] // Unique user IDs
    
    if (userIds.length === 0) {
      return res.json([])
    }
    
    // 3. Get user details
    const users = await User.find({
      _id: { $in: userIds }
    }).select('uname') // Only select uname, no avatar
    
    // 4. Attach progress and sort
    let usersWithProgress = users.map(u => {
        return {
            _id: u._id,
            uname: u.uname,
            completedCount: userProgressMap[u._id] || 0
        }
    })

    // Filter out users who haven't completed any chapter in this topic
    usersWithProgress = usersWithProgress.filter(u => u.completedCount > 0)
    
    // Sort descending by completed count
    usersWithProgress.sort((a, b) => b.completedCount - a.completedCount)

    res.json(usersWithProgress)
    
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get specific user progress (Public/Protected)
router.get('/progress/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    console.log(`[API] Fetching progress for user: ${userId}`)
    
    const progress = await UserProgress.findOne({ userId })
    
    if (!progress) {
      console.log(`[API] Progress not found for user: ${userId}`)
      return res.status(404).json({ error: 'Progress not found' })
    }

    // Ensure subjectLevels is an object for JSON response
    let subjectLevels = progress.subjectLevels
    if (subjectLevels instanceof Map) {
      subjectLevels = Object.fromEntries(subjectLevels)
    }
    // Fallback for legacy data
    if (!subjectLevels || Object.keys(subjectLevels).length === 0) {
       subjectLevels = { 'C++': progress.currentLevel || 1 }
    }

    // Convert chapterProgress Map to Object
    let chapterProgressObj = {}
    if (progress.chapterProgress) {
      if (progress.chapterProgress instanceof Map) {
        chapterProgressObj = Object.fromEntries(progress.chapterProgress)
      } else {
        chapterProgressObj = progress.chapterProgress
      }
    }

    const responseData = {
      userId: progress.userId,
      subjectLevels: subjectLevels,
      // Fix: Use completedChapters length only to avoid double counting (since we double-write ID and UID)
      completedChaptersCount: progress.completedChapters ? progress.completedChapters.length : 0,
      completedChapters: progress.completedChapters || [],
      completedChapterUids: progress.completedChapterUids || [],
      chapterProgress: chapterProgressObj
    }
    console.log(`[API] Returning progress:`, responseData)

    res.json(responseData)
  } catch (e) {
    console.error(`[API] Error fetching progress:`, e)
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

    // Self-healing: Ensure the first chapter of the current level is unlocked for each subject
    if (progress.subjectLevels) {
      let progressChanged = false
      for (const [subject, levelNum] of progress.subjectLevels) {
        // Find the course level
        // Note: We use a loose query for C++ to handle legacy docs without subject field
        const query = { level: levelNum }
        if (subject === 'C++') {
          query.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
        } else {
          query.subject = subject
        }

        const levelDoc = await CourseLevel.findOne(query)
        if (levelDoc) {
          let chaptersToUnlock = []
          
          // Check topics first (New Structure)
          if (levelDoc.topics && levelDoc.topics.length > 0) {
             // Unlock the first chapter of EVERY topic
             for (const topic of levelDoc.topics) {
                 if (topic.chapters && topic.chapters.length > 0) {
                     chaptersToUnlock.push(topic.chapters[0])
                 }
             }
          } 
          
          // Fallback to legacy chapters if no topic chapters found
          if (chaptersToUnlock.length === 0 && levelDoc.chapters && levelDoc.chapters.length > 0) {
            chaptersToUnlock.push(levelDoc.chapters[0])
          }
          
          for (const ch of chaptersToUnlock) {
            // Check ID (Legacy)
            if (!progress.unlockedChapters.includes(ch.id)) {
              progress.unlockedChapters.push(ch.id)
              progressChanged = true
            }
            // Check UID (New)
            if (ch._id) {
              if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
              const uidStr = ch._id.toString()
              const hasUid = progress.unlockedChapterUids.some(u => u.toString() === uidStr)
              if (!hasUid) {
                progress.unlockedChapterUids.push(ch._id)
                progressChanged = true
              }
            }
          }
        }
      }
      if (progressChanged) {
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
  // 1. Find Level and Location
  let level = await CourseLevel.findOne({ 'chapters.id': currentChapterId })
  let isTopic = false
  let tIdx = -1
  let cIdx = -1
  let currentChapterObj = null

  if (level) {
    cIdx = level.chapters.findIndex(c => c.id === currentChapterId)
    currentChapterObj = level.chapters[cIdx]
  } else {
    level = await CourseLevel.findOne({ 'topics.chapters.id': currentChapterId })
    if (level) {
      isTopic = true
      for (let t = 0; t < level.topics.length; t++) {
        const idx = level.topics[t].chapters.findIndex(c => c.id === currentChapterId)
        if (idx !== -1) {
          tIdx = t
          cIdx = idx
          currentChapterObj = level.topics[t].chapters[idx]
          break
        }
      }
    }
  }

  if (!level || !currentChapterObj) return

  // 2. Mark Current as Completed (UID)
  if (currentChapterObj._id) {
    if (!progress.completedChapterUids) progress.completedChapterUids = []
    const uidStr = currentChapterObj._id.toString()
    if (!progress.completedChapterUids.some(id => id.toString() === uidStr)) {
      progress.completedChapterUids.push(currentChapterObj._id)
    }
  }

  // 3. Find Next Chapter(s) to Unlock
  let loopTIdx = tIdx
  let loopCIdx = cIdx
  let loopIsTopic = isTopic
  
  const advance = () => {
    if (loopIsTopic) {
      // Try next chapter in current topic
      if (loopCIdx < level.topics[loopTIdx].chapters.length - 1) {
        loopCIdx++
        return level.topics[loopTIdx].chapters[loopCIdx]
      }
      
      // End of topic: Do NOT automatically jump to next topic's first chapter
      // because topics are independent and their first chapters are unlocked by default.
      return null 
    } else {
      // Legacy
      if (loopCIdx < level.chapters.length - 1) {
        loopCIdx++
        return level.chapters[loopCIdx]
      }
      return null // End of level
    }
  }

  while (true) {
    const nextChapter = advance()
    
    if (nextChapter) {
      // Unlock it
      if (!progress.unlockedChapters.includes(nextChapter.id)) {
        progress.unlockedChapters.push(nextChapter.id)
      }
      if (nextChapter._id) {
        if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
        const uidStr = nextChapter._id.toString()
        if (!progress.unlockedChapterUids.some(id => id.toString() === uidStr)) {
          progress.unlockedChapterUids.push(nextChapter._id)
        }
      }

      if (nextChapter.optional) {
        continue
      } else {
        break
      }
    } else {
      // End of Level -> Unlock Next Level
      const currentSubject = level.subject || 'C++'
      const nextLevelQuery = { level: level.level + 1 }
      if (currentSubject === 'C++') {
           nextLevelQuery.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
      } else {
           nextLevelQuery.subject = currentSubject
      }
      
      const nextLevel = await CourseLevel.findOne(nextLevelQuery)
      if (nextLevel) {
         // Update subject-specific level
         if (!progress.subjectLevels) progress.subjectLevels = new Map()
         
         const currentSubjectLevel = progress.subjectLevels.get(currentSubject) || 1
         if (currentSubjectLevel < nextLevel.level) {
           progress.subjectLevels.set(currentSubject, nextLevel.level)
           if (currentSubject === 'C++') {
             progress.currentLevel = nextLevel.level
           }
         }
         
         // Unlock first chapter(s) of next level
         let firstChapters = []
         const collect = () => {
           if (nextLevel.topics && nextLevel.topics.length > 0) {
             // Unlock first chapter of EVERY topic in the next level
             for (const topic of nextLevel.topics) {
               if (topic.chapters && topic.chapters.length > 0) {
                 firstChapters.push(topic.chapters[0])
               }
             }
           } else if (nextLevel.chapters) {
             for (const ch of nextLevel.chapters) {
               firstChapters.push(ch)
               if (!ch.optional) return
             }
           }
         }
         collect()

         for (const ch of firstChapters) {
           if (!progress.unlockedChapters.includes(ch.id)) {
             progress.unlockedChapters.push(ch.id)
           }
           if (ch._id) {
              if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
              const uidStr = ch._id.toString()
              if (!progress.unlockedChapterUids.some(id => id.toString() === uidStr)) {
                progress.unlockedChapterUids.push(ch._id)
              }
           }
         }
      }
      break
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
    let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    let chapter = null
    
    if (level) {
      chapter = level.chapters.find(c => c.id === chapterId)
    } else {
      level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
      if (level) {
        for (const topic of level.topics) {
          chapter = topic.chapters.find(c => c.id === chapterId)
          if (chapter) break
        }
      }
    }

    if (level && chapter) {
        const requiredIds = chapter.problemIds.map(p => p.toString())
        const solvedIds = chapterData.solvedProblems
        
        const allSolved = requiredIds.every(id => solvedIds.includes(id))
        
        const isCompletedLegacy = progress.completedChapters.includes(chapterId)
        let isCompletedUid = false
        if (chapter._id && progress.completedChapterUids) {
           isCompletedUid = progress.completedChapterUids.some(id => id.toString() === chapter._id.toString())
        }
        
        if (allSolved && (!isCompletedLegacy || (chapter._id && !isCompletedUid))) {
          if (!isCompletedLegacy) progress.completedChapters.push(chapterId)
          await unlockNext(progress, chapterId)
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
    let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    let chapter = null
    
    if (level) {
      chapter = level.chapters.find(c => c.id === chapterId)
    } else {
      level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
      if (level) {
        for (const topic of level.topics) {
          chapter = topic.chapters.find(c => c.id === chapterId)
          if (chapter) break
        }
      }
    }

    if (!level || !chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }
    
    // Allow completion if it's not already completed
    const isCompletedLegacy = progress.completedChapters.includes(chapterId)
    let isCompletedUid = false
    if (chapter._id && progress.completedChapterUids) {
       isCompletedUid = progress.completedChapterUids.some(id => id.toString() === chapter._id.toString())
    }

    if (!isCompletedLegacy || (chapter._id && !isCompletedUid)) {
      if (!isCompletedLegacy) progress.completedChapters.push(chapterId)
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
       let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
       let chapter = null
       
       if (level) {
         chapter = level.chapters.find(c => c.id === chapterId)
       } else {
         level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
         if (level) {
           for (const topic of level.topics) {
             chapter = topic.chapters.find(c => c.id === chapterId)
             if (chapter) break
           }
         }
       }

       if (level && chapter) {
           const requiredIds = chapter.problemIds.map(p => p.toString())
           const solvedIds = chapterData.solvedProblems
           const allSolved = requiredIds.every(id => solvedIds.includes(id))
           
           const isCompletedLegacy = progress.completedChapters.includes(chapterId)
           let isCompletedUid = false
           if (chapter._id && progress.completedChapterUids) {
              isCompletedUid = progress.completedChapterUids.some(id => id.toString() === chapter._id.toString())
           }
           
           if (allSolved && (!isCompletedLegacy || (chapter._id && !isCompletedUid))) {
             if (!isCompletedLegacy) progress.completedChapters.push(chapterId)
             await unlockNext(progress, chapterId)
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

// Get user's best submission for a problem
router.get('/submission/best', authenticateToken, async (req, res) => {
  try {
    const { domainId, docId } = req.query
    const userId = req.user.id
    
    if (!docId) return res.status(400).json({ error: 'Missing docId' })

    const query = { 
        uid: userId, 
        pid: isNaN(docId) ? docId : Number(docId), 
        status: 1 // Accepted
    }
    if (domainId) query.domainId = domainId

    // Find the latest AC submission
    const submission = await Submission.findOne(query).sort({ submitAt: -1 })
    
    if (submission) {
        return res.json({ code: submission.code })
    } else {
        return res.json({ code: null })
    }
  } catch (e) {
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

// Move a Topic
router.put('/levels/:id/topics/:topicId/move', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { direction } = req.body // 'up' or 'down'
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    
    const index = level.topics.indexOf(topic)
    if (index === -1) return res.status(404).json({ error: 'Topic not found in array' })
    
    if (direction === 'up') {
      if (index > 0) {
        level.topics.splice(index, 1)
        level.topics.splice(index - 1, 0, topic)
      }
    } else if (direction === 'down') {
      if (index < level.topics.length - 1) {
        level.topics.splice(index, 1)
        level.topics.splice(index + 1, 0, topic)
      }
    }
    
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
    const { id, title, content, contentType, resourceUrl, problemIds, optional, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const resolvedIds = await resolveProblemIds(problemIds || [])
    
    const newChapter = { 
      id, 
      title, 
      content, 
      contentType: contentType || 'markdown',
      resourceUrl: resourceUrl || '',
      problemIds: resolvedIds, 
      optional: !!optional 
    }

    let targetIndex = -1;
    if (insertIndex !== undefined && insertIndex !== null) {
        const parsed = Number(insertIndex);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= topic.chapters.length) {
            targetIndex = parsed;
        }
    }

    if (targetIndex !== -1) {
      topic.chapters.splice(targetIndex, 0, newChapter)
    } else {
      topic.chapters.push(newChapter)
    }

    // Auto-renumber chapters
    const topicIndex = level.topics.findIndex(t => t._id.equals(topic._id))
    if (topicIndex !== -1) {
        const prefix = `${level.level}-${topicIndex + 1}`
        level.topics[topicIndex].chapters.forEach((ch, idx) => {
            ch.id = `${prefix}-${idx + 1}`
        })
        level.markModified('topics');
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Chapter in a Topic
router.put('/levels/:id/topics/:topicId/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, content, contentType, resourceUrl, problemIds, optional } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const chapter = topic.chapters.id(req.params.chapterId) // Use .id() for subdocument search by _id
    
    let targetChapter = topic.chapters.id(req.params.chapterId)
    if (!targetChapter) {
       targetChapter = topic.chapters.find(c => c.id === req.params.chapterId)
    }
    
    if (!targetChapter) return res.status(404).json({ error: 'Chapter not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])

    targetChapter.title = title
    targetChapter.content = content
    targetChapter.contentType = contentType || 'markdown'
    targetChapter.resourceUrl = resourceUrl || ''
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
        topic.chapters.pull(req.params.chapterId)
    } else {
        // Filter out by string ID
        const initialLen = topic.chapters.length
        topic.chapters = topic.chapters.filter(c => c.id !== req.params.chapterId)
        if (topic.chapters.length === initialLen) return res.status(404).json({ error: 'Chapter not found' })
    }

    // Auto-renumber chapters
    const topicIndex = level.topics.findIndex(t => t._id.equals(topic._id))
    if (topicIndex !== -1) {
        const prefix = `${level.level}-${topicIndex + 1}`
        level.topics[topicIndex].chapters.forEach((ch, idx) => {
            ch.id = `${prefix}-${idx + 1}`
        })
        level.markModified('topics');
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Move a Chapter in a Topic
router.put('/levels/:id/topics/:topicId/chapters/:chapterId/move', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { direction } = req.body // 'up' or 'down'
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const chapterIndex = topic.chapters.findIndex(c => c.id === req.params.chapterId || (c._id && c._id.toString() === req.params.chapterId))
    if (chapterIndex === -1) return res.status(404).json({ error: 'Chapter not found' })

    if (direction === 'up') {
      if (chapterIndex > 0) {
        const temp = topic.chapters[chapterIndex]
        topic.chapters.splice(chapterIndex, 1)
        topic.chapters.splice(chapterIndex - 1, 0, temp)
      }
    } else if (direction === 'down') {
      if (chapterIndex < topic.chapters.length - 1) {
        const temp = topic.chapters[chapterIndex]
        topic.chapters.splice(chapterIndex, 1)
        topic.chapters.splice(chapterIndex + 1, 0, temp)
      }
    }

    // Auto-renumber chapters
    const topicIndex = level.topics.findIndex(t => t._id.equals(topic._id))
    if (topicIndex !== -1) {
        const prefix = `${level.level}-${topicIndex + 1}`
        topic.chapters.forEach((ch, idx) => {
            ch.id = `${prefix}-${idx + 1}`
        })
        level.markModified('topics');
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
    const { id, title, content, contentType, resourceUrl, problemIds, optional, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])
    
    const newChapter = { 
      id, 
      title, 
      content, 
      contentType: contentType || 'markdown',
      resourceUrl: resourceUrl || '',
      problemIds: resolvedIds, 
      optional: !!optional 
    }

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
    const { title, content, contentType, resourceUrl, problemIds, optional } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const chapter = level.chapters.find(c => c.id === req.params.chapterId)
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    
    const resolvedIds = await resolveProblemIds(problemIds || [])

    chapter.title = title
    chapter.content = content
    chapter.contentType = contentType || 'markdown'
    chapter.resourceUrl = resourceUrl || ''
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

// Upload generated courseware (HTML)
router.post('/upload-courseware', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { htmlContent, level, topicTitle, chapterTitle, filename } = req.body
    if (!htmlContent) return res.status(400).json({ error: 'Missing content' })

    let relativePath = ''
    let fullPath = ''

    // Helper to sanitize filenames
    const sanitize = (str) => str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '')

    if (level && topicTitle && chapterTitle) {
        // New structure: /public/courseware/level{N}/{topic}/{chapter}.html
        const safeLevel = 'level' + sanitize(String(level))
        const safeTopic = sanitize(topicTitle)
        const safeChapter = sanitize(chapterTitle) + '.html'
        
        const baseDir = path.join(process.cwd(), 'server', 'public', 'courseware')
        const targetDir = path.join(baseDir, safeLevel, safeTopic)
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
        }
        
        fullPath = path.join(targetDir, safeChapter)
        relativePath = `/public/courseware/${safeLevel}/${safeTopic}/${safeChapter}`
    } else {
        // Fallback to old behavior
        const safeFilename = (filename ? sanitize(filename) : 'generated') + '_' + Date.now() + '.html'
        const publicDir = path.join(process.cwd(), 'server', 'public', 'courseware', 'generated')
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true })
        }
    
        fullPath = path.join(publicDir, safeFilename)
        relativePath = `/public/courseware/generated/${safeFilename}`
    }

    fs.writeFileSync(fullPath, htmlContent, 'utf8')

    res.json({ url: relativePath })
  } catch (e) {
    console.error('Upload Courseware Error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
