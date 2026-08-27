# SPA field help coverage audit

**Generated:** 2026-08-26 · **Script:** `scripts/audit-field-help.mjs`

Cross-checks SPA form labels against `tt_help_core` in `pbx3/.../sqlite_message.sql`.
A field is **missing help** when its derived `pkey` has no row, or `htext` is empty.

| Metric | Count |
|--------|------:|
| tt_help_core rows | 190 |
| Fields scanned | 504 |
| Has help | 396 |
| **Missing pkey** | **94** |
| Empty htext | 0 |
| hide-help | 11 |
| No Form* wiring | 3 |

## Tier 1–2 — stakeholder demo path (gaps first)

### Missing help (Tier 1–2)

_None._

### No Form* wiring — needs component + pkey (Tier 1–2)

_None._

## All panels — missing help

### Missing help (all tiers)

#### AccountPasswordView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Confirm new password | FormField | passwordConfirm | passwordConfirm |
| Current password | FormField | currentPassword | currentPassword |

#### AccountSecurityView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Authentication code from your app | FormField | confirmCode | confirmCode |
| Authenticator or recovery code | FormField | disableCode | disableCode |
| Current password | FormField | setupPassword | setupPassword |
| Current password | FormField | disablePassword | disablePassword |

#### AgentDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |

#### ClidBlockCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Caller ID | FormField | pkey | pkey |

#### ClidBlockDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Caller ID | FormReadonly | pkey | pkey |
| Created | FormReadonly | — | — |
| Tenant | FormReadonly | cluster-ro | cluster-ro |
| Updated | FormReadonly | — | — |
| Updater | FormReadonly | — | — |

#### ConferenceDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |

#### CustomAppDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |

#### DayTimerDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| End time | FormField | edit-end | end |
| KSUID | FormReadonly | edit-id | id |
| Priority (higher wins) | FormField | edit-priority | priority |
| Start time | FormField | edit-start | start |
| State | FormReadonly | edit-state | state |

#### ExtensionDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| ruleKey(rule) | FormToggle | `cos-open-${rule.pkey}` | `cos-open-${rule.pkey}` |
| ruleKey(rule) | FormToggle | `cos-closed-${rule.pkey}` | `cos-closed-${rule.pkey}` |

#### FirewallView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Comment | FormField | `fw-comment-${index}` | FIREWALL_FIELD_HELP.comment |
| Port | FormField | `fw-port-${index}` | FIREWALL_FIELD_HELP.port |
| Proto | FormSelect | `fw-proto-${index}` | FIREWALL_FIELD_HELP.proto |
| Source | FormField | `fw-from-${index}` | FIREWALL_FIELD_HELP.source |

#### GreetingDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-id | id |
| Original filename | FormReadonly | edit-original | original |

#### HelpMessageCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Help text | FormField | htext | htext |
| Message key | FormField | pkey | pkey |

#### HelpMessageDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Created | FormReadonly | z_created | z_created |
| Help text | FormField | htext | htext |
| Message key | FormReadonly | edit-identity-pkey | pkey |
| Updated | FormReadonly | z_updated | z_updated |
| Updater | FormReadonly | z_updater | z_updater |

#### HolidayTimerDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| End | FormField | edit-end-datetime | end-datetime |
| Force mode (optional) | FormField | edit-force-mode | force-mode |
| KSUID | FormReadonly | edit-id | id |
| Start | FormField | edit-start-datetime | start-datetime |
| State | FormReadonly | edit-state | state |

#### InboundRouteCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Route profile | FormSelect | route-profile | route-profile |

#### InboundRouteDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |

#### IvrCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Action on KeyPress | FormSelect | 'dest-' + item.key | 'dest-' + item.key |
| Alert | FormField | 'alert-' + item.key | 'alert-' + item.key |
| Tag | FormField | 'tag-' + item.key | 'tag-' + item.key |

#### IvrDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Action on KeyPress | FormSelect | 'edit-dest-' + item.key | 'edit-dest-' + item.key |
| Alert | FormField | 'edit-alert-' + item.key | 'edit-alert-' + item.key |
| KSUID | FormReadonly | edit-identity-id | id |
| Tag | FormField | 'edit-tag-' + item.key | 'edit-tag-' + item.key |

#### QueueDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| Queue overlay | FormField | edit-queue-overlay | queue-overlay |

#### RouteDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |

#### RouteProfileCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Closed destination | FormSelect | closed-dest | closed-dest |
| Name | FormField | name | name |
| Open destination | FormSelect | open-dest | open-dest |

#### RouteProfileDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Destination | FormSelect | `line-dest-${i}` | `line-dest-${i}` |
| Mode | FormField | `line-mode-${i}` | `line-mode-${i}` |
| Name | FormField | name | name |
| UID | FormReadonly | uid | uid |

#### SupportLineTestView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Extension | FormSelect | slt-pick | slt-pick |
| Or type dialable | FormField | slt-target | slt-target |
| Tenant | FormSelect | slt-tenant | slt-tenant |

#### SysglobalsEditView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Local days — Asterisk messages | FormField | edit-log-local-messages | log-local-messages |
| Local days — CDR CSV | FormField | edit-log-local-cdr | log-local-cdr |
| Local days — syslog | FormField | edit-log-local-syslog | log-local-syslog |
| S3 maxage days — Asterisk messages | FormField | edit-log-s3-messages | log-s3-messages |
| S3 maxage days — CDR | FormField | edit-log-s3-cdr | log-s3-cdr |
| S3 maxage days — syslog | FormField | edit-log-s3-syslog | log-s3-syslog |

#### TenantCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Extension length | FormField | ext_len | ext_len |
| f.label | FormToggle | `timers-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `adv-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `rec-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormField | `mon-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `cc-${f.key}` | f.helpPkey ?? f.key |
| Name | FormField | pkey | OBJECT_PKEY_HELP.tenant |

#### TenantDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Extension length | FormField | edit-identity-ext-len | ext-len |
| f.label | FormToggle | `edit-timers-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-adv-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-rec-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-cc-${f.key}` | f.helpPkey ?? f.key |
| KSUID | FormReadonly | edit-identity-id | id |
| Parking overlay | FormField | edit-park-overlay | park-overlay |

#### TrunkCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| How this trunk registers | FormSelect | trunk-sip-reg-mode | trunk-sip-reg-mode |

#### TrunkDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| IAX reg | FormField | edit-iaxreg | iaxreg |
| KSUID | FormReadonly | edit-identity-id | id |
| SIP registration | FormSelect | edit-pjsipreg | pjsipreg |

#### UserCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Confirm password | FormField | passwordConfirm | passwordConfirm |
| Email | FormField | email | email |
| Name | FormField | name | name |

#### UserEditView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Confirm new password | FormField | newPasswordConfirm | newPasswordConfirm |
| Email | FormField | email | email |
| Name | FormField | name | name |
| New password | FormField | newPassword | newPassword |

### hide-help (review — remove when rows exist)

#### ExtensionDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| SIP Registrar | FormReadonly | edit-identity-sip-registrar | — |

#### NetworkView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| MAC | FormReadonly | ip-mac | — |

#### SupportLineTestView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Dialable | FormReadonly | slt-dialable | — |
| SIP domain | FormReadonly | slt-sip-domain | — |
| SIP user | FormReadonly | slt-sip-user | — |

#### SysglobalsEditView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Domain | FormReadonly | edit-identity-domain | — |
| FQDN | FormReadonly | edit-identity-fqdn | — |
| KSUID | FormReadonly | edit-identity-ksuid | — |
| UID | FormReadonly | edit-identity-shortuid | — |

#### TenantCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Domain / FQDN (auto) | FormReadonly | create-auto-domain-fqdn | — |

#### TenantDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| FQDN | FormReadonly | edit-identity-fqdn | — |

### Empty htext in DB

_None._
