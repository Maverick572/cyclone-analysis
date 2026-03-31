import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const navStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  background: 'rgba(5, 8, 15, 0.92)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid #1a2a42',
  padding: '0 2rem',
  display: 'flex',
  alignItems: 'center',
  gap: '2rem',
  height: '56px',
}

const logoStyle = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: '1rem',
  color: '#00d4ff',
  textDecoration: 'none',
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const linkStyle = (active) => ({
  fontFamily: 'Space Mono, monospace',
  fontSize: '0.72rem',
  color: active ? '#00d4ff' : '#8ba4cc',
  textDecoration: 'none',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '4px 0',
  borderBottom: active ? '1px solid #00d4ff' : '1px solid transparent',
  transition: 'all 0.2s',
})

export default function NavBar() {
  const loc = useLocation()
  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>
        <span style={{ fontSize: '1.2rem' }}>🌀</span>
        CYCLONE RAIN ANALYSIS
      </Link>
      <div style={{ flex: 1 }} />
    </nav>
  )
}
