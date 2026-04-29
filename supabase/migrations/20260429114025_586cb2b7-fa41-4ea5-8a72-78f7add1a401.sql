-- Tabela de veículos
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  brand TEXT,
  year INTEGER,
  color TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view vehicles" ON public.vehicles
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Authorized users can create vehicles" ON public.vehicles
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Authorized users can update vehicles" ON public.vehicles
FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Authorized users can delete vehicles" ON public.vehicles
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;

-- Tabela de viagens
CREATE TABLE public.vehicle_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_label TEXT,
  driver_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  destination TEXT,
  km_start NUMERIC NOT NULL,
  km_end NUMERIC,
  km_total NUMERIC GENERATED ALWAYS AS (COALESCE(km_end, 0) - km_start) STORED,
  odometer_start_url TEXT,
  odometer_end_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view vehicle trips" ON public.vehicle_trips
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Authorized users can create vehicle trips" ON public.vehicle_trips
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Authorized users can update vehicle trips" ON public.vehicle_trips
FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Authorized users can delete vehicle trips" ON public.vehicle_trips
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE TRIGGER vehicle_trips_updated_at BEFORE UPDATE ON public.vehicle_trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vehicle_trips REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_trips;

CREATE INDEX idx_vehicle_trips_vehicle_id ON public.vehicle_trips(vehicle_id);
CREATE INDEX idx_vehicle_trips_date ON public.vehicle_trips(date DESC);

-- Storage bucket para fotos do hodômetro
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-odometer', 'vehicle-odometer', true);

CREATE POLICY "Anyone can view odometer photos" ON storage.objects
FOR SELECT USING (bucket_id = 'vehicle-odometer');

CREATE POLICY "Authorized users can upload odometer photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'vehicle-odometer'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true)
);

CREATE POLICY "Authorized users can update odometer photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'vehicle-odometer'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true)
);

CREATE POLICY "Authorized users can delete odometer photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'vehicle-odometer'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true)
);