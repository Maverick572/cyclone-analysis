import React from 'react'

const getSeverityColor = (rate) => {
  if (rate == null) return '#b8d5f0';
  if (rate > 5) return '#ef4444';     // high
  if (rate > 1) return '#f59e0b';     // medium
  return '#b8d5f0';                  // low
};

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
        fontSize:'0.75rem',
        color:'rgba(163, 163, 163, 0.7)',
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
  const population = selectedMetadata?.population;

  const fatalityRate = population
    ? (selectedMetadata.human_fatality / population) * 100000
    : null;

  const injuryRate = population
    ? (selectedMetadata.human_injured / population) * 100000
    : null;
  if (!selectedMetadata) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>DISTRICT DETAILS</div>

        <div style={{
          color:'#40526c',
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
          label="Actual Flooded Area"
          value={selectedMetadata.corrected_percent_flooded_area?.toFixed(2) || '0'}
          unit="%"
        />

        <Metric
          label="Permanent Water"
          value={selectedMetadata.permanent_water?.toFixed(2) || '0'}
          unit="%"
        />

        <Metric
          label="Average Flood Duration"
          value={selectedMetadata.mean_flood_duration || '0'}
          unit="days"
        />
      </div>

      {/* IMPACT */}
      <div style={{ ...sectionStyle, borderBottom:'none' }}>
        <div style={sectionHeader}>HUMAN IMPACT</div>
        <div style={noteStyle}>
          Historical estimates — may vary due to reporting differences
        </div>
        <Metric
          label="Reported Casualties"
          
          value={selectedMetadata.human_fatality || 0}
          color={selectedMetadata.human_fatality > 50 ? '#ef4444' : '#b8d5f0'}
        />

        <Metric
          label="Reported Injured"
          value={selectedMetadata.human_injured || 0}
          color="#f59e0b"
        />
        <Metric
          label="Casualties per 100k"
          value={fatalityRate ? fatalityRate.toFixed(2) : 'N/A'}
          color={getSeverityColor(fatalityRate)}
        />
        <Metric
          label="Injuries per 100k"
          value={injuryRate ? injuryRate.toFixed(2) : 'N/A'}
          color={getSeverityColor(injuryRate)}
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

const noteStyle = {
  fontFamily:'Space Mono, monospace',
  fontSize:'0.65rem',
  color:'#547bbb',
  letterSpacing:'0.1em',
  textTransform:'uppercase',
  marginBottom:'0.4rem',
  textAlign:'center'
}

const sectionHeader = {
  fontFamily:'Space Mono, monospace',
  fontSize:'0.75rem',
  color:'#5d769c',
  letterSpacing:'0.1em',
  textTransform:'uppercase',
  marginBottom:'0.4rem',
  textAlign:'center'
}