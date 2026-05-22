export type SpriteAtlasSpec = {
  id: string
  imagePath: string
  atlasPath: string
  format: 'starling-xml'
  notes?: string
}

export type SpriteAtlasRegionRef = {
  atlasId: string
  subTextureName: string
}

export type SpriteAssetSpec = {
  id: string
  filePath?: string
  atlasRegion?: SpriteAtlasRegionRef
  required: boolean
  usage: string
  notes?: string
}

export type ResolvedSpriteAssetSource =
  | { kind: 'file'; filePath: string }
  | { kind: 'atlas-region'; atlas: SpriteAtlasSpec; subTextureName: string }

export function resolveSpriteAssetSource(
  manifest: Pick<LightbotSpriteManifest, 'atlases'>,
  asset: SpriteAssetSpec,
): ResolvedSpriteAssetSource | null {
  if (asset.atlasRegion) {
    const atlas = manifest.atlases[asset.atlasRegion.atlasId]
    if (!atlas) {
      return null
    }

    return {
      kind: 'atlas-region',
      atlas,
      subTextureName: asset.atlasRegion.subTextureName,
    }
  }

  if (asset.filePath) {
    return {
      kind: 'file',
      filePath: asset.filePath,
    }
  }

  return null
}

export type TileFaceSpriteGroup = {
  top: SpriteAssetSpec
  left: SpriteAssetSpec
  right: SpriteAssetSpec
  overlay?: SpriteAssetSpec
  glow?: SpriteAssetSpec
}

export type LightbotSpriteManifest = {
  atlases: Record<string, SpriteAtlasSpec>
  tiles: {
    path: TileFaceSpriteGroup
    neutral: TileFaceSpriteGroup
    lightOff: TileFaceSpriteGroup
    lightOn: TileFaceSpriteGroup
    platform: TileFaceSpriteGroup
    terraceOuter: TileFaceSpriteGroup
    terraceMiddle: TileFaceSpriteGroup
    terraceUpper: TileFaceSpriteGroup
  }
  props: {
    treeSmall: SpriteAssetSpec
    treeTall: SpriteAssetSpec
    coin: SpriteAssetSpec
    goalMarker: SpriteAssetSpec
    tileShadowSoft: SpriteAssetSpec
  }
  characters: {
    robotIdleEast: SpriteAssetSpec
    robotIdleWest: SpriteAssetSpec
    robotWalkEastA: SpriteAssetSpec
    robotWalkEastB: SpriteAssetSpec
    robotWalkWestA: SpriteAssetSpec
    robotWalkWestB: SpriteAssetSpec
    robotTurnLeft: SpriteAssetSpec
    robotTurnRight: SpriteAssetSpec
    robotJump: SpriteAssetSpec
    robotLightCast: SpriteAssetSpec
    robotFail: SpriteAssetSpec
  }
  ui: {
    stagePanel: SpriteAssetSpec
    slotEmpty: SpriteAssetSpec
    slotActive: SpriteAssetSpec
    buttonPlay: SpriteAssetSpec
    buttonUndo: SpriteAssetSpec
    buttonHint: SpriteAssetSpec
    blockMove: SpriteAssetSpec
    blockLight: SpriteAssetSpec
    blockTurnLeft: SpriteAssetSpec
    blockTurnRight: SpriteAssetSpec
    blockJump: SpriteAssetSpec
    blockProc: SpriteAssetSpec
    cmdSquare: SpriteAssetSpec
    cmdForward: SpriteAssetSpec
    cmdTurnLeft: SpriteAssetSpec
    cmdTurnRight: SpriteAssetSpec
    cmdLight: SpriteAssetSpec
    cmdJump: SpriteAssetSpec
    cmdCall: SpriteAssetSpec
    btnBase: SpriteAssetSpec
    btnIconPlay: SpriteAssetSpec
    btnIconReset: SpriteAssetSpec
  }
}

