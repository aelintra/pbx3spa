/**
 * Renders workingdocs/CREATE_EDIT_PANEL_FIELD_ORDER.md → .html for browser viewing.
 * Run: npm run docs:panel-inventory
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const mdPath = join(root, 'workingdocs/CREATE_EDIT_PANEL_FIELD_ORDER.md')
const outPath = join(root, 'workingdocs/CREATE_EDIT_PANEL_FIELD_ORDER.html')

const md = readFileSync(mdPath, 'utf8')
const body = marked.parse(md)

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Create &amp; edit panels — field order (rendered)</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      line-height: 1.55;
      max-width: 58rem;
      margin: 0 auto;
      padding: 1.25rem 1.5rem 3rem;
      color: #1e293b;
      background: #fff;
    }
    @media (prefers-color-scheme: dark) {
      body { color: #e2e8f0; background: #0f172a; }
      a { color: #93c5fd; }
      th, td { border-color: #334155 !important; }
      code { background: #1e293b !important; }
    }
    h1 { font-size: 1.65rem; margin-top: 0; }
    h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; }
    h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9rem; }
    th, td { border: 1px solid #cbd5e1; padding: 0.45rem 0.6rem; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media (prefers-color-scheme: dark) {
      th { background: #1e293b; }
      tr:nth-child(even) td { background: #0c1222; }
      h2 { border-bottom-color: #334155; }
    }
    code { font-size: 0.88em; background: #f1f5f9; padding: 0.12rem 0.35rem; border-radius: 4px; }
    pre { background: #f1f5f9; padding: 1rem; overflow: auto; border-radius: 6px; font-size: 0.85rem; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
    ul { padding-left: 1.35rem; }
    .doc-meta {
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    @media (prefers-color-scheme: dark) {
      .doc-meta { background: #1e293b; border-color: #334155; color: #94a3b8; }
    }
  </style>
</head>
<body>
  <p class="doc-meta"><strong>Rendered from</strong> <code>CREATE_EDIT_PANEL_FIELD_ORDER.md</code> — regenerate with <code>npm run docs:panel-inventory</code> in <code>pbx3spa/</code>, then open this file in your browser.</p>
  <main>
${body}
  </main>
</body>
</html>
`

writeFileSync(outPath, html, 'utf8')
console.log('Wrote', outPath)
