path = r'e:\webapp\programtools\src\pages\ChapterDetail.vue'
content = open(path, encoding='utf-8').read()

old = '      return `https://acjudge.com/d/${domain}/${type}/${cid}`\n    },'
new = '      const pathSegment = type === \'exam\' ? \'contest\' : type\n      return `https://acjudge.com/d/${domain}/${pathSegment}/${cid}`\n    },'

if old in content:
    result = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8', newline='').write(result)
    print("Done! Replaced successfully.")
else:
    print("ERROR: old string not found!")
