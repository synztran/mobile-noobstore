-- Keep the production warm-cache job aligned with the reduced home/checkout warm set.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('warm-cache')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'warm-cache');

    PERFORM cron.schedule(
      'warm-cache',
      '*/30 * * * *',
      $cron$SELECT public.warm_cache();$cron$
    );
  END IF;
END;
$$;
