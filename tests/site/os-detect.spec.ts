import { expect, test } from '@playwright/test'
import { CTA_PAGES, DOWNLOAD_BASE, platformInit, slugOf } from '../helpers'

/**
 * The OS-detection snippet rewrites #hero-dl / #nav-dl / #version per
 * platform from one BUILDS table. index.html additionally re-renders the
 * "also:" alternates row from the same table. The snippet is duplicated on
 * every CTA page — test every copy so a drift in one page can't ship.
 * Links go through the counted redirect (/api/dl/<slug>) and carry a
 * ?src=<page>-<button> tag so Stats can tell which link converts.
 */
const CASES = [
  { platform: 'Win32', slug: 'win-x64', label: /Windows/, req: 'Windows 10+ · x64' },
  { platform: 'Linux x86_64', slug: 'linux-x64', label: /Linux/, req: 'Linux · x86_64 AppImage' },
  { platform: 'MacIntel', slug: 'mac-arm64', label: /Mac/, req: 'macOS 11+ · Apple silicon' },
] as const

for (const pageFile of CTA_PAGES) {
  for (const { platform, slug, label, req } of CASES) {
    const pageSlug = pageFile.replace(/\.html$/, '')
    test(`${pageFile}: ${platform} → ${slug}`, async ({ page }) => {
      await page.addInitScript(platformInit(platform))
      // The version fetch must append the tag to the *detected* build's
      // requirements string (it used to blank the line on Win/Linux).
      await page.route('https://api.github.com/**', (route) =>
        route.fulfill({ json: { tag_name: 'v9.9.9' } }),
      )
      await page.goto(`/${pageFile}`)

      const hero = page.locator('#hero-dl')
      const nav = page.locator('#nav-dl')
      await expect(hero).toHaveAttribute('href', `${DOWNLOAD_BASE}${slug}?src=${pageSlug}-hero`)
      await expect(nav).toHaveAttribute('href', `${DOWNLOAD_BASE}${slug}?src=${pageSlug}-nav`)
      await expect(hero).toHaveText(label)

      // Requirements line is never empty; index gets the release tag prefixed.
      const version = page.locator('#version')
      if (pageFile === 'index.html') await expect(version).toHaveText(`v9.9.9 · ${req}`)
      else await expect(version).toHaveText(req)

      // Windows visitors see the SmartScreen note next to the button.
      const note = page.locator('#version + .meta')
      if (platform === 'Win32') await expect(note).toContainText(/SmartScreen/)
      else await expect(note).toHaveCount(0)

      if (pageFile === 'index.html') {
        // Alternates: exactly three, never the detected build, and Apple
        // silicon is present whenever the visitor is not on a Mac.
        const others = page.locator('#others a')
        await expect(others).toHaveCount(3)
        const hrefs = await others.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
        expect(hrefs.every((h) => h.startsWith(DOWNLOAD_BASE) && h.endsWith('?src=index-also'))).toBe(true)
        const slugs = hrefs.map(slugOf)
        expect(slugs).not.toContain(slug)
        if (platform !== 'MacIntel') expect(slugs).toContain('mac-arm64')
        else expect(slugs).toContain('mac-x64')
      }
    })
  }
}
