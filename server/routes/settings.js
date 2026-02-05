import express from 'express'
import AppSetting from '../models/AppSetting.js'

const router = express.Router()

router.get('/settings', async (req, res) => {
  try {
    let settings = await AppSetting.findById('global').lean()
    if (!settings) {
      settings = await AppSetting.create({ _id: 'global', gamesEnabled: true, updatedAt: new Date() })
    }
    res.json({ gamesEnabled: settings.gamesEnabled !== false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
