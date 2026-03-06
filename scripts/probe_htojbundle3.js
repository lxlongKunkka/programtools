import axios from 'axios'

const url = 'https://htoj.com.cn/_nuxt/Bd0RBS5H.js'
console.log('Fetching main bundle...')
const r = await axios.get(url, { timeout: 30000, responseType: 'text' })
const code = r.data
console.log('Size:', Math.round(code.length / 1024), 'KB')

// Extract ALL /api/code-community/api/ paths
const pathMatches = code.match(/\/api\/code-community\/api\/[a-zA-Z0-9_\-\/]*/g)
if (pathMatches) {
  const paths = [...new Set(pathMatches)].sort()
  console.log('\n=== All code-community API paths ===')
  paths.forEach(p => console.log(p))
}

// Extract ALL function definitions that contain the API calls
const funcMatches = code.match(/function\s+\w+[^{]*\{[^}]{0,300}code-community\/api[^}]*\}/g)
if (funcMatches) {
  console.log('\n=== API Functions ===')
  funcMatches.slice(0, 50).forEach(f => console.log(f.slice(0, 300), '\n'))
}
