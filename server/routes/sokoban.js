import express from 'express';
import SokobanLevel from '../models/SokobanLevel.js';
import SokobanResult from '../models/SokobanResult.js'; // Legacy? Or maybe I should use this instead of creating new one?
import SokobanProgress from '../models/SokobanProgress.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// --- 关卡设计工具开始 ---
// 字符映射表
const CHAR_MAP = {
  ' ': 0, // 空地
  '-': 0, // 空地(替代)
  '#': 1, // 墙
  '.': 2, // 目标点
  '$': 3, // 箱子
  '@': 4, // 玩家
  '*': 5, // 箱子在目标点
  '+': 6  // 玩家在目标点
};

/**
 * 将字符画转换为二维数字数组
 */
function parseMap(levelStr) {
  return levelStr.trim().split('\n').map(row => {
    return row.split('').map(char => CHAR_MAP[char] !== undefined ? CHAR_MAP[char] : 1);
  });
}

/**
 * 自动计算目标点数量
 */
function countTargets(map) {
  let count = 0;
  map.forEach(row => {
    row.forEach(cell => {
      if (cell === 2 || cell === 5 || cell === 6) count++;
    });
  });
  return count;
}

/**
 * 创建关卡辅助函数
 */
function createLevelData(name, description, mapStr) {
  const map = parseMap(mapStr);
  return {
    name,
    description,
    targetCount: countTargets(map),
    map,
    isSystem: true
  };
}
// --- 关卡设计工具结束 ---

// 初始关卡数据
const INITIAL_LEVELS = [
  createLevelData('新手关卡', '简单的开始', `
#######
#     #
# @$. #
#     #
#######
`),
  createLevelData('两个箱子', '需要推动两个箱子', `
#########
#       #
# @$ $  #
#     ..#
#       #
#########
`),
  createLevelData('方形关卡', '需要仔细规划路线', `
#########
#       #
# @ # $ #
# $     #
#   # $ #
# . . . #
#       #
#########
`),
  createLevelData('经典U型', '稍微有点挑战', `
########
#      #
# .    #
#  $@  #
# $  . #
#      #
########
`),
  createLevelData('Microban I - 1', 'Classic Level by David W. Skinner', `
####
# .#
#  ###
#*@  #
#  $ #
#  ###
####
`),
  createLevelData('Microban I - 3', 'Classic Level by David W. Skinner', `
  ####
###  ####
#     $ #
# #  #$ #
# . .#@ #
#########
`),

];

// 初始化数据库中的关卡
async function initLevels() {
  try {
    console.log('Checking system levels...');

    // 1. 清理：删除不再 INITIAL_LEVELS 中的系统关卡
    const initialNames = INITIAL_LEVELS.map(l => l.name);
    const deleteResult = await SokobanLevel.deleteMany({ 
      isSystem: true, 
      name: { $nin: initialNames } 
    });
    if (deleteResult.deletedCount > 0) {
        console.log(`Removed ${deleteResult.deletedCount} deprecated system levels.`);
    }

    const count = await SokobanLevel.countDocuments();
    console.log(`Current level count in DB: ${count}`);
    
    for (let i = 0; i < INITIAL_LEVELS.length; i++) {
      const levelData = INITIAL_LEVELS[i];
      // Check if this system level already exists (by name and isSystem: true)
      const exists = await SokobanLevel.findOne({ name: levelData.name, isSystem: true });
      if (!exists) {
         // We need a new ID.
         const lastLevel = await SokobanLevel.findOne().sort({ levelId: -1 });
         const newId = (lastLevel && lastLevel.levelId) ? lastLevel.levelId + 1 : 1;
         
         await SokobanLevel.create({
          ...levelData,
          levelId: newId
        });
        console.log(`Added new system level: ${levelData.name}`);
      } else {
        // console.log(`Level already exists: ${levelData.name}`);
      }
    }
    console.log('Level initialization complete.');
  } catch (err) {
    console.error('Failed to initialize Sokoban levels:', err);
  }
}

// 启动时尝试初始化
initLevels();

/**
 * 获取所有关卡列表
 * 支持可选的认证，用于返回用户是否点赞/点踩
 */
