-- Adds a per-customer credit limit for use with credit sales in the POS.
-- Run this once in the Supabase SQL Editor.

ALTER TABLE vnms_customers
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN vnms_customers.credit_limit IS
  'Maximum outstanding credit balance allowed for this customer. 0 = no credit allowed unless explicitly set.';
