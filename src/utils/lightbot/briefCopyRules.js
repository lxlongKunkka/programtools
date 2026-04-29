// Lightbot 简报屏（brief screen）的提示文案规则。
// 调用方传入 ctx = { opts, procCount, hasDemo }，依次匹配返回第一条命中规则的 { title?, copy }。

const has = (opts, ...flags) => flags.every((f) => Boolean(opts?.[f]))
const any = (opts, ...flags) => flags.some((f) => Boolean(opts?.[f]))

export const FIRST_MOVE_RULES = [
  {
    match: ({ opts }) => any(opts, 'ifGreen', 'ifRed'),
    title: '先标出每块颜色地板会把你送向哪一边',
    copy: '先把绿色地板和红色地板逐个标出来，再想清楚每一次循环结束后会不会正好落到下一块决策地板上。颜色条件最怕的不是不会转向，而是循环结束后没有回到主路。'
  },
  {
    match: ({ opts }) => has(opts, 'ifDark', 'ifForwardClear'),
    title: '先标出会二次经过的灯和会被挡住的前方',
    copy: '先把地图上"会被重复踩到的灯"和"前方有时能走、有时会断掉的边界"都圈出来。前者适合用 If Dark Light，后者适合用 If Clear 包住前进或跳跃。'
  },
  {
    match: ({ opts }) => Boolean(opts?.ifDark),
    title: '先标出会被二次经过的灯',
    copy: '先找出哪些灯会被反复踩到。把 If Dark Light 放在这些位置，你就能复用同一段路线，而不用为"第一次点灯"和"第二次经过"分别写两套程序。'
  },
  {
    match: ({ opts }) => Boolean(opts?.ifForwardClear),
    title: '先找哪些地方前方有路、哪些地方前方会断',
    copy: '先找出哪些位置前方存在平台，哪些位置前方是断边。把 If Clear 包在 Walk 或 Jump 外面，就能让同一条模板在不同地点自动决定要不要继续前进。'
  },
  {
    match: ({ procCount }) => procCount >= 2,
    title: '先切块，再决定谁放进 P1 / P2',
    copy: '先把整条路线按"直走段、转角段、跳跃段"分成几块，再判断哪一块最值得交给 P1 或 P2。这样更容易同时压缩总代码和执行结构。'
  },
  {
    match: ({ procCount }) => procCount === 1,
    title: '先找会重复出现的动作模板',
    copy: '先不要急着往 MAIN 里填满。观察是否有两次以上出现的同一段拐弯或跳跃模板，把它抽成 P1，MAIN 只负责调用顺序。'
  }
]

export const FIRST_MOVE_DEFAULT = {
  title: '先在脑中跑一遍路线',
  copy: '从起点朝向出发，先确定第一段需要前进、转向还是跳跃。前 3 到 5 步想清楚以后，后面的路径通常会自然展开。'
}

export const DEMO_COPY_RULES = [
  {
    match: ({ opts }) => any(opts, 'ifGreen', 'ifRed'),
    copy: '看 demo 时重点盯住每一轮循环是如何读取脚下颜色的。真正要学的不是单次左转或右转，而是同一套模板怎样在绿地板和红地板上走出不同分支。'
  },
  {
    match: ({ opts }) => has(opts, 'ifDark', 'ifForwardClear'),
    copy: '看 demo 时要分清两类条件块分别保护什么：If Dark 负责避免二次熄灯，If Clear 负责让同一段路线在"有路"和"没路"两种现场都能复用。'
  },
  {
    match: ({ opts }) => Boolean(opts?.ifDark),
    copy: '看 demo 时重点盯住每一个 If Dark Light 出现的位置。它们通常都落在"这盏灯会被再次经过"的地方，这正是条件块存在的理由。'
  },
  {
    match: ({ opts }) => Boolean(opts?.ifForwardClear),
    copy: '看 demo 时重点看每一个 If Clear 后面包住的是 Walk 还是 Jump。真正要学的是：为什么这一步不能无脑执行，而要等现场确认前方可走。'
  },
  {
    match: ({ procCount }) => procCount >= 2,
    copy: '观察 demo 里 MAIN 负责串联、P1 / P2 负责复用的边界。真正要学的不是照抄顺序，而是为什么这两段值得单独拆出去。'
  },
  {
    match: ({ procCount }) => procCount === 1,
    copy: '看 demo 时重点找"哪一段被重复调用"。如果一眼看不出复用价值，说明你还没有真正抓住本关的压缩点。'
  }
]

export const DEMO_COPY_DEFAULT = '看 demo 时先记住机器人前几步的朝向变化，再对照版面理解为什么要先转、再走、最后点灯。'
export const DEMO_COPY_NO_DEMO = '这关暂时没有内置 demo。建议先自己尝试一版，再回来看提示卡片里的解题重点。'

export function pickFirstMove(ctx) {
  return FIRST_MOVE_RULES.find((rule) => rule.match(ctx)) || FIRST_MOVE_DEFAULT
}

export function pickDemoCopy(ctx) {
  if (!ctx.hasDemo) return DEMO_COPY_NO_DEMO
  return (DEMO_COPY_RULES.find((rule) => rule.match(ctx))?.copy) || DEMO_COPY_DEFAULT
}
