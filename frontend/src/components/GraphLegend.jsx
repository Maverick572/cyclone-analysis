import React from 'react'

export default function GraphLegend({ stats }) {
  return (
    <div style={{
      background: 'rgba(5,8,15,0.95)',
      border: '1px solid #1a2a42',
      borderRadius: '8px',
      padding: '0.8rem 1rem',
      minWidth: '170px',
    }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080', letterSpacing: '0.1em', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
        GRAPH LEGEND
      </div>

      {[
        { color: '#ef4444', label: 'Flooded district', shape: 'circle' },
        { color: '#f97316', label: 'High risk (glow)', shape: 'circle' },
        { color: '#f59e0b', label: 'Moderate risk', shape: 'circle' },
        { color: '#00d4ff', label: 'Active rainfall', shape: 'circle' },
      ].map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
          <div style={{
            width: item.label.includes('High') ? 10 : item.label.includes('Flooded') ? 12 : 7,
            height: item.label.includes('High') ? 10 : item.label.includes('Flooded') ? 12 : 7,
            borderRadius: '50%',
            background: item.color,
            flexShrink: 0,
            boxShadow: item.label.includes('High') ? `0 0 6px ${item.color}` : 'none',
          }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#8ba4cc' }}>{item.label}</span>
        </div>
      ))}

      <div style={{ borderTop: '1px solid #1a2a42', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '2px', background: '#ef444455', borderTop: '2px dashed #ef444488', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#8ba4cc' }}>Flood propagation edge</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1a2a42', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080', marginBottom: '3px' }}>NODE SIZE</div>
        {[
          { label: '> 10 mm', r: 5 },
          { label: '> 50 mm', r: 8 },
          { label: '> 100 mm', r: 11 },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3px' }}>
            <div style={{ width: s.r * 2, height: s.r * 2, borderRadius: '50%', background: '#00d4ff40', border: '1px solid #00d4ff60', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#8ba4cc' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {stats && (
        <div style={{ borderTop: '1px solid #1a2a42', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', color: '#4a6080', marginBottom: '3px' }}>CURRENT FRAME</div>
          {[
            { label: 'Nodes', val: stats.total_nodes },
            { label: 'Flooded', val: stats.flooded_nodes, color: '#ef4444' },
            { label: 'High Risk', val: stats.high_risk_nodes, color: '#f97316' },
            { label: 'Edges', val: stats.total_edges, color: '#ef444488' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: '#4a6080' }}>{s.label}</span>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: s.color || '#8ba4cc' }}>{s.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}