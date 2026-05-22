import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import type { RobotActionClip } from '../../animation/robot-actions'
import type { Direction } from '../../../domain/map/map.types'
import { lightbotSpriteManifest, resolveSpriteAssetSource } from './lightbot-sprite-manifest'
import { ensureFileTextureLoaded, getSpriteTexture } from './sprite-atlas-runtime'

export type RobotAnimationEffect = 'idle' | 'move' | 'jump' | 'turn' | 'pickup' | 'fail'

export type RobotRenderState = {
  direction: Direction
  scaleX: number
  scaleY: number
  shakeX: number
  lift: number
  landingPulse: number
}

export type RobotPresenterHost = {
  robotBody: Graphics
  robotArrow: Text
  robotContainer: Container
  shadowGraphics: Graphics
}

export type RobotPresenterRenderParams = {
  baseX: number
  baseY: number
  state: RobotRenderState
}

export type RobotPresenter = {
  kind: 'vector' | 'sprite-atlas'
  play: (action: RobotActionClip) => void
  render: (params: RobotPresenterRenderParams) => void
  dispose: () => void
}

export type RobotPresenterStrategy = 'vector' | 'sprite-atlas'

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

function drawDiamond(graphics: Graphics, top: { x: number; y: number }, right: { x: number; y: number }, bottom: { x: number; y: number }, left: { x: number; y: number }) {
  graphics.moveTo(top.x, top.y)
  graphics.lineTo(right.x, right.y)
  graphics.lineTo(bottom.x, bottom.y)
  graphics.lineTo(left.x, left.y)
  graphics.closePath()
}

function drawIsoPrism(
  graphics: Graphics,
  centerX: number,
  baseY: number,
  width: number,
  depth: number,
  height: number,
  colors: { top: string; left: string; right: string },
) {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const top = { x: centerX, y: baseY - height - halfDepth }
  const right = { x: centerX + halfWidth, y: baseY - height }
  const bottom = { x: centerX, y: baseY - height + halfDepth }
  const left = { x: centerX - halfWidth, y: baseY - height }

  const lowerRight = { x: right.x, y: baseY }
  const lowerBottom = { x: bottom.x, y: baseY + halfDepth }
  const lowerLeft = { x: left.x, y: baseY }

  graphics.moveTo(left.x, left.y)
  graphics.lineTo(bottom.x, bottom.y)
  graphics.lineTo(lowerBottom.x, lowerBottom.y)
  graphics.lineTo(lowerLeft.x, lowerLeft.y)
  graphics.closePath()
  graphics.fill({ color: colors.left })

  graphics.moveTo(bottom.x, bottom.y)
  graphics.lineTo(right.x, right.y)
  graphics.lineTo(lowerRight.x, lowerRight.y)
  graphics.lineTo(lowerBottom.x, lowerBottom.y)
  graphics.closePath()
  graphics.fill({ color: colors.right })

  drawDiamond(graphics, top, right, bottom, left)
  graphics.fill({ color: colors.top })
  graphics.stroke({ color: '#fff7ed', width: 1.6, alpha: 0.75 })

  return { top, right, bottom, left }
}

function drawDirectionalRobotShadow(graphics: Graphics, baseX: number, baseY: number, lift: number) {
  const shadowScale = Math.max(0.45, 1 - lift / 36)
  const shadowAlpha = Math.max(0.1, 0.2 - lift / 220)
  const offsetX = 12 * shadowScale
  const offsetY = 8 * shadowScale

  graphics.ellipse(baseX, baseY + 10, 18 * shadowScale, 8 * shadowScale)
  graphics.fill({ color: '#9cc0a0', alpha: shadowAlpha })

  graphics.moveTo(baseX + 6, baseY + 6)
  graphics.lineTo(baseX + 20 * shadowScale, baseY + 10 * shadowScale)
  graphics.lineTo(baseX + offsetX + 18 * shadowScale, baseY + offsetY + 12 * shadowScale)
  graphics.lineTo(baseX + offsetX, baseY + offsetY + 8 * shadowScale)
  graphics.closePath()
  graphics.fill({ color: '#b9d8b8', alpha: shadowAlpha * 0.5 })
}

function drawRobotLightPass(graphics: Graphics) {
  graphics.moveTo(-11, -25)
  graphics.lineTo(1, -29)
  graphics.lineTo(7, -18)
  graphics.lineTo(-3, -15)
  graphics.closePath()
  graphics.fill({ color: '#ffffff', alpha: 0.34 })

  graphics.moveTo(1, -4)
  graphics.lineTo(10, -1)
  graphics.lineTo(9, 9)
  graphics.lineTo(0, 6)
  graphics.closePath()
  graphics.fill({ color: '#dce6ee', alpha: 0.24 })

  graphics.moveTo(-10, -8)
  graphics.lineTo(-1, -10)
  graphics.lineTo(1, -3)
  graphics.lineTo(-8, -1)
  graphics.closePath()
  graphics.fill({ color: '#ffffff', alpha: 0.22 })
}

