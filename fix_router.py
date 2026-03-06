p = r'e:\app\programtools\src\pages\LearningMap.vue'
content = open(p, encoding='utf-8').read()

fixes = [
    # this.\( = this.$nextTick(  (backslash was inserted by broken fix)
    ('this.\\(', 'this.$nextTick('),
]

for old, new in fixes:
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        print(f'Fixed {count}x: {repr(old[:60])}')
    else:
        print(f'Not found: {repr(old[:60])}')

open(p, 'w', encoding='utf-8').write(content)
print('Done')


