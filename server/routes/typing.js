import express from 'express'
import TypingResult from '../models/TypingResult.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Save typing result
router.post('/results', async (req, res) => {
  try {
    const { username, wpm, accuracy, timeElapsed } = req.body
    // Optional: get userId from token if available, but for now let's trust the client or just use username
    // If we want to link to user, we should use authenticateToken middleware optionally
    
    const result = new TypingResult({
      username: username || 'Guest',
      wpm,
      accuracy,
      timeElapsed
    })
    await result.save()
    res.status(201).json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type } = req.query // 'speed', 'accuracy', 'volume'
    
    let results = []
    
    if (type === 'speed') {
      // Top 20 by WPM
      results = await TypingResult.find()
        .sort({ wpm: -1 })
        .limit(20)
        .select('username wpm accuracy timeElapsed createdAt')
    } else if (type === 'accuracy') {
      // Top 20 by Accuracy (and reasonable speed, e.g. > 10 WPM to avoid cheating with 1 word)
      results = await TypingResult.find({ wpm: { $gt: 10 } })
        .sort({ accuracy: -1, wpm: -1 })
        .limit(20)
        .select('username wpm accuracy timeElapsed createdAt')
    } else if (type === 'volume') {
      // Top 20 by count of practices
      results = await TypingResult.aggregate([
        {
          $group: {
            _id: "$username",
            count: { $sum: 1 },
            avgWpm: { $avg: "$wpm" }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
      // Map to consistent format
      results = results.map(r => ({
        username: r._id,
        count: r.count,
        wpm: Math.round(r.avgWpm)
      }))
    } else {
      // Default to speed
      results = await TypingResult.find()
        .sort({ wpm: -1 })
        .limit(20)
        .select('username wpm accuracy timeElapsed createdAt')
    }
    
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
