import os

root = r'e:\app\programtools\curriculum_export'
target_levels = ['Level1_GESP 一级', 'Level2_GESP 二级', 'Level3_GESP 三级', 'Level4_GESP 四级']

for level_name in target_levels:
    level_dir = [d for d in os.listdir(root) if d.startswith(level_name)][0]
    lp = os.path.join(root, level_dir)
    print(f'\n{"="*60}')
    print(f'{level_dir}')
    print(f'{"="*60}')
    for t in sorted(os.listdir(lp)):
        tp = os.path.join(lp, t)
        if not os.path.isdir(tp): continue
        print(f'\n  [{t}]')
        for c in sorted(os.listdir(tp)):
            if not c.endswith('.md'): continue
            content = open(os.path.join(tp, c), encoding='utf-8').read()
            has_content = '暂无教案' not in content and len(content) > 300
            has_req = '## 必做题' in content
            req_count = 0
            if has_req:
                lines = content.split('\n')
                in_req = False
                for line in lines:
                    if line.strip() == '## 必做题':
                        in_req = True
                        continue
                    if line.startswith('## ') and in_req:
                        break
                    if in_req and line.strip().startswith('- '):
                        req_count += 1
            status = 'OK' if (has_content and has_req) else ('EMPTY' if not has_content else 'NO_PROB')
            print(f'    [{status}] {c[:45]}  req={req_count}')

