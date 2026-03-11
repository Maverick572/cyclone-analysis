import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

export const getCyclones = () => api.get('/cyclones').then(r => r.data)

export const getCycloneDates = (name) =>
  api.get(`/cyclones/${name}/dates`).then(r => r.data)

export const getRainfallForDate = (name, date) =>
  api.get(`/cyclones/${name}/rainfall/${date}`).then(r => r.data)

export const getDistrictTimeline = (name, district) =>
  api.get(`/cyclones/${name}/district/${encodeURIComponent(district)}`).then(r => r.data)

export const getCycloneAnalysis = (name) =>
  api.get(`/cyclones/${name}/analysis`).then(r => r.data)

export const getComparison = () =>
  api.get('/cyclones/comparison/all').then(r => r.data)

export const getDistricts = () =>
  api.get('/districts').then(r => r.data)

export const getGraphState = (name, date) =>
  api.get(`/cyclones/${name}/graph/${date}`).then(r => r.data)

export const getDistrictRisk = (districtId) =>
  api.get(`/graph/district/${encodeURIComponent(districtId)}/risk`).then(r => r.data)

export default api