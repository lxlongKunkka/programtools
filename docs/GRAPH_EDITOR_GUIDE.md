# 图编辑器使用指南

## 当前实现

图编辑器已切换为第三方项目 Another Graph Editor，不再使用仓库中原来的 Vue + vis-network 页面。

访问入口：
- 前端路由 `/graph` 会直接跳转到 `/grapheditor/index.html`
- 静态产物目录在 `public/grapheditor/`
- 第三方源码目录在 `grapheditor-app/`

## 新版能力

新版支持的能力比旧版明显更完整：
- 有向图、无向图
- 树模式、二分图模式、网格模式
- 多测试用例标签页
- 点标签、点着色、固定节点
- 连通分量 / 强连通分量
- 边双连通 / 点双连通
- 割边、割点
- 最小生成树
- 多种输入格式，包括 LeetCode 风格边集
- 深色 / 浅色主题与更多外观参数

## 本地开发

首次或依赖变更后：

```bash
cd grapheditor-app
npm install
```

构建静态产物：

```bash
cd grapheditor-app
npm run build
```

构建结果会输出到：

```bash
public/grapheditor
```

根项目也已经接入自动构建：

```bash
npm run build
```

会先构建 `grapheditor-app`，再构建主站 Vue 应用。

## 维护约定

- 如果要升级第三方图编辑器，优先在 `grapheditor-app/` 内进行。
- 如果只改主站跳转或入口，修改 `src/router/index.js`。
- 不要恢复 `src/pages/GraphEditor.vue` 旧实现；当前已经正式弃用。

## 来源

上游项目：
- https://github.com/anAcc22/another_graph_editor

当前接入时间：2026年6月8日
