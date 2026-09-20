-- Brands
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brands TO anon;
GRANT SELECT ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands are publicly readable"
  ON public.brands FOR SELECT
  TO anon, authenticated
  USING (true);

-- Stores
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  store_code text NOT NULL UNIQUE,
  shop_name text NOT NULL,
  db_name text NOT NULL,
  ip_address text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  last_ping timestamptz,
  response_time integer,
  last_seen timestamptz,
  agent_status text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stores_status_check CHECK (status IN ('online','offline','unknown')),
  CONSTRAINT stores_agent_status_check CHECK (agent_status IN ('connected','disconnected','unknown'))
);

CREATE INDEX stores_brand_id_idx ON public.stores (brand_id);

GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores are publicly readable"
  ON public.stores FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed brands
INSERT INTO public.brands (code, name, sort_order) VALUES
  ('TE', 'The Entertainer', 1),
  ('MM', 'Minnie Minor', 2),
  ('BR', 'Bareeze', 3),
  ('HE', 'Home Expression', 4),
  ('FS', 'Fabric Store', 5),
  ('CHY', 'Chinyere', 6),
  ('BM', 'Bareeze Men', 7),
  ('BP', 'Bareeze Pret', 8);

-- Seed demo stores
INSERT INTO public.stores (brand_id, sequence, store_code, shop_name, db_name, ip_address, agent_status)
SELECT b.id, s.sequence, s.store_code, s.shop_name, s.db_name, s.ip_address, s.agent_status
FROM (VALUES
  ('TE', 1, 'TE-001', 'Entertainer Dolmen Clifton', 'pos_te_001', '10.21.1.11', 'connected'),
  ('TE', 2, 'TE-002', 'Entertainer Lucky One', 'pos_te_002', '10.21.1.12', 'connected'),
  ('TE', 3, 'TE-003', 'Entertainer Emporium Lahore', 'pos_te_003', '10.21.1.13', 'connected'),
  ('TE', 4, 'TE-004', 'Entertainer Packages Mall', 'pos_te_004', '10.21.1.14', 'connected'),
  ('TE', 5, 'TE-005', 'Entertainer Centaurus', 'pos_te_005', '10.21.1.15', 'connected'),
  ('TE', 6, 'TE-006', 'Entertainer Giga Mall', 'pos_te_006', '10.21.1.16', 'disconnected'),
  ('TE', 7, 'TE-007', 'Entertainer Ocean Mall', 'pos_te_007', '10.21.1.17', 'connected'),
  ('TE', 8, 'TE-008', 'Entertainer Xinhua Mall', 'pos_te_008', '10.21.1.18', 'connected'),
  ('TE', 9, 'TE-009', 'Entertainer Amanah Mall', 'pos_te_009', '10.21.1.19', 'connected'),
  ('TE', 10, 'TE-010', 'Entertainer Millennium Mall', 'pos_te_010', '10.21.1.20', 'connected'),
  ('MM', 1, 'MM-001', 'Minnie Minor Zamzama', 'pos_mm_001', '10.22.1.11', 'connected'),
  ('MM', 2, 'MM-002', 'Minnie Minor MM Alam Road', 'pos_mm_002', '10.22.1.12', 'connected'),
  ('MM', 3, 'MM-003', 'Minnie Minor Gulberg', 'pos_mm_003', '10.22.1.13', 'connected'),
  ('MM', 4, 'MM-004', 'Minnie Minor F-7 Islamabad', 'pos_mm_004', '10.22.1.14', 'connected'),
  ('MM', 5, 'MM-005', 'Minnie Minor Bahadurabad', 'pos_mm_005', '10.22.1.15', 'connected'),
  ('MM', 6, 'MM-006', 'Minnie Minor Saddar Rawalpindi', 'pos_mm_006', '10.22.1.16', 'connected'),
  ('MM', 7, 'MM-007', 'Minnie Minor DHA Phase 5', 'pos_mm_007', '10.22.1.17', 'disconnected'),
  ('MM', 8, 'MM-008', 'Minnie Minor Faisalabad', 'pos_mm_008', '10.22.1.18', 'connected'),
  ('BR', 1, 'BR-001', 'Bareeze Main Boulevard', 'pos_br_001', '10.23.1.11', 'connected'),
  ('BR', 2, 'BR-002', 'Bareeze Zamzama Karachi', 'pos_br_002', '10.23.1.12', 'connected'),
  ('BR', 3, 'BR-003', 'Bareeze Tariq Road', 'pos_br_003', '10.23.1.13', 'connected'),
  ('BR', 4, 'BR-004', 'Bareeze Jail Road', 'pos_br_004', '10.23.1.14', 'connected'),
  ('BR', 5, 'BR-005', 'Bareeze Blue Area', 'pos_br_005', '10.23.1.15', 'connected'),
  ('BR', 6, 'BR-006', 'Bareeze Sialkot Cantt', 'pos_br_006', '10.23.1.16', 'connected'),
  ('BR', 7, 'BR-007', 'Bareeze Multan Cantt', 'pos_br_007', '10.23.1.17', 'connected'),
  ('BR', 8, 'BR-008', 'Bareeze Peshawar Saddar', 'pos_br_008', '10.23.1.18', 'disconnected'),
  ('BR', 9, 'BR-009', 'Bareeze Hyderabad', 'pos_br_009', '10.23.1.19', 'connected'),
  ('BR', 10, 'BR-010', 'Bareeze Gujranwala', 'pos_br_010', '10.23.1.20', 'connected'),
  ('BR', 11, 'BR-011', 'Bareeze Bahria Town', 'pos_br_011', '10.23.1.21', 'connected'),
  ('BR', 12, 'BR-012', 'Bareeze Abbottabad', 'pos_br_012', '10.23.1.22', 'connected'),
  ('HE', 1, 'HE-001', 'Home Expression Gulberg', 'pos_he_001', '10.24.1.11', 'connected'),
  ('HE', 2, 'HE-002', 'Home Expression Clifton', 'pos_he_002', '10.24.1.12', 'connected'),
  ('HE', 3, 'HE-003', 'Home Expression F-10 Markaz', 'pos_he_003', '10.24.1.13', 'connected'),
  ('HE', 4, 'HE-004', 'Home Expression Johar Town', 'pos_he_004', '10.24.1.14', 'connected'),
  ('HE', 5, 'HE-005', 'Home Expression North Nazimabad', 'pos_he_005', '10.24.1.15', 'connected'),
  ('HE', 6, 'HE-006', 'Home Expression Sargodha Road', 'pos_he_006', '10.24.1.16', 'connected'),
  ('HE', 7, 'HE-007', 'Home Expression Wapda City', 'pos_he_007', '10.24.1.17', 'disconnected'),
  ('HE', 8, 'HE-008', 'Home Expression Askari 11', 'pos_he_008', '10.24.1.18', 'connected'),
  ('FS', 1, 'FS-001', 'Fabric Store Liberty Market', 'pos_fs_001', '10.25.1.11', 'connected'),
  ('FS', 2, 'FS-002', 'Fabric Store Hyderi', 'pos_fs_002', '10.25.1.12', 'connected'),
  ('FS', 3, 'FS-003', 'Fabric Store Gulshan Iqbal', 'pos_fs_003', '10.25.1.13', 'connected'),
  ('FS', 4, 'FS-004', 'Fabric Store I-8 Markaz', 'pos_fs_004', '10.25.1.14', 'connected'),
  ('FS', 5, 'FS-005', 'Fabric Store Cantt Lahore', 'pos_fs_005', '10.25.1.15', 'connected'),
  ('FS', 6, 'FS-006', 'Fabric Store Sukkur', 'pos_fs_006', '10.25.1.16', 'connected'),
  ('CHY', 1, 'CHY-001', 'Chinyere Dolmen Tariq Road', 'pos_chy_001', '10.26.1.11', 'connected'),
  ('CHY', 2, 'CHY-002', 'Chinyere Emporium Mall', 'pos_chy_002', '10.26.1.12', 'connected'),
  ('CHY', 3, 'CHY-003', 'Chinyere Centaurus Mall', 'pos_chy_003', '10.26.1.13', 'connected'),
  ('CHY', 4, 'CHY-004', 'Chinyere MM Alam Road', 'pos_chy_004', '10.26.1.14', 'connected'),
  ('CHY', 5, 'CHY-005', 'Chinyere Packages Mall', 'pos_chy_005', '10.26.1.15', 'disconnected'),
  ('CHY', 6, 'CHY-006', 'Chinyere Ocean Mall', 'pos_chy_006', '10.26.1.16', 'connected'),
  ('BM', 1, 'BM-001', 'Bareeze Men Gulberg', 'pos_bm_001', '10.27.1.11', 'connected'),
  ('BM', 2, 'BM-002', 'Bareeze Men Zamzama', 'pos_bm_002', '10.27.1.12', 'connected'),
  ('BM', 3, 'BM-003', 'Bareeze Men Blue Area', 'pos_bm_003', '10.27.1.13', 'connected'),
  ('BM', 4, 'BM-004', 'Bareeze Men Sialkot', 'pos_bm_004', '10.27.1.14', 'connected'),
  ('BM', 5, 'BM-005', 'Bareeze Men Faisalabad', 'pos_bm_005', '10.27.1.15', 'connected'),
  ('BP', 1, 'BP-001', 'Bareeze Pret Dolmen Mall', 'pos_bp_001', '10.28.1.11', 'connected'),
  ('BP', 2, 'BP-002', 'Bareeze Pret Packages Mall', 'pos_bp_002', '10.28.1.12', 'connected'),
  ('BP', 3, 'BP-003', 'Bareeze Pret Giga Mall', 'pos_bp_003', '10.28.1.13', 'connected'),
  ('BP', 4, 'BP-004', 'Bareeze Pret Lucky One', 'pos_bp_004', '10.28.1.14', 'connected'),
  ('BP', 5, 'BP-005', 'Bareeze Pret Xinhua Mall', 'pos_bp_005', '10.28.1.15', 'connected')
) AS s(brand_code, sequence, store_code, shop_name, db_name, ip_address, agent_status)
JOIN public.brands b ON b.code = s.brand_code;
