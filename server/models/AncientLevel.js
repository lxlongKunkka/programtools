import mongoose from 'mongoose';

const ancientLevelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  // Map data: 2D array of integers representing terrain types
  // 0=Plain, 1=Forest, 2=Mountain, 3=Water, 4=Castle, 5=Village
  mapData: { type: [[Number]], required: true },
  // Initial units configuration
  units: [{
      type: { type: String, required: true }, // e.g., 'soldier', 'king'
      team: { type: String, required: true }, // 'blue', 'red'
      x: { type: Number, required: true },
      y: { type: Number, required: true }
  }],
  // Building ownership configuration
  buildings: [{
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      team: { type: String, default: null }, // 'blue', 'red', or null
      type: { type: String, default: 'village' } // 'castle', 'village'
  }],
  money: { type: Object, default: null }, // { blue: 150, red: 150 }
  populationLimit: { type: Number, default: 50 },
  createdAt: { type: Date, default: Date.now },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.model('AncientLevel', ancientLevelSchema);
