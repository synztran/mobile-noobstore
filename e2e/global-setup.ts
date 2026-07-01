import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

// Load .env.local for Supabase keys
dotenv.config({ path: path.resolve(__dirname, "..", "apps/web/.env.local") });

const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test@noobstore.xyz";
const TEST_USER_PASSWORD =
  process.env.E2E_TEST_PASSWORD ?? "Test@123456";
const TEST_USER_FULL_NAME = "E2E Test User";

async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "⚠️  Missing Supabase credentials. Login tests requiring a pre-confirmed user may fail."
    );
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if test user already exists in auth
  const { data: users } = await adminClient.auth.admin.listUsers();
  const existing = users?.users.find((u) => u.email === TEST_USER_EMAIL);

  if (existing) {
    console.log(`✅ Test user ${TEST_USER_EMAIL} already exists`);
    // Ensure user is confirmed
    if (!existing.email_confirmed_at) {
      await adminClient.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
      });
      console.log(`✅ Confirmed email for ${TEST_USER_EMAIL}`);
    }
    return;
  }

  // Create test user
  const { data, error } = await adminClient.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: TEST_USER_FULL_NAME },
  });

  if (error) {
    console.error(`❌ Failed to create test user: ${error.message}`);
    return;
  }

  console.log(`✅ Created test user ${TEST_USER_EMAIL} (id: ${data.user.id})`);
}

export default globalSetup;
