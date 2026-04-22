"use client"

import React, { useEffect, useState } from "react"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"

const geoUrl = "/africa.geojson"

const OPERATING_COUNTRIES = ["Kenya", "Rwanda", "Ghana"]

export function AfricaMap() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-[400px] w-full animate-pulse bg-[#e9f3ed] rounded-xl" />

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 350,
          center: [15, 0] // Center roughly on Africa
        }}
        width={800}
        height={600}
        style={{ width: "100%", height: "auto", maxHeight: "500px" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isOperating = OPERATING_COUNTRIES.includes(geo.properties.name)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isOperating ? "#00ab00" : "#e9f3ed"}
                  stroke="#ffffff"
                  strokeWidth={1}
                  style={{
                    default: { outline: "none", transition: "all 0.3s" },
                    hover: { fill: isOperating ? "#0a2540" : "#d6e4df", outline: "none" },
                    pressed: { outline: "none" }
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  )
}
