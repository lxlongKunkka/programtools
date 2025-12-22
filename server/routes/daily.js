import express from 'express'
import mongoose from 'mongoose'
import DailyProblem from '../models/DailyProblem.js'
import Document from '../models/Document.js'
import CourseLevel from '../models/CourseLevel.js'
import Submission from '../models/Submission.js'
import User from '../models/User.js'
import { authenticateToken } from '../middleware/auth.js'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config.js'

const router = express.Router()

// Helper to get today's date string YYYY-MM-DD (UTC+8)
const getTodayDate = () => {
  const now = new Date()
  const offset = 8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const nd = new Date(utc + (3600000 * offset))
  return nd.toISOString().split('T')[0]
}

// Helper to get or generate daily problem for a camp
const getOrGenerateDaily = async (camp, today) => {
  let daily = await DailyProblem.findOne({ date: today, camp })
  if (daily) return daily

  const domainMap = {
    'A': 'gymA',
    'B': 'gymB',
    'C': 'gymC'
  }
  const targetDomain = domainMap[camp]
  
  // 1. Get ALL candidate documents sorted by docId (Do not filter by startDocId here)
  const query = { 
    domainId: targetDomain, 
    docId: { $exists: true, $ne: null } 
  }
  
  const candidates = await Document.find(query)
    .select('docId title domainId tag')
    .sort({ docId: 1 })
    .lean()

  if (candidates.length === 0) return null

  // 2. Find the most recent daily problem for this camp
  const lastDaily = await DailyProblem.findOne({ camp, date: { $lt: today } })
    .sort({ date: -1 })
  
  let nextDoc = null

  if (lastDaily) {
      // Strategy: Find the problem immediately following the last one
      // If lastDaily.docId was 100, we want the smallest docId > 100.
      // If no docId > 100 exists, we wrap around to the smallest docId available (e.g. 1).
      
      const nextAfter = candidates.find(d => d.docId > lastDaily.docId)
      if (nextAfter) {
          nextDoc = nextAfter
      } else {
          // Wrap around to the beginning
          nextDoc = candidates[0]
      }
  } else {
      // First time initialization
      // A/B start from 37, C starts from 1
      const startDocId = (camp === 'C') ? 1 : 37
      
      // Find first problem >= startDocId
      const startDoc = candidates.find(d => d.docId >= startDocId)
      
      if (startDoc) {
          nextDoc = startDoc
      } else {
          // If no problem >= 37 exists (e.g. max is 20), just start from the beginning
          nextDoc = candidates[0]
      }
  }

  if (!nextDoc) return null // Should not happen if candidates.length > 0

  daily = new DailyProblem({
    date: today,
    camp,
    problemId: nextDoc._id,
    docId: nextDoc.docId,
    title: nextDoc.title || 'Untitled Problem',
    domainId: nextDoc.domainId,
    tag: nextDoc.tag || []
  })

  try {
    await daily.save()
  } catch (saveError) {
    if (saveError.code === 11000) {
      daily = await DailyProblem.findOne({ date: today, camp })
    } else {
      throw saveError
    }
  }
  
  return daily
}

