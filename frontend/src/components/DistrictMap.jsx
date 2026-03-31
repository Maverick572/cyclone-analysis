import React,{useEffect,useRef} from 'react'

function valueColor(v,mode){

  if(v==null||v<=0)return 'transparent'

  if(mode==="flood"){

    if(v<0.25)return '#e0f2fe'
    if(v<0.5)return '#bae6fd'
    if(v<0.75)return '#7dd3fc'
    if(v<1.0)return '#38bdf8'
    if(v<1.5)return '#0ea5e9'
    if(v<2.0)return '#2563eb'
    return '#1e3a8a'

  }

  if(v<1)return '#fef9c3'
  if(v<5)return '#fed7aa'
  if(v<20)return '#fb923c'
  if(v<50)return '#dc2626'
  if(v<100)return '#991b1b'
  return '#7f1d1d'
}

export default function DistrictMap({

  geojson,
  rainfallData,
  selectedDistrict,
  onDistrictClick,
  mode

}){

  const mapRef=useRef(null)
  const leafletMapRef=useRef(null)
  const layerRef=useRef(null)


  useEffect(()=>{

    if(!mapRef.current)return

    import('leaflet').then(L=>{

      if(leafletMapRef.current){

        leafletMapRef.current.remove()
        leafletMapRef.current=null

      }

      const map=L.map(mapRef.current,{

        center:[20.5,80.5],
        zoom:5,
        zoomControl:true,
        attributionControl:false

      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        {maxZoom:19}
      ).addTo(map)

      leafletMapRef.current=map

    })

    return ()=>{

      if(leafletMapRef.current){

        leafletMapRef.current.remove()
        leafletMapRef.current=null

      }

    }

  },[])



  useEffect(()=>{

    if(!leafletMapRef.current||!geojson)return

    import('leaflet').then(L=>{

      const map=leafletMapRef.current

      if(layerRef.current)
        map.removeLayer(layerRef.current)


      const layer=L.geoJSON(geojson,{

        style:(feature)=>{

          const did=feature.properties.NAME_2
            ?.toLowerCase()
            .replace(/\s+/g,'')
            .replace(/-/g,'')

          const v=rainfallData?.[did]??0

          return{

            fillColor:valueColor(v,mode),
            fillOpacity:1,

            color:'#243650',
            weight:0.5

          }

        },


        onEachFeature:(feature,layer)=>{

          const did=feature.properties.NAME_2
            ?.toLowerCase()
            .replace(/\s+/g,'')
            .replace(/-/g,'')

          const state=feature.properties.NAME_1

          const rawDistrict=feature.properties.NAME_2

          const district=rawDistrict
            .replace(/([a-z])([A-Z])/g,'$1 $2')


          const v=rainfallData?.[did]??0


          const unit=
            mode==="flood"
              ? "intensity"
              : "mm/day"


          const valueText=
            mode==="flood"
              ? v.toFixed(2)
              : v.toFixed(1)


          layer.on({

            click:()=>onDistrictClick&&onDistrictClick(did,v),


            mouseover:(e)=>{

              e.target.setStyle({

                weight:2,
                color:'#00d4ff'

              })


              const popup=L.popup({

                closeButton:false,
                offset:[0,-5]

              })
              .setLatLng(e.latlng)
              .setContent(`

                <div style="font-family:Space Mono;font-size:0.7rem;min-width:160px;">

                  <div style="color:#00d4ff;font-weight:bold;margin-bottom:4px;">
                    ${district}
                  </div>

                  <div style="color:#8ba4cc;margin-bottom:6px;">
                    ${state}
                  </div>

                  <div style="color:#e8f0ff;font-size:0.85rem;">
                    ${valueText}
                    <span style="color:#4a6080">
                      ${unit}
                    </span>
                  </div>

                </div>

              `)
              .openOn(map)

              layer._popup=popup

            },


            mouseout:(e)=>{

              const isSelected=
                did===selectedDistrict


              e.target.setStyle({

                weight:isSelected?2:0.5,
                color:isSelected?'#00d4ff':'#243650'

              })

              map.closePopup()

            }

          })

        }

      }).addTo(map)


      layerRef.current=layer

    })

  },[geojson,rainfallData,mode])



  useEffect(()=>{

    if(!layerRef.current||!selectedDistrict)
      return


    layerRef.current.eachLayer(layer=>{

      const did=layer.feature?.properties?.NAME_2
        ?.toLowerCase()
        .replace(/\s+/g,'')
        .replace(/-/g,'')


      if(did===selectedDistrict){

        layer.setStyle({

          weight:2.5,
          color:'#ffffff'

        })

      }

    })

  },[selectedDistrict])



  return(

    <div

      ref={mapRef}

      style={{

        width:'100%',
        height:'100%',
        borderRadius:'8px'

      }}

    />

  )

}