import { solveLevelProgram } from '../utils/lightbotSolver.js'

export function makeTile(height = 1, target = false) {
  return { h: height, target }
}

function mapTiles(entries) {
  return entries.map(([x, y, z = 0, target = false]) => ({
    x,
    y,
    z,
    tile: target ? 'L' : 'N'
  }))
}

function pathTiles(points, targetIndexes = []) {
  const targetSet = new Set(targetIndexes)
  return points.map(([x, y, z = 0], index) => ({
    x,
    y,
    z,
    tile: targetSet.has(index) ? 'L' : 'N'
  }))
}

function buildBoardFromTiles(tiles) {
  const maxX = Math.max(...tiles.map((tile) => tile.x))
  const maxY = Math.max(...tiles.map((tile) => tile.y))
  const board = Array.from({ length: maxY + 1 }, () => Array.from({ length: maxX + 1 }, () => null))

  tiles.forEach((tile) => {
    board[tile.y][tile.x] = makeTile(tile.z + 1, tile.tile === 'L')
  })

  return board
}

function buildCampaignLevel(chapter, level, chapterIndex, levelIndex) {
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
    procLimits: { ...(level.procLimits || {}) },
    tips: (level.tips && level.tips.length ? level.tips : chapter.tips).map((tip) => ({ ...tip })),
    board: buildBoardFromTiles(level.tiles),
    start: { ...level.start },
    order: levelIndex
  }

  const solvedDemo = solveLevelProgram(baseLevel)

  return {
    ...baseLevel,
    demo: level.demo
      ? {
        main: [...(level.demo.main || [])],
        p1: [...(level.demo.p1 || [])],
        p2: [...(level.demo.p2 || [])]
      }
      : {
        main: solvedDemo?.solvable ? [...solvedDemo.main] : [],
        p1: solvedDemo?.solvable ? [...solvedDemo.p1] : [],
        p2: solvedDemo?.solvable ? [...solvedDemo.p2] : []
      }
  }
}

