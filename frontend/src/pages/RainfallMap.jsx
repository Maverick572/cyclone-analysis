import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import DistrictMap from "../components/DistrictMap";
import TimelineSlider from "../components/TimelineSlider";
import RainfallLegend from "../components/Legend";
import MapHeader from "../components/MapHeader";
import useRainfallData from "../components/useRainfallData";

const CYCLONE_META = {
  amphan: {
    name: "Cyclone Amphan",
    color: "#00d4ff",
  },
};

export default function RainfallMap() {
  const { cyclone } = useParams();
  const navigate = useNavigate();

  const meta = CYCLONE_META[cyclone];

  const { geojson, allRainfall, allFlood, dates, loading } = useRainfallData(cyclone);

  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState("rainfall");
  const [slice, setSlice] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtInfo, setDistrictInfo] = useState(null);

  const handleDistrictClick = (district, value) => {
    setSelectedDistrict(district);
    setDistrictInfo({ district, value });
  };

  useEffect(() => {
    if (!dates.length) return;

    const d = dates[index];
    let s = {};
    const data = mode === "rainfall" ? allRainfall : allFlood;

    for (const r of data) {
      if (r.date === d) {
        const k = r.district
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/-/g, "");

        s[k] = mode === "rainfall" ? r.rainfall_mm : r.flood_intensity;
      }
    }

    setSlice(s);
  }, [index, dates, allRainfall, allFlood, mode]);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>
      <MapHeader 
        meta={meta} 
        navigate={navigate} 
        mode={mode} 
        setMode={setMode} 
      />

      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <DistrictMap
            geojson={geojson}
            rainfallData={slice}
            selectedDistrict={selectedDistrict}
            onDistrictClick={handleDistrictClick}
            mode={mode}
          />

          <div
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              zIndex: 1000,
            }}
          >
            <RainfallLegend mode={mode} />
          </div>
        </div>

        <div
          style={{
            width: 300,
            borderLeft: "1px solid #1a2a42",
            padding: "1rem",
          }}
        >
          <TimelineSlider
            dates={dates}
            currentIndex={index}
            onIndexChange={setIndex}
          />
        </div>
      </div>
    </div>
  );
}