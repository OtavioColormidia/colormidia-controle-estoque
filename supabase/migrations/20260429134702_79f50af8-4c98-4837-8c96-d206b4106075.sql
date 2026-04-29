ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.vehicle_trips REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vehicle_trips'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_trips';
  END IF;
END $$;