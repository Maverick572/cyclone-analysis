import {useEffect,useRef} from 'react'

export default function useLeafletMap(mapRef){

  const leafletMapRef=useRef(null)

  useEffect(()=>{

    if(!mapRef.current) return

    import('leaflet').then(L=>{

      if(leafletMapRef.current){

        leafletMapRef.current.remove()
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
      leafletMapRef.current?.remove()
    }

  },[])

  return leafletMapRef
}