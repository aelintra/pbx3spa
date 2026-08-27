#!/usr/bin/env node
/**
 * Deduplicated list of SPA field pkeys with no tt_help_core row.
 * Run: node scripts/list-missing-help-pkeys.mjs [--write]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPA_ROOT = path.resolve(__dirname, '..')
const PBX3_SQL = path.resolve(SPA_ROOT, '../pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_message.sql')
const OUT = path.join(SPA_ROOT, 'workingdocs/FIELD_HELP_MISSING_PKEYS.md')

const { deriveHelpPkeyFromFieldId } = await import('../src/utils/formHelpPkey.js')

const FORM_COMPONENTS = new Set([
  'FormField',
  'FormSelect',
  'FormToggle',
  'FormReadonly',
  'FormSegmentedPill',
  'FormTimezoneSelect'
])

const DYNAMIC_RE =
  /[`$+]|FIREWALL_FIELD_HELP|OBJECT_PKEY_HELP|f\.helpPkey|\$\{|\+ item|rule\.pkey|index\}/

/** Instance SPA panels (nav, account menu, or standard create flows). */
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
  'BackupView.vue'
])

/** SPA nav label + route for operator lookup (matches AppLayout groups). */
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

function formatPanelsPlain(viewNames) {
  return viewNames
    .map((v) => {
      const p = VIEW_PANELS[v]
      if (!p) return v
      return `${p.nav} (${p.route})`
    })
    .join('; ')
}

const IDENTITY_READONLY_IDS = new Set(['edit-id', 'edit-identity-id'])

function isDisabledField(tag) {
  if (/:disabled="true"/i.test(tag)) return true
  if (/(?<![:\w])disabled(?=\s|\/?>)/i.test(tag)) return true
  return false
}

function isExposedField(field) {
  if (!EXPOSED_VIEWS.has(field.view)) return false
  if (field.component === 'FormReadonly') return false
  if (field.id && IDENTITY_READONLY_IDS.has(field.id)) return false
  if (isDisabledField(field.tag ?? '')) return false
  return true
}

function loadHelpCore() {
  const sql = fs.readFileSync(PBX3_SQL, 'utf8')
  const set = new Set()
  const re = /INSERT OR IGNORE INTO tt_help_core\(pkey,displayname,htext\) values \('([^']*)'/gi
  let m
  while ((m = re.exec(sql)) !== null) set.add(m[1])
  return set
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

function scanVue(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const view = path.basename(filePath)
  const fields = []
  const re = new RegExp(
    `<(${[...FORM_COMPONENTS].join('|')})\\b[\\s\\S]*?(?:/>|</\\1>)`,
    'gi'
  )
  let m
  while ((m = re.exec(content)) !== null) {
    const tag = m[0]
    const id = parseAttr(tag, 'id')
    const label = parseAttr(tag, 'label')
    const rawHelp = parseAttr(tag, 'help-pkey') ?? parseAttr(tag, 'helpPkey')
    const hideHelp = /\bhide-help\b/i.test(tag) || /:hide-help="true"/i.test(tag)
    if (hideHelp) continue
    const pkey = resolvePkey(rawHelp, id)
    if (!pkey) continue
    fields.push({ view, label, id, pkey, rawHelp, component: m[1], tag })
  }
  return fields
}

function loadTenantAdvanced() {
  const content = fs.readFileSync(
    path.join(SPA_ROOT, 'src/constants/tenantAdvanced.js'),
    'utf8'
  )
  const fields = []
  const arrayRe = /export const (\w+_FIELDS) = \[([\s\S]*?)\n\]/g
  let am
  while ((am = arrayRe.exec(content)) !== null) {
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
        pkey: helpM?.[1] ?? keyM[1],
        rawHelp: helpM?.[1] ?? null,
        component: 'tenantAdvanced'
      })
    }
  }
  return fields
}

function isNoise(field) {
  return (
    DYNAMIC_RE.test(field.pkey) ||
    DYNAMIC_RE.test(field.id ?? '') ||
    DYNAMIC_RE.test(field.rawHelp ?? '')
  )
}

