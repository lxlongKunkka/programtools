import { MongoClient } from "mongodb";
import { config } from "dotenv";
config({ path: "server/.env" });

const pids = [727,751,957,997,1110,1135,1227,1429,1437,1605,1645,1780,1899,1969];

const c = new MongoClient(process.env.HYDRO_MONGODB_URI);
await c.connect();
const db = c.db();
const docs = await db.collection("document").find({
  domainId: "atcoder", docType: 10, docId: { $in: pids }
}, { projection: { docId:1, title:1, content:1 } }).toArray();
docs.sort((a,b)=>a.docId-b.docId);
for (const d of docs) {
  const content = (d.content||"").replace(/\n/g," ").slice(0,600);
  console.log("=== atcoder:" + d.docId + " " + d.title);
  console.log(content);
  console.log("");
}
await c.close();
