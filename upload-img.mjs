// upload-img.mjs
// 用法：node upload-img.mjs 本地文件名 cloudinary路径
// 例如：node upload-img.mjs 2025-06-17_15-14-39_2.jpg hanrui/public/2025-06/2025-06-17_15-14-39_2

import { v2 as cloudinary } from 'cloudinary'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

cloudinary.config({
  cloud_name: 'demfj39xl',
  api_key: '614619994392318',
  api_secret: 'gNr5SzuAfpSGHWmYKxHYcZPUOiU'
})

const [,, localFile, publicId] = process.argv

if (!localFile || !publicId) {
  console.log('用法：node upload-img.mjs 本地文件名 cloudinary路径')
  console.log('例如：node upload-img.mjs 2025-06-17_15-14-39_2.jpg hanrui/public/2025-06/2025-06-17_15-14-39_2')
  process.exit(1)
}

const filePath = path.join(__dirname, localFile)
console.log(`上传 ${localFile} → ${publicId} ...`)

try {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    overwrite: true,
    resource_type: 'auto',
  })
  console.log('✅ 上传成功')
  console.log('URL:', result.secure_url)
} catch(e) {
  console.error('❌ 失败:', e.message)
}
