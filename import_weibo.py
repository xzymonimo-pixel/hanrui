import os
import shutil

src_root = "/Users/nimo/weibo-crawler/weibo_data/TF家族-张函瑞"
dst_root = "/Users/nimo/Documents/GitHub/hanrui/public"

for month in os.listdir(src_root):
    month_path = os.path.join(src_root, month)

    if not os.path.isdir(month_path):
        continue

    dst_month = os.path.join(dst_root, month)
    os.makedirs(dst_month, exist_ok=True)

    for root, dirs, files in os.walk(month_path):
        for file in files:
            # 🚨 只要图片
            if not file.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue

            src_file = os.path.join(root, file)
            dst_file = os.path.join(dst_month, file)

            if os.path.exists(dst_file):
                base, ext = os.path.splitext(file)
                i = 1
                while os.path.exists(dst_file):
                    dst_file = os.path.join(dst_month, f"{base}_{i}{ext}")
                    i += 1

            shutil.copy2(src_file, dst_file)

    print(f"完成 {month}")