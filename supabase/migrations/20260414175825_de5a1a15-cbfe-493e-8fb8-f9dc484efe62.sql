
-- Create storage bucket for purchase attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-attachments', 'purchase-attachments', false);

-- Authorized users can view purchase attachments
CREATE POLICY "Authorized users can view purchase attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'purchase-attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

-- Authorized users can upload purchase attachments
CREATE POLICY "Authorized users can upload purchase attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'purchase-attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

-- Authorized users can update purchase attachments
CREATE POLICY "Authorized users can update purchase attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'purchase-attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

-- Authorized users can delete purchase attachments
CREATE POLICY "Authorized users can delete purchase attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'purchase-attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);
