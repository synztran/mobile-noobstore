-- Enable RLS on home content tables and allow public read access
ALTER TABLE public.hero_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public can read hero campaigns"
  ON public.hero_campaigns
  FOR SELECT
  USING (true);

CREATE POLICY "Public can read trust props"
  ON public.trust_props
  FOR SELECT
  USING (true);

CREATE POLICY "Public can read community gallery"
  ON public.community_gallery
  FOR SELECT
  USING (true);

CREATE POLICY "Public can read creators"
  ON public.creators
  FOR SELECT
  USING (true);
