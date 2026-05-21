import { test, expect } from '@playwright/test'

test.describe('Authentication flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('MINOR')).toBeVisible()
    await expect(page.getByPlaceholder('ornek@email.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible()
  })

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('button', { name: 'Kayıt Ol' })).toBeVisible()
  })

  test('forgot password page renders correctly', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByText('Sıfırlama bağlantısı gönder')).toBeVisible()
  })

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[type="email"]', 'not-an-email')
    await page.click('[type="submit"]')
    await expect(page.getByText('Geçerli bir e-posta adresi girin')).toBeVisible()
  })
})