router.get('/levels', async (req, res) => {
  try {
    console.log('GET /levels request received');
    
    // 尝试获取当前用户ID（如果提供了token）
    let currentUserId = null;
    // Note: We are not using authenticateToken middleware here to allow public access,
    // but we want to know if user is logged in to return completion status.
    // Since we don't have easy access to jwt verify here without importing it or using middleware,
    // let's assume the frontend will call a separate endpoint or we rely on the client to merge data.
    // BUT, the user wants the checkmark.
    // Let's try to parse the user from the request if the middleware was applied optionally?
    // No, express router doesn't work like that.
    
    // Let's just fetch all levels. The frontend already has logic to check bestRecord.
    // To support "completed but not best", we should probably add a new endpoint: /my-progress
    // Or we can make this endpoint authenticated optionally.
    
    // For now, let's keep it simple. We will add a new endpoint /my-progress that returns the list of completed level IDs.
    // The frontend can call that and merge.

    const levels = await SokobanLevel.find()
      .sort({ levelId: 1 })
      .select('levelId name description targetCount isSystem creatorName bestRecord likes dislikes');
    
    console.log(`Found ${levels.length} levels in DB`);

    const levelList = levels.map(level => ({
      id: level.levelId,
      name: level.name,
      description: level.description,
      targetCount: level.targetCount,
      isSystem: level.isSystem,
      creatorName: level.creatorName,
      bestRecord: level.bestRecord,
      likesCount: level.likes ? level.likes.length : 0,
      dislikesCount: level.dislikes ? level.dislikes.length : 0
    }));

    res.json({
      success: true,
      data: levelList
    });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch levels' });
  }
});

/**
 * 获取当前用户的通关进度
 */
