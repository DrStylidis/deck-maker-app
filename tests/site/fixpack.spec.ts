import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CTA_PAGES, PAGES, ROOT } from '../helpers'

/**
 * Regression guard for the 2026-08-16 site fix pack (test-results/files/*):
 * mobile gutters, 320px overflow, the .tail selector collision, light-theme
 * contrast tokens, touch targets, landmarks/skip link, and the asset diet.
 * Each check names the task it protects.
 */

// --- 03: contrast tokens (pure math, no browser) ---------------------------
function lum(hex: string) {
  const v = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2])
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function token(html: string, name: string, dark = false) {
  const block = dark ? html.slice(html.indexOf('prefers-color-scheme: dark')) : html.slice(0, html.indexOf('prefers-color-scheme: dark'))
  const m = block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))
  return m ? m[1].toLowerCase() : null
}

test('03: light-theme tokens clear WCAG AA on every page', () => {
  const problems: string[] = []
  for (const pageFile of PAGES) {
    const html = readFileSync(join(ROOT, pageFile), 'utf8')
    const bg = token(html, '--bg')!
    const checks: [string, number][] = [['--text-2', 4.5], ['--accent', 4.5], ['--focus', 3]]
    if (pageFile !== 'privacy.html') checks.push(['--text-3', 4.5], ['--coral-ink', 3])
    for (const [name, need] of checks) {
      const fg = token(html, name)
      if (!fg) { problems.push(`${pageFile}: ${name} missing`); continue }
      const r = ratio(fg, bg)
      if (r < need) problems.push(`${pageFile}: ${name} ${fg} on ${bg} = ${r.toFixed(2)} (need ${need})`)
    }
    if (pageFile !== 'privacy.html') {
      const r = ratio(token(html, '--text-3', true)!, token(html, '--bg', true)!)
      if (r < 4.5) problems.push(`${pageFile}: dark --text-3 = ${r.toFixed(2)}`)
    }
    if (/rgba\(31, 185, 230, 0\.7\)/.test(html)) problems.push(`${pageFile}: hardcoded focus ring`)
  }
  expect(problems).toEqual([])
})

// --- 06: asset diet (static) ----------------------------------------------
test('06: no page loads the 512px icon, the Manrope TTF, or the 2k mark', () => {
  const problems: string[] = []
  for (const pageFile of PAGES) {
    const html = readFileSync(join(ROOT, pageFile), 'utf8')
    if (/Manrope-VariableFont/.test(html)) problems.push(`${pageFile}: Manrope TTF`)
    if (/src="assets\/icon_round_512x512\.png"/.test(html)) problems.push(`${pageFile}: 512px icon in markup`)
    if (/if-mark\.png/.test(html)) problems.push(`${pageFile}: full-size if-mark`)
    if (!/rel="preload" as="font"[^>]*Inter-Variable/.test(html)) problems.push(`${pageFile}: Inter not preloaded`)
  }
  expect(problems).toEqual([])
})

// --- 01 / 02 / 05: layout measurements -------------------------------------
const MEASURE = () => {
  const px = (v: string) => (v && v.endsWith('px') ? parseFloat(v) : 0)
  const small: string[] = []
  document.querySelectorAll<HTMLElement>('a, button').forEach((el) => {
    const r0 = el.getBoundingClientRect()
    if (r0.height === 0) return
    let { top, bottom, left, right } = r0
    el.querySelectorAll('*').forEach((c) => {
      const r = c.getBoundingClientRect()
      if (r.width && r.height) { top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); left = Math.min(left, r.left); right = Math.max(right, r.right) }
    })
    for (const ps of ['::before', '::after']) {
      const s = getComputedStyle(el, ps)
      if (s.content !== 'none' && s.position === 'absolute') {
        top = Math.min(top, r0.top + px(s.top)); bottom = Math.max(bottom, r0.bottom - px(s.bottom))
        left = Math.min(left, r0.left + px(s.left)); right = Math.max(right, r0.right - px(s.right))
      }
    }
    const minW = el.matches('.nav .lnk') ? 40 : 44 // three-letter nav items stay ~40px wide by design
    if (bottom - top < 44 || right - left < minW)
      small.push(`${(el.textContent || '').trim().slice(0, 24)} ${Math.round(right - left)}x${Math.round(bottom - top)}`)
  })
  const gutters: Record<string, number> = {}
  for (const sel of ['.hero', '.section', '.stage', '.head.wrap', 'main.wrap']) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) gutters[sel] = parseFloat(getComputedStyle(el).paddingLeft)
  }
  const tail = document.querySelector<HTMLElement>('.nav .lnk .tail')
  return {
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    small,
    gutters,
    tailPadding: tail ? getComputedStyle(tail).padding : '0px',
    brandLabel: document.querySelector('.brandlink')?.getAttribute('aria-label') ?? 'n/a',
    firstTab: (document.body.querySelector('a, button') as HTMLElement | null)?.className,
    mainId: document.querySelector('main')?.id,
    demoHidden: document.querySelector('.window')?.getAttribute('aria-hidden') ?? 'n/a',
  }
}

for (const pageFile of PAGES) {
  for (const width of [320, 390]) {
    test(`${pageFile} @ ${width}px: gutters, no overflow, 44px targets, no .tail collision`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.route('https://api.github.com/**', (r) => r.abort())
      await page.goto(`/${pageFile}`, { waitUntil: 'networkidle' })
      const m = await page.evaluate(MEASURE)
      expect(m.overflow, '01: horizontal overflow').toBeLessThanOrEqual(0)
      for (const [sel, pad] of Object.entries(m.gutters)) expect(pad, `01: ${sel} side gutter`).toBeGreaterThanOrEqual(24)
      expect(m.tailPadding, '02: .nav .lnk .tail must not pick up section padding').toBe('0px')
      expect(m.small, '05: targets under 44px').toEqual([])
      if (pageFile !== 'privacy.html') expect(m.brandLabel, '05: brand link name').toBe('Deck Maker, home')
      expect(m.firstTab, '05: skip link is the first tab stop').toBe('skip')
      expect(m.mainId, '05: main#content landmark').toBe('content')
      if (pageFile === 'index.html') expect(m.demoHidden, '05: demo window hidden from AT').toBe('true')
    })
  }
}

test('01: index desktop content column stays 1080px wide', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/index.html')
  const w = await page.$eval('.steps', (el) => el.getBoundingClientRect().width)
  expect(Math.round(w)).toBe(1080)
})

test('04: every CTA page carries the shared BUILDS table', () => {
  for (const pageFile of CTA_PAGES) {
    const html = readFileSync(join(ROOT, pageFile), 'utf8')
    expect(html, pageFile).toMatch(/const BUILDS = \[/)
    expect(html, pageFile).not.toMatch(/textContent = ''/)
  }
})
