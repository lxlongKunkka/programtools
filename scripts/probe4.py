import urllib.request, urllib.parse, http.cookiejar, re

BASE = 'http://nflsoi.cc:10611'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
data = urllib.parse.urlencode({'uname': 'wfbczx', 'password': '123456'}).encode()
opener.open(f'{BASE}/login', data)

# 1. Check record list for links
r = opener.open(f'{BASE}/record?pid=35355&status=1')
html = r.read().decode()
hrefs = re.findall(r'href="(/record/[a-f0-9]+)"', html)
print('record hrefs:', hrefs[:5])

# Look for any JS with record data
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for s in scripts:
    if len(s) > 50 and ('rdoc' in s or '"code"' in s or 'PageData' in s):
        print('JS snippet:', s[:400])
        break

# 2. Check record detail page (try to get first href)
if hrefs:
    r2 = opener.open(f'{BASE}{hrefs[0]}')
    html2 = r2.read().decode()
    # Look for code in pre or script
    pres = re.findall(r'<pre[^>]*>(.*?)</pre>', html2, re.DOTALL)
    for p in pres:
        if len(p) > 10:
            print('pre snippet:', p[:200])
            break
    # Look for script data with code
    scripts2 = re.findall(r'<script[^>]*>(.*?)</script>', html2, re.DOTALL)
    for s in scripts2:
        if '"code"' in s or 'rdoc' in s:
            print('record JS snippet:', s[:400])
            break
    # Check for code in any element with class code
    code_snippets = re.findall(r'class="[^"]*code[^"]*"[^>]*>(.*?)</', html2, re.DOTALL)
    if code_snippets:
        print('code class snippet:', code_snippets[0][:200])
        
# 3. Check problem list page structure
r3 = opener.open(f'{BASE}/p?page=1')
html3 = r3.read().decode()
pids = re.findall(r'href="/(p|problem)/([A-Za-z0-9]+)"', html3)
print('problem hrefs (first 10):', pids[:10])
# Get page count
pages = re.findall(r'href="[^"]*page=(\d+)"', html3)
print('page numbers found:', sorted(set(pages)))
