import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCycloneAnalysis, getComparison } from '../services/api.js'
import { RainfallTimeline, TopDistrictsBar, CycloneComparisonChart, AnomalyChart } from '../components/Charts.jsx'

const CYCLONE_META = {
  amphan: { name: 'Cyclone Amphan', color: '#00d4ff', year: 2020 },
  yaas: { name: 'Cyclone Yaas', color: '#f59e0b', year: 2021 },
  remal: { name: 'Cyclone Remal', color: '#ef4444', year: 2024 },
}

function StatCard({ label, value, unit, color = '#00d4ff' }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '1.2rem',
      flex: 1,
      minWidth: '140px',
    }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.6rem', color }}>
        {value}
        {unit && <span style={{ fontSize: '0.75rem', color: '#4a6080', marginLeft: '4px' }}>{unit}</span>}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '1.5rem',
    }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function AnalysisDashboard() {
  const { cyclone } = useParams()
  const navigate = useNavigate()
  const meta = CYCLONE_META[cyclone] || { name: cyclone, color: '#00d4ff', year: '' }

  const [analysis, setAnalysis] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getCycloneAnalysis(cyclone),
      getComparison(),
    ])
      .then(([a, c]) => {
        setAnalysis(a)
        setComparison(c)
      })
      .catch(e => setError('Backend not available'))
      .finally(() => setLoading(false))
  }, [cyclone])

  if (loading) return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8ba4cc', fontFamily: 'Space Mono, monospace', fontSize: '0.8rem' }}>
      Loading analysis...
    </div>
  )

  if (error || !analysis) return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ color: '#ef4444', fontFamily: 'Space Mono, monospace', fontSize: '0.8rem' }}>⚠ {error || 'No analysis data'}</div>
      <div style={{ color: '#4a6080', fontSize: '0.7rem', fontFamily: 'Space Mono, monospace' }}>
        Start backend: <span style={{ color: '#00d4ff' }}>cd backend && uvicorn main:app --reload</span>
      </div>
    </div>
  )

  // Prepare chart data
  const timelineData = analysis.dates?.map(d => ({
    date: d,
    value: analysis.daily_totals?.[d] || 0,
  })) || []

  const topCumData = (analysis.top_districts_cumulative || []).map(d => ({
    name: d.district?.split(' - ')[1] || d.district,
    cumulative: d.cumulative_rainfall,
  }))

  const topMaxData = (analysis.top_districts_max_daily || []).map(d => ({
    name: d.district?.split(' - ')[1] || d.district,
    value: d.max_daily_rainfall,
  }))

  const spreadData = analysis.dates?.map(d => ({
    date: d,
    value: analysis.daily_spread?.[d] || 0,
  })) || []

  // Comparison bar data
  const compData = comparison?.cyclones?.map(name => ({
    cyclone: name,
    value: comparison.comparison[name]?.mean_district_cumulative || 0,
  })) || []

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-primary)', padding: '0' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #1a2a42',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button onClick={() => navigate(`/map/${cyclone}`)} style={{ background: 'transparent', border: 'none', color: '#4a6080', cursor: 'pointer', fontFamily: 'Space Mono, monospace', fontSize: '0.7rem' }}>
          ← MAP
        </button>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: meta.color }}>
          {meta.name}
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', color: '#4a6080' }}>
          RAINFALL ANALYSIS DASHBOARD
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Summary stats */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard label="Total Districts" value={analysis.total_districts} color={meta.color} />
          <StatCard label="Days Analyzed" value={analysis.dates?.length || 0} color={meta.color} />
          <StatCard label="High Risk Districts" value={analysis.flood_hotspots?.high_risk_count || 0} color="#ef4444" />
          <StatCard label="Med Risk Districts" value={analysis.flood_hotspots?.medium_risk_count || 0} color="#f59e0b" />
        </div>

        {/* Charts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <Section title="Daily Total Rainfall (All Districts)">
            <RainfallTimeline data={timelineData} color={meta.color} />
          </Section>

          <Section title="Districts with Significant Rainfall (>20mm)">
            <RainfallTimeline data={spreadData} color="#f59e0b" />
          </Section>

          <Section title="Top 10 Districts — Cumulative Rainfall">
            <TopDistrictsBar data={topCumData} color={meta.color} valueKey="cumulative" />
          </Section>

          <Section title="Top 10 Districts — Max Single-Day Rainfall">
            <TopDistrictsBar data={topMaxData} color="#ef4444" valueKey="value" />
          </Section>
        </div>

        {/* Flood hotspots */}
        {analysis.flood_hotspots?.high_risk_districts?.length > 0 && (
          <Section title="⚠ High Risk Flood Hotspots">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {analysis.flood_hotspots.high_risk_districts.map(d => (
                <span key={d} style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '4px',
                  padding: '3px 10px',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.65rem',
                  color: '#ef4444',
                }}>
                  {d}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* State rainfall */}
        {analysis.state_rainfall && (
          <Section title="State-Level Rainfall Summary">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem' }}>
              {Object.entries(analysis.state_rainfall)
                .sort((a, b) => b[1].mean_cumulative - a[1].mean_cumulative)
                .slice(0, 12)
                .map(([state, data]) => (
                  <div key={state} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.8rem',
                  }}>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#8ba4cc', marginBottom: '0.4rem' }}>
                      {state}
                    </div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: meta.color }}>
                      {data.mean_cumulative?.toFixed(0)}
                      <span style={{ fontSize: '0.65rem', color: '#4a6080', marginLeft: '3px' }}>mm avg</span>
                    </div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080' }}>
                      {data.district_count} districts
                    </div>
                  </div>
                ))
              }
            </div>
          </Section>
        )}

        {/* Inter-cyclone comparison */}
        {comparison && compData.length > 1 && (
          <Section title="Inter-Cyclone Comparison — Mean District Cumulative Rainfall">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <CycloneComparisonChart
                data={compData}
                title="Mean Cumulative Rainfall (mm)"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {comparison.cyclones?.map(name => {
                  const c = comparison.comparison[name]
                  const colors = { amphan: '#00d4ff', yaas: '#f59e0b', remal: '#ef4444' }
                  if (!c) return null
                  return (
                    <div key={name} style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${colors[name]}30`,
                      borderRadius: '8px',
                      padding: '0.8rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: colors[name], textTransform: 'capitalize' }}>
                          {name}
                        </div>
                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080', marginTop: '2px' }}>
                          Max: {c.max_daily_rainfall?.toFixed(0)}mm · {c.high_risk_districts} high-risk districts
                        </div>
                      </div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: colors[name] }}>
                        {c.mean_district_cumulative?.toFixed(0)}<span style={{ fontSize: '0.65rem', color: '#4a6080', marginLeft: '2px' }}>mm</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
