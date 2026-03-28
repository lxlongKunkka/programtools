export const PRESET_PONY_LEVELS = [
  {
    levelId: 1,
    name: '小马谜题 1',
    description: '5x5 入门关，先熟悉每个颜色区块只放 1 只小马。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R2', 'R2'],
      ['R1', 'R3', 'R3', 'R2', 'R2'],
      ['R1', 'R3', 'R2', 'R2', 'R4'],
      ['R3', 'R3', 'R5', 'R5', 'R4'],
      ['R5', 'R5', 'R5', 'R4', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 0 },
      { row: 1, col: 3 },
      { row: 2, col: 1 },
      { row: 3, col: 4 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 32,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 2,
    name: '小马谜题 2',
    description: '5x5 入门关，留意颜色块与行列限制的交叉。',
    size: 5,
    regionBoard: [
      ['R2', 'R2', 'R2', 'R1', 'R1'],
      ['R2', 'R2', 'R3', 'R3', 'R1'],
      ['R2', 'R3', 'R3', 'R3', 'R4'],
      ['R2', 'R3', 'R5', 'R5', 'R4'],
      ['R5', 'R5', 'R5', 'R5', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 3 },
      { row: 1, col: 0 },
      { row: 2, col: 2 },
      { row: 3, col: 4 },
      { row: 4, col: 1 }
    ],
    regionCount: 5,
    rewardCoins: 34,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 3,
    name: '小马谜题 3',
    description: '5x5 入门关，尝试先找只能落子的颜色区块。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R2', 'R2', 'R2'],
      ['R3', 'R1', 'R2', 'R2', 'R2'],
      ['R3', 'R3', 'R4', 'R5', 'R2'],
      ['R4', 'R4', 'R4', 'R5', 'R5'],
      ['R4', 'R4', 'R5', 'R5', 'R5']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 },
      { row: 4, col: 4 }
    ],
    regionCount: 5,
    rewardCoins: 36,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 4,
    name: '小马谜题 4',
    description: '5x5 进阶关，颜色区块更曲折，别忘了相邻禁放。',
    size: 5,
    regionBoard: [
      ['R3', 'R1', 'R1', 'R2', 'R2'],
      ['R3', 'R3', 'R1', 'R1', 'R2'],
      ['R5', 'R3', 'R4', 'R4', 'R2'],
      ['R5', 'R5', 'R4', 'R4', 'R4'],
      ['R5', 'R5', 'R5', 'R5', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 4 },
      { row: 2, col: 1 },
      { row: 3, col: 3 },
      { row: 4, col: 0 }
    ],
    regionCount: 5,
    rewardCoins: 38,
    difficultyLabel: '进阶',
    isSystem: true
  },
  {
    levelId: 5,
    name: '小马谜题 5',
    description: '5x5 进阶关，长条区域会误导视线，优先用行列排除。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R2', 'R3', 'R1'],
      ['R2', 'R2', 'R2', 'R3', 'R1'],
      ['R4', 'R4', 'R5', 'R3', 'R3'],
      ['R4', 'R5', 'R5', 'R5', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 4 },
      { row: 1, col: 1 },
      { row: 2, col: 3 },
      { row: 3, col: 0 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 40,
    difficultyLabel: '进阶',
    isSystem: true
  },
  {
    levelId: 6,
    name: '小马谜题 6',
    description: '5x5 进阶关，注意边角区域常常是突破口。',
    size: 5,
    regionBoard: [
      ['R2', 'R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R3', 'R3', 'R4'],
      ['R5', 'R2', 'R3', 'R3', 'R4'],
      ['R5', 'R2', 'R4', 'R4', 'R4'],
      ['R5', 'R5', 'R5', 'R4', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 3 },
      { row: 1, col: 0 },
      { row: 2, col: 2 },
      { row: 3, col: 4 },
      { row: 4, col: 1 }
    ],
    regionCount: 5,
    rewardCoins: 42,
    difficultyLabel: '进阶',
    isSystem: true
  },
  {
    levelId: 7,
    name: '小马谜题 7',
    description: '5x5 挑战关，区块分布更碎，需要多步联动判断。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R2', 'R2'],
      ['R1', 'R2', 'R2', 'R2', 'R3'],
      ['R1', 'R4', 'R3', 'R3', 'R3'],
      ['R4', 'R4', 'R4', 'R3', 'R5'],
      ['R4', 'R5', 'R5', 'R5', 'R5']
    ],
    solutionCells: [
      { row: 0, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 4 },
      { row: 3, col: 1 },
      { row: 4, col: 3 }
    ],
    regionCount: 5,
    rewardCoins: 44,
    difficultyLabel: '挑战',
    isSystem: true
  },
  {
    levelId: 8,
    name: '小马谜题 8',
    description: '5x5 挑战关，先看不能放的位置，往往比找能放的位置更快。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R2', 'R2'],
      ['R1', 'R3', 'R5', 'R2', 'R2'],
      ['R1', 'R3', 'R5', 'R2', 'R4'],
      ['R3', 'R3', 'R5', 'R2', 'R4'],
      ['R3', 'R5', 'R5', 'R5', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 0 },
      { row: 1, col: 3 },
      { row: 2, col: 1 },
      { row: 3, col: 4 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 46,
    difficultyLabel: '挑战',
    isSystem: true
  },
  {
    levelId: 9,
    name: '小马谜题 9',
    description: '5x5 挑战关，尾盘容易漏掉相邻规则，收束时要复查。',
    size: 5,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R1', 'R1'],
      ['R2', 'R1', 'R1', 'R4', 'R4'],
      ['R3', 'R3', 'R3', 'R4', 'R4'],
      ['R5', 'R5', 'R3', 'R4', 'R4'],
      ['R5', 'R5', 'R5', 'R5', 'R5']
    ],
    solutionCells: [
      { row: 0, col: 3 },
      { row: 1, col: 0 },
      { row: 2, col: 2 },
      { row: 3, col: 4 },
      { row: 4, col: 1 }
    ],
    regionCount: 5,
    rewardCoins: 48,
    difficultyLabel: '挑战',
    isSystem: true
  },
  {
    levelId: 10,
    name: '小马谜题 10',
    description: '5x5 挑战关，注意大区域里真正有效的候选格并不多。',
    size: 5,
    regionBoard: [
      ['R2', 'R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R2', 'R3', 'R1'],
      ['R4', 'R2', 'R3', 'R3', 'R1'],
      ['R4', 'R5', 'R5', 'R3', 'R3'],
      ['R4', 'R4', 'R5', 'R5', 'R5']
    ],
    solutionCells: [
      { row: 0, col: 4 },
      { row: 1, col: 1 },
      { row: 2, col: 3 },
      { row: 3, col: 0 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 50,
    difficultyLabel: '挑战',
    isSystem: true
  },
  {
    levelId: 11,
    name: '小马谜题 11',
    description: '5x5 终局关，颜色块切分更细，适合练习系统排除。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R3', 'R3'],
      ['R1', 'R2', 'R2', 'R2', 'R3'],
      ['R1', 'R4', 'R4', 'R2', 'R3'],
      ['R4', 'R4', 'R5', 'R2', 'R5'],
      ['R4', 'R4', 'R5', 'R5', 'R5']
    ],
    solutionCells: [
      { row: 0, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 4 },
      { row: 3, col: 1 },
      { row: 4, col: 3 }
    ],
    regionCount: 5,
    rewardCoins: 52,
    difficultyLabel: '终局',
    isSystem: true
  },
  {
    levelId: 12,
    name: '小马谜题 12',
    description: '5x5 终局关，当前版本的最终挑战。',
    size: 5,
    regionBoard: [
      ['R2', 'R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R3', 'R4', 'R1'],
      ['R2', 'R3', 'R3', 'R4', 'R4'],
      ['R2', 'R3', 'R5', 'R5', 'R4'],
      ['R5', 'R5', 'R5', 'R4', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 3 },
      { row: 1, col: 0 },
      { row: 2, col: 2 },
      { row: 3, col: 4 },
      { row: 4, col: 1 }
    ],
    regionCount: 5,
    rewardCoins: 56,
    difficultyLabel: '终局',
    isSystem: true
  }
]
