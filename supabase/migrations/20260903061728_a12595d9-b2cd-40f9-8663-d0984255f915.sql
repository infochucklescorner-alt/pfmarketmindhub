ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS config_schema jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.bots SET is_active = false;

INSERT INTO public.bots (name, slug, description, strategy, risk_level, min_deposit, monthly_price_cents, is_active, sort_order, config_schema)
VALUES
 ('Liquidity Bot','liquidity-bot','Strategy focused on liquidity-based market behaviour. Free to use — PF NEXUS earns only a 30% share of realized daily profit.','Liquidity','medium',0,0,true,1,'{}'::jsonb),
 ('Break & Retest Bot','break-retest-bot','Strategy focused on break and retest structure. Free to use — PF NEXUS earns only a 30% share of realized daily profit.','Break & Retest','medium',0,0,true,2,'{}'::jsonb),
 ('Price Action Bot','price-action-bot','Strategy focused on pure price action. Free to use — PF NEXUS earns only a 30% share of realized daily profit.','Price Action','medium',0,0,true,3,'{}'::jsonb),
 ('CRT Bot','crt-bot','Strategy focused on candle range theory (CRT). Free to use — PF NEXUS earns only a 30% share of realized daily profit.','CRT','medium',0,0,true,4,'{}'::jsonb),
 ('SMC Bot','smc-bot','Strategy focused on smart money concepts (SMC). Free to use — PF NEXUS earns only a 30% share of realized daily profit.','SMC','medium',0,0,true,5,'{}'::jsonb),
 ('Fibonacci Bot','fibonacci-bot','Strategy focused on Fibonacci retracement levels. Free to use — PF NEXUS earns only a 30% share of realized daily profit.','Fibonacci','medium',0,0,true,6,'{}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  strategy = EXCLUDED.strategy,
  risk_level = EXCLUDED.risk_level,
  min_deposit = 0,
  monthly_price_cents = 0,
  is_active = true,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;
