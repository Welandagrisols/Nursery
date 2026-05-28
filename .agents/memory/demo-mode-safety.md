---
name: Demo Mode Safety
description: How demo mode works and what breaks when Supabase credentials are missing
---

# Demo Mode Safety in Grace Harvest

## The Rule
`lib/supabase.ts` exports `isDemoMode` — every component that calls `supabase.from(...)` or `supabase.rpc(...)` must guard with `if (isDemoMode) { return demoData }` before making any network call.

**Why:** The placeholder URL `https://placeholder.supabase.co` causes network errors, not clean 404s. Unguarded calls hang or crash.

## Auth Loading State
- `AuthProvider` must initialize `loading` as `!isDemoMode` (not always `true`).
- If `loading` starts as `true` in demo mode, the `AuthGuard` shows "Authenticating..." forever until the useEffect fires.
- Fix: `useState(!isDemoMode)` and short-circuit useEffect with `if (isDemoMode) { setLoading(false); return }`.

## How to Apply
1. Check `isDemoMode` at the top of every `useEffect` that calls Supabase.
2. For staff/PIN login in demo mode: demo staff list is exported from `contexts/role-context.tsx` as `DEMO_STAFF`, demo PIN is `1234`.
3. Owner PIN in demo mode uses `localStorage.getItem("vnms_owner_pin")` fallback, default `"1234"`.
4. Settings/notification preferences persist to `localStorage` always (not just Supabase).

## PWA Icons
Icons `public/icon-192x192.png` and `public/icon-512x512.png` are generated via Node.js pure-PNG script (no external deps). Regenerate if lost.
