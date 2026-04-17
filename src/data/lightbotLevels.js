import { solveLevelProgram } from '../utils/lightbotSolver.js'

function normalizeFloorColor(color = 'neutral') {
  return ['neutral', 'green', 'red'].includes(color) ? color : 'neutral'
}

export function makeTile(height = 1, target = false, floorColor = 'neutral') {
  return { h: height, target, floorColor: normalizeFloorColor(floorColor) }
}

function mapTiles(entries) {
  return entries.map(([x, y, z = 0, target = false, color = 'neutral']) => ({
    x,
    y,
    z,
    tile: target ? 'L' : 'N',
    color: normalizeFloorColor(color)
  }))
}

function pathTiles(points, targetIndexes = []) {
  const targetSet = new Set(targetIndexes)
  return points.map(([x, y, z = 0], index) => ({
    x,
    y,
    z,
    tile: targetSet.has(index) ? 'L' : 'N',
    color: 'neutral'
  }))
}

function branchTiles(pattern = []) {
  const entries = []
  pattern.forEach((color, index) => {
    const floorColor = normalizeFloorColor(color)
    entries.push([index, 1, 0, false, floorColor])
    entries.push([index, floorColor === 'green' ? 0 : 2, 0, true, floorColor])
  })
  entries.push([pattern.length, 1, 0, false, 'neutral'])
  return mapTiles(entries)
}

function buildBoardFromTiles(tiles) {
  const maxX = Math.max(...tiles.map((tile) => tile.x))
  const maxY = Math.max(...tiles.map((tile) => tile.y))
  const board = Array.from({ length: maxY + 1 }, () => Array.from({ length: maxX + 1 }, () => null))

  tiles.forEach((tile) => {
    board[tile.y][tile.x] = makeTile(tile.z + 1, tile.tile === 'L', tile.color || 'neutral')
  })

  return board
}

function isRepeatOperation(operation) {
  return Boolean(operation && typeof operation === 'object' && operation.type === 'repeat')
}

function isConditionalOperation(operation) {
  return Boolean(operation && typeof operation === 'object' && operation.type === 'condition')
}

function cloneOperationEntry(operation) {
  if (isRepeatOperation(operation) || isConditionalOperation(operation)) {
    return { ...operation }
  }
  return operation
}

function cloneOperationList(list = []) {
  return list.map((operation) => cloneOperationEntry(operation))
}

function expandOperationList(list = []) {
  const expanded = []

  list.forEach((operation) => {
    if (isRepeatOperation(operation)) {
      for (let index = 0; index < operation.count; index += 1) {
        expanded.push(operation.body)
      }
      return
    }

    expanded.push(cloneOperationEntry(operation))
  })

  return expanded
}

function buildTeachingDemo(chapter, solvedDemo) {
  const demo = {
    main: cloneOperationList(solvedDemo?.main || []),
    p1: cloneOperationList(solvedDemo?.p1 || []),
    p2: cloneOperationList(solvedDemo?.p2 || [])
  }

  if (['basics', 'routing', 'procedures'].includes(chapter.id)) {
    return {
      main: expandOperationList(demo.main),
      p1: expandOperationList(demo.p1),
      p2: expandOperationList(demo.p2)
    }
  }

  return demo
}

function createRepeatOperation(body, count) {
  return { type: 'repeat', body, count }
}

function createConditionalOperation(body, test = 'dark-target') {
  return { type: 'condition', body, test }
}

function ifDark(body = 'light') {
  return createConditionalOperation(body, 'dark-target')
}

function ifClear(body = 'walk') {
  return createConditionalOperation(body, 'forward-clear')
}

function ifGreen(body = 'left') {
  return createConditionalOperation(body, 'green-floor')
}

function ifRed(body = 'right') {
  return createConditionalOperation(body, 'red-floor')
}

function buildColorBranchProcedure() {
  return [
    ifGreen('left'), ifRed('right'), 'walk', 'light',
    ifGreen('right'), ifRed('left'),
    ifGreen('right'), ifRed('left'), 'walk',
    ifGreen('left'), ifRed('right'), 'walk'
  ]
}

function buildForcedColorLevel({
  id,
  title,
  description,
  goal,
  pattern,
  tips,
  mainLimit = 1,
  mainProgram,
  p1Limit = 12
}) {
  return {
    id,
    title,
    description,
    goal,
    mainLimit,
    procLimits: { p1: p1Limit },
    tips,
    start: { x: 0, y: 1, dir: 'forward' },
    tiles: branchTiles(pattern),
    demo: {
      main: cloneOperationList(mainProgram),
      p1: buildColorBranchProcedure(),
      p2: []
    }
  }
}

function countConditionExecutionsForOperation(operation, procedures, depth = 0) {
  if (depth > 8) return 0

  if (operation && typeof operation === 'object' && operation.type === 'condition') {
    return 1
  }

  if (operation && typeof operation === 'object' && operation.type === 'repeat') {
    return countConditionExecutionsForOperation(operation.body, procedures, depth + 1) * operation.count
  }

  if (typeof operation === 'string' && ['p1', 'p2'].includes(operation)) {
    return countConditionExecutionsForList(procedures[operation] || [], procedures, depth + 1)
  }

  return 0
}

function countConditionExecutionsForList(list = [], procedures, depth = 0) {
  if (depth > 8) return 0
  return list.reduce((sum, operation) => sum + countConditionExecutionsForOperation(operation, procedures, depth), 0)
}

function countConditionExecutionsForProgram(program = {}) {
  return countConditionExecutionsForList(program.main || [], program)
}

