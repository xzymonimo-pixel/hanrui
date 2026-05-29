// upload-map.mjs
// 放到 hanrui/ 根目录运行：node upload-map.mjs

import { v2 as cloudinary } from 'cloudinary'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

cloudinary.config({
  cloud_name: 'demfj39xl',
  api_key: '614619994392318',
  api_secret: 'gNr5SzuAfpSGHWmYKxHYcZPUOiU'
})

// 把 map.PNG 放到 hanrui/ 根目录
const filePath = path.join(__dirname, 'map.PNG')

console.log('上传中...')
try {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: 'hanrui/public/image/travel-map',
    overwrite: true,
  })
  console.log('✅ 上传成功')
  console.log('URL:', result.secure_url)
} catch(e) {
  console.error('❌ 失败:', e.message)
}
