import mongoose from 'mongoose'
import { appConn } from '../db.js'

const dailyProblemSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  camp: { type: String, required: true, enum: ['A', 'B', 'C'], default: 'A' }, // A, B, C
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  docId: { type: Number, required: true }, // Redundant for easy access
  title: { type: String, required: true },
  domainId: { type: String },
  tag: { type: [String], default: [] }, // Added tags
  subject: { type: String, default: 'C++' }
})

// Compound index to ensure one problem per camp per day
dailyProblemSchema.index({ date: 1, camp: 1 }, { unique: true })

export default appConn.model('DailyProblem', dailyProblemSchema)
