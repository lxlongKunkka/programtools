// Lightbot Three.js 场景控制器。从 LightbotGame.vue 抽出。
// 行为变化：原本依赖闭包变量 editorPaintActive；现在通过 options.isPaintActive() 回调获取。
import * as THREE from 'three'
import { BLOCK_HEIGHT, BLOCK_SIZE, BOARD_GAP, MATERIAL_COLORS } from './constants.js'
import { platformKey } from './level.js'

export function createSceneController(host, options = {}) {
  if (!host) return null
  const isPaintActive = typeof options.isPaintActive === 'function' ? options.isPaintActive : () => false

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = false
  host.innerHTML = ''
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100)
  const boardGroup = new THREE.Group()
  const robotGroup = new THREE.Group()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const interactiveTargets = []

  scene.add(boardGroup)
  scene.add(robotGroup)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.9)
  const keyLight = new THREE.DirectionalLight(0xf7fbff, 1.35)
  const fillLight = new THREE.DirectionalLight(0xd8f0ff, 0.55)
  keyLight.position.set(8, 14, 10)
  fillLight.position.set(-6, 9, -8)
  scene.add(ambientLight, keyLight, fillLight)

  let currentViewSize = 3.55
  let currentMaxHeight = 1

  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 40),
    new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.shadow, transparent: true, opacity: 0.2 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -0.6
  scene.add(shadowPlane)

  const sharedMaterials = {
    topNormal: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topNormal }),
    topTarget: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topTarget }),
    topGreen: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topGreen }),
    topRed: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topRed }),
    topLit: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.topLit }),
    side: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.side }),
    line: new THREE.LineBasicMaterial({ color: MATERIAL_COLORS.line }),
    player: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.player }),
    antenna: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.antenna }),
    eye: new THREE.MeshLambertMaterial({ color: MATERIAL_COLORS.eye }),
    targetRing: new THREE.MeshBasicMaterial({ color: 0xf3fbff }),
    targetCore: new THREE.MeshBasicMaterial({ color: MATERIAL_COLORS.topLit }),
    editorGhost: new THREE.MeshBasicMaterial({ color: 0x8fb0c4, transparent: true, opacity: 0.18 }),
    editorGhostLine: new THREE.LineBasicMaterial({ color: 0x8ea7bb, transparent: true, opacity: 0.4 }),
    hitArea: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  }

  const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE)
  const outlineGeometry = new THREE.EdgesGeometry(blockGeometry)
  const editorGhostGeometry = new THREE.BoxGeometry(BLOCK_SIZE * 0.94, 0.02, BLOCK_SIZE * 0.94)
  const editorGhostOutline = new THREE.EdgesGeometry(editorGhostGeometry)
  const hitPlaneGeometry = new THREE.PlaneGeometry(BLOCK_SIZE * 0.94, BLOCK_SIZE * 0.94)

  function resize() {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    const aspect = width / height
    camera.left = -currentViewSize * aspect
    camera.right = currentViewSize * aspect
    camera.top = currentViewSize
    camera.bottom = -currentViewSize
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  }

  function clearGroup(group) {
    if (group === boardGroup) {
      interactiveTargets.length = 0
    }
    group.children.slice().forEach((child) => {
      child.traverse?.((node) => {
        if (!node.geometry) return
        if (
          node.geometry !== blockGeometry &&
          node.geometry !== outlineGeometry &&
          node.geometry !== editorGhostGeometry &&
          node.geometry !== editorGhostOutline &&
          node.geometry !== hitPlaneGeometry
        ) {
          node.geometry.dispose()
        }
      })
      group.remove(child)
    })
  }

  function buildBoard(level, litKeyList) {
    clearGroup(boardGroup)
    const litSet = new Set(litKeyList)
    const tiles = []
    const boardHeight = level.board.length
    const boardWidth = Math.max(...level.board.map((row) => row.length), 0)

    level.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return
        tiles.push({ x, y, cell })
      })
    })

    if (!tiles.length && !options.onCellSelect) {
      render()
      return
    }

    const layoutCells = options.onCellSelect
      ? Array.from({ length: boardHeight }, (_, y) => Array.from({ length: boardWidth }, (_, x) => ({ x, y }))).flat()
      : tiles

    const xs = layoutCells.map((item) => item.x * (BLOCK_SIZE + BOARD_GAP))
    const zs = layoutCells.map((item) => item.y * (BLOCK_SIZE + BOARD_GAP))
    const heights = tiles.map((item) => item.cell.h)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2
    const spanX = Math.max(...xs) - Math.min(...xs) + BLOCK_SIZE
    const spanZ = Math.max(...zs) - Math.min(...zs) + BLOCK_SIZE
    currentMaxHeight = Math.max(...heights, 1)
    currentViewSize = Math.max(2.15, Math.min(3.55, Math.max(spanX, spanZ) * 0.56 + currentMaxHeight * 0.18))
    boardGroup.position.set(-centerX, 0, -centerZ)
    shadowPlane.position.x = -centerX
    shadowPlane.position.z = -centerZ
    shadowPlane.scale.setScalar(Math.max(spanX, spanZ) / 2.8)

    if (options.onCellSelect) {
      for (let y = 0; y < boardHeight; y += 1) {
        for (let x = 0; x < boardWidth; x += 1) {
          const existingCell = level.board[y]?.[x] || null
          const hitY = (existingCell?.h || 0) * BLOCK_HEIGHT + 0.03

          if (!existingCell) {
            const ghost = new THREE.Mesh(editorGhostGeometry, sharedMaterials.editorGhost)
            ghost.position.set(x * (BLOCK_SIZE + BOARD_GAP), 0.01, y * (BLOCK_SIZE + BOARD_GAP))
            boardGroup.add(ghost)

            const ghostOutline = new THREE.LineSegments(editorGhostOutline, sharedMaterials.editorGhostLine)
            ghostOutline.position.copy(ghost.position)
            boardGroup.add(ghostOutline)
          }

          const hitArea = new THREE.Mesh(hitPlaneGeometry, sharedMaterials.hitArea)
          hitArea.rotation.x = -Math.PI / 2
          hitArea.position.set(x * (BLOCK_SIZE + BOARD_GAP), hitY, y * (BLOCK_SIZE + BOARD_GAP))
          hitArea.userData.editorCell = { x, y }
          boardGroup.add(hitArea)
          interactiveTargets.push(hitArea)
        }
      }
    }

    tiles.forEach((item) => {
      const tileGroup = new THREE.Group()
      tileGroup.position.set(item.x * (BLOCK_SIZE + BOARD_GAP), 0, item.y * (BLOCK_SIZE + BOARD_GAP))

      for (let layer = 0; layer < item.cell.h; layer += 1) {
        const isTop = layer === item.cell.h - 1
        const isLit = isTop && litSet.has(platformKey(item.x, item.y))
        const floorTopMaterial = item.cell.floorColor === 'green'
          ? sharedMaterials.topGreen
          : item.cell.floorColor === 'red'
            ? sharedMaterials.topRed
            : (item.cell.target ? sharedMaterials.topTarget : sharedMaterials.topNormal)
        const topMaterial = isTop
          ? (isLit ? sharedMaterials.topLit : floorTopMaterial)
          : sharedMaterials.side
        const materials = [sharedMaterials.side, sharedMaterials.side, topMaterial, sharedMaterials.side, sharedMaterials.side, sharedMaterials.side]
        const block = new THREE.Mesh(blockGeometry, materials)
        block.position.y = (layer + 0.5) * BLOCK_HEIGHT
        block.userData.editorCell = { x: item.x, y: item.y }
        tileGroup.add(block)
        interactiveTargets.push(block)

        const outline = new THREE.LineSegments(outlineGeometry, sharedMaterials.line)
        outline.position.copy(block.position)
        tileGroup.add(outline)
      }

      if (item.cell.target) {
        const topY = item.cell.h * BLOCK_HEIGHT + 0.03
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 12, 32), sharedMaterials.targetRing)
        ring.rotation.x = Math.PI / 2
        ring.position.set(0, topY, 0)
        tileGroup.add(ring)

        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24), sharedMaterials.targetCore)
        core.position.set(0, topY, 0)
        tileGroup.add(core)
      }

      boardGroup.add(tileGroup)
    })

    render()
  }

  function updateRobot(level, robotState) {
    clearGroup(robotGroup)
    const cell = level.board[robotState.y]?.[robotState.x]
    if (!cell) {
      render()
      return
    }

    const robotBase = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.44), sharedMaterials.player)
    body.position.y = 0.56
    robotBase.add(body)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.32), sharedMaterials.player)
    head.position.y = 0.96
    robotBase.add(head)

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 12), sharedMaterials.antenna)
    antenna.position.y = 1.18
    robotBase.add(antenna)

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), sharedMaterials.antenna)
    antennaTip.position.y = 1.34
    robotBase.add(antennaTip)

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sharedMaterials.eye)
    const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), sharedMaterials.eye)
    eyeLeft.position.set(-0.075, 0.985, 0.172)
    eyeRight.position.set(0.075, 0.985, 0.172)
    robotBase.add(eyeLeft, eyeRight)

    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.03), sharedMaterials.eye)
    facePlate.position.set(0, 0.85, 0.225)
    robotBase.add(facePlate)

    const browPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.04), sharedMaterials.antenna)
    browPlate.position.set(0, 1.055, 0.18)
    robotBase.add(browPlate)

    const frontNose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), sharedMaterials.antenna)
    frontNose.position.set(0, 0.86, 0.26)
    robotBase.add(frontNose)

    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.03), sharedMaterials.eye)
    chestPanel.position.set(0, 0.57, 0.235)
    robotBase.add(chestPanel)

    const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), sharedMaterials.side)
    const footRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), sharedMaterials.side)
    footLeft.position.set(-0.1, 0.14, 0)
    footRight.position.set(0.1, 0.14, 0)
    robotBase.add(footLeft, footRight)

    const dirRotation = {
      forward: Math.PI / 2,
      right: 0,
      backward: -Math.PI / 2,
      left: Math.PI
    }

    robotBase.rotation.y = dirRotation[robotState.dir] || 0
    robotGroup.position.set(
      robotState.x * (BLOCK_SIZE + BOARD_GAP) + boardGroup.position.x,
      cell.h * BLOCK_HEIGHT,
      robotState.y * (BLOCK_SIZE + BOARD_GAP) + boardGroup.position.z
    )
    robotGroup.add(robotBase)
    render()
  }

  function update(level, robotState, litKeyList) {
    buildBoard(level, litKeyList)
    updateRobot(level, robotState)
    resize()

    camera.position.set(5.6, 6.5 + currentMaxHeight * 0.44, 5.6)
    camera.lookAt(0, currentMaxHeight * BLOCK_HEIGHT * 0.58, 0)
    render()
  }

  function render() {
    renderer.render(scene, camera)
  }

  function pickEditorCell(event) {
    if (!options.onCellSelect) return null

    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const hit = raycaster.intersectObjects(interactiveTargets, false).find((entry) => entry.object.userData?.editorCell)
    return hit?.object.userData?.editorCell || null
  }

  function handleScenePointerDown(event) {
    if (!options.onCellSelect) return

    const cell = pickEditorCell(event)
    if (!cell) return

    renderer.domElement.setPointerCapture?.(event.pointerId)
    options.onPaintStart?.(cell.x, cell.y)
  }

  function handleScenePointerMove(event) {
    if (!options.onCellSelect || !isPaintActive()) return

    const cell = pickEditorCell(event)
    if (!cell) return

    options.onPaintMove?.(cell.x, cell.y)
  }

  function handleScenePointerUp(event) {
    if (!options.onCellSelect) return

    renderer.domElement.releasePointerCapture?.(event.pointerId)
    options.onPaintEnd?.()
  }

  function handleScenePointerCancel(event) {
    if (!options.onCellSelect) return

    renderer.domElement.releasePointerCapture?.(event.pointerId)
    options.onPaintEnd?.()
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => resize())
    : null

  if (resizeObserver) {
    resizeObserver.observe(host)
  }
  if (options.onCellSelect) {
    renderer.domElement.addEventListener('pointerdown', handleScenePointerDown)
    renderer.domElement.addEventListener('pointermove', handleScenePointerMove)
    renderer.domElement.addEventListener('pointerup', handleScenePointerUp)
    renderer.domElement.addEventListener('pointercancel', handleScenePointerCancel)
  }
  resize()

  return {
    host,
    update,
    resize,
    dispose() {
      resizeObserver?.disconnect()
      if (options.onCellSelect) {
        renderer.domElement.removeEventListener('pointerdown', handleScenePointerDown)
        renderer.domElement.removeEventListener('pointermove', handleScenePointerMove)
        renderer.domElement.removeEventListener('pointerup', handleScenePointerUp)
        renderer.domElement.removeEventListener('pointercancel', handleScenePointerCancel)
      }
      renderer.dispose()
      blockGeometry.dispose()
      outlineGeometry.dispose()
      editorGhostGeometry.dispose()
      editorGhostOutline.dispose()
      hitPlaneGeometry.dispose()
      Object.values(sharedMaterials).forEach((material) => material.dispose())
      host.innerHTML = ''
    }
  }
}
