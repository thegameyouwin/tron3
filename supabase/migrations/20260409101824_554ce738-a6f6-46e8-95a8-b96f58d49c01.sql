
-- 1. Fix wallets: remove user UPDATE (balance changes must go through server-side functions)
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;

-- 2. Fix ledger_entries: remove user INSERT
DROP POLICY IF EXISTS "Users can insert own ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Users can create own ledger entries" ON public.ledger_entries;

-- 3. Fix transactions: remove user INSERT (deposits/withdrawals must go through edge functions)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;

-- 4. Fix profiles: restrict UPDATE to safe columns only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a trigger to prevent users from updating sensitive fields
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service_role or admins to change these fields
  IF (NEW.kyc_status IS DISTINCT FROM OLD.kyc_status) OR
     (NEW.account_tier IS DISTINCT FROM OLD.account_tier) OR
     (NEW.email_verified IS DISTINCT FROM OLD.email_verified) THEN
    -- Check if caller is service_role (edge function) or admin
    IF NOT (
      current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
    ) THEN
      RAISE EXCEPTION 'You cannot update kyc_status, account_tier, or email_verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 5. Fix site_settings: restrict to admins only
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Only admins can read site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fix email_verifications: remove direct code access
DROP POLICY IF EXISTS "Users can read own verifications" ON public.email_verifications;
DROP POLICY IF EXISTS "Users can view own verifications" ON public.email_verifications;

-- Allow users to only see if they have a pending verification (not the code)
CREATE POLICY "Users can check verification status"
ON public.email_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. Fix withdrawal_otps: remove direct code access  
DROP POLICY IF EXISTS "Users can read own OTPs" ON public.withdrawal_otps;
DROP POLICY IF EXISTS "Users can view own withdrawal OTPs" ON public.withdrawal_otps;