// Get stats (Today's participation and Leaderboard)
router.get('/stats', async (req, res) => {
  try {
    const today = getTodayDate()
    
    // 1. Get Today's Problems
    const todayProblems = await DailyProblem.find({ date: today })
    const todayPids = []
    
    todayProblems.forEach(p => {
      if (p.docId) {
        todayPids.push({ pid: p.docId, domainId: p.domainId })
      }
    })

    // 2. Get Today's Participation
    let todayStats = []
    if (todayPids.length > 0) {
        const todayOrQuery = todayPids.map(p => ({ pid: p.pid, domainId: p.domainId }))
        
        const todaySubmissions = await Submission.aggregate([
            { $match: { status: 1, $or: todayOrQuery } },
            { $group: { _id: '$uid', solved: { $addToSet: { pid: '$pid', domainId: '$domainId' } } } }
        ])
        
        if (todaySubmissions.length > 0) {
            const uids = todaySubmissions.map(s => s._id)
            const users = await User.find({ _id: { $in: uids } }, 'uname avatar')
            const userMap = {}
            users.forEach(u => userMap[u._id] = u)
            
            todayStats = todaySubmissions.map(s => {
                const u = userMap[s._id]
                return {
                    uid: s._id,
                    uname: u ? u.uname : 'Unknown',
                    avatar: u ? u.avatar : null,
                    count: s.solved.length,
                    solved: s.solved
                }
            }).sort((a, b) => b.count - a.count)
        }
    }

    // 3. Leaderboard (All Time)
    const allDaily = await DailyProblem.find({}, 'docId domainId')
    const uniquePids = []
    const seen = new Set()
    
    allDaily.forEach(p => {
        if (p.docId) {
            const key = `${p.docId}-${p.domainId}`
            if (!seen.has(key)) {
                seen.add(key)
                uniquePids.push({ pid: p.docId, domainId: p.domainId })
            }
        }
    })
    
    let leaderboard = []
    if (uniquePids.length > 0) {
         const leaderboardSubmissions = await Submission.aggregate([
            { $match: { status: 1, $or: uniquePids } },
            { $group: { _id: '$uid', count: { $addToSet: { pid: '$pid', domainId: '$domainId' } } } },
            { $project: { count: { $size: '$count' } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
        
        if (leaderboardSubmissions.length > 0) {
            const lbUids = leaderboardSubmissions.map(s => s._id)
            const lbUsers = await User.find({ _id: { $in: lbUids } }, 'uname avatar')
            const lbUserMap = {}
            lbUsers.forEach(u => lbUserMap[u._id] = u)
            
            leaderboard = leaderboardSubmissions.map(s => ({
                uid: s._id,
                uname: lbUserMap[s._id] ? lbUserMap[s._id].uname : 'Unknown',
                avatar: lbUserMap[s._id] ? lbUserMap[s._id].avatar : null,
                count: s.count
            }))
        }
    }

    // 4. Weekly Leaderboard
    const now = new Date()
    const offset = 8
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const currentClientDate = new Date(utc + (3600000 * offset))
    
    const day = currentClientDate.getDay() || 7 // 1 (Mon) - 7 (Sun)
    currentClientDate.setDate(currentClientDate.getDate() - day + 1)
    const mondayStr = currentClientDate.toISOString().split('T')[0]

    const weeklyProblems = await DailyProblem.find({ date: { $gte: mondayStr } }, 'docId domainId')
    const weeklyPids = []
    const weeklySeen = new Set()
    
    weeklyProblems.forEach(p => {
        if (p.docId) {
            const key = `${p.docId}-${p.domainId}`
            if (!weeklySeen.has(key)) {
                weeklySeen.add(key)
                weeklyPids.push({ pid: p.docId, domainId: p.domainId })
            }
        }
    })

    let weeklyLeaderboard = []
    if (weeklyPids.length > 0) {
         const weeklySubmissions = await Submission.aggregate([
            { $match: { status: 1, $or: weeklyPids } },
            { $group: { _id: '$uid', count: { $addToSet: { pid: '$pid', domainId: '$domainId' } } } },
            { $project: { count: { $size: '$count' } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
        
        if (weeklySubmissions.length > 0) {
            const lbUids = weeklySubmissions.map(s => s._id)
            const lbUsers = await User.find({ _id: { $in: lbUids } }, 'uname avatar')
            const lbUserMap = {}
            lbUsers.forEach(u => lbUserMap[u._id] = u)
            
            weeklyLeaderboard = weeklySubmissions.map(s => ({
                uid: s._id,
                uname: lbUserMap[s._id] ? lbUserMap[s._id].uname : 'Unknown',
                avatar: lbUserMap[s._id] ? lbUserMap[s._id].avatar : null,
                count: s.count
            }))
        }
    }

    // 5. Enrich Today's Stats with Total and Weekly counts
    if (todayStats.length > 0 && uniquePids.length > 0) {
        const uids = todayStats.map(s => s.uid);
        
        // Total Counts for these users
        const totalCounts = await Submission.aggregate([
            { $match: { uid: { $in: uids }, status: 1, $or: uniquePids } },
            { $group: { _id: '$uid', count: { $addToSet: { pid: '$pid', domainId: '$domainId' } } } },
            { $project: { count: { $size: '$count' } } }
        ]);
        const totalMap = {};
        totalCounts.forEach(c => totalMap[c._id] = c.count);

        // Weekly Counts for these users
        let weeklyMap = {};
        if (weeklyPids.length > 0) {
             const weeklyCounts = await Submission.aggregate([
                { $match: { uid: { $in: uids }, status: 1, $or: weeklyPids } },
                { $group: { _id: '$uid', count: { $addToSet: { pid: '$pid', domainId: '$domainId' } } } },
                { $project: { count: { $size: '$count' } } }
            ]);
            weeklyCounts.forEach(c => weeklyMap[c._id] = c.count);
        }

        todayStats = todayStats.map(s => ({
            ...s,
            totalCount: totalMap[s.uid] || 0,
            weeklyCount: weeklyMap[s.uid] || 0
        }));
    }

    res.json({
        today: todayStats,
        leaderboard: leaderboard,
        weeklyLeaderboard: weeklyLeaderboard
    })

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get history (past 7 days)
router.get('/history', async (req, res) => {
  try {
    const today = getTodayDate()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Get user from token if available (optional auth)
    let uid = null
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET)
        uid = user.id
      } catch (err) {
        // Ignore invalid token
      }
    }

    const history = await DailyProblem.find({
      date: { $lt: today, $gte: sevenDaysAgo }
    }).sort({ date: -1, camp: 1 }).lean()
    
    // If user is logged in, check status
    const solvedSet = new Set()
    if (uid && history.length > 0) {
        const orQuery = history
            .filter(p => p.docId)
            .map(p => ({ pid: p.docId, domainId: p.domainId }))
        
        if (orQuery.length > 0) {
            const submissions = await Submission.find({
                uid: uid,
                status: 1,
                $or: orQuery
            }, 'pid domainId')
            
            submissions.forEach(s => {
                solvedSet.add(`${s.pid}-${s.domainId}`)
            })
        }
    }
    
    const grouped = {}
    history.forEach(p => {
      if (!grouped[p.date]) grouped[p.date] = {}
      // Add solved status
      if (p.docId) {
          p.solved = solvedSet.has(`${p.docId}-${p.domainId}`)
      }
      grouped[p.date][p.camp] = p
    })
    
    const result = Object.keys(grouped).sort().reverse().filter(date => {
      const d = new Date(date)
      return d.getUTCDay() !== 0 // Exclude Sunday
    }).map(date => ({
      date,
      problems: grouped[date]
    }))
    
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get all daily problems
router.get('/all', async (req, res) => {
  try {
    const todayStr = getTodayDate()
    const todayDate = new Date(todayStr)
    const dayOfWeek = todayDate.getDay() // 0 is Sunday

    if (dayOfWeek === 0) {
        // Sunday Logic: Return Mon-Sat problems
        const monday = new Date(todayDate)
        // If simulating Sunday on a Monday, we might want to look back at the *current* week or *past* week.
        // Standard logic: Sunday is end of week. Look back 6 days to Monday.
        monday.setDate(todayDate.getDate() - 6)
        const mondayStr = monday.toISOString().split('T')[0]
        
        const saturday = new Date(todayDate)
        saturday.setDate(todayDate.getDate() - 1)
        const saturdayStr = saturday.toISOString().split('T')[0]

        const problems = await DailyProblem.find({
            date: { $gte: mondayStr, $lte: saturdayStr }
        }).sort({ date: 1 }).lean()

        // Check solved status if user is logged in
        let uid = null
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if (token) {
            try {
                const user = jwt.verify(token, JWT_SECRET)
                uid = user.id
            } catch (e) {}
        }

        const solvedSet = new Set()
        if (uid && problems.length > 0) {
             const orQuery = problems
                .filter(p => p.docId)
                .map(p => ({ pid: p.docId, domainId: p.domainId }))
            
            if (orQuery.length > 0) {
                const submissions = await Submission.find({
                    uid,
                    status: 1,
                    $or: orQuery
                }, 'pid domainId')
                submissions.forEach(s => solvedSet.add(`${s.pid}-${s.domainId}`))
            }
        }

        const result = { A: [], B: [], C: [] }
        problems.forEach(p => {
            if (result[p.camp]) {
                p.solved = p.docId ? solvedSet.has(`${p.docId}-${p.domainId}`) : false
                result[p.camp].push(p)
            }
        })

        return res.json({ isSunday: true, problems: result })
    }

    // Normal Day Logic
    const camps = ['A', 'B', 'C']
    const results = {}

    for (const camp of camps) {
      results[camp] = await getOrGenerateDaily(camp, todayStr)
    }

    res.json({ isSunday: false, problems: results })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get today's daily problem
router.get('/today', async (req, res) => {
  try {
    const today = getTodayDate()
    const { camp = 'A' } = req.query
    
    if (!['A', 'B', 'C'].includes(camp)) {
      return res.status(400).json({ error: 'Invalid camp parameter' })
    }

    const daily = await getOrGenerateDaily(camp, today)

    if (!daily) {
      return res.status(404).json({ error: 'No problems available for this camp' })
    }

    res.json(daily)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Check status for all daily problems
router.get('/status-all', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate()
    const camps = ['A', 'B', 'C']
    const results = {}

    for (const camp of camps) {
      const daily = await DailyProblem.findOne({ date: today, camp })
      if (!daily) {
        results[camp] = false
        continue
      }
      const submission = await Submission.findOne({
        uid: req.user.id,
        pid: daily.docId,
        domainId: daily.domainId,
        status: 1
      })
      results[camp] = !!submission
    }

    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Check status for the daily problem
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate()
    const { camp = 'A' } = req.query
    
    const daily = await DailyProblem.findOne({ date: today, camp })
    
    if (!daily) {
      return res.json({ solved: false })
    }

    // Check submission
    // Submission uses 'pid' which matches 'docId'
    // Status 1 means Accepted
    const submission = await Submission.findOne({
      uid: req.user.id,
      pid: daily.docId,
      domainId: daily.domainId,
      status: 1
    })

    res.json({ solved: !!submission })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
