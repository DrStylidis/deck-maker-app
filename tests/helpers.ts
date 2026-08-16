import { fileURLToPath } from 'node:url'

/** Repo root (the served site root). */
export const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** All public pages. */
export const PAGES = ['index.html', 'why.html', 'keys.html', 'mcp.html', 'faq.html', 'privacy.html']

/** Pages that carry the download CTA + OS-detection script. */
export const CTA_PAGES = ['index.html', 'why.html', 'keys.html', 'mcp.html', 'faq.html']

export const DOWNLOAD_BASE =
  'https://github.com/DrStylidis/deck-maker-app/releases/latest/download/'

/**
 * What electron-builder actually emits (artifactName Deck-Maker-${arch}.${ext}
 * in the private monorepo — mirrored by its tests/e2e/admin/artifact-names
 * spec). AppImage arch naming is x86_64, not x64: linking x64 was a real,
 * silently-404ing bug once.
 */
export const EXPECTED_ARTIFACTS = [
  'Deck-Maker-arm64.dmg',
  'Deck-Maker-x64.dmg',
  'Deck-Maker-x64.exe',
  'Deck-Maker-x86_64.AppImage',
]

/** Fake a platform before any page script runs (the OS-detect snippet reads
 *  navigator.platform at parse time). */
export function platformInit(platform: string): string {
  return `Object.defineProperty(Navigator.prototype, 'platform', { get: () => ${JSON.stringify(platform)} })`
}
