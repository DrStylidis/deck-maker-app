// Node port of test-results/files/VERIFY.md — reproduces every measurement
// quoted in the fix-pack task files so before/after numbers are comparable.
//
//   node tests/serve.mjs 8000 &        # serve the working tree
//   node tests/verify.mjs               # http://localhost:8000
//   node tests/verify.mjs https://theunintended.me
//
// Zero new dependencies: reuses the chromium that @playwright/test installs.
import { chromium } from 'playwright-core'

const BASE = process.argv[2] || 'http://localhost:8000'
const PAGES = ['index', 'why', 'keys', 'mcp', 'faq', 'privacy']

const LAYOUT = () => {
  const out = { iw: window.innerWidth, sw: document.documentElement.scrollWidth, overflow: [], small: [], gutters: {} }
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1))
      out.overflow.push(el.tagName + '.' + (el.className || '').toString().slice(0, 30))
  })
  // The real hit box: the element, its descendants (an icon overflowing its
  // link still takes the click), and any absolutely positioned ::before/::after
  // extension. Nav links: 44px tall, but three-letter items ("FAQ") stay ~40px
  // wide — widening them would overlap the neighbouring targets in the 8px nav.
  const px = (v) => (v && v.endsWith('px') ? parseFloat(v) : 0)
  document.querySelectorAll('a, button').forEach((el) => {
    const r0 = el.getBoundingClientRect()
    if (r0.height === 0) return
    let { top, bottom, left, right } = r0
    el.querySelectorAll('*').forEach((c) => { const r = c.getBoundingClientRect(); if (r.width && r.height) { top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); left = Math.min(left, r.left); right = Math.max(right, r.right) } })
    for (const ps of ['::before', '::after']) {
      const s = getComputedStyle(el, ps)
      if (s.content !== 'none' && s.position === 'absolute') { top = Math.min(top, r0.top + px(s.top)); bottom = Math.max(bottom, r0.bottom - px(s.bottom)); left = Math.min(left, r0.left + px(s.left)); right = Math.max(right, r0.right - px(s.right)) }
    }
    const w = right - left, h = bottom - top
    const minW = el.matches('.nav .lnk') ? 40 : 44
    if (h < 44 || w < minW) out.small.push((el.textContent || '').trim().slice(0, 22) + ' ' + Math.round(w) + 'x' + Math.round(h))
  })
  ;['.hero', '.section', '.stage', '.head.wrap', 'main.wrap'].forEach((sel) => {
    const el = document.querySelector(sel)
    // Padding sits inside the border box, so measure the computed side padding
    // and where the first child actually lands — not the element's own left.
    if (el) { const c = el.firstElementChild; const r = (c || el).getBoundingClientRect()
      out.gutters[sel] = parseFloat(getComputedStyle(el).paddingLeft) + '/' + Math.round(r.left) + '/' + Math.round(r.width) }
  })
  const t = document.querySelector('.nav .lnk .tail')
  if (t) { const r = t.getBoundingClientRect(); out.navTail = getComputedStyle(t).padding + ' box ' + Math.round(r.top) + '/' + Math.round(r.height) }
  const bl = document.querySelector('.brandlink')
  if (bl) out.brandLabel = bl.getAttribute('aria-label') || (bl.textContent || '').trim() || 'NONE'
  return out
}

function lum(hex) {
  const h = hex.replace('#', '')
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2])
}
function ratio(a, b) {
  const l = [lum(a), lum(b)].sort((x, y) => y - x)
  return Math.round(((l[0] + 0.05) / (l[1] + 0.05)) * 100) / 100
}

// Light theme pairs that must clear 4.5, except the h1 which must clear 3.0.
const CONTRAST = [
  ['--text-2 on --bg', '#5f636b', '#f5f5f6', 4.5],
  ['--text-3 on --bg', '#6c7078', '#f5f5f6', 4.5],
  ['--accent on --bg', '#35708b', '#f5f5f6', 4.5],
  ['--coral-ink h1 on --bg', '#d4553a', '#f5f5f6', 3.0],
  ['--focus on --bg', '#0d7ea0', '#f5f5f6', 3.0],
  ['--focus on btn', '#0d7ea0', '#0b0c0e', 3.0],
  ['dark --text-3 on dark bg', '#868b93', '#111315', 4.5],
]

let fails = 0
console.log('== contrast (token values, update these when tokens change)')
for (const [label, fg, bg, need] of CONTRAST) {
  const r = ratio(fg, bg)
  const ok = r >= need
  fails += ok ? 0 : 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)} (need ${need})  ${label}`)
}

const b = await chromium.launch()
for (const page of PAGES) {
  for (const w of [320, 390, 768, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' })
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/${page}.html`, { waitUntil: 'networkidle' })
    await pg.waitForTimeout(600)
    const r = await pg.evaluate(LAYOUT)
    const problems = []
    if (r.sw > r.iw) problems.push(`h-scroll ${r.sw}>${r.iw} ${JSON.stringify(r.overflow.slice(0, 4))}`)
    if (w <= 390 && r.small.length) problems.push(`${r.small.length} targets <44px e.g. ${JSON.stringify(r.small.slice(0, 3))}`)
    if (w <= 390) for (const [sel, g] of Object.entries(r.gutters)) if (parseFloat(g) < 24) problems.push(`no gutter on ${sel} (pad/childLeft/childWidth ${g})`)
    if (r.navTail && !r.navTail.startsWith('0px')) problems.push(`.tail collision ${r.navTail}`)
    if (r.brandLabel === 'NONE') problems.push('brandlink has no accessible name')
    fails += problems.length
    console.log(`${page.padEnd(9)} ${String(w).padStart(5)}  ${problems.length ? 'FAIL' : 'ok'}`)
    for (const x of problems) console.log(`            - ${x}`)
    await ctx.close()
  }
}
await b.close()

console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' PROBLEM(S)'}`)
process.exit(fails ? 1 : 0)
