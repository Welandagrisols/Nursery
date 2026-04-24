"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/contexts/role-context";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

interface StaffMember {
  id: string
  name: string
  role: string
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  sales: "Sales Staff",
  worker: "Farm Worker",
}

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-purple-600",
  manager: "bg-blue-600",
  sales: "bg-orange-500",
  worker: "bg-green-600",
}

interface Props {
  onBack: () => void
}

export function StaffPinLogin({ onBack }: Props) {
  const { loginStaff } = useRole()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await (supabase.from("vnms_staff") as any)
        .select("id, name, role")
        .eq("is_active", true)
        .order("name")
      setStaff(data ?? [])
      setFetching(false)
    })()
  }, [])

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4 || loading) return
    const newPin = pin + digit
    setPin(newPin)
    setError("")

    if (newPin.length === 4 && selected) {
      setLoading(true)
      const { error } = await loginStaff(selected.id, newPin)
      if (error) {
        setError(error)
        setPin("")
      }
      setLoading(false)
    }
  }

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1))
    setError("")
  }

  if (!selected) {
    return (
      <div className="space-y-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <p className="text-center font-bold text-gray-700 text-xl">Who are you?</p>

        {fetching ? (
          <p className="text-center text-gray-400 py-6">Loading staff...</p>
        ) : staff.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-gray-500 text-sm">No staff accounts set up yet.</p>
            <p className="text-gray-400 text-xs">Ask the owner to create staff accounts in Settings.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelected(s); setPin(""); setError("") }}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-green-50 rounded-2xl border border-gray-200 hover:border-green-300 transition-all active:scale-[0.98]"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0",
                  ROLE_COLOR[s.role] ?? "bg-gray-500"
                )}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800 text-lg leading-tight">{s.name}</p>
                  <p className="text-sm text-gray-500">{ROLE_LABEL[s.role] ?? s.role}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"]

  return (
    <div className="space-y-6">
      <button
        onClick={() => { setSelected(null); setPin(""); setError("") }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> Different person
      </button>

      <div className="text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3",
          ROLE_COLOR[selected.role] ?? "bg-gray-500"
        )}>
          {selected.name.charAt(0).toUpperCase()}
        </div>
        <p className="font-bold text-gray-800 text-xl leading-tight">{selected.name}</p>
        <p className="text-sm text-gray-500 mb-1">{ROLE_LABEL[selected.role] ?? selected.role}</p>
        <p className="text-sm text-gray-600 font-medium mt-3">Enter your 4-digit PIN</p>
      </div>

      {/* PIN dots */}
      <div className="flex justify-center gap-5">
        {[0,1,2,3].map(i => (
          <div key={i} className={cn(
            "w-5 h-5 rounded-full border-2 transition-all duration-150",
            i < pin.length ? "bg-green-600 border-green-600 scale-110" : "bg-white border-gray-300"
          )} />
        ))}
      </div>

      {error && (
        <p className="text-center text-red-500 text-sm font-semibold bg-red-50 py-2.5 rounded-xl">
          {error}
        </p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) => (
          k === "" ? <div key={i} /> :
          <button
            key={i}
            disabled={loading}
            onClick={() => k === "⌫" ? handleBackspace() : handleDigit(k)}
            className={cn(
              "h-16 rounded-2xl text-2xl font-bold transition-all active:scale-90 select-none",
              loading && "opacity-50 pointer-events-none",
              k === "⌫" ?"bg-gray-100 text-gray-500 hover:bg-gray-200" :"bg-gray-50 text-gray-800 hover:bg-green-50 hover:text-green-700 border border-gray-200 shadow-sm active:bg-green-100"
            )}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
