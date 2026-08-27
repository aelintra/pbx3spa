#!/usr/bin/env node
/**
 * Audit SPA form fields against tt_help_core (sqlite_message.sql).
 * Run from pbx3spa: node scripts/audit-field-help.mjs
 * Final-pass empty-htext worklist: node scripts/list-empty-help-htext.mjs [--exposed-only] [--write]
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
  'FormSegmentedPill',
  'FormTimezoneSelect'
])

/** Track B panel tiers (view basename → tier). */
const VIEW_TIER = {
  ExtensionCreateView: 1,
  ExtensionDetailView: 1,
  TenantCreateView: 1,
  TenantDetailView: 1,
  QueueCreateView: 1,
  QueueDetailView: 1,
  RouteCreateView: 1,
  RouteDetailView: 1,
  TrunkCreateView: 1,
  TrunkDetailView: 1,
  InboundRouteCreateView: 1,
  InboundRouteDetailView: 1,
  IvrCreateView: 1,
  IvrDetailView: 1,
  BackupView: 2,
  CertificatesView: 2,
  SysglobalsEditView: 2,
  NetworkView: 2,
  FirewallView: 2,
  AgentCreateView: 3,
  AgentDetailView: 3,
  ClassOfServiceCreateView: 3,
  ClassOfServiceDetailView: 3,
  DayTimerCreateView: 3,
  DayTimerDetailView: 3,
  HolidayTimerCreateView: 3,
  HolidayTimerDetailView: 3,
  GreetingCreateView: 3,
  GreetingDetailView: 3,
  ConferenceCreateView: 3,
  ConferenceDetailView: 3,
  CustomAppCreateView: 3,
  CustomAppDetailView: 3,
  UserCreateView: 4,
  HelpMessageCreateView: 4,
  HelpMessageDetailView: 4,
  LoginView: 2
}

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
    const m = tag.match(re)
    if (m) return m[1]
  }
  if (/\bhide-help\b/i.test(tag) || /\b:hide-help="true"/i.test(tag)) {
    if (name === 'hideHelp') return 'true'
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
  const fields = []

  for (const { component, tag } of extractFormTags(content)) {
    const id = parseAttr(tag, 'id')
    const label = parseAttr(tag, 'label')
    const helpPkey =
      parseAttr(tag, 'help-pkey') ?? parseAttr(tag, 'helpPkey')
    const hideHelp =
      /\bhide-help\b/i.test(tag) || /:hide-help="true"/i.test(tag)

    fields.push({
      view,
      component,
      id,
      label,
      helpPkey,
      hideHelp,
      source: 'vue'
    })
  }

  return fields
}

/** Parse { key, label, helpPkey } from tenantAdvanced.js *_FIELDS arrays. */
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
  const fields = []
  const arrayRe = /export const (\w+_FIELDS) = \[([\s\S]*?)\n\]/g
  let am
  while ((am = arrayRe.exec(content)) !== null) {
    const section = am[1]
    for (const field of parseTenantFieldBlocks(am[2])) {
      fields.push({
        view: `TenantCreateView + TenantDetailView (${section})`,
        component: 'dynamic',
        id: `edit-${field.key}`,
        label: field.label,
        helpPkey: field.helpPkey,
        hideHelp: false,
        source: 'tenantAdvanced'
      })
    }
  }
  return fields
}

/** Plain <label class="form-label"> without Form* components (Backup, Certificates, Login). */
function scanPlainLabels(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const view = path.basename(filePath)
  const fields = []
  const re = /<label\b[^>]*class="[^"]*form-label[^"]*"[^>]*>([\s\S]*?)<\/label>/gi
  let m
  while ((m = re.exec(content)) !== null) {
    const inner = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!inner || inner.length > 80) continue
    fields.push({
      view,
      component: 'plain-label',
      id: null,
      label: inner.split('\n')[0].trim(),
      helpPkey: null,
      hideHelp: false,
      source: 'plain-label',
      noHelpWiring: true
    })
  }
  return fields
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

function classifyField(field, helpCore) {
  if (field.hideHelp) return 'hidden'
  if (field.noHelpWiring) return 'no_wiring'

  const pkey =
    field.helpPkey ??
    (field.id ? deriveHelpPkeyFromFieldId(field.id) : field.label)

  if (!pkey) return 'no_pkey'

  const row = helpCore.get(pkey)
  if (!row) return 'missing'
  if (!(row.htext ?? '').trim()) return 'empty_htext'
  return 'ok'
}

