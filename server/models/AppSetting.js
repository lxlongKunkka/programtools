import mongoose from 'mongoose'

const appSettingSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  gamesEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'app_settings',
  versionKey: false
})

const AppSetting = mongoose.model('AppSetting', appSettingSchema)

export default AppSetting
