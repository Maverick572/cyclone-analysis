export function valueColor(v,mode){

  if(v==null||v<=0) return 'transparent'

  if(mode==="flood"){

    if(v<0.25) return '#e0f2fe'
    if(v<0.5) return '#bae6fd'
    if(v<0.75) return '#7dd3fc'
    if(v<1.0) return '#38bdf8'
    if(v<1.5) return '#0ea5e9'
    if(v<2.0) return '#2563eb'
    return '#1e3a8a'

  }

  if(mode === "risk"){
    if(v < 0.2) return '#f0fdf4'
    if(v < 0.4) return '#86efac'
    if(v < 0.6) return '#facc15'
    if(v < 0.8) return '#f97316'
    return '#dc2626'
  }

  if(v<1) return '#fef9c3'
  if(v<5) return '#fed7aa'
  if(v<20) return '#fb923c'
  if(v<50) return '#dc2626'
  if(v<100) return '#991b1b'
  return '#7f1d1d'
}