# Lightbot Imported Levels Solutions

批量验证脚本：`node scripts/verify-lightbot-levels.mjs`

当前结果：50 关中 50 关可在现有限制内通关。

## 基本

- `base-1`: `walk right walk light`
- `base-2`: `walk walk light left left walk left walk walk light`
- `base-3`: `walk walk right jump light`
- `base-4`: `walk walk light walk walk light`
- `base-5`: `walk walk left jump right walk left jump light`
- `base-6`: `jump light left jump light`
- `base-7`: `walk walk walk left jump light`
- `base-8`: `walk walk walk light left jump left walk right jump light`
- `base-9`: `walk light left left walk walk light left left walk left walk light left left walk walk light`

## 程序

- `prog-1`: MAIN `walk walk light walk walk light`
- `prog-2`: MAIN `walk walk light right walk light`
- `prog-3`: MAIN `walk walk light walk walk light walk walk light`
- `prog-4`: MAIN `walk walk light right walk walk light right walk walk light`
- `prog-5`: MAIN `p1 walk right walk light p1 right p1 walk right walk light`; P1 `walk walk light`
- `prog-6`: MAIN `p1 left left walk walk p1 left left walk walk left p1 left left walk walk p1`; P1 `walk walk light`
- `prog-7`: MAIN `right p1 p1 left p1 p1 left p1 p1 left p1 left p1`; P1 `walk walk light`
- `prog-8`: MAIN `walk p1 p1 left left walk jump left jump light left left jump jump light`; P1 `jump walk light`
- `prog-9`: MAIN `walk p1 p1 light walk walk light left left walk right walk light left p1 light`; P1 `walk jump`

## 过载

- `overload-1`: MAIN `walk jump light walk jump light`
- `overload-2`: MAIN `walk jump walk light left jump left walk light jump right jump light`
- `overload-3`: MAIN `p1 jump jump p1 jump jump left p1 jump jump jump jump light`; P1 `jump jump light left left`
- `overload-4`: MAIN `p1 walk p1 walk left walk p1 walk walk jump light`; P1 `jump light left left jump`
- `overload-5`: MAIN `walk jump left walk right jump left walk light right walk left walk right jump light`
- `overload-6`: MAIN `walk left jump light left jump jump light left jump jump light left jump jump light`
- `overload-7`: MAIN `p1 walk jump p1 walk jump left p1 walk jump jump walk light`; P1 `jump walk light left left`
- `overload-8`: MAIN `jump jump light jump jump light jump jump light`
- `overload-9`: MAIN `walk p1 left jump left walk light jump right walk light right p1 p1`; P1 `jump walk light`

## 回圈

- `circle-1`: MAIN `walk light walk walk light walk walk light`
- `circle-2`: MAIN `walk left jump light right jump jump light right jump jump light right jump jump light`
- `circle-3`: MAIN `walk right walk light right jump walk light`
- `circle-4`: MAIN `walk light walk walk light right walk walk light walk light right walk walk light walk right walk light`
- `circle-5`: MAIN `walk walk walk light left left walk left jump light right jump right walk walk light`
- `circle-6`: MAIN `walk light right walk walk light right walk light right walk right walk walk light`
- `circle-7`: MAIN `walk walk light right walk walk light right walk walk light right walk right jump light`
- `circle-8`: MAIN `walk walk light walk walk light walk walk light walk walk light`
- `circle-9`: MAIN `walk jump light walk jump light left left jump right jump light left jump right walk left jump light`

## 条件式

- `if-1`: MAIN `walk light walk walk light right walk right walk light walk walk light`
- `base-2`: `walk right walk light`
- `base-3`: `walk left jump light`
- `base-4`: `walk walk walk left walk light`
- `base-5`: `walk left jump jump light`
- `base-6`: `jump walk left walk light left jump light right jump light`
- `base-7`: `walk walk walk jump light left walk light walk light`
- `base-8`: `walk walk left jump light jump light`
- `base-9`: `walk light walk light left walk light left walk light`

- `clg-1`: MAIN `walk right p1 left walk right jump p1 jump light right walk jump light left left jump left jump jump light`; P1 `walk light left`
- `clg-2`: MAIN `walk walk light walk walk light jump left walk light left left walk left walk light jump walk light`
- `clg-3`: MAIN `walk jump light jump left walk light left left walk left jump light jump walk light`
- `clg-4`: MAIN `walk light walk left p1 p1 right walk light walk p1 left walk light`; P1 `walk light left left walk`
- `clg-5`: MAIN `walk jump walk light left jump jump light left left jump left jump light`
- `clg-6`: MAIN `walk jump jump light jump jump light left left jump jump right jump light walk light`
- `clg-7`: MAIN `walk jump light walk jump light left walk walk left jump light left jump light left walk jump light`