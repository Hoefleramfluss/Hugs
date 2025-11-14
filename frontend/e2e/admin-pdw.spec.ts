import { test, expect } from '@playwright/test';

test.describe('Admin - Product of the Week', () => {

    test.beforeEach(async ({ page }) => {
        // Log in before each test
        await page.goto('/admin');
        await page.fill('input[id="email"]', 'admin@example.com');
        await page.fill('input[id="password"]', 'admin-password-placeholder');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/admin/products');
    });

    test('should allow an admin to set a new Product of the Week', async ({ page }) => {
        await page.goto('/admin/products');

        // Find the "Set as PDW" button for a product that is not the current PDW
        const setPdwButton = page.locator('button:has-text("Set as PDW")').first();
        
        // Get the row of the product we are about to change
        const productRow = page.locator('tr', { has: setPdwButton });
        const productTitle = await productRow.locator('td').first().textContent();
        
        expect(productTitle).not.toBeNull();

        await setPdwButton.click();

        // Wait for the button text to change, indicating a save is in progress
        await expect(setPdwButton).toHaveText('Saving...');
        
        // The page should reload, and the button for that product should now say "Active"
        await page.waitForURL('/admin/products'); // wait for reload
        const newActiveButton = page.locator('tr', { hasText: productTitle! }).locator('button:has-text("Active")');
        await expect(newActiveButton).toBeVisible();

        // Verify the change on the homepage's hero section
        await page.goto('/');
        const heroTitle = page.locator('div[class*="PDWHero"] h1');
        await expect(heroTitle).toHaveText(productTitle!);
    });
});
