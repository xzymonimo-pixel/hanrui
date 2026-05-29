/**
 * fetch-season.mjs
 * 放到 hanrui/ 根目录，运行：node fetch-season.mjs
 * 抓取 https://space.bilibili.com/476880205/lists/7167896?type=season 里的所有视频
 */

// ── 把你的 Cookie 粘贴到这里 ──
const MY_COOKIE = `buvid3=D240FD13-A0FE-D853-05B6-2A3A81A348F411076infoc; b_nut=1779942211; bsource=search_google; _uuid=12118B2A-3187-610C3-936C-8A1087E8B6DD811266infoc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODAyMDE0MTIsImlhdCI6MTc3OTk0MjE1MiwicGx0IjotMX0.E6zfv1alJFcSotELnnV01MqLIYwdPw7WQfOFwZN57r8; bili_ticket_expires=1780201352; buvid4=CBFBCCF8-0966-70B6-F790-47FB1DBDD6C826317-025050615-Ok0fRTsARXhl8BSu6Z2X9Q%3D%3D; buvid_fp=9b79030af1f552afee3b204ae2a44c1c; SESSDATA=4ac324a7%2C1795494243%2C4afe0%2A51CjDWSQaE5pjYL84oxBn_Rf7fhe9HG8tLWf0ZwRqCwKG1KFB3P0sf4bbA6EwmyL7-KlQSVjhfU19IQ1FrT2FNajVxVW1EVmY1RXFTaTNXYmNEdEticzRfUUdoQllTSDExOUcwaGxIWEttT0tyTk9BcTd0akhaaHZGMUpQQXdac2t2emxrb2Qza1pnIIEC; bili_jct=dc7c374b2c13056313a8ecd0140eb3a6; DedeUserID=329473023; DedeUserID__ckMd5=ab45d1f35b80eaa4; sid=dfkutk6m; theme-tip-show=SHOWED; home_feed_column=4; browser_resolution=885-900; b_lsid=ECC1F7BF_19E6CD38094`

const UID = "476880205"
const SEASON_ID = "7167896"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.bilibili.com/",
  "Origin": "https://www.bilibili.com",
  "Cookie": MY_COOKIE,
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS })
  return res.json()
}

async function main() {
  console.log("══════════════════════════════════")
  console.log("  抓取高会语音合集")
  console.log("══════════════════════════════════")

  const videos = []
  let page = 1
  const pageSize = 30

  while (true) {
    const url = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${UID}&season_id=${SEASON_ID}&sort_reverse=false&page_num=${page}&page_size=${pageSize}`
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

    const archives = data?.data?.archives || []
    if (archives.length === 0) break

    for (const v of archives) {
      const d = new Date(v.pubdate * 1000)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
      videos.push({
        bvid: v.bvid,
        title: v.title,
        cover: v.pic,
        url: `https://www.bilibili.com/video/${v.bvid}/`,
        date,
        event: "高会语音",
      })
    }

    console.log(`第${page}页：${archives.length}条，累计${videos.length}`)
    if (archives.length < pageSize) break
    page++
    await sleep(500)
  }

  // 输出
  const fs = await import('fs')
  fs.writeFileSync('bili-gaohui.json', JSON.stringify(videos, null, 2), 'utf8')

  console.log(`\n✅ 共 ${videos.length} 条视频`)
  console.log("📁 已保存到 bili-gaohui.json")
  videos.slice(0,5).forEach(v => console.log(`  ${v.date} | ${v.title}`))
  console.log("══════════════════════════════════\n")
}

main().catch(e => { console.error("❌", e); process.exit(1) })
