export function makeTile(height = 1, target = false) {
  return { h: height, target }
}

export const LIGHTBOT_LEVELS = [
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

export const VALID_LEVEL_IDS = new Set(LIGHTBOT_LEVELS.map((level) => level.id))