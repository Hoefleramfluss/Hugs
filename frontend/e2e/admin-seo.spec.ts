import { test, expect } from '@playwright/test';

test.describe('Admin - SEO Management', () => {

    test.beforeEach(async ({ page }) => {
        // Log in before each test
        await page.goto('/admin');
        await page.fill('input[id="email"]', 'admin@example.com');
        await page.fill('input[id="password"]', 'admin-password-placeholder');
        await page.click('button[type="submit"]');
        // A better practice would be to wait for a specific element on the target page
        await page.waitForURL('/admin/products');
    });

    test('should display the SEO management page with its components', async ({ page }) => {
        // Navigate to the SEO page (assuming there's a link, otherwise go directly)
        // For this test, we'll navigate directly.
        await page.goto('/admin/seo');

        // Check that the main heading is visible
        await expect(page.locator('h1:has-text("SEO Management")')).toBeVisible();

        // Check for the components by their headings
        await expect(page.locator('h2:has-text("Global Meta Settings")')).toBeVisible();
        await expect(page.locator('h2:has-text("Site Health")')).toBeVisible();
        await expect(page.locator('h2:has-text("Organization JSON-LD")')).toBeVisible();

        // Check for an input in the meta editor
        await expect(page.locator('input[id="globalTitle"]')).toBeVisible();
    });
});
