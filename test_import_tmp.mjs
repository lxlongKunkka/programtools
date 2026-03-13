import('/var/www/programtools/server/routes/hydro_nflsoi.js')
  .then(m => { console.log('exports:', Object.keys(m).join(', ')); process.exit(0) })
  .catch(e => { console.error('import error:', e.message); process.exit(1) })
