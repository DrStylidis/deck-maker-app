import { expect, test } from '@playwright/test'

/** The deployed site is up, is OUR site, and the hero CTA is in place. */
test('theunintended.me serves the landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Deck Maker/i)
  await expect(page.locator('#hero-dl')).toBeVisible()
  await expect(page.locator('nav.nav')).toBeVisible()
})
