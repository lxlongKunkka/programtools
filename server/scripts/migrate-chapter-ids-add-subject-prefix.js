// Migrate chapter IDs from "{level}-{topic}-{chapter}" to
// "{subjectPrefix}-{level}-{topic}-{chapter}" so that C++ and Python levels
// no longer share the same chapter ID space.
//
// Usage:
//   node server/scripts/migrate-chapter-ids-add-subject-prefix.js          # dry-run
//   node server/scripts/migrate-chapter-ids-add-subject-prefix.js --apply  # write changes

import { appConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import CourseActivity from '../models/CourseActivity.js'

const APPLY = process.argv.includes('--apply')

function normalizeSubject(level) {
  const text = String(level?.subject || '').trim()
  if (!text) return 'C++'
  if (text === 'C++' || text.includes('C++')) return 'C++'
  if (text === 'Python' || text.includes('Python')) return 'Python'
  return text
}

function getSubjectPrefix(level) {
  const subject = normalizeSubject(level)
  if (subject === 'Python') return 'py'
  if (subject === 'C++') return 'cpp'
  return String(subject || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'cpp'
}

function isAlreadyPrefixed(id) {
  return /^[a-z][a-z0-9]*-\d+/.test(String(id || ''))
}

async function main() {
  console.log(`[migrate] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  // Cleanup: any CourseActivity rows left in the __migrating__ placeholder
  // state from a previous failed run must be deleted (they no longer have a
  // valid chapterId, and chapterUid still points at the chapter so the
  // proper record can be regenerated naturally).
  const stuckCount = await CourseActivity.countDocuments({ chapterId: /^__migrating__:/ })
  if (stuckCount > 0) {
    console.log(`[migrate] found ${stuckCount} stuck __migrating__ rows from prior run`)
    if (APPLY) {
      const r = await CourseActivity.deleteMany({ chapterId: /^__migrating__:/ })
      console.log(`[migrate] deleted ${r.deletedCount} stuck rows`)
    }
  }

  const levels = await CourseLevel.find({}).lean(false)
  console.log(`[migrate] found ${levels.length} CourseLevel docs`)

  // Phase 1: rename chapter IDs on each level, build chapterUid -> newId map.
  const uidToNewId = new Map()
  const oldIdSamples = new Map() // sample old->new per level for reporting
  let totalChapters = 0
  let renamedChapters = 0

  for (const level of levels) {
    const prefix = getSubjectPrefix(level)
    const renames = []

    // topic-based chapters
    for (let ti = 0; ti < (level.topics || []).length; ti++) {
      const topic = level.topics[ti]
      const chapters = Array.isArray(topic?.chapters) ? topic.chapters : []
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci]
        totalChapters++
        const prev = String(ch.id || '')
        const next = `${prefix}-${level.level}-${ti + 1}-${ci + 1}`
        if (ch?._id) uidToNewId.set(String(ch._id), next)
        if (prev !== next) {
          renames.push({ prev, next, uid: ch?._id ? String(ch._id) : '' })
          ch.id = next
          renamedChapters++
        }
      }
    }

    // legacy flat chapters
    if (Array.isArray(level.chapters)) {
      for (let i = 0; i < level.chapters.length; i++) {
        const ch = level.chapters[i]
        totalChapters++
        const prev = String(ch.id || '')
        const next = `${prefix}-${level.level}-${i + 1}`
        if (ch?._id) uidToNewId.set(String(ch._id), next)
        if (prev !== next) {
          renames.push({ prev, next, uid: ch?._id ? String(ch._id) : '' })
          ch.id = next
          renamedChapters++
        }
      }
    }

    if (renames.length) {
      const sample = renames.slice(0, 3).map(r => `${r.prev}->${r.next}`).join(', ')
      oldIdSamples.set(level._id.toString(), sample)
      console.log(`  L${level.level} [${normalizeSubject(level)}] "${level.title}": ${renames.length} renames (${sample}${renames.length > 3 ? ', ...' : ''})`)
      level.markModified('topics')
      level.markModified('chapters')
      if (APPLY) await level.save()
    }
  }

  console.log(`[migrate] phase 1: ${renamedChapters}/${totalChapters} chapter IDs renamed`)
  console.log(`[migrate] uid->newId map size: ${uidToNewId.size}`)

  // Phase 2: rewrite CourseActivity.chapterId based on chapterUid.
  const allActivities = await CourseActivity.find({
    chapterUid: { $exists: true, $ne: null }
  }).select('_id userId chapterId chapterUid action sessionDate lastActiveAt').lean()
  console.log(`[migrate] found ${allActivities.length} CourseActivity docs with chapterUid`)

  // Group by destination (userId, newId, action, sessionDate). Multiple
  // source rows mapping to the same destination must be collapsed first
  // (keep the most recently active one, delete the rest).
  const destBuckets = new Map()
  let activitiesSkipped = 0
  for (const act of allActivities) {
    const uid = String(act.chapterUid || '')
    const newId = uidToNewId.get(uid)
    if (!newId) { activitiesSkipped++; continue }
    const key = `${act.userId}::${newId}::${act.action}::${act.sessionDate}`
    if (!destBuckets.has(key)) destBuckets.set(key, [])
    destBuckets.get(key).push({ ...act, newId })
  }

  const activitiesToUpdate = []
  const activitiesToDelete = []
  for (const docs of destBuckets.values()) {
    if (docs.length === 1) {
      const a = docs[0]
      if (String(a.chapterId) !== a.newId) {
        activitiesToUpdate.push(a)
      }
      continue
    }
    // Multiple sources collapsing into one destination -> keep latest, delete rest.
    docs.sort((a, b) => {
      const at = new Date(a.lastActiveAt || 0).getTime()
      const bt = new Date(b.lastActiveAt || 0).getTime()
      return bt - at
    })
    const keeper = docs[0]
    if (String(keeper.chapterId) !== keeper.newId) activitiesToUpdate.push(keeper)
    for (let i = 1; i < docs.length; i++) activitiesToDelete.push(docs[i]._id)
  }

  console.log(`[migrate] phase 2: ${activitiesToUpdate.length} rows need chapterId rewrite, ${activitiesToDelete.length} duplicate rows will be deleted, ${activitiesSkipped} skipped (uid not in map)`)

  if (APPLY) {
    if (activitiesToDelete.length) {
      await CourseActivity.deleteMany({ _id: { $in: activitiesToDelete } })
    }
    if (activitiesToUpdate.length) {
      // Two-phase to avoid unique index collisions.
      const parkOps = activitiesToUpdate.map(item => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { chapterId: `__migrating__:${item._id}` } }
        }
      }))
      await CourseActivity.bulkWrite(parkOps, { ordered: false })

      // Drop stale records that would block phase 2.
      const updateIds = new Set(activitiesToUpdate.map(item => String(item._id)))
      let staleDeletes = 0
      for (const item of activitiesToUpdate) {
        const conflicts = await CourseActivity.find({
          userId: item.userId,
          chapterId: item.newId,
          action: item.action,
          sessionDate: item.sessionDate
        }).select('_id').lean()
        const stale = conflicts.map(d => d._id).filter(id => !updateIds.has(String(id)))
        if (stale.length) {
          await CourseActivity.deleteMany({ _id: { $in: stale } })
          staleDeletes += stale.length
        }
      }
      if (staleDeletes) console.log(`[migrate] phase 2: deleted ${staleDeletes} stale CourseActivity rows blocking new chapterId`)

      const finalOps = activitiesToUpdate.map(item => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { chapterId: item.newId } }
        }
      }))
      await CourseActivity.bulkWrite(finalOps, { ordered: false })
    }
  }

  // Phase 3: rewrite UserProgress unlocked/completed/chapterProgress.
  // Best source of truth: unlockedChapterUids / completedChapterUids.
  // For chapterProgress (Map<chapterId,_>), use the user's known UIDs to disambiguate.
  const progresses = await UserProgress.find({}).lean(false)
  console.log(`[migrate] found ${progresses.length} UserProgress docs`)

  let progressTouched = 0

  for (const progress of progresses) {
    let changed = false

    // Build a per-user map from old chapter id strings to candidate new ids,
    // using only the chapter UIDs the user has actually unlocked or completed.
    const userOldToNew = new Map()
    const userKnownNewIds = new Set()
    const sourceUids = [
      ...(progress.unlockedChapterUids || []),
      ...(progress.completedChapterUids || [])
    ]
    for (const uid of sourceUids) {
      const newId = uidToNewId.get(String(uid))
      if (!newId) continue
      userKnownNewIds.add(newId)
      // We don't know the exact old id; we'll match by suffix when rewriting.
    }

    const rewriteList = (arr) => {
      if (!Array.isArray(arr)) return arr
      return arr.map(v => {
        const s = String(v || '')
        if (!s || isAlreadyPrefixed(s)) return s
        // Try to match a known new id whose suffix equals s
        const match = [...userKnownNewIds].find(nid => nid.endsWith(`-${s}`))
        return match || s
      })
    }

    const newUnlocked = rewriteList(progress.unlockedChapters || [])
    const newCompleted = rewriteList(progress.completedChapters || [])

    if (JSON.stringify(progress.unlockedChapters || []) !== JSON.stringify(newUnlocked)) {
      progress.unlockedChapters = newUnlocked
      changed = true
    }
    if (JSON.stringify(progress.completedChapters || []) !== JSON.stringify(newCompleted)) {
      progress.completedChapters = newCompleted
      changed = true
    }

    // chapterProgress (Map<chapterId, {solvedProblems}>)
    const cpEntries = progress.chapterProgress instanceof Map
      ? [...progress.chapterProgress.entries()]
      : Object.entries(progress.chapterProgress || {})

    if (cpEntries.length) {
      const newCp = new Map()
      for (const [k, v] of cpEntries) {
        const key = String(k || '')
        let newKey = key
        if (key && !isAlreadyPrefixed(key)) {
          const match = [...userKnownNewIds].find(nid => nid.endsWith(`-${key}`))
          if (match) newKey = match
        }
        if (newCp.has(newKey)) {
          // Merge solvedProblems
          const cur = newCp.get(newKey)
          const merged = [...new Set([
            ...(cur.solvedProblems || []),
            ...((v && v.solvedProblems) || [])
          ])]
          newCp.set(newKey, { solvedProblems: merged })
        } else {
          newCp.set(newKey, { solvedProblems: ((v && v.solvedProblems) || []).slice() })
        }
      }
      const oldKeys = cpEntries.map(([k]) => String(k))
      const newKeys = [...newCp.keys()]
      if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
        progress.chapterProgress = newCp
        changed = true
      }
    }

    if (changed) {
      progressTouched++
      if (APPLY) await progress.save()
    }
  }

  console.log(`[migrate] phase 3: ${progressTouched}/${progresses.length} UserProgress docs need rewrite`)

  console.log(`[migrate] DONE (${APPLY ? 'APPLIED' : 'DRY-RUN, no writes'})`)
  await appConn.close()
  process.exit(0)
}

main().catch(err => {
  console.error('[migrate] FATAL', err)
  process.exit(1)
})
