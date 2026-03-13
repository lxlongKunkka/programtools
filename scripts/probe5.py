import urllib.request, urllib.parse, http.cookiejar, re

BASE = 'http://nflsoi.cc:10611'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
data = urllib.parse.urlencode({'uname': 'wfbczx', 'password': '123456'}).encode()
opener.open(f'{BASE}/login', data)

# 1. Problem detail page - look for category tags
r2 = opener.open(f'{BASE}/p/35353?tid=69ad79c783d6583e0f6d26cd')
html2 = r2.read().decode()
# Find problem__tags section
idx = html2.find('problem__tags')
if idx > 0:
    print('problem__tags in detail:', html2[idx-50:idx+300])
else:
    print('No problem__tags in detail page')
# Try alternative tag patterns
for pat in ['tag-link', 'category', 'difficulty']:
    m = re.search(r'class="[^"]*' + pat + r'[^"]*"[^>]*>(.*?)</', html2, re.DOTALL)
    if m: print(f'{pat}:', m.group(1)[:100])

# 2. Full problem bank row (with tags)
r3 = opener.open(f'{BASE}/p?page=1')
html3 = r3.read().decode()
rows3 = re.findall(r'<tr[^>]*>(.*?)</tr>', html3, re.DOTALL)
print('\n--- Full bank row 2 ---')
print(rows3[2][:800] if len(rows3) > 2 else 'N/A')



