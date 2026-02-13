# Create Panels Standardization Plan

**Goal:** Standardize Extension, Trunk, Route, Queue, Agent, and IVR create panels per PANEL_PATTERN.md §3.

**Reference implementations:** `TenantCreateView.vue`, `InboundRouteCreateView.vue`

---

## Requirements Checklist (per PANEL_PATTERN.md §3)

For each create panel:

- [ ] **(a) Preset create-form fields from DB SQL DEFAULTs and model `$attributes`**
- [ ] **(b) Group fields into Identity, Settings (or Transport), and optional Advanced**
- [ ] **(c) Use segmented pills for boolean and short fixed-choice fields instead of `<select>`**

Additional requirements (from PANEL_PATTERN.md):

- [ ] Use FormField, FormSelect, FormToggle components (not raw HTML)
- [ ] Action buttons (Create, Cancel) at **top and bottom** of form
- [ ] Proper validation with useFormValidation composable
- [ ] Error handling with fieldErrors and firstErrorMessage
- [ ] All API-accepted fields exposed (field parity)

---

## Approach: Systematic, One Panel at a Time

### Step 1: Audit Current State

For each panel (Extension, Trunk, Route, Queue, Agent, IVR):

1. **Read the current create view** to see what fields exist
2. **Read the API controller** (`{Resource}Controller.php`) to see:
   - `updateableColumns` (or validation rules)
   - What fields the API accepts for create
3. **Read the model** (`{Resource}.php`) to see:
   - `$attributes` (defaults)
4. **Read the schema** (`full_schema.sql`) to see:
   - SQL DEFAULTs
   - Column types and constraints
5. **Read the detail view** (`{Resource}DetailView.vue`) to see:
   - What fields exist on Edit
   - How they're grouped (Identity/Settings/Advanced)
   - Which fields are read-only vs editable

**Output:** A checklist per panel showing:
- Fields currently in create view
- Fields missing from create view (but in API/model/schema)
- Defaults that should be preset
- Grouping that should match detail view

### Step 2: Standardize One Panel

For each panel, in order:

1. **Start with the simplest** (fewest fields, least complexity)
2. **Copy structure from reference** (TenantCreateView or InboundRouteCreateView)
3. **Add all fields** from API controller's create validation
4. **Preset defaults** from model `$attributes` and schema DEFAULTs
5. **Group fields** to match detail view (Identity → Settings → Advanced)
6. **Use FormToggle/FormSelect** for booleans and fixed-choice fields (per requirement c)
7. **Test:** Create a resource, verify defaults, verify all fields save correctly

**Order suggestion:**
1. **Queue** (simpler, fewer fields)
2. **Agent** (similar complexity)
3. **Route** (outbound ring group)
4. **Extension** (has protocol type chooser, but create API is straightforward)
5. **Trunk** (has type chooser, see COMPLEX_CREATE_PLAN.md)
6. **IVR** (most complex, has keystroke options grid)

---

## Field Parity: What Each Panel Needs

### Queue

**API accepts (from QueueController):**
- `pkey` (required)
- `cluster` (required)
- `active` (YES/NO)
- `alertinfo`, `description`, `devicerec` (None/OTR/OTRR/Inbound/default)
- `divert`, `greetnum`, `greeting`, `members`, `musicclass`, `options`
- `retry`, `wrapuptime`, `maxlen`
- `strategy` (ringall/roundrobin/leastrecent/fewestcalls/random/rrmemory)
- `timeout`

**Model defaults (from Queue.php):**
- `cluster` → 'default'
- `devicerec` → 'None'
- `greetnum` → null
- `options` → 't'
- `timeout` → 0

**Current state:** Has pkey, cluster, devicerec, greetnum, options. Missing: active, alertinfo, description, divert, greeting, members, musicclass, retry, wrapuptime, maxlen, strategy, timeout.

**Grouping (should match QueueDetailView):**
- Identity: pkey, cluster
- Settings: active, devicerec, strategy, timeout, retry, wrapuptime, maxlen, greetnum, greeting, musicclass, options, members, alertinfo, description, divert

### Agent

**API accepts (from AgentController):**
- `pkey` (required, integer 1000-9999)
- `cluster` (required)
- `name` (required, alpha_dash)
- `passwd` (required, integer 1001-9999)
- `cname`, `description`, `extlen`
- `queue1` through `queue6` (exists:queue,pkey|nullable)

**Model defaults (from Agent.php):**
- `cluster` → 'default'
- `queue1` through `queue6` → 'None'

