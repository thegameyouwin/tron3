
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  country TEXT,
  kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none','pending','verified','rejected')),
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    upper(substring(md5(NEW.id::text) from 1 for 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, crypto_id)
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallets" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all wallets" ON public.wallets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer','trade','bot_stake','bot_unstake')),
  crypto_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  usd_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected','cancelled')),
  wallet_address TEXT,
  tx_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trading bots table
CREATE TABLE public.trading_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crypto_id TEXT NOT NULL DEFAULT 'bitcoin',
  strategy TEXT NOT NULL DEFAULT 'market_making',
  config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running','stopped','paused')),
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  tier TEXT DEFAULT 'free',
  description TEXT DEFAULT '',
  is_ai BOOLEAN DEFAULT false,
  min_stake NUMERIC DEFAULT 30,
  daily_earn NUMERIC DEFAULT 0,
  bot_users INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trading_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view platform bots" ON public.trading_bots FOR SELECT USING (user_id IS NULL);
CREATE POLICY "Users can view own bots" ON public.trading_bots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bots" ON public.trading_bots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bots" ON public.trading_bots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bots" ON public.trading_bots FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all bots" ON public.trading_bots FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_trading_bots_updated_at BEFORE UPDATE ON public.trading_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bot trades table
CREATE TABLE public.bot_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.trading_bots(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  pnl NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view trades of own bots" ON public.bot_trades FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.trading_bots WHERE id = bot_trades.bot_id AND (user_id = auth.uid() OR user_id IS NULL))
);
CREATE POLICY "Users can insert trades for own bots" ON public.bot_trades FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.trading_bots WHERE id = bot_trades.bot_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all trades" ON public.bot_trades FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Ledger entries table
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  entry_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ledger" ON public.ledger_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ledger" ON public.ledger_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all ledger" ON public.ledger_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Deposit monitors table
CREATE TABLE public.deposit_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT,
  status TEXT NOT NULL DEFAULT 'monitoring' CHECK (status IN ('monitoring','detected','confirmed','expired')),
  amount_detected NUMERIC,
  tx_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_monitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own monitors" ON public.deposit_monitors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monitors" ON public.deposit_monitors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all monitors" ON public.deposit_monitors FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_deposit_monitors_updated_at BEFORE UPDATE ON public.deposit_monitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Site settings table
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', '"Tronnlix"'),
  ('support_email', '"support@tronnlix.com"'),
  ('enabled_cryptos', '["bitcoin","ethereum","tether","solana","binancecoin","ripple","cardano","dogecoin"]'),
  ('deposit_wallets', '{}'),
  ('min_deposit', '10'),
  ('min_withdraw', '20'),
  ('withdraw_fee_percent', '1');

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('market','limit','stop_limit')),
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  price NUMERIC,
  amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  filled NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','partially_filled','cancelled')),
  is_futures BOOLEAN DEFAULT false,
  leverage INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- P2P listings table
CREATE TABLE public.p2p_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC,
  payment_methods TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.p2p_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active listings" ON public.p2p_listings FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users can insert own listings" ON public.p2p_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON public.p2p_listings FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_p2p_listings_updated_at BEFORE UPDATE ON public.p2p_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Staking table
CREATE TABLE public.staking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  apy NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  lock_days INTEGER DEFAULT 30,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  rewards_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own staking" ON public.staking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own staking" ON public.staking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own staking" ON public.staking FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_staking_updated_at BEFORE UPDATE ON public.staking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Payment methods table
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bank','card','mobile_money','crypto_wallet')),
  label TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payment methods" ON public.payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment methods" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment methods" ON public.payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment methods" ON public.payment_methods FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KYC documents table
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_card','passport','drivers_license','selfie','proof_of_address')),
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own kyc docs" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc docs" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all kyc docs" ON public.kyc_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security logs table
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own security logs" ON public.security_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert security logs" ON public.security_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
