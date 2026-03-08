# 给图形填色 (fill)

## 教学目标

**知识目标：**
1.  理解并掌握海龟画图库中 `import turtle` 的基本用法。
2.  认识并能正确使用 `t.fillcolor()` 函数设置填充颜色。
3.  理解 `t.begin_fill()` 和 `t.end_fill()` 函数的作用，知道它们必须成对使用才能完成图形填充。
4.  了解常见的颜色名称（如 "red", "blue", "green" 等）。

**能力目标：**
1.  能够独立编写代码，使用海龟画图绘制并填充至少一种基本图形（如正方形、三角形、圆形）。
2.  能够根据需求，为图形选择合适的边框颜色和填充颜色。
3.  通过实践，培养调试简单代码错误的能力。

**素养目标：**
1.  培养学生对编程的兴趣和创造力，体验通过代码创造视觉效果的乐趣。
2.  提升逻辑思维能力，学会按照步骤分解问题并解决。
3.  培养耐心和细心，理解编程中细节的重要性。

===NEXT===

## 趣味引入

同学们，你们是不是都很喜欢画画呀？画完一个漂亮的图形，是不是总想给它涂上五颜六色的颜色呢？比如画一个苹果，我们想把它涂成红色；画一片叶子，我们想把它涂成绿色。

我们之前已经学会了如何让小海龟画出各种各样的线条和形状，比如正方形、圆形、三角形。但是，小海龟画出来的图形都是空心的，就像只画了轮廓一样。

今天，我们要给小海龟施展一个“魔法”，让它学会给画出来的图形“涂色”！这样，我们就能画出彩色的苹果、绿色的叶子，还有各种漂亮的、填满颜色的图案啦！是不是很期待？

===NEXT===

## 知识点讲解

小海龟想要给图形涂色，需要用到几个特殊的“魔法咒语”。

1.  **准备画笔和画板：**
    和以前一样，我们首先要请出我们的小海龟画图工具。
    ```python
    import turtle # 导入海龟画图模块
    t = turtle.Turtle() # 创建一只小海龟
    s = turtle.Screen() # 创建一个画板
    ```
    这里 `t` 就是我们的小海龟，`s` 是它的画板。

2.  **选择填充颜色：`t.fillcolor()`**
    在给图形涂色之前，我们得告诉小海龟，你想用什么颜色来填充。
    这个咒语就是 `t.fillcolor("颜色名称")`。
    比如，如果你想用红色填充，就写 `t.fillcolor("red")`。
    你也可以设置画笔的颜色（也就是图形的边框颜色）用 `t.pencolor("颜色名称")`。
    或者，你也可以一次性设置边框和填充颜色：`t.color("边框颜色", "填充颜色")`。
    *小提示：* 常见的颜色名称有 "red"（红）, "blue"（蓝）, "green"（绿）, "yellow"（黄）, "purple"（紫）, "orange"（橙）, "black"（黑）, "white"（白）等等。

3.  **开始填充：`t.begin_fill()`**
    告诉小海龟：“好啦，从现在开始，你画的图形我要把它记录下来，等下要填充颜色哦！”
    这个咒语是 `t.begin_fill()`。
    记住，这个咒语必须在你开始画需要填充的图形之前使用。

4.  **结束填充：`t.end_fill()`**
    当小海龟把需要填充的图形画完之后，我们就要告诉它：“图形画完了，现在可以把刚才记录下来的区域填充上我们选择的颜色啦！”
    这个咒语是 `t.end_fill()`。
    `t.begin_fill()` 和 `t.end_fill()` 就像一对括号，把需要填充的图形代码“包”起来。只有当它们成对出现时，填充功能才能生效。

**工作原理：**
`t.begin_fill()` 就像是打开了一个“录像机”，记录下小海龟接下来的所有移动轨迹，直到 `t.end_fill()` 出现。当 `t.end_fill()` 出现时，小海龟就会把“录像机”里记录的轨迹围成的区域，用你之前设置好的 `fillcolor` 填充起来。

**示例步骤：**
1.  导入 `turtle` 模块并创建小海龟。
2.  设置你想要的填充颜色（`t.fillcolor()`）。
3.  调用 `t.begin_fill()` 开始记录。
4.  画出你想要填充的图形（比如用 `t.forward()` 和 `t.left()` 画正方形）。
5.  调用 `t.end_fill()` 结束记录并填充颜色。
6.  `s.mainloop()` 让画板保持显示。