router.get('/my-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await SokobanProgress.find({ userId }).select('levelId');
    const completedLevelIds = progress.map(p => p.levelId);
    res.json({
      success: true,
      data: completedLevelIds
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

/**
 * 获取特定关卡详情
 */
router.get('/levels/:id', authenticateToken, async (req, res) => {
  try {
    const levelId = parseInt(req.params.id);
    const level = await SokobanLevel.findOne({ levelId });

    if (!level) {
      return res.status(404).json({
        success: false,
        error: '关卡不存在'
      });
    }

    // 检查当前用户是否点赞/点踩
    const userId = req.user.id;
    let userVote = 'none';
    if (level.likes && level.likes.includes(userId)) userVote = 'like';
    else if (level.dislikes && level.dislikes.includes(userId)) userVote = 'dislike';

    res.json({
      success: true,
      data: {
        id: level.levelId,
        name: level.name,
        description: level.description,
        targetCount: level.targetCount,
        map: level.map,
        isSystem: level.isSystem,
        creatorName: level.creatorName,
        likesCount: level.likes ? level.likes.length : 0,
        dislikesCount: level.dislikes ? level.dislikes.length : 0,
        userVote
      }
    });
  } catch (error) {
    console.error('Error fetching level details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch level details' });
  }
});

/**
 * 投票 (点赞/点踩)
 */
router.post('/levels/:id/vote', authenticateToken, async (req, res) => {
  const levelId = parseInt(req.params.id);
  const { type } = req.body; // 'like', 'dislike', 'none'
  const userId = req.user.id;

  if (!['like', 'dislike', 'none'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid vote type' });
  }

  try {
    const level = await SokobanLevel.findOne({ levelId });
    if (!level) {
      return res.status(404).json({ success: false, error: 'Level not found' });
    }

    // 初始化数组
    if (!level.likes) level.likes = [];
    if (!level.dislikes) level.dislikes = [];

    // 移除旧的投票
    level.likes = level.likes.filter(id => id !== userId);
    level.dislikes = level.dislikes.filter(id => id !== userId);

    // 添加新投票
    if (type === 'like') {
      level.likes.push(userId);
    } else if (type === 'dislike') {
      level.dislikes.push(userId);
    }

    await level.save();

    res.json({
      success: true,
      data: {
        likesCount: level.likes.length,
        dislikesCount: level.dislikes.length,
        userVote: type
      }
    });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ success: false, error: 'Failed to vote' });
  }
});

/**
 * 发布新关卡
 */
router.post('/levels', authenticateToken, async (req, res) => {
  const { name, description, map } = req.body;

  if (!name || !map || !Array.isArray(map)) {
    return res.status(400).json({
      success: false,
      error: '无效的关卡数据'
    });
  }

  // 简单的验证：必须有玩家和箱子
  let hasPlayer = false;
  let boxCount = 0;
  let targetCount = 0;

  map.forEach(row => {
    row.forEach(cell => {
      if (cell === 4 || cell === 6) hasPlayer = true; // PLAYER or PLAYER_ON_TARGET
      if (cell === 3 || cell === 5) boxCount++;       // BOX or BOX_ON_TARGET
      if (cell === 2 || cell === 5 || cell === 6) targetCount++; // TARGET, BOX_ON_TARGET, PLAYER_ON_TARGET
    });
  });

  if (!hasPlayer) {
    return res.status(400).json({ success: false, error: '地图必须包含一个玩家' });
  }
  if (boxCount === 0) {
    return res.status(400).json({ success: false, error: '地图必须包含至少一个箱子' });
  }
  if (boxCount !== targetCount) {
    return res.status(400).json({ success: false, error: `箱子数量 (${boxCount}) 必须等于目标点数量 (${targetCount})` });
  }

  try {
    // 获取当前最大 levelId
    const lastLevel = await SokobanLevel.findOne().sort({ levelId: -1 });
    const newId = (lastLevel && lastLevel.levelId) ? lastLevel.levelId + 1 : 1;
    
    const newLevel = new SokobanLevel({
      levelId: newId,
      name: name.substring(0, 20), // 限制长度
      description: description ? description.substring(0, 50) : '玩家自制关卡',
      targetCount: targetCount,
      map: map,
      creatorId: req.user.id,
      creatorName: req.user.username || req.user.name || 'Anonymous',
      isSystem: false
    });

    await newLevel.save();

    console.log(`新关卡已发布: ${newLevel.name} (ID: ${newId}) by ${newLevel.creatorName}`);

    res.json({
      success: true,
      data: { id: newId }
    });
  } catch (error) {
    console.error('Error creating level:', error);
    res.status(500).json({ success: false, error: 'Failed to create level' });
  }
});

/**
 * 更新关卡信息 (管理员)
 */
router.put('/levels/:id', authenticateToken, async (req, res) => {
  const levelId = parseInt(req.params.id);
  const { name, description, map } = req.body;

  // 检查管理员权限
  const isAdmin = req.user && (req.user.role === 'admin' || req.user.priv === -1 || req.user.priv === 1);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Permission denied' });
  }

  try {
    const level = await SokobanLevel.findOne({ levelId });
    if (!level) {
      return res.status(404).json({ success: false, error: 'Level not found' });
    }

    if (name) level.name = name.substring(0, 50);
    if (description !== undefined) level.description = description.substring(0, 200);

    if (map && Array.isArray(map)) {
      // 验证地图有效性
      let hasPlayer = false;
      let boxCount = 0;
      let targetCount = 0;

      map.forEach(row => {
        row.forEach(cell => {
          if (cell === 4 || cell === 6) hasPlayer = true; // PLAYER or PLAYER_ON_TARGET
          if (cell === 3 || cell === 5) boxCount++;       // BOX or BOX_ON_TARGET
          if (cell === 2 || cell === 5 || cell === 6) targetCount++; // TARGET, BOX_ON_TARGET, PLAYER_ON_TARGET
        });
      });

      if (!hasPlayer) return res.status(400).json({ success: false, error: 'Map must have a player' });
      if (boxCount === 0) return res.status(400).json({ success: false, error: 'Map must have at least one box' });
      if (boxCount !== targetCount) return res.status(400).json({ success: false, error: 'Box count must match target count' });

      level.map = map;
      level.targetCount = targetCount;
      
      // 如果修改了地图，清除最佳记录，因为旧记录可能不再适用
      level.bestRecord = null;
    }

    await level.save();

    res.json({
      success: true,
      data: {
        id: level.levelId,
        name: level.name,
        description: level.description,
        map: level.map,
        targetCount: level.targetCount
      }
    });
  } catch (error) {
    console.error('Error updating level:', error);
    res.status(500).json({ success: false, error: 'Failed to update level' });
  }
});

/**
 * 删除关卡
 */
router.delete('/levels/:id', authenticateToken, async (req, res) => {
  const levelId = parseInt(req.params.id);

  // 检查管理员权限
  const isAdmin = req.user && (req.user.role === 'admin' || req.user.priv === -1 || req.user.priv === 1);
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Permission denied' });
  }

  try {
    const result = await SokobanLevel.deleteOne({ levelId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Level not found' });
    }

    // Clean up related data (results and user progress)
    await SokobanResult.deleteMany({ levelId });
    await SokobanProgress.deleteMany({ levelId });

    res.json({ success: true, message: 'Level deleted successfully' });
  } catch (error) {
    console.error('Error deleting level:', error);
    res.status(500).json({ success: false, error: 'Failed to delete level' });
  }
});

