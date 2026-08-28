CREATE TABLE public.bridge_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_account_id uuid REFERENCES public.mt5_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'disconnected',
  mt5_connected boolean NOT NULL DEFAULT false,
  execution_enabled boolean NOT NULL DEFAULT false,
  last_heartbeat_at timestamptz,
  last_quote_at timestamptz,
  symbol text,
  bid numeric,
  ask numeric,
  spread numeric,
  terminal_build text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bridge_status TO authenticated;
GRANT ALL ON public.bridge_status TO service_role;

ALTER TABLE public.bridge_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bridge status"
ON public.bridge_status FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX bridge_status_user_id_idx ON public.bridge_status (user_id);