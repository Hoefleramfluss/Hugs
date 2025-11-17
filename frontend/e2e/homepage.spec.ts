import { test, expect } from '@playwright/test';

const BASE_URL =
  process.env.PW_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000';

test.describe('Homepage', () => {
  test('renders without errors and shows hero content', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveTitle(/Error/i);

    await expect(page.getByRole('link', { name: /GrowShop/i })).toBeVisible();

    await expect(page.locator('body')).not.toContainText(/Internal Server Error/i);
  });
});
