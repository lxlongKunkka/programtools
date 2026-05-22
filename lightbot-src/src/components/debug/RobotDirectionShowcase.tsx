/**
 * 机器人方向展示页  ?debug=directions
 *
 * 展示东西南北四个方向下机器人的外观，以及对应的 ISO 屏幕方向。
 */
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { createRobotPresenter } from '../../features/renderer/scene/robot-presenter'
import type { Direction } from '../../domain/map/map.types'

// ── ISO 等距说明 ─────────────────────────────────────────────────────────────
// 坐标公式：screenX = originX + (x - y) * W/2
//           screenY = originY + (x + y) * H/2
// 所以：
//   +X（东 E）→ 屏幕右下
//   +Y（南 S）→ 屏幕左下
//   -Y（北 N）→ 屏幕右上
//   -X（西 W）→ 屏幕左上
// ────────────────────────────────────────────────────────────────────────────

// ── 简单 ISO 平台 ──────────────────────────────────────────────────────────
function drawIsoTile(g: Graphics, cx: number, cy: number) {
  const tw = 64
  const th = 36
  const fh = 14

  // top face
  g.moveTo(cx, cy - th / 2)
  g.lineTo(cx + tw / 2, cy)
  g.lineTo(cx, cy + th / 2)
  g.lineTo(cx - tw / 2, cy)
  g.closePath()
  g.fill({ color: '#2d7a3f' })
  g.stroke({ color: '#4aaa5f', width: 1 })

  // left face
  g.moveTo(cx - tw / 2, cy)
  g.lineTo(cx, cy + th / 2)
  g.lineTo(cx, cy + th / 2 + fh)
  g.lineTo(cx - tw / 2, cy + fh)
  g.closePath()
  g.fill({ color: '#1a5e2b' })

  // right face
  g.moveTo(cx, cy + th / 2)
  g.lineTo(cx + tw / 2, cy)
  g.lineTo(cx + tw / 2, cy + fh)
  g.lineTo(cx, cy + th / 2 + fh)
  g.closePath()
  g.fill({ color: '#236835' })
}

// ── ISO 方向示意图 ─────────────────────────────────────────────────────────
function drawIsoReference(stage: Application['stage'], cx: number, cy: number) {
  const g = new Graphics()

  // 中心十字
  g.moveTo(cx - 70, cy); g.lineTo(cx + 70, cy)
  g.moveTo(cx, cy - 35); g.lineTo(cx, cy + 35)
  g.stroke({ color: '#334155', width: 1 })

  // 对角线（ISO 轴）
  g.moveTo(cx, cy - 35); g.lineTo(cx + 70, cy + 18)   // +X 轴（东）
  g.stroke({ color: '#f59e0b', width: 2, alpha: 0.7 })
  g.moveTo(cx, cy - 35); g.lineTo(cx - 70, cy + 18)   // +Y 轴（南）
  g.stroke({ color: '#10b981', width: 2, alpha: 0.7 })

  // 原点圆
  g.circle(cx, cy - 35, 4)
  g.fill({ color: '#94a3b8' })

  stage.addChild(g)

  function label(text: string, x: number, y: number, color: string) {
    const t = new Text({ text, style: { fill: color, fontFamily: 'Segoe UI Emoji, Segoe UI', fontSize: 11, fontWeight: '700' } })
    t.anchor.set(0.5)
    t.position.set(x, y)
    stage.addChild(t)
  }

  label('origin (0,0)', cx, cy - 52, '#94a3b8')
  label('+X → 东 E (屏幕右下 ↘)', cx + 72, cy + 10, '#f59e0b')
  label('+Y → 南 S (屏幕左下 ↙)', cx - 72, cy + 10, '#10b981')
  label('-Y → 北 N (屏幕右上 ↗)', cx + 50, cy - 40, '#e11d48')
  label('-X → 西 W (屏幕左上 ↖)', cx - 50, cy - 40, '#6366f1')
}

