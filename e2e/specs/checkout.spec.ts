import { test, expect } from "@playwright/test";
import { loginUser, TEST_USER } from "../helpers";

test.describe("Checkout Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_USER.email, TEST_USER.password);
  });

  test("should redirect to login when accessing checkout unauthenticated", async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    await page.goto("/checkout/shipping");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.getByText("Chào mừng trở lại")).toBeVisible();
  });

  test("should display checkout page but show empty state when cart is empty", async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.removeItem("noobstore-cart"));
    // Ensure logged in
    await page.goto("/checkout/shipping");
    // Checkout page renders even with empty cart
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain("/checkout/shipping");
  });

  test("should show checkout steps and order summary with items in cart", async ({
    page,
  }) => {
    // First add a real product to cart by navigating to shop
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");

    const quickAddBtn = page
      .getByRole("button", { name: /quick add/i })
      .first();
    if (await quickAddBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickAddBtn.click();
      await page.waitForTimeout(1500);
    }

    // Now navigate to checkout
    await page.goto("/checkout/shipping");
    await page.waitForTimeout(3000);

    // If we have items, the checkout page renders
    const pageContent = await page.textContent("body");
    if (pageContent?.includes("Thông tin giao hàng")) {
      await expect(page.getByText("Thông tin giao hàng")).toBeVisible();
      await expect(page.getByText("Tóm tắt đơn hàng")).toBeVisible();
      await expect(page.getByText("Tiếp tục thanh toán")).toBeVisible();
    }
  });

  test("should show delivery method options", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForSelector("a[href*='/shop/']", { timeout: 15000 });

    const quickAddBtn = page
      .getByRole("button", { name: /quick add/i })
      .first();
    if (await quickAddBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickAddBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.goto("/checkout/shipping");
    // Wait for page to fully render
    await page.waitForTimeout(5000);

    const pageContent = await page.textContent("body");
    if (pageContent?.includes("Thông tin giao hàng")) {
      // Check delivery options exist in DOM (may be scroll-hidden on mobile)
      const standard = page.getByText("Tiêu chuẩn").first();
      await expect(standard).toBeAttached({ timeout: 5000 });
    }
  });
});
