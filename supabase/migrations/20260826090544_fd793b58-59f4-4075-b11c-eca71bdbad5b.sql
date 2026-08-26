create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can read their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

create table public.mt5_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  broker_server text not null,
  account_login text not null,
  status text not null default 'pending' check (status in ('pending','connected','disconnected','error')),
  balance numeric,
  equity numeric,
  currency text not null default 'USD',
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.mt5_accounts to authenticated;
grant all on public.mt5_accounts to service_role;
alter table public.mt5_accounts enable row level security;

create policy "Users can manage their own MT5 accounts"
  on public.mt5_accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mt5_account_secrets (
  account_id uuid primary key references public.mt5_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  password_ciphertext text not null,
  created_at timestamptz not null default now()
);
grant insert on public.mt5_account_secrets to authenticated;
grant all on public.mt5_account_secrets to service_role;
alter table public.mt5_account_secrets enable row level security;

create policy "Users can store credentials for their own accounts"
  on public.mt5_account_secrets for insert to authenticated
  with check (auth.uid() = user_id);

create table public.bots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  strategy text not null,
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high')),
  min_deposit numeric not null default 1000,
  monthly_price_cents integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.bots to authenticated;
grant all on public.bots to service_role;
alter table public.bots enable row level security;

create policy "Signed-in users can view the bot catalog"
  on public.bots for select to authenticated using (true);

insert into public.bots (name, slug, description, strategy, risk_level, min_deposit, monthly_price_cents) values
  ('Apex Scalper', 'apex-scalper', 'High-frequency scalping on major FX pairs during London and New York sessions.', 'Scalping', 'high', 2000, 14900),
  ('Trend Rider', 'trend-rider', 'Medium-term trend following across FX majors and gold with trailing exits.', 'Trend Following', 'medium', 1000, 9900),
  ('Steady Grid', 'steady-grid', 'Conservative grid strategy with strict equity protection and session filters.', 'Grid', 'low', 500, 4900),
  ('News Breakout', 'news-breakout', 'Volatility breakout system that trades high-impact economic releases.', 'Breakout', 'high', 3000, 19900);

create table public.bot_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  mt5_account_id uuid references public.mt5_accounts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','active','paused','stopped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.bot_activations to authenticated;
grant all on public.bot_activations to service_role;
alter table public.bot_activations enable row level security;

create policy "Users can manage their own bot activations"
  on public.bot_activations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.risk_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activation_id uuid not null unique references public.bot_activations(id) on delete cascade,
  risk_per_trade_pct numeric not null default 1,
  max_daily_loss_pct numeric not null default 5,
  max_drawdown_pct numeric not null default 10,
  max_open_positions integer not null default 3,
  trading_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.risk_settings to authenticated;
grant all on public.risk_settings to service_role;
alter table public.risk_settings enable row level security;

create policy "Users can manage their own risk settings"
  on public.risk_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mt5_account_id uuid references public.mt5_accounts(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  volume numeric not null,
  open_price numeric not null,
  current_price numeric,
  profit numeric not null default 0,
  opened_at timestamptz not null default now()
);
grant select on public.positions to authenticated;
grant all on public.positions to service_role;
alter table public.positions enable row level security;

create policy "Users can view their own positions"
  on public.positions for select to authenticated using (auth.uid() = user_id);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mt5_account_id uuid references public.mt5_accounts(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  volume numeric not null,
  open_price numeric not null,
  close_price numeric,
  profit numeric not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz not null default now()
);
grant select on public.trades to authenticated;
grant all on public.trades to service_role;
alter table public.trades enable row level security;

create policy "Users can view their own trades"
  on public.trades for select to authenticated using (auth.uid() = user_id);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_cents integer not null,
  interval text not null default 'month',
  max_bots integer not null default 1,
  max_accounts integer not null default 1,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;

create policy "Signed-in users can view plans"
  on public.plans for select to authenticated using (true);

insert into public.plans (name, slug, price_cents, max_bots, max_accounts, features) values
  ('Starter', 'starter', 2900, 1, 1, '["1 trading bot","1 MT5 account","Basic risk controls","Email support"]'),
  ('Pro', 'pro', 7900, 3, 2, '["Up to 3 trading bots","2 MT5 accounts","Advanced risk controls","Priority support"]'),
  ('Elite', 'elite', 14900, 10, 5, '["Unlimited bots","5 MT5 accounts","Custom risk profiles","Dedicated support"]');

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'pending' check (status in ('pending','active','past_due','canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.user_subscriptions to authenticated;
grant all on public.user_subscriptions to service_role;
alter table public.user_subscriptions enable row level security;

create policy "Users can manage their own subscription"
  on public.user_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);