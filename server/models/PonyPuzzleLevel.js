import mongoose from 'mongoose'
import { appConn } from '../db.js'

const ponyPuzzleLevelSchema = new mongoose.Schema({
  levelId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  size: { type: Number, required: true },
  regionBoard: { type: [[String]], required: true },
  solutionCells: {
    type: [{ row: Number, col: Number }],
    required: true,
    default: []
  },
  regionCount: { type: Number, required: true },
  rewardCoins: { type: Number, default: 30 },
  difficultyLabel: { type: String, default: 'normal' },
  isSystem: { type: Boolean, default: true }
}, { timestamps: true })

export default appConn.model('PonyPuzzleLevel', ponyPuzzleLevelSchema)