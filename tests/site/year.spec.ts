import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGES, ROOT } from '../helpers'

/**
 * Every © year on every page must be the current year. The site is static
 * HTML with hardcoded years, so this intentionally goes red each 1 January —
 * that failure IS the reminder (the private monorepo has the same rule as
 * pnpm lint:year, which can't see this repo).
 */
test('copyright years are current', () => {
  const year = String(new Date().getFullYear())
  const stale: string[] = []
  for (const pageFile of PAGES) {
    const html = readFileSync(join(ROOT, pageFile), 'utf8')
    for (const m of html.matchAll(/©(?:\s*Copyright)?\s*(20\d\d)/gi)) {
      if (m[1] !== year) stale.push(`${pageFile}: "${m[0]}" (expected ${year})`)
    }
  }
  expect(stale).toEqual([])
})
