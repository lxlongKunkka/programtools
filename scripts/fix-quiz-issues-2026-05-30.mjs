/**
 * Quiz Issues 批处理 2026-05-30
 *
 * 分析结果：
 * - 20条误报 → ignored
 * - 5条缺代码/缺图 → disabled + resolved
 * - 1条解析错误（downloads-1019-q13） → 修复解析 + resolved
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

await mongoose.connect(process.env.APP_MONGODB_URI)
const db = mongoose.connection.db
const issues = db.collection('quiz_question_issues')
const questions = db.collection('quiz_questions')

const now = new Date()
const handledBy = 7
const handledByName = 'kunkka'

// ============================================================
// 批次 1：误报 → ignored
// ============================================================
const falseReportIds = [
  '69ec30227bf86f7250258ecc', // downloads-1102-q24: (a%2==0)为假→a是奇数 正确
  '6a1269d672fb5578b2f36845', // downloads-1102-q18: 注释不影响运行速度 正确
  '6a1269f072fb5578b2f36930', // downloads-1102-q20: 5.0不是int 正确
  '6a12bd6372fb5578b2f8ebb1', // downloads-1112-q13: Dev C++不是操作系统 正确
  '6a143f8672fb5578b206e6d9', // downloads-1103-q20: 枚举是暴力法 正确，学生同意
  '6a14480f72fb5578b2074885', // downloads-1103-q22: 数组不能自动调整大小 正确
  '6a14482f72fb5578b2074d53', // downloads-1103-q17: 数组下标从0不从1开始 正确
  '6a1442bb72fb5578b2070fa7', // gesp-2025-06-cpp-3-q2: 反码零有2种表示 正确
  '6a1580f072fb5578b212f58f', // gesp-2025-09-cpp-3-q3: arr[5]越界不能访问最后元素 正确
  '6a15852472fb5578b21354bd', // downloads-1103-q18: 字符串以'\0'结尾 正确，学生同意
  '6a1589b672fb5578b21395d3', // downloads-1103-q25: 7>>2=1(整数)非1.75 正确
  '6a158a0972fb5578b21398a2', // downloads-1103-q24: (a&1)==0说明a是偶数 正确
  '6a158bd972fb5578b213aceb', // downloads-1104-q23: **不是C++运算符 正确
  '6a158de772fb5578b213cd36', // downloads-1015-q13: s=s+1/n整除bug 正确（无需完整代码）
  '6a16a9ef72fb5578b21ea063', // downloads-1101-q20: 3.0不是int常量 正确
  '6a18057d72fb5578b22dde0b', // downloads-1101-q18: 注释被编译器忽略 正确
  '6a182c2372fb5578b22ff74f', // downloads-1104-q25: a['0']用ASCII值48作下标 正确
  '6a199abf72fb5578b23face1', // gesp-2024-06-cpp-7-q14: count_triple O(n^3) 正确
  '6a19a34a72fb5578b2400d57', // downloads-1014-q17: 快速排序平均O(nlogn) 正确
  '6a169b9672fb5578b21dcd1a', // downloads-1042-q18: 无具体说明，答案正确
]

let ignoredCount = 0
for (const id of falseReportIds) {
  const r = await issues.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: { status: 'ignored', handledAt: now, handledBy, handledByName, adminNote: '核查题目与答案无误，误报关闭', updatedAt: now } }
  )
  if (r.modifiedCount) ignoredCount++
}
console.log(`批次1 误报关闭: ${ignoredCount}/${falseReportIds.length}`)

// ============================================================
// 批次 2：缺代码/缺图题 → disabled + resolved
// ============================================================
const defectiveMap = [
  {
    issueId: '6a12fa7c72fb5578b2fb729a',
    qUid: 'downloads-1114-q7',
    note: '题目缺循环代码/图片，无法作答，停用',
  },
  {
    issueId: '6a14404d72fb5578b206f01d',
    qUid: 'downloads-1114-q20',
    note: '题干仅含"输入：输出："，代码与输入均缺失，停用',
  },
  {
    issueId: '6a1440f472fb5578b206f895',
    qUid: 'downloads-1114-q21',
    note: '题干仅含"输入：输出："，代码与输入均缺失，停用',
  },
  {
    issueId: '6a158ec572fb5578b213d93e',
    qUid: 'downloads-1015-q15',
    note: '题目缺程序代码，无法判断输出，停用',
  },
  {
    issueId: '6a158f0872fb5578b213dc30',
    qUid: 'downloads-1034-q17',
    note: '题目缺完整程序代码，无法作答，停用',
  },
]

let disabledCount = 0
for (const item of defectiveMap) {
  const qr = await questions.updateOne(
    { questionUid: item.qUid },
    { $set: { enabled: false, updatedAt: now } }
  )
  const ir = await issues.updateOne(
    { _id: new mongoose.Types.ObjectId(item.issueId) },
    { $set: { status: 'resolved', handledAt: now, handledBy, handledByName, adminNote: item.note, updatedAt: now } }
  )
  console.log(`  停用 ${item.qUid}: q=${qr.modifiedCount} i=${ir.modifiedCount}`)
  if (qr.modifiedCount || ir.modifiedCount) disabledCount++
}
console.log(`批次2 缺陷题停用: ${disabledCount}/${defectiveMap.length}`)

// ============================================================
// 批次 3：修复 downloads-1019-q13 解析（解析与代码不符，误写成指针题）
// ============================================================
const correctExplanation = `本题考察 while 循环、取模运算（%）以及 continue 语句的配合使用。

**变量追踪（k=4, n=0）：**
- 第1次迭代：n→1，1%3=1≠0，执行 continue，k 不变（=4）
- 第2次迭代：n→2，2%3=2≠0，执行 continue，k 不变（=4）
- 第3次迭代：n→3，3%3=0，**不执行 continue**，执行 k--，k 变为 3
- 循环条件检查：n(3) < k(3) 为假，退出循环

**输出：** k=3, n=3，即打印 "3,3"

故答案为 **D**。

注意：本题与指针无关，考察的是循环控制流（continue 跳过后续语句、k-- 改变循环终止条件）。`

const qFixR = await questions.updateOne(
  { questionUid: 'downloads-1019-q13' },
  { $set: { explanation: correctExplanation, explanationText: correctExplanation, updatedAt: now } }
)
const iFixR = await issues.updateOne(
  { _id: new mongoose.Types.ObjectId('6a182ac272fb5578b22fe2a0') },
  { $set: { status: 'resolved', handledAt: now, handledBy, handledByName, adminNote: '解析内容与代码严重不符（错误写成指针题），已修正解析；答案D正确', updatedAt: now } }
)
console.log(`批次3 修复解析 downloads-1019-q13: q=${qFixR.modifiedCount} i=${iFixR.modifiedCount}`)

// ============================================================
// 验证
// ============================================================
const remaining = await issues.countDocuments({ status: { $in: ['pending', 'reviewing'] } })
const stats = await issues.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray()
console.log(`\n处理后 open issue 数量: ${remaining}`)
console.log('状态统计:', JSON.stringify(Object.fromEntries(stats.map(s => [s._id, s.count]))))

await mongoose.disconnect()
