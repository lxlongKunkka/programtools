# ProgramTools Edge Extension

当前版本支持两类导入路径：

- MNA：在浏览器本地抓取题面、AC 代码和附件，再直接导入 SolveData
- AtCoder、核桃 OJ、NFLSOI：把当前题目或比赛链接直接交给 SolveData，复用站内现有抓题能力

## 安装

1. 打开 Edge 扩展页：`edge://extensions`
2. 打开“开发者模式”
3. 点击“加载解压缩的扩展”
4. 选择当前目录：`edge-extension/programtools-importer`

## 使用

1. 在 Edge 中打开支持的网站页面
2. 当前支持：MNA、AtCoder、核桃 OJ、NFLSOI
3. 确保目标站点中的 SolveData 页面可正常访问，也就是你已经登录并且有权限打开 `/solvedata`
4. 如果你导入的是 MNA，浏览器当前账号还需要有权限查看题面、排行榜和提交页面
5. 扩展固定导入到 `https://ai.acjudge.com`
6. 点击扩展图标即可开始导入，不再弹出选择目标站点的窗口
7. 扩展会自动识别当前页面是单题还是比赛，并自动打开或切换到 SolveData 页面
8. 图标会短暂显示 `OK` 或 `ERR` 作为结果提示

## 验证

1. 先手动打开目标 SolveData 页面一次，确认页面能正常进入
2. 再回到支持的网站页面执行导入
3. 导入成功后，SolveData 会弹出提示，并新增一个任务
4. 如果扩展提示失败，优先检查是否登录了目标站点，以及该账号是否有 SolveData 权限

## 当前范围

- 支持：MNA 单题页面导入
- 支持：MNA 比赛整场顺序导入
- 支持：MNA 题面 Markdown、AC 代码、附加文件
- 支持：AtCoder、核桃 OJ、NFLSOI 的单题和比赛链接导入
- 不支持：复杂进度面板与断点续传
- 不支持：未登录 SolveData 时的持久队列投递