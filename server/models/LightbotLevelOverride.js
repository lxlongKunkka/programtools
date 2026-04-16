import mongoose from 'mongoose'
import { appConn } from '../db.js'

const lightbotTipSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 80 },
  copy: { type: String, required: true, maxlength: 240 }
}, { _id: false })

const lightbotStartSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  dir: { type: String, required: true, enum: ['forward', 'right', 'backward', 'left'] }
}, { _id: false })

const lightbotDemoSchema = new mongoose.Schema({
  main: { type: [mongoose.Schema.Types.Mixed], default: [] },
  p1: { type: [mongoose.Schema.Types.Mixed], default: [] },
  p2: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { _id: false })

const lightbotLevelOverrideSchema = new mongoose.Schema({
  levelId: { type: String, required: true, unique: true, index: true },
  isCustom: { type: Boolean, default: false, index: true },
  chapterId: { type: String, required: true },
  chapterTitle: { type: String, required: true },
  chapterOrder: { type: Number, required: true },
  title: { type: String, required: true, maxlength: 80 },
  skill: { type: String, required: true, maxlength: 40 },
  description: { type: String, required: true, maxlength: 240 },
  goal: { type: String, required: true, maxlength: 240 },
  mainLimit: { type: Number, required: true, min: 1, max: 40 },
  procLimits: {
    type: new mongoose.Schema({
      p1: { type: Number, default: 0, min: 0, max: 20 },
      p2: { type: Number, default: 0, min: 0, max: 20 }
    }, { _id: false }),
    default: () => ({})
  },
  tips: { type: [lightbotTipSchema], default: [] },
  board: { type: [[mongoose.Schema.Types.Mixed]], required: true },
  start: { type: lightbotStartSchema, required: true },
  demo: { type: lightbotDemoSchema, default: () => ({ main: [], p1: [] }) },
  createdBy: { type: Number, default: null },
  createdByName: { type: String, default: null, maxlength: 80 },
  updatedBy: { type: Number, required: true },
  updatedByName: { type: String, required: true, maxlength: 80 },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Number, default: null },
  deletedByName: { type: String, default: null, maxlength: 80 }
}, {
  timestamps: true,
  collection: 'lightbot_level_overrides'
})

export default appConn.model('LightbotLevelOverride', lightbotLevelOverrideSchema)