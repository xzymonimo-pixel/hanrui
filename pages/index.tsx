import fs from "fs"
import path from "path"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"

const toCloudinary = (p) => p ? `https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/${p.replace(/^\/?(public\/)?/, "")}` : ""

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
  function cloudinaryPage(prefix, cursor) {
    return new Promise((resolve) => {
      const p = { prefix, max_results: "500", type: "upload" }
      if (cursor) p.next_cursor = cursor
      const params = new URLSearchParams(p)
      const options = {
        hostname: "api.cloudinary.com",
        path: `/v1_1/demfj39xl/resources/image/upload?${params}`,
        headers: { Authorization: "Basic " + Buffer.from("614619994392318:gNr5SzuAfpSGHWmYKxHYcZPUOiU").toString("base64") }
      }
      const req = https_mod.request(options, res => {
        let b = ""
        res.on("data", d => b += d)
        res.on("end", () => { try { resolve(JSON.parse(b)) } catch { resolve({resources:[]}) } })
      })
      req.on("error", () => resolve({resources:[]}))
      req.end()
    })
  }

  let allResources = []
  let cursor = null
  do {
    const page = await cloudinaryPage("hanrui/public/20", cursor)
    allResources = allResources.concat(page.resources || [])
    cursor = page.next_cursor || null
  } while (cursor)
  const monthSet = [...new Set(allResources.map(r => r.public_id.split("/")[2]))].filter(m => /^\d{4}-\d{2}$/.test(m)).sort((a,b) => a.localeCompare(b))

  const weibo = monthSet.map(month => {
    const monthResources = allResources.filter(r => r.public_id.includes(`/${month}/`))
    const imageFiles = monthResources.map(r => ({ url: `https://res.cloudinary.com/demfj39xl/image/upload/${r.public_id}.${r.format}`, filename: r.public_id.split("/").pop(), isVideo: false }))
    return { month, images: imageFiles.map(r => r.url), imageFiles }
  })

  // 作品四分类：舞台 考核 编曲 个人作品
  const CDN = "https://res.cloudinary.com/demfj39xl/video/upload/hanrui/public"
  const workCategories = {
    舞台: [
      `${CDN}/作品/舞台/BACK SEAT.mp4`,
      `${CDN}/作品/舞台/Lovely.mp4`,
      `${CDN}/作品/舞台/克卜勒.mp4`,
    ],
    考核: [
      `${CDN}/作品/考核/O.O.mp4`,
      `${CDN}/作品/考核/Sorry Would Go a Long Way.mp4`,
      `${CDN}/作品/考核/forever young.mp4`,
      `${CDN}/作品/考核/你要的愛.mp4`,
      `${CDN}/作品/考核/兰亭序.mp4`,
      `${CDN}/作品/考核/雨愛.mp4`,
    ],
    编曲: [],
    个人作品: [],
  }

  // 周边五分类
  function getMerchCategory(subName) {
    const dir = path.join(publicDir, "merch", subName)
    try {
      return fs.readdirSync(dir)
        .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i))
        .map(f => toCloudinary(`/merch/${subName}/${f}`))
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
  const bgmNames = ["我离开我自己","光亮","Crazy","I Lover You 3000","Mascara","forever young","一路生花","传奇","像风一样","克卜勒","兰亭序","如願","小偷","我很快乐","旅行中忘記","星辰大海","是你","永不失联的爱 ","洋葱","玫瑰少年","言不由衷","起风了","逆光","鐵達尼號"]
  const bgmList = bgmNames.map(name => ({ url: `${BGMCDN}/${name}.mp3`, name }))

  return { props: { data: { weibo, workCategories, merchCategories, bgmList } } }
}

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
  { s:"🌱",size:16,x:8, y:85,dur:11,delay:1.8 },
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
  const now=new Date()
  const todayMD=`${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
  const todayImgs=[]
  weibo.forEach(({month,imageFiles,images})=>{
    const files=imageFiles||[]
    files.forEach((item,idx)=>{
      const filename=typeof item==="object"?item.filename:item
      const url=typeof item==="object"?item.url:images[idx]
      const mdMatch=filename.match(/(\d{2}-\d{2})/)
      if(mdMatch&&mdMatch[1]===todayMD) todayImgs.push({url,year:month.split("-")[0]})
    })
  })
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
                ?<div style={{textAlign:"center",padding:"14px 0",fontSize:10.5,color:"#a4c8ae"}}>🌱 今天暂无往年记录</div>
                :<div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:320,overflowY:"auto"}}>
                  {todayImgs.map((item,i)=>(
                    <div key={i} onClick={()=>setLightbox(item.url)}
                      style={{borderRadius:9,overflow:"hidden",cursor:"pointer",border:"1px solid rgba(195,228,206,0.5)",background:"rgba(255,255,255,0.5)",transition:"transform 0.18s"}}
                      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                    >
                      <img src={item.url} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>
                      <div style={{padding:"3px 7px",fontSize:9.5,color:"#4a7a58",fontWeight:600}}>{item.year} 年今日</div>
                    </div>
                  ))}
                </div>
              }
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
  const audioRef=useRef(null)
  const fadeRef=useRef(null)
  const [interacted,setInteracted]=useState(false)

  // 首次交互后自动播放
  useEffect(()=>{
    if(!interacted) return
    const audio=audioRef.current
    if(!audio||bgmList.length===0) return
    audio.volume=volume
    audio.play().then(()=>setPlaying(true)).catch(()=>{})
  },[interacted])

  useEffect(()=>{
    const h=()=>{ if(!interacted) setInteracted(true) }
    window.addEventListener("click",h,{once:true})
    window.addEventListener("keydown",h,{once:true})
    return ()=>{ window.removeEventListener("click",h); window.removeEventListener("keydown",h) }
  },[interacted])

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
      <audio ref={audioRef} src={song.url} onEnded={handleEnded} preload="metadata"/>
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
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
              <button onClick={()=>changeTrack(-1)} style={playerBtn}>⏮</button>
              <button onClick={togglePlay} style={{
                ...playerBtn,
                width:32,height:32,background:"rgba(79,168,104,0.2)",
                border:"1px solid rgba(79,168,104,0.4)",fontSize:14,
              }}>{playing?"⏸":"▶"}</button>
              <button onClick={()=>changeTrack(1)} style={playerBtn}>⏭</button>
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
      const ni={id:Math.random(),x:Math.random()*100,e:["🌿","🍃","💚","✨","🌱"][Math.floor(Math.random()*5)]}
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
//  Works Tabs Carousel
// ════════════════════════════════════════════
function WorksSection({ workCategories }) {
  const tabs=["舞台","考核","编曲","个人作品"]
  const [activeTab,setActiveTab]=useState("舞台")
  const trackRef=useRef(null)
  const autoScrollRef=useRef(null)
  const [activeIdx,setActiveIdx]=useState(null)
  const videoRefs=useRef({})

  const startScroll=useCallback((dir)=>{
    if(autoScrollRef.current) return
    autoScrollRef.current=setInterval(()=>{
      if(trackRef.current) trackRef.current.scrollLeft+=dir*3
    },16)
  },[])
  const stopScroll=useCallback(()=>{
    if(autoScrollRef.current){clearInterval(autoScrollRef.current);autoScrollRef.current=null}
  },[])
  const handleMM=useCallback((e)=>{
    const r=e.currentTarget.getBoundingClientRect()
    const x=e.clientX-r.left,w=r.width
    if(x<w*0.2){stopScroll();startScroll(-1)}
    else if(x>w*0.8){stopScroll();startScroll(1)}
    else stopScroll()
  },[startScroll,stopScroll])

  const handleCardClick=(idx)=>{
    stopScroll()
    if(activeIdx===idx){setActiveIdx(null)}
    else{
      if(activeIdx!==null&&videoRefs.current[activeIdx]) videoRefs.current[activeIdx].pause()
      setActiveIdx(idx)
      setTimeout(()=>{ videoRefs.current[idx]?.play(); window.dispatchEvent(new Event('video-play')) },50)
    }
  }

  // reset on tab change
  useEffect(()=>{setActiveIdx(null);videoRefs.current={}},[activeTab])

  const vids=workCategories[activeTab]||[]

  return (
    <div>
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
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

      {vids.length===0?(
        <div style={{textAlign:"center",padding:"42px 0",color:"var(--c-faint)"}}>
          <div style={{fontSize:36,marginBottom:10}}>🎬</div>
          <p style={{fontSize:13}}>视频放在 <code style={{background:"rgba(160,210,172,0.18)",border:"1px solid rgba(155,210,168,0.35)",padding:"2px 7px",borderRadius:6,fontFamily:"monospace"}}>public/作品/{activeTab}/</code> 下 ✨</p>
        </div>
      ):(
        <div style={{position:"relative"}} onMouseMove={handleMM} onMouseLeave={stopScroll}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:40,zIndex:2,pointerEvents:"none",background:"linear-gradient(90deg,rgba(255,255,255,0.55),transparent)",borderRadius:"12px 0 0 12px"}}/>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:40,zIndex:2,pointerEvents:"none",background:"linear-gradient(270deg,rgba(255,255,255,0.55),transparent)",borderRadius:"0 12px 12px 0"}}/>
          <div ref={trackRef} style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none",cursor:"grab"}} className="carousel-track">
            {vids.map((vid,i)=>{
              const name=vid.split("/").pop().replace(/\.[^.]+$/,"")
              const isActive=activeIdx===i
              return (
                <div key={i} onClick={()=>handleCardClick(i)} style={{
                  flexShrink:0,width:isActive?340:200,transition:"width 0.35s cubic-bezier(.25,.8,.25,1)",
                  borderRadius:14,overflow:"hidden",cursor:"pointer",
                  background:"rgba(240,250,243,0.55)",
                  backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
                  border:`1px solid ${isActive?"rgba(120,185,142,0.8)":"rgba(195,228,206,0.5)"}`,
                  boxShadow:isActive?"0 8px 28px rgba(40,100,56,0.18)":"0 2px 10px rgba(40,100,56,0.07)",
                }}>
                  <div style={{position:"relative"}}>
                    <video ref={el=>videoRefs.current[i]=el} src={vid} preload="metadata" controls={isActive} muted={!isActive}
                      style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",display:"block"}}/>
                    {!isActive&&(
                      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.82)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:"0 2px 10px rgba(0,0,0,0.13)"}}>▶</div>
                      </div>
                    )}
                  </div>
                  <div style={{padding:"9px 13px",fontSize:11.5,color:"var(--c-ink-3)",fontWeight:600,letterSpacing:"0.02em",borderTop:"1px solid rgba(195,228,206,0.4)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    🎬 {name}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 4px 0",fontSize:9.5,color:"var(--c-faint)",pointerEvents:"none"}}>
            <span>← 移到左侧滚动</span><span>移到右侧滚动 →</span>
          </div>
        </div>
      )}
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:13}}>
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
        : <img src={url} alt="" loading="lazy" style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block",borderRadius:style==="normal"?12:4}}/>
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
    {year:"2009",text:"10月18日，张函瑞出生于重庆 🌿"},
    {year:"2022",text:"加入时代峰峻练习生体系 ✨"},
    {year:"2023",text:"出道选拔，展现舞台天赋 💚"},
    {year:"2024",text:"正式出道，开启艺人生涯 🌸"},
    {year:"2025",text:"持续成长，每一天都在发光 ⭐"},
  ]
  const tags={
   舞台风格:["舞台人格","情绪感染力","猫系氛围","反差感"],
   性格关键词:["INFJ","绿老头","小发雷霆","对朋友很好","爱哭包"],
   成长关键词:["爱猫一族","猫塑","慢热型","真诚感","越长大越耀眼"],
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

// ════════════════════════════════════════════
//  About This Website
// ════════════════════════════════════════════
function AboutWebsite() {
  const paras=[
    {emoji:"🌱",text:"最开始建这个网站，只是因为不想让那些好看的图片散落在微博的角落里消失掉。后来慢慢收集，慢慢整理，才发现自己喜欢他喜欢得比想象中更认真。"},
    {emoji:"💚",text:"喜欢张函瑞，是因为他身上有一种很难描述的东西。他认真起来的样子，他哭的样子，他在舞台上发光的样子——每一个瞬间都值得被好好记录。"},
    {emoji:"📂",text:"做这个 archive，是想给每一个喜欢他的人一个可以慢慢翻阅的地方。不用急，不用怕错过，这里的每一张照片、每一段视频，都会一直在。"},
    {emoji:"🌸",text:"如果你也喜欢他，希望你在这里能感受到一点点温柔。希望我们能一起，看他慢慢长大，慢慢发光。"},
    {emoji:"✨",text:"爱他，就一直爱下去。 — 站主留"},
  ]
  return (
    <div>
      {paras.map((p,i)=>(
        <div key={i} style={{
          padding:"14px 17px",marginBottom:10,
          background:"rgba(240,250,243,0.52)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
          borderRadius:12,border:"1px solid rgba(195,228,206,0.45)",
          fontSize:13,lineHeight:2,color:"var(--c-ink-2)",
          display:"flex",gap:12,alignItems:"flex-start",
          animationDelay:`${i*0.08}s`,animation:"popIn 0.4s ease both",
        }}>
          <span style={{fontSize:17,flexShrink:0,marginTop:2}}>{p.emoji}</span>
          <span>{p.text}</span>
        </div>
      ))}
      <div style={{
        marginTop:16,padding:"13px 17px",
        background:"rgba(79,168,104,0.08)",
        border:"1px solid rgba(79,168,104,0.2)",
        borderRadius:10,fontSize:12,color:"var(--c-muted)",lineHeight:1.8,fontStyle:"italic",
      }}>
        🌿 本站所有图片/视频版权归原作者及张函瑞本人所有，仅供粉丝欣赏，不作任何商业用途。
      </div>
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
    {id:"weibo",  emoji:"📸",label:"微博图集"},
    {id:"merch",  emoji:"🛍️",label:"周边收藏"},
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
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes wiggle{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
        @keyframes breathGlow{0%{opacity:0.55;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}100%{opacity:0.65;transform:scale(0.98)}}
        @keyframes vinylSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes waveRipple{0%{opacity:0.5;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}
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
          .layout{flex-direction:column!important}
          .sidebar{width:100%!important;height:auto!important;position:relative!important}
          .hero-banner{padding:20px 18px!important;flex-wrap:wrap}
          .section-card{padding:18px 16px!important}
        }
      `}}/>

      <BreathingGlow/>
      <FloatingDeco/>
      <EmojiRain/>
      <MouseTrail/>

      {loading&&<IntroLoading onDone={()=>setLoading(false)}/>}
      {!loading&&<ThatDayWidget weibo={data.weibo}/>}
      {!loading&&<MusicPlayer bgmList={data.bgmList}/>}
      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}

      <div className="layout" style={{display:"flex",minHeight:"100vh",position:"relative",zIndex:1}}>

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
          <div style={{marginTop:"auto",paddingTop:22,textAlign:"center",fontSize:9.5,color:"var(--c-faint)",lineHeight:2.2,letterSpacing:"0.03em"}}>
            💚 made with love<br/>🌱 for Rui fans
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main style={{flex:1,padding:"30px 38px 50px",maxWidth:980}}>

          {/* Hero */}
          <div className="hero-banner">
            <div className="about-avatar">
              <img src="https://res.cloudinary.com/demfj39xl/image/upload/hanrui/public/image/avatar.jpg" alt="avatar"/>
            </div>
            <div style={{position:"relative",zIndex:1,flex:1}}>
              <div style={{display:"inline-flex",alignItems:"center",background:"rgba(255,255,255,0.45)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:100,padding:"3px 13px 3px 6px",fontSize:10,fontWeight:700,color:"var(--c-ink-2)",letterSpacing:"0.07em",marginBottom:12,border:"1px solid rgba(160,210,172,0.40)",gap:6}}>
                <span style={{fontSize:13}}>🌿</span>WELCOME TO RUI HOUSE
              </div>
              <h1 style={{fontSize:24,fontWeight:900,color:"var(--c-ink)",marginBottom:9,lineHeight:1.25,letterSpacing:"-0.02em"}}>你好，欢迎来到我的世界 💚</h1>
              <p style={{fontSize:12.5,color:"var(--c-ink-2)",lineHeight:1.85,fontWeight:400,marginBottom:13}}>欢迎来到 Rui House！<br/>这里收录了张函瑞成长的一点一滴 ✨</p>
              <div>
                <span className="pill-tag">🐱 爱瑞小屋</span>
                <span className="pill-tag">📸 成长痕迹</span>
                <span className="pill-tag">💚 爱一只猫就要一直爱一只猫</span>
              </div>
            </div>
          </div>

          {/* 瑞的简历 */}
          <div ref={el=>sectionRefs.current["profile"]=el} className="section-card" id="profile">
            <div className="section-heading"><span className="section-heading-badge">🌿</span>瑞的简历</div>
            <ProfileSection/>
          </div>

          {/* 作品 */}
          <div ref={el=>sectionRefs.current["works"]=el} className="section-card" id="works">
            <div className="section-heading"><span className="section-heading-badge">🎬</span>作品</div>
            <WorksSection workCategories={data.workCategories}/>
          </div>

          {/* 微博图集 */}
          <div ref={el=>sectionRefs.current["weibo"]=el} id="weibo" className="section-card">
            <div className="section-heading"><span className="section-heading-badge">📸</span>微博图集</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14}}>
              {data.weibo.map((section,si)=>{
                const cover = section.images[0] || null
                return (
                  <div key={section.month} ref={el=>monthRefs.current[section.month]=el}
                    onClick={()=>openModal(section)}
                    style={{cursor:"pointer",borderRadius:14,overflow:"hidden",position:"relative",aspectRatio:"1",background:"var(--glass-bg)",border:"2px solid var(--glass-border)",boxShadow:"var(--glass-shadow)",transition:"transform 0.22s cubic-bezier(0.16,1,0.3,1),box-shadow 0.22s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.boxShadow="0 8px 32px rgba(100,180,120,0.22)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="var(--glass-shadow)"}}>
                    {cover
                      ? <img src={cover} alt={section.month} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
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
                    {(weiboModal.imageFiles||weiboModal.images.map(u=>({url:u,isVideo:u.match(/\.(mov|mp4)$/i)}))).map((item,i)=>(
                      <WeiboMediaCard key={i} item={item} onClick={url=>setLightbox(url)}/>
                    ))}
                    {weiboModal.images.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px 0",color:"var(--c-faint)",fontSize:13}}>🌱 这个月还没有图片哦～</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 周边 */}
          <div ref={el=>sectionRefs.current["merch"]=el} className="section-card" id="merch">
            <div className="section-heading"><span className="section-heading-badge">🛍️</span>周边收藏</div>
            <MerchSection merchCategories={data.merchCategories} onLightbox={url=>setLightbox(url)}/>
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
            <div style={{fontSize:10.5,color:"var(--c-faint)"}}>照片版权归原作者所有，仅供粉丝欣赏</div>
          </div>
        </main>
      </div>
    </>
  )
}