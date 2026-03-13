import { fetchHydroNflsoiContest } from '/var/www/programtools/server/routes/hydro_nflsoi.js'
import JSZip from '/var/www/programtools/node_modules/jszip/dist/jszip.min.js'
import axios from '/var/www/programtools/node_modules/axios/dist/node/axios.cjs'
import { load } from '/var/www/programtools/node_modules/cheerio/dist/cjs/index.js'

// 直接用 cookie 方式获取 session
const BASE = 'http://nflsoi.cc:10611'
const env = (await import('fs')).readFileSync('/var/www/programtools/server/.env','utf8')
const user = env.match(/HYDRO_NFLSOI_USER=(.+)/)?.[1]?.trim()
const pwd  = env.match(/HYDRO_NFLSOI_PWD=(.+)/)?.[1]?.trim()

// login
const lp = await axios.get(BASE+'/login',{headers:{'User-Agent':'Mozilla/5.0'},responseType:'text',transformResponse:[d=>d],validateStatus:s=>s<600,timeout:10000})
const lpCookies = (lp.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ')
const  = load(lp.data)
let csrf = ('input[name="csrf_token"]').val() || ''
const params = new URLSearchParams({uname:user,password:pwd,csrf_token:csrf})
const lo = await axios.post(BASE+'/login',params.toString(),{headers:{'User-Agent':'Mozilla/5.0','Content-Type':'application/x-www-form-urlencoded',Cookie:lpCookies},responseType:'text',transformResponse:[d=>d],validateStatus:s=>s<600,maxRedirects:0,timeout:10000})
const allCookies = [...(lp.headers['set-cookie']||[]),...(lo.headers['set-cookie']||[])].map(c=>c.split(';')[0]).join('; ')

// download zip
const tid = '69a62cdaad8aaef371f9e1e5'
const r = await axios.get(BASE+'/contest/'+tid+'/code',{headers:{Cookie:allCookies,'User-Agent':'Mozilla/5.0'},responseType:'arraybuffer',validateStatus:s=>s<600,timeout:30000})
console.log('status:', r.status, 'size:', r.data.byteLength)
if(r.status===200) {
  const zip = await JSZip.loadAsync(r.data)
  const files = Object.keys(zip.files).slice(0,30)
  console.log('zip entries:', files.join('\n'))
}
