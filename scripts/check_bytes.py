f=open('/var/www/programtools/server/routes/hydro_nflsoi.js','rb')
d=f.read()
f.close()
lines=d.split(b'\n')
for i in range(120,135):
    l=lines[i]
    print(f'L{i+1}({len(l)}): {l[:60]}')
