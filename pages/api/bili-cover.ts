export const runtime = 'edge';
// pages/api/bili-cover.ts
// 把这个文件放到：hanrui/pages/api/bili-cover.ts
//
// 用法：GET /api/bili-cover?bvid=BV1hx4y117RY
// 返回：{ cover: "https://...", title: "...", date: "2024-03" }

import type { NextApiRequest, NextApiResponse } from "next"

// 简单内存缓存，避免重复请求同一BV号
const cache: Record<string, { cover: string; title: string; date: string; cachedAt: number }> = {}
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24小时

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { bvid } = req.query

  if (!bvid || typeof bvid !== "string" || !bvid.startsWith("BV")) {
    return res.status(400).json({ error: "请提供有效的 bvid，格式如 BV1hx4y117RY" })
  }

  // 命中缓存直接返回
  const cached = cache[bvid]
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT")
    return res.status(200).json({ cover: cached.cover, title: cached.title, date: cached.date })
  }

  try {
    // B站公开接口，无需登录即可获取视频基础信息
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
    const response = await fetch(apiUrl, {
      headers: {
        // 模拟浏览器请求头，避免被拒
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com/",
        "Origin": "https://www.bilibili.com",
      },
    })

    if (!response.ok) {
      return res.status(502).json({ error: `B站接口返回 ${response.status}` })
    }

    const data = await response.json()

    if (data.code !== 0) {
      return res.status(404).json({ error: `B站接口错误: ${data.message || "视频不存在"}` })
    }

    const video = data.data
    const cover: string = video.pic || ""
    const title: string = video.title || ""

    // 从发布时间戳转为 YYYY-MM
    const pubdate: number = video.pubdate || 0
    const d = new Date(pubdate * 1000)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

    // 写入缓存
    cache[bvid] = { cover, title, date, cachedAt: Date.now() }

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate")
    return res.status(200).json({ cover, title, date })

  } catch (err) {
    console.error("[bili-cover] fetch error:", err)
    return res.status(500).json({ error: "服务器内部错误，请稍后重试" })
  }
}

