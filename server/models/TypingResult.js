import mongoose from 'mongoose'

const typingResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, required: true },
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  timeElapsed: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('TypingResult', typingResultSchema)
