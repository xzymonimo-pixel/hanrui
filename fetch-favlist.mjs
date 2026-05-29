/**
 * fetch-favlist.mjs
 * 自动爬取所有页，直到没有更多数据
 * 运行：node fetch-favlist.mjs
 */

const MY_COOKIE = `buvid3=D240FD13-A0FE-D853-05B6-2A3A81A348F411076infoc; b_nut=1779942211; bsource=search_google; _uuid=12118B2A-3187-610C3-936C-8A1087E8B6DD811266infoc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODAyMDE0MTIsImlhdCI6MTc3OTk0MjE1MiwicGx0IjotMX0.E6zfv1alJFcSotELnnV01MqLIYwdPw7WQfOFwZN57r8; bili_ticket_expires=1780201352; buvid4=CBFBCCF8-0966-70B6-F790-47FB1DBDD6C826317-025050615-Ok0fRTsARXhl8BSu6Z2X9Q%3D%3D; buvid_fp=9b79030af1f552afee3b204ae2a44c1c; SESSDATA=4ac324a7%2C1795494243%2C4afe0%2A51CjDWSQaE5pjYL84oxBn_Rf7fhe9HG8tLWf0ZwRqCwKG1KFB3P0sf4bbA6EwmyL7-KlQSVjhfU19IQ1FrT2FNajVxVW1EVmY1RXFTaTNXYmNEdEticzRfUUdoQllTSDExOUcwaGxIWEttT0tyTk9BcTd0akhaaHZGMUpQQXdac2t2emxrb2Qza1pnIIEC; bili_jct=dc7c374b2c13056313a8ecd0140eb3a6; DedeUserID=329473023; DedeUserID__ckMd5=ab45d1f35b80eaa4; sid=dfkutk6m; theme-tip-show=SHOWED; home_feed_column=4; browser_resolution=885-900; b_lsid=ECC1F7BF_19E6CD38094`

const FAV_ID = "3732055441"
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.bilibili.com/",
  "Origin": "https://www.bilibili.com",
  "Cookie": MY_COOKIE,
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log("══════════════════════════════════")
  console.log("  爬取B站收藏夹（全部页）")
  console.log("══════════════════════════════════")

  const videos = []
  const pageSize = 20
  let page = 1

  while (true) {
    const url = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${FAV_ID}&pn=${page}&ps=${pageSize}&keyword=&order=mtime&type=0&tid=0&platform=web`
    let data
    try {
      const res = await fetch(url, { headers: HEADERS })
      data = await res.json()
    } catch(e) {
      console.error(`第${page}页失败:`, e.message)
      break
    }

    if (data.code !== 0) {
      console.error(`接口错误 code=${data.code}: ${data.message}`)
      break
    }

    const medias = data?.data?.medias || []
    if (medias.length === 0) {
      console.log(`第${page}页：空，爬取完毕`)
      break
    }

    for (const v of medias) {
      const d = new Date(v.pubtime * 1000)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
      videos.push({
        bvid: v.bvid,
        title: v.title,
        cover: v.cover,
        url: `https://www.bilibili.com/video/${v.bvid}/`,
        date,
      })
    }
    console.log(`第${page}页：${medias.length}条，累计${videos.length}`)

    // 如果不足20条说明是最后一页
    if (medias.length < pageSize) break
    page++
    await sleep(600)
  }

  // 分类
  const xingqi5 = videos.filter(v => v.title.includes("星期五练习生"))
  const xinxing = videos.filter(v => v.title.includes("一颗好星星") || v.title.includes("一颗小星星"))
  const pd = videos.filter(v => v.title.includes("PD的蛋生") || v.title.includes("PD的诞生"))
  const siyi = videos.filter(v => v.title.includes("四一有意思"))

  const fs = await import("fs")
  fs.writeFileSync("bili-favlist.json", JSON.stringify(videos, null, 2), "utf8")
  fs.writeFileSync("bili-xingqi5.json", JSON.stringify(xingqi5, null, 2), "utf8")
  fs.writeFileSync("bili-xinxing.json", JSON.stringify(xinxing, null, 2), "utf8")
  fs.writeFileSync("bili-pd.json", JSON.stringify(pd, null, 2), "utf8")
  fs.writeFileSync("bili-siyi.json", JSON.stringify(siyi, null, 2), "utf8")

  console.log(`\n✅ 共 ${videos.length} 条（共${page}页）`)
  console.log(`📅 星期五练习生: ${xingqi5.length} 条`)
  console.log(`⭐ 一颗好星星: ${xinxing.length} 条`)
  console.log(`🥚 PD的蛋生/诞生: ${pd.length} 条`)
  console.log(`🎯 四一有意思: ${siyi.length} 条`)
  console.log("══════════════════════════════════\n")
}

main().catch(e => { console.error("❌", e); process.exit(1) })
