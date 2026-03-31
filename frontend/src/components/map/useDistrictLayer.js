import { useEffect, useRef } from "react"
import { valueColor } from "./valueColor"

export default function useDistrictLayer({

  leafletMapRef,
  geojson,
  rainfallData,
  selectedDistrict,
  onDistrictClick,
  mode

}) {

  const layerRef = useRef(null)

  useEffect(() => {

    if (!leafletMapRef.current || !geojson) return

    import("leaflet").then(L => {

      const map = leafletMapRef.current


      /*
      remove previous layer
      */

      if (layerRef.current)
        map.removeLayer(layerRef.current)


      /*
      create district layer
      */

      const layer = L.geoJSON(

        geojson,

        {

          style: (feature) => {

            const did = feature.properties.NAME_2
              ?.toLowerCase()
              .replace(/\s+/g, "")
              .replace(/-/g, "")

            const v = rainfallData?.[did] ?? 0

            return {

              fillColor: valueColor(v, mode),

              fillOpacity: 1,

              color: "#243650",

              weight: 0.5

            }

          },


          onEachFeature: (feature, layer) => {


            const rawDistrict = feature.properties.NAME_2

            const district = rawDistrict.replace(
              /([a-z])([A-Z])/g,
              "$1 $2"
            )


            const state = feature.properties.NAME_1


            const did = rawDistrict
              ?.toLowerCase()
              .replace(/\s+/g, "")
              .replace(/-/g, "")


            const v = rainfallData?.[did] ?? 0


            const unit =

              mode === "flood"
                ? "intensity"
                : "mm/day"


            const valueText =

              mode === "flood"
                ? v.toFixed(2)
                : v.toFixed(1)



            layer.on({

              click: () =>

                onDistrictClick?.(did, v),


              mouseover: (e) => {


                /*
                highlight border
                */

                e.target.setStyle({

                  weight: 2,

                  color: "#00d4ff"

                })


                /*
                popup label
                */

                const popup = L.popup({

                  closeButton: false,

                  offset: [0, -5]

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


                layer._popup = popup

              },


              mouseout: (e) => {


                const isSelected =
                  did === selectedDistrict


                e.target.setStyle({

                  weight: isSelected ? 2.5 : 0.5,

                  color:

                    isSelected
                      ? "#ffffff"
                      : "#243650"

                })


                map.closePopup()

              }

            })

          }

        }

      ).addTo(map)


      layerRef.current = layer

    })

  }, [

    geojson,
    rainfallData,
    mode,
    selectedDistrict

  ])


  return layerRef

}