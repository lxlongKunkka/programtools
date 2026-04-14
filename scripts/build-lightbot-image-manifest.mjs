import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LIGHTBOT_LEVELS } from '../src/data/lightbotLevels.js'

const scriptPath = fileURLToPath(import.meta.url)
const workspaceRoot = path.resolve(path.dirname(scriptPath), '..')
const imageRoot = path.join(workspaceRoot, 'other', 'lightbot_images')
const outputPath = path.join(imageRoot, 'import-manifest.json')
const IMAGE_PATTERN = /^Lightbot-([a-z]+)-(\d+)\.(gif|png|jpg|jpeg|webp)$/i

function normalizePath(filePath) {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, '/')
}

function compareLevelIds(left, right) {
  const [leftChapter, leftIndex] = left.split('-')
  const [rightChapter, rightIndex] = right.split('-')
  if (leftChapter !== rightChapter) {
    return leftChapter.localeCompare(rightChapter)
  }
  return Number(leftIndex) - Number(rightIndex)
}

function buildBoardStats(level) {
  const cells = level.board.flat().filter(Boolean)
  const width = Math.max(...level.board.map((row) => row.length), 0)
  const height = level.board.length
  const maxElevation = cells.length ? Math.max(...cells.map((cell) => cell.h)) : 0
  const targetCount = cells.filter((cell) => cell.target).length

  return {
    width,
    height,
    platformCount: cells.length,
    targetCount,
    maxElevation
  }
}

async function main() {
  const entries = await readdir(imageRoot, { withFileTypes: true })
  const imageFiles = entries
    .filter((entry) => entry.isFile() && IMAGE_PATTERN.test(entry.name))
    .map((entry) => {
      const match = entry.name.match(IMAGE_PATTERN)
      return {
        fileName: entry.name,
        filePath: path.join(imageRoot, entry.name),
        id: `${match[1]}-${Number(match[2])}`,
        chapterId: match[1],
        levelNumber: Number(match[2])
      }
    })
    .sort((left, right) => compareLevelIds(left.id, right.id))

  const levelById = new Map(LIGHTBOT_LEVELS.map((level) => [level.id, level]))
  const matchedLevels = imageFiles
    .filter((image) => levelById.has(image.id))
    .map((image) => {
      const level = levelById.get(image.id)
      return {
        id: level.id,
        title: level.title,
        chapterId: image.chapterId,
        image: normalizePath(image.filePath),
        summary: level.description,
        limits: {
          main: level.mainLimit,
          p1: level.procLimits?.p1 || 0
        },
        start: level.start,
        board: buildBoardStats(level)
      }
    })

  const imagesWithoutLevels = imageFiles
    .filter((image) => !levelById.has(image.id))
    .map((image) => ({
      id: image.id,
      chapterId: image.chapterId,
      image: normalizePath(image.filePath),
      action: 'manual-transcribe'
    }))

  const imageIdSet = new Set(imageFiles.map((image) => image.id))
  const levelsWithoutImages = LIGHTBOT_LEVELS
    .filter((level) => !imageIdSet.has(level.id))
    .map((level) => ({
      id: level.id,
      title: level.title,
      chapterId: level.chapterId || 'unknown',
      action: 'no-source-image'
    }))
    .sort((left, right) => compareLevelIds(left.id, right.id))

  const manifest = {
    generatedAt: new Date().toISOString(),
    imageRoot: normalizePath(imageRoot),
    totals: {
      images: imageFiles.length,
      matchedLevels: matchedLevels.length,
      imagesWithoutLevels: imagesWithoutLevels.length,
      levelsWithoutImages: levelsWithoutImages.length
    },
    matchedLevels,
    imagesWithoutLevels,
    levelsWithoutImages,
    notes: [
      'matchedLevels 表示已经完成图片到关卡数据的映射。',
      'imagesWithoutLevels 表示目录里有图片，但代码里还没有对应关卡，需要人工转录。',
      'levelsWithoutImages 表示代码里有额外关卡，但图片目录中没有对应源图。'
    ]
  }

  await mkdir(imageRoot, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  console.log(`Image root: ${normalizePath(imageRoot)}`)
  console.log(`Matched: ${matchedLevels.length}/${imageFiles.length}`)
  if (imagesWithoutLevels.length) {
    console.log(`Images missing level data: ${imagesWithoutLevels.map((item) => item.id).join(', ')}`)
  }
  if (levelsWithoutImages.length) {
    console.log(`Levels missing source image: ${levelsWithoutImages.map((item) => item.id).join(', ')}`)
  }
  console.log(`Manifest written to ${normalizePath(outputPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})