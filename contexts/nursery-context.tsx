"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

interface NurseryContextValue {
  nurseryName: string
  currency: string
  location: string
  initials: string
  saveProfile: (name: string, currency: string, location: string) => void
}

const NurseryContext = createContext<NurseryContextValue>({
  nurseryName: "My Nursery",
  currency: "Ksh",
  location: "",
  initials: "MN",
  saveProfile: () => {},
})

export function useNursery() {
  return useContext(NurseryContext)
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "NM"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function NurseryProvider({ children }: { children: ReactNode }) {
  const [nurseryName, setNurseryName] = useState("My Nursery")
  const [currency, setCurrency] = useState("Ksh")
  const [location, setLocation] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem("vnms_nursery_name")
    if (saved) setNurseryName(saved)
    const cur = localStorage.getItem("vnms_nursery_currency")
    if (cur) setCurrency(cur)
    const loc = localStorage.getItem("vnms_nursery_location")
    if (loc) setLocation(loc)
  }, [])

  const saveProfile = useCallback((name: string, cur: string, loc: string) => {
    localStorage.setItem("vnms_nursery_name", name)
    localStorage.setItem("vnms_nursery_currency", cur)
    localStorage.setItem("vnms_nursery_location", loc)
    setNurseryName(name)
    setCurrency(cur)
    setLocation(loc)
  }, [])

  return (
    <NurseryContext.Provider value={{
      nurseryName,
      currency,
      location,
      initials: getInitials(nurseryName),
      saveProfile,
    }}>
      {children}
    </NurseryContext.Provider>
  )
}
