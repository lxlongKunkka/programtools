import axios from 'axios'

// Fetch page HTML and extract script chunks
const html = await axios.get('https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=22666004139776', {
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
})

const text = html.data

// Look for _nuxt chunk URLs in the HTML
const chunkMatches = text.match(/_nuxt\/[A-Za-z0-9_.\-]+\.js/g)
const unique = chunkMatches ? [...new Set(chunkMatches)] : []
console.log('Chunks found in HTML:', unique.length, unique.slice(0, 30))

// Look for inline script with JSON payload
const nuxtMatch = text.match(/<script[^>]*>window\.__NUXT__[^<]{0,2000}/)
if (nuxtMatch) console.log('NUXT data:', nuxtMatch[0].slice(0, 300))

// Check if it's a real HTML or a redirect
console.log('Response status:', html.status)
console.log('HTML snippet (first 500):', text.slice(0, 500))
