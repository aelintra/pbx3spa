/**
 * tt_help_core.htext: Markdown (GFM subset) in DB; legacy HTML converted at source.
 */
import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true
})

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'code', 'pre', 'a'],
  ALLOWED_ATTR: ['href', 'rel', 'target']
}

/** Shown on Help message create/edit panels. */
export const HELP_TEXT_FORMAT_NOTE =
  'Help text may be plain text or Markdown. In field help popovers, Markdown is formatted (e.g. *italic*, **bold**, line breaks).'

const NAMED_ENTITIES = {
  '&rsquo;': "'",
  '&lsquo;': "'",
  '&rdquo;': '"',
  '&ldquo;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>'
}

/** Decode common HTML entities from legacy SARK help text. */
export function decodeHtmlEntities(text) {
  if (!text) return ''
  let out = text
  for (const [entity, ch] of Object.entries(NAMED_ENTITIES)) {
    out = out.split(entity).join(ch)
  }
  out = out.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  return out
}

/** Convert legacy inline HTML in htext to Markdown (idempotent on plain/Markdown text). */
export function htmlToMarkdown(htext) {
  if (!htext) return ''
  if (!/<[^>]+>|&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/.test(htext)) {
    return htext
  }

  let s = decodeHtmlEntities(htext)
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
  s = s.replace(/<[^>]+>/g, '')
  s = s
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

/** Render Markdown help text to safe HTML for popovers. */
export function renderHelpHtml(markdown) {
  const src = (markdown ?? '').trim()
  if (!src) return ''
  const raw = marked.parse(src, { async: false })
  return DOMPurify.sanitize(String(raw), PURIFY_CONFIG)
}

export function sqlEscapeHelpString(value) {
  return String(value).replace(/'/g, "''")
}
