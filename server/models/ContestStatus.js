import mongoose from 'mongoose'
import { hydroConn } from '../db.js'

// Hydro's document.status collection stores per-user status for contests/homework
// docType: 30 = Contest, 60 = Homework
const contestStatusSchema = new mongoose.Schema({}, { collection: 'document.status', strict: false })

export default hydroConn.model('ContestStatus', contestStatusSchema)
