# mobile-noobstore
mobile version


# generate database-models
```
# Local
npx supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts

# Hosted
npx supabase gen types typescript --project-id <your-project-id> > apps/web/src/lib/supabase/database.types.ts
```
