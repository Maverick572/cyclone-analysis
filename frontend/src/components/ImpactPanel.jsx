import React, { useEffect, useState } from 'react'
import { getDistrictRisk } from '../services/api.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama3-8b-8192'

function Metric({ label, value, unit = '', color = '#8ba4cc' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '5px 0', borderBottom: '1px solid #0f1929',
    }}>
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem', color }}>
        {value}{unit && <span style={{ color: '#4a6080', fontSize: '0.58rem', marginLeft: '2px' }}>{unit}</span>}
      </span>
    </div>
  )
}

function RiskBadge({ level }) {
  const colors = { HIGH: '#ef4444', MODERATE: '#f59e0b', LOW: '#8ba4cc' }
  return (
    <span style={{
      fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
      background: (colors[level] || '#8ba4cc') + '20',
      border: `1px solid ${colors[level] || '#8ba4cc'}50`,
      borderRadius: '4px', padding: '2px 8px',
      color: colors[level] || '#8ba4cc',
    }}>
      {level}
    </span>
  )
}

async function fetchGroqInsight(node, riskDetail) {
  const prompt = `You are a flood risk analyst. Given the following district data for a cyclone event, provide a concise 3-paragraph analysis:

District: ${node.district}, ${node.state}
Rainfall today: ${node.rainfall_mm.toFixed(1)} mm/day
Flooded: ${node.flooded ? 'YES' : 'NO'}
Risk Score: ${node.risk_score.toFixed(3)} (${node.risk_level})
Neighbor flood influence: ${node.neighbor_flood_influence.toFixed(3)}
Susceptibility Score: ${riskDetail?.susceptibility_score?.toFixed(3) ?? 'N/A'}
Population Exposed: ${riskDetail?.population?.toLocaleString() ?? 'N/A'}
Fatality Rate: ${((riskDetail?.fatality_rate ?? 0) * 1000).toFixed(3)}‰
Mean Flood Duration: ${riskDetail?.mean_flood_duration?.toFixed(1) ?? 'N/A'} days
Corrected Flooded Area: ${riskDetail?.corrected_percent_flooded_area?.toFixed(1) ?? 'N/A'}%

Paragraph 1: Summarize the current flood risk situation for this district.
Paragraph 2: Explain how rainfall and neighboring flood events may propagate further.
Paragraph 3: Suggest 2-3 specific mitigation actions for local authorities.

Keep each paragraph under 60 words. Be direct and actionable.`

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.4,
    }),
  })
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? 'No insight generated.'
}

export default function ImpactPanel({ node, cycloneName, date }) {
  const [riskDetail, setRiskDetail] = useState(null)
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState(null)

  useEffect(() => {
    if (!node) { setRiskDetail(null); setInsight(null); return }
    setRiskDetail(null)
    setInsight(null)
    setInsightError(null)
    getDistrictRisk(node.id).then(setRiskDetail).catch(() => setRiskDetail({}))
  }, [node?.id])

  useEffect(() => {
    if (!node || !riskDetail) return
    setInsightLoading(true)
    setInsightError(null)
    fetchGroqInsight(node, riskDetail)
      .then(txt => { setInsight(txt); setInsightLoading(false) })
      .catch(e => { setInsightError(e.message); setInsightLoading(false) })
  }, [node?.id, riskDetail])

  if (!node) {
    return (
      <div style={panelStyle}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          IMPACT METRICS
        </div>
        <div style={{ color: '#2a3a52', fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', textAlign: 'center', marginTop: '3rem', lineHeight: 1.8 }}>
          Click a node<br />to view district<br />risk metrics
        </div>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          SELECTED DISTRICT
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: node.flooded ? '#ef4444' : '#e8f0ff', marginBottom: '2px' }}>
          {node.district}
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', marginBottom: '6px' }}>
          {node.state}
        </div>
        <RiskBadge level={node.risk_level} />
      </div>

      {/* Rainfall */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>RAINFALL</div>
        <Metric label="Today" value={node.rainfall_mm.toFixed(1)} unit="mm/day" color="#00d4ff" />
        <Metric label="Flooded" value={node.flooded ? 'YES' : 'NO'} color={node.flooded ? '#ef4444' : '#4a6080'} />
        <Metric label="Nbr Influence" value={`+${node.neighbor_flood_influence.toFixed(2)}`} color={node.neighbor_flood_influence > 0 ? '#f59e0b' : '#4a6080'} />
      </div>

      {/* Risk Scores */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>RISK SCORES</div>
        <Metric label="Risk Score" value={node.risk_score.toFixed(3)} color={node.risk_level === 'HIGH' ? '#ef4444' : node.risk_level === 'MODERATE' ? '#f59e0b' : '#8ba4cc'} />
        <Metric label="Susceptibility" value={node.susceptibility.toFixed(3)} color="#8ba4cc" />
        <Metric label="Fatality Rate" value={(node.fatality_rate * 1000).toFixed(3)} unit="‰" color="#8ba4cc" />
      </div>

      {/* Historical Flood Data */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>HISTORICAL FLOOD DATA</div>
        <Metric label="Flooded Area" value={node.percent_flooded_area.toFixed(1)} unit="%" color="#8ba4cc" />
        <Metric label="Corrected Area" value={node.corrected_flooded_pct.toFixed(1)} unit="%" color="#8ba4cc" />
        <Metric label="Mean Duration" value={node.mean_flood_duration.toFixed(1)} unit="days" color="#8ba4cc" />
        <Metric label="Population" value={node.population.toLocaleString()} color="#8ba4cc" />
        <Metric label="Fatalities" value={node.human_fatality} color={node.human_fatality > 10 ? '#ef4444' : '#8ba4cc'} />
        <Metric label="Injured" value={node.human_injured} color="#8ba4cc" />
      </div>

      {/* LLM Insight */}
      <div style={{ ...sectionStyle, borderBottom: 'none' }}>
        <div style={sectionHeader}>
          ✦ AI FLOOD INSIGHT
          {insightLoading && <span style={{ color: '#4a6080', marginLeft: '6px', animation: 'pulse 1.5s infinite' }}>generating…</span>}
        </div>
        {insightError && (
          <div style={{ color: '#ef4444', fontSize: '0.62rem', fontFamily: 'Space Mono, monospace' }}>
            {insightError}
          </div>
        )}
        {insight && !insightLoading && (
          <div style={{
            fontSize: '0.7rem',
            color: '#8ba4cc',
            lineHeight: 1.7,
            fontFamily: 'Syne, sans-serif',
            whiteSpace: 'pre-wrap',
          }}>
            {insight}
          </div>
        )}
        {!insight && !insightLoading && !insightError && (
          <div style={{ color: '#2a3a52', fontSize: '0.65rem', fontFamily: 'Space Mono, monospace' }}>
            Loading analysis…
          </div>
        )}
      </div>
    </div>
  )
}

const panelStyle = {
  height: '100%',
  overflowY: 'auto',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
}

const sectionStyle = {
  borderBottom: '1px solid #0f1929',
  paddingBottom: '0.7rem',
  marginBottom: '0.7rem',
}

const sectionHeader = {
  fontFamily: 'Space Mono, monospace',
  fontSize: '0.58rem',
  color: '#4a6080',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.4rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}