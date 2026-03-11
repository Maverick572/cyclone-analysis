import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCyclones } from '../services/api.js'

const CYCLONE_META = {
  amphan: {
    color: '#00d4ff',
    emoji: '🌀',
    desc: 'Super Cyclonic Storm Amphan made landfall on 20 May 2020 along the West Bengal coast, causing catastrophic flooding across multiple districts.',
    peak_intensity: '260 km/h',
    dates_window: '14–18 May 2020',
  },
  yaas: {
    color: '#f59e0b',
    emoji: '🌪️',
    desc: 'Cyclone Yaas struck the Odisha coast near Balasore on 26 May 2021, bringing extremely heavy rainfall to coastal and inland districts.',
    peak_intensity: '185 km/h',
    dates_window: '23–26 May 2021',
  },
  remal: {
    color: '#ef4444',
    emoji: '⛈️',
    desc: 'Cyclone Remal made landfall on the West Bengal/Bangladesh coast on 26 May 2024, producing significant multi-day rainfall accumulation.',
    peak_intensity: '135 km/h',
    dates_window: '24–27 May 2024',
  },
}

export default function CyclonePage() {
  const [cyclones, setCyclones] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getCyclones()
      .then(d => setCyclones(d.cyclones))
      .catch(() => setCyclones([]))
      .finally(() => setLoading(false))
  }, [])

  const cardList = cyclones.length > 0 ? cyclones : Object.keys(CYCLONE_META).map(id => ({
    id,
    name: `Cyclone ${id.charAt(0).toUpperCase() + id.slice(1)}`,
    processed: false,
  }))

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', padding: '3rem', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', color: '#4a6080', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
          SELECT CYCLONE DATASET
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: '#e8f0ff', marginBottom: '2.5rem' }}>
          Bay of Bengal Cyclones
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {cardList.map(c => {
            const meta = CYCLONE_META[c.id] || { color: '#00d4ff', emoji: '🌀', desc: '', peak_intensity: '-', dates_window: '-' }
            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${meta.color}30`,
                  borderRadius: '12px',
                  padding: '1.8rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '1.5rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = meta.color + '30'; e.currentTarget.style.background = 'var(--bg-card)' }}
                onClick={() => navigate(`/map/${c.id}`)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{meta.emoji}</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#e8f0ff' }}>{c.name}</span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: meta.color, background: meta.color + '15', border: `1px solid ${meta.color}40`, borderRadius: '4px', padding: '2px 8px' }}>
                      {c.processed ? '● READY' : '○ ADD DATA'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#8ba4cc', lineHeight: 1.6, marginBottom: '0.8rem', maxWidth: '500px' }}>
                    {meta.desc}
                  </p>
                  <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', color: '#4a6080' }}>
                    <span>WINDOW: <span style={{ color: '#8ba4cc' }}>{meta.dates_window}</span></span>
                    <span>PEAK: <span style={{ color: meta.color }}>{meta.peak_intensity}</span></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button
                    style={{
                      background: 'transparent',
                      border: `1px solid ${meta.color}60`,
                      borderRadius: '6px',
                      padding: '8px 14px',
                      color: meta.color,
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                    }}
                    onClick={e => { e.stopPropagation(); navigate(`/map/${c.id}`) }}
                  >
                    MAP →
                  </button>
                  <button
                    style={{
                      background: meta.color + '20',
                      border: `1px solid ${meta.color}60`,
                      borderRadius: '6px',
                      padding: '8px 14px',
                      color: meta.color,
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                    }}
                    onClick={e => { e.stopPropagation(); navigate(`/analysis/${c.id}`) }}
                  >
                    ANALYSIS →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
