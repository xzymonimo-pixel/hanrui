import fs from "fs"
import path from "path"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"

const toImageKit = (p) => p ? `https://ik.imagekit.io/ruihouse/hanrui/public/${p.replace(/^\/?(public\/)?/, "")}` : ""

// ════════════════════════════════════════════
//  getStaticProps
// ════════════════════════════════════════════
export async function getStaticProps() {
  const publicDir = path.join(process.cwd(), "public")

  function getAllMedia(folderPath, month) {
    const results = []
    function walk(dir) {
      let files = []
      try { files = fs.readdirSync(dir) } catch { return }
      files.forEach(file => {
        const fullPath = path.join(dir, file)
        try {
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) { walk(fullPath) }
          else if (file.match(/\.(jpg|jpeg|png|webp|mov|mp4)$/i)) {
            const isVideo = file.match(/\.(mov|mp4)$/i)
            results.push({ url: `/${month}/${file}`, filename: file, isVideo: !!isVideo })
          }
        } catch {}
      })
    }
    walk(folderPath)
    return results
  }

  function getVideosInSubfolder(parentDir, parentSlug, subName) {
    const results = []
    const subPath = path.join(parentDir, subName)
    try {
      const files = fs.readdirSync(subPath)
      files.forEach(file => {
        if (file.match(/\.(mp4|mov|webm|mkv)$/i)) {
          results.push(`/${parentSlug}/${subName}/${file}`)
        }
      })
    } catch {}
    return results
  }

  const https_mod = require("https")
  function imagekitPage(skip) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({ skip: String(skip), limit: "1000", includeFolder: "false" })
      const options = {
        hostname: "api.imagekit.io",
        path: `/v1/files?${params}`,
        headers: { Authorization: "Basic " + Buffer.from((process.env.IMAGEKIT_PRIVATE_KEY || "") + ":").toString("base64") }
      }
      const req = https_mod.request(options, res => {
        let b = ""
        res.on("data", d => b += d)
        res.on("end", () => { try { resolve(JSON.parse(b) as any) } catch { resolve([]) } })
      })
      req.on("error", () => resolve([]))
      req.end()
    })
  }

  let allResources = []
  let skip = 0
  while (true) {
    const page = await imagekitPage(skip) as any[]
    if (!Array.isArray(page) || page.length === 0) break
    const filtered = page.filter((r:any) => /^hanrui_public_20\d{2}-\d{2}_/.test(r.name))
    allResources = allResources.concat(filtered)
    if (page.length < 1000) break
    skip += 1000
  }

  function extractMonth(name: string): string | null {
    const m = name.match(/^hanrui_public_(\d{4}-\d{2})_/)
    return m ? m[1] : null
  }

  const monthSet = Array.from(new Set(
    allResources.map((r:any) => extractMonth(r.name)).filter(Boolean)
  )).sort((a:any, b:any) => a.localeCompare(b))

  const weibo = monthSet.map(month => {
    const monthResources = allResources.filter((r:any) => extractMonth(r.name) === month)
    const imageFiles = monthResources.map((r:any) => ({ url: r.url, filename: r.name, isVideo: false }))
    return { month, images: imageFiles.map((r:any) => r.url), imageFiles }
  })

  // 周边五分类
  function getMerchCategory(subName) {
    const dir = path.join(publicDir, "merch", subName)
    try {
      return fs.readdirSync(dir)
        .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i))
        .map(f => toImageKit(`/merch/${subName}/${f}`))
    } catch { return [] }
  }
  const merchCategories = {
    小卡:    getMerchCategory("小卡"),
    玩偶:    getMerchCategory("玩偶"),
    官方周边: getMerchCategory("官方周边"),
    非官方周边: getMerchCategory("非官方周边"),
    其他收藏: getMerchCategory("其他收藏"),
  }

  // BGM 列表
  const BGMCDN = "https://res.cloudinary.com/demfj39xl/video/upload/hanrui/public/bgm"
  const bgmNames = ["我离开我自己","光亮","Crazy","I Lover You 3000","Mascara","forever young","一路生花","传奇","像风一样","克卜勒","兰亭序","如願","小偷","我很快乐","旅行中忘記","星辰大海","是你","永不失联的爱 ","洋葱","玫瑰少年","言不由衷","起风了","逆光","我心永恒"]
  const bgmList = bgmNames.map(name => ({ url: `${BGMCDN}/${name}.mp3`, name }))

  return { props: { data: { weibo, workCategories: BILIBILI_VIDEOS, merchCategories, bgmList } } }
}

// 作品四分类：舞台 考核 编曲 个人作品
const BILIBILI_VIDEOS = {
    舞台: [
    { bvid:"BV1F44y1P7qa", title:"《我很快乐》", cover:"http://i0.hdslb.com/bfs/archive/7d584deb8731a48f13fafa5301c339409f546859.jpg", url:"https://www.bilibili.com/video/BV1F44y1P7qa/", date:"2022-03", tags:[] },
    { bvid:"BV1cg411o7kK", title:"《传奇》", cover:"http://i0.hdslb.com/bfs/archive/0e41504beae130949b49c9c4ad41f55587d70b59.jpg", url:"https://www.bilibili.com/video/BV1cg411o7kK/", date:"2022-05", tags:[] },
    { bvid:"BV17G4y1c722", title:"《十二月的奇迹》", cover:"http://i1.hdslb.com/bfs/archive/613f6cbf3202374d815f97401b1a8cf295a5c503.jpg", url:"https://www.bilibili.com/video/BV17G4y1c722/", date:"2023-01", tags:["新年音乐会"] },
    { bvid:"BV1234y1Z7CX", title:"《光亮》", cover:"http://i1.hdslb.com/bfs/archive/2e64318c051b6887d547293766495432364d1908.jpg", url:"https://www.bilibili.com/video/BV1234y1Z7CX/", date:"2023-01", tags:["新年音乐会"] },
    { bvid:"BV12X4y1y7pH", title:"《不完美小孩》", cover:"http://i1.hdslb.com/bfs/archive/e7c4ff669cfd787e04ca29da231401706dd246ee.jpg", url:"https://www.bilibili.com/video/BV12X4y1y7pH/", date:"2023-05", tags:["少年梦工厂"] },
    { bvid:"BV1es4y1Q7L3", title:"《世界上的另一个我》", cover:"http://i1.hdslb.com/bfs/archive/a5efb961796e240de20dc9ea4f1877a10b45d9d6.jpg", url:"https://www.bilibili.com/video/BV1es4y1Q7L3/", date:"2023-05", tags:["少年梦工厂"] },
    { bvid:"BV1od4y1f7H4", title:"《是你》", cover:"http://i1.hdslb.com/bfs/archive/2679a4fa83f35d375d1b8776c44063bf763ac543.jpg", url:"https://www.bilibili.com/video/BV1od4y1f7H4/", date:"2023-05", tags:["少年梦工厂"] },
    { bvid:"BV1jT411t7m8", title:"《Shine》", cover:"http://i0.hdslb.com/bfs/archive/a3d6f6fd95f481517bb30968aa4d33676ca3df60.jpg", url:"https://www.bilibili.com/video/BV1jT411t7m8/", date:"2023-05", tags:["少年梦工厂"] },
    { bvid:"BV1oh411578F", title:"《绝配》", cover:"http://i0.hdslb.com/bfs/archive/51c23579896b4db8c91e4ebba4318798b5214b2a.jpg", url:"https://www.bilibili.com/video/BV1oh411578F/", date:"2023-05", tags:["少年梦工厂"] },
    { bvid:"BV1oX4y1y7EN", title:"《加油！Amigo》", cover:"http://i1.hdslb.com/bfs/archive/5c1bb5eca019225a1ee39d2f6e28c36064e026c8.jpg", url:"https://www.bilibili.com/video/BV1oX4y1y7EN/", date:"2023-05", tags:["少年梦工厂"] },
    { bvid:"BV1h94y1C7S7", title:"《剩下的盛夏》", cover:"http://i1.hdslb.com/bfs/archive/6629c87f3d3032ec9ed3dbe87f96b4700d8a8d8a.jpg", url:"https://www.bilibili.com/video/BV1h94y1C7S7/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV1Pz4y1W7fc", title:"《One and Only》", cover:"http://i1.hdslb.com/bfs/archive/19a9103b05620ccdec379ba7909c7212a7dff639.jpg", url:"https://www.bilibili.com/video/BV1Pz4y1W7fc/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV1yV4y1e73p", title:"《快乐崇拜》", cover:"http://i1.hdslb.com/bfs/archive/18c6bb45caf5d7f08fdf7b407763792fb70b8438.jpg", url:"https://www.bilibili.com/video/BV1yV4y1e73p/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV1ah4y1F7rj", title:"《第一天》", cover:"http://i0.hdslb.com/bfs/archive/56618160511f44f7e35bcc3a81eb323428c7e752.jpg", url:"https://www.bilibili.com/video/BV1ah4y1F7rj/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV1WP411t7vA", title:"《克卜勒》", cover:"http://i1.hdslb.com/bfs/archive/dbb47ad2bdb78e3f258ebf2dc4abce9784778191.jpg", url:"https://www.bilibili.com/video/BV1WP411t7vA/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV11h4y1r7Qi", title:"《大梦想家》", cover:"http://i1.hdslb.com/bfs/archive/2159a1723114078c911d03ecb3d0a8ab9d21ee9c.jpg", url:"https://www.bilibili.com/video/BV11h4y1r7Qi/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV16X4y1L7Bq", title:"《魔法城堡》", cover:"http://i1.hdslb.com/bfs/archive/1d6f01c08b2e7af8297e1af4ee100be6d6e17c40.jpg", url:"https://www.bilibili.com/video/BV16X4y1L7Bq/", date:"2023-08", tags:["多巴胺", "少年梦工厂"] },
    { bvid:"BV1fB421z7UA", title:"《2024新春特辑》《盛放》", cover:"http://i2.hdslb.com/bfs/archive/d1dcbe450c4ee4f7ed33302da4a33324a15879f6.jpg", url:"https://www.bilibili.com/video/BV1fB421z7UA/", date:"2024-02", tags:["新年音乐会"] },
    { bvid:"BV1h3FSeUEXF", title:"《K歌之王》", cover:"http://i2.hdslb.com/bfs/archive/a51930bf468ac1292fe57b453d9782374a7058d2.jpg", url:"https://www.bilibili.com/video/BV1h3FSeUEXF/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1hVFSe7EGx", title:"《像我一样》", cover:"http://i2.hdslb.com/bfs/archive/7a3b79256f01a7cfe9a021bda2ebe5000bf78852.jpg", url:"https://www.bilibili.com/video/BV1hVFSe7EGx/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1GQFSeHE7Q", title:"《刀剑如梦》", cover:"http://i2.hdslb.com/bfs/archive/f84c6717a27362209655dd0d423f7a3440241824.jpg", url:"https://www.bilibili.com/video/BV1GQFSeHE7Q/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1nYFSeeEXw", title:"《Guilty》", cover:"http://i0.hdslb.com/bfs/archive/ca03cff3677c3c6734275dd3ef01d1d7814402de.jpg", url:"https://www.bilibili.com/video/BV1nYFSeeEXw/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1aLFJeeEEi", title:"《超人诞生日记》", cover:"http://i2.hdslb.com/bfs/archive/b867af62a013916f845297b77021e7b68fa95c6a.jpg", url:"https://www.bilibili.com/video/BV1aLFJeeEEi/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV17YFVeZEho", title:"《K歌之王》", cover:"http://i1.hdslb.com/bfs/archive/7c0a9727822d2a8be3a2c0dc57e715348275ec2e.jpg", url:"https://www.bilibili.com/video/BV17YFVeZEho/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1W7F3ecE4w", title:"《像我一样》", cover:"http://i1.hdslb.com/bfs/archive/e5dd8d9a3518f48297e4a1e5340748cae37ae96f.jpg", url:"https://www.bilibili.com/video/BV1W7F3ecE4w/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV195FgeVEZm", title:"《芭啦芭啦樱之花》", cover:"http://i2.hdslb.com/bfs/archive/cc280d9f9bc1d966d67a798d640660fdb966a8ba.jpg", url:"https://www.bilibili.com/video/BV195FgeVEZm/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1WHFVeKE2J", title:"《Guilty》", cover:"http://i0.hdslb.com/bfs/archive/e2dca49727a5f51d63532bb07e2bd246a71d9074.jpg", url:"https://www.bilibili.com/video/BV1WHFVeKE2J/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1s5F3eAEYd", title:"《超人诞生日记》", cover:"http://i0.hdslb.com/bfs/archive/adf7c92f9f9a2fe377d78e87d07e10b327e30578.jpg", url:"https://www.bilibili.com/video/BV1s5F3eAEYd/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1fJwhe7EJR", title:"《像我一样》", cover:"http://i2.hdslb.com/bfs/archive/8c69ac6301e700d22b9fdf48d3896fcc9ca31bbf.jpg", url:"https://www.bilibili.com/video/BV1fJwhe7EJR/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1uow8ePEm2", title:"《刀剑如梦》", cover:"http://i2.hdslb.com/bfs/archive/8932652395a9a2394e7242c66f9f48461ad599da.jpg", url:"https://www.bilibili.com/video/BV1uow8ePEm2/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1w5wheQEwi", title:"《芭啦芭啦樱之花》", cover:"http://i0.hdslb.com/bfs/archive/e18409783aa2760c0a6275234571aa063395d737.jpg", url:"https://www.bilibili.com/video/BV1w5wheQEwi/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1rdwheXEY7", title:"《超人诞生日记》", cover:"http://i1.hdslb.com/bfs/archive/90af86ea8981be9e92bdd38becb43e8edcad6e4e.jpg", url:"https://www.bilibili.com/video/BV1rdwheXEY7/", date:"2025-01", tags:["新年音乐会", "热爱"] },
    { bvid:"BV1VoRaY4EuK", title:"《Letting Go》", cover:"http://i0.hdslb.com/bfs/archive/54aabc05553532d73abdfd7e7f90fab5174dcd71.jpg", url:"https://www.bilibili.com/video/BV1VoRaY4EuK/", date:"2025-03", tags:[] },
    { bvid:"BV1T4TXzcEgN", title:"《Vroom Vroom》", cover:"http://i2.hdslb.com/bfs/archive/b7f85a21b2c2e6220e4ecfb5715f8526bc4a089c.jpg", url:"https://www.bilibili.com/video/BV1T4TXzcEgN/", date:"2025-06", tags:[] },
    { bvid:"BV1NuzcBCEZD", title:"《只要有你》", cover:"http://i2.hdslb.com/bfs/archive/51c50659b9e828904970970319039405fe207948.jpg", url:"https://www.bilibili.com/video/BV1NuzcBCEZD/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1KMzcB5EEC", title:"《ON》", cover:"http://i2.hdslb.com/bfs/archive/a9d69ee1a5654473e577b954bc7d2e789261b94a.jpg", url:"https://www.bilibili.com/video/BV1KMzcB5EEC/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV19ezcBxEy4", title:"《爱要坦荡荡》", cover:"http://i2.hdslb.com/bfs/archive/533a8f8f4f514420f57cddbdb3dbd8e9581d927f.jpg", url:"https://www.bilibili.com/video/BV19ezcBxEy4/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1C9zcBkEQ6", title:"《野心家》", cover:"http://i2.hdslb.com/bfs/archive/fb6ea0b334cb926cb3260515d137f344da9e9cd1.jpg", url:"https://www.bilibili.com/video/BV1C9zcBkEQ6/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV152BZBDEsV", title:"《适合，不适合》", cover:"http://i2.hdslb.com/bfs/archive/498fd017c0d4b582c39af8950b88745c0e7b08dd.jpg", url:"https://www.bilibili.com/video/BV152BZBDEsV/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1SnzFBjEVd", title:"《好运来》", cover:"http://i2.hdslb.com/bfs/archive/f9f67aeebb8af2d7053e7bdea30f9fb075482dcf.jpg", url:"https://www.bilibili.com/video/BV1SnzFBjEVd/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1UDkcBxE8X", title:"《想把我唱给你听》", cover:"http://i0.hdslb.com/bfs/archive/8a1a9c7d0562e0981b038cec0b01a337d1ff64e2.jpg", url:"https://www.bilibili.com/video/BV1UDkcBxE8X/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1nKkwBLED1", title:"《黄昏晓》", cover:"http://i2.hdslb.com/bfs/archive/478b683bf8f4e44e1ef425ba48216073d643f9ae.jpg", url:"https://www.bilibili.com/video/BV1nKkwBLED1/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1pckwBUE8i", title:"《我要飞》", cover:"http://i1.hdslb.com/bfs/archive/c0dfc249588cca40ab61b9e7a809e021586b0674.jpg", url:"https://www.bilibili.com/video/BV1pckwBUE8i/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1tYkwBoEwu", title:"《心动》", cover:"http://i0.hdslb.com/bfs/archive/6c19e74ae62274d7d3e67fbf88a35c637e591812.jpg", url:"https://www.bilibili.com/video/BV1tYkwBoEwu/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1e9rABMErP", title:"《ON》", cover:"http://i0.hdslb.com/bfs/archive/aea0cad7e3510836920a7ba76033760a26c5bdf1.jpg", url:"https://www.bilibili.com/video/BV1e9rABMErP/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1LarPBGEBH", title:"《爱要坦荡荡》", cover:"http://i0.hdslb.com/bfs/archive/a64eb2d4b989c539d99b99e9267c966f86e142d4.jpg", url:"https://www.bilibili.com/video/BV1LarPBGEBH/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV15vrPBgEq6", title:"《野心家》", cover:"http://i2.hdslb.com/bfs/archive/892bb3a1e1e6aed14fc3791f748d9eea63a5f4ca.jpg", url:"https://www.bilibili.com/video/BV15vrPBgEq6/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1sRrPB4Em3", title:"《适合，不适合》", cover:"http://i2.hdslb.com/bfs/archive/22ff67de3c44be1092f9fa069b32c4743b48e31f.jpg", url:"https://www.bilibili.com/video/BV1sRrPB4Em3/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV14QrPBbEht", title:"《好运来》", cover:"http://i1.hdslb.com/bfs/archive/f6a24dc423d1a5577e36829a582863e8baf3bc97.jpg", url:"https://www.bilibili.com/video/BV14QrPBbEht/", date:"2026-01", tags:["新年音乐会"] },
    { bvid:"BV1DPFyztE5m", title:"《闭嘴跳舞》", cover:"http://i2.hdslb.com/bfs/archive/1c0a1d7bc44422600ecac25081aab407eaf06643.jpg", url:"https://www.bilibili.com/video/BV1DPFyztE5m/", date:"2026-02", tags:["荣耀之战"] },
    { bvid:"BV1ANFmzxE8T", title:"《太阳与地球》", cover:"http://i0.hdslb.com/bfs/archive/fcd539a3c2c80650dda639ba787467bc44e3ece6.jpg", url:"https://www.bilibili.com/video/BV1ANFmzxE8T/", date:"2026-02", tags:["荣耀之战"] },
    { bvid:"BV1vRFnzKE9Y", title:"《希区考克作品152》", cover:"http://i1.hdslb.com/bfs/archive/2655be340e6f27189b24d5eae2a2cf47bd7f07b5.jpg", url:"https://www.bilibili.com/video/BV1vRFnzKE9Y/", date:"2026-02", tags:["荣耀之战"] },
    { bvid:"BV1WVFJzLEhG", title:"《Lovely》", cover:"http://i0.hdslb.com/bfs/archive/b4a21f0450d67a63225e34ef64d5562f280e1d4a.jpg", url:"https://www.bilibili.com/video/BV1WVFJzLEhG/", date:"2026-02", tags:["荣耀之战"] },
    { bvid:"BV1vRFnzKE9s", title:"《借过一下》", cover:"http://i1.hdslb.com/bfs/archive/1c145d062637739d28a21ce2b14e1045cda9bd63.jpg", url:"https://www.bilibili.com/video/BV1vRFnzKE9s/", date:"2026-02", tags:["荣耀之战"] },
    { bvid:"BV17xFJzTEaY", title:"《我是一只鱼》", cover:"http://i2.hdslb.com/bfs/archive/289f6a71a55a07d4ed16dfef7efb25788f34df95.jpg", url:"https://www.bilibili.com/video/BV17xFJzTEaY/", date:"2026-02", tags:["荣耀之战"] },
  ],
  考核: [
    { bvid:"BV1DkDbYeE47", title:"张函瑞十月考核采访（下）", cover:"http://i1.hdslb.com/bfs/archive/144e9eff4d73d4a849f9b9fddb8f6ff9b0252a1f.jpg", url:"https://www.bilibili.com/video/BV1DkDbYeE47/", date:"2024-11", event:"考核" },
    { bvid:"BV12nDWY5Eyt", title:"张函瑞10月考核采访（上）", cover:"http://i2.hdslb.com/bfs/archive/bf5b97cea9dd576cabbe25c8ec4198ef3ae6acd9.jpg", url:"https://www.bilibili.com/video/BV12nDWY5Eyt/", date:"2024-11", event:"考核" },
    { bvid:"BV15yDWYZEUX", title:"弹唱考核《阳光下的星星》", cover:"http://i0.hdslb.com/bfs/archive/5d4ebbb563d57075b69c26084569303aa3fe4f7a.jpg", url:"https://www.bilibili.com/video/BV15yDWYZEUX/", date:"2024-11", event:"考核" },
    { bvid:"BV1EEDsYvEt3", title:"十月舞蹈考核 翻跳威神V《phantom》", cover:"http://i1.hdslb.com/bfs/archive/accb1fd2f6c2b0e38d022f6bc241e8b5a391a186.jpg", url:"https://www.bilibili.com/video/BV1EEDsYvEt3/", date:"2024-11", event:"考核" },
    { bvid:"BV1SZbDz2EwU", title:"张函瑞《卡拉永远OK》考核", cover:"http://i1.hdslb.com/bfs/archive/4bedf2631bd66f515d0e8aa403e78410f1906997.jpg", url:"https://www.bilibili.com/video/BV1SZbDz2EwU/", date:"2025-07", event:"考核" },
    { bvid:"BV1YDuQzkEDN", title:"张函瑞《Go in blind》练习考核记录", cover:"http://i2.hdslb.com/bfs/archive/9797bd161596b8ed05ac378e506b4f50e7e0aadb.jpg", url:"https://www.bilibili.com/video/BV1YDuQzkEDN/", date:"2025-07", event:"考核" },
    { bvid:"BV1TktpzcEcE", title:"第二组《路灯下的小姑娘》考核", cover:"http://i1.hdslb.com/bfs/archive/f1280d828f96cc8964940166e62be08ff5d8c002.jpg", url:"https://www.bilibili.com/video/BV1TktpzcEcE/", date:"2025-08", event:"考核" },
    { bvid:"BV11Mtmz8Evn", title:"张函瑞《暮色回响》考核", cover:"http://i1.hdslb.com/bfs/archive/7933907792410bca9edb7dd1b143950e0b29b64a.jpg", url:"https://www.bilibili.com/video/BV11Mtmz8Evn/", date:"2025-08", event:"考核" },
    { bvid:"BV186tmzBEaz", title:"张函瑞《雨爱》声乐考核", cover:"http://i0.hdslb.com/bfs/archive/dc4b23403548f66cf1158b1fe07a4f528fcc427f.jpg", url:"https://www.bilibili.com/video/BV186tmzBEaz/", date:"2025-08", event:"考核" },
    { bvid:"BV1fphpz9ET2", title:"《Deja Vu》张函瑞考核cut", cover:"http://i2.hdslb.com/bfs/archive/323f359b8d6dfb0c4c903ca30475179ebf2948b9.jpg", url:"https://www.bilibili.com/video/BV1fphpz9ET2/", date:"2025-08", event:"考核" },
    { bvid:"BV1LdWxz5Emo", title:"确定考核曲目《言不由衷》练习", cover:"http://i2.hdslb.com/bfs/archive/149ab1061a0aa83114535fa6d295cb22663daf54.jpg", url:"https://www.bilibili.com/video/BV1LdWxz5Emo/", date:"2025-10", event:"考核" },
    { bvid:"BV1Mr4EzHEJX", title:"十月考核 舞蹈考核", cover:"http://i1.hdslb.com/bfs/archive/be3abf1919b2d453059e00c6685208797a3e48b2.jpg", url:"https://www.bilibili.com/video/BV1Mr4EzHEJX/", date:"2025-10", event:"考核" },
    { bvid:"BV1DSSqB7Emr", title:"张函瑞考核采访全程cut", cover:"http://i1.hdslb.com/bfs/archive/090123d7f4f7760f1ca0c4488239847d9f04846a.jpg", url:"https://www.bilibili.com/video/BV1DSSqB7Emr/", date:"2025-11", event:"考核" },
    { bvid:"BV1ukUfBzERv", title:"乐队考核《艾蜜莉》单人纯享版", cover:"http://i1.hdslb.com/bfs/archive/d7340f6c248d44b9509de4cb33125e26abed9c40.jpg", url:"https://www.bilibili.com/video/BV1ukUfBzERv/", date:"2025-11", event:"考核" },
    { bvid:"BV1qgSFBJE9W", title:"团体舞考核《Problem With You》单人直拍", cover:"http://i2.hdslb.com/bfs/archive/2f2869e941a58a8ebde2d8e9df5ac0e0c892ccb1.jpg", url:"https://www.bilibili.com/video/BV1qgSFBJE9W/", date:"2025-11", event:"考核" },
    { bvid:"BV1kdUfBfEZU", title:"乐队考核第二组《艾蜜莉》主唱开口定调", cover:"http://i2.hdslb.com/bfs/archive/f18366a92c01fa08daacb0028d7e888b90fedb29.jpg", url:"https://www.bilibili.com/video/BV1kdUfBfEZU/", date:"2025-11", event:"考核" },
    { bvid:"BV1BTSFBHEjz", title:"舞蹈考核《Bombelelo》", cover:"http://i1.hdslb.com/bfs/archive/b596fab126ed501c363681349104a9da0cb943c2.jpg", url:"https://www.bilibili.com/video/BV1BTSFBHEjz/", date:"2025-11", event:"考核" },
    { bvid:"BV1HvUWB4EsH", title:"舞蹈练习《Focus》考核", cover:"http://i0.hdslb.com/bfs/archive/36c60fcdc0e57e9939a70f6294214684e2e09266.jpg", url:"https://www.bilibili.com/video/BV1HvUWB4EsH/", date:"2025-11", event:"考核" },
    { bvid:"BV1zLCyBAEbu", title:"张函瑞《言不由衷》声乐练习", cover:"http://i0.hdslb.com/bfs/archive/3670846a856445b07146d6eef2d0614de40edc7a.jpg", url:"https://www.bilibili.com/video/BV1zLCyBAEbu/", date:"2025-11", event:"考核" },
    { bvid:"BV1vc2EBtEnK", title:"考核奖励舞台《Bombelelo》", cover:"http://i1.hdslb.com/bfs/archive/9ac7e4ac67c307290e9bef8b5de68b2246a5e23e.jpg", url:"https://www.bilibili.com/video/BV1vc2EBtEnK/", date:"2025-12", event:"考核" },
    { bvid:"BV1nU27BiEWA", title:"考核奖励舞台《言不由衷》", cover:"http://i0.hdslb.com/bfs/archive/f5fc1051918c516652c95e6808804747a24bddf7.jpg", url:"https://www.bilibili.com/video/BV1nU27BiEWA/", date:"2025-12", event:"考核" },
  ],
  编曲: [
    { bvid:"BVbianzou01", title:"编曲作品 01", cover:"https://i0.hdslb.com/bfs/archive/2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f.jpg", url:"https://www.bilibili.com/video/BVbianzou01/", date:"2025-01", event:"个人创作" },
  ],
  个人作品: [
    { bvid:"BVgeren01", title:"个人作品 01", cover:"https://i0.hdslb.com/bfs/archive/3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a.jpg", url:"https://www.bilibili.com/video/BVgeren01/", date:"2025-06", event:"个人发布" },
  ],
}

const ZHIPAI_DATA = [
  {
    id: "zp_477183100",
    name: "猫罐头丨张函瑞",
    initials: "猫",
    color: "#e07b39",
    bSpace: "https://space.bilibili.com/477183100",
    videos: [
      {
        title: "我要飞 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1m7cnzsEzX/",
        cover: "http://i2.hdslb.com/bfs/archive/8e5d2f94e002aa0c774daa06acea241575fe6e42.jpg",
        date: "2026-02",
        views: "1.7万",
        event: "直拍",
      },
      {
        title: "闭嘴跳舞 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1mJ64BREZa/",
        cover: "http://i1.hdslb.com/bfs/archive/1f68b2a9d06daceb2de07e87e34380e887959a28.jpg",
        date: "2026-02",
        views: "4.0万",
        event: "直拍",
      },
      {
        title: "太阳与地球 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1DL64BtEJn/",
        cover: "http://i2.hdslb.com/bfs/archive/0d3096be3009b3e3b2033aadabeef598e7b2ef85.jpg",
        date: "2026-02",
        views: "6414",
        event: "直拍",
      },
      {
        title: "希区考克 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Ht61BAEut/",
        cover: "http://i1.hdslb.com/bfs/archive/6896a3452f57ded6de4e038e440c3d77ea27a73c.jpg",
        date: "2026-01",
        views: "8105",
        event: "直拍",
      },
      {
        title: "lovely - 猫罐头",
        url: "https://www.bilibili.com/video/BV1oe6CBJEg9/",
        cover: "http://i2.hdslb.com/bfs/archive/e5ef86df245bb64a6e32bae40f7e512af169001f.jpg",
        date: "2026-01",
        views: "2.5万",
        event: "直拍",
      },
      {
        title: "借过一下  单人多机位 待编辑 - 猫罐头",
        url: "https://www.bilibili.com/video/BV12G6CBvEdj/",
        cover: "http://i0.hdslb.com/bfs/archive/0435edc0bebac1300ec2c40153c3dad0e27e21b3.jpg",
        date: "2026-01",
        views: "1.3万",
        event: "直拍",
      },
      {
        title: "我是一只鱼 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1yf6CBAEpj/",
        cover: "http://i0.hdslb.com/bfs/archive/ff5228c0b142d37d5f4c8bd0f039eb9bb6dd241d.jpg",
        date: "2026-01",
        views: "2.5万",
        event: "直拍",
      },
      {
        title: "黄昏晓 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1mrvSB3EEi/",
        cover: "http://i2.hdslb.com/bfs/archive/0103e0772f58c8ab34228ad4e1b3df7db5737acc.jpg",
        date: "2026-01",
        views: "1.7万",
        event: "直拍",
      },
      {
        title: "主舞还是主唱？全能爱豆的致命魅惑 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1xevCBQEwN/",
        cover: "http://i2.hdslb.com/bfs/archive/4a580f2bfdb6b92212d15132fc1e89fae31a6007.jpg",
        date: "2025-12",
        views: "3.9万",
        event: "直拍",
      },
      {
        title: "野心家 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1u8BCBKEQn/",
        cover: "http://i2.hdslb.com/bfs/archive/5ad8411ea67e728c3e786cd363b89b3f12cad0c5.jpg",
        date: "2025-12",
        views: "3.3万",
        event: "直拍",
      },
      {
        title: "ON - 猫罐头",
        url: "https://www.bilibili.com/video/BV1VMBvBEEbE/",
        cover: "http://i2.hdslb.com/bfs/archive/2a0c6c214ff58b86fe8daf704799f10f63d36993.jpg",
        date: "2025-12",
        views: "3.4万",
        event: "直拍",
      },
      {
        title: "嘶哈嘶哈...孩子大了可以玩些 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Dcagz5ErA/",
        cover: "http://i0.hdslb.com/bfs/archive/a96c4be1687c7730e7c0f282301a0c54fc6a8fb6.jpg",
        date: "2025-09",
        views: "1.0万",
        event: "直拍",
      },
      {
        title: "音乐一响 引爆全场 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1x4ekzeEgR/",
        cover: "http://i1.hdslb.com/bfs/archive/42576b86dc35507ab6dc65eb2037d5451f01e86f.jpg",
        date: "2025-08",
        views: "1.4万",
        event: "直拍",
      },
      {
        title: "跟绿彩带最配的男人来了 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Eovwz1E1x/",
        cover: "http://i2.hdslb.com/bfs/archive/b24d8fd09bcd10ab148a05297def2a89188d7757.jpg",
        date: "2025-08",
        views: "1.0万",
        event: "直拍",
      },
      {
        title: "你要的爱 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1KHY1zrEXe/",
        cover: "http://i0.hdslb.com/bfs/archive/08d4844484db7d2128146235caca798421a90005.jpg",
        date: "2025-08",
        views: "9.6万",
        event: "直拍",
      },
      {
        title: "你要的爱 - 猫罐头",
        url: "https://www.bilibili.com/video/BV18Kb5z2EkD/",
        cover: "http://i1.hdslb.com/bfs/archive/5f81aefe09a61e0d9c0b781ea32fd0948f45d798.jpg",
        date: "2025-08",
        views: "3.5万",
        event: "直拍",
      },
      {
        title: "成为你想成为的大人 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1JtthzkEVB/",
        cover: "http://i0.hdslb.com/bfs/archive/271d85ad2f684338fdd2e113884ef4dfe7631342.jpg",
        date: "2025-08",
        views: "4821",
        event: "直拍",
      },
      {
        title: "炙热浓烈的生命力 肆意无畏的少年 - 猫罐头",
        url: "https://www.bilibili.com/video/BV18KthzoEfs/",
        cover: "http://i0.hdslb.com/bfs/archive/05e42373b12da2d856fd034012f2737e013f8e59.jpg",
        date: "2025-08",
        views: "5451",
        event: "直拍",
      },
      {
        title: "落日只会道别 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1GCthzaEjH/",
        cover: "http://i1.hdslb.com/bfs/archive/d3755828ef62c7d5bf674fd08cf14858fa06c99e.jpg",
        date: "2025-08",
        views: "4489",
        event: "直拍",
      },
      {
        title: "男人的下跪女人的兴奋剂 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1jithzTE7x/",
        cover: "http://i2.hdslb.com/bfs/archive/a71076e9ec520220125adeb4ebdd375d937565c4.jpg",
        date: "2025-08",
        views: "1.0万",
        event: "直拍",
      },
      {
        title: "舞力觉醒！主唱的爆发力盛宴 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1GkthzAE9P/",
        cover: "http://i0.hdslb.com/bfs/archive/aaacd6a1b750dd413b05d565286cd6e8b3d85bd0.jpg",
        date: "2025-08",
        views: "9096",
        event: "直拍",
      },
      {
        title: "路灯下的小姑娘 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1dXttzZEFf/",
        cover: "http://i0.hdslb.com/bfs/archive/9c40c780d8e6d60b4bb00da722de1e5925c3668f.jpg",
        date: "2025-08",
        views: "5431",
        event: "直拍",
      },
      {
        title: "雨爱 - 猫罐头",
        url: "https://www.bilibili.com/video/BV16kttzvEaY/",
        cover: "http://i0.hdslb.com/bfs/archive/b4e7e9f8b76769d2d21c6085b3bd8f6fe6e42f81.jpg",
        date: "2025-08",
        views: "4406",
        event: "直拍",
      },
      {
        title: "心动 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1kJtbzgESC/",
        cover: "http://i1.hdslb.com/bfs/archive/75ee9b129747e0eaeb0ce2cc24a0b320a0033fa2.jpg",
        date: "2025-08",
        views: "7951",
        event: "直拍",
      },
      {
        title: "2025运动会杆上对决双机位混剪 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1aD8mzUEsZ/",
        cover: "http://i1.hdslb.com/bfs/archive/75e5c45606f9a088d7bb48bdeb95c6a76bd613f7.jpg",
        date: "2025-08",
        views: "2563",
        event: "直拍",
      },
      {
        title: "饭撒合集 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1AbgAz4E6R/",
        cover: "http://i0.hdslb.com/bfs/archive/70bbc1648125298ab49f8fe25987fe7943f6aab1.jpg",
        date: "2025-07",
        views: "3.8万",
        event: "直拍",
      },
      {
        title: "纯血主舞来袭！TF家族运动会d - 猫罐头",
        url: "https://www.bilibili.com/video/BV1uZuJzmE6N/",
        cover: "http://i2.hdslb.com/bfs/archive/12bafa27b5d50c86b889c2225ebd13fa6e360ef3.jpg",
        date: "2025-07",
        views: "1.6万",
        event: "直拍",
      },
      {
        title: "心动 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1oUuYzcE8n/",
        cover: "http://i0.hdslb.com/bfs/archive/75ba5940a19d1d0713c61af286a1245c8800e0c5.jpg",
        date: "2025-07",
        views: "1.1万",
        event: "直拍",
      },
      {
        title: "Be What You Wan - 猫罐头",
        url: "https://www.bilibili.com/video/BV1w9M2zGEnD/",
        cover: "http://i0.hdslb.com/bfs/archive/096afa853b871b9a253f9eafe22a0d52a0c2d293.jpg",
        date: "2025-06",
        views: "4372",
        event: "直拍",
      },
      {
        title: "对面的女孩看过来 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1YtE9zBEwv/",
        cover: "http://i2.hdslb.com/bfs/archive/30b37357333043af401213e1e585441ec5e9635e.jpg",
        date: "2025-05",
        views: "6198",
        event: "直拍",
      },
      {
        title: "像我一样 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1KcwbeXEaY/",
        cover: "http://i0.hdslb.com/bfs/archive/19b9b2292ae52b8a54397e546479dc50e71b8d40.jpg",
        date: "2025-01",
        views: "1.9万",
        event: "直拍",
      },
      {
        title: "K歌之王八机位体验全场视角主唱的主场 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1PKwbeJEs6/",
        cover: "http://i0.hdslb.com/bfs/archive/b5e75deda2544d8476f7ea11a60687ddc9aef485.jpg",
        date: "2025-01",
        views: "5149",
        event: "直拍",
      },
      {
        title: "美颜大主唱开口及封神 进来感受 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1gQwtefEs5/",
        cover: "http://i0.hdslb.com/bfs/archive/bae953681d4694d2e247b059191f84d66940bafe.jpg",
        date: "2025-01",
        views: "1.1万",
        event: "直拍",
      },
      {
        title: "舞林争霸 谁拔得头筹 - 猫罐头",
        url: "https://www.bilibili.com/video/BV12Gw2eMExJ/",
        cover: "http://i0.hdslb.com/bfs/archive/6a811c267e9713d935ff4d451e45bafcc3030b6d.jpg",
        date: "2025-01",
        views: "28.4万",
        event: "直拍",
      },
      {
        title: "抱歉啦~没办法照你的想法盛开但 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Yzw2eSEYE/",
        cover: "http://i2.hdslb.com/bfs/archive/5bfff501e6a3892507981451d4aa74fb8bc3d774.jpg",
        date: "2025-01",
        views: "10.0万",
        event: "直拍",
      },
      {
        title: "街舞少年 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1ivw2epEKr/",
        cover: "http://i0.hdslb.com/bfs/archive/1e7c73c07c19c5b02d727389f31819db35246201.jpg",
        date: "2025-01",
        views: "1.4万",
        event: "新年音乐会",
      },
      {
        title: "超人诞生日记 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1eewyeLExw/",
        cover: "http://i2.hdslb.com/bfs/archive/54b932dd28901a359bdc96c266fbb4a06660b67b.jpg",
        date: "2025-01",
        views: "1.7万",
        event: "直拍",
      },
      {
        title: "你在视频里下了什么。。。好热 - 猫罐头",
        url: "https://www.bilibili.com/video/BV18TwqeDEsV/",
        cover: "http://i1.hdslb.com/bfs/archive/cd79892b296c4da71ff235823d3fb36cc22b2ad5.jpg",
        date: "2025-01",
        views: "4.9万",
        event: "直拍",
      },
      {
        title: "正机位官摄视角「this is - 猫罐头",
        url: "https://www.bilibili.com/video/BV1DSk4YkEBb/",
        cover: "http://i2.hdslb.com/bfs/archive/7ee2056b2d62f01bfcd0eb3818b65efa4bd5ba69.jpg",
        date: "2024-12",
        views: "8438",
        event: "直拍",
      },
      {
        title: "少年美 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1PsiyYwE68/",
        cover: "http://i0.hdslb.com/bfs/archive/cba2dd374497763965c1512ae716fa32fa70fb0a.jpg",
        date: "2024-12",
        views: "9548",
        event: "直拍",
      },
      {
        title: "用尽我的一切奔向你 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1nD4SeNEpF/",
        cover: "http://i0.hdslb.com/bfs/archive/5baea49ebf3eabd01dbfb589f2ceefa4f86378bb.jpg",
        date: "2024-09",
        views: "7555",
        event: "直拍",
      },
      {
        title: "甜蜜暴击！「Baby」五机位联 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1wvWoeSESx/",
        cover: "http://i0.hdslb.com/bfs/archive/56ec74c79a70094eebadbf72101904287abda632.jpg",
        date: "2024-08",
        views: "1.1万",
        event: "直拍",
      },
      {
        title: "国风主唱深情演绎「一眼万年」联 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1pDpme9EK4/",
        cover: "http://i2.hdslb.com/bfs/archive/090e18b0b27ef10df0efb6b5da14874367d5f68d.jpg",
        date: "2024-08",
        views: "5916",
        event: "直拍",
      },
      {
        title: "怼脸预警「被驯服的象」双机位FOCUS - 猫罐头",
        url: "https://www.bilibili.com/video/BV1KAeMeCEt5/",
        cover: "http://i0.hdslb.com/bfs/archive/b18ee5aec469cb6b7721ab3d8e0b4deaee55bf54.jpg",
        date: "2024-08",
        views: "3.9万",
        event: "直拍",
      },
      {
        title: "糖果精来报恩了！内娱不可多得的 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1UNeWe4EWa/",
        cover: "http://i1.hdslb.com/bfs/archive/89ca4e3d99af5885f8f0a00beb8ac6b72ec76c85.jpg",
        date: "2024-08",
        views: "3.8万",
        event: "直拍",
      },
      {
        title: "傻了眼了 谁帮我数一数他表情管 - 猫罐头",
        url: "https://www.bilibili.com/video/BV14JYyeyEhW/",
        cover: "http://i1.hdslb.com/bfs/archive/e414f4f5c74d74d941b697ae958106f82ce0ff98.jpg",
        date: "2024-08",
        views: "56.8万",
        event: "直拍",
      },
      {
        title: "楼娱又出神级舞台！主唱爆改性感 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1JwYzeDEWL/",
        cover: "http://i2.hdslb.com/bfs/archive/1abf188b0982de7d98ff7ad2532feaeeccb3c1ec.jpg",
        date: "2024-08",
        views: "13.5万",
        event: "直拍",
      },
      {
        title: "TF家族2024夏日运动会射箭 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Uz421q7TZ/",
        cover: "http://i0.hdslb.com/bfs/archive/3829df5407c229af67467fbf3ed1fdb416dee352.jpg",
        date: "2024-07",
        views: "4639",
        event: "直拍",
      },
      {
        title: "TF家族2024夏日运动会开幕 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1rS411c7s3/",
        cover: "http://i0.hdslb.com/bfs/archive/074ca243d83a33db66ae830dd506c1914ecc853f.jpg",
        date: "2024-07",
        views: "7229",
        event: "直拍",
      },
      {
        title: "我不要改变 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1hy411b7f4/",
        cover: "http://i2.hdslb.com/bfs/archive/c5971151e2dbf90347fdba6bc9943902043a8263.jpg",
        date: "2024-06",
        views: "3955",
        event: "直拍",
      },
      {
        title: "要说的话是\"非你不可\" - 猫罐头",
        url: "https://www.bilibili.com/video/BV1rw4m1U7Pu/",
        cover: "http://i1.hdslb.com/bfs/archive/349133ba0a94078ebedae8db72264f34702accc3.jpg",
        date: "2024-05",
        views: "7383",
        event: "直拍",
      },
      {
        title: "半兽人 - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Lm421M7w3/",
        cover: "http://i1.hdslb.com/bfs/archive/6e974f63a2d73e3d1b3431e0e43df7d3f3831322.jpg",
        date: "2024-05",
        views: "4864",
        event: "直拍",
      },
      {
        title: "快乐崇拜♪双机位FOCUS - 猫罐头",
        url: "https://www.bilibili.com/video/BV1Es421A7TV/",
        cover: "http://i0.hdslb.com/bfs/archive/b4d4cc7f92f7ba52daa985bd41f9430e777cce34.jpg",
        date: "2024-05",
        views: "7290",
        event: "直拍",
      },
      {
        title: "Natural - 猫罐头",
        url: "https://www.bilibili.com/video/BV17C411E7m3/",
        cover: "http://i1.hdslb.com/bfs/archive/0ebf9d294b877cbc8492d2d80dc73b7ff62b58e8.jpg",
        date: "2024-05",
        views: "7843",
        event: "直拍",
      },
    ],
  },
  {
    id: "zp_1643739345",
    name: "秋日信函_张函瑞",
    initials: "秋",
    color: "#457b9d",
    bSpace: "https://space.bilibili.com/1643739345",
    videos: [
      {
        title: "闭嘴跳舞 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1a964BaEM1/",
        cover: "http://i1.hdslb.com/bfs/archive/fbc9e69800ea6f2b2dbd6753be9a13c726e227a7.jpg",
        date: "2026-02",
        views: "8.9万",
        event: "直拍",
      },
      {
        title: "太阳与地球 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1HV6tBUEL2/",
        cover: "http://i0.hdslb.com/bfs/archive/5b0e8f74fb3093d3b8c4b489b0268d567c25b3bd.jpg",
        date: "2026-02",
        views: "2.0万",
        event: "直拍",
      },
      {
        title: "希区考克(作品152) - 秋日信函",
        url: "https://www.bilibili.com/video/BV1iJ62B4Ehk/",
        cover: "http://i0.hdslb.com/bfs/archive/a37d5dcbc3c272d4c99d255f052c40a065142d9c.jpg",
        date: "2026-01",
        views: "5.5万",
        event: "直拍",
      },
      {
        title: "Lovely - 秋日信函",
        url: "https://www.bilibili.com/video/BV1zG62BwEdM/",
        cover: "http://i2.hdslb.com/bfs/archive/64185ee059aa52f6c0f5acbe91c9c63619a0dc44.jpg",
        date: "2026-01",
        views: "7.6万",
        event: "直拍",
      },
      {
        title: "借过一下 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1An6CBFEsb/",
        cover: "http://i2.hdslb.com/bfs/archive/1526392ecdeba35823529120516d9f7e052818f6.jpg",
        date: "2026-01",
        views: "9.5万",
        event: "直拍",
      },
      {
        title: "我是一只鱼 - 秋日信函",
        url: "https://www.bilibili.com/video/BV19q6CB7EQ9/",
        cover: "http://i1.hdslb.com/bfs/archive/935fe28ba7248eeba9876b3143d6675c899e1377.jpg",
        date: "2026-01",
        views: "57.7万",
        event: "直拍",
      },
      {
        title: "Deja Vu四场一键换装混剪 - 秋日信函",
        url: "https://www.bilibili.com/video/BV18ezMBzE91/",
        cover: "http://i2.hdslb.com/bfs/archive/9492800f48e65cbeedae6fad2d99f4395349568f.jpg",
        date: "2026-01",
        views: "1.6万",
        event: "直拍",
      },
      {
        title: "ON - 秋日信函",
        url: "https://www.bilibili.com/video/BV1cbqPB6Eiv/",
        cover: "http://i0.hdslb.com/bfs/archive/2ac12bbd983527d5a44518fe1cd257c18766b92d.jpg",
        date: "2026-01",
        views: "1.6万",
        event: "直拍",
      },
      {
        title: "适合不适合 - 秋日信函",
        url: "https://www.bilibili.com/video/BV14XitB7EzB/",
        cover: "http://i1.hdslb.com/bfs/archive/c7ce12c892b47196e1c5ccb3326ca4802c4e45de.jpg",
        date: "2026-01",
        views: "4.1万",
        event: "直拍",
      },
      {
        title: "想把我唱给你听 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1RSiiBHEop/",
        cover: "http://i1.hdslb.com/bfs/archive/24ee591a7a45fa92cae422383ad6bca878b3d998.jpg",
        date: "2026-01",
        views: "1.6万",
        event: "直拍",
      },
      {
        title: "我要飞 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1xCiYBfEzg/",
        cover: "http://i1.hdslb.com/bfs/archive/46689727b8a560e3337ab983c0aa84b3a4f7219e.jpg",
        date: "2026-01",
        views: "1.9万",
        event: "多巴胺",
      },
      {
        title: "黄昏晓 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1YjvaBvEoH/",
        cover: "http://i1.hdslb.com/bfs/archive/90d713e37afba7c9c9cf582639ad07d1099292a6.jpg",
        date: "2025-12",
        views: "2.2万",
        event: "直拍",
      },
      {
        title: "只要有你 - 秋日信函",
        url: "https://www.bilibili.com/video/BV13KvWBgEHp/",
        cover: "http://i1.hdslb.com/bfs/archive/29e5c7132bbfe605bf7ad8af63efb84cfeb87a6f.jpg",
        date: "2025-12",
        views: "1.4万",
        event: "直拍",
      },
      {
        title: "Manta - 秋日信函",
        url: "https://www.bilibili.com/video/BV1kmviBfEYx/",
        cover: "http://i0.hdslb.com/bfs/archive/1e8241e062984dbd9773365dc838b4c0c1451663.jpg",
        date: "2025-12",
        views: "4.0万",
        event: "直拍",
      },
      {
        title: "心动 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1NeBrBREUV/",
        cover: "http://i2.hdslb.com/bfs/archive/10a66363dcd21a07961e091d4fe9c6516ce5394a.jpg",
        date: "2025-12",
        views: "5.3万",
        event: "直拍",
      },
      {
        title: "适合不适合 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1trBiByEEp/",
        cover: "http://i0.hdslb.com/bfs/archive/d35a3ae87f6aded13786db3a4027751c1155b04a.jpg",
        date: "2025-12",
        views: "2.7万",
        event: "直拍",
      },
      {
        title: "野心家 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1PtBvBvEK9/",
        cover: "http://i1.hdslb.com/bfs/archive/6a404ec4934acd2981ac64255709ab71ac9ec2d5.jpg",
        date: "2025-12",
        views: "4.7万",
        event: "直拍",
      },
      {
        title: "爱要坦荡荡 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1PMBiBMEze/",
        cover: "http://i0.hdslb.com/bfs/archive/09954882bccec5fda65c093567e04faf2ffffcc5.jpg",
        date: "2025-12",
        views: "107.1万",
        event: "直拍",
      },
      {
        title: "GO IN BLIND横屏 妈粉速退！ - 秋日信函",
        url: "https://www.bilibili.com/video/BV16Ke2zeENk/",
        cover: "http://i1.hdslb.com/bfs/archive/1657864765897aa816daffc08c42686457e9f8a8.jpg",
        date: "2025-08",
        views: "7980",
        event: "直拍",
      },
      {
        title: "打造专属打歌舞台 Lucife - 秋日信函",
        url: "https://www.bilibili.com/video/BV1VoeGzaEZL/",
        cover: "http://i0.hdslb.com/bfs/archive/df9f4a6fa713b9cc4b0107ea08ad15855d4e4a25.jpg",
        date: "2025-08",
        views: "9091",
        event: "直拍",
      },
      {
        title: "centuries舞台横屏 建 - 秋日信函",
        url: "https://www.bilibili.com/video/BV11nYnzNE5p/",
        cover: "http://i1.hdslb.com/bfs/archive/8f1ef1a1f50b13f1881cf2a90f1a6aa9f32e78d1.jpg",
        date: "2025-08",
        views: "8742",
        event: "直拍",
      },
      {
        title: "你要的爱横屏 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1RNY1zpEYG/",
        cover: "http://i2.hdslb.com/bfs/archive/602af3115c7a4de19e42fbbe9614360773fb4c8a.jpg",
        date: "2025-08",
        views: "5651",
        event: "直拍",
      },
      {
        title: "Lucifer横屏 这段卡点治 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1rFYBzkEcc/",
        cover: "http://i1.hdslb.com/bfs/archive/59f8225d5a26fed08a8ca46e4221a818c7e3e873.jpg",
        date: "2025-08",
        views: "8224",
        event: "直拍",
      },
      {
        title: "Deja Vu横屏 建议反复观 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1urYqzdEqT/",
        cover: "http://i0.hdslb.com/bfs/archive/aa8eed9f6fb2c86d3e2158d88d9831f53b219865.jpg",
        date: "2025-08",
        views: "5662",
        event: "直拍",
      },
      {
        title: "心动 暴击!!!这舞台表现力还有谁？ - 秋日信函",
        url: "https://www.bilibili.com/video/BV1AMYvz6EoU/",
        cover: "http://i2.hdslb.com/bfs/archive/6f12e375ca062046ee0ea57a9dd1b5218284e560.jpg",
        date: "2025-08",
        views: "3594",
        event: "直拍",
      },
      {
        title: "路灯下的小姑娘横屏 阿卡贝拉的神 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1QQYezJEMY/",
        cover: "http://i2.hdslb.com/bfs/archive/0f6b0d82c5b9b597bce36c5adca2efce87b2eab8.jpg",
        date: "2025-08",
        views: "7126",
        event: "直拍",
      },
      {
        title: "翻跳Go in blind封神 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1njYvzNESM/",
        cover: "http://i1.hdslb.com/bfs/archive/af3814b81d47eed0dc2a3f6e3801876ca6725281.jpg",
        date: "2025-08",
        views: "6283",
        event: "直拍",
      },
      {
        title: "雨爱 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1SGbTzbE6R/",
        cover: "http://i2.hdslb.com/bfs/archive/b4e4154d7c5d906ded9a6567f5515c8a6976a42c.jpg",
        date: "2025-08",
        views: "2.8万",
        event: "直拍",
      },
      {
        title: "你要的爱横屏 每个眼神都在故事里 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1XnbPzxE2B/",
        cover: "http://i1.hdslb.com/bfs/archive/28bc279fc4a6144718924ceb46ded4fc6496cff0.jpg",
        date: "2025-08",
        views: "1.3万",
        event: "直拍",
      },
      {
        title: "Lucifer横屏 禁止未成年 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1AcbPzgE1j/",
        cover: "http://i2.hdslb.com/bfs/archive/f43df5e125f689b07804bb386c91621afd544c98.jpg",
        date: "2025-08",
        views: "2.1万",
        event: "直拍",
      },
      {
        title: "Deja Vu横屏 弹幕全在喊 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1fgbPzAEE5/",
        cover: "http://i2.hdslb.com/bfs/archive/c700723b737ad5b7e13e1a773bec806ea9fba283.jpg",
        date: "2025-08",
        views: "2.1万",
        event: "直拍",
      },
      {
        title: "心动 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1CkbPz3EJm/",
        cover: "http://i2.hdslb.com/bfs/archive/8cf8745a774b5f021819939f0c67064e0473eb1f.jpg",
        date: "2025-08",
        views: "6261",
        event: "直拍",
      },
      {
        title: "成为你想成为的大人 - 秋日信函",
        url: "https://www.bilibili.com/video/BV161t8z3Eaj/",
        cover: "http://i1.hdslb.com/bfs/archive/6b0eabb7a0e708fb4d76a07814d9059d279c46dc.jpg",
        date: "2025-08",
        views: "8734",
        event: "直拍",
      },
      {
        title: "路灯下的小姑娘 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1uDthzoE5N/",
        cover: "http://i2.hdslb.com/bfs/archive/954945a93f6dcdf04a7c9e9b81a9d38b51dc9931.jpg",
        date: "2025-08",
        views: "1.8万",
        event: "多巴胺",
      },
      {
        title: "落日只会道别 - 秋日信函",
        url: "https://www.bilibili.com/video/BV18wtbzQE98/",
        cover: "http://i1.hdslb.com/bfs/archive/4d7b6ee0012e2a80baacfba1296690fc45d3eca5.jpg",
        date: "2025-08",
        views: "3.1万",
        event: "直拍",
      },
      {
        title: "前方超燃预警！真的有这么丝滑吗 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1HntbzzEqP/",
        cover: "http://i0.hdslb.com/bfs/archive/a38325a6c891d702a5b9d69c7be1fa9188d253f2.jpg",
        date: "2025-08",
        views: "1.8万",
        event: "直拍",
      },
      {
        title: "雨爱双机位横屏 新舞台神仙嗓音 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1fxtbzKESN/",
        cover: "http://i0.hdslb.com/bfs/archive/60e41a77776643e907bbd87f46478cb956a5c07d.jpg",
        date: "2025-08",
        views: "100.5万",
        event: "直拍",
      },
      {
        title: "We Are - 秋日信函",
        url: "https://www.bilibili.com/video/BV1bPtbznEmv/",
        cover: "http://i2.hdslb.com/bfs/archive/1dcb5ea4db5a575e133114b97505ee1deeaf8eb6.jpg",
        date: "2025-08",
        views: "2.6万",
        event: "直拍",
      },
      {
        title: "Lucifer - 秋日信函",
        url: "https://www.bilibili.com/video/BV11Vtbz5EaR/",
        cover: "http://i1.hdslb.com/bfs/archive/e5cc63159fc608beaf20eee347c38494a8d6af00.jpg",
        date: "2025-08",
        views: "4.0万",
        event: "直拍",
      },
      {
        title: "2025TF家族夏日运动会全程 - 秋日信函",
        url: "https://www.bilibili.com/video/BV16Qutz9EYy/",
        cover: "http://i1.hdslb.com/bfs/archive/a5743a18db58f62a4ca1132d8930c3d1c142ffe0.jpg",
        date: "2025-07",
        views: "2.9万",
        event: "直拍",
      },
      {
        title: "2025TF家族夏日运动会全程 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1pUMdziEtV/",
        cover: "http://i2.hdslb.com/bfs/archive/12e29ebd835143e5c7d26db982b3ddd91fb7d1f7.jpg",
        date: "2025-07",
        views: "1.9万",
        event: "直拍",
      },
      {
        title: "心动 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1vHM9zjEPw/",
        cover: "http://i2.hdslb.com/bfs/archive/b9cd0701ac189548cc1dc32cb72a9f56c119a2ab.jpg",
        date: "2025-07",
        views: "2.4万",
        event: "直拍",
      },
      {
        title: "公开三周年混剪 最强催泪弹 暴 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1yyNfe1EDr/",
        cover: "http://i0.hdslb.com/bfs/archive/853487b05278c9541b9cec6b2ca36289ae6def07.jpg",
        date: "2025-02",
        views: "1.2万",
        event: "直拍",
      },
      {
        title: "开场舞恭喜发财 元气满满小财神 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1AiFheSEFb/",
        cover: "http://i2.hdslb.com/bfs/archive/f8327390de94f3e1cc4434ad176630dd8464074e.jpg",
        date: "2025-01",
        views: "5746",
        event: "直拍",
      },
      {
        title: "刀剑如梦双机位 唱跳俱佳 点进 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1aFwvemEQo/",
        cover: "http://i2.hdslb.com/bfs/archive/4f3b40bc73f5e167c4c918f9aa41c387b94af26c.jpg",
        date: "2025-01",
        views: "9509",
        event: "直拍",
      },
      {
        title: "超人诞生日记四机位 养成好养成 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1e8wkegEEp/",
        cover: "http://i2.hdslb.com/bfs/archive/75c0bfc8792d30bd7e1964614b1d4f9be1a65f06.jpg",
        date: "2025-01",
        views: "9805",
        event: "直拍",
      },
      {
        title: "如果当时五机位横屏 张口唱歌即 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1JfwkenEq2/",
        cover: "http://i2.hdslb.com/bfs/archive/7bd03277a627383a9e7115d7672fea4324abce17.jpg",
        date: "2025-01",
        views: "4.3万",
        event: "直拍",
      },
      {
        title: "paraparasakura双 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1tiwKe8Eo4/",
        cover: "http://i1.hdslb.com/bfs/archive/1cd977d2ca186b118343a2a09bf286efc835d580.jpg",
        date: "2025-01",
        views: "32.3万",
        event: "直拍",
      },
      {
        title: "K歌之王七机位 太好了是瑞麦  - 秋日信函",
        url: "https://www.bilibili.com/video/BV1hawKeAEhC/",
        cover: "http://i1.hdslb.com/bfs/archive/9e281f73bdf98bed9e95d112dc93f2165f8fb304.jpg",
        date: "2025-01",
        views: "3.2万",
        event: "直拍",
      },
      {
        title: "像我一样七机位 09年歌担深情 - 秋日信函",
        url: "https://www.bilibili.com/video/BV18awKeAEeM/",
        cover: "http://i1.hdslb.com/bfs/archive/5f2df2438063f830e99647d3cc5b0867bee6ebf5.jpg",
        date: "2025-01",
        views: "1.4万",
        event: "直拍",
      },
      {
        title: "guilty双机位 开门 是瑞 - 秋日信函",
        url: "https://www.bilibili.com/video/BV14zwKetEdg/",
        cover: "http://i1.hdslb.com/bfs/archive/dd0e889425ead99be814bc073ba15fabd6eb3fb3.jpg",
        date: "2025-01",
        views: "1.7万",
        event: "直拍",
      },
      {
        title: "伟大的变声期 古风少年一眼万年 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1cmiXYEEgK/",
        cover: "http://i0.hdslb.com/bfs/archive/02d47cae74570b484c57b1244fa51bb473e78c90.jpg",
        date: "2024-12",
        views: "4115",
        event: "直拍",
      },
      {
        title: "TF家族四代公演·BACK S - 秋日信函",
        url: "https://www.bilibili.com/video/BV1WZY6ewE4A/",
        cover: "http://i0.hdslb.com/bfs/archive/4b014bce9d12f8e56f3cdb13e200605f1befe64b.jpg",
        date: "2024-08",
        views: "9143",
        event: "直拍",
      },
      {
        title: "TF家族四代公演· \"Baby - 秋日信函",
        url: "https://www.bilibili.com/video/BV1paYqepEfM/",
        cover: "http://i1.hdslb.com/bfs/archive/3e63a6c24a1e0ff60123ce6d4a55c633ba4aebd6.jpg",
        date: "2024-08",
        views: "3.6万",
        event: "直拍",
      },
      {
        title: "TF家族四代公演· \"七十二变 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1NKYfeSEJt/",
        cover: "http://i1.hdslb.com/bfs/archive/4f3ef1698bae8544b61711e487d88ed242d04948.jpg",
        date: "2024-08",
        views: "3.8万",
        event: "直拍",
      },
      {
        title: "TF家族四代公演·被驯服的象舞 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1eFY9eEEFo/",
        cover: "http://i1.hdslb.com/bfs/archive/a8972ede710ef16dddc9518fde038e55d9da8139.jpg",
        date: "2024-08",
        views: "7124",
        event: "直拍",
      },
      {
        title: "TF家族四代公演·be wha - 秋日信函",
        url: "https://www.bilibili.com/video/BV1dRYXeQEmy/",
        cover: "http://i2.hdslb.com/bfs/archive/04428b2be954854ee1f449aef17f628b3e744ca9.jpg",
        date: "2024-08",
        views: "3.5万",
        event: "直拍",
      },
      {
        title: "TF家族四代公演· 倾情献唱\" - 秋日信函",
        url: "https://www.bilibili.com/video/BV1eFY9eEEGg/",
        cover: "http://i0.hdslb.com/bfs/archive/ad46b18c372ae268626326daa54d1be924bb68e9.jpg",
        date: "2024-08",
        views: "4.3万",
        event: "直拍",
      },
      {
        title: "TF家族四代公演·黑糖秀四机位 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1iRYXeQEJw/",
        cover: "http://i1.hdslb.com/bfs/archive/27fb5900b252e5fc582c1ac1a9265d392852e73c.jpg",
        date: "2024-08",
        views: "1.4万",
        event: "直拍",
      },
      {
        title: "TF家族四代公演·再翻跳Thi - 秋日信函",
        url: "https://www.bilibili.com/video/BV1VcY9eUEio/",
        cover: "http://i2.hdslb.com/bfs/archive/040fdcd798b6fb1150ef5355fd254f6cc053fcb2.jpg",
        date: "2024-08",
        views: "1.2万",
        event: "直拍",
      },
      {
        title: "TF家族四代  公演实力唱跳\" - 秋日信函",
        url: "https://www.bilibili.com/video/BV1BQYXe9EYa/",
        cover: "http://i2.hdslb.com/bfs/archive/7dc9209c16517fe4edbb15ad0364d8dd6d511421.jpg",
        date: "2024-08",
        views: "5.6万",
        event: "直拍",
      },
      {
        title: "TF家族四代公演· \"对面的女 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1ryYXebEeM/",
        cover: "http://i0.hdslb.com/bfs/archive/bc77d19f1188b498d795c0b55119c0f3f64a78b6.jpg",
        date: "2024-08",
        views: "5.5万",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV17i421h7SR/",
        cover: "http://i0.hdslb.com/bfs/archive/befafc56b1cbaa6901d5bdaf52074997e17821fb.jpg",
        date: "2024-07",
        views: "1.4万",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1rx4y1x7bB/",
        cover: "http://i1.hdslb.com/bfs/archive/db4235621b9ede88c2002e4846bf1d0a8c2aeea4.jpg",
        date: "2024-07",
        views: "9911",
        event: "直拍",
      },
      {
        title: "内娱09年练习生翻跳Get A - 秋日信函",
        url: "https://www.bilibili.com/video/BV1E2421A7C7/",
        cover: "http://i0.hdslb.com/bfs/archive/22756d191515e49c692da6b1ff33c1848b9e499f.jpg",
        date: "2024-02",
        views: "1.5万",
        event: "直拍",
      },
      {
        title: "世最萌蜂蜜小熊 TF家族四代练 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1S642137ij/",
        cover: "http://i1.hdslb.com/bfs/archive/05b133735fa9cc7bbccea130d5cdebef7748ed64.jpg",
        date: "2024-02",
        views: "5.0万",
        event: "直拍",
      },
      {
        title: "要说的话 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1hx4y117RY/",
        cover: "http://i0.hdslb.com/bfs/archive/f536385dcaceecfabce1edac261e71f533b756cf.jpg",
        date: "2024-02",
        views: "3.1万",
        event: "新年音乐会",
      },
      {
        title: "老师我们家孩子跳这么好怎么没镜 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1nv42117AU/",
        cover: "http://i1.hdslb.com/bfs/archive/13b5d63d52acce29af8f7c18ef523412dfab30a8.jpg",
        date: "2024-02",
        views: "1.7万",
        event: "新年音乐会",
      },
      {
        title: "编号89757 - 秋日信函",
        url: "https://www.bilibili.com/video/BV19t421h7P4/",
        cover: "http://i1.hdslb.com/bfs/archive/7576b9cb256cd446878ca58caf47cc7ef6928282.jpg",
        date: "2024-02",
        views: "2.9万",
        event: "新年音乐会",
      },
      {
        title: "我不要改变 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1fC411x7bN/",
        cover: "http://i0.hdslb.com/bfs/archive/cc1bb52aef869ac70afb7edabd2a3c953fe9827b.jpg",
        date: "2024-02",
        views: "1.5万",
        event: "直拍",
      },
      {
        title: "再次重逢的世界 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1AU421o7Qv/",
        cover: "http://i2.hdslb.com/bfs/archive/69cb579cc4e2fc1d9fa6e58e1521678c7436aa7a.jpg",
        date: "2024-02",
        views: "1.7万",
        event: "直拍",
      },
      {
        title: "街舞少年 族歌一响 孩子登场  - 秋日信函",
        url: "https://www.bilibili.com/video/BV1NF4m137ja/",
        cover: "http://i2.hdslb.com/bfs/archive/5e032153f76fbcdcfb7fd54f205ce13ab7b560f8.jpg",
        date: "2024-02",
        views: "3.3万",
        event: "新年音乐会",
      },
      {
        title: "TF家族四代练习生 Red&B - 秋日信函",
        url: "https://www.bilibili.com/video/BV14A4m1L7fX/",
        cover: "http://i0.hdslb.com/bfs/archive/1eaa73657ec7b3078159d73b040e8b77039dd102.jpg",
        date: "2024-02",
        views: "3.3万",
        event: "直拍",
      },
      {
        title: "发财发福中国年 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1uy421a7fm/",
        cover: "http://i0.hdslb.com/bfs/archive/d626e196c7225ab54ce1141a1ea3262a796b19c5.jpg",
        date: "2024-02",
        views: "1.9万",
        event: "直拍",
      },
      {
        title: "真正的盛放！TF家族练习生新年 - 秋日信函",
        url: "https://www.bilibili.com/video/BV187421K774/",
        cover: "http://i2.hdslb.com/bfs/archive/0eca16c5cf161e47acb1bcea0c0abe3c045c58fb.jpg",
        date: "2024-02",
        views: "3.9万",
        event: "新年音乐会",
      },
      {
        title: "TF家族盛放新年音乐会半兽人  - 秋日信函",
        url: "https://www.bilibili.com/video/BV1gK421171U/",
        cover: "http://i1.hdslb.com/bfs/archive/4c0c94a676ed6150ea6087b61d2529bf3c416817.jpg",
        date: "2024-02",
        views: "2.0万",
        event: "新年音乐会",
      },
      {
        title: "醉赤壁 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1e2421w7gg/",
        cover: "http://i1.hdslb.com/bfs/archive/f0c4acdcb8af80026c4dbab16cdb1df2d34967b1.jpg",
        date: "2024-02",
        views: "12.6万",
        event: "直拍",
      },
      {
        title: "绝配 - 秋日信函",
        url: "https://www.bilibili.com/video/BV12v421i7Zm/",
        cover: "http://i2.hdslb.com/bfs/archive/79b1b0929bfec89ba123fda1952cd2c7bcada76b.jpg",
        date: "2024-02",
        views: "5.8万",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1Eu4y1B7Sg/",
        cover: "http://i2.hdslb.com/bfs/archive/fd097eaad33cab08c4623888581b9563878123db.jpg",
        date: "2023-08",
        views: "5330",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1qk4y1g7bp/",
        cover: "http://i0.hdslb.com/bfs/archive/f2e999eed2632a351dda8b26b75176b352bc1c8e.jpg",
        date: "2023-08",
        views: "7692",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1U14y1i7aJ/",
        cover: "http://i0.hdslb.com/bfs/archive/fb4008041f9436da01a948e0321fed1384242ec2.jpg",
        date: "2023-08",
        views: "2438",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1P44y1A7PQ/",
        cover: "http://i0.hdslb.com/bfs/archive/be3f0a9447c5f4fb28a476060a41caee7db921cd.jpg",
        date: "2023-08",
        views: "2755",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1Xz4y1p7zA/",
        cover: "http://i2.hdslb.com/bfs/archive/e886a2fab799f2bd4d503ed456548ecc7e057461.jpg",
        date: "2023-08",
        views: "2709",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1oP411s7Ev/",
        cover: "http://i0.hdslb.com/bfs/archive/ecc3be8ed00d1a7170f04a50530c647a55ff7763.jpg",
        date: "2023-08",
        views: "5662",
        event: "直拍",
      },
      {
        title: "TF家族 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1294y1C7so/",
        cover: "http://i2.hdslb.com/bfs/archive/9387432f88caafc4721f96bc6eb2eb737a843a9c.jpg",
        date: "2023-08",
        views: "2794",
        event: "多巴胺",
      },
      {
        title: "‹少年梦工厂-多巴胺图鉴›克卜 - 秋日信函",
        url: "https://www.bilibili.com/video/BV13h4y1C7z6/",
        cover: "http://i0.hdslb.com/bfs/archive/ca629e4c6a22c581a3c71aa52788bb2316ac7030.jpg",
        date: "2023-07",
        views: "5135",
        event: "多巴胺",
      },
      {
        title: "‹少年梦工厂-多巴胺图鉴›＜剩 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1im4y1s73b/",
        cover: "http://i2.hdslb.com/bfs/archive/dda430501b826f789a244eff15d5639b9cc0ba88.jpg",
        date: "2023-07",
        views: "4405",
        event: "多巴胺",
      },
      {
        title: "加油！AMIGO - 秋日信函",
        url: "https://www.bilibili.com/video/BV12L411z7Pi/",
        cover: "http://i1.hdslb.com/bfs/archive/a2ab45cede6e27ae0c4058d008eed809cce0ff96.jpg",
        date: "2023-05",
        views: "2846",
        event: "直拍",
      },
      {
        title: "不完美小孩 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1GM4y1t7w2/",
        cover: "http://i2.hdslb.com/bfs/archive/55ad5d404676f7aabf59bedd0f9901d2b76d9b86.jpg",
        date: "2023-05",
        views: "2365",
        event: "直拍",
      },
      {
        title: "爱人错过 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1rh41157kT/",
        cover: "http://i2.hdslb.com/bfs/archive/c7c15ece161c932bf0454efa049163c681556044.jpg",
        date: "2023-05",
        views: "3209",
        event: "直拍",
      },
      {
        title: "绝配 - 秋日信函",
        url: "https://www.bilibili.com/video/BV15s4y1g7Ky/",
        cover: "http://i0.hdslb.com/bfs/archive/5410cf523105e95140f6bc70896de9f710c961a8.jpg",
        date: "2023-05",
        views: "1847",
        event: "直拍",
      },
      {
        title: "闪耀 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1o24y1N7Eo/",
        cover: "http://i1.hdslb.com/bfs/archive/ab853a65f4769cda9121574db66faf9ea96d3853.jpg",
        date: "2023-05",
        views: "3586",
        event: "直拍",
      },
      {
        title: "世界上的另一个我 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1Wo4y1V7De/",
        cover: "http://i1.hdslb.com/bfs/archive/17a38287adb14d00a098f9e216aa98b8e26e7f8e.jpg",
        date: "2023-05",
        views: "4230",
        event: "直拍",
      },
      {
        title: "是你 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1Ug4y1G7eQ/",
        cover: "http://i0.hdslb.com/bfs/archive/a48d676f92ba29a63e216466ffac93db876f4087.jpg",
        date: "2023-05",
        views: "3173",
        event: "直拍",
      },
      {
        title: "张函瑞 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1yN4y1c7ue/",
        cover: "http://i1.hdslb.com/bfs/archive/7acab26845975267d4e5f22aa2743ecdf4e73ca6.jpg",
        date: "2022-10",
        views: "1141",
        event: "直拍",
      },
      {
        title: "玫瑰少年 - 秋日信函",
        url: "https://www.bilibili.com/video/BV1944y1f7xb/",
        cover: "http://i2.hdslb.com/bfs/archive/2cdbf20593aec026a73dd9266a7f42ea80e16c01.jpg",
        date: "2022-10",
        views: "1602",
        event: "直拍",
      },
    ],
  },
  {
    id: "zp_3546943494031804",
    name: "Karmaismycat",
    initials: "Ka",
    color: "#4fa868",
    bSpace: "https://space.bilibili.com/3546943494031804",
    videos: [
      {
        title: "我要飞 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1At5q6SE2c/",
        cover: "http://i0.hdslb.com/bfs/archive/25e1c75aabb9dd3516857691d27b06030580b881.jpg",
        date: "2026-05",
        views: "2.4万",
        event: "直拍",
      },
      {
        title: "我们的少年时代2 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV15woDBVEq4/",
        cover: "http://i1.hdslb.com/bfs/archive/816a5ac7b7cebbf801b6614198de0a398fe60fdb.jpg",
        date: "2026-04",
        views: "2.1万",
        event: "直拍",
      },
      {
        title: "闭嘴跳舞 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1YX64BAEjd/",
        cover: "http://i2.hdslb.com/bfs/archive/6178fb0400d4abffd224a89b4abb1a4919d9a1f9.jpg",
        date: "2026-02",
        views: "97.1万",
        event: "直拍",
      },
      {
        title: "太阳与地球 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1Wg6tBDEH2/",
        cover: "http://i2.hdslb.com/bfs/archive/c748e3901b23dba529504ee88e01fd44f9efa401.jpg",
        date: "2026-02",
        views: "51.5万",
        event: "直拍",
      },
      {
        title: "希区考克 作品152 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1wU6WBuE3R/",
        cover: "http://i1.hdslb.com/bfs/archive/36f908c78f76ef15d28c4ada24d5b656fbb5074b.jpg",
        date: "2026-02",
        views: "7.3万",
        event: "直拍",
      },
      {
        title: "我是一只鱼 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1wy6HBPEET/",
        cover: "http://i2.hdslb.com/bfs/archive/4f8f762530ff6b00ef4cc397d5bd138b25f5634d.jpg",
        date: "2026-02",
        views: "2.8万",
        event: "直拍",
      },
      {
        title: "借过一下 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1xa6JBeECq/",
        cover: "http://i1.hdslb.com/bfs/archive/9de7bc9a544077a01c79467e6f346c232d0f9fca.jpg",
        date: "2026-02",
        views: "4.0万",
        event: "直拍",
      },
      {
        title: "lovely - Karmaismycat",
        url: "https://www.bilibili.com/video/BV12G6nBKEWZ/",
        cover: "http://i1.hdslb.com/bfs/archive/690191aa7d1cc4a7f54328f35bd3b7d2b265729d.jpg",
        date: "2026-02",
        views: "71.1万",
        event: "直拍",
      },
      {
        title: "随机舞蹈 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1Z1vXBNEq4/",
        cover: "http://i0.hdslb.com/bfs/archive/c46c6e661f1bf9d29015f845ef3a3360ee2958a8.jpg",
        date: "2026-01",
        views: "4.6万",
        event: "直拍",
      },
      {
        title: "想把我唱给你听 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1YPvvBgEAB/",
        cover: "http://i0.hdslb.com/bfs/archive/7cfe7a3aa3453a6e25dda36c4c7e168cb8574c4c.jpg",
        date: "2025-12",
        views: "5.7万",
        event: "直拍",
      },
      {
        title: "只要有你 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1kNvsBfEmd/",
        cover: "http://i1.hdslb.com/bfs/archive/0c7bb992d0ffee1e4b9071c48e128184c34584c0.jpg",
        date: "2025-12",
        views: "23.0万",
        event: "直拍",
      },
      {
        title: "Manta - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1xsvzBGE8g/",
        cover: "http://i2.hdslb.com/bfs/archive/1c2d866cdc64d07b919f1d9b4fdc4f3e18a7160d.jpg",
        date: "2025-12",
        views: "112.3万",
        event: "直拍",
      },
      {
        title: "黄昏晓 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1KwvBBuEjD/",
        cover: "http://i0.hdslb.com/bfs/archive/000f583cb3d56b6fc977f201ae6048d3f813565c.jpg",
        date: "2025-12",
        views: "36.1万",
        event: "直拍",
      },
      {
        title: "街舞少年+卡拉永远OK - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1RYB6BiER7/",
        cover: "http://i2.hdslb.com/bfs/archive/1e750cfba22c937e1c721ebb8a2741f6a32e82e2.jpg",
        date: "2025-12",
        views: "13.4万",
        event: "直拍",
      },
      {
        title: "爱要坦荡荡 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1vvB6BNEa7/",
        cover: "http://i0.hdslb.com/bfs/archive/4f980ac51f185ee26d44477007d00a182c1b6d56.jpg",
        date: "2025-12",
        views: "9.5万",
        event: "直拍",
      },
      {
        title: "适合，不适合 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1oaB6BTE7i/",
        cover: "http://i0.hdslb.com/bfs/archive/25c5f3397a71ddd61360b3d5c832d59363d746f1.jpg",
        date: "2025-12",
        views: "4.4万",
        event: "直拍",
      },
      {
        title: "ON - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1JABzBMEhh/",
        cover: "http://i0.hdslb.com/bfs/archive/86874950f131ee795e16302fadc03d7ca0126c9e.jpg",
        date: "2025-12",
        views: "110.4万",
        event: "直拍",
      },
      {
        title: "野心家 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1pDBiBBEBi/",
        cover: "http://i0.hdslb.com/bfs/archive/c10b0c0da15e69cf5f8c629c5ab50b0cc48aaffc.jpg",
        date: "2025-12",
        views: "124.7万",
        event: "直拍",
      },
      {
        title: "Lucifer - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1GJHVzYEfH/",
        cover: "http://i0.hdslb.com/bfs/archive/3c9c843f3d7b3eed773483274fa984a5bad27c01.jpg",
        date: "2025-10",
        views: "4.6万",
        event: "直拍",
      },
      {
        title: "路灯下的小姑娘 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1e5J9z3Ent/",
        cover: "http://i0.hdslb.com/bfs/archive/261e36decacc9e74e0c7583c6aab343c9b816f6f.jpg",
        date: "2025-09",
        views: "1.7万",
        event: "直拍",
      },
      {
        title: "Deja Vu - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1usJ9zvEFA/",
        cover: "http://i2.hdslb.com/bfs/archive/9978431564fb46b7beb42c66379eb222db9207f7.jpg",
        date: "2025-09",
        views: "4.1万",
        event: "直拍",
      },
      {
        title: "心动 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1QhhRzBERH/",
        cover: "http://i2.hdslb.com/bfs/archive/e10a63af4548c56ef650c5478631a9a3d27529f8.jpg",
        date: "2025-08",
        views: "3.2万",
        event: "直拍",
      },
      {
        title: "Lucifer - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1VVeHzXEVF/",
        cover: "http://i0.hdslb.com/bfs/archive/30bd0c8fb19ed2d876ee70171d421cde3b3531ba.jpg",
        date: "2025-08",
        views: "2.9万",
        event: "直拍",
      },
      {
        title: "成为你想成为的大人 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1dfY9z7Evw/",
        cover: "http://i1.hdslb.com/bfs/archive/273c8ed5fe391e1e521184a655bdf97757b77f15.jpg",
        date: "2025-08",
        views: "2.5万",
        event: "直拍",
      },
      {
        title: "落日只会道别 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1gxYQzAEyn/",
        cover: "http://i1.hdslb.com/bfs/archive/736b492ba219bbc80d17f8890c53524c904d75ca.jpg",
        date: "2025-08",
        views: "1.2万",
        event: "直拍",
      },
      {
        title: "落日只会道别 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1A6YQzXEy7/",
        cover: "http://i2.hdslb.com/bfs/archive/ef8538ab141a79a3c79d12fa78ea26d175b6f758.jpg",
        date: "2025-08",
        views: "1.3万",
        event: "直拍",
      },
      {
        title: "Go in blind - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1xGewzQEDc/",
        cover: "http://i0.hdslb.com/bfs/archive/a45e2217bead55f7476bdd43fdaa0c26ab7b8d09.jpg",
        date: "2025-08",
        views: "5.2万",
        event: "直拍",
      },
      {
        title: "你要的爱 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1eRY4zKEzw/",
        cover: "http://i2.hdslb.com/bfs/archive/3a4899561b78477e57cf61e62e649d9331d2ad4c.jpg",
        date: "2025-08",
        views: "2.6万",
        event: "直拍",
      },
      {
        title: "Centuries - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1QMYnzVEA1/",
        cover: "http://i2.hdslb.com/bfs/archive/73e23fae698a0777018bb0d5633cbb09582b3c29.jpg",
        date: "2025-08",
        views: "34.0万",
        event: "直拍",
      },
      {
        title: "Dirty Work - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1F7YvzeEep/",
        cover: "http://i1.hdslb.com/bfs/archive/3022aba4791d1a4a55b1fac2c53a646d51cfe8fb.jpg",
        date: "2025-08",
        views: "37.3万",
        event: "直拍",
      },
      {
        title: "Go in blind - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1CSYvzrECq/",
        cover: "http://i0.hdslb.com/bfs/archive/e84070a6e884bcc1fd7e2e128ea73ebef1970d05.jpg",
        date: "2025-08",
        views: "7.7万",
        event: "直拍",
      },
      {
        title: "We Are - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1Eftoz7EbX/",
        cover: "http://i1.hdslb.com/bfs/archive/c15564264bc9a24608675c5efe6733e6285d10b9.jpg",
        date: "2025-08",
        views: "4.1万",
        event: "直拍",
      },
      {
        title: "心动 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV18XtdzaEzx/",
        cover: "http://i0.hdslb.com/bfs/archive/e785884366185ccc5963daad10c71764d784d27e.jpg",
        date: "2025-08",
        views: "8.2万",
        event: "直拍",
      },
      {
        title: "落日只会道别 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV11utSzqEhz/",
        cover: "http://i2.hdslb.com/bfs/archive/c1dd7494d0798ed61d995042eda73832e5945a27.jpg",
        date: "2025-08",
        views: "2.8万",
        event: "直拍",
      },
      {
        title: "Deja Vu - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1UDb5z1EFK/",
        cover: "http://i1.hdslb.com/bfs/archive/f75af24b92b23f97d7e103307cf4227f1adfc522.jpg",
        date: "2025-08",
        views: "5.0万",
        event: "直拍",
      },
      {
        title: "Lucifer - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1aEbVzUESV/",
        cover: "http://i2.hdslb.com/bfs/archive/f3dc53cbe49b0597ec63c3c75d875c91762037a8.jpg",
        date: "2025-08",
        views: "20.8万",
        event: "直拍",
      },
      {
        title: "雨爱 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1PKbMzpENB/",
        cover: "http://i0.hdslb.com/bfs/archive/fb93546a0ebb72ae68163d4b94c42173bf41adc0.jpg",
        date: "2025-08",
        views: "8.9万",
        event: "直拍",
      },
      {
        title: "你要的爱 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1QmbNzoEnT/",
        cover: "http://i2.hdslb.com/bfs/archive/5827887e88e80200502601a7a91cdb6773ad60ef.jpg",
        date: "2025-08",
        views: "6.8万",
        event: "直拍",
      },
      {
        title: "路灯下的小姑娘 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1jYbAzbE6J/",
        cover: "http://i0.hdslb.com/bfs/archive/8838a0d53204e24604069f34294592b4d2ee4783.jpg",
        date: "2025-08",
        views: "5.8万",
        event: "直拍",
      },
      {
        title: "Lucifer - Karmaismycat",
        url: "https://www.bilibili.com/video/BV11Btaz9ERL/",
        cover: "http://i1.hdslb.com/bfs/archive/62ace7c506c6ce1a2dce740f92fb89856855e5c8.jpg",
        date: "2025-08",
        views: "103.0万",
        event: "直拍",
      },
      {
        title: "Deja Vu - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1w6t8z1EfU/",
        cover: "http://i2.hdslb.com/bfs/archive/637f1f465865607ddba2c04604cfa5c193619449.jpg",
        date: "2025-08",
        views: "111.1万",
        event: "直拍",
      },
      {
        title: "雨爱 - Karmaismycat",
        url: "https://www.bilibili.com/video/BV1J8thz3EuR/",
        cover: "http://i2.hdslb.com/bfs/archive/50b2caef67d32fcfd7a0886c0597f0d63d8ec433.jpg",
        date: "2025-08",
        views: "4.4万",
        event: "直拍",
      },
    ],
  },
  {
    id: "zp_3546374494750806",
    name: "恋恋丨张函瑞",
    initials: "恋",
    color: "#e76f51",
    bSpace: "https://space.bilibili.com/3546374494750806",
    videos: [
      {
        title: "闭嘴跳舞 - 恋恋",
        url: "https://www.bilibili.com/video/BV1VgFjzDEKZ/",
        cover: "http://i0.hdslb.com/bfs/archive/ec8b9dca70632f545e5153a589c8ca0c902f648c.jpg",
        date: "2026-02",
        views: "9.3万",
        event: "直拍",
      },
      {
        title: "“拥抱的温度，只有你清楚”男高 - 恋恋",
        url: "https://www.bilibili.com/video/BV1MfvqB3ENT/",
        cover: "http://i2.hdslb.com/bfs/archive/98bc0059c9ba0f11e4546f26d3ef42ddeb4fa88b.jpg",
        date: "2025-12",
        views: "3.7万",
        event: "直拍",
      },
      {
        title: "萌力量~o - 恋恋",
        url: "https://www.bilibili.com/video/BV154hCzkEzM/",
        cover: "http://i1.hdslb.com/bfs/archive/91207921b683815b5423433a9f0285ebdc171571.jpg",
        date: "2025-08",
        views: "1.1万",
        event: "直拍",
      },
      {
        title: "𝐂𝐞𝐧𝐭𝐮𝐫𝐢𝐞𝐬 - 恋恋",
        url: "https://www.bilibili.com/video/BV1gCYtzYEXq/",
        cover: "http://i2.hdslb.com/bfs/archive/8fcbab230cebb1096da18e533861b0c40f776b15.jpg",
        date: "2025-08",
        views: "2.1万",
        event: "直拍",
      },
      {
        title: "这期是我定制的男高翻跳Lucifer - 恋恋",
        url: "https://www.bilibili.com/video/BV1R7YbzuEw9/",
        cover: "http://i0.hdslb.com/bfs/archive/2de51c82280929834739f285ada9f5ca6c21922e.jpg",
        date: "2025-08",
        views: "2.0万",
        event: "直拍",
      },
      {
        title: "Go in blind - 恋恋",
        url: "https://www.bilibili.com/video/BV1FnYqzgEMa/",
        cover: "http://i1.hdslb.com/bfs/archive/0665c5acc146fb0c0b3ab56476006e7457d635e2.jpg",
        date: "2025-08",
        views: "8680",
        event: "直拍",
      },
      {
        title: "WeAre - 恋恋",
        url: "https://www.bilibili.com/video/BV14ubvzNEUn/",
        cover: "http://i0.hdslb.com/bfs/archive/97663ab4e6c593bb6a949d533e993187c863a87c.jpg",
        date: "2025-08",
        views: "9973",
        event: "直拍",
      },
      {
        title: "雨爱 - 恋恋",
        url: "https://www.bilibili.com/video/BV1YcthzcEJc/",
        cover: "http://i1.hdslb.com/bfs/archive/292ffe91d5f80293b8db5b3f76ca43b398316823.jpg",
        date: "2025-08",
        views: "1.4万",
        event: "直拍",
      },
      {
        title: "从TF家族借来的猫？！ - 恋恋",
        url: "https://www.bilibili.com/video/BV1iMuHzfEWS/",
        cover: "http://i0.hdslb.com/bfs/archive/08272ea3c31638b8c7ecb5e2009c41f1fc8a6564.jpg",
        date: "2025-07",
        views: "9.3万",
        event: "直拍",
      },
      {
        title: "心动 - 恋恋",
        url: "https://www.bilibili.com/video/BV16NMQzJE2S/",
        cover: "http://i0.hdslb.com/bfs/archive/cd7ebd9d872465ba64960f6115b19a87890b5e35.jpg",
        date: "2025-07",
        views: "17.3万",
        event: "直拍",
      },
      {
        title: "K歌之王 - 恋恋",
        url: "https://www.bilibili.com/video/BV1Q7FMeYENK/",
        cover: "http://i2.hdslb.com/bfs/archive/118cd0921177e063c3cc610f563279c0ee52f62a.jpg",
        date: "2025-01",
        views: "1.5万",
        event: "直拍",
      },
      {
        title: "来看我资助的养成系小孩文艺汇演了 - 恋恋",
        url: "https://www.bilibili.com/video/BV16hf8YgENd/",
        cover: "http://i2.hdslb.com/bfs/archive/cabda5d0ad824c0f3dacb5d6983919ca39a25402.jpg",
        date: "2025-01",
        views: "2.0万",
        event: "直拍",
      },
      {
        title: "超人诞生日记 - 恋恋",
        url: "https://www.bilibili.com/video/BV1s8wae8E2C/",
        cover: "http://i2.hdslb.com/bfs/archive/11171b6e6c6f15067cb4ac9bccba7eb363218295.jpg",
        date: "2025-01",
        views: "8983",
        event: "直拍",
      },
      {
        title: "爱豆最珍贵的新人美时期… - 恋恋",
        url: "https://www.bilibili.com/video/BV17ewxeYEH8/",
        cover: "http://i2.hdslb.com/bfs/archive/87a806654b8933bfa9f9991bb17d8fcdf124ee5a.jpg",
        date: "2025-01",
        views: "5.0万",
        event: "直拍",
      },
      {
        title: "刀剑如梦 - 恋恋",
        url: "https://www.bilibili.com/video/BV1kWwxegEKC/",
        cover: "http://i1.hdslb.com/bfs/archive/2a3ef7ee27dd643233ca8978d827b23d2a76096f.jpg",
        date: "2025-01",
        views: "2774",
        event: "直拍",
      },
      {
        title: "Guilty - 恋恋",
        url: "https://www.bilibili.com/video/BV1CHwxerE6p/",
        cover: "http://i2.hdslb.com/bfs/archive/ea6b1062d6ea8356319f0460998e8f7a0ec6ae72.jpg",
        date: "2025-01",
        views: "4040",
        event: "直拍",
      },
      {
        title: "如果当时 - 恋恋",
        url: "https://www.bilibili.com/video/BV1EgwmebEqz/",
        cover: "http://i2.hdslb.com/bfs/archive/9e34c9326d8a65309c1dac83eb149b5546d3d4c1.jpg",
        date: "2025-01",
        views: "104.4万",
        event: "直拍",
      },
    ],
  },
  {
    id: "zp_3546622789159058",
    name: "椿日-张函瑞",
    initials: "椿",
    color: "#a8dadc",
    bSpace: "https://space.bilibili.com/3546622789159058",
    videos: [
      {
        title: "闭嘴跳舞 - 椿日",
        url: "https://www.bilibili.com/video/BV16NFazuEf6/",
        cover: "http://i0.hdslb.com/bfs/archive/1ed9476889ee476c35ef8b196c2a5b315c79d28a.jpg",
        date: "2026-02",
        views: "7.5万",
        event: "荣耀之战",
      },
      {
        title: "太阳与地球 - 椿日",
        url: "https://www.bilibili.com/video/BV11t64BJExf/",
        cover: "http://i0.hdslb.com/bfs/archive/63f11a1cb50cb63411e2e5ee1a5271cbd192dab9.jpg",
        date: "2026-02",
        views: "3291",
        event: "荣耀之战",
      },
      {
        title: "Lovely - 椿日",
        url: "https://www.bilibili.com/video/BV1vF61BHEqF/",
        cover: "http://i0.hdslb.com/bfs/archive/295369078b07d288d09aa828075e3df0ed39c861.jpg",
        date: "2026-01",
        views: "1.7万",
        event: "荣耀之战",
      },
      {
        title: "我是一只鱼 - 椿日",
        url: "https://www.bilibili.com/video/BV1KJ61BBE4e/",
        cover: "http://i1.hdslb.com/bfs/archive/6d2d3b9ff18332dc86e85b017a08e73365c6eb5c.jpg",
        date: "2026-01",
        views: "6221",
        event: "荣耀之战",
      },
      {
        title: "希区考克 - 椿日",
        url: "https://www.bilibili.com/video/BV1ML61B3EqN/",
        cover: "http://i2.hdslb.com/bfs/archive/95b8e82652ecb9075ba9848f3d1739a0cfd42ed7.jpg",
        date: "2026-01",
        views: "1.4万",
        event: "荣耀之战",
      },
      {
        title: "TF家族2026新年音乐会 - 椿日",
        url: "https://www.bilibili.com/video/BV16VvsBWEAa/",
        cover: "http://i1.hdslb.com/bfs/archive/a1b9a87b94252649ec72a523d063e92b681d0893.jpg",
        date: "2025-12",
        views: "8050",
        event: "新年音乐会",
      },
      {
        title: "我要飞 - 椿日",
        url: "https://www.bilibili.com/video/BV1g3v2BNEpw/",
        cover: "http://i1.hdslb.com/bfs/archive/8c7367978770e714cc8708561fe4cfad4031dc66.jpg",
        date: "2025-12",
        views: "1.3万",
        event: "新年音乐会",
      },
      {
        title: "黄昏晓 - 椿日",
        url: "https://www.bilibili.com/video/BV1GKv2BBEsk/",
        cover: "http://i2.hdslb.com/bfs/archive/a33ecbea81e072f90b6d0cf7a3354e1a3677e386.jpg",
        date: "2025-12",
        views: "7063",
        event: "新年音乐会",
      },
      {
        title: "爱要坦荡荡 4k直拍 - 椿日",
        url: "https://www.bilibili.com/video/BV1CivrBkE8W/",
        cover: "http://i2.hdslb.com/bfs/archive/7cd3b5fd7186dd623dfde72bbd8d640bffeb1bf4.jpg",
        date: "2025-12",
        views: "8158",
        event: "新年音乐会",
      },
      {
        title: "Manta 三机位 Tf家族新年音乐会 - 椿日",
        url: "https://www.bilibili.com/video/BV13ovzBnEiB/",
        cover: "http://i1.hdslb.com/bfs/archive/2939efab6f7101070507e1f2c75155f4138d4cdb.jpg",
        date: "2025-12",
        views: "1.1万",
        event: "新年音乐会",
      },
      {
        title: "野心家4k直拍 - 椿日",
        url: "https://www.bilibili.com/video/BV1NjB6BEEcP/",
        cover: "http://i0.hdslb.com/bfs/archive/18f854124aee366ec7329a247c789a8c50b29a5b.jpg",
        date: "2025-12",
        views: "6230",
        event: "新年音乐会",
      },
      {
        title: "Deja Vu - 椿日",
        url: "https://www.bilibili.com/video/BV1rCeczrEhD/",
        cover: "http://i0.hdslb.com/bfs/archive/c6e0c308d660002cc428db78462a3c29317e2121.jpg",
        date: "2025-08",
        views: "4181",
        event: "直拍",
      },
      {
        title: "GoinBlind - 椿日",
        url: "https://www.bilibili.com/video/BV1D8YbzcEcD/",
        cover: "http://i0.hdslb.com/bfs/archive/587addfd018850b8a75c68d10c4c7e43c8e55e28.jpg",
        date: "2025-08",
        views: "2949",
        event: "直拍",
      },
      {
        title: "猫系爱豆变狼系 lucifer - 椿日",
        url: "https://www.bilibili.com/video/BV1g8YbzwEc1/",
        cover: "http://i1.hdslb.com/bfs/archive/2cca52b3187de307fdef53f613bbb1f5e9055c9f.jpg",
        date: "2025-08",
        views: "2530",
        event: "直拍",
      },
      {
        title: "Deja vu  cover - 椿日",
        url: "https://www.bilibili.com/video/BV1C4YnzcEdx/",
        cover: "http://i0.hdslb.com/bfs/archive/3dbd32a112fad2c84534078c80352090b083f277.jpg",
        date: "2025-08",
        views: "4611",
        event: "直拍",
      },
      {
        title: "你要的爱 - 椿日",
        url: "https://www.bilibili.com/video/BV1y4YnzwE6G/",
        cover: "http://i2.hdslb.com/bfs/archive/2b10a97a3c4d169b42aba924cccd0294554b790c.jpg",
        date: "2025-08",
        views: "2766",
        event: "直拍",
      },
      {
        title: "雨爱玫瑰蒙眼破碎感vocal舞台 - 椿日",
        url: "https://www.bilibili.com/video/BV15xtRzwEGx/",
        cover: "http://i2.hdslb.com/bfs/archive/e15fae7b413628506418916572db206a64383784.jpg",
        date: "2025-08",
        views: "1.3万",
        event: "直拍",
      },
      {
        title: "心扑通扑通跳 - 椿日",
        url: "https://www.bilibili.com/video/BV12otQzVE7t/",
        cover: "http://i0.hdslb.com/bfs/archive/0dd70dbb93c8a2b09051371677973a5fcb199655.jpg",
        date: "2025-08",
        views: "7370",
        event: "直拍",
      },
      {
        title: "成为你想成为的大人 - 椿日",
        url: "https://www.bilibili.com/video/BV1TLb5z6EME/",
        cover: "http://i2.hdslb.com/bfs/archive/51db1f0a42c98aae7fc6e45d933122dc9fb44e84.jpg",
        date: "2025-08",
        views: "5052",
        event: "直拍",
      },
      {
        title: "谁说少年不懂深情？用歌声演绎极 - 椿日",
        url: "https://www.bilibili.com/video/BV1YMbTzwEYb/",
        cover: "http://i1.hdslb.com/bfs/archive/950a640fca774f551364eb346ec2742fb41e1cbb.jpg",
        date: "2025-08",
        views: "1.1万",
        event: "直拍",
      },
      {
        title: "Deja Vu - 椿日",
        url: "https://www.bilibili.com/video/BV1z9tazCEnD/",
        cover: "http://i2.hdslb.com/bfs/archive/0a1077f9813d16b55963abf17940346b99005944.jpg",
        date: "2025-08",
        views: "5526",
        event: "直拍",
      },
      {
        title: "这就是运动会饭撒全场的小爱豆吗 - 椿日",
        url: "https://www.bilibili.com/video/BV1rW88zVEJJ/",
        cover: "http://i2.hdslb.com/bfs/archive/a4ce2d25669cea4592927ea167f978db3875a614.jpg",
        date: "2025-07",
        views: "3432",
        event: "直拍",
      },
      {
        title: "09后练习生精准卡点翻跳Lucifer - 椿日",
        url: "https://www.bilibili.com/video/BV16uuqz5E9E/",
        cover: "http://i2.hdslb.com/bfs/archive/aab5b09e975ab57dd05dd80453893760a47261c2.jpg",
        date: "2025-07",
        views: "8710",
        event: "直拍",
      },
      {
        title: "像我一样 - 椿日",
        url: "https://www.bilibili.com/video/BV17292YiEW6/",
        cover: "http://i2.hdslb.com/bfs/archive/eb59e67e3d4aa0a6b48e63ded7f501b5ed4fcd84.jpg",
        date: "2025-03",
        views: "2349",
        event: "新年音乐会",
      },
      {
        title: "Guilty - 椿日",
        url: "https://www.bilibili.com/video/BV1q9FHejE65/",
        cover: "http://i1.hdslb.com/bfs/archive/225cdb3cdddb5eddc5baa32aeafc4efc3fb53359.jpg",
        date: "2025-01",
        views: "7726",
        event: "新年音乐会",
      },
      {
        title: "街舞少年 - 椿日",
        url: "https://www.bilibili.com/video/BV1zTfLY8Eme/",
        cover: "http://i1.hdslb.com/bfs/archive/b855157468e48cf1ef95ee79e8dc8863cbaae370.jpg",
        date: "2025-01",
        views: "2431",
        event: "新年音乐会",
      },
      {
        title: "笑颜满分天生爱豆cover超人诞生日记 - 椿日",
        url: "https://www.bilibili.com/video/BV1vewYe2E19/",
        cover: "http://i0.hdslb.com/bfs/archive/576a87df3747f905e5d4c66c157468a7bdab87cb.jpg",
        date: "2025-01",
        views: "4741",
        event: "直拍",
      },
      {
        title: "三机位09年练习生倾情翻唱k歌之王 - 椿日",
        url: "https://www.bilibili.com/video/BV178wWetEDp/",
        cover: "http://i1.hdslb.com/bfs/archive/9f08db30c930c05f51bdc49eebae8e3461269f45.jpg",
        date: "2025-01",
        views: "4547",
        event: "直拍",
      },
      {
        title: "刀剑如梦古风侠客燃炸瞬间 - 椿日",
        url: "https://www.bilibili.com/video/BV17Qw1eXEKi/",
        cover: "http://i1.hdslb.com/bfs/archive/ed46e2ed2011b17eb960cb933a658ed3c99c839e.jpg",
        date: "2025-01",
        views: "3409",
        event: "直拍",
      },
      {
        title: "元气满满小甜豆parapara - 椿日",
        url: "https://www.bilibili.com/video/BV1Nqw1eAEE4/",
        cover: "http://i1.hdslb.com/bfs/archive/441ce7f70e3d47f03ff6dcc5fc1c012981af8099.jpg",
        date: "2025-01",
        views: "2273",
        event: "直拍",
      },
      {
        title: "看我七十二变 - 椿日",
        url: "https://www.bilibili.com/video/BV1UFegepEBm/",
        cover: "http://i1.hdslb.com/bfs/archive/e8bf5fa227ba77ee51fa682d83d2c2ec5695b9a2.jpg",
        date: "2024-08",
        views: "1.2万",
        event: "直拍",
      },
      {
        title: "09练习生燃情翻跳少年美 - 椿日",
        url: "https://www.bilibili.com/video/BV1gDeteGEDw/",
        cover: "http://i0.hdslb.com/bfs/archive/5dfb96714347870fcc730b4bde4721ddc4e6aa67.jpg",
        date: "2024-08",
        views: "4450",
        event: "直拍",
      },
      {
        title: "09练习生舞台型人格元气满满 - 椿日",
        url: "https://www.bilibili.com/video/BV1oJebeHEtb/",
        cover: "http://i0.hdslb.com/bfs/archive/d72164af2b1b52a27339ba4904e7208cbe6b49e8.jpg",
        date: "2024-08",
        views: "2791",
        event: "直拍",
      },
      {
        title: "纯白的茉莉花白校服舞台 - 椿日",
        url: "https://www.bilibili.com/video/BV177ebe9E6D/",
        cover: "http://i2.hdslb.com/bfs/archive/68bb9a90d3c42a0d4e3bbe857dddcdb6ccf1007a.jpg",
        date: "2024-08",
        views: "9238",
        event: "直拍",
      },
      {
        title: "曹操古风绝美舞台 - 椿日",
        url: "https://www.bilibili.com/video/BV1WsetecEKe/",
        cover: "http://i0.hdslb.com/bfs/archive/bbcc69ac2c83ad3c2ad4d197695c31b3ec3f27e9.jpg",
        date: "2024-08",
        views: "5033",
        event: "直拍",
      },
      {
        title: "baby～baby夏日养成系舞台 - 椿日",
        url: "https://www.bilibili.com/video/BV1U7Y2eXErw/",
        cover: "http://i1.hdslb.com/bfs/archive/9fbfebd35d357118694c7ea43144cd1eb071bbb6.jpg",
        date: "2024-08",
        views: "4422",
        event: "直拍",
      },
      {
        title: "养成系绝美催泪现场 - 椿日",
        url: "https://www.bilibili.com/video/BV1fvYyeYEum/",
        cover: "http://i2.hdslb.com/bfs/archive/9eef17a51ea71cd27768e5f8c705ded69a02a376.jpg",
        date: "2024-08",
        views: "6.3万",
        event: "直拍",
      },
      {
        title: "09年初中生back seat蒙眼翻跳 - 椿日",
        url: "https://www.bilibili.com/video/BV1NQeceoEhy/",
        cover: "http://i0.hdslb.com/bfs/archive/4176d157f54c1298c4b1c3e2b54672f222c82e54.jpg",
        date: "2024-08",
        views: "1.8万",
        event: "直拍",
      },
      {
        title: "活力初中生夏日运动会闪光part - 椿日",
        url: "https://www.bilibili.com/video/BV1a9eaedERc/",
        cover: "http://i1.hdslb.com/bfs/archive/267e6cf7b721c436951b3e6874aaefd054fd585e.jpg",
        date: "2024-07",
        views: "1241",
        event: "直拍",
      },
      {
        title: "09年弟弟反差感拉满神级舞台N - 椿日",
        url: "https://www.bilibili.com/video/BV15A4m1V7kf/",
        cover: "http://i2.hdslb.com/bfs/archive/7384d4aceb67d6b914e7d31984ef49f74719c3f5.jpg",
        date: "2024-02",
        views: "5518",
        event: "直拍",
      },
      {
        title: "内娱14岁练习生误入年末大赏翻 - 椿日",
        url: "https://www.bilibili.com/video/BV17U421o7bR/",
        cover: "http://i2.hdslb.com/bfs/archive/ce3694693f2a177c33d1c0a58a3f1b0b88b4ade4.jpg",
        date: "2024-02",
        views: "3773",
        event: "直拍",
      },
      {
        title: "半兽人 - 椿日",
        url: "https://www.bilibili.com/video/BV1KF4m1g7HG/",
        cover: "http://i2.hdslb.com/bfs/archive/02d98f75fbdda5c89931479bf65797710541d287.jpg",
        date: "2024-02",
        views: "6563",
        event: "直拍",
      },
      {
        title: "编号89757 - 椿日",
        url: "https://www.bilibili.com/video/BV1YF4m1T7MQ/",
        cover: "http://i2.hdslb.com/bfs/archive/346bdb3c9504ce7df06d5054c7ccfe338202bef4.jpg",
        date: "2024-02",
        views: "2.9万",
        event: "直拍",
      },
    ],
  }
]

// ════════════════════════════════════════════
//  Stable random helpers (SSR-safe)
// ════════════════════════════════════════════
function seededRand(seed) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

// ════════════════════════════════════════════
//  STICKERS
// ════════════════════════════════════════════
const STICKERS = [
  { s:"🌸",size:22,x:4, y:8, dur:14,delay:0   },
  { s:"✨",size:16,x:12,y:55,dur:11,delay:1.2 },
  { s:"🍃",size:20,x:22,y:20,dur:16,delay:0.5 },
  { s:"💚",size:14,x:33,y:72,dur:12,delay:2.1 },
  { s:"⭐",size:18,x:47,y:15,dur:15,delay:0.8 },
  { s:"🌿",size:24,x:58,y:80,dur:13,delay:3.0 },
  { s:"🌼",size:20,x:68,y:38,dur:17,delay:1.6 },
  { s:"💫",size:16,x:76,y:60,dur:10,delay:0.3 },
  { s:"🍀",size:18,x:85,y:25,dur:14,delay:2.4 },
  { s:"🎀",size:22,x:92,y:70,dur:16,delay:0.9 },
  { s:"💌",size:16,x:8, y:85,dur:11,delay:1.8 },
  { s:"🌸",size:14,x:41,y:48,dur:18,delay:4.0 },
  { s:"✿", size:20,x:55,y:92,dur:13,delay:2.7 },
  { s:"🫧", size:18,x:18,y:42,dur:15,delay:0.6 },
  { s:"🌷",size:22,x:79,y:10,dur:12,delay:3.5 },
]
function FloatingDeco() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      {STICKERS.map((item,i)=>(
        <span key={i} style={{
          position:"absolute",left:`${item.x}%`,top:`${item.y}%`,
          fontSize:item.size,opacity:0.10,
          animation:`sticker${i%3} ${item.dur}s ease-in-out ${item.delay}s infinite alternate`,
          willChange:"transform",
        }}>{item.s}</span>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════
//  Lightbox (支持视频)
// ════════════════════════════════════════════
function Lightbox({ src, onClose }) {
  const isVideo = src && src.match(/\.(mov|mp4|webm)$/i)
  useEffect(()=>{
    const h=(e)=>{ if(e.key==="Escape") onClose() }
    window.addEventListener("keydown",h)
    return ()=>window.removeEventListener("keydown",h)
  },[onClose])
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:2000,
      background:"rgba(8,18,12,0.88)",backdropFilter:"blur(14px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      animation:"fadeIn 0.2s ease",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:"92vw",maxHeight:"92vh"}}>
        {isVideo
          ? <video src={src} controls autoPlay loop muted={false} style={{maxWidth:"85vw",maxHeight:"85vh",borderRadius:20,boxShadow:"0 32px 80px rgba(0,0,0,0.5)",display:"block"}} />
          : <img src={src} style={{maxWidth:"85vw",maxHeight:"85vh",borderRadius:20,boxShadow:"0 32px 80px rgba(0,0,0,0.5)",display:"block"}} />
        }
        <button onClick={onClose} style={{
          position:"absolute",top:-14,right:-14,width:34,height:34,borderRadius:"50%",
          background:"rgba(255,255,255,0.95)",border:"1px solid rgba(200,230,208,0.6)",
          cursor:"pointer",fontSize:14,boxShadow:"0 4px 16px rgba(0,0,0,0.18)",
          display:"flex",alignItems:"center",justifyContent:"center",color:"#3a6646",fontWeight:700,
        }}>✕</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
//  NavSection (sidebar collapsible)
// ════════════════════════════════════════════
function NavSection({ emoji, title, children }) {
  const [open,setOpen]=useState(false)
  return (
    <div style={{marginBottom:2}}>
      <button onClick={()=>setOpen(v=>!v)} style={{
        width:"100%",textAlign:"left",
        background:open?"rgba(106,173,126,0.12)":"transparent",
        border:"none",borderRadius:10,cursor:"pointer",
        padding:"9px 12px",fontWeight:600,fontSize:13,
        color:"#2e5c3a",display:"flex",alignItems:"center",gap:8,
        fontFamily:"inherit",transition:"background 0.18s",
      }}>
        <span style={{fontSize:14}}>{emoji}</span>
        <span>{title}</span>
        <span style={{marginLeft:"auto",fontSize:9,opacity:0.4,border:"1px solid rgba(46,107,62,0.25)",borderRadius:4,padding:"1px 5px",lineHeight:1.4}}>
          {open?"▲":"▼"}
        </span>
      </button>
      {open&&(
        <div style={{paddingLeft:6,marginTop:2,animation:"slideDown 0.2s ease"}}>
          {children}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
//  那年今日
// ════════════════════════════════════════════
function ThatDayWidget({ weibo }) {
  const [collapsed,setCollapsed]=useState(false)
  const [lightbox,setLightbox]=useState(null)
  const [showAllToday,setShowAllToday]=useState(false)
  const now=new Date()
  const birthdayThisYear = new Date(now.getFullYear(), 9, 18)
  const nextBirthday = now > birthdayThisYear ? new Date(now.getFullYear()+1, 9, 18) : birthdayThisYear
  const birthdayDays = Math.ceil((nextBirthday.setHours(0,0,0,0)-new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime())/86400000)
  const todayMD=`${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
  const todayImgs=[]
  weibo.forEach(({month,imageFiles,images})=>{
    const files=imageFiles||[]
    files.forEach((item,idx)=>{
      const filename=typeof item==="object"?item.filename:item
      const url=typeof item==="object"?item.url:images[idx]
      const source=`${filename||""} ${url||""}`
      const mdMatch=source.match(/(?:^|[^\d])(?:\d{4}[-_.])?(\d{2})[-_.](\d{2})(?:[^\d]|$)/)
      if(mdMatch&&`${mdMatch[1]}-${mdMatch[2]}`===todayMD) todayImgs.push({url,year:month.split("-")[0]})
    })
  })
  const visibleTodayImgs = showAllToday ? todayImgs : todayImgs.slice(0,9)
  const hasMoreTodayImgs = todayImgs.length > 9
  return (
    <>
      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}
      <div style={{
        position:"fixed",right:16,top:"50%",transform:"translateY(-50%)",
        zIndex:300,width:collapsed?44:200,
        transition:"width 0.3s cubic-bezier(.25,.8,.25,1)",
      }}>
        <div style={{
          background:"rgba(240,250,243,0.82)",
          backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
          border:"1px solid rgba(195,228,206,0.6)",
          borderRadius:18,overflow:"hidden",
          boxShadow:"0 8px 32px rgba(40,100,56,0.14)",
        }}>
          <button onClick={()=>setCollapsed(v=>!v)} style={{
            width:"100%",background:"transparent",border:"none",cursor:"pointer",
            padding:collapsed?"12px 0":"11px 13px",
            display:"flex",alignItems:"center",gap:8,fontFamily:"inherit",
            justifyContent:collapsed?"center":"flex-start",
          }}>
            <span style={{fontSize:15,flexShrink:0}}>📅</span>
            {!collapsed&&(
              <>
                <span style={{fontSize:11.5,fontWeight:700,color:"#1b3d24",whiteSpace:"nowrap"}}>那年今日</span>
                <span style={{marginLeft:"auto",fontSize:9,color:"#7aaa88",opacity:0.7}}>◀</span>
              </>
            )}
          </button>
          {!collapsed&&(
            <div style={{padding:"0 11px 13px"}}>
              <div style={{fontSize:9.5,color:"#7aaa88",fontWeight:600,letterSpacing:"0.05em",marginBottom:7,paddingBottom:6,borderBottom:"1px solid rgba(195,228,206,0.4)"}}>
                {String(now.getMonth()+1).padStart(2,"0")}/{String(now.getDate()).padStart(2,"0")} 的记忆 ✨
              </div>
              {todayImgs.length===0
                ?<div style={{textAlign:"center",padding:"14px 0",fontSize:10.5,color:"#a4c8ae"}}>💌 今天暂无往年记录</div>
                :<>
                  <div style={{
                    display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,
                    maxHeight:showAllToday?320:"none",overflowY:showAllToday?"auto":"visible",
                  }}>
                    {visibleTodayImgs.map((item,i)=>(
                      <div key={`${item.url}-${i}`} onClick={()=>setLightbox(item.url)}
                        style={{position:"relative",borderRadius:8,overflow:"hidden",cursor:"pointer",border:"1px solid rgba(195,228,206,0.5)",background:"rgba(255,255,255,0.5)",transition:"transform 0.18s"}}
                        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
                        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                      >
                        <img src={item.url} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>
                        <div style={{
                          position:"absolute",left:3,bottom:3,
                          fontSize:8,color:"#fff",fontWeight:800,lineHeight:1,
                          background:"rgba(35,80,48,0.58)",borderRadius:100,padding:"2px 4px",
                          textShadow:"0 1px 2px rgba(0,0,0,0.25)",
                        }}>{item.year}</div>
                      </div>
                    ))}
                  </div>
                  {hasMoreTodayImgs&&(
                    <button onClick={()=>setShowAllToday(v=>!v)} style={{
                      width:"100%",marginTop:7,padding:"5px 0",
                      border:"1px solid rgba(195,228,206,0.55)",borderRadius:8,
                      background:"rgba(255,255,255,0.42)",cursor:"pointer",
                      color:"#4a7a58",fontSize:10,fontWeight:700,fontFamily:"inherit",
                    }}>
                      {showAllToday?"收起":"查看更多"} · {todayImgs.length} 张
                    </button>
                  )}
                </>
              }
              <div style={{
                marginTop:9,paddingTop:8,
                borderTop:"1px solid rgba(195,228,206,0.35)",
                display:"flex",alignItems:"center",gap:7,
              }}>
                <span style={{fontSize:13}}>🎂</span>
                <span style={{fontSize:10,color:"#7aaa88",fontWeight:700,whiteSpace:"nowrap"}}>生日倒数</span>
                <span style={{marginLeft:"auto",fontSize:10.5,color:"#4a7a58",fontWeight:800}}>
                  {birthdayDays} 天
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════
//  Music Player
// ════════════════════════════════════════════
function MusicPlayer({ bgmList }) {
  const [idx,setIdx]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [volume,setVolume]=useState(0.5)
  const [mini,setMini]=useState(false)
  const [showPlaylist,setShowPlaylist]=useState(false)
  const [dragIdx,setDragIdx]=useState(null)
  const [progress,setProgress]=useState(0)
  const [duration,setDuration]=useState(0)
  const audioRef=useRef(null)
  const fadeRef=useRef(null)

  useEffect(()=>{
    const onVideoPlay=()=>{
      const audio=audioRef.current
      if(audio&&!audio.paused){ audio.pause(); setPlaying(false) }
    }
    window.addEventListener("video-play",onVideoPlay)
    return ()=>window.removeEventListener("video-play",onVideoPlay)
  },[])

  const fadeTo=(targetVol,cb)=>{
    const audio=audioRef.current
    if(!audio) return
    if(fadeRef.current) clearInterval(fadeRef.current)
    const step=targetVol>audio.volume?0.05:-0.05
    fadeRef.current=setInterval(()=>{
      const next=Math.min(1,Math.max(0,audio.volume+step))
      audio.volume=next
      if((step>0&&next>=targetVol)||(step<0&&next<=targetVol)){
        clearInterval(fadeRef.current)
        audio.volume=targetVol
        if(cb) cb()
      }
    },40)
  }

  const togglePlay=()=>{
    const audio=audioRef.current
    if(!audio) return
    if(playing){
      fadeTo(0,()=>{ audio.pause(); setPlaying(false); audio.volume=volume })
    } else {
      audio.play().then(()=>{ audio.volume=0; fadeTo(volume); setPlaying(true) }).catch(()=>{})
    }
  }

  const changeTrack=(dir)=>{
    const audio=audioRef.current
    if(!audio||bgmList.length===0) return
    fadeTo(0,()=>{
      audio.pause()
      const next=(idx+dir+bgmList.length)%bgmList.length
      setIdx(next)
      setProgress(0)
      setDuration(0)
      setTimeout(()=>{
        audio.load()
        audio.volume=0
        audio.play().then(()=>{ fadeTo(volume); setPlaying(true) }).catch(()=>{})
      },80)
    })
  }

  const handleVolChange=(e)=>{
    const v=parseFloat(e.target.value)
    setVolume(v)
    if(audioRef.current) audioRef.current.volume=v
  }

  const handleEnded=()=>changeTrack(1)

  if(bgmList.length===0) return null
  const song=bgmList[idx]

  return (
    <>
      <audio ref={audioRef} src={encodeURI(song.url)} onEnded={handleEnded} preload="none"
        onTimeUpdate={()=>{ const a=audioRef.current; if(a) setProgress(a.currentTime) }}
        onLoadedMetadata={()=>{ const a=audioRef.current; if(a) setDuration(a.duration) }}
      />
      <div style={{
        position:"fixed",bottom:24,right:mini?16:20,
        zIndex:500,
        width:mini?52:(window.innerWidth<768?220:280),
        transition:"all 0.35s cubic-bezier(.25,.8,.25,1)",
      }}>
        {mini?(
          // 迷你模式：只显示碟片按钮
          <button onClick={()=>setMini(false)} style={{
            width:52,height:52,borderRadius:"50%",border:"none",cursor:"pointer",
            background:"rgba(240,250,243,0.85)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",
            boxShadow:"0 4px 20px rgba(40,100,56,0.2),inset 0 1px 0 rgba(255,255,255,0.6)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
            animation:playing?"vinylSpin 3s linear infinite":"none",
          }}>🎵</button>
        ):(
          <div style={{
            background:"rgba(240,250,243,0.78)",
            backdropFilter:"blur(22px)",WebkitBackdropFilter:"blur(22px)",
            border:"1px solid rgba(195,228,206,0.65)",
            borderRadius:20,padding:"14px 16px",
            boxShadow:"0 8px 36px rgba(40,100,56,0.16),inset 0 1px 0 rgba(255,255,255,0.55)",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:10}}>
              {/* 黑胶唱片 */}
              <div style={{
                width:42,height:42,borderRadius:"50%",flexShrink:0,
                background:"radial-gradient(circle at 50% 50%,rgba(180,230,195,0.9) 0%,rgba(100,160,120,0.85) 28%,rgba(40,80,55,0.9) 55%,rgba(25,55,38,0.95) 100%)",
                border:"2px solid rgba(195,228,206,0.5)",
                boxShadow:"0 2px 12px rgba(40,100,56,0.22)",
                animation:playing?"vinylSpin 3s linear infinite":"none",
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                position:"relative",
              }} onClick={togglePlay}>
                <div style={{width:10,height:10,borderRadius:"50%",background:"rgba(240,250,243,0.9)",boxShadow:"0 0 0 2px rgba(155,210,168,0.4)"}}/>
                {/* 波纹 */}
                {playing&&[0,1].map(r=>(
                  <div key={r} style={{
                    position:"absolute",inset:-(r+1)*5,borderRadius:"50%",
                    border:"1px solid rgba(79,168,104,0.3)",
                    animation:`waveRipple 2s ease-out ${r*0.8}s infinite`,
                    pointerEvents:"none",
                  }}/>
                ))}
              </div>

              {/* 歌曲信息 */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{
                  fontSize:11.5,fontWeight:700,color:"var(--c-ink)",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                  letterSpacing:"-0.01em",
                }}>{song.name}</div>
                <div style={{fontSize:9.5,color:"var(--c-muted)",marginTop:2,fontWeight:500}}>
                  {playing?"♪ 播放中":"已暂停"} · {idx+1}/{bgmList.length}
                </div>
              </div>

              <button onClick={()=>setShowPlaylist(v=>!v)} style={{
                width:22,height:22,borderRadius:"50%",border:`1px solid ${showPlaylist?"rgba(79,168,104,0.6)":"rgba(195,228,206,0.5)"}`,
                background:showPlaylist?"rgba(79,168,104,0.2)":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:9,color:"var(--c-muted)",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              }}>☰</button>
              {/* 折叠按钮 */}
              <button onClick={()=>setMini(true)} style={{
                width:22,height:22,borderRadius:"50%",border:"1px solid rgba(195,228,206,0.5)",
                background:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:9,color:"var(--c-muted)",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              }}>▼</button>
            </div>

            {/* 控制区 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
              <button onClick={()=>changeTrack(-1)} style={playerBtn}>⏮</button>
              <button onClick={togglePlay} style={{
                ...playerBtn,
                width:32,height:32,background:"rgba(79,168,104,0.2)",
                border:"1px solid rgba(79,168,104,0.4)",fontSize:14,
              }}>{playing?"⏸":"▶"}</button>
              <button onClick={()=>changeTrack(1)} style={playerBtn}>⏭</button>
            </div>

            {/* 进度条 */}
            <div style={{marginBottom:8}}>
              <input type="range" min="0" max={duration||100} step="0.1" value={progress}
                onChange={e=>{ const v=parseFloat(e.target.value); if(audioRef.current) audioRef.current.currentTime=v; setProgress(v) }}
                style={{width:"100%",accentColor:"#4fa868",height:3,cursor:"pointer",display:"block"}}
              />
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--c-faint)",marginTop:2}}>
                <span>{isNaN(progress)?'0:00':`${Math.floor(progress/60)}:${String(Math.floor(progress%60)).padStart(2,'0')}`}</span>
                <span>{isNaN(duration)||duration===0?'--:--':`${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}`}</span>
              </div>
            </div>

            {/* 音量 */}
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:11,color:"var(--c-muted)"}}>🔈</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolChange}
                style={{flex:1,accentColor:"#4fa868",height:3,cursor:"pointer"}}
              />
              <span style={{fontSize:11,color:"var(--c-muted)"}}>🔊</span>
            </div>
            {showPlaylist&&(
              <div style={{marginTop:10,borderTop:"1px solid rgba(195,228,206,0.4)",paddingTop:10,maxHeight:200,overflowY:"auto"}}>
                {bgmList.map((track,i)=>(
                  <div key={track.url} draggable
                    onDragStart={()=>setDragIdx(i)}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={()=>{
                      if(dragIdx===null||dragIdx===i){setDragIdx(null);return}
                      setDragIdx(null)
                    }}
                    onClick={()=>{ setIdx(i); setPlaying(false); setTimeout(()=>{ audioRef.current?.play().then(()=>setPlaying(true)).catch(()=>{}) },50) }}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"5px 6px",borderRadius:8,cursor:"pointer",background:i===idx?"rgba(79,168,104,0.15)":"transparent",transition:"background 0.15s",userSelect:"none"}}
                    onMouseEnter={e=>{ if(i!==idx) e.currentTarget.style.background="rgba(79,168,104,0.08)" }}
                    onMouseLeave={e=>{ if(i!==idx) e.currentTarget.style.background="transparent" }}
                  >
                    <span style={{fontSize:9,color:"var(--c-faint)",flexShrink:0}}>⠿</span>
                    <span style={{fontSize:10,color:i===idx?"#4fa868":"var(--c-ink-2)",fontWeight:i===idx?700:400,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.name}</span>
                    {i===idx&&<span style={{fontSize:9,color:"#4fa868",flexShrink:0}}>♪</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
const playerBtn={
  width:26,height:26,borderRadius:"50%",border:"1px solid rgba(195,228,206,0.55)",
  background:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11,color:"var(--c-ink-2)",
  display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",
  transition:"background 0.15s",
}

// ════════════════════════════════════════════
//  IntroLoading
// ════════════════════════════════════════════
function IntroLoading({ onDone }) {
  const [p,setP]=useState(0)
  const days=Math.floor((Date.now()-new Date("2009-10-19").getTime())/86400000)
  useEffect(()=>{
    let v=0
    const t=setInterval(()=>{
      v+=Math.random()*9+4
      setP(Math.min(100,v))
      if(v>=100){ clearInterval(t); setTimeout(onDone,500) }
    },100)
    return ()=>clearInterval(t)
  },[onDone])
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9999,
      background:"rgba(215,242,222,0.48)",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:18,
      fontFamily:"'Noto Sans SC','PingFang SC',sans-serif",animation:"fadeIn 0.4s ease",
    }}>
      <div style={{
        width:64,height:64,
        background:"linear-gradient(135deg,rgba(185,228,202,0.9),rgba(142,203,160,0.85))",
        backdropFilter:"blur(8px)",border:"1px solid rgba(195,228,206,0.5)",
        borderRadius:20,fontSize:32,display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow:"0 8px 28px rgba(40,100,56,0.2)",animation:"wiggle 2s ease-in-out infinite",
      }}>🌿</div>
      <div style={{textAlign:"center",lineHeight:2}}>
        <div style={{fontSize:12,color:"var(--c-muted)",fontWeight:500,letterSpacing:"0.07em",marginBottom:4}}>✨ 欢迎来到 Rui House ✨</div>
        <div style={{fontSize:16,fontWeight:800,color:"var(--c-ink)"}}>张函瑞来到这个地球上</div>
        <div style={{fontSize:40,fontWeight:900,color:"var(--c-accent)",lineHeight:1.1,textShadow:"0 2px 20px rgba(79,168,104,0.3)"}}>
          {days.toLocaleString()}
        </div>
        <div style={{fontSize:16,fontWeight:800,color:"var(--c-ink)"}}>天</div>
      </div>
      <div style={{width:220,height:5,background:"rgba(155,210,168,0.22)",border:"1px solid rgba(155,210,168,0.35)",borderRadius:100,overflow:"hidden"}}>
        <div style={{width:`${p}%`,height:"100%",background:"linear-gradient(90deg,#6aad7e,#4a9a68,#7acc88)",borderRadius:100,transition:"width 0.08s ease"}}/>
      </div>
      <div style={{fontSize:10.5,color:"var(--c-muted)",fontWeight:600,letterSpacing:"0.06em"}}>{Math.floor(p)} %</div>
    </div>
  )
}

// ════════════════════════════════════════════
//  EmojiRain
// ════════════════════════════════════════════
function EmojiRain() {
  const [items,setItems]=useState([])
  useEffect(()=>{
    const id=setInterval(()=>{
      if(items.length>12) return
      const ni={id:Math.random(),x:Math.random()*100,e:["🌿","🍃","💚","✨","💌"][Math.floor(Math.random()*5)]}
      setItems(v=>[...v,ni])
      setTimeout(()=>setItems(v=>v.filter(i=>i.id!==ni.id)),12000)
    },3000)
    return ()=>clearInterval(id)
  },[items.length])
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {items.map(i=>(
        <div key={i.id} style={{position:"absolute",left:`${i.x}%`,top:"-20px",opacity:0.13,fontSize:17,animation:"fall 12s linear forwards"}}>{i.e}</div>
      ))}
      <style dangerouslySetInnerHTML={{__html:`@keyframes fall{0%{transform:translateY(-10vh) translateX(0) rotate(0deg);opacity:0}10%{opacity:0.2}100%{transform:translateY(110vh) translateX(20px) rotate(180deg);opacity:0}}`}}/>
    </div>
  )
}

// ════════════════════════════════════════════
//  MouseTrail
// ════════════════════════════════════════════
function MouseTrail() {
  const [trail,setTrail]=useState([])
  useEffect(()=>{
    const h=(e)=>{
      const id=Date.now()+Math.random()
      setTrail(t=>[...t.slice(-14),{x:e.clientX,y:e.clientY,id}])
      setTimeout(()=>setTrail(t=>t.filter(i=>i.id!==id)),900)
    }
    window.addEventListener("mousemove",h)
    return ()=>window.removeEventListener("mousemove",h)
  },[])
  return (
    <>
      {trail.map(p=>(
        <span key={p.id} style={{position:"fixed",left:p.x,top:p.y,transform:"translate(-50%,-50%)",fontSize:11,pointerEvents:"none",opacity:0.38,transition:"opacity 0.9s linear",zIndex:9998}}>✨</span>
      ))}
    </>
  )
}

// ════════════════════════════════════════════
//  BreathingGlow
// ════════════════════════════════════════════
function BreathingGlow() {
  const h=new Date().getHours()
  let c1,c2
  if(h>=5&&h<10){c1="rgba(215,242,200,0.18)";c2="rgba(200,235,180,0.12)"}
  else if(h>=10&&h<18){c1="rgba(195,240,210,0.16)";c2="rgba(175,235,196,0.10)"}
  else{c1="rgba(160,210,200,0.12)";c2="rgba(140,190,210,0.08)"}
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
      background:`radial-gradient(circle at 28% 18%,${c1},transparent 52%),radial-gradient(circle at 72% 62%,${c2},transparent 58%)`,
      animation:"breathGlow 8s ease-in-out infinite alternate",
    }}/>
  )
}

// ════════════════════════════════════════════
//  图片代理工具函数
// ════════════════════════════════════════════
function biliImgProxy(url: string): string {
  if (!url) return ""
  // 已经是代理地址就不重复处理
  if (url.startsWith("/api/bili-img")) return url
  // 只代理B站图片域名
  if (url.includes("hdslb.com")) return `/api/bili-img?url=${encodeURIComponent(url)}`
  return url
}

// ════════════════════════════════════════════
//  useBiliCover — 自动拉取B站封面 hook
// ════════════════════════════════════════════
const _biliCoverCache: Record<string,any> = {}

function useBiliCover(bvid: string, prefillCover?: string, prefillTitle?: string) {
  // 如果已有封面直接走代理，不请求API
  const hasRealCover = !!prefillCover
  const [state, setState] = useState<{cover:string,title:string,loading:boolean,error:boolean}>(() => {
    if (hasRealCover) return { cover: biliImgProxy(prefillCover), title: prefillTitle||"", loading: false, error: false }
    if (_biliCoverCache[bvid]) return _biliCoverCache[bvid]
    return { cover: "", title: prefillTitle||"", loading: true, error: false }
  })

  useEffect(() => {
    if (hasRealCover) return
    if (_biliCoverCache[bvid]) { setState(_biliCoverCache[bvid]); return }
    // 跳过占位 BV 号
    if (!bvid || bvid.length < 10 || bvid.startsWith("BVkaohe") || bvid.startsWith("BVgeren") || bvid.startsWith("BVbianzou")) {
      const s = { cover:"", title:prefillTitle||"", loading:false, error:true }
      _biliCoverCache[bvid] = s; setState(s); return
    }
    let cancelled = false
    fetch(`/api/bili-cover?bvid=${bvid}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const s = data.error
          ? { cover:"", title:prefillTitle||"", loading:false, error:true }
          : { cover:biliImgProxy(data.cover), title:data.title||prefillTitle||"", loading:false, error:false }
        _biliCoverCache[bvid] = s; setState(s)
      })
      .catch(() => {
        if (cancelled) return
        const s = { cover:"", title:prefillTitle||"", loading:false, error:true }
        _biliCoverCache[bvid] = s; setState(s)
      })
    return () => { cancelled = true }
  }, [bvid])

  return state
}

// ════════════════════════════════════════════
//  BiliBili 视频卡片组件
// ════════════════════════════════════════════
function BiliCard({ video }) {
  const [imgError, setImgError] = useState(false)
  // 自动拉取封面；如果 video.cover 已经填好就直接用，不发请求
  const { cover, title, loading } = useBiliCover(video.bvid, video.cover||"", video.title)
  const displayCover = cover || video.cover || ""
  const displayTitle = title || video.title || ""

  return (
    <a href={video.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",display:"block"}}>
      <div style={{
        borderRadius:12, overflow:"hidden", cursor:"pointer",
        background:"rgba(240,250,243,0.55)",
        backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
        border:"1px solid rgba(195,228,206,0.5)",
        boxShadow:"0 2px 10px rgba(40,100,56,0.07)",
        transition:"transform 0.22s, box-shadow 0.22s",
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(40,100,56,0.16)"}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 10px rgba(40,100,56,0.07)"}}
      >
        {/* 封面 */}
        <div style={{position:"relative",aspectRatio:"16/9",background:"rgba(160,210,172,0.2)",overflow:"hidden"}}>
          {loading ? (
            /* 加载中骨架 */
            <div style={{
              width:"100%",height:"100%",
              background:"linear-gradient(90deg,rgba(195,228,206,0.3) 25%,rgba(162,214,174,0.5) 50%,rgba(195,228,206,0.3) 75%)",
              backgroundSize:"200% 100%",
              animation:"shimmer 1.4s infinite",
            }}/>
          ) : displayCover && !imgError ? (
            <img src={displayCover} alt={displayTitle} onError={()=>setImgError(true)}
              style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          ) : (
            <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
              <div style={{fontSize:28}}>🎬</div>
              <div style={{fontSize:10,color:"var(--c-muted)"}}>点击前往B站</div>
            </div>
          )}
          {/* B站角标 */}
          <div style={{position:"absolute",top:6,left:6,background:"rgba(0,161,214,0.85)",borderRadius:5,padding:"2px 7px",fontSize:9,fontWeight:700,color:"#fff",letterSpacing:"0.04em"}}>bilibili</div>
          {/* 播放浮层 */}
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.2)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}
          >
            <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,opacity:0,transition:"opacity 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="1"}
              onMouseLeave={e=>e.currentTarget.style.opacity="0"}
            >▶</div>
          </div>
        </div>
        {/* 标题 */}
        <div style={{padding:"8px 11px 10px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--c-ink)",letterSpacing:"0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {displayTitle}
          </div>
        </div>
      </div>
    </a>
  )
}

// ════════════════════════════════════════════
//  Works Section（B站版）
// ════════════════════════════════════════════
function WorksSection({ workCategories }) {
  const tabs=["舞台","考核","编曲","直拍","抖音","百万视频"]
  const [activeTab,setActiveTab]=useState("舞台")

  return (
    <div>
      {/* Tabs */}
      <div className="tabs-scroll" style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{
            padding:"6px 16px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
            border:"1px solid",transition:"all 0.18s",
            ...(activeTab===t
              ?{background:"linear-gradient(135deg,rgba(162,214,174,0.6),rgba(130,190,152,0.45))",borderColor:"rgba(120,185,142,0.7)",color:"var(--c-ink)",boxShadow:"0 2px 10px rgba(40,100,56,0.12)"}
              :{background:"rgba(255,255,255,0.38)",borderColor:"rgba(195,228,206,0.5)",color:"var(--c-muted)"}
            ),
          }}>{t}</button>
        ))}
      </div>

      {activeTab==="直拍" && <ZhipaiSection/>}
      {activeTab==="抖音" && <DouyinSection/>}
      {activeTab==="百万视频" && <BaiwanSection/>}
      {activeTab==="编曲" && <BianzouSection/>}
      {(activeTab==="舞台"||activeTab==="考核") && <BiliTabContent tab={activeTab}/>}
    </div>
  )
}

// 百万视频：一行三个，无月份导航
function BaiwanSection() {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
      {BAIWANWUTAI_DATA.map((v,i)=><BiliCard key={`${v.bvid}-${i}`} video={v}/>)}
    </div>
  )
}

// 舞台/考核：三列网格 + 右侧月份导航
function BiliTabContent({ tab }) {
  const allVideos = tab==="舞台" ? (BILIBILI_VIDEOS["舞台"]||[]).map(v=>({...v,event:v.tags?.length?v.tags.join("·"):"舞台"})) : tab==="百万视频" ? BAIWANWUTAI_DATA : (BILIBILI_VIDEOS[tab]||[])
  const [activeMonth, setActiveMonth] = useState<string|null>(null)

  if(allVideos.length===0) return (
    <div style={{textAlign:"center",padding:"42px 0",color:"var(--c-faint)"}}>
      <div style={{fontSize:36,marginBottom:10}}>🎬</div>
      <p style={{fontSize:13}}>暂无 {tab} 内容，敬请期待 ✨</p>
    </div>
  )

  const byDate: Record<string,typeof allVideos> = {}
  allVideos.forEach(v=>{ if(!byDate[v.date]) byDate[v.date]=[]; byDate[v.date].push(v) })
  const sortedDates = Object.keys(byDate).sort((a,b)=>a.localeCompare(b))
  const displayed = activeMonth ? byDate[activeMonth]||[] : allVideos

  const pickRandom = () => window.open(displayed[Math.floor(Math.random()*displayed.length)].url,"_blank")

  return (
    <div>
      {/* 随机按钮 */}
      <button onClick={pickRandom} style={{
        width:"100%",marginBottom:12,padding:"9px 14px",
        background:"linear-gradient(135deg,rgba(162,214,174,0.5),rgba(130,190,152,0.38))",
        border:"1px solid rgba(120,185,142,0.6)",borderRadius:10,cursor:"pointer",
        fontFamily:"inherit",fontSize:12,fontWeight:700,color:"var(--c-ink)",
        display:"flex",alignItems:"center",justifyContent:"center",gap:7,
        boxShadow:"0 2px 10px rgba(40,100,56,0.10)",transition:"all 0.18s",
      }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(40,100,56,0.20)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(40,100,56,0.10)"}
      ><span style={{fontSize:16}}>🎲</span> 随机今日 · 帮我选一个！</button>

      {/* 月份横排筛选 */}
      <div className="tabs-scroll" style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
        <button onClick={()=>setActiveMonth(null)} style={{
          padding:"4px 10px",borderRadius:100,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",flexShrink:0,
          border:`1px solid ${!activeMonth?"rgba(120,185,142,0.7)":"rgba(195,228,206,0.4)"}`,
          background:!activeMonth?"rgba(162,214,174,0.35)":"rgba(240,250,243,0.5)",
          color:!activeMonth?"var(--c-ink)":"var(--c-muted)",transition:"all 0.15s",
        }}>全部 ({allVideos.length})</button>
        {sortedDates.map(date=>(
          <button key={date} onClick={()=>setActiveMonth(date)} style={{
            padding:"4px 10px",borderRadius:100,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",flexShrink:0,
            border:`1px solid ${activeMonth===date?"rgba(120,185,142,0.7)":"rgba(195,228,206,0.4)"}`,
            background:activeMonth===date?"rgba(162,214,174,0.35)":"rgba(240,250,243,0.5)",
            color:activeMonth===date?"var(--c-ink)":"var(--c-muted)",transition:"all 0.15s",
          }}>{date} <span style={{fontSize:9,opacity:0.6}}>({byDate[date].length})</span></button>
        ))}
      </div>

      {/* 视频网格 */}
      <div className="bili-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12}}>
        {displayed.map((v,i)=><BiliCard key={`${v.bvid}-${i}`} video={v}/>)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
//  直拍板块
// ════════════════════════════════════════════
function ZhipaiSection() {
  const [activeStation, setActiveStation] = useState(ZHIPAI_DATA[0].id)
  const station = ZHIPAI_DATA.find(s=>s.id===activeStation)

  const byYear: Record<string, typeof station.videos> = {}
  station.videos.forEach(v => {
    const year = v.date.slice(0,4)
    if(!byYear[year]) byYear[year] = []
    byYear[year].push(v)
  })
  const years = Object.keys(byYear).sort((a,b)=>b.localeCompare(a))

  const scrollToYear = (year: string) => {
    const el = document.getElementById(`zhipai-${station.id}-${year}`)
    if(el) el.scrollIntoView({behavior:"smooth", block:"start"})
  }

  return (
    <div>
      {/* 站姐头像横排 */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:16,scrollbarWidth:"none"}}
        className="tabs-scroll">
        {ZHIPAI_DATA.map(s=>(
          <button key={s.id} onClick={()=>setActiveStation(s.id)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:5,
            padding:"10px 12px",flexShrink:0,
            background:activeStation===s.id?"rgba(162,214,174,0.35)":"rgba(240,250,243,0.52)",
            border:`1px solid ${activeStation===s.id?"rgba(120,185,142,0.7)":"rgba(195,228,206,0.4)"}`,
            borderRadius:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.18s",
          }}>
            <div style={{
              width:44,height:44,borderRadius:"50%",
              background:`linear-gradient(135deg,${s.color}cc,${s.color}88)`,
              border:`2px solid ${s.color}55`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:14,fontWeight:900,color:"#fff",
              boxShadow:`0 2px 8px ${s.color}44`,flexShrink:0,
            }}>{s.initials}</div>
            <div style={{fontSize:10,fontWeight:600,color:"var(--c-ink-2)",textAlign:"center",lineHeight:1.3,maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name.replace(/丨张函瑞|_张函瑞|-张函瑞/g,'')}</div>
            <div style={{fontSize:9,color:"var(--c-faint)"}}>{s.videos.length}条</div>
          </button>
        ))}
      </div>

      {/* 年份快速导航 */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {years.map(year=>(
          <button key={year} onClick={()=>scrollToYear(year)} style={{
            padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:700,
            fontFamily:"inherit",cursor:"pointer",
            border:"1px solid rgba(120,185,142,0.5)",
            background:"rgba(162,214,174,0.2)",color:"var(--c-accent)",
            transition:"all 0.15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(162,214,174,0.45)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(162,214,174,0.2)"}
          >{year} <span style={{fontSize:9,opacity:0.7}}>({byYear[year].length})</span></button>
        ))}
      </div>

      {/* 视频网格 */}
      <div style={{
        background:"rgba(240,250,243,0.52)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
        border:"1px solid rgba(195,228,206,0.45)",borderRadius:14,padding:"16px",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${station.color}cc,${station.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}}>{station.initials}</div>
          <div style={{fontSize:13,fontWeight:700,color:"var(--c-ink)"}}>{station.name}</div>
          <div style={{fontSize:10,color:"var(--c-muted)",marginLeft:"auto"}}>共 {station.videos.length} 条</div>
        </div>

        {years.map(year=>(
          <div key={year} id={`zhipai-${station.id}-${year}`} style={{marginBottom:24}}>
            <div style={{
              display:"flex",alignItems:"center",gap:8,marginBottom:12,
              paddingBottom:8,borderBottom:"1px solid rgba(195,228,206,0.4)",
            }}>
              <div style={{width:10,height:10,borderRadius:"50%",background:`linear-gradient(135deg,${station.color}cc,${station.color}88)`,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:800,color:"var(--c-ink)"}}>{year}</span>
              <span style={{fontSize:10,color:"var(--c-muted)",background:"rgba(162,214,174,0.2)",border:"1px solid rgba(120,185,142,0.3)",borderRadius:100,padding:"1px 8px"}}>{byYear[year].length} 条</span>
            </div>
            <div className="bili-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
              {byYear[year].map((v,i)=>{
                const bvid = v.url.split('/video/')[1]?.replace('/','') || `zp${station.id}${i}`
                return (
                  <BiliCard key={`${bvid}-${i}`} video={{bvid, title:v.title, cover:v.cover||'', url:v.url, event:v.event}}/>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
//  Merch Section (展柜风格)
// ════════════════════════════════════════════
function MerchSection({ merchCategories, onLightbox }) {
  const cats=["小卡","玩偶","官方周边","非官方周边","其他收藏"]
  const [activeTab,setActiveTab]=useState("小卡")
  const imgs=merchCategories[activeTab]||[]
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setActiveTab(c)} style={{
            padding:"6px 14px",borderRadius:100,fontSize:11.5,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
            border:"1px solid",transition:"all 0.18s",
            ...(activeTab===c
              ?{background:"linear-gradient(135deg,rgba(162,214,174,0.6),rgba(130,190,152,0.45))",borderColor:"rgba(120,185,142,0.7)",color:"var(--c-ink)",boxShadow:"0 2px 10px rgba(40,100,56,0.12)"}
              :{background:"rgba(255,255,255,0.38)",borderColor:"rgba(195,228,206,0.5)",color:"var(--c-muted)"}
            ),
          }}>{c}</button>
        ))}
      </div>
      {imgs.length===0?(
        <div style={{textAlign:"center",padding:"42px 0",color:"var(--c-faint)"}}>
          <div style={{fontSize:36,marginBottom:10}}>🛍️</div>
          <p style={{fontSize:13}}>图片放在 <code style={{background:"rgba(160,210,172,0.18)",border:"1px solid rgba(155,210,168,0.35)",padding:"2px 7px",borderRadius:6,fontFamily:"monospace"}}>public/merch/{activeTab}/</code> 下 ✨</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:13}}>
          {imgs.map((img,i)=>(
            <div key={i}
              onClick={()=>onLightbox(img)}
              style={{
                borderRadius:14,overflow:"hidden",cursor:"pointer",
                background:"rgba(240,250,243,0.52)",
                backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
                border:"1px solid rgba(195,228,206,0.5)",
                boxShadow:"0 2px 10px rgba(40,100,56,0.07)",
                transition:"transform 0.22s,box-shadow 0.22s",
                animation:"popIn 0.35s ease both",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(40,100,56,0.16)"}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 10px rgba(40,100,56,0.07)"}}
            >
              <img src={img} alt="" loading="lazy" style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>
              <div style={{padding:"7px 10px",fontSize:10.5,color:"var(--c-ink-3)",fontWeight:600,letterSpacing:"0.03em"}}>
                ✦ {activeTab} {String(i+1).padStart(2,"0")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ════════════════════════════════════════════
//  Weibo Media Card  (scrapbook style)
// ════════════════════════════════════════════
const CARD_STYLES = ["normal","film","polaroid"]
const CORNER_STICKERS = ["🌿","🍃","🐾","✨","💚",""]

function WeiboMediaCard({ item, onClick, idx }) {
  const rand = useMemo(() => seededRand(idx * 7919 + 1234), [idx])
  const rotate = useMemo(() => (rand() * 4 - 2).toFixed(2), [])
  const style = useMemo(() => CARD_STYLES[Math.floor(rand() * 3)], [])
  const sticker = useMemo(() => CORNER_STICKERS[Math.floor(rand() * CORNER_STICKERS.length)], [])
  const delay = useMemo(() => (rand() * 0.4).toFixed(2), [])

  const isVideo = item.isVideo || (typeof item === "string" && item.match(/\.(mov|mp4)$/i))
  const url = typeof item === "object" ? item.url : item
  const filename = typeof item === "object" ? item.filename : item.split("/").pop()
  const dateLabel = filename?.match(/\d{4}-\d{2}-\d{2}/)?.[0]?.slice(5) || ""

  const [hovered, setHovered] = useState(false)

  const wrapStyle = {
    cursor:"pointer",position:"relative",
    transform:`rotate(${hovered ? "0" : rotate}deg) translateY(${hovered?"-4px":"0"})`,
    transition:"transform 0.28s cubic-bezier(.25,.8,.25,1),box-shadow 0.28s",
    animationDelay:`${delay}s`,animation:"popIn 0.4s ease both",
    ...(style === "film" ? {
      background:"var(--glass-bg-strong)",
      border:"3px solid var(--glass-border)",
      borderRadius:6,
      padding:"4px 4px 22px",
      boxShadow:hovered?"var(--glass-shadow-hover)":"var(--glass-shadow)",
    } : style === "polaroid" ? {
      background:"var(--glass-bg-strong)",
      border:"2px solid var(--glass-border-soft)",
      borderRadius:8,
      padding:"5px 5px 32px",
      boxShadow:hovered?"var(--glass-shadow-hover)":"0 3px 14px rgba(0,0,0,0.12)",
    } : {
      borderRadius:12,overflow:"hidden",
      background:"var(--glass-bg)",backdropFilter:"var(--glass-blur-sm)",WebkitBackdropFilter:"var(--glass-blur-sm)",
      border:"1px solid var(--glass-border)",
      boxShadow:hovered?"var(--glass-shadow-hover)":"var(--glass-shadow)",
    }),
  }

  return (
    <div style={wrapStyle} onClick={() => onClick(url)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {isVideo
        ? <video src={url} autoPlay loop muted playsInline style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block",borderRadius:style==="normal"?12:4}}/>
        : <img src={url.replace('/image/upload/','/image/upload/w_400,h_400,c_fill,q_auto,f_auto/')} alt="" loading="lazy" decoding="async"
            onError={e=>{(e.target as HTMLImageElement).style.opacity='0.2'}}
            style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block",borderRadius:style==="normal"?12:4}}/>
      }
      {/* LIVE badge */}
      {isVideo && <span style={{position:"absolute",top:8,left:8,fontSize:8,background:"rgba(79,168,104,0.7)",border:"1px solid rgba(79,168,104,0.5)",borderRadius:4,padding:"1px 5px",color:"#fff",fontWeight:700,letterSpacing:"0.05em"}}>LIVE</span>}
      {/* corner sticker */}
      {sticker && <span style={{position:"absolute",bottom:style==="normal"?6:28,right:8,fontSize:11,opacity:0.22,transform:`rotate(${(parseFloat(rotate)*-1.5).toFixed(1)}deg)`,pointerEvents:"none"}}>{sticker}</span>}
      {/* date label on hover */}
      {hovered && dateLabel && <div style={{position:"absolute",bottom:style==="normal"?4:26,left:8,fontSize:9,color:"var(--c-muted)",fontWeight:600,letterSpacing:"0.05em",opacity:0.7,fontFamily:"monospace"}}>{dateLabel}</div>}
    </div>
  )
}
// ════════════════════════════════════════════
//  Profile Section (瑞的简历)
// ════════════════════════════════════════════
function ProfileSection() {
  const timeline=[
    {year:"2009",text:"这一年的10月18日,是一个美好的日子。重庆迎来了一位可爱的小男孩，父母给他起名为\u201c张函瑞\u201d，一个可爱又朗朗上口的名字，仿佛自带英文名Henry，后来也确实取了Henry做英文名 🌿"},
    {year:"2021",text:"这一年，一个爱唱歌的小孩哥单枪匹马闯进了中国好声音重庆赛区的决赛，彼时他才刚系统接触唱歌没多久，但却展现出了超高的声乐天赋。虽然最后因为年龄太小没能进入全国赛，但小函瑞开始被很多业内的人士看见🎤"},
    {year:"2022",text:"在表姐的怂恿下，张函瑞去了当地一家赫赫有名的公司——时代峰峻面试，结果不仅立马被选上，而且在进入公司后的一个月，在2月14日这天，作为TF家族四代练习生正式公开了。或许是面试时唱的太惊艳让公司立马签约生怕错过此等天才吧 ✨"},
    {year:"2023",text:"这一年的春节，一众楼丝观看新年音乐会时，突然有一个新面孔出现，演唱了一首独唱的《光亮》，这就是张函瑞的第一次新音体验。如此珍贵的solo舞台，他也不负众望，惊艳的高音和熟练运用的技巧造就了一个经典又出圈的作品💚"},
    {year:"2024",text:"这一年张函瑞进入了真正的成长期，有青春期的诸多烦恼，也有容貌上的蜕变。让他有一点小小的焦虑，但夜深人静时独自思考反省是成长最重要的一部分。学会责任感，永远保持一颗上进心，张函瑞的INFJ特质开始显现 🌸"},
    {year:"2025",text:"这一年是张函瑞颇为动荡的一年，当然，是好的\u201c动荡\u201d。上半年结束了紧张的中考，就被\u201c关\u201d进了训练营开始了名为突围的竞技秀。张函瑞用自己的实力和舞台打破一个个对他的质疑，年底更是迎来了暴风吸粉期。作为一个豆德满分的小爱豆，张函瑞严于律己，宽以待人，萌萌的外表下是一颗坚韧又温柔的心 ⭐"},
    {year:"2026",text:"新的故事会怎样呢？期待张函瑞续写～ 🎉"},
  ]
  const tags={
   舞台风格:["大主唱","舞台人格","情绪感染力","全能ACE","饭撒的神"],
   性格关键词:["细腻温柔","对朋友很好","爱哭包","有点小迷糊","温脸萌"],
   成长关键词:["爱猫一族","猫塑","真诚感","高度自律","越长大越耀眼"],
  }
  return (
    <div>
      {/* 基础资料 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
        {[
          {emoji:"🎂",label:"生日",value:"2009.10.18"},
          {emoji:"📍",label:"出生地",value:"重庆"},
          {emoji:"🏢",label:"所属",value:"时代峰峻四代"},
          {emoji:"🧬",label:"MBTI",value:"INFJ"},
          {emoji:"🐱",label:"宠物名",value:"张建国"},
          {emoji:"💚",label:"应援色",value:"祈漫春江"},
        ].map(item=>(
          <div key={item.label} className="info-item">
            <div className="info-item-icon">{item.emoji}</div>
            <div>
              <div className="info-item-label">{item.label}</div>
              <div className="info-item-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 标签区 */}
      {Object.entries(tags).map(([group,ts])=>(
        <div key={group} style={{marginBottom:14}}>
          <div style={{fontSize:10.5,color:"var(--c-muted)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>{group}</div>
          <div>{ts.map(t=><span key={t} className="pill-tag">{t}</span>)}</div>
        </div>
      ))}

      {/* 时间线 */}
      <div style={{marginTop:18,borderTop:"1px solid var(--glass-border-soft)",paddingTop:18}}>
        <div style={{fontSize:10.5,color:"var(--c-muted)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>成长时间线</div>
        <div style={{position:"relative",paddingLeft:24}}>
          <div style={{position:"absolute",left:7,top:6,bottom:6,width:1,background:"linear-gradient(to bottom,rgba(155,210,168,0.6),rgba(155,210,168,0.1))"}}/>
          {timeline.map((ev,i)=>(
            <div key={i} style={{position:"relative",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{position:"absolute",left:-20,width:8,height:8,borderRadius:"50%",background:"rgba(79,168,104,0.7)",border:"2px solid rgba(200,240,210,0.9)",marginTop:4,boxShadow:"0 0 6px rgba(79,168,104,0.3)"}}/>
              <div style={{
                flex:1,background:"rgba(240,250,243,0.52)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                border:"1px solid rgba(195,228,206,0.45)",borderRadius:10,padding:"9px 13px",
              }}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--c-accent)",letterSpacing:"0.05em",marginBottom:3}}>{ev.year}</div>
                <div style={{fontSize:12.5,color:"var(--c-ink-2)",lineHeight:1.6}}>{ev.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 成长录通用BiliTab：三列网格+右侧月份导航
const BAIWANWUTAI_DATA = [
  { bvid:"BV1F44y1P7qa", title:"张函瑞歌曲COVER《我很快乐》", cover:"http://i0.hdslb.com/bfs/archive/7d584deb8731a48f13fafa5301c339409f546859.jpg", url:"https://www.bilibili.com/video/BV1F44y1P7qa/", date:"2022-03", tags:[] },
  { bvid:"BV1VW4y1J7w5", title:"张函瑞 10月路演《兰亭序》", cover:"http://i0.hdslb.com/bfs/archive/ab1599583216f208aa20e29540e7c10615d0541a.jpg", url:"https://www.bilibili.com/video/BV1VW4y1J7w5/", date:"2022-10", tags:[] },
  { bvid:"BV1234y1Z7CX", title:"「2023新年音乐会——瞬间」《光亮》纯享版", cover:"http://i1.hdslb.com/bfs/archive/2e64318c051b6887d547293766495432364d1908.jpg", url:"https://www.bilibili.com/video/BV1234y1Z7CX/", date:"2023-01", tags:[] },
  { bvid:"BV1od4y1f7H4", title:"「TF少年梦工厂-立夏」《是你》纯享版", cover:"http://i1.hdslb.com/bfs/archive/2679a4fa83f35d375d1b8776c44063bf763ac543.jpg", url:"https://www.bilibili.com/video/BV1od4y1f7H4/", date:"2023-05", tags:[] },
  { bvid:"BV1aC4y1w7ih", title:"【张函瑞】来听14岁男初绝美转音翻唱《小偷》，每一处转音都太丝滑啦", cover:"http://i2.hdslb.com/bfs/archive/e0ff3f5ab9de038efa0249a5c698708bd2792b65.jpg", url:"https://www.bilibili.com/video/BV1aC4y1w7ih/", date:"2023-12", tags:[] },
  { bvid:"BV1LtDsYbEFS", title:"【张函瑞】15岁小孩翻唱《水星记》变声期也挡不住的好听！！", cover:"http://i0.hdslb.com/bfs/archive/91e916abc70a7fb946f1190d46bb054f0fc187f0.jpg", url:"https://www.bilibili.com/video/BV1LtDsYbEFS/", date:"2024-11", tags:[] },
  { bvid:"BV1EgwmebEqz", title:"【张函瑞丨4K直拍】 如果当时 直拍 丨15岁男初深情献唱 · 红雨瓢泼泛起了回忆怎么潜", cover:"http://i2.hdslb.com/bfs/archive/9e34c9326d8a65309c1dac83eb149b5546d3d4c1.jpg", url:"https://www.bilibili.com/video/BV1EgwmebEqz/", date:"2025-01", tags:[] },
  { bvid:"BV1fYwNekEwi", title:"【张函瑞】15岁男初上演教科书式禁欲S 这个视频的退出键到底在哪？ 《Guilty》直拍", cover:"http://i1.hdslb.com/bfs/archive/2a821722b524924fb7a21678407a04cf58fd79f2.jpg", url:"https://www.bilibili.com/video/BV1fYwNekEwi/", date:"2025-01", tags:[] },
  { bvid:"BV1VoRaY4EuK", title:"张函瑞《Letting Go》声乐COVER", cover:"http://i0.hdslb.com/bfs/archive/54aabc05553532d73abdfd7e7f90fab5174dcd71.jpg", url:"https://www.bilibili.com/video/BV1VoRaY4EuK/", date:"2025-03", tags:[] },
  { bvid:"BV1T4TXzcEgN", title:"张函瑞《Vroom Vroom》舞蹈COVER", cover:"http://i2.hdslb.com/bfs/archive/b7f85a21b2c2e6220e4ecfb5715f8526bc4a089c.jpg", url:"https://www.bilibili.com/video/BV1T4TXzcEgN/", date:"2025-06", tags:[] },
  { bvid:"BV1fxtbzKESN", title:"【张函瑞】雨爱双机位4K精剪横屏直拍 新舞台神仙嗓音 百万直拍预定💘开口即跪的纯欲少年音", cover:"http://i0.hdslb.com/bfs/archive/60e41a77776643e907bbd87f46478cb956a5c07d.jpg", url:"https://www.bilibili.com/video/BV1fxtbzKESN/", date:"2025-08", tags:[] },
  { bvid:"BV11Btaz9ERL", title:"【Lucifer｜张函瑞】四代最强表管翻跳SM神曲，完全移不开视线！TF家族四代公演张函瑞4K精剪直拍", cover:"http://i1.hdslb.com/bfs/archive/62ace7c506c6ce1a2dce740f92fb89856855e5c8.jpg", url:"https://www.bilibili.com/video/BV11Btaz9ERL/", date:"2025-08", tags:[] },
  { bvid:"BV1w6t8z1EfU", title:"【Deja Vu｜张函瑞】浮生若寄，彩带飘落的瞬间，你我仿若旧识。张函瑞TF家族四代公演4K精剪直拍", cover:"http://i2.hdslb.com/bfs/archive/637f1f465865607ddba2c04604cfa5c193619449.jpg", url:"https://www.bilibili.com/video/BV1w6t8z1EfU/", date:"2025-08", tags:[] },
  { bvid:"BV1xsvzBGE8g", title:"【Manta｜张函瑞】双机位4K精剪直拍", cover:"http://i2.hdslb.com/bfs/archive/1c2d866cdc64d07b919f1d9b4fdc4f3e18a7160d.jpg", url:"https://www.bilibili.com/video/BV1xsvzBGE8g/", date:"2025-12", tags:[] },
  { bvid:"BV1JABzBMEhh", title:"【ON｜张函瑞】4K精剪直拍", cover:"http://i0.hdslb.com/bfs/archive/86874950f131ee795e16302fadc03d7ca0126c9e.jpg", url:"https://www.bilibili.com/video/BV1JABzBMEhh/", date:"2025-12", tags:[] },
  { bvid:"BV1PMBiBMEze", title:"【张函瑞 | 爱要坦荡荡】4K精剪横屏直拍 耳机音量调大！全程嘴角上扬 可爱超标实力满分 元气主唱YYDS!!!", cover:"http://i0.hdslb.com/bfs/archive/09954882bccec5fda65c093567e04faf2ffffcc5.jpg", url:"https://www.bilibili.com/video/BV1PMBiBMEze/", date:"2025-12", tags:[] },
  { bvid:"BV1pDBiBBEBi", title:"【野心家｜张函瑞】4K精剪直拍（含字幕）", cover:"http://i0.hdslb.com/bfs/archive/c10b0c0da15e69cf5f8c629c5ab50b0cc48aaffc.jpg", url:"https://www.bilibili.com/video/BV1pDBiBBEBi/", date:"2025-12", tags:[] },
]

const XINGQI5_DATA = [
  { bvid:"BV1Tg4y1G7kG", title:"01: 人生的第一份简历", cover:"http://i0.hdslb.com/bfs/archive/164a5945077c019e5101671b57b78c6aba972a00.jpg", url:"https://www.bilibili.com/video/BV1Tg4y1G7kG/", date:"2023-03", tags:[] },
  { bvid:"BV12L411U7H7", title:"02: 嘿，一起来创建我的「个性标签」！", cover:"http://i1.hdslb.com/bfs/archive/a7fbe12c23432f17e100065948326cd5e9e5fbdf.jpg", url:"https://www.bilibili.com/video/BV12L411U7H7/", date:"2023-04", tags:[] },
  { bvid:"BV1r54y1F7Mi", title:"03: 公式照拍摄现场花絮", cover:"http://i1.hdslb.com/bfs/archive/ce74b07c1e3d782648d90b2f4e0613fb4a8ea0dc.jpg", url:"https://www.bilibili.com/video/BV1r54y1F7Mi/", date:"2023-04", tags:[] },
  { bvid:"BV1DT411n7XP", title:"04: 今天是去看演唱会的日子！", cover:"http://i1.hdslb.com/bfs/archive/ce74b07c1e3d782648d90b2f4e0613fb4a8ea0dc.jpg", url:"https://www.bilibili.com/video/BV1DT411n7XP/", date:"2023-04", tags:[] },
  { bvid:"BV1Km4y1C7n6", title:"05: 春结野营会之「春结晚会」", cover:"http://i1.hdslb.com/bfs/archive/e51f2446239d15caec67fcb9b0f15382661d21c7.jpg", url:"https://www.bilibili.com/video/BV1Km4y1C7n6/", date:"2023-04", tags:[] },
  { bvid:"BV1hc411N77w", title:"06: 春结野营会之难忘的春游", cover:"http://i2.hdslb.com/bfs/archive/15659739a12f2937acaa5699c03f712595c0a0ec.jpg", url:"https://www.bilibili.com/video/BV1hc411N77w/", date:"2023-05", tags:[] },
  { bvid:"BV1fu411s7cW", title:"07: TFBA篮球赛", cover:"http://i0.hdslb.com/bfs/archive/46f33c629ddbc4edf6c68f83e6636da62aad46ac.jpg", url:"https://www.bilibili.com/video/BV1fu411s7cW/", date:"2023-05", tags:[] },
  { bvid:"BV1cu411s7tX", title:"07: 同学，可以和你做同桌吗？", cover:"http://i0.hdslb.com/bfs/archive/eec7acc4f67372d8bb1a706ef81cfede9be2435a.jpg", url:"https://www.bilibili.com/video/BV1cu411s7tX/", date:"2023-05", tags:[] },
  { bvid:"BV1PV4y1U7Xt", title:"08: 儿童带儿童过儿童节", cover:"http://i2.hdslb.com/bfs/archive/d3cfa0d79e916e12403a26e76450fc1f41040424.jpg", url:"https://www.bilibili.com/video/BV1PV4y1U7Xt/", date:"2023-06", tags:[] },
  { bvid:"BV16W4y1S7QS", title:"09: 一个惬意的午后", cover:"http://i1.hdslb.com/bfs/archive/7404fe360ed9f6b755070fdbda4f5c78200e0168.jpg", url:"https://www.bilibili.com/video/BV16W4y1S7QS/", date:"2023-06", tags:[] },
  { bvid:"BV1iL411i7MR", title:"09: 幼儿园一日助教体验", cover:"http://i1.hdslb.com/bfs/archive/1f8457af58e39df497f0c960d11f91ca21d5e071.jpg", url:"https://www.bilibili.com/video/BV1iL411i7MR/", date:"2023-06", tags:[] },
  { bvid:"BV1mo4y1N7SX", title:"10: 谁是“伪装者”？", cover:"http://i1.hdslb.com/bfs/archive/865417e5ff8583b7e7dfe7d05f131de37e23a31b.jpg", url:"https://www.bilibili.com/video/BV1mo4y1N7SX/", date:"2023-06", tags:[] },
  { bvid:"BV1Nc411u7iB", title:"11: 端午节特辑", cover:"http://i0.hdslb.com/bfs/archive/978447ae5aa43636beb30b5958603e2772eef3aa.jpg", url:"https://www.bilibili.com/video/BV1Nc411u7iB/", date:"2023-06", tags:[] },
  { bvid:"BV1Eu411j7mp", title:"12: 绿色暴汗之旅", cover:"http://i2.hdslb.com/bfs/archive/91ff722dce108d918192d5facab2e3cdb8edb90a.jpg", url:"https://www.bilibili.com/video/BV1Eu411j7mp/", date:"2023-07", tags:[] },
  { bvid:"BV1LW4y1Z74h", title:"13: 甜“秘密”的任务", cover:"http://i2.hdslb.com/bfs/archive/563433b6fac101dcac72b136ff5365d7258211f7.jpg", url:"https://www.bilibili.com/video/BV1LW4y1Z74h/", date:"2023-07", tags:[] },
  { bvid:"BV1ZV4y147ph", title:"14: 清凉一\"吓\"之「消失的他」", cover:"http://i1.hdslb.com/bfs/archive/815cc9f9aa9adff60a85768861f41b6fa50adefa.jpg", url:"https://www.bilibili.com/video/BV1ZV4y147ph/", date:"2023-07", tags:[] },
  { bvid:"BV1Uj411B72U", title:"16: 我们去北京啦！", cover:"http://i1.hdslb.com/bfs/archive/8c071dcdb1864428add1451184b507a6deeaf51b.jpg", url:"https://www.bilibili.com/video/BV1Uj411B72U/", date:"2023-08", tags:[] },
  { bvid:"BV1dp4y177A4", title:"17: 飞翔体验券", cover:"http://i0.hdslb.com/bfs/archive/951efe3644e63aafda1f3fd1692aaef0e427eda8.jpg", url:"https://www.bilibili.com/video/BV1dp4y177A4/", date:"2023-08", tags:[] },
  { bvid:"BV1hP41187a3", title:"18: 合宿特辑——是and不是end（上）", cover:"http://i2.hdslb.com/bfs/archive/224bbd6d5a832d865e3aad8ded005bf4632f132b.jpg", url:"https://www.bilibili.com/video/BV1hP41187a3/", date:"2023-09", tags:[] },
  { bvid:"BV1bk4y1w736", title:"19: 合宿特辑——是and不是end（下）", cover:"http://i1.hdslb.com/bfs/archive/c4734b8bcfba1e1cf86e2c01d7afed715e39031d.jpg", url:"https://www.bilibili.com/video/BV1bk4y1w736/", date:"2023-09", tags:[] },
  { bvid:"BV1vw411v7db", title:"20: oooooo的你", cover:"http://i1.hdslb.com/bfs/archive/f92fb0c7b01bce58d36005dd08b493f5e7830535.jpg", url:"https://www.bilibili.com/video/BV1vw411v7db/", date:"2023-09", tags:[] },
  { bvid:"BV1Lp4y1c7ag", title:"21: 南国客栈诡事录（上）", cover:"http://i1.hdslb.com/bfs/archive/08591301873e17648a7f9076beec9a114c0b34ad.jpg", url:"https://www.bilibili.com/video/BV1Lp4y1c7ag/", date:"2023-09", tags:[] },
  { bvid:"BV1YG411m7M3", title:"22: 南国客栈诡事录（下）", cover:"http://i2.hdslb.com/bfs/archive/4ef409950be36833ee802962751c5b513d1d57e4.jpg", url:"https://www.bilibili.com/video/BV1YG411m7M3/", date:"2023-10", tags:[] },
  { bvid:"BV1Pw41167hv", title:"23: 间谍游戏", cover:"http://i1.hdslb.com/bfs/archive/40044be29604056b6f563532b413563ecc3a3652.jpg", url:"https://www.bilibili.com/video/BV1Pw41167hv/", date:"2023-10", tags:[] },
  { bvid:"BV1Bw411B7Zf", title:"24: 突破极限的柔韧竞赛", cover:"http://i2.hdslb.com/bfs/archive/bf5b08e21923c0d8cfb8622265aba1b799aa35b7.jpg", url:"https://www.bilibili.com/video/BV1Bw411B7Zf/", date:"2023-10", tags:[] },
  { bvid:"BV1VG411C7ux", title:"25: 秋结野营会（上）", cover:"http://i1.hdslb.com/bfs/archive/f349d067d405edde17d6e544ec74f7113adef051.jpg", url:"https://www.bilibili.com/video/BV1VG411C7ux/", date:"2023-10", tags:[] },
  { bvid:"BV1Mu4y177Jn", title:"26: 秋结野营会（下）", cover:"http://i0.hdslb.com/bfs/archive/170c591b426ebf6c743cbbaa8de629578234f607.jpg", url:"https://www.bilibili.com/video/BV1Mu4y177Jn/", date:"2023-11", tags:[] },
  { bvid:"BV17u4y1N79D", title:"27: 爱的抱抱", cover:"http://i2.hdslb.com/bfs/archive/ad37f4331c95c43c9408224e0614f30792169f15.jpg", url:"https://www.bilibili.com/video/BV17u4y1N79D/", date:"2023-11", tags:[] },
  { bvid:"BV1jw411K7dB", title:"28: 决战吧！反射神经", cover:"http://i0.hdslb.com/bfs/archive/778a090dd86255b17b5acde852b246943a4bf143.jpg", url:"https://www.bilibili.com/video/BV1jw411K7dB/", date:"2023-11", tags:[] },
  { bvid:"BV1Yj411j7YS", title:"29: 冬日养生大作战", cover:"http://i0.hdslb.com/bfs/archive/53da94518a9eeda061b4f406ecacfb148e1239fb.jpg", url:"https://www.bilibili.com/video/BV1Yj411j7YS/", date:"2023-12", tags:[] },
  { bvid:"BV1Qb4y1G79n", title:"30: 下浩里美食地图（上）", cover:"http://i0.hdslb.com/bfs/archive/3283d68dda66f8b38f8014c1e0c7dd248323eba2.jpg", url:"https://www.bilibili.com/video/BV1Qb4y1G79n/", date:"2023-12", tags:[] },
  { bvid:"BV1nQ4y137R6", title:"31: 下浩里美食地图（中）", cover:"http://i1.hdslb.com/bfs/archive/5ea6d57a66dcafa7548f8eee6c7c88c472ceb048.jpg", url:"https://www.bilibili.com/video/BV1nQ4y137R6/", date:"2023-12", tags:[] },
  { bvid:"BV1Mg4y1r73p", title:"32: 下浩里美食地图（下）", cover:"http://i0.hdslb.com/bfs/archive/c681230d7ca7fa82ff70efb137769a0f05c00b3e.jpg", url:"https://www.bilibili.com/video/BV1Mg4y1r73p/", date:"2023-12", tags:[] },
  { bvid:"BV1ig4y1U7TY", title:"33: 游乐园竞赛", cover:"http://i0.hdslb.com/bfs/archive/ef269627a377380dbb3b09d5a951906652b27bd9.jpg", url:"https://www.bilibili.com/video/BV1ig4y1U7TY/", date:"2024-01", tags:[] },
  { bvid:"BV1oz421R7k4", title:"34: 新春茶话会（上）", cover:"http://i2.hdslb.com/bfs/archive/d2d292806f912d866d62ef7f55cffbcb1dd8e2c8.jpg", url:"https://www.bilibili.com/video/BV1oz421R7k4/", date:"2024-02", tags:[] },
  { bvid:"BV1Qu4m1P7Wx", title:"35: ️是谁抢走了我的麦克风", cover:"http://i2.hdslb.com/bfs/archive/d2d292806f912d866d62ef7f55cffbcb1dd8e2c8.jpg", url:"https://www.bilibili.com/video/BV1Qu4m1P7Wx/", date:"2024-02", tags:[] },
  { bvid:"BV1cz421d7K9", title:"35: 新春茶话会（下）", cover:"http://i2.hdslb.com/bfs/archive/d2d292806f912d866d62ef7f55cffbcb1dd8e2c8.jpg", url:"https://www.bilibili.com/video/BV1cz421d7K9/", date:"2024-02", tags:[] },
  { bvid:"BV1hF4m1M7ZT", title:"36: 睡衣派对", cover:"http://i2.hdslb.com/bfs/archive/d7568d77e2947df939de7a24857f2898efe835d0.jpg", url:"https://www.bilibili.com/video/BV1hF4m1M7ZT/", date:"2024-02", tags:[] },
  { bvid:"BV1kC411b7Ub", title:"37: 我眼中的他", cover:"http://i0.hdslb.com/bfs/archive/c62a999bfdafad8bd5e85f398d64936a37796c55.jpg", url:"https://www.bilibili.com/video/BV1kC411b7Ub/", date:"2024-03", tags:[] },
  { bvid:"BV17j421d7LV", title:"38: 「嘻游记」进村第一天", cover:"http://i1.hdslb.com/bfs/archive/38a249a3827ca5d9a61dc315ea21687d80a25e78.jpg", url:"https://www.bilibili.com/video/BV17j421d7LV/", date:"2024-03", tags:[] },
  { bvid:"BV1Mq421P7xZ", title:"39: 「嘻游记」今天晚上不睡觉", cover:"http://i0.hdslb.com/bfs/archive/21c5630b30f2d11e6060d3c9744806255a8861b0.jpg", url:"https://www.bilibili.com/video/BV1Mq421P7xZ/", date:"2024-03", tags:[] },
  { bvid:"BV1hx4y1Y7Xt", title:"40: 「嘻游记」小鸡小鱼小猪和小莓", cover:"http://i2.hdslb.com/bfs/archive/ad192442df43a493ed5ad53fb647fbe9ff6f9bc2.jpg", url:"https://www.bilibili.com/video/BV1hx4y1Y7Xt/", date:"2024-04", tags:[] },
  { bvid:"BV1Lp421R7TU", title:"41: 「嘻游记」噼里啪啦 噼里啪啦", cover:"http://i2.hdslb.com/bfs/archive/1072b412ad921a2bca7d0289499b4a516ce3f470.jpg", url:"https://www.bilibili.com/video/BV1Lp421R7TU/", date:"2024-04", tags:[] },
  { bvid:"BV1VD421J7zq", title:"42: 「嘻游记」挖一条时空隧道", cover:"http://i2.hdslb.com/bfs/archive/cbad28610774dc7bac366540e62ebcb0c15976c8.jpg", url:"https://www.bilibili.com/video/BV1VD421J7zq/", date:"2024-04", tags:[] },
  { bvid:"BV1az421D73v", title:"43: 最受欢迎的你（上）", cover:"http://i2.hdslb.com/bfs/archive/6978010a80bfbbb9818c4229db3d95f94562f832.jpg", url:"https://www.bilibili.com/video/BV1az421D73v/", date:"2024-05", tags:[] },
  { bvid:"BV17M4m1o7BG", title:"44: 最受欢迎的你（下）", cover:"http://i0.hdslb.com/bfs/archive/a98ba4469eed560a8a397d318d6a5a4e481ec1b0.jpg", url:"https://www.bilibili.com/video/BV17M4m1o7BG/", date:"2024-05", tags:[] },
  { bvid:"BV1nw4m1D72Z", title:"45: 去见师兄啦！", cover:"http://i2.hdslb.com/bfs/archive/7c4f58f989ec07a54b21c11f4f77227591ef283a.jpg", url:"https://www.bilibili.com/video/BV1nw4m1D72Z/", date:"2024-05", tags:[] },
  { bvid:"BV1cn4y197Kj", title:"46: 六一儿童汇演（上）", cover:"http://i0.hdslb.com/bfs/archive/b69afd069432a7799e61e4e2e60c98c0e9b7e063.jpg", url:"https://www.bilibili.com/video/BV1cn4y197Kj/", date:"2024-06", tags:[] },
  { bvid:"BV1u142117JB", title:"47: 六一儿童汇演（下）", cover:"http://i0.hdslb.com/bfs/archive/b69afd069432a7799e61e4e2e60c98c0e9b7e063.jpg", url:"https://www.bilibili.com/video/BV1u142117JB/", date:"2024-06", tags:[] },
  { bvid:"BV1SZ421u7d5", title:"48: 吵吵闹闹大挑战", cover:"http://i2.hdslb.com/bfs/archive/6643b18733f77ed0fd6c7d5ed533f8ea27c05850.jpg", url:"https://www.bilibili.com/video/BV1SZ421u7d5/", date:"2024-06", tags:[] },
  { bvid:"BV1jf421Q7W1", title:"50: 穿越时空长廊（上）", cover:"http://i1.hdslb.com/bfs/archive/ab2e472a9380fb93a7d97d0e48462d7d1225291c.jpg", url:"https://www.bilibili.com/video/BV1jf421Q7W1/", date:"2024-06", tags:[] },
  { bvid:"BV1k4421D7MK", title:"51: 穿越时空长廊（下）", cover:"http://i0.hdslb.com/bfs/archive/a33f9e70420412c4d9930b10c93d8d9c9ba0e648.jpg", url:"https://www.bilibili.com/video/BV1k4421D7MK/", date:"2024-07", tags:[] },
  { bvid:"BV1im421G7mL", title:"52: 富翁囧囧囧", cover:"http://i1.hdslb.com/bfs/archive/a3167b999d2f4d238a7602d2d796965f16bb6fda.jpg", url:"https://www.bilibili.com/video/BV1im421G7mL/", date:"2024-07", tags:[] },
  { bvid:"BV12E4m1R7q5", title:"53: 就问你服（福）不服（福）", cover:"http://i1.hdslb.com/bfs/archive/aca7f96d85f0831ea54a933f971c1b5b8545c42d.jpg", url:"https://www.bilibili.com/video/BV12E4m1R7q5/", date:"2024-07", tags:[] },
  { bvid:"BV1W142187Np", title:"54: 澳门！我们来啦！", cover:"http://i1.hdslb.com/bfs/archive/1cdb92b2ce6fe9d11ba825fd037c6e97a204b5e2.jpg", url:"https://www.bilibili.com/video/BV1W142187Np/", date:"2024-07", tags:[] },
  { bvid:"BV1j142187V2", title:"55: 「修渔期」先导片——神级转场", cover:"http://i2.hdslb.com/bfs/archive/8f9685e5aaab7904cf56b8532f45552a24f6f3c8.jpg", url:"https://www.bilibili.com/video/BV1j142187V2/", date:"2024-08", tags:[] },
  { bvid:"BV1Ff421i7dA", title:"56: 「修渔期」EP01——村里来了群中小学生", cover:"http://i2.hdslb.com/bfs/archive/0c29ec727bd06e38f02d36355a18d16d93385a4f.jpg", url:"https://www.bilibili.com/video/BV1Ff421i7dA/", date:"2024-08", tags:[] },
  { bvid:"BV1dr421M7cD", title:"57: 「修渔期」EP02——新地图探索度？%", cover:"http://i1.hdslb.com/bfs/archive/9a18959370f9802cbd5231442fea7ce08e2a2869.jpg", url:"https://www.bilibili.com/video/BV1dr421M7cD/", date:"2024-08", tags:[] },
  { bvid:"BV13b421E7Qu", title:"58: 「修渔期」EP03——突如其来的食材寻宝", cover:"http://i1.hdslb.com/bfs/archive/8c0d30e12f915359134ff48d1d7a48f4be852962.jpg", url:"https://www.bilibili.com/video/BV13b421E7Qu/", date:"2024-08", tags:[] },
  { bvid:"BV16E421c7hb", title:"59: 「修渔期」EP04——渔业研修日", cover:"http://i0.hdslb.com/bfs/archive/6aa17887b70bcdf34a8a3608203718af8b827a4a.jpg", url:"https://www.bilibili.com/video/BV16E421c7hb/", date:"2024-08", tags:[] },
  { bvid:"BV1eQH9eWEPG", title:"60: 「修渔期」EP05——泥潭大作战", cover:"http://i2.hdslb.com/bfs/archive/4164addbf1209d60dbaa074460d654b0ea596574.jpg", url:"https://www.bilibili.com/video/BV1eQH9eWEPG/", date:"2024-09", tags:[] },
  { bvid:"BV1BL4bezEXN", title:"61: 「修渔期」EP06—— 一日店长之意想不到的客人", cover:"http://i0.hdslb.com/bfs/archive/88e6fb7c62a48d418912ade8ef56e12d4c6179e3.jpg", url:"https://www.bilibili.com/video/BV1BL4bezEXN/", date:"2024-09", tags:[] },
  { bvid:"BV1hgteeGEzP", title:"62: 中秋特辑", cover:"http://i2.hdslb.com/bfs/archive/8a851693d3e43919d2a56231728fede1c9deea1f.jpg", url:"https://www.bilibili.com/video/BV1hgteeGEzP/", date:"2024-09", tags:[] },
  { bvid:"BV1iwtfe9EJu", title:"63: 「修渔期」EP07—— 一日店长之意想不到的客人（下）", cover:"http://i2.hdslb.com/bfs/archive/a4def3791a8acc38f314523bbab5aba75c021011.jpg", url:"https://www.bilibili.com/video/BV1iwtfe9EJu/", date:"2024-09", tags:[] },
  { bvid:"BV1WPxFehECF", title:"64: 「修渔期」EP08——即刻回家", cover:"http://i1.hdslb.com/bfs/archive/9e86cef394d28f9a1432f5536264a461dba38515.jpg", url:"https://www.bilibili.com/video/BV1WPxFehECF/", date:"2024-09", tags:[] },
  { bvid:"BV1VHxrecE7F", title:"65: 「修渔期」花絮篇", cover:"http://i2.hdslb.com/bfs/archive/88256b904b36e5d80ee6f4be148310f166c62c4a.jpg", url:"https://www.bilibili.com/video/BV1VHxrecE7F/", date:"2024-09", tags:[] },
  { bvid:"BV1dQ4FeHEVY", title:"66: 忙忙碌碌寻宝藏", cover:"http://i2.hdslb.com/bfs/archive/fe4a93d31fc272a58c21ce474e69193e3997bd51.jpg", url:"https://www.bilibili.com/video/BV1dQ4FeHEVY/", date:"2024-10", tags:[] },
  { bvid:"BV1UP2mYBEAo", title:"67: 大快朵颐", cover:"http://i2.hdslb.com/bfs/archive/a5fdebaa7775e7bfeeb649b846379a964ac48650.jpg", url:"https://www.bilibili.com/video/BV1UP2mYBEAo/", date:"2024-10", tags:[] },
  { bvid:"BV17FC2YkEmc", title:"68: Kampai!", cover:"http://i2.hdslb.com/bfs/archive/a5fdebaa7775e7bfeeb649b846379a964ac48650.jpg", url:"https://www.bilibili.com/video/BV17FC2YkEmc/", date:"2024-10", tags:[] },
  { bvid:"BV1aNyDYmEyx", title:"69: 怎么不算city walk呢", cover:"http://i2.hdslb.com/bfs/archive/fe4a93d31fc272a58c21ce474e69193e3997bd51.jpg", url:"https://www.bilibili.com/video/BV1aNyDYmEyx/", date:"2024-10", tags:[] },
  { bvid:"BV1KTSRYhE8C", title:"70: mini秋季运动会", cover:"http://i1.hdslb.com/bfs/archive/340c586047d51e21585b0762a3da3dd04bb0d385.jpg", url:"https://www.bilibili.com/video/BV1KTSRYhE8C/", date:"2024-11", tags:[] },
  { bvid:"BV1KMiBYUELc", title:"75: 气吞山河之战", cover:"http://i2.hdslb.com/bfs/archive/1e5a15b63db12e315673f1e545dab158c464e65a.jpg", url:"https://www.bilibili.com/video/BV1KMiBYUELc/", date:"2024-12", tags:[] },
  { bvid:"BV1bJBLYfEJz", title:"76: 新脑子转的就是快:", cover:"http://i0.hdslb.com/bfs/archive/e8d2b211bcc377781c72d785f91f88ab8da6a450.jpg", url:"https://www.bilibili.com/video/BV1bJBLYfEJz/", date:"2024-12", tags:[] },
  { bvid:"BV1skCpYREdE", title:"78: 距离的神", cover:"http://i1.hdslb.com/bfs/archive/5c6a1e32b833a9fc25c9af8369da6974cf30eeee.jpg", url:"https://www.bilibili.com/video/BV1skCpYREdE/", date:"2024-12", tags:[] },
  { bvid:"BV1hefHYKEDF", title:"79: 这个feel倍儿爽", cover:"http://i1.hdslb.com/bfs/archive/32bc0c56a5855c8f17250d26ba5058b29d93e525.jpg", url:"https://www.bilibili.com/video/BV1hefHYKEDF/", date:"2025-01", tags:[] },
  { bvid:"BV1SDFoeNEgg", title:"80: 我这无人能敌的手气", cover:"http://i0.hdslb.com/bfs/archive/7e156db3d264e2f1ed50d55023fcbb01fb5096ed.jpg", url:"https://www.bilibili.com/video/BV1SDFoeNEgg/", date:"2025-02", tags:[] },
  { bvid:"BV1pJKjedEF2", title:"81: 圆圆滚滚乐发财", cover:"http://i0.hdslb.com/bfs/archive/84f91d0d3684aa2488d54b5ff35e14df5a35f75f.jpg", url:"https://www.bilibili.com/video/BV1pJKjedEF2/", date:"2025-02", tags:[] },
  { bvid:"BV1hXAoeyETm", title:"82: 谁是三寸不烂之舌", cover:"http://i1.hdslb.com/bfs/archive/6e3e3de48e870e5ad3b0f9d47e4deff6b0115c2d.jpg", url:"https://www.bilibili.com/video/BV1hXAoeyETm/", date:"2025-02", tags:[] },
  { bvid:"BV1Rp9uY4ExU", title:"83: 热火朝天的冬季集训（1）", cover:"http://i2.hdslb.com/bfs/archive/f61453580a17573a85319210069510e0849bdc10.jpg", url:"https://www.bilibili.com/video/BV1Rp9uY4ExU/", date:"2025-02", tags:[] },
  { bvid:"BV1cV91YgEiL", title:"84: 热火朝天的冬季集训（2）", cover:"http://i2.hdslb.com/bfs/archive/f54fe594e7afd8923bb91dd202b3a29381f469bf.jpg", url:"https://www.bilibili.com/video/BV1cV91YgEiL/", date:"2025-03", tags:[] },
  { bvid:"BV1uQQzYAE2z", title:"85: 热火朝天的冬季集训（3）", cover:"http://i1.hdslb.com/bfs/archive/8a47c712ea63cb2caed8b674f98b0684ee04b0f0.jpg", url:"https://www.bilibili.com/video/BV1uQQzYAE2z/", date:"2025-03", tags:[] },
  { bvid:"BV15RXkYDEyf", title:"86: 热火朝天的冬季集训（4）", cover:"http://i0.hdslb.com/bfs/archive/bb7b31214dcb636a508c20b1fc70aa3d19493ceb.jpg", url:"https://www.bilibili.com/video/BV15RXkYDEyf/", date:"2025-03", tags:[] },
  { bvid:"BV16WZ9YuEXi", title:"89: 甜度爆表", cover:"http://i2.hdslb.com/bfs/archive/bd85becf855c93731c0bc21c686dbb7bd12c2ee1.jpg", url:"https://www.bilibili.com/video/BV16WZ9YuEXi/", date:"2025-04", tags:[] },
  { bvid:"BV1Y6EtzeEXo", title:"95: 瞧我的小嘴巴", cover:"http://i1.hdslb.com/bfs/archive/58b5eaabddb4606c80ef7332b5cc282f58880f51.jpg", url:"https://www.bilibili.com/video/BV1Y6EtzeEXo/", date:"2025-05", tags:[] },
  { bvid:"BV1HzTuzAEqC", title:"98: 无间道", cover:"http://i2.hdslb.com/bfs/archive/f74dd41c487f5b4f188556414c60aebcc6ad163c.jpg", url:"https://www.bilibili.com/video/BV1HzTuzAEqC/", date:"2025-06", tags:[] },
  { bvid:"BV167Hkz4ELh", title:"102: 神奇的猜丁壳", cover:"http://i0.hdslb.com/bfs/archive/014110698f64d0573937afabef0134726b172b39.jpg", url:"https://www.bilibili.com/video/BV167Hkz4ELh/", date:"2025-09", tags:[] },
  { bvid:"BV1UcW3zREpy", title:"103: 人生就是冲刺", cover:"http://i0.hdslb.com/bfs/archive/89f75001e0478a94bf966dcd0496290e543e5518.jpg", url:"https://www.bilibili.com/video/BV1UcW3zREpy/", date:"2025-09", tags:[] },
  { bvid:"BV1mAnVznEnQ", title:"104: 命运的巅峰对决", cover:"http://i0.hdslb.com/bfs/archive/8699338d8ca99c605c7e8fcb2a6215b75b548f00.jpg", url:"https://www.bilibili.com/video/BV1mAnVznEnQ/", date:"2025-09", tags:[] },
  { bvid:"BV1BgHVzzEHm", title:"105: 卡丁车接力赛", cover:"http://i0.hdslb.com/bfs/archive/11f60140e2cfb6e3207fa5b1564ea6c35eb550dd.jpg", url:"https://www.bilibili.com/video/BV1BgHVzzEHm/", date:"2025-10", tags:[] },
  { bvid:"BV19hWCzWEJj", title:"106: “海龟”不是“这个汤”", cover:"http://i0.hdslb.com/bfs/archive/30836e9bff6a353a31f83da3811671357ef026c1.jpg", url:"https://www.bilibili.com/video/BV19hWCzWEJj/", date:"2025-10", tags:[] },
  { bvid:"BV1xYsnzmEV3", title:"107: 离谱马拉松大赛", cover:"http://i2.hdslb.com/bfs/archive/67ddfc9df44a0a0a29b10b533f525be02a1d2d11.jpg", url:"https://www.bilibili.com/video/BV1xYsnzmEV3/", date:"2025-10", tags:[] },
  { bvid:"BV1os1KBbEoL", title:"108: “阿巴阿巴”描述大会", cover:"http://i0.hdslb.com/bfs/archive/f5663d94f25501378422b419dc6b4efffa45ccbb.jpg", url:"https://www.bilibili.com/video/BV1os1KBbEoL/", date:"2025-10", tags:[] },
  { bvid:"BV1qP23BGEaw", title:"109: 好想这样活一次", cover:"http://i2.hdslb.com/bfs/archive/c7bcaf0ab0dd3c93e9906a883013910c1700eb6e.jpg", url:"https://www.bilibili.com/video/BV1qP23BGEaw/", date:"2025-11", tags:[] },
  { bvid:"BV1HACMBvETY", title:"110: 鸭力不山大", cover:"http://i1.hdslb.com/bfs/archive/eeb8152af26f954dfc1b21bfddfb5c9ae760cb17.jpg", url:"https://www.bilibili.com/video/BV1HACMBvETY/", date:"2025-11", tags:[] },
  { bvid:"BV11YUjByEr5", title:"111: 你的尖叫我的梦", cover:"http://i2.hdslb.com/bfs/archive/cb319d125d293e05ef5355a80e00d10596bbcab3.jpg", url:"https://www.bilibili.com/video/BV11YUjByEr5/", date:"2025-11", tags:[] },
  { bvid:"BV1vUSEBKEuM", title:"112: 虚无游戏世界", cover:"http://i2.hdslb.com/bfs/archive/fda0830dc9d2d407fea69863872a767b33cfdeb0.jpg", url:"https://www.bilibili.com/video/BV1vUSEBKEuM/", date:"2025-11", tags:[] },
  { bvid:"BV1BAq9B6Ej3", title:"114: 今天不许好好唱", cover:"http://i1.hdslb.com/bfs/archive/4d150183de5100500020e77b87b5bc8b0beba924.jpg", url:"https://www.bilibili.com/video/BV1BAq9B6Ej3/", date:"2025-12", tags:[] },
  { bvid:"BV1vtvQBZEf2", title:"115: 我们的“元”气值满了", cover:"http://i1.hdslb.com/bfs/archive/9b3dc3feb6d14590496fdfa3f82bc3af1c7fe3ad.jpg", url:"https://www.bilibili.com/video/BV1vtvQBZEf2/", date:"2026-01", tags:[] },
  { bvid:"BV1vPiFB7Eap", title:"116: 神的主理人", cover:"http://i0.hdslb.com/bfs/archive/727266af41aa9e91a2eb5cdde7c9d29793063318.jpg", url:"https://www.bilibili.com/video/BV1vPiFB7Eap/", date:"2026-01", tags:[] },
  { bvid:"BV1ztrKBXE6n", title:"117: 直觉无限公司", cover:"http://i1.hdslb.com/bfs/archive/3f56f9fdc2f1762f17428939479a47e811385d40.jpg", url:"https://www.bilibili.com/video/BV1ztrKBXE6n/", date:"2026-01", tags:[] },
  { bvid:"BV1dFrkBmEDt", title:"118: 高雅人士局", cover:"http://i0.hdslb.com/bfs/archive/e836d0958d279ab65b608165adead27f29388365.jpg", url:"https://www.bilibili.com/video/BV1dFrkBmEDt/", date:"2026-01", tags:[] },
  { bvid:"BV1hYzMBgEk5", title:"119: 纸上谈兵", cover:"http://i2.hdslb.com/bfs/archive/38c7361ee430a204e4e8dc2f2464b045f2f4bf45.jpg", url:"https://www.bilibili.com/video/BV1hYzMBgEk5/", date:"2026-01", tags:[] },
  { bvid:"BV1VvZTBRELU", title:"122: 厨神争霸", cover:"http://i2.hdslb.com/bfs/archive/9894687d703b6974d01b94160cb230b0e8552212.jpg", url:"https://www.bilibili.com/video/BV1VvZTBRELU/", date:"2026-02", tags:[] },
  { bvid:"BV1TXZrB3Eux", title:"123: 反差的LOVE", cover:"http://i0.hdslb.com/bfs/archive/060f8f04a0bb1cc695a0c9e31396d261311f33a0.jpg", url:"https://www.bilibili.com/video/BV1TXZrB3Eux/", date:"2026-02", tags:[] },
]

const XINXING_DATA = [
  { bvid:"BV1ZYpRzZEWp", title:"01: 扎根", cover:"http://i2.hdslb.com/bfs/archive/a8f14f0d1788ef6f801005614f09a69493e5f2f8.jpg", url:"https://www.bilibili.com/video/BV1ZYpRzZEWp/", date:"2025-09", tags:[] },
  { bvid:"BV16XnnzFEAk", title:"02: 可能", cover:"http://i0.hdslb.com/bfs/archive/9aa5d6308f532156e29d245222bcf8123946618d.jpg", url:"https://www.bilibili.com/video/BV16XnnzFEAk/", date:"2025-09", tags:[] },
  { bvid:"BV1MAxxzqEQo", title:"03: 感知", cover:"http://i0.hdslb.com/bfs/archive/74072b8d0b0863987ac2a758384a512516f20495.jpg", url:"https://www.bilibili.com/video/BV1MAxxzqEQo/", date:"2025-10", tags:[] },
  { bvid:"BV1nU4AzhEbB", title:"04: 目标", cover:"http://i2.hdslb.com/bfs/archive/9a50d3ab5cfd4408b429de27e3d40052168dad3d.jpg", url:"https://www.bilibili.com/video/BV1nU4AzhEbB/", date:"2025-10", tags:[] },
  { bvid:"BV1d9WxzyEis", title:"05: 我们", cover:"http://i1.hdslb.com/bfs/archive/8e1840d774164ae0d0815a1a19dbba8af75857c1.jpg", url:"https://www.bilibili.com/video/BV1d9WxzyEis/", date:"2025-10", tags:[] },
  { bvid:"BV1LisdzYE6Y", title:"06: 千里目", cover:"http://i1.hdslb.com/bfs/archive/c6fa2c98dae035e8f32ea7baa2ab9e4602283b11.jpg", url:"https://www.bilibili.com/video/BV1LisdzYE6Y/", date:"2025-10", tags:[] },
  { bvid:"BV18q1LBGERG", title:"07: 回旋", cover:"http://i1.hdslb.com/bfs/archive/8c69363e36bee7a3e9cb895fe36cf003efe8f257.jpg", url:"https://www.bilibili.com/video/BV18q1LBGERG/", date:"2025-11", tags:[] },
  { bvid:"BV1mU1QB6EUd", title:"08: 心象", cover:"http://i1.hdslb.com/bfs/archive/194f6cd30c5ba385d098fed13318d796af058531.jpg", url:"https://www.bilibili.com/video/BV1mU1QB6EUd/", date:"2025-11", tags:[] },
  { bvid:"BV1F9CyBTEQp", title:"09: 勇", cover:"http://i2.hdslb.com/bfs/archive/e45954f3630f53949b83fbb04686fa9e9b71a5a4.jpg", url:"https://www.bilibili.com/video/BV1F9CyBTEQp/", date:"2025-11", tags:[] },
  { bvid:"BV1mFUpBaE9R", title:"10: 将至", cover:"http://i2.hdslb.com/bfs/archive/af3e47a2bdf7e0376284efb83735603f76095420.jpg", url:"https://www.bilibili.com/video/BV1mFUpBaE9R/", date:"2025-11", tags:[] },
  { bvid:"BV1oHSKBKEWR", title:"11: 段落", cover:"http://i0.hdslb.com/bfs/archive/0a84258ca2680c23c0c7d55fec6ff2c12ca1cb29.jpg", url:"https://www.bilibili.com/video/BV1oHSKBKEWR/", date:"2025-11", tags:[] },
  { bvid:"BV1e22XBREGg", title:"12: 闪光", cover:"http://i1.hdslb.com/bfs/archive/22b1175ada06bd9b2ac26b6c1d4bfe8d78ccbccf.jpg", url:"https://www.bilibili.com/video/BV1e22XBREGg/", date:"2025-12", tags:[] },
  { bvid:"BV1M2mXBUEga", title:"13: 归渡", cover:"http://i0.hdslb.com/bfs/archive/d318b7e60fc2ce1008f3b0d936015df9ddc8c832.jpg", url:"https://www.bilibili.com/video/BV1M2mXBUEga/", date:"2025-12", tags:[] },
  { bvid:"BV1ZwqkBrEi7", title:"14: 同频", cover:"http://i2.hdslb.com/bfs/archive/d13f8fd1ca55e1ec7615ec0c0e4583223275579f.jpg", url:"https://www.bilibili.com/video/BV1ZwqkBrEi7/", date:"2025-12", tags:[] },
  { bvid:"BV1nhvqB8E6V", title:"15: 弦外", cover:"http://i0.hdslb.com/bfs/archive/8ca896efee85599c8ebcec3522dde1d667610d3d.jpg", url:"https://www.bilibili.com/video/BV1nhvqB8E6V/", date:"2025-12", tags:[] },
  { bvid:"BV1CdiqBTERF", title:"16: 答案", cover:"http://i1.hdslb.com/bfs/archive/0b1f65ce9c3cc1cdb4b9bdf5160e602c90957eef.jpg", url:"https://www.bilibili.com/video/BV1CdiqBTERF/", date:"2026-01", tags:[] },
]

const PD_DATA = [
  { bvid:"BV19H6oYxEeo", title:"09: “生”乐大师", cover:"http://i0.hdslb.com/bfs/archive/4bc4994953550f21bfbfa48983af07030ba5c88d.jpg", url:"https://www.bilibili.com/video/BV19H6oYxEeo/", date:"2025-01", tags:[] },
  { bvid:"BV1qpPRenEca", title:"11: 惩罚大赛", cover:"http://i2.hdslb.com/bfs/archive/7a879983dae3f389a6bf44ae88b0822fa1fb3560.jpg", url:"https://www.bilibili.com/video/BV1qpPRenEca/", date:"2025-02", tags:[] },
  { bvid:"BV16bXsYyEm3", title:"14: 大馋小子萌", cover:"http://i0.hdslb.com/bfs/archive/95c2263d67c01d2815bcbec9ff4cfd3b0d9fad19.jpg", url:"https://www.bilibili.com/video/BV16bXsYyEm3/", date:"2025-03", tags:[] },
  { bvid:"BV16F7Tz7EhQ", title:"23: 大橘为重", cover:"http://i0.hdslb.com/bfs/archive/45907daa7e0c9ccbf6c548d067d7049d6d22db51.jpg", url:"https://www.bilibili.com/video/BV16F7Tz7EhQ/", date:"2025-05", tags:[] },
  { bvid:"BV1ga3JzpEi1", title:"24: 蛋生有手艺", cover:"http://i1.hdslb.com/bfs/archive/54667d65eccc8361ea5dcad4eea402a77c26d952.jpg", url:"https://www.bilibili.com/video/BV1ga3JzpEi1/", date:"2025-07", tags:[] },
]

const SIYI_DATA = [
  { bvid:"BV17tZDBJEEf", title:"01: 新春夜旅", cover:"http://i2.hdslb.com/bfs/archive/ca11c6b316b3da3a3f8574eac3d2855906812fe1.jpg", url:"https://www.bilibili.com/video/BV17tZDBJEEf/", date:"2026-02", tags:[] },
  { bvid:"BV1apAEzcEA7", title:"02: 白日研究所", cover:"http://i1.hdslb.com/bfs/archive/e1cb1ae7fbc4c164b14d8fedab836c59008847e3.jpg", url:"https://www.bilibili.com/video/BV1apAEzcEA7/", date:"2026-03", tags:[] },
  { bvid:"BV1hDXAB8EQG", title:"03: 星光收集员", cover:"http://i1.hdslb.com/bfs/archive/e1cb1ae7fbc4c164b14d8fedab836c59008847e3.jpg", url:"https://www.bilibili.com/video/BV1hDXAB8EQG/", date:"2026-03", tags:[] },
  { bvid:"BV17C9oBZE3j", title:"04: 误闯天家", cover:"http://i0.hdslb.com/bfs/archive/c377b9282d7beffa23029588e7340573437f9ac1.jpg", url:"https://www.bilibili.com/video/BV17C9oBZE3j/", date:"2026-05", tags:[] },
  { bvid:"BV1BsRXBEEGi", title:"05: 您有新的隐藏任务", cover:"http://i0.hdslb.com/bfs/archive/03466d733ed8d02a032b260ba4b41b405fa52979.jpg", url:"https://www.bilibili.com/video/BV1BsRXBEEGi/", date:"2026-05", tags:[] },
  { bvid:"BV1nk5r6dE5y", title:"06: 做完你的做你的", cover:"http://i0.hdslb.com/bfs/archive/19aa1d52c37d588b0f7422659ce2d8e3be9aafca.jpg", url:"https://www.bilibili.com/video/BV1nk5r6dE5y/", date:"2026-05", tags:[] },
  { bvid:"BV1i4Gq6YE35", title:"07: 福如大海", cover:"http://i1.hdslb.com/bfs/archive/5edc522711a84659e0fa75af8ec6d961e651af7e.jpg", url:"https://www.bilibili.com/video/BV1i4Gq6YE35/", date:"2026-05", tags:[] },
]

function GrowthBiliTab({ data, label }) {
  const [activeMonth, setActiveMonth] = useState<string|null>(null)

  if(!data || data.length===0) return (
    <div style={{textAlign:"center",padding:"42px 0",color:"var(--c-faint)"}}>
      <div style={{fontSize:36,marginBottom:10}}>🎬</div>
      <p style={{fontSize:13}}>「{label}」内容待添加 ✨</p>
    </div>
  )

  const byDate: Record<string,typeof data> = {}
  data.forEach(v=>{ if(!byDate[v.date]) byDate[v.date]=[]; byDate[v.date].push(v) })
  const sortedDates = Object.keys(byDate).sort((a,b)=>a.localeCompare(b))
  const displayed = activeMonth ? byDate[activeMonth]||[] : data

  return (
    <div>
      {/* 月份横排筛选 */}
      <div className="tabs-scroll" style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
        <button onClick={()=>setActiveMonth(null)} style={{
          padding:"4px 10px",borderRadius:100,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",flexShrink:0,
          border:`1px solid ${!activeMonth?"rgba(120,185,142,0.7)":"rgba(195,228,206,0.4)"}`,
          background:!activeMonth?"rgba(162,214,174,0.35)":"rgba(240,250,243,0.5)",
          color:!activeMonth?"var(--c-ink)":"var(--c-muted)",transition:"all 0.15s",
        }}>全部 ({data.length})</button>
        {sortedDates.map(date=>(
          <button key={date} onClick={()=>setActiveMonth(date)} style={{
            padding:"4px 10px",borderRadius:100,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",flexShrink:0,
            border:`1px solid ${activeMonth===date?"rgba(120,185,142,0.7)":"rgba(195,228,206,0.4)"}`,
            background:activeMonth===date?"rgba(162,214,174,0.35)":"rgba(240,250,243,0.5)",
            color:activeMonth===date?"var(--c-ink)":"var(--c-muted)",transition:"all 0.15s",
          }}>{date} <span style={{fontSize:9,opacity:0.6}}>({byDate[date].length})</span></button>
        ))}
      </div>

      {/* 视频网格 */}
      <div className="bili-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
        {displayed.map((v,i)=><BiliCard key={`${v.bvid}-${i}`} video={v}/>)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
//  成长录 Section
// ════════════════════════════════════════════
// 瑞麦时间线数据（虚拟演示）
const RUIMAI_DATA = [
  { year:"2017", age:7, songs:[
    { title:"丑八怪", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=130" },
    { title:"你怎么舍得我难过", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=131" },
    { title:"张三的歌", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=132" },
    { title:"玫瑰香", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=133" }
,
    { title:"阿楚姑娘", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=66" },
    { title:"唱脸谱", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=70" },
    { title:"Pink Venom", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=71" },
    { title:"Mascara", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=72" }
  ]},
  { year:"2018", age:8, songs:[
    { title:"鹿 be free", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=123" },
    { title:"倒数", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=124" },
    { title:"天黑黑", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=125" },
    { title:"说散就散", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=127" },
    { title:"最美的期待", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=128" },
    { title:"梦里花", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=129" }
  ]},
  { year:"2019", age:9, songs:[
    { title:"红玫瑰", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=116" },
    { title:"心如止水", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=117" },
    { title:"年轮", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=118" },
    { title:"我要你", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=119" },
    { title:"路之遥", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=120" },
    { title:"往日时光", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=121" }
  ]},
  { year:"2020", age:10, songs:[
    { title:"给电影人的情书", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=110" },
    { title:"Without You", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=112" },
    { title:"我们的爱", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=113" },
    { title:"有一种悲伤", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=114" },
    { title:"九儿", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=115" }
  ]},
  { year:"2021", age:11, songs:[
    { title:"I'll Always Love You", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=100" },
    { title:"门前情思大碗茶", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=101" },
    { title:"恰好", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=102" },
    { title:"Hero", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=103" },
    { title:"连名带姓", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=105" },
    { title:"人啊", url:"https://www.bilibili.com/video/BV1L24y1k7po/?p=107" }
  ]},
  { year:"2022", age:12, songs:[
    { title:"逆光", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=1" },
    { title:"像风一样", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=2" },
    { title:"永不失联的爱", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=3" },
    { title:"泡沫", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=4" },
    { title:"我很快乐", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=5" },
    { title:"人质", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=6" },
    { title:"起风了", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=7" },
    { title:"也许明天", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=8" },
    { title:"传奇", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=9" },
    { title:"洋葱", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=10" },
    { title:"My heart will go on", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=11" },
    { title:"至少还有你", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=12" },
    { title:"星辰大海", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=13" },
    { title:"路过人间", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=18" },
    { title:"兰亭序", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=29" },
    { title:"玫瑰少年", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=25" },
    { title:"我的天空", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=26" },
    { title:"一路生花", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=27" },
    { title:"玫瑰玫瑰我爱你", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=31" },
    { title:"crazy", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=34" },
    { title:"I Love You 3000", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=36" },
    { title:"若把你", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=38" },
    { title:"远走高飞", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=39" }
  ]},
  { year:"2023", age:13, songs:[
    { title:"光亮", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=42" },
    { title:"阿楚姑娘", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=57" },
    { title:"十二月的奇迹", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=41" },
    { title:"如愿", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=45" },
    { title:"篇章", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=46" },
    { title:"岩石里的花", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=47" },
    { title:"言不由衷", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=48" },
    { title:"我的美丽", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=49" },
    { title:"lose", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=51" },
    { title:"Love In The Dark", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=58" },
    { title:"one last time", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=59" },
    { title:"天若有情", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=60" },
    { title:"Forever Young", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=63" },
    { title:"Make You Feel My Love", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=64" },
    { title:"What Was I Made For", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=68" },
    { title:"我离开我自己", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=70" },
    { title:"我想", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=71" },
    { title:"strangers by nature", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=72" },
    { title:"退后", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=73" },
    { title:"你给我听好", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=74" },
    { title:"情非得已", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=76" },
    { title:"想你时风起", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=77" },
    { title:"小偷", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=79" },
    { title:"Deja Vu", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=80" },
    { title:"甜口良药", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=81" }
  ]},
  { year:"2024", age:14, songs:[
    { title:"旅行中忘记", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=87" },
    { title:"Paper Hearts", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=125" },
    { title:"野花香", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=99" },
    { title:"是你", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=91" },
    { title:"咸鱼", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=82" },
    { title:"不亏不欠", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=83" },
    { title:"恭喜恭喜", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=85" },
    { title:"一直很安静", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=88" },
    { title:"Bye", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=89" },
    { title:"心酸", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=93" },
    { title:"非我不可", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=94" },
    { title:"雨天", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=96" },
    { title:"二十二", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=98" },
    { title:"落日只会道别", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=100" },
    { title:"comedy", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=103" },
    { title:"浪漫纯属虚构", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=124" },
    { title:"水星记", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=106" },
    { title:"阳光下的星星", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=105" },
    { title:"If You", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=107" },
    { title:"Love", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=108" },
    { title:"Boy's a liar Pt. 2", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=109" },
    { title:"Dancing with the Devil", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=110" },
    { title:"distance", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=111" },
    { title:"distance（2）", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=112" },
    { title:"missin you", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=113" },
    { title:"Prisoner", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=114" },
    { title:"夜上海", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=116" },
    { title:"自作曲（非自填词）", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=120" },
    { title:"达尔文", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=118" },
    { title:"明明", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=123" },
    { title:"落叶归根", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=122" },
    { title:"same girl", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=126" },
    { title:"剪爱", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=127" },
    { title:"失恋循环", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=128" },
    { title:"If I Ain't Got You", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=98" }
  ]},
  { year:"2025", age:15, songs:[
    { title:"Trust Me", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=134" },
    { title:"All I Want for Christmas Is You", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=129" },
    { title:"继续-给十五岁的自己", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=130" },
    { title:"左手指月", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=132" },
    { title:"如果当时", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=136" },
    { title:"Small Girl", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=135" },
    { title:"Letting Go", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=138" },
    { title:"行李", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=139" },
    { title:"珠玉", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=140" },
    { title:"卡拉永远OK", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=141" },
    { title:"雨爱", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=145" },
    { title:"暮色回响", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=143" },
    { title:"月亮代表我的心", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=150" },
    { title:"Sorry Would Go a Long Way", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=151" },
    { title:"Tears（原创）", url:"https://www.bilibili.com/video/BV1seKPeZESo/?p=152" }
  ]},
]

function RuiMaiSection() {
  return (
    <div style={{position:"relative",paddingLeft:24}}>
      <div style={{
        position:"absolute",left:8,top:0,bottom:0,width:2,
        background:"linear-gradient(to bottom,rgba(79,168,104,0.6),rgba(162,214,174,0.2))",
        borderRadius:2,
      }}/>
      {RUIMAI_DATA.map((group,gi)=>(
        <div key={group.year} style={{marginBottom:32,position:"relative"}}>
          <div style={{position:"absolute",left:-28,top:3,width:16,height:16,borderRadius:"50%",background:"rgba(79,168,104,0.9)",border:"3px solid rgba(200,240,210,0.9)",boxShadow:"0 2px 8px rgba(40,100,56,0.3)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontSize:20,fontWeight:900,color:"var(--c-ink)",letterSpacing:"-0.02em"}}>{group.year}</span>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(79,168,104,0.9)",background:"rgba(162,214,174,0.2)",border:"1px solid rgba(120,185,142,0.4)",borderRadius:100,padding:"2px 10px"}}>{group.age}岁</span>
            <span style={{fontSize:10,color:"var(--c-faint)"}}>{group.songs.length}首</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {group.songs.map((song,si)=>(
              <a key={si} href={song.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                <div style={{
                  padding:"5px 12px",borderRadius:100,fontSize:12,fontWeight:600,
                  background:"rgba(240,250,243,0.7)",
                  border:"1px solid rgba(195,228,206,0.5)",
                  color:"var(--c-ink-2)",
                  transition:"all 0.15s",whiteSpace:"nowrap",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(162,214,174,0.35)";e.currentTarget.style.color="var(--c-ink)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(240,250,243,0.7)";e.currentTarget.style.color="var(--c-ink-2)"}}>
                  🎤 {song.title}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GrowthSection({ onLightbox }) {
  const tabs = ["星期五练习生","一颗好星星","PD的蛋生","四一有意思","喵生日记","瑞麦🎤"]
  const [activeTab, setActiveTab] = useState("星期五练习生")

  const tabLabel = (t) => {
    const map = {"星期五练习生":"📅 星期五练习生","一颗好星星":"⭐ 一颗好星星","PD的蛋生":"🥚 PD的蛋生","四一有意思":"🎯 四一有意思","喵生日记":"🐱 喵生日记"}
    return map[t] || t
  }

  const placeholder = (emoji, name) => (
    <div style={{textAlign:"center",padding:"42px 0",color:"var(--c-faint)"}}>
      <div style={{fontSize:36,marginBottom:10}}>{emoji}</div>
      <p style={{fontSize:13}}>「{name}」内容待上传 ✨</p>
      <p style={{fontSize:11.5,color:"var(--c-faint)",marginTop:8}}>上传相关视频/图片后此板块将自动展示</p>
    </div>
  )

  return (
    <div>
      <div className="tabs-scroll" style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{
            padding:"6px 16px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
            border:"1px solid",transition:"all 0.18s",
            ...(activeTab===t
              ?{background:"linear-gradient(135deg,rgba(162,214,174,0.6),rgba(130,190,152,0.45))",borderColor:"rgba(120,185,142,0.7)",color:"var(--c-ink)",boxShadow:"0 2px 10px rgba(40,100,56,0.12)"}
              :{background:"rgba(255,255,255,0.38)",borderColor:"rgba(195,228,206,0.5)",color:"var(--c-muted)"}
            ),
          }}>{tabLabel(t)}</button>
        ))}
      </div>

      {activeTab==="喵生日记"&&<MiaoDiary/>}
      {activeTab==="瑞麦🎤"&&<RuiMaiSection/>}
      {activeTab==="星期五练习生"&&<GrowthBiliTab data={XINGQI5_DATA} label="星期五练习生"/>}
      {activeTab==="一颗好星星"&&<GrowthBiliTab data={XINXING_DATA} label="一颗好星星"/>}
      {activeTab==="PD的蛋生"&&<GrowthBiliTab data={PD_DATA} label="PD的蛋生"/>}
      {activeTab==="四一有意思"&&<GrowthBiliTab data={SIYI_DATA} label="四一有意思"/>}
    </div>
  )
}

// 抖音板块
const DOUYIN_SOLO = [
  { title:"巴适得板🤙Perfect！", url:"https://v.douyin.com/1HO4R2Sfvos/" },
  { title:"祝你发发发光✨", url:"https://v.douyin.com/DQnG8yp14GI/" },
  { title:"SHUT UP and ❤️‍🔥", url:"https://v.douyin.com/xDOSOMfkxLk/" },
  { title:"cute or not？", url:"https://v.douyin.com/ByLLp2Nh9Ko/" },
  { title:"和张函瑞一起奔跑到城市断电⚡️", url:"https://v.douyin.com/U7p-M0slqxY/" },
  { title:"1018%% focused", url:"https://v.douyin.com/SCQ-8Rwmtc4/" },
  { title:"😻💖", url:"https://v.douyin.com/aDRJP1PDMLA/" },
  { title:"pop it⚡️🦾", url:"https://v.douyin.com/C6ar01U8RMo/" },
  { title:"Eyes👁️", url:"https://v.douyin.com/BxPx4k3wvpc/" },
  { title:"这一刻和张函瑞的心动遇见💓", url:"https://v.douyin.com/P2SxlYfgsmg/" },
  { title:"开拍前想到了一个很炫的运镜方式😼", url:"https://v.douyin.com/xxpB1zHrNtw/" },
  { title:"大事很妙✨", url:"https://v.douyin.com/lNR6d5RaRrU/" },
  { title:"就像大冒险🐚", url:"https://v.douyin.com/UehHsYjcpcw/" },
  { title:"也是cha上了rude boy 师兄的舞真帅👍", url:"https://v.douyin.com/1A-ts8OyofI/" },
  { title:"跳舞时，抓到一个路过的😃", url:"https://v.douyin.com/VsIlcedv3uY/" },
  { title:"2023新年音乐会", url:"https://v.douyin.com/py2y-tAo1gQ/" },
  { title:"10月路演", url:"https://v.douyin.com/pY_ct1buPJ8/" },
  { title:"10月路演 vol.2", url:"https://v.douyin.com/RxGc-1-p_yI/" },
  { title:"You've been the best part", url:"https://v.douyin.com/Zj4G0045d6U/" },
]

const DOUYIN_GROUP = [
  { title:"我们祝你十全十美🧧", url:"https://v.douyin.com/Ii4m95aa1YE/" },
  { title:"we're 发发发发发发发发NOW", url:"https://v.douyin.com/WjDZClMl4DM/" },
  { title:"《听说你们最近\"发\"了》", url:"https://www.iesdouyin.com/share/video/7608515155039392697/" },
  { title:"出大事了！和黄子弘凡一起奔跑到城市断电", url:"https://v.douyin.com/uhPzSIAKt1Q/" },
  { title:"on beat😗", url:"https://v.douyin.com/6Gor0A0jun0/" },
  { title:"可以和你奔跑到城市断电⚡️", url:"https://v.douyin.com/KVqfSdSKjmI/" },
  { title:"🎬《适合，不适合》小剧场 EP3", url:"https://v.douyin.com/5uNgMtwq470/" },
  { title:"🎬《适合，不适合》小剧场 EP5", url:"https://v.douyin.com/s7CsohCxu6g/" },
  { title:"Happy happy happy happy✌️", url:"https://v.douyin.com/_4wy8n_yCfo/" },
  { title:"2026一定是超级福星！🍃✨", url:"https://v.douyin.com/Ird-yscFzIA/" },
  { title:"🎬《适合，不适合》小剧场 EP4", url:"https://v.douyin.com/HnujRDbQdN4/" },
  { title:"🎬《适合，不适合》小剧场 EP2", url:"https://v.douyin.com/DHCbJOPOaz0/" },
  { title:"比烟花更绚烂的是奔向你时的心跳🎆", url:"https://v.douyin.com/Gq4hVA4xgVo/" },
  { title:"Run to you🌄🏃", url:"https://v.douyin.com/6i4T1rSjrrE/" },
  { title:"请选择「适合」你的聊天好友🔍", url:"https://v.douyin.com/PsdrdUFf8d0/" },
  { title:"🎬《适合，不适合》小剧场 EP1", url:"https://v.douyin.com/Q8MCkDbzSu4/" },
  { title:"见到真正的雪了！⛄️", url:"https://v.douyin.com/E4bz8dnhkcU/" },
  { title:"Do it like you💥", url:"https://v.douyin.com/BH-kb2uBbYI/" },
  { title:"今天晚上吃什么？🍝", url:"https://v.douyin.com/61RfyPUyfWs/" },
  { title:"好想这样活一次👕", url:"https://v.douyin.com/D8IK_QppKLo/" },
  { title:"北京公司影音室正确打开方式🌠", url:"https://v.douyin.com/ufwvuK3vDcw/" },
  { title:"函瑞生日快乐！地球On Line经验➕1🎂", url:"https://v.douyin.com/MR2x2oE9VhU/" },
  { title:"中秋佳节🎑月满人圆", url:"https://v.douyin.com/qPc-40aGhCc/" },
  { title:"FaSHioN", url:"https://v.douyin.com/0VKn5-k6jao/" },
  { title:"冰箱里面有什么🍬", url:"https://v.douyin.com/OvnGamn3Bzs/" },
  { title:"2023新年音乐会《街舞少年》", url:"https://v.douyin.com/eHrQ2RzLgqU/" },
  { title:"抽出一张「红桃7」Lucky Seven🥰", url:"https://v.douyin.com/oKnY4jgUAPc/" },
  { title:"二选一BALANCE GAME", url:"https://v.douyin.com/JFZppLgP_vQ/" },
  { title:"挑战爱到1440分钟💞", url:"https://v.douyin.com/O6MoOO9bWDU/" },
  { title:"浪漫纯属虚构手势舞 场景2️⃣", url:"https://v.douyin.com/5iR-tzDFji0/" },
  { title:"一起来花式复刻童年照😉", url:"https://v.douyin.com/XpoQTFrZmLs/" },
  { title:"Two dollars💲", url:"https://v.douyin.com/bg0casCj47I/" },
  { title:"看看我👀", url:"https://v.douyin.com/jmoWeUjATbU/" },
  { title:"10月路演《抢凳子》", url:"https://v.douyin.com/JxXP6XYtSJg/" },
  { title:"Love you❣️", url:"https://v.douyin.com/25pMLYg_m-M/" },
  { title:"浪漫纯属虚构手势舞 场景3️⃣", url:"https://v.douyin.com/neQ-JVGbWLs/" },
  { title:"baby舞蹈挑战", url:"https://v.douyin.com/wr5hXVX_KPU/" },
  { title:"10月路演《老鹰抓小鸡》", url:"https://v.douyin.com/HlmvlWuv8zc/" },
  { title:"张真源《爱在终局之前》", url:"https://v.douyin.com/q9FBSL6cAiI/" },
  { title:"课间学习喜欢的舞蹈", url:"https://v.douyin.com/1tFCMyKo8no/" },
  { title:"来玩一个有趣的游戏吧🎮 APT.", url:"https://v.douyin.com/hPP_vycGLEA/" },
  { title:"不管几岁，快乐万岁！", url:"https://v.douyin.com/1brxpY8MjCA/" },
  { title:"2023新年音乐会《Miracle》+《Pink Venom》", url:"https://v.douyin.com/sD3Yh95UffM/" },
  { title:"它亲我了🥰", url:"https://v.douyin.com/1z7ZY2TZdtE/" },
  { title:"那年的相遇分开都飘着花🌼", url:"https://v.douyin.com/om7uH3tPNyQ/" },
  { title:"我们编的手势舞来啦✌️", url:"https://v.douyin.com/dr6CuGrXfX0/" },
  { title:"Like I do.", url:"https://v.douyin.com/Z9fp1oHhA3U/" },
  { title:"大年初三，三千万的话", url:"https://v.douyin.com/TFHiWgKlElU/" },
  { title:"we'll be here😎", url:"https://v.douyin.com/JqTHk6cz1QY/" },
  { title:"新年一定要快乐！Yes 蛇🐍", url:"https://v.douyin.com/TyldaKZwJw0/" },
  { title:"一些火热的瞬间🔥", url:"https://v.douyin.com/CMrYZnIgyxY/" },
  { title:"我只为你而来", url:"https://v.douyin.com/O-q4blMibCY/" },
  { title:"天气晴朗，享受阳光🎵", url:"https://v.douyin.com/cKXingYPdSw/" },
  { title:"周末见到好朋友的精神状态🥰", url:"https://v.douyin.com/1uEdBKItUYA/" },
  { title:"和你的一眼万年合拍", url:"https://v.douyin.com/4_SPsjZ1sr4/" },
  { title:"Get it🫡 UP", url:"https://v.douyin.com/wv6TAJUmQA4/" },
  { title:"talk saxy🎷", url:"https://v.douyin.com/HY-KHb6y_D8/" },
  { title:"可爱的乱舞🧟‍♂️", url:"https://v.douyin.com/9qPUd5W-ofM/" },
  { title:"心动是？拉钩一百万年💓", url:"https://v.douyin.com/K8ft1glcWPY/" },
  { title:"🌟🌟🌟", url:"https://v.douyin.com/7vaORGCnD9s/" },
  { title:"浪漫纯属虚构手势舞 场景1️⃣", url:"https://v.douyin.com/Pcw0_U3l5Lw/" },
  { title:"TF家族练习生flower挑战", url:"https://v.douyin.com/3qi8LM9eNGc/" },
  { title:"时过境迁的手势", url:"https://v.douyin.com/m5HeyyaoMDI/" },
  { title:"Ka ji ma Baby🥲", url:"https://v.douyin.com/MhYhyCLXVuI/" },
  { title:"backseat 🤩", url:"https://v.douyin.com/0SxCZjqzagU/" },
  { title:"丘比特瞄准射中我的心门💘", url:"https://v.douyin.com/O1qcVdB8nnQ/" },
  { title:"10月路演《Beautiful》", url:"https://v.douyin.com/pIZhZMYlIOM/" },
  { title:"小猫转圈舞的惩罚😸", url:"https://v.douyin.com/e-3x-EfQ6DY/" },
  { title:"女团舞接力舞蹈3️⃣", url:"https://v.douyin.com/IF09lj4-SCA/" },
  { title:"想和你做朋友", url:"https://v.douyin.com/8XcwxzipgBs/" },
  { title:"熟悉的身影散落蝴蝶般飞过", url:"https://v.douyin.com/iHofJuXRreI/" },
  { title:"10月路演《萤火》", url:"https://v.douyin.com/Hpk8FqrCfeI/" },
  { title:"少年们热烈的奔赴🤩", url:"https://v.douyin.com/wzG82pxEt1s/" },
  { title:"天台舞蹈✅", url:"https://v.douyin.com/dzZURmMPlMQ/" },
  { title:"《You》", url:"https://v.douyin.com/b_pojMUru3o/" },
  { title:"72变小课堂 feat.瑞瑞老师😸", url:"https://v.douyin.com/IUZz3u70Lys/" },
  { title:"制作浪漫的过程也如此浪漫💓", url:"https://v.douyin.com/OMJSvrQq5kg/" },
  { title:"henny talk时间🕒", url:"https://v.douyin.com/EiVBON9ViyA/" },
  { title:"手忙脚乱地耍帅😎", url:"https://v.douyin.com/Vo8porv0mLw/" },
  { title:"危险！不要偷偷溜出门哦⚠️", url:"https://v.douyin.com/6Q8rzPkIXmg/" },
  { title:"给大家下一场小雪吧⛄️", url:"https://v.douyin.com/3Sqnq65nmc0/" },
  { title:"欢喜侬💓", url:"https://v.douyin.com/oaZ7zZ81XDs/" },
  { title:"And I see you✨", url:"https://v.douyin.com/yz5iYLtDL5I/" },
  { title:"鼓掌传舞✖️4😺", url:"https://v.douyin.com/qJNxRQkYhp0/" },
  { title:"梦里面空气开始冒烟", url:"https://v.douyin.com/ubZXYBtaQ6Q/" },
  { title:"真的很难说服自己😂💓", url:"https://v.douyin.com/6GTP8_dC9ho/" },
  { title:"被自己帅晕惹🙀", url:"https://v.douyin.com/TUi--PXclKw/" },
  { title:"亮出三记喵喵拳🐱", url:"https://v.douyin.com/_qKcKxJ8d9o/" },
  { title:"用baby打开运动会变装💓", url:"https://v.douyin.com/YE3Ca_-f_Ag/" },
  { title:"10月路演《姐姐恋爱吧》", url:"https://v.douyin.com/C9zh5kBYyz0/" },
  { title:"今日舞蹈练习《楼外楼》", url:"https://v.douyin.com/Q-fQtM8WmiI/" },
  { title:"To X.", url:"https://v.douyin.com/re1aIRbWOcA/" },
  { title:"五月请尽情可爱😻", url:"https://v.douyin.com/w0BVh2mkRuc/" },
  { title:"春暖花开樱你而来🌸", url:"https://v.douyin.com/rwa3G91Zec8/" },
  { title:"Killin' It🔫", url:"https://v.douyin.com/QtftmkG0JDQ/" },
  { title:"有大家一起❄️", url:"https://v.douyin.com/bhNaJAxNnaQ/" },
  { title:"不要害羞跟我一起跳👌", url:"https://v.douyin.com/iOnAD_Jigc4/" },
  { title:"10月路演《我的天空》", url:"https://v.douyin.com/_3wn1Yfr0E8/" },
  { title:"默契度💯", url:"https://v.douyin.com/FWUUu-3N_0Y/" },
  { title:"乐器串烧🎹🎸🥁", url:"https://v.douyin.com/mFTXBSS7Rzo/" },
  { title:"在热血这一块我寸步不让🥊", url:"https://v.douyin.com/IOkjEKGMl3w/" },
  { title:"《情非得已》", url:"https://v.douyin.com/ouiqzxaKd0g/" },
  { title:"让我听见bingo bingo🙆‍♂️", url:"https://v.douyin.com/IXx3p32PVqg/" },
]

function DouyinSection() {
  const [activeGroup, setActiveGroup] = useState<"单人"|"多人">("单人")
  const list = activeGroup === "单人" ? DOUYIN_SOLO : DOUYIN_GROUP

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {(["单人","多人"] as const).map(g=>(
          <button key={g} onClick={()=>setActiveGroup(g)} style={{
            padding:"6px 20px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
            border:"1px solid",transition:"all 0.18s",
            ...(activeGroup===g
              ?{background:"linear-gradient(135deg,rgba(162,214,174,0.6),rgba(130,190,152,0.45))",borderColor:"rgba(120,185,142,0.7)",color:"var(--c-ink)",boxShadow:"0 2px 10px rgba(40,100,56,0.12)"}
              :{background:"rgba(255,255,255,0.38)",borderColor:"rgba(195,228,206,0.5)",color:"var(--c-muted)"}
            ),
          }}>{g==="单人"?"🙋 单人":"👥 多人"}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div style={{textAlign:"center",padding:"42px 0",color:"var(--c-faint)"}}>
          <div style={{fontSize:36,marginBottom:10}}>🎵</div>
          <p style={{fontSize:13}}>「抖音 · {activeGroup}」内容待添加 ✨</p>
        </div>
      ) : (
        <div style={{position:"relative",paddingLeft:20}}>
          <div style={{position:"absolute",left:6,top:4,bottom:4,width:1,background:"linear-gradient(to bottom,rgba(255,60,90,0.4),rgba(255,60,90,0.05))"}}/>
          {list.map((v,i)=>(
            <div key={i} style={{position:"relative",marginBottom:6}}>
              <div style={{position:"absolute",left:-17,width:8,height:8,borderRadius:"50%",background:"rgba(255,60,90,0.7)",border:"2px solid rgba(255,200,210,0.9)",marginTop:8}}/>
              <a href={v.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                <div style={{
                  display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                  background:"rgba(255,255,255,0.38)",border:"1px solid rgba(195,228,206,0.4)",
                  borderRadius:8,transition:"all 0.15s",cursor:"pointer",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,240,243,0.6)";e.currentTarget.style.borderColor="rgba(255,150,170,0.4)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.38)";e.currentTarget.style.borderColor="rgba(195,228,206,0.4)"}}
                >
                  <span style={{fontSize:10,background:"rgba(255,60,90,0.1)",color:"#e1213a",border:"1px solid rgba(255,60,90,0.2)",borderRadius:4,padding:"1px 6px",fontWeight:700,flexShrink:0}}>抖音</span>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--c-ink)",flex:1}}>{v.title}</span>
                  <span style={{fontSize:11,color:"var(--c-faint)",flexShrink:0}}>→</span>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 张建国喵生日记
function MiaoDiary() {
  const [tab, setTab] = useState<"喵少"|"喵爷">("喵少")
  const [lightbox, setLightbox] = useState<string|null>(null)

  const BASE = "https://res.cloudinary.com/demfj39xl/image/upload"
  const VBASE = "https://res.cloudinary.com/demfj39xl/video/upload"

  const entries = {
    喵少: [
      {
        date: "2024/03/21",
        content: "给大家介绍一下我的新宠物😜他叫张建国～\n米努特矮脚弟弟🐱小名还没想好🤔建国很可爱哟！性格比较调皮😈我们一起记录他的成长吧😚🥳",
        media: [{ type:"video", url:`${VBASE}/hanrui/public/zhangjiangguo/24-03-21.mp4` }],
      },
      {
        date: "2024/09/23",
        content: "😼大家都来看一下，今天满九个月的张建国吧！建国宝宝又成长了一些😼相信大家也发现它最近发腮了😹加油 我们一起长大😾！（提一嘴：这两张张建国都是在我教爸爸怎么打光的过程中顺便拍的！感觉还可以😹）",
        media: [1,2,3].map(n=>({ type:"img", url:`${BASE}/hanrui/public/2024-09/2024-09-23_21-23-09_${n}.jpg` })),
      },
      {
        date: "2024/12/23",
        content: "你好，张建国。今天是你的一岁生日，作为哥哥的我很开心能见证你这一年来的成长。希望你以后每一天都平安快乐，哥哥和爸爸妈妈会永远陪伴你。（你听不懂人类语言，我就不多说了😹）那么，让我们一起正式的祝张建国生日快乐吧——HAPPY BIRTHDAY 生日快乐🎊🎊🎊🎂🎂🎂🐱🐱",
        media: [1,2,3,4,5,6,7].map(n=>({ type:"img", url:`${BASE}/hanrui/public/2024-12/2024-12-23_21-26-12_${n}.jpg` })),
      },
    ],
    喵爷: [
      {
        date: "2025/04/25",
        content: "国咪新亮相！最近它瘦了，我们都挺担心的☹️一吃肉罐头就窜稀，简直\u201c脆皮肠\u201d😹最近国咪毛多惨了，拍完视频衣服都报废两件！🥲但是都不要说建国胖建国丑！我们建国只是青春期加上毛多而已！",
        media: [{ type:"video", url:`${VBASE}/hanrui/public/zhangjiangguo/2025-04-25.mp4` }],
      },
      {
        date: "2025/10/18",
        content: "和小主人一起度过了小主人的16岁生日",
        media: ["6","8","5","10"].map(n=>({ type:"img", url:`${BASE}/hanrui/public/2025-10/2025-10-18_10-18-29_${n}.jpg` })),
      },
    ],
  }

  return (
    <>
      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}

      {/* 标题 */}
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:28,marginBottom:6}}>🐱</div>
        <div style={{fontSize:16,fontWeight:800,color:"var(--c-ink)"}}>张建国的喵生日记</div>
        <div style={{fontSize:12,color:"var(--c-muted)",marginTop:4}}>记录一只米努特矮脚猫的成长 🐾</div>
      </div>

      {/* 喵少/喵爷切换 */}
      <div style={{display:"flex",gap:8,marginBottom:20,justifyContent:"center"}}>
        {(["喵少","喵爷"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"6px 22px",borderRadius:100,fontSize:12,fontWeight:700,fontFamily:"inherit",cursor:"pointer",
            border:"1px solid",transition:"all 0.18s",
            ...(tab===t
              ?{background:"linear-gradient(135deg,rgba(255,200,120,0.5),rgba(255,170,80,0.4))",borderColor:"rgba(220,150,60,0.6)",color:"var(--c-ink)"}
              :{background:"rgba(255,255,255,0.38)",borderColor:"rgba(195,228,206,0.5)",color:"var(--c-muted)"}
            ),
          }}>{t==="喵少"?"🐱 喵少":"👑 喵爷"}</button>
        ))}
      </div>

      {/* 日记列表 */}
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {entries[tab].map((entry,i)=>(
          <div key={i} style={{
            background:"rgba(255,255,255,0.55)",backdropFilter:"blur(10px)",
            border:"1px solid rgba(195,228,206,0.5)",borderRadius:16,
            overflow:"hidden",boxShadow:"0 2px 12px rgba(40,100,56,0.06)",
          }}>
            {/* 日记头部 */}
            <div style={{
              padding:"12px 16px",
              background:"linear-gradient(135deg,rgba(255,240,200,0.4),rgba(255,220,150,0.25))",
              borderBottom:"1px solid rgba(195,228,206,0.3)",
              display:"flex",alignItems:"center",gap:10,
            }}>
              <div style={{fontSize:18}}>🐾</div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(160,100,30,0.8)",letterSpacing:"0.05em"}}>{entry.date}</div>
                <div style={{fontSize:10,color:"var(--c-muted)"}}>From建国的小主人</div>
              </div>
            </div>

            {/* 正文 */}
            <div style={{padding:"14px 16px"}}>
              <div style={{fontSize:13,color:"var(--c-ink-2)",lineHeight:1.9,whiteSpace:"pre-line",marginBottom:entry.media.length?14:0}}>
                {entry.content}
              </div>

              {/* 媒体 */}
              {entry.media.length>0&&(
                <div style={{
                  display:"grid",
                  gridTemplateColumns:entry.media.length===1?"1fr":`repeat(${Math.min(entry.media.length,3)},1fr)`,
                  gap:6,
                }}>
                  {entry.media.map((m,j)=>(
                    m.type==="video" ? (
                      <video key={j} src={m.url} controls
                        style={{width:"100%",borderRadius:10,border:"1px solid rgba(195,228,206,0.4)",display:"block",maxHeight:320,objectFit:"cover"}}
                      />
                    ) : (
                      <div key={j} onClick={()=>setLightbox(m.url)} style={{
                        borderRadius:10,overflow:"hidden",cursor:"pointer",
                        border:"1px solid rgba(195,228,206,0.4)",
                        aspectRatio:"1",
                        transition:"transform 0.15s",
                      }}
                      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
                      onMouseLeave={e=>e.currentTarget.style.transform=""}>
                        <img src={m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ════════════════════════════════════════════
//  旅行板块
// ════════════════════════════════════════════
const TRAVEL_DATA = [
  {
    id:"quanzhou",
    name:"泉州",
    lat:24.87, lng:118.68,
    emoji:"🎸",
    share:"当了一天的驻唱 对自己来说是一种比较新奇的体验😹不过这一天忙忙碌碌的很充实，也过得很开心！希望能有更多的机会和大家再做这样的事，也许是经营一家店呢？哈哈，不管怎么样都很感谢大家对彼此的支持！😼",
    shareDate:"2024-09",
    climate:"泉州属亚热带海洋性季风气候，全年温暖湿润。春季（3-5月）多雨，夏季（6-9月）炎热有台风，秋季（10-11月）最为舒适，冬季（12-2月）温和少寒。",
    bestTime:"10-11月 / 3-4月",
    tips:["西街是泉州最古老的街道，开元寺必去","泉州小吃推荐面线糊、牛肉羹、海蛎煎","清源山可以俯瞰全城，老君岩石像很壮观","崇武古城海边风景绝美，适合拍日落","洛阳桥是中国第一座跨海石桥，历史悠久"],
    scenery:[
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-22_20-26-56_1.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-22_20-26-56_2.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-22_20-26-56_3.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-22_20-26-56_4.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-22_20-26-56_5.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-22_20-26-56_6.jpg",
    ]
  },
  {
    id:"chengdu",
    name:"成都",
    lat:30.67, lng:104.07,
    emoji:"🐼",
    share:"一些在成都的moment～（有两张是在重庆拍的👍）我是用一个卡片机拍的，希望大家看了之后心情美丽～^_^",
    shareDate:"2024-09",
    climate:"成都属亚热带湿润气候，四季分明但少见阳光，有「蜀犬吠日」之说。春秋（3-5月、9-11月）最宜游览，气温15-25°C。夏季（6-8月）闷热潮湿，冬季阴冷少雪。",
    bestTime:"3-5月 / 9-11月",
    tips:["宽窄巷子适合下午漫步，避开周末高峰","大熊猫基地建议早上8点前入园，熊猫最活跃","成都小吃推荐钟水饺、龙抄手、赖汤圆","武侯祠和锦里可以连着逛，步行5分钟","太古里适合夜晚拍照，灯光效果超好"],
    scenery:[
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_1.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_2.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_3.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_4.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_5.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_6.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_7.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_8.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2024-09/2024-09-08_21-46-52_9.jpg",
    ]
  },
  {
    id:"chongqing",
    name:"重庆",
    lat:29.56, lng:106.55,
    emoji:"🌆",
    mapEmoji:"",
    share:"这两天出去放松了一下🍃\n能量恢复中！🥹🥹😘",
    shareDate:"2025-06",
    climate:"重庆是『雾都』，全年湿润多雨。夏季（6-8月）极热，可达40°C，需做好防晒。春秋（3-5月、9-10月）气候宜人是最佳游览时间。冬季阴冷但少见降雪。",
    bestTime:"3-5月 / 9-10月",
    tips:["洪崖洞傍晚18:00后灯光亮起最美","解放碑步行街是购物好去处","来重庆必吃正宗火锅和小面","磁器口古镇适合拍照，避开周末人流"],
    scenery:[
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_1.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_2.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_3.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_4.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_5.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_6.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_7.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_8.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-06/2025-06-17_15-14-39_9.jpg",
    ]
  },
  {
    id:"haikou",
    name:"海口",
    lat:20.04, lng:110.32,
    emoji:"🌴",
    share:"请你看我的平行时空里的青春～😿 也许在另一个时空里 我可能真的会做摄影呢💭",
    shareDate:"2026-04",
    climate:"海口属热带季风气候，全年高温多雨。冬季（12-2月）是旅游旺季，气温20-26°C，凉爽舒适。夏季（6-9月）炎热潮湿，气温可达35°C以上，还有台风影响。春秋季节温热，雨水较多。",
    bestTime:"11月-次年2月",
    tips:["骑楼老街是必去的历史街区，适合下午拍照","海南粉和清补凉是当地必吃美食","假日海滩适合看日落，傍晚最美","五公祠历史悠久，了解海南文化必去","从海口坐高铁可以快速去三亚"],
    scenery:[
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_8.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_3.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_6.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_7.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_1.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_2.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_4.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_5.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2026-04/2026-04-15_20-36-45_9.jpg",
    ]
  },
  {
    id:"nanaodao",
    name:"南澳岛",
    lat:23.42, lng:117.02,
    emoji:"🏝️",
    share:"「说不出旅行的意义」🌊",
    shareDate:"2025-08",
    climate:"南澳岛属亚热带海洋性气候，全年温暖湿润。夏季（6-9月）气温25-33°C，海水温暖适合游泳，但需注意台风季。秋冬（10-3月）气候凉爽，海浪较大不适合下水，适合海边散步观景。",
    bestTime:"4-6月 / 10-11月",
    tips:["岛上交通建议租电动车，方便游览各个海滩","青澳湾沙滩细腻，是最受欢迎的游泳区","总兵府历史悠久，了解南澳岛历史必去","推荐尝试本地海鲜，生蚝和螃蟹超级鲜甜","建议住岛上民宿，晚上可以看星星"],
    scenery:[
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_8.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_13.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_10.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_2.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_15.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_7.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_1.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_5.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_12.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_14.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_6.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_3.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_11.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_9.jpg",
      "https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/2025-08/2025-08-30_20-55-58_4.jpg",
    ]
  },
]

// 地图组件：使用自定义地图图片 + 叠加城市标记
function ChinaMapSVG({ cities, onCityClick, activeCity }) {
  // 以重庆贴纸实测位置(55.0%, 55.4%)为基准校正
  const fixedCoords: Record<string,{x:number,y:number}> = {
    quanzhou:  {x:76.8, y:71.0},
    chengdu:   {x:50.2, y:61.0},
    chongqing: {x:59.0, y:64.9},
    haikou:    {x:64.1, y:86.2},
    nanaodao:  {x:71.5, y:78.1},
  }
  const toXY = (lat: number, lng: number, id?: string) => {
    if(id && fixedCoords[id]) return fixedCoords[id]
    const x = ((lng - 73) / (135 - 73)) * 84 + 5
    const y = ((53 - lat) / (53 - 18)) * 76 + 10
    return { x, y }
  }

  return (
    <div style={{position:"relative",width:"100%",userSelect:"none"}}>
      <img
        src="https://res.cloudinary.com/demfj39xl/image/upload/v1780068528/hanrui/public/image/travel-map.png"
        alt="中国地图"
        style={{width:"100%",display:"block",borderRadius:10}}
      />
      {/* 城市标记叠加层 */}
      <div style={{position:"absolute",inset:0}}>
        {cities.map(city=>{
          const {x,y} = toXY(city.lat, city.lng, city.id)
          const isActive = activeCity===city.id
          return (
            <div key={city.id}
              onClick={()=>onCityClick(city.id)}
              style={{
                position:"absolute",
                left:`${x}%`,top:`${y}%`,
                transform:"translate(-50%,-50%)",
                cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                zIndex:isActive?10:1,
              }}
            >
              {/* 脉冲圈 */}
              {isActive&&(
                <div style={{
                  position:"absolute",
                  width:36,height:36,borderRadius:"50%",
                  background:"rgba(79,168,104,0.2)",
                  border:"2px solid rgba(79,168,104,0.5)",
                  animation:"ping 1.2s ease-out infinite",
                  top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                }}/>
              )}
              {/* 标记点：有emoji才显示圆圈 */}
              {((city as any).mapEmoji===undefined || (city as any).mapEmoji) && (
                <div style={{
                  width:isActive?30:24,height:isActive?30:24,
                  borderRadius:"50%",
                  background:isActive?"rgba(79,168,104,0.95)":"rgba(162,214,174,0.9)",
                  border:`2px solid ${isActive?"rgba(40,100,56,0.8)":"rgba(120,185,142,0.7)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:isActive?14:12,
                  boxShadow:isActive?"0 4px 14px rgba(40,100,56,0.4)":"0 2px 6px rgba(40,100,56,0.2)",
                  transition:"all 0.2s",
                }}>{(city as any).mapEmoji||city.emoji}</div>
              )}
              {/* 城市名 */}
              <div style={{
                fontSize:10,fontWeight:700,
                color:isActive?"rgba(30,80,40,0.95)":"rgba(50,100,60,0.8)",
                background:"rgba(240,252,244,0.85)",
                borderRadius:4,padding:"1px 5px",
                whiteSpace:"nowrap",
                boxShadow:"0 1px 4px rgba(0,0,0,0.1)",
              }}>{city.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TravelSection() {
  const [activeCity, setActiveCity] = useState<string|null>(null)
  const [lightbox, setLightbox] = useState<string|null>(null)
  const city = TRAVEL_DATA.find(c=>c.id===activeCity)

  return (
    <>
      {/* 照片放大 lightbox */}
      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}

      {/* 城市弹窗 */}
      {city&&(
        <div onClick={()=>setActiveCity(null)} style={{
          position:"fixed",inset:0,zIndex:1500,
          background:"rgba(8,18,12,0.82)",backdropFilter:"blur(14px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",padding:"16px",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"rgba(240,252,244,0.97)",borderRadius:20,
            width:"min(760px,95vw)",maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 32px 80px rgba(0,0,0,0.4)",
            position:"relative",
          }}>
            {/* 关闭按钮 */}
            <button onClick={()=>setActiveCity(null)} style={{
              position:"absolute",top:14,right:14,width:34,height:34,borderRadius:"50%",
              background:"rgba(255,255,255,0.95)",border:"1px solid rgba(200,230,208,0.6)",
              cursor:"pointer",fontSize:14,zIndex:10,
              display:"flex",alignItems:"center",justifyContent:"center",color:"#3a6646",fontWeight:700,
            }}>✕</button>

            <div style={{padding:"24px 24px 20px"}}>
              {/* 标题 */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                <div style={{fontSize:32}}>{city.emoji}</div>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:"var(--c-ink)"}}>{city.name}</div>
                  <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,color:"var(--c-accent)",background:"rgba(79,168,104,0.1)",border:"1px solid rgba(79,168,104,0.2)",borderRadius:100,padding:"2px 10px"}}>💚 {city.shareDate} 到访</span>
                    <span style={{fontSize:10,color:"var(--c-muted)",background:"rgba(240,250,243,0.8)",border:"1px solid rgba(195,228,206,0.4)",borderRadius:100,padding:"2px 10px"}}>📅 最佳时间：{city.bestTime}</span>
                  </div>
                </div>
              </div>

              {/* 分享语 */}
              {city.share&&(
                <div style={{fontSize:13,color:"var(--c-muted)",fontStyle:"italic",marginBottom:18,paddingLeft:4,lineHeight:1.8}}>
                  {city.share}
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                {/* 左：九宫格照片 */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--c-muted)",letterSpacing:"0.06em",marginBottom:10}}>📸 旅行照片</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                    {city.scenery.map((img,i)=>(
                      <div key={i} onClick={()=>setLightbox(img)} style={{
                        borderRadius:6,overflow:"hidden",cursor:"pointer",
                        border:"1px solid rgba(195,228,206,0.4)",
                        transition:"transform 0.15s,box-shadow 0.15s",
                        aspectRatio:"1",
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow="0 4px 12px rgba(40,100,56,0.2)"}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
                        <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 右：气候+攻略 */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--c-muted)",letterSpacing:"0.06em",marginBottom:8}}>🌤️ 气候</div>
                  <div style={{background:"rgba(255,255,255,0.6)",border:"1px solid rgba(195,228,206,0.4)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12,color:"var(--c-ink-2)",lineHeight:1.8}}>
                    {city.climate}
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--c-muted)",letterSpacing:"0.06em",marginBottom:8}}>💡 旅行小贴士</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {city.tips.map((tip,i)=>(
                      <div key={i} style={{
                        display:"flex",gap:7,alignItems:"flex-start",
                        padding:"6px 10px",fontSize:11.5,color:"var(--c-ink-2)",
                        background:"rgba(240,250,243,0.7)",border:"1px solid rgba(195,228,206,0.35)",
                        borderRadius:8,lineHeight:1.6,
                      }}>
                        <span style={{color:"var(--c-accent)",flexShrink:0,fontSize:10,marginTop:1}}>✦</span>
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 地图 + 城市按钮 */}
      <div style={{
        background:"rgba(240,250,243,0.55)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
        border:"1px solid rgba(195,228,206,0.5)",borderRadius:14,padding:16,
      }}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--c-muted)",letterSpacing:"0.08em",marginBottom:10}}>🗺️ 点击地图标记或城市名查看详情</div>
        <ChinaMapSVG cities={TRAVEL_DATA} onCityClick={id=>setActiveCity(id)} activeCity={activeCity}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>
          {TRAVEL_DATA.map(c=>(
            <button key={c.id} onClick={()=>setActiveCity(c.id)} style={{
              padding:"5px 14px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
              border:"1px solid rgba(195,228,206,0.5)",
              background:"rgba(255,255,255,0.38)",color:"var(--c-muted)",
              transition:"all 0.15s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(162,214,174,0.3)";e.currentTarget.style.color="var(--c-ink)"}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.38)";e.currentTarget.style.color="var(--c-muted)"}}
            >{c.emoji} {c.name}</button>
          ))}
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════
//  About This Website
// ════════════════════════════════════════════

// ════════════════════════════════════════════
//  猫爬架相关组件
// ════════════════════════════════════════════
const CAT_PATHS = [
  "2026-05_2026-05-13_21-08-29_3","2026-05_2026-05-20_23-39-22_5",
  "2026-04_2026-04-04_22-25-09_15","2026-01_2026-01-29_09-00-02_5",
  "2026-01_2026-01-29_09-00-02_6","2026-01_2026-01-07_20-59-57_3",
  "2026-01_2026-01-29_09-00-02_4","2026-01_2026-01-29_09-00-02_12",
  "2026-01_2026-01-29_09-00-02_9","2026-02_2026-02-14_21-41-08_6",
  "2026-01_2026-01-14_22-01-43_5","2026-05_2026-05-13_21-08-29_5",
  "2026-03_2026-03-10_21-34-28_6","2026-04_2026-04-04_22-25-09_1",
  "2026-01_2026-01-29_09-00-02_2","2025-07_2025-07-06_20-30-05",
  "2025-08_2025-08-10_19-42-47","2025-03_2025-03-29_18-38-22_3",
  "2025-11_2025-11-27_21-05-31_9","2025-09_2025-09-23_21-35-04_4",
  "2025-03_2025-03-22_11-40-04_1","2025-09_2025-09-23_21-35-04_8",
  "2025-06_2025-06-20_21-50-23_9","2025-08_2025-08-16_10-08-20_6",
  "2025-04_2025-04-12_19-51-27_7","2025-02_2025-02-09_22-16-28_6",
  "2025-08_2025-08-12_17-47-37_1","2025-03_2025-03-29_18-38-22_1",
  "2025-10_2025-10-29_21-47-03_2","2025-02_2025-02-09_22-16-28_4",
  "2025-08_2025-08-12_17-47-37_5","2024-01_2024-01-06_23-42-49_1",
  "2024-09_2024-09-22_20-26-56_4","2024-02_2024-02-04_17-06-02_1",
  "2024-04_2024-04-23_22-05-15_3","2024-01_2024-01-02_22-34-59_2",
  "2024-02_2024-02-29_20-47-07_1","2024-01_2024-01-16_23-19-25_4",
  "2024-09_2024-09-07_22-16-23_2","2024-04_2024-04-28_20-38-19_2",
  "2024-09_2024-09-22_20-26-56_3","2024-02_2024-02-11_21-48-53_5",
  "2024-09_2024-09-22_20-26-56_2","2024-02_2024-02-09_22-33-31_1",
  "2024-01_2024-01-29_22-12-37_9","2024-11_2024-11-05_21-15-52_10",
  "2024-01_2024-01-29_22-12-37_2","2024-01_2024-01-06_23-42-49_2",
  "2023-07_2023-07-01_19-51-31","2023-11_2023-11-05_20-14-10_2",
  "2023-10_2023-10-10_21-41-39_5","2023-07_2023-07-21_14-59-22_1",
  "2023-08_2023-08-05_17-58-48_1","2023-10_2023-10-10_21-41-39_8",
  "2023-06_2023-06-25_20-42-37_2","2023-08_2023-08-05_17-58-48_2",
  "2023-12_2023-12-23_22-29-29_3","2023-01_2023-01-26_14-19-21_1",
  "2023-11_2023-11-01_22-22-08_2","2023-11_2023-11-12_22-29-28_3",
  "2023-04_2023-04-30_22-44-25_1","2023-10_2023-10-06_21-25-40_3",
  "2023-11_2023-11-01_22-22-08_4","2023-11_2023-11-19_22-33-45_2",
  "2023-02_2023-02-14_19-45-52_2","2023-12_2023-12-15_23-11-08_5",
  "2023-12_2023-12-04_22-11-47_9","2023-11_2023-11-01_22-22-08_1",
  "2023-04_2023-04-13_23-11-05_2","2023-12_2023-12-28_23-02-31_6",
  "2023-04_2023-04-30_22-44-25_3","2022-05_2022-05-20_18-24-07_1",
  "2022-11_2022-11-28_20-06-37_5","2022-04_2022-04-27_18-58-32_3",
  "2022-10_2022-10-07_17-19-40_5",
]

const CARDS = [
  { name: "lovely瑞",  url: "https://ik.imagekit.io/ruihouse/cards/lovely瑞_oK4YWIX1c.jpg" },
  { name: "只要有你瑞", url: "https://ik.imagekit.io/ruihouse/cards/只要有你瑞_IqDhEN8dM.jpg" },
  { name: "围巾瑞",    url: "https://ik.imagekit.io/ruihouse/cards/围巾瑞_TqAtal-W0.jpg" },
  { name: "庄天枢瑞",  url: "https://ik.imagekit.io/ruihouse/cards/庄天枢瑞_NQ1yqy8tA.jpg" },
  { name: "拍立得瑞",  url: "https://ik.imagekit.io/ruihouse/cards/拍立得瑞_VPBqz-VIk.jpg" },
  { name: "旅行瑞",    url: "https://ik.imagekit.io/ruihouse/cards/旅行瑞_sOpU_xvFS.jpg" },
  { name: "毛团瑞",    url: "https://ik.imagekit.io/ruihouse/cards/毛团瑞_EIQYJgfZN.jpg" },
  { name: "猜歌瑞",    url: "https://ik.imagekit.io/ruihouse/cards/猜歌瑞_dzr4uRY5z.jpg" },
  { name: "生日瑞",    url: "https://ik.imagekit.io/ruihouse/cards/生日瑞_1jZsB7snF.jpg" },
  { name: "粉衣瑞",    url: "https://ik.imagekit.io/ruihouse/cards/粉衣瑞_xM62_1pMK.jpg" },
  { name: "进行曲瑞",  url: "https://ik.imagekit.io/ruihouse/cards/进行曲瑞_8xnh2r2se.jpg" },
  { name: "黄昏晓瑞",  url: "https://ik.imagekit.io/ruihouse/cards/黄昏晓瑞_2amqZ2Q0P.jpg" },
]

function extractDateFromName(name: string): { year: string; month: string } | null {
  const m = name.match(/(\d{4})-(\d{2})_/)
  return m ? { year: m[1], month: m[2] } : null
}

function CatGameSection({ weibo }: { weibo: any[] }) {
  function findImageUrl(pathKey: string): string | null {
    for (const month of weibo) {
      for (const item of (month.imageFiles || [])) {
        if (item.filename && item.filename.includes(pathKey)) return item.url
      }
    }
    return null
  }

  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }
  function getYearOptions(correct: string): string[] {
    const all = [...new Set(CAT_PATHS.map(n => n.match(/^(\d{4})-\d{2}_/)?.[1]).filter(Boolean))] as string[]
    return shuffle([correct, ...shuffle(all.filter(y => y !== correct)).slice(0, 3)])
  }
  function getMonthOptions(correct: string): string[] {
    const months = ["01","02","03","04","05","06","07","08","09","10","11","12"]
    return shuffle([correct, ...shuffle(months.filter(m => m !== correct)).slice(0, 3)])
  }

  const [stage, setStage] = useState<1|2|3>(1)
  const [gameState, setGameState] = useState<"playing"|"result">("playing")
  const [dateInfo, setDateInfo] = useState<{year:string;month:string}|null>(null)
  const [currentUrl, setCurrentUrl] = useState("")
  const [yearCorrect, setYearCorrect] = useState(false)
  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [monthOptions, setMonthOptions] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [win, setWin] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement|null>(null)

  function drawPixelated(img: HTMLImageElement, blockSize: number) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    canvas.width = img.naturalWidth || 420; canvas.height = img.naturalHeight || 420
    const tmp = document.createElement("canvas")
    tmp.width = Math.max(1, Math.floor(canvas.width / blockSize))
    tmp.height = Math.max(1, Math.floor(canvas.height / blockSize))
    const tc = tmp.getContext("2d")!
    tc.imageSmoothingEnabled = false; tc.drawImage(img, 0, 0, tmp.width, tmp.height)
    ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height)
  }
  function drawClear(img: HTMLImageElement) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    canvas.width = img.naturalWidth || 420; canvas.height = img.naturalHeight || 420
    ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }

  function startGame() {
    const shuffled = [...CAT_PATHS].sort(() => Math.random() - 0.5)
    let pick = "", url = ""
    for (const p of shuffled) { const f = findImageUrl(p); if (f) { pick = p; url = f; break } }
    if (!pick) return
    const m = pick.match(/^(\d{4})-(\d{2})_/); if (!m) return
    const date = { year: m[1], month: m[2] }
    setCurrentUrl(url); setDateInfo(date); setStage(1); setGameState("playing")
    setSelectedYear(""); setSelectedMonth(""); setYearCorrect(false); setWin(false)
    setYearOptions(getYearOptions(date.year)); setMonthOptions(getMonthOptions(date.month))
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = url
    img.onload = () => { imgRef.current = img; drawPixelated(img, 30) }
  }

  useEffect(() => { startGame() }, [])

  function handleYearAnswer(chosen: string) {
    setSelectedYear(chosen); const correct = chosen === dateInfo?.year; setYearCorrect(correct)
    setTimeout(() => { if (imgRef.current) drawPixelated(imgRef.current, 8); setStage(2) }, 700)
  }
  function handleMonthAnswer(chosen: string) {
    setSelectedMonth(chosen); const monthCorrect = chosen === dateInfo?.month
    setWin(yearCorrect && monthCorrect)
    setTimeout(() => { if (imgRef.current) drawClear(imgRef.current); setStage(3); setGameState("result") }, 700)
  }

  const stageLabel = stage===1?"第一阶段 · 极度模糊":stage===2?"第二阶段 · 半清晰":"揭秘！"
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"8px 0"}}>
      <div style={{display:"flex",gap:6,width:"100%",maxWidth:420}}>
        {[1,2,3].map(s=><div key={s} style={{flex:1,height:3,borderRadius:2,background:stage>=s?"rgba(100,180,120,0.8)":"rgba(200,220,200,0.3)",transition:"background 0.4s"}}/>)}
      </div>
      <div style={{width:"100%",maxWidth:420,borderRadius:14,overflow:"hidden",border:"1.5px solid rgba(195,228,206,0.5)",background:"rgba(240,250,243,0.3)"}}>
        <canvas ref={canvasRef} width={420} height={420} style={{width:"100%",height:"auto",display:"block"}}/>
      </div>
      <div style={{fontSize:12,color:"var(--c-muted)",letterSpacing:"0.5px"}}>{stageLabel}</div>
      {stage===1 && gameState==="playing" && (<>
        <div style={{fontSize:15,fontWeight:700,color:"var(--c-ink)",textAlign:"center"}}>猜猜这是哪一年的张函瑞？</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,width:"100%",maxWidth:420}}>
          {yearOptions.map(y=><button key={y} onClick={()=>handleYearAnswer(y)} disabled={!!selectedYear}
            style={{padding:"10px 0",borderRadius:10,fontFamily:"inherit",cursor:selectedYear?"default":"pointer",fontSize:14,fontWeight:600,
              border:`1.5px solid ${selectedYear===y?(y===dateInfo?.year?"rgba(100,180,120,0.8)":"rgba(220,80,80,0.6)"):selectedYear&&y===dateInfo?.year?"rgba(100,180,120,0.8)":"rgba(195,228,206,0.5)"}`,
              background:selectedYear===y?(y===dateInfo?.year?"rgba(200,240,210,0.6)":"rgba(255,220,220,0.4)"):selectedYear&&y===dateInfo?.year?"rgba(200,240,210,0.6)":"rgba(240,250,243,0.4)",
              color:"var(--c-ink)",transition:"all 0.2s"}}>{y} 年</button>)}
        </div>
      </>)}
      {stage===2 && gameState==="playing" && (<>
        <div style={{fontSize:15,fontWeight:700,color:"var(--c-ink)",textAlign:"center"}}>猜猜是哪一月的张函瑞？</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,width:"100%",maxWidth:420}}>
          {monthOptions.map(mo=><button key={mo} onClick={()=>handleMonthAnswer(mo)} disabled={!!selectedMonth}
            style={{padding:"10px 0",borderRadius:10,fontFamily:"inherit",cursor:selectedMonth?"default":"pointer",fontSize:14,fontWeight:600,
              border:`1.5px solid ${selectedMonth===mo?(mo===dateInfo?.month?"rgba(100,180,120,0.8)":"rgba(220,80,80,0.6)"):selectedMonth&&mo===dateInfo?.month?"rgba(100,180,120,0.8)":"rgba(195,228,206,0.5)"}`,
              background:selectedMonth===mo?(mo===dateInfo?.month?"rgba(200,240,210,0.6)":"rgba(255,220,220,0.4)"):selectedMonth&&mo===dateInfo?.month?"rgba(200,240,210,0.6)":"rgba(240,250,243,0.4)",
              color:"var(--c-ink)",transition:"all 0.2s"}}>{mo} 月</button>)}
        </div>
      </>)}
      {gameState==="result" && (
        <div style={{width:"100%",maxWidth:420,padding:"16px 20px",borderRadius:14,textAlign:"center",
          border:`1.5px solid ${win?"rgba(100,180,120,0.6)":"rgba(220,80,80,0.4)"}`,
          background:win?"rgba(200,240,210,0.3)":"rgba(255,220,220,0.2)"}}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:6,color:win?"rgba(60,140,80,1)":"rgba(180,60,60,1)"}}>
            {win?"恭喜你，你猜对了！":"很遗憾，你猜错了"}
          </div>
          <div style={{fontSize:13,color:"var(--c-muted)",marginBottom:14}}>
            {win?`你简直是瑞圈考古专家吧！这是 ${dateInfo?.year} 年 ${dateInfo?.month} 月的张函瑞 🏆`
               :`这是 ${dateInfo?.year} 年 ${dateInfo?.month} 月的张函瑞，不过别灰心，再玩一次！`}
          </div>
          <button onClick={startGame} style={{padding:"9px 28px",borderRadius:100,fontFamily:"inherit",cursor:"pointer",
            border:"1.5px solid rgba(195,228,206,0.6)",background:"rgba(240,250,243,0.5)",color:"var(--c-accent)",fontSize:13,fontWeight:700}}>
            再玩一次 ↩
          </button>
        </div>
      )}
    </div>
  )
}

function CardDrawSection() {
  const TODAY = new Date().toISOString().slice(0, 10)
  const LS_DRAW_KEY = "rui_draw_date"
  const LS_COLLECTION_KEY = "rui_card_collection"
  function getCollection(): string[] { try { return JSON.parse(localStorage.getItem(LS_COLLECTION_KEY) || "[]") } catch { return [] } }
  function saveCollection(col: string[]) { localStorage.setItem(LS_COLLECTION_KEY, JSON.stringify([...new Set(col)])) }
  function hasDrawnToday(): boolean {
    try { return localStorage.getItem(LS_DRAW_KEY) === TODAY } catch { return false }
  }
  function markDrawnToday() { localStorage.setItem(LS_DRAW_KEY, TODAY) }

  const [phase, setPhase] = useState<"select"|"reveal"|"locked"|"album">("select")
  const [displayed, setDisplayed] = useState<{name:string,url:string}[]>([])
  const [result, setResult] = useState<{name:string,url:string}|null>(null)
  const [flipping, setFlipping] = useState<number|null>(null)
  const [collection, setCollection] = useState<string[]>([])
  const [lightboxCard, setLightboxCard] = useState<{name:string,url:string}|null>(null)

  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

  useEffect(() => {
    const col = getCollection(); setCollection(col)
    if (hasDrawnToday()) { setPhase("locked") }
    else { setDisplayed(shuffle(CARDS).slice(0, 6)); setPhase("select") }
  }, [])

  function selectCard(idx: number) {
    if (phase !== "select") return
    setFlipping(idx)
    setTimeout(() => {
      const card = displayed[idx]; setResult(card)
      markDrawnToday()
      const newCol = [...getCollection(), card.name]; saveCollection(newCol); setCollection(newCol)
      setPhase("reveal")
    }, 600)
  }

  const collectedCards = CARDS.filter(c => collection.includes(c.name))
  const uncollectedCount = CARDS.length - collectedCards.length

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"8px 0"}}>
      <div style={{display:"flex",gap:8,width:"100%",maxWidth:420}}>
        <button onClick={()=>setPhase(hasDrawnToday()?"locked":"select")}
          style={{flex:1,padding:"7px 0",borderRadius:100,fontFamily:"inherit",cursor:"pointer",fontSize:13,fontWeight:700,
            border:`1.5px solid ${phase!=="album"?"rgba(100,180,120,0.7)":"rgba(195,228,206,0.4)"}`,
            background:phase!=="album"?"rgba(200,240,210,0.5)":"rgba(240,250,243,0.3)",
            color:phase!=="album"?"rgba(50,130,70,1)":"var(--c-muted)"}}>🎴 今日抽卡</button>
        <button onClick={()=>setPhase("album")}
          style={{flex:1,padding:"7px 0",borderRadius:100,fontFamily:"inherit",cursor:"pointer",fontSize:13,fontWeight:700,
            border:`1.5px solid ${phase==="album"?"rgba(100,180,120,0.7)":"rgba(195,228,206,0.4)"}`,
            background:phase==="album"?"rgba(200,240,210,0.5)":"rgba(240,250,243,0.3)",
            color:phase==="album"?"rgba(50,130,70,1)":"var(--c-muted)"}}>📖 我的卡册 {collectedCards.length}/{CARDS.length}</button>
      </div>

      {phase==="locked" && (
        <div style={{textAlign:"center",padding:"30px 20px",borderRadius:14,width:"100%",maxWidth:420,
          border:"1.5px solid rgba(195,228,206,0.5)",background:"rgba(240,250,243,0.4)"}}>
          <div style={{fontSize:28,marginBottom:8}}>🌙</div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--c-ink)",marginBottom:6}}>今天已经抽过啦</div>
          <div style={{fontSize:13,color:"var(--c-muted)"}}>明天再来抽新的瑞吧～每天一次机会</div>
        </div>
      )}

      {phase==="select" && (<>
        <div style={{fontSize:14,color:"var(--c-muted)",textAlign:"center"}}>选择一张卡，看看今天的瑞是谁 ✨</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:"100%",maxWidth:420}}>
          {displayed.map((card,idx)=>(
            <div key={idx} onClick={()=>selectCard(idx)}
              style={{cursor:"pointer",borderRadius:12,overflow:"hidden",border:"1.5px solid rgba(195,228,206,0.5)",
                aspectRatio:"1/1.6",background:"rgba(200,230,210,0.2)",
                transform:flipping===idx?"rotateY(90deg)":"rotateY(0deg)",transition:"transform 0.3s ease",
                display:"flex",alignItems:"center",justifyContent:"center"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1.05)"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1)"}}>
              <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,
                background:"linear-gradient(135deg,rgba(180,220,190,0.4),rgba(210,240,218,0.3))"}}>
                <div style={{fontSize:28}}>🐱</div>
                <div style={{fontSize:11,color:"var(--c-muted)"}}>点击翻牌</div>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {phase==="reveal" && result && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,width:"100%",maxWidth:320}}>
          <div style={{borderRadius:16,overflow:"hidden",width:"100%",background:"#fff",
            border:"2px solid rgba(100,180,120,0.5)",boxShadow:"0 8px 32px rgba(100,180,120,0.2)",animation:"cardReveal 0.5s ease"}}>
            <img src={result.url} alt={result.name} style={{width:"100%",display:"block",mixBlendMode:"multiply"}} loading="lazy"/>
          </div>
          <div style={{padding:"14px 24px",borderRadius:14,width:"100%",textAlign:"center",
            background:"rgba(200,240,210,0.4)",border:"1.5px solid rgba(100,180,120,0.4)"}}>
            <div style={{fontSize:13,color:"var(--c-muted)",marginBottom:4}}>恭喜你，抽中了</div>
            <div style={{fontSize:20,fontWeight:800,color:"rgba(50,130,70,1)",letterSpacing:"0.02em"}}>【{result.name}】</div>
            {collection.filter(n=>n===result.name).length>1
              ?<div style={{fontSize:12,color:"var(--c-muted)",marginTop:4}}>已收录到卡册 ✨（重复卡）</div>
              :<div style={{fontSize:12,color:"rgba(50,130,70,0.8)",marginTop:4}}>新卡入册！🎉</div>}
          </div>
          <div style={{fontSize:13,color:"var(--c-muted)"}}>明天再来抽新的瑞吧～</div>
        </div>
      )}

      {phase==="album" && (
        <div style={{width:"100%",maxWidth:420}}>
          <div style={{fontSize:13,color:"var(--c-muted)",marginBottom:12,textAlign:"center"}}>
            已收集 {collectedCards.length} / {CARDS.length} 张
            {uncollectedCount>0?<span>，还差 {uncollectedCount} 张</span>:<span> 🎊 全收集！</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {CARDS.map(card=>{
              const owned=collection.includes(card.name)
              return (
                <div key={card.name} onClick={()=>{ if(owned) setLightboxCard(card) }}
                  style={{borderRadius:10,overflow:"hidden",aspectRatio:"1/1.6",position:"relative",
                    border:`1.5px solid ${owned?"rgba(100,180,120,0.6)":"rgba(195,228,206,0.3)"}`,
                    background:owned?"#fff":"rgba(220,230,220,0.2)",cursor:owned?"pointer":"default",transition:"transform 0.15s"}}
                  onMouseEnter={e=>{ if(owned)(e.currentTarget as HTMLElement).style.transform="scale(1.04)" }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.transform="scale(1)" }}>
                  {owned?(
                    <>
                      <img src={card.url} alt={card.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",mixBlendMode:"multiply"}} loading="lazy"/>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 6px 5px",fontSize:10,color:"#fff",textAlign:"center",fontWeight:700,
                        background:"linear-gradient(transparent,rgba(0,0,0,0.55))"}}>
                        {card.name}
                      </div>
                    </>
                  ):(
                    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🔒</div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{fontSize:11,color:"var(--c-faint)",textAlign:"center",marginTop:8}}>点击已收集的卡可查看大图</div>
        </div>
      )}

      {lightboxCard && (
        <div onClick={()=>setLightboxCard(null)}
          style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,0.65)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{maxWidth:"min(320px,80vw)",width:"100%",borderRadius:16,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
            <div style={{background:"#fff"}}>
              <img src={lightboxCard.url} alt={lightboxCard.name} style={{width:"100%",display:"block",mixBlendMode:"multiply"}}/>
            </div>
            <div style={{padding:"12px 16px",textAlign:"center",fontSize:15,fontWeight:700,color:"rgba(50,130,70,1)",
              background:"rgba(200,240,210,0.97)"}}>
              【{lightboxCard.name}】
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes cardReveal { from { transform: rotateY(90deg) scale(0.8); opacity: 0; } to { transform: rotateY(0deg) scale(1); opacity: 1; } }`}</style>
    </div>
  )
}

function DivinationSection({ weibo }: { weibo: any[] }) {
  const LUCKY_COLORS = ["翡翠绿","星空蓝","樱花粉","月光白","琥珀金","珊瑚橙","薰衣草紫","云雾灰","玫瑰红","海棠粉"]
  const DIRECTIONS = ["东方","西方","南方","北方","东南","西南","东北","西北"]
  const STAGES = BILIBILI_VIDEOS["舞台"] || []
  const [nums, setNums] = useState(["","",""])
  const [char, setChar] = useState("")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [animating, setAnimating] = useState(false)

  function seededRandom(seed: number) {
    let s = seed
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  }

  function divinate() {
    const n1=parseInt(nums[0]),n2=parseInt(nums[1]),n3=parseInt(nums[2])
    if ([n1,n2,n3].some(n=>isNaN(n)||n<1||n>100)) { setError("请输入三个1-100之间的数字"); return }
    if (!char.trim()||!/[\u4e00-\u9fa5]/.test(char)) { setError("请输入张函瑞名字中的任意一个汉字"); return }
    setError(""); setAnimating(true)
    setTimeout(() => {
      const seed = n1*10000+n2*100+n3+char.charCodeAt(0)
      const rng = seededRandom(seed)
      const luckyColor = LUCKY_COLORS[Math.floor(rng()*LUCKY_COLORS.length)]
      const luckyNum = Math.floor(rng()*99)+1
      const direction = DIRECTIONS[Math.floor(rng()*DIRECTIONS.length)]
      const stage = STAGES.length>0?STAGES[Math.floor(rng()*STAGES.length)]:null
      const startYear=2022,startMonth=2,endYear=2026,endMonth=5
      const totalMonths=(endYear-startYear)*12+(endMonth-startMonth+1)
      const monthIdx=Math.floor(rng()*totalMonths)
      const y=startYear+Math.floor((startMonth-1+monthIdx)/12)
      const m2=((startMonth-1+monthIdx)%12)+1
      const archiveMonth=`${y}年${String(m2).padStart(2,"0")}月`
      const fortunes=["今天的你光芒万丈，所有人都会被你吸引 ✨","静待花开，好事正在悄悄向你靠近 🌸",
        "今天适合大胆表达，说出心里话吧 💬","能量满满，是突破自我的好时机 🚀",
        "今天与瑞的缘分特别深，多刷刷他的视频吧 💚","低调行事，暗中积蓄能量，厚积薄发 🌙",
        "今天适合回顾经典，重温那些珍贵的瞬间 📺","保持好心情，快乐是今天最强的护盾 😊"]
      const fortune=fortunes[Math.floor(rng()*fortunes.length)]
      setResult({luckyColor,luckyNum,direction,stage,archiveMonth,fortune}); setAnimating(false)
    }, 1200)
  }

  const RUI_CHARS = ["张","函","瑞"]
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:"8px 0"}}>
      <div style={{fontSize:14,color:"var(--c-muted)",textAlign:"center"}}>输入三个数字和函瑞名字中的一个字，解锁今日运势 🔮</div>
      <div style={{background:"rgba(240,250,243,0.4)",borderRadius:14,border:"1.5px solid rgba(195,228,206,0.5)",padding:"16px"}}>
        <div style={{fontSize:13,color:"var(--c-ink)",fontWeight:600,marginBottom:10}}>输入三个 1-100 的数字</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[0,1,2].map(i=>(
            <input key={i} type="number" min={1} max={100} value={nums[i]}
              onChange={e=>{const n=[...nums];n[i]=e.target.value;setNums(n)}}
              placeholder={(i+1).toString()}
              style={{flex:1,padding:"10px",borderRadius:10,fontSize:16,textAlign:"center",fontFamily:"inherit",outline:"none",
                border:"1.5px solid rgba(195,228,206,0.6)",background:"rgba(255,255,255,0.5)",color:"var(--c-ink)"}}/>
          ))}
        </div>
        <div style={{fontSize:13,color:"var(--c-ink)",fontWeight:600,marginBottom:10}}>选择张函瑞名字中的一个字</div>
        <div style={{display:"flex",gap:8}}>
          {RUI_CHARS.map(c=>(
            <button key={c} onClick={()=>setChar(c)}
              style={{flex:1,padding:"10px 0",borderRadius:10,fontSize:18,fontWeight:700,fontFamily:"inherit",cursor:"pointer",
                border:`1.5px solid ${char===c?"rgba(100,180,120,0.8)":"rgba(195,228,206,0.5)"}`,
                background:char===c?"rgba(200,240,210,0.6)":"rgba(240,250,243,0.4)",
                color:char===c?"rgba(50,130,70,1)":"var(--c-ink)"}}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {error&&<div style={{fontSize:13,color:"rgba(180,60,60,1)",textAlign:"center"}}>{error}</div>}
      <button onClick={divinate} disabled={animating}
        style={{padding:"12px 0",borderRadius:100,width:"100%",fontFamily:"inherit",fontSize:15,fontWeight:700,
          border:"1.5px solid rgba(100,180,120,0.6)",
          background:animating?"rgba(200,230,210,0.3)":"rgba(200,240,210,0.5)",
          color:"rgba(50,130,70,1)",cursor:animating?"default":"pointer"}}>
        {animating?"🔮 占卜中...":"🔮 开始占卜"}
      </button>
      {result&&!animating&&(
        <div style={{display:"flex",flexDirection:"column",gap:12,animation:"cardReveal 0.5s ease"}}>
          <div style={{padding:"14px 18px",borderRadius:14,textAlign:"center",fontStyle:"italic",fontSize:14,color:"var(--c-ink)",lineHeight:1.8,
            background:"rgba(200,240,210,0.35)",border:"1.5px solid rgba(100,180,120,0.4)"}}>
            {result.fortune}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{label:"🎨 幸运色",value:result.luckyColor},{label:"🔢 幸运数字",value:result.luckyNum},
              {label:"🧭 幸运方位",value:result.direction},{label:"⚡ 今日能量",value:result.luckyNum>50?"高":result.luckyNum>25?"中":"蓄力中"}
            ].map(item=>(
              <div key={item.label} style={{padding:"12px 14px",borderRadius:12,textAlign:"center",
                background:"rgba(240,250,243,0.5)",border:"1.5px solid rgba(195,228,206,0.5)"}}>
                <div style={{fontSize:12,color:"var(--c-muted)",marginBottom:4}}>{item.label}</div>
                <div style={{fontSize:17,fontWeight:800,color:"var(--c-ink)"}}>{item.value}</div>
              </div>
            ))}
          </div>
          {result.stage&&(
            <div style={{borderRadius:12,overflow:"hidden",border:"1.5px solid rgba(195,228,206,0.5)"}}>
              <div style={{padding:"8px 14px",fontSize:12,color:"var(--c-muted)",fontWeight:600,background:"rgba(200,240,210,0.3)"}}>🎬 今日推荐舞台</div>
              <div onClick={()=>window.open(result.stage.url,"_blank")}
                style={{display:"flex",gap:8,padding:"10px 14px",cursor:"pointer",alignItems:"center",background:"rgba(240,250,243,0.4)"}}>
                <span style={{fontSize:16}}>🎬</span>
                <div style={{fontSize:13,color:"rgba(50,130,70,1)",fontWeight:600,textDecoration:"underline"}}>{result.stage.title} ↗</div>
              </div>
            </div>
          )}
          {result.archiveMonth&&(
            <div style={{padding:"14px 18px",borderRadius:12,textAlign:"center",
              background:"rgba(240,250,243,0.5)",border:"1.5px solid rgba(195,228,206,0.5)"}}>
              <div style={{fontSize:12,color:"var(--c-muted)",marginBottom:6}}>📅 今日考古推荐</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--c-ink)"}}>
                今天适合去考古 <span style={{color:"rgba(50,130,70,1)"}}>{result.archiveMonth}</span> 的瑞瑞 🕵️
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CatTowerSection({ weibo }: { weibo: any[] }) {
  const [activeTab, setActiveTab] = useState<"find"|"discover"|"lock">("find")
  const tabs = [
    { key:"find", label:"寻找🐱" },
    { key:"discover", label:"发现🐱" },
    { key:"lock", label:"锁定🐱" },
  ]
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key as any)}
            style={{padding:"7px 18px",borderRadius:100,fontFamily:"inherit",cursor:"pointer",fontSize:13,fontWeight:700,transition:"all 0.2s",
              border:`1.5px solid ${activeTab===t.key?"rgba(100,180,120,0.7)":"rgba(195,228,206,0.4)"}`,
              background:activeTab===t.key?"rgba(200,240,210,0.5)":"rgba(240,250,243,0.3)",
              color:activeTab===t.key?"rgba(50,130,70,1)":"var(--c-muted)"}}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab==="find" && <CatGameSection weibo={weibo}/>}
      {activeTab==="discover" && <CardDrawSection/>}
      {activeTab==="lock" && <DivinationSection weibo={weibo}/>}
    </div>
  )
}

function AboutWebsite() {
  return (
    <div style={{
      padding:"14px 17px",
      background:"rgba(240,250,243,0.52)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
      borderRadius:12,border:"1px solid rgba(195,228,206,0.45)",
      fontSize:13,lineHeight:2,color:"var(--c-ink-2)",
      display:"flex",gap:12,alignItems:"flex-start",
    }}>
      <span style={{fontSize:17,flexShrink:0,marginTop:2}}>🌱</span>
      <span>作者的话：Hello！我是组建这个网站的作者，可以叫我Nimo～<br/><br/>选择创造这个网站的初衷源于我在了解ai新技术后的一次心血来潮，当时想着我也可以用现在最流行的vibe thinking（完全依靠和ai对话来编写自己的小程序，app，网站的一种模式）来实现我的想法，于是立马想到给瑞瑞创造一个独立网站🐱<br/><br/>由于是我一个人独立完成全部工作，所以会有不充分的地方（比如周边数据太难拉到所以暂时放弃，以及美食分享板块等等都因为我很难短时间收集完所有数据所以放弃）所以如果有这些数据的娘娘，拜托请发给我&gt;&lt;超级感激🙏（在这个邮箱联络我即可：<a href="mailto:realnimosann@gmail.com" style={{color:"var(--c-accent)",textDecoration:"none"}}>realnimosann@gmail.com</a>）<br/><br/>最后希望大家喜欢这个网页！也一起支持瑞瑞的星途吧～～～<br/>爱两只猫，就要一直爱两只猫 &gt;💚&lt; ～（算上建国）</span>
    </div>
  )
}

// ════════════════════════════════════════════
//  Daily Share Section (日常分享)
// ════════════════════════════════════════════
const PLAYLIST_DATA = [
  {
    date: "2025-09-14",
    songs: [
      { title: "无聊的", artist: "小霞", desc: "中文慵懒 R&B，带点无所事事的漫然情绪" },
      { title: "After Hours", artist: "Kehlani", desc: "深夜 R&B，氛围感十足的告白与独处" },
      { title: "Ballin'", artist: "Kehlani", desc: "自信张扬的 R&B，彰显独立女性的气场" },
      { title: "Honey", artist: "Kehlani", desc: "甜而不腻的 R&B 情歌，低调细腻的爱意表达" },
      { title: "When He's Not There (feat. Lucky Daye)", artist: "Kehlani", desc: "关于想念的忧郁二重唱，空洞与渴望并存" },
      { title: "Manchild", artist: "Sabrina Carpenter", desc: "讽刺不成熟男友的流行小品，俏皮又犀利" },
      { title: "Dark", artist: "Mixed Matches", desc: "内省氛围的独立 R&B，探索内心阴暗面" },
      { title: "Twentyfive", artist: "Mixed Matches", desc: "关于二十五岁成长迷茫的情绪化民谣 R&B" },
      { title: "On & On", artist: "FLO", desc: "FLO 的复古 R&B 三重唱，节奏律动感强" },
      { title: "Caught Up", artist: "FLO", desc: "沉浸在爱情里无法自拔的甜蜜 R&B" },
      { title: "Change", artist: "FLO", desc: "呼吁自我改变与成长的清醒 R&B" },
    ]
  },
  {
    date: "2025-11-21",
    songs: [
      { title: "50 Feet", artist: "SoMo", desc: "R&B 情歌，男声低沉，讲述对爱人的执着思念" },
      { title: "Original Thoughts", artist: "Katie Tupper", desc: "独立创作人的自我表达，内省气质浓郁" },
      { title: "Outside The Gate", artist: "Katie Tupper", desc: "带乡村气息的独立民谣，讲述边界与归属感" },
      { title: "JEANS (fall on my knees)", artist: "Katie Tupper", desc: "以日常意象串联爱情记忆的流行抒情曲" },
      { title: "Tennessee Heat", artist: "Katie Tupper", desc: "南方夏日氛围感十足的慵懒流行曲" },
      { title: "Caution", artist: "Mariah Carey", desc: "玛丽亚·凯莉 2018 年专辑同名曲，警惕爱情中的伤害" },
      { title: "Runway", artist: "Mariah Carey", desc: "抒情 R&B，关于一段关系走向终点的告别" },
      { title: "My All", artist: "Mariah Carey", desc: "九十年代经典情歌，宣告将一切都给予爱人" },
      { title: "Butterfly", artist: "Mariah Carey", desc: "1997 专辑同名曲，成熟地放手与祝福" },
      { title: "Open Arms", artist: "Mariah Carey", desc: "深情翻唱 Journey 经典，诠释无条件的等待" },
      { title: "WHY LOVE", artist: "Asake", desc: "尼日利亚 Afrobeats 与流行的融合，质问爱情本质" },
      { title: "TEQUILA", artist: "Jaz Karis & Reekado Banks", desc: "夜晚解忧的 Afropop 情歌，龙舌兰与放纵的碰撞" },
      { title: "Easy (Remix) [feat. Chris Brown]", artist: "DaniLeigh", desc: "轻盈流畅的 R&B 合作曲，爱情里的从容随性" },
      { title: "Delulu", artist: "Muni Long", desc: "以「妄想」为题的自嘲 R&B，直面单相思的心理" },
      { title: "Portrait", artist: "Mariah Carey", desc: "《Caution》专辑深情内省曲，如画作般描绘爱的全貌" },
    ]
  },
  {
    date: "2026-04-01",
    songs: [
      { title: "Dang", artist: "Caroline Polachek", desc: "情绪浓烈的另类流行，被爱打中的震撼与慌乱" },
      { title: "100 💚", artist: "Ella Mai", desc: "给爱人百分之百的深情 R&B，真实无保留的爱" },
      { title: "Body 💚", artist: "Summer Walker", desc: "夏日慵懒 R&B，探索爱与身体的亲密联结" },
      { title: "Fake Love 💚", artist: "Tink", desc: "直接戳破虚伪感情的 R&B，拒绝将就的清醒" },
      { title: "Buzzcut Season", artist: "Lorde", desc: "关于逃避外部世界、与人共享宁静的另类流行" },
      { title: "lost you twice 💚", artist: "Walter Kwan", desc: "独立创作人以钢琴叙述失去同一人两次的心碎" },
      { title: "Getting Older", artist: "Billie Eilish", desc: "比莉以成长为主题的内省情歌，释然而又沉重" },
      { title: "i love you", artist: "Billie Eilish", desc: "极简吉他伴奏下最轻声说出的爱与不舍" },
      { title: "La Perla", artist: "ROSALÍA & Yahritza Y Su Esencia", desc: "西班牙语合作曲，融合弗拉门戈与墨西哥风情" },
      { title: "idontwannabeyouanymore", artist: "Billie Eilish", desc: "少年比莉对自我厌倦与不安全感的轻声倾诉" },
      { title: "Your Power", artist: "Billie Eilish", desc: "以轻柔民谣质问权力失衡的关系，沉静而有力" },
      { title: "Messy", artist: "Lola Young", desc: "英伦灵魂声线演绎混乱情感关系的直白剖白" },
      { title: "It's ok I'm ok", artist: "Tate McRae", desc: "面具下崩溃的流行曲，假装没事的情绪包裹" },
      { title: "Location", artist: "Xtina Louise", desc: "对 Khalid 原曲的翻唱，女声版本更添柔情与渴望" },
      { title: "I've Seen It", artist: "Olivia Dean", desc: "英式灵魂流行，关于亲眼见证爱情走向破碎" },
      { title: "Something Inbetween 💚", artist: "Olivia Dean", desc: "处于关系灰色地带时的暧昧与不安" },
      { title: "Man I Need 💚", artist: "Olivia Dean", desc: "真情流露地呼唤一个真正懂自己的人" },
      { title: "Something for 2", artist: "Magdalena Bay", desc: "梦幻 Synthpop，专属二人世界的甜蜜泡泡" },
      { title: "You Lose!", artist: "Magdalena Bay", desc: "电子流行中的胜利宣言，冷静拒绝情感操控" },
      { title: "Domino", artist: "Magdalena Bay", desc: "连锁效应式的电子流行，关系的崩塌如多米诺" },
      { title: "Follow The Leader", artist: "Magdalena Bay", desc: "复古电子氛围，在关系中追随与被追随的拉锯" },
      { title: "Tonguetwister", artist: "Magdalena Bay", desc: "迷幻 Synthpop 小品，语言与情感的游戏" },
      { title: "COCONUT", artist: "SAILORR & Eem Triplin", desc: "带热带律动的 R&B，轻盈快乐的夏日派对感" },
    ]
  },
  {
    date: "2026-05-19",
    songs: [
      { title: "Born in the Wild", artist: "Tems", desc: "Tems 的专辑同名曲，追求自由与野性本我" },
      { title: "I THINK YOU'RE SPECIAL", artist: "Justin Bieber & Tems", desc: "两大天王天后合作，深情诉说你是我的唯一" },
      { title: "PLASTIC OFF THE SOFA", artist: "Beyoncé", desc: "《Renaissance》中最温柔的一首，安心与被爱的日常感" },
      { title: "Water Under the Bridge", artist: "Adele", desc: "节奏轻快的阿黛尔，翻篇往事、走向新生的释然" },
      { title: "Hello", artist: "Adele", desc: "跨越时空的深情呼唤，世界级经典告别之歌" },
      { title: "Send My Love (To Your New Lover)", artist: "Adele", desc: "前任祝福的轻盈波普曲，大方洒脱地放手" },
      { title: "When We Were Young", artist: "Adele", desc: "久别重逢后对青春往事的深切怀念" },
      { title: "Remedy", artist: "Adele", desc: "献给至亲的承诺之歌，我永远是你的良药" },
      { title: "Love in the Dark", artist: "Adele", desc: "在爱消散后仍温柔离开的心碎告别" },
      { title: "All I Ask", artist: "Adele", desc: "分离前夕的最后恳求，只求这一夜完整的爱" },
      { title: "Million Years Ago", artist: "Adele", desc: "对成名前简单生活的深深眷恋与乡愁" },
      { title: "when the party's over", artist: "Billie Eilish", desc: "喧嚣散去后的孤独，两人相处却各自痛苦" },
      { title: "I Just Don't Know You Yet", artist: "Absolutely", desc: "初识时的悸动与期待，爱在相知之前已悄然萌生" },
      { title: "lightbeamers", artist: "FKA twigs", desc: "FKA twigs 的前卫实验流行，关于引领与被引领的光" },
      { title: "Raindance", artist: "Dave & Tems", desc: "英伦说唱与 Afrobeats 的跨界融合，祈雨般的情感渴望" },
      { title: "my future", artist: "Billie Eilish", desc: "疫情期间写就的自我和解之歌，爱上自己的未来" },
      { title: "everything i wanted", artist: "Billie Eilish", desc: "关于名声与虚无的梦境叙事，兄妹情谊温柔托底" },
      { title: "Stronger", artist: "Britney Spears", desc: "千禧年流行经典，在失恋中重新找回自我力量" },
      { title: "WHERE IS MY HUSBAND!", artist: "RAYE", desc: "RAYE 的愤怒灵魂曲，对消失爱人的质问与控诉" },
    ]
  },
]

const PERFUME_DATA = [
  {
    brand:"YSL · 圣罗兰",
    tag:"高定衣典系列",
    items:[
      {name:"西装 Tuxedo",en:"Tuxedo Sharp Patchouli EDP",price:"约 ¥1,540 / 75ml",top:"紫罗兰叶 · 芫荽 · 香柠檬",mid:"玫瑰 · 铃兰 · 黑胡椒",base:"广藿香 · 波旁香草 · 龙涎香",desc:"以经典燕尾服为灵感，广藿香贯穿始终。甜口烟草感混合玫瑰，前段微甜后段沉稳干燥，中性向，留香持久，秋冬尤为出彩。"},
      {name:"豹纹 Babycat",en:"Babycat EDP",price:"约 ¥1,540 / 75ml",top:"黑胡椒 · 粉胡椒 · 乳香",mid:"藏红花 · 乳香",base:"香草 · 绒面革 · 雪松",desc:"2022年推出，灵感来自 YSL 标志性豹纹图案。动物野性与温暖麂皮香调融合，收于香草与皮革的性感底韵，大胆而永恒。"},
    ]
  },
  {
    brand:"Hermès · 爱马仕",
    tag:"花园系列 EDT",
    items:[
      {name:"李先生的花园",en:"Le Jardin de Monsieur Li",price:"约 ¥1,060 / 100ml",top:"金橘 · 薄荷 · 竹子",mid:"阿拉伯茉莉 · 佛手柑",base:"苔藓 · 麝香",desc:"调香师 Jean-Claude Ellena 以中式园林为灵感。不加糖的橘皮茶感，雨后苔藓与竹叶青若隐若现，是花园系列最具东方意境的一款。"},
      {name:"西苔岛花园",en:"Un Jardin à Cythère",price:"约 ¥1,060 / 100ml",top:"开心果 · 柑橘",mid:"芒草 · 橄榄木",base:"橄榄木 · 雪松",desc:"调香师 Christine Nagel 2023年以希腊基西拉岛为灵感。开心果青绿甜感配橄榄木干燥木质，是一座不以花香取胜的金色花园。"},
    ]
  },
  {
    brand:"Frédéric Malle · 馥马尔",
    tag:"香水出版社",
    items:[
      {name:"贵妇肖像",en:"Portrait of a Lady EDP",price:"约 ¥2,800 / 100ml",top:"玫瑰 · 公丁香 · 肉桂 · 黑加仑 · 树莓",mid:"檀香木 · 广藿香 · 焚香",base:"麝香 · 琥珀 · 安息香脂",desc:"调香师 Dominique Ropion 2010年作品。东方花香调，玫瑰与广藿香的标杆之作，厚重辛辣，贵族气场十足，FM 三大玫瑰中最浓烈的一支。"},
      {name:"一轮玫瑰（旧版线下）",en:"Une Rose / 夜色玫瑰 Une Rose Nuit（新版）",price:"约 ¥2,800 / 100ml",top:"玫瑰 · 茴香",mid:"玫瑰 · 蜂蜜",base:"广藿香 · 麝香 · 木质",desc:"旧版「一轮玫瑰」已基本从线上下架，新版「夜色玫瑰」延续血脉。带蜂蜜感的成熟玫瑰，比贵妇肖像更柔美内敛，是 FM 玫瑰三部曲之一。"},
    ]
  },
  {
    brand:"Tom Ford · TF",
    tag:"私人系列",
    items:[
      {name:"白麝香（暗麝心魄）",en:"White Suede EDP",price:"约 ¥2,320 / 50ml",top:"百里香 · 茶叶",mid:"铃兰 · 藏红花 · 玫瑰",base:"绒面革 · 麝香 · 檀香 · 乳香 · 琥珀",desc:"2009年白麝香系列旗舰款。麝香贴肤感极佳，皮革皂感与藏红花辛香交织，犹如一位恪守礼仪却暗藏性感的女贵族，留香持久。"},
    ]
  },
  {
    brand:"Diptyque",
    tag:"法国小众",
    items:[
      {name:"肌肤之花",en:"Fleur de Peau EDP",price:"约 ¥1,390 / 75ml",top:"醛 · 当归 · 香柠檬 · 粉红胡椒",mid:"玫瑰 · 鸢尾花",base:"龙涎香 · 檀木 · 麝香 · 黄葵 · 皮革",desc:"Diptyque 50周年纪念款，公认最佳伪体香香水之一。前调醛香微辛，中后调化为若有若无的粉质麝香，留香可达24小时，喷衣服上更持久。"},
    ]
  },
  {
    brand:"Aēsop · 伊索",
    tag:"澳洲美妆",
    items:[
      {name:"天竺葵",en:"Karst EDP",price:"约 ¥830 / 50ml",top:"天竺葵 · 柑橘",mid:"天竺葵 · 玫瑰 · 苔藓",base:"雪松 · 麝香 · 广藿香",desc:"以天竺葵为核心的草本调代表作。绿叶青草感中透着花香，清新而不失温暖木质底韵，中性偏清冽。张函瑞较早使用的香型，很早之前还喜欢祖玛珑蓝风铃身体乳 🌸"},
    ]
  },
  {
    brand:"Le Labo",
    tag:"纽约沙龙香",
    items:[
      {name:"Santal 33",en:"檀香木 33 EDP",price:"约 ¥2,100 / 100ml",top:"紫罗兰 · 豆蔻 · 纸莎草",mid:"鸢尾花 · 皮革 · 琥珀",base:"澳洲檀木 · 弗吉尼亚雪松 · 麝香",desc:"Le Labo 最具代表性的中性香，全球被闻到最多的香水之一。现代檀香重新演绎，皮革琥珀带来温暖烟火气，男女皆宜，留香极长，秋冬必备。"},
      {name:"Rose 31",en:"玫瑰 31 EDP",price:"约 ¥2,100 / 100ml",top:"玫瑰 · 孜然 · 葛缕子",mid:"玫瑰 · 香根草 · 雪松",base:"麝香 · 愈创木 · 乳香 · 沉香",desc:"Le Labo 第一款香水，品牌奠基之作。以大马士革玫瑰为绝对主角，孜然与木质调使其刚柔并济，是一支男人也能驾驭的玫瑰香。"},
      {name:"Vetiver 46",en:"香根草 46 EDP",price:"约 ¥2,100 / 100ml",top:"香根草 · 柑橘",mid:"香根草 · 烟草 · 青草",base:"香根草 · 木质 · 土壤",desc:"以香根草为绝对核心，烟草气息中透清甜青草味，可中性穿着。比 Santal 33 更小众，留香相对较短，但土沉木韵别有风情。"},
      {name:"26 滚珠精油",en:"Roller Ball 系列",price:"约 ¥450 / 10ml",top:"对应香型开场",mid:"精油浓度更高",base:"贴肤留香",desc:"Le Labo 滚珠精油，可叠加在喷雾香水上使用，加强特定部位留香，适合手腕颈侧等脉搏点，与正装香水形成层次感，日常出行补香利器。"},
    ],
    dislike:["Another 13","The Noir 29"],
  },
  {
    brand:"Chanel · 香奈儿",
    tag:"珍藏系列",
    items:[
      {name:"梧桐影木",en:"Sycomore EDP · Les Exclusifs",price:"约 ¥2,500 / 75ml",top:"香根草 · 粉红胡椒 · 柏树",mid:"紫罗兰 · 杜松 · 烟草",base:"香根草 · 檀香木 · 醛 · 橡木苔",desc:"2008年珍藏系列，调香师 Jacques Polge 以纯粹木质为目标。干爽香根草配烟熏烟草，无任何花香，简约到极致，气场强大而自信。"},
    ]
  },
  {
    brand:"Guerlain · 娇兰",
    tag:"艺术沙龙 / 经典系列",
    items:[
      {name:"白芷香",en:"Angélique Noire EDP · L'Art et la Matière",price:"约 ¥2,400 / 75ml",top:"白芷籽 · 梨 · 粉红胡椒",mid:"小花茉莉 · 葛缕子",base:"香草 · 白芷根 · 雪松",desc:"白芷（天使草）的苦涩青绿与甜蜜香草巧妙对撞，苦乐参半。前调青翠鲜脆，尾调奶甜丝滑，像冰淇淋般的植物奶香，调香师 Daniela Andrier 的柔美东方作品。"},
      {name:"午夜飞行",en:"Vol de Nuit EDT · 1933",price:"约 ¥700 / 75ml EDT",top:"橙花 · 白松香 · 水仙花 · 香柠檬",mid:"鸢尾花 · 醛 · 香草 · 玫瑰 · 茉莉",base:"橡木苔 · 鸢尾根 · 檀香木 · 麝香",desc:"1933年经典传奇，灵感来自圣埃克苏佩里小说《夜航》。前调微苦凌冽，中调醛花华丽展开，后调温暖沉郁充满年代感，是一支越来越好穿的老香。"},
    ]
  },
  {
    brand:"Byredo · 百瑞德",
    tag:"瑞典极简",
    items:[
      {name:"荒漠玫瑰（莫哈维之影）",en:"Mojave Ghost EDP",price:"约 ¥1,880 / 100ml",top:"人心果 · 黄葵锦葵",mid:"木兰 · 紫罗兰 · 檀木",base:"龙涎香 · 雪松 · 麝香",desc:"灵感来自莫哈维沙漠中几乎不需要水就能生长的鬼花。前调清甜果香，中段木兰紫罗兰柔美，后调温暖龙涎雪松，气质高雅脱俗，扩散柔和贴肤。"},
    ],
    dislike:["Mojave Ghost"],
  },
]

function PerfumeSection() {
  const [openBrands,setOpenBrands] = useState({})
  const toggleBrand = (b) => setOpenBrands(v=>({...v,[b]:!v[b]}))
  const totalItems = PERFUME_DATA.reduce((s,b)=>s+b.items.length,0)
  return (
    <div>
      <div style={{
        display:"flex",alignItems:"center",gap:10,
        background:"rgba(79,168,104,0.07)",border:"1px solid rgba(79,168,104,0.18)",
        borderRadius:10,padding:"10px 16px",marginBottom:18,fontSize:12.5,color:"var(--c-ink-2)",
      }}>
        <span style={{fontSize:16}}>🌸</span>
        <span>张函瑞香水分享合辑 ✨ · 共 <strong style={{color:"var(--c-accent)"}}>{totalItems}</strong> 款 · {PERFUME_DATA.length} 个品牌</span>
      </div>
      {PERFUME_DATA.map((brand)=>{
        const isOpen = openBrands[brand.brand]
        return (
          <div key={brand.brand} style={{marginBottom:8}}>
            <button
              onClick={()=>toggleBrand(brand.brand)}
              style={{
                width:"100%",textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:10,
                background:isOpen?"rgba(162,214,174,0.22)":"rgba(240,250,243,0.52)",
                backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                border:"1px solid",
                borderColor:isOpen?"rgba(120,185,142,0.55)":"rgba(195,228,206,0.5)",
                borderRadius:isOpen?"12px 12px 0 0":12,
                padding:"11px 16px",transition:"all 0.2s",
              }}
            >
              <span style={{fontSize:13}}>🌸</span>
              <span style={{fontSize:13,fontWeight:700,color:"var(--c-ink)"}}>{brand.brand}</span>
              <span style={{fontSize:10,color:"var(--c-muted)",background:"rgba(160,210,172,0.18)",border:"1px solid rgba(155,210,168,0.3)",borderRadius:100,padding:"1px 8px"}}>{brand.tag}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"var(--c-muted)",background:"rgba(160,210,172,0.25)",border:"1px solid rgba(155,210,168,0.32)",borderRadius:100,padding:"1px 8px",fontWeight:700}}>{brand.items.length} 款</span>
              <span style={{fontSize:9,color:"var(--c-faint)",border:"1px solid rgba(155,210,168,0.3)",borderRadius:4,padding:"1px 5px",lineHeight:1.4,marginLeft:4}}>{isOpen?"▲":"▼"}</span>
            </button>
            {isOpen&&(
              <div style={{
                background:"rgba(248,253,250,0.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                border:"1px solid rgba(195,228,206,0.5)",borderTop:"none",
                borderRadius:"0 0 12px 12px",overflow:"hidden",animation:"slideDown 0.2s ease",
              }}>
                {brand.items.map((item,ii)=>(
                  <div key={ii} style={{
                    padding:"14px 16px",
                    borderBottom:ii<brand.items.length-1||brand.dislike?"1px solid rgba(195,228,206,0.3)":"none",
                    transition:"background 0.15s",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(162,214,174,0.10)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                      <div>
                        <span style={{fontSize:13.5,fontWeight:700,color:"var(--c-ink)"}}>{item.name}</span>
                        <div style={{fontSize:10.5,color:"var(--c-muted)",marginTop:2}}>{item.en}</div>
                      </div>
                      <span style={{
                        fontSize:10,color:"#a07020",background:"rgba(250,238,218,0.8)",
                        border:"1px solid rgba(186,117,23,0.25)",borderRadius:100,
                        padding:"2px 9px",whiteSpace:"nowrap",flexShrink:0,fontWeight:600,
                      }}>{item.price}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:9}}>
                      {[
                        {label:"前调",color:"rgba(83,74,183,0.12)",tc:"#534AB7",items:item.top},
                        {label:"中调",color:"rgba(15,110,86,0.10)",tc:"#0F6E56",items:item.mid},
                        {label:"后调",color:"rgba(133,79,11,0.10)",tc:"#854F0B",items:item.base},
                      ].map(n=>(
                        <div key={n.label} style={{background:n.color,borderRadius:8,padding:"6px 8px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:n.tc,letterSpacing:"0.05em",marginBottom:3}}>{n.label}</div>
                          <div style={{fontSize:11,color:"var(--c-ink-2)",lineHeight:1.55}}>{n.items}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:11.5,color:"var(--c-ink-2)",lineHeight:1.7}}>{item.desc}</div>
                  </div>
                ))}
                {brand.dislike&&(
                  <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:"var(--c-muted)"}}>瑞不感冒：</span>
                    {brand.dislike.map(d=>(
                      <span key={d} style={{fontSize:10,color:"#993C1D",background:"rgba(250,236,231,0.9)",border:"1px solid rgba(215,90,48,0.2)",borderRadius:100,padding:"2px 9px",fontWeight:600}}>{d}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div style={{marginTop:12,padding:"10px 14px",background:"rgba(79,168,104,0.05)",border:"1px solid rgba(79,168,104,0.12)",borderRadius:10,fontSize:11,color:"var(--c-muted)",lineHeight:1.8}}>
        🌿 价格参考中国官网 / 天猫官方旗舰店标价，以实际购买时为准。馥马尔、Le Labo 等沙龙香国内门店手工调配，价格与线上略有差异。
      </div>
    </div>
  )
}

function DailyShareSection() {
  const subTabs = ["歌单","美食","香水","旅行","高会语音"]
  const [activeTab,setActiveTab] = useState("歌单")
  const [openDates,setOpenDates] = useState({})

  const toggleDate = (key) => setOpenDates(v=>({...v,[key]:!v[key]}))

  const totalSongs = PLAYLIST_DATA.reduce((s,g)=>s+g.songs.length,0)

  return (
    <div>
      {/* Sub tabs */}
      <div style={{display:"flex",gap:6,marginBottom:22,flexWrap:"wrap"}}>
        {subTabs.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{
            padding:"6px 16px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
            border:"1px solid",transition:"all 0.18s",
            ...(activeTab===t
              ?{background:"linear-gradient(135deg,rgba(162,214,174,0.6),rgba(130,190,152,0.45))",borderColor:"rgba(120,185,142,0.7)",color:"var(--c-ink)",boxShadow:"0 2px 10px rgba(40,100,56,0.12)"}
              :{background:"rgba(255,255,255,0.38)",borderColor:"rgba(195,228,206,0.5)",color:"var(--c-muted)"}
            ),
          }}>{t}</button>
        ))}
      </div>

      {/* 歌单内容 */}
      {activeTab==="歌单"&&(
        <div>
          {/* 汇总信息 */}
          <div style={{
            display:"flex",alignItems:"center",gap:10,
            background:"rgba(79,168,104,0.07)",border:"1px solid rgba(79,168,104,0.18)",
            borderRadius:10,padding:"10px 16px",marginBottom:18,fontSize:12.5,color:"var(--c-ink-2)",
          }}>
            <span style={{fontSize:16}}>🎵</span>
            <span>张函瑞安利歌单合集 · 共 <strong style={{color:"var(--c-accent)"}}>{totalSongs}</strong> 首 · {PLAYLIST_DATA.length} 个日期</span>
          </div>

          {/* 按日期折叠 */}
          {PLAYLIST_DATA.map((group,gi)=>{
            const key = group.date
            const isOpen = openDates[key]
            return (
              <div key={key} style={{marginBottom:8}}>
                {/* 日期头 */}
                <button
                  onClick={()=>toggleDate(key)}
                  style={{
                    width:"100%",textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",gap:10,
                    background:isOpen?"rgba(162,214,174,0.22)":"rgba(240,250,243,0.52)",
                    backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                    border:"1px solid",
                    borderColor:isOpen?"rgba(120,185,142,0.55)":"rgba(195,228,206,0.5)",
                    borderRadius:isOpen?"12px 12px 0 0":12,
                    padding:"11px 16px",
                    transition:"all 0.2s",
                  }}
                >
                  <span style={{fontSize:13}}>🎵</span>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--c-ink)",letterSpacing:"0.01em"}}>高会分享（{group.date}）</span>
                  <span style={{
                    marginLeft:"auto",fontSize:10,color:"var(--c-muted)",
                    background:"rgba(160,210,172,0.25)",border:"1px solid rgba(155,210,168,0.32)",
                    borderRadius:100,padding:"1px 8px",fontWeight:700,
                  }}>{group.songs.length} 首</span>
                  <span style={{fontSize:9,color:"var(--c-faint)",border:"1px solid rgba(155,210,168,0.3)",borderRadius:4,padding:"1px 5px",lineHeight:1.4,marginLeft:4}}>
                    {isOpen?"▲":"▼"}
                  </span>
                </button>

                {/* 歌曲列表 */}
                {isOpen&&(
                  <div style={{
                    background:"rgba(248,253,250,0.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                    border:"1px solid rgba(195,228,206,0.5)",borderTop:"none",
                    borderRadius:"0 0 12px 12px",overflow:"hidden",
                    animation:"slideDown 0.2s ease",
                  }}>
                    {group.songs.map((song,si)=>(
                      <div key={si} style={{
                        display:"grid",gridTemplateColumns:"28px 1fr",gap:10,
                        padding:"10px 16px",
                        borderBottom:si<group.songs.length-1?"1px solid rgba(195,228,206,0.3)":"none",
                        alignItems:"center",
                        transition:"background 0.15s",
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(162,214,174,0.15)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        <span style={{
                          width:22,height:22,borderRadius:"50%",
                          background:"rgba(160,210,172,0.25)",border:"1px solid rgba(155,210,168,0.32)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:9.5,fontWeight:700,color:"var(--c-ink-3)",flexShrink:0,
                        }}>{si+1}</span>
                        <div>
                          <div style={{display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap"}}>
                            <span style={{fontSize:13,fontWeight:700,color:"var(--c-ink)",lineHeight:1.4}}>{song.title}</span>
                            <span style={{fontSize:11,color:"var(--c-muted)",fontWeight:500}}>{song.artist}</span>
                          </div>
                          <div style={{fontSize:11,color:"var(--c-faint)",marginTop:2,lineHeight:1.5}}>{song.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 香水 tab */}
      {activeTab==="香水"&&<PerfumeSection/>}

      {/* 美食 tab */}
      {activeTab==="美食"&&<FoodSection/>}

      {/* 旅行 tab */}
      {activeTab==="旅行"&&<TravelSection/>}
      {activeTab==="高会语音"&&<GaohuyuSection/>}
    </div>
  )
}

// ════════════════════════════════════════════
//  编曲数据
// ════════════════════════════════════════════
const BIANZOU_DATA = [
  { bvid:"BV1dpRqBeE8M", title:"《baby step》（《臆想》彩蛋完整版）", cover:"http://i2.hdslb.com/bfs/archive/9e5876e1b1b9017d80dc8eb8a36aaa49db98e546.jpg", url:"https://www.bilibili.com/video/BV1dpRqBeE8M/", date:"2026-05" },
  { bvid:"BV1Ej9JBQEeE", title:"《09's Pimple》", cover:"http://i1.hdslb.com/bfs/archive/624dfbddbeb9163d29e0a17d3929e8a99fe63939.jpg", url:"https://www.bilibili.com/video/BV1Ej9JBQEeE/", date:"2026-04" },
  { bvid:"BV1LZQUB8ERs", title:"《melting sunny rain》", cover:"http://i2.hdslb.com/bfs/archive/4783abf34689a6cba16139d21c4ff1a27033d8d2.jpg", url:"https://www.bilibili.com/video/BV1LZQUB8ERs/", date:"2026-03" },
  { bvid:"BV15AzNBPEpr", title:"《臆想》", cover:"http://i1.hdslb.com/bfs/archive/2ff4f1303199088472216b6ce6dd74648185f937.jpg", url:"https://www.bilibili.com/video/BV15AzNBPEpr/", date:"2026-01" },
  { bvid:"BV1arKmzHELx", title:"《我不知道》", cover:"http://i2.hdslb.com/bfs/archive/3d64f5795a4affeeb2c5363f17a37c8e7229a668.jpg", url:"https://www.bilibili.com/video/BV1arKmzHELx/", date:"2025-06" },
]

function BianzouSection() {
  const [activeIdx, setActiveIdx] = useState(0)
  const current = BIANZOU_DATA[activeIdx]

  return (
    <div className="bianzou-layout" style={{display:"flex",gap:16,minHeight:320}}>
      {/* 左：歌单列表 */}
      <div className="bianzou-playlist" style={{
        flex:"0 0 auto",width:220,
        background:"rgba(240,250,243,0.52)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
        border:"1px solid rgba(195,228,206,0.45)",borderRadius:14,overflow:"hidden",
        display:"flex",flexDirection:"column",
      }}>
        <div style={{padding:"12px 14px 10px",fontSize:11,fontWeight:700,color:"var(--c-muted)",letterSpacing:"0.07em",borderBottom:"1px solid rgba(195,228,206,0.3)"}}>
          🎼 编曲作品 · {BIANZOU_DATA.length} 首
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {BIANZOU_DATA.map((v,i)=>(
            <div key={v.bvid} onClick={()=>setActiveIdx(i)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",
              background:activeIdx===i?"rgba(162,214,174,0.28)":"transparent",
              borderLeft:`3px solid ${activeIdx===i?"rgba(79,168,104,0.8)":"transparent"}`,
              transition:"all 0.15s",
            }}
            onMouseEnter={e=>{ if(activeIdx!==i) e.currentTarget.style.background="rgba(162,214,174,0.12)" }}
            onMouseLeave={e=>{ if(activeIdx!==i) e.currentTarget.style.background="transparent" }}
            >
              <div style={{
                width:28,height:28,borderRadius:"50%",flexShrink:0,
                background:activeIdx===i?"rgba(79,168,104,0.8)":"rgba(195,228,206,0.5)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,color:activeIdx===i?"#fff":"var(--c-muted)",fontWeight:700,
              }}>{String(i+1).padStart(2,"0")}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--c-ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div>
                <div style={{fontSize:10,color:"var(--c-faint)",marginTop:1}}>{v.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右：播放器 */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{
          background:"rgba(240,250,243,0.55)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",
          border:"1px solid rgba(195,228,206,0.5)",borderRadius:14,
          display:"flex",flexDirection:"column",alignItems:"center",
          padding:"32px 28px 28px",gap:20,height:"100%",boxSizing:"border-box",justifyContent:"center",
        }}>
          {/* 封面 */}
          <div style={{
            width:160,height:90,borderRadius:12,overflow:"hidden",
            border:"1px solid rgba(195,228,206,0.5)",
            boxShadow:"0 8px 28px rgba(40,100,56,0.15)",
            flexShrink:0,
          }}>
            <img src={biliImgProxy(current.cover)} alt={current.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          </div>

          {/* 标题 + 日期 */}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:"var(--c-ink)",letterSpacing:"-0.01em",marginBottom:6}}>{current.title}</div>
            <div style={{fontSize:11,color:"var(--c-muted)"}}>张函瑞 · 编曲作品 · {current.date}</div>
          </div>

          {/* 进度条（装饰） */}
          <div style={{width:"100%",maxWidth:320}}>
            <div style={{height:3,background:"rgba(195,228,206,0.4)",borderRadius:100,overflow:"hidden"}}>
              <div style={{height:"100%",width:"35%",background:"linear-gradient(90deg,rgba(79,168,104,0.8),rgba(162,214,174,0.9))",borderRadius:100}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--c-faint)",marginTop:5}}>
              <span>0:00</span><span>--:--</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <button onClick={()=>setActiveIdx(i=>Math.max(0,i-1))} disabled={activeIdx===0} style={{
              width:36,height:36,borderRadius:"50%",border:"1px solid rgba(195,228,206,0.5)",
              background:"rgba(240,250,243,0.6)",cursor:"pointer",fontSize:13,
              color:activeIdx===0?"var(--c-faint)":"var(--c-ink-2)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>⏮</button>

            {/* 主按钮：跳转B站 */}
            <a href={current.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
              <button style={{
                width:52,height:52,borderRadius:"50%",
                background:"linear-gradient(135deg,rgba(79,168,104,0.85),rgba(50,140,80,0.75))",
                border:"none",cursor:"pointer",fontSize:18,color:"#fff",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 4px 16px rgba(40,100,56,0.25)",transition:"transform 0.15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
              >▶</button>
            </a>

            <button onClick={()=>setActiveIdx(i=>Math.min(BIANZOU_DATA.length-1,i+1))} disabled={activeIdx===BIANZOU_DATA.length-1} style={{
              width:36,height:36,borderRadius:"50%",border:"1px solid rgba(195,228,206,0.5)",
              background:"rgba(240,250,243,0.6)",cursor:"pointer",fontSize:13,
              color:activeIdx===BIANZOU_DATA.length-1?"var(--c-faint)":"var(--c-ink-2)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>⏭</button>
          </div>

          <div style={{fontSize:11,color:"var(--c-faint)",textAlign:"center"}}>
            点击 ▶ 前往 B站 收听完整版
          </div>
        </div>
      </div>
    </div>
  )
}
const GAOHUI_DATA = [
  { bvid:"BV1p6yABZEoA", title:"想喝瑞瑞同款～", cover:"http://i1.hdslb.com/bfs/archive/5e5f396753227feced68b0650f372ea5a3756223.jpg", url:"https://www.bilibili.com/video/BV1p6yABZEoA/", date:"2025-11" },
  { bvid:"BV1tLmmBeEye", title:"北京的初雪真得让人感慨～", cover:"http://i1.hdslb.com/bfs/archive/a2a92b2411beaa3b4f06f5f6d461d97554d08777.jpg", url:"https://www.bilibili.com/video/BV1tLmmBeEye/", date:"2025-12" },
  { bvid:"BV1xcigBFE8Z", title:"25.12.31新年祝福", cover:"http://i0.hdslb.com/bfs/archive/2e4540ddf80896be06fdca9e242c7d066ef32c47.jpg", url:"https://www.bilibili.com/video/BV1xcigBFE8Z/", date:"2025-12" },
  { bvid:"BV12UrVBHEHM", title:"我喜欢这个蘑菇头！张建国会一直陪伴着你的！", cover:"http://i1.hdslb.com/bfs/archive/24d8707c44ee03045e68f60ac505b0de2ab90013.jpg", url:"https://www.bilibili.com/video/BV12UrVBHEHM/", date:"2026-01" },
  { bvid:"BV1EZFPzFEmE", title:"舞台总结与训练故事", cover:"http://i2.hdslb.com/bfs/archive/18d70bf851ab6b3c62930682b63bad9f61f6009d.jpg", url:"https://www.bilibili.com/video/BV1EZFPzFEmE/", date:"2026-02" },
  { bvid:"BV136cqzyE18", title:"碎碎念～好可爱", cover:"http://i0.hdslb.com/bfs/archive/a804e22f69973d2f44100af973054e512dc41031.jpg", url:"https://www.bilibili.com/video/BV136cqzyE18/", date:"2026-02" },
  { bvid:"BV16PZJBeEKS", title:"公开四周年快乐 · 情人节快乐！", cover:"http://i0.hdslb.com/bfs/archive/39c40562b664c77e6dc1379534b83ecb64b5eff2.jpg", url:"https://www.bilibili.com/video/BV16PZJBeEKS/", date:"2026-02" },
  { bvid:"BV1sjZuB1Ezb", title:"除夕夜快乐！", cover:"http://i0.hdslb.com/bfs/archive/73d4560bd891008c746ada27fe8ac18ec86a403a.jpg", url:"https://www.bilibili.com/video/BV1sjZuB1Ezb/", date:"2026-02" },
  { bvid:"BV1qYPqzFE33", title:"很想念大家的瑞瑞～", cover:"http://i0.hdslb.com/bfs/archive/7e930274d9d5d77f98b54475da4c2fdf4110457f.jpg", url:"https://www.bilibili.com/video/BV1qYPqzFE33/", date:"2026-03" },
  { bvid:"BV1zUwvzWEPs", title:"香水分享＋唱歌分享", cover:"http://i2.hdslb.com/bfs/archive/7e585eaf30889157eab5c15f40014f29d162834a.jpg", url:"https://www.bilibili.com/video/BV1zUwvzWEPs/", date:"2026-03" },
  { bvid:"BV1xuQ1BvEn4", title:"小小的囧事～说到开心的就高歌一曲", cover:"http://i2.hdslb.com/bfs/archive/28133a38bbb7255d2ae90d6ee73d94df41aea5c2.jpg", url:"https://www.bilibili.com/video/BV1xuQ1BvEn4/", date:"2026-03" },
  { bvid:"BV1519nBDEmV", title:"愚人节快乐！创作灵感与歌单分享～", cover:"http://i0.hdslb.com/bfs/archive/eb97fe0211598c86e08714af75e572dd759522a0.jpg", url:"https://www.bilibili.com/video/BV1519nBDEmV/", date:"2026-04" },
  { bvid:"BV1HfDjByELa", title:"浅浅开嗓：Location and Telephone", cover:"http://i0.hdslb.com/bfs/archive/1915925801b6a45ba02c20bf700b25b5e23b1d6f.jpg", url:"https://www.bilibili.com/video/BV1HfDjByELa/", date:"2026-04" },
  { bvid:"BV1ZaQPBBEUV", title:"连唱7首歌（如果的事 / 到此为止 / 宁夏…）", cover:"http://i1.hdslb.com/bfs/archive/88d17065d1683b9d89d90e6db4635aaa87caad45.jpg", url:"https://www.bilibili.com/video/BV1ZaQPBBEUV/", date:"2026-04" },
  { bvid:"BV1S1ovBdEH6", title:"积极护肤咪", cover:"http://i2.hdslb.com/bfs/archive/bc1f3a67b35ec62f0e0e4d111ad9bbed414d626c.jpg", url:"https://www.bilibili.com/video/BV1S1ovBdEH6/", date:"2026-04" },
  { bvid:"BV15kLr6SEWW", title:"函瑞大王大大的分享（歌单已get）", cover:"http://i1.hdslb.com/bfs/archive/a8dd836effd179720ddf2738827e51abbe852dca.jpg", url:"https://www.bilibili.com/video/BV15kLr6SEWW/", date:"2026-05" },
  { bvid:"BV1BNLm6uEov", title:"做你感情上的依赖，这就是爱～", cover:"http://i1.hdslb.com/bfs/archive/040bfdac0076804ad29d4847d6e79a90bdfaab71.jpg", url:"https://www.bilibili.com/video/BV1BNLm6uEov/", date:"2026-05" },
  { bvid:"BV1ENLm6uEPV", title:"520快乐！五百二十赫兹是我的心跳加上你们的心跳", cover:"http://i0.hdslb.com/bfs/archive/6a3f4103842b82bfe097a1ae96c1f6497b493f82.jpg", url:"https://www.bilibili.com/video/BV1ENLm6uEPV/", date:"2026-05" },
]

function GaohuyuSection() {
  const [openMonth, setOpenMonth] = useState<string|null>(null)
  const byDate: Record<string, typeof GAOHUI_DATA> = {}
  GAOHUI_DATA.forEach(v => { if(!byDate[v.date]) byDate[v.date]=[]; byDate[v.date].push(v) })
  const sortedDates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a))
  const pickRandom = () => window.open(GAOHUI_DATA[Math.floor(Math.random()*GAOHUI_DATA.length)].url, "_blank")

  return (
    <div>
      <button onClick={pickRandom} style={{
        width:"100%",marginBottom:16,padding:"9px 14px",
        background:"linear-gradient(135deg,rgba(162,214,174,0.5),rgba(130,190,152,0.38))",
        border:"1px solid rgba(120,185,142,0.6)",borderRadius:10,cursor:"pointer",
        fontFamily:"inherit",fontSize:12,fontWeight:700,color:"var(--c-ink)",
        display:"flex",alignItems:"center",justifyContent:"center",gap:7,
        boxShadow:"0 2px 10px rgba(40,100,56,0.10)",transition:"all 0.18s",
      }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(40,100,56,0.20)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(40,100,56,0.10)"}
      ><span style={{fontSize:16}}>🎲</span> 随机今日 · 帮我选一个！</button>
      <div style={{position:"relative",paddingLeft:24}}>
        <div style={{position:"absolute",left:8,top:4,bottom:4,width:1,background:"linear-gradient(to bottom,rgba(155,210,168,0.6),rgba(155,210,168,0.1))"}}/>
        {sortedDates.map(date=>{
          const vids = byDate[date]
          const isOpen = openMonth===date
          return (
            <div key={date} style={{position:"relative",marginBottom:12}}>
              <div style={{position:"absolute",left:-19,width:10,height:10,borderRadius:"50%",background:isOpen?"rgba(79,168,104,0.9)":"rgba(162,214,174,0.8)",border:"2px solid rgba(200,240,210,0.9)",marginTop:8,transition:"all 0.2s"}}/>
              <button onClick={()=>setOpenMonth(isOpen?null:date)} style={{
                width:"100%",display:"flex",alignItems:"center",gap:10,
                padding:"8px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",
                background:isOpen?"rgba(162,214,174,0.25)":"rgba(240,250,243,0.5)",
                border:`1px solid ${isOpen?"rgba(120,185,142,0.5)":"rgba(195,228,206,0.4)"}`,
                transition:"all 0.18s",textAlign:"left",
              }}
              onMouseEnter={e=>{ if(!isOpen) e.currentTarget.style.background="rgba(162,214,174,0.15)" }}
              onMouseLeave={e=>{ if(!isOpen) e.currentTarget.style.background="rgba(240,250,243,0.5)" }}
              >
                <span style={{fontSize:12,fontWeight:700,color:"var(--c-accent)",minWidth:56}}>{date}</span>
                <span style={{fontSize:11,color:"var(--c-muted)"}}>{vids.length} 条语音</span>
                <span style={{marginLeft:"auto",fontSize:11,color:"var(--c-faint)",transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
              </button>
              {isOpen&&(
                <div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
                  {vids.map(v=><BiliCard key={v.bvid} video={v}/>)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const FOOD_TAG_STYLES: Record<string,{bg:string,color:string}> = {
  "爱了":  {bg:"rgba(162,214,174,0.25)", color:"#1b6b32"},
  "还行":  {bg:"rgba(209,207,199,0.35)", color:"#5F5E5A"},
  "一般":  {bg:"rgba(240,153,123,0.22)", color:"#993C1D"},
  "日常":  {bg:"rgba(93,202,165,0.20)",  color:"#0F6E56"},
  "放纵":  {bg:"rgba(212,83,126,0.18)",  color:"#993556"},
}

const FOOD_DATA = [
  {
    date:"2026-05-19",
    items:[
      {name:"莓果芝士夹心贝果（全麦）", tag:"还行", note:"酱不太浓稠，更喜欢厚重一些的酱"},
      {name:"可颂（蛋 + 肉饼）",         tag:"还行", note:"白色的酱 maybe 蛋黄酱不太喜欢，芝士还行，可颂本体烤得很松软很舒服"},
      {name:"羽衣甘蓝纤体瓶",            tag:"日常", note:"每天必备，羽衣甘蓝非常温良非常报恩，对其持以滤镜"},
      {name:"薯饼",                       tag:"还行", note:"还行"},
      {name:"肉丸",                       tag:"一般", note:"不太好吃，一般般，不太舒服"},
      {name:"杨桃三重甘 + 芭乐莲雾",    tag:"爱了", note:"仙品，非常美味"},
      {name:"部队火锅（中午小小放纵餐）",tag:"放纵", note:"给自己鼓掌！会有点晕碳"},
    ]
  },
]

function FoodSection() {
  const [openDates,setOpenDates] = useState<Record<string,boolean>>({})
  const toggleDate = (d:string) => setOpenDates(v=>({...v,[d]:!v[d]}))
  const total = FOOD_DATA.reduce((s,g)=>s+g.items.length,0)
  return (
    <div>
      <div style={{
        display:"flex",alignItems:"center",gap:10,
        background:"rgba(79,168,104,0.07)",border:"1px solid rgba(79,168,104,0.18)",
        borderRadius:10,padding:"10px 16px",marginBottom:18,fontSize:12.5,color:"var(--c-ink-2)",
      }}>
        <span style={{fontSize:16}}>🥯</span>
        <span>张函瑞美食分享合辑 ✨ · 共 <strong style={{color:"var(--c-accent)"}}>{total}</strong> 项 · {FOOD_DATA.length} 个日期</span>
      </div>
      {FOOD_DATA.map((group)=>{
        const isOpen = openDates[group.date]
        return (
          <div key={group.date} style={{marginBottom:8}}>
            <button
              onClick={()=>toggleDate(group.date)}
              style={{
                width:"100%",textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:10,
                background:isOpen?"rgba(162,214,174,0.22)":"rgba(240,250,243,0.52)",
                backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                border:"1px solid",
                borderColor:isOpen?"rgba(120,185,142,0.55)":"rgba(195,228,206,0.5)",
                borderRadius:isOpen?"12px 12px 0 0":12,
                padding:"11px 16px",transition:"all 0.2s",
              }}
            >
              <span style={{fontSize:13}}>🥯</span>
              <span style={{fontSize:13,fontWeight:700,color:"var(--c-ink)"}}>高会分享（{group.date}）</span>
              <span style={{
                marginLeft:"auto",fontSize:10,color:"var(--c-muted)",
                background:"rgba(160,210,172,0.25)",border:"1px solid rgba(155,210,168,0.32)",
                borderRadius:100,padding:"1px 8px",fontWeight:700,
              }}>{group.items.length} 项</span>
              <span style={{fontSize:9,color:"var(--c-faint)",border:"1px solid rgba(155,210,168,0.3)",borderRadius:4,padding:"1px 5px",lineHeight:1.4,marginLeft:4}}>
                {isOpen?"▲":"▼"}
              </span>
            </button>
            {isOpen&&(
              <div style={{
                background:"rgba(248,253,250,0.55)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                border:"1px solid rgba(195,228,206,0.5)",borderTop:"none",
                borderRadius:"0 0 12px 12px",overflow:"hidden",
                animation:"slideDown 0.2s ease",
              }}>
                {group.items.map((item,ii)=>{
                  const ts = FOOD_TAG_STYLES[item.tag] || FOOD_TAG_STYLES["还行"]
                  return (
                    <div key={ii} style={{
                      display:"flex",alignItems:"flex-start",gap:12,
                      padding:"11px 16px",
                      borderBottom:ii<group.items.length-1?"1px solid rgba(195,228,206,0.3)":"none",
                      transition:"background 0.15s",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(162,214,174,0.12)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <span style={{
                        flexShrink:0,fontSize:10,fontWeight:700,
                        background:ts.bg,color:ts.color,
                        borderRadius:100,padding:"3px 9px",marginTop:1,whiteSpace:"nowrap",
                      }}>{item.tag}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--c-ink)",lineHeight:1.4}}>{item.name}</div>
                        {item.note&&item.note!==item.tag&&(
                          <div style={{fontSize:11.5,color:"var(--c-muted)",marginTop:3,lineHeight:1.6}}>{item.note}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════
//  Main
// ════════════════════════════════════════════
export default function Home({ data }) {
  const [loading,setLoading]=useState(true)

  const [weiboOpen,setWeiboOpen]=useState({})
  const [weiboModal,setWeiboModal]=useState(null)
  const [weiboPage,setWeiboPage]=useState(1)
  const WEIBO_PAGE_SIZE=20
  const [modalVisible,setModalVisible]=useState(false)
  const [lightbox,setLightbox]=useState(null)
  const [activeSection,setActiveSection]=useState("profile")
  const sectionRefs=useRef({})
  const monthRefs=useRef({})

  const toggleMonth=(month)=>{
    setWeiboOpen(v=>({...v,[month]:!v[month]}))
    setTimeout(()=>monthRefs.current[month]?.scrollIntoView({behavior:"smooth",block:"start"}),100)
  }

  const openModal=(section)=>{
    setWeiboModal(section)
    setWeiboPage(1)
    requestAnimationFrame(()=>requestAnimationFrame(()=>setModalVisible(true)))
  }
  const closeModal=()=>{
    setModalVisible(false)
    setTimeout(()=>setWeiboModal(null),320)
  }

  useEffect(()=>{
    const onKey=(e)=>{ if(e.key==="Escape") closeModal() }
    window.addEventListener("keydown",onKey)
    return ()=>window.removeEventListener("keydown",onKey)
  },[])
  const scrollTo=(id)=>{
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({behavior:"smooth",block:"start"})
  }

  const SIDEBAR_LINKS=[
    {id:"profile",emoji:"🌿",label:"瑞的简历"},
    {id:"works",  emoji:"🎬",label:"作品"},
    {id:"growth", emoji:"💌",label:"成长录"},
    {id:"weibo",  emoji:"📸",label:"微博图集"},
    {id:"daily-share",emoji:"🎀",label:"日常分享"},
    {id:"merch",  emoji:"🛍️",label:"周边收藏"},
    {id:"cat-tower",emoji:"🐱",label:"猫爬架"},
    {id:"about-site",emoji:"💌",label:"关于本站"},
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
        :root{
          --glass-bg:rgba(255,255,255,0.52);
          --glass-bg-strong:rgba(255,255,255,0.65);
          --glass-bg-subtle:rgba(255,255,255,0.32);
          --glass-border:rgba(195,228,206,0.50);
          --glass-border-soft:rgba(195,228,206,0.30);
          --glass-blur:blur(16px);
          --glass-blur-sm:blur(10px);
          --glass-shadow:0 2px 4px rgba(40,100,56,0.04),0 8px 28px rgba(40,100,56,0.07);
          --glass-shadow-hover:0 6px 24px rgba(40,100,56,0.14);
          --glass-radius:18px;--glass-radius-sm:12px;--glass-radius-xs:8px;
          --c-ink:#1b3d24;--c-ink-2:#2e5c3a;--c-ink-3:#4a7a58;
          --c-muted:#7aaa88;--c-faint:#a4c8ae;--c-accent:#4fa868;--c-accent-l:#b6dfbe;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{
          font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
          background:url('https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/image/bj.png') no-repeat center center fixed;
          background-size:cover;color:var(--c-ink);min-height:100vh;
          -webkit-font-smoothing:antialiased;
        }
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--c-accent-l);border-radius:10px}
        .carousel-track::-webkit-scrollbar{display:none}

        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes ping{0%{transform:translate(-50%,-50%) scale(1);opacity:0.8}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes wiggle{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
        @keyframes breathGlow{0%{opacity:0.55;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}100%{opacity:0.65;transform:scale(0.98)}}
        @keyframes vinylSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes waveRipple{0%{opacity:0.5;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes sticker0{0%{transform:translateY(0) rotate(0deg) scale(1)}50%{transform:translateY(-12px) rotate(4deg) scale(1.04)}100%{transform:translateY(-20px) rotate(-3deg) scale(0.97)}}
        @keyframes sticker1{0%{transform:translateY(0) rotate(0deg) translateX(0)}40%{transform:translateY(-8px) rotate(-5deg) translateX(6px)}100%{transform:translateY(-16px) rotate(3deg) translateX(-4px)}}
        @keyframes sticker2{0%{transform:translateY(0) scale(1) rotate(0deg)}60%{transform:translateY(-14px) scale(1.06) rotate(6deg)}100%{transform:translateY(-10px) scale(0.95) rotate(-2deg)}}

        .section-card{
          background:rgba(240,250,243,0.58);
          backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);
          border:1px solid var(--glass-border);box-shadow:var(--glass-shadow);
          border-radius:var(--glass-radius);padding:30px 34px;margin-bottom:22px;
          animation:popIn 0.4s ease both;
        }
        .img-card{
          background:rgba(240,250,243,0.55);
          backdrop-filter:var(--glass-blur-sm);-webkit-backdrop-filter:var(--glass-blur-sm);
          border:1px solid var(--glass-border);box-shadow:var(--glass-shadow);
          border-radius:var(--glass-radius-sm);overflow:hidden;cursor:pointer;
          transition:transform 0.22s cubic-bezier(.25,.8,.25,1),box-shadow 0.22s;
          animation:popIn 0.35s ease both;
        }
        .img-card:hover{transform:translateY(-5px);box-shadow:var(--glass-shadow-hover)}
        .img-card img,.img-card video{width:100%;aspect-ratio:1;object-fit:cover;display:block}
        .info-item{
          background:rgba(240,250,243,0.52);
          backdrop-filter:var(--glass-blur-sm);-webkit-backdrop-filter:var(--glass-blur-sm);
          border:1px solid var(--glass-border);box-shadow:var(--glass-shadow);
          border-radius:var(--glass-radius-sm);padding:15px 17px;display:flex;gap:11px;align-items:center;
          transition:background 0.18s,box-shadow 0.18s;
        }
        .info-item:hover{background:rgba(240,250,243,0.75);box-shadow:var(--glass-shadow-hover)}
        .info-item-icon{width:36px;height:36px;background:linear-gradient(135deg,rgba(210,240,218,0.85),rgba(185,225,200,0.75));border-radius:var(--glass-radius-xs);border:1px solid var(--glass-border-soft);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .info-item-label{font-size:10px;color:var(--c-muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:3px}
        .info-item-value{font-size:13.5px;font-weight:700;color:var(--c-ink)}
        .pill-tag{
          display:inline-flex;align-items:center;
          background:rgba(255,255,255,0.38);
          backdrop-filter:var(--glass-blur-sm);-webkit-backdrop-filter:var(--glass-blur-sm);
          color:var(--c-ink-2);border-radius:100px;
          padding:4px 12px;font-size:11px;font-weight:600;margin:3px;
          border:1px solid var(--glass-border);letter-spacing:0.01em;
        }
        .section-heading{
          font-size:15.5px;font-weight:700;color:var(--c-ink);
          margin-bottom:20px;display:flex;align-items:center;gap:9px;
          padding-bottom:13px;border-bottom:1px solid var(--glass-border-soft);letter-spacing:-0.01em;
        }
        .section-heading-badge{
          display:inline-flex;align-items:center;justify-content:center;
          width:27px;height:27px;
          background:linear-gradient(135deg,rgba(210,240,218,0.85),rgba(185,225,200,0.75));
          border:1px solid var(--glass-border-soft);border-radius:var(--glass-radius-xs);
          font-size:13px;flex-shrink:0;
        }
        .nav-link{
          display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;
          font-size:12.5px;font-weight:600;color:var(--c-ink-2);cursor:pointer;
          border:none;background:transparent;width:100%;text-align:left;font-family:inherit;
          transition:background 0.15s,color 0.15s;
        }
        .nav-link:hover{background:rgba(106,173,126,0.10);color:var(--c-ink)}
        .nav-link.active{background:linear-gradient(135deg,rgba(186,228,196,0.48),rgba(162,214,174,0.30));color:var(--c-ink);font-weight:700;border:1px solid var(--glass-border-soft)}
        .nav-link .nav-emoji{width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.35);border:1px solid var(--glass-border-soft);border-radius:7px;font-size:12px;flex-shrink:0}
        .about-avatar{width:90px;height:90px;border-radius:50%;overflow:hidden;flex-shrink:0;box-shadow:0 0 0 3px rgba(255,255,255,0.7),0 0 0 6px rgba(155,210,168,0.3),0 8px 24px rgba(40,100,56,0.16);animation:wiggle 4s ease-in-out infinite}
        .about-avatar img{width:100%;height:100%;object-fit:cover}
        .month-btn{display:flex;align-items:center;justify-content:space-between;width:100%;border:none;background:transparent;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;color:var(--c-ink-2);font-family:inherit;transition:background 0.15s}
        .month-btn:hover{background:rgba(106,173,126,0.09)}
        .month-btn.open{background:rgba(106,173,126,0.14);color:var(--c-ink)}
        .count-badge{background:rgba(160,210,172,0.25);border-radius:100px;padding:1px 7px;font-size:10px;color:var(--c-ink-3);font-weight:700;border:1px solid rgba(155,210,168,0.32)}
        .hero-banner{
          background:linear-gradient(145deg,rgba(215,245,224,0.60) 0%,rgba(185,228,202,0.52) 50%,rgba(200,237,214,0.56) 100%);
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
          border:1px solid rgba(195,228,206,0.50);border-radius:24px;padding:34px 38px;margin-bottom:22px;
          display:flex;align-items:center;gap:26px;position:relative;overflow:hidden;
          box-shadow:0 4px 24px rgba(40,100,56,0.09),0 1px 3px rgba(40,100,56,0.05);
        }
        .hero-banner::before{content:"";position:absolute;top:-50px;right:-50px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.32) 0%,transparent 68%);pointer-events:none}
        .expand-btn{margin-left:auto;border:1px solid var(--glass-border);background:rgba(255,255,255,0.32);backdrop-filter:var(--glass-blur-sm);-webkit-backdrop-filter:var(--glass-blur-sm);border-radius:100px;padding:4px 13px;font-size:11px;font-weight:600;color:var(--c-ink-2);cursor:pointer;font-family:inherit;transition:background 0.15s,color 0.15s;letter-spacing:0.02em}
        .expand-btn:hover{background:rgba(186,228,196,0.45);color:var(--c-ink)}
        .expand-btn.open{background:rgba(162,214,174,0.38);color:var(--c-ink)}
        .sidebar-divider{width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(155,210,168,0.40),transparent);margin:12px 0}
        @media(max-width:768px){
          .layout{display:block!important;width:100vw!important}
          .sidebar{display:none!important;width:0!important;overflow:hidden!important}
          .hero-banner{padding:20px 18px!important;flex-wrap:wrap}
          .section-card{padding:16px 12px!important}
          .mobile-nav{display:flex!important}
          .main-content{padding:12px 10px 80px!important;width:100vw!important;max-width:100vw!important;box-sizing:border-box!important;flex:none!important}
          .hide-mobile{display:none!important}

          /* tabs 横向滚动 */
          .tabs-scroll{display:flex!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;gap:6px!important;padding-bottom:6px!important;flex-wrap:nowrap!important;scrollbar-width:none!important}
          .tabs-scroll::-webkit-scrollbar{display:none!important}

          /* 网格两列 */
          .bili-grid{grid-template-columns:repeat(2,1fr)!important}

          /* 月份导航手机端变为顶部折叠条 */
          .month-nav{width:100%!important;flex:none!important;order:-1!important;margin-bottom:10px}
          .month-nav-toggle{display:inline-block!important}
          .month-nav-inner{flex-direction:row!important;flex-wrap:wrap!important;gap:5px!important;overflow:hidden;max-height:0;transition:max-height 0.3s ease}
          .month-nav-inner.open{max-height:500px!important}

          /* 编曲竖排 */
          .bianzou-layout{flex-direction:column!important}
          .bianzou-playlist{width:100%!important;max-height:200px!important;overflow-y:auto!important}

          /* 站姐竖排 */
          .zhipai-layout{flex-direction:column!important}
          .zhipai-stations{flex-direction:row!important;width:100%!important;overflow-x:auto!important;flex-wrap:nowrap!important}

          /* 微博手机端4列 */
          .weibo-grid{grid-template-columns:repeat(4,1fr)!important;gap:6px!important}
        }
        @media(min-width:769px){
          .mobile-nav{display:none!important}
        }
        .mobile-nav{
          position:fixed;bottom:0;left:0;right:0;z-index:400;
          background:rgba(238,248,241,0.88);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border-top:1px solid rgba(195,228,206,0.5);
          padding:8px 0 max(8px,env(safe-area-inset-bottom));
          display:none;
          justify-content:space-around;align-items:center;
        }
        .mobile-nav-btn{
          display:flex;flex-direction:column;align-items:center;gap:2px;
          background:none;border:none;cursor:pointer;padding:4px 4px;
          -webkit-tap-highlight-color:transparent;
          font-family:inherit;flex:1;
        }
        .mobile-nav-btn .mnb-emoji{font-size:18px;line-height:1}
        .mobile-nav-btn .mnb-label{font-size:8px;font-weight:600;color:var(--c-muted);letter-spacing:0em}
        .mobile-nav-btn.active .mnb-label{color:var(--c-accent)}
      `}}/>

      {/* 手机底部导航 */}
      <nav className="mobile-nav">
        {SIDEBAR_LINKS.map(link=>(
          <button key={link.id} className={`mobile-nav-btn${activeSection===link.id?" active":""}`}
            onClick={()=>scrollTo(link.id)}>
            <span className="mnb-emoji">{link.emoji}</span>
            <span className="mnb-label">{link.label}</span>
          </button>
        ))}
      </nav>

      <BreathingGlow/>
      <FloatingDeco/>
      <EmojiRain/>
      <MouseTrail/>

      {loading&&<IntroLoading onDone={()=>setLoading(false)}/>}
      {!loading&&<span className="hide-mobile"><ThatDayWidget weibo={data.weibo}/></span>}
      {!loading&&<span className="hide-mobile"><MusicPlayer bgmList={data.bgmList}/></span>}
      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}

      <div className="layout" style={{display:"flex",minHeight:"100vh",position:"relative",zIndex:1,width:"100%"}}>

        {/* ─── Sidebar ─── */}
        <aside className="sidebar" style={{
          width:234,flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto",
          padding:"22px 13px",
          background:"rgba(238,248,241,0.72)",
          backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
          borderRight:"1px solid rgba(195,228,206,0.48)",
        }}>
          <div style={{textAlign:"center",marginBottom:20,padding:"12px 8px 14px"}}>
            <div style={{width:46,height:46,background:"linear-gradient(135deg,rgba(185,228,202,0.85),rgba(142,203,160,0.80))",backdropFilter:"blur(8px)",border:"1px solid rgba(195,228,206,0.45)",borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:22,boxShadow:"0 4px 14px rgba(40,100,56,0.16)"}}>🌿</div>
            <div style={{fontWeight:900,fontSize:14.5,color:"var(--c-ink)",letterSpacing:"-0.02em",marginBottom:4}}>Rui's Space</div>
            <div style={{fontSize:9.5,color:"var(--c-muted)",letterSpacing:"0.1em",fontWeight:500}}>✨ 小小的应援站 ✨</div>
          </div>
          <div className="sidebar-divider"/>
          <div style={{marginBottom:3}}>
            {SIDEBAR_LINKS.map(link=>(
              <button key={link.id} className={`nav-link${activeSection===link.id?" active":""}`} onClick={()=>scrollTo(link.id)}>
                <span className="nav-emoji">{link.emoji}</span>
                <span>{link.label}</span>
              </button>
            ))}
          </div>
          <div className="sidebar-divider"/>
          <NavSection emoji="📸" title="微博图集">
            {data.weibo.map(m=>(
              <button key={m.month} className={`month-btn${weiboOpen[m.month]?" open":""}`}
                onClick={()=>{toggleMonth(m.month);setActiveSection("weibo");sectionRefs.current["weibo"]?.scrollIntoView({behavior:"smooth",block:"start"})}}>
                <span>📅 {m.month}</span>
                <span className="count-badge">{m.images.length}</span>
              </button>
            ))}
          </NavSection>
          <NavSection emoji="🎀" title="日常分享">
            {["歌单","美食","香水","旅行","高会语音"].map(sub=>(
              <button key={sub} className="month-btn"
                onClick={()=>{setActiveSection("daily-share");sectionRefs.current["daily-share"]?.scrollIntoView({behavior:"smooth",block:"start"})}}>
                <span>{sub==="歌单"?"🎵":sub==="美食"?"🍜":sub==="香水"?"🌸":sub==="旅行"?"✈️":"🎙️"} {sub}</span>
              </button>
            ))}
          </NavSection>
          <NavSection emoji="💌" title="成长录">
            {["📅 星期五练习生","⭐ 一颗好星星","🥚 PD的蛋生","🎯 四一有意思","🐱 喵生日记"].map(label=>(
              <button key={label} className="month-btn"
                onClick={()=>{setActiveSection("growth");sectionRefs.current["growth"]?.scrollIntoView({behavior:"smooth",block:"start"})}}>
                <span>{label}</span>
              </button>
            ))}
          </NavSection>
          <div style={{marginTop:"auto",paddingTop:22,textAlign:"center",fontSize:9.5,color:"var(--c-faint)",lineHeight:2.2,letterSpacing:"0.03em"}}>
            💚 made with love<br/>💌 for Rui fans
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main className="main-content" style={{flex:1,padding:"30px 38px 50px",maxWidth:980,boxSizing:"border-box"}}>

          {/* Hero */}
          <div className="hero-banner">
            <div className="about-avatar">
              <img src="https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/image/avatar.jpg" alt="avatar"/>
            </div>
            <div style={{position:"relative",zIndex:1,flex:1}}>
              <div style={{display:"inline-flex",alignItems:"center",background:"rgba(255,255,255,0.45)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:100,padding:"3px 13px 3px 6px",fontSize:10,fontWeight:700,color:"var(--c-ink-2)",letterSpacing:"0.07em",marginBottom:12,border:"1px solid rgba(160,210,172,0.40)",gap:6}}>
                <span style={{fontSize:13}}>🌿</span>WELCOME TO RUI HOUSE
              </div>
              <h1 style={{fontSize:24,fontWeight:900,color:"var(--c-ink)",marginBottom:9,lineHeight:1.25,letterSpacing:"-0.02em"}}>你好，欢迎来到张函瑞的小屋 💚</h1>
              <p style={{fontSize:12.5,color:"var(--c-ink-2)",lineHeight:1.85,fontWeight:400,marginBottom:13}}>欢迎来到 Rui House！<br/>这里收录了张函瑞成长的一点一滴 ✨</p>
              <div>
                <span className="pill-tag">🐱 爱瑞小屋</span>
                <span className="pill-tag">📸 成长痕迹</span>
                <span className="pill-tag">💚 爱一只猫就要一直爱一只猫</span>
              </div>
            </div>
          </div>

          {/* 张函瑞的简历 */}
          <div ref={el=>sectionRefs.current["profile"]=el} className="section-card" id="profile">
            <div className="section-heading"><span className="section-heading-badge">🌿</span>瑞的简历</div>
            <ProfileSection/>
          </div>

          {/* 作品 */}
          <div ref={el=>sectionRefs.current["works"]=el} className="section-card" id="works">
            <div className="section-heading"><span className="section-heading-badge">🎬</span>作品</div>
            <WorksSection workCategories={data.workCategories}/>
          </div>

          {/* 成长录 */}
          <div ref={el=>sectionRefs.current["growth"]=el} className="section-card" id="growth">
            <div className="section-heading"><span className="section-heading-badge">💌</span>成长录</div>
            <GrowthSection onLightbox={setLightbox}/>
          </div>

          {/* 微博图集 */}
          <div ref={el=>sectionRefs.current["weibo"]=el} id="weibo" className="section-card">
            <div className="section-heading"><span className="section-heading-badge">📸</span>微博图集</div>
            <div className="weibo-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:14}}>
              {data.weibo.map((section,si)=>{
                const cover = section.images[0] ? section.images[0].split('?')[0] + '?tr=w-300,h-300,fo-auto' : null
                return (
                  <div key={section.month} ref={el=>monthRefs.current[section.month]=el}
                    onClick={()=>openModal(section)}
                    style={{cursor:"pointer",borderRadius:14,overflow:"hidden",position:"relative",aspectRatio:"1",background:"var(--glass-bg)",border:"2px solid var(--glass-border)",boxShadow:"var(--glass-shadow)",transition:"transform 0.22s cubic-bezier(0.16,1,0.3,1),box-shadow 0.22s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow="0 8px 32px rgba(100,180,120,0.22)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="var(--glass-shadow)"}}>
                    {cover
                      ? <img src={cover} alt={section.month} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>📸</div>
                    }
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 45%,rgba(0,0,0,0.45))"}}/>
                    <div style={{position:"absolute",bottom:8,left:10,right:10,display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,fontWeight:800,color:"#fff",letterSpacing:"-0.01em",textShadow:"0 1px 4px rgba(0,0,0,0.4)"}}>{section.month}</span>
                      <span style={{fontSize:10,color:"rgba(255,255,255,0.85)",background:"rgba(0,0,0,0.28)",borderRadius:100,padding:"1px 7px"}}>{section.images.length}张</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 微博 Modal */}
          {weiboModal&&(
            <div onClick={closeModal} style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.32s ease, backdrop-filter 0.32s ease",background:modalVisible?"rgba(20,30,20,0.45)":"rgba(20,30,20,0)",backdropFilter:modalVisible?"blur(14px)":"blur(0px)",WebkitBackdropFilter:modalVisible?"blur(14px)":"blur(0px)"}}>
              <div onClick={e=>e.stopPropagation()} style={{position:"relative",width:"min(860px,92vw)",maxHeight:"85vh",borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",border:"1.5px solid rgba(200,230,210,0.35)",boxShadow:"0 24px 64px rgba(0,0,0,0.32), 0 2px 0 rgba(255,255,255,0.12) inset",background:"rgba(235,248,238,0.18)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",transition:"transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.32s ease",transform:modalVisible?"scale(1)":"scale(0.86)",opacity:modalVisible?1:0}}>
                {/* 标题栏 */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"rgba(180,220,190,0.28)",borderBottom:"1px solid rgba(180,220,190,0.35)",flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{display:"flex",gap:6}}>
                      <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f57",border:"1px solid rgba(0,0,0,0.12)"}}/>
                      <div style={{width:12,height:12,borderRadius:"50%",background:"#febc2e",border:"1px solid rgba(0,0,0,0.12)"}}/>
                      <div style={{width:12,height:12,borderRadius:"50%",background:"#28c840",border:"1px solid rgba(0,0,0,0.12)"}}/>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:"var(--c-ink)",letterSpacing:"-0.01em"}}>📅 {weiboModal.month}</span>
                    <span style={{fontSize:11,color:"var(--c-muted)",background:"rgba(155,210,168,0.25)",borderRadius:100,padding:"1px 8px",border:"1px solid rgba(155,210,168,0.3)"}}>{weiboModal.images.length} 张</span>
                  </div>
                  <button onClick={closeModal} style={{width:28,height:28,borderRadius:6,border:"1px solid rgba(180,200,180,0.4)",background:"rgba(255,255,255,0.2)",cursor:"pointer",fontSize:14,color:"var(--c-ink-2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",transition:"background 0.15s"}}>×</button>
                </div>
                {/* 内容区 */}
                <div style={{overflowY:"auto",padding:16,flex:1}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
                    {(weiboModal.imageFiles||weiboModal.images.map(u=>({url:u,isVideo:u.match(/\.(mov|mp4)$/i)}))).slice(0,weiboPage*WEIBO_PAGE_SIZE).map((item,i)=>(
                      <WeiboMediaCard key={i} item={item} onClick={url=>setLightbox(url)}/>
                    ))}
                    {weiboModal.images.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px 0",color:"var(--c-faint)",fontSize:13}}>💌 这个月还没有图片哦～</div>}
                    {weiboPage*WEIBO_PAGE_SIZE < (weiboModal.imageFiles||weiboModal.images).length && (
                      <div style={{gridColumn:"1/-1",textAlign:"center",padding:"10px 0"}}>
                        <button onClick={()=>setWeiboPage(p=>p+1)} style={{
                          padding:"8px 24px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                          border:"1px solid rgba(195,228,206,0.5)",background:"rgba(162,214,174,0.2)",color:"var(--c-accent)",
                        }}>加载更多（{(weiboModal.imageFiles||weiboModal.images).length - weiboPage*WEIBO_PAGE_SIZE} 张）</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 日常分享 */}
          <div ref={el=>sectionRefs.current["daily-share"]=el} className="section-card" id="daily-share">
            <div className="section-heading"><span className="section-heading-badge">🎀</span>日常分享</div>
            <DailyShareSection/>
          </div>

          {/* 周边 */}
          <div ref={el=>sectionRefs.current["merch"]=el} className="section-card" id="merch">
            <div className="section-heading"><span className="section-heading-badge">🛍️</span>周边收藏</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {["小卡","玩偶","其他类型周边"].map(cat=>(
                <div key={cat} style={{
                  background:"rgba(240,250,243,0.52)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
                  border:"1px solid rgba(195,228,206,0.5)",borderRadius:12,padding:"14px 18px",
                  display:"flex",alignItems:"center",gap:12,
                }}>
                  <span style={{fontSize:18}}>{cat==="小卡"?"🃏":cat==="玩偶"?"🧸":"🎁"}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--c-ink)",marginBottom:4}}>{cat}</div>
                    <div style={{fontSize:12,color:"var(--c-muted)"}}>由于暂未收集数据，此板块暂未开放</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 猫爬架 */}
          <div ref={el=>sectionRefs.current["cat-tower"]=el} className="section-card" id="cat-tower">
            <div className="section-heading"><span className="section-heading-badge">🐱</span>猫爬架</div>
            <CatTowerSection weibo={data.weibo}/>
          </div>

          {/* 关于本站 */}
          <div ref={el=>sectionRefs.current["about-site"]=el} className="section-card" id="about-site">
            <div className="section-heading"><span className="section-heading-badge">💌</span>关于本网站</div>
            <AboutWebsite/>
          </div>

          {/* Footer */}
          <div style={{textAlign:"center",padding:"22px 0 46px"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(240,250,243,0.58)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:"1px solid var(--glass-border-soft)",borderRadius:100,padding:"10px 22px",marginBottom:12,fontSize:16,boxShadow:"var(--glass-shadow)"}}>🌿 💚 🌿</div>
            <div style={{fontSize:12,color:"var(--c-muted)",fontWeight:500,marginBottom:4}}>made with 💚 by a Rui fan · 永远支持你 ✨</div>
            <div style={{fontSize:10.5,color:"var(--c-faint)"}}>照片版权归时代峰峻及张函瑞本人所有，仅供粉丝欣赏</div>
          </div>
        </main>
      </div>
    </>
  )
}
