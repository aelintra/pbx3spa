#!/usr/bin/env node
/**
 * Final-pass worklist: tt_help_core rows with empty htext (no ? icon in SPA today).
 * Run: node scripts/list-empty-help-htext.mjs [--write] [--exposed-only]
 *
 * Workflow (end of help exercise):
 *   1. node scripts/list-missing-help-pkeys.mjs --exposed-only --write
 *   2. Add rows / hide-help / wiring until missing list is done
 *   3. node scripts/list-empty-help-htext.mjs --exposed-only --write
 *   4. Fill htext in sqlite_message.sql (or Help Messages admin) for each row
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPA_ROOT = path.resolve(__dirname, '..')
const PBX3_SQL = path.resolve(SPA_ROOT, '../pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_message.sql')
const OUT = path.join(SPA_ROOT, 'workingdocs/FIELD_HELP_EMPTY_HTEXT.md')
const OUT_EXPOSED = path.join(SPA_ROOT, 'workingdocs/FIELD_HELP_EMPTY_HTEXT_EXPOSED.md')

const { deriveHelpPkeyFromFieldId } = await import('../src/utils/formHelpPkey.js')

const FORM_COMPONENTS = new Set([
  'FormField',
  'FormSelect',
  'FormToggle',
  'FormReadonly',
  'FormSegmentedPill',
  'FormTimezoneSelect'
])

const EXPOSED_VIEWS = new Set([
  'AccountPasswordView.vue',
  'AccountSecurityView.vue',
  'AgentCreateView.vue',
  'AgentDetailView.vue',
  'ClidBlockCreateView.vue',
  'ClidBlockDetailView.vue',
  'ConferenceCreateView.vue',
  'ConferenceDetailView.vue',
  'CustomAppCreateView.vue',
  'CustomAppDetailView.vue',
  'DayTimerCreateView.vue',
  'DayTimerDetailView.vue',
  'ExtensionCreateView.vue',
  'ExtensionDetailView.vue',
  'FirewallView.vue',
  'GreetingCreateView.vue',
  'GreetingDetailView.vue',
  'HelpMessageCreateView.vue',
  'HelpMessageDetailView.vue',
  'HolidayTimerCreateView.vue',
  'HolidayTimerDetailView.vue',
  'InboundRouteCreateView.vue',
  'InboundRouteDetailView.vue',
  'IvrCreateView.vue',
  'IvrDetailView.vue',
  'QueueCreateView.vue',
  'QueueDetailView.vue',
  'RouteCreateView.vue',
  'RouteDetailView.vue',
  'RouteProfileCreateView.vue',
  'RouteProfileDetailView.vue',
  'SupportLineTestView.vue',
  'SysglobalsEditView.vue',
  'TenantCreateView.vue',
  'TenantDetailView.vue',
  'TrunkCreateView.vue',
  'TrunkDetailView.vue',
  'UserCreateView.vue',
  'UserEditView.vue',
  'DialAliasCreateView.vue',
  'DialAliasDetailView.vue',
  'ClassOfServiceCreateView.vue',
  'ClassOfServiceDetailView.vue',
  'NetworkView.vue',
  'CertificatesView.vue',
  'BackupView.vue',
  'tenantAdvanced.js'
])

const VIEW_PANELS = {
  'AccountPasswordView.vue': { nav: 'Account → Change password', route: '/account/password' },
  'AccountSecurityView.vue': { nav: 'Account → Security (2FA)', route: '/account/security' },
  'AgentCreateView.vue': { nav: 'ACD → Agents → Create', route: '/agents/new' },
  'AgentDetailView.vue': { nav: 'ACD → Agents → Edit', route: '/agents/:shortuid' },
  'ClidBlockCreateView.vue': { nav: 'Inbound → Blocked caller IDs → Create', route: '/clidblocks/new' },
  'ClidBlockDetailView.vue': { nav: 'Inbound → Blocked caller IDs → Edit', route: '/clidblocks/:shortuid' },
  'ConferenceCreateView.vue': { nav: 'Extensions → Conferences → Create', route: '/conferences/new' },
  'ConferenceDetailView.vue': { nav: 'Extensions → Conferences → Edit', route: '/conferences/:shortuid' },
  'CustomAppCreateView.vue': { nav: 'System → Custom Apps → Create', route: '/customapps/new' },
  'CustomAppDetailView.vue': { nav: 'System → Custom Apps → Edit', route: '/customapps/:shortuid' },
  'DayTimerCreateView.vue': { nav: 'Routing → Day timers → Create', route: '/daytimers/new' },
  'DayTimerDetailView.vue': { nav: 'Routing → Day timers → Edit', route: '/daytimers/:shortuid' },
  'ExtensionCreateView.vue': { nav: 'Extensions → Create', route: '/extensions/new' },
  'ExtensionDetailView.vue': { nav: 'Extensions → Edit', route: '/extensions/:shortuid' },
  'FirewallView.vue': { nav: 'System → Firewall', route: '/firewall' },
  'GreetingCreateView.vue': { nav: 'ACD → Greetings → Create', route: '/greetings/new' },
  'GreetingDetailView.vue': { nav: 'ACD → Greetings → Edit', route: '/greetings/:shortuid' },
  'HelpMessageCreateView.vue': { nav: 'System → Help messages → Create', route: '/help-messages/new' },
  'HelpMessageDetailView.vue': { nav: 'System → Help messages → Edit', route: '/help-messages/:pkey' },
  'HolidayTimerCreateView.vue': { nav: 'Routing → Holiday timers → Create', route: '/holidaytimers/new' },
  'HolidayTimerDetailView.vue': { nav: 'Routing → Holiday timers → Edit', route: '/holidaytimers/:shortuid' },
  'InboundRouteCreateView.vue': { nav: 'Inbound → DID routes → Create', route: '/inbound-routes/new' },
  'InboundRouteDetailView.vue': { nav: 'Inbound → DID routes → Edit', route: '/inbound-routes/:shortuid' },
  'IvrCreateView.vue': { nav: 'ACD → IVRs → Create', route: '/ivrs/new' },
  'IvrDetailView.vue': { nav: 'ACD → IVRs → Edit', route: '/ivrs/:shortuid' },
  'QueueCreateView.vue': { nav: 'ACD → Queues / Ring groups → Create', route: '/queues/new' },
  'QueueDetailView.vue': { nav: 'ACD → Queues / Ring groups → Edit', route: '/queues/:shortuid' },
  'RouteCreateView.vue': { nav: 'Outbound → Routes → Create', route: '/routes/new' },
  'RouteDetailView.vue': { nav: 'Outbound → Routes → Edit', route: '/routes/:shortuid' },
  'RouteProfileCreateView.vue': { nav: 'Routing → Route profiles → Create', route: '/routeprofiles/new' },
  'RouteProfileDetailView.vue': { nav: 'Routing → Route profiles → Edit', route: '/routeprofiles/:shortuid' },
  'SupportLineTestView.vue': { nav: 'Tools → Line quality test', route: '/tools/line-test' },
  'SysglobalsEditView.vue': { nav: 'System → Instance Globals', route: '/sysglobals' },
  'TenantCreateView.vue': { nav: 'Tenants → Create', route: '/tenants/new' },
  'TenantDetailView.vue': { nav: 'Tenants → Edit', route: '/tenants/:pkey' },
  'TrunkCreateView.vue': { nav: 'Outbound → Trunks → Create', route: '/trunks/new' },
  'TrunkDetailView.vue': { nav: 'Outbound → Trunks → Edit', route: '/trunks/:shortuid' },
  'UserCreateView.vue': { nav: 'System → Users → Create', route: '/users/new' },
  'UserEditView.vue': { nav: 'System → Users → Edit', route: '/users/:id' },
  'DialAliasCreateView.vue': { nav: 'Outbound → Dial prefixes → Create', route: '/dialaliases/new' },
  'DialAliasDetailView.vue': { nav: 'Outbound → Dial prefixes → Edit', route: '/dialaliases/:shortuid' },
  'ClassOfServiceCreateView.vue': { nav: 'Routing → Class of Service → Create', route: '/cosrules/new' },
  'ClassOfServiceDetailView.vue': { nav: 'Routing → Class of Service → Edit', route: '/cosrules/:shortuid' },
  'NetworkView.vue': { nav: 'System → Network', route: '/ip-settings' },
  'CertificatesView.vue': { nav: 'System → Certificates', route: '/certificates' },
  'BackupView.vue': { nav: 'System → Backup', route: '/backup' },
  'tenantAdvanced.js': { nav: '(tenant advanced fields)', route: '—' }
}

function formatPanels(viewNames) {
  return viewNames
    .map((v) => {
      const p = VIEW_PANELS[v]
      if (!p) return v.replace(/View\.vue$/, '').replace(/\.vue$/, '')
      return `${p.nav} (\`${p.route}\`)`
    })
    .join('<br>')
}

function loadHelpCoreFull() {
  const sql = fs.readFileSync(PBX3_SQL, 'utf8')
  const map = new Map()
  const re =
    /INSERT OR IGNORE INTO tt_help_core\(pkey,displayname,htext\) values \('([^']*)','([^']*)','((?:[^']|'')*)'\)/gi
  let m
  while ((m = re.exec(sql)) !== null) {
    const pkey = m[1]
    const htext = m[3].replace(/''/g, "'")
    map.set(pkey, { displayname: m[2], htext })
  }
  return map
}

function parseAttr(tag, name) {
  for (const re of [
    new RegExp(`\\b${name}="([^"]*)"`, 'i'),
    new RegExp(`\\b:${name}="'([^']*)'"`, 'i'),
    new RegExp(`\\b:${name}="([^"]*)"`, 'i')
  ]) {
    const match = tag.match(re)
    if (match) return match[1]
  }
  return null
}

function resolvePkey(helpPkey, id) {
  if (helpPkey && /^[a-z0-9_-]+$/i.test(helpPkey)) return helpPkey
  return id ? deriveHelpPkeyFromFieldId(id) : null
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

function scanSpaFields() {
  const fields = []
  for (const f of walkVue(path.join(SPA_ROOT, 'src/views'))) {
    const view = path.basename(f)
    const content = fs.readFileSync(f, 'utf8')
    const re = new RegExp(
      `<(${[...FORM_COMPONENTS].join('|')})\\b[\\s\\S]*?(?:/>|</\\1>)`,
      'gi'
    )
    let m
    while ((m = re.exec(content)) !== null) {
      const tag = m[0]
      if (/\bhide-help\b/i.test(tag) || /:hide-help="true"/i.test(tag)) continue
      const id = parseAttr(tag, 'id')
      const label = parseAttr(tag, 'label')
      const rawHelp = parseAttr(tag, 'help-pkey') ?? parseAttr(tag, 'helpPkey')
      const pkey = resolvePkey(rawHelp, id)
      if (!pkey) continue
      fields.push({ view, label, id, pkey })
    }
  }

  const adv = fs.readFileSync(path.join(SPA_ROOT, 'src/constants/tenantAdvanced.js'), 'utf8')
  const arrayRe = /export const (\w+_FIELDS) = \[([\s\S]*?)\n\]/g
  let am
  while ((am = arrayRe.exec(adv)) !== null) {
    const blockRe = /\{[\s\S]*?\}/g
    let bm
    while ((bm = blockRe.exec(am[2])) !== null) {
      const block = bm[0]
      const keyM = block.match(/\bkey:\s*'([^']+)'/)
      if (!keyM) continue
      const labelM = block.match(/\blabel:\s*'([^']+)'/)
      const helpM = block.match(/\bhelpPkey:\s*'([^']+)'/)
      fields.push({
        view: 'tenantAdvanced.js',
        label: labelM?.[1] ?? keyM[1],
        id: `edit-${keyM[1]}`,
        pkey: helpM?.[1] ?? keyM[1]
      })
    }
  }

  return fields
}

function main() {
  const write = process.argv.includes('--write')
  const exposedOnly = process.argv.includes('--exposed-only')
  const helpCore = loadHelpCoreFull()

  const emptyRows = [...helpCore.entries()]
    .filter(([, row]) => !(row.htext ?? '').trim())
    .map(([pkey, row]) => ({ pkey, displayname: row.displayname ?? '' }))
    .sort((a, b) => a.pkey.localeCompare(b.pkey))

  const spaFields = scanSpaFields()
  const wiredByPkey = new Map()
  for (const f of spaFields) {
    if (!wiredByPkey.has(f.pkey)) wiredByPkey.set(f.pkey, [])
    wiredByPkey.get(f.pkey).push(f)
  }

  const entries = emptyRows.map((row) => {
    const uses = wiredByPkey.get(row.pkey) ?? []
    const views = [...new Set(uses.map((u) => u.view))].sort()
    const sampleLabel = uses[0]?.label ?? '—'
    const exposed = views.some((v) => EXPOSED_VIEWS.has(v))
    return { ...row, views, sampleLabel, exposed, wired: uses.length > 0 }
  })

  const scoped = exposedOnly
    ? entries.filter((e) => e.exposed && e.wired)
    : entries

  const lines = [
    '# tt_help_core rows with empty htext',
    '',
    `**Generated:** ${new Date().toISOString().slice(0, 10)} · **Script:** \`scripts/list-empty-help-htext.mjs\`${exposedOnly ? ' **`--exposed-only`**' : ''}`,
    '',
    'Final pass after missing-pkey worklist is clear. **`FieldHelpIcon` only renders when `htext` is non-empty** — add copy here (or use Help Messages admin) so **?** appears in SPA.',
    '',
    'Regenerate: `node scripts/list-empty-help-htext.mjs --write` · exposed wired fields only: add `--exposed-only`',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Empty htext rows in seed (all) | **${emptyRows.length}** |`,
    `| Wired in SPA (any panel) | ${entries.filter((e) => e.wired).length} |`,
    `| In this list | **${scoped.length}** |`,
    '',
    '## Rows needing htext',
    '',
    '| Done | pkey | displayname | Wired in SPA | Panel(s) / notes |',
    '|------|------|-------------|--------------|------------------|'
  ]

  for (const e of scoped) {
    const name = (e.displayname ?? '').replace(/\|/g, '\\|')
    const panels =
      e.views.length > 0
        ? formatPanels(e.views)
        : '_No SPA field wired — seed-only / legacy row_'
    lines.push(`| [ ] | \`${e.pkey}\` | ${name} | ${e.wired ? 'yes' : 'no'} | ${panels} |`)
  }

  if (!scoped.length) {
    lines.push('| — | _none_ | — | — | — |')
  }

  lines.push(
    '',
    '## Workflow',
    '',
    '1. Finish **`FIELD_HELP_MISSING_PKEYS_EXPOSED.md`** (rows + hide-help + wiring).',
    '2. Run this script (`--exposed-only --write`).',
    '3. Add operator-facing `htext` for each pkey in `sqlite_message.sql` (key = column name).',
    '4. Re-run `audit-field-help.mjs` — **Empty htext** should be 0 for exposed fields.',
    ''
  )

  const md = lines.join('\n')
  const outPath = exposedOnly ? OUT_EXPOSED : OUT

  if (write) fs.writeFileSync(outPath, md)
  console.log(md)
  if (write) console.log(`\nWrote ${outPath}`)
}

main()
