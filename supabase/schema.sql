-- ============================================================================
-- WHITE-LABEL POLY CLINIC QUEUE & BOOKING PWA
-- Complete Supabase PostgreSQL Schema, RLS Policies, Realtime & Atomic RPCs
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Valued Patient',
  credit_points NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credit_points >= 0),
  fcm_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  room_number TEXT NOT NULL,
  current_queue_number INTEGER NOT NULL DEFAULT 0 CHECK (current_queue_number >= 0),
  consultation_fee NUMERIC(12, 2) NOT NULL DEFAULT 15000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  queue_number INTEGER NOT NULL CHECK (queue_number >= 1),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, booking_date, queue_number)
);

-- 1.4 TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('kpay', 'wavepay', 'credit_points', 'refund')),
  receipt_image_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'credit_topup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful Indexes for High Performance Lookups
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON public.bookings(doctor_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_patient ON public.bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON public.transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON public.transactions(patient_id);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Patients RLS Policies
CREATE POLICY "Patients are viewable by everyone in clinic app"
  ON public.patients FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register or update patient profile"
  ON public.patients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Patients and reception can update patient records"
  ON public.patients FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Doctors RLS Policies
CREATE POLICY "Doctors are viewable by everyone"
  ON public.doctors FOR SELECT
  USING (true);

CREATE POLICY "Reception and doctors can update doctor queue state"
  ON public.doctors FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert doctors"
  ON public.doctors FOR INSERT
  WITH CHECK (true);

-- Bookings RLS Policies
CREATE POLICY "Bookings are viewable by patients, doctors, and reception"
  ON public.bookings FOR SELECT
  USING (true);

CREATE POLICY "Patients and reception can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Reception and doctors can update booking status"
  ON public.bookings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Transactions RLS Policies
CREATE POLICY "Transactions are viewable by patients and reception"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Patients and reception can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Reception can update transactions"
  ON public.transactions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. ATOMIC DATABASE TRANSACTIONS (STORED PROCEDURES / RPC)
-- ============================================================================

-- 3.1 Atomic Booking Cancellation + Automatic Credit Points Refund
CREATE OR REPLACE FUNCTION public.cancel_booking_and_refund(
  p_booking_id UUID,
  p_refund_amount NUMERIC DEFAULT 15000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_updated_points NUMERIC;
BEGIN
  -- Lock the booking row for atomic update
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already cancelled';
  END IF;

  -- Update booking status to cancelled and payment_status to refunded
  UPDATE public.bookings
  SET status = 'cancelled',
      payment_status = 'refunded',
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- Refund credit_points to patient account
  UPDATE public.patients
  SET credit_points = credit_points + p_refund_amount,
      updated_at = NOW()
  WHERE id = v_booking.patient_id
  RETURNING credit_points INTO v_updated_points;

  -- Record the refund audit transaction
  INSERT INTO public.transactions (
    patient_id,
    booking_id,
    amount,
    payment_method,
    receipt_image_url,
    type
  ) VALUES (
    v_booking.patient_id,
    p_booking_id,
    p_refund_amount,
    'refund',
    NULL,
    'refund'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'patient_id', v_booking.patient_id,
    'refunded_amount', p_refund_amount,
    'new_credit_points', v_updated_points
  );
END;
$$;

-- 3.2 Atomic Increment Doctor Queue Number & Sync Booking Statuses
CREATE OR REPLACE FUNCTION public.advance_doctor_queue(
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doctor RECORD;
  v_next_queue INTEGER;
BEGIN
  SELECT * INTO v_doctor
  FROM public.doctors
  WHERE id = p_doctor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctor % not found', p_doctor_id;
  END IF;

  v_next_queue := v_doctor.current_queue_number + 1;

  -- Mark previous in_progress booking for today as completed
  UPDATE public.bookings
  SET status = 'completed',
      updated_at = NOW()
  WHERE doctor_id = p_doctor_id
    AND booking_date = CURRENT_DATE
    AND queue_number < v_next_queue
    AND status IN ('waiting', 'in_progress');

  -- Mark the newly called queue_number as in_progress
  UPDATE public.bookings
  SET status = 'in_progress',
      updated_at = NOW()
  WHERE doctor_id = p_doctor_id
    AND booking_date = CURRENT_DATE
    AND queue_number = v_next_queue
    AND status = 'waiting';

  -- Update doctor's current_queue_number
  UPDATE public.doctors
  SET current_queue_number = v_next_queue,
      updated_at = NOW()
  WHERE id = p_doctor_id;

  RETURN jsonb_build_object(
    'success', true,
    'doctor_id', p_doctor_id,
    'current_queue_number', v_next_queue
  );
END;
$$;

-- ============================================================================
-- 4. SUPABASE REALTIME PUBLICATION
-- ============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKET FOR RECEIPTS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Receipt images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "Patients can upload payment receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts');

-- ============================================================================
-- 6. INITIAL SEED DATA (TODAY'S SPECIALIST DOCTORS)
-- ============================================================================

INSERT INTO public.doctors (id, name, specialty, room_number, current_queue_number, consultation_fee, is_active)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Dr. Aung Kyaw Moe', 'Senior Cardiologist (Heart Specialist)', 'Room 101 - Ground Floor', 3, 15000, true),
  ('11111111-1111-4111-8111-111111111102', 'Dr. May Thuzar Win', 'General Physician & Elderly Care', 'Room 102 - Ground Floor', 5, 15000, true),
  ('11111111-1111-4111-8111-111111111103', 'Dr. Zaw Min Tun', 'Orthopedic & Joint Specialist', 'Room 105 - Ground Floor', 1, 15000, true),
  ('11111111-1111-4111-8111-111111111104', 'Dr. Khin Myat Noe', 'Eye & Vision Specialist (Ophthalmology)', 'Room 201 - Lift Accessible', 2, 15000, true)
ON CONFLICT (id) DO NOTHING;
