import { readFileSync, writeFileSync } from 'fs'
const c = readFileSync('e:/webapp/programtools/src/pages/Design.vue', 'utf8')
const idx = c.indexOf('embedded-exit-bar')
console.log('exit-bar at:', idx)
if (idx >= 0) {
  console.log(JSON.stringify(c.substring(idx-10, idx+300)))
}