const CAMPAIGN_CHAPTERS = [
  {
    id: 'basics',
    title: '基础动作',
    skill: 'Walk / Turn / Jump / Light',
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
        mainLimit: 8,
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
    tips: [
      { title: '先拆结构再写程序', copy: '综合关如果直接开始写指令，通常会很快迷路。先把地图拆成若干重复区域。' },
      { title: '允许回头重构', copy: '写到一半发现 MAIN 爆了是正常现象，应该回头重新抽过程，而不是继续硬塞。' }
    ],
    levels: [
      {
        id: 'master-1',
        title: '41. 双回路',
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
        title: '42. 螺旋阶梯',
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
        title: '43. 桥塔交错',
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
        title: '44. 双层回字',
        description: '同一个回字形被拆成上下两层，玩家必须区分平地外圈和高台内圈的作用。',
        goal: '点亮上下两层回路中的五盏灯。',
        mainLimit: 15,
        procLimits: { p1: 4, p2: 4 },
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
        title: '45. 三段高差',
        description: '这关的重点不是地图大，而是同一路线上要连续切换平地、一级台和二级台。',
        goal: '沿三段高差依次点亮四盏灯。',
        mainLimit: 14,
        procLimits: { p1: 4 },
        start: { x: 0, y: 1, dir: 'forward' },
        tiles: pathTiles([[0, 1, 0], [1, 1, 0], [2, 1, 1], [3, 1, 1], [4, 1, 2], [5, 1, 2], [6, 1, 1], [7, 1, 0]], [1, 3, 5, 7])
      },
      {
        id: 'master-6',
        title: '46. 十字城门',
        description: '十字平台在综合章节里再次出现，但这次每条支路都带有不同的高度负担。',
        goal: '从中心出发清理四条支路。',
        mainLimit: 16,
        procLimits: { p1: 4, p2: 4 },
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
        title: '47. 蛇形高桥',
        description: '蛇形和高差叠加后，玩家必须在脑中预演一整段路线，不能靠试错硬撞。',
        goal: '在蛇形高桥上点亮四盏灯。',
        mainLimit: 16,
        procLimits: { p1: 4, p2: 3 },
        start: { x: 0, y: 4, dir: 'forward' },
        tiles: pathTiles([[0, 4, 0], [1, 4, 0], [2, 4, 1], [3, 4, 1], [3, 3, 2], [2, 3, 2], [1, 3, 1], [0, 3, 1], [0, 2, 2], [1, 2, 2]], [2, 4, 7, 9])
      },
      {
        id: 'master-8',
        title: '48. 双塔回环',
        description: '左右两塔之间存在回环关系，这关考验的是过程设计是否真正能复用。',
        goal: '在两座塔和中间回路中点亮五盏灯。',
        mainLimit: 17,
        procLimits: { p1: 5, p2: 4 },
        start: { x: 0, y: 2, dir: 'forward' },
        tiles: mapTiles([
          [0, 2], [1, 2], [2, 2, 0, true], [3, 2], [4, 2, 0, true], [5, 2],
          [2, 1, 1], [2, 0, 2, true],
          [4, 1, 1], [4, 0, 2, true],
          [3, 1, 1, true]
        ])
      },
      {
        id: 'master-9',
        title: '49. 四区综合',
        description: '地图被拆成四个功能区，玩家需要像搭积木一样安排程序结构，而不是只拼最短路径。',
        goal: '清理四个区域里的全部灯块。',
        mainLimit: 18,
        procLimits: { p1: 5, p2: 5 },
        start: { x: 0, y: 4, dir: 'forward' },
        tiles: mapTiles([
          [0, 4], [1, 4], [2, 4, 0, true], [3, 4], [4, 4, 0, true],
          [1, 3], [2, 3, 1], [3, 3, 1, true], [4, 3],
          [1, 2, 0, true], [2, 2], [3, 2, 0, true],
          [4, 2, 1], [5, 2, 2, true]
        ])
      },
      {
        id: 'master-10',
        title: '50. 默认终章',
        description: '最终关不靠纯尺寸压人，而是把前面学过的路线、过程、Repeat 和双过程全都放进同一张结构图。',
        goal: '用你认为最整洁的程序完成整个终章。',
        mainLimit: 19,
        procLimits: { p1: 3, p2: 4 },
        start: { x: 0, y: 5, dir: 'forward' },
        tiles: mapTiles([
          [0, 5], [1, 5], [2, 5, 0, true], [3, 5], [4, 5, 0, true],
          [2, 4, 1], [3, 4, 1, true], [4, 4, 1],
          [1, 3, 0, true], [2, 3], [3, 3, 2, true], [4, 3],
          [4, 2, 1], [5, 2, 2, true],
          [2, 2, 1], [1, 2, 2, true]
        ])
      }
    ]
  }
]

export const RECONSTRUCTED_LIGHTBOT_LEVELS = CAMPAIGN_CHAPTERS.flatMap((chapter, chapterIndex) =>
  chapter.levels.map((level, levelIndex) => buildCampaignLevel(chapter, level, chapterIndex, levelIndex))
)

export const LIGHTBOT_LEVEL_GROUPS = CAMPAIGN_CHAPTERS.map((chapter, chapterIndex) => ({
  id: chapter.id,
  title: chapter.title,
  order: chapterIndex,
  levels: chapter.levels.map((level, levelIndex) => buildCampaignLevel(chapter, level, chapterIndex, levelIndex))
}))

export const LIGHTBOT_LEVELS = LIGHTBOT_LEVEL_GROUPS.flatMap((group) => group.levels)

export const BASE_LIGHTBOT_LEVELS = LIGHTBOT_LEVEL_GROUPS[0]?.levels || []

export const VALID_LEVEL_IDS = new Set(LIGHTBOT_LEVELS.map((level) => level.id))
