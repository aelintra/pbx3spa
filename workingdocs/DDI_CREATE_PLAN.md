# DDI (Inbound route) create — planning

**Minimum for create (like other resources):** **pkey** (inbound number or CLID), **tenant** (cluster). Plus **type** (carrier: DiD | CLID) so the system knows how to treat the number.

---

## 0. Progressive disclosure (tenant + type first)

The old system revealed fields in two steps:

1. **First:** Show only **tenant** and **DDI type** (DiD | CLID). User must choose both before the rest of the form appears.
2. **Then:** Reveal **pkey** (number), **trunkname**, and **openroute** / **closeroute** (and any other fields).

**Reason:** **openroute** and **closeroute** are dropdowns of valid *destinations* (queues, extensions, IVRs, etc.). Those options are **tenant-scoped** — we only show destinations that belong to the selected tenant. So we cannot sensibly show the openroute/closeroute dropdowns (or their option lists) until the tenant is known. Choosing tenant (and type) first avoids showing route dropdowns with wrong or empty options.

**UX:** One form; first row = tenant dropdown, second row = type (DiD | CLID). Only when both are set, show the rest: number (pkey), name (trunkname), open route, closed route. Load openroute/closeroute options filtered by selected cluster (e.g. GET queues, extensions, IVRs for that tenant). *Inbound routes (DIDs) invoke endpoints; some endpoints are queue-managed (Queues panel); see § Destination list below.*

---

## 1. Current state

### API (InboundRouteController::save)

- **Route:** `POST /inboundroutes`
- **Validates:** pkey, carrier (required, `in:DiD,CLID`), cluster (required, exists:cluster,…), trunkname (required)
- **Bug (line 65):** `exists:cluster,' . $request->cluster` is wrong — should be `exists:cluster,pkey` (check cluster table’s pkey column)
- **Missing on create:** Does **not** set **id** (KSUID) or **shortuid**; tenant schema `inroutes` has `id` PRIMARY KEY and `shortuid` UNIQUE (see sqlite_create_tenant.sql). Need to set before save, like Extension/Trunk.
- **Defaults:** openroute = 'None', closeroute = 'None'. check_inbound_routes() resolves openroute/closeroute to routeclassopen/routeclassclosed (or adds validator errors); on create those aren’t sent so defaults apply.
- **move_request_to_model:** Copies pkey, carrier, cluster, trunkname, etc. from request to model; then save().

### Frontend (InboundRouteCreateView.vue)

- **Today:** Single form: pkey (labeled “DiD/CLiD”), cluster (tenant dropdown), trunkname (labeled “Name”). Submit sends `pkey`, `cluster`, `trunkname` only — **no carrier**. API requires carrier, so create would get 422 unless API was relaxed.
- **Gap:** No **type chooser** (DiD vs CLID). Wizardnotes: DiD = number(s) for direct dial; CLID = caller-id match. Same fields, different semantics; carrier tells API which.

### Schema (inroutes)

- **id** TEXT PRIMARY KEY, **shortuid** TEXT UNIQUE, **pkey** TEXT NOT NULL, **cluster**, openroute, closeroute, trunkname, technology, … (full list in sqlite_create_tenant.sql)
- Same three-key pattern as other tenant tables: id, shortuid, pkey.

### Wizardnotes (ddi/add-wizard.md, agent-brief-spa.md)

- **Type chooser:** DiD | CLID (carrier).
- **DiD:** pkey = number or number/span (range); trunkname, cluster; optional smartlink. Can create multiple rows (span).
- **CLID:** pkey = clinumber; trunkname, cluster; single row.
- **Minimal for now:** Single DDI/CLID per create (no span, no smartlink). Just pkey + cluster + carrier + optional trunkname (or default trunkname = pkey).

---

## 2. Proposed minimal create

### Minimum fields

| Field     | Required | Notes |
|----------|----------|--------|
| **pkey** | Yes      | Inbound number (DiD) or CLID value. |
| **cluster** | Yes   | Tenant (dropdown from GET tenants). |
| **carrier** | Yes   | Type: DiD | CLID. |
| **trunkname** | Optional* | *Current API requires it; could default to pkey or make optional. |

### API changes (before or with frontend)

