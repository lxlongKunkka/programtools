import { useEffect, useMemo, useRef, useState } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { RobotActionClip } from '../../animation/robot-actions'
import { createRobotPresenter, effectFromRobotAction, type RobotAnimationEffect, type RobotPresenter } from './robot-presenter'
import { createMapSkin, createPlatformGeometry } from './map-skin'
import { lightbotSpriteManifest } from './lightbot-sprite-manifest'
import { useGameStore } from '../../game/game.store'
import type { Direction } from '../../../domain/map/map.types'
import type { WorldState } from '../../engine/engine.types'

// ── ISO 等距投影常量（2026-05-18 校准）───────────────────────────────────────────────────────
// 方法：2×2 调试关卡 + window.DEBUG_TILE_OFFSETS 实时测量
// 结果：每步偏差 dx=(x-y)×5, dy=(x+y)×3 → 需将宽/高各加 10/6px
// 原假设倦数值: ISO_TILE_WIDTH=117, ISO_TILE_HEIGHT=67
const ISO_TILE_WIDTH = 127   // 钻石实际宽度（校准）
const ISO_TILE_HEIGHT = 73   // 钻石实际高度（校准）
const HEIGHT_STEP = 31       // 前面板每高度单位像素数 = 22 × 128/92
const SCENE_PADDING_X = 160
const SCENE_PADDING_Y = 84
const ROBOT_PRESENTER_STRATEGY = 'sprite-atlas' as const
const MAP_SKIN_RENDER_MODE = 'sprite' as const

// ISO_TILE_HEIGHT 增加 6px 导致 originY 公式多出 3px，OFFSET_Y 减 3 补偿（验证：tile(0,0) 不偏移）
const TILE_ORIGIN_OFFSET_X = 5
const TILE_ORIGIN_OFFSET_Y = -6

