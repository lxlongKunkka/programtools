import mongoose from 'mongoose'
import { hydroConn } from '../db.js'

const documentSchema = new mongoose.Schema({
  docId: Number, // Explicitly define docId as Number
  title: String,
  content: String,
  contentbak: String,
  domainId: String,
  pid: String, // To be deleted
  tag: [String],
  // Allow other fields to exist without defining them explicitly if strict is false, 
  // but for now let's define what we know.
}, { collection: 'document', strict: false }) 

export default hydroConn.model('Document', documentSchema)
