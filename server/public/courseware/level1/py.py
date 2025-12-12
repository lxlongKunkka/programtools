import os

def rename_chapter_to_topic():
    """将当前目录下前缀为chapter1的文件名替换为topic2（仅当前目录）"""
    # 旧前缀和新前缀（可直接修改这里调整）
    old_prefix = "chapter1"
    new_prefix = "topic2"
    
    # 统计结果
    renamed = 0
    skipped = 0

    # 遍历当前目录下的所有文件（仅当前目录，不包含子目录）
    for filename in os.listdir("."):
        # 只处理文件，跳过目录
        file_path = os.path.join(".", filename)
        if os.path.isdir(file_path):
            continue
        
        # 检查是否以旧前缀开头
        if filename.startswith(old_prefix):
            # 替换前缀（仅替换第一个匹配项）
            new_filename = filename.replace(old_prefix, new_prefix, 1)
            new_file_path = os.path.join(".", new_filename)
            
            # 避免覆盖已存在的文件
            if os.path.exists(new_file_path):
                print(f"❌ 跳过：{filename} → {new_filename}（新文件已存在）")
                skipped += 1
                continue
            
            # 执行重命名
            try:
                os.rename(file_path, new_file_path)
                print(f"✅ 成功：{filename} → {new_filename}")
                renamed += 1
            except Exception as e:
                print(f"❌ 失败：{filename} - {str(e)}")
                skipped += 1

    # 输出最终统计
    print("\n===== 重命名完成 =====")
    print(f"✅ 成功重命名：{renamed} 个文件")
    print(f"❌ 跳过/失败：{skipped} 个文件")

if __name__ == "__main__":
    rename_chapter_to_topic()
