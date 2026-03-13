import { fetchHydroNflsoiContest } from '/var/www/programtools/server/routes/hydro_nflsoi.js'
const r = await fetchHydroNflsoiContest('http://nflsoi.cc:10611/contest/69ad79c783d6583e0f6d26cd/problems')
console.log('problems:', r.problems.length)
r.problems.slice(0,3).forEach(p => console.log(p.label, p.title, 'tags:', JSON.stringify(p.tags)))
