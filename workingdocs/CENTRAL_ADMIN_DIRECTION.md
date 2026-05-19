# Central admin and instance directory — direction of travel

**Status:** Agreed product direction (2026-05). **LE/TLS shipped on `main`** (2026-05-17). **Directory + central login UX not implemented** — planning on branch **`directory`** in all three repos.

**Design rules:** **`pbx3/pbx3-directory/docs/DESIGN_RULES.md`** — EC2-style fleet console; nodes never depend on directory for calls; each instance manages its own security; users must reach permitted instances when directory is down.

**Related stubs:** **`pbx3/pbx3-directory/`** (stub in **pbx3** repo — future service/repo). **`AUTH_PATTERNS.md`** §4 (federated auth contract). **`DEV_ENVIRONMENT.md`** §6 (dev-only API URL field).

---

## 1. Two deployment models (we chose B)

| Model | SPA hosted | How the user picks an instance |
|--------|------------|--------------------------------|
| **A — per PBX** | On each node (`/opt/pbx3spa/dist`, nginx `:44300`) | Which hostname they open in the browser |
| **B — central admin** ✓ | Once (CDN / S3 / app host), e.g. `https://admin.example.com/` | **Instance list** after central login (from directory) |

**Release target:** **Model B** — one admin UI for many PBX nodes, plus a **directory** (S3 index/map or API backed by it) listing instances the user may access.

**Solo / kick the tyres (Rule 6):** A minimal single-instance trial must **not** require S3, catalog setup, or central hosting. Same **pbx3spa**; omit `VITE_INSTANCE_DIRECTORY_URL` or use Model A (admin on the node URL). Fleet directory is **opt-in** when there are multiple instances. See **`pbx3/pbx3-directory/docs/DESIGN_RULES.md`** Rule 6.

**Per-node stack unchanged:** Each instance still runs **pbx3** (DB, Asterisk, LE, scripts) and **pbx3api** (HTTPS **`:44300`**, Laravel API). The central SPA does not replace those; it **administers** them after instance selection.

---

## 2. Operator journey (target)

1. Open **central admin URL** (single origin, one padlock).
2. **Sign in** — central identity (design TBD: email/password, SSO, service-provider scope).
3. App loads **allowed instances** from the **instance directory** (not a raw API URL).
4. User picks e.g. **08jzwn** → SPA sets `baseUrl = https://08jzwn.pbx3.com:44300/api` (derived from directory record).
5. Existing panels, `whoami`, Certificates, tenants, etc. run against **that** instance until the user switches instance or logs out.

**Dev today:** `npm run dev` + **API base URL** at login — this **is** the solo product path until fleet mode is enabled. **Fleet product:** instance picker when directory URL is set and multiple rows exist; hide raw URL in production builds except support override.

---

## 3. Instance directory (control plane)

**Purpose:** Canonical map of PBX instances and metadata for ACLs, monitoring, and orchestration (e.g. **tenant move** between hosts).

**Initial store (v0 default):** One **`instance-index.json`** at one HTTPS URL (static host or S3; CDN optional). Rare updates; SPA reads on login. Stub: **`pbx3/pbx3-directory/`**. See **`DESIGN_RULES.md`** § v0 delivery.

**Each instance record should support (v0 sketch):**

- Stable **`id`** (align with `globals.id` KSUID where possible)
- **`fqdn`** — public DNS (`globals.fqdn`)
- **`api_base_url`** — e.g. `https://{fqdn}:44300/api`
- **`label`** — display name (shortuid, customer name, etc.)
- **`status`** — active / maintenance / decommissioned
- **`org_id` / `service_id`** — for “instances available to this user/service”
- Optional later: region, health endpoint, LE expiry summary, tenant routing hints

**Not on the instance sqlite DB** — directory is **multi-tenant control plane** data.

---

## 4. Future capabilities (enabled by B + directory)

- **Central monitoring** — aggregator reads directory, polls or receives metrics per instance.
- **Tenant move** — orchestration uses directory for source/target `api_base_url` + FQDN; nodes run sync/LE/firewall/DB steps (see **`pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md`**).
- **Superuser / MSP** — one login, many instances filtered by directory ACLs.
- **Break-glass** — optional per-node minimal UI or direct API URL for support (out of scope for v1 central UX).

---

## 5. Auth (stable contract)

Do not break **`AUTH_PATTERNS.md`** core contract:

- SPA: **Bearer token** + **`whoami`** → user + abilities.
- Token issuer may move from **instance Sanctum** to **central auth** or **gateway**; per-instance API should keep **whoami** shape stable.

Directory returns **which instances**; auth returns **who** and **what they may access**.

---

## 6. Per-instance LE / TLS (complete on test node)

Shipped on **`main`** (multi-SAN Option A, Certificates Sync, `tls-active.json`, **pbx3 0.0.3-9**). Dev/test: local **pbx3spa** + `https://{fqdn}:44300/api`. Directory work does not change node LE scripts.

Central admin does **not** require moving API to port **443** or installing SPA on every node for day-to-day ops.

---

## 7. Implementation order (suggested)

| Phase | Work | Repo |
|-------|------|------|
| **Now** | LE/TLS, Certificates, `certificates` branch merge | pbx3, pbx3api, pbx3spa |
| **1** | Directory schema v0 + example index; read-only API or static fetch | **pbx3-directory** (stub) |
| **2** | SPA: instance picker login; hide URL field in production build | pbx3spa |
| **3** | Central auth + ACL filter on directory | TBD (+ pbx3api/gateway) |
| **4** | Orchestration (tenant move, monitoring) | pbx3 + directory + SPA |

---

## 8. Doc index

| Doc | Contents |
|-----|----------|
| **`pbx3/pbx3-directory/README.md`** | Stub project charter |
| **`pbx3/pbx3-directory/docs/OVERVIEW.md`** | Directory service overview |
| **`pbx3/pbx3-directory/schema/instance-index.json`** | Example index (`catalog/instance-index.json` in S3) |
| **`pbx3/workingdocs/TLS_AND_CERTIFICATES.md`** | Per-instance TLS (data plane) |
| **`AUTH_PATTERNS.md`** | Token + whoami; federation |
