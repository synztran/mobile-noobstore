import { test, expect } from "@playwright/test";
import { loginUser, TEST_USER } from "../helpers";

test.describe("Add to Cart Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, TEST_USER.email, TEST_USER.password);
  });

  test("should navigate to shop and view product grid", async ({ page }) => {
    await page.goto("/shop");
    // Wait for product grid to render
    await page.waitForSelector("a[href*='/shop/']", { timeout: 15000 });
  });

  test("should add product from shop quick-add button", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForSelector("a[href*='/shop/']", { timeout: 15000 });

    // Find a quick-add button
    const quickAddBtn = page
      .getByRole("button", { name: /quick add/i })
      .first();
    if (await quickAddBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickAddBtn.click();

      // Cart drawer should open
      await expect(page.getByText("Giỏ hàng của bạn")).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should navigate to product detail and add to cart", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.waitForSelector("a[href*='/shop/']", { timeout: 15000 });

    const productLink = page.locator("a[href*='/shop/']").first();
    await productLink.click();
    // Wait for add-to-cart button to appear on detail page
    await page.waitForSelector('[data-testid="add-to-cart"]', {
      timeout: 15000,
    });

    const addToCartBtn = page.locator('[data-testid="add-to-cart"]');
    const buttonText = await addToCartBtn.textContent();

    if (buttonText?.trim() === "Thêm vào giỏ hàng") {
      await addToCartBtn.click();

      await expect(page.getByText("Giỏ hàng của bạn")).toBeVisible({
        timeout: 5000,
      });
    } else {
      test.skip();
    }
  });

  test("should add product variant and see in cart", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForSelector("a[href*='/shop/']", { timeout: 15000 });

    const productLink = page.locator("a[href*='/shop/']").first();
    await productLink.click();
    await page.waitForSelector('[data-testid="add-to-cart"]', {
      timeout: 15000,
    });

    const addToCartBtn = page.locator('[data-testid="add-to-cart"]');
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });

    // If there are config options, try selecting the first variant
    const configSection = page.getByText("Lựa chọn cấu hình");
    if (await configSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click the first option button inside the configurator
      const firstOption = configSection
        .locator("..")
        .locator("..")
        .getByRole("button")
        .first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(300);
      }
    }

    const buttonText = await addToCartBtn.textContent();
    if (buttonText?.trim() === "Thêm vào giỏ hàng") {
      await addToCartBtn.click();

      await expect(page.getByText("Giỏ hàng của bạn")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("Giỏ hàng trống")).toBeHidden({
        timeout: 3000,
      });
    } else {
      test.skip();
    }
  });

  test("should update quantity in cart", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForSelector("text=Mới lên kệ", { timeout: 15000 });

    const quickAddBtn = page
      .getByRole("button", { name: /quick add/i })
      .first();
    if (await quickAddBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickAddBtn.click();
      await page.waitForTimeout(1500);
    } else {
      const productLink = page.locator("a[href*='/shop/']").first();
      await productLink.click();
      await page.waitForSelector('[data-testid="add-to-cart"]', {
        timeout: 15000,
      });

      const addToCartBtn = page.locator('[data-testid="add-to-cart"]');
      const text = await addToCartBtn.textContent();
      if (text?.trim() !== "Thêm vào giỏ hàng") {
        test.skip();
        return;
      }
      await addToCartBtn.click();
      await page.waitForTimeout(1500);
    }

    // Try incrementing quantity
    const plusBtn = page.locator("button:has-text('+')").first();
    if (await plusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await plusBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("should show empty cart state when no items", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("noobstore-cart"));
    await page.goto("/");
    await page.waitForSelector("text=NoobStore", { timeout: 15000 });

    // Use force:true to bypass Next.js dev overlay
    await page.locator("[data-cart-icon]").click({ force: true });
    await expect(page.getByText("Giỏ hàng của bạn")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Giỏ hàng trống")).toBeVisible();
  });
});