function buildCampaignLevel(chapter, level, chapterIndex, levelIndex) {
  const commandOptions = { ...(chapter.commandOptions || {}), ...(level.commandOptions || {}) }
  const completionRequirements = { ...(chapter.completionRequirements || {}), ...(level.completionRequirements || {}) }
  const baseLevel = {
    id: level.id,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterOrder: chapterIndex,
    title: level.title,
    skill: level.skill || chapter.skill,
    description: level.description,
    goal: level.goal,
    mainLimit: level.mainLimit,
    commandOptions,
    completionRequirements,
    procLimits: { ...(level.procLimits || {}) },
    tips: (level.tips && level.tips.length ? level.tips : chapter.tips).map((tip) => ({ ...tip })),
    board: buildBoardFromTiles(level.tiles),
    start: { ...level.start },
    order: levelIndex
  }

  const solvedDemo = !level.demo && !(commandOptions.ifGreen || commandOptions.ifRed || commandOptions.ifDark || commandOptions.ifForwardClear)
    ? solveLevelProgram(baseLevel)
    : null
  const demo = level.demo
    ? {
      main: cloneOperationList(level.demo.main || []),
      p1: cloneOperationList(level.demo.p1 || []),
      p2: cloneOperationList(level.demo.p2 || [])
    }
    : buildTeachingDemo(chapter, solvedDemo?.solvable ? solvedDemo : null)

  if ((commandOptions.ifGreen || commandOptions.ifRed || commandOptions.ifDark || commandOptions.ifForwardClear) && !completionRequirements.minConditionExecutions) {
    const minConditionExecutions = countConditionExecutionsForProgram(demo)
    if (minConditionExecutions > 0) {
      completionRequirements.minConditionExecutions = minConditionExecutions
    }
  }

  return {
    ...baseLevel,
    demo,
    completionRequirements: Object.keys(completionRequirements).length ? completionRequirements : {}
  }
}