===NEXT===

## 代码示例

让我们来画一个红色的正方形，边框是黑色。

```python
import turtle # 导入海龟画图模块

t = turtle.Turtle() # 创建一只小海龟
s = turtle.Screen() # 创建一个画板

t.pencolor("black") # 设置画笔颜色为黑色（正方形边框颜色）
t.fillcolor("red") # 设置填充颜色为红色

t.begin_fill() # 开始记录，准备填充

# 画一个正方形
for i in range(4):
    t.forward(100) # 向前走100步
    t.left(90) # 向左转90度

t.end_fill() # 结束记录，并用红色填充正方形

s.mainloop() # 保持画板显示，直到手动关闭
```

**再来一个示例：画一个绿色的三角形，边框是蓝色。**

```python
import turtle # 导入海龟画图模块

t = turtle.Turtle() # 创建一只小海龟
s = turtle.Screen() # 创建一个画板

t.pencolor("blue") # 设置画笔颜色为蓝色
t.fillcolor("green") # 设置填充颜色为绿色

t.begin_fill() # 开始记录，准备填充

# 画一个等边三角形
for i in range(3):
    t.forward(120) # 向前走120步
    t.left(120) # 向左转120度

t.end_fill() # 结束记录，并用绿色填充三角形

s.mainloop() # 保持画板显示
```

===NEXT===

## 课堂互动

**提问环节：**

1.  如果我想画一个黄色的圆形，并且它的边框是紫色的，我应该怎么设置颜色呢？请说出对应的代码。
    *   `t.pencolor("purple")`
    *   `t.fillcolor("yellow")`
    *   或者 `t.color("purple", "yellow")`

2.  如果我忘记写 `t.end_fill()`，小海龟会给图形填充颜色吗？为什么？
    *   不会。因为 `t.begin_fill()` 只是开始记录，`t.end_fill()` 才是真正执行填充命令。没有 `t.end_fill()`，小海龟就不知道什么时候该停止记录并进行填充。

3.  `t.begin_fill()` 和 `t.end_fill()` 应该放在画图代码的哪个位置？
    *   `t.begin_fill()` 应该放在画图代码之前，`t.end_fill()` 应该放在画图代码之后，它们把要填充的图形代码“包”起来。

**小组任务：**

1.  **挑战一：彩虹小圆圈**
    请同学们以小组为单位，用我们今天学到的知识，画一个被红色填充的圆形。圆形半径可以自定义，比如50。
    （提示：`t.circle(半径)` 可以画圆哦！）

2.  **挑战二：小房子**
    请尝试画一个简单的小房子，房顶是红色的三角形，房身是黄色的正方形。可以先画房身，再画房顶，注意调整小海龟的位置。

===NEXT===

## 练习题目

**一、选择题**

1.  为了让海龟画图填充颜色，我们应该使用哪两个函数来“包围”画图的代码？
    A. `t.start_fill()` 和 `t.stop_fill()`
    B. `t.begin_fill()` 和 `t.end_fill()`
    C. `t.fill_on()` 和 `t.fill_off()`
    D. `t.paint_start()` 和 `t.paint_end()`

2.  如果我想让图形的填充颜色是蓝色，我应该使用哪个函数？
    A. `t.pencolor("blue")`
    B. `t.color("blue")`
    C. `t.fillcolor("blue")`
    D. `t.setcolor("blue")`

3.  下面哪段代码可以画一个填充为绿色的正方形，并且边框是黑色的？
    A.
    ```python
    t.fillcolor("green")
    t.begin_fill()
    for i in range(4):
        t.forward(50)
        t.left(90)
    t.end_fill()
    t.pencolor("black")
    ```
    B.
    ```python
    t.pencolor("black")
    t.fillcolor("green")
    t.begin_fill()
    for i in range(4):
        t.forward(50)
        t.left(90)
    t.end_fill()
    ```
    C.
    ```python
    t.pencolor("black")
    t.fillcolor("green")
    for i in range(4):
        t.forward(50)
        t.left(90)
    t.begin_fill()
    t.end_fill()
    ```
    D.
    ```python
    t.color("green", "black")
    t.begin_fill()
    for i in range(4):
        t.forward(50)
        t.left(90)
    t.end_fill()
    ```

**二、填空题**

4.  要导入海龟画图模块，需要写 `______ turtle`。

5.  如果我想同时设置画笔颜色为红色，填充颜色为黄色，可以使用 `t.______("red", "yellow")`。

