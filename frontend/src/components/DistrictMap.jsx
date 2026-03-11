import React, { useEffect, useRef, useState } from 'react'

// Color scale for rainfall intensity
function rainfallColor(mm) {
  if (mm === null || mm === undefined || mm < 0.1) return '#0f1929'
  if (mm < 1) return '#fef9c3'
  if (mm < 5) return '#fed7aa'
  if (mm < 20) return '#fb923c'
  if (mm < 50) return '#dc2626'
  if (mm < 100) return '#991b1b'
  return '#7f1d1d'
}

function rainfallOpacity(mm) {
  if (!mm || mm < 0.1) return 0.2
  if (mm < 5) return 0.5
  if (mm < 20) return 0.65
  if (mm < 50) return 0.75
  if (mm < 100) return 0.85
  return 0.95
}

export default function DistrictMap({ geojson, rainfallData, selectedDistrict, onDistrictClick }) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (leafletMapRef.current || !mapRef.current) return
    import('leaflet').then(L => {
      const map = L.map(mapRef.current, {
        center: [20.5, 80.5],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      })

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      leafletMapRef.current = map
    })

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  // Update GeoJSON layer when data changes
  useEffect(() => {
    if (!leafletMapRef.current || !geojson) return
    import('leaflet').then(L => {
      const map = leafletMapRef.current
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }

      const layer = L.geoJSON(geojson, {
        style: (feature) => {
          const did = feature.properties.district_id
          const mm = rainfallData ? (rainfallData[did] ?? 0) : 0
          return {
            fillColor: rainfallColor(mm),
            fillOpacity: rainfallOpacity(mm),
            color: '#243650',
            weight: 0.5,
          }
        },
        onEachFeature: (feature, layer) => {
          const did = feature.properties.district_id
          const state = feature.properties.NAME_1
          const district = feature.properties.NAME_2
          const mm = rainfallData ? (rainfallData[did] ?? 0) : 0

          layer.on({
            click: () => onDistrictClick && onDistrictClick(did, mm),
            mouseover: (e) => {
              e.target.setStyle({ weight: 2, color: '#00d4ff' })
              const popup = L.popup({ closeButton: false, offset: [0, -5] })
                .setLatLng(e.latlng)
                .setContent(`
                  <div style="font-family: Space Mono, monospace; font-size: 0.7rem; min-width: 160px;">
                    <div style="color: #00d4ff; font-weight: bold; margin-bottom: 4px;">${district}</div>
                    <div style="color: #8ba4cc; margin-bottom: 6px;">${state}</div>
                    <div style="color: #e8f0ff; font-size: 0.85rem;">${mm.toFixed(1)} <span style="color: #4a6080">mm/day</span></div>
                  </div>
                `)
                .openOn(map)
              layer._popup = popup
            },
            mouseout: (e) => {
              const isSelected = did === selectedDistrict
              e.target.setStyle({
                weight: isSelected ? 2 : 0.5,
                color: isSelected ? '#00d4ff' : '#243650',
              })
              map.closePopup()
            },
          })
        },
      }).addTo(map)

      layerRef.current = layer
    })
  }, [geojson, rainfallData])

  // Highlight selected district
  useEffect(() => {
    if (!layerRef.current || !selectedDistrict) return
    layerRef.current.eachLayer(layer => {
      const did = layer.feature?.properties?.district_id
      if (did === selectedDistrict) {
        layer.setStyle({ weight: 2.5, color: '#ffffff' })
      }
    })
  }, [selectedDistrict])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', borderRadius: '8px' }}
    />
  )
}
