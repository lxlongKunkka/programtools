import mongoose from 'mongoose'
import { appConn } from '../db.js'

const parentDailyShareSchema = new mongoose.Schema({
  teacherId: { type: Number, required: true },
  learnerId: { type: Number, required: true },
  token: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  lastAccessAt: { type: Date, default: null },
  accessCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'parent_daily_shares'
})

parentDailyShareSchema.index({ teacherId: 1, learnerId: 1 }, { unique: true })
parentDailyShareSchema.index({ token: 1 }, { unique: true })

export default appConn.model('ParentDailyShare', parentDailyShareSchema)