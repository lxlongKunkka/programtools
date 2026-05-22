import mongoose from 'mongoose'
import { appConn } from '../db.js'

// 与 lightbot 源码 domain/map/map.types.ts 中的 LevelConfig 保持一致
const schema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g. "swf-01-001"
    title: { type: String, required: true },
    chapter: {
      id: { type: String },
      title: { type: String },
      order: { type: Number },
    },
    teachingGoal: { type: String, default: '' },
    availableBlocks: [{ type: String }],
    grid: { type: mongoose.Schema.Types.Mixed, required: true }, // TileConfig[][]
    robot: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      z: { type: Number, default: 0 },
      direction: { type: String, required: true }, // N E S W
    },
    winCondition: {
      type: { type: String, default: 'all-coins-collected' },
    },
    constraints: {
      maxMainBlocks: Number,
      maxFunctions: Number,
      recommendedSteps: Number,
    },
    hints: [{ type: String }],
    sortOrder: { type: Number, default: 0 }, // 用于排序，导入时设置
  },
  { _id: true }
)

schema.index({ 'chapter.id': 1, sortOrder: 1 })

export default appConn.model('CodebotLevel', schema, 'lightbotlevels')
