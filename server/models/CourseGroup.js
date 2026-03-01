import mongoose from 'mongoose'
import { appConn } from '../db.js'

const courseGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  title: { type: String }, // Display name if different, or just use name
  language: { type: String, default: 'C++' },
  order: { type: Number, default: 0 },
  editors: [{ type: Number, ref: 'User' }], // List of teachers allowed to edit
  createdAt: { type: Date, default: Date.now }
})

export default appConn.model('CourseGroup', courseGroupSchema)
