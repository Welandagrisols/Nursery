---
name: VNMS Feature Patterns
description: Conventions for querying vnms_ tables, handling missing tables gracefully, and UI patterns established across bookings/comms/creditors features.
---

## Graceful table-missing pattern
When querying optional tables (e.g. `vnms_batch_bookings`), always check `error.code === "42P01"` or `/does not exist/i.test(error.message)` and silently return empty data — never crash or show a DB error to the user.

**Why:** The bookings table is user-deployed via a SQL script. It may not exist yet. All features that depend on it must degrade gracefully.

**How to apply:** Wrap optional-table queries in try/catch or check error before throwing. Show a friendly "Run the migration script" notice rather than an error state.

## Credit sale balance pattern
`vnms_sales` encodes payment state in `payment_method` and `payment_reference`:
- `payment_method` includes "paid" → fully settled
- `payment_reference` starts with `"partial:N"` → N ksh paid so far
- Remaining balance = `total_amount - getAmountPaid(sale)`

**Why:** There is no separate payments table; partial payments are encoded in the sale row itself.

**How to apply:** Always use `getAmountPaid()` / `getRemainingBalance()` helpers; never read raw `total_amount` as the balance for credit sales.

## Per-customer account rollup
For the creditors "By Customer" view, group unpaid sales by `customer.id`, sum remaining balances, find oldest `sale_date` for the days-outstanding clock. Sort by `daysOutstanding` descending so worst offenders surface first.

**Why:** Customers often have multiple credit invoices; a per-invoice list hides the total exposure.

## Overdue threshold
Stored in `localStorage` under key `vnms_overdue_days` (default 14). Warning (amber) = half the threshold. Components read this on mount; changes take effect immediately without a page reload.

## Booking → sale flow
When a sale is confirmed from a booking (`selectedBookingId` set), update `vnms_batch_bookings.status = "fulfilled"` after the sale insert succeeds. Do this after — not before — to avoid marking fulfilled if the sale insert fails.
