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

/** Firewall table column → tt_help_core (UFW allow-list; F5). Kept for formHelpPkey derive / docs. */
export const FIREWALL_FIELD_HELP = {
  proto: 'fwproto',
  port: 'fwdestports',
  source: 'fwsource',
  comment: 'fwdesc'
}

/** Firewall allow-rules table — one ? on section heading, not per cell. */
export const FIREWALL_ALLOW_RULES_HELP = 'firewall_allow_rules'

/** IVR create/edit — Keystroke options matrix (one ? on section heading, not per cell). */
export const IVR_KEYSTROKE_OPTIONS_HELP = 'ivr_keystroke_options'

/** Route profile edit — Destinations (open/closed); one ? on section heading. */
export const ROUTE_PROFILE_DESTINATIONS_HELP = 'route_profile_destinations'

/** Route profile edit — Additional schedule mode lines; one ? on section heading. */
export const ROUTE_PROFILE_EXTRA_MODES_HELP = 'route_profile_extra_modes'
