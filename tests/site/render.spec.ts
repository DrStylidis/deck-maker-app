import { expect, test } from '@playwright/test'
import { PAGES } from '../helpers'

/**
 * Render smoke per page × color scheme: content paints and nothing forces a
 * horizontal scrollbar. At iPhone width the sticky nav must stay one row
 * (BRIEF.md §Checks: "nav doesn't wrap at 375px").
 */
for (const pageFile of PAGES) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${pageFile} renders in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(`/${pageFile}`)
      await expect(page.locator('body')).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1)
    })
  }

  test(`${pageFile} at 375px: no overflow, nav stays one row`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/${pageFile}`)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1)

    const nav = await page.locator('nav.nav').boundingBox()
    expect(nav, 'nav.nav missing').not.toBeNull()
    expect(nav!.height, 'nav wrapped to a second row').toBeLessThan(72)
  })
}
