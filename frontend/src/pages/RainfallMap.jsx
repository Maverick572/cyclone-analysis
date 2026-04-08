import { useState,useEffect } from "react"
import { useParams,useNavigate } from "react-router-dom"

import DistrictMap from "../components/map/DistrictMap"
import TimelineSlider from "../components/TimelineSlider"
import RainfallLegend from "../components/Legend"
import MapHeader from "../components/MapHeader"
import DistrictSelector from "../components/DistrictSelector"
import useRainfallData from "../components/useRainfallData"

const CYCLONE_META={
  amphan:{name:"Cyclone Amphan",color:"#00d4ff"}
}

export default function RainfallMap(){

  const {cyclone}=useParams()
  const navigate=useNavigate()
  const meta=CYCLONE_META[cyclone]
  const [viewCyclone,setViewCyclone] = useState(true)
  const {
  geojson,
  allRainfall,
  allFlood,
  cycloneTrack,
  dates,
  loading,

  graph,
  graphDistricts

} = useRainfallData(cyclone)

  const [index,setIndex]=useState(0)
  const [mode,setMode]=useState("rainfall")
  const [slice,setSlice]=useState({})
  const [selectedDistrict,setSelectedDistrict]=useState(null)
  const [districtInfo,setDistrictInfo]=useState(null)

  const [sourceDistrict,setSourceDistrict]=useState("")
  const [targetDistrict,setTargetDistrict]=useState("")
  const [spreadType,setSpreadType]=useState("source")

  const handleDistrictClick=(district,value)=>{
    setSelectedDistrict(district)
    setDistrictInfo({district,value})
  }

  const dropdownStyle={
    background:'rgba(8,12,20,0.95)',
    color:'#8ba4cc',
    border:'1px solid #1a2a42',
    padding:'0.45rem',
    fontFamily:'Space Mono',
    fontSize:'0.65rem',
    borderRadius:'6px',
    outline:'none'
  }

useEffect(()=>{

  if(!dates.length) return

  let loaded=false
  let attempts=0

  const interval=setInterval(()=>{

    if(loaded) return

    const d=dates[index]
    if(!d) return

    const s={}

    for(const r of allRainfall){

      if(r.date===d){

        const k=r.district
          .toLowerCase()
          .replace(/\s+/g,'')
          .replace(/-/g,'')

        s[k]=r.rainfall_mm

      }

    }

    if(Object.keys(s).length){

      loaded=true
      setSlice(s)

      if(viewCyclone && cycloneTrack[d]){

        setViewCyclone(false)

        setTimeout(()=>setViewCyclone(true),30)

      }

      clearInterval(interval)

    }

    attempts++

    if(attempts>15) clearInterval(interval)

  },80)

  return()=>clearInterval(interval)

},[dates,allRainfall,cycloneTrack])

  useEffect(()=>{
    if(mode==="spread"){
      setViewCyclone(false)
    }
  },[mode])

  useEffect(()=>{

    if(!dates.length || mode==="spread") return

    const d=dates[index]
    let s={}

    const data=mode==="rainfall"?allRainfall:allFlood

    for(const r of data){

      if(r.date===d){

        const k=r.district
          .toLowerCase()
          .replace(/\s+/g,'')
          .replace(/-/g,'')

        s[k]=mode==="rainfall"
          ? r.rainfall_mm
          : r.flood_intensity

      }

    }

    setSlice(s)

  },[index,dates,allRainfall,allFlood,mode])


  if(loading || !dates.length)
  return <div>Loading...</div>

  return (

    <div style={{
      height:'calc(100vh - 56px)',
      display:'flex',
      flexDirection:'column'
    }}>

      <MapHeader
        meta={meta}
        navigate={navigate}
        mode={mode}
        setMode={setMode}
      />

      <div style={{flex:1,display:'flex'}}>

        <div style={{flex:1,position:'relative'}}>

          <DistrictMap
            geojson={geojson}
            rainfallData={slice}
            selectedDistrict={selectedDistrict}
            onDistrictClick={handleDistrictClick}
            mode={mode}
            sourceDistrict={sourceDistrict}
            targetDistrict={targetDistrict}
            cycloneTrack={cycloneTrack}
            currentDate={dates[index]}
            viewCyclone={viewCyclone}
            graph={graph}
            spreadType={spreadType}
          />

          {mode !== "spread" && (
            <div style={{
              position:'absolute',
              top:'1rem',
              right:'1rem',
              zIndex:1000,
            }}>
              <RainfallLegend mode={mode}/>
            </div>
          )}

        </div>

        <div style={{
          width:300,
          borderLeft:'1px solid #1a2a42',
          padding:'1rem'
        }}>

          {mode !== "spread" && (
            <TimelineSlider
              dates={dates}
              currentIndex={index}
              onIndexChange={setIndex}
              viewCyclone={viewCyclone}
              setViewCyclone={setViewCyclone}
            />
          )}

          {mode === "spread" && (
            <DistrictSelector
              graph={graph}
              districtList={graphDistricts}
              spreadType={spreadType}
              setSpreadType={setSpreadType}
              sourceDistrict={sourceDistrict}
              setSourceDistrict={setSourceDistrict}
              targetDistrict={targetDistrict}
              setTargetDistrict={setTargetDistrict}
            />
          )}

        </div>

      </div>

    </div>
  )
}