import { useEffect, useRef } from "react"

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
  mode
}) {

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

      const layer = L.geoJSON(geojson, {
        style: {
          fillColor: "#0d1f35",
          fillOpacity: 1,
          color: "#1a3050",
          weight: 0.8
        },
        pane: "spreadDistrictPane"
      }).addTo(map)

      districtLayerRef.current = layer

    })

  }, [geojson, mode])


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
      if (!graph || (!sourceDistrict && !targetDistrict)) return

      const centroids = {}
      for (const feature of geojson.features) {
        const key = normalize(feature.properties.NAME_2)
        centroids[key] = getCentroid(feature)
      }

      const edges = []

      if (spreadType === "source" && sourceDistrict && graph[sourceDistrict]) {

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

      } else if (spreadType === "target" && targetDistrict) {

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
        p.style.zIndex = 650
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
        "pointer-events:none"
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
      arrowPath.setAttribute("fill", "#00d4ff")

      marker.appendChild(arrowPath)
      defs.appendChild(marker)
      svg.appendChild(defs)
      pane.appendChild(svg)
      svgRef.current = svg

      function draw() {

        svg.querySelectorAll("line").forEach(el => el.remove())

        for (const { from, to, intensity } of edges) {

          const fc = centroids[from]
          const tc = centroids[to]
          if (!fc || !tc) continue

          const fp = map.latLngToContainerPoint([fc.lat, fc.lng])
          const tp = map.latLngToContainerPoint([tc.lat, tc.lng])

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
          line.setAttribute("stroke", "#00d4ff")
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