1. **Fix cluster validation:** `exists:cluster,pkey` (not `exists:cluster,' . $request->cluster`).
2. **Set id and shortuid on create:** Before save, `$inboundroute->id = generate_ksuid();` and `$inboundroute->shortuid = generate_shortuid();`.
3. **Trunkname:** Either keep required or allow default (e.g. pkey) so minimal create can omit it.
4. **InboundRoute model:** Check for attributes/columns not in tenant schema (like Extension provisionwith/sndcreds) and guard or omit them so INSERT doesn’t fail.

### Frontend changes (progressive disclosure)

1. **Step 1 — show first:** **Tenant** dropdown (from GET tenants) and **DDI type** (carrier: DiD | CLID). Submit disabled until both are chosen.
2. **Step 2 — then reveal:** Once tenant and type are set, show: **pkey** (number), **trunkname**, and **openroute** / **closeroute** dropdowns. Openroute/closeroute dropdowns **invoke endpoints**; options must be **tenant-scoped** (load endpoints for the selected cluster — e.g. queue endpoints from Queues panel, extensions, IVRs). Some of those endpoints are queue-managed (see Destination list).
3. **Submit body:** `pkey`, `cluster`, `carrier`, `trunkname`, and optionally `openroute` / `closeroute` if we allow them on create (otherwise defaults; user edits after).
4. **Tenant dropdown:** Same pattern as Extension create; ensure tenant options load on mount.

### Destination list (shared; no trunks; queue-managed endpoints)

- **Scope:** Inbound routes (DIDs) and **IVRs** have dropdowns that **invoke endpoints** — i.e. they send the call to a chosen destination. The **same endpoint list** is used wherever a decision is needed about where a call is sent. **IVRs** use it **per keypress**: each keypress (digit) in an IVR has a destination dropdown that invokes the same set of valid tenant-scoped endpoints (queue, extension, IVR, voicemail, custom app, misc).
- **Common call path:** Inbound DID → IVR (caller hears menu) → keypress → queue, extension, or any valid endpoint for that tenant. So DDI can send to an IVR; the IVR then routes by keypress to a queue, extension, or any other valid endpoint.
- **In the new system:** There is **no trunk selection** in these destination lists. Some endpoints are **queue-managed**: the **Queues** panel is responsible for **creating and maintaining** those queue endpoints (call queues and ring groups are both types of queue). So destination dropdown options include: **queue endpoints** (from Queues panel), Extensions, Voicemail, IVRs, Custom Apps, Misc.
- **Route panels:** **Inbound routes (DDI)** and **Outbound routes (Trunk)** are separate panels; both exist. Inbound routes use the destination dropdowns; IVRs use the same dropdowns per keypress; queue endpoints in that list are maintained by the Queues panel. Small context-dependent differences may apply; in broad outline the shared endpoint model holds.

### openroute / closeroute on create

- **Options:** Load dropdown options **per tenant** (destinations for selected cluster). API or frontend: e.g. GET queues?cluster=…, extensions?cluster=…, ivrs?cluster=… (queue endpoints are created/maintained by the Queues panel) (or a single “destinations for cluster” endpoint) to build the list. Only show openroute/closeroute once tenant is chosen.
- **Default:** Can keep API defaults (e.g. None/operator) on create and let user edit after; or allow user to pick from tenant-scoped dropdown on create.

### Defer for later

- **DiD range (number/span):** Multiple rows per create; parse pkey as number/span; loop create. Leave for later.
- **Smartlink:** DiD-only option to set openroute/closeroute from extension; defer.

---

## 3. Order of work

1. **API:** Fix cluster validation; add id + shortuid on create; check InboundRoute model for non-schema attributes; optionally allow trunkname default (pkey).
2. **Frontend:** Add carrier (DiD | CLID) chooser; send carrier in POST; keep pkey, cluster, trunkname (or make trunkname optional with default).
3. **Test:** Create one DiD and one CLID; confirm id and shortuid present; edit after create if needed.

---

## 4. References

- **pbx3api:** InboundRouteController.php, InboundRoute.php
- **pbx3spa:** InboundRouteCreateView.vue, InboundRouteDetailView.vue
- **Schema:** sqlite_create_tenant.sql (inroutes)
- **wizardnotes/ddi:** add-wizard.md, agent-brief-spa.md
- **COMPLEX_CREATE_PLAN.md** — approach for type-chooser creates
