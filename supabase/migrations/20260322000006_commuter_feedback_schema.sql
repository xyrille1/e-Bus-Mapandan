-- ================================================================
-- Migration: 006 — Commuter Feedback + Trip Completion Read Policy
-- Purpose  : Real user-submitted commuter feedback tied to completed trips.
--            Also allows commuter clients to observe completed trip events
--            and trigger the one-tap feedback prompt in realtime.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.commuter_feedback (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id     UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  bus_id      TEXT        NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('Crowding', 'Delay', 'Driver Conduct', 'Suggestion')),
  message     TEXT        NOT NULL CHECK (char_length(trim(message)) >= 6),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commuter_feedback_trip_id
  ON public.commuter_feedback (trip_id, submitted_at DESC);

ALTER TABLE public.commuter_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_commuter_feedback" ON public.commuter_feedback;
CREATE POLICY "public_insert_commuter_feedback"
  ON public.commuter_feedback
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_commuter_feedback" ON public.commuter_feedback;
CREATE POLICY "public_read_commuter_feedback"
  ON public.commuter_feedback
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "public_read_completed_trips" ON public.trips;
CREATE POLICY "public_read_completed_trips"
  ON public.trips
  FOR SELECT
  USING (status = 'completed');

ALTER TABLE public.trips REPLICA IDENTITY FULL;
