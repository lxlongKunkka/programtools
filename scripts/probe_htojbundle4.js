import axios from 'axios'

const chunks = [
  'DaQkl8oS', 'Dh64LIIu', '2OfG_o4g', 'DGpzF0fW', 'D-LlPMxX',
  'XbP_PblQ', 'Cbpt3NWm', 'DLyjgIJ_', 'DlUoADXh', 'fffZHCY0',
  'CImItFSM', 'B41epzAP', 'BuUr5xfm', 'DpCBMEsr', 'DAC2p8cU',
  'YcpJd95i', 'D8QZyrNT', 'DRNB4Rwx', 'DUtymZsz', 'ANPQtPrB'
]

const base = 'https://htoj.com.cn/_nuxt'

for (const chunk of chunks) {
  const url = `${base}/${chunk}.js`
  try {
    const r = await axios.get(url, { timeout: 15000, responseType: 'text' })
    const code = r.data
    
    // Check for any API paths
    const pathMatches = code.match(/\/api\/[^\s"'`,]{5,100}/g)
    if (pathMatches && pathMatches.length > 0) {
      const paths = [...new Set(pathMatches)].sort()
      console.log(`\n=== ${chunk}.js (${Math.round(code.length/1024)}KB): ${paths.length} API paths ===`)
      paths.forEach(p => console.log('  ', p))
    }
  } catch(e) {
    console.log(`  ERR ${chunk}: ${e.message.slice(0, 60)}`)
  }
}
console.log('\ndone.')
