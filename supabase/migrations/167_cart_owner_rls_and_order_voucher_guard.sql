-- Keep cart reads/writes owner-scoped and disallow anonymous guest-cart access.
DROP POLICY IF EXISTS "Users manage own carts" ON public.carts;
CREATE POLICY "Users manage own carts" ON public.carts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "Anon manage guest carts" ON public.carts;

DROP POLICY IF EXISTS "Users manage own cart_items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart_items" ON public.cart_items
  FOR ALL TO authenticated
  USING (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()::text))
  WITH CHECK (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()::text));
DROP POLICY IF EXISTS "Anon manage guest cart_items" ON public.cart_items;
