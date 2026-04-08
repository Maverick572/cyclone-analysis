import {useRef} from 'react'

import useLeafletMap from './useLeafletMap'
import useDistrictLayer from './useDistrictLayer'
import useCycloneLayer from './useCycloneLayer'
import useSpreadLayer from './useSpreadLayer'

import './mapStyles.css'

export default function DistrictMap(props){

  const mapRef=useRef(null)

  const leafletMapRef=useLeafletMap(mapRef)

  useDistrictLayer({
    leafletMapRef,
    ...props
  })

  useCycloneLayer({
    leafletMapRef,
    ...props
  })

  useSpreadLayer({
    leafletMapRef,
    ...props
  })

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