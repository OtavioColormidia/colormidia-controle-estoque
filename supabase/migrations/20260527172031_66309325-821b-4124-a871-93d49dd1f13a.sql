ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.epis REPLICA IDENTITY FULL;
ALTER TABLE public.epi_deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.epi_delivery_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.employees; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.epis; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.epi_deliveries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.epi_delivery_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;