**Current state:** (Need to check AgentCreateView)

**Grouping (should match AgentDetailView):**
- Identity: pkey, cluster, name, passwd, cname, description, extlen
- Settings: queue1-queue6

### Route (Outbound Ring Group)

**API accepts:** (Need to check RouteController)

**Model defaults:** (Need to check Route.php)

**Current state:** (Need to check RouteCreateView)

**Grouping:** (Should match RouteDetailView)

### Extension

**API accepts (from ExtensionController::save):**
- `pkey` (required)
- `cluster` (required)
- `desc` (nullable)
- `protocol` (required, SIP|WebRTC|Mailbox)
- `macaddr` (nullable, regex: 12 hex digits)

**API sets automatically:**
- `id` (ksuid), `shortuid`, `dvrvmail` = pkey
- `desc` defaults: 'MAILBOX' (Mailbox), 'Ext{pkey}' (SIP/WebRTC)
- `device`: 'MAILBOX' (Mailbox), 'General SIP' (SIP), 'WebRTC' (WebRTC)
- `transport`: 'udp' (SIP), 'wss' (WebRTC)

**Current state:** Has protocol, pkey, cluster, desc, macaddr. Structure is Type → Identity. Missing: Many fields that exist on ExtensionDetailView (but may be set at create only or read-only).

**Note:** Extension has a type chooser (protocol), but the create API is straightforward (single endpoint). The detail view likely has many more fields that are read-only or set at create only.

**Grouping:** (Should match ExtensionDetailView)

### Trunk

**API accepts:** (See COMPLEX_CREATE_PLAN.md — Trunk has type chooser: GeneralSIP, GeneralIAX2)

**Current state:** (See COMPLEX_CREATE_PLAN.md)

**Note:** Trunk is part of the complex create flows. May need to coordinate with that work.

### IVR

**API accepts:** (Need to check IvrController)

**Current state:** (Need to check IvrCreateView)

**Note:** IVR has keystroke options grid (key/destination/tag/alert). This is already implemented per PANEL_PATTERN.md (uses FormSelect/FormField with hideLabel in grid).

**Grouping:** (Should match IvrDetailView)

---

## Implementation Steps (Per Panel)

### For Each Panel:

1. **Read current create view** → identify what's there
2. **Read API controller** → list all create-accepted fields
3. **Read model** → list defaults from `$attributes`
4. **Read schema** → list SQL DEFAULTs
5. **Read detail view** → see field grouping and which fields exist
6. **Create field list** → all fields that should be in create form
7. **Map defaults** → preset from model/schema
8. **Refactor create view:**
   - Copy structure from TenantCreateView or InboundRouteCreateView
   - Add all fields in correct groups (Identity → Settings → Advanced)
   - Use FormToggle for booleans (active, moh, etc.)
   - Use FormSelect for fixed-choice fields (devicerec, strategy, etc.)
   - Preset defaults in ref initialization
   - Add validation for required fields
   - Test create → verify defaults, verify all fields save

---

## Testing Checklist (Per Panel)

After standardizing each panel:

- [ ] Form loads with correct defaults preset
- [ ] All fields visible and grouped correctly (Identity → Settings → Advanced)
- [ ] Required fields validated (shows error, blocks submit)
- [ ] Create succeeds with all fields
- [ ] Created resource has correct defaults
- [ ] Created resource matches what detail view shows
- [ ] Action buttons appear at top and bottom
- [ ] Cancel button works
- [ ] Error handling works (duplicate pkey, invalid tenant, etc.)

---

## Notes

- **Trunk:** Coordinate with COMPLEX_CREATE_PLAN.md (type chooser work)
- **Extension:** Has protocol type chooser, but create API is single endpoint — simpler than Trunk
- **IVR:** Already has keystroke grid pattern — verify it matches PANEL_PATTERN.md
- **Defaults:** Use model `$attributes` first, then schema DEFAULTs, then API controller logic
- **Pills vs Select (UX decision — agreed):**
  - **FormToggle** for YES/NO booleans (single toggle switch)
  - **Segmented pills** (button group) for **2–5 options** — all choices visible, faster to scan, better UX for small sets
  - **FormSelect** (dropdown) for **6+ options** — saves space, standard pattern, prevents UI clutter
  - **Note:** Currently "pills" in codebase use FormSelect. Need to create/use segmented pill component (FormPill or FormSegmentedPill) for 2–5 option fields. Can use FormSelect temporarily during standardization, then refactor to pills.
