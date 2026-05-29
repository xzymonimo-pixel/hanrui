/**
 * fetch-bili.mjs  （wbi 签名版）
 * 放到 hanrui/ 根目录，运行：node fetch-bili.mjs
 * Node 18+
 */

import fs from "fs"
import crypto from "crypto"

// ─────────────────────────────────────────
//  ★ 把你的 Cookie 粘贴到下面这里
// ─────────────────────────────────────────
const MY_COOKIE = `buvid3=D240FD13-A0FE-D853-05B6-2A3A81A348F411076infoc; b_nut=1779942211; bsource=search_google; _uuid=12118B2A-3187-610C3-936C-8A1087E8B6DD811266infoc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODAyMDE0MTIsImlhdCI6MTc3OTk0MjE1MiwicGx0IjotMX0.E6zfv1alJFcSotELnnV01MqLIYwdPw7WQfOFwZN57r8; bili_ticket_expires=1780201352; buvid4=CBFBCCF8-0966-70B6-F790-47FB1DBDD6C826317-025050615-Ok0fRTsARXhl8BSu6Z2X9Q%3D%3D; buvid_fp=9b79030af1f552afee3b204ae2a44c1c; SESSDATA=4ac324a7%2C1795494243%2C4afe0%2A51CjDWSQaE5pjYL84oxBn_Rf7fhe9HG8tLWf0ZwRqCwKG1KFB3P0sf4bbA6EwmyL7-KlQSVjhfU19IQ1FrT2FNajVxVW1EVmY1RXFTaTNXYmNEdEticzRfUUdoQllTSDExOUcwaGxIWEttT0tyTk9BcTd0akhaaHZGMUpQQXdac2t2emxrb2Qza1pnIIEC; bili_jct=dc7c374b2c13056313a8ecd0140eb3a6; DedeUserID=329473023; DedeUserID__ckMd5=ab45d1f35b80eaa4; sid=dfkutk6m; theme-tip-show=SHOWED; home_feed_column=4; browser_resolution=885-900; b_lsid=ECC1F7BF_19E6CD38094
`

// ─────────────────────────────────────────
//  配置
// ─────────────────────────────────────────
const TF_UID       = "3670216"
const KAOHE_UID    = "10821156"   // 考核专用账号
const ZHIPAI_UIDS  = {
  "3546943494031804": "站姐①",
  "3546374494750806": "站姐②",
  "1643739345":       "秋日信函_张函瑞",
  "477183100":        "站姐④",
  "3546622789159058": "站姐⑤",
}

// 舞台关键词（TF家族官号）
const STAGE_KEYWORDS_WIDE = [
  "张函瑞",
  "新年音乐会",
  "荣耀之战",
  "多巴胺",
  "少年梦工厂",
]
// 考核账号只抓标题含「考核」的
const KAOHE_KEYWORD = "考核"

const COLLECTION_KEYWORDS = ["新年音乐会","热爱","荣耀之战","多巴胺","少年梦工厂"]
const ZHIPAI_KEYWORDS     = ["张函瑞","直拍","4K","focus","Focus","FOCUS"]
const MAX_PAGES = 30

// ─────────────────────────────────────────
//  wbi 签名工具
// ─────────────────────────────────────────
const MIXIN_KEY_ENC_TAB = [
  46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,
  27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,
  37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,
  22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52,
]

function getMixinKey(orig) {
  return MIXIN_KEY_ENC_TAB.map(n => orig[n]).join("").slice(0, 32)
}

