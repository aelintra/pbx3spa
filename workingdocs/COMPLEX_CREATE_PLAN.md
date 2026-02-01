# Complex create flows — planning

Planning for create flows that in the old system used a **type chooser** and **conditional fields**: Inbound routes (DDI), Extensions, Trunks, IVRs. See **wizardnotes/** for legacy analysis (add-wizard.md, agent-brief-spa.md per resource).

---

## 1. Approach decision

**Chosen approach: one create view per resource + type chooser + conditional fields + one polymorphic create API per resource.**

- **One route** per resource: e.g. `/trunks/new`, `/extensions/new`, `/inbound-routes/new`, `/ivrs/new`.
- **One form** per resource. Where the legacy system had a type dropdown (DDI, Trunk, Extension), we add a **type chooser** and show/hide fields based on it. IVR has no type chooser (simple form).
- **One create endpoint** per resource: e.g. `POST /api/trunks` with a body that includes a type field (`carrier`, `extensionType`, etc.) plus type-specific fields. The API validates and dispatches internally (same idea as legacy `saveNew()` switching on type).

**Why this (and not split-by-type):**

- Matches legacy and wizardnotes; one “Create” button per resource; one API contract per resource; easy to extend (new type = new option in chooser + new branch in API). Splitting by type would multiply list actions, routes, and endpoints and diverge from the analysed flow.

---

## 2. Order of work — trunk first

Among the type-chooser creates, **Trunk** is the simplest:

- **One row** per create (no batch, no span loop like DDI, no MAC/device resolution like Extension).
- **API already supports** two carrier types: **GeneralSIP** and **GeneralIAX2**.
- No “next free” field, no COS/PJSIP instance creation in the frontend.

So we can ship a type-chooser trunk create quickly on the current API, then extend when the API gains more types. **IVR** is simpler still (no type chooser) but we chose trunk as the first *type-chooser* create to establish the pattern.

**Suggested sequence:** Trunk → DDI (Inbound routes) → Extension (most complex). IVR can be standardized in parallel (simple form, no chooser).

**Update (post–Trunk):**

- **Trunk create** — Done (type chooser, id/shortuid, tenant schema, API working).
- **IVR** — Deferred for now. UX is complex (many options/keys, alert/option/tag grid); leave until later.
- **Extension** — Simplified in PBX3 vs SARK: **no on-board phone provisioning**; provisioning is a separate service. Extension create is straightforward: choose **protocol** (SIP or WebRTC). Use **sensible defaults** for transport: **SIP → UDP**, **WebRTC → TLS** (implied). No need to expose transport on create; defaults are enough. **Mailbox** defaults to the extension number (pkey); no mailbox field on create (covers >99% of use cases); administrator can adjust after creation if needed.
- **Extension create — minimum fields:** Extension number (pkey), Name (desc), Tenant (cluster), MAC address (optional). **Tenant** must be a **dropdown** populated with all tenant (cluster) pkeys (e.g. from GET tenants). Protocol chooser (SIP / WebRTC) plus these fields is the minimum create form.
- **Extension bulk create (later):** Optional future feature: input multiple MAC addresses or a number range and create many extensions in one transaction. Valuable for initial site setup (exists in the old system) but rarely used in practice; defer until after single-extension create is done.
- **Revised order:** DDI (Inbound routes) next, then Extension (now straightforward), IVR later when we tackle its UX.

---

## 3. Current state — Trunk create

### 3.1 Frontend (TrunkCreateView.vue)

- **Today:** Single form with pkey, carrier (dropdown **GeneralSIP** | **GeneralIAX2** only), cluster, username, host. No type chooser, no conditional fields, no password or regthistrunk. Submit sends `pkey`, `carrier`, `cluster`, `username`, `host`.
- **Gap:** Legacy had 5 types (SIP send reg, SIP accept reg, SIP trusted peer, GeneralIAX2, InterSARK) with different required/optional fields per type (see wizardnotes/trunk/add-wizard.md, agent-brief-spa.md). Current form exposes only two carrier values and always the same fields.

### 3.2 API (pbx3api TrunkController::save)

- **Today:** Validates `pkey`, `carrier` (required, `in:GeneralSIP,GeneralIAX2`), `cluster`, `username`, `host`. Does not accept the five legacy labels (e.g. “SIP (send registration)”, “InterSARK”). Uses Carrier table and `copy_asterisk_stanzas_from_carrier`; supports GeneralSIP and GeneralIAX2.
- **Bug (line 118):** For GeneralIAX2, code sets `$trunk->technology = $trunk->peername`; it should set `$trunk->technology = 'IAX2'` (technology is overwritten with peername).
- **Gap:** No support yet for SIP (send/accept/trusted), InterSARK, or type-specific behaviour (e.g. host=dynamic for accept registration). Password is in updateableColumns but not required on create; regthistrunk not wired for create.

---

## 4. Trunk-first plan

### Phase 1 — Frontend (no new API surface)

1. **Type chooser**  
   One dropdown at the top: e.g. “Choose trunk type” → “SIP trunk” → “IAX2 trunk”. Map to existing API: “SIP trunk” → `carrier: 'GeneralSIP'`, “IAX2 trunk” → `carrier: 'GeneralIAX2'`.

2. **Conditional fields**  
   - **SIP trunk:** trunkname (pkey), cluster, host, username, password.  
   - **IAX2 trunk:** trunkname, cluster, host, password, regthistrunk (YES/NO).  
   Legacy uses username = trunkname for SIP; we can default username from trunkname or send both. API currently requires username and host for both.

3. **Pills**  
   Use segmented pills for **regthistrunk** (YES/NO) on IAX2, per PANEL_PATTERN §3 / §4.2.

4. **Submit**  
   Disable until a type is chosen. Send body the API already accepts (`pkey`, `carrier`, `cluster`, `username`, `host`); add `password` (and `regthistrunk` if API accepts it on create). If API does not yet accept password on create, still add the field and send it so backend can relax validation later.

### Phase 2 — API (fix + optional extend)

1. **Bug fix**  
   In `TrunkController::save`, for GeneralIAX2 set `$trunk->technology = 'IAX2'` (do not assign peername to technology).

2. **Create validation**  
   Ensure create accepts `password` (and, if desired, `regthistrunk` for IAX2). Adjust required fields so SIP requires host/username (and optionally password), IAX2 requires host and optionally regthistrunk.

### Later — Full five types

When API supports the full legacy set, add to the chooser: “SIP (send registration)”, “SIP (accept registration)”, “SIP (trusted peer)”, “InterSARK”, with type-specific validation and conditional fields per wizardnotes/trunk/agent-brief-spa.md.

---

## 5. References

- **wizardnotes/trunk/** — add-wizard.md (legacy behaviour), agent-brief-spa.md (SPA contract, visibility rules).
- **wizardnotes/ddi/**, **wizardnotes/extension/**, **wizardnotes/ivr/** — same structure for DDI, Extension, IVR.
- **PANEL_PATTERN.md** §3 (create form), §4.2 (segmented pills), §8 (reference implementation status).
- **PROJECT_PLAN.md** § Current state — to-do (create panels), next chat.
