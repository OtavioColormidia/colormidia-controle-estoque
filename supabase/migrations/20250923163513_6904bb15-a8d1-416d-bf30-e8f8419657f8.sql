-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id),
  updated_by UUID REFERENCES public.profiles(user_id)
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id),
  updated_by UUID REFERENCES public.profiles(user_id)
);

-- Create stock_movements table
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC,
  total_value NUMERIC,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  document_number TEXT,
  requested_by TEXT,
  department TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  total_value NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled')),
  document_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Create purchase_items table
CREATE TABLE public.purchase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Authorized users can view products" 
ON public.products FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create products" 
ON public.products FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update products" 
ON public.products FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete products" 
ON public.products FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

-- Create RLS policies for suppliers
CREATE POLICY "Authorized users can view suppliers" 
ON public.suppliers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create suppliers" 
ON public.suppliers FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update suppliers" 
ON public.suppliers FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete suppliers" 
ON public.suppliers FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

-- Create RLS policies for stock_movements
CREATE POLICY "Authorized users can view stock movements" 
ON public.stock_movements FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create stock movements" 
ON public.stock_movements FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update stock movements" 
ON public.stock_movements FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete stock movements" 
ON public.stock_movements FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

-- Create RLS policies for purchases
CREATE POLICY "Authorized users can view purchases" 
ON public.purchases FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create purchases" 
ON public.purchases FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update purchases" 
ON public.purchases FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete purchases" 
ON public.purchases FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

-- Create RLS policies for purchase_items
CREATE POLICY "Authorized users can view purchase items" 
ON public.purchase_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can create purchase items" 
ON public.purchase_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can update purchase items" 
ON public.purchase_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

CREATE POLICY "Authorized users can delete purchase items" 
ON public.purchase_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_authorized = true
  )
);

-- Create triggers for updating timestamps
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_items;

-- Set replica identity for realtime
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE public.stock_movements REPLICA IDENTITY FULL;
ALTER TABLE public.purchases REPLICA IDENTITY FULL;
ALTER TABLE public.purchase_items REPLICA IDENTITY FULL;