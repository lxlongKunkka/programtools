export const PRESET_PONY_LEVELS = [
  {
    levelId: 1,
    name: '土拨鼠谜题 1',
    description: '4x4 热身关，先熟悉每种颜色放 1 只土拨鼠。',
    tutorialTitle: '先学会打叉',
    tutorialTips: [
      '先切到“打叉”模式，不急着直接放土拨鼠。',
      '观察已经很满的颜色块，把同一行同一列里明显不可能的位置先打叉。',
      '当某个颜色块只剩 1 个空位时，再切回“放土拨鼠”落子。'
    ],
    size: 4,
    regionBoard: [
      ['R2', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R1', 'R1'],
      ['R2', 'R2', 'R4', 'R3'],
      ['R4', 'R4', 'R4', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 1 }
    ],
    regionCount: 4,
    rewardCoins: 20,
    difficultyLabel: '热身',
    isSystem: true
  },
  {
    levelId: 2,
    name: '土拨鼠谜题 2',
    description: '4x4 热身关，颜色块更整齐，适合建立直觉。',
    tutorialTitle: '用行列排除',
    tutorialTips: [
      '先找已经确定有土拨鼠的行和列，把它们延伸出去全部打叉。',
      '同色区域里如果有多个候选格，先用打叉缩小范围。',
      '尽量做到“先排除，后确认”，这样更稳。'
    ],
    size: 4,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R1'],
      ['R2', 'R2', 'R1', 'R1'],
      ['R4', 'R3', 'R3', 'R3'],
      ['R4', 'R4', 'R4', 'R3']
    ],
    solutionCells: [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 1 }
    ],
    regionCount: 4,
    rewardCoins: 22,
    difficultyLabel: '热身',
    isSystem: true
  },
  {
    levelId: 3,
    name: '土拨鼠谜题 3',
    description: '4x4 入门关，开始同时观察颜色块和行列。',
    tutorialTitle: '打叉后再落子',
    tutorialTips: [
      '这一关先把相邻不能放的位置打叉，尤其是对角也不能贴着。',
      '如果一个颜色块里有格子被行、列、相邻规则同时限制，优先打叉它。',
      '只在“唯一候选”出现时放土拨鼠，节奏会更轻松。'
    ],
    size: 4,
    regionBoard: [
      ['R2', 'R2', 'R1', 'R1'],
      ['R2', 'R2', 'R1', 'R3'],
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
    rewardCoins: 24,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 4,
    name: '土拨鼠谜题 4',
    description: '4x4 入门关，尝试先找只能放的颜色区块。',
    size: 4,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R2'],
      ['R1', 'R1', 'R2', 'R2'],
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
    rewardCoins: 26,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 5,
    name: '土拨鼠谜题 5',
    description: '4x4 入门关，边角与相邻限制会变得更有用。',
    size: 4,
    regionBoard: [
      ['R1', 'R1', 'R2', 'R2'],
      ['R3', 'R1', 'R1', 'R2'],
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
    rewardCoins: 28,
    difficultyLabel: '入门',
    isSystem: true
  },
  {
    levelId: 6,
    name: '土拨鼠谜题 6',
    description: '4x4 轻松关，继续练习打叉排除法。',
    size: 4,
    regionBoard: [
      ['R1', 'R1', 'R2', 'R2'],
      ['R3', 'R1', 'R1', 'R2'],
      ['R3', 'R4', 'R4', 'R2'],
      ['R3', 'R4', 'R4', 'R4']
    ],
    solutionCells: [
      { row: 0, col: 1 },
      { row: 1, col: 3 },
      { row: 2, col: 0 },
      { row: 3, col: 2 }
    ],
    regionCount: 4,
    rewardCoins: 30,
    difficultyLabel: '轻松',
    isSystem: true
  },
  {
    levelId: 7,
    name: '土拨鼠谜题 7',
    description: '4x4 轻松关，区域更碎一点，但仍然以直观推理为主。',
    size: 4,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R2'],
      ['R1', 'R3', 'R2', 'R2'],
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
    rewardCoins: 32,
    difficultyLabel: '轻松',
    isSystem: true
  },
  {
    levelId: 8,
    name: '土拨鼠谜题 8',
    description: '4x4 轻挑战关，作为 5x5 前的最后过渡。',
    size: 4,
    regionBoard: [
      ['R1', 'R1', 'R1', 'R1'],
      ['R2', 'R2', 'R1', 'R3'],
      ['R2', 'R4', 'R4', 'R3'],
      ['R4', 'R4', 'R3', 'R3']
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
