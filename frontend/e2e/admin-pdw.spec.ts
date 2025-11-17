import { test, expect } from '@playwright/test';

const BASE_URL =
  process.env.PW_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/admin`);
  await page.fill('input[id="email"]', 'admin@example.com');
  await page.fill('input[id="password"]', 'admin-password-placeholder');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin(\/.*)?$/);
  await expect(page.locator('body')).toContainText(/Admin/i);
}

test.describe('Admin - Product of the Week', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should allow an admin to set a new Product of the Week', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products`);

    const setPdwButton = page.locator('button:has-text("Set as PDW")').first();
    const productRow = page.locator('tr', { has: setPdwButton });
    const productTitle = await productRow.locator('td').first().textContent();

    expect(productTitle).not.toBeNull();

    await setPdwButton.click();

    await page.waitForURL(/\/admin\/products(\/.*)?$/);
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(productTitle!.trim());
    await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
  });
});
