// Tiny zero-dependency static server for the test suite — serves the repo
// root so Playwright gets a real http:// origin. Usage: node tests/serve.mjs [port]
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PORT = Number(process.argv[2] || 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  if (path === '/' || path === '\\') path = '/index.html'
  const file = join(ROOT, path)
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`))
