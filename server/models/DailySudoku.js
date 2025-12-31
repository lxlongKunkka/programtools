import mongoose from 'mongoose'

const dailySudokuSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  puzzle: { type: String, required: true },
  solution: { type: String, required: true },
  difficulty: { type: String, default: 'hard' },
  size: { type: Number, default: 9 }
})

export default mongoose.model('DailySudoku', dailySudokuSchema)
