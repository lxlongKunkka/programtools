import mongoose from 'mongoose';
import { appConn } from '../db.js';

const sokobanProgressSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  levelId: { type: Number, required: true },
  moves: { type: Number }, // User's personal best moves
  timeElapsed: { type: Number }, // User's personal best time
  completedAt: { type: Date, default: Date.now }
});

// Compound index for unique user+level
sokobanProgressSchema.index({ userId: 1, levelId: 1 }, { unique: true });

export default appConn.model('SokobanProgress', sokobanProgressSchema);
