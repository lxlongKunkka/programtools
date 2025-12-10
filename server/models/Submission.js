import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema({
  uid: Number,
  pid: Number, // Problem ID (docId) - Changed to Number to match DB
  domainId: String,
  status: Number, // 1 = Accepted (Usually in Hydro)
  // Other fields...
}, { collection: 'record', strict: false })

export default mongoose.model('Submission', submissionSchema)
