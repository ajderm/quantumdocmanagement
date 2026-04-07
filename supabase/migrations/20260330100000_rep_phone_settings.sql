-- Add phone column to commission_user_settings for rep phone auto-populate
ALTER TABLE public.commission_user_settings
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
