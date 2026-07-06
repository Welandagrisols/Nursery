-- Adds batch pre-order / booking tracking so customers can reserve upcoming seedling batches,
-- and the app can detect when a batch is fully booked or ready for pickup.
-- Run this once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS vnms_batch_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  plant_name TEXT NOT NULL,
  customer_id UUID REFERENCES vnms_customers(id) ON DELETE CASCADE,
  quantity_booked INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','fulfilled','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnms_batch_bookings_batch ON vnms_batch_bookings(batch_id);
CREATE INDEX IF NOT EXISTS idx_vnms_batch_bookings_customer ON vnms_batch_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_vnms_batch_bookings_status ON vnms_batch_bookings(status);

ALTER TABLE vnms_batch_bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vnms_batch_bookings' AND policyname = 'auth_full_access'
  ) THEN
    CREATE POLICY "auth_full_access" ON vnms_batch_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
