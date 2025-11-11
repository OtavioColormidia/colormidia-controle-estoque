-- Create supplier_materials table
CREATE TABLE IF NOT EXISTS public.supplier_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  materials TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.supplier_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for supplier_materials
CREATE POLICY "Authorized users can view supplier materials"
ON public.supplier_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create supplier materials"
ON public.supplier_materials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update supplier materials"
ON public.supplier_materials
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete supplier materials"
ON public.supplier_materials
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_supplier_materials_updated_at
  BEFORE UPDATE ON public.supplier_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_supplier_materials_supplier_id ON public.supplier_materials(supplier_id);