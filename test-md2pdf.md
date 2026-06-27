# Markdown 转 PDF 测试

这是一个测试文档，用于验证 Markdown 转 PDF 功能。

## 支持的功能

### 1. 文本格式

这是**粗体**文本，这是*斜体*文本，这是~~删除线~~文本。

这是`行内代码`示例。

### 2. 列表

#### 无序列表
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2
- 项目 3

#### 有序列表
1. 第一步
2. 第二步
3. 第三步

### 3. 代码块

```python
def hello_world():
    print("Hello, World!")
    return 42

result = hello_world()
```

```javascript
function factorial(n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

console.log(factorial(5));
```

### 4. 引用

> 这是一个引用块。
> 
> 可以包含多行内容。
> 
> — 引用来源

### 5. 表格

| 姓名 | 年龄 | 城市 |
|------|------|------|
| 张三 | 25   | 北京 |
| 李四 | 30   | 上海 |
| 王五 | 28   | 广州 |

### 6. 链接和图片

这是一个[链接示例](https://github.com)。

![示例图片](https://via.placeholder.com/300x200.png?text=Test+Image)

### 7. 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$

复杂公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### 8. 任务列表

- [x] 已完成的任务
- [ ] 未完成的任务
- [x] 另一个已完成的任务

## 总结

这个测试文档包含了大部分常用的 Markdown 语法，用于验证 PDF 转换功能是否正常工作。
