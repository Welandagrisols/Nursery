# Grace Harvest Seedlings

Grace Harvest Seedlings is a comprehensive vegetable nursery management application built as a Progressive Web App (PWA). The system manages seedling inventory, sales, customers, tasks, and operations for a vegetable seedling nursery. It features offline functionality and email notifications for business operations.

## Architecture

- **Framework**: Next.js 14 (App Router) with React 18
- **Styling**: Tailwind CSS + Shadcn UI (Radix UI components)
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **PWA**: Service Worker (`public/sw.js`) + Web App Manifest (`public/manifest.json`)
- **Offline Support**: IndexedDB via `lib/offline-storage.ts`
- **Charts**: Recharts for financial/inventory reports
- **Excel Export**: xlsx library

## Project Structure

- `app/` - Next.js App Router pages and layout
- `components/` - React components (feature tabs + UI primitives in `ui/`)
- `lib/` - Supabase client, offline storage, email notifications, image upload
- `contexts/` - Auth context provider
- `public/` - Static assets, PWA manifest, service worker
- `types/` - TypeScript types for Supabase schema

## Key Features

- **Seedling Inventory** — Track vegetable seedling batches (Leafy Greens, Fruiting Vegetables, Root Vegetables, Brassicas, Legumes, Herbs, Alliums, Cucurbits) with quantity, cost, and ready-for-sale status
- **Sales Tracking** — Record seedling sales linked to customers and inventory
- **Customer CRM** — Manage buyer contacts and purchase history
- **Task Management** — Operational tasks (watering, seeding, transplanting, pest control, etc.)
- **Reports** — Revenue, cost, and inventory trend visualizations
- **Offline Sync** — Works offline with data sync when reconnected
- **Demo Mode** — Falls back to demo data if Supabase is not configured

## Database Architecture — IMPORTANT

This app shares a Supabase instance with the existing **LittleForest** tree nursery app.

**RULE: Never touch the original LittleForest tables** (`plants`, `sales`, `customers`, `tasks`, `inventory`, `task_consumables`, etc.).

All Grace Harvest Seedlings tables use the `vnms_` prefix:

| vnms_ Table | Purpose |
|---|---|
| `vnms_batches` | Seedling inventory batches (Bed/Row/Tray location) |
| `vnms_customers` | Customer CRM |
| `vnms_sales` | Sales transactions |
| `vnms_staff_tasks` | Staff task management |
| `vnms_task_consumables` | Consumable usage per task |
| `vnms_sachets` | Seed sachets/packets |
| `vnms_batch_sachets` | Batch ↔ sachet junction |
| `vnms_germination_counts` | Germination tracking per batch |
| `vnms_prices` | Price list |
| `vnms_costs` | Cost records |
| `vnms_stock_alerts` | Low-stock alerts |
| `vnms_inventory_inputs` | Raw material inputs (soil, trays, etc.) |

Run `scripts/vnms-tables-migration.sql` in Supabase SQL Editor to create all tables.

Supabase Auth (users/profiles) is shared between both apps. New roles for Grace Harvest Seedlings should be added without changing existing LittleForest role values.

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon/public key

## Running the App

- Development: `npm run dev` (port 5000)
- Build: `npm run build`
- Start: `npm run start`
