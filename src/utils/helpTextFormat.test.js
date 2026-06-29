import { vi, describe, expect, it } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html) =>
      String(html).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }
}))

import { decodeHtmlEntities, htmlToMarkdown, renderHelpHtml } from './helpTextFormat.js'

describe('decodeHtmlEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeHtmlEntities('&#34;calls&#34; &rsquo;ok&#8217;')).toBe('"calls" \'ok\u2019')
  })
})

describe('htmlToMarkdown', () => {
  it('converts br and i tags', () => {
    const src = 'e.g.:-<br/><i>0123456789</i><br/>pattern'
    expect(htmlToMarkdown(src)).toBe('e.g.:-\n*0123456789*\npattern')
  })

  it('leaves plain text unchanged', () => {
    const plain = 'Firewall Action - for PBX3 this is always ACCEPT'
    expect(htmlToMarkdown(plain)).toBe(plain)
  })

  it('is idempotent on markdown', () => {
    const md = 'Line one\n\n*example*'
    expect(htmlToMarkdown(md)).toBe(md)
  })
})

describe('renderHelpHtml', () => {
  it('renders markdown emphasis and line breaks', () => {
    const html = renderHelpHtml('Line one\n\n*example*')
    expect(html).toContain('<em>')
    expect(html).toContain('example')
  })

  it('strips script tags from malicious markdown', () => {
    const html = renderHelpHtml('Hello<script>alert(1)</script>')
    expect(html.toLowerCase()).not.toContain('script')
  })
})
