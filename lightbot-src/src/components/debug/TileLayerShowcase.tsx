/**
 * 地块叠层调试页  ?debug=tiles
 *
 * 展示 height=0/1/2/3 四列地块的叠层效果，并提供滑块实时调整：
 *   - tileAnchorY  : 精灵锚点 Y（占精灵高度的比例），默认 33.4/97 ≈ 0.344
 *   - layerStep    : 每层精灵之间的垂直像素间距，默认 21.5
 *   - tileDx       : 每个精灵的水平偏移，默认 0
 *   - flatDy       : height=0 地块整体 Y 偏移，默认 0
 *   - elevatedDy   : 每高度单位 Y 偏移系数，默认 9.5（= HEIGHT_STEP - TILE_LAYER_STEP），实际偏移 = h × 9.5
 *   - treeYOffset  : 树精灵相对 projected.y 的 Y 偏移，默认 22（= TREE_Y_OFFSET）
 *
 * 调整滑块后，window.DEBUG_TILE_* / DEBUG_TREE_OFFSET 同步更新 → 游戏内也能实时看效果（刷新地图即可）。
 * 找到合适的值后，把数字告诉 AI 更新代码即可。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'

// ── 常量（与 map-skin.ts 保持一致） ─────────────────────────────────────────
const ATLAS_PATH = '/extracted-assets/coding-game-swf/images/embedded_png_4.png'
const BLOCK1_FRAME = { x: 0, y: 436, w: 128, h: 97 }
const BLOCK5_FRAME = { x: 0, y: 336, w: 128, h: 97 }  // obstacle tile
const TREE_FRAME   = { x: 206, y: 175, w: 79,  h: 107 } // obs5 tree

// ── Canvas 尺寸 ──────────────────────────────────────────────────────────────
const CW = 900
const CH = 580

// ── 四列中心 X（height = 0 / 1 / 2 / 3） ──────────────────────────────────
const COL_XS = [110, 300, 490, 680]
// 地面基准 Y（所有高度的「地面层精灵」都会停在这里） ─────────────────────────
const GROUND_Y = 420
const HEIGHT_STEP = 31  // 游戏投影用，与 map-skin.ts 一致

// ── 默认值 ──────────────────────────────────────────────────────────────────
const DEF_ANCHOR_Y  = parseFloat((33.4 / 97).toFixed(4))  // ≈ 0.3443
const DEF_LAYER_STEP = 31
const DEF_DX           = 0
const DEF_FLAT_DY      = 0    // height=0 tiles（对应游戏中无偏移）
const DEF_ELEVATED_DY  = 9.5  // height>0 tiles（= HEIGHT_STEP - TILE_LAYER_STEP = 31 - 21.5）
const DEF_TREE_Y       = 22.5  // 对应 TREE_Y_OFFSET=22.5

// ── 工具：格式化小数 ─────────────────────────────────────────────────────────
const fmt = (v: number, d = 1) => v.toFixed(d)

export function TileLayerShowcase() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  // ── 可调参数 state ──────────────────────────────────────────────────────
  const [anchorY,    setAnchorY]    = useState(DEF_ANCHOR_Y)
  const [layerStep,  setLayerStep]  = useState(DEF_LAYER_STEP)
  const [tileDx,       setTileDx]       = useState(DEF_DX)
  const [flatDy,       setFlatDy]       = useState(DEF_FLAT_DY)
  const [elevatedDy,   setElevatedDy]   = useState(DEF_ELEVATED_DY)
  const [treeYOffset,  setTreeYOffset]  = useState(DEF_TREE_Y)
  const [showTree,     setShowTree]     = useState(false)

  // ── PixiJS refs ──────────────────────────────────────────────────────────
  const appRef       = useRef<Application | null>(null)
  const columnsRef   = useRef<Container[]>([])
  const atlasTexRef  = useRef<Texture | null>(null)
  const isReadyRef   = useRef(false)

  // ── 绘制函数（每次参数变化都调用） ──────────────────────────────────────
  const draw = useCallback((aY: number, step: number, dx: number, fDy: number, eDy: number, treeY: number, showT: boolean) => {
    if (!isReadyRef.current) return
    const atlasTex = atlasTexRef.current
    if (!atlasTex) return

    // 为每个高度重建对应 Container
    for (let h = 0; h < 4; h++) {
      const col = columnsRef.current[h]
      col.removeChildren()

      const cx = COL_XS[h]
      // 该高度的 projected.y（使用游戏固定的 HEIGHT_STEP=31，不是 layerStep）
      const projY = GROUND_Y - h * HEIGHT_STEP

      // 地面基准参考线（只画一次，在 h=0 时统一画在 stage 里算了，这里画在 col 里）
      const refLine = new Graphics()
      refLine.moveTo(cx - 80, GROUND_Y)
      refLine.lineTo(cx + 80, GROUND_Y)
      refLine.stroke({ color: '#334155', width: 1, alpha: 0.5 })
      col.addChild(refLine)

      // ── 固定地面参考块（始终在 GROUND_Y，不受任何 dy 影响）────────────────
      // 半透明显示，作为"地面在哪里"的视觉锚点
      const groundRefTex = new Texture({
        source: atlasTex.source,
        frame: new Rectangle(BLOCK1_FRAME.x, BLOCK1_FRAME.y, BLOCK1_FRAME.w, BLOCK1_FRAME.h),
      })
      const groundRef = new Sprite(groundRefTex)
      groundRef.anchor.set(0.5, aY)
      groundRef.alpha = 0.25
      groundRef.position.set(cx, GROUND_Y)
      col.addChild(groundRef)

      // 投影中心点（小叉）
      const dot = new Graphics()
      const dotY = projY + (h === 0 ? fDy : h * eDy)
      dot.moveTo(cx + dx - 4, dotY)
      dot.lineTo(cx + dx + 4, dotY)
      dot.moveTo(cx + dx, dotY - 4)
      dot.lineTo(cx + dx, dotY + 4)
      dot.stroke({ color: '#f43f5e', width: 1, alpha: 0.7 })
      col.addChild(dot)

      // 叠层精灵（从底 k=h 到顶 k=0）
      const layerCount = h + 1
      // height=0 使用 flatDy，height>0 使用 h × eDy（与 map-skin.ts 一致）
      const tileOffset = h === 0 ? fDy : h * eDy
      const blockFrame = showT ? BLOCK5_FRAME : BLOCK1_FRAME
      for (let k = layerCount - 1; k >= 0; k--) {
        const sprTex = new Texture({
          source: atlasTex.source,
          frame: new Rectangle(blockFrame.x, blockFrame.y, blockFrame.w, blockFrame.h),
        })
        const s = new Sprite(sprTex)
        s.anchor.set(0.5, aY)
        s.position.set(cx + dx, projY + k * step + tileOffset)
        col.addChild(s)

        // 层编号标记
        const lbl = new Text({
          text: `k=${k}`,
          style: { fill: '#64748b', fontFamily: 'Segoe UI', fontSize: 9 },
        })
        lbl.anchor.set(0, 0.5)
        lbl.position.set(cx + 68 + dx, projY + k * step + tileOffset)
        col.addChild(lbl)
      }

      // 树精灵（与 map-skin.ts 一致：anchor=(0.5,1)，位置为 projected.y + treeYOffset）
      if (showT) {
        const treeTex = new Texture({
          source: atlasTex.source,
          frame: new Rectangle(TREE_FRAME.x, TREE_FRAME.y, TREE_FRAME.w, TREE_FRAME.h),
        })
        const tree = new Sprite(treeTex)
        tree.anchor.set(0.5, 1)
        tree.position.set(cx + dx, projY + treeY)
        col.addChild(tree)
      }
    }
  }, [])

  // ── 初始化 PixiJS ────────────────────────────────────────────────────────
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    appRef.current = app
    let disposed = false
    let initialized = false

    void app.init({
      width:  CW,
      height: CH,
      background: '#0f172a',
      antialias: true,
    }).then(async () => {
      if (disposed) { app.destroy(); return }
      initialized = true
      host.appendChild(app.canvas)

      // 标题
      const title = new Text({
        text: '地块叠层调试  ─  ?debug=tiles',
        style: { fill: '#e2e8f0', fontFamily: 'Segoe UI', fontSize: 15, fontWeight: '700' },
      })
      title.anchor.set(0.5, 0)
      title.position.set(CW / 2, 12)
      app.stage.addChild(title)

      // 列标题
      ;[0, 1, 2, 3].forEach((h) => {
        const t = new Text({
          text: `height = ${h}  (${h + 1} 层)`,
          style: { fill: '#94a3b8', fontFamily: 'Segoe UI', fontSize: 12 },
        })
        t.anchor.set(0.5, 0)
        t.position.set(COL_XS[h], 40)
        app.stage.addChild(t)
      })

      // 说明文字
      const hint = new Text({
        text: '红十字 = projected.y 位置 | 灰线 = 地面基准（GROUND_Y）',
        style: { fill: '#475569', fontFamily: 'Segoe UI', fontSize: 11 },
      })
      hint.anchor.set(0.5, 0)
      hint.position.set(CW / 2, CH - 28)
      app.stage.addChild(hint)

      // 列 Container
      for (let h = 0; h < 4; h++) {
        const col = new Container()
        app.stage.addChild(col)
        columnsRef.current.push(col)
      }

      // 加载 Atlas
      try {
        const tex = await Assets.load<Texture>(ATLAS_PATH)
        if (disposed) { app.destroy(); return }
        atlasTexRef.current = tex
      } catch {
        atlasTexRef.current = null
      }

      isReadyRef.current = true
      draw(DEF_ANCHOR_Y, DEF_LAYER_STEP, DEF_DX, DEF_FLAT_DY, DEF_ELEVATED_DY, DEF_TREE_Y, false)
    })

    return () => {
      disposed = true
      isReadyRef.current = false
      columnsRef.current = []
      atlasTexRef.current = null
      appRef.current = null
      if (!initialized) return
      try { app.destroy() } catch { /* PixiJS v8 ResizePlugin 可能在部分清理后报错，忽略 */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 参数变化时重绘 & 同步 window.DEBUG_TILE_* ───────────────────────────
  useEffect(() => {
    const w = (window as unknown) as Record<string, unknown>
    w.DEBUG_TILE_ANCHOR_Y = anchorY
    w.DEBUG_TILE_STEP     = layerStep
    w.DEBUG_TILE_DX       = tileDx
    w.DEBUG_TILE_DY       = elevatedDy   // 仅升高地块，对应 TILE_Y_OFFSET
    w.DEBUG_TREE_OFFSET   = treeYOffset  // 对应 TREE_Y_OFFSET
    draw(anchorY, layerStep, tileDx, flatDy, elevatedDy, treeYOffset, showTree)
  }, [anchorY, layerStep, tileDx, flatDy, elevatedDy, treeYOffset, showTree, draw])

  // ── 重置按钮 ─────────────────────────────────────────────────────────────
  function handleReset() {
    setAnchorY(DEF_ANCHOR_Y)
    setLayerStep(DEF_LAYER_STEP)
    setTileDx(DEF_DX)
    setFlatDy(DEF_FLAT_DY)
    setElevatedDy(DEF_ELEVATED_DY)
    setTreeYOffset(DEF_TREE_Y)
    setShowTree(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, gap: 20 }}>
      <div ref={hostRef} />

      {/* ── 滑块面板 ───────────────────────────────────────────── */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: '16px 28px',
        display: 'grid',
        gridTemplateColumns: '150px 280px 60px',
        gap: '10px 12px',
        alignItems: 'center',
        minWidth: 520,
        color: '#cbd5e1',
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: 13,
      }}>
        {/* anchorY */}
        <label htmlFor="sl-anchorY" style={{ color: '#f59e0b' }}>
          tileAnchorY<br />
          <span style={{ fontSize: 11, color: '#64748b' }}>精灵锚点 Y 比例</span>
        </label>
        <input id="sl-anchorY" type="range" min={0.20} max={0.60} step={0.001}
          value={anchorY} onChange={e => setAnchorY(parseFloat(e.target.value))}
          style={{ width: '100%' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#fcd34d' }}>{fmt(anchorY, 3)}</span>

        {/* layerStep */}
        <label htmlFor="sl-step" style={{ color: '#34d399' }}>
          layerStep<br />
          <span style={{ fontSize: 11, color: '#64748b' }}>层间距（px）</span>
        </label>
        <input id="sl-step" type="range" min={15} max={50} step={0.5}
          value={layerStep} onChange={e => setLayerStep(parseFloat(e.target.value))}
          style={{ width: '100%' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#6ee7b7' }}>{fmt(layerStep, 1)}</span>

        {/* tileDx */}
        <label htmlFor="sl-dx" style={{ color: '#60a5fa' }}>
          tileDx<br />
          <span style={{ fontSize: 11, color: '#64748b' }}>精灵水平偏移（px）</span>
        </label>
        <input id="sl-dx" type="range" min={-20} max={20} step={0.5}
          value={tileDx} onChange={e => setTileDx(parseFloat(e.target.value))}
          style={{ width: '100%' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#93c5fd' }}>{fmt(tileDx, 1)}</span>

        {/* flatDy */}
        <label htmlFor="sl-fdy" style={{ color: '#38bdf8' }}>
          flatDy<br />
          <span style={{ fontSize: 11, color: '#64748b' }}>height=0 地块 Y 偏移</span>
        </label>
        <input id="sl-fdy" type="range" min={-20} max={20} step={0.5}
          value={flatDy} onChange={e => setFlatDy(parseFloat(e.target.value))}
          style={{ width: '100%' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#7dd3fc' }}>{fmt(flatDy, 1)}</span>

        {/* elevatedDy */}
        <label htmlFor="sl-edy" style={{ color: '#f472b6' }}>
          elevatedDy<br />
          <span style={{ fontSize: 11, color: '#64748b' }}>height&gt;0 地块 Y 偏移</span>
        </label>
        <input id="sl-edy" type="range" min={-10} max={30} step={0.5}
          value={elevatedDy} onChange={e => setElevatedDy(parseFloat(e.target.value))}
          style={{ width: '100%' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#f9a8d4' }}>{fmt(elevatedDy, 1)}</span>

        {/* treeYOffset */}
        <label htmlFor="sl-tree" style={{ color: '#4ade80' }}>
          treeYOffset<br />
          <span style={{ fontSize: 11, color: '#64748b' }}>树 Y 偏移 (TREE_Y_OFFSET)</span>
        </label>
        <input id="sl-tree" type="range" min={0} max={60} step={0.5}
          value={treeYOffset} onChange={e => setTreeYOffset(parseFloat(e.target.value))}
          style={{ width: '100%' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#86efac' }}>{fmt(treeYOffset, 1)}</span>

        {/* 汇总 + 树开关 + 重置 */}
        <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{ background: '#0f172a', padding: '4px 10px', borderRadius: 5, fontSize: 11, color: '#7dd3fc', flex: 1 }}>
            anchorY={fmt(anchorY,3)}  step={fmt(layerStep,1)}  dx={fmt(tileDx,1)}<br />
            flatDy={fmt(flatDy,1)}  elevatedDy={fmt(elevatedDy,1)}  tree={fmt(treeYOffset,1)}
          </code>
          <button onClick={() => setShowTree(v => !v)}
            style={{ background: showTree ? '#166534' : '#334155', color: showTree ? '#86efac' : '#e2e8f0', border: '1px solid ' + (showTree ? '#22c55e' : '#475569'), borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12 }}>
            {showTree ? '✓ 显示树' : '显示树'}
          </button>
          <button onClick={handleReset}
            style={{ background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12 }}>
            重置默认
          </button>
        </div>
      </div>

      <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>
        访问方式：<code style={{ color: '#7dd3fc' }}>http://localhost:5173/?debug=tiles</code>
        &nbsp;·&nbsp;
        <a href="/" style={{ color: '#60a5fa' }}>← 返回游戏</a>
        &nbsp;·&nbsp;
        调好值后告诉 AI，更新 <code style={{ color: '#a78bfa' }}>map-skin.ts</code> 常量即可
      </p>
    </div>
  )
}
