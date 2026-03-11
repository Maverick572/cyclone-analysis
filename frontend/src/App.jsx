import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import CyclonePage from './pages/CyclonePage.jsx'
import RainfallMap from './pages/RainfallMap.jsx'
import AnalysisDashboard from './pages/AnalysisDashboard.jsx'
import NavBar from './components/NavBar.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cyclones" element={<CyclonePage />} />
        <Route path="/map/:cyclone" element={<RainfallMap />} />
        <Route path="/analysis/:cyclone" element={<AnalysisDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