function directionVisuals(direction: Direction) {
  switch (direction) {
    case 'N':
      return { visorOffsetX: 0, antennaOffsetX: 0, sideBias: -1, eyeShift: -2 }
    case 'E':
      return { visorOffsetX: 5, antennaOffsetX: 4, sideBias: 1, eyeShift: 3 }
    case 'S':
      return { visorOffsetX: 0, antennaOffsetX: 0, sideBias: 1, eyeShift: 2 }
    case 'W':
      return { visorOffsetX: -5, antennaOffsetX: -4, sideBias: -1, eyeShift: -3 }
  }
}

export function effectFromRobotAction(robotAction: RobotActionClip, runStatus: string): RobotAnimationEffect {
  switch (robotAction.kind) {
    case 'move-forward':
      return 'move'
    case 'jump-up':
    case 'jump-down':
      return 'jump'
    case 'turn-left':
    case 'turn-right':
      return 'turn'
    case 'light-cast':
      return 'pickup'
    case 'fail':
      return 'fail'
    default:
      return runStatus === 'running' ? 'move' : 'idle'
  }
}

export function createVectorRobotPresenter(host: RobotPresenterHost): RobotPresenter {
  const { robotBody, robotArrow, robotContainer, shadowGraphics } = host

  return {
    kind: 'vector',
    play() {
      // Vector presenter derives motion from render state for now.
    },
    render({ baseX, baseY, state }) {
      drawDirectionalRobotShadow(shadowGraphics, baseX, baseY, state.lift)
      if (state.landingPulse > 0.01) {
        shadowGraphics.ellipse(baseX, baseY + 10, 16 + state.landingPulse * 18, 7 + state.landingPulse * 8)
        shadowGraphics.stroke({ color: '#fff6de', width: 2, alpha: state.landingPulse * 0.28 })
      }

      robotContainer.position.set(baseX + state.shakeX, baseY - 28 - state.lift)
      robotContainer.rotation = 0
      robotContainer.scale.set(state.scaleX, state.scaleY)

      const facing = directionVisuals(state.direction)

      robotBody.clear()
      robotBody.ellipse(0, 13, 18, 7)
      robotBody.fill({ color: '#c7d7c7', alpha: 0.16 })

      drawIsoPrism(robotBody, 0, 15, 22, 16, 6, {
        top: '#e7edf5',
        left: '#c8d2df',
        right: '#b8c3d1',
      })

      robotBody.circle(-6, 13, 4.8)
      robotBody.fill({ color: '#d7dee7' })
      robotBody.circle(0, 14, 5.2)
      robotBody.fill({ color: '#e5ebf3' })
      robotBody.circle(6, 13, 4.8)
      robotBody.fill({ color: '#d7dee7' })

      drawIsoPrism(robotBody, 0, 3, 16, 12, 14, {
        top: '#f8fbff',
        left: '#dce4ee',
        right: '#cad6e1',
      })

      const headTop = drawIsoPrism(robotBody, facing.visorOffsetX, -10, 21, 18, 15, {
        top: '#fcfeff',
        left: '#e1e8f0',
        right: '#d0d9e2',
      })

      drawIsoPrism(robotBody, facing.visorOffsetX, -13, 13, 8, 4, {
        top: '#7fdfe4',
        left: '#54b8c6',
        right: '#3ca2b6',
      })

      robotBody.circle(facing.visorOffsetX - 3, -17.5, 2.6)
      robotBody.fill({ color: '#ffffff', alpha: 0.92 })
      robotBody.circle(facing.visorOffsetX + 3, -17.5, 2.6)
      robotBody.fill({ color: '#ffffff', alpha: 0.92 })
      robotBody.circle(facing.visorOffsetX - 3, -17.5, 1.2)
      robotBody.fill({ color: '#6c7d91' })
      robotBody.circle(facing.visorOffsetX + 3, -17.5, 1.2)
      robotBody.fill({ color: '#6c7d91' })

      robotBody.roundRect(facing.antennaOffsetX - 1.4, -34, 2.8, 7, 1.3)
      robotBody.fill({ color: '#9eb0c3' })
      robotBody.circle(facing.antennaOffsetX, -35.5, 3)
      robotBody.fill({ color: '#d7e7f4' })

      robotBody.moveTo(-2.4, -2)
      robotBody.lineTo(2.4, -2)
      robotBody.lineTo(1.4, 3)
      robotBody.lineTo(-1.4, 3)
      robotBody.closePath()
      robotBody.fill({ color: '#93a6ba', alpha: 0.6 })

      robotBody.moveTo(headTop.left.x, headTop.left.y)
      robotBody.lineTo(headTop.bottom.x, headTop.bottom.y)
      robotBody.lineTo(headTop.bottom.x + 2, headTop.bottom.y + 3)
      robotBody.lineTo(headTop.left.x + 2, headTop.left.y + 3)
      robotBody.closePath()
      robotBody.fill({ color: '#ffffff', alpha: 0.42 })

      drawRobotLightPass(robotBody)

      robotArrow.text = arrowCharacter(state.direction)
      robotArrow.anchor.set(0.5)
      robotArrow.position.set(0, -43)
      robotArrow.rotation = 0
      robotArrow.style.fill = '#7bc8e5'
    },
    dispose() {
      robotBody.clear()
      robotArrow.text = ''
    },
  }
}