const CAMPAIGN_CHAPTERS = [
  {
    id: 'basics',
    title: '基础动作',
    skill: 'Walk / Turn / Jump / Light',
    summary: '用最少变量建立空间感，先学会走、转、跳、点，再进入真正的规划。',
    learningGoals: ['理解朝向', '区分 Walk / Jump', '完成单段路线'],
    mechanicTags: ['Walk', 'Turn', 'Jump', 'Light'],
    tips: [
      { title: '先看朝向', copy: 'Lightbot 的错误多数不是路径错，而是转向错。每次移动前先看机器人正面。' },
      { title: '区分 Walk 和 Jump', copy: 'Walk 只能走向同高度平台；Jump 可以上升一层，也可以向低处跳。' }
    ],
    levels: [
      {
        id: 'basics-1',
        title: '1. 直线点灯',
        description: '第一关只保留最基本的前进与点灯，让玩家先建立 Walk 后 Light 的顺序感。',
        goal: '向前走到终点并点亮唯一灯块。',
        mainLimit: 3,
        procLimits: {},
        tips: [
          { title: '先走再亮', copy: '起点不是灯块，不要一上来就按 Light。先走到目标格上。' },
          { title: '默认 demo 长什么样', copy: '这一关的示范程序只有两段：向前推进，然后点亮。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0]], [2])
      },
      {
        id: 'basics-2',
        title: '2. 转角入门',
        description: '玩家第一次在默认流程里遇到拐角，重点是理解转向指令比移动更早发生。',
        goal: '在小转角后走到灯块并点亮。',
        mainLimit: 4,
        procLimits: {},
        tips: [
          { title: '转向不位移', copy: 'Left 和 Right 只改变朝向，不会让机器人前进一步。' },
          { title: '拐角先想脸朝哪', copy: '走到拐角前就要想好下一步该朝哪个方向转。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1], [1, 1], [1, 0]], [2])
      },
      {
        id: 'basics-3',
        title: '3. 一级上台',
        description: '把第一层高度差单独拿出来，让 Jump 的规则在没有岔路干扰时就被记住。',
        goal: '跳上一层高台并点亮终点。',
        mainLimit: 4,
        procLimits: {},
        tips: [
          { title: 'Jump 只差一层', copy: '向上 Jump 只能跨一层高度差，这也是后面所有台阶题的基础。' },
          { title: 'Walk 上不去', copy: '当前方台面更高时，Walk 会直接失效。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0, 0], [1, 0, 0], [2, 0, 1]], [2])
      },
      {
        id: 'basics-4',
        title: '4. 拐弯上台',
        description: '把转向和 Jump 放进同一条短路径，开始训练连续两步以上的动作规划。',
        goal: '先转弯再跳上终点平台。',
        mainLimit: 6,
        procLimits: {},
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1, 0], [1, 1, 0], [1, 0, 0], [2, 0, 1]], [3])
      },
      {
        id: 'basics-5',
        title: '5. 向下跳',
        description: '很多玩家只记住 Jump 能上台阶，却忘了它也能向低处落下，这关专门校准这一点。',
        goal: '从高处向下跳到灯块并点亮。',
        mainLimit: 3,
        procLimits: {},
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0, 2], [1, 0, 1], [2, 0, 0]], [2])
      },
      {
        id: 'basics-6',
        title: '6. 双灯长桥',
        description: '开始出现两个目标点，让玩家意识到点灯顺序本身也是解题的一部分。',
        goal: '沿长桥依次点亮两盏灯。',
        mainLimit: 6,
        procLimits: {},
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [2, 4])
      },
      {
        id: 'basics-7',
        title: '7. 小回字',
        description: '这关第一次让玩家绕一小圈再点第二盏灯，强调转向节奏不要被第一盏灯打断。',
        goal: '沿拐角路径点亮两个灯块。',
        mainLimit: 9,
        procLimits: {},
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1], [1, 1], [1, 0], [0, 0]], [1, 2])
      },
      {
        id: 'basics-8',
        title: '8. 连续三级跳',
        description: '用一条完全由上升台阶组成的短图，让 Jump 链成为一个清晰的动作模板。',
        goal: '连续跳上三级高台并点亮终点。',
        mainLimit: 4,
        procLimits: {},
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0, 0], [1, 0, 1], [2, 0, 2], [3, 0, 3]], [3])
      },
      {
        id: 'basics-9',
        title: '9. U 形回程',
        description: '玩家需要在 U 形路径上完成往返，第一次练习先去远点还是先去近点的判断。',
        goal: '沿 U 形平台点亮两盏灯。',
        mainLimit: 10,
        procLimits: {},
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1], [1, 1], [2, 1], [2, 0], [1, 0], [0, 0]], [2, 5])
      },
      {
        id: 'basics-10',
        title: '10. 基础测验',
        description: '用一张小而完整的综合图检查前九关是否真的学会了转向、点灯和上台。',
        goal: '先点亮平地灯，再转向跳上高台点亮终点。',
        mainLimit: 10,
        procLimits: {},
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: pathTiles([[0, 2, 0], [1, 2, 0], [2, 2, 0], [2, 1, 1], [2, 0, 1], [3, 0, 2]], [2, 5])
      }
    ]
  },
  {
    id: 'routing',
    title: '路线规划',
    skill: 'Route Planning',
    summary: '开始处理多目标、分叉与折返，把会写动作升级成会安排顺序。',
    learningGoals: ['确定访问顺序', '减少折返', '分段思考路线'],
    mechanicTags: ['Multi-target', 'Branching', 'Route'],
    tips: [
      { title: '先决定顺序', copy: '多目标关卡里，先后顺序会直接影响需要多少次转向和折返。' },
      { title: '把地图分段', copy: '别把整张图一次想完，先确定第一段路线，再看下一段如何衔接。' }
    ],
    levels: [
      {
        id: 'routing-1',
        title: '11. T 字分流',
        description: '第一次在默认关里引入真正的分叉，目标不是操作复杂，而是顺序选择。',
        goal: '从干道出发，点亮两个支路上的灯。',
        mainLimit: 9,
        procLimits: {},
        tips: [
          { title: '先选一边', copy: '分叉题的第一步不是写指令，而是决定先去哪个支路。' },
          { title: '少折返', copy: '如果能顺路清掉一边，就不要为了近灯先来回折返。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [0, 1], [1, 1], [2, 1, 0, true], [1, 0, 0, true], [1, 2]
        ])
      },
      {
        id: 'routing-2',
        title: '12. 外圈折返',
        description: '这是一张低复杂度的外圈地图，重点是练习走到尽头后如何无浪费折返。',
        goal: '沿外圈依次点亮两盏灯。',
        mainLimit: 10,
        procLimits: {},
        tips: [
          { title: '看完整圈', copy: '外圈题不要只看眼前一段，要先把整圈路线在脑中走一遍。' },
          { title: '折返也要计成本', copy: '每多一次转向和折返，程序都会明显变长。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [0, 1], [1, 1], [2, 1], [2, 0, 0, true], [1, 0], [0, 0, 0, true]
        ])
      },
      {
        id: 'routing-3',
        title: '13. 三灯走廊',
        description: '在一条折线走廊上排三个目标点，训练玩家用最少转向覆盖全部灯块。',
        goal: '走完整条折线并点亮三盏灯。',
        mainLimit: 11,
        procLimits: {},
        tips: [
          { title: '把长路拆段', copy: '这类地图通常可以拆成直线段和拐角段两部分来思考。' },
          { title: '不要漏中间灯', copy: '长路上常见错误是只盯终点，结果经过中间灯块却忘记点亮。' }
        ],
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: pathTiles([[0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0], [4, 0]], [2, 4, 6])
      },
      {
        id: 'routing-4',
        title: '14. 高台支路',
        description: '高低差开始和路线选择叠加，玩家需要决定先上高台还是先清空平地。',
        goal: '点亮平地与高台上的两盏灯。',
        mainLimit: 10,
        procLimits: {},
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [0, 1], [1, 1], [2, 1, 0, true], [1, 0], [2, 0, 1, true]
        ])
      },
      {
        id: 'routing-5',
        title: '15. 小回字',
        description: '这关用 3x3 外圈制造一个完整环路，让玩家第一次系统处理回字形路径。',
        goal: '沿外圈点亮三个角上的灯。',
        mainLimit: 14,
        procLimits: {},
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2, 0, true],
          [0, 1], [2, 1],
          [0, 0, 0, true], [1, 0], [2, 0, 0, true]
        ])
      },
      {
        id: 'routing-6',
        title: '16. 十字四灯',
        description: '十字图很适合训练回到中心再出发的节奏，这比简单直线更接近真实关卡思维。',
        goal: '以中心平台为中转，点亮四个方向的灯。',
        mainLimit: 17,
        procLimits: {},
        start: { x: 1, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [1, 1], [1, 0, 0, true], [2, 1, 0, true], [1, 2, 0, true], [0, 1, 0, true]
        ])
      },
      {
        id: 'routing-7',
        title: '17. 蛇形台阶',
        description: '路线开始变长，但仍然保持单一主路，重点是规划而不是找路。',
        goal: '沿蛇形台阶点亮三个灯。',
        mainLimit: 14,
        procLimits: {},
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: pathTiles([[0, 2, 0], [1, 2, 0], [2, 2, 1], [2, 1, 1], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1]], [2, 5, 7])
      },
      {
        id: 'routing-8',
        title: '18. 桥与塔',
        description: '把长桥、回头和高台串在一起，让玩家开始形成路线分阶段执行的意识。',
        goal: '先清理桥面灯，再跳上塔顶。',
        mainLimit: 13,
        procLimits: {},
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 0], [3, 0, 1], [4, 0, 2]], [2, 5])
      },
      {
        id: 'routing-9',
        title: '19. 双层阳台',
        description: '玩家需要处理一层与二层之间的切换，同时避免在窄路上无意义来回。',
        goal: '点亮一层和二层的三个灯块。',
        mainLimit: 15,
        procLimits: {},
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2, 0, true], [2, 1, 1], [2, 0, 1, true], [3, 0, 1], [3, 1, 0, true]
        ])
      },
      {
        id: 'routing-10',
        title: '20. 路线总测',
        description: '这是路线规划章节的压轴关，路径不难看懂，但顺序错了就会多出很多转向。',
        goal: '完成外圈、支路和高台三个区域的清理。',
        mainLimit: 18,
        procLimits: {},
        start: { x: 0, y: 3, dir: 'forward' },
        tiles: mapTiles([
          [0, 3], [1, 3], [2, 3, 0, true], [3, 3],
          [3, 2, 1], [3, 1, 1, true],
          [2, 1], [1, 1, 0, true], [0, 1],
          [0, 2], [1, 2]
        ])
      }
    ]
  },
  {
    id: 'procedures',
    title: '过程抽象',
    skill: 'P1',
    summary: '把重复动作块从 MAIN 提炼出去，让程序第一次具备真正的结构。',
    learningGoals: ['识别重复模板', '用 P1 压缩 MAIN', '把高度变化也抽成过程'],
    mechanicTags: ['P1', 'Template', 'Abstraction'],
    tips: [
      { title: '抽动作块', copy: '当同一串动作会完整重复时，把它抽进 P1 比继续堆在 MAIN 更清晰。' },
      { title: '过程不是垃圾桶', copy: 'P1 应该装一段稳定模板，而不是把剩余指令随便塞进去。' }
    ],
    levels: [
      {
        id: 'procedures-1',
        title: '21. 双段模板',
        description: '这是第一张明确要求 P1 的默认关，同一动作块要完整调用两次。',
        goal: '用一段重复模板点亮两盏灯。',
        mainLimit: 2,
        procLimits: { p1: 3 },
        tips: [
          { title: '先找重复块', copy: '看到两段完全一样的动作时，不要先写 MAIN，先把模板抽出来。' },
          { title: 'MAIN 只保留调用', copy: '这一章开始，MAIN 更像调度器，而不是装所有动作的地方。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [2, 4])
      },
      {
        id: 'procedures-2',
        title: '22. 三段模板',
        description: '把上一关的结构扩展成三段，玩家会自然感受到调用过程比抄三遍更稳定。',
        goal: '重复同一过程三次点亮三盏灯。',
        mainLimit: 3,
        procLimits: { p1: 3 },
        tips: [
          { title: '三次比两次更明显', copy: '重复次数一多，是否抽过程会立刻体现在 MAIN 长度上。' },
          { title: 'P1 要完整', copy: '只有当整段动作都稳定复现时，抽成过程才真正划算。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]], [2, 4, 6])
      },
      {
        id: 'procedures-3',
        title: '23. 跳跃模板',
        description: '过程不一定是平地移动，这关把 Jump 与 Light 组成一个可重复的最小模板。',
        goal: '用同一段跳跃模板依次点亮三个高点。',
        mainLimit: 3,
        procLimits: { p1: 2 },
        tips: [
          { title: '过程也能装 Jump', copy: 'P1 并不关心动作类型，只关心这段序列会不会重复。' },
          { title: '模板越小越稳', copy: '刚开始学过程时，先抽短模板，比一上来抽很长更容易对。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0, 0], [1, 0, 1], [2, 0, 0], [3, 0, 1], [4, 0, 0], [5, 0, 1]], [1, 3, 5])
      },
      {
        id: 'procedures-4',
        title: '24. 四段模板',
        description: 'MAIN 空间进一步收紧，玩家必须开始把过程当成正式的组织工具，而不是可选优化。',
        goal: '重复同一模板四次点亮四盏灯。',
        mainLimit: 4,
        procLimits: { p1: 3 },
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]], [2, 4, 6, 8])
      },
      {
        id: 'procedures-5',
        title: '25. 双拐角模板',
        description: '这关把同一个拐角模板连续复现两次，要求玩家第一次把转向模板稳定塞进 P1。',
        goal: '把两段完全一致的拐角点灯动作抽成一个过程。',
        mainLimit: 2,
        procLimits: { p1: 4 },
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]], [2, 4])
      },
      {
        id: 'procedures-6',
        title: '26. 双塔模板',
        description: '同一段跳起、走一步、点灯的动作会出现两次，这一关把过程从平地模板升级到高差模板。',
        goal: '用一个跳跃过程依次点亮两座高台。',
        mainLimit: 2,
        procLimits: { p1: 3 },
        start: { x: 0, y: 1, dir: 'forward' },
        tips: [
          { title: '先识别重复跳段', copy: '如果你看见两次完全一样的 Jump 加 Walk 组合，就该想到过程。' },
          { title: 'MAIN 只需要调用', copy: '当过程定义稳定后，MAIN 最好只剩少量调用。' }
        ],
        tiles: pathTiles([[0, 1, 0], [1, 1, 1], [2, 1, 1], [3, 1, 2], [4, 1, 2]], [2, 4])
      },
      {
        id: 'procedures-7',
        title: '27. 回字边框',
        description: '把边框上的同构边段抽成过程，是从局部重复到图形重复的第一步。',
        goal: '沿外框点亮四个角灯。',
        mainLimit: 8,
        procLimits: { p1: 4 },
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2, 0, true],
          [0, 1], [2, 1],
          [0, 0, 0, true], [1, 0], [2, 0, 0, true],
          [3, 0], [3, 1], [3, 2, 0, true]
        ])
      },
      {
        id: 'procedures-8',
        title: '28. 阶梯双段',
        description: '这关要求玩家把前进再上台的两段组合识别为可复用过程。',
        goal: '完成两段相似的阶梯点灯。',
        mainLimit: 6,
        procLimits: { p1: 4 },
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1, 0], [1, 1, 0], [2, 1, 1], [3, 1, 1], [4, 1, 2], [5, 1, 2]], [2, 5])
      },
      {
        id: 'procedures-9',
        title: '29. 双支路回收',
        description: 'P1 不只用于前进，还可以负责一段出发、点灯、回收位置的结构。',
        goal: '从主干分别处理上下两条支路。',
        mainLimit: 7,
        procLimits: { p1: 5 },
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [0, 1], [1, 1], [2, 1], [3, 1],
          [2, 0, 0, true], [2, 2, 0, true]
        ])
      },
      {
        id: 'procedures-10',
        title: '30. 过程总测',
        description: '压轴关要求玩家主动在图上寻找模板，而不是等线性长桥把答案塞到脸上。',
        goal: '用过程整理一张小型综合图。',
        mainLimit: 8,
        procLimits: { p1: 5 },
        start: { x: 0, y: 3, dir: 'forward' },
        tiles: mapTiles([
          [0, 3], [1, 3], [2, 3], [3, 3, 0, true],
          [1, 2], [2, 2, 1], [3, 2, 1, true],
          [1, 1], [2, 1], [3, 1, 0, true]
        ])
      }
    ]
  },
  {
    id: 'compression',
    title: '压缩策略',
    skill: 'Repeat / P1 / P2',
    summary: '开始同时比较 Repeat、P1 和 P2 三种压缩手段，学会为不同结构分配不同工具。',
    learningGoals: ['识别可 Repeat 的节奏', '区分 P1 与 P2 职责', '组合多层压缩'],
    mechanicTags: ['Repeat', 'P1', 'P2'],
    tips: [
      { title: '先看是否能 Repeat', copy: '连续重复同一指令时，Repeat 比新开过程更直接。' },
      { title: 'P1 和 P2 要分工', copy: '当地图里同时出现两类重复结构时，才值得把 P1 和 P2 都用起来。' }
    ],
    levels: [
      {
        id: 'compression-1',
        title: '31. 纯走廊压缩',
        description: '这关专门让玩家感受 Repeat Walk 的价值，地图很简单，压缩思路才是主角。',
        goal: '沿超长走廊走到终点并点灯。',
        mainLimit: 3,
        procLimits: {},
        tips: [
          { title: '连续同动作就想 Repeat', copy: '如果你看到同一个动作要连按很多次，先看它是不是能直接压成 Repeat。' },
          { title: '不要过度设计', copy: '这类关卡用过程往往反而更绕，直接 Repeat 最干净。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], [5])
      },
      {
        id: 'compression-2',
        title: '32. 纯跳台压缩',
        description: '连续四次 Jump 是最自然的 Repeat 教材，玩家几乎不需要理解额外结构。',
        goal: '连续跳上四级高台并点亮终点。',
        mainLimit: 2,
        procLimits: {},
        tips: [
          { title: 'Repeat 不只给 Walk', copy: 'Jump、Left、Right 这些动作在连续出现时也都能被压缩。' },
          { title: '先看节奏是否单一', copy: '只有节奏完全一致时，Repeat 才会是最优选择。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0, 0], [1, 0, 1], [2, 0, 2], [3, 0, 3], [4, 0, 4]], [4])
      },
      {
        id: 'compression-3',
        title: '33. 重复调用 P1',
        description: 'MAIN 中不再是简单堆三个过程调用，而是应该看见同一调用也能再次压缩。',
        goal: '让同一个过程被连续调用三次。',
        mainLimit: 1,
        procLimits: { p1: 3 },
        tips: [
          { title: '过程也能被 Repeat', copy: '当调用本身重复时，MAIN 里同样可以继续做压缩。' },
          { title: '两层抽象', copy: '先定义 P1，再决定如何安排 MAIN，这就是压缩章的核心。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]], [2, 4, 6])
      },
      {
        id: 'compression-4',
        title: '34. 四连调用',
        description: '把调用次数再拉高一档，明确告诉玩家过程和 Repeat 可以叠加使用。',
        goal: '让同一过程被连续调用四次。',
        mainLimit: 1,
        procLimits: { p1: 3 },
        tips: [
          { title: '调用本身也有节奏', copy: '当 MAIN 里只剩一串连续的 P1 调用时，也该考虑用 Repeat 压缩。' },
          { title: '先稳定过程定义', copy: '只有 P1 足够稳定，MAIN 才会被压成一个干净的调用节奏。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]], [2, 4, 6, 8])
      },
      {
        id: 'compression-5',
        title: '35. 双模板并列',
        description: '这张图第一次提供两类不同重复，理论上已经值得把 P1 和 P2 分开存放。',
        goal: '用两种模板整理平地与高台段。',
        mainLimit: 5,
        procLimits: { p1: 3, p2: 2 },
        tips: [
          { title: '两个过程不要做同一件事', copy: 'P1 和 P2 最好分别负责两类结构，而不是相互替代。' },
          { title: '先判别谁更像模板', copy: '不是所有重复都值得抽过程，先找出现次数更多、边界更清晰的那段。' }
        ],
        start: { x: 0, y: 0, dir: 'forward' },
        tiles: pathTiles([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 1], [4, 0, 0], [5, 0, 0], [6, 0, 0], [7, 0, 1]], [2, 3, 6, 7])
      },
      {
        id: 'compression-6',
        title: '36. 双支路双模板',
        description: '玩家需要意识到上下两条支路虽然都从主路出发，但适合拆成两个不同过程。',
        goal: '分别清理上下两条支路上的重复结构。',
        mainLimit: 11,
        procLimits: { p1: 4, p2: 3 },
        tips: [
          { title: '共同起点不等于共同模板', copy: '上下两条支路都从主路分出，但真正重复的是各自内部的节奏。' },
          { title: '第二类重复交给 P2', copy: '当另一种模式也足够稳定时，就应该让 P2 出场，而不是继续往 P1 里硬塞。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
          [2, 0, 1, true], [3, 0, 1], [4, 0, 2, true],
          [2, 2, 0, true], [3, 2], [4, 2, 0, true]
        ])
      },
      {
        id: 'compression-7',
        title: '37. 回字压缩',
        description: '边框回路天然适合抽模板，再加上长直段的 Repeat，可以形成双层压缩。',
        goal: '压缩外圈路径并点亮四盏灯。',
        mainLimit: 8,
        procLimits: { p1: 2, p2: 2 },
        tips: [
          { title: '回字先找边段', copy: '面对回字图时，先找哪一条边会反复出现，而不是先看整圈。' },
          { title: '过程和 Repeat 分层用', copy: '过程负责边段模板，Repeat 负责连续直行，这样程序层次最清楚。' }
        ],
        start: { x: 0, y: 3, dir: 'forward' },
        tiles: mapTiles([
          [0, 3], [1, 3], [2, 3], [3, 3, 0, true],
          [0, 2], [3, 2],
          [0, 1, 0, true], [3, 1, 0, true],
          [0, 0], [1, 0], [2, 0], [3, 0, 0, true]
        ])
      },
      {
        id: 'compression-8',
        title: '38. 桥面加双塔',
        description: '一类模板负责桥面，一类模板负责上塔，这关会自然暴露 P2 的存在意义。',
        goal: '先处理桥面，再分别点亮两座塔。',
        mainLimit: 9,
        procLimits: { p1: 3, p2: 2 },
        tips: [
          { title: '先分平地和高台', copy: '桥面与上塔动作节奏完全不同，混到同一个过程里会很难整理。' },
          { title: '双过程最好有分工', copy: '一个过程处理桥面，一个过程处理上塔，MAIN 只负责安排顺序。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: mapTiles([
          [0, 1], [1, 1], [2, 1], [3, 1, 0, true], [4, 1], [5, 1],
          [2, 0, 1], [3, 0, 2, true],
          [4, 0, 1], [5, 0, 2, true]
        ])
      },
      {
        id: 'compression-9',
        title: '39. 双平台往返',
        description: '这是一次对压缩策略的中测：同构平台、回收位置和高低差要同时考虑。',
        goal: '完成两次近似往返并点亮四盏灯。',
        mainLimit: 8,
        procLimits: { p1: 4, p2: 4 },
        tips: [
          { title: '看骨架，不只看高度', copy: '上下平台高度不同，但如果动作骨架一致，仍然可能属于同类模板。' },
          { title: '过程结束位置要可复用', copy: '往返题里，过程最后停在哪，会决定下一次还能不能继续复用。' }
        ],
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2], [3, 2],
          [1, 1, 1, true], [2, 1], [3, 1, 1, true],
          [1, 3, 0, true], [2, 3], [3, 3, 0, true]
        ])
      },
      {
        id: 'compression-10',
        title: '40. 压缩总测',
        description: '这一关不再告诉玩家该用什么，只提供一个明显可以被多层压缩的结构。',
        goal: '用合适的压缩手段完成整图。',
        mainLimit: 8,
        procLimits: { p1: 4, p2: 2 },
        tips: [
          { title: '三种工具先比较', copy: '下手之前先比较这段更适合 Repeat、P1 还是 P2，而不是写到一半再返工。' },
          { title: '结构清楚比堆最短更重要', copy: '压缩总测考的不只是能过，还考你能否把程序组织得足够整洁。' }
        ],
        start: { x: 0, y: 4, dir: 'forward' },
        tiles: mapTiles([
          [0, 4], [1, 4], [2, 4], [3, 4, 0, true], [4, 4],
          [2, 3, 1], [3, 3, 1, true], [4, 3, 1],
          [2, 2], [3, 2, 0, true], [4, 2],
          [4, 1, 1, true]
        ])
      }
    ]
  },
  {
    id: 'master',
    title: '综合挑战',
    skill: 'Strategy',
    summary: '把前面学过的路线、过程、Repeat 与条件块真正组合起来。前半章练结构拆分，后半章练把 If Dark / If Clear 并入终章程序。',
    learningGoals: ['拆复杂图为结构块', '组合 P1 / P2 / Repeat', '在终章里合并 If Dark / If Clear'],
    mechanicTags: ['Strategy', 'P1', 'P2', 'Repeat', 'If Dark', 'If Clear'],
    tips: [
      { title: '先拆结构再写程序', copy: '综合关如果直接开始写指令，通常会很快迷路。先把地图拆成若干重复区域。' },
      { title: '允许回头重构', copy: '写到一半发现 MAIN 爆了是正常现象，应该回头重新抽过程，而不是继续硬塞。' }
    ],
    levels: [
      {
        id: 'master-1',
        title: '51. 双回路',
        description: '第一关综合题先从双回路入手，让玩家用之前的路线与过程经验重新组织地图。',
        goal: '清理外圈和内侧支路上的四盏灯。',
        mainLimit: 12,
        procLimits: { p1: 4 },
        tips: [
          { title: '先分区', copy: '综合关不要一上来写指令，先把地图分成外圈和内侧两个任务区。' },
          { title: '局部重复优先', copy: '就算整图很复杂，局部往往仍然有能抽模板的重复块。' }
        ],
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2], [3, 2, 0, true],
          [0, 1], [3, 1],
          [0, 0, 0, true], [1, 0], [2, 0], [3, 0, 0, true],
          [2, 1, 1, true]
        ])
      },
      {
        id: 'master-2',
        title: '52. 螺旋阶梯',
        description: '玩家会在螺旋上逐步升高，路径可读但转向顺序稍有错误就会乱掉。',
        goal: '沿螺旋上升并点亮三个关键灯块。',
        mainLimit: 13,
        procLimits: { p1: 4 },
        tips: [
          { title: '先画旋转节奏', copy: '螺旋图的难点不在跳跃，而在每一层之后都要立刻换方向。' },
          { title: '不要怕回头改结构', copy: '如果写到一半发现顺序很乱，通常说明你还没真正理解地图的旋转节奏。' }
        ],
        start: { x: 0, y: 3, dir: 'forward' },
        tiles: pathTiles([[0, 3, 0], [1, 3, 0], [2, 3, 1], [2, 2, 1], [2, 1, 2], [1, 1, 2], [0, 1, 3]], [2, 4, 6])
      },
      {
        id: 'master-3',
        title: '53. 桥塔交错',
        description: '综合关开始混合桥面、回收路径和塔台，让单一技巧不再能直接通关。',
        goal: '先处理桥面，再处理两侧高塔。',
        mainLimit: 13,
        procLimits: { p1: 4, p2: 4 },
        tips: [
          { title: '开始分工 P1 和 P2', copy: '如果桥面和塔台动作明显不同，就应该考虑把两类模板拆给两个过程。' },
          { title: '综合关也要分层', copy: '先处理平地结构，再处理高差结构，程序会清楚很多。' }
        ],
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2, 0, true], [3, 2], [4, 2, 0, true], [5, 2],
          [2, 1, 1], [2, 0, 2, true],
          [4, 1, 1], [4, 0, 2, true]
        ])
      },
      {
        id: 'master-4',
        title: '54. 双层回字',
        description: '同一个回字形被拆成上下两层，玩家必须区分平地外圈和高台内圈的作用。',
        goal: '点亮上下两层回路中的五盏灯。',
        mainLimit: 15,
        procLimits: { p1: 4, p2: 4 },
        tips: [
          { title: '上下两层别混想', copy: '先把平地回路和高台回路分别看懂，再考虑它们如何串起来。' },
          { title: '双过程适合双层结构', copy: '当两层回路节奏不同，用 P1 和 P2 分层管理通常最稳。' }
        ],
        start: { x: 0, y: 3, dir: 'forward' },
        tiles: mapTiles([
          [0, 3], [1, 3], [2, 3], [3, 3, 0, true],
          [0, 2], [3, 2],
          [0, 1, 0, true], [1, 1, 1], [2, 1, 1, true], [3, 1, 0, true],
          [1, 0, 1], [2, 0, 1, true]
        ])
      },
      {
        id: 'master-5',
        title: '55. 三段高差',
        description: '这关的重点不是地图大，而是同一路线上要连续切换平地、一级台和二级台。',
        goal: '沿三段高差依次点亮四盏灯。',
        mainLimit: 14,
        procLimits: { p1: 4 },
        tips: [
          { title: '先标高度节奏', copy: '把整条路按高度变化分成三段，会比直接写动作更容易。' },
          { title: '同一路也能抽模板', copy: '只要某个升降节奏重复出现，就仍然值得考虑过程。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1, 0], [1, 1, 0], [2, 1, 1], [3, 1, 1], [4, 1, 2], [5, 1, 2], [6, 1, 1], [7, 1, 0]], [1, 3, 5, 7])
      },
      {
        id: 'master-6',
        title: '56. 十字城门',
        description: '十字平台在综合章节里再次出现，但这次每条支路都带有不同的高度负担。',
        goal: '从中心出发清理四条支路。',
        mainLimit: 16,
        procLimits: { p1: 4, p2: 4 },
        tips: [
          { title: '从中心看四象限', copy: '十字图最怕的是把四条支路混成一团，先把每个方向单独看。' },
          { title: '相似支路先归类', copy: '如果两条支路动作模式接近，可以考虑让它们共用一个过程。' }
        ],
        start: { x: 2, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [2, 2],
          [2, 1, 1, true], [2, 0, 2, true],
          [3, 2, 0, true], [4, 2, 0, true],
          [2, 3, 1, true], [2, 4, 1, true],
          [1, 2, 0, true], [0, 2, 0, true]
        ])
      },
      {
        id: 'master-7',
        title: '57. 双色双枝',
        description: '综合章节后半段改用颜色地板来分流：绿色脚下走左枝，红色脚下走右枝，同一套模板负责出枝、回枝和前推。',
        goal: '用颜色分支模板清理两条支路。',
        mainLimit: 2,
        commandOptions: { ifGreen: true, ifRed: true },
        procLimits: { p1: 12 },
        tips: [
          { title: '把颜色当路标', copy: '绿色地板代表这一轮要向左出枝，红色地板代表向右出枝。' },
          { title: '先把循环写进 P1', copy: 'P1 最好一次完成出枝、点灯、回到主路，再向前推进一格。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: branchTiles(['green', 'red']),
        demo: {
          main: ['p1', 'p1'],
          p1: buildColorBranchProcedure(),
          p2: []
        }
      },
      {
        id: 'master-8',
        title: '58. 三枝配色走廊',
        description: '继续把颜色分支模板拉长到三枝，让 MAIN 开始从手写调用转向压缩调用。',
        goal: '复用同一套颜色模板清理三条支路。',
        mainLimit: 3,
        commandOptions: { ifGreen: true, ifRed: true },
        procLimits: { p1: 12 },
        tips: [
          { title: '颜色决定第一拍', copy: '模板第一拍只负责看脚下颜色并决定左转还是右转。' },
          { title: '返回主路后立刻前推', copy: '如果回到主路后没有马上向前推进一格，下一次循环就会卡在原地。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: branchTiles(['green', 'red', 'green']),
        demo: {
          main: ['p1', 'p1', 'p1'],
          p1: buildColorBranchProcedure(),
          p2: []
        }
      },
      {
        id: 'master-9',
        title: '59. 颜色循环',
        description: '当颜色模板已经稳定后，MAIN 应该只剩下 Repeat。',
        goal: '把三枝走廊压缩成自动循环的颜色模板。',
        mainLimit: 1,
        commandOptions: { ifGreen: true, ifRed: true },
        procLimits: { p1: 12 },
        tips: [
          { title: 'Repeat 只压完整循环', copy: '如果 P1 还不能独立完成一次出枝与回收，就不应该过早上 Repeat。' },
          { title: '先确认每次调用都会前进', copy: '颜色循环的关键不是能点亮一枝，而是每次调用后都能落到下一块决策地板上。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: branchTiles(['green', 'red', 'green']),
        demo: {
          main: [createRepeatOperation('p1', 5)],
          p1: buildColorBranchProcedure(),
          p2: []
        }
      },
      {
        id: 'master-10',
        title: '60. 颜色总终章',
        description: '终章改成整条颜色走廊：脚下颜色决定左右分支，P1 负责完整循环，MAIN 只负责驱动。',
        goal: '用 Repeat 驱动整套颜色分支终章模板。',
        mainLimit: 1,
        commandOptions: { ifGreen: true, ifRed: true },
        procLimits: { p1: 12 },
        tips: [
          { title: '颜色是条件，P1 是结构', copy: '别把左右路线分别写死在 MAIN 里，让脚下颜色去决定这次该走哪一枝。' },
          { title: '终章看的是抽象能力', copy: '真正的终章程序应该只保留“循环一个分支模板”这层结构。' }
        ],
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: branchTiles(['green', 'red', 'red', 'green', 'red', 'green']),
        demo: {
          main: [createRepeatOperation('p1', 6)],
          p1: buildColorBranchProcedure(),
          p2: []
        }
      }
    ]
  },
  {
    id: 'conditional',
    title: '颜色分支',
    skill: 'If Green / If Red / Brush Logic',
    summary: '脚下绿色就走左枝，脚下红色就走右枝。条件块不再只是“看灯”或“看前方”，而是正式绑定到地板颜色。',
    learningGoals: ['理解地板颜色决定分支', '学会把颜色判断写进模板', '把颜色条件和 P1 / Repeat 组合起来'],
    mechanicTags: ['If Green', 'If Red', 'Floor Color', 'P1', 'Repeat'],
    commandOptions: { ifGreen: true, ifRed: true },
    tips: [
      { title: '条件块仍然只管下一条', copy: 'If Green 和 If Red 也不是整段 if/else，它们只决定下一条指令要不要执行。' },
      { title: '把颜色当地板路标', copy: '绿色地板一般配左转，红色地板一般配右转，这样同一套模板就能读懂不同分支。' }
    ],
    levels: [
      buildForcedColorLevel({
        id: 'conditional-1',
        title: '41. 第一组双色循环',
        description: '从这一关开始，程序必须让同一个模板同时处理绿色和红色两种地板。',
        goal: '用同一个 P1 模板完成一绿一红两次分支。',
        pattern: ['green', 'red'],
        mainLimit: 2,
        mainProgram: ['p1', 'p1'],
        tips: [
          { title: '关键不是左右，而是同一个模板', copy: '如果你分别为左右两枝各写一套程序，就没有学到颜色条件的核心。' },
          { title: 'P1 每次都会踩到不同颜色', copy: '第一次调用踩绿地板，第二次调用踩红地板，所以 P1 必须自己判断颜色。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-2',
        title: '42. 反向双色循环',
        description: '把颜色顺序对调一次，确认你写的是颜色模板，而不是硬记顺序。',
        goal: '继续用同一个 P1 模板处理红绿两次分支。',
        pattern: ['red', 'green'],
        mainLimit: 2,
        mainProgram: ['p1', 'p1'],
        tips: [
          { title: '不要把第一关的顺序背下来', copy: '真正稳定的程序应该能读地板颜色，而不是只适配上一关的顺序。' },
          { title: '同一模板，顺序可变', copy: '如果顺序一换程序就坏了，说明你写的不是条件模板，而是展开脚本。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-3',
        title: '43. 三枝颜色循环',
        description: '现在把同一模板拉长到三次调用，开始真正进入循环思维。',
        goal: '用 Repeat 驱动三次颜色分支。',
        pattern: ['green', 'red', 'green'],
        mainProgram: [createRepeatOperation('p1', 3)],
        tips: [
          { title: '从这一关开始用 Repeat', copy: '当 P1 已经是完整循环时，MAIN 最自然的写法就是 Repeat。' },
          { title: '三次调用里颜色并不固定', copy: '同一个 P1 会连续踩到不同颜色，所以 if 不再是可选项。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-4',
        title: '44. 三枝镜像循环',
        description: '再给一组镜像三枝，检查模板是否真正对颜色敏感。',
        goal: '用同一个模板扫完另一组三枝颜色序列。',
        pattern: ['red', 'green', 'red'],
        mainProgram: [createRepeatOperation('p1', 3)],
        tips: [
          { title: '镜像序列最容易暴露硬编码', copy: '如果你偷偷把转向顺序写死，这关会立刻坏掉。' },
          { title: '颜色必须驱动决策', copy: '只有让地板颜色决定转向，同一套模板才可能通过。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-5',
        title: '45. 四枝交替循环',
        description: '序列再拉长，但结构仍然只有一个模板。',
        goal: '用一个颜色模板扫完四块交替地板。',
        pattern: ['green', 'red', 'green', 'red'],
        mainProgram: [createRepeatOperation('p1', 4)],
        tips: [
          { title: '长度变长，结构不变', copy: '你不应该新增第二套模板，而应该继续相信同一个 P1。' },
          { title: '每轮都要回到主路', copy: '只有每次调用都回到下一块决策地板，Repeat 才能稳定工作。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-6',
        title: '46. 双色分组循环',
        description: '把颜色交替改成分组，测试模板是否真由颜色驱动。',
        goal: '用一个 P1 模板扫完绿绿红红。',
        pattern: ['green', 'green', 'red', 'red'],
        mainProgram: [createRepeatOperation('p1', 4)],
        tips: [
          { title: '不要预设颜色一定交替', copy: '模板不能依赖“下一次一定换色”这种假设。' },
          { title: '连续同色也必须稳定', copy: '两次连续绿色或红色，都应该仍然调用同一个 P1。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-7',
        title: '47. 五枝交替循环',
        description: '把交替序列拉到五枝，开始考验模板的长期稳定性。',
        goal: '用一个模板完成五次颜色分支。',
        pattern: ['green', 'red', 'green', 'red', 'green'],
        mainProgram: [createRepeatOperation('p1', 5)],
        tips: [
          { title: '真正简洁的 MAIN 只剩 Repeat', copy: '这类关卡的压缩点不在路径本身，而在于把所有局部差异都收进 P1。' },
          { title: '颜色序列只是输入', copy: '程序结构应该固定不变，变化的只是地板颜色序列。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-8',
        title: '48. 五枝混合循环',
        description: '继续换一条更不规则的颜色序列，排除“碰巧能过”的写法。',
        goal: '用一个模板扫完另一组五枝混合序列。',
        pattern: ['red', 'green', 'red', 'red', 'green'],
        mainProgram: [createRepeatOperation('p1', 5)],
        tips: [
          { title: '不规则序列更能测模板', copy: '顺序越不规则，越能证明你写的是通用模板而不是固定展开。' },
          { title: '颜色模板不能偷看次数', copy: 'P1 不应该依赖“这是第几次调用”，它只能依赖脚下颜色。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-9',
        title: '49. 五枝终测',
        description: '这一关开始，颜色判断已经成为关卡结构本身。',
        goal: '用一个颜色模板扫完五枝终测序列。',
        pattern: ['green', 'red', 'green', 'red', 'red'],
        mainProgram: [createRepeatOperation('p1', 5)],
        tips: [
          { title: '没有 if 就没有决策能力', copy: '如果拿掉 If Green / If Red，这个 P1 根本不知道自己该往哪边走。' },
          { title: '结构性要求已经形成', copy: '从这类关开始，不是系统要求你用 if，而是地图结构本身在要求。' }
        ]
      }),
      buildForcedColorLevel({
        id: 'conditional-10',
        title: '50. 颜色章终章',
        description: '终章用更长的颜色序列验证你写的是可复用模板，而不是偶然通过的脚本。',
        goal: '用一个 Repeat 驱动六次颜色分支。',
        pattern: ['green', 'red', 'red', 'green', 'red', 'green'],
        mainProgram: [createRepeatOperation('p1', 6)],
        tips: [
          { title: '终章仍然只有一个模板', copy: '如果你还想再拆第二个模板，说明抽象还不够彻底。' },
          { title: '条件章学的是模板决策', copy: '你要掌握的不是一串左右，而是让程序在运行时根据颜色做决策。' }
        ]
      })
    ]
  }
]

const CHAPTER_DISPLAY_ORDER = ['basics', 'routing', 'procedures', 'compression', 'conditional', 'master']

const ORDERED_CAMPAIGN_CHAPTERS = CHAPTER_DISPLAY_ORDER
  .map((chapterId) => CAMPAIGN_CHAPTERS.find((chapter) => chapter.id === chapterId))
  .filter(Boolean)

export const RECONSTRUCTED_LIGHTBOT_LEVELS = ORDERED_CAMPAIGN_CHAPTERS.flatMap((chapter, chapterIndex) =>
  chapter.levels.map((level, levelIndex) => buildCampaignLevel(chapter, level, chapterIndex, levelIndex))
)

export const LIGHTBOT_LEVEL_GROUPS = ORDERED_CAMPAIGN_CHAPTERS.map((chapter, chapterIndex) => ({
  id: chapter.id,
  title: chapter.title,
  summary: chapter.summary || '',
  learningGoals: [...(chapter.learningGoals || [])],
  mechanicTags: [...(chapter.mechanicTags || [])],
  order: chapterIndex,
  levels: chapter.levels.map((level, levelIndex) => buildCampaignLevel(chapter, level, chapterIndex, levelIndex))
}))

export const LIGHTBOT_LEVELS = LIGHTBOT_LEVEL_GROUPS.flatMap((group) => group.levels)

export const BASE_LIGHTBOT_LEVELS = LIGHTBOT_LEVEL_GROUPS[0]?.levels || []

export const VALID_LEVEL_IDS = new Set(LIGHTBOT_LEVELS.map((level) => level.id))
