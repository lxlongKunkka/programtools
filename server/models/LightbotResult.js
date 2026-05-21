import mongoose from 'mongoose'
import { appConn } from '../db.js'

/**
 * 关卡完成记录（排行榜数据）
 * 每位用户每关只保留最优成绩（upsert 策略）
 * 排名规则：totalCommands 升序 → executionSteps 升序 → completedAt 升序
 */
const schema = new mongoose.Schema({
  userId:         { type: Number, required: true },
  username:       { type: String, required: true },
  levelId:        { type: String, required: true },
  totalCommands:  { type: Number, required: true }, // main + f1 + f2 顶层积木总数
  executionSteps: { type: Number, required: true }, // 机器人实际动作步数 (move/turn/jump/pickup)
  completedAt:    { type: Date, default: Date.now },
})

// 排行榜查询索引
schema.index({ levelId: 1, totalCommands: 1, executionSteps: 1, completedAt: 1 })
// 每人每关唯一记录
schema.index({ userId: 1, levelId: 1 }, { unique: true })

export default appConn.model('LightbotResult', schema)
