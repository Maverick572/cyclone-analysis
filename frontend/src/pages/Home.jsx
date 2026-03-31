import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const injectStyles = () => {
  if (document.getElementById('home-keyframes')) return
  const el = document.createElement('style')
  el.id = 'home-keyframes'
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');

    @keyframes spin-slow  { to { transform: rotate(360deg); } }
    @keyframes spin-rev   { to { transform: rotate(-360deg); } }
    @keyframes pulse-ring {
      0%,100% { transform: scale(0.94); opacity: 0.6; }
      50%     { transform: scale(1.06); opacity: 0.2; }
    }
    @keyframes drift {
      0%,100% { transform: scale(1.05) translate(0,0); }
      50%     { transform: scale(1.08) translate(12px,-8px); }
    }
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes ticker {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position: 600px 0; }
    }
    @keyframes radarSweep {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .hcard:hover {
      border-color: rgba(0,212,255,0.45) !important;
      box-shadow: 0 0 40px rgba(0,212,255,0.1), 0 12px 40px rgba(0,0,0,0.5) !important;
      transform: translateY(-2px) !important;
    }
    .statc:hover .snum { color: #fff !important; text-shadow: 0 0 20px #00d4ff !important; }
    .metarow-item { border-right: 1px solid rgba(0,212,255,0.1); }
    .metarow-item:last-child { border-right: none; }
  `
  document.head.appendChild(el)
}

function RadarViz({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.09) 0%, transparent 65%)',
        animation: 'pulse-ring 4s ease-in-out infinite',
      }}/>
      {[1, 0.72, 0.50, 0.30].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', inset: `${(1-s)*50}%`, borderRadius: '50%',
          border: `1px solid rgba(0,212,255,${0.1 + i*0.05})`,
          animation: `${i%2?'spin-rev':'spin-slow'} ${20+i*7}s linear infinite`,
        }}/>
      ))}
      <svg style={{ position:'absolute', inset:0, animation:'radarSweep 4s linear infinite' }}
        viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <path d={`M ${size/2} ${size/2} L ${size/2} 0 A ${size/2} ${size/2} 0 0 1 ${size} ${size/2} Z`}
          fill="url(#sweep)" opacity="0.18"/>
      </svg>
      <svg style={{ position:'absolute', inset:0, animation:'spin-slow 28s linear infinite' }}
        viewBox={`0 0 ${size} ${size}`}>
        {[0,60,120,180,240,300].map((a,i) => {
          const r = (a*Math.PI)/180
          const cx = size/2 + Math.cos(r)*30, cy = size/2 + Math.sin(r)*30
          return (
            <path key={i}
              d={`M ${size/2} ${size/2} Q ${cx+Math.cos(r+1.2)*70} ${cy+Math.sin(r+1.2)*70} ${size/2+Math.cos(r+0.6)*100} ${size/2+Math.sin(r+0.6)*100}`}
              stroke={`rgba(0,212,255,${0.14-i*0.01})`} strokeWidth="14"
              strokeLinecap="round" fill="none" filter="url(#bl)"/>
          )
        })}
        <filter id="bl"><feGaussianBlur stdDeviation="5"/></filter>
        <circle cx={size/2} cy={size/2} r="18" fill="rgba(0,212,255,0.08)" stroke="rgba(0,212,255,0.55)" strokeWidth="1.5"/>
        <circle cx={size/2} cy={size/2} r="7" fill="rgba(0,212,255,0.25)"/>
        <circle cx={size/2} cy={size/2} r="3" fill="#00d4ff"/>
      </svg>
      <svg style={{ position:'absolute', inset:0 }} viewBox={`0 0 ${size} ${size}`}>
        <line x1={size/2} y1="10" x2={size/2} y2={size-10} stroke="rgba(0,212,255,0.07)" strokeWidth="1" strokeDasharray="3 7"/>
        <line x1="10" y1={size/2} x2={size-10} y2={size/2} stroke="rgba(0,212,255,0.07)" strokeWidth="1" strokeDasharray="3 7"/>
      </svg>
      <div style={{ position:'absolute', bottom:4, right:8,
        fontFamily:'Space Mono,monospace', fontSize:'0.48rem',
        color:'rgba(0,212,255,0.35)', letterSpacing:'0.1em' }}>SCS · BAY OF BENGAL</div>
    </div>
  )
}

function Ticker() {
  const items = ['AMPHAN · SCS · CAT-5 EQUIVALENT','20 MAY 2020 · 09:30 UTC LANDFALL',
    'PEAK WIND 240 KM/H','PRESSURE 920 hPa','WEST BENGAL · ODISHA · BANGLADESH',
    '742 DISTRICTS ANALYZED','IMD · ERA5 · GPM DATA','16+ DAYS ANALYZED','0.1° SPATIAL RES.']
  const text = [...items,...items].join('   ·   ')
  return (
    <div style={{ overflow:'hidden', borderTop:'1px solid rgba(0,212,255,0.1)',
      borderBottom:'1px solid rgba(0,212,255,0.1)',
      background:'rgba(0,5,18,0.7)', padding:'0.4rem 0' }}>
      <div style={{ display:'flex', animation:'ticker 30s linear infinite', whiteSpace:'nowrap' }}>
        <span style={{ fontFamily:'Space Mono,monospace', fontSize:'0.58rem',
          color:'rgba(0,212,255,0.5)', letterSpacing:'0.1em' }}>{text}</span>
      </div>
    </div>
  )
}

export default function Home() {
  useEffect(() => { injectStyles() }, [])
  const navigate = useNavigate()

  const stats = [
    { num:'1', label:'Cyclone' },
    { num:'742', label:'Districts' },
    { num:'16+', label:'Days Analyzed' },
    { num:'0.1°', label:'Spatial Res.' },
  ]

  const metaItems = [
    { label:'Landfall Date', val:'20 May 2020' },
    { label:'Location', val:'West Bengal' },
    { label:'Peak Winds', val:'220 km/h' },
    { label:'Min Pressure', val:'925 hPa' },
    { label:'Category', val:'Super Cyclonic' },
    { label:'Basin', val:'Bay of Bengal' },
  ]

  return (
    <div style={{ minHeight:'calc(100vh - 56px)', background:'var(--bg-primary, #040d1a)',
      fontFamily:'Syne,sans-serif', position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column' }}>

      {/* BG */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <img src="https://images.unsplash.com/photo-1614728263952-84ea256f9d0d?w=1800&q=80" alt=""
          style={{ width:'100%', height:'100%', objectFit:'cover',
            opacity:0.1, filter:'saturate(0.3) brightness(0.6)',
            animation:'drift 20s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', inset:0,
          background:'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 0%, #040d1a 70%)' }}/>
        <div style={{ position:'absolute', inset:0, opacity:0.025,
          backgroundImage:'linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)',
          backgroundSize:'60px 60px' }}/>
      </div>

      {/* HERO */}
      <div style={{ position:'relative', zIndex:1,
        display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:'2rem',
        padding:'3rem 3.5rem 2rem', maxWidth:1100, margin:'0 auto', width:'100%',
        boxSizing:'border-box', animation:'fadeUp 0.5s 0.1s both' }}>

        <div>

          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800,
            fontSize:'clamp(1.9rem, 3.8vw, 3.2rem)', lineHeight:1.08,
            color:'#e8f0ff', margin:'0 0 1rem' }}>
            Cyclone Rainfall<br/>
            <span style={{ color:'#00d4ff', textShadow:'0 0 30px rgba(0,212,255,0.35)' }}>Analysis</span>{' '}Platform
          </h1>

          <p style={{ fontSize:'0.92rem', color:'#6e8fae', lineHeight:1.7,
            maxWidth:500, margin:'0 0 1.8rem' }}>
            Visualize rainfall evolution across districts during Cyclone Amphan.
            Identify flood hotspots and observe rainfall propagation inland.
          </p>

          <div style={{ display:'flex', gap:'0.75rem' }}>
            {stats.map((s,i) => (
              <div key={s.label} className="statc" style={{
                background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(0,212,255,0.15)',
                borderRadius:8, padding:'0.9rem 1.2rem',
                flex:'1 1 0', minWidth:0, backdropFilter:'blur(10px)',
                position:'relative', overflow:'hidden',
                animation:`fadeUp 0.4s ${0.2+i*0.08}s both` }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
                  background:'linear-gradient(90deg,transparent,rgba(0,212,255,0.4),transparent)',
                  backgroundSize:'300px 100%', animation:'shimmer 2.5s infinite' }}/>
                <div className="snum" style={{ fontFamily:'Space Mono,monospace',
                  fontSize:'1.7rem', fontWeight:700, color:'#00d4ff',
                  lineHeight:1, transition:'all 0.3s' }}>{s.num}</div>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.55rem',
                  color:'rgba(74,96,128,0.85)', letterSpacing:'0.12em',
                  textTransform:'uppercase', marginTop:'0.3rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ animation:'fadeUp 0.6s 0.3s both' }}>
          <RadarViz size={220} />
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ position:'relative', zIndex:1, flex:1,
        display:'grid', gridTemplateColumns:'1fr', justifyItems:'center', gap:'1.5rem',
        padding:'2rem 3.5rem 3rem', maxWidth:1100, margin:'0 auto', width:'100%',
        boxSizing:'border-box', animation:'fadeUp 0.5s 0.5s both' }}>

        {/* Dataset card */}
        <div style={{ width:'100%', maxWidth:'1000px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.2rem' }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.58rem',
              color:'rgba(74,96,128,0.75)', letterSpacing:'0.16em', textTransform:'uppercase' }}>Cyclones</div>
            <div style={{ flex:1, height:1, background:'rgba(0,212,255,0.1)' }}/>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.52rem',
              color:'rgba(0,212,255,0.35)', letterSpacing:'0.1em' }}>1 STORM · 2020 SEASON</div>
          </div>

          <div className="hcard" onClick={() => navigate('/map/amphan')} style={{
            background:'rgba(255,255,255,0.025)', border:'1px solid rgba(0,212,255,0.18)',
            borderRadius:14, overflow:'hidden', cursor:'pointer',
            transition:'all 0.25s ease', backdropFilter:'blur(16px)' }}>

            {/* Image strip */}
            <div style={{ position:'relative', height:175, overflow:'hidden' }}>
              <img src="https://images.unsplash.com/photo-1527482937786-6608f6e14c15?w=1000&q=80"
                alt="Cyclone satellite"
                style={{ width:'100%', height:'100%', objectFit:'cover',
                  filter:'saturate(0.25) brightness(0.45)' }}/>
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(135deg,rgba(0,20,50,0.6),rgba(0,212,255,0.05))' }}/>
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(to bottom, transparent 30%, rgba(4,13,26,0.95))' }}/>
              <div style={{ position:'absolute', top:12, left:14, display:'flex', gap:'0.5rem' }}>
                <span style={{ background:'rgba(0,212,255,0.15)', border:'1px solid rgba(0,212,255,0.35)',
                  borderRadius:4, padding:'2px 9px', fontFamily:'Space Mono,monospace',
                  fontSize:'0.54rem', color:'#00d4ff', letterSpacing:'0.08em' }}>SUPER CYCLONIC STORM</span>
                <span style={{ background:'rgba(255,80,80,0.12)', border:'1px solid rgba(255,80,80,0.3)',
                  borderRadius:4, padding:'2px 9px', fontFamily:'Space Mono,monospace',
                  fontSize:'0.54rem', color:'#ff6060', letterSpacing:'0.08em' }}>CAT-5 EQUIV.</span>
              </div>
              <div style={{ position:'absolute', bottom:10, right:14,
                fontFamily:'Space Mono,monospace', fontSize:'0.52rem',
                color:'rgba(0,212,255,0.4)', letterSpacing:'0.08em' }}>21.65°N, 88.3°E</div>
            </div>

            {/* Body */}
            <div style={{ padding:'1.3rem 1.6rem 0' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.62rem',
                    color:'#00d4ff', marginBottom:'0.3rem' }}>🌀 2020</div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700,
                    fontSize:'1.5rem', color:'#e8f0ff' }}>Cyclone Amphan</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.52rem',
                    color:'rgba(74,96,128,0.7)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Landfall</div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.78rem',
                    color:'#c8dff5', marginTop:2 }}>20 May 2020</div>
                </div>
              </div>

              {/* 6-col meta strip */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)',
                marginTop:'1.2rem', border:'1px solid rgba(0,212,255,0.1)',
                borderRadius:8, overflow:'hidden' }}>
                {metaItems.map((m,i) => (
                  <div key={m.label} className="metarow-item" style={{
                    padding:'0.7rem 0.5rem',
                    background: i%2===0 ? 'rgba(0,212,255,0.025)' : 'transparent' }}>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.46rem',
                      color:'rgba(74,96,128,0.7)', letterSpacing:'0.1em',
                      textTransform:'uppercase', marginBottom:3 }}>{m.label}</div>
                    <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.66rem',
                      color:'#b8d5f0', fontWeight:700 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'1rem 0 1.3rem', marginTop:'0.5rem',
                borderTop:'1px solid rgba(0,212,255,0.08)' }}>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.62rem',
                  color:'#00d4ff', letterSpacing:'0.08em' }}>EXPLORE →</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}