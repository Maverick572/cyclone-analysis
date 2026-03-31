import { useState,useEffect } from "react"
import { useParams,useNavigate } from "react-router-dom"

import DistrictMap from "../components/map/DistrictMap"
import TimelineSlider from "../components/TimelineSlider"
import RainfallLegend from "../components/Legend"
import MapHeader from "../components/MapHeader"
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
    loading
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

  const districtList = geojson?.features
    ?.map(f => f?.properties?.district)
    ?.filter(Boolean)
    ?.map(d =>
      d
        .toLowerCase()
        .replace(/\s+/g,'')
        .replace(/-/g,'')
    )
    ?.sort() || []

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


  if(loading)return <div>Loading...</div>


  return(

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
        />

        <div style={{
          position:'absolute',
          top:'1rem',
          right:'1rem',
          zIndex:1000,
        }}>
          <RainfallLegend mode={mode}/>
        </div>

      </div>

      <div style={{
        width:300,
        borderLeft:'1px solid #1a2a42',
        padding:'1rem'
      }}>

        {mode!=="spread" && (

          <TimelineSlider
            dates={dates}
            currentIndex={index}
            onIndexChange={setIndex}
            viewCyclone={viewCyclone}
            setViewCyclone={setViewCyclone}
          />

        )}


        {mode==="spread" && (

          <div style={{
            display:'flex',
            flexDirection:'column',
            gap:'1rem'
          }}>

            <div style={{display:'flex',gap:'0.5rem'}}>

              <button
                onClick={()=>setSpreadType("source")}
                style={{
                  ...dropdownStyle,
                  cursor:'pointer',
                  border:spreadType==="source"
                    ?'1px solid #00d4ff'
                    :'1px solid #1a2a42',
                  color:spreadType==="source"
                    ?'#00d4ff'
                    :'#8ba4cc'
                }}
              >
                SOURCE
              </button>

              <button
                onClick={()=>setSpreadType("target")}
                style={{
                  ...dropdownStyle,
                  cursor:'pointer',
                  border:spreadType==="target"
                    ?'1px solid #00d4ff'
                    :'1px solid #1a2a42',
                  color:spreadType==="target"
                    ?'#00d4ff'
                    :'#8ba4cc'
                }}
              >
                TARGET
              </button>

            </div>


            {spreadType==="source" && (

              <>
                <div style={{color:'#8ba4cc',fontSize:'0.7rem'}}>
                  SOURCE DISTRICT
                </div>

                <select
                  value={sourceDistrict}
                  onChange={e=>{
                    setSourceDistrict(e.target.value)
                    setTargetDistrict("")
                  }}
                  style={dropdownStyle}
                >

                  <option value="">select</option>

                  {districtList.map(d=>
                    <option key={d} value={d}>{d}</option>
                  )}

                </select>
              </>
            )}



            {spreadType==="target" && (

              <>
                <div style={{color:'#8ba4cc',fontSize:'0.7rem'}}>
                  TARGET DISTRICT
                </div>

                <select
                  value={targetDistrict}
                  onChange={e=>{
                    setTargetDistrict(e.target.value)
                    setSourceDistrict("")
                  }}
                  style={dropdownStyle}
                >

                  <option value="">select</option>

                  {districtList.map(d=>
                    <option key={d} value={d}>{d}</option>
                  )}

                </select>
              </>
            )}

          </div>

        )}

      </div>

    </div>

  </div>

  )

}