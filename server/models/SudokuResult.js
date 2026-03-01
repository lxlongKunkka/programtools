import mongoose from 'mongoose'
import { appConn } from '../db.js'

const sudokuResultSchema = new mongoose.Schema({
  userId: { type: Number, ref: 'User', required: true },
  username: { type: String, required: true },
  difficulty: { type: String, required: true }, // 'easy', 'medium', 'hard', 'expert'
  size: { type: Number, required: true }, // 4, 6, 9
  timeElapsed: { type: Number, required: true }, // seconds
  mistakes: { type: Number, default: 0 },
  isDaily: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

// Index for faster leaderboard queries
sudokuResultSchema.index({ size: 1, difficulty: 1, timeElapsed: 1 })
sudokuResultSchema.index({ isDaily: 1, createdAt: 1 })

export default appConn.model('SudokuResult', sudokuResultSchema)
