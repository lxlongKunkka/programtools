import PonyPuzzleProfile from '../models/PonyPuzzleProfile.js'
import PonyPuzzleTransaction from '../models/PonyPuzzleTransaction.js'

export const GAME_ECONOMY_CONFIG = {
  initialCoins: 80,
  energyMax: 120,
  energyCostPerGame: 15,
  energyRecoveryMinutes: 5,
  energyPackAmount: 15,
  energyPackCost: 40,
  hintCost: 25,
  quizCorrectCoins: 5,
  courseProblemCoins: 8,
  courseChapterCoins: 20
}

const ENERGY_RECOVERY_MS = GAME_ECONOMY_CONFIG.energyRecoveryMinutes * 60 * 1000

export async function ensureGameProfile(userId) {
  let profile = await PonyPuzzleProfile.findOne({ userId })
  if (!profile) {
    profile = new PonyPuzzleProfile({
      userId,
      coins: GAME_ECONOMY_CONFIG.initialCoins,
      energy: GAME_ECONOMY_CONFIG.energyMax,
      energyMax: GAME_ECONOMY_CONFIG.energyMax,
      lastEnergyAt: new Date()
    })
    await profile.save()
  }
  return profile
}

export function recoverProfileEnergy(profile, now = new Date()) {
  if (!profile) return false
  const energyMax = Number(profile.energyMax || GAME_ECONOMY_CONFIG.energyMax)
  const currentEnergy = Number(profile.energy || 0)
  if (currentEnergy >= energyMax) {
    profile.energy = energyMax
    profile.lastEnergyAt = now
    return true
  }

  const lastEnergyAt = new Date(profile.lastEnergyAt || now)
  const elapsed = now.getTime() - lastEnergyAt.getTime()
  if (elapsed < ENERGY_RECOVERY_MS) return false

  const recovered = Math.floor(elapsed / ENERGY_RECOVERY_MS)
  if (recovered <= 0) return false

  profile.energy = Math.min(energyMax, currentEnergy + recovered)
  if (profile.energy >= energyMax) {
    profile.lastEnergyAt = now
  } else {
    profile.lastEnergyAt = new Date(lastEnergyAt.getTime() + recovered * ENERGY_RECOVERY_MS)
  }
  return true
}

export async function getRecoveredGameProfile(userId) {
  const profile = await ensureGameProfile(userId)
  const changed = recoverProfileEnergy(profile)
  if (changed) await profile.save()
  return profile
}

export function summarizeGameProfile(profile) {
  return {
    coins: Number(profile?.coins || 0),
    totalCoinsEarned: Number(profile?.totalCoinsEarned || 0),
    totalCoinsSpent: Number(profile?.totalCoinsSpent || 0),
    energy: Number(profile?.energy || 0),
    energyMax: Number(profile?.energyMax || GAME_ECONOMY_CONFIG.energyMax),
    lastEnergyAt: profile?.lastEnergyAt || null,
    unlockedLevel: Number(profile?.unlockedLevel || 1),
    completedLevels: Array.isArray(profile?.completedLevels) ? profile.completedLevels : [],
    bestRecords: profile?.bestRecords instanceof Map ? Object.fromEntries(profile.bestRecords) : (profile?.bestRecords || {})
  }
}

export async function grantCoins(userId, amount, reason, uniqueKey = '', meta = {}) {
  const safeAmount = Number(amount || 0)
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { awarded: false, duplicate: false, amount: 0, profile: await getRecoveredGameProfile(userId) }
  }

  if (uniqueKey) {
    try {
      await PonyPuzzleTransaction.create({ userId, deltaCoins: safeAmount, reason, uniqueKey, meta })
    } catch (error) {
      if (error?.code === 11000) {
        return { awarded: false, duplicate: true, amount: 0, profile: await getRecoveredGameProfile(userId) }
      }
      throw error
    }
  } else {
    await PonyPuzzleTransaction.create({ userId, deltaCoins: safeAmount, reason, meta })
  }

  const profile = await getRecoveredGameProfile(userId)
  profile.coins = Number(profile.coins || 0) + safeAmount
  profile.totalCoinsEarned = Number(profile.totalCoinsEarned || 0) + safeAmount
  await profile.save()
  return { awarded: true, duplicate: false, amount: safeAmount, profile }
}

export async function spendCoins(userId, amount, reason, meta = {}) {
  const safeAmount = Number(amount || 0)
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error('扣除金币数量不合法')
  }

  const profile = await getRecoveredGameProfile(userId)
  if (Number(profile.coins || 0) < safeAmount) {
    throw new Error('金币不足')
  }

  profile.coins = Number(profile.coins || 0) - safeAmount
  profile.totalCoinsSpent = Number(profile.totalCoinsSpent || 0) + safeAmount
  await profile.save()
  await PonyPuzzleTransaction.create({ userId, deltaCoins: -safeAmount, reason, meta })
  return profile
}

export async function spendEnergy(userId, amount) {
  const safeAmount = Number(amount || 0)
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error('体力扣除数量不合法')
  }

  const profile = await getRecoveredGameProfile(userId)
  if (Number(profile.energy || 0) < safeAmount) {
    throw new Error('体力不足')
  }

  profile.energy = Number(profile.energy || 0) - safeAmount
  await profile.save()
  return profile
}