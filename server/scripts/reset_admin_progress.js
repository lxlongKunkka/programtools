import mongoose from 'mongoose'
import UserProgress from '../models/UserProgress.js'
import { MONGODB_URI } from '../config.js'

async function resetProgress() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const userId = 2
    const progress = await UserProgress.findOne({ userId })

    if (!progress) {
      console.log('User progress not found for user ID:', userId)
      return
    }

    console.log('Found progress for user ID:', userId)
    console.log('Before reset:')
    console.log('- Unlocked Chapters:', progress.unlockedChapters.length)
    console.log('- Completed Chapters:', progress.completedChapters.length)

    // Reset fields
    progress.unlockedChapters = []
    progress.completedChapters = []
    progress.unlockedChapterUids = []
    progress.completedChapterUids = []
    progress.chapterProgress = {}
    
    // We can keep subjectLevels as is, or reset C++ to 1 if needed. 
    // Let's keep the level at 1 for C++ just in case.
    if (progress.subjectLevels) {
        progress.subjectLevels.set('C++', 1)
    }

    await progress.save()

    console.log('Progress reset successfully.')
    console.log('Next time the user visits the course page, only the first chapter will be unlocked.')

  } catch (e) {
    console.error('Error:', e)
  } finally {
    await mongoose.disconnect()
  }
}

resetProgress()
