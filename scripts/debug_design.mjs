import { readFileSync } from 'fs'
const c = readFileSync('e:/webapp/programtools/src/pages/Design.vue', 'utf8')
const idx = c.indexOf('header-actions" v-if="canEditGroup')
if (idx >= 0) {
  console.log('Found at:', idx)
  console.log(JSON.stringify(c.substring(idx-350, idx+400)))
} else {
  console.log('NOT FOUND - trying alternate')
  const idx2 = c.indexOf('canEditGroup')
  console.log('canEditGroup at:', idx2)
  if (idx2 >= 0) console.log(JSON.stringify(c.substring(idx2-400, idx2+100)))
}
