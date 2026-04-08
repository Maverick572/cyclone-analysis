export default function DistrictSelector({
  graph,
  districtList,
  spreadType,
  setSpreadType,
  sourceDistrict,
  setSourceDistrict,
  targetDistrict,
  setTargetDistrict
}) {

  const dropdownStyle = {
    background: 'rgba(8,12,20,0.95)',
    color: '#8ba4cc',
    border: '1px solid #1a2a42',
    padding: '0.45rem',
    fontFamily: 'Space Mono',
    fontSize: '0.65rem',
    borderRadius: '6px',
    outline: 'none'
  }

  const sourceNodes = Object.keys(graph || {}).sort()

  let reachableTargets = []

  if (sourceDistrict && graph[sourceDistrict]) {
    const set = new Set()
    for (const path of graph[sourceDistrict]) {
      for (const node of path) {
        set.add(
          node.district
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/-/g, '')
        )
      }
    }
    reachableTargets = [...set].sort()
  } else {
    reachableTargets = districtList
  }

  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      <div style={{ display: 'flex', gap: '0.5rem' }}>

        <button
          onClick={() => setSpreadType("source")}
          style={{
            ...dropdownStyle,
            cursor: 'pointer',
            border: spreadType === "source" ? '1px solid #00d4ff' : '1px solid #1a2a42',
            color: spreadType === "source" ? '#00d4ff' : '#8ba4cc'
          }}
        >
          SOURCE
        </button>

        <button
          onClick={() => setSpreadType("target")}
          style={{
            ...dropdownStyle,
            cursor: 'pointer',
            border: spreadType === "target" ? '1px solid #00d4ff' : '1px solid #1a2a42',
            color: spreadType === "target" ? '#00d4ff' : '#8ba4cc'
          }}
        >
          TARGET
        </button>

      </div>

      <div style={{ display: spreadType === "source" ? 'flex' : 'none', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ color: '#8ba4cc', fontSize: '0.7rem' }}>SOURCE DISTRICT</div>
        <select
          value={sourceDistrict}
          onChange={e => setSourceDistrict(e.target.value)}
          style={dropdownStyle}
        >
          <option value="">select</option>
          {sourceNodes.map(d =>
            <option key={d} value={d}>{d}</option>
          )}
        </select>
      </div>

      <div style={{ display: spreadType === "target" ? 'flex' : 'none', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ color: '#8ba4cc', fontSize: '0.7rem' }}>TARGET DISTRICT</div>
        <select
          value={targetDistrict}
          onChange={e => setTargetDistrict(e.target.value)}
          style={dropdownStyle}
        >
          <option value="">select</option>
          {reachableTargets.map(d =>
            <option key={d} value={d}>{d}</option>
          )}
        </select>
      </div>

    </div>

  )

}