export const lightbotSpriteManifest: LightbotSpriteManifest = {
  atlases: {
    codingGameMain: {
      id: 'codingGameMain',
      imagePath: '/extracted-assets/coding-game-swf/images/embedded_png_4.png',
      atlasPath: '/extracted-assets/coding-game-swf/sprites.xml',
      format: 'starling-xml',
      notes: '从 AlgorithmCity.swf 提取的 Starling TextureAtlas。',
    },
  },
  tiles: {
    path: {
      top: {
        id: 'tile-path-top',
        filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/006_block1Img.png',
        required: true,
        usage: '蓝色可行走图块顶面',
        notes: '使用 xml-slices 精确裁出的 block1Img 作为路径块基础素材。',
      },
      left: {
        id: 'tile-path-left',
        filePath: 'src/assets/lightbot/tiles/path-left.png',
        required: true,
        usage: '蓝色可行走图块左立面',
      },
      right: {
        id: 'tile-path-right',
        filePath: 'src/assets/lightbot/tiles/path-right.png',
        required: true,
        usage: '蓝色可行走图块右立面',
      },
      overlay: {
        id: 'tile-path-overlay',
        filePath: 'src/assets/lightbot/tiles/path-overlay.png',
        required: false,
        usage: '路径高光或勾缝贴图',
      },
    },
    neutral: {
      top: {
        id: 'tile-neutral-top',
        filePath: 'src/assets/lightbot/tiles/neutral-top.png',
        required: true,
        usage: '白灰普通结构图块顶面',
      },
      left: {
        id: 'tile-neutral-left',
        filePath: 'src/assets/lightbot/tiles/neutral-left.png',
        required: true,
        usage: '白灰普通结构图块左立面',
      },
      right: {
        id: 'tile-neutral-right',
        filePath: 'src/assets/lightbot/tiles/neutral-right.png',
        required: true,
        usage: '白灰普通结构图块右立面',
      },
      overlay: {
        id: 'tile-neutral-overlay',
        filePath: 'src/assets/lightbot/tiles/neutral-overlay.png',
        required: false,
        usage: '普通图块表面高光',
      },
    },
    lightOff: {
      top: {
        id: 'tile-light-off-top',
        filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/010_block5Img.png',
        required: true,
        usage: '未点亮目标图块顶面',
        notes: '使用 xml-slices 精确裁出的 block5Img 作为未点亮灯块基础素材。',
      },
      left: {
        id: 'tile-light-off-left',
        filePath: 'src/assets/lightbot/tiles/light-off-left.png',
        required: true,
        usage: '未点亮目标图块左立面',
      },
      right: {
        id: 'tile-light-off-right',
        filePath: 'src/assets/lightbot/tiles/light-off-right.png',
        required: true,
        usage: '未点亮目标图块右立面',
      },
      glow: {
        id: 'tile-light-off-glow',
        filePath: 'src/assets/lightbot/tiles/light-off-glow.png',
        required: false,
        usage: '未点亮状态的轻微边缘发光',
      },
    },
    lightOn: {
      top: {
        id: 'tile-light-on-top',
        filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/011_block6Img.png',
        required: true,
        usage: '点亮目标图块顶面',
        notes: '使用 xml-slices 精确裁出的 block6Img 作为点亮灯块基础素材。',
      },
      left: {
        id: 'tile-light-on-left',
        filePath: 'src/assets/lightbot/tiles/light-on-left.png',
        required: true,
        usage: '点亮目标图块左立面',
      },
      right: {
        id: 'tile-light-on-right',
        filePath: 'src/assets/lightbot/tiles/light-on-right.png',
        required: true,
        usage: '点亮目标图块右立面',
      },
      glow: {
        id: 'tile-light-on-glow',
        filePath: 'src/assets/lightbot/tiles/light-on-glow.png',
        required: false,
        usage: '点亮状态的外发光',
      },
    },
    platform: {
      top: {
        id: 'platform-top',
        filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/006_block1Img.png',
        required: true,
        usage: '主舞台承托层顶面',
        notes: '使用 xml-slices 精确裁出的 block1Img 作为平台块基础素材。',
      },
      left: {
        id: 'platform-left',
        filePath: 'src/assets/lightbot/tiles/platform-left.png',
        required: true,
        usage: '主舞台承托层左立面',
      },
      right: {
        id: 'platform-right',
        filePath: 'src/assets/lightbot/tiles/platform-right.png',
        required: true,
        usage: '主舞台承托层右立面',
      },
    },
    terraceOuter: {
      top: {
        id: 'terrace-outer-top',
        filePath: 'src/assets/lightbot/tiles/terrace-outer-top.png',
        required: false,
        usage: '地台外层顶面',
      },
      left: {
        id: 'terrace-outer-left',
        filePath: 'src/assets/lightbot/tiles/terrace-outer-left.png',
        required: false,
        usage: '地台外层左立面',
      },
      right: {
        id: 'terrace-outer-right',
        filePath: 'src/assets/lightbot/tiles/terrace-outer-right.png',
        required: false,
        usage: '地台外层右立面',
      },
    },
    terraceMiddle: {
      top: {
        id: 'terrace-middle-top',
        filePath: 'src/assets/lightbot/tiles/terrace-middle-top.png',
        required: false,
        usage: '地台中层顶面',
      },
      left: {
        id: 'terrace-middle-left',
        filePath: 'src/assets/lightbot/tiles/terrace-middle-left.png',
        required: false,
        usage: '地台中层左立面',
      },
      right: {
        id: 'terrace-middle-right',
        filePath: 'src/assets/lightbot/tiles/terrace-middle-right.png',
        required: false,
        usage: '地台中层右立面',
      },
    },
    terraceUpper: {
      top: {
        id: 'terrace-upper-top',
        filePath: 'src/assets/lightbot/tiles/terrace-upper-top.png',
        required: false,
        usage: '地台上层顶面',
      },
      left: {
        id: 'terrace-upper-left',
        filePath: 'src/assets/lightbot/tiles/terrace-upper-left.png',
        required: false,
        usage: '地台上层左立面',
      },
      right: {
        id: 'terrace-upper-right',
        filePath: 'src/assets/lightbot/tiles/terrace-upper-right.png',
        required: false,
        usage: '地台上层右立面',
      },
    },
  },
  props: {
    treeSmall: {
      id: 'prop-tree-small',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'obstacle11Img',
      },
      required: false,
      usage: '小树装饰',
      notes: '临时使用提取 atlas 中的 obstacle11Img 作为占位。',
    },
    treeTall: {
      id: 'prop-tree-tall',
      filePath: 'src/assets/lightbot/props/tree-tall.png',
      required: false,
      usage: '高树装饰',
    },
    coin: {
      id: 'prop-coin',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'goldImg',
      },
      required: false,
      usage: '金币或奖励物',
      notes: '临时使用提取 atlas 中的 goldImg 作为占位。',
    },
    goalMarker: {
      id: 'prop-goal-marker',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'targetImg',
      },
      required: false,
      usage: '终点或特殊目标标记',
      notes: '临时使用提取 atlas 中的 targetImg 作为占位。',
    },
    tileShadowSoft: {
      id: 'prop-tile-shadow-soft',
      filePath: 'src/assets/lightbot/props/tile-shadow-soft.png',
      required: false,
      usage: '图块底部统一软阴影',
    },
  },
  characters: {
    robotIdleEast: {
      id: 'robot-idle-east',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/038_char5SagImg.png',
      required: true,
      usage: '机器人朝东待机',
    },
    robotIdleWest: {
      id: 'robot-idle-west',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/037_char5ArkaSagImg.png',
      required: true,
      usage: '机器人朝西待机',
    },
    robotWalkEastA: {
      id: 'robot-walk-east-a',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/040_char6SagImg.png',
      required: false,
      usage: '机器人朝东行走帧 A',
    },
    robotWalkEastB: {
      id: 'robot-walk-east-b',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/042_char7SagImg.png',
      required: false,
      usage: '机器人朝东行走帧 B',
    },
    robotWalkWestA: {
      id: 'robot-walk-west-a',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/039_char6ArkaSagImg.png',
      required: false,
      usage: '机器人朝西行走帧 A',
    },
    robotWalkWestB: {
      id: 'robot-walk-west-b',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/041_char7ArkaSagImg.png',
      required: false,
      usage: '机器人朝西行走帧 B',
    },
    robotTurnLeft: {
      id: 'robot-turn-left',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/037_char5ArkaSagImg.png',
      required: false,
      usage: '机器人左转',
    },
    robotTurnRight: {
      id: 'robot-turn-right',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/038_char5SagImg.png',
      required: false,
      usage: '机器人右转',
    },
    robotJump: {
      id: 'robot-jump',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/044_char8SagImg.png',
      required: false,
      usage: '机器人跳跃',
    },
    robotLightCast: {
      id: 'robot-light-cast',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/046_char9SagImg.png',
      required: false,
      usage: '机器人点灯动作',
    },
    robotFail: {
      id: 'robot-fail',
      filePath: '/extracted-assets/coding-game-swf/xml-slices/slices/020_char10SagImg.png',
      required: false,
      usage: '机器人失败动作',
    },
  },
  ui: {
    stagePanel: {
      id: 'ui-stage-panel',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'baseButton01Image',
      },
      required: false,
      usage: '舞台大面板背景',
      notes: '临时使用提取 atlas 中的 baseButton01Image 作为占位。',
    },
    slotEmpty: {
      id: 'ui-slot-empty',
      filePath: 'src/assets/lightbot/ui/slot-empty.png',
      required: false,
      usage: '空槽位格子',
    },
    slotActive: {
      id: 'ui-slot-active',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'commandSquareImg',
      },
      required: false,
      usage: '激活槽位格子',
      notes: '临时使用提取 atlas 中的 commandSquareImg 作为占位。',
    },
    buttonPlay: {
      id: 'ui-button-play',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'playImg',
      },
      required: false,
      usage: '运行按钮',
      notes: '临时使用提取 atlas 中的 playImg 作为占位。',
    },
    buttonUndo: {
      id: 'ui-button-undo',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'iconRefreshImg',
      },
      required: false,
      usage: '撤销按钮',
      notes: '临时使用提取 atlas 中的 iconRefreshImg 作为占位。',
    },
    buttonHint: {
      id: 'ui-button-hint',
      atlasRegion: {
        atlasId: 'codingGameMain',
        subTextureName: 'iconCozumImg',
      },
      required: false,
      usage: '提示按钮',
      notes: '临时使用提取 atlas 中的 iconCozumImg 作为占位。',
    },
    blockMove: {
      id: 'ui-block-move',
      filePath: 'src/assets/lightbot/ui/block-move.png',
      required: false,
      usage: '前进积木图标',
    },
    blockLight: {
      id: 'ui-block-light',
      filePath: 'src/assets/lightbot/ui/block-light.png',
      required: false,
      usage: '点灯积木图标',
    },
    blockTurnLeft: {
      id: 'ui-block-turn-left',
      filePath: 'src/assets/lightbot/ui/block-turn-left.png',
      required: false,
      usage: '左转积木图标',
    },
    blockTurnRight: {
      id: 'ui-block-turn-right',
      filePath: 'src/assets/lightbot/ui/block-turn-right.png',
      required: false,
      usage: '右转积木图标',
    },
    blockJump: {
      id: 'ui-block-jump',
      filePath: 'src/assets/lightbot/ui/block-jump.png',
      required: false,
      usage: '跳跃积木图标',
    },
    blockProc: {
      id: 'ui-block-proc',
      filePath: 'src/assets/lightbot/ui/block-proc.png',
      required: false,
      usage: '过程调用积木图标',
    },
    cmdSquare: {
      id: 'ui-cmd-square',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'commandSquareImg' },
      required: true,
      usage: '指令积木蓝色底图',
    },
    cmdForward: {
      id: 'ui-cmd-forward',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'cmd1Img' },
      required: true,
      usage: '前进积木白色图标',
    },
    cmdTurnLeft: {
      id: 'ui-cmd-turn-left',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'cmd2Img' },
      required: true,
      usage: '左转积木白色图标',
    },
    cmdTurnRight: {
      id: 'ui-cmd-turn-right',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'cmd3Img' },
      required: true,
      usage: '右转积木白色图标',
    },
    cmdLight: {
      id: 'ui-cmd-light',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'cmd4Img' },
      required: true,
      usage: '点灯积木白色图标',
    },
    cmdJump: {
      id: 'ui-cmd-jump',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'cmd6Img' },
      required: true,
      usage: '跳跃积木白色图标',
    },
    cmdCall: {
      id: 'ui-cmd-call',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'cmd5Img' },
      required: false,
      usage: '调用函数积木白色图标',
    },
    btnBase: {
      id: 'ui-btn-base',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'baseButton01Image' },
      required: true,
      usage: '按钮圆角矩形底图（蓝色）',
    },
    btnIconPlay: {
      id: 'ui-btn-icon-play',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'iconOynatma0Img' },
      required: true,
      usage: '运行按钮三角形播放图标',
    },
    btnIconReset: {
      id: 'ui-btn-icon-reset',
      atlasRegion: { atlasId: 'codingGameMain', subTextureName: 'iconRefreshImg' },
      required: true,
      usage: '重置按钮刷新图标',
    },
  },
}
