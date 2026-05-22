import { Assets, Rectangle, Texture } from 'pixi.js'
import type { ResolvedSpriteAssetSource, SpriteAtlasSpec } from './lightbot-sprite-manifest'

type AtlasSubTexture = {
  x: number
  y: number
  width: number
  height: number
}

type LoadedAtlas = {
  texture: Texture
  subTextures: Map<string, AtlasSubTexture>
  regionTextures: Map<string, Texture>
}

type AtlasLoadState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  atlas?: LoadedAtlas
  promise?: Promise<void>
  error?: unknown
}

const atlasState = new Map<string, AtlasLoadState>()
const fileTextureCache = new Map<string, Texture>()
const fileTexturePromises = new Map<string, Promise<Texture>>()

function parseSubTextures(xmlText: string) {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml')
  const elements = Array.from(document.querySelectorAll('SubTexture'))
  const subTextures = new Map<string, AtlasSubTexture>()

  for (const element of elements) {
    const name = element.getAttribute('name')
    const x = Number(element.getAttribute('x') ?? 0)
    const y = Number(element.getAttribute('y') ?? 0)
    const width = Number(element.getAttribute('width') ?? 0)
    const height = Number(element.getAttribute('height') ?? 0)

    if (!name || width <= 0 || height <= 0) {
      continue
    }

    subTextures.set(name, { x, y, width, height })
  }

  return subTextures
}

export function ensureSpriteAtlasLoaded(spec: SpriteAtlasSpec) {
  const existing = atlasState.get(spec.id)
  if (existing?.status === 'loading' || existing?.status === 'ready') {
    return
  }

  const state: AtlasLoadState = {
    status: 'loading',
  }

  state.promise = fetch(spec.atlasPath)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load atlas xml: ${spec.atlasPath}`)
      }

      const xmlText = await response.text()
      const texture = Texture.from(spec.imagePath)
      state.atlas = {
        texture,
        subTextures: parseSubTextures(xmlText),
        regionTextures: new Map<string, Texture>(),
      }
      state.status = 'ready'
    })
    .catch((error) => {
      state.status = 'error'
      state.error = error
    })

  atlasState.set(spec.id, state)
}

export function getAtlasRegionTexture(spec: SpriteAtlasSpec, subTextureName: string) {
  const state = atlasState.get(spec.id)
  if (!state || state.status !== 'ready' || !state.atlas) {
    return null
  }

  const atlasTextureSource = state.atlas.texture?.source
  if (!atlasTextureSource) {
    return null
  }

  const cachedTexture = state.atlas.regionTextures.get(subTextureName)
  if (cachedTexture) {
    return cachedTexture
  }

  const subTexture = state.atlas.subTextures.get(subTextureName)
  if (!subTexture) {
    return null
  }

  const texture = new Texture({
    source: atlasTextureSource,
    frame: new Rectangle(subTexture.x, subTexture.y, subTexture.width, subTexture.height),
  })
  state.atlas.regionTextures.set(subTextureName, texture)
  return texture
}

export function getFileTexture(filePath: string) {
  const cachedTexture = fileTextureCache.get(filePath)
  if (cachedTexture) {
    return cachedTexture
  }

  return null
}

export function ensureFileTextureLoaded(filePath: string) {
  const cachedTexture = fileTextureCache.get(filePath)
  if (cachedTexture) {
    return Promise.resolve(cachedTexture)
  }

  const existingPromise = fileTexturePromises.get(filePath)
  if (existingPromise) {
    return existingPromise
  }

  const loadPromise = Assets.load<Texture>(filePath).then((texture) => {
    fileTextureCache.set(filePath, texture)
    return texture
  })

  fileTexturePromises.set(filePath, loadPromise)
  return loadPromise
}

export function getSpriteTexture(source: ResolvedSpriteAssetSource | null) {
  if (!source) {
    return null
  }

  if (source.kind === 'file') {
    return getFileTexture(source.filePath)
  }

  return getAtlasRegionTexture(source.atlas, source.subTextureName)
}