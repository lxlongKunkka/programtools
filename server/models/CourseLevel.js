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
  level: { type: Number, required: true }, // Used for sorting
  group: { type: String }, // e.g. 'C++基础', 'C++进阶' - Explicit grouping
  label: { type: String }, // Custom label (e.g. "语法思维训练") to override "Level X"
  subject: { type: String, default: 'C++' }, // Course subject (e.g., 'C++', 'Python')
  title: { type: String, required: true },
  description: { type: String },
  editors: [{ type: Number, ref: 'User' }], // List of teachers allowed to edit this specific level
  topics: [topicSchema],
  // Legacy support (optional, can be removed if migration is done)
  chapters: [chapterSchema] 
})

// Compound index to ensure level is unique per group
courseLevelSchema.index({ level: 1, group: 1 }, { unique: true })

export default mongoose.model('CourseLevel', courseLevelSchema)
