/**
 * Map field `id` suffixes (after `ip-`) to tt_help_core.pkey when they differ from the id.
 * See pbx3 sqlite_message.sql tt_help_core inserts.
 */
const IP_ID_TO_HELP_PKEY = {
  localip: 'localIP',
  publicip: 'edomaindig',
  'smtp-mailhub': 'smtphost',
  'smtp-user': 'smtpuser',
  'smtp-pass': 'smtppwd',
  'smtp-usetls': 'smtpusetls',
  'smtp-usestarttls': 'smtpusestrttls',
  timezone: 'timez'
}

/**
 * Derive helpcore lookup key from a form control id (convention: edit-*, edit-identity-*, ip-*).
 * @param {string|null|undefined} id
 * @returns {string|null}
 */
export function deriveHelpPkeyFromFieldId(id) {
  if (id == null || id === '') return null
  if (id.startsWith('ip-')) {
    const rest = id.slice(3)
    return IP_ID_TO_HELP_PKEY[rest] ?? rest
  }
  return id.replace(/^edit(-identity)?-/, '')
}
