import mongoose from 'mongoose'
import { appConn } from '../db.js'

const lightbotResultSchema = new mongoose.Schema({
  levelId: { type: String, required: true, index: true },
  isCustomLevel: { type: Boolean, default: false },
  levelTitle: { type: String, required: true, maxlength: 80 },
  userId: { type: Number, required: true, index: true },
  username: { type: String, required: true, maxlength: 80 },
  totalCommands: { type: Number, required: true, min: 1 },
  mainLength: { type: Number, required: true, min: 0 },
  p1Length: { type: Number, default: 0, min: 0 },
  executionSteps: { type: Number, required: true, min: 1 },
  completedAt: { type: Date, default: Date.now, index: true }
}, {
  collection: 'lightbot_results'
})

lightbotResultSchema.index({ levelId: 1, totalCommands: 1, executionSteps: 1, completedAt: 1 })
lightbotResultSchema.index({ levelId: 1, userId: 1, totalCommands: 1, executionSteps: 1, completedAt: 1 })

export default appConn.model('LightbotResult', lightbotResultSchema)