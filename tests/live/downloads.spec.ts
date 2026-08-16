import { expect, test } from '@playwright/test'
import { DOWNLOAD_BASE, EXPECTED_ARTIFACTS } from '../helpers'

/**
 * The four release download URLs every landing page links must resolve —
 * this is the "artifact renamed, every download button silently 404s" alarm.
 * Runs weekly and right after each desktop release (live-checks.yml).
 */
for (const name of EXPECTED_ARTIFACTS) {
  test(`releases/latest/download/${name} resolves`, async ({ request }) => {
    const url = DOWNLOAD_BASE + name
    let res = await request.head(url)
    if (res.status() >= 400) {
      // Some CDNs reject HEAD — a 1-byte ranged GET is the cheap fallback.
      res = await request.get(url, { headers: { range: 'bytes=0-0' } })
    }
    expect(res.status(), url).toBeLessThan(400)
  })
}
