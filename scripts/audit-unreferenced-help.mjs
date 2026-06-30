#!/usr/bin/env node
/**
 * Reverse audit: tt_help_core rows never referenced by SPA form help wiring.
 * Run from pbx3spa: node scripts/audit-unreferenced-help.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPA_ROOT = path.resolve(__dirname, '..')
const PBX3_SQL = path.resolve(SPA_ROOT, '../pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_message.sql')

const { deriveHelpPkeyFromFieldId } = await import('../src/utils/formHelpPkey.js')

const FORM_COMPONENTS = new Set([
  'FormField',
  'FormSelect',
  'FormToggle',
  'FormReadonly',
  'FormSegmentedPill'
])

function loadHelpCore() {
  const sql = fs.readFileSync(PBX3_SQL, 'utf8')
  const map = new Map()
  const re = /INSERT OR IGNORE INTO tt_help_core\(pkey,displayname,htext\) values \('([^']*)','([^']*)','((?:[^']|'')*)'\)/gi
  let m
  while ((m = re.exec(sql)) !== null) {
    const pkey = m[1]
    const htext = m[3].replace(/''/g, "'")
    map.set(pkey, { displayname: m[2], htext })
  }
  return map
}

function parseAttr(tag, name) {
  const patterns = [
    new RegExp(`\\b${name}="([^"]*)"`, 'i'),
    new RegExp(`\\b:${name}="'([^']*)'"`, 'i'),
    new RegExp(`\\b:${name}="([^"]*)"`, 'i'),
    new RegExp(`\\b:${name}='([^']*)'`, 'i')
  ]
  for (const re of patterns) {
    const match = tag.match(re)
    if (match) return match[1]
  }
  return null
}

function extractFormTags(content) {
  const tags = []
  const re = new RegExp(
    `<(${[...FORM_COMPONENTS].join('|')})\\b[\\s\\S]*?(?:/>|</\\1>)`,
    'gi'
  )
  let m
  while ((m = re.exec(content)) !== null) {
    tags.push({ component: m[1], tag: m[0] })
  }
  return tags
}

function scanVueFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const view = path.basename(filePath)
  const refs = []

  for (const { component, tag } of extractFormTags(content)) {
    const id = parseAttr(tag, 'id')
    const label = parseAttr(tag, 'label')
    const helpPkey =
      parseAttr(tag, 'help-pkey') ?? parseAttr(tag, 'helpPkey')
    const hideHelp =
      /\bhide-help\b/i.test(tag) || /:hide-help="true"/i.test(tag)

    const pkey =
      helpPkey ?? (id ? deriveHelpPkeyFromFieldId(id) : null)
    if (!pkey) continue

    refs.push({
      pkey,
      view,
      component,
      id,
      label,
      hideHelp
    })
  }

  return refs
}

function parseTenantFieldBlocks(body) {
  const fields = []
  const blockRe = /\{[\s\S]*?\}/g
  let bm
  while ((bm = blockRe.exec(body)) !== null) {
    const block = bm[0]
    const keyM = block.match(/\bkey:\s*'([^']+)'/)
    if (!keyM) continue
    const labelM = block.match(/\blabel:\s*'([^']+)'/)
    const helpM = block.match(/\bhelpPkey:\s*'([^']+)'/)
    fields.push({
      key: keyM[1],
      label: labelM?.[1] ?? keyM[1],
      helpPkey: helpM?.[1] ?? null
    })
  }
  return fields
}

function loadTenantAdvancedFields() {
  const file = path.join(SPA_ROOT, 'src/constants/tenantAdvanced.js')
  const content = fs.readFileSync(file, 'utf8')
  const refs = []
  const arrayRe = /export const (\w+_FIELDS) = \[([\s\S]*?)\n\]/g
  let am
  while ((am = arrayRe.exec(content)) !== null) {
    const section = am[1]
    for (const field of parseTenantFieldBlocks(am[2])) {
      refs.push({
        pkey: field.helpPkey ?? field.key,
        view: `TenantCreateView + TenantDetailView (${section})`,
        component: 'dynamic',
        id: `edit-${field.key}`,
        label: field.label,
        hideHelp: false
      })
    }
  }
  return refs
}

function walkVue(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkVue(p))
    else if (ent.name.endsWith('.vue')) out.push(p)
  }
  return out
}

function main() {
  const helpCore = loadHelpCore()
  const vueFiles = walkVue(path.join(SPA_ROOT, 'src/views'))
  let allRefs = []

  for (const f of vueFiles) {
    allRefs.push(...scanVueFile(f))
  }
  allRefs.push(...loadTenantAdvancedFields())

  const referenced = new Map()
  for (const ref of allRefs) {
    if (!referenced.has(ref.pkey)) {
      referenced.set(ref.pkey, [])
    }
    referenced.get(ref.pkey).push(ref)
  }

  const unreferenced = []
  for (const [pkey, row] of helpCore.entries()) {
    if (!referenced.has(pkey)) {
      unreferenced.push({ pkey, ...row })
    }
  }
  unreferenced.sort((a, b) => a.pkey.localeCompare(b.pkey))

  const reportPath = path.join(SPA_ROOT, 'workingdocs/HELP_UNREFERENCED_IN_SPA.md')
  const lines = [
    '# tt_help_core rows not referenced by SPA field help',
    '',
    `**Generated:** ${new Date().toISOString().slice(0, 10)} · **Script:** \`scripts/audit-unreferenced-help.mjs\``,
    '',
    'Lists `tt_help_core` pkeys in `sqlite_message.sql` that no SPA form control resolves to via `help-pkey`, `deriveHelpPkeyFromFieldId()`, or tenant advanced field keys.',
    '',
    'These rows may be legacy-only, awaiting a panel, or safe to retire after review.',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| tt_help_core rows | ${helpCore.size} |`,
    `| SPA-referenced pkeys | ${referenced.size} |`,
    `| **Unreferenced** | **${unreferenced.length}** |`,
    '',
    '## Unreferenced help rows',
    '',
    '| pkey | displayname |',
    '|------|-------------|'
  ]

  for (const row of unreferenced) {
    const name = (row.displayname ?? '').replace(/\|/g, '\\|')
    lines.push(`| \`${row.pkey}\` | ${name} |`)
  }

  lines.push('')
  fs.writeFileSync(reportPath, lines.join('\n'))

  console.log('=== SPA unreferenced help audit ===\n')
  console.log(`tt_help_core rows:     ${helpCore.size}`)
  console.log(`SPA-referenced pkeys:  ${referenced.size}`)
  console.log(`Unreferenced:          ${unreferenced.length}`)
  console.log('')
  for (const row of unreferenced) {
    console.log(`- \`${row.pkey}\` — ${row.displayname}`)
  }
  console.log(`\nWrote ${reportPath}`)
}

main()
