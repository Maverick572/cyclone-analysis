import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home.jsx'
import RainfallMap from './pages/RainfallMap.jsx'

import NavBar from './components/NavBar.jsx'


export default function App() {

  return (

    <BrowserRouter>

      <NavBar />

      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/map/:cyclone" element={<RainfallMap />} />
      </Routes>

    </BrowserRouter>

  )

}