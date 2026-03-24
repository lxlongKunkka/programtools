import mongoose from 'mongoose'
import { appConn } from '../db.js'

const teacherQuizFollowSchema = new mongoose.Schema({
  teacherId: { type: Number, required: true },
  learnerId: { type: Number, required: true },
  note: { type: String, default: '' }
}, {
  timestamps: true,
  collection: 'teacher_quiz_follows'
})

teacherQuizFollowSchema.index({ teacherId: 1, learnerId: 1 }, { unique: true })
teacherQuizFollowSchema.index({ teacherId: 1, createdAt: -1 })

export default appConn.model('TeacherQuizFollow', teacherQuizFollowSchema)