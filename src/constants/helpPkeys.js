/**
 * Explicit tt_help_core pkeys for object identity fields where SPA control id is `pkey`
 * (or edit-identity-pkey) but the DB help row uses a legacy SARK pkey.
 */
export const OBJECT_PKEY_HELP = {
  tenant: 'tenantname',
  extension: 'blkstart',
  queue: 'qdd',
  route: 'route',
  trunk: 'trunkname',
  inboundRoute: 'didnumber',
  ivr: 'idd',
  conference: 'confpkey',
  greeting: 'greetingnum',
  agent: 'agent',
  cos: 'cosname',
  customApp: 'customappname',
  device: 'devtech',
  helpMessage: 'help_message_key'
}

/** Firewall table column → tt_help_core (UFW allow-list; F5). */
export const FIREWALL_FIELD_HELP = {
  proto: 'fwproto',
  port: 'fwdestports',
  source: 'fwsource',
  comment: 'fwdesc'
}
