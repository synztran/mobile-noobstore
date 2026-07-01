import { Page } from "@playwright/test";

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL ?? "e2e-test@noobstore.xyz",
  password: process.env.E2E_TEST_PASSWORD ?? "Test@123456",
  fullName: "E2E Test User",
};

export function generateUniqueEmail(): string {
  const ts = Date.now();
  return `e2e-test-${ts}@noobstore.xyz`;
}

export async function loginUser(
  page: Page,
  email: string,
  password: string
) {
  await page.goto("/login");
  await page.waitForSelector("text=Chào mừng trở lại", { timeout: 10000 });

  await page.getByPlaceholder("Địa chỉ Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  // Click login and wait for redirect away from /login
  await page.locator('[data-testid="login-submit"]').click();
  try {
    await page.waitForURL(
      (url) => !url.pathname.includes("/login"),
      { timeout: 15000 }
    );
  } catch {
    // If login fails (e.g. user not confirmed), continue anyway
    // Tests will handle the auth state themselves
  }
}
