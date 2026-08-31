
CREATE TABLE public.pf_nexus_access_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_days integer NOT NULL DEFAULT 5,
  paid_profit_days integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 days'),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.pf_nexus_access_periods TO authenticated;
GRANT ALL ON public.pf_nexus_access_periods TO service_role;
ALTER TABLE public.pf_nexus_access_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own access period" ON public.pf_nexus_access_periods
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can start their own access period" ON public.pf_nexus_access_periods
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can refresh their own access period" ON public.pf_nexus_access_periods
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pf_nexus_profit_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_date date NOT NULL,
  realized_net_profit numeric NOT NULL DEFAULT 0,
  user_share numeric NOT NULL DEFAULT 0,
  platform_share numeric NOT NULL DEFAULT 0,
  is_profitable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trading_date)
);
GRANT SELECT ON public.pf_nexus_profit_days TO authenticated;
GRANT ALL ON public.pf_nexus_profit_days TO service_role;
ALTER TABLE public.pf_nexus_profit_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profit days" ON public.pf_nexus_profit_days
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.pf_nexus_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_date date NOT NULL,
  realized_net_profit numeric NOT NULL DEFAULT 0,
  user_share numeric NOT NULL DEFAULT 0,
  platform_share numeric NOT NULL DEFAULT 0,
  amount_due numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'due',
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trading_date)
);
GRANT SELECT ON public.pf_nexus_invoices TO authenticated;
GRANT ALL ON public.pf_nexus_invoices TO service_role;
ALTER TABLE public.pf_nexus_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own invoices" ON public.pf_nexus_invoices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.pf_nexus_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.pf_nexus_invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  provider text,
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pf_nexus_payments TO authenticated;
GRANT ALL ON public.pf_nexus_payments TO service_role;
ALTER TABLE public.pf_nexus_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payments" ON public.pf_nexus_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER pf_nexus_access_periods_updated_at BEFORE UPDATE ON public.pf_nexus_access_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pf_nexus_profit_days_updated_at BEFORE UPDATE ON public.pf_nexus_profit_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pf_nexus_invoices_updated_at BEFORE UPDATE ON public.pf_nexus_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pf_nexus_payments_updated_at BEFORE UPDATE ON public.pf_nexus_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
