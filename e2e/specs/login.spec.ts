import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test@noobstore.xyz";
  const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Test@123456";

  test("should display login page with all elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Chào mừng trở lại")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test("should show error with empty form", async ({ page }) => {
    await page.goto("/login");
    await page.locator('[data-testid="login-submit"]').click();

    const toast = page.getByText("Vui lòng điền đầy đủ thông tin").first();
    await expect(toast).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("Địa chỉ Email").fill("wrong@email.com");
    await page.getByPlaceholder("Mật khẩu").fill("wrongpassword");
    await page.locator('[data-testid="login-submit"]').click();

    await page.waitForTimeout(3000);
    const toast = page.getByText(/Invalid login credentials/i);
    await expect(toast.first()).toBeVisible({ timeout: 10000 });
  });

  test("should toggle password visibility", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByPlaceholder("Mật khẩu");
    await passwordInput.fill("testpassword");

    // Click the eye toggle icon button — it's the last button beside the password input
    await page.locator("form button[type='button']").last().click();

    const textInput = page.locator('input[type="text"]');
    await expect(textInput).toHaveValue("testpassword");
  });

  test("should redirect to home after successful login", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Địa chỉ Email").fill(TEST_EMAIL);
    await page.getByPlaceholder("Mật khẩu").fill(TEST_PASSWORD);
    await page.locator('[data-testid="login-submit"]').click();

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
  });

  test("should redirect to checkout after login with next param", async ({
    page,
  }) => {
    await page.goto("/checkout/shipping");
    await page.waitForURL(/\/login\?next=/, { timeout: 10000 });

    await page.getByPlaceholder("Địa chỉ Email").fill(TEST_EMAIL);
    await page.getByPlaceholder("Mật khẩu").fill(TEST_PASSWORD);
    await page.locator('[data-testid="login-submit"]').click();

    await page.waitForURL(/\/checkout\/shipping/, { timeout: 15000 });
  });

  test("should have link to register page", async ({ page }) => {
    await page.goto("/login");
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveText("Đăng ký");
  });
});
