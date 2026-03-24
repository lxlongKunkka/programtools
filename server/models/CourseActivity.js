import mongoose from 'mongoose'
import { appConn } from '../db.js'

const courseActivitySchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  action: {
    type: String,
    enum: ['view_chapter', 'complete_chapter', 'pass_problem'],
    required: true,
    index: true
  },
  sessionDate: { type: String, required: true, index: true },
  chapterId: { type: String, required: true, index: true },
  chapterUid: { type: mongoose.Schema.Types.ObjectId, default: null },
  chapterTitle: { type: String, default: '' },
  topicTitle: { type: String, default: '' },
  levelId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  level: { type: Number, default: 0 },
  levelTitle: { type: String, default: '' },
  group: { type: String, default: '' },
  subject: { type: String, default: 'C++' },
  problemId: { type: String, default: '' },
  metadata: { type: Object, default: {} },
  lastActiveAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'course_activities'
})

courseActivitySchema.index({ userId: 1, sessionDate: -1, lastActiveAt: -1 })
courseActivitySchema.index({ userId: 1, chapterId: 1, action: 1, sessionDate: 1 }, { unique: true })

export default appConn.model('CourseActivity', courseActivitySchema)