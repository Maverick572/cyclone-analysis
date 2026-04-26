import { useEffect, useRef } from "react"
import { valueColor } from "./valueColor"

function getCentroid(feature) {
  const coords = feature.geometry.coordinates.flat(3)
  let xs = [], ys = []
  for (let i = 0; i < coords.length; i += 2) {
    xs.push(coords[i])
    ys.push(coords[i + 1])
  }
  return {
    lng: xs.reduce((a, b) => a + b, 0) / xs.length,
    lat: ys.reduce((a, b) => a + b, 0) / ys.length
  }
}

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
}

export default function useSpreadLayer({
  leafletMapRef,
  geojson,
  graph,
  sourceDistrict,
  targetDistrict,
  spreadType,
  mode,
  floodRisk,
  onDistrictClick
}){

  const districtLayerRef = useRef(null)
  const svgRef = useRef(null)
  const drawRef = useRef(null)

  // district outline layer in spread mode
  useEffect(() => {

    if (!leafletMapRef.current || !geojson) return

    import("leaflet").then(L => {

      const map = leafletMapRef.current

      if (districtLayerRef.current) {
        map.removeLayer(districtLayerRef.current)
        districtLayerRef.current = null
      }

      if (mode !== "spread") return
      
      if (!map.getPane("spreadDistrictPane")) {
        const p = map.createPane("spreadDistrictPane")
        p.style.zIndex = 400
      }

        const riskMap = {}
        for (const r of (floodRisk || [])) {
          const key = r.district.toLowerCase().replace(/\s+/g,'').replace(/-/g,'')
          riskMap[key] = r.corrected_percent_flooded_area  // or whichever field is "risk"
        }

        const maxRisk = Math.max(...Object.values(riskMap), 1)
        console.log("riskMap keys:", Object.keys(riskMap))
        console.log("geojson keys:", geojson.features.map(f => normalize(f.properties.NAME_2)))

        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const key = normalize(feature.properties.NAME_2)
            const raw = riskMap[key] ?? 0
            const v = raw / maxRisk

            if (key === sourceDistrict) return {
              fillColor: '#00d4ff',
              fillOpacity: 0.85,
              color: '#00d4ff',
              weight: 2
            }

            if (key === targetDistrict) return {
              fillColor: '#00d4ff',
              fillOpacity: 0.85,
              color: '#00d4ff',
              weight: 2
            }

            return {
              fillColor: valueColor(v, "risk"),
              fillOpacity: 0.75,
              color: "#1a3050",
              weight: 0.8
            }
          },
          pane: "spreadDistrictPane",
          onEachFeature: (feature, layer) => {
            const rawDistrict = feature.properties.NAME_2
            const district = rawDistrict.replace(/([a-z])([A-Z])/g, "$1 $2")
            const state = feature.properties.NAME_1
            const key = normalize(rawDistrict)
            const riskVal = riskMap[key] ?? 0

            layer.on({

              click: () => {
                onDistrictClick?.(key, riskVal, district)
              },

              mouseover: (e) => {
                e.target.setStyle({ weight: 2, color: "#00d4ff" })
                L.popup({ closeButton: false, offset: [0, -5] })
                  .setLatLng(e.latlng)
                  .setContent(`
                    <div style="font-family:Space Mono;font-size:0.7rem;min-width:160px;">
                      <div style="color:#00d4ff;font-weight:bold;margin-bottom:4px;">${district}</div>
                      <div style="color:#8ba4cc;margin-bottom:6px;">${state}</div>
                      <div style="color:#e8f0ff;font-size:0.85rem;">
                        ${riskVal.toFixed(3)}
                        <span style="color:#4a6080">% flooded area</span>
                      </div>
                    </div>
                  `)
                  .openOn(map)
              },

              mouseout: (e) => {
                e.target.setStyle({ weight: 0.8, color: "#1a3050" })
                map.closePopup()
              }

            })
          }
        }).addTo(map)

        districtLayerRef.current = layer

    })

  }, [geojson, mode, sourceDistrict, targetDistrict])


  // arrow SVG layer
  useEffect(() => {

    if (!leafletMapRef.current || !geojson) return

    import("leaflet").then(L => {

      const map = leafletMapRef.current

      if (svgRef.current) {
        svgRef.current.remove()
        svgRef.current = null
      }
      if (drawRef.current) {
        map.off("move zoom moveend zoomend", drawRef.current)
        drawRef.current = null
      }

      if (mode !== "spread") return

      console.log("[spread] graph:", graph)
      console.log("[spread] sourceDistrict:", sourceDistrict)
      console.log("[spread] graph[sourceDistrict]:", graph?.[sourceDistrict])

      if (!graph || (!sourceDistrict && !targetDistrict)) return

      const centroids = {}
      for (const feature of geojson.features) {
        const key = normalize(feature.properties.NAME_2)
        centroids[key] = getCentroid(feature)
      }

      const edges = []

      if (sourceDistrict && targetDistrict) {
        // both selected: only paths from source to target
        if (graph[sourceDistrict]) {
          for (const path of graph[sourceDistrict]) {
            const last = normalize(path[path.length - 1].district)
            if (last !== targetDistrict) continue
            for (let i = 0; i < path.length - 1; i++) {
              const from = normalize(path[i].district)
              const to = normalize(path[i + 1].district)
              const intensity = path[i + 1].intensity
              if (!edges.find(e => e.from === from && e.to === to)) {
                edges.push({ from, to, intensity })
              }
            }
          }
        }

      } else if (sourceDistrict && graph[sourceDistrict]) {
        // only source: all outward paths
        for (const path of graph[sourceDistrict]) {
          for (let i = 0; i < path.length - 1; i++) {
            const from = normalize(path[i].district)
            const to = normalize(path[i + 1].district)
            const intensity = path[i + 1].intensity
            if (!edges.find(e => e.from === from && e.to === to)) {
              edges.push({ from, to, intensity })
            }
          }
        }

      } else if (targetDistrict) {
        // only target: all inward paths from every source
        for (const source in graph) {
          for (const path of graph[source]) {
            const last = normalize(path[path.length - 1].district)
            if (last !== targetDistrict) continue
            for (let i = 0; i < path.length - 1; i++) {
              const from = normalize(path[i].district)
              const to = normalize(path[i + 1].district)
              const intensity = path[i + 1].intensity
              if (!edges.find(e => e.from === from && e.to === to)) {
                edges.push({ from, to, intensity })
              }
            }
          }
        }
      }

      if (!edges.length) return

      if (!map.getPane("spreadArrowPane")) {
        const p = map.createPane("spreadArrowPane")
        p.style.zIndex = 550
        p.style.pointerEvents = "none"
      }

      const pane = map.getPane("spreadArrowPane")

      const svgNS = "http://www.w3.org/2000/svg"
      const svg = document.createElementNS(svgNS, "svg")
      svg.style.cssText = [
        "position:absolute",
        "top:0",
        "left:0",
        "width:100%",
        "height:100%",
        "overflow:visible",
        "pointer-events:none",
        "z-index:1000"
      ].join(";")

      const defs = document.createElementNS(svgNS, "defs")
      const marker = document.createElementNS(svgNS, "marker")
      marker.setAttribute("id", "spread-arrow-head")
      marker.setAttribute("markerWidth", "7")
      marker.setAttribute("markerHeight", "7")
      marker.setAttribute("refX", "6")
      marker.setAttribute("refY", "3.5")
      marker.setAttribute("orient", "auto")

      const arrowPath = document.createElementNS(svgNS, "path")
      arrowPath.setAttribute("d", "M0,0 L7,3.5 L0,7 Z")
      arrowPath.setAttribute("fill", "#ff0000")

      marker.appendChild(arrowPath)
      defs.appendChild(marker)
      svg.appendChild(defs)
      map.getContainer().appendChild(svg)
      svgRef.current = svg

      function draw() {

        svg.querySelectorAll("line").forEach(el => el.remove())

        for (const { from, to, intensity } of edges) {

          const fc = centroids[from]
          const tc = centroids[to]
          console.log("[spread] edges built:", edges)
          console.log("[spread] centroid keys:", Object.keys(centroids).slice(0, 10))
          if (!fc || !tc) continue

          const fp = map.latLngToContainerPoint([fc.lat, fc.lng])
          const tp = map.latLngToContainerPoint([tc.lat, tc.lng])
          console.log("[spread] drawing edge", from, "->", to, "fp:", fp, "tp:", tp)

          const dx = tp.x - fp.x
          const dy = tp.y - fp.y
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len < 1) continue

          const trim = Math.min(14, len * 0.15)
          const x1 = fp.x + (dx / len) * trim
          const y1 = fp.y + (dy / len) * trim
          const x2 = tp.x - (dx / len) * trim
          const y2 = tp.y - (dy / len) * trim

          const opacity = Math.min(1, 0.35 + intensity * 0.65)

          const line = document.createElementNS(svgNS, "line")
          line.setAttribute("x1", x1)
          line.setAttribute("y1", y1)
          line.setAttribute("x2", x2)
          line.setAttribute("y2", y2)
          line.setAttribute("stroke", "#ff0000")
          line.setAttribute("stroke-width", "1.8")
          line.setAttribute("stroke-opacity", opacity)
          line.setAttribute("marker-end", "url(#spread-arrow-head)")

          svg.appendChild(line)
        }
      }

      draw()
      drawRef.current = draw
      map.on("move zoom moveend zoomend", draw)

    })

    return () => {
      if (svgRef.current) {
        svgRef.current.remove()
        svgRef.current = null
      }
      if (drawRef.current && leafletMapRef.current) {
        leafletMapRef.current.off("move zoom moveend zoomend", drawRef.current)
        drawRef.current = null
      }
    }

  }, [geojson, graph, sourceDistrict, targetDistrict, spreadType, mode])

}