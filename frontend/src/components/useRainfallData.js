import { useEffect, useState } from "react"
import { getRainfall, getDistricts } from "../services/api"
import districtsGeo from "../data/district_shapes.json"

const MAX_DIST_KM = 80

function haversineKm(lon1, lat1, lon2, lat2){
  const R = 6371
  const toRad = x => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function useRainfallData(cyclone){

  const [geojson,setGeojson]=useState(null)
  const [floodRisk, setFloodRisk] = useState([])
  const [allRainfall,setAllRainfall]=useState([])
  const [allFlood,setAllFlood]=useState([])
  const [cycloneTrack,setCycloneTrack]=useState({})
  const [dates,setDates]=useState([])
  const [loading,setLoading]=useState(true)
  const [graph,setGraph]=useState({})
  const [graphDistricts,setGraphDistricts]=useState([])

  useEffect(()=>{

    let active = true

    async function load(){

      setLoading(true)

      const rainKey=`rain_${cyclone}`
      const floodKey=`flood_${cyclone}`
      const districtKey=`district_${cyclone}`
      const trackKey=`track_${cyclone}`
      const graphKey=`graph_${cyclone}`
      const floodRiskKey = `floodrisk_${cyclone}`

      let floodRiskData = sessionStorage.getItem(floodRiskKey)
      let rainRows=sessionStorage.getItem(rainKey)
      let floodRows=sessionStorage.getItem(floodKey)
      let allowedDistricts=sessionStorage.getItem(districtKey)
      let track=sessionStorage.getItem(trackKey)
      let graphData=sessionStorage.getItem(graphKey)

      try {

        if(!rainRows){
          rainRows=await getRainfall(cyclone)
          if (!rainRows || rainRows.error) {
            console.error("❌ Rainfall error:", rainRows)
            return
          }
          sessionStorage.setItem(rainKey,JSON.stringify(rainRows))
        } else rainRows=JSON.parse(rainRows)

        if(!floodRows){
          const r=await fetch(`http://localhost:8000/flood-intensity/${cyclone}`)
          floodRows=await r.json()
          if (floodRows.error) {
            console.error("❌ Flood error:", floodRows)
            return
          }
          sessionStorage.setItem(floodKey,JSON.stringify(floodRows))
        } else floodRows=JSON.parse(floodRows)

        if(!allowedDistricts){
          allowedDistricts=await getDistricts(cyclone)
          if (!allowedDistricts || allowedDistricts.error) {
            console.error("❌ District error:", allowedDistricts)
            return
          }
          sessionStorage.setItem(districtKey,JSON.stringify(allowedDistricts))
        } else allowedDistricts=JSON.parse(allowedDistricts)

        if(!track){
          const r=await fetch(`http://localhost:8000/cyclone-track/${cyclone}`)
          track=await r.json()
          sessionStorage.setItem(trackKey,JSON.stringify(track))
        } else track=JSON.parse(track)

        if(!graphData){
          const r=await fetch(`http://localhost:8000/graph/${cyclone}`)
          graphData=await r.json()
          sessionStorage.setItem(graphKey,JSON.stringify(graphData))
        } else graphData=JSON.parse(graphData)

        if(!floodRiskData){
          const r = await fetch(`http://localhost:8000/flood-risk/${cyclone}`)
          floodRiskData = await r.json()
          sessionStorage.setItem(floodRiskKey, JSON.stringify(floodRiskData))
        } else floodRiskData = JSON.parse(floodRiskData)

        /* ---------------- GRAPH NORMALIZATION ---------------- */

        const normalizedGraph = {}

        for (const source in graphData) {

          if (!source) {
            console.warn("⚠️ Invalid source:", source)
            continue
          }

          const key = source.toLowerCase().replace(/\s+/g,'').replace(/-/g,'')

          const paths = graphData[source]

          if (!Array.isArray(paths)) {
            console.warn("⚠️ Invalid paths:", source, paths)
            continue
          }

          normalizedGraph[key] = []

          for (const path of paths) {

            if (!Array.isArray(path)) {
              console.warn("⚠️ Invalid path:", path)
              continue
            }

            const cleanPath = []

            for (const node of path) {

              if (!node || !node.district) {
                console.warn("⚠️ Bad node:", { source, node })
                continue
              }

              const cleanDistrict = node.district
                .toLowerCase()
                .replace(/\s+/g,'')
                .replace(/-/g,'')

              cleanPath.push({
                ...node,
                district: cleanDistrict
              })
            }

            if (cleanPath.length > 0) {
              normalizedGraph[key].push(cleanPath)
            }
          }
        }

        if (!active) return

        setGraph(normalizedGraph)

        /* ---------------- GRAPH DISTRICTS ---------------- */

        const gDistricts=new Set()

        for (const source in normalizedGraph){

          gDistricts.add(source)

          for (const path of normalizedGraph[source]){

            for (const node of path){

              if (!node || !node.district) {
                console.warn("⚠️ Bad node (district extraction):", node)
                continue
              }

              gDistricts.add(node.district)
            }
          }
        }

        setGraphDistricts([...gDistricts].sort())

        /* ---------------- GEO FILTER ---------------- */

        const filtered=districtsGeo.features.filter(f=>{

          const geoName=f.properties.NAME_2
            .toLowerCase()
            .replace(/\s+/g,'')
            .replace(/-/g,'')

          const coords=f.geometry.coordinates.flat(3)

          let xs=[],ys=[]

          for(let i=0;i<coords.length;i+=2){
            xs.push(coords[i])
            ys.push(coords[i+1])
          }

          const lon=xs.reduce((a,b)=>a+b,0)/xs.length
          const lat=ys.reduce((a,b)=>a+b,0)/ys.length

          for(const d of allowedDistricts){

            if (!d || !d.district) {
              console.warn("⚠️ Bad allowed district:", d)
              continue
            }

            const nameMatch=d.district
              .toLowerCase()
              .replace(/\s+/g,'')
              .replace(/-/g,'')

            if(geoName!==nameMatch) continue

            const dist=haversineKm(lon,lat,d.lon,d.lat)

            if(dist<MAX_DIST_KM) return true
          }

          return false
        })

        setGeojson({
          ...districtsGeo,
          features:filtered
        })

        setAllRainfall(rainRows)
        setAllFlood(floodRows)
        setCycloneTrack(track)
        setFloodRisk(floodRiskData)

        const uniqueDates=[
          ...new Set([
            ...rainRows.map(r=>r.date),
            ...Object.keys(track)
          ])
        ].sort()

        setDates(uniqueDates)

        setLoading(false)

      } catch (err) {
        console.error("🔥 Load failed:", err)
      }
    }

    load()

    return () => { active = false }

  },[cyclone])


  return {
    geojson,
    allRainfall,
    allFlood,
    cycloneTrack,
    dates,
    loading,
    graph,
    graphDistricts,
    floodRisk
  }
}