import { test, expect } from '@playwright/test';

test('has title and login', async ({ page }) => {
  await page.goto('/');

  // Should redirect to /login or /dashboard
  const url = page.url();
  expect(url).toContain('login');
  
  // Check for login text
  await expect(page.getByRole('heading')).toBeVisible();
});

test('can navigate to nutrition page', async ({ page }) => {
  // This test might fail if it requires login, 
  // but let's see where it goes.
  await page.goto('/dashboard/ernaehrung');
  
  // Just a smoke test to see if it doesn't crash
  await expect(page).toBeVisible;
});
