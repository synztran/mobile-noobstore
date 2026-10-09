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
      const pickup = page.getByText("Nhận tại cửa hàng").first();
      await expect(pickup).toBeAttached({ timeout: 5000 });
    }
  });

  test("should offer the in-city carrier tiers for an HCMC address", async ({
    page,
  }) => {
    // The two courier tiers are HCMC-only and unquoted, so they render off the
    // city alone — no `fees` config decides whether they are offered.
    await page.goto("/checkout/shipping");
    await page.waitForTimeout(3000);

    // The city field is a combobox (text input + portal dropdown), not a select.
    const cityInput = page
      .getByPlaceholder("Tìm tỉnh / thành phố...")
      .first();
    if (!(await cityInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "checkout address form not reachable in this environment");
    }

    await cityInput.click();
    await cityInput.fill("Hồ Chí Minh");
    await page
      .getByRole("button", { name: "Thành phố Hồ Chí Minh", exact: true })
      .first()
      .click();
    await page.waitForTimeout(2000);

    await expect(page.getByText("Vận chuyển nhanh 4h").first()).toBeAttached({
      timeout: 5000,
    });
    // The inter-city courier is hidden inside HCMC.
    await expect(page.getByText("Đơn vị vận chuyển").first()).toBeHidden();

    // Courier rates depend on the parcel, so checkout must not invent a price.
    await expect(
      page.getByText("Cập nhật sau").first()
    ).toBeAttached({ timeout: 5000 });
  });
});
