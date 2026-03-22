import mongoose from 'mongoose'
import { appConn } from '../db.js'

const quizWrongbookItemSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  questionUid: { type: String, required: true },
  paperUid: { type: String, default: '' },
  source: { type: String, required: true, default: 'gesp' },
  sourceTitle: { type: String, default: '' },
  subject: { type: String, default: 'C++' },
  levelTag: { type: String, default: '' },
  tags: { type: [String], default: [] },
  type: {
    type: String,
    enum: ['single', 'judge'],
    default: 'single'
  },
  active: { type: Boolean, default: true },
  wrongCount: { type: Number, default: 0 },
  lastWrongAnswer: { type: String, default: '' },
  lastWrongAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  removedAt: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'quiz_wrongbook_items'
})

quizWrongbookItemSchema.index({ userId: 1, questionUid: 1 }, { unique: true })
quizWrongbookItemSchema.index({ userId: 1, active: 1, lastWrongAt: -1 })
quizWrongbookItemSchema.index({ userId: 1, levelTag: 1, active: 1 })
quizWrongbookItemSchema.index({ userId: 1, tags: 1, active: 1 })

export default appConn.model('QuizWrongbookItem', quizWrongbookItemSchema)