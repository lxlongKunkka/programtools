import mongoose from 'mongoose';
import { appConn } from '../db.js';

const sokobanLevelSchema = new mongoose.Schema({
  levelId: { type: Number, unique: true }, // 用于前端显示的简短ID，区别于 _id
  name: { type: String, required: true, maxlength: 50 },
  description: { type: String, maxlength: 200 },
  map: { type: [[Number]], required: true }, // 二维数组存储地图
  targetCount: { type: Number, required: true },
  creatorId: { type: Number, ref: 'User' }, // 创建者，如果是系统关卡则为空
  creatorName: { type: String }, // 冗余存储创建者名字
  isSystem: { type: Boolean, default: false }, // 是否为系统内置关卡
  likes: { type: [Number], default: [] }, // 点赞的用户ID列表
  dislikes: { type: [Number], default: [] }, // 点踩的用户ID列表
  bestRecord: {
    type: new mongoose.Schema({
      moves: { type: Number },
      timeElapsed: { type: Number }, // 增加时间字段用于排名
      username: { type: String },
      userId: { type: Number, ref: 'User' },
      createdAt: { type: Date }
    }, { _id: false }),
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

// 自动生成 levelId 的中间件逻辑可以在路由中处理，或者使用计数器集合
// 这里为了简单，我们在路由中查询最大ID并+1

export default appConn.model('SokobanLevel', sokobanLevelSchema);
