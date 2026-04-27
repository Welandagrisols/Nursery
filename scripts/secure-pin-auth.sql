-- Secure PIN authentication migration for VNMS
-- Run this script in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vnms_staff'
      AND column_name = 'pin'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vnms_staff'
      AND column_name = 'pin_hash'
  ) THEN
    ALTER TABLE public.vnms_staff RENAME COLUMN pin TO pin_hash;
  END IF;
END $$;

DO $$
DECLARE
  check_name text;
BEGIN
  SELECT conname
    INTO check_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'vnms_staff'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%pin%';

  IF check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.vnms_staff DROP CONSTRAINT %I', check_name);
  END IF;
END $$;

UPDATE public.vnms_staff
SET pin_hash = crypt(pin_hash, gen_salt('bf'))
WHERE pin_hash IS NOT NULL
  AND pin_hash !~ '^\$2[aby]\$';

CREATE OR REPLACE FUNCTION public.vnms_hash_staff_pin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pin_hash IS NULL THEN
    RAISE EXCEPTION 'PIN is required';
  END IF;

  IF NEW.pin_hash !~ '^\$2[aby]\$' THEN
    IF NEW.pin_hash !~ '^\d{4}$' THEN
      RAISE EXCEPTION 'PIN must be exactly 4 digits';
    END IF;
    NEW.pin_hash := crypt(NEW.pin_hash, gen_salt('bf'));
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vnms_staff_pin_hash_trigger ON public.vnms_staff;
CREATE TRIGGER vnms_staff_pin_hash_trigger
BEFORE INSERT OR UPDATE OF pin_hash
ON public.vnms_staff
FOR EACH ROW
EXECUTE FUNCTION public.vnms_hash_staff_pin();

CREATE OR REPLACE FUNCTION public.vnms_verify_staff_pin(
  p_staff_id uuid,
  p_pin text
)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pin IS NULL OR p_pin !~ '^\d{4}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.role
  FROM public.vnms_staff s
  WHERE s.id = p_staff_id
    AND s.is_active = TRUE
    AND s.pin_hash = crypt(p_pin, s.pin_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vnms_verify_staff_pin(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.vnms_security_settings (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  owner_pin_hash text,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.vnms_security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage security settings" ON public.vnms_security_settings;
CREATE POLICY "Authenticated users can manage security settings"
  ON public.vnms_security_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.vnms_is_owner_pin_configured()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vnms_security_settings
    WHERE id = TRUE
      AND owner_pin_hash IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.vnms_is_owner_pin_configured() TO authenticated;

CREATE OR REPLACE FUNCTION public.vnms_verify_owner_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RETURN FALSE;
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^\d{4}$' THEN
    RETURN FALSE;
  END IF;

  SELECT owner_pin_hash
    INTO v_hash
  FROM public.vnms_security_settings
  WHERE id = TRUE;

  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vnms_verify_owner_pin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vnms_set_owner_pin(
  p_current_pin text,
  p_new_pin text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RETURN FALSE;
  END IF;

  IF p_new_pin IS NULL OR p_new_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'New PIN must be exactly 4 digits';
  END IF;

  SELECT owner_pin_hash
    INTO v_hash
  FROM public.vnms_security_settings
  WHERE id = TRUE;

  IF v_hash IS NOT NULL THEN
    IF p_current_pin IS NULL OR p_current_pin !~ '^\d{4}$' THEN
      RETURN FALSE;
    END IF;

    IF crypt(p_current_pin, v_hash) <> v_hash THEN
      RETURN FALSE;
    END IF;
  END IF;

  INSERT INTO public.vnms_security_settings (id, owner_pin_hash, updated_at, updated_by)
  VALUES (TRUE, crypt(p_new_pin, gen_salt('bf')), NOW(), auth.uid())
  ON CONFLICT (id)
  DO UPDATE SET
    owner_pin_hash = EXCLUDED.owner_pin_hash,
    updated_at = NOW(),
    updated_by = auth.uid();

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vnms_set_owner_pin(text, text) TO authenticated;
