"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Copy, Database, ExternalLink, AlertCircle } from "lucide-react"

export function SetupGuide() {
  const [activeTab, setActiveTab] = useState("connect")
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [copied, setCopied] = useState("")
  const { toast } = useToast()

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
    toast({
      title: "Copied to clipboard",
      description: `${label} copied to clipboard`,
    })
  }

  const createTablesSQL = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create inventory table with cost tracking
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  age VARCHAR(100),
  date_planted DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Healthy',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  batch_cost DECIMAL(10, 2) DEFAULT 0,
  cost_per_seedling DECIMAL(10, 2) DEFAULT 0,
  sku VARCHAR(50) NOT NULL,
  section VARCHAR(50),
  row VARCHAR(50),
  source VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.inventory FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.customers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.sales FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_inventory ON public.sales(inventory_id);
CREATE INDEX IF NOT EXISTS idx_customers_contact ON public.customers(contact);

-- Insert sample data
INSERT INTO public.inventory (plant_name, scientific_name, category, quantity, age, date_planted, status, price, batch_cost, cost_per_seedling, sku, section, row, source) VALUES
('African Olive', 'Olea europaea subsp. cuspidata', 'Indigenous Trees', 45, '6 months', '2024-05-11', 'Healthy', 1200, 22500, 500, 'IND001', 'A', '3', 'Local nursery'),
('Moringa Seedling', 'Moringa oleifera', 'Ornamentals', 120, '3 months', '2025-01-15', 'Healthy', 350, 24000, 200, 'ORN002', 'B', '2', 'Own propagation'),
('Baobab Tree', 'Adansonia digitata', 'Indigenous Trees', 15, '12 months', '2024-04-10', 'Attention', 2500, 30000, 2000, 'IND003', 'C', '1', 'Seeds from Kilifi region')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.customers (name, contact, email) VALUES
('John Doe', '+254712345678', 'john@example.com'),
('Jane Smith', '+254723456789', 'jane@example.com'),
('Peter Kamau', '+254734567890', 'peter@example.com')
ON CONFLICT DO NOTHING;`

  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}`

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connect">1. Connect Supabase</TabsTrigger>
          <TabsTrigger value="create-tables">2. Create Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Step 1: Get Your Supabase Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800">
                    <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Supabase Dashboard</a></li>
                    <li>Select your project or create a new one</li>
                    <li>Go to Settings → API</li>
                    <li>Copy your Project URL and anon/public key</li>
                  </ol>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="supabase-url">Project URL</Label>
                    <Input
                      id="supabase-url"
                      placeholder="https://your-project.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supabase-key">Anon/Public Key</Label>
                    <Input
                      id="supabase-key"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                    />
                  </div>
                </div>

                {supabaseUrl && supabaseKey && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Credentials Ready!</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      You can now proceed to create the database tables.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={() => setActiveTab("create-tables")} 
                  disabled={!supabaseUrl || !supabaseKey}
                  className="w-full"
                >
                  Next: Create Database Tables
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create-tables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Step 2: Create Database Tables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Important:</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  Run this SQL script in your Supabase SQL Editor to create all necessary tables and sample data.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>SQL Script for Database Setup</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(createTablesSQL, "SQL Script")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied === "SQL Script" ? "Copied!" : "Copy SQL"}
                    </Button>
                  </div>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono max-h-96 overflow-y-auto">
                    <pre>{createTablesSQL}</pre>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How to run this script:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                    <li>Go to your Supabase Dashboard</li>
                    <li>Navigate to SQL Editor</li>
                    <li>Create a new query</li>
                    <li>Paste the SQL script above</li>
                    <li>Click "Run" to execute</li>
                  </ol>
                  <div className="mt-3">
                    <a 
                      href={`https://supabase.com/dashboard/project/${supabaseUrl?.split('//')[1]?.split('.')[0]}/sql`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 underline text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open SQL Editor
                    </a>
                  </div>
                </div>

                <Button 
                  onClick={() => setActiveTab("configure")} 
                  className="w-full"
                >
                  Next: Configure Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Step 3: Configure Application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Environment Configuration</h4>
                <p className="text-green-800 text-sm mb-3">
                  Copy this configuration to your environment variables:
                </p>
                
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono">
                  <pre>{envContent}</pre>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(envContent, "Environment Variables")}
                  className="mt-2"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === "Environment Variables" ? "Copied!" : "Copy Config"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">What's included:</h4>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                    <li><strong>Inventory Management:</strong> Track plants, seedlings, and nursery supplies</li>
                    <li><strong>Cost Tracking:</strong> Monitor batch costs and profit margins</li>
                    <li><strong>Sales Recording:</strong> Record sales with customer information</li>
                    <li><strong>Customer Management:</strong> Maintain customer database</li>
                    <li><strong>Sample Data:</strong> Pre-loaded with example inventory and customers</li>
                  </ul>
                </div>

                <div className="grid gap-2">
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Database Tables Created
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Sample Data Loaded
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Security Policies Configured
                  </Badge>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Setup Complete!</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Your Supabase database is now connected and ready to use. The application will automatically detect the connection and enable all features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
