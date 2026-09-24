CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- First user to sign up becomes admin.
CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_first_admin();

CREATE TABLE public.monitoring_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_enabled boolean NOT NULL DEFAULT true,
  interval_seconds integer NOT NULL DEFAULT 60 CHECK (interval_seconds BETWEEN 15 AND 3600),
  agent_token_hash text,
  agent_last_heartbeat timestamptz,
  agent_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.monitoring_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT ALL ON public.monitoring_settings TO service_role;
ALTER TABLE public.monitoring_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ping_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  requested_by uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','done')),
  success boolean,
  response_time integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX ping_requests_pending_idx ON public.ping_requests (status, created_at);
GRANT ALL ON public.ping_requests TO service_role;
ALTER TABLE public.ping_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stores ADD COLUMN monitoring_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.stores ADD COLUMN last_error text;
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_status_check CHECK (status IN ('online','offline','checking','unknown'));

DROP POLICY IF EXISTS "Stores are publicly readable" ON public.stores;
DROP POLICY IF EXISTS "Brands are publicly readable" ON public.brands;
CREATE POLICY "Signed-in users read stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users read brands" ON public.brands FOR SELECT TO authenticated USING (true);