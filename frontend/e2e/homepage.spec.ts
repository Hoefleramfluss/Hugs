import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should display the main heading and products', async ({ page }) => {
        await page.goto('/');

        // Check for the main hero section if a product of the week exists
        const productOfWeek = await page.locator('h2:has-text("Product of the Week")').isVisible();
        if (productOfWeek) {
            await expect(page.locator('h1')).toBeVisible(); // Hero title
        }

        // Check for the products grid
        await expect(page.locator('h2:has-text("Our Products"), h2:has-text("More Products")')).toBeVisible();

        // Check that at least one product card is rendered
        const productCards = await page.locator('a[href^="/product/"]').count();
        expect(productCards).toBeGreaterThan(0);
    });

    test('clicking a product card should navigate to the product page', async ({ page }) => {
        await page.goto('/');

        // Find the first product card and click it
        const firstProductLink = page.locator('a[href^="/product/"]').first();
        const productUrl = await firstProductLink.getAttribute('href');
        expect(productUrl).not.toBeNull();
        await firstProductLink.click();

        // Verify the URL has changed to the product page
        await expect(page).toHaveURL(productUrl as string);
        
        // Check for a key element on the product page, like the "Add to Cart" button
        await expect(page.locator('button:has-text("Add to Cart")')).toBeVisible();
    });
});
