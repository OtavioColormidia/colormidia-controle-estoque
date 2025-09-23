-- Clear all data from the database

-- Delete all stock movements
DELETE FROM public.stock_movements;

-- Delete all products
DELETE FROM public.products;

-- Delete all suppliers
DELETE FROM public.suppliers;

-- Delete all purchases
DELETE FROM public.purchases;

-- Delete all profiles (this will recreate with trigger)
DELETE FROM public.profiles;

-- Delete all auth users (this will cascade to profiles)
DELETE FROM auth.users;