import { test, expect } from "@playwright/test";
import { generateUniqueEmail } from "../helpers";

test.describe("Registration Flow", () => {
  test("should display register page with all form fields", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(page.getByText("Tạo tài khoản")).toBeVisible();
    await expect(page.getByPlaceholder("Họ và tên")).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="agreed"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
  });

  test("should show validation errors with empty form", async ({ page }) => {
    await page.goto("/register");
    await page.locator('[data-testid="register-submit"]').click();
    await page.waitForTimeout(500);

    // Check at least some validation errors appear
    const errors = page.locator("p.text-error");
    await expect(errors.first()).toBeVisible();
    const count = await errors.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("should show password mismatch error", async ({ page }) => {
    await page.goto("/register");

    await page.getByPlaceholder("Họ và tên").fill("Test User");
    await page.getByPlaceholder("Email").fill(generateUniqueEmail());
    await page.locator('input[name="password"]').fill("password123");
    await page.locator('input[name="confirmPassword"]').fill("different456");
    await page.getByText("Tôi đồng ý với").click();
    await page.locator('[data-testid="register-submit"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText("Mật khẩu không khớp", { exact: true })
    ).toBeVisible();
  });

  test("should show hint for short password", async ({ page }) => {
    await page.goto("/register");

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill("123");

    // The hint text should show after typing (touched triggers via onBlur)
    // Actually with validateOnBlur:true, touch happens on blur
    // But the hint also shows when values.password.length > 0
    await expect(page.getByText("Ít nhất 8 ký tự")).toBeVisible();
  });

  test("should show error for invalid email", async ({ page }) => {
    await page.goto("/register");

    await page.getByPlaceholder("Họ và tên").fill("Test User");
    await page.getByPlaceholder("Email").fill("not-an-email");
    await page.locator('input[name="password"]').fill("password123");
    await page.locator('input[name="confirmPassword"]').fill("password123");
    await page.getByText("Tôi đồng ý với").click();
    await page.locator('[data-testid="register-submit"]').click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText("Email không hợp lệ", { exact: true })
    ).toBeVisible();
  });

  test("should register successfully with valid data", async ({ page }) => {
    const email = generateUniqueEmail();
    await page.goto("/register");

    await page.getByPlaceholder("Họ và tên").fill("New Test User");
    await page.getByPlaceholder("Email").fill(email);
    await page.locator('input[name="password"]').fill("Test@123456");
    await page.locator('input[name="confirmPassword"]').fill("Test@123456");
    await page.getByText("Tôi đồng ý với").click();
    await page.locator('[data-testid="register-submit"]').click();

    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.getByText("Chào mừng trở lại")).toBeVisible();
  });

  test("should have link to login page", async ({ page }) => {
    await page.goto("/register");
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText("Đăng nhập");
  });

  test("should show password strength indicator", async ({ page }) => {
    await page.goto("/register");

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill("123");

    const indicator = page.getByText("Ít nhất 8 ký tự");
    await expect(indicator).toBeVisible();

    await passwordInput.fill("validpassword123");
    await expect(indicator).toBeVisible();
  });
});
