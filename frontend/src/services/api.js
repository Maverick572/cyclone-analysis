const BASE_URL = "http://localhost:8000"


// -----------------------------
// FLOOD INTENSITY
// -----------------------------

export async function getFloodIntensity(cyclone = "amphan") {

    const response = await fetch(
        `${BASE_URL}/flood-intensity/${cyclone}`
    )

    return await response.json()
}



export async function getFloodIntensityByDistrict(
    district,
    cyclone = "amphan"
) {

    const response = await fetch(
        `${BASE_URL}/flood-intensity/${cyclone}/${district}`
    )

    return await response.json()
}



// -----------------------------
// RAINFALL
// -----------------------------

export async function getRainfall(cyclone = "amphan") {

    const response = await fetch(
        `${BASE_URL}/rainfall/${cyclone}`
    )

    return await response.json()
}



export async function getRainfallByDistrict(
    district,
    cyclone = "amphan"
) {

    const response = await fetch(
        `${BASE_URL}/rainfall/${cyclone}/${district}`
    )

    return await response.json()
}



// -----------------------------
// SPATIOTEMPORAL GRAPH
// -----------------------------

export async function getGraph(cyclone = "amphan") {

    const response = await fetch(
        `${BASE_URL}/graph/${cyclone}`
    )

    return await response.json()
}

export async function getDistricts(cyclone) {
  const res = await fetch(
    `http://localhost:8000/districts/${cyclone}`
  )

  return res.json()
}


export async function getGraphFromDistrict(
    district,
    cyclone = "amphan"
) {

    const response = await fetch(
        `${BASE_URL}/graph/${cyclone}/${district}`
    )

    return await response.json()
}