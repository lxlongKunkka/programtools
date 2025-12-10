import mongoose from 'mongoose'

const userProgressSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  currentLevel: { type: Number, default: 1 }, // Legacy: Global level (mapped to C++)
  
  // Track current level per subject
  // e.g., { "C++": 6, "Python": 1 }
  subjectLevels: {
    type: Map,
    of: Number,
    default: {}
  },

  // Store unlocked chapter IDs (e.g., "1-1", "1-2")
  unlockedChapters: { type: [String], default: ['1-1'] },
  // Store completed chapter IDs
  completedChapters: { type: [String], default: [] },
  // Track solved problems per chapter to avoid re-solving
  // Map chapterId -> { solvedProblems: [String] }
  chapterProgress: {
    type: Map,
    of: new mongoose.Schema({
      solvedProblems: [String]
    }, { _id: false }),
    default: {}
  }
})

export default mongoose.model('UserProgress', userProgressSchema)
