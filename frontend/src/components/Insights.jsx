import React, { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function flattenInsights(data) {
  const rows = []
  for (const [district, dates] of Object.entries(data)) {
    for (const [date, metrics] of Object.entries(dates)) {
      rows.push({ district, date, ...metrics })
    }
  }
  return rows.sort((a, b) => b.ml_severity_score - a.ml_severity_score)
}

function severityColor(score) {
  if (score >= 0.8) return '#ef4444'
  if (score >= 0.6) return '#f97316'
  if (score >= 0.4) return '#f59e0b'
  return '#00d4ff'
}

const mono = 'Space Mono, monospace'

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(8,12,20,0.97)',
    border: '1px solid #1a2a42',
    borderRadius: '6px',
    fontFamily: mono,
    fontSize: '0.65rem',
    color: '#e8f0ff',
  },
  labelStyle: { color: '#8ba4cc' },
}

const axisStyle = {
  tick: { fontFamily: mono, fontSize: '0.55rem', fill: '#4a6080' },
  stroke: '#1a2a42',
}

/* ── Stat Card ── */
function StatCard({ label, value, unit, color = '#00d4ff' }) {
  return (
    <div style={{
      background: 'rgba(8,12,20,0.95)',
      border: '1px solid #1a2a42',
      borderRadius: '10px',
      padding: '1.2rem 1.4rem',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
      }} />
      <div style={{
        fontFamily: mono, fontSize: '0.52rem', color: '#4a6080',
        letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem'
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.7rem', lineHeight: 1, color }}>
        {value}
        {unit && <span style={{ fontSize: '0.65rem', color: '#4a6080', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
}

/* ── Section wrapper ── */
function Section({ title, dot = '#00d4ff', children }) {
  return (
    <div style={{
      background: 'rgba(8,12,20,0.95)',
      border: '1px solid #1a2a42',
      borderRadius: '10px',
      padding: '1.4rem',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        fontFamily: mono, fontSize: '0.58rem', color: '#4a6080',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        marginBottom: '1.2rem', paddingBottom: '0.6rem',
        borderBottom: '1px solid #1a2a42',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
        {title}
      </div>
      {children}
    </div>
  )
}

/* ── Bar Chart ── */
function TopSevereChart({ flatData }) {
  const chartData = useMemo(() => {
    const districtMap = {}
    flatData.filter(r => r.is_ml_anomaly).forEach(r => {
      if (!districtMap[r.district] || r.ml_severity_score > districtMap[r.district].score) {
        districtMap[r.district] = { name: r.district, score: r.ml_severity_score }
      }
    })
    return Object.values(districtMap).sort((a, b) => b.score - a.score).slice(0, 15)
  }, [flatData])

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2a42" horizontal={false} />
        <XAxis type="number" domain={[0, 1]} {...axisStyle} tickFormatter={v => v.toFixed(1)} />
        <YAxis
          type="category" dataKey="name" width={115}
          tick={{ fontFamily: mono, fontSize: '0.52rem', fill: '#8ba4cc' }}
          tickFormatter={v => v.length > 18 ? v.slice(0, 17) + '…' : v}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={v => [v.toFixed(3), 'Severity']}
          labelFormatter={l => `District: ${l}`}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} animationDuration={800}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={severityColor(entry.score)} opacity={1 - i * 0.03} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Anomaly Table ── */
function AnomalyTable({ flatData }) {
  const [sortKey, setSortKey] = useState('ml_severity_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    const base = showAll ? flatData : flatData.filter(r => r.is_ml_anomaly)
    return [...base].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })
  }, [flatData, sortKey, sortAsc, showAll])

  const handleSort = key => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const cols = [
    { key: 'district', label: 'District' },
    { key: 'date', label: 'Date' },
    { key: 'rainfall_mm', label: 'Rainfall' },
    { key: 'spatial_spi', label: 'Spatial SPI' },
    { key: 'consecutive_rainy_days', label: 'Streak' },
    { key: 'ml_severity_score', label: 'Severity' },
    { key: 'is_ml_anomaly', label: 'Status' },
  ]

  const thStyle = active => ({
    textAlign: 'left', padding: '0.65rem 1rem',
    background: 'rgba(5,8,15,0.98)',
    color: active ? '#00d4ff' : '#4a6080',
    fontFamily: mono, fontSize: '0.52rem', letterSpacing: '0.1em',
    textTransform: 'uppercase', borderBottom: '1px solid #1a2a42',
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  })

  const tdStyle = { padding: '0.55rem 1rem', borderBottom: '1px solid #0d1825', color: '#8ba4cc', fontFamily: mono, fontSize: '0.65rem', whiteSpace: 'nowrap' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: mono, fontSize: '0.58rem', color: '#4a6080' }}>
          Showing <strong style={{ color: '#ef4444' }}>{filtered.length}</strong> records
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: showAll ? 'rgba(0,212,255,0.08)' : 'transparent',
            border: '1px solid #1a2a42',
            borderRadius: '4px', padding: '4px 12px',
            fontFamily: mono, fontSize: '0.55rem',
            color: showAll ? '#00d4ff' : '#4a6080',
            cursor: 'pointer', letterSpacing: '0.08em',
          }}
        >
          {showAll ? '● SHOWING ALL' : '○ ANOMALIES ONLY'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto', borderRadius: 6, border: '1px solid #1a2a42' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              {cols.map(c => (
                <th key={c.key} style={thStyle(sortKey === c.key)} onClick={() => handleSort(c.key)}>
                  {c.label}{sortKey === c.key && <span style={{ marginLeft: 4 }}>{sortAsc ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={`${row.district}-${row.date}-${i}`} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ ...tdStyle, color: '#e8f0ff', fontWeight: 600 }}>{row.district}</td>
                <td style={tdStyle}>{row.date}</td>
                <td style={{ ...tdStyle, color: row.rainfall_mm > 50 ? '#ef4444' : row.rainfall_mm > 20 ? '#f97316' : '#8ba4cc' }}>
                  {row.rainfall_mm.toFixed(1)} mm
                </td>
                <td style={{ ...tdStyle, color: row.spatial_spi > 2 ? '#ef4444' : row.spatial_spi > 1 ? '#f59e0b' : '#8ba4cc' }}>
                  {row.spatial_spi >= 0 ? '+' : ''}{row.spatial_spi.toFixed(2)} σ
                </td>
                <td style={tdStyle}>{row.consecutive_rainy_days} days</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: severityColor(row.ml_severity_score), fontWeight: 700, minWidth: 32 }}>
                      {row.ml_severity_score.toFixed(2)}
                    </span>
                    <div style={{ flex: 1, height: 4, background: '#1a2a42', borderRadius: 2, overflow: 'hidden', minWidth: 60 }}>
                      <div style={{ height: '100%', width: `${row.ml_severity_score * 100}%`, background: severityColor(row.ml_severity_score), borderRadius: 2 }} />
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    fontFamily: mono, fontSize: '0.52rem', letterSpacing: '0.06em',
                    padding: '2px 8px', borderRadius: 3, fontWeight: 700,
                    color: row.is_ml_anomaly ? '#ef4444' : '#00d4ff',
                    background: row.is_ml_anomaly ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,255,0.08)',
                    border: `1px solid ${row.is_ml_anomaly ? 'rgba(239,68,68,0.3)' : 'rgba(0,212,255,0.2)'}`,
                  }}>
                    {row.is_ml_anomaly ? 'ANOMALY' : 'NORMAL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function Insights({ cyclone, onBack }) {
  const [flatData, setFlatData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/insights/${cyclone}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then(data => { if (data.error) throw new Error(data.error); setFlatData(flattenInsights(data)) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [cyclone])

  const stats = useMemo(() => {
    if (!flatData.length) return {}
    const anomalies = flatData.filter(r => r.is_ml_anomaly)
    return {
      total: anomalies.length,
      records: flatData.length,
      pct: ((anomalies.length / flatData.length) * 100).toFixed(1),
      maxSPI: Math.max(...flatData.map(r => r.spatial_spi)).toFixed(2),
      maxStreak: Math.max(...flatData.map(r => r.consecutive_rainy_days)),
    }
  }, [flatData])

  const pageStyle = {
    minHeight: '100vh',
    background: 'rgba(5,8,15,1)',
    fontFamily: 'Space Mono, monospace',
  }

  if (loading) return (
    <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid #1a2a42', borderTopColor: '#00d4ff',
          animation: 'spin 1s linear infinite', margin: '0 auto 1rem'
        }} />
        <div style={{ fontFamily: mono, fontSize: '0.65rem', color: '#4a6080', letterSpacing: '0.1em' }}>
          LOADING ML INSIGHTS...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠</div>
        <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ef4444' }}>{error}</div>
        <button onClick={onBack} style={{
          marginTop: '1rem', background: 'rgba(8,12,20,0.95)',
          border: '1px solid #1a2a42', borderRadius: 6,
          padding: '6px 16px', color: '#8ba4cc',
          fontFamily: mono, fontSize: '0.65rem', cursor: 'pointer'
        }}>← BACK</button>
      </div>
    </div>
  )

  return (
    <div style={pageStyle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Body */}
      <div style={{ padding: '1.5rem', maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

        {/* Stat Cards */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <StatCard label="ML Anomalies Detected" value={stats.total} unit={`/ ${stats.records}`} color="#ef4444" />
          <StatCard label="Anomaly Rate" value={`${stats.pct}%`} color="#f97316" />
          <StatCard label="Peak Spatial SPI" value={stats.maxSPI} unit="σ" color="#00d4ff" />
          <StatCard label="Max Rain Streak" value={stats.maxStreak} unit="days" color="#00b8a9" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
          <Section title="Top Severe Anomalous Districts" dot="#ef4444">
            <TopSevereChart flatData={flatData} />
          </Section>
        </div>

        {/* Table */}
        <Section title="District Anomaly Records" dot="#f59e0b">
          <AnomalyTable flatData={flatData} />
        </Section>

      </div>
    </div>
  )
}
