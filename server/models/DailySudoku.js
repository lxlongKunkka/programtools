import mongoose from 'mongoose'
import { appConn } from '../db.js'

const dailySudokuSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  puzzle: { type: String, required: true },
  solution: { type: String, required: true },
  difficulty: { type: String, default: 'hard' },
  size: { type: Number, default: 9 }
})

export default appConn.model('DailySudoku', dailySudokuSchema)
