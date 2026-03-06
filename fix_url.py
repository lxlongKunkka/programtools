p = r'e:\app\programtools\src\pages\LearningMap.vue'
content = open(p, encoding='utf-8').read()

broken = '\\/\\/p/\\ }'
correct = '`/${domainId}/p/${docId}` }'

count = content.count(broken)
fixed = content.replace(broken, correct)
open(p, 'w', encoding='utf-8').write(fixed)
print(f'Fixed {count} occurrences')
