import mongoose from 'mongoose'
import { appConn } from '../db.js'

const ponyPuzzleProfileSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  coins: { type: Number, default: 80 },
  totalCoinsEarned: { type: Number, default: 0 },
  totalCoinsSpent: { type: Number, default: 0 },
  energy: { type: Number, default: 120 },
  energyMax: { type: Number, default: 120 },
  lastEnergyAt: { type: Date, default: Date.now },
  unlockedLevel: { type: Number, default: 1 },
  completedLevels: { type: [Number], default: [] },
  bestRecords: {
    type: Map,
    of: new mongoose.Schema({
      timeElapsed: Number,
      hintsUsed: Number,
      completedAt: Date
    }, { _id: false }),
    default: {}
  }
}, { timestamps: true })

export default appConn.model('PonyPuzzleProfile', ponyPuzzleProfileSchema)