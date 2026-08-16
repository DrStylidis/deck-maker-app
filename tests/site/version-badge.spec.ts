import { expect, test } from '@playwright/test'
import { platformInit } from '../helpers'

const RELEASES_API = 'https://api.github.com/repos/DrStylidis/deck-maker-app/releases/latest'

/**
 * The index-only version badge: latest release tag lands in #version; when
 * the API is unreachable the static default must survive untouched.
 * Platform is pinned to Mac — on a Linux CI runner the OS-detect script
 * would otherwise blank #version and mask the result.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(platformInit('MacIntel'))
})

test('shows the latest release tag', async ({ page }) => {
  await page.route(RELEASES_API, (route) =>
    route.fulfill({ json: { tag_name: 'v9.9.9' } }),
  )
  await page.goto('/index.html')
  await expect(page.locator('#version')).toHaveText('v9.9.9 · macOS 11+ · Apple silicon')
})

test('keeps the default text when the API is unreachable', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.route(RELEASES_API, (route) => route.abort())
  await page.goto('/index.html')
  await expect(page.locator('#version')).toHaveText('macOS 11+ · Apple silicon')
  expect(errors).toEqual([])
})
