import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const webSrc = fileURLToPath(new URL("../web/src", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    root,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mirrors apps/admin/tsconfig.json `paths`. The @web-* aliases are how
    // admin reuses the web app's shared modules (email, redis cache, stock,
    // tracking, kit pricing) instead of duplicating them — they must resolve in
    // tests exactly as they do in the Next build.
    alias: {
      "@db-types": `${webSrc}/lib/supabase/database.types`,
      "@web-cache": `${webSrc}/lib/redis/cache`,
      "@web-email": `${webSrc}/lib/email/email.service`,
      "@web-tracking": `${webSrc}/lib/tracking`,
      "@web-kit-pricing": `${webSrc}/modules/products/kit-pricing`,
      "@web-stock": `${webSrc}/modules/products/server/stock`,
      "@web-vietqr": `${webSrc}/modules/payments/vietqr`,
      "@web-bank-bins": `${webSrc}/modules/payments/bank-bins`,
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});