import mongoose from 'mongoose'
import { appConn } from '../db.js'

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

  // Store unlocked chapter IDs (e.g., "1-1", "1-2") - LEGACY / DISPLAY
  unlockedChapters: { type: [String], default: ['1-1'] },
  // Store completed chapter IDs - LEGACY / DISPLAY
  completedChapters: { type: [String], default: [] },

  // NEW: Store immutable MongoDB _ids for robustness
  unlockedChapterUids: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  completedChapterUids: { type: [mongoose.Schema.Types.ObjectId], default: [] },

  // Track solved problems per chapter to avoid re-solving
  // Map chapterId (String) -> { solvedProblems: [String] }
  // Note: We keep using String ID for map keys for now to avoid complex migration of Map keys, 
  // but we should rely on Uids for completion status.
  chapterProgress: {
    type: Map,
    of: new mongoose.Schema({
      solvedProblems: [String]
    }, { _id: false }),
    default: {}
  }
})

export default appConn.model('UserProgress', userProgressSchema)
