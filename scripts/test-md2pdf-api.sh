#!/bin/bash

# MD2PDF API 测试脚本

echo "🔍 测试 MD2PDF API..."
echo

# 创建测试 Markdown 文件
TEST_MD=$(cat <<'EOF'
# 测试文档

这是一个测试。

## 代码示例

\`\`\`python
def hello():
    print("Hello World")
\`\`\`

## 数学公式

$E = mc^2$
EOF
)

# 创建临时文件
TMP_FILE="/tmp/test-md2pdf-$$.md"
echo "$TEST_MD" > "$TMP_FILE"

echo "1️⃣ 上传文件并转换..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/tools/md2pdf \
  -F "file=@$TMP_FILE" \
  -F 'options={"paperSize":"A4","orientation":"portrait","margin":"standard","printBackground":true}')

echo "响应: $RESPONSE"
echo

# 解析响应
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ 转换成功！"
  
  # 提取 PDF URL
  PDF_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
  echo "PDF URL: $PDF_URL"
  
  # 检查文件是否存在
  PDF_PATH="/var/www/programtools${PDF_URL#/}"
  if [ -f "$PDF_PATH" ]; then
    FILE_SIZE=$(du -h "$PDF_PATH" | cut -f1)
    echo "文件大小: $FILE_SIZE"
    echo "文件路径: $PDF_PATH"
    ls -lh "$PDF_PATH"
  else
    echo "⚠️  PDF 文件不存在: $PDF_PATH"
  fi
else
  echo "❌ 转换失败"
  echo "$RESPONSE" | grep -o '"error":"[^"]*"' || echo "未知错误"
fi

# 清理
rm -f "$TMP_FILE"

echo
echo "测试完成"
