import mongoose from 'mongoose'
import { appConn } from '../db.js'

const schema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    username: { type: String, required: true },
    levelId: { type: String, required: true }, // custom-xxx format
    title: { type: String, default: '未命名关卡', maxlength: 100 },
    content: { type: String, required: true }, // JSON string of the level
    isPublished: { type: Boolean, default: false },
    solutionSteps: { type: Number, default: 0 }, // 通关验证的执行步数，≥1 表示有解
  },
  { timestamps: true }
)

// 每个用户的每个 levelId 唯一
schema.index({ userId: 1, levelId: 1 }, { unique: true })

export default appConn.model('CodebotUserLevel', schema, 'lightbotuserlevels')
