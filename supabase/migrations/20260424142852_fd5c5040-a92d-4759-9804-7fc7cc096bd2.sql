
-- Add logo_url column to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create public bucket for supplier logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for supplier-logos bucket
CREATE POLICY "Supplier logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-logos');

CREATE POLICY "Authorized users can upload supplier logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'supplier-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update supplier logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'supplier-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete supplier logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'supplier-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true
  )
);
