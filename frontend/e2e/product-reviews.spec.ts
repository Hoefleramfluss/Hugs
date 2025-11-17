import { test, expect } from '@playwright/test';

const BASE_URL =
  process.env.PW_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000';

test.describe('Product Reviews', () => {
  test('should load product detail page without server errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/product/premium-organic-soil-mix`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveTitle(/Error/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Premium Organic Soil Mix/i);
    await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
  });
});
