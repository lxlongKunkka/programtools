#!/usr/bin/env python3
"""
nflsoj_enum_users.py
批量枚举 nflsoi.cc:20035 (SYZOJ) 的所有用户，输出 id→username 映射。

用法:
    python nflsoj_enum_users.py \
        --user <账号> --pwd <密码> \
        --start 1 --end 10000 \
        --out nflsoj_users.json

账号/密码也可通过环境变量 NFLSOJ_USER / NFLSOJ_PWD 传入。
"""

import argparse
import hashlib
import json
import os
import sys
import time

import requests
from bs4 import BeautifulSoup

BASE = 'http://nflsoi.cc:20035'
SYZOJ_SALT = 'syzoj2_xxx'
CONCURRENCY_DELAY = 0.15   # 每请求间隔(秒)，避免对服务器造成压力
REQUEST_TIMEOUT = 10


def login(session: requests.Session, username: str, password: str) -> None:
    hashed = hashlib.md5((password + SYZOJ_SALT).encode()).hexdigest()
    r = session.post(
        f'{BASE}/api/login',
        data={'username': username, 'password': hashed},
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0',
            'Referer': BASE,
        },
        timeout=REQUEST_TIMEOUT,
        allow_redirects=False,
    )
    body = r.json() if r.content else {}
    if body.get('error_code', 1) != 1:
        sys.exit(f'登录失败: error_code={body.get("error_code")}')
    print(f'[login] 登录成功，cookies: {dict(session.cookies)}')


def fetch_username(session: requests.Session, uid: int) -> str | None:
    """
    返回用户名字符串，或 None（用户不存在/无权访问）。
    SYZOJ 用户页 <title> 格式: "{username} - NFLSOJ"
    也可从 .user-info h1 或 h2 提取。
    """
    url = f'{BASE}/user/{uid}'
    try:
        r = session.get(
            url,
            headers={'User-Agent': 'Mozilla/5.0', 'Referer': BASE},
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
        )
    except requests.RequestException as e:
        print(f'  [!] uid={uid} 请求异常: {e}')
        return None

    if r.status_code == 404:
        return None

    # 需要登录时会重定向到 /login?url=...
    if '/login' in r.url:
        print(f'  [!] uid={uid} session 已失效，需要重新登录')
        return None

    soup = BeautifulSoup(r.text, 'html.parser')

    # 优先从 <title> 取：格式 "用户名 - NFLSOJ"
    title = soup.find('title')
    if title:
        parts = title.get_text().split(' - ')
        candidate = parts[0].strip()
        # SYZOJ 错误页 title 为 "错误 - ..." 或 "Error - ..."，跳过
        if len(parts) >= 2 and candidate and candidate not in ('错误', 'Error', '错误信息'):
            return candidate

    # 备选：.user-container h1 或 .username
    for sel in ['.user-info h1', '.username', 'h1']:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            return el.get_text(strip=True)

    return None


def main():
    parser = argparse.ArgumentParser(description='枚举 NFLSOJ 用户名')
    parser.add_argument('--user', default=os.environ.get('NFLSOJ_USER', ''))
    parser.add_argument('--pwd', default=os.environ.get('NFLSOJ_PWD', ''))
    parser.add_argument('--start', type=int, default=1)
    parser.add_argument('--end', type=int, default=10000)
    parser.add_argument('--out', default='nflsoj_users.json')
    parser.add_argument('--resume', action='store_true',
                        help='从 --out 文件已有进度继续（跳过已抓的 id）')
    args = parser.parse_args()

    if not args.user or not args.pwd:
        sys.exit('请通过 --user/--pwd 或环境变量 NFLSOJ_USER/NFLSOJ_PWD 提供账号密码')

    # 加载已有进度
    result: dict[int, str] = {}
    if args.resume and os.path.exists(args.out):
        with open(args.out, encoding='utf-8') as f:
            raw = json.load(f)
        result = {int(k): v for k, v in raw.items()}
        print(f'[resume] 已加载 {len(result)} 条记录')

    session = requests.Session()
    login(session, args.user, args.pwd)

    total = args.end - args.start + 1
    found = 0

    for uid in range(args.start, args.end + 1):
        if uid in result:
            continue

        username = fetch_username(session, uid)
        done = uid - args.start + 1

        if username:
            result[uid] = username
            found += 1
            print(f'  [{done}/{total}] uid={uid} → {username}')
        else:
            print(f'  [{done}/{total}] uid={uid} → (不存在)')

        # 每 100 条自动保存一次进度
        if done % 100 == 0:
            with open(args.out, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f'  [save] 已保存 {len(result)} 条')

        time.sleep(CONCURRENCY_DELAY)

    # 最终保存
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f'\n完成！共找到 {found} 个用户，已保存到 {args.out}')


if __name__ == '__main__':
    main()