export function RobotDirectionShowcase() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const CW = 880
    const CH = 700
    const app = new Application()
    let disposed = false
    let initialized = false

    void app.init({
      width: CW,
      height: CH,
      background: '#0f172a',
      antialias: true,
    }).then(() => {
      if (disposed) { app.destroy(); return }
      initialized = true
      host.appendChild(app.canvas)

      // ── 标题 ──────────────────────────────────────────────────
      const title = new Text({
        text: '机器人方向展示  ─  ISO 等距投影',
        style: { fill: '#e2e8f0', fontFamily: 'Segoe UI', fontSize: 16, fontWeight: '700' },
      })
      title.anchor.set(0.5, 0)
      title.position.set(CW / 2, 12)
      app.stage.addChild(title)

      // ── ISO 轴参考图 ─────────────────────────────────────────
      drawIsoReference(app.stage, CW / 2, 90)

      const allPresenters: Array<{ dir: Direction; presenter: ReturnType<typeof createRobotPresenter>; cx: number; cy: number }> = []

      function makeRobotPanel(dir: Direction, cx: number, cy: number, label: string, color: string, sublabel?: string) {
        const tileG = new Graphics()
        drawIsoTile(tileG, cx, cy)
        app.stage.addChild(tileG)

        const shadowG = new Graphics()
        const robotContainer = new Container()
        const robotBody = new Graphics()
        const robotArrow = new Text({ text: '', style: { fill: '#fff', fontFamily: 'Segoe UI', fontSize: 14, fontWeight: '800' } })
        robotContainer.addChild(robotBody)
        robotContainer.addChild(robotArrow)
        app.stage.addChild(shadowG)
        app.stage.addChild(robotContainer)

        const presenter = createRobotPresenter(
          { robotBody, robotArrow, robotContainer, shadowGraphics: shadowG },
          'sprite-atlas',
        )
        allPresenters.push({ dir, presenter, cx, cy })

        const lbl = new Text({ text: label, style: { fill: color, fontFamily: 'Segoe UI', fontSize: 13, fontWeight: '800' } })
        lbl.anchor.set(0.5, 0)
        lbl.position.set(cx, cy + 28)
        app.stage.addChild(lbl)

        if (sublabel) {
          const sub = new Text({ text: sublabel, style: { fill: '#64748b', fontFamily: 'Segoe UI', fontSize: 10 } })
          sub.anchor.set(0.5, 0)
          sub.position.set(cx, cy + 44)
          app.stage.addChild(sub)
        }
      }

      function makeArrow(x: number, y: number, color = '#475569') {
        const t = new Text({ text: '→', style: { fill: color, fontFamily: 'Segoe UI', fontSize: 18, fontWeight: '700' } })
        t.anchor.set(0.5)
        t.position.set(x, y)
        app.stage.addChild(t)
      }

      function sectionLabel(text: string, x: number, y: number, color: string) {
        const t = new Text({ text, style: { fill: color, fontFamily: 'Segoe UI', fontSize: 12, fontWeight: '700' } })
        t.anchor.set(0, 0.5)
        t.position.set(x, y)
        app.stage.addChild(t)
      }

      // ── 第一行：四方向静态展示 ─────────────────────────────────
      const DIR_COLORS: Record<Direction, string> = { E: '#f59e0b', S: '#10b981', W: '#6366f1', N: '#e11d48' }
      const DIR_SCREEN: Record<Direction, string> = { E: '屏幕右下↘', S: '屏幕左下↙', W: '屏幕左上↖', N: '屏幕右上↗' }
      const row1Dirs: Direction[] = ['E', 'S', 'W', 'N']
      const row1Y = 280
      const colW = CW / 4
      row1Dirs.forEach((dir, i) => {
        makeRobotPanel(dir, colW * i + colW / 2, row1Y, `${['东','南','西','北'][i]} ${dir}`, DIR_COLORS[dir], DIR_SCREEN[dir])
      })

      // ── 第二行：右转链 E→S→W→N→(E) ──────────────────────────
      const row2Y = 470
      const rightChain: Direction[] = ['E', 'S', 'W', 'N', 'E']
      const chainColW = CW / 5
      sectionLabel('右转 ↻  E→S→W→N→E', 18, row2Y - 58, '#f59e0b')
      rightChain.forEach((dir, i) => {
        const cx = chainColW * i + chainColW / 2
        const isRepeat = i === 4
        makeRobotPanel(dir, cx, row2Y, `${['东','南','西','北','东'][i]} ${dir}`, isRepeat ? '#475569' : DIR_COLORS[dir])
        if (i < 4) makeArrow(cx + chainColW / 2, row2Y - 5, '#f59e0b')
      })

      // ── 第三行：左转链 E→N→W→S→(E) ──────────────────────────
      const row3Y = 620
      const leftChain: Direction[] = ['E', 'N', 'W', 'S', 'E']
      sectionLabel('左转 ↺  E→N→W→S→E', 18, row3Y - 58, '#60a5fa')
      leftChain.forEach((dir, i) => {
        const cx = chainColW * i + chainColW / 2
        const isRepeat = i === 4
        makeRobotPanel(dir, cx, row3Y, `${['东','北','西','南','东'][i]} ${dir}`, isRepeat ? '#475569' : DIR_COLORS[dir])
        if (i < 4) makeArrow(cx + chainColW / 2, row3Y - 5, '#60a5fa')
      })

      // ── ticker 持续渲染 ──────────────────────────────────────
      app.ticker.add(() => {
        for (const { dir, presenter, cx, cy } of allPresenters) {
          presenter.render({
            baseX: cx,
            baseY: cy - 8,
            state: { direction: dir, scaleX: 1, scaleY: 1, shakeX: 0, lift: 0, landingPulse: 0 },
          })
        }
      })
    })

    return () => {
      disposed = true
      if (!initialized) return
      app.destroy()
    }
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div ref={hostRef} />
      <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>
        访问方式：<code style={{ color: '#7dd3fc' }}>http://localhost:5173/?debug=directions</code>
        &nbsp;·&nbsp;
        <a href="/" style={{ color: '#60a5fa' }}>← 返回游戏</a>
      </p>
    </div>
  )
}
