import { useEffect, useState } from "react"
import districtsGeo from "../data/district_shapes.json"
import {
  getRainfall,
  getDistricts,
  getFloodIntensity,
  getCycloneTrack,
  getGraph,
  getFloodRisk,
  getDistrictMetadata,
  getInsights
} from "../services/api"

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
  const [districtMetadata, setDistrictMetadata] = useState([])
  const [insights, setInsights] = useState(null)

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
      const metadataKey = "district_metadata"
      const insightsKey = `insights_${cyclone}`

      let insightsData = sessionStorage.getItem(insightsKey)
      let metadata = sessionStorage.getItem(metadataKey)
      let floodRiskData = sessionStorage.getItem(floodRiskKey)
      let rainRows=sessionStorage.getItem(rainKey)
      let floodRows=sessionStorage.getItem(floodKey)
      let allowedDistricts=sessionStorage.getItem(districtKey)
      let track=sessionStorage.getItem(trackKey)
      let graphData=sessionStorage.getItem(graphKey)

      try {
        // ---------------- RAINFALL ----------------
        if (!rainRows) {
          rainRows = await getRainfall(cyclone)

          if (!rainRows || rainRows.error) {
            console.error("❌ Rainfall error:", rainRows)
            return
          }

          sessionStorage.setItem(rainKey, JSON.stringify(rainRows))
        } else {
          rainRows = JSON.parse(rainRows)
        }


        // ---------------- FLOOD ----------------
        if (!floodRows) {
          floodRows = await getFloodIntensity(cyclone)

          if (!floodRows || floodRows.error) {
            console.error("❌ Flood error:", floodRows)
            return
          }

          sessionStorage.setItem(floodKey, JSON.stringify(floodRows))
        } else {
          floodRows = JSON.parse(floodRows)
        }


        // ---------------- DISTRICTS ----------------
        if (!allowedDistricts) {
          allowedDistricts = await getDistricts(cyclone)

          if (!allowedDistricts || allowedDistricts.error) {
            console.error("❌ District error:", allowedDistricts)
            return
          }

          sessionStorage.setItem(districtKey, JSON.stringify(allowedDistricts))
        } else {
          allowedDistricts = JSON.parse(allowedDistricts)
        }


        if (!insightsData) {
          insightsData = await getInsights(cyclone)
          sessionStorage.setItem(insightsKey, JSON.stringify(insightsData))
        } else {
          insightsData = JSON.parse(insightsData)
        }

        // ---------------- TRACK ----------------
        if (!track) {
          track = await getCycloneTrack(cyclone)
          sessionStorage.setItem(trackKey, JSON.stringify(track))
        } else {
          track = JSON.parse(track)
        }


        // ---------------- GRAPH ----------------
        if (!graphData) {
          graphData = await getGraph(cyclone)
          sessionStorage.setItem(graphKey, JSON.stringify(graphData))
        } else {
          graphData = JSON.parse(graphData)
        }


        // ---------------- FLOOD RISK ----------------
        if (!floodRiskData) {
          floodRiskData = await getFloodRisk(cyclone)
          sessionStorage.setItem(floodRiskKey, JSON.stringify(floodRiskData))
        } else {
          floodRiskData = JSON.parse(floodRiskData)
        }


        // ---------------- METADATA ----------------
        if (!metadata) {
          metadata = await getDistrictMetadata()

          if (metadata.error) {
            console.error("❌ Metadata error:", metadata)
            metadata = []
          }

          sessionStorage.setItem(metadataKey, JSON.stringify(metadata))
        } else {
          metadata = JSON.parse(metadata)
        }
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
        setDistrictMetadata(metadata)
        setInsights(insightsData)

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
    floodRisk,
    districtMetadata,
    insights
  }
}