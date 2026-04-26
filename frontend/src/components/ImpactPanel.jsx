import React from 'react'

function Metric({ label, value, unit = '', color = '#b8d5f0' }) {
  return (
    <div style={{
      display:'flex',
      justifyContent:'space-between',
      alignItems:'center',
      padding:'6px 0',
      borderBottom:'1px solid rgba(0,212,255,0.08)'
    }}>
      <span style={{
        fontFamily:'Space Mono, monospace',
        fontSize:'0.55rem',
        color:'rgba(74,96,128,0.7)',
        letterSpacing:'0.08em',
        textTransform:'uppercase'
      }}>
        {label}
      </span>

      <span style={{
        fontFamily:'Space Mono, monospace',
        fontSize:'0.7rem',
        color,
        fontWeight:600
      }}>
        {value}
        {unit && (
          <span style={{
            fontSize:'0.55rem',
            color:'#4a6080',
            marginLeft:3
          }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  )
}

export default function ImpactPanel({ selectedMetadata }) {

  if (!selectedMetadata) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>DISTRICT DETAILS</div>

        <div style={{
          color:'#2a3a52',
          fontFamily:'Space Mono, monospace',
          fontSize:'0.7rem',
          textAlign:'center',
          marginTop:'3rem',
          lineHeight:1.8
        }}>
          Click a district<br/>to view details
        </div>
      </div>
    )
  }

  return (
    <div style={panelStyle}>

      {/* HEADER */}
      <div style={{ marginBottom:'1rem' }}>
        <div style={headerStyle}>DISTRICT DETAILS</div>

        <div style={{
          fontFamily:'Syne, sans-serif',
          fontWeight:700,
          fontSize:'1.1rem',
          color:'#e8f0ff',
          marginTop:4,
          textAlign:'center'
        }}>
          {selectedMetadata.displayName || selectedMetadata.district}
        </div>
      </div>

      {/* POPULATION */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>DEMOGRAPHICS</div>

        <Metric
          label="Population"
          value={selectedMetadata.population?.toLocaleString() || 'N/A'}
          color="#00d4ff"
        />
      </div>

      {/* FLOOD CHARACTERISTICS */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>FLOOD PROFILE</div>

        <Metric
          label="Flooded Area"
          value={selectedMetadata.percent_flooded_area?.toFixed(2) || '0'}
          unit="%"
        />

        <Metric
          label="Corrected Area"
          value={selectedMetadata.corrected_percent_flooded_area?.toFixed(2) || '0'}
          unit="%"
        />

        <Metric
          label="Permanent Water"
          value={selectedMetadata.permanent_water?.toFixed(2) || '0'}
          unit="%"
        />

        <Metric
          label="Average Duration"
          value={selectedMetadata.mean_flood_duration || '0'}
          unit="days"
        />
      </div>

      {/* IMPACT */}
      <div style={{ ...sectionStyle, borderBottom:'none' }}>
        <div style={sectionHeader}>HUMAN IMPACT</div>

        <Metric
          label="Fatalities"
          value={selectedMetadata.human_fatality || 0}
          color={selectedMetadata.human_fatality > 50 ? '#ef4444' : '#b8d5f0'}
        />

        <Metric
          label="Injured"
          value={selectedMetadata.human_injured || 0}
          color="#f59e0b"
        />
      </div>

    </div>
  )
}


/* ---------------- STYLES ---------------- */

const panelStyle = {
  height:'100%',
  overflowY:'auto',
  padding:'1rem',
  display:'flex',
  flexDirection:'column'
}

const headerStyle = {
  fontFamily:'Space Mono, monospace',
  fontSize:'0.6rem',
  color:'#00d4ff',
  letterSpacing:'0.1em',
  textTransform:'uppercase',
  textAlign:'center'
}

const sectionStyle = {
  borderBottom:'1px solid rgba(0,212,255,0.1)',
  paddingBottom:'0.8rem',
  marginBottom:'0.8rem'
}

const sectionHeader = {
  fontFamily:'Space Mono, monospace',
  fontSize:'0.55rem',
  color:'#4a6080',
  letterSpacing:'0.1em',
  textTransform:'uppercase',
  marginBottom:'0.4rem'
}