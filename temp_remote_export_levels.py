import json
import paramiko

host = '124.222.49.173'
username = 'ubuntu'
password = 'Qmd72h8r1@'
out_path = r'd:\webapp\programtools\backup_gesp56_levels.json'

command = r'''
bash -lc '
cd /var/www/programtools
/nix/var/nix/profiles/default/bin/node <<'"'"'NODE'"'"'
const path = require("path")
const dotenv = require("dotenv")
const mongoose = require("mongoose")

dotenv.config({ path: path.join(process.cwd(), "server/.env") })
const uri = process.env.APP_MONGODB_URI || "mongodb://localhost:27017/programtools"

;(async () => {
  const conn = await mongoose.createConnection(uri).asPromise()
  const docs = await conn.collection("courselevels")
    .find({ group: "GESP C++ 认证课程", level: { $in: [5, 6] } })
    .toArray()
  console.log(JSON.stringify(docs, null, 2))
  await conn.close()
})().catch(err => {
  console.error(err)
  process.exit(1)
})
NODE
'
'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, password=password, timeout=20)
stdin, stdout, stderr = client.exec_command(command, timeout=300)
out = stdout.read().decode('utf-8', 'ignore')
err = stderr.read().decode('utf-8', 'ignore')
client.close()
if err.strip():
    raise SystemExit(err)
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(out)
print(out_path)
print(len(out))
