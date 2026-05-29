/**
 * fetch-baiwanwutai.mjs
 * 爬取 https://space.bilibili.com/1849691041/favlist?fid=3208409041
 * 运行：node fetch-baiwanwutai.mjs
 */

const MY_COOKIE = `buvid3=D240FD13-A0FE-D853-05B6-2A3A81A348F411076infoc; b_nut=1779942211; bsource=search_google; _uuid=12118B2A-3187-610C3-936C-8A1087E8B6DD811266infoc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODAyMDE0MTIsImlhdCI6MTc3OTk0MjE1MiwicGx0IjotMX0.E6zfv1alJFcSotELnnV01MqLIYwdPw7WQfOFwZN57r8; bili_ticket_expires=1780201352; buvid4=CBFBCCF8-0966-70B6-F790-47FB1DBDD6C826317-025050615-Ok0fRTsARXhl8BSu6Z2X9Q%3D%3D; buvid_fp=9b79030af1f552afee3b204ae2a44c1c; SESSDATA=4ac324a7%2C1795494243%2C4afe0%2A51CjDWSQaE5pjYL84oxBn_Rf7fhe9HG8tLWf0ZwRqCwKG1KFB3P0sf4bbA6EwmyL7-KlQSVjhfU19IQ1FrT2FNajVxVW1EVmY1RXFTaTNXYmNEdEticzRfUUdoQllTSDExOUcwaGxIWEttT0tyTk9BcTd0akhaaHZGMUpQQXdac2t2emxrb2Qza1pnIIEC; bili_jct=dc7c374b2c13056313a8ecd0140eb3a6; DedeUserID=329473023; DedeUserID__ckMd5=ab45d1f35b80eaa4; sid=dfkutk6m; theme-tip-show=SHOWED; home_feed_column=4; browser_resolution=885-900; b_lsid=ECC1F7BF_19E6CD38094`

const FAV_ID = "3208409041"
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.bilibili.com/",
  "Origin": "https://www.bilibili.com",
  "Cookie": MY_COOKIE,
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log("══════════════════════════════════")
  console.log("  爬取百万舞台收藏夹")
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
    if (medias.length === 0) { console.log(`第${page}页：空，完毕`); break }

    for (const v of medias) {
      const d = new Date(v.pubtime * 1000)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
      videos.push({
        bvid: v.bvid,
        title: v.title,
        cover: v.cover,
        url: `https://www.bilibili.com/video/${v.bvid}/`,
        date,
        tags: [],
      })
    }
    console.log(`第${page}页：${medias.length}条，累计${videos.length}`)
    if (medias.length < pageSize) break
    page++
    await sleep(600)
  }

  const fs = await import("fs")
  fs.writeFileSync("bili-baiwanwutai.json", JSON.stringify(videos, null, 2), "utf8")
  console.log(`\n✅ 共 ${videos.length} 条`)
  videos.slice(0,5).forEach(v => console.log(`  ${v.date} | ${v.title}`))
  console.log("══════════════════════════════════\n")
}

main().catch(e => { console.error("❌", e); process.exit(1) })
