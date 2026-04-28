CREATE TABLE IF NOT EXISTS public.payment_information (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  platform_type text NOT NULL CHECK (platform_type IN ('bank', 'momo', 'zalo_pay')),
  account_number text NOT NULL,
  platform_name text NOT NULL,
  account_name text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public.payment_information ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_information_select_public ON public.payment_information;
CREATE POLICY payment_information_select_public
ON public.payment_information
FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.payment_information (platform_type, account_number, platform_name, account_name)
SELECT 'bank', '0123456789', 'vietinbank', 'NOOBSTORE'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_information WHERE platform_type = 'bank'
);
