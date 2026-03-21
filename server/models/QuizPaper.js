import mongoose from 'mongoose'
import { appConn } from '../db.js'

const quizPaperSchema = new mongoose.Schema({
  paperUid: { type: String, required: true, unique: true },
  source: { type: String, required: true, default: 'gesp' },
  sourceDomainId: { type: String, required: true, default: 'gesp' },
  sourceDocId: { type: Number, required: true },
  title: { type: String, required: true },
  year: { type: Number },
  month: { type: Number },
  subject: { type: String, default: 'C++' },
  level: { type: Number },
  paperType: { type: String, default: 'exam' },
  rawContentZh: { type: String, default: '' },
  questionCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true,
  collection: 'quiz_papers'
})

quizPaperSchema.index({ source: 1, sourceDocId: 1 }, { unique: true })
quizPaperSchema.index({ year: 1, month: 1, subject: 1, level: 1 })
quizPaperSchema.index({ status: 1 })

export default appConn.model('QuizPaper', quizPaperSchema)