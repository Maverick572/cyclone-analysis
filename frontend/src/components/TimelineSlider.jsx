import React, { useEffect } from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(raw) {
  if (!raw) return '—'

  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
  }

  const compactMatch = raw.match(/(\d{4})(\d{2})(\d{2})/)
  if (compactMatch) {
    const [, y, m, d] = compactMatch
    return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
  }

  return raw
}

export default function TimelineSlider({
  dates,
  currentIndex,
  onIndexChange,
  viewCyclone,
  setViewCyclone
}) {

  const formattedCurrent = formatDate(dates[currentIndex])

  const atStart = currentIndex === 0
  const atEnd = currentIndex === dates.length - 1


  return (
    <div style={{
      background: 'rgba(5,8,15,0.95)',
      border: '1px solid #1a2a42',
      borderRadius: '10px',
      padding: '1rem 1.4rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
    }}>

      {/* toggle */}
      <label style={{
        display:'flex',
        alignItems:'center',
        gap:'0.5rem',
        fontFamily:'Space Mono, monospace',
        fontSize:'0.8rem',
        color:'#8ba4cc',
        cursor:'pointer'
      }}>

        <span style={checkboxStyles.box}>

          {viewCyclone && (
            <span style={checkboxStyles.tick}/>
          )}

          <input
            type="checkbox"
            checked={viewCyclone}
            onChange={()=>setViewCyclone(v=>!v)}

            style={{
              position:'absolute',
              inset:0,
              opacity:0,
              cursor:'pointer'
            }}
          />

        </span>

        VIEW CYCLONE

      </label>


      {/* date */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between'
      }}>

        <div style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: '1rem',
          color: '#00d4ff',
          letterSpacing: '0.04em',
        }}>
          {formattedCurrent}
        </div>

        <div style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: '0.6rem',
          color: '#4a6080',
        }}>
          {currentIndex + 1} / {dates.length}
        </div>

      </div>


      {/* slider */}
      <input
        type="range"
        min={0}
        max={Math.max(0, dates.length - 1)}
        value={currentIndex}
        onChange={e => onIndexChange(parseInt(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#00d4ff',
          cursor: 'pointer',
          height: '3px'
        }}
      />


      {/* prev next */}
      <div style={{
        display: 'flex',
        gap: '0.8rem'
      }}>

        <button
          onClick={() => onIndexChange(currentIndex - 1)}
          disabled={atStart}
          style={{
            ...btnStyle,
            opacity: atStart ? 0.3 : 1,
            flex: 1
          }}
        >
          ◀ PREV
        </button>


        <button
          onClick={() => onIndexChange(currentIndex + 1)}
          disabled={atEnd}
          style={{
            ...btnStyle,
            opacity: atEnd ? 0.3 : 1,
            flex: 1
          }}
        >
          NEXT ▶
        </button>

      </div>

    </div>
  )
}


const btnStyle = {
  background: 'transparent',
  border: '1px solid #1a2a42',
  borderRadius: '6px',
  color: '#8ba4cc',
  fontFamily: 'Space Mono, monospace',
  fontSize: '0.68rem',
  letterSpacing: '0.06em',
  padding: '7px 10px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  textAlign: 'center',
}

const checkboxStyles = {

  box:{
    appearance:'none',
    WebkitAppearance:'none',

    width:'14px',
    height:'14px',

    border:'1px solid #00d4ff',
    borderRadius:'2px',

    background:'transparent',

    cursor:'pointer',

    position:'relative',

    display:'inline-flex',

    alignItems:'center',
    justifyContent:'center'
  },

  tick:{
    width:'4px',
    height:'8px',

    border:'2px solid #00d4ff',

    borderTop:'none',
    borderLeft:'none',

    transform:'rotate(45deg)',

    marginTop:'-1px' // optical centering tweak
  }

}