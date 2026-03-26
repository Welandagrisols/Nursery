
-- Create admin user
-- Run this in your Supabase SQL Editor

-- First, ensure you have the auth schema and users table
-- (This should already exist in your Supabase project)

-- Insert admin user (replace with your desired admin email and password)
-- Note: You should create the user through Supabase Auth UI or use the dashboard
-- This is just for reference - the actual user creation should be done through the Supabase dashboard

-- Instructions:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User"
-- 4. Enter email: admin@littleforest.com
-- 5. Enter a secure password
-- 6. Enable email confirmation if needed
-- 7. The user will automatically be created in the auth.users table

-- You can also create additional admin users by adding their emails to the adminEmails array in auth-context.tsx
-- For example: farm@littleforest.com, manager@littleforest.com, etc.

-- Optional: Create a profile table to store additional admin info
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON public.admin_profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.admin_profiles
  FOR UPDATE USING (auth.uid() = id);
