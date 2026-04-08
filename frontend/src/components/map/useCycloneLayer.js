import {useEffect,useRef} from 'react'

export default function useCycloneLayer({

  leafletMapRef,
  cycloneTrack,
  currentDate,
  viewCyclone

}){

  const overlayRef=useRef(null)

  useEffect(()=>{

    if(!leafletMapRef.current) return

    import('leaflet').then(L=>{

      const map=leafletMapRef.current


      /*
      ensure top pane exists
      */

      if(!map.getPane("cyclonePane")){

        const pane = map.createPane("cyclonePane")

        pane.style.zIndex = 1000
      }


      /*
      remove previous cyclone
      */

      if(overlayRef.current){

        map.removeLayer(overlayRef.current)

        overlayRef.current=null
      }


      if(!viewCyclone) return


      const data=cycloneTrack?.[currentDate]

      if(!data) return


      const {lat,lon,intensity=1}=data


      /*
      base cyclone size in meters
      */

      const baseRadius=120000


      /*
      scale using intensity (1–7)
      */

      const radius=baseRadius * intensity

      console.log(currentDate,intensity,radius)


      /*
      convert meters → lat/lon bounds
      */

      const earthRadius=6378137

      const dLat=(radius/earthRadius)*(180/Math.PI)

      const dLon=
        (radius/(earthRadius*Math.cos(lat*Math.PI/180)))
        *(180/Math.PI)


      const bounds=[

        [lat-dLat, lon-dLon],
        [lat+dLat, lon+dLon]

      ]


      /*
      image overlay
      */

      const overlay=L.imageOverlay(

        "/images/cyclone.svg",

        bounds,

        {

          opacity:0.25,
          interactive:false,
          pane:"cyclonePane"

        }

      ).addTo(map)


      overlayRef.current=overlay

    })

  },[cycloneTrack,currentDate,viewCyclone])

}