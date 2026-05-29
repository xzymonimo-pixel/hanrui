// lib/useBiliCover.ts
// 把这个文件放到：hanrui/lib/useBiliCover.ts
//
// 这个 hook 接收一个 bvid，自动请求 /api/bili-cover 拿封面和标题
// 有本地 sessionStorage 缓存，刷新页面内不会重复请求同一BV号

import { useState, useEffect } from "react"

export interface BiliCoverResult {
  cover: string
  title: string
  date: string
  loading: boolean
  error: boolean
}

// 运行时内存缓存（单次页面会话内有效）
const runtimeCache: Record<string, BiliCoverResult> = {}

export function useBiliCover(bvid: string, prefillCover?: string, prefillTitle?: string): BiliCoverResult {
  const [result, setResult] = useState<BiliCoverResult>(() => {
    // 如果已经手动填了封面，直接用，不请求
    if (prefillCover) {
      return { cover: prefillCover, title: prefillTitle || "", date: "", loading: false, error: false }
    }
    // 命中内存缓存
    if (runtimeCache[bvid]) return runtimeCache[bvid]
    return { cover: "", title: prefillTitle || "", date: "", loading: true, error: false }
  })

  useEffect(() => {
    // 已有封面（手动填的）不请求
    if (prefillCover) return
    // 命中缓存不请求
    if (runtimeCache[bvid]) { setResult(runtimeCache[bvid]); return }
    // bvid 是占位符时跳过
    if (!bvid || !bvid.startsWith("BV") || bvid.length < 10) {
      setResult({ cover: "", title: prefillTitle || "", date: "", loading: false, error: true })
      return
    }

    let cancelled = false
    fetch(`/api/bili-cover?bvid=${bvid}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) {
          const r = { cover: "", title: prefillTitle || "", date: "", loading: false, error: true }
          runtimeCache[bvid] = r
          setResult(r)
        } else {
          const r: BiliCoverResult = {
            cover: data.cover,
            title: data.title || prefillTitle || "",
            date: data.date,
            loading: false,
            error: false,
          }
          runtimeCache[bvid] = r
          setResult(r)
        }
      })
      .catch(() => {
        if (cancelled) return
        const r = { cover: "", title: prefillTitle || "", date: "", loading: false, error: true }
        runtimeCache[bvid] = r
        setResult(r)
      })

    return () => { cancelled = true }
  }, [bvid, prefillCover])

  return result
}
