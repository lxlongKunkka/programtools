import { fetchHydroNflsoiProblem } from '../server/routes/hydro_nflsoi.js'

try {
  const r = await fetchHydroNflsoiProblem('http://nflsoi.cc:10611/p/P12695')
  console.log('title:', r.title)
  console.log('content_len:', r.content.length)
  console.log('additionalFile:', r.additionalFile
    ? JSON.stringify({ filename: r.additionalFile.filename, size: r.additionalFile.size })
    : null)
  const imgs = r.content.match(/!\[.*?\]\(https?:\/\/.+?\)/g) || []
  console.log('images_in_content:', JSON.stringify(imgs))
  // 是否有 sample.zip 下载链接
  console.log('has_sample_link:', r.content.includes('sample.zip'))
} catch (e) {
  console.error('ERROR:', e.message, e.stack)
}
