import { fileURLToPath } from 'node:url'

/** Repo root (the served site root). */
export const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** All public pages. */
export const PAGES = ['index.html', 'why.html', 'keys.html', 'mcp.html', 'faq.html', 'privacy.html']

/** Pages that carry the download CTA + OS-detection script. */
export const CTA_PAGES = ['index.html', 'why.html', 'keys.html', 'mcp.html', 'faq.html']

/** Where every download button points: the counted redirect on the API
 *  (GET /api/dl/<slug>?src=<page>-<button> → 302 to the GitHub asset). */
export const DOWNLOAD_BASE = 'https://decks.intendedfuture.ai/api/dl/'

/** Where the redirect lands. */
export const RELEASE_BASE =
  'https://github.com/DrStylidis/deck-maker-app/releases/latest/download/'

/** /api/dl slug → GitHub asset it redirects to (mirrors api/src/routes/download.ts). */
export const DOWNLOAD_SLUGS: Record<string, string> = {
  'mac-arm64': 'Deck-Maker-arm64.dmg',
  'mac-x64': 'Deck-Maker-x64.dmg',
  'win-x64': 'Deck-Maker-x64.exe',
  'linux-x64': 'Deck-Maker-x86_64.AppImage',
}

/** `https://…/api/dl/mac-arm64?src=index-hero` → `mac-arm64`. */
export function slugOf(href: string): string {
  return href.slice(DOWNLOAD_BASE.length).split('?')[0]
}

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
