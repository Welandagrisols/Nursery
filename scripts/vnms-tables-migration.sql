-- Grace Harvest Seedlings — vnms_ table migration
-- Run this in your Supabase SQL Editor
-- DO NOT touch existing LittleForest tables (plants, sales, customers, tasks, etc.)

-- 1. Seedling batches (replaces 'inventory' table for this app)
CREATE TABLE IF NOT EXISTS vnms_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  age TEXT,
  date_planted DATE,
  status TEXT DEFAULT 'Healthy',
  price NUMERIC(12,2) DEFAULT 0,
  batch_cost NUMERIC(12,2) DEFAULT 0,
  cost_per_seedling NUMERIC(12,2) DEFAULT 0,
  sku TEXT,
  section TEXT,
  row TEXT,
  tray TEXT,
  source TEXT,
  item_type TEXT DEFAULT 'Plant',
  ready_for_sale BOOLEAN DEFAULT FALSE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS vnms_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  total_purchases NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sales transactions
CREATE TABLE IF NOT EXISTS vnms_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  plant_name TEXT,
  customer_id UUID REFERENCES vnms_customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT DEFAULT 'Cash',
  sale_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Staff tasks
CREATE TABLE IF NOT EXISTS vnms_staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,
  status TEXT DEFAULT 'Pending',
  priority TEXT DEFAULT 'Medium',
  assigned_to TEXT,
  task_date DATE,
  plant_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  plant_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Task consumable usage
CREATE TABLE IF NOT EXISTS vnms_task_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES vnms_staff_tasks(id) ON DELETE CASCADE,
  consumable_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  consumable_name TEXT,
  quantity_used NUMERIC(12,2),
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Seed sachets / packets
CREATE TABLE IF NOT EXISTS vnms_sachets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name TEXT NOT NULL,
  variety TEXT,
  supplier TEXT,
  quantity INTEGER DEFAULT 0,
  purchase_date DATE,
  expiry_date DATE,
  germination_rate NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Batch ↔ sachet junction
CREATE TABLE IF NOT EXISTS vnms_batch_sachets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES vnms_batches(id) ON DELETE CASCADE,
  sachet_id UUID REFERENCES vnms_sachets(id) ON DELETE SET NULL,
  quantity_used NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Germination counts
CREATE TABLE IF NOT EXISTS vnms_germination_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES vnms_batches(id) ON DELETE CASCADE,
  count_date DATE DEFAULT CURRENT_DATE,
  germinated_count INTEGER DEFAULT 0,
  total_seeds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Price list
CREATE TABLE IF NOT EXISTS vnms_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_name TEXT NOT NULL,
  category TEXT,
  price_per_seedling NUMERIC(12,2) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Cost records
CREATE TABLE IF NOT EXISTS vnms_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_type TEXT,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Stock alerts
CREATE TABLE IF NOT EXISTS vnms_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_name TEXT NOT NULL,
  category TEXT,
  threshold_quantity INTEGER DEFAULT 50,
  current_quantity INTEGER DEFAULT 0,
  alert_status TEXT DEFAULT 'OK',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Inventory inputs (raw materials: soil, fertiliser, trays, etc.)
CREATE TABLE IF NOT EXISTS vnms_inventory_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12,2) DEFAULT 0,
  unit TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  supplier TEXT,
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE vnms_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_task_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_sachets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_batch_sachets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_germination_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_inventory_inputs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to all vnms_ tables
CREATE POLICY "Authenticated full access" ON vnms_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_staff_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_task_consumables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_sachets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_batch_sachets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_germination_counts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_stock_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON vnms_inventory_inputs FOR ALL TO authenticated USING (true) WITH CHECK (true);
