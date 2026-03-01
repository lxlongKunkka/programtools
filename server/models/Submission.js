import mongoose from 'mongoose'
import { hydroConn } from '../db.js'

const submissionSchema = new mongoose.Schema({
  uid: Number,
  pid: Number, // Problem ID (docId) - Changed to Number to match DB
  domainId: String,
  status: Number, // 1 = Accepted (Usually in Hydro)
  // Other fields...
}, { collection: 'record', strict: false })

export default hydroConn.model('Submission', submissionSchema)
