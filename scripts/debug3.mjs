import { readFileSync } from 'fs'
const c = readFileSync('e:/webapp/programtools/src/pages/Design.vue', 'utf8')
console.log('File size:', c.length)

// Check editor-main-area
const idx1 = c.indexOf('editor-main-area')
console.log('editor-main-area at:', idx1)
if (idx1 >= 0) console.log(JSON.stringify(c.substring(idx1-30, idx1+80)))

// Check editor-layout  
const all = []
let pos = 0
while (true) {
  const i = c.indexOf('editor-layout', pos)
  if (i < 0) break
  all.push(i)
  pos = i + 1
}
console.log('editor-layout positions:', all)
all.forEach(i => console.log(JSON.stringify(c.substring(i-10, i+50))))