**三、编程题 (基础)**

6.  请编写代码，使用海龟画图绘制一个填充为橙色的五角星。五角星的边框颜色可以是任意你喜欢的颜色。

**四、编程题 (进阶)**

7.  请编写代码，绘制一个圆形太阳，填充为黄色。太阳的周围有8条射线（可以用直线表示），射线可以是橙色。

---

**练习题目答案与解析**

**一、选择题**

1.  **B.** `t.begin_fill()` 和 `t.end_fill()`。这两个函数是海龟画图库中用于控制图形填充的特定函数。
2.  **C.** `t.fillcolor("blue")`。`t.fillcolor()` 专门用于设置图形的填充颜色。`t.pencolor()` 是设置画笔颜色（边框），`t.color()` 可以同时设置画笔和填充颜色，但选项中只有 `fillcolor` 是直接设置填充颜色的。
3.  **B.**
    *   选项A中，`t.pencolor("black")` 在 `t.end_fill()` 之后设置，此时图形已经画完并填充，边框颜色不会生效。
    *   选项B正确，先设置好边框和填充颜色，然后用 `begin_fill()` 和 `end_fill()` 包裹画图代码。
    *   选项C中，`begin_fill()` 和 `end_fill()` 包裹的是空代码，没有图形被画在其中。
    *   选项D中，`t.color("green", "black")` 会将画笔颜色设置为绿色，填充颜色设置为黑色，与题目要求不符。

**二、填空题**

4.  `import`
5.  `color`

**三、编程题 (基础)**

6.  **参考代码：**
    ```python
    import turtle

    t = turtle.Turtle()
    s = turtle.Screen()

    t.pencolor("blue") # 边框颜色，可以自定义
    t.fillcolor("orange") # 填充颜色为橙色

    t.begin_fill() # 开始填充

    # 画一个五角星
    for i in range(5):
        t.forward(100)
        t.right(144) # 画五角星的转角

    t.end_fill() # 结束填充

    s.mainloop()
    ```

**四、编程题 (进阶)**

7.  **参考代码：**
    ```python
    import turtle

    t = turtle.Turtle()
    s = turtle.Screen()
    t.speed(0) # 设置速度为最快

    # 画太阳（圆形）
    t.pencolor("orange") # 太阳边框颜色
    t.fillcolor("yellow") # 太阳填充颜色

    t.begin_fill()
    t.circle(50) # 画一个半径为50的圆形
    t.end_fill()

    # 画射线
    t.penup() # 抬起画笔
    t.goto(0, 50) # 移动到圆形顶部中心（半径为50，所以y坐标是50）
    t.pendown() # 放下画笔

    t.pencolor("orange") # 射线颜色为橙色
    t.pensize(3) # 射线粗细

    for i in range(8):
        t.forward(70) # 射线长度
        t.backward(70) # 返回到圆心
        t.left(45) # 每次旋转45度 (360 / 8 = 45)

    s.mainloop()
    ```

===NEXT===

## 教学评价与作业

**课堂评价：**

1.  **观察法：** 在小组任务和编程练习环节，观察学生是否能正确使用 `t.fillcolor()`、`t.begin_fill()` 和 `t.end_fill()`。
2.  **提问法：** 针对课堂互动中的问题，随机提问学生，检查他们对知识点的理解程度。
3.  **作品展示：** 鼓励学生展示他们完成的编程题目，相互学习和评价。对于遇到困难的学生，及时进行指导和帮助。

**课后作业：**

1.  **必做题：**
    *   复习今天学习的 `t.fillcolor()`、`t.begin_fill()` 和 `t.end_fill()` 函数。
    *   请用海龟画图，绘制一个填充为自己喜欢的颜色的圆形，并且边框颜色和填充颜色不同。
    *   **挑战：** 尝试绘制一个简单的笑脸，包含一个黄色的圆脸，两个黑色的圆眼睛，和一个红色的笑嘴巴（可以是一个填充的半圆或一个填充的三角形）。

2.  **选做题（创意挑战）：**
    *   发挥你的想象力，用今天学到的填充功能，设计并绘制一幅包含多种填充图形的场景画，比如一个有彩色屋顶的房子、一片开满小花的草地，或者一个有不同颜色水果的果园。尝试使用至少三种不同的填充颜色。

希望同学们通过今天的学习，能够让小海龟的画笔变得更加多姿多彩！期待看到你们充满创意的作品！