# Lightbot Image Import

使用方式：

1. 把新的 Lightbot 地图图片放到 other/lightbot_images。
2. 文件名按 Lightbot-章节-序号.扩展名 命名，例如 Lightbot-base-10.gif。
3. 运行 npm run import:lightbot-images。
4. 查看 other/lightbot_images/import-manifest.json。

结果说明：

- matchedLevels：图片已经有对应关卡数据。
- imagesWithoutLevels：图片存在，但还没有被转成关卡，需要人工转录到 tiles。
- levelsWithoutImages：代码里已有额外关卡，但图片目录中没有源图。

当前流程是半自动：脚本负责扫描、对照、生成清单；坐标和高度仍由我根据图片人工转录并验证可通关。