import axios from 'axios'

const chunks = [
  'Bd0RBS5H', 'DaQkl8oS', 'Dh64LIIu', '2OfG_o4g', 'DGpzF0fW',
  'D-LlPMxX', 'XbP_PblQ', 'Cbpt3NWm', 'DLyjgIJ_', 'DlUoADXh',
  'fffZHCY0', 'CImItFSM', 'B41epzAP', 'BuUr5xfm', 'DpCBMEsr',
  'DAC2p8cU', 'YcpJd95i', 'D8QZyrNT', 'DRNB4Rwx', 'DUtymZsz', 'ANPQtPrB'
]

const base = 'https://htoj.com.cn/_nuxt'
const keywords = [
  'inputDesc', 'outputDesc', 'sampleCase', 'inputSample', 'outputSample',
  'get-problem', 'getProblem', 'problem-detail', 'problemDetail',
  'contest-problem', 'contestProblem', 'problemContent', 'problem-content',
  'problemStatement', 'timeLimit', 'memLimit', 'problemInfo', 'problem-info',
  'get-contest-problem-detail', 'contestProblemDetail',
]

for (const chunk of chunks) {
  const url = `${base}/${chunk}.js`
  try {
    const r = await axios.get(url, { timeout: 15000, responseType: 'text' })
    const code = r.data
    const found = keywords.filter(kw => code.includes(kw))
    if (found.length > 0) {
      console.log(`\n=== ${chunk}.js (${Math.round(code.length/1024)}KB) ===`)
      console.log('Found:', found)
      // Show context
      for (const kw of found) {
        let idx = 0
        while (idx < code.length && idx !== -1) {
          idx = code.indexOf(kw, idx)
          if (idx === -1) break
          const ctx = code.slice(Math.max(0, idx - 200), idx + 300)
          // Look specifically for URL patterns
          if (ctx.includes('/api/') || ctx.includes('axios') || ctx.includes('request') || ctx.includes('http')) {
            console.log(`  [${kw}] @${idx}:`, ctx.replace(/\s+/g, ' ').slice(0, 400))
            console.log('')
          }
          idx += kw.length
          if (idx > code.length * 0.9) break // Don't loop too long for large files
        }
      }
    }
  } catch(e) {
    console.log(`  ERR ${chunk}: ${e.message.slice(0, 60)}`)
  }
}
console.log('\ndone.')