function encWbi(params, imgKey, subKey) {
  const mixinKey = getMixinKey(imgKey + subKey)
  const wts = Math.round(Date.now() / 1000)
  const query = Object.assign({}, params, { wts })
  const str = Object.keys(query).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(String(query[k]).replace(/[!'()*]/g,""))}`
  ).join("&")
  const wrid = crypto.createHash("md5").update(str + mixinKey).digest("hex")
  return `${str}&w_rid=${wrid}`
}

// ─────────────────────────────────────────
//  请求工具
// ─────────────────────────────────────────
const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer":    "https://www.bilibili.com/",
  "Origin":     "https://www.bilibili.com",
  "Cookie":     MY_COOKIE,
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: BASE_HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// 获取 wbi 密钥
async function getWbiKeys() {
  const data = await fetchJSON("https://api.bilibili.com/x/web-interface/nav")
  const { img_url, sub_url } = data.data.wbi_img
  const imgKey = img_url.split("/").pop().split(".")[0]
  const subKey = sub_url.split("/").pop().split(".")[0]
  return { imgKey, subKey }
}

// ─────────────────────────────────────────
//  抓视频列表
// ─────────────────────────────────────────
async function fetchAllVideos(uid, label, imgKey, subKey) {
  const videos = []
  let page = 1
  console.log(`\n🔍 抓取 ${label}（UID: ${uid}）`)

  while (page <= MAX_PAGES) {
    const params = { mid: uid, pn: page, ps: 50, order: "pubdate", platform: "web" }
    const signed = encWbi(params, imgKey, subKey)
    const url = `https://api.bilibili.com/x/space/wbi/arc/search?${signed}`

    let data
    try {
      data = await fetchJSON(url)
    } catch(e) {
      console.error(`  ⚠️  第 ${page} 页失败:`, e.message)
      break
    }

    if (data.code !== 0) {
      console.error(`  ⚠️  接口错误 code=${data.code}: ${data.message}`)
      // -352 需要更新 wbi 签名，其他错误直接退出
      break
    }

    const list = data?.data?.list?.vlist || []
    if (list.length === 0) break

    for (const v of list) {
      videos.push({
        bvid:  v.bvid,
        title: v.title,
        cover: v.pic,
        date:  tsToYYYYMM(v.created),
        views: fmtViews(v.play),
        url:   `https://www.bilibili.com/video/${v.bvid}/`,
      })
    }

    console.log(`  第 ${page} 页：${list.length} 条，累计 ${videos.length}`)
    if (list.length < 50) break
    page++
    await sleep(800)
  }

  return videos
}

// ─────────────────────────────────────────
//  工具函数
// ─────────────────────────────────────────
function tsToYYYYMM(ts) {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
}
function fmtViews(n) {
  if (!n || n === "--") return ""
  return n >= 10000 ? `${(n/10000).toFixed(1)}万` : String(n)
}
function detectTags(title) {
  return COLLECTION_KEYWORDS.filter(k => title.includes(k))
}
function zhipaiMatch(title) {
  return ZHIPAI_KEYWORDS.some(k => title.includes(k))
}

// ─────────────────────────────────────────
//  主流程
// ─────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════")
  console.log("  哔哩哔哩数据抓取脚本（wbi签名版）")
  console.log("═══════════════════════════════════════")

  // 获取 wbi 密钥
  console.log("\n🔑 获取 wbi 签名密钥...")
  let imgKey, subKey
  try {
    ;({ imgKey, subKey } = await getWbiKeys())
    console.log("  ✅ 密钥获取成功")
  } catch(e) {
    console.error("  ❌ 密钥获取失败，请检查 Cookie 是否正确:", e.message)
    process.exit(1)
  }

  // 抓 TF家族舞台
  const tfAll = await fetchAllVideos(TF_UID, "TF家族", imgKey, subKey)
  const stageVideos = tfAll
    .filter(v => STAGE_KEYWORDS_WIDE.some(k => v.title.includes(k)))
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(v => ({ bvid:v.bvid, title:v.title, cover:v.cover, url:v.url, date:v.date, tags:detectTags(v.title) }))

  console.log(`\n✅ 舞台视频：共 ${stageVideos.length} 条`)
  await sleep(1000)

  // 抓考核账号（UID 10821156），过滤含「考核」的视频
  const kaoheAll = await fetchAllVideos(KAOHE_UID, "考核账号", imgKey, subKey)
  const kaoheVideos = kaoheAll
    .filter(v => v.title.includes(KAOHE_KEYWORD))
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(v => ({ bvid:v.bvid, title:v.title, cover:v.cover, url:v.url, date:v.date, tags:["考核"] }))

  console.log(`✅ 考核视频：共 ${kaoheVideos.length} 条（请自行删除不相关的）`)
  await sleep(1000)

  // 抓站姐
  const zhipaiData = []
  const colors = ["#e07b39","#457b9d","#4fa868","#e76f51","#a8dadc"]
  let ci = 0

  for (const [uid, name] of Object.entries(ZHIPAI_UIDS)) {
    const all = await fetchAllVideos(uid, name, imgKey, subKey)
    const matched = all
      .filter(v => zhipaiMatch(v.title))
      .sort((a,b) => b.date.localeCompare(a.date))
      .map(v => ({ title:v.title, url:v.url, cover:v.cover, date:v.date, views:v.views, event:detectTags(v.title)[0]||"直拍" }))

    zhipaiData.push({
      id:      `zp_${uid}`,
      name,
      initials: name.replace(/[_·\s]/g,"").slice(0,2),
      color:   colors[ci++ % colors.length],
      bSpace:  `https://space.bilibili.com/${uid}`,
      videos:  matched,
    })
    console.log(`  ✅ ${name}：${matched.length} 条`)
    await sleep(1000)
  }

  // 写文件
  fs.writeFileSync("bili-stage.json",  JSON.stringify(stageVideos, null, 2), "utf8")
  fs.writeFileSync("bili-kaohe.json",  JSON.stringify(kaoheVideos, null, 2), "utf8")
  fs.writeFileSync("bili-zhipai.json", JSON.stringify(zhipaiData,  null, 2), "utf8")
  fs.writeFileSync("bili-output.ts",
    `// 自动生成 — ${new Date().toLocaleString("zh-CN")}\n\n` +
    `// ★ 舞台（TF家族官号，含张函瑞/新年音乐会/荣耀之战等）\n` +
    `const STAGE_VIDEOS = ${JSON.stringify(stageVideos, null, 2)}\n\n` +
    `// ★ 考核（请删除不相关条目后再用）\n` +
    `const KAOHE_VIDEOS = ${JSON.stringify(kaoheVideos, null, 2)}\n\n` +
    `// ★ 直拍站姐\n` +
    `const ZHIPAI_DATA = ${JSON.stringify(zhipaiData, null, 2)}\n`, "utf8")

  // 摘要
  console.log("\n═══════════════════════════════════════")
  console.log(`🎬 舞台：${stageVideos.length} 条`)
  const colCount = {}
  stageVideos.forEach(v => {
    if(v.tags.length) v.tags.forEach(t => colCount[t]=(colCount[t]||0)+1)
    else colCount["（无合集）"]=(colCount["（无合集）"]||0)+1
  })
  Object.entries(colCount).forEach(([k,n]) => console.log(`   ${k}: ${n} 条`))
  console.log(`\n📋 考核（待人工筛选）：${kaoheVideos.length} 条`)
  console.log(`\n📷 直拍：`)
  zhipaiData.forEach(s => console.log(`   ${s.name}: ${s.videos.length} 条`))
  console.log("\n📁 输出文件：")
  console.log("   bili-stage.json  → 舞台数据")
  console.log("   bili-kaohe.json  → 考核数据（删完再用）")
  console.log("   bili-zhipai.json → 直拍数据")
  console.log("   bili-output.ts   → 全部合并，直接替换 index.tsx 对应段落 ✨")
  console.log("═══════════════════════════════════════\n")
}

main().catch(e => { console.error("❌ 出错:", e); process.exit(1) })
