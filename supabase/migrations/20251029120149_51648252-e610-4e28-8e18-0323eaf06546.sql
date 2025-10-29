-- Criar tabela de treliças
CREATE TABLE public.trusses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  max_stock NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Criar tabela de movimentações de treliças
CREATE TABLE public.truss_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'return')),
  truss_id UUID,
  truss_name TEXT,
  quantity NUMERIC NOT NULL,
  taken_by TEXT,
  service_description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'returned')),
  created_by UUID
);

-- Habilitar RLS
ALTER TABLE public.trusses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truss_movements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para trusses
CREATE POLICY "Authorized users can view trusses"
ON public.trusses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create trusses"
ON public.trusses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update trusses"
ON public.trusses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete trusses"
ON public.trusses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

-- Políticas RLS para truss_movements
CREATE POLICY "Authorized users can view truss movements"
ON public.truss_movements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create truss movements"
ON public.truss_movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update truss movements"
ON public.truss_movements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete truss movements"
ON public.truss_movements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_authorized = true
  )
);

-- Triggers para atualizar timestamps
CREATE TRIGGER update_trusses_updated_at
BEFORE UPDATE ON public.trusses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trusses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truss_movements;