import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCyclones } from '../services/api.js'

const styles = {
  page: {
    minHeight: 'calc(100vh - 56px)',
    background: 'var(--bg-primary)',
    overflow: 'hidden',
    position: 'relative',
  },
  hero: {
    padding: '5rem 3rem 3rem',
    maxWidth: '900px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  eyebrow: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '0.68rem',
    color: '#00d4ff',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  h1: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: 'clamp(2.2rem, 5vw, 4rem)',
    lineHeight: 1.1,
    color: '#e8f0ff',
    marginBottom: '1.5rem',
  },
  accent: { color: '#00d4ff' },
  desc: {
    fontSize: '1.05rem',
    color: '#8ba4cc',
    lineHeight: 1.7,
    maxWidth: '600px',
    marginBottom: '3rem',
  },
  statsRow: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '4rem',
    flexWrap: 'wrap',
  },
  stat: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.2rem 1.8rem',
    minWidth: '150px',
  },
  statNum: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '2rem',
    fontWeight: 700,
    color: '#00d4ff',
  },
  statLabel: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '0.65rem',
    color: '#4a6080',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: '0.3rem',
  },
  section: {
    padding: '0 3rem 5rem',
    maxWidth: '900px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  sectionTitle: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '0.68rem',
    color: '#4a6080',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '0.5rem',
  },
  cycloneGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.2rem',
  },
  cycloneCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
    overflow: 'hidden',
  },
  cycloneName: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '1.3rem',
    color: '#e8f0ff',
    marginBottom: '0.3rem',
  },
  cycloneYear: {
    fontFamily: 'Space Mono, monospace',
    fontSize: '0.7rem',
    color: '#00d4ff',
    marginBottom: '0.8rem',
  },
  cycloneMeta: {
    fontSize: '0.82rem',
    color: '#8ba4cc',
    lineHeight: 1.6,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontFamily: 'Space Mono, monospace',
    fontSize: '0.6rem',
    color: '#00d4ff',
    letterSpacing: '0.05em',
    marginTop: '0.8rem',
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
}

const CYCLONE_META = {
  amphan: { emoji: '🌀', color: '#00d4ff', category: 'Super Cyclonic Storm' },
  yaas: { emoji: '🌪️', color: '#f59e0b', category: 'Very Severe Cyclonic Storm' },
  remal: { emoji: '⛈️', color: '#ef4444', category: 'Severe Cyclonic Storm' },
}

export default function Home() {
  const [cyclones, setCyclones] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getCyclones().then(d => setCyclones(d.cyclones)).catch(() => {})
  }, [])

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.bg}>
        <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div style={{
          position: 'absolute', top: '10%', right: '-5%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
        }} />
      </div>

      <div style={styles.hero} className="fade-in">
        <div style={styles.eyebrow}>
          <span>◆</span> NASA GPM IMERG · SPATIOTEMPORAL ANALYSIS
        </div>
        <h1 style={styles.h1}>
          Cyclone Rainfall<br />
          <span style={styles.accent}>Propagation</span> Platform
        </h1>
        <p style={styles.desc}>
          Reconstruct how rainfall evolves across Indian districts during major
          cyclone events. Analyze spatiotemporal patterns, identify flood hotspots,
          and watch rainfall propagate inland like a movie.
        </p>
        <div style={styles.statsRow}>
          {[
            { num: '3', label: 'Cyclones' },
            { num: '742', label: 'Districts' },
            { num: '16+', label: 'Days Analyzed' },
            { num: '0.1°', label: 'Spatial Res.' },
          ].map(s => (
            <div key={s.label} style={styles.stat}>
              <div style={styles.statNum}>{s.num}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Available Cyclone Datasets</div>
        <div style={styles.cycloneGrid}>
          {cyclones.length > 0 ? cyclones.map(c => {
            const meta = CYCLONE_META[c.id] || {}
            return (
              <div
                key={c.id}
                style={{ ...styles.cycloneCard, borderColor: c.processed ? meta.color + '40' : 'var(--border)' }}
                onClick={() => navigate(`/map/${c.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)'
                  e.currentTarget.style.borderColor = meta.color || '#00d4ff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-card)'
                  e.currentTarget.style.borderColor = c.processed ? (meta.color + '40') : 'var(--border)'
                }}
              >
                <div style={{ ...styles.cycloneYear, color: meta.color }}>
                  {meta.emoji} {c.year}
                </div>
                <div style={styles.cycloneName}>{c.name}</div>
                <div style={styles.cycloneMeta}>
                  <div>{c.landfall_location}</div>
                  <div style={{ color: '#4a6080', marginTop: '0.3rem', fontSize: '0.75rem' }}>
                    Landfall: {c.landfall_date}
                  </div>
                </div>
                <div style={{ ...styles.badge, background: c.processed ? 'rgba(0,212,255,0.1)' : 'rgba(239,68,68,0.1)', borderColor: c.processed ? 'rgba(0,212,255,0.3)' : 'rgba(239,68,68,0.3)', color: c.processed ? '#00d4ff' : '#ef4444' }}>
                  {c.processed ? '● PROCESSED' : '○ NEEDS DATA'}
                </div>
              </div>
            )
          }) : (
            // Default cards when API unavailable
            ['amphan', 'yaas', 'remal'].map(id => {
              const meta = CYCLONE_META[id]
              const names = { amphan: 'Cyclone Amphan', yaas: 'Cyclone Yaas', remal: 'Cyclone Remal' }
              return (
                <div
                  key={id}
                  style={{ ...styles.cycloneCard, borderColor: meta.color + '40' }}
                  onClick={() => navigate(`/map/${id}`)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = meta.color }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = meta.color + '40' }}
                >
                  <div style={{ ...styles.cycloneYear, color: meta.color }}>{meta.emoji}</div>
                  <div style={styles.cycloneName}>{names[id]}</div>
                  <div style={styles.cycloneMeta}>{meta.category}</div>
                  <div style={{ ...styles.badge, background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                    ○ START BACKEND
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
