import { test, expect } from '@playwright/test';

test.describe('Product Reviews', () => {
    test('should display reviews on a product page', async ({ page }) => {
        // Go to a specific product page that is known to have reviews
        await page.goto('/product/premium-organic-soil-mix');

        // Check for the reviews section heading
        await expect(page.locator('h2:has-text("Customer Reviews")')).toBeVisible();

        // Check that at least one review is visible by looking for some review text
        // Note: this depends on mock data in the component for now
        const reviewLocator = page.locator('p:has-text("Great product, exceeded my expectations!")');
        await expect(reviewLocator).toBeVisible();
    });
});
