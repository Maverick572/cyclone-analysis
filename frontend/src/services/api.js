const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// -----------------------------
// HELPER
// -----------------------------

async function fetchJSON(url) {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}


// -----------------------------
// FLOOD INTENSITY
// -----------------------------

export const getFloodIntensity = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/flood-intensity/${cyclone}`)

export const getFloodIntensityByDistrict = (district, cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/flood-intensity/${cyclone}/${district}`)


// -----------------------------
// RAINFALL
// -----------------------------

export const getRainfall = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/rainfall/${cyclone}`)

export const getRainfallByDistrict = (district, cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/rainfall/${cyclone}/${district}`)


// -----------------------------
// GRAPH
// -----------------------------

export const getGraph = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/graph/${cyclone}`)

export const getGraphFromDistrict = (district, cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/graph/${cyclone}/${district}`)


// -----------------------------
// DISTRICTS
// -----------------------------

export const getDistricts = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/districts/${cyclone}`)


// -----------------------------
// CYCLONE TRACK
// -----------------------------

export const getCycloneTrack = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/cyclone-track/${cyclone}`)


// -----------------------------
// FLOOD RISK
// -----------------------------

export const getFloodRisk = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/flood-risk/${cyclone}`)


// -----------------------------
// METADATA (no cyclone)
// -----------------------------

export const getDistrictMetadata = () =>
  fetchJSON(`${BASE_URL}/district-metadata`)

// -----------------------------
// INSIGHTS
// -----------------------------

export const getInsights = (cyclone = "amphan") =>
  fetchJSON(`${BASE_URL}/insights/${cyclone}`)