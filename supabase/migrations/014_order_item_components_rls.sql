ALTER TABLE public.order_item_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order item components" ON public.order_item_components;
CREATE POLICY "Users can view own order item components"
ON public.order_item_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_components.order_item_id
      AND o.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can insert own order item components" ON public.order_item_components;
CREATE POLICY "Users can insert own order item components"
ON public.order_item_components
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_components.order_item_id
      AND o.user_id = auth.uid()::text
  )
);
