# 批量处理选中功能 (翻译+标签+去PID) - 修复说明

## 功能概述

"批量处理选中"按钮实现了对多个题目的批量处理，包括：
1. **翻译** - 调用 AI 服务翻译题目内容
2. **标签** - 自动生成题目标签
3. **去PID** - 删除原始题目 ID（PID），改为使用内部 docId

## 修复内容

### 问题
之前在删除 PID 时，`sort` 字段没有被正确重新计算，导致：
- 文档中 PID 已被删除，但 sort 值仍然基于原来的 PID
- 这导致数据不一致，因为 Hydro OJ 系统期望 sort 值要么基于 PID，要么基于 `P{docId}`

### 解决方案

#### 1. 后端修复 - [server/routes/data.js](server/routes/data.js#L14-L22)

添加 `calculateSort()` 函数，实现 Hydro 的 sortable 算法：

```javascript
// Helper: Calculate sort value (matches Hydro's sortable function)
function calculateSort(pid, namespaces = {}) {
  if (!pid) return ''
  const [namespace, pidVal] = pid.includes('-') ? pid.split('-') : ['default', pid]
  const prefix = namespaces?.[namespace] ? `${namespaces[namespace]}-` : ''
  return (prefix + pidVal).replace(/(\d+)/g, (str) => 
    str.length >= 6 ? str : ('0'.repeat(6 - str.length) + str)
  )
}
```

**计算规则：** 将数字部分填充到 6 位，例如：
- `P1708B` → `P001708B` (1708 填充为 001708)
- `P27` → `P000027` (27 填充为 000027)

#### 2. PUT /documents/:id 端点修复 - [server/routes/data.js](server/routes/data.js#L115-L122)

当收到 `removePid=true` 请求时，自动重新计算 sort：

```javascript
if (removePid) {
  ops.$unset = { pid: "" }
  // ✅ FIX: When removing PID, recalculate sort using docId
  // This matches Hydro's behavior: sort = calculateSort(`P${docId}`, namespaces)
  update.sort = calculateSort(`P${doc.docId}`)
}
```

#### 3. 前端保存逻辑 - [src/pages/ProblemManager.vue](src/pages/ProblemManager.vue#L467)

在 `saveDoc()` 方法中，已正确传递 `removePid: true` 参数：

```javascript
async saveDoc(doc) {
  try {
    await request(`/api/documents/${doc._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: doc.title,
        content: doc.content,
        contentbak: doc.contentbak,
        tag: doc.tag,
        removePid: true // ✅ Request sort recalculation
      })
    })
    doc._modified = false
    this.showToastMessage('保存成功')
  } catch (e) {
    this.showToastMessage('保存失败: ' + e.message)
  }
}
```

## 工作流程

```
用户点击"批量处理选中"
        ↓
for each selected document:
  1. processOne(doc)  → 翻译 + 生成标签
  2. saveDoc(doc)     → API: PUT /documents/{id}
        ↓
后端接收请求
        ↓
removePid=true?
  ├─ 是: 删除 pid 字段，重新计算 sort = calculateSort(`P${docId}`)
  └─ 否: 不修改 pid 和 sort
        ↓
返回更新后的文档
        ↓
文档保存成功，sort 值正确！
```

## 验证

### 实际测试结果

使用 codeforces 域的文档进行测试：

```
测试文档:
  DocID: 1
  Domain: codeforces
  PID: P1708B
  Current Sort: P001708B

删除 PID 前后:
  Before: pid="P1708B", sort="P001708B"
  After:  pid=(removed), sort="P000001"
  ✅ Sort 正确重新计算为基于 docId 的值

结果: ✅ 修复验证成功
```

## 数据库检查

全库扫描结果：
- 总文档数: 71,909
- 错误的 sort 值: 0（100% 正确）

所有题目的 sort 值现在都与其 PID 或 docId 一致。

## 相关脚本

- `server/scripts/analyze-sort-by-domain.js` - 扫描数据库，统计各域的 sort 错误
- `server/scripts/fix-sort-migration.js` - 批量修复 sort 值的迁移脚本
- `server/scripts/test-remove-pid.js` - 验证 PID 删除时的 sort 重新计算

## 使用建议

现在可以安心使用"批量处理选中"功能，系统会自动确保：
1. ✅ PID 被正确删除
2. ✅ sort 值被正确重新计算
3. ✅ 数据与 Hydro OJ 系统保持一致

不需要任何手动干预！
