import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOWNLOAD_BASE, DOWNLOAD_SLUGS, EXPECTED_ARTIFACTS, PAGES, RELEASE_BASE, ROOT, slugOf } from '../helpers'

/**
 * Every relative link resolves to a real file, every #anchor targets a real
 * id (same page or cross-page), every download button uses a slug the
 * /api/dl redirect accepts and carries its ?src tag, and any direct release
 * URL uses an artifact name electron-builder actually emits.
 */
for (const pageFile of PAGES) {
  test(`${pageFile}: internal links, anchors, download names`, async ({ page }) => {
    await page.goto(`/${pageFile}`)

    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(0)

    const problems: string[] = []
    for (const href of hrefs) {
      if (href.startsWith(DOWNLOAD_BASE)) {
        if (!(slugOf(href) in DOWNLOAD_SLUGS)) problems.push(`bad download slug: ${href}`)
        if (!/\?src=[a-z0-9-]+$/.test(href)) problems.push(`download link without ?src tag: ${href}`)
        continue
      }
      if (href.startsWith(RELEASE_BASE)) {
        const name = href.slice(RELEASE_BASE.length)
        if (!EXPECTED_ARTIFACTS.includes(name)) problems.push(`bad artifact name: ${href}`)
        continue
      }
      if (/^(https?:|mailto:|deckmaker:)/.test(href)) continue

      const [path, anchor] = href.split('#')
      const targetFile = path === '' ? pageFile : path
      if (!existsSync(join(ROOT, targetFile))) {
        problems.push(`dead link: ${href} (no ${targetFile})`)
        continue
      }
      if (anchor) {
        const html = readFileSync(join(ROOT, targetFile), 'utf8')
        if (!new RegExp(`id="${anchor}"`).test(html)) {
          problems.push(`dead anchor: ${href} (no id="${anchor}" in ${targetFile})`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  test(`${pageFile}: local assets load (no 404s)`, async ({ page }) => {
    const failed: string[] = []
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith('http://localhost')) failed.push(r.url())
    })
    await page.goto(`/${pageFile}`, { waitUntil: 'networkidle' })
    expect(failed).toEqual([])
  })
}
