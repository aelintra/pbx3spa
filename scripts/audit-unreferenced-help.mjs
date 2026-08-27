#!/usr/bin/env node
/**
 * Reverse audit: tt_help_core rows never referenced by SPA form help wiring.
 *
 *   node scripts/audit-unreferenced-help.mjs           # report only
 *   node scripts/audit-unreferenced-help.mjs --prune   # rewrite sqlite_message.sql
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqlEscapeHelpString } from '../src/utils/helpTextFormat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPA_ROOT = path.resolve(__dirname, '..')
const PBX3_SQL = path.resolve(SPA_ROOT, '../pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_message.sql')

const { deriveHelpPkeyFromFieldId } = await import('../src/utils/formHelpPkey.js')
const {
  FIREWALL_FIELD_HELP,
  FIREWALL_ALLOW_RULES_HELP,
  IVR_KEYSTROKE_OPTIONS_HELP,
  ROUTE_PROFILE_DESTINATIONS_HELP,
  ROUTE_PROFILE_EXTRA_MODES_HELP,
  OBJECT_PKEY_HELP
} = await import('../src/constants/helpPkeys.js')

const FORM_COMPONENTS = new Set([
  'FormField',
  'FormSelect',
  'FormToggle',
  'FormReadonly',
  'FormSegmentedPill',
  'FormTimezoneSelect'
])

const INSERT_RE =
  /INSERT OR IGNORE INTO tt_help_core\(pkey,displayname,htext\) values \('([^']*)','([^']*)','((?:[^']|'')*)'\);/gi

function loadHelpCore() {
  const sql = fs.readFileSync(PBX3_SQL, 'utf8')
  const map = new Map()
  let m
  INSERT_RE.lastIndex = 0
  while ((m = INSERT_RE.exec(sql)) !== null) {
    const pkey = m[1]
    const htext = m[3].replace(/''/g, "'")
    map.set(pkey, { displayname: m[2], htext, sql: m[0] })
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

/** Literal help-pkey only — skip Vue expressions (`f.key`, `FIREWALL_FIELD_HELP.*`). */
function resolvePkey(helpPkey, id) {
  if (helpPkey && /^[a-z0-9_-]+$/i.test(helpPkey)) return helpPkey
  return id ? deriveHelpPkeyFromFieldId(id) : null
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
    const pkey = resolvePkey(helpPkey, id)
    if (!pkey) continue

    refs.push({
      pkey,
      view,
      component,
      id,
      label
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
        label: field.label
      })
    }
  }
  return refs
}

function loadConstantHelpPkeys() {
  return [
    ...Object.values(OBJECT_PKEY_HELP),
    ...Object.values(FIREWALL_FIELD_HELP),
    FIREWALL_ALLOW_RULES_HELP,
    IVR_KEYSTROKE_OPTIONS_HELP,
    ROUTE_PROFILE_DESTINATIONS_HELP,
    ROUTE_PROFILE_EXTRA_MODES_HELP
  ]
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

function collectReferencedPkeys(helpCore) {
  const vueFiles = walkVue(path.join(SPA_ROOT, 'src/views'))
  const allRefs = []

  for (const f of vueFiles) {
    allRefs.push(...scanVueFile(f))
  }
  allRefs.push(...loadTenantAdvancedFields())

  const referenced = new Map()
  for (const ref of allRefs) {
    if (!referenced.has(ref.pkey)) referenced.set(ref.pkey, [])
    referenced.get(ref.pkey).push(ref)
  }

  for (const pkey of loadConstantHelpPkeys()) {
    if (!referenced.has(pkey)) referenced.set(pkey, [{ pkey, view: 'helpPkeys.js', component: 'const' }])
  }

  const unreferenced = []
  for (const [pkey, row] of helpCore.entries()) {
    if (!referenced.has(pkey)) unreferenced.push({ pkey, ...row })
  }
  unreferenced.sort((a, b) => a.pkey.localeCompare(b.pkey))

  return { referenced, unreferenced }
}

function buildPrunedSql(helpCore, referenced) {
  const kept = [...helpCore.entries()]
    .filter(([pkey]) => referenced.has(pkey))
    .sort(([a], [b]) => a.localeCompare(b))

  const lines = [
    '-- tt_help_core seed data. htext: Markdown (GFM). Export: pbx3spa/scripts/export-help-core-to-sql.mjs',
    '-- Pruned: SPA-referenced rows only (audit-unreferenced-help.mjs --prune).',
    'BEGIN TRANSACTION;'
  ]

  for (const [, row] of kept) {
    lines.push(row.sql)
  }

  lines.push('', 'COMMIT;', '')
  return lines.join('\n')
}

function writeReport(helpCore, referenced, unreferenced) {
  const reportPath = path.join(SPA_ROOT, 'workingdocs/HELP_UNREFERENCED_IN_SPA.md')
  const lines = [
    '# tt_help_core rows not referenced by SPA field help',
    '',
    `**Generated:** ${new Date().toISOString().slice(0, 10)} · **Script:** \`scripts/audit-unreferenced-help.mjs\``,
    '',
    'Lists `tt_help_core` pkeys in `sqlite_message.sql` that no SPA form control resolves to via `help-pkey`, `deriveHelpPkeyFromFieldId()`, tenant advanced fields, or `helpPkeys.js` constants.',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| tt_help_core rows | ${helpCore.size} |`,
    `| SPA-referenced pkeys | ${referenced.size} |`,
    `| **Unreferenced** | **${unreferenced.length}** |`,
    '',
    '## Unreferenced help rows',
    ''
  ]

  if (unreferenced.length === 0) {
    lines.push('_None — seed matches SPA wiring._')
  } else {
    lines.push('| pkey | displayname |', '|------|-------------|')
    for (const row of unreferenced) {
      const name = (row.displayname ?? '').replace(/\|/g, '\\|')
      lines.push(`| \`${row.pkey}\` | ${name} |`)
    }
  }

  lines.push('')
  fs.writeFileSync(reportPath, lines.join('\n'))
  return reportPath
}

function main() {
  const prune = process.argv.includes('--prune')
  const helpCore = loadHelpCore()
  const { referenced, unreferenced } = collectReferencedPkeys(helpCore)
  const reportPath = writeReport(helpCore, referenced, unreferenced)

  console.log('=== SPA unreferenced help audit ===\n')
  console.log(`tt_help_core rows:     ${helpCore.size}`)
  console.log(`SPA-referenced pkeys:  ${referenced.size}`)
  console.log(`Unreferenced:          ${unreferenced.length}`)
  console.log('')

  if (unreferenced.length) {
    for (const row of unreferenced) {
      console.log(`- \`${row.pkey}\` — ${row.displayname}`)
    }
    console.log('')
  }

  if (prune) {
    if (unreferenced.length === 0) {
      console.log('Nothing to prune.')
    } else {
      const sql = buildPrunedSql(helpCore, referenced)
      fs.writeFileSync(PBX3_SQL, sql)
      console.log(`Pruned ${unreferenced.length} rows from ${PBX3_SQL}`)
      console.log(`Kept ${referenced.size} rows.`)
    }
  } else if (unreferenced.length) {
    console.log('Run with --prune to rewrite sqlite_message.sql (SPA-referenced rows only).')
  }

  console.log(`\nWrote ${reportPath}`)
}

main()
