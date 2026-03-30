-- Add equipment_object_id column for caching the auto-discovered custom object ID
-- Stores the HubSpot objectTypeId (e.g., "2-175428522") or "none" if not found
ALTER TABLE public.dealer_settings
  ADD COLUMN IF NOT EXISTS equipment_object_id TEXT;