function main() {
  const helpCore = loadHelpCore()
  const vueFiles = walkVue(path.join(SPA_ROOT, 'src/views'))
  let allFields = []

  for (const f of vueFiles) {
    allFields.push(...scanVueFile(f))
    const base = path.basename(f)
    if (['BackupView.vue', 'CertificatesView.vue', 'LoginView.vue'].includes(base)) {
      allFields.push(...scanPlainLabels(f))
    }
  }
  allFields.push(...loadTenantAdvancedFields())

  // Dedupe tenant advanced: vue scan may duplicate dynamic bindings — prefer tenantAdvanced entries
  const seen = new Set()
  allFields = allFields.filter((f) => {
    const key = `${f.view}|${f.id ?? f.label}|${f.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const enriched = allFields.map((f) => {
    const status = classifyField(f, helpCore)
    const pkey =
      f.hideHelp || f.noHelpWiring
        ? null
        : (f.helpPkey ?? (f.id ? deriveHelpPkeyFromFieldId(f.id) : null))
    const viewBase = f.view.split(' ')[0].split('(')[0].trim()
    const tier = VIEW_TIER[viewBase] ?? null
    return { ...f, pkey, status, tier }
  })

  const missing = enriched.filter((f) => f.status === 'missing')
  const noWiring = enriched.filter((f) => f.status === 'no_wiring')
  const hidden = enriched.filter((f) => f.status === 'hidden')
  const empty = enriched.filter((f) => f.status === 'empty_htext')
  const ok = enriched.filter((f) => f.status === 'ok')

  const byTier = (list) => {
    const g = {}
    for (const f of list) {
      const t = f.tier ?? 9
      if (!g[t]) g[t] = []
      g[t].push(f)
    }
    return g
  }

  console.log('=== SPA field help audit ===\n')
  console.log(`tt_help_core rows: ${helpCore.size}`)
  console.log(`Form fields scanned: ${enriched.length}`)
  console.log(`  Has help:        ${ok.length}`)
  console.log(`  Missing pkey:    ${missing.length}`)
  console.log(`  Empty htext:     ${empty.length}`)
  console.log(`  hide-help:       ${hidden.length}`)
  console.log(`  No Form* wiring: ${noWiring.length}`)
  console.log('')

  function printGroup(title, list) {
    if (!list.length) return
    console.log(`\n## ${title} (${list.length})\n`)
    const byView = {}
    for (const f of list.sort((a, b) => a.view.localeCompare(b.view) || (a.label ?? '').localeCompare(b.label ?? ''))) {
      if (!byView[f.view]) byView[f.view] = []
      byView[f.view].push(f)
    }
    for (const [view, fields] of Object.entries(byView).sort()) {
      console.log(`### ${view}`)
      for (const f of fields) {
        const pkey = f.pkey ? ` → pkey \`${f.pkey}\`` : ''
        console.log(`- **${f.label ?? '(no label)'}** (${f.component}, id=${f.id ?? '—'})${pkey}`)
      }
      console.log('')
    }
  }

  printGroup('Tier 1–2: missing help', missing.filter((f) => f.tier && f.tier <= 2))
  printGroup('Tier 1–2: no Form* help wiring', noWiring.filter((f) => f.tier && f.tier <= 2))
  printGroup('Tier 3–4: missing help', missing.filter((f) => f.tier && f.tier >= 3))
  printGroup('All tiers: missing help', missing)
  printGroup('hide-help (intentionally suppressed)', hidden)
  printGroup('Empty htext in DB', empty)

  // Write markdown report
  const reportPath = path.join(SPA_ROOT, 'workingdocs/FIELD_HELP_COVERAGE_AUDIT.md')
  const lines = [
    '# SPA field help coverage audit',
    '',
    `**Generated:** ${new Date().toISOString().slice(0, 10)} · **Script:** \`scripts/audit-field-help.mjs\``,
    '',
    'Cross-checks SPA form labels against `tt_help_core` in `pbx3/.../sqlite_message.sql`.',
    'A field is **missing help** when its derived `pkey` has no row, or `htext` is empty.',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| tt_help_core rows | ${helpCore.size} |`,
    `| Fields scanned | ${enriched.length} |`,
    `| Has help | ${ok.length} |`,
    `| **Missing pkey** | **${missing.length}** |`,
    `| Empty htext | ${empty.length} |`,
    `| hide-help | ${hidden.length} |`,
    `| No Form* wiring | ${noWiring.length} |`,
    '',
    '## Tier 1–2 — stakeholder demo path (gaps first)',
    ''
  ]

  function mdSection(title, list) {
    if (!list.length) return [`### ${title}`, '', '_None._', '']
    const out = [`### ${title}`, '']
    const byView = {}
    for (const f of list.sort((a, b) => a.view.localeCompare(b.view) || (a.label ?? '').localeCompare(b.label ?? ''))) {
      if (!byView[f.view]) byView[f.view] = []
      byView[f.view].push(f)
    }
    for (const [view, fields] of Object.entries(byView).sort()) {
      out.push(`#### ${view}`, '')
      out.push('| Label | Component | id | pkey |')
      out.push('|-------|-----------|-----|------|')
      for (const f of fields) {
        out.push(`| ${f.label ?? '—'} | ${f.component} | ${f.id ?? '—'} | ${f.pkey ?? '—'} |`)
      }
      out.push('')
    }
    return out
  }

  lines.push(...mdSection('Missing help (Tier 1–2)', missing.filter((f) => f.tier && f.tier <= 2)))
  lines.push(...mdSection('No Form* wiring — needs component + pkey (Tier 1–2)', noWiring.filter((f) => f.tier && f.tier <= 2)))
  lines.push('## All panels — missing help', '')
  lines.push(...mdSection('Missing help (all tiers)', missing))
  lines.push(...mdSection('hide-help (review — remove when rows exist)', hidden))
  lines.push(...mdSection('Empty htext in DB', empty))

  fs.writeFileSync(reportPath, lines.join('\n'))
  console.log(`\nWrote ${reportPath}`)
}

main()
