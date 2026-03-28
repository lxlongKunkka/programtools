import mongoose from 'mongoose'
import { appConn } from '../db.js'

const ponyPuzzleTransactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  deltaCoins: { type: Number, default: 0 },
  reason: { type: String, required: true },
  uniqueKey: { type: String, default: '', index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

ponyPuzzleTransactionSchema.index(
  { uniqueKey: 1 },
  { unique: true, partialFilterExpression: { uniqueKey: { $type: 'string', $ne: '' } } }
)

export default appConn.model('PonyPuzzleTransaction', ponyPuzzleTransactionSchema)