#!/bin/bash

CLOUD_NAME="demfj39xl"
LOCAL_DIR="/Users/nimo/Documents/GitHub/hanrui/public"
DONE_FILE="upload-video-done.txt"

touch "$DONE_FILE"

total=$(find "$LOCAL_DIR/作品" "$LOCAL_DIR/bgm" \( -name "*.mp4" -o -name "*.mov" -o -name "*.mp3" -o -name "*.m4a" -o -name "*.flac" \) | wc -l | tr -d ' ')
count=0

find "$LOCAL_DIR/作品" "$LOCAL_DIR/bgm" \( -name "*.mp4" -o -name "*.mov" -o -name "*.mp3" -o -name "*.m4a" -o -name "*.flac" \) | sort | while read filepath; do
  if grep -qF "$filepath" "$DONE_FILE" 2>/dev/null; then
    ((count++))
    continue
  fi

  rel="${filepath#$LOCAL_DIR/}"
  public_id="hanrui/public/${rel%.*}"

  # 判断是视频还是音频
  if echo "$filepath" | grep -qiE "\.(mp4|mov)$"; then
    resource_type="video"
  else
    resource_type="video"  # Cloudinary 音频也用 video 类型
  fi

  result=$(curl -s -X POST \
    "https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resource_type}/upload" \
    -F "file=@${filepath}" \
    -F "upload_preset=ml_default" \
    -F "public_id=${public_id}")

  if echo "$result" | grep -q '"public_id"'; then
    echo "$filepath" >> "$DONE_FILE"
    ((count++))
    echo "[$count/$total] ✅ $public_id"
  else
    msg=$(echo "$result" | grep -o '"message":"[^"]*"' | head -1)
    echo "[$count/$total] ❌ $rel - $msg"
  fi
done

echo "完成！"
