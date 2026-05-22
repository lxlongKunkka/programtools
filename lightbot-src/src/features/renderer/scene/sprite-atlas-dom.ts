import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { resolveSpriteAssetSource, type LightbotSpriteManifest, type SpriteAssetSpec } from './lightbot-sprite-manifest'

type AtlasFrame = {
  x: number
  y: number
  width: number
  height: number
  frameX: number
  frameY: number
  frameWidth: number
  frameHeight: number
}

type AtlasMetadata = {
  width: number
  height: number
  frames: Map<string, AtlasFrame>
}

const atlasMetadataCache = new Map<string, Promise<AtlasMetadata>>()

function parseNumber(value: string | null, fallback = 0) {
  if (!value) {
    return fallback
  }

  const match = value.match(/-?\d+/)
  return match ? Number(match[0]) : fallback
}

function loadImageSize(imagePath: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error(`Failed to load atlas image: ${imagePath}`))
    image.src = imagePath
  })
}

function loadAtlasMetadata(manifest: LightbotSpriteManifest, atlasId: string) {
  const cached = atlasMetadataCache.get(atlasId)
  if (cached) {
    return cached
  }

  const atlas = manifest.atlases[atlasId]
  if (!atlas) {
    return Promise.reject(new Error(`Unknown atlas id: ${atlasId}`))
  }

  const promise = Promise.all([
    fetch(atlas.atlasPath).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load atlas xml: ${atlas.atlasPath}`)
      }
      return response.text()
    }),
    loadImageSize(atlas.imagePath),
  ]).then(([xmlText, imageSize]) => {
    const document = new DOMParser().parseFromString(xmlText, 'application/xml')
    const frames = new Map<string, AtlasFrame>()

    for (const node of Array.from(document.querySelectorAll('SubTexture'))) {
      const name = node.getAttribute('name')
      if (!name) {
        continue
      }

      const width = parseNumber(node.getAttribute('width'))
      const height = parseNumber(node.getAttribute('height'))

      frames.set(name, {
        x: parseNumber(node.getAttribute('x')),
        y: parseNumber(node.getAttribute('y')),
        width,
        height,
        frameX: parseNumber(node.getAttribute('frameX')),
        frameY: parseNumber(node.getAttribute('frameY')),
        frameWidth: parseNumber(node.getAttribute('frameWidth'), width),
        frameHeight: parseNumber(node.getAttribute('frameHeight'), height),
      })
    }

    return {
      width: imageSize.width,
      height: imageSize.height,
      frames,
    }
  })

  atlasMetadataCache.set(atlasId, promise)
  return promise
}

export function useSpriteAssetBackgroundStyle(
  manifest: LightbotSpriteManifest,
  asset: SpriteAssetSpec,
  scale = 1,
) {
  const source = useMemo(() => resolveSpriteAssetSource(manifest, asset), [manifest, asset])
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!source) {
      setStyle(null)
      return () => {
        cancelled = true
      }
    }

    if (source.kind === 'file') {
      setStyle({
        backgroundImage: `url(${source.filePath})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
      })
      return () => {
        cancelled = true
      }
    }

    loadAtlasMetadata(manifest, source.atlas.id)
      .then((metadata) => {
        if (cancelled) {
          return
        }

        const frame = metadata.frames.get(source.subTextureName)
        if (!frame) {
          setStyle(null)
          return
        }

        const frameWidth = Math.max(frame.frameWidth, frame.width)
        const frameHeight = Math.max(frame.frameHeight, frame.height)
        const offsetX = Math.max(-frame.frameX, 0)
        const offsetY = Math.max(-frame.frameY, 0)

        // Clip to actual sprite content — removes neighboring atlas sprites that
        // would otherwise bleed into the transparent padding areas of the frame.
        const clipTop = offsetY * scale
        const clipRight = (frameWidth - offsetX - frame.width) * scale
        const clipBottom = (frameHeight - offsetY - frame.height) * scale
        const clipLeft = offsetX * scale

        setStyle({
          width: `${frameWidth * scale}px`,
          height: `${frameHeight * scale}px`,
          backgroundImage: `url(${source.atlas.imagePath})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${metadata.width * scale}px ${metadata.height * scale}px`,
          backgroundPosition: `${(-frame.x + offsetX) * scale}px ${(-frame.y + offsetY) * scale}px`,
          imageRendering: 'auto',
          clipPath: `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setStyle(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [manifest, source, scale])

  return style
}
