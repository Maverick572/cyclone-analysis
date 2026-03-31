import {useEffect,useRef} from 'react'

export default function useCycloneLayer({

  leafletMapRef,
  cycloneTrack,
  currentDate,
  viewCyclone

}){

  const cycloneMarkerRef=useRef(null)

  useEffect(()=>{

    if(!leafletMapRef.current) return

    import('leaflet').then(L=>{

      const map=leafletMapRef.current

      if(!viewCyclone){

        cycloneMarkerRef.current?.marker.remove()
        cycloneMarkerRef.current?.ring.remove()

        cycloneMarkerRef.current=null

        return
      }

      const data=cycloneTrack?.[currentDate]

      if(!data) return

      const {lat,lon}=data


      /*
      SCALE BASED ON ZOOM
      */

      const getSizeFromZoom=(zoom)=>{

        const baseSize=100       // size at zoom 5
        const scale=Math.pow(1.35, zoom-5)

        return baseSize*scale

      }

      const getRadiusFromZoom=(zoom)=>{

        const baseRadius=90000   // meters at zoom 5
        const scale=Math.pow(1.35, zoom-5)

        return baseRadius*scale

      }


      /*
      CREATE first time
      */

      if(!cycloneMarkerRef.current){

        const zoom=map.getZoom()

        const iconSize=getSizeFromZoom(zoom)

        const icon=L.divIcon({

          className:"cyclone-wrapper",

          html:`<div class="cyclone-icon"></div>`,

          iconSize:[iconSize,iconSize],
          iconAnchor:[iconSize/2,iconSize/2]

        })


        const marker=L.marker(
          [lat,lon],
          {icon}
        ).addTo(map)


        const ring=L.circle(
          [lat,lon],
          {

            radius:getRadiusFromZoom(zoom),

            stroke:false,

            fillColor:'#38bdf8',

            fillOpacity:0.025

          }
        ).addTo(map)


        cycloneMarkerRef.current={marker,ring}


        /*
        update size on zoom
        */

        map.on("zoomend",()=>{

          const z=map.getZoom()

          const newSize=getSizeFromZoom(z)

          const el=marker.getElement()?.querySelector(".cyclone-icon")

          if(el){

            el.style.width=`${newSize}px`
            el.style.height=`${newSize}px`

          }

          ring.setRadius(getRadiusFromZoom(z))

        })

      }


      /*
      update position
      */

      cycloneMarkerRef.current.marker.setLatLng([lat,lon])

      cycloneMarkerRef.current.ring.setLatLng([lat,lon])

    })

  },[cycloneTrack,currentDate,viewCyclone])

}