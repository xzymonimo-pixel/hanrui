const https = require("https")
const crypto = require("crypto")

const CLOUD_NAME = "demfj39xl"
const API_KEY = "YOUR_API_KEY"
const API_SECRET = "YOUR_API_SECRET"

function sign(params, secret) {
  const str = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`).join("&") + secret
  return crypto.createHash("sha1").update(str).digest("hex")
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(body).toString()
    const options = {
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLOUD_NAME}${path}`,
      method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(data),
      },
    }
    const req = https.request(options, res => {
      let body = ""
      res.on("data", d => body += d)
      res.on("end", () => resolve(JSON.parse(body)))
    })
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

async function deleteFolder(folder) {
  let deleted = 0
  let nextCursor = null

  console.log(`开始删除 ${folder} 下的所有图片...`)

  do {
    const ts = Math.floor(Date.now() / 1000)
    const params = {
      api_key: API_KEY,
      timestamp: ts,
      type: "upload",
      prefix: folder,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    }
    params.signature = sign({ timestamp: ts, type: "upload", prefix: folder, ...(nextCursor ? { next_cursor: nextCursor } : {}) }, API_SECRET)

    const res = await request("GET", `/resources/image?${new URLSearchParams(params)}`, "")
      .catch(() => request("GET", `/resources/image`, params))

    // 用 GET 列出资源
    const listParams = new URLSearchParams({
      api_key: API_KEY,
      timestamp: ts,
      type: "upload",
      prefix: folder,
      max_results: 100,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    })

    const listRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.cloudinary.com",
        path: `/v1_1/${CLOUD_NAME}/resources/image?${listParams}`,
        method: "GET",
        headers: {
          Authorization: "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64"),
        },
      }
      const req = https.request(options, res => {
        let body = ""
        res.on("data", d => body += d)
        res.on("end", () => resolve(JSON.parse(body)))
      })
      req.on("error", reject)
      req.end()
    })

    if (!listRes.resources || listRes.resources.length === 0) break

    const publicIds = listRes.resources.map(r => r.public_id)
    console.log(`找到 ${publicIds.length} 个文件，正在删除...`)

    const ts2 = Math.floor(Date.now() / 1000)
    const delParams = {
      public_ids: publicIds,
      timestamp: ts2,
      api_key: API_KEY,
    }
    delParams.signature = sign({ public_ids: publicIds, timestamp: ts2 }, API_SECRET)

    const delRes = await new Promise((resolve, reject) => {
      const body = publicIds.map((id, i) => `public_ids[${i}]=${encodeURIComponent(id)}`).join("&")
        + `&timestamp=${ts2}&api_key=${API_KEY}&signature=${delParams.signature}`
      const options = {
        hostname: "api.cloudinary.com",
        path: `/v1_1/${CLOUD_NAME}/resources/image/upload`,
        method: "DELETE",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          Authorization: "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64"),
        },
      }
      const req = https.request(options, res => {
        let b = ""
        res.on("data", d => b += d)
        res.on("end", () => resolve(JSON.parse(b)))
      })
      req.on("error", reject)
      req.write(body)
      req.end()
    })

    deleted += publicIds.length
    console.log(`已删除 ${deleted} 个文件`)
    nextCursor = listRes.next_cursor
  } while (nextCursor)

  console.log(`✅ 删除完成，共删除 ${deleted} 个文件`)
}

deleteFolder("hanrui").catch(console.error)
