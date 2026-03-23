import mongoose from 'mongoose'
import { appConn } from '../db.js'

const ISSUE_TYPES = [
  'wrong_answer',
  'wrong_explanation',
  'wrong_options',
  'ambiguous',
  'formatting',
  'other'
]

const ISSUE_STATUSES = [
  'pending',
  'reviewing',
  'resolved',
  'ignored'
]

const quizQuestionIssueSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  reporterName: { type: String, default: '' },
  questionUid: { type: String, required: true },
  paperUid: { type: String, default: '' },
  source: { type: String, required: true, default: 'gesp' },
  sourceTitle: { type: String, default: '' },
  sourceDocId: { type: Number, default: null },
  paperQuestionNo: { type: Number, default: null },
  subject: { type: String, default: 'C++' },
  levelTag: { type: String, default: '' },
  tags: { type: [String], default: [] },
  type: {
    type: String,
    enum: ['single', 'judge'],
    default: 'single'
  },
  stemPreview: { type: String, default: '' },
  issueType: {
    type: String,
    enum: ISSUE_TYPES,
    default: 'other'
  },
  detail: { type: String, default: '' },
  status: {
    type: String,
    enum: ISSUE_STATUSES,
    default: 'pending'
  },
  adminNote: { type: String, default: '' },
  reportedAt: { type: Date, default: Date.now },
  handledAt: { type: Date, default: null },
  handledBy: { type: Number, default: null },
  handledByName: { type: String, default: '' }
}, {
  timestamps: true,
  collection: 'quiz_question_issues'
})

quizQuestionIssueSchema.index({ userId: 1, questionUid: 1 }, { unique: true })
quizQuestionIssueSchema.index({ status: 1, reportedAt: -1 })
quizQuestionIssueSchema.index({ questionUid: 1, status: 1 })
quizQuestionIssueSchema.index({ source: 1, levelTag: 1, status: 1 })

export { ISSUE_TYPES, ISSUE_STATUSES }
export default appConn.model('QuizQuestionIssue', quizQuestionIssueSchema)