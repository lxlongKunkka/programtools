import mongoose from 'mongoose'
import { appConn } from '../db.js'

const quizOptionSchema = new mongoose.Schema({
  key: { type: String, required: true },
  text: { type: String, required: true },
  textPlain: { type: String, default: '' },
  images: { type: [String], default: [] }
}, { _id: false })

const quizQuestionSchema = new mongoose.Schema({
  questionUid: { type: String, required: true, unique: true },
  paperUid: { type: String, required: true },
  source: { type: String, required: true, default: 'gesp' },
  sourceDomainId: { type: String, required: true, default: 'gesp' },
  sourceDocId: { type: Number, required: true },
  paperQuestionNo: { type: Number, required: true },
  type: {
    type: String,
    required: true,
    enum: ['single', 'judge']
  },
  stem: { type: String, required: true },
  stemText: { type: String, default: '' },
  options: { type: [quizOptionSchema], default: [] },
  answer: { type: String, required: true },
  explanation: { type: String, default: '' },
  explanationText: { type: String, default: '' },
  images: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  levelTag: { type: String, default: '' },
  subject: { type: String, default: 'C++' },
  difficulty: { type: Number, default: null },
  sourceTitle: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  reviewStatus: {
    type: String,
    enum: ['pending', 'reviewed', 'rejected'],
    default: 'pending'
  },
  stats: {
    totalAttempts: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    totalWrong: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'quiz_questions'
})

quizQuestionSchema.index({ paperUid: 1, paperQuestionNo: 1 }, { unique: true })
quizQuestionSchema.index({ enabled: 1, type: 1, levelTag: 1 })
quizQuestionSchema.index({ tags: 1 })
quizQuestionSchema.index({ stemText: 'text' })
quizQuestionSchema.index({ source: 1, sourceDocId: 1, paperQuestionNo: 1 })

export default appConn.model('QuizQuestion', quizQuestionSchema)