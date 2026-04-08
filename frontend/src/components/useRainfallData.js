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
  const [allRainfall,setAllRainfall]=useState([])
  const [allFlood,setAllFlood]=useState([])
  const [cycloneTrack,setCycloneTrack]=useState({})
  const [dates,setDates]=useState([])
  const [loading,setLoading]=useState(true)

  /* NEW */
  const [graph,setGraph]=useState({})
  const [graphDistricts,setGraphDistricts]=useState([])

  useEffect(()=>{

    async function load(){

      const rainKey=`rain_${cyclone}`
      const floodKey=`flood_${cyclone}`
      const districtKey=`district_${cyclone}`
      const trackKey=`track_${cyclone}`
      const graphKey=`graph_${cyclone}`

      let rainRows=sessionStorage.getItem(rainKey)
      let floodRows=sessionStorage.getItem(floodKey)
      let allowedDistricts=sessionStorage.getItem(districtKey)
      let track=sessionStorage.getItem(trackKey)
      let graphData=sessionStorage.getItem(graphKey)

      if(!rainRows){
        rainRows=await getRainfall(cyclone)
        sessionStorage.setItem(rainKey,JSON.stringify(rainRows))
      } else rainRows=JSON.parse(rainRows)

      if(!floodRows){
        const r=await fetch(`http://localhost:8000/flood-intensity/${cyclone}`)
        floodRows=await r.json()
        sessionStorage.setItem(floodKey,JSON.stringify(floodRows))
      } else floodRows=JSON.parse(floodRows)

      if(!allowedDistricts){
        allowedDistricts=await getDistricts(cyclone)
        sessionStorage.setItem(districtKey,JSON.stringify(allowedDistricts))
      } else allowedDistricts=JSON.parse(allowedDistricts)

      if(!track){
        const r=await fetch(`http://localhost:8000/cyclone-track/${cyclone}`)
        track=await r.json()
        sessionStorage.setItem(trackKey,JSON.stringify(track))
      } else track=JSON.parse(track)

      /* NEW GRAPH FETCH */
      if(!graphData){
        const r=await fetch(`http://localhost:8000/graph/${cyclone}`)
        graphData=await r.json()
        sessionStorage.setItem(graphKey,JSON.stringify(graphData))
      } else graphData=JSON.parse(graphData)

      setGraph(graphData)

      /*
      extract all districts appearing in graph
      */
      const gDistricts=new Set()

      for(const source in graphData){

        gDistricts.add(
          source
            .toLowerCase()
            .replace(/\s+/g,'')
            .replace(/-/g,'')
        )

        for(const path of graphData[source]){

          for(const node of path){

            gDistricts.add(
              node.district
                .toLowerCase()
                .replace(/\s+/g,'')
                .replace(/-/g,'')
            )

          }

        }

      }

      setGraphDistricts([...gDistricts].sort())


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

      const uniqueDates=[
        ...new Set([
          ...rainRows.map(r=>r.date),
          ...Object.keys(track)
        ])
      ].sort()

      setDates(uniqueDates)

      setLoading(false)
    }

    load()

  },[cyclone])


  return {

    geojson,
    allRainfall,
    allFlood,
    cycloneTrack,
    dates,
    loading,
    graph,
    graphDistricts

  }
}