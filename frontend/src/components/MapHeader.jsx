export default function MapHeader({ meta, navigate, mode, setMode }) {

  const baseButton = {
    background:'rgba(8,12,20,0.9)',
    color:'#8ba4cc',
    border:'1px solid #1a2a42',
    padding:'0.45rem 0.8rem',
    borderRadius:'6px',
    fontFamily:'Space Mono',
    fontSize:'0.65rem',
    cursor:'pointer',
    transition:'all 0.18s ease'
  }

  const toggleStyle = (selected,color)=>({
    ...baseButton,
    background:selected?`${color}22`:baseButton.background,
    color:selected?color:baseButton.color,
    border:selected?`1px solid ${color}`:baseButton.border,
    transform:selected?'translateY(-1px)':'translateY(0)',
    boxShadow:selected?`0 0 8px ${color}55`:'none'
  })

  const hoverIn=(e,color,selected)=>{
    if(selected) return
    e.currentTarget.style.borderColor=color
    e.currentTarget.style.transform='translateY(-1px)'
  }

  const hoverOut=(e,selected)=>{
    if(selected) return
    e.currentTarget.style.borderColor='#1a2a42'
    e.currentTarget.style.transform='translateY(0)'
  }

  return (
    <div style={{
      padding:'0.6rem 1.5rem',
      borderBottom:'1px solid #1a2a42',
      display:'flex',
      alignItems:'center',
      gap:'1rem'
    }}>

      <button
        onClick={()=>navigate('/')}
        style={baseButton}
        onMouseEnter={e=>hoverIn(e,'#00d4ff',false)}
        onMouseLeave={e=>hoverOut(e,false)}
      >
        ← BACK
      </button>

      <div style={{
        color:meta.color,
        fontSize:'1.6rem',
        fontFamily:'Syne',
        fontWeight:700
      }}>
        {meta.name}
      </div>

      <div style={{
        display:'flex',
        gap:'0.6rem',
      }}>

        <button
          onClick={()=>setMode("rainfall")}
          style={toggleStyle(mode==="rainfall",'#00d4ff')}
          onMouseEnter={e=>hoverIn(e,'#00d4ff',mode==="rainfall")}
          onMouseLeave={e=>hoverOut(e,mode==="rainfall")}
        >
          RAINFALL
        </button>

        <button
          onClick={()=>setMode("flood")}
          style={toggleStyle(mode==="flood",'#00d4ff')}
          onMouseEnter={e=>hoverIn(e,'#00d4ff',mode==="flood")}
          onMouseLeave={e=>hoverOut(e,mode==="flood")}
        >
          FLOOD
        </button>

        <button
            onClick={()=>setMode("spread")}
            style={toggleStyle(mode==="spread",'#00d4ff')}
            onMouseEnter={e=>hoverIn(e,'#00d4ff',mode==="spread")}
            onMouseLeave={e=>hoverOut(e,mode==="spread")}
            >
            SPREAD
        </button>
        <button
          onClick={()=>setMode("insights")}
          style={toggleStyle(mode==="insights",'#00d4ff')}
          onMouseEnter={e=>hoverIn(e,'#00d4ff',mode==="insights")}
          onMouseLeave={e=>hoverOut(e,mode==="insights")}
        >
          INSIGHTS
        </button>
      </div>
    </div>
  )
}