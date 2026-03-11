import React, { useEffect, useRef } from 'react'
import L from 'leaflet'

const NODE_R = [4, 7, 10]

const nodeColor = (n) => {
  if (n.flooded)                    return '#ef4444'
  if (n.risk_level === 'HIGH')      return '#f97316'
  if (n.risk_level === 'MODERATE')  return '#f59e0b'
  return '#00d4ff'
}

// ─── Pure paint — uses latLngToLayerPoint so coords match the SVG layer origin,
//     then we offset by map.getPixelOrigin() to get canvas-relative pixels.
function paint(S) {
  const { map, canvas, nodes, edges, selectedNode } = S
  if (!map || !canvas) return

  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')

  // Always reset transform + clear
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  if (!nodes?.length) return

  // ── Coordinate projection ──────────────────────────────────────────────
  // latLngToLayerPoint gives pixel coords in Leaflet's layer CRS.
  // The canvas top-left aligns with the map container top-left.
  // latLngToContainerPoint = layerPoint - pixelOrigin + mapOffset
  // The simplest correct approach: use latLngToContainerPoint directly.
  // But we must call it AFTER invalidateSize so the map knows its real size.
  const toXY = (lon, lat) => {
    const pt = map.latLngToContainerPoint(L.latLng(lat, lon))
    return [pt.x, pt.y]
  }

  const pos = {}
  for (const n of nodes) {
    if (n.lon != null && n.lat != null) {
      pos[n.id] = toXY(n.lon, n.lat)
    }
  }

  const W = canvas.width / dpr
  const H = canvas.height / dpr

  // ── Edges ──────────────────────────────────────────────────────────────
  ctx.lineWidth = 1
  for (const e of edges) {
    const src = pos[e.source], tgt = pos[e.target]
    if (!src || !tgt) continue
    // Skip edges whose endpoints are both offscreen (perf + avoids ghost lines)
    if (src[0] < -200 || src[0] > W+200 || src[1] < -200 || src[1] > H+200) continue
    const dx = tgt[0]-src[0], dy = tgt[1]-src[1]
    const dist = Math.hypot(dx, dy)
    if (dist < 3) continue
    const ux = dx/dist, uy = dy/dist
    const tgtR = NODE_R[e.target_size_tier ?? 0]
    const ex = tgt[0] - ux*(tgtR+9)
    const ey = tgt[1] - uy*(tgtR+9)

    ctx.setLineDash([4, 3])
    ctx.strokeStyle = 'rgba(239,68,68,0.5)'
    ctx.beginPath(); ctx.moveTo(src[0], src[1]); ctx.lineTo(ex, ey); ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(239,68,68,0.85)'
    const ang = Math.atan2(uy, ux), as = 7
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex - as*Math.cos(ang-Math.PI/6), ey - as*Math.sin(ang-Math.PI/6))
    ctx.lineTo(ex - as*Math.cos(ang+Math.PI/6), ey - as*Math.sin(ang+Math.PI/6))
    ctx.closePath(); ctx.fill()
  }
  ctx.setLineDash([])

  // ── Nodes ──────────────────────────────────────────────────────────────
  for (const n of nodes) {
    const p = pos[n.id]; if (!p) continue
    const [x, y] = p
    const r = NODE_R[n.size_tier]
    const color = nodeColor(n)

    // Skip if completely offscreen
    if (x < -50 || x > W+50 || y < -50 || y > H+50) continue

    // Glow ring
    if (n.flooded || n.risk_level === 'HIGH' || n.risk_level === 'MODERATE') {
      const gr = r + (n.flooded ? 7 : 5)
      const grd = ctx.createRadialGradient(x, y, r*0.2, x, y, gr)
      grd.addColorStop(0, color + 'bb')
      grd.addColorStop(1, color + '00')
      ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI*2)
      ctx.fillStyle = grd; ctx.fill()
    }

    // Filled circle
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2)
    ctx.fillStyle = color; ctx.fill()

    // Stroke outline for visibility
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2)
    ctx.strokeStyle = color === '#00d4ff' ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 0.5; ctx.stroke(); ctx.lineWidth = 1

    // Selection ring
    if (n.id === selectedNode) {
      ctx.beginPath(); ctx.arc(x, y, r+2.5, 0, Math.PI*2)
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1
    }
  }

  // ── Labels ─────────────────────────────────────────────────────────────
  ctx.font = '6px "Space Mono",monospace'
  ctx.fillStyle = 'rgba(232,240,255,0.85)'
  ctx.textBaseline = 'middle'
  for (const n of nodes) {
    if (n.size_tier < 1) continue
    const p = pos[n.id]; if (!p) continue
    ctx.fillText(n.district, p[0] + NODE_R[n.size_tier] + 2, p[1])
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloodGraph({ nodes, edges, onNodeClick, selectedNode, visible }) {
  const wrapRef   = useRef(null)
  const mapDivRef = useRef(null)

  // Single stable state object — written synchronously each render
  const S = useRef({
    map: null, canvas: null, raf: null,
    nodes: [], edges: [], selectedNode: null,
    onNodeClick: () => {}, visible: false,
  }).current

  S.nodes        = nodes        ?? []
  S.edges        = edges        ?? []
  S.selectedNode = selectedNode
  S.onNodeClick  = onNodeClick
  S.visible      = visible

  // sched is stored ON S so mount-effect callbacks always reach the real function
  S.sched = () => {
    if (S.raf) cancelAnimationFrame(S.raf)
    S.raf = requestAnimationFrame(() => { S.raf = null; paint(S) })
  }

  // ── Mount once ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mapDivRef.current
    if (!el || S.map) return

    const map = L.map(el, {
      center: [22, 83], zoom: 5,
      zoomControl: true, attributionControl: false,
      maxZoom: 18, minZoom: 3,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png').addTo(map)
    S.map = map

    // Canvas lives inside the map div, positioned absolute on top
    const canvas = document.createElement('canvas')
    Object.assign(canvas.style, {
      position: 'absolute', top: '0', left: '0',
      zIndex: '650', pointerEvents: 'auto',
      // Critical: don't let the canvas itself intercept map gestures for pan/zoom
    })
    el.style.position = 'relative'
    el.appendChild(canvas)
    S.canvas = canvas

    const fitCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const W = el.clientWidth, H = el.clientHeight
      if (!W || !H) return
      canvas.width        = Math.round(W * dpr)
      canvas.height       = Math.round(H * dpr)
      canvas.style.width  = W + 'px'
      canvas.style.height = H + 'px'
      S.sched()
    }

    // Wait one frame for the container to have real dimensions
    requestAnimationFrame(() => {
      fitCanvas()
      map.invalidateSize({ animate: false })
      S.sched()
    })

    const ro = new ResizeObserver(fitCanvas)
    ro.observe(el)

    // Pass map pan/zoom through canvas to Leaflet
    // (canvas has pointerEvents:auto for our click/hover, but we
    //  don't block map drag — Leaflet handles it via its own div underneath)
    canvas.addEventListener('click', (ev) => {
      const rect = canvas.getBoundingClientRect()
      const mx = ev.clientX - rect.left, my = ev.clientY - rect.top
      for (const n of S.nodes) {
        if (n.lon == null) continue
        const p = S.map.latLngToContainerPoint(L.latLng(n.lat, n.lon))
        if (Math.hypot(p.x - mx, p.y - my) <= NODE_R[n.size_tier] + 5) {
          S.onNodeClick(n); return
        }
      }
    })

    canvas.addEventListener('mousemove', (ev) => {
      const rect = canvas.getBoundingClientRect()
      const mx = ev.clientX - rect.left, my = ev.clientY - rect.top
      let hit = null
      for (const n of S.nodes) {
        if (n.lon == null) continue
        const p = S.map.latLngToContainerPoint(L.latLng(n.lat, n.lon))
        if (Math.hypot(p.x - mx, p.y - my) <= NODE_R[n.size_tier] + 5) { hit = n; break }
      }
      const tt = wrapRef.current?.querySelector('.fg-tt')
      if (!tt) return
      if (hit) {
        const c = nodeColor(hit)
        tt.style.display = 'block'
        tt.innerHTML = `
          <div style="color:${c};font-weight:bold;margin-bottom:3px">${hit.district}</div>
          <div style="color:#4a6080;font-size:0.58rem;margin-bottom:4px">${hit.state}</div>
          <div>Rain: <span style="color:#00d4ff">${hit.rainfall_mm.toFixed(1)} mm</span></div>
          <div>Risk: <span style="color:${hit.risk_level==='HIGH'?'#f97316':hit.risk_level==='MODERATE'?'#f59e0b':'#8ba4cc'}">${hit.risk_level} (${hit.risk_score.toFixed(2)})</span></div>
          <div>Flooded: <span style="color:${hit.flooded?'#ef4444':'#4a6080'}">${hit.flooded?'YES':'NO'}</span></div>
          ${hit.neighbor_flood_influence>0?`<div style="color:#f59e0b;margin-top:3px">⚠ Nbr +${hit.neighbor_flood_influence.toFixed(2)}</div>`:''}
        `
        const wr = wrapRef.current.getBoundingClientRect()
        tt.style.left = `${ev.clientX - wr.left + 14}px`
        tt.style.top  = `${ev.clientY - wr.top  - 10}px`
      } else {
        tt.style.display = 'none'
      }
    })
    canvas.addEventListener('mouseleave', () => {
      const tt = wrapRef.current?.querySelector('.fg-tt')
      if (tt) tt.style.display = 'none'
    })

    map.on('move zoom zoomend moveend viewreset', () => S.sched())

    return () => {
      ro.disconnect()
      map.remove()
      S.map = null; S.canvas = null
    }
  }, []) // eslint-disable-line

  // ── Runs after every render — unconditional redraw if visible ────────────
  useEffect(() => {
    if (!S.map || !S.canvas || !S.visible) return
    S.map.invalidateSize({ animate: false })
    S.sched()
  })

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
      <div className="fg-tt" style={{
        position: 'absolute', pointerEvents: 'none', display: 'none',
        background: 'rgba(5,8,15,0.97)', border: '1px solid #1a2a42',
        borderRadius: '7px', padding: '0.55rem 0.85rem',
        fontFamily: 'Space Mono, monospace', fontSize: '0.63rem',
        color: '#e8f0ff', zIndex: 9999, maxWidth: '210px', lineHeight: 1.65,
      }} />
    </div>
  )
}