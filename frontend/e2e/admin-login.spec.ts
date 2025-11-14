import { test, expect } from '@playwright/test';
import fallbackProducts from '../data/fallback-products.json';

test.describe('Storefront smoke', () => {
  test('loads storefront and allows admin login with mocked backend', async ({ page }) => {
    await page.route('**/api/products', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fallbackProducts),
      });
    });

    await page.route('**/api/products/pdw', route => {
      const heroProduct = fallbackProducts.find(product => product.productOfWeek) || fallbackProducts[0];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(heroProduct),
      });
    });

    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'test-token',
          user: { id: 'admin-id', email: 'admin@example.com', role: 'ADMIN' },
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Hugs Garden Growshop/i })).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toBeVisible();

    await page.goto('/admin');
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'admin-password-placeholder');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});