function arrowCharacter(direction: Direction) {
  switch (direction) {
    case 'N':
      return '↑'
    case 'E':
      return '→'
    case 'S':
      return '↓'
    case 'W':
      return '←'
  }
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function directionToRotation(direction: Direction) {
  switch (direction) {
    case 'N':
      return -Math.PI / 2
    case 'E':
      return 0
    case 'S':
      return Math.PI / 2
    case 'W':
      return Math.PI
  }
}

function projectIso(x: number, y: number, z: number, originX: number, originY: number) {
  return {
    x: originX + (x - y) * (ISO_TILE_WIDTH / 2),
    y: originY + (x + y) * (ISO_TILE_HEIGHT / 2) - z * HEIGHT_STEP,
  }
}

type SceneRefs = {
  app: Application
  backgroundGraphics: Graphics
  tileGraphics: Graphics
  tileFrontGraphics: Graphics
  glowGraphics: Graphics
  shadowGraphics: Graphics
  robotContainer: Container
  robotBody: Graphics
  robotArrow: Text
  robotPresenter: RobotPresenter
  displayState: {
    robotX: number
    robotY: number
    robotZ: number
    robotLift: number
    robotScaleX: number
    robotScaleY: number
    shakeX: number
    landingPulse: number
    rotation: number
    robotDirection: Direction
    robotTileKey: string
    focusTileKey: string | null
    lastCondition: WorldState['lastCondition']
    collected: Map<string, number>
  }
  animationState: {
    startTime: number
    duration: number
    arcHeight: number
    effect: RobotAnimationEffect
    from: {
      robotX: number
      robotY: number
      robotZ: number
      rotation: number
      collected: Map<string, number>
    }
    to: {
      robotX: number
      robotY: number
      robotZ: number
      rotation: number
      collected: Map<string, number>
    }
  }
  renderScene: () => void
  syncTarget: (world: WorldState, runStatus: string, robotAction: RobotActionClip) => void
}

export function GameScene() {
  const level = useGameStore((state) => state.level)
  const world = useGameStore((state) => state.world)
  const runStatus = useGameStore((state) => state.runStatus)
  const currentRobotAction = useGameStore((state) => state.currentRobotAction)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<SceneRefs | null>(null)
  const [zoom, setZoom] = useState(1.0)
  const zoomRef = useRef(1.0)
  const applyFitRef = useRef<((w: number, h: number) => void) | null>(null)
  const containerSizeRef = useRef({ w: 0, h: 0 })
  const sectionRef = useRef<HTMLElement | null>(null)
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null)

  const clampZoom = (value: number) => Math.min(3.0, Math.max(0.5, parseFloat(value.toFixed(2))))

  const levelMetrics = useMemo(() => {
    // Use the bounding box of non-void tiles so small levels (e.g. SWF levels with
    // sparse grids) are zoomed to fill the viewport instead of appearing tiny.
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let maxHeight = 0
    for (let y = 0; y < level.grid.length; y++) {
      for (let x = 0; x < level.grid[y].length; x++) {
        const tile = level.grid[y][x]
        if (tile.kind !== 'void') {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
          if (tile.height > maxHeight) maxHeight = tile.height
        }
      }
    }
    if (!isFinite(minX)) {
      // All-void grid fallback
      minX = 0; maxX = level.grid[0].length - 1
      minY = 0; maxY = level.grid.length - 1
    }
    const effCols = maxX - minX + 1
    const effRows = maxY - minY + 1

    const width  = (effCols + effRows) * (ISO_TILE_WIDTH  / 2) + SCENE_PADDING_X * 2
    const height = (effCols + effRows) * (ISO_TILE_HEIGHT / 2) + maxHeight * HEIGHT_STEP + SCENE_PADDING_Y * 2
    // originX: tile(0,0) screenX = originX; shift so the bbox centre lands at width/2
    const originX = width / 2
      - ((minX + maxX) / 2 - (minY + maxY) / 2) * (ISO_TILE_WIDTH / 2)
      + TILE_ORIGIN_OFFSET_X
    // originY: top tile of bbox (minX,minY) at maxHeight should sit at SCENE_PADDING_Y
    const originY = SCENE_PADDING_Y + maxHeight * HEIGHT_STEP + ISO_TILE_HEIGHT / 2 + TILE_ORIGIN_OFFSET_Y
      - (minX + minY) * (ISO_TILE_HEIGHT / 2)

    return { width, height, originX, originY }
  }, [level.grid])

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    let disposed = false
    let initialized = false
    let ro: ResizeObserver | null = null
    const app = new Application()
    const backgroundGraphics = new Graphics()
    const tileGraphics = new Graphics()
    const tileFrontGraphics = new Graphics()
    const glowGraphics = new Graphics()
    const shadowGraphics = new Graphics()
    const robotContainer = new Container()
    const robotBody = new Graphics()
    const robotArrow = new Text({
      text: arrowCharacter(world.robot.direction),
      style: {
        fill: '#f8fafc',
        fontFamily: 'Segoe UI',
        fontSize: 18,
        fontWeight: '800',
      },
    })
    const robotPresenter = createRobotPresenter({
      robotBody,
      robotArrow,
      robotContainer,
      shadowGraphics,
    }, ROBOT_PRESENTER_STRATEGY)
    const mapSkin = createMapSkin({
      renderMode: MAP_SKIN_RENDER_MODE,
      spriteManifest: lightbotSpriteManifest,
    })

    const syncLitMap = (target: Map<string, number>, collectedCoins: string[], value: number) => {
      target.clear()
      for (const tile of collectedCoins) {
        target.set(tile, value)
      }
    }

    const displayState = {
      robotX: world.robot.x,
      robotY: world.robot.y,
      robotZ: world.robot.z,
      robotLift: 0,
      robotScaleX: 1,
      robotScaleY: 1,
      shakeX: 0,
      landingPulse: 0,
      rotation: directionToRotation(world.robot.direction),
      robotDirection: world.robot.direction,
      robotTileKey: `${world.robot.x}:${world.robot.y}`,
      focusTileKey: world.focusTileKey,
      lastCondition: world.lastCondition,
      collected: new Map<string, number>(),
    }

    const animationState: SceneRefs['animationState'] = {
      startTime: performance.now(),
      duration: 320,
      arcHeight: 0,
      effect: 'idle',
      from: {
        robotX: world.robot.x,
        robotY: world.robot.y,
        robotZ: world.robot.z,
        rotation: directionToRotation(world.robot.direction),
        collected: new Map<string, number>(),
      },
      to: {
        robotX: world.robot.x,
        robotY: world.robot.y,
        robotZ: world.robot.z,
        rotation: directionToRotation(world.robot.direction),
        collected: new Map<string, number>(),
      },
    }

    syncLitMap(displayState.collected, world.collectedCoins, 1)
    syncLitMap(animationState.from.collected, world.collectedCoins, 1)
    syncLitMap(animationState.to.collected, world.collectedCoins, 1)

    // Mutable metrics updated when container resizes — keeps tiles at native pixel size
    const dynMetrics = { ...levelMetrics }

    const renderScene = () => {
      backgroundGraphics.clear()
      tileGraphics.removeChildren()
      tileGraphics.clear()
      tileFrontGraphics.removeChildren()
      tileFrontGraphics.clear()
      glowGraphics.clear()
      shadowGraphics.clear()

      const columns = level.grid[0].length
      const rows = level.grid.length
      const geometry = createPlatformGeometry({
        columns,
        rows,
        metrics: {
          tileWidth: ISO_TILE_WIDTH,
          tileHeight: ISO_TILE_HEIGHT,
          heightStep: HEIGHT_STEP,
          originX: dynMetrics.originX,
          originY: dynMetrics.originY,
        },
        projectIso,
      })

      mapSkin.renderBackground({
        backgroundGraphics,
        glowGraphics,
        levelMetrics: dynMetrics,
        geometry,
      })

      const tiles = level.grid.flatMap((row, y) => row.map((tile, x) => ({ tile, x, y })))
      tiles.sort((left, right) => (left.x + left.y) - (right.x + right.y) || left.y - right.y)

      // Use max(from, to) depth so both the source tile and destination tile stay
      // "behind" the robot throughout the animation.  This prevents:
      //   • west/north moves: source tile jumping to tileFrontGraphics immediately
      //   • east/south jumps to elevated tiles: destination side-face covering the robot
      const robotDepth = Math.max(
        animationState.from.robotX + animationState.from.robotY,
        animationState.to.robotX + animationState.to.robotY,
      )
      const robotTieY = Math.max(animationState.from.robotY, animationState.to.robotY)

      for (const { tile, x, y } of tiles) {
          const tileDepth = x + y
          const isFront = tileDepth > robotDepth || (tileDepth === robotDepth && y > robotTieY)
          const activeTileGraphics = isFront ? tileFrontGraphics : tileGraphics
          const tileKey = `${x}:${y}`
          const lightIntensity = displayState.collected.get(tileKey) ?? 0
          const pulse = 0.58 + Math.sin(performance.now() / 150) * 0.18
          const isRobotTile = displayState.robotTileKey === tileKey
          const isFocusTile = displayState.focusTileKey === tileKey
          const isConditionTile = displayState.lastCondition?.tileKey === tileKey
          const isLitFocus = isFocusTile && tile.kind === 'coin'
          const projectedBase = projectIso(x, y, tile.height, dynMetrics.originX, dynMetrics.originY)
          const dbgTile = ((window as any).DEBUG_TILE_OFFSETS as Record<string, { dx?: number; dy?: number }> | undefined)?.[tileKey]
          const projected = dbgTile
            ? { x: projectedBase.x + (dbgTile.dx ?? 0), y: projectedBase.y + (dbgTile.dy ?? 0) }
            : projectedBase
          const top = { x: projected.x, y: projected.y - geometry.halfHeight }
          const rightPoint = { x: projected.x + geometry.halfWidth, y: projected.y }
          const bottom = { x: projected.x, y: projected.y + geometry.halfHeight }
          const leftPoint = { x: projected.x - geometry.halfWidth, y: projected.y }
          const leftNeighbor = level.grid[y]?.[x - 1]
          const rightNeighbor = level.grid[y + 1]?.[x]
          const leftDrop = Math.max(0, tile.height - (leftNeighbor?.height ?? 0))
          const rightDrop = Math.max(0, tile.height - (rightNeighbor?.height ?? 0))

          mapSkin.renderTile({
            tileGraphics: activeTileGraphics,
            treeGraphics: activeTileGraphics,
            glowGraphics,
            tileState: {
              tileKey,
              x,
              y,
              tile,
              lightIntensity,
              pulse,
              isRobotTile,
              isFocusTile,
              isConditionTile,
              isLitFocus,
              projected,
              top,
              rightPoint,
              bottom,
              leftPoint,
              leftDrop,
              rightDrop,
              lastCondition: displayState.lastCondition,
            },
            level,
            metrics: {
              tileWidth: ISO_TILE_WIDTH,
              tileHeight: ISO_TILE_HEIGHT,
              heightStep: HEIGHT_STEP,
              originX: dynMetrics.originX,
              originY: dynMetrics.originY,
            },
          })
      }

      robotBody.clear()
      const robotBase = projectIso(displayState.robotX, displayState.robotY, displayState.robotZ, dynMetrics.originX, dynMetrics.originY)
      robotPresenter.render({
        baseX: robotBase.x,
        baseY: robotBase.y,
        state: {
          direction: displayState.robotDirection,
          scaleX: displayState.robotScaleX,
          scaleY: displayState.robotScaleY,
          shakeX: displayState.shakeX,
          lift: displayState.robotLift,
          landingPulse: displayState.landingPulse,
        },
      })
    }

    const tick = () => {
      // 实时调试偏移：在浏览器控制台输入 window.DEBUG_OFFSET = {dx: 5, dy: -3}
      // 不需要刷新页面，每帧立即生效。找到满意值后告知，将设置为常量。
      const dbg = (window as any).DEBUG_OFFSET as { dx?: number; dy?: number } | undefined
      if (dbg !== undefined) {
        dynMetrics.originX = dynMetrics.width / 2 + (dbg.dx ?? TILE_ORIGIN_OFFSET_X)
        dynMetrics.originY = (levelMetrics.originY - TILE_ORIGIN_OFFSET_Y) + (dynMetrics.height - levelMetrics.height) / 2 + (dbg.dy ?? TILE_ORIGIN_OFFSET_Y)
      }

      const elapsed = performance.now() - animationState.startTime
      const progress = Math.min(1, elapsed / animationState.duration)
      const eased = easeInOutCubic(progress)

      displayState.robotX = animationState.from.robotX + (animationState.to.robotX - animationState.from.robotX) * eased
      displayState.robotY = animationState.from.robotY + (animationState.to.robotY - animationState.from.robotY) * eased
      displayState.robotZ = animationState.from.robotZ + (animationState.to.robotZ - animationState.from.robotZ) * eased
      displayState.rotation = animationState.from.rotation + (animationState.to.rotation - animationState.from.rotation) * eased
      displayState.robotLift = Math.sin(progress * Math.PI) * animationState.arcHeight
      displayState.robotScaleX = 1
      displayState.robotScaleY = 1
      displayState.shakeX = 0
      displayState.landingPulse = 0

      if (animationState.effect === 'move') {
        displayState.robotScaleX = 1 + Math.sin(progress * Math.PI) * 0.08
        displayState.robotScaleY = 1 - Math.sin(progress * Math.PI) * 0.06
        displayState.landingPulse = Math.max(0, 1 - Math.abs(progress - 0.88) / 0.12) * 0.35
      }

      if (animationState.effect === 'jump') {
        displayState.robotScaleX = 1 - Math.sin(progress * Math.PI) * 0.06
        displayState.robotScaleY = 1 + Math.sin(progress * Math.PI) * 0.08
        displayState.landingPulse = Math.max(0, 1 - Math.abs(progress - 0.92) / 0.08) * 0.8
      }

      if (animationState.effect === 'turn') {
        const overshoot = Math.sin(progress * Math.PI) * 0.18
        const direction = animationState.to.rotation > animationState.from.rotation ? 1 : -1
        displayState.rotation += overshoot * direction
        displayState.robotScaleX = 1 + Math.sin(progress * Math.PI) * 0.04
      }

      if (animationState.effect === 'pickup') {
        displayState.robotScaleX = 1 + Math.sin(progress * Math.PI) * 0.05
        displayState.robotScaleY = 1 + Math.sin(progress * Math.PI) * 0.05
      }

      if (animationState.effect === 'fail') {
        displayState.shakeX = Math.sin(progress * Math.PI * 10) * (1 - progress) * 7
        displayState.robotScaleX = 1 + (1 - progress) * 0.05
        displayState.robotScaleY = 1 - (1 - progress) * 0.08
      }

      const keys = new Set([...animationState.from.collected.keys(), ...animationState.to.collected.keys()])
      displayState.collected.clear()
      for (const key of keys) {
        const fromValue = animationState.from.collected.get(key) ?? 0
        const toValue = animationState.to.collected.get(key) ?? 0
        displayState.collected.set(key, fromValue + (toValue - fromValue) * eased)
      }

      renderScene()
    }

    const syncTarget = (nextWorld: WorldState, currentRunStatus: string, robotAction: RobotActionClip) => {
      robotPresenter.play(robotAction)
      animationState.startTime = performance.now()
      animationState.effect = effectFromRobotAction(robotAction, currentRunStatus)
      animationState.duration = robotAction.suggestedDurationMs
      animationState.arcHeight = animationState.effect === 'jump'
        ? 20
        : animationState.effect === 'move'
          ? 12
          : 0
      animationState.from = {
        robotX: displayState.robotX,
        robotY: displayState.robotY,
        robotZ: displayState.robotZ,
        rotation: displayState.rotation,
        collected: new Map(displayState.collected),
      }
      animationState.to = {
        robotX: nextWorld.robot.x,
        robotY: nextWorld.robot.y,
        robotZ: nextWorld.robot.z,
        rotation: directionToRotation(nextWorld.robot.direction),
        collected: new Map<string, number>(),
      }
      syncLitMap(animationState.to.collected, nextWorld.collectedCoins, 1)
      displayState.robotDirection = nextWorld.robot.direction
      displayState.robotTileKey = `${nextWorld.robot.x}:${nextWorld.robot.y}`
      displayState.focusTileKey = nextWorld.focusTileKey
      displayState.lastCondition = nextWorld.lastCondition
    }

    void (async () => {
      const stageWrapper = host.closest('.lb-stage-wrapper') as HTMLElement | null
      const cW = stageWrapper?.clientWidth  || levelMetrics.width
      const cH = stageWrapper?.clientHeight || levelMetrics.height

      // Scale and centre the PixiJS stage so the full level fits inside the container.
      // The canvas is always sized to the container; the stage transform handles the zoom.
      const applyFitLayout = (w: number, h: number) => {
        containerSizeRef.current = { w, h }
        const fitScale = Math.min(w / levelMetrics.width, h / levelMetrics.height) * zoomRef.current
        app.stage.scale.set(fitScale)
        app.stage.x = (w - levelMetrics.width  * fitScale) / 2
        app.stage.y = (h - levelMetrics.height * fitScale) / 2
      }
      applyFitRef.current = applyFitLayout

      await app.init({
        width: cW,
        height: cH,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      if (disposed) {
        app.destroy()
        return
      }

      initialized = true
      host.innerHTML = ''
      host.appendChild(app.canvas)
      host.style.width  = `${cW}px`
      host.style.height = `${cH}px`
      applyFitLayout(cW, cH)

      ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect
        if (width === 0 || height === 0) return
        app.renderer.resize(width, height)
        host.style.width  = `${width}px`
        host.style.height = `${height}px`
        applyFitLayout(width, height)
        renderScene()
      })
      if (stageWrapper) ro.observe(stageWrapper)

      app.stage.eventMode = 'none'
      app.stage.addChild(backgroundGraphics)
      app.stage.addChild(glowGraphics)
      app.stage.addChild(tileGraphics)
      app.stage.addChild(shadowGraphics)
      robotContainer.addChild(robotBody)
      robotContainer.addChild(robotArrow)
      app.stage.addChild(robotContainer)
      app.stage.addChild(tileFrontGraphics)
      app.ticker.add(tick)

      sceneRef.current = {
        app,
        backgroundGraphics,
        tileGraphics,
        tileFrontGraphics,
        glowGraphics,
        shadowGraphics,
        robotContainer,
        robotBody,
        robotArrow,
        robotPresenter,
        displayState,
        animationState,
        renderScene,
        syncTarget,
      }

      syncTarget(world, runStatus, currentRobotAction)
      renderScene()
    })()

    return () => {
      disposed = true
      sceneRef.current = null
      ro?.disconnect()
      if (!initialized) {
        return
      }
      robotPresenter.dispose()
      app.ticker.remove(tick)
      if (host.contains(app.canvas)) {
        host.removeChild(app.canvas)
      }
      app.destroy()
    }
  }, [level, levelMetrics.height, levelMetrics.width])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) {
      return
    }
    scene.syncTarget(world, runStatus, currentRobotAction)
  }, [currentRobotAction, runStatus, world])

  useEffect(() => {
    zoomRef.current = zoom
    const { w, h } = containerSizeRef.current
    if (w > 0 && h > 0) applyFitRef.current?.(w, h)
  }, [zoom])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2)
        pinchRef.current = { startDist: getTouchDist(e.touches), startZoom: zoomRef.current }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return
      e.preventDefault()
      const scale = getTouchDist(e.touches) / pinchRef.current.startDist
      const next = clampZoom(pinchRef.current.startZoom * scale)
      setZoom(next)
    }
    const onTouchEnd = () => { pinchRef.current = null }
    const onWheel = (e: WheelEvent) => {
      if (!isFinePointer) return
      e.preventDefault()
      const direction = e.deltaY > 0 ? -1 : 1
      const next = clampZoom(zoomRef.current + direction * 0.1)
      if (next !== zoomRef.current) {
        setZoom(next)
      }
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <section className="lb-stage-card" ref={sectionRef}>
      <div className="lb-stage-canvas" ref={hostRef} />
      <div className="lb-zoom-controls">
        <button className="lb-zoom-btn" onClick={() => setZoom(z => clampZoom(z - 0.25))} title="缩小">－</button>
        <span className="lb-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="lb-zoom-btn" onClick={() => setZoom(z => clampZoom(z + 0.25))} title="放大">＋</button>
      </div>
    </section>
  )
}
