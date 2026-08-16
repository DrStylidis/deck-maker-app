import { expect, test } from '@playwright/test'

/**
 * BRIEF.md §Checks: the FAQ must work with JavaScript disabled — native
 * <details> accordions, Mac default download links, and anchor targets that
 * clear the sticky nav.
 */
test.use({ javaScriptEnabled: false })

test('faq.html is fully usable without JavaScript', async ({ page }) => {
  await page.goto('/faq.html')

  // First accordion ships open; a closed one toggles natively on click.
  const first = page.locator('details').first()
  await expect(first).toHaveAttribute('open', '')
  const second = page.locator('details').nth(1)
  await expect(second).not.toHaveAttribute('open', '')
  await second.locator('summary').click()
  await expect(second).toHaveAttribute('open', '')

  // No JS → no OS detection → the Mac defaults must stand.
  await expect(page.locator('#hero-dl')).toHaveAttribute('href', /Deck-Maker-arm64\.dmg$/)
  await expect(page.locator('#nav-dl')).toHaveAttribute('href', /Deck-Maker-arm64\.dmg$/)

  // Category anchors (the h2s) must clear the 108px sticky nav.
  const margins = await page.$$eval('h2[id]', (hs) =>
    hs.map((h) => ({ id: h.id, margin: parseFloat(getComputedStyle(h).scrollMarginTop) })),
  )
  expect(margins.length).toBeGreaterThan(0)
  for (const { id, margin } of margins) {
    expect(margin, `#${id} scroll-margin-top`).toBeGreaterThanOrEqual(100)
  }
})
