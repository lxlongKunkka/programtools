import mongoose from 'mongoose'
import { appConn } from '../db.js'

const quizAttemptSchema = new mongoose.Schema({
  attemptUid: { type: String, required: true, unique: true },
  userId: { type: Number, required: true },
  questionUid: { type: String, required: true },
  paperUid: { type: String, default: '' },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  answeredAt: { type: Date, default: Date.now },
  costMs: { type: Number, default: null },
  mode: {
    type: String,
    enum: ['daily', 'practice', 'wrongbook', 'mock'],
    default: 'practice'
  },
  sessionDate: { type: String, default: '' },
  subject: { type: String, default: 'C++' },
  levelTag: { type: String, default: '' },
  tags: { type: [String], default: [] },
  source: { type: String, required: true, default: 'gesp' }
}, {
  timestamps: true,
  collection: 'quiz_attempts'
})

quizAttemptSchema.index({ userId: 1, answeredAt: -1 })
quizAttemptSchema.index({ userId: 1, questionUid: 1 })
quizAttemptSchema.index({ questionUid: 1, answeredAt: -1 })
quizAttemptSchema.index({ sessionDate: 1, userId: 1 })
quizAttemptSchema.index({ mode: 1, sessionDate: 1 })

export default appConn.model('QuizAttempt', quizAttemptSchema)