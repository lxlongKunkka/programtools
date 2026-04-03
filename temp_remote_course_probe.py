import json
import paramiko

host = '124.222.49.173'
username = 'ubuntu'
password = 'Qmd72h8r1@'

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
  const coll = conn.collection("courselevels")
  const docs = await coll.find({ group: "GESP C++ 认证课程", level: { $in: [5, 6] } }).toArray()
  const result = []

  for (const doc of docs) {
    let chapters = 0
    let nonEmptyContent = 0
    let htmlCount = 0
    let resourceCount = 0
    let requiredCount = 0
    let optionalCount = 0
    let homeworkCount = 0
    let examCount = 0
    const sampleChapters = []

    for (const topic of (doc.topics || [])) {
      for (const ch of (topic.chapters || [])) {
        chapters += 1
        if (String(ch.content || "").trim()) nonEmptyContent += 1
        if (String(ch.contentType || "markdown") === "html") htmlCount += 1
        if (String(ch.resourceUrl || "").trim()) resourceCount += 1
        requiredCount += Array.isArray(ch.problemIds) ? ch.problemIds.length : 0
        optionalCount += Array.isArray(ch.optionalProblemIds) ? ch.optionalProblemIds.length : 0
        homeworkCount += Array.isArray(ch.homeworkIds) ? ch.homeworkIds.length : 0
        examCount += Array.isArray(ch.examIds) ? ch.examIds.length : 0
        if (sampleChapters.length < 8) {
          sampleChapters.push({
            id: ch.id,
            title: ch.title,
            hasContent: Boolean(String(ch.content || "").trim()),
            contentType: ch.contentType || "markdown",
            resourceUrl: ch.resourceUrl || "",
            problemIds: Array.isArray(ch.problemIds) ? ch.problemIds.length : 0,
            optionalProblemIds: Array.isArray(ch.optionalProblemIds) ? ch.optionalProblemIds.length : 0,
            homeworkIds: Array.isArray(ch.homeworkIds) ? ch.homeworkIds.length : 0,
            examIds: Array.isArray(ch.examIds) ? ch.examIds.length : 0,
          })
        }
      }
    }

    result.push({
      level: doc.level,
      title: doc.title,
      chapters,
      nonEmptyContent,
      htmlCount,
      resourceCount,
      requiredCount,
      optionalCount,
      homeworkCount,
      examCount,
      sampleChapters,
    })
  }

  console.log(JSON.stringify(result, null, 2))
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
stdin, stdout, stderr = client.exec_command(command, timeout=120)
out = stdout.read().decode('utf-8', 'ignore')
err = stderr.read().decode('utf-8', 'ignore')
client.close()
print(json.dumps({'stdout': out, 'stderr': err}, ensure_ascii=False, indent=2))
