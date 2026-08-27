# SPA field pkeys missing from tt_help_core

**Generated:** 2026-08-26 · **Script:** `scripts/list-missing-help-pkeys.mjs`

Worklist for adding help rows to `pbx3/.../sqlite_message.sql` (or Help Messages admin).
Regenerate: `node scripts/list-missing-help-pkeys.mjs --write`

| Metric | Count |
|--------|------:|
| Unique missing pkeys (actionable) | **45** |
| Dynamic / audit-noise (fix wiring, not DB) | 23 |

## Actionable — add tt_help_core row (or help-pkey alias)

Check off when row exists and field shows **?** help in SPA.

| Done | pkey | Label (sample) | Views |
|------|------|----------------|-------|
| [ ] | `closed-dest` | Closed destination | RouteProfileCreateView.vue |
| [ ] | `cluster-ro` | Tenant | ClidBlockDetailView.vue |
| [ ] | `confirmCode` | Authentication code from your app | AccountSecurityView.vue |
| [ ] | `currentPassword` | Current password | AccountPasswordView.vue |
| [ ] | `disableCode` | Authenticator or recovery code | AccountSecurityView.vue |
| [ ] | `disablePassword` | Current password | AccountSecurityView.vue |
| [ ] | `email` | Email | UserCreateView.vue, UserEditView.vue |
| [ ] | `end` | End time | DayTimerDetailView.vue |
| [ ] | `end-datetime` | End | HolidayTimerDetailView.vue |
| [ ] | `ext_len` | Extension length | TenantCreateView.vue |
| [ ] | `ext-len` | Extension length | TenantDetailView.vue |
| [ ] | `force-mode` | Force mode (optional) | HolidayTimerDetailView.vue |
| [ ] | `htext` | Help text | HelpMessageCreateView.vue, HelpMessageDetailView.vue |
| [ ] | `iaxreg` | IAX reg | TrunkDetailView.vue |
| [ ] | `id` | KSUID | AgentDetailView.vue, ConferenceDetailView.vue, CustomAppDetailView.vue, DayTimerDetailView.vue, ExtensionDetailView.vue, GreetingDetailView.vue, HolidayTimerDetailView.vue, InboundRouteDetailView.vue, IvrDetailView.vue, QueueDetailView.vue, RouteDetailView.vue, TenantDetailView.vue, TrunkDetailView.vue |
| [ ] | `log-local-cdr` | Local days — CDR CSV | SysglobalsEditView.vue |
| [ ] | `log-local-messages` | Local days — Asterisk messages | SysglobalsEditView.vue |
| [ ] | `log-local-syslog` | Local days — syslog | SysglobalsEditView.vue |
| [ ] | `log-s3-cdr` | S3 maxage days — CDR | SysglobalsEditView.vue |
| [ ] | `log-s3-messages` | S3 maxage days — Asterisk messages | SysglobalsEditView.vue |
| [ ] | `log-s3-syslog` | S3 maxage days — syslog | SysglobalsEditView.vue |
| [ ] | `name` | Name | RouteProfileCreateView.vue, RouteProfileDetailView.vue, UserCreateView.vue, UserEditView.vue |
| [ ] | `newPassword` | New password | UserEditView.vue |
| [ ] | `newPasswordConfirm` | Confirm new password | UserEditView.vue |
| [ ] | `open-dest` | Open destination | RouteProfileCreateView.vue |
| [ ] | `original` | Original filename | GreetingDetailView.vue |
| [ ] | `park-overlay` | Parking overlay | TenantDetailView.vue |
| [ ] | `passwordConfirm` | Confirm new password | AccountPasswordView.vue, UserCreateView.vue |
| [ ] | `pjsipreg` | SIP registration | TrunkDetailView.vue |
| [ ] | `pkey` | Caller ID | ClidBlockCreateView.vue, ClidBlockDetailView.vue, HelpMessageCreateView.vue, HelpMessageDetailView.vue, TenantCreateView.vue |
| [ ] | `priority` | Priority (higher wins) | DayTimerDetailView.vue |
| [ ] | `queue-overlay` | Queue overlay | QueueDetailView.vue |
| [ ] | `route-profile` | Route profile | InboundRouteCreateView.vue |
| [ ] | `setupPassword` | Current password | AccountSecurityView.vue |
| [ ] | `slt-pick` | Extension | SupportLineTestView.vue |
| [ ] | `slt-target` | Or type dialable | SupportLineTestView.vue |
| [ ] | `slt-tenant` | Tenant | SupportLineTestView.vue |
| [ ] | `start` | Start time | DayTimerDetailView.vue |
| [ ] | `start-datetime` | Start | HolidayTimerDetailView.vue |
| [ ] | `state` | State | DayTimerDetailView.vue, HolidayTimerDetailView.vue |
| [ ] | `trunk-sip-reg-mode` | How this trunk registers | TrunkCreateView.vue |
| [ ] | `uid` | UID | RouteProfileDetailView.vue |
| [ ] | `z_created` | Created | HelpMessageDetailView.vue |
| [ ] | `z_updated` | Updated | HelpMessageDetailView.vue |
| [ ] | `z_updater` | Updater | HelpMessageDetailView.vue |

## Audit noise — fix SPA wiring, not seed

These come from dynamic `:id` / `:help-pkey` bindings the static scanner cannot resolve.

| pkey (raw) | Label | Views |
|------------|-------|-------|
| `'alert-' + item.key` | Alert | IvrCreateView.vue |
| `'dest-' + item.key` | Action on KeyPress | IvrCreateView.vue |
| `'edit-alert-' + item.key` | Alert | IvrDetailView.vue |
| `'edit-dest-' + item.key` | Action on KeyPress | IvrDetailView.vue |
| `'edit-tag-' + item.key` | Tag | IvrDetailView.vue |
| `'tag-' + item.key` | Tag | IvrCreateView.vue |
| ``adv-${f.key}`` | f.label | TenantCreateView.vue |
| ``cc-${f.key}`` | f.label | TenantCreateView.vue |
| ``cos-closed-${rule.pkey}`` | ruleKey(rule) | ExtensionDetailView.vue |
| ``cos-open-${rule.pkey}`` | ruleKey(rule) | ExtensionDetailView.vue |
| ``edit-adv-${f.key}`` | f.label | TenantDetailView.vue |
| ``edit-cc-${f.key}`` | f.label | TenantDetailView.vue |
| ``edit-rec-${f.key}`` | f.label | TenantDetailView.vue |
| ``edit-timers-${f.key}`` | f.label | TenantDetailView.vue |
| ``fw-comment-${index}`` | Comment | FirewallView.vue |
| ``fw-from-${index}`` | Source | FirewallView.vue |
| ``fw-port-${index}`` | Port | FirewallView.vue |
| ``fw-proto-${index}`` | Proto | FirewallView.vue |
| ``line-dest-${i}`` | Destination | RouteProfileDetailView.vue |
| ``line-mode-${i}`` | Mode | RouteProfileDetailView.vue |
| ``mon-${f.key}`` | f.label | TenantCreateView.vue |
| ``rec-${f.key}`` | f.label | TenantCreateView.vue |
| ``timers-${f.key}`` | f.label | TenantCreateView.vue |
