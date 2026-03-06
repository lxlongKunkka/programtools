import { readFileSync } from 'fs'
const c = readFileSync('e:/webapp/programtools/src/pages/Design.vue', 'utf8')
console.log('File size:', c.length)

// Check all editor-layout occurrences with full context
let pos = 0
let n = 0
while (true) {
  const i = c.indexOf('editor-layout', pos)
  if (i < 0) break
  n++
  console.log(`\n[${n}] position ${i}:`)
  console.log(JSON.stringify(c.substring(i-30, i+80)))
  pos = i + 1
}

// Check opening/closing of editor-main-area
console.log('\n--- editor-main-area occurrences ---')
pos = 0
n = 0
while (true) {
  const i = c.indexOf('editor-main-area', pos)
  if (i < 0) break
  n++
  console.log(`[${n}] pos ${i}: ${JSON.stringify(c.substring(i-10, i+60))}`)
  pos = i + 1
}

// Check end of file template
console.log('\n--- End of template ---')
const endIdx = c.indexOf('</template>')
console.log(`</template> at ${endIdx}`)
console.log(JSON.stringify(c.substring(endIdx-200, endIdx+20)))
