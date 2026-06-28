/**
 * Explicit tt_help_core pkeys for object identity fields where SPA control id is `pkey`
 * (or edit-identity-pkey) but the DB help row uses a legacy Sail65 name.
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
  helpMessage: 'pkey'
}

/** Firewall table column → tt_help_core (IPv4 uses fw*; IPv6 source uses fwsource6). */
export const FIREWALL_FIELD_HELP = {
  source: 'fwsource',
  source6: 'fwsource6',
  proto: 'fwproto',
  destports: 'fwdestports',
  connrate: 'connrate',
  description: 'fwdesc'
}
