#!/usr/bin/env node
/**
 * Export tt_help_core from golden (or any instance DB) into sqlite_message.sql.
 *
 * Golden — export JSON only (no Node on server):
 *   sudo sqlite3 /opt/pbx3/db/sqlite.db -json \
 *     "SELECT pkey, displayname, htext FROM tt_help_core ORDER BY pkey;" \
 *     > tt_help_core.json
 *   scp golden:tt_help_core.json .
 *
 * Dev machine (from pbx3spa; JSON at workspace root pbx3-master/):
 *   node scripts/export-help-core-to-sql.mjs ../tt_help_core.json --write
 *   node scripts/export-help-core-to-sql.mjs /path/to/sqlite.db --write
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqlEscapeHelpString } from '../src/utils/helpTextFormat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT = path.resolve(
  __dirname,
  '../../pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_message.sql'
)

function buildSql(rows) {
  const lines = [
    '-- tt_help_core seed data. htext: Markdown (GFM). Export: pbx3spa/scripts/export-help-core-to-sql.mjs',
    'BEGIN TRANSACTION;'
  ]
  for (const row of rows) {
    const p = sqlEscapeHelpString(row.pkey ?? '')
    const d = sqlEscapeHelpString(row.displayname ?? '')
    const h = sqlEscapeHelpString(row.htext ?? '')
    lines.push(
      `INSERT OR IGNORE INTO tt_help_core(pkey,displayname,htext) values ('${p}','${d}','${h}');`
    )
  }
  lines.push('', 'COMMIT;', '')
  return lines.join('\n')
}

function loadFromJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim()
  if (!raw) return []
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) {
    throw new Error(`Expected JSON array in ${filePath}`)
  }
  return data
}

function loadFromSqlite(dbPath) {
  const out = execFileSync(
    'sqlite3',
    [
      dbPath,
      '-json',
      'SELECT pkey, displayname, htext FROM tt_help_core ORDER BY pkey;'
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  ).trim()
  if (!out) return []
  return JSON.parse(out)
}

function usage() {
  console.error(`Usage: node scripts/export-help-core-to-sql.mjs <sqlite.db|tt_help_core.json> [--write] [--out path]

  --write   Update sqlite_message.sql (default: dry-run counts only)
  --out     Output path (default: pbx3/.../sqlite_message.sql)`)
  process.exit(1)
}

const args = process.argv.slice(2)
const write = args.includes('--write')
const outIdx = args.indexOf('--out')
const outPath = outIdx >= 0 ? args[outIdx + 1] : DEFAULT_OUT
const source = args.find((a) => !a.startsWith('--') && a !== outPath)

if (!source) usage()

let rows
if (source.endsWith('.json')) {
  rows = loadFromJson(path.resolve(source))
} else {
  rows = loadFromSqlite(path.resolve(source))
}

if (rows.length === 0) {
  console.error('No tt_help_core rows found in', source)
  process.exit(1)
}

console.log(`Rows: ${rows.length} (from ${source})`)

if (!write) {
  console.log('Dry run. Pass --write to update', outPath)
  process.exit(0)
}

fs.writeFileSync(outPath, buildSql(rows), 'utf8')
console.log('Wrote', outPath)
