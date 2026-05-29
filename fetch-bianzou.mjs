/**
 * fetch-bianzou.mjs
 * 放到 hanrui/ 根目录，运行：node fetch-bianzou.mjs
 * 抓取 https://space.bilibili.com/10821156/search?keyword=编曲 的所有视频
 */

// ── 把你的 Cookie 粘贴到这里 ──
const MY_COOKIE = `buvid3=D240FD13-A0FE-D853-05B6-2A3A81A348F411076infoc; b_nut=1779942211; bsource=search_google; _uuid=12118B2A-3187-610C3-936C-8A1087E8B6DD811266infoc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODAyMDE0MTIsImlhdCI6MTc3OTk0MjE1MiwicGx0IjotMX0.E6zfv1alJFcSotELnnV01MqLIYwdPw7WQfOFwZN57r8; bili_ticket_expires=1780201352; buvid4=CBFBCCF8-0966-70B6-F790-47FB1DBDD6C826317-025050615-Ok0fRTsARXhl8BSu6Z2X9Q%3D%3D; buvid_fp=9b79030af1f552afee3b204ae2a44c1c; SESSDATA=4ac324a7%2C1795494243%2C4afe0%2A51CjDWSQaE5pjYL84oxBn_Rf7fhe9HG8tLWf0ZwRqCwKG1KFB3P0sf4bbA6EwmyL7-KlQSVjhfU19IQ1FrT2FNajVxVW1EVmY1RXFTaTNXYmNEdEticzRfUUdoQllTSDExOUcwaGxIWEttT0tyTk9BcTd0akhaaHZGMUpQQXdac2t2emxrb2Qza1pnIIEC; bili_jct=dc7c374b2c13056313a8ecd0140eb3a6; DedeUserID=329473023; DedeUserID__ckMd5=ab45d1f35b80eaa4; sid=dfkutk6m; theme-tip-show=SHOWED; home_feed_column=4; browser_resolution=885-900; b_lsid=ECC1F7BF_19E6CD38094`

const UID = "10821156"
const KEYWORD = "编曲"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.bilibili.com/",
  "Origin": "https://www.bilibili.com",
  "Cookie": MY_COOKIE,
}

import crypto from "crypto"

// wbi 签名
const MIXIN_KEY_ENC_TAB = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52]
function getMixinKey(orig) { return MIXIN_KEY_ENC_TAB.map(n=>orig[n]).join("").slice(0,32) }
function encWbi(params, imgKey, subKey) {
  const mixinKey = getMixinKey(imgKey+subKey)
  const wts = Math.round(Date.now()/1000)
  const query = {...params, wts}
  const str = Object.keys(query).sort().map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(String(query[k]).replace(/[!'()*]/g,""))}`).join("&")
  const wrid = crypto.createHash("md5").update(str+mixinKey).digest("hex")
  return `${str}&w_rid=${wrid}`
}

async function sleep(ms) { return new Promise(r=>setTimeout(r,ms)) }
async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS })
  return res.json()
}

async function getWbiKeys() {
  const data = await fetchJSON("https://api.bilibili.com/x/web-interface/nav")
  const { img_url, sub_url } = data.data.wbi_img
  return {
    imgKey: img_url.split("/").pop().split(".")[0],
    subKey: sub_url.split("/").pop().split(".")[0],
  }
}

function tsToYYYYMM(ts) {
  const d = new Date(ts*1000)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
}

async function main() {
  console.log("══════════════════════════════════")
  console.log("  抓取编曲视频")
  console.log("══════════════════════════════════")

  console.log("🔑 获取 wbi 密钥...")
  let imgKey, subKey
  try {
    ;({ imgKey, subKey } = await getWbiKeys())
    console.log("  ✅ 密钥获取成功")
  } catch(e) {
    console.error("  ❌ 失败，请检查 Cookie:", e.message)
    process.exit(1)
  }

  const videos = []
  let page = 1
  const pageSize = 50

  while (true) {
    const params = { mid: UID, pn: page, ps: pageSize, order: "pubdate", platform: "web", keyword: KEYWORD }
    const signed = encWbi(params, imgKey, subKey)
    const url = `https://api.bilibili.com/x/space/wbi/arc/search?${signed}`

    let data
    try {
      data = await fetchJSON(url)
    } catch(e) {
      console.error(`第${page}页失败:`, e.message)
      break
    }

    if (data.code !== 0) {
      console.error(`接口错误 code=${data.code}: ${data.message}`)
      break
    }

    const list = data?.data?.list?.vlist || []
    if (list.length === 0) break

    for (const v of list) {
      videos.push({
        bvid: v.bvid,
        title: v.title,
        cover: v.pic,
        url: `https://www.bilibili.com/video/${v.bvid}/`,
        date: tsToYYYYMM(v.created),
        event: "编曲",
      })
    }

    console.log(`第${page}页：${list.length}条，累计${videos.length}`)
    if (list.length < pageSize) break
    page++
    await sleep(600)
  }

  const fs = await import("fs")
  fs.writeFileSync("bili-bianzou.json", JSON.stringify(videos, null, 2), "utf8")

  console.log(`\n✅ 共 ${videos.length} 条`)
  videos.slice(0,5).forEach(v=>console.log(`  ${v.date} | ${v.title}`))
  console.log("\n📁 已保存到 bili-bianzou.json")
  console.log("══════════════════════════════════\n")
}

main().catch(e=>{ console.error("❌",e); process.exit(1) })
