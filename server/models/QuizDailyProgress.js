import mongoose from 'mongoose'
import { appConn } from '../db.js'

const quizDailyProgressSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  date: { type: String, required: true },
  subject: { type: String, default: 'C++' },
  source: { type: String, required: true, default: 'gesp' },
  answeredCount: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  firstAnsweredAt: { type: Date, default: null },
  lastAnsweredAt: { type: Date, default: null },
  questionUids: { type: [String], default: [] },
  skippedQuestionUids: { type: [String], default: [] }
}, {
  timestamps: true,
  collection: 'quiz_daily_progress'
})

quizDailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true })
quizDailyProgressSchema.index({ date: 1, completed: 1 })
quizDailyProgressSchema.index({ date: 1, correctCount: -1 })

export default appConn.model('QuizDailyProgress', quizDailyProgressSchema)