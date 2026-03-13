import urllib.request, urllib.parse, http.cookiejar, re, json

BASE = 'http://nflsoi.cc:10611'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
data = urllib.parse.urlencode({'uname': 'wfbczx', 'password': '123456'}).encode()
opener.open(f'{BASE}/login', data)

# Check contest problems page content
r = opener.open(f'{BASE}/contest/69ad79c783d6583e0f6d26cd/problems')
html = r.read().decode()
print('Page length:', len(html))

# Check if UiContext has problem data
m = re.search(r'window\.UiContext\s*=\s*({.*?})\s*</script>', html, re.DOTALL)
if m:
    try:
        ctx = json.loads(m.group(1))
        print('UiContext keys:', list(ctx.keys()))
        # Look for pids or tdoc
        if 'tdoc' in ctx: print('tdoc:', str(ctx['tdoc'])[:300])
        if 'pdict' in ctx: print('pdict keys:', list(ctx['pdict'].keys())[:10])
        if 'attended' in ctx: print('attended:', ctx['attended'])
    except: print('UiContext parse failed')

# All hrefs containing numbers (potential problem links)
all_hrefs = re.findall(r'href="([^"]+)"', html)
num_hrefs = [h for h in all_hrefs if re.search(r'/\d+', h)]
print('Numeric hrefs:', num_hrefs[:20])

# Check all table rows
table_rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
print(f'Table rows: {len(table_rows)}')
for row in table_rows[:3]:
    print('Row snippet:', row[:200])

