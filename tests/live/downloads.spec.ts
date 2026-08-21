import { expect, test } from '@playwright/test'
import { DOWNLOAD_BASE, DOWNLOAD_SLUGS, EXPECTED_ARTIFACTS, RELEASE_BASE } from '../helpers'

/**
 * The four release download URLs must resolve — this is the "artifact
 * renamed, every download button silently 404s" alarm. Runs weekly and right
 * after each desktop release (live-checks.yml).
 */
for (const name of EXPECTED_ARTIFACTS) {
  test(`releases/latest/download/${name} resolves`, async ({ request }) => {
    const url = RELEASE_BASE + name
    let res = await request.head(url)
    if (res.status() >= 400) {
      // Some CDNs reject HEAD — a 1-byte ranged GET is the cheap fallback.
      res = await request.get(url, { headers: { range: 'bytes=0-0' } })
    }
    expect(res.status(), url).toBeLessThan(400)
  })
}

/**
 * The buttons themselves go through the counted redirect. HEAD on purpose:
 * the API logs GET clicks only, so this check never shows up as a download.
 */
for (const [slug, name] of Object.entries(DOWNLOAD_SLUGS)) {
  test(`api/dl/${slug} redirects to ${name}`, async ({ request }) => {
    const url = `${DOWNLOAD_BASE}${slug}?src=live-check`
    const res = await request.head(url, { maxRedirects: 0 })
    expect(res.status(), url).toBe(302)
    expect(res.headers()['location'], url).toBe(RELEASE_BASE + name)
  })
}
