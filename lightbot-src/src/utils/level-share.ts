import type { LevelConfig } from '../domain/map/map.types'

export function encodeLevelToUrlParam(cfg: LevelConfig): string {
  const json = JSON.stringify(cfg)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

export function decodeLevelFromUrlParam(encoded: string): LevelConfig {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json) as LevelConfig
}

export function getSharedLevelFromUrl(): LevelConfig | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('level')
  if (!encoded) return null
  try {
    return decodeLevelFromUrlParam(encoded)
  } catch {
    return null
  }
}

export function buildShareUrl(cfg: LevelConfig): string {
  const param = encodeLevelToUrlParam(cfg)
  const url = new URL(window.location.href)
  url.search = `?level=${param}`
  url.hash = ''
  return url.toString()
}
