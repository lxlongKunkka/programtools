import mongoose from 'mongoose'
import { appConn } from '../db.js'

const ponyPuzzleSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: Number, required: true, index: true },
  levelId: { type: Number, required: true, index: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'abandoned'],
    default: 'active'
  },
  remainingMistakes: { type: Number, default: 3 },
  strikeCount: { type: Number, default: 0 },
  hintCount: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  timeElapsed: { type: Number, default: 0 }
}, { timestamps: true })

export default appConn.model('PonyPuzzleSession', ponyPuzzleSessionSchema)