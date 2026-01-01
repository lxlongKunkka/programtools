import mongoose from 'mongoose';

const sokobanResultSchema = new mongoose.Schema({
  levelId: { type: Number, required: true }, // 对应 SokobanLevel 的 levelId
  userId: { type: Number, ref: 'User', required: true },
  username: { type: String, required: true },
  moves: { type: Number, required: true },
  timeElapsed: { type: Number, required: true }, // 秒
  createdAt: { type: Date, default: Date.now }
});

// 索引，用于查询某关卡的排行榜
sokobanResultSchema.index({ levelId: 1, moves: 1, timeElapsed: 1 });

export default mongoose.model('SokobanResult', sokobanResultSchema);
