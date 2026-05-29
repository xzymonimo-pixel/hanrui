#!/bin/bash

CLOUD_NAME="demfj39xl"
LOCAL_DIR="/Users/nimo/Documents/GitHub/hanrui/public"
DONE_FILE="upload-done.txt"

touch "$DONE_FILE"

total=$(find "$LOCAL_DIR" \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | wc -l | tr -d ' ')
count=0
failed=0

find "$LOCAL_DIR" \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.webp" \) | sort | while read filepath; do
  if grep -qF "$filepath" "$DONE_FILE" 2>/dev/null; then
    ((count++))
    continue
  fi

  rel="${filepath#$LOCAL_DIR/}"
  public_id="hanrui/public/${rel%.*}"

  result=$(curl -s -X POST \
    "https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload" \
    -F "file=@${filepath}" \
    -F "upload_preset=ml_default" \
    -F "public_id=${public_id}")

  if echo "$result" | grep -q '"public_id"'; then
    echo "$filepath" >> "$DONE_FILE"
    ((count++))
    echo "[$count/$total] ✅ $public_id"
  else
    ((failed++))
    msg=$(echo "$result" | grep -o '"message":"[^"]*"' | head -1)
    echo "[$count/$total] ❌ $rel - $msg"
  fi
done

echo ""
echo "完成！成功 $count 张，失败 $failed 张"
