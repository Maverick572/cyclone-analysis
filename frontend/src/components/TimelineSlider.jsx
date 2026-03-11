import React from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * Parse a date string that may be:
 *   - ISO format:       "2020-05-15"
 *   - IMERG filename:   "3B-DAY.MS.MRG.3IMERG.20200515-S000000-E235959.V07B.nc4"
 * Returns a human-readable string like "15 May 2020".
 */
function formatDate(raw) {
  if (!raw) return '—'

  // Try ISO YYYY-MM-DD first
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
  }

  // Try 8-digit block YYYYMMDD anywhere in the string
  const compactMatch = raw.match(/(\d{4})(\d{2})(\d{2})/)
  if (compactMatch) {
    const [, y, m, d] = compactMatch
    return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
  }

  return raw
}

export default function TimelineSlider({ dates, currentIndex, onIndexChange }) {
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
      {/* Current date + counter */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
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

      {/* Seek bar */}
      <input
        type="range"
        min={0}
        max={Math.max(0, dates.length - 1)}
        value={currentIndex}
        onChange={e => onIndexChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#00d4ff', cursor: 'pointer', height: '3px' }}
      />

      {/* Prev / Next only */}
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button
          onClick={() => onIndexChange(currentIndex - 1)}
          disabled={atStart}
          style={{ ...btnStyle, opacity: atStart ? 0.3 : 1, flex: 1 }}
        >
          ◀ PREV
        </button>
        <button
          onClick={() => onIndexChange(currentIndex + 1)}
          disabled={atEnd}
          style={{ ...btnStyle, opacity: atEnd ? 0.3 : 1, flex: 1 }}
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