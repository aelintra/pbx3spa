#!/usr/bin/env node
/**
 * One-shot (re-runnable) conversion of tt_help_core.htext HTML → Markdown in sqlite_message.sql.
 *
 * Usage (from pbx3spa):
 *   node scripts/convert-help-html-to-markdown.mjs           # dry-run summary
 *   node scripts/convert-help-html-to-markdown.mjs --write # rewrite SQL file
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlToMarkdown, sqlEscapeHelpString } from '../src/utils/helpTextFormat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SQL_PATH = path.resolve(
  __dirname,
  '../../pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_message.sql'
)

const INSERT_RE =
  /INSERT OR IGNORE INTO tt_help_core\(pkey,displayname,htext\) values \('([^']*)','([^']*)','((?:[^']|'')*)'\)/gi

function parseRows(sql) {
  const rows = []
  let m
  while ((m = INSERT_RE.exec(sql)) !== null) {
    rows.push({
      pkey: m[1],
      displayname: m[2],
      htext: m[3].replace(/''/g, "'")
    })
  }
  return rows
}

function buildSql(rows) {
  const lines = [
    '-- tt_help_core seed data. htext: Markdown (GFM). Regenerate: pbx3spa/scripts/convert-help-html-to-markdown.mjs',
    'BEGIN TRANSACTION;'
  ]
  for (const row of rows) {
    const h = sqlEscapeHelpString(row.htext)
    const d = sqlEscapeHelpString(row.displayname)
    const p = sqlEscapeHelpString(row.pkey)
    lines.push(
      `INSERT OR IGNORE INTO tt_help_core(pkey,displayname,htext) values ('${p}','${d}','${h}');`
    )
  }
  lines.push('', 'COMMIT;', '')
  return lines.join('\n')
}

const write = process.argv.includes('--write')
const sql = fs.readFileSync(SQL_PATH, 'utf8')
const rows = parseRows(sql)
if (rows.length === 0) {
  console.error('No tt_help_core rows parsed from', SQL_PATH)
  process.exit(1)
}

let changed = 0
for (const row of rows) {
  const next = htmlToMarkdown(row.htext)
  if (next !== row.htext) {
    changed++
    if (!write) {
      console.log(`\n--- ${row.pkey} ---`)
      console.log('BEFORE:', row.htext.slice(0, 120) + (row.htext.length > 120 ? '…' : ''))
      console.log('AFTER: ', next.slice(0, 120) + (next.length > 120 ? '…' : ''))
    }
    row.htext = next
  }
}

console.log(`Rows: ${rows.length}, converted: ${changed}`)

if (!write) {
  console.log('\nDry run only. Pass --write to update sqlite_message.sql')
  process.exit(0)
}

fs.writeFileSync(SQL_PATH, buildSql(rows), 'utf8')
console.log('Wrote', SQL_PATH)
