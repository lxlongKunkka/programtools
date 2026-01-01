/**
 * Sokoban 游戏核心引擎
 * 完全独立于框架，只处理游戏逻辑
 */

const TILES = {
  EMPTY: 0,      // 空地
  WALL: 1,       // 墙
  TARGET: 2,     // 目标点
  BOX: 3,        // 箱子
  PLAYER: 4,     // 玩家
  BOX_ON_TARGET: 5,  // 箱子在目标点上
  PLAYER_ON_TARGET: 6 // 玩家在目标点上
};

class SokobanEngine {
  constructor(levelData) {
    this.originalMap = JSON.parse(JSON.stringify(levelData.map));
    this.map = JSON.parse(JSON.stringify(levelData.map));
    this.targetCount = levelData.targetCount || this.countTargets();
    console.log('Level initialized. Target count:', this.targetCount);
    this.playerPos = this.findPlayerPosition();
    this.history = [JSON.parse(JSON.stringify(this.map))]; // 用于撤销功能
    this.moves = 0; // 移动次数
  }

  /**
   * 查找玩家位置
   */
  findPlayerPosition() {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tile = this.map[y][x];
        if (tile === TILES.PLAYER || tile === TILES.PLAYER_ON_TARGET) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * 计算目标点的总数
   */
  countTargets() {
    let count = 0;
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tile = this.map[y][x];
        if (tile === TILES.TARGET || tile === TILES.BOX_ON_TARGET || tile === TILES.PLAYER_ON_TARGET) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 获取指定坐标的瓦片值
   */
  getTile(x, y) {
    if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[y].length) {
      return TILES.WALL; // 边界当做墙
    }
    return this.map[y][x];
  }

  /**
   * 设置指定坐标的瓦片值
   */
  setTile(x, y, tile) {
    if (y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length) {
      this.map[y][x] = tile;
    }
  }

  /**
   * 判断瓦片是否可以走过
   */
  isWalkable(tile) {
    return tile !== TILES.WALL && tile !== TILES.BOX;
  }

  /**
   * 判断瓦片是否是目标点（无论上面有没有东西）
   */
  isTarget(tile) {
    return tile === TILES.TARGET || tile === TILES.BOX_ON_TARGET || tile === TILES.PLAYER_ON_TARGET;
  }

  /**
   * 移动玩家
   * @param {string} direction - 方向: 'up', 'down', 'left', 'right'
   * @returns {boolean} - 是否成功移动
   */
  move(direction) {
    const { x, y } = this.playerPos;
    let dx = 0, dy = 0;

    switch (direction) {
      case 'up':
        dy = -1;
        break;
      case 'down':
        dy = 1;
        break;
      case 'left':
        dx = -1;
        break;
      case 'right':
        dx = 1;
        break;
      default:
        return false;
    }

    const nextX = x + dx;
    const nextY = y + dy;
    const nextTile = this.getTile(nextX, nextY);

    // 下一步是墙，无法移动
    if (nextTile === TILES.WALL) {
      return false;
    }

    // 下一步是箱子，尝试推箱子
    if (nextTile === TILES.BOX || nextTile === TILES.BOX_ON_TARGET) {
      const boxNextX = nextX + dx;
      const boxNextY = nextY + dy;
      const boxNextTile = this.getTile(boxNextX, boxNextY);

      // 箱子前面是墙或另一个箱子，无法推
      if (boxNextTile === TILES.WALL || boxNextTile === TILES.BOX || boxNextTile === TILES.BOX_ON_TARGET) {
        return false;
      }

      // 箱子可以推，推箱子到下一步
      const isBoxOnTarget = nextTile === TILES.BOX_ON_TARGET;
      const isBoxNextOnTarget = this.isTarget(boxNextTile);

      // 清除当前位置的箱子
      this.setTile(nextX, nextY, isBoxOnTarget ? TILES.TARGET : TILES.EMPTY);

      // 在箱子的新位置放置箱子
      this.setTile(boxNextX, boxNextY, isBoxNextOnTarget ? TILES.BOX_ON_TARGET : TILES.BOX);
    }

    // 移动玩家
    const currentIsTarget = this.isTarget(this.getTile(x, y));
    this.setTile(x, y, currentIsTarget ? TILES.TARGET : TILES.EMPTY);

    const nextIsTarget = this.isTarget(nextTile);
    this.setTile(nextX, nextY, nextIsTarget ? TILES.PLAYER_ON_TARGET : TILES.PLAYER);

    this.playerPos = { x: nextX, y: nextY };
    this.moves++;

    // 保存历史记录
    this.history.push(JSON.parse(JSON.stringify(this.map)));

    return true;
  }

  /**
   * 撤销上一步
   */
  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      this.map = JSON.parse(JSON.stringify(this.history[this.history.length - 1]));
      this.playerPos = this.findPlayerPosition();
      this.moves = Math.max(0, this.moves - 1);
      return true;
    }
    return false;
  }

  /**
   * 判断是否胜利（所有箱子都在目标点上）
   */
  isVictory() {
    let boxOnTargetCount = 0;
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === TILES.BOX_ON_TARGET) {
          boxOnTargetCount++;
        }
      }
    }
    console.log(`Victory Check: Boxes on Target: ${boxOnTargetCount}, Total Targets: ${this.targetCount}`);
    return boxOnTargetCount === this.targetCount;
  }

  /**
   * 重置关卡
   */
  reset() {
    this.map = JSON.parse(JSON.stringify(this.originalMap));
    this.playerPos = this.findPlayerPosition();
    this.history = [JSON.parse(JSON.stringify(this.map))];
    this.moves = 0;
  }

  /**
   * 获取当前地图副本
   */
  getMap() {
    return JSON.parse(JSON.stringify(this.map));
  }

  /**
   * 获取游戏状态
   */
  getGameState() {
    return {
      map: this.getMap(),
      playerPos: { ...this.playerPos },
      moves: this.moves,
      isVictory: this.isVictory(),
      canUndo: this.history.length > 1
    };
  }
}

export { SokobanEngine, TILES };
