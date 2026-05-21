import { test, expect } from '@playwright/test'

test.describe('Feed', () => {
  test('home page loads and shows feed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main')).toBeVisible()
  })

  test('category page loads', async ({ page }) => {
    await page.goto('/category/hiperfokus')
    await expect(page.locator('main')).toBeVisible()
  })
})
