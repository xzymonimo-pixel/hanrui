export const runtime = 'edge';
// pages/api/bili-img.ts
// 放到：hanrui/pages/api/bili-img.ts
//
// 用法：<img src="/api/bili-img?url=http://i0.hdslb.com/bfs/archive/xxx.jpg" />
// 作用：服务端代理请求B站图片，绕过防盗链

import type { NextApiRequest, NextApiResponse } from "next"

// 内存缓存：url → Buffer，避免重复请求同一张图
const imgCache: Record<string, { buf: Buffer; contentType: string; cachedAt: number }> = {}
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7天

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (!url || typeof url !== "string") {
    return res.status(400).end("缺少 url 参数")
  }

  // 只允许代理B站图片域名，防止被滥用
  const allowed = [
    "i0.hdslb.com",
    "i1.hdslb.com",
    "i2.hdslb.com",
    "s1.hdslb.com",
  ]
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return res.status(400).end("无效的 url")
  }
  if (!allowed.includes(hostname)) {
    return res.status(403).end("不允许代理该域名")
  }

  // 命中缓存直接返回
  const cached = imgCache[url]
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    res.setHeader("Content-Type", cached.contentType)
    res.setHeader("Cache-Control", "public, max-age=604800, immutable")
    res.setHeader("X-Cache", "HIT")
    return res.end(cached.buf)
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com/",
        "Origin": "https://www.bilibili.com",
      },
    })

    if (!response.ok) {
      return res.status(502).end(`上游返回 ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    const arrayBuffer = await response.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)

    // 写入缓存
    imgCache[url] = { buf, contentType, cachedAt: Date.now() }

    res.setHeader("Content-Type", contentType)
    res.setHeader("Cache-Control", "public, max-age=604800, immutable")
    return res.end(buf)

  } catch (err) {
    console.error("[bili-img] error:", err)
    return res.status(500).end("代理请求失败")
  }
}