/**
 * 提交关卡成绩
 */
router.post('/levels/:id/complete', authenticateToken, async (req, res) => {
  const levelId = parseInt(req.params.id);
  const { moves, timeElapsed } = req.body;

  console.log(`[Sokoban] Level ${levelId} complete request. Moves: ${moves}, User: ${req.user.username || req.user.name}`);

  if (moves === undefined || moves === null || timeElapsed === undefined || timeElapsed === null) {
    return res.status(400).json({ success: false, error: 'Missing moves or timeElapsed' });
  }

  try {
    const userId = req.user.id;

    // 1. Update User Progress (SokobanProgress)
    // Check if user already completed this level
    let progress = await SokobanProgress.findOne({ userId, levelId });
    if (!progress) {
      progress = new SokobanProgress({
        userId,
        levelId,
        moves,
        timeElapsed
      });
    } else {
      // Update personal best if better
      if (moves < progress.moves || (moves === progress.moves && timeElapsed < progress.timeElapsed)) {
        progress.moves = moves;
        progress.timeElapsed = timeElapsed;
      }
    }
    await progress.save();

    const level = await SokobanLevel.findOne({ levelId });
    if (!level) {
      console.log(`[Sokoban] Level ${levelId} not found`);
      return res.status(404).json({ success: false, error: 'Level not found' });
    }

    // 保存成绩记录
    const result = new SokobanResult({
      levelId,
      userId: req.user.id,
      username: req.user.username || req.user.name || 'Anonymous',
      moves,
      timeElapsed
    });
    await result.save();

    // 检查是否是最佳记录
    let isNewRecord = false;
    console.log(`[Sokoban] Current best for level ${levelId}:`, level.bestRecord);

    const currentBest = level.bestRecord;
    // 判定新记录：
    // 1. 还没有记录
    // 2. 步数更少
    // 3. 步数相同但时间更短
    const isBetterMoves = !currentBest || !currentBest.moves || moves < currentBest.moves;
    const isSameMovesBetterTime = currentBest && moves === currentBest.moves && timeElapsed < (currentBest.timeElapsed || Infinity);

    if (isBetterMoves || isSameMovesBetterTime) {
      console.log(`[Sokoban] New record! Old: ${currentBest?.moves} (${currentBest?.timeElapsed}s), New: ${moves} (${timeElapsed}s)`);
      level.bestRecord = {
        moves,
        timeElapsed,
        username: result.username,
        userId: result.userId,
        createdAt: new Date()
      };
      // Ensure Mongoose knows this field is modified (sometimes needed for mixed types or subdocs)
      level.markModified('bestRecord');
      await level.save();
      isNewRecord = true;
    } else {
      console.log(`[Sokoban] Not a record. Best is ${currentBest.moves} (${currentBest.timeElapsed}s)`);
    }

    res.json({
      success: true,
      isNewRecord,
      bestRecord: level.bestRecord,
      personalBest: progress
    });

  } catch (error) {
    console.error('Error submitting result:', error);
    res.status(500).json({ success: false, error: 'Failed to submit result' });
  }
});

/**
 * 获取关卡排行榜
 */
router.get('/levels/:id/leaderboard', async (req, res) => {
  try {
    const levelId = parseInt(req.params.id);
    // Use aggregation on SokobanProgress to get unique best scores and join user info
    const results = await SokobanProgress.aggregate([
      { $match: { levelId } },
      { $sort: { moves: 1, timeElapsed: 1, completedAt: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'user',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          moves: 1,
          timeElapsed: 1,
          completedAt: 1,
          username: { $arrayElemAt: ['$userInfo.uname', 0] }
        }
      }
    ]);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

/**
 * Get recent activity
 */
router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const results = await SokobanResult.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const levelIds = [...new Set(results.map(r => r.levelId))];
    const levels = await SokobanLevel.find({ levelId: { $in: levelIds } }).select('levelId name').lean();
    const levelMap = {};
    levels.forEach(l => levelMap[l.levelId] = l.name);

    const activity = results.map(r => ({
      ...r,
      levelName: levelMap[r.levelId] || `Level ${r.levelId}`
    }));

    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

export default router;
