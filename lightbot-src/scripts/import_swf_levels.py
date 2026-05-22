import json
import os

src_root = 'public/recovered-swf'
dst_root = 'src/content/levels'

chapter_map = {
    'chapter-01': 'swf-ch1',
    'chapter-02': 'swf-ch2',
    'chapter-03': 'swf-ch3',
    'chapter-04': 'swf-ch4',
}
chapter_titles = {
    'chapter-01': '第一章 · 基础操作',
    'chapter-02': '第二章 · 进阶路径',
    'chapter-03': '第三章 · 函数入门',
    'chapter-04': '第四章 · 高级挑战',
}
chapter_order = {'chapter-01': 10, 'chapter-02': 11, 'chapter-03': 12, 'chapter-04': 13}

total = 0
for chapter_dir in sorted(chapter_map.keys()):
    dst_dir_name = chapter_map[chapter_dir]
    src_dir = os.path.join(src_root, chapter_dir)
    dst_dir = os.path.join(dst_root, dst_dir_name)
    os.makedirs(dst_dir, exist_ok=True)
    for fname in sorted(os.listdir(src_dir)):
        if not fname.endswith('.json'):
            continue
        with open(os.path.join(src_dir, fname), encoding='utf-8') as f:
            data = json.load(f)
        data['chapter'] = {
            'id': dst_dir_name,
            'title': chapter_titles[chapter_dir],
            'order': chapter_order[chapter_dir],
        }
        data.pop('hints', None)
        dst_path = os.path.join(dst_dir, fname)
        with open(dst_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        total += 1
        print('  ' + dst_dir_name + '/' + fname + '  id=' + data['id'])

print('共处理 ' + str(total) + ' 个关卡')
