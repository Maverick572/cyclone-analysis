export default function Legend({mode}){

  const rainfall=[

    {range:'< 1 mm',color:'#fef9c3'},
    {range:'1–5 mm',color:'#fed7aa'},
    {range:'5–20 mm',color:'#fb923c'},
    {range:'20–50 mm',color:'#dc2626'},
    {range:'50–100 mm',color:'#991b1b'},
    {range:'> 100 mm',color:'#7f1d1d'}
  ]

  const flood=[

    {range:'0 – 0.25',color:'#e0f2fe'},
    {range:'0.25 – 0.5',color:'#bae6fd'},
    {range:'0.5 – 0.75',color:'#7dd3fc'},
    {range:'0.75 – 1.0',color:'#38bdf8'},
    {range:'1.0 – 1.5',color:'#0ea5e9'},
    {range:'1.5 – 2.0',color:'#2563eb'},
    {range:'> 2.0',color:'#1e3a8a'}
  ]

  const risk = [
    {range:'0 – 0.2', color:'#f0fdf4'},
    {range:'0.2 – 0.4', color:'#86efac'},
    {range:'0.4 – 0.6', color:'#facc15'},
    {range:'0.6 – 0.8', color:'#f97316'},
    {range:'> 0.8', color:'#dc2626'}
  ]

  const items = mode==="flood" ? flood : mode==="risk" ? risk : rainfall
  const title = mode==="flood" ? "FLOOD INTENSITY" : mode==="risk" ? "FLOOD RISK" : "RAINFALL mm/day"

  return(
    <div style={{
      background:'rgba(5,8,15,0.92)',
      border:'1px solid #1a2a42',
      borderRadius:'8px',
      padding:'0.8rem 1rem',
      minWidth:'140px'
    }}>
      <div style={{
        fontFamily:'Space Mono',
        fontSize:'0.6rem',
        color:'#4a6080',
        marginBottom:'0.6rem'
      }}>
        {title}
      </div>
      {items.map(item=>(
        <div
          key={item.range}
          style={{
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            marginBottom:'3px'
          }}
        >
          <div style={{
            width:12,
            height:12,
            borderRadius:2,
            background:item.color
          }}/>
          <span style={{
            fontFamily:'Space Mono',
            fontSize:'0.62rem',
            color:'#8ba4cc'
          }}>
            {item.range}
          </span>
        </div>
      ))}
    </div>
  )
}