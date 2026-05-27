const fs = require("fs")
const path = require("path")
const https = require("https")
const crypto = require("crypto")

// ═══════════════════════════════
//  填写你的信息
// ═══════════════════════════════
const CLOUD_NAME = "demfj39xl"
const API_KEY = "YOUR_API_KEY"
const API_SECRET = "YOUR_API_SECRET"

// 本地 public 文件夹的绝对路径，例如：
// "/Users/nimo/Documents/GitHub/hanrui/public"
const LOCAL_PUBLIC_DIR = "/Users/nimo/Documents/GitHub/hanrui/public"

// Cloudinary 里的目标文件夹
const CLOUDINARY_FOLDER = "hanrui/public"
// ═══════════════════════════════

function sign(params, secret) {
  const str = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`).join("&") + secret
  return crypto.createHash("sha1").update(str).digest("hex")
}

function uploadFile(localPath, publicId) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(localPath)
    const base64 = fileData.toString("base64")
    const ext = path.extname(localPath).slice(1).toLowerCase()
    const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }
    const mime = mimeMap[ext] || "image/jpeg"
    const dataUri = `data:${mime};base64,${base64}`

    const ts = Math.floor(Date.now() / 1000)
    const sigParams = {
      public_id: publicId,
      timestamp: ts,
      use_filename: "true",
      unique_filename: "false",
    }
    const signature = sign(sigParams, API_SECRET)

    const body = new URLSearchParams({
      file: dataUri,
      api_key: API_KEY,
      timestamp: ts,
      public_id: publicId,
      use_filename: "true",
      unique_filename: "false",
      signature,
    }).toString()

    const options = {
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    }

    const req = https.request(options, res => {
      let b = ""
      res.on("data", d => b += d)
      res.on("end", () => {
        const json = JSON.parse(b)
        if (json.error) reject(new Error(json.error.message))
        else resolve(json.public_id)
      })
    })
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

function walk(dir) {
  const results = []
  const files = fs.readdirSync(dir)
  for (const f of files) {
    const full = path.join(dir, f)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) results.push(...walk(full))
    else if (f.match(/\.(jpg|jpeg|png|webp)$/i)) results.push(full)
  }
  return results
}

async function main() {
  const files = walk(LOCAL_PUBLIC_DIR)
  console.log(`找到 ${files.length} 张图片，开始上传...`)

  let done = 0
  let failed = []

  // 每次并发 3 个，避免超限
  for (let i = 0; i < files.length; i += 3) {
    const batch = files.slice(i, i + 3)
    await Promise.all(batch.map(async localPath => {
      const rel = path.relative(LOCAL_PUBLIC_DIR, localPath)
      const publicId = CLOUDINARY_FOLDER + "/" + rel.replace(/\\/g, "/").replace(/\.[^.]+$/, "")
      try {
        await uploadFile(localPath, publicId)
        done++
        process.stdout.write(`\r进度: ${done}/${files.length} (${Math.round(done/files.length*100)}%)`)
      } catch (e) {
        failed.push({ file: localPath, error: e.message })
      }
    }))
  }

  console.log(`\n✅ 上传完成！成功 ${done} 张`)
  if (failed.length > 0) {
    console.log(`❌ 失败 ${failed.length} 张:`)
    failed.forEach(f => console.log(`  ${f.file}: ${f.error}`))
    fs.writeFileSync("upload-failed.json", JSON.stringify(failed, null, 2))
  }
}

main().catch(console.error)
