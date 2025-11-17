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

test.describe('Admin - SEO Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display the SEO management page with its components', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/seo`);

    await expect(page.locator('h1')).toContainText(/SEO Management/i);
    await expect(page.locator('h2', { hasText: 'Global Meta Settings' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Site Health' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Organization JSON-LD' })).toBeVisible();
    await expect(page.locator('input[id="globalTitle"]')).toBeVisible();
  });
});
