p = r'e:\app\programtools\src\pages\LearningMap.vue'
lines = open(p, encoding='utf-8').readlines()
import re

suspicious = []
for i, l in enumerate(lines, 1):
    s = l.rstrip()
    if 'this..' in s:
        suspicious.append((i, 'this..', s))
    elif re.search(r'path:\s*/[a-z]', s) and "'" not in s and '"' not in s and '`' not in s:
        suspicious.append((i, 'regex-path', s))

for i, tag, s in suspicious:
    print(f'LINE {i} [{tag}]: {s[:120]}')

print(f'\nTotal suspicious: {len(suspicious)}')

