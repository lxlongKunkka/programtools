import requests
import json
import re

s = requests.Session()
s.verify = False

# Step 1: Login
r = s.post('https://nflsoi.cc:10999/api/auth/login', json={'username':'wfbczx','password':'123456'})
print("Login:", r.status_code)
token = r.json().get('token', '')
print("Token:", token[:30] + '...')

# Step 2: Try common API paths
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Try GET for some common paths
for path in ['/api/contest/list', '/api/contests', '/api/problem/list', '/api/problems', '/api/user/getUserDetail']:
    r2 = s.get(f'https://nflsoi.cc:10999{path}', headers=headers)
    print(f"GET {path}: {r2.status_code} {r2.text[:100] if r2.status_code != 404 else '404'}")

# Try POST for contest-related
for path in ['/api/contest/getContestList', '/api/contest/searchContests']:
    r2 = s.post(f'https://nflsoi.cc:10999{path}', json={}, headers=headers)
    print(f"POST {path}: {r2.status_code} {r2.text[:200] if r2.status_code != 404 else '404'}")

# Step 3: Download JS bundle and find actual API calls
r = s.get('https://nflsoi.cc:10999/assets/index.d2fe859c.js')
js = r.text

# Find all api paths used in fetch/axios calls
patterns = [
    r'`\$\{.*?\}(api/[^`]+)`',
    r'"(/api/[a-zA-Z][^"]*)"',
    r"'(/api/[a-zA-Z][^']*)'",
    r'api/(contest|problem|submission|user|auth)/[a-zA-Z]+',
]

for p in patterns:
    matches = set(re.findall(p, js))
    if matches:
        print(f"\nPattern {p}:")
        for m in sorted(matches)[:20]:
            print(f"  {m}")
