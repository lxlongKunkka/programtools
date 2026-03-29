export const PRESET_PONY_LEVELS = [
  {
    levelId: 1,
    name: '土拨鼠谜题 1',
    description: '4x4 热身关，先学会从只有 1 格的颜色区块起手。',
    tutorialTitle: '先找单格颜色',
    tutorialTips: [
      '先找只有 1 格的颜色区块，这格一定能放土拨鼠。',
      '放下后，再把它所在的同一行、同一列和相邻格轻点打叉。',
      '当别的颜色块也被缩到只剩 1 格时，再继续长按落子。'
    ],
    size: 4,
    regionBoard: [
      ['R3', 'R1', 'R2', 'R2'],
      ['R3', 'R3', 'R4', 'R2'],
      ['R3', 'R3', 'R4', 'R2'],
      ['R3', 'R4', 'R4', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 }
    ],
    regionCount: 4,
    rewardCoins: 20,
    difficultyLabel: '热身',
    isSystem: true
  },
  {
    levelId: 2,
    name: '土拨鼠谜题 2',
    description: '4x4 热身关，继续练习从单格颜色拉开整行整列。',
    tutorialTitle: '用行列展开排除',
    tutorialTips: [
      '还是先找只有 1 格的颜色区块，先把第一只放出来。',
      '放下后，立刻看同一行同一列还能排掉哪些格。',
      '别急着连放，先靠打叉把别的颜色块缩小到唯一候选。'
    ],
    size: 4,
    regionBoard: [
      ['R3', 'R1', 'R4', 'R2'],
      ['R3', 'R4', 'R4', 'R2'],
      ['R3', 'R3', 'R4', 'R2'],
      ['R3', 'R3', 'R4', 'R2']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 }
    ],
    regionCount: 4,
    rewardCoins: 22,
    difficultyLabel: '热身',
    isSystem: true
  },
  {
    levelId: 3,
    name: '土拨鼠谜题 3',
    description: '4x4 入门关，颜色块更碎，但仍能从单格颜色稳定起手。',
    tutorialTitle: '先缩到唯一候选',
    tutorialTips: [
      '先把单格颜色区块放掉，别从大色块硬猜。',
      '接着优先打叉同一行、同一列和相邻格，把候选缩小。',
      '看到某个颜色块只剩 1 个安全格时，再长按确认。'
    ],
    size: 4,
    regionBoard: [
      ['R3', 'R1', 'R2', 'R2'],
      ['R3', 'R3', 'R2', 'R2'],
      ['R3', 'R3', 'R4', 'R2'],
      ['R3', 'R4', 'R4', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 }
    ],
    regionCount: 4,
    rewardCoins: 24,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 4,
    name: '土拨鼠谜题 4',
    description: '4x4 入门关，单格颜色起手后，再看大色块如何被逐步压缩。',
    size: 4,
    regionBoard: [
      ['R3', 'R1', 'R2', 'R2'],
      ['R3', 'R4', 'R2', 'R2'],
      ['R3', 'R4', 'R4', 'R2'],
      ['R3', 'R4', 'R4', 'R2']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 }
    ],
    regionCount: 4,
    rewardCoins: 26,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 5,
    name: '土拨鼠谜题 5',
    description: '4x4 入门关，换一套新解型，但仍然从单格颜色稳定起手。',
    size: 4,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R3'],
      ['R2', 'R4', 'R3', 'R3'],
      ['R2', 'R4', 'R3', 'R3'],
      ['R4', 'R4', 'R4', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 1 }
    ],
    regionCount: 4,
    rewardCoins: 28,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 6,
    name: '土拨鼠谜题 6',
    description: '4x4 轻松关，解型翻面之后，继续练习行列与相邻排除。',
    size: 4,
    regionBoard: [
      ['R2', 'R4', 'R1', 'R3'],
      ['R2', 'R4', 'R4', 'R3'],
      ['R2', 'R4', 'R3', 'R3'],
      ['R2', 'R4', 'R3', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 1 }
    ],
    regionCount: 4,
    rewardCoins: 30,
    difficultyLabel: '轻松',
    isSystem: true
  },
  {
    levelId: 7,
    name: '土拨鼠谜题 7',
    description: '4x4 轻松关，颜色块更碎，但第一步仍然不是猜而是单格确认。',
    size: 4,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R3'],
      ['R2', 'R2', 'R3', 'R3'],
      ['R2', 'R4', 'R3', 'R3'],
      ['R4', 'R4', 'R4', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 1 }
    ],
    regionCount: 4,
    rewardCoins: 32,
    difficultyLabel: '轻松',
    isSystem: true
  },
  {
    levelId: 8,
    name: '土拨鼠谜题 8',
    description: '4x4 轻挑战关，作为 5x5 前的最后过渡，但起手仍有单格颜色可抓。',
    size: 4,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R3'],
      ['R2', 'R3', 'R3', 'R3'],
      ['R2', 'R4', 'R4', 'R3'],
      ['R4', 'R4', 'R4', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 1 }
    ],
    regionCount: 4,
    rewardCoins: 34,
    difficultyLabel: '轻挑战',
    isSystem: true
  },
  {
    levelId: 9,
    name: '土拨鼠谜题 9',
    description: '5x5 入门关，格子变大了，但区域仍然很规整。',
    size: 5,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R2', 'R1', 'R1'],
      ['R2', 'R2', 'R3', 'R3', 'R1'],
      ['R4', 'R4', 'R5', 'R3', 'R3'],
      ['R4', 'R5', 'R5', 'R3', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 4 },
      { row: 1, col: 1 },
      { row: 2, col: 3 },
      { row: 3, col: 0 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 36,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 10,
    name: '土拨鼠谜题 10',
    description: '5x5 入门关，优先用整块区域做排除会很快。',
    size: 5,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R2', 'R1', 'R1'],
      ['R5', 'R2', 'R2', 'R4', 'R3'],
      ['R5', 'R2', 'R4', 'R4', 'R3'],
      ['R5', 'R5', 'R5', 'R4', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 3 },
      { row: 1, col: 1 },
      { row: 2, col: 4 },
      { row: 3, col: 2 },
      { row: 4, col: 0 }
    ],
    regionCount: 5,
    rewardCoins: 38,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 11,
    name: '土拨鼠谜题 11',
    description: '5x5 轻松关，已经能靠系统排除稳定求解。',
    size: 5,
    regionBoard: [
      ['R3', 'R1', 'R1', 'R1', 'R2'],
      ['R3', 'R3', 'R1', 'R2', 'R2'],
      ['R3', 'R3', 'R1', 'R4', 'R4'],
      ['R3', 'R5', 'R1', 'R5', 'R4'],
      ['R5', 'R5', 'R5', 'R5', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 4 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 40,
    difficultyLabel: '轻松',
    isSystem: true
  },
  {
    levelId: 12,
    name: '土拨鼠谜题 12',
    description: '5x5 轻挑战关，当前版本最后一关，但仍保持容易推理。',
    size: 5,
    regionBoard: [
      ['R2', 'R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R2', 'R3', 'R1'],
      ['R4', 'R5', 'R2', 'R3', 'R1'],
      ['R4', 'R5', 'R5', 'R3', 'R3'],
      ['R4', 'R4', 'R5', 'R5', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 4 },
      { row: 1, col: 1 },
      { row: 2, col: 3 },
      { row: 3, col: 0 },
      { row: 4, col: 2 }
    ],
    regionCount: 5,
    rewardCoins: 42,
    difficultyLabel: '轻挑战',
    isSystem: true
  }
]
