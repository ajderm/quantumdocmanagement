ALTER TABLE public.dealer_settings ADD COLUMN IF NOT EXISTS equipment_object_id TEXT DEFAULT '';
ALTER TABLE public.commission_user_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';