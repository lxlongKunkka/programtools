#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { HYDRO_MONGODB_URI } from '../config.js'

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

async function main() {
  const docId = Number.parseInt(getArg('doc-id', ''), 10)
  const outFile = String(getArg('out', '')).trim()
  const domainId = String(getArg('domain-id', '')).trim()
  const titleLike = String(getArg('title-like', '')).trim()

  if ((!Number.isInteger(docId) || docId <= 0) && !titleLike) {
    throw new Error('请使用 --doc-id=<number> 或 --title-like=<keyword> 指定查询条件')
  }

  const conn = await mongoose.createConnection(HYDRO_MONGODB_URI).asPromise()

  try {
    const collection = conn.collection('document')
    const query = {}
    if (Number.isInteger(docId) && docId > 0) {
      query.docId = docId
    }
    if (domainId) {
      query.domainId = domainId
    }
    if (titleLike) {
      query.title = { $regex: titleLike, $options: 'i' }
    }

    const items = await collection.find(query).limit(20).toArray()
    const result = {
      docId,
      domainId,
      titleLike,
      count: items.length,
      found: items.length > 0,
      items
    }
    const json = `${JSON.stringify(result, null, 2)}\n`

    if (outFile) {
      const outputPath = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, json, 'utf-8')
    }

    process.stdout.write(json)
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch(async (error) => {
  console.error(error?.stack || error?.message || String(error))
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})