# 关卡 JSON 格式说明

> 文件路径：`src/content/levels/<章节>/<关卡名>.json`  
> TypeScript 类型定义：`src/domain/map/map.types.ts`

---

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `id` | `string` | ✅ | 唯一标识符，如 `"beginner-001"` |
| `title` | `string` | ✅ | 关卡显示名称 |
| `teachingGoal` | `string` | ✅ | 教学目标描述 |
| `availableBlocks` | `string[]` | ✅ | 允许使用的指令块列表（见下方） |
| `grid` | `TileConfig[][]` | ✅ | 地图格子二维数组，`grid[行][列]` |
| `robot` | `Robot` | ✅ | 机器人初始状态 |
| `winCondition` | `object` | ✅ | 通关条件（目前只有一种） |
| `chapter` | `object` | ❌ | 章节信息 |
| `constraints` | `object` | ❌ | 限制条件（最大块数等） |
| `hints` | `string[]` | ❌ | 提示文本列表 |

---

## `grid` — 地图格子

`grid[y][x]`：第一维是**行**（y），第二维是**列**（x），左上角为原点。

每个格子 `TileConfig`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `height` | `number` | 高度层级，`0` 为地面，`1`、`2`... 为台阶 |
| `kind` | `string` | 格子类型（见下方） |

### `kind` 取值

| 值 | 含义 |
|----|------|
| `"path"` | 普通可行走地板 |
| `"coin"` | 金币（可行走，需 `pickup` 收集） |
| `"obstacle"` | 障碍物（树），机器人无法进入 |
| `"void"` | 空洞，不渲染，机器人无法进入 |

---

## `robot` — 机器人初始状态

```json
{ "x": 0, "y": 2, "z": 0, "direction": "E" }
```

| 字段 | 说明 |
|------|------|
| `x` | 列坐标（从左往右） |
| `y` | 行坐标（从上往下） |
| `z` | 高度（通常等于该格子的 `height`） |
| `direction` | 朝向：`"N"` 北 / `"E"` 东 / `"S"` 南 / `"W"` 西 |

---

## `availableBlocks` — 可用指令

| 值 | 指令 |
|----|------|
| `"forward"` | 前进一格 |
| `"left"` | 左转 90° |
| `"right"` | 右转 90° |
| `"pickup"` | 捡起金币 |
| `"jump"` | 跳跃（可上下高度差为 1 的台阶） |
| `"call-f1"` | 调用子程序 F1 |
| `"call-f2"` | 调用子程序 F2 |

---

## `chapter` — 章节信息（可选）

```json
{ "id": "basics", "title": "第一章 · 基础", "order": 0 }
```

| 字段 | 说明 |
|------|------|
| `id` | 章节唯一标识 |
| `title` | 章节显示名称 |
| `order` | 章节排序序号（从 0 开始） |

---

## `winCondition` — 通关条件

目前只支持一种类型：

```json
{ "type": "all-coins-collected" }
```

收集地图上所有金币即通关。

---

## `constraints` — 限制（可选）

```json
{
  "maxMainBlocks": 8,
  "maxFunctions": 2,
  "recommendedSteps": 5
}
```

| 字段 | 说明 |
|------|------|
| `maxMainBlocks` | 主程序最大可用块数（影响星级评分上限） |
| `maxFunctions` | 可用子程序数量（F1 / F2） |
| `recommendedSteps` | 推荐最优步数（达到则评 3 星） |

> **星级评分规则**：使用块数 ≤ `recommendedSteps` → ⭐⭐⭐；≤ `(recommendedSteps + maxMainBlocks) / 2` → ⭐⭐；否则 → ⭐

---

## `hints` — 提示（可选）

```json
["向东前进四步到达金币，再执行捡起。"]
```

字符串数组，每条为一句提示文本，在玩家请求提示时显示。

---

## 完整示例

### 最简关卡（直线取金）

```json
{
  "id": "my-level-001",
  "title": "直线取金",
  "teachingGoal": "学习前进和捡起",
  "availableBlocks": ["forward", "pickup"],
  "grid": [
    [
      { "height": 0, "kind": "path" },
      { "height": 0, "kind": "path" },
      { "height": 0, "kind": "coin" }
    ]
  ],
  "robot": { "x": 0, "y": 0, "z": 0, "direction": "E" },
  "winCondition": { "type": "all-coins-collected" }
}
```

### 含台阶的关卡

```json
{
  "id": "chapter2-001",
  "title": "初识台阶跳跃",
  "chapter": { "id": "procedures", "title": "第二章 · 子程序", "order": 1 },
  "teachingGoal": "学习跳跃：机器人可以跳上高度差为1的格子",
  "availableBlocks": ["forward", "jump", "pickup"],
  "grid": [
    [
      { "height": 0, "kind": "path" },
      { "height": 0, "kind": "path" },
      { "height": 1, "kind": "path" },
      { "height": 1, "kind": "coin" }
    ]
  ],
  "robot": { "x": 0, "y": 0, "z": 0, "direction": "E" },
  "winCondition": { "type": "all-coins-collected" },
  "constraints": {
    "maxMainBlocks": 6,
    "recommendedSteps": 4
  },
  "hints": ["走到台阶前，用跳跃指令上台阶，再走到金币处取走"]
}
```

---

## 新增关卡步骤

1. 在 `src/content/levels/<章节>/` 下新建 JSON 文件
2. 在 `src/features/game/level-loader.ts` 中 import 并加入 `allLevels` 数组
