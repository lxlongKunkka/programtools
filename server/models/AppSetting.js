import mongoose from 'mongoose'
import { appConn } from '../db.js'

const appSettingSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  gamesEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'app_settings',
  versionKey: false
})

const AppSetting = appConn.model('AppSetting', appSettingSchema)

export default AppSetting
