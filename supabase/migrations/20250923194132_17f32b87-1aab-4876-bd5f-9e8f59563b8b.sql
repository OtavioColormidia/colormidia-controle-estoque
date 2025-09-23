-- Clear all data from the database
-- Delete in the correct order to respect foreign key constraints

-- First delete purchase items
TRUNCATE TABLE public.purchase_items CASCADE;

-- Then delete purchases
TRUNCATE TABLE public.purchases CASCADE;

-- Delete stock movements
TRUNCATE TABLE public.stock_movements CASCADE;

-- Delete products
TRUNCATE TABLE public.products CASCADE;

-- Delete suppliers
TRUNCATE TABLE public.suppliers CASCADE;

-- Delete user profiles (this will also delete auth users due to the trigger)
DELETE FROM public.profiles WHERE id != auth.uid();

-- Note: We keep the current user's profile to maintain access