import React from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

const tooltipStyle = {
  contentStyle: {
    background: '#0f1929',
    border: '1px solid #1a2a42',
    borderRadius: '6px',
    fontFamily: 'Space Mono, monospace',
    fontSize: '0.7rem',
    color: '#e8f0ff',
  },
  labelStyle: { color: '#8ba4cc' },
}

const axisStyle = {
  tick: { fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', fill: '#4a6080' },
  stroke: '#1a2a42',
}

export function RainfallTimeline({ data, color = '#00d4ff', title }) {
  return (
    <div>
      {title && (
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', marginBottom: '0.8rem', letterSpacing: '0.1em' }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a42" />
          <XAxis dataKey="date" {...axisStyle} tickFormatter={d => d?.slice(5) || d} />
          <YAxis {...axisStyle} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v?.toFixed(1)} mm`, 'Rainfall']} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TopDistrictsBar({ data, color = '#00d4ff', title, valueKey = 'cumulative' }) {
  return (
    <div>
      {title && (
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', marginBottom: '0.8rem', letterSpacing: '0.1em' }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a42" horizontal={false} />
          <XAxis type="number" {...axisStyle} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontFamily: 'Space Mono, monospace', fontSize: '0.55rem', fill: '#8ba4cc' }}
            tickFormatter={v => v?.length > 16 ? v.slice(0, 15) + '…' : v}
          />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v?.toFixed(1)} mm`, '']} />
          <Bar dataKey={valueKey} radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} opacity={1 - i * 0.06} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CycloneComparisonChart({ data, title }) {
  const colors = { amphan: '#00d4ff', yaas: '#f59e0b', remal: '#ef4444' }
  return (
    <div>
      {title && (
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', marginBottom: '0.8rem', letterSpacing: '0.1em' }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a42" />
          <XAxis dataKey="cyclone" {...axisStyle} />
          <YAxis {...axisStyle} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((item, i) => (
              <Cell key={i} fill={colors[item.cyclone] || '#00d4ff'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AnomalyChart({ data, title }) {
  return (
    <div>
      {title && (
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: '#4a6080', marginBottom: '0.8rem', letterSpacing: '0.1em' }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a42" />
          <XAxis dataKey="date" {...axisStyle} tickFormatter={d => d?.slice(5) || d} />
          <YAxis {...axisStyle} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v?.toFixed(2)}σ`, 'Anomaly']} />
          <Bar dataKey="anomaly" radius={[2, 2, 0, 0]}>
            {data.map((item, i) => (
              <Cell key={i} fill={item.anomaly >= 0 ? '#ef4444' : '#00d4ff'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