export function createSpriteAtlasRobotPresenter(host: RobotPresenterHost): RobotPresenter {
  const fallback = createVectorRobotPresenter(host)
  const robotSprite = new Sprite()
  let currentAction: RobotActionClip['kind'] = 'idle'

  const spriteSources = {
    idleEast: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotIdleEast),
    idleWest: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotIdleWest),
    walkEastA: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotWalkEastA),
    walkWestA: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotWalkWestA),
    turnLeft: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotTurnLeft),
    turnRight: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotTurnRight),
    jump: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotJump),
    lightCast: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotLightCast),
    fail: resolveSpriteAssetSource(lightbotSpriteManifest, lightbotSpriteManifest.characters.robotFail),
  }

  robotSprite.anchor.set(0.5, 1)
  robotSprite.position.set(0, 10)
  robotSprite.eventMode = 'none'
  host.robotContainer.addChild(robotSprite)

  for (const source of Object.values(spriteSources)) {
    if (source?.kind === 'file') {
      void ensureFileTextureLoaded(source.filePath)
    }
  }

  function resolveRobotSource(direction: Direction) {
    // S = horizontal flip of E; W and N TBD (currently use idleWest)
    const useWest = direction === 'W' || direction === 'N'
    return useWest ? spriteSources.idleWest : spriteSources.idleEast
  }

  /** S = idleEast 水平翻转；W = idleWest 水平翻转 */
  function spriteFlipX(direction: Direction): boolean {
    return direction === 'S' || direction === 'W'
  }

  return {
    kind: 'sprite-atlas',
    play(action) {
      currentAction = action.kind
    },
    render({ baseX, baseY, state }) {
      drawDirectionalRobotShadow(host.shadowGraphics, baseX, baseY, state.lift)
      if (state.landingPulse > 0.01) {
        host.shadowGraphics.ellipse(baseX, baseY + 10, 16 + state.landingPulse * 18, 7 + state.landingPulse * 8)
        host.shadowGraphics.stroke({ color: '#fff6de', width: 2, alpha: state.landingPulse * 0.28 })
      }

      host.robotContainer.position.set(baseX + state.shakeX, baseY - 8 - state.lift)
      host.robotContainer.rotation = 0
      host.robotContainer.scale.set(state.scaleX, state.scaleY)

      const texture = getSpriteTexture(resolveRobotSource(state.direction))
      if (texture) {
        host.robotBody.clear()
        host.robotArrow.text = ''
        robotSprite.texture = texture
        const scale = 58 / texture.height
        const flipX = spriteFlipX(state.direction) ? -1 : 1
        robotSprite.scale.set(scale * flipX, scale)
        robotSprite.alpha = 1
        robotSprite.tint = 0xffffff
      } else {
        robotSprite.texture = Texture.EMPTY
        fallback.render({ baseX, baseY, state })
        return
      }

      if (currentAction === 'fail') {
        robotSprite.tint = 0xffd4d4
      } else {
        robotSprite.tint = 0xffffff
      }
    },
    dispose() {
      robotSprite.texture = Texture.EMPTY
      host.robotContainer.removeChild(robotSprite)
      robotSprite.destroy()
      fallback.dispose()
    },
  }
}

export function createRobotPresenter(host: RobotPresenterHost, strategy: RobotPresenterStrategy = 'vector'): RobotPresenter {
  if (strategy === 'sprite-atlas') {
    return createSpriteAtlasRobotPresenter(host)
  }

  return createVectorRobotPresenter(host)
}
