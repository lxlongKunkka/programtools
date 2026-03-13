import urllib.request, urllib.parse, http.cookiejar, re, json

# Test the local API
BASE_API = 'http://localhost:5678'
url = 'http://nflsoi.cc:10611/contest/69ad79c783d6583e0f6d26cd/problems'

# Read JWT from env
import os, sys

# Try to get a token or just check the raw HTML parsing
BASE = 'http://nflsoi.cc:10611'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
data = urllib.parse.urlencode({'uname': 'wfbczx', 'password': '123456'}).encode()
opener.open(f'{BASE}/login', data)

r = opener.open(f'{BASE}/contest/69ad79c783d6583e0f6d26cd/problems')
html = r.read().decode()

# Simulate cheerio-style parsing: find all a[href] matching /p/{pid}?tid={contestId}
from html.parser import HTMLParser

class TagParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.current_td_html = ''
        self.depth = 0
        self.td_depth = 0
        self.results = []

    def handle_starttag(self, tag, attrs):
        self.depth += 1
        if tag == 'td':
            self.in_td = True
            self.td_depth = self.depth
            self.current_td_html = ''
        if self.in_td:
            attrs_str = ' '.join(f'{k}="{v}"' for k,v in attrs)
            self.current_td_html += f'<{tag} {attrs_str}>'

    def handle_endtag(self, tag):
        if self.in_td:
            self.current_td_html += f'</{tag}>'
        if tag == 'td' and self.depth == self.td_depth:
            self.in_td = False
            # Check if this td has problem links
            links = re.findall(r'href="/p/([a-zA-Z0-9_]+)\?tid=([a-zA-Z0-9]+)"', self.current_td_html)
            if links:
                tags = re.findall(r'class="problem__tag-link"[^>]*>([^<]+)', self.current_td_html)
                print(f'Problem {links[0][0]}: tags = {tags}')
                # Also print raw td snippet
                print('  TD snippet:', self.current_td_html[:400])
        self.depth -= 1

    def handle_data(self, data):
        if self.in_td:
            self.current_td_html += data

p = TagParser()
p.feed(html)