function main() {
  const write = process.argv.includes('--write')
  const exposedOnly = process.argv.includes('--exposed-only')
  const helpCore = loadHelpCore()
  let all = []
  for (const f of walkVue(path.join(SPA_ROOT, 'src/views'))) {
    all.push(...scanVue(f))
  }
  all.push(...loadTenantAdvanced())

  const missing = all.filter((f) => !helpCore.has(f.pkey))
  const scoped = exposedOnly ? missing.filter(isExposedField) : missing
  const byPkey = new Map()
  for (const f of scoped) {
    if (!byPkey.has(f.pkey)) byPkey.set(f.pkey, [])
    byPkey.get(f.pkey).push(f)
  }

  const actionable = []
  const noise = []
  for (const [pkey, uses] of [...byPkey.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const sample = uses[0]
    const entry = {
      pkey,
      label: sample.label ?? '(no label)',
      id: sample.id ?? '—',
      views: [...new Set(uses.map((u) => u.view))].sort()
    }
    if (isNoise(sample)) noise.push(entry)
    else actionable.push(entry)
  }

  const lines = [
    '# SPA field pkeys missing from tt_help_core',
    '',
    `**Generated:** ${new Date().toISOString().slice(0, 10)} · **Script:** \`scripts/list-missing-help-pkeys.mjs\`${exposedOnly ? ' **`--exposed-only`**' : ''}`,
    '',
    exposedOnly
      ? 'Editable fields on instance SPA panels (nav / account / create flows). Excludes FormReadonly identity/audit stamps.'
      : 'Worklist for adding help rows to `pbx3/.../sqlite_message.sql` (or Help Messages admin).',
    'Regenerate: `node scripts/list-missing-help-pkeys.mjs --write` · exposed only: add `--exposed-only`',
    '',
    '**Final pass (after this list is done):** `node scripts/list-empty-help-htext.mjs --exposed-only --write` → **`FIELD_HELP_EMPTY_HTEXT_EXPOSED.md`**',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Unique missing pkeys (actionable) | **${actionable.length}** |`,
    `| Dynamic / audit-noise (fix wiring, not DB) | ${noise.length} |`,
    ''
  ]

  const sectionTitle = exposedOnly
    ? '## Exposed in SPA — editable fields needing help'
    : '## Actionable — add tt_help_core row (or help-pkey alias)'

  lines.push(
    sectionTitle,
    '',
    'Check off when row exists and field shows **?** help in SPA.',
    '',
    exposedOnly
      ? '| Done | pkey | Label (sample) | Panel(s) |'
      : '| Done | pkey | Label (sample) | Panel(s) | View file |',
    exposedOnly
      ? '|------|------|----------------|----------|'
      : '|------|------|----------------|----------|-----------|'
  )

  for (const e of actionable) {
    const label = (e.label ?? '').replace(/\|/g, '\\|')
    const panels = formatPanels(e.views)
    if (exposedOnly) {
      lines.push(`| [ ] | \`${e.pkey}\` | ${label} | ${panels} |`)
    } else {
      lines.push(
        `| [ ] | \`${e.pkey}\` | ${label} | ${panels} | ${e.views.join(', ')} |`
      )
    }
  }

  if (exposedOnly && actionable.length) {
    lines.push('', '## By panel', '')
    const byPanel = new Map()
    for (const e of actionable) {
      for (const v of e.views) {
        const p = VIEW_PANELS[v]
        const key = p?.nav ?? v
        if (!byPanel.has(key)) {
          byPanel.set(key, { route: p?.route ?? '', items: new Map() })
        }
        byPanel.get(key).items.set(e.pkey, e)
      }
    }
    for (const [panel, { route, items }] of [...byPanel.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      lines.push(`### ${panel}${route ? ` — \`${route}\`` : ''}`, '')
      for (const e of [...items.values()].sort((a, b) => a.pkey.localeCompare(b.pkey))) {
        lines.push(`- [ ] \`${e.pkey}\` — ${e.label}`)
      }
      lines.push('')
    }
  }

  if (noise.length) {
    const noiseScoped = exposedOnly
      ? noise.filter((e) => e.views.some((v) => EXPOSED_VIEWS.has(v)))
      : noise
    if (noiseScoped.length) {
      lines.push('', '## Audit noise — fix SPA wiring, not seed', '')
      lines.push(
        'Dynamic `:id` / `:help-pkey` on exposed panels — add static `help-pkey` (or alias in `formHelpPkey.js`).'
      )
      lines.push('')
      lines.push(
        '| pkey (raw) | Label | Panel(s) |',
        '|------------|-------|----------|'
      )
      for (const e of noiseScoped) {
        const label = (e.label ?? '').replace(/\|/g, '\\|')
        lines.push(`| \`${e.pkey}\` | ${label} | ${formatPanels(e.views)} |`)
      }
    }
  }

  lines.push('')
  const md = lines.join('\n')
  const outPath = exposedOnly
    ? path.join(SPA_ROOT, 'workingdocs/FIELD_HELP_MISSING_PKEYS_EXPOSED.md')
    : OUT

  if (write) fs.writeFileSync(outPath, md)
  console.log(md)
  if (write) console.log(`\nWrote ${outPath}`)
}

main()
