import mongoose from 'mongoose'
import { appConn } from '../db.js'

const gameTransactionSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  deltaCoins: { type: Number, default: 0 },
  reason: { type: String, required: true },
  uniqueKey: { type: String, default: '', index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

gameTransactionSchema.index(
  { uniqueKey: 1 },
  { unique: true, partialFilterExpression: { uniqueKey: { $type: 'string', $ne: '' } } }
)

export default appConn.model('GameTransaction', gameTransactionSchema, 'ponypuzzletransactions')