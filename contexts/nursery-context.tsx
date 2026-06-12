"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

interface NurseryContextValue {
  nurseryName: string
  currency: string
  location: string
  phone: string
  tagline: string
  initials: string
  logoUrl: string
  saveProfile: (fields: {
    name: string
    currency: string
    location: string
    phone: string
    tagline: string
  }) => void
  saveLogo: (dataUrl: string) => void
  removeLogo: () => void
}

const NurseryContext = createContext<NurseryContextValue>({
  nurseryName: "My Nursery",
  currency: "Ksh",
  location: "",
  phone: "",
  tagline: "",
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
  const [phone, setPhone] = useState("")
  const [tagline, setTagline] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = (key: string) => localStorage.getItem(key) || ""
    const n = v("vnms_nursery_name"); if (n) setNurseryName(n)
    const c = v("vnms_nursery_currency"); if (c) setCurrency(c)
    const l = v("vnms_nursery_location"); if (l) setLocation(l)
    const p = v("vnms_nursery_phone"); if (p) setPhone(p)
    const t = v("vnms_nursery_tagline"); if (t) setTagline(t)
    const logo = v("vnms_nursery_logo"); if (logo) setLogoUrl(logo)
  }, [])

  const saveProfile = useCallback(({ name, currency: cur, location: loc, phone: ph, tagline: tl }: {
    name: string; currency: string; location: string; phone: string; tagline: string
  }) => {
    localStorage.setItem("vnms_nursery_name", name)
    localStorage.setItem("vnms_nursery_currency", cur)
    localStorage.setItem("vnms_nursery_location", loc)
    localStorage.setItem("vnms_nursery_phone", ph)
    localStorage.setItem("vnms_nursery_tagline", tl)
    setNurseryName(name)
    setCurrency(cur)
    setLocation(loc)
    setPhone(ph)
    setTagline(tl)
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
      nurseryName, currency, location, phone, tagline,
      initials: getInitials(nurseryName),
      logoUrl,
      saveProfile, saveLogo, removeLogo,
    }}>
      {children}
    </NurseryContext.Provider>
  )
}

/** Read a nursery field from localStorage — for standalone print/WhatsApp functions */
export function getNurseryField(key: "vnms_nursery_name" | "vnms_nursery_logo" | "vnms_nursery_phone" | "vnms_nursery_tagline"): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(key) || ""
}
