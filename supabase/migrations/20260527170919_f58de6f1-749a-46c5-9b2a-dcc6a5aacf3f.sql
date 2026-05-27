-- =========================
-- EMPLOYEES
-- =========================
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT,
  role TEXT NOT NULL,
  hire_date DATE,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view employees"
ON public.employees FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_authorized = true));

CREATE POLICY "Admin and Almoxarife can create employees"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can update employees"
ON public.employees FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can delete employees"
ON public.employees FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- EPIS catalog
-- =========================
CREATE TABLE public.epis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ca_number TEXT,
  category TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis TO authenticated;
GRANT ALL ON public.epis TO service_role;

ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view epis"
ON public.epis FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_authorized = true));

CREATE POLICY "Admin and Almoxarife can create epis"
ON public.epis FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can update epis"
ON public.epis FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can delete epis"
ON public.epis FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE TRIGGER update_epis_updated_at
BEFORE UPDATE ON public.epis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- EPI DELIVERIES
-- =========================
CREATE TABLE public.epi_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  employee_role TEXT,
  delivery_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'delivered',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epi_deliveries TO authenticated;
GRANT ALL ON public.epi_deliveries TO service_role;

ALTER TABLE public.epi_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view epi deliveries"
ON public.epi_deliveries FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_authorized = true));

CREATE POLICY "Admin and Almoxarife can create epi deliveries"
ON public.epi_deliveries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can update epi deliveries"
ON public.epi_deliveries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can delete epi deliveries"
ON public.epi_deliveries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE TRIGGER update_epi_deliveries_updated_at
BEFORE UPDATE ON public.epi_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- EPI DELIVERY ITEMS
-- =========================
CREATE TABLE public.epi_delivery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.epi_deliveries(id) ON DELETE CASCADE,
  epi_id UUID REFERENCES public.epis(id) ON DELETE SET NULL,
  epi_name TEXT NOT NULL,
  ca_number TEXT,
  size TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_epi_delivery_items_delivery ON public.epi_delivery_items(delivery_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epi_delivery_items TO authenticated;
GRANT ALL ON public.epi_delivery_items TO service_role;

ALTER TABLE public.epi_delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view epi delivery items"
ON public.epi_delivery_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_authorized = true));

CREATE POLICY "Admin and Almoxarife can create epi delivery items"
ON public.epi_delivery_items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can update epi delivery items"
ON public.epi_delivery_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

CREATE POLICY "Admin and Almoxarife can delete epi delivery items"
ON public.epi_delivery_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'almoxarife'));

-- =========================
-- Seed EPI catalog (from NR-06 PDF)
-- =========================
INSERT INTO public.epis (name, ca_number, category, description) VALUES
  ('Máscara de Solda',                    '41753',         'Proteção facial',     'Protege o rosto e os olhos contra radiações, fagulhas e respingos de solda.'),
  ('Luva de Raspa ou Vaqueta',            '16074 / 38126', 'Proteção das mãos',   'Trabalhos pesados; proteção contra abrasão, calor e pequenas faíscas.'),
  ('Avental de Raspa',                    '13989',         'Proteção do tronco',  'Protege o tronco e as pernas contra respingos de solda, abrasão e calor moderado.'),
  ('Bota de Segurança',                   '13177',         'Proteção dos pés',    'Protege os pés contra impactos, quedas, perfurações e cortes.'),
  ('Óculos de Segurança Incolor',         '20703',         'Proteção visual',     'Protege os olhos contra partículas volantes e impactos de baixa intensidade.'),
  ('Protetor Auricular Plug ou Concha',   '5745 / 14472',  'Proteção auditiva',   'Reduz a exposição ao ruído, prevenindo danos auditivos.'),
  ('Máscara Semi Facial Respirador',      '7072 / 14781',  'Proteção respiratória','Protege as vias respiratórias contra vapores, gases e partículas sólidas.'),
  ('Luva Látex / Neoprene',               '5774',          'Proteção das mãos',   'Manuseio de produtos químicos, óleos, solventes e tintas; boa resistência química.'),
  ('Macacão Impermeável',                 '38768',         'Proteção do corpo',   'Protege o corpo contra respingos de produtos químicos líquidos e sujeira.'),
  ('Luva PU Multitato',                   '46932',         'Proteção das mãos',   'Boa sensibilidade tátil e aderência; ideal para montagem e manuseio.'),
  ('Capacete com Jugular',                '29638',         'Proteção da cabeça',  'Protege a cabeça contra impactos e quedas, com fixação para trabalhos em altura.'),
  ('Cinto de Segurança com Talabarte',    '37977',         'Trabalho em altura',  'Evita quedas em trabalhos em altura, garantindo sustentação e posicionamento.'),
  ('Luva Anticorte',                      '41076 / 46932', 'Proteção das mãos',   'Protege as mãos contra cortes e abrasões.'),
  ('Luva Látex',                          '44396',         'Proteção das mãos',   'Limpeza e manuseio leve; produtos químicos diluídos e umidade.'),
  ('Respirador Purificador de Ar PFF2',   '45021 / 5657',  'Proteção respiratória','Filtra partículas sólidas e líquidas; poeiras, névoas e fumos metálicos.'),
  ('Mosquetão Oval em Aço 25kN',          NULL,            'Trabalho em altura',  'Sistemas de ancoragem e conexão, suporta até 25 kN de carga.'),
  ('Fita de Ancoragem 60cm',              NULL,            'Trabalho em altura',  'Cria pontos de ancoragem seguros para fixar talabarte/linha de vida.'),
  ('Fita de Ancoragem 40cm',              NULL,            'Trabalho em altura',  'Cria pontos de ancoragem seguros para fixar talabarte/linha de vida.');