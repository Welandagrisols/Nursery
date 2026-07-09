-- Atomic POS sale function matching the real vnms_* schema
-- (vnms_batches / vnms_sales / vnms_batch_bookings), replacing the
-- manual reserve-stock -> insert-sale -> rollback-on-failure dance
-- previously done client-side in components/pos-modal.tsx.
--
-- Locks the batch row for the duration of the transaction, verifies
-- sufficient stock, decrements it, inserts the sale row, and
-- optionally marks a booking fulfilled — all inside one server-side
-- transaction so a crash/network drop between steps can no longer
-- leave stock decremented with no matching sale (or vice versa).

CREATE OR REPLACE FUNCTION public.record_sale_atomic(
  p_batch_id uuid,
  p_quantity integer,
  p_unit_price numeric,
  p_total_amount numeric,
  p_sale_date date,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_type text,
  p_payment_method text,
  p_payment_reference text,
  p_receipt_number text,
  p_notes text,
  p_batch_code text,
  p_plant_name text,
  p_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available integer;
  v_sale record;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  -- Lock the batch row so concurrent sales can't oversell the same stock.
  SELECT available_stock INTO v_available
  FROM public.vnms_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock: only % available', v_available;
  END IF;

  UPDATE public.vnms_batches
  SET available_stock = available_stock - p_quantity,
      quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_batch_id;

  INSERT INTO public.vnms_sales (
    inventory_id, batch_id, batch_code, plant_name,
    customer_id, customer_name, customer_type,
    quantity, unit_price, total_amount,
    payment_method, payment_reference, receipt_number,
    sale_date, notes, is_voided
  ) VALUES (
    p_batch_id, p_batch_id, p_batch_code, p_plant_name,
    p_customer_id, p_customer_name, p_customer_type,
    p_quantity, p_unit_price, p_total_amount,
    p_payment_method, p_payment_reference, p_receipt_number,
    p_sale_date, p_notes, FALSE
  )
  RETURNING * INTO v_sale;

  IF p_booking_id IS NOT NULL THEN
    UPDATE public.vnms_batch_bookings
    SET status = 'fulfilled', updated_at = NOW()
    WHERE id = p_booking_id;
  END IF;

  RETURN to_jsonb(v_sale);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_sale_atomic(
  uuid, integer, numeric, numeric, date, uuid, text, text, text, text, text, text, text, text, uuid
) TO authenticated;
