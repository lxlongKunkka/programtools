export function makeTile(height = 1, target = false) {
  return { h: height, target }
}

export const BASE_LIGHTBOT_LEVELS = [
  {
    id: 'level-1',
    title: 'Level 1: First Light',
    skill: 'Sequencing',
    description: '最基础的关卡。先学会沿着平地前进并打开灯。',
    goal: '从起始蓝色方块出发，走到右上角点亮目标格。',
    mainLimit: 6,
    procLimits: {},
    tips: [
      { title: 'Walk', copy: '只有前方存在同高度平台时，Walk 才会生效。' },
      { title: 'Light', copy: '机器人站在目标格上时，Light 才会切换灯的状态。' }
    ],
    board: [
      [makeTile(2), makeTile(2), makeTile(2, true)],
      [makeTile(), makeTile(), makeTile()],
      [makeTile(), makeTile(), null]
    ],
    start: { x: 0, y: 0, dir: 'forward' },
    demo: { main: ['right', 'walk', 'left', 'jump', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-2',
    title: 'Level 2: Step Up',
    skill: 'Jump',
    description: '这一关引入一级高差，用 Jump 上台阶。',
    goal: '沿着折线路径走到尽头，点亮唯一的目标格。',
    mainLimit: 10,
    procLimits: {},
    tips: [
      { title: 'Bend path', copy: '这一关的地图不再是直线，而是参考项目里的折线小岛。' },
      { title: 'Turn', copy: '在拐角处先转向，再继续前进。' }
    ],
    board: [
      [makeTile(), makeTile(), makeTile(1, true)],
      [makeTile(), null, null],
      [makeTile(), makeTile(), makeTile()]
    ],
    start: { x: 2, y: 2, dir: 'backward' },
    demo: { main: ['walk', 'walk', 'left', 'walk', 'walk', 'right', 'walk', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-3',
    title: 'Level 3: Corner Path',
    skill: 'Turns',
    description: '转向系统开始生效，路径变成拐角。',
    goal: '顺着台阶一路跳上去，点亮高处目标格。',
    mainLimit: 10,
    procLimits: {},
    tips: [
      { title: 'Jump up', copy: '这张图来自参考项目的三级关卡，是连续上升的阶梯。' },
      { title: 'Plan ahead', copy: '每次上升一层都要用 Jump，而不是 Walk。' }
    ],
    board: [
      [makeTile(), makeTile(4, true)],
      [makeTile(2), makeTile(3)]
    ],
    start: { x: 0, y: 0, dir: 'right' },
    demo: { main: ['jump', 'left', 'jump', 'left', 'jump', 'light'], p1: [] }
  },
  {
    id: 'level-4',
    title: 'Level 4: Procedure',
    skill: 'Procedures',
    description: 'MAIN 空间不够了，需要把重复动作塞进 PROC1。',
    goal: '沿着参考项目的阶梯平台前进到高处，只点亮终点。',
    mainLimit: 10,
    procLimits: { p1: 4 },
    tips: [
      { title: 'Real map shape', copy: '这一关的地图骨架已经按开源项目的坐标改成阶梯状。' },
      { title: 'Procedure', copy: '现在仍然保留 PROC1，让后续流程能继续对齐参考项目。' }
    ],
    board: [
      [makeTile(), makeTile(2), makeTile(), makeTile(2), makeTile(3, true)],
      [makeTile(), makeTile(2), makeTile(), makeTile(2), makeTile(3)],
      [makeTile(), makeTile(2), makeTile(), makeTile(2), makeTile(3)]
    ],
    start: { x: 0, y: 2, dir: 'forward' },
    demo: { main: ['p1', 'p1', 'left', 'walk', 'walk', 'light'], p1: ['jump', 'jump'] }
  },
  {
    id: 'level-5',
    title: 'Level 5: Bridge Loop',
    skill: 'Procedures + Jump',
    description: '综合关卡，带跳跃和过程调用。',
    goal: '对齐参考项目的三目标地图，依次点亮所有目标格。',
    mainLimit: 8,
    procLimits: { p1: 3 },
    tips: [
      { title: 'Three targets', copy: '这张图改成了参考项目第五关的三目标布局。' },
      { title: 'Timing', copy: '跨层移动时先确认高度，再决定用 Walk 还是 Jump。' }
    ],
    board: [
      [makeTile(1, true), makeTile(), makeTile(3, true)],
      [makeTile(), makeTile(), makeTile(2)],
      [makeTile(), makeTile(2, true), makeTile(2)]
    ],
    start: { x: 0, y: 2, dir: 'right' },
    demo: { main: ['walk', 'p1', 'left', 'light', 'right', 'p1'], p1: ['jump', 'light', 'jump'] }
  },
  {
    id: 'level-6',
    title: 'Level 6: Twin Lamps',
    skill: 'Multi-target pathing',
    description: '开始要求一次路线中依次点亮多个目标格。',
    goal: '沿着外圈平台前进，点亮顶部左右两端的目标格。',
    mainLimit: 12,
    procLimits: {},
    tips: [
      { title: 'Route order', copy: '先走到一端点灯，再沿着同一条边回到另一端。' },
      { title: 'Stay flat', copy: '这一关没有高度变化，重点是路径规划和转向。' }
    ],
    board: [
      [makeTile(2, true), makeTile(2), makeTile(2, true)],
      [makeTile(2), null, makeTile(2)],
      [makeTile(2), makeTile(2), makeTile(2)]
    ],
    start: { x: 0, y: 2, dir: 'forward' },
    demo: { main: ['walk', 'walk', 'left', 'walk', 'walk', 'light', 'left', 'walk', 'walk', 'light'], p1: [] }
  },
  {
    id: 'level-7',
    title: 'Level 7: Double Height',
    skill: 'Jump chain',
    description: '把平地转向和连续 Jump 放在同一关里。',
    goal: '先点亮起点灯，再转向爬上高台，点亮最顶端的目标格。',
    mainLimit: 8,
    procLimits: {},
    tips: [
      { title: 'Light first', copy: '起点本身就是目标格，别忘了先点亮。' },
      { title: 'Jump chain', copy: '连续升高的平台只能用 Jump，Walk 无法上台阶。' }
    ],
    board: [
      [makeTile(1), makeTile(2), makeTile(3), makeTile(4, true)],
      [makeTile(1, true), null, null, null]
    ],
    start: { x: 0, y: 1, dir: 'left' },
    demo: { main: ['light', 'walk', 'right', 'jump', 'jump', 'jump', 'light'], p1: [] }
  },
  {
    id: 'level-8',
    title: 'Level 8: Procedure Rail',
    skill: 'Procedure reuse',
    description: '把重复的“前进一步并点灯”抽成过程调用。',
    goal: '沿着一条直线连续点亮三个目标格。',
    mainLimit: 4,
    procLimits: { p1: 2 },
    tips: [
      { title: 'Repeatable chunk', copy: '这关适合把重复动作抽到 PROC1，避免 MAIN 过长。' },
      { title: 'Final lamp', copy: '最后一个目标格上不需要再移动，只需要补一次 Light。' }
    ],
    board: [
      [makeTile(2, true), makeTile(2), makeTile(2, true), makeTile(2), makeTile(2, true)]
    ],
    start: { x: 0, y: 0, dir: 'forward' },
    demo: { main: ['light', 'p1', 'p1'], p1: ['walk', 'light'] }
  },
  {
    id: 'level-9',
    title: 'Level 9: Corner Tower',
    skill: 'Turns + height mix',
    description: '路径先在平地上横向展开，再在拐角跳上高台。',
    goal: '先点亮右下角灯，再转向跳上高台，点亮顶部目标格。',
    mainLimit: 10,
    procLimits: {},
    tips: [
      { title: 'Two phases', copy: '先完成平地部分，再处理拐角后的上台阶动作。' },
      { title: 'Jump at corner', copy: '拐角后的第一步是升高一层，所以这里必须用 Jump。' }
    ],
    board: [
      [makeTile(1), makeTile(1), makeTile(2), makeTile(2, true)],
      [makeTile(1), null, null, makeTile(2)],
      [makeTile(1), makeTile(1), makeTile(1), makeTile(1, true)]
    ],
    start: { x: 0, y: 2, dir: 'forward' },
    demo: { main: ['walk', 'walk', 'walk', 'light', 'left', 'jump', 'walk', 'light'], p1: [] }
  }
]

function buildBoardFromTiles(tiles) {
  const maxX = Math.max(...tiles.map((tile) => tile.x))
  const maxY = Math.max(...tiles.map((tile) => tile.y))
  const board = Array.from({ length: maxY + 1 }, () => Array.from({ length: maxX + 1 }, () => null))

  tiles.forEach((tile) => {
    board[tile.y][tile.x] = makeTile(tile.z + 1, tile.tile === 'L')
  })

  return board
}

function chapterMainLimit(chapterId, tileCount) {
  const base = {
    base: 10,
    prog: 14,
    overload: 16,
    circle: 16,
    if: 18,
    clg: 20
  }[chapterId] || 12

  return Math.min(base + Math.ceil(tileCount / 4), 28)
}

function chapterProcLimit(chapterId) {
  return {
    base: 0,
    prog: 4,
    overload: 5,
    circle: 5,
    if: 6,
    clg: 6
  }[chapterId] || 0
}

const DRAFT_DIRECTION_VECTORS = [
  { dir: 'forward', dx: 1, dy: 0 },
  { dir: 'right', dx: 0, dy: 1 },
  { dir: 'backward', dx: -1, dy: 0 },
  { dir: 'left', dx: 0, dy: -1 }
]

function draftTileKey(x, y) {
  return `${x},${y}`
}

function inferDraftStartDirection(tiles, startTile) {
  const tileLookup = new Map(tiles.map((tile) => [draftTileKey(tile.x, tile.y), tile]))
  const targetTiles = tiles.filter((tile) => tile.tile === 'L')

  const scoredDirections = DRAFT_DIRECTION_VECTORS
    .map(({ dir, dx, dy }) => {
      const nextTile = tileLookup.get(draftTileKey(startTile.x + dx, startTile.y + dy))

      if (!nextTile) {
        return { dir, score: Number.NEGATIVE_INFINITY }
      }

      const heightDiff = nextTile.z - startTile.z

      if (heightDiff > 1) {
        return { dir, score: Number.NEGATIVE_INFINITY }
      }

      const nearestTargetDistance = targetTiles.length
        ? Math.min(...targetTiles.map((tile) => Math.abs(tile.x - nextTile.x) + Math.abs(tile.y - nextTile.y) + Math.abs(tile.z - nextTile.z)))
        : 0

      let score = 0
      score += nextTile.tile === 'L' ? 120 : 0
      score += heightDiff === 0 ? 30 : 0
      score += heightDiff === 1 ? 18 : 0
      score += heightDiff < 0 ? 12 : 0
      score -= nearestTargetDistance * 6

      const straightReach = DRAFT_DIRECTION_VECTORS.reduce((best, candidate) => {
        if (candidate.dir !== dir) {
          return best
        }

        let steps = 0
        let currentX = startTile.x
        let currentY = startTile.y
        let currentZ = startTile.z

        while (true) {
          currentX += candidate.dx
          currentY += candidate.dy
          const chainTile = tileLookup.get(draftTileKey(currentX, currentY))
          if (!chainTile || chainTile.z - currentZ > 1) {
            break
          }

          steps += 1
          currentZ = chainTile.z
        }

        return Math.max(best, steps)
      }, 0)

      score += straightReach * 4

      return { dir, score }
    })
    .sort((left, right) => right.score - left.score)

  return scoredDirections[0]?.score > Number.NEGATIVE_INFINITY ? scoredDirections[0].dir : 'forward'
}

function buildDraftLevel(chapter, level, index) {
  const startTile = level.tiles.find((tile) => tile.tile === 'S') || level.tiles[0]
  const targetCount = level.tiles.filter((tile) => tile.tile === 'L').length
  const procLimit = chapterProcLimit(chapter.id)
  const startDir = inferDraftStartDirection(level.tiles, startTile)

  return {
    id: level.id,
    title: `${chapter.title} ${index + 1}`,
    skill: chapter.title,
    description: `${level.summary} 由你提供的坐标草案自动生成。`,
    goal: targetCount > 1 ? '点亮所有目标格。' : '点亮目标格。',
    mainLimit: chapterMainLimit(chapter.id, level.tiles.length),
    procLimits: procLimit ? { p1: procLimit } : {},
    tips: [
      { title: 'Draft Import', copy: '该关卡由章节草案坐标自动生成，可继续在关卡编辑器中微调。' },
      { title: 'Playtest', copy: '起始朝向未在草案中提供，当前会根据起点邻接平台自动推断。' }
    ],
    board: buildBoardFromTiles(level.tiles),
    start: { x: startTile.x, y: startTile.y, dir: startDir },
    demo: { main: [], p1: [] }
  }
}

const RECONSTRUCTED_LIGHTBOT_CHAPTERS = [
  {
    id: 'base',
    title: '基本',
    levels: [
      { id: 'base-1', summary: '2x2 小平台，单灯入门。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 1, y: 1, z: 0, tile: 'L' }] },
      { id: 'base-2', summary: '平面小平台，两端各有目标点。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 1, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 1, y: 2, z: 0, tile: 'L' }] },
      { id: 'base-3', summary: '低平台接一个 1 层高台。', tiles: [{ x: 0, y: 1, z: 0, tile: 'S' }, { x: 1, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 0, y: 2, z: 0, tile: 'N' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'L' }, { x: 3, y: 2, z: 1, tile: 'N' }] },
      { id: 'base-4', summary: '一字长桥，中段和末端有目标点。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 4, y: 0, z: 0, tile: 'L' }] },
      { id: 'base-5', summary: '阶梯塔，最高点是关键灯块。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 3, y: 1, z: 1, tile: 'N' }, { x: 3, y: 0, z: 2, tile: 'L' }] },
      { id: 'base-6', summary: '小十字平台，中心与分支有目标点。', tiles: [{ x: 1, y: 0, z: 0, tile: 'S' }, { x: 1, y: 1, z: 1, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'L' }, { x: 2, y: 2, z: 0, tile: 'N' }] },
      { id: 'base-7', summary: '外圈低台，右上角高亮目标点。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 3, y: 2, z: 0, tile: 'N' }, { x: 1, y: 1, z: 1, tile: 'N' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 3, y: 1, z: 1, tile: 'L' }, { x: 1, y: 0, z: 1, tile: 'N' }, { x: 2, y: 0, z: 1, tile: 'N' }] },
      { id: 'base-8', summary: '中央高台，周围低平台包裹。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 1, y: 1, z: 1, tile: 'N' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 2, y: 0, z: 2, tile: 'L' }, { x: 3, y: 1, z: 1, tile: 'N' }, { x: 3, y: 2, z: 0, tile: 'L' }] },
      { id: 'base-9', summary: '中心平台加四向短臂，四灯围绕中心。', tiles: [{ x: 1, y: 1, z: 0, tile: 'S' }, { x: 0, y: 1, z: 0, tile: 'L' }, { x: 2, y: 1, z: 0, tile: 'L' }, { x: 1, y: 0, z: 0, tile: 'L' }, { x: 1, y: 2, z: 0, tile: 'L' }] }
    ]
  },
  {
    id: 'prog',
    title: '程序',
    levels: [
      { id: 'prog-1', summary: '细长低平台，重复直行模式。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 4, y: 0, z: 0, tile: 'L' }] },
      { id: 'prog-2', summary: '矩形平面，横向多个目标点。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 1, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'L' }, { x: 0, y: 2, z: 0, tile: 'N' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'N' }] },
      { id: 'prog-3', summary: '长条平面，边线连续点位。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 4, y: 0, z: 0, tile: 'L' }, { x: 5, y: 0, z: 0, tile: 'N' }, { x: 6, y: 0, z: 0, tile: 'L' }] },
      { id: 'prog-4', summary: '方环形低平台，中心空心。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 0, y: 2, z: 0, tile: 'L' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'L' }] },
      { id: 'prog-5', summary: '大矩形边框平台，适合抽边为过程。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 3, y: 1, z: 0, tile: 'L' }, { x: 0, y: 2, z: 0, tile: 'L' }, { x: 3, y: 2, z: 0, tile: 'N' }, { x: 0, y: 3, z: 0, tile: 'N' }, { x: 1, y: 3, z: 0, tile: 'L' }, { x: 2, y: 3, z: 0, tile: 'N' }, { x: 3, y: 3, z: 0, tile: 'L' }] },
      { id: 'prog-6', summary: '对称花形平台，适合双过程拆分。', tiles: [{ x: 2, y: 2, z: 0, tile: 'S' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 0, y: 2, z: 0, tile: 'L' }, { x: 3, y: 2, z: 0, tile: 'N' }, { x: 4, y: 2, z: 0, tile: 'L' }, { x: 2, y: 3, z: 0, tile: 'N' }, { x: 2, y: 4, z: 0, tile: 'L' }] },
      { id: 'prog-7', summary: '回字形大地图，内外两圈重复。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 4, y: 0, z: 0, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 4, y: 1, z: 0, tile: 'N' }, { x: 0, y: 2, z: 0, tile: 'L' }, { x: 2, y: 2, z: 0, tile: 'L' }, { x: 4, y: 2, z: 0, tile: 'L' }, { x: 0, y: 3, z: 0, tile: 'N' }, { x: 4, y: 3, z: 0, tile: 'N' }, { x: 0, y: 4, z: 0, tile: 'L' }, { x: 1, y: 4, z: 0, tile: 'N' }, { x: 2, y: 4, z: 0, tile: 'L' }, { x: 3, y: 4, z: 0, tile: 'N' }, { x: 4, y: 4, z: 0, tile: 'L' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 2, y: 3, z: 0, tile: 'N' }] },
      { id: 'prog-8', summary: '左右高台延展，中部过桥。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'N' }, { x: 3, y: 2, z: 1, tile: 'L' }, { x: 4, y: 2, z: 0, tile: 'N' }, { x: 5, y: 2, z: 0, tile: 'L' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 3, y: 1, z: 2, tile: 'L' }, { x: 4, y: 1, z: 1, tile: 'N' }, { x: 2, y: 3, z: 1, tile: 'N' }, { x: 3, y: 3, z: 2, tile: 'L' }, { x: 4, y: 3, z: 1, tile: 'N' }] },
      { id: 'prog-9', summary: '长条多台阶大地图，上层外缘连续目标。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 0, tile: 'N' }, { x: 2, y: 3, z: 0, tile: 'N' }, { x: 3, y: 3, z: 1, tile: 'N' }, { x: 4, y: 3, z: 1, tile: 'N' }, { x: 5, y: 3, z: 2, tile: 'L' }, { x: 6, y: 3, z: 2, tile: 'N' }, { x: 7, y: 3, z: 2, tile: 'L' }, { x: 3, y: 2, z: 1, tile: 'N' }, { x: 4, y: 2, z: 1, tile: 'L' }, { x: 5, y: 2, z: 2, tile: 'N' }, { x: 6, y: 2, z: 2, tile: 'L' }] }
    ]
  },
  {
    id: 'overload',
    title: '过载',
    levels: [
      { id: 'overload-1', summary: '短楼梯地形，相似动作不同落点。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'L' }, { x: 3, y: 2, z: 1, tile: 'N' }, { x: 4, y: 2, z: 2, tile: 'L' }] },
      { id: 'overload-2', summary: '折返多层阶梯群，变体路径明显。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 0, tile: 'N' }, { x: 2, y: 3, z: 1, tile: 'N' }, { x: 3, y: 3, z: 1, tile: 'L' }, { x: 3, y: 2, z: 2, tile: 'N' }, { x: 2, y: 2, z: 2, tile: 'L' }, { x: 1, y: 2, z: 1, tile: 'N' }, { x: 1, y: 1, z: 2, tile: 'L' }] },
      { id: 'overload-3', summary: '中心出发的星状高柱组合。', tiles: [{ x: 2, y: 2, z: 0, tile: 'S' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 2, y: 0, z: 2, tile: 'L' }, { x: 2, y: 3, z: 1, tile: 'N' }, { x: 2, y: 4, z: 2, tile: 'L' }, { x: 1, y: 2, z: 1, tile: 'N' }, { x: 0, y: 2, z: 2, tile: 'L' }, { x: 3, y: 2, z: 1, tile: 'N' }, { x: 4, y: 2, z: 2, tile: 'L' }] },
      { id: 'overload-4', summary: '中心隆起，四周支路展开。', tiles: [{ x: 2, y: 2, z: 1, tile: 'S' }, { x: 2, y: 1, z: 2, tile: 'L' }, { x: 2, y: 0, z: 2, tile: 'N' }, { x: 1, y: 2, z: 1, tile: 'N' }, { x: 0, y: 2, z: 2, tile: 'L' }, { x: 3, y: 2, z: 1, tile: 'N' }, { x: 4, y: 2, z: 2, tile: 'L' }, { x: 2, y: 3, z: 1, tile: 'N' }, { x: 2, y: 4, z: 2, tile: 'L' }, { x: 1, y: 1, z: 1, tile: 'N' }, { x: 3, y: 1, z: 1, tile: 'N' }] },
      { id: 'overload-5', summary: '小型竖向塔台，带跨越段。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 0, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'N' }, { x: 3, y: 1, z: 2, tile: 'L' }, { x: 4, y: 1, z: 2, tile: 'N' }, { x: 5, y: 0, z: 3, tile: 'L' }] },
      { id: 'overload-6', summary: '多个岛块围绕中心，重复跳跃模板。', tiles: [{ x: 2, y: 2, z: 0, tile: 'S' }, { x: 1, y: 1, z: 1, tile: 'L' }, { x: 3, y: 1, z: 1, tile: 'L' }, { x: 1, y: 3, z: 1, tile: 'L' }, { x: 3, y: 3, z: 1, tile: 'L' }, { x: 0, y: 1, z: 1, tile: 'N' }, { x: 4, y: 1, z: 1, tile: 'N' }, { x: 0, y: 3, z: 1, tile: 'N' }, { x: 4, y: 3, z: 1, tile: 'N' }] },
      { id: 'overload-7', summary: '中心模板向外辐射的十字平台。', tiles: [{ x: 2, y: 2, z: 0, tile: 'S' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 2, y: 0, z: 1, tile: 'L' }, { x: 2, y: 3, z: 1, tile: 'N' }, { x: 2, y: 4, z: 1, tile: 'L' }, { x: 1, y: 2, z: 1, tile: 'N' }, { x: 0, y: 2, z: 1, tile: 'L' }, { x: 3, y: 2, z: 1, tile: 'N' }, { x: 4, y: 2, z: 1, tile: 'L' }] },
      { id: 'overload-8', summary: '高柱串联，重复跨越高点。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 1, tile: 'N' }, { x: 2, y: 3, z: 2, tile: 'L' }, { x: 3, y: 3, z: 1, tile: 'N' }, { x: 4, y: 3, z: 2, tile: 'L' }, { x: 5, y: 3, z: 1, tile: 'N' }, { x: 6, y: 3, z: 2, tile: 'L' }] },
      { id: 'overload-9', summary: '台阶迷宫与桥面混合的综合关。', tiles: [{ x: 0, y: 4, z: 0, tile: 'S' }, { x: 1, y: 4, z: 0, tile: 'N' }, { x: 2, y: 4, z: 1, tile: 'N' }, { x: 3, y: 4, z: 1, tile: 'L' }, { x: 3, y: 3, z: 2, tile: 'N' }, { x: 2, y: 3, z: 2, tile: 'L' }, { x: 1, y: 3, z: 1, tile: 'N' }, { x: 1, y: 2, z: 1, tile: 'L' }, { x: 2, y: 2, z: 2, tile: 'N' }, { x: 3, y: 2, z: 2, tile: 'L' }, { x: 4, y: 2, z: 1, tile: 'N' }, { x: 5, y: 2, z: 1, tile: 'L' }] }
    ]
  },
  {
    id: 'circle',
    title: '回圈',
    levels: [
      { id: 'circle-1', summary: '直桥型平台，重复前进加点亮。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'N' }, { x: 3, y: 0, z: 0, tile: 'L' }, { x: 4, y: 0, z: 0, tile: 'N' }, { x: 5, y: 0, z: 0, tile: 'L' }] },
      { id: 'circle-2', summary: '平面插高柱，固定模式重复访问。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 1, y: 1, z: 1, tile: 'L' }, { x: 3, y: 1, z: 1, tile: 'L' }, { x: 1, y: 3, z: 1, tile: 'L' }, { x: 3, y: 3, z: 1, tile: 'L' }] },
      { id: 'circle-3', summary: '紧凑多层平台，局部短循环。', tiles: [{ x: 1, y: 2, z: 0, tile: 'S' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 2, y: 1, z: 1, tile: 'L' }, { x: 1, y: 1, z: 1, tile: 'N' }, { x: 0, y: 1, z: 0, tile: 'L' }, { x: 0, y: 2, z: 0, tile: 'N' }] },
      { id: 'circle-4', summary: '大号方环地图，四边同构。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'N' }, { x: 3, y: 0, z: 0, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 3, y: 1, z: 0, tile: 'N' }, { x: 0, y: 2, z: 0, tile: 'L' }, { x: 3, y: 2, z: 0, tile: 'L' }, { x: 0, y: 3, z: 0, tile: 'N' }, { x: 1, y: 3, z: 0, tile: 'L' }, { x: 2, y: 3, z: 0, tile: 'N' }, { x: 3, y: 3, z: 0, tile: 'L' }] },
      { id: 'circle-5', summary: '外围回路加中央高点。', tiles: [{ x: 0, y: 1, z: 0, tile: 'S' }, { x: 1, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 3, y: 1, z: 0, tile: 'L' }, { x: 1, y: 0, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'N' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'L' }] },
      { id: 'circle-6', summary: '共享道路的多个小回路。', tiles: [{ x: 1, y: 2, z: 0, tile: 'S' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 3, y: 2, z: 0, tile: 'L' }, { x: 1, y: 1, z: 0, tile: 'L' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 3, y: 1, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'L' }] },
      { id: 'circle-7', summary: '内外双层环路，分层循环。', tiles: [{ x: 0, y: 0, z: 1, tile: 'S' }, { x: 1, y: 0, z: 1, tile: 'N' }, { x: 2, y: 0, z: 1, tile: 'L' }, { x: 0, y: 1, z: 1, tile: 'N' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 0, y: 2, z: 1, tile: 'L' }, { x: 1, y: 2, z: 1, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'L' }, { x: 1, y: 1, z: 0, tile: 'L' }] },
      { id: 'circle-8', summary: '超长单层桥面，纯重复压缩。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 4, y: 0, z: 0, tile: 'L' }, { x: 5, y: 0, z: 0, tile: 'N' }, { x: 6, y: 0, z: 0, tile: 'L' }, { x: 7, y: 0, z: 0, tile: 'N' }, { x: 8, y: 0, z: 0, tile: 'L' }] },
      { id: 'circle-9', summary: '复杂多层平台，循环与跳跃结合。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 0, tile: 'N' }, { x: 2, y: 3, z: 1, tile: 'L' }, { x: 3, y: 3, z: 1, tile: 'N' }, { x: 4, y: 3, z: 2, tile: 'L' }, { x: 2, y: 2, z: 1, tile: 'N' }, { x: 3, y: 2, z: 2, tile: 'L' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 1, y: 1, z: 0, tile: 'L' }] }
    ]
  },
  {
    id: 'if',
    title: '条件式',
    levels: [
      { id: 'if-1', summary: '狭长环带平台，条件判断入门。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'N' }, { x: 3, y: 0, z: 0, tile: 'L' }, { x: 3, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'L' }, { x: 1, y: 1, z: 0, tile: 'N' }, { x: 0, y: 1, z: 0, tile: 'L' }] },
      { id: 'if-2', summary: '小型高低台，颜色判断融入台阶。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 1, tile: 'L' }, { x: 2, y: 1, z: 1, tile: 'N' }, { x: 3, y: 1, z: 2, tile: 'L' }] },
      { id: 'if-3', summary: '较大平面网格，多色点位抽象为目标点。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'N' }, { x: 3, y: 0, z: 0, tile: 'L' }, { x: 0, y: 1, z: 0, tile: 'N' }, { x: 1, y: 1, z: 0, tile: 'N' }, { x: 2, y: 1, z: 0, tile: 'L' }, { x: 3, y: 1, z: 0, tile: 'N' }, { x: 0, y: 2, z: 0, tile: 'L' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 3, y: 2, z: 0, tile: 'L' }] },
      { id: 'if-4', summary: '矩形大平台，彩色带交错。', tiles: [{ x: 0, y: 1, z: 0, tile: 'S' }, { x: 1, y: 1, z: 0, tile: 'L' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 3, y: 1, z: 0, tile: 'L' }, { x: 4, y: 1, z: 0, tile: 'N' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'L' }, { x: 3, y: 2, z: 0, tile: 'N' }] },
      { id: 'if-5', summary: '窄长桥面，条件触发精度测试。', tiles: [{ x: 0, y: 0, z: 0, tile: 'S' }, { x: 1, y: 0, z: 0, tile: 'N' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 3, y: 0, z: 0, tile: 'N' }, { x: 4, y: 0, z: 0, tile: 'L' }, { x: 5, y: 0, z: 0, tile: 'N' }] },
      { id: 'if-6', summary: '多层小台阶与条件判断结合。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 0, tile: 'N' }, { x: 2, y: 3, z: 1, tile: 'L' }, { x: 2, y: 2, z: 1, tile: 'N' }, { x: 3, y: 2, z: 2, tile: 'L' }, { x: 3, y: 1, z: 2, tile: 'N' }, { x: 4, y: 1, z: 1, tile: 'L' }] },
      { id: 'if-7', summary: '环形高低平台，多色多分支综合。', tiles: [{ x: 0, y: 0, z: 1, tile: 'S' }, { x: 1, y: 0, z: 1, tile: 'L' }, { x: 2, y: 0, z: 1, tile: 'N' }, { x: 3, y: 0, z: 1, tile: 'L' }, { x: 0, y: 1, z: 1, tile: 'N' }, { x: 3, y: 1, z: 1, tile: 'N' }, { x: 0, y: 2, z: 1, tile: 'L' }, { x: 1, y: 2, z: 0, tile: 'L' }, { x: 2, y: 2, z: 0, tile: 'N' }, { x: 3, y: 2, z: 1, tile: 'L' }] }
    ]
  },
  {
    id: 'clg',
    title: '挑战等级',
    levels: [
      { id: 'clg-1', summary: '多层台阶大块结构，两侧伸出低平台。', tiles: [{ x: 0, y: 4, z: 0, tile: 'S' }, { x: 1, y: 4, z: 0, tile: 'N' }, { x: 2, y: 4, z: 1, tile: 'N' }, { x: 3, y: 4, z: 1, tile: 'L' }, { x: 2, y: 3, z: 1, tile: 'N' }, { x: 3, y: 3, z: 2, tile: 'L' }, { x: 4, y: 3, z: 2, tile: 'N' }, { x: 5, y: 3, z: 1, tile: 'L' }, { x: 1, y: 5, z: 0, tile: 'L' }, { x: 4, y: 5, z: 0, tile: 'L' }] },
      { id: 'clg-2', summary: '超大平面斜向平台，后段抬高。', tiles: [{ x: 0, y: 2, z: 0, tile: 'S' }, { x: 1, y: 2, z: 0, tile: 'N' }, { x: 2, y: 2, z: 0, tile: 'L' }, { x: 3, y: 2, z: 0, tile: 'N' }, { x: 4, y: 2, z: 0, tile: 'L' }, { x: 5, y: 2, z: 1, tile: 'N' }, { x: 6, y: 2, z: 1, tile: 'L' }, { x: 7, y: 2, z: 2, tile: 'N' }, { x: 8, y: 2, z: 2, tile: 'L' }, { x: 4, y: 1, z: 0, tile: 'N' }, { x: 5, y: 1, z: 1, tile: 'L' }, { x: 6, y: 1, z: 1, tile: 'N' }] },
      { id: 'clg-3', summary: '中央高、两侧低的对称阶梯群。', tiles: [{ x: 0, y: 3, z: 0, tile: 'S' }, { x: 1, y: 3, z: 0, tile: 'N' }, { x: 2, y: 3, z: 1, tile: 'L' }, { x: 3, y: 3, z: 2, tile: 'N' }, { x: 4, y: 3, z: 1, tile: 'L' }, { x: 5, y: 3, z: 0, tile: 'N' }, { x: 6, y: 3, z: 0, tile: 'L' }, { x: 3, y: 2, z: 2, tile: 'L' }, { x: 3, y: 1, z: 1, tile: 'N' }] },
      { id: 'clg-4', summary: '彩色大平面地图，有明显主路径。', tiles: [{ x: 0, y: 1, z: 0, tile: 'S' }, { x: 1, y: 1, z: 0, tile: 'L' }, { x: 2, y: 1, z: 0, tile: 'N' }, { x: 3, y: 1, z: 0, tile: 'L' }, { x: 4, y: 1, z: 0, tile: 'N' }, { x: 5, y: 1, z: 0, tile: 'L' }, { x: 2, y: 0, z: 0, tile: 'L' }, { x: 2, y: 2, z: 0, tile: 'L' }, { x: 4, y: 0, z: 0, tile: 'N' }, { x: 4, y: 2, z: 0, tile: 'L' }] },
      { id: 'clg-5', summary: '大面积灰白阶梯，少量关键目标。', tiles: [{ x: 0, y: 4, z: 0, tile: 'S' }, { x: 1, y: 4, z: 0, tile: 'N' }, { x: 2, y: 4, z: 1, tile: 'N' }, { x: 3, y: 4, z: 1, tile: 'L' }, { x: 1, y: 3, z: 1, tile: 'N' }, { x: 2, y: 3, z: 2, tile: 'N' }, { x: 3, y: 3, z: 2, tile: 'N' }, { x: 4, y: 3, z: 1, tile: 'L' }, { x: 2, y: 2, z: 2, tile: 'N' }, { x: 3, y: 2, z: 3, tile: 'L' }] },
      { id: 'clg-6', summary: '城堡状多层高台，机制综合。', tiles: [{ x: 0, y: 4, z: 0, tile: 'S' }, { x: 1, y: 4, z: 0, tile: 'N' }, { x: 2, y: 4, z: 1, tile: 'N' }, { x: 3, y: 4, z: 2, tile: 'L' }, { x: 4, y: 4, z: 1, tile: 'N' }, { x: 5, y: 4, z: 0, tile: 'L' }, { x: 2, y: 3, z: 2, tile: 'N' }, { x: 3, y: 3, z: 3, tile: 'L' }, { x: 4, y: 3, z: 2, tile: 'N' }, { x: 3, y: 2, z: 3, tile: 'L' }] },
      { id: 'clg-7', summary: '复杂多色多层地图，中央高台与外围分支并存。', tiles: [{ x: 0, y: 5, z: 0, tile: 'S' }, { x: 1, y: 5, z: 0, tile: 'N' }, { x: 2, y: 5, z: 1, tile: 'L' }, { x: 3, y: 5, z: 1, tile: 'N' }, { x: 4, y: 5, z: 2, tile: 'L' }, { x: 2, y: 4, z: 1, tile: 'N' }, { x: 3, y: 4, z: 2, tile: 'L' }, { x: 4, y: 4, z: 2, tile: 'N' }, { x: 5, y: 4, z: 1, tile: 'L' }, { x: 3, y: 3, z: 3, tile: 'L' }, { x: 2, y: 3, z: 2, tile: 'N' }, { x: 4, y: 3, z: 2, tile: 'N' }] }
    ]
  }
]

export const RECONSTRUCTED_LIGHTBOT_LEVELS = RECONSTRUCTED_LIGHTBOT_CHAPTERS.flatMap((chapter) =>
  chapter.levels.map((level, index) => buildDraftLevel(chapter, level, index))
)

export const LIGHTBOT_LEVELS = [...BASE_LIGHTBOT_LEVELS, ...RECONSTRUCTED_LIGHTBOT_LEVELS]

export const VALID_LEVEL_IDS = new Set(LIGHTBOT_LEVELS.map((level) => level.id))