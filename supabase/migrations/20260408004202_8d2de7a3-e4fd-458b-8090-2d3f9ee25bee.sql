
-- Email verification OTPs table
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verifications"
  ON public.email_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON public.email_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add email_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- KYC document storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own KYC docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own KYC docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all KYC docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));
