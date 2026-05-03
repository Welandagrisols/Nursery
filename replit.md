# Grace Harvest Seedlings

Grace Harvest Seedlings is a comprehensive vegetable seedling nursery management PWA. It manages the full seed-to-sale lifecycle: nursery layout, batch/inventory management, POS, receipts, WhatsApp broadcasts, creditors, staff tasks, RBAC, reports, and comms. Touch/tablet-first design with bottom nav.

## Architecture

- **Framework**: Next.js 14 (App Router) with React 18
- **Styling**: Tailwind CSS + Shadcn UI (Radix UI components)
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **PWA**: Service Worker (`public/sw.js`) + Web App Manifest (`public/manifest.json`)
- **Offline Support**: IndexedDB via `lib/offline-storage.ts`
- **Charts**: Recharts for financial/inventory reports
- **Excel Export**: xlsx library

## Project Structure

- `app/` — Next.js App Router pages and layout
- `components/` — React components (feature tabs + UI primitives in `ui/`)
- `lib/` — Supabase client, offline storage, email notifications, image upload
- `contexts/` — Auth context provider
- `public/` — Static assets, PWA manifest, service worker
- `types/` — TypeScript types for Supabase schema
- `scripts/` — SQL migration scripts (all vnms_ tables)

## Key Features

- **Nursery Layout** — Visual bed/row/tray map from `vnms_nursery_beds/rows/trays/tray_assignments`. Click any tray for detail panel. Add beds/rows/trays from UI.
- **Seedling Inventory** — Batch tracking with lifecycle stages: received → planted → germination → ready → selling → sold_out. Quick lifecycle buttons on each card.
- **Sachets** — Seed sachet tracking (supplier, germination %, cost) linked to batches.
- **POS** — `pos-modal.tsx` — customer selector, batch selector, quantity/price calc, M-Pesa/Cash/Credit/Bank, receipt (RCP-NNNNN), Print + WhatsApp send.
- **Sales Tracking** — Record sales linked to customers and inventory.
- **Customer CRM** — Manage buyer contacts, partial payments, creditor balances.
- **Task Management** — Staff tasks with clock in/out, labor hours, labor cost, batch assignment.
- **Reports** — Profitability per batch, daily/weekly sales breakdown (14-day bar chart), supplier leaderboard by germination rate.
- **Comms Hub** — 4 tabs: WhatsApp Broadcast, Price List catalogue (copy/print), Social Links, History log.
- **Settings** — Pricing tiers with PIN-protected updates, nursery profile, owner PIN management.
- **Dashboard** — Today's revenue widget, staff attendance card (today's clock-in/out), stock alerts banner, sales trend chart, best sellers, top customers, category pie.
- **Offline Sync** — Works offline with data sync when reconnected.
- **Demo Mode** — Falls back to demo data if Supabase is not configured.

## Database Architecture — IMPORTANT

This app shares a Supabase instance with the existing **LittleForest** tree nursery app.

**RULE: Never touch the original LittleForest tables** (`plants`, `sales`, `customers`, `tasks`, `inventory`, `task_consumables`, etc.).

All Grace Harvest Seedlings tables use the `vnms_` prefix:

| vnms_ Table | Purpose |
|---|---|
| `vnms_batches` | Seedling inventory batches — full lifecycle tracking |
| `vnms_customers` | Customer CRM |
| `vnms_sales` | Sales transactions with receipt numbers |
| `vnms_staff_tasks` | Staff task management with clock in/out |
| `vnms_task_consumables` | Consumable usage per task |
| `vnms_sachets` | Seed sachets/packets with germination tracking |
| `vnms_batch_sachets` | Batch ↔ sachet junction |
| `vnms_germination_counts` | Germination count records per batch |
| `vnms_nursery_beds` | Physical nursery beds |
| `vnms_nursery_rows` | Rows within beds |
| `vnms_nursery_trays` | Trays within rows |
| `vnms_tray_assignments` | Batch assignments to trays |
| `vnms_prices` | Price tier list (Walk-in / Wholesale / Large Farm) |
| `vnms_price_changes` | Price change audit log |
| `vnms_costs` | General cost records per batch |
| `vnms_stock_alerts` | Stock gap alerts (resolved/unresolved) |
| `vnms_broadcast_messages` | WhatsApp broadcast history |
| `vnms_inventory_inputs` | Raw material inputs (soil, trays, etc.) |

**Run `scripts/vnms-full-migration.sql` in Supabase SQL Editor** to create all tables with correct constraints, RLS policies, and seed pricing data.

### Lifecycle Status Values (vnms_batches.lifecycle_status)
`received` → `planted` → `germination` → `ready` → `selling` → `sold_out`
(Note: the DB CHECK constraint matches these exact values — not 'germinating')

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon/public key

## Running the App

- Development: `npm run dev` (port 5000)
- Build: `npm run build`
- Start: `npm run start`
