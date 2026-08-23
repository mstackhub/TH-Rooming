-- Migration: Create booking_change_requests table for 14-day lock workflow
CREATE TABLE IF NOT EXISTS booking_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  booking_custom_id TEXT,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'edit', -- 'edit' or 'cancel'
  request_details TEXT, -- reason / requested new values
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  handler_email TEXT,
  handler_name TEXT,
  handler_note TEXT,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_booking ON booking_change_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON booking_change_requests(status);
