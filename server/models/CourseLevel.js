import mongoose from 'mongoose'

const chapterSchema = new mongoose.Schema({
  id: { type: String, required: true }, // e.g., '1-1'
  title: { type: String, required: true },
  content: { type: String, default: '' }, // Markdown content
  contentType: { type: String, enum: ['markdown', 'html'], default: 'markdown' }, // Content type
  resourceUrl: { type: String }, // URL for HTML content (e.g., '/public/courseware/bfs.html')
  problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }], // Linked problems
  optional: { type: Boolean, default: false } // Whether the chapter is optional
})

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "Basic Syntax"
  description: { type: String },
  chapters: [chapterSchema]
})

const courseLevelSchema = new mongoose.Schema({
  level: { type: Number, required: true }, // 1 to 6
  subject: { type: String, default: 'C++' }, // Course subject (e.g., 'C++', 'Python')
  title: { type: String, required: true },
  description: { type: String },
  topics: [topicSchema],
  // Legacy support (optional, can be removed if migration is done)
  chapters: [chapterSchema] 
})

// Compound index to ensure level is unique per subject
courseLevelSchema.index({ level: 1, subject: 1 }, { unique: true })

export default mongoose.model('CourseLevel', courseLevelSchema)
