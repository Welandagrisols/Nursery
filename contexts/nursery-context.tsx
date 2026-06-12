"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

interface NurseryContextValue {
  nurseryName: string
  currency: string
  location: string
  initials: string
  logoUrl: string       // base64 data URL or ""
  saveProfile: (name: string, currency: string, location: string) => void
  saveLogo: (dataUrl: string) => void
  removeLogo: () => void
}

const NurseryContext = createContext<NurseryContextValue>({
  nurseryName: "My Nursery",
  currency: "Ksh",
  location: "",
  initials: "MN",
  logoUrl: "",
  saveProfile: () => {},
  saveLogo: () => {},
  removeLogo: () => {},
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
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem("vnms_nursery_name")
    if (saved) setNurseryName(saved)
    const cur = localStorage.getItem("vnms_nursery_currency")
    if (cur) setCurrency(cur)
    const loc = localStorage.getItem("vnms_nursery_location")
    if (loc) setLocation(loc)
    const logo = localStorage.getItem("vnms_nursery_logo")
    if (logo) setLogoUrl(logo)
  }, [])

  const saveProfile = useCallback((name: string, cur: string, loc: string) => {
    localStorage.setItem("vnms_nursery_name", name)
    localStorage.setItem("vnms_nursery_currency", cur)
    localStorage.setItem("vnms_nursery_location", loc)
    setNurseryName(name)
    setCurrency(cur)
    setLocation(loc)
  }, [])

  const saveLogo = useCallback((dataUrl: string) => {
    localStorage.setItem("vnms_nursery_logo", dataUrl)
    setLogoUrl(dataUrl)
  }, [])

  const removeLogo = useCallback(() => {
    localStorage.removeItem("vnms_nursery_logo")
    setLogoUrl("")
  }, [])

  return (
    <NurseryContext.Provider value={{
      nurseryName,
      currency,
      location,
      initials: getInitials(nurseryName),
      logoUrl,
      saveProfile,
      saveLogo,
      removeLogo,
    }}>
      {children}
    </NurseryContext.Provider>
  )
}

/** Read logo from localStorage — for use inside non-component functions (print/WhatsApp) */
export function getNurseryLogoFromStorage(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("vnms_nursery_logo") || ""
}

/** Read nursery name from localStorage — for use inside non-component functions */
export function getNurseryNameFromStorage(): string {
  if (typeof window === "undefined") return "My Nursery"
  return localStorage.getItem("vnms_nursery_name") || "My Nursery"
}
