# Google AdSense 广告位接入指南

## 广告位位置

| 位置 | 文件 | CSS 类 | 显示条件 | 推荐格式 |
|------|------|--------|---------|---------|
| 通关弹窗（星星下方） | `src/components/editor/ProgramPanel.tsx` | `lb-ad-win` | 每关通关时展示 | `horizontal` |
| 右侧代码栏底部 | `src/components/layout/GameShell.tsx` | `lb-ad-sidebar` | 桌面端常驻（≤900px 隐藏） | `rectangle` |

## 启用步骤

### 第 1 步：取消注释并填入发布商 ID

`index.html`：
```html
<!-- 将注释去掉，并替换 ca-pub-XXXXXXXXXXXXXXXX -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-你的发布商ID" crossorigin="anonymous"></script>
```

### 第 2 步：替换广告单元 ID

`src/components/AdSlot.tsx` 第 43 行：
```tsx
data-ad-client="ca-pub-你的发布商ID"
```

`src/components/editor/ProgramPanel.tsx`（通关弹窗广告）：
```tsx
<AdSlot slot="通关弹窗广告单元ID" format="horizontal" className="lb-ad-win" />
```

`src/components/layout/GameShell.tsx`（右侧栏广告）：
```tsx
<AdSlot slot="右侧栏广告单元ID" format="rectangle" className="lb-ad-sidebar" />
```

## 注意事项

- 广告单元 ID 在 AdSense 后台 → 广告 → 广告单元 → 按广告单元 中找到
- 替换完成后运行 `node deploy.mjs` 部署
- 新广告位通常需要 24-48 小时才会开始展示广告
- 如需测试，可在 AdSense 后台开启"测试广告"
