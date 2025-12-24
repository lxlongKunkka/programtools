import mongoose from 'mongoose'

const courseGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  title: { type: String }, // Display name if different, or just use name
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('CourseGroup', courseGroupSchema)
