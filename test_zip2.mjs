import axios from '/var/www/programtools/node_modules/axios/dist/node/axios.cjs'
import fs from 'fs'

const BASE = 'http://nflsoi.cc:10611'
const env = fs.readFileSync('/var/www/programtools/server/.env','utf8')
const user = env.match(/HYDRO_NFLSOI_USER=(.+)/)?.[1]?.trim()
const pwd  = env.match(/HYDRO_NFLSOI_PWD=(.+)/)?.[1]?.trim()

const lp = await axios.get(BASE+'/login',{responseType:'text',transformResponse:[d=>d],validateStatus:s=>s<600,timeout:10000})
const lpCookies = (lp.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ')
const m = lp.data.match(/name="csrf_token"\s+value="([^"]+)"/)
const csrf = m ? m[1] : ''
const body = 'uname='+encodeURIComponent(user)+'&password='+encodeURIComponent(pwd)+'&csrf_token='+encodeURIComponent(csrf)
const loginR = await axios.post(BASE+'/login',body,{headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:lpCookies},responseType:'text',transformResponse:[d=>d],validateStatus:s=>s<600,maxRedirects:0,timeout:10000})
const cookies = [...(lp.headers['set-cookie']||[]),...(loginR.headers['set-cookie']||[])].map(c=>c.split(';')[0]).join('; ')
console.log('login status:', loginR.status)

const tid = '69a8d6d5ad8aaef371fd9f7f'
const r = await axios.get(BASE+'/contest/'+tid+'/code',{headers:{Cookie:cookies,'User-Agent':'Mozilla/5.0'},responseType:'arraybuffer',validateStatus:s=>s<600,timeout:60000})
console.log('zip status:', r.status, 'bytes:', r.data.byteLength)
if(r.status===200){
  const {default: JSZip} = await import('/var/www/programtools/node_modules/jszip/dist/jszip.min.js')
  const zip = await JSZip.loadAsync(r.data)
  console.log('files:\n' + Object.keys(zip.files).join('\n'))
}
