import mongoose from 'mongoose'
import { appConn } from '../db.js'

const quizFavoriteItemSchema = new mongoose.Schema({
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
  lastCollectedAt: { type: Date, default: Date.now },
  removedAt: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'quiz_favorite_items'
})

quizFavoriteItemSchema.index({ userId: 1, questionUid: 1 }, { unique: true })
quizFavoriteItemSchema.index({ userId: 1, active: 1, lastCollectedAt: -1 })
quizFavoriteItemSchema.index({ userId: 1, levelTag: 1, active: 1 })
quizFavoriteItemSchema.index({ userId: 1, tags: 1, active: 1 })

export default appConn.model('QuizFavoriteItem', quizFavoriteItemSchema)