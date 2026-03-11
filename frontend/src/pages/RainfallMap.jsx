import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCycloneDates, getRainfallForDate, getDistricts, getGraphState } from '../services/api.js'
import DistrictMap from '../components/DistrictMap.jsx'
import TimelineSlider from '../components/TimelineSlider.jsx'
import FloodGraph from '../components/FloodGraph.jsx'
import GraphLegend from '../components/GraphLegend.jsx'
import ImpactPanel from '../components/ImpactPanel.jsx'

const CYCLONE_META = {
  amphan: { name: 'Cyclone Amphan', color: '#00d4ff', year: 2020 },
  yaas: { name: 'Cyclone Yaas', color: '#f59e0b', year: 2021 },
  remal: { name: 'Cyclone Remal', color: '#ef4444', year: 2024 },
}

function RainfallLegend() {
  const items = [
    { range: '< 1 mm', color: '#fef9c3' },
    { range: '1–5 mm', color: '#fed7aa' },
    { range: '5–20 mm', color: '#fb923c' },
    { range: '20–50 mm', color: '#dc2626' },
    { range: '50–100 mm', color: '#991b1b' },
    { range: '> 100 mm', color: '#7f1d1d' },
  ]
  return (
    <div style={{ background: 'rgba(5,8,15,0.92)', border: '1px solid #1a2a42', borderRadius: '8px', padding: '0.8rem 1rem' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#4a6080', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
        RAINFALL mm/day
      </div>
      {items.map(item => (
        <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#8ba4cc' }}>{item.range}</span>
        </div>
      ))}
    </div>
  )
}

function ViewToggle({ view, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: '2px', background: '#0b1120', border: '1px solid #1a2a42', borderRadius: '7px', padding: '3px' }}>
      {['MAP', 'GRAPH'].map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.08em',
          padding: '5px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer',
          background: view === v ? color + '25' : 'transparent',
          color: view === v ? color : '#4a6080',
          borderBottom: view === v ? `2px solid ${color}` : '2px solid transparent',
          transition: 'all 0.15s',
        }}>
          {v === 'MAP' ? '⬡ MAP' : '◉ GRAPH'}
        </button>
      ))}
    </div>
  )
}

export default function RainfallMap() {
  const { cyclone } = useParams()
  const navigate = useNavigate()
  const meta = CYCLONE_META[cyclone] || { name: cyclone, color: '#00d4ff', year: '' }

  const [view, setView] = useState('MAP')
  const [dates, setDates] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rainfallCache, setRainfallCache] = useState({})
  const [geojson, setGeojson] = useState(null)
  const [currentRainfall, setCurrentRainfall] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Map-view state
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [districtInfo, setDistrictInfo] = useState(null)

  // Graph-view state
  const [graphNodes, setGraphNodes] = useState([])
  const [graphEdges, setGraphEdges] = useState([])
  const [graphStats, setGraphStats] = useState(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const graphCacheRef = useRef({})

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getCycloneDates(cyclone).catch(() => ({ dates: [] })),
      getDistricts().catch(() => null),
    ]).then(([dateData, geoData]) => {
      const d = dateData.dates || []
      setDates(d)
      setGeojson(geoData)
      setLoading(false)
      if (d.length > 0) setCurrentIndex(0)
    }).catch(() => {
      setError('Could not connect to backend. Start the FastAPI server.')
      setLoading(false)
    })
  }, [cyclone])

  useEffect(() => {
    if (!dates.length) return
    const date = dates[currentIndex]
    if (rainfallCache[date]) { setCurrentRainfall(rainfallCache[date]); return }
    getRainfallForDate(cyclone, date).then(d => {
      const rf = d.rainfall || {}
      setRainfallCache(prev => ({ ...prev, [date]: rf }))
      setCurrentRainfall(rf)
    }).catch(() => {})
  }, [cyclone, dates, currentIndex])

  useEffect(() => {
    if (view !== 'GRAPH' || !dates.length) return
    const date = dates[currentIndex]
    const cacheKey = `${cyclone}::${date}`
    if (graphCacheRef.current[cacheKey]) {
      const c = graphCacheRef.current[cacheKey]
      setGraphNodes(c.nodes); setGraphEdges(c.edges); setGraphStats(c.stats)
      return
    }
    setGraphLoading(true)
    getGraphState(cyclone, date).then(data => {
      graphCacheRef.current[cacheKey] = data
      setGraphNodes(data.nodes || [])
      setGraphEdges(data.edges || [])
      setGraphStats(data.stats || null)
      setGraphLoading(false)
    }).catch(() => setGraphLoading(false))
  }, [view, cyclone, dates, currentIndex])

  const handleDistrictClick = useCallback((did, mm) => {
    setSelectedDistrict(did); setDistrictInfo({ district: did, rainfall: mm })
  }, [])

  const handleNodeClick = useCallback((node) => { setSelectedNode(node) }, [])
  const handleViewChange = (v) => { setView(v); setSelectedNode(null) }

  if (loading) return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8ba4cc', fontFamily: 'Space Mono, monospace', fontSize: '0.8rem' }}>
      Loading data…
    </div>
  )

  const currentDate = dates[currentIndex]

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

      {/* Top bar */}
      <div style={{ padding: '0.6rem 1.5rem', borderBottom: '1px solid #1a2a42', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <button onClick={() => navigate('/cyclones')} style={{ background: 'transparent', border: 'none', color: '#4a6080', cursor: 'pointer', fontFamily: 'Space Mono, monospace', fontSize: '0.7rem' }}>
          ← BACK
        </button>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: meta.color }}>{meta.name}</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: '#4a6080' }}>
          {view === 'MAP' ? `RAINFALL MAP · ${meta.year}` : `FLOOD GRAPH · ${meta.year}`}
        </div>
        <ViewToggle view={view} onChange={handleViewChange} color={meta.color} />
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate(`/analysis/${cyclone}`)} style={{ background: 'transparent', border: `1px solid ${meta.color}40`, borderRadius: '6px', padding: '5px 12px', color: meta.color, fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', cursor: 'pointer' }}>
          ANALYSIS →
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Centre */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* ── MAP VIEW ── */}
          {view === 'MAP' && (
            <>
              {geojson ? (
                <DistrictMap geojson={geojson} rainfallData={currentRainfall} selectedDistrict={selectedDistrict} onDistrictClick={handleDistrictClick} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: '#4a6080', fontFamily: 'Space Mono, monospace', fontSize: '0.75rem' }}>
                  {error ? (
                    <>
                      <div style={{ color: '#ef4444' }}>⚠ {error}</div>
                      <div style={{ color: '#4a6080', fontSize: '0.65rem', textAlign: 'center', maxWidth: '300px' }}>
                        Run: <span style={{ color: '#00d4ff' }}>cd backend && uvicorn main:app --reload</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>Place gadm41_IND_2.json in backend/</div>
                      <div style={{ color: '#4a6080', fontSize: '0.65rem' }}>District boundaries required for map</div>
                    </>
                  )}
                </div>
              )}
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 999 }}>
                <RainfallLegend />
              </div>
              {districtInfo && (
                <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 999, background: 'rgba(5,8,15,0.95)', border: '1px solid #1a2a42', borderRadius: '8px', padding: '0.8rem 1.2rem', fontFamily: 'Space Mono, monospace' }}>
                  <div style={{ fontSize: '0.65rem', color: '#4a6080', marginBottom: '3px' }}>SELECTED DISTRICT</div>
                  <div style={{ fontSize: '0.85rem', color: '#e8f0ff', marginBottom: '4px' }}>{districtInfo.district}</div>
                  <div style={{ fontSize: '1.1rem', color: meta.color }}>
                    {districtInfo.rainfall?.toFixed(1)} <span style={{ fontSize: '0.65rem', color: '#4a6080' }}>mm/day</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── GRAPH VIEW ── */}
          {view === 'GRAPH' && (
            <>
              {graphLoading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', color: '#4a6080', zIndex: 10 }}>
                  Computing graph…
                </div>
              )}
              <FloodGraph nodes={graphNodes} edges={graphEdges} onNodeClick={handleNodeClick} selectedNode={selectedNode?.id} />
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 999 }}>
                <GraphLegend stats={graphStats} />
              </div>
              {!graphLoading && graphNodes.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'Space Mono, monospace', fontSize: '0.72rem', color: '#2a3a52', textAlign: 'center', lineHeight: 1.8 }}>
                  No districts exceed 10 mm/day<br />on this date
                </div>
              )}
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width: '300px', borderLeft: '1px solid #1a2a42', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #1a2a42', flexShrink: 0 }}>
            <TimelineSlider dates={dates} currentIndex={currentIndex} onIndexChange={setCurrentIndex} />
          </div>

          {view === 'MAP' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#4a6080', letterSpacing: '0.1em', marginBottom: '0.8rem' }}>
                  TOP RAINFALL · {currentDate || '—'}
                </div>
                {Object.entries(currentRainfall).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([did, mm]) => (
                  <div key={did} onClick={() => handleDistrictClick(did, mm)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #0f1929', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.7rem', color: '#8ba4cc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {did.split(' - ')[1] || did}
                    </span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem', color: mm > 100 ? '#7f1d1d' : mm > 50 ? '#991b1b' : mm > 20 ? '#dc2626' : mm > 5 ? '#fb923c' : '#fed7aa', marginLeft: '0.5rem', flexShrink: 0 }}>
                      {mm.toFixed(0)}mm
                    </span>
                  </div>
                ))}
                {Object.keys(currentRainfall).length === 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#4a6080', textAlign: 'center', padding: '1rem 0' }}>No data loaded</div>
                )}
              </div>
            </div>
          )}

          {view === 'GRAPH' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ImpactPanel node={selectedNode} cycloneName={cyclone} date={currentDate} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}