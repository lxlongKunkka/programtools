import express from 'express'
import AppSetting from '../models/AppSetting.js'

const router = express.Router()

router.get('/settings', async (req, res) => {
  try {
    const settings = await AppSetting.findById('global').lean()
    // 未找到时返回默认值，不写入 DB（避免 GET 有写入副作用）
    res.json({ gamesEnabled: settings ? settings.gamesEnabled !== false : true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
