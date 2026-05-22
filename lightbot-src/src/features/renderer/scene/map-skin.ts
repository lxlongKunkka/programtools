import { Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import type { LevelConfig, TileConfig } from '../../../domain/map/map.types'
import type { WorldState } from '../../engine/engine.types'
import { type LightbotSpriteManifest } from './lightbot-sprite-manifest'
import { ensureFileTextureLoaded, getFileTexture } from './sprite-atlas-runtime'

export type IsoMetrics = {
  tileWidth: number
  tileHeight: number
  heightStep: number
  originX: number
  originY: number
}

export type PlatformGeometry = {
  columns: number
  rows: number
  halfWidth: number
  halfHeight: number
  platformDepth: number
  platformTopCenter: { x: number; y: number }
  platformTop: { x: number; y: number }
  platformRight: { x: number; y: number }
  platformBottom: { x: number; y: number }
  platformLeft: { x: number; y: number }
  platformBottomDown: { x: number; y: number }
  platformLeftDown: { x: number; y: number }
  platformRightDown: { x: number; y: number }
}

export type TileVisualState = {
  tileKey: string
  x: number
  y: number
  tile: TileConfig
  lightIntensity: number
  pulse: number
  isRobotTile: boolean
  isFocusTile: boolean
  isConditionTile: boolean
  isLitFocus: boolean
  projected: { x: number; y: number }
  top: { x: number; y: number }
  rightPoint: { x: number; y: number }
  bottom: { x: number; y: number }
  leftPoint: { x: number; y: number }
  leftDrop: number
  rightDrop: number
  lastCondition: WorldState['lastCondition']
}

export type MapSkin = {
  renderBackground: (params: {
    backgroundGraphics: Graphics
    glowGraphics: Graphics
    levelMetrics: { width: number; height: number }
    geometry: PlatformGeometry
  }) => void
  renderTile: (params: {
    tileGraphics: Graphics
    treeGraphics: Graphics
    glowGraphics: Graphics
    tileState: TileVisualState
    level: LevelConfig
    metrics: IsoMetrics
  }) => void
}

export type MapSkinRenderMode = 'vector' | 'sprite'

export type MapSkinOptions = {
  renderMode?: MapSkinRenderMode
  spriteManifest?: LightbotSpriteManifest
}

function drawDiamond(graphics: Graphics, top: { x: number; y: number }, right: { x: number; y: number }, bottom: { x: number; y: number }, left: { x: number; y: number }) {
  graphics.moveTo(top.x, top.y)
  graphics.lineTo(right.x, right.y)
  graphics.lineTo(bottom.x, bottom.y)
  graphics.lineTo(left.x, left.y)
  graphics.closePath()
}

export function createPlatformGeometry(params: {
  columns: number
  rows: number
  metrics: IsoMetrics
  projectIso: (x: number, y: number, z: number, originX: number, originY: number) => { x: number; y: number }
}): PlatformGeometry {
  const { columns, rows, metrics, projectIso } = params
  const halfWidth = metrics.tileWidth / 2
  const halfHeight = metrics.tileHeight / 2
  const platformDepth = metrics.heightStep
  const platformTopCenter = projectIso((columns - 1) / 2, (rows - 1) / 2, -0.15, metrics.originX, metrics.originY)
  const platformTop = { x: platformTopCenter.x, y: platformTopCenter.y - rows * halfHeight }
  const platformRight = { x: platformTopCenter.x + columns * halfWidth, y: platformTopCenter.y }
  const platformBottom = { x: platformTopCenter.x, y: platformTopCenter.y + rows * halfHeight }
  const platformLeft = { x: platformTopCenter.x - columns * halfWidth, y: platformTopCenter.y }
  const platformBottomDown = { x: platformBottom.x, y: platformBottom.y + platformDepth }
  const platformLeftDown = { x: platformLeft.x, y: platformLeft.y + platformDepth }
  const platformRightDown = { x: platformRight.x, y: platformRight.y + platformDepth }

  return {
    columns,
    rows,
    halfWidth,
    halfHeight,
    platformDepth,
    platformTopCenter,
    platformTop,
    platformRight,
    platformBottom,
    platformLeft,
    platformBottomDown,
    platformLeftDown,
    platformRightDown,
  }
}

export function createVectorMapSkin(): MapSkin {
  return {
    renderBackground(_params) {},  // no decorations
    renderTile({ tileGraphics, glowGraphics, tileState }) {
      // treeGraphics accepted but unused in vector skin
      const kind = tileState.tile.kind
      if (kind === 'void') return

      const { top, rightPoint, bottom, leftPoint, projected } = tileState

      if (kind === 'obstacle') return
      if (kind === 'trap') return

      // path / coin: draw raised tile surface
      const tileColor = kind === 'coin'
        ? (tileState.lightIntensity > 0 ? '#e8e8e8' : '#f5c842')
        : '#3dba28'

      drawDiamond(tileGraphics, top, rightPoint, bottom, leftPoint)
      tileGraphics.fill({ color: tileColor })
      tileGraphics.stroke({ color: '#1e8820', width: 1, alpha: 0.35 })

      if (kind === 'path') {
        tileGraphics.moveTo(leftPoint.x + 3, leftPoint.y)
        tileGraphics.lineTo(rightPoint.x - 3, rightPoint.y)
        tileGraphics.stroke({ color: '#6b4a18', width: 2, alpha: 0.38 })
        tileGraphics.moveTo(top.x, top.y + 2)
        tileGraphics.lineTo(bottom.x, bottom.y - 2)
        tileGraphics.stroke({ color: '#6b4a18', width: 2, alpha: 0.38 })
      }

      if (kind === 'coin') {
        const li = tileState.lightIntensity
        if (li < 1) {
          // coin float-up + fade-out during pickup
          const liftY = li * 20
          tileGraphics.circle(projected.x, projected.y - 6 - liftY, 9 * (1 + li * 0.3))
          tileGraphics.fill({ color: '#f5c842', alpha: (1 - li) * 0.9 })
          tileGraphics.stroke({ color: '#c8860a', width: 1.5, alpha: 1 - li })
        }
        if (li > 0) {
          glowGraphics.circle(projected.x, projected.y - 4, 28 + tileState.pulse * 12)
          glowGraphics.fill({ color: '#ffd700', alpha: 0.22 + li * 0.14 })
        }
      }

      if (tileState.isRobotTile) {
        glowGraphics.ellipse(projected.x, projected.y + 8, 22, 8)
        glowGraphics.stroke({ color: '#5fdc75', width: 2, alpha: 0.45 })
      }

      if (tileState.isConditionTile) {
        drawDiamond(tileGraphics, top, rightPoint, bottom, leftPoint)
        tileGraphics.stroke({ color: tileState.lastCondition?.result ? '#138b7a' : '#b42318', width: 3, alpha: 0.92 })
      }

      if (tileState.isLitFocus) {
        glowGraphics.circle(projected.x, projected.y - 6, 24 + tileState.pulse * 22)
        glowGraphics.stroke({ color: '#f59e0b', width: 3, alpha: 0.35 + tileState.pulse * 0.18 })
      }
    },
  }
}

// ── Atlas source: sprites.xml imagePath="sprites.png" → embedded_png_4.png ──
const ATLAS_PATH = '/extracted-assets/coding-game-swf/images/embedded_png_4.png'
// SubTexture frames from sprites.xml
const BLOCK1_FRAME = { x: 0, y: 436, w: 128, h: 97 }  // block1Img – walkable path/coin tile
const BLOCK5_FRAME = { x: 0, y: 336, w: 128, h: 97 }  // block5Img – obstacle (tree) tile ground
const BLOCK4_FRAME = { x: 0, y: 639, w: 128, h: 97 }  // obstacle4Img – trap tile ground
// Spike decoration for trap tiles (obstacle11Img)
const SPIKE_FRAME  = { x: 314, y: 315, w: 55, h: 53 }  // obstacle11Img – spike prop on trap
// Trees: full content rectangles from sprites.xml
const TREE_FRAMES = [
  { key: 'obs5', x: 206, y: 175, w: 79, h: 107 },  // obstacle5Img
  { key: 'obs6', x: 231, y: 731, w: 72, h: 108 },  // obstacle6Img
  { key: 'obs7', x: 245, y: 842, w: 67, h: 102 },  // obstacle7Img
  { key: 'obs8', x: 246, y: 285, w: 65, h: 102 },  // obstacle8Img
]
// Sprite scale: atlas tile is 128 px wide → iso tile is 92 px wide
const TILE_SPRITE_SCALE = 1
// Anchor at iso-diamond centre: y=33.4 in the full 128×97 tile sprite
const TILE_ANCHOR_Y = 33.4 / 97
// 叠层间距（2026-05-19 校准）: ?debug=tiles 页面调试得 21.5px
// 含义：每额外一层精灵在 y 轴向下偏移 21.5px（< heightStep=31，前面板可见厚度）
const TILE_LAYER_STEP = 21.5
// 地块精灵整体向下偏移系数（每高度单位）：HEIGHT_STEP(31) - TILE_LAYER_STEP(21.5) = 9.5
// 实际偏移 = height × 9.5，确保任意高度底层与 h=0 地面对齐（console 调试：window.DEBUG_TILE_DY = N，重渲染生效）
const TILE_Y_OFFSET = 9.5
// 树 Y 偏移（2026-05-19 校准）: ?debug=tiles 页面调试得 22.5px
const TREE_Y_OFFSET = 22.5
// 尖刺 Y 偏移（与 TREE_Y_OFFSET 相同，待 ?debug=tiles 页面校准）
const SPIKE_Y_OFFSET = 22.5

/** 每次页面加载随机一个偏移量，同一 session 内各关卡树种稳定 */
const SESSION_SEED = Math.floor(Math.random() * TREE_FRAMES.length)

/** 用 session 随机偏移 + 关卡 id 哈希，确保同一关所有树种相同，但每次刷新可能不同 */
function levelTreeIndex(levelId: string): number {
  let h = 0
  for (let i = 0; i < levelId.length; i++) h = (h * 31 + levelId.charCodeAt(i)) | 0
  return (Math.abs(h) + SESSION_SEED) % TREE_FRAMES.length
}

const atlasSubTextureCache = new Map<string, Texture>()

function getAtlasSubTexture(key: string, x: number, y: number, w: number, h: number): Texture | null {
  const cached = atlasSubTextureCache.get(key)
  if (cached) return cached
  const atlas = getFileTexture(ATLAS_PATH)
  if (!atlas) return null
  const tex = new Texture({ source: atlas.source, frame: new Rectangle(x, y, w, h) })
  atlasSubTextureCache.set(key, tex)
  return tex
}

function createSpriteReadyMapSkin(_spriteManifest: LightbotSpriteManifest): MapSkin {
  // Preload the single atlas; all sub-textures are derived from it lazily
  void ensureFileTextureLoaded(ATLAS_PATH)

  return {
    renderBackground(_params) {},  // no decorations
    renderTile({ tileGraphics, treeGraphics, glowGraphics, tileState, level }) {
      const { kind } = tileState.tile
      if (kind === 'void') return

      const { projected, top, rightPoint, bottom, leftPoint } = tileState

      // Ground tile — block5 for obstacle (tree), block4 for trap, block1 for walkable tiles
      const gf = kind === 'obstacle' ? BLOCK5_FRAME : kind === 'trap' ? BLOCK4_FRAME : BLOCK1_FRAME
      const blockKey = kind === 'obstacle' ? 'block5' : kind === 'trap' ? 'block4' : 'block1'
      const groundTex = getAtlasSubTexture(blockKey, gf.x, gf.y, gf.w, gf.h)
      if (groundTex) {
        // 调试覆盖：window.DEBUG_TILE_STEP / DEBUG_TILE_DY 可在浏览器 console 实时修改
        const w = (window as unknown) as Record<string, unknown>
        const dbgStep = typeof w.DEBUG_TILE_STEP === 'number' ? w.DEBUG_TILE_STEP as number : TILE_LAYER_STEP
        const dbgDy   = typeof w.DEBUG_TILE_DY   === 'number' ? w.DEBUG_TILE_DY   as number : TILE_Y_OFFSET

        // 层数 = height + 1：始终包含地面基座层，height=1 显示「升高层 + 底部地面」
        const layerCount = tileState.tile.height + 1
        // 偏移量 = height × (HEIGHT_STEP - TILE_LAYER_STEP) = height × 9.5
        // 确保任意高度的底层都与 h=0 地面对齐
        const elevatedDy = tileState.tile.height * dbgDy
        for (let k = layerCount - 1; k >= 0; k--) {
          const s = new Sprite(groundTex)
          s.anchor.set(0.5, TILE_ANCHOR_Y)
          s.scale.set(TILE_SPRITE_SCALE)
          s.position.set(projected.x, projected.y + k * dbgStep + elevatedDy)
          tileGraphics.addChild(s)
        }
      }

      // Tree sprite on obstacle tiles
      if (kind === 'obstacle') {
        const tf = TREE_FRAMES[levelTreeIndex(level.id)]
        const treeTex = getAtlasSubTexture(tf.key, tf.x, tf.y, tf.w, tf.h)
        if (treeTex) {
          const dbgTree = typeof ((window as unknown) as Record<string, unknown>).DEBUG_TREE_OFFSET === 'number'
            ? ((window as unknown) as Record<string, unknown>).DEBUG_TREE_OFFSET as number
            : TREE_Y_OFFSET
          const t = new Sprite(treeTex)
          t.anchor.set(0.5, 1.0)
          t.scale.set(TILE_SPRITE_SCALE)
          t.position.set(projected.x, projected.y + dbgTree)
          treeGraphics.addChild(t)
        }
        return
      }

      // Spike sprite on trap tiles
      if (kind === 'trap') {
        const spikeTex = getAtlasSubTexture('spike11', SPIKE_FRAME.x, SPIKE_FRAME.y, SPIKE_FRAME.w, SPIKE_FRAME.h)
        if (spikeTex) {
          const s = new Sprite(spikeTex)
          s.anchor.set(0.5, 1.0)
          s.scale.set(TILE_SPRITE_SCALE)
          s.position.set(projected.x, projected.y + SPIKE_Y_OFFSET)
          treeGraphics.addChild(s)
        }
        return
      }

      // ── glow / overlay effects for walkable tiles ───────────────
      if (kind === 'coin') {
        const li = tileState.lightIntensity
        if (li < 1) {
          // coin float-up + fade-out during pickup
          const liftY = li * 20
          const coinTex = getAtlasSubTexture('goldImg', 427, 342, 41, 50)
          if (coinTex) {
            const coinSprite = new Sprite(coinTex)
            coinSprite.anchor.set(0.5, 1)
            const coinScale = (28 / coinTex.height) * (1 + li * 0.3)
            coinSprite.scale.set(coinScale)
            coinSprite.alpha = 1 - li
            coinSprite.position.set(projected.x, projected.y - 4 - liftY)
            tileGraphics.addChild(coinSprite)
          } else {
            tileGraphics.circle(projected.x, projected.y - 10 - liftY, 8 * (1 + li * 0.3))
            tileGraphics.fill({ color: '#ffd700', alpha: (1 - li) * 0.95 })
            tileGraphics.stroke({ color: '#c8860a', width: 1.5, alpha: 1 - li })
          }
        }
        if (li > 0) {
          glowGraphics.circle(projected.x, projected.y - 4, 28 + tileState.pulse * 12)
          glowGraphics.fill({ color: '#ffd700', alpha: 0.22 + li * 0.14 })
        }
      }

      if (tileState.isRobotTile) {
        glowGraphics.ellipse(projected.x, projected.y + 8, 22, 8)
        glowGraphics.stroke({ color: '#5fdc75', width: 2, alpha: 0.45 })
      }

      if (tileState.isConditionTile) {
        drawDiamond(tileGraphics, top, rightPoint, bottom, leftPoint)
        tileGraphics.stroke({ color: tileState.lastCondition?.result ? '#138b7a' : '#b42318', width: 3, alpha: 0.92 })
      }

      if (tileState.isLitFocus) {
        glowGraphics.circle(projected.x, projected.y - 6, 24 + tileState.pulse * 22)
        glowGraphics.stroke({ color: '#f59e0b', width: 3, alpha: 0.35 + tileState.pulse * 0.18 })
      }
    },
  }
}

export function createMapSkin(options: MapSkinOptions = {}): MapSkin {
  if (options.renderMode === 'sprite' && options.spriteManifest) {
    return createSpriteReadyMapSkin(options.spriteManifest)
  }

  return createVectorMapSkin()
}
