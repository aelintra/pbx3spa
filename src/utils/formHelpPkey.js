/**
 * Map field `id` suffixes to tt_help_core.pkey when they differ from the column/id name.
 * See pbx3 sqlite_message.sql tt_help_core inserts.
 */

const IP_ID_TO_HELP_PKEY = {
  localip: 'localIP',
  publicip: 'edomaindig',
  sitename: 'sitename',
  'smtp-mailhub': 'smtphost',
  'smtp-user': 'smtpuser',
  'smtp-pass': 'smtppwd',
  'smtp-usetls': 'smtpusetls',
  'smtp-usestarttls': 'smtpusestrttls',
  timezone: 'timez'
}

/** Strip tenant subsection prefixes from create/detail dynamic field ids. */
const SECTION_PREFIX_RE =
  /^(?:edit-)?(?:timers|adv|rec|mon|cc|ldap)-/

/** Shorewall rule editor: fw-source-0, fw6-proto-3, etc. */
const FIREWALL_ID_RE = /^fw6?-([a-z]+)-\d+$/

const FIREWALL_FIELD_TO_PKEY = {
  source: 'fwsource',
  proto: 'fwproto',
  destports: 'fwdestports',
  connrate: 'connrate',
  desc: 'fwdesc'
}

const FIREWALL6_FIELD_TO_PKEY = {
  ...FIREWALL_FIELD_TO_PKEY,
  source: 'fwsource6'
}

/**
 * Column / derived id → tt_help_core.pkey (legacy Sail65 names and SPA aliases).
 */
const COLUMN_TO_HELP_PKEY = {
  greetnum: 'greeting',
  options: 'queueoptions',
  voip_max: 'voip_max',
  'voip-max': 'voip_max',
  voipmax: 'voip_max',
  passwd: 'password',
  'password-sip': 'password',
  extensionType: 'extchooser',
  spy_pass: 'spypass',
  allow_hash_xfer: 'allow_hash_transfer',
  masteroclo: 'masterclose',
  operator: 'clustersysop',
  queue1: 'q1',
  queue2: 'q2',
  queue3: 'q3',
  queue4: 'q4',
  queue5: 'q5',
  queue6: 'q6',
  'trunk-technology': 'chooser',
  extcode: 'directdial',
  disa: 'disapass',
  timeout: 'queuetimeout',
  'dest-timeout': 'outcome',
  'edit-timeout': 'outcome',
  'edit-greetnum': 'greeting',
  sip_user: 'desc',
  'sip-user': 'desc',
  edomain: 'edomaindig',
  provision: 'provisioning',
  provisionwith: 'provisionwith',
  type: 'conftype'
}

/**
 * @param {string} columnOrSuffix
 * @returns {string}
 */
function mapColumnToHelpPkey(columnOrSuffix) {
  return COLUMN_TO_HELP_PKEY[columnOrSuffix] ?? columnOrSuffix
}

/**
 * Derive helpcore lookup key from a form control id (convention: edit-*, edit-identity-*, ip-*, fw-*).
 * @param {string|null|undefined} id
 * @returns {string|null}
 */
export function deriveHelpPkeyFromFieldId(id) {
  if (id == null || id === '') return null

  if (id.startsWith('ip-')) {
    const rest = id.slice(3)
    return mapColumnToHelpPkey(IP_ID_TO_HELP_PKEY[rest] ?? rest)
  }

  const fwMatch = id.match(FIREWALL_ID_RE)
  if (fwMatch) {
    const field = fwMatch[1]
    const table = id.startsWith('fw6-') ? FIREWALL6_FIELD_TO_PKEY : FIREWALL_FIELD_TO_PKEY
    return table[field] ?? field
  }

  let key = id.replace(/^edit(-identity)?-/, '')
  key = key.replace(SECTION_PREFIX_RE, '')
  return mapColumnToHelpPkey(key)
}
