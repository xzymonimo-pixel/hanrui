// fetch-ruimai.mjs
// 爬取肉之歌合集所有分P
// node fetch-ruimai.mjs

const BVID = "BV1L24y1k7po"
const MY_COOKIE = `buvid3=D240FD13-A0FE-D853-05B6-2A3A81A348F411076infoc; b_nut=1779942211; bsource=search_google; _uuid=12118B2A-3187-610C3-936C-8A1087E8B6DD811266infoc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODAyMDE0MTIsImlhdCI6MTc3OTk0MjE1MiwicGx0IjotMX0.E6zfv1alJFcSotELnnV01MqLIYwdPw7WQfOFwZN57r8; bili_ticket_expires=1780201352; buvid4=CBFBCCF8-0966-70B6-F790-47FB1DBDD6C826317-025050615-Ok0fRTsARXhl8BSu6Z2X9Q%3D%3D; buvid_fp=9b79030af1f552afee3b204ae2a44c1c; SESSDATA=4ac324a7%2C1795494243%2C4afe0%2A51CjDWSQaE5pjYL84oxBn_Rf7fhe9HG8tLWf0ZwRqCwKG1KFB3P0sf4bbA6EwmyL7-KlQSVjhfU19IQ1FrT2FNajVxVW1EVmY1RXFTaTNXYmNEdEticzRfUUdoQllTSDExOUcwaGxIWEttT0tyTk9BcTd0akhaaHZGMUpQQXdac2t2emxrb2Qza1pnIIEC; bili_jct=dc7c374b2c13056313a8ecd0140eb3a6; DedeUserID=329473023; DedeUserID__ckMd5=ab45d1f35b80eaa4; sid=dfkutk6m; theme-tip-show=SHOWED; home_feed_column=4; browser_resolution=885-900; b_lsid=ECC1F7BF_19E6CD38094`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Referer": "https://www.bilibili.com/",
  "Cookie": MY_COOKIE,
}

async function main() {
  const url = `https://api.bilibili.com/x/web-interface/view?bvid=${BVID}`
  const res = await fetch(url, { headers: HEADERS })
  const data = await res.json()

  if (data.code !== 0) {
    console.error("接口错误:", data.message)
    process.exit(1)
  }

  const info = data.data
  const pages = info.pages || []

  console.log(`标题: ${info.title}`)
  console.log(`分P数量: ${pages.length}`)
  console.log(`封面: ${info.pic}`)

  const result = pages.map(p => ({
    bvid: BVID,
    cid: p.cid,
    part: p.part,
    page: p.page,
    cover: info.pic,
    url: `https://www.bilibili.com/video/${BVID}/?p=${p.page}`,
    duration: p.duration,
  }))

  const fs = await import("fs")
  fs.writeFileSync("bili-ruimai.json", JSON.stringify(result, null, 2))
  console.log(`\n✅ 已保存 ${result.length} 条到 bili-ruimai.json`)
  result.slice(0, 5).forEach(p => console.log(`  P${p.page}: ${p.part}`))
}

main().catch(e => { console.error("❌", e); process.exit(1) })
