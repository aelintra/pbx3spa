# SPA field help coverage audit

**Generated:** 2026-06-28 · **Script:** `scripts/audit-field-help.mjs`

Cross-checks SPA form labels against `tt_help_core` in `pbx3/.../sqlite_message.sql`.
A field is **missing help** when its derived `pkey` has no row, or `htext` is empty.

| Metric | Count |
|--------|------:|
| tt_help_core rows | 408 |
| Fields scanned | 456 |
| Has help | 373 |
| **Missing pkey** | **73** |
| Empty htext | 0 |
| hide-help | 7 |
| No Form* wiring | 3 |

## Tier 1–2 — stakeholder demo path (gaps first)

### Missing help (Tier 1–2)

_None._

### No Form* wiring — needs component + pkey (Tier 1–2)

_None._

## All panels — missing help

### Missing help (all tiers)

#### AgentDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### ClassOfServiceDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### ConferenceDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### CustomAppDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### DayTimerDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| End time | FormField | edit-end | end |
| KSUID | FormReadonly | edit-id | id |
| Start time | FormField | edit-start | start |
| State | FormReadonly | edit-state | state |
| UID | FormReadonly | edit-shortuid | shortuid |

#### DeviceCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Owner | FormField | owner | owner |

#### DeviceDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Created | FormReadonly | z_created | z_created |
| Owner | FormField | owner | owner |
| Updated | FormReadonly | z_updated | z_updated |
| Updater | FormReadonly | z_updater | z_updater |

#### ExtensionDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### GreetingDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-id | id |
| Original filename | FormReadonly | edit-original | original |
| UID | FormReadonly | edit-shortuid | shortuid |

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
| KSUID | FormReadonly | edit-id | id |
| Start | FormField | edit-start-datetime | start-datetime |
| State | FormReadonly | edit-state | state |
| UID | FormReadonly | edit-shortuid | shortuid |

#### InboundRouteDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

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
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### QueueDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### RouteDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### TenantCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| f.label | FormToggle | `timers-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `adv-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `rec-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormField | `mon-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `cc-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `ldap-${f.key}` | f.helpPkey ?? f.key |
| Name | FormField | pkey | OBJECT_PKEY_HELP.tenant |

#### TenantDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| f.label | FormToggle | `edit-timers-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-adv-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-rec-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormField | `edit-mon-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-cc-${f.key}` | f.helpPkey ?? f.key |
| f.label | FormToggle | `edit-ldap-${f.key}` | f.helpPkey ?? f.key |
| KSUID | FormReadonly | edit-identity-id | id |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### TrunkCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| How this trunk registers | FormSelect | trunk-sip-reg-mode | trunk-sip-reg-mode |

#### TrunkDetailView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Callback | FormField | edit-callback | callback |
| IAX reg | FormField | edit-iaxreg | iaxreg |
| KSUID | FormReadonly | edit-identity-id | id |
| SIP registration | FormSelect | edit-pjsipreg | pjsipreg |
| UID | FormReadonly | edit-identity-shortuid | shortuid |

#### UserCreateView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| Confirm password | FormField | passwordConfirm | passwordConfirm |
| Email | FormField | email | email |
| Name | FormField | name | name |

### hide-help (review — remove when rows exist)

#### NetworkView.vue

| Label | Component | id | pkey |
|-------|-----------|-----|------|
| MAC | FormReadonly | ip-mac | — |

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
