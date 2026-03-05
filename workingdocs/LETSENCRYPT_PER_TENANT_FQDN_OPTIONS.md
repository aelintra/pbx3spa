# Let's Encrypt and per-tenant FQDN — viable options

**Purpose:** Plan how to support **per-tenant FQDNs** (`{tenant_shortuid}.{domain}.{tld}`) with TLS certificates, so that tenant mobility (export/import between nodes) and phone/endpoint discovery work with valid certificates.

**Context:** Read **SESSION_HANDOFF.md**, **CERTIFICATES_ADOPTION_PLAN.md**, **LETSENCRYPT_PLAN.md** (pbx3), and **TRUNK_ROUTE_MULTITENANCY.md**. The **cluster** table already has `fqdn` and `fqdninspect`; the API Tenant model exposes `fqdn`. Today: **one certificate per node** (instance FQDN in `le-domain`); nginx and Asterisk use a single active cert (custom → LE → snakeoil).

---

## 1. Goal

- **Tenant FQDN:** Each tenant has a stable FQDN: `{tenant_shortuid}.{domain}.{tld}` (e.g. `abc12xyz.pbx3.com`). Phones and other endpoints **find the tenant by this domain name** (provisioning, SIP, API).
- **Tenant mobility:** A future supertask will export/import tenants between nodes. When a tenant moves, its FQDN should resolve to the **new** node; DNS must be updated (or already point to a load balancer that routes by tenant).
- **TLS:** Connections to `{tenant_shortuid}.{domain}.{tld}` must use a certificate that is valid for that hostname (no browser/phone cert mismatch).

**Out of scope for this doc:** The exact supertask design, DNS automation (who creates A/CNAME for tenant FQDNs), or load balancers. This doc focuses on **certificate strategy** on a single node that may host many tenants.

---

## 2. Current state (single cert per node)

| Item | Current behaviour |
|------|-------------------|
| **LE scope** | One FQDN per node, stored in `/opt/pbx3/etc/identity/le-domain` (e.g. `node1.pbx3.com`). |
| **Cert path** | `/etc/letsencrypt/live/<fqdn>/` (fullchain.pem, privkey.pem). |
| **Challenge** | HTTP-01 only; port 80 opened only during issuance/renewal. No DNS API. |
| **nginx** | Single server block on 44300, `server_name _;`, one `include snippets/pbx3-ssl-active.conf` (one cert). |
| **Asterisk** | http.conf and PJSIP TLS use the same single cert. |
| **Tenant FQDN** | Schema: `cluster.fqdn` exists; not yet used for LE or virtual hosting. |

So today, if a phone connected to `abc12xyz.pbx3.com` (tenant FQDN) but the cert was for `node1.pbx3.com`, the client would see a **certificate name mismatch** unless we change strategy.

---

## 3. Assumptions

- **Base domain:** There is a single base domain for tenant hostnames, e.g. `pbx3.com`, so tenant FQDNs are `{shortuid}.pbx3.com`. (If per-customer domains are needed, the options below still apply per base domain.)
- **DNS:** For any option, each tenant FQDN must eventually resolve to the correct node (A record or CNAME). Who creates these (manual, API, supertask) is a separate concern.
- **One node, many tenants:** A node can host multiple tenants; each may have its own FQDN. We need either one cert that covers all those FQDNs, or multiple certs with SNI.

---

## 4. Viable options

### Option A: Single cert with multiple SANs (all tenant FQDNs + node FQDN)

**Idea:** One certificate that includes the **node FQDN** and **every tenant FQDN** on this node (e.g. `node1.pbx3.com`, `abc12xyz.pbx3.com`, `def99uvw.pbx3.com`). Same cert for nginx and Asterisk; no SNI needed.

**Mechanics:**

- Certbot (or lego) with multiple `-d` flags:  
  `certbot certonly --standalone -d node1.pbx3.com -d abc12xyz.pbx3.com -d def99uvw.pbx3.com -m admin@example.com`
- **HTTP-01:** Each `-d` hostname must resolve to this server; port 80 is opened; certbot serves the challenge for each. So all tenant FQDNs must point to this node before issuance/renewal.
- **Storage:** Keep a list of FQDNs (node + tenants) in a file or derive from DB (e.g. `globals.fqdn` + `SELECT fqdn FROM cluster WHERE fqdn IS NOT NULL`). Cert lives in one path, e.g. `/etc/letsencrypt/live/node1.pbx3.com/` (certbot uses the first `-d` as the live dir name).
- **When to re-issue:** Whenever a tenant is **added** or **removed** (or their FQDN changes), the cert must be re-issued with the new SAN list. So: new tenant → set `cluster.fqdn` → run a script that requests a new cert with updated domain list → apply-active-cert.
- **Renewal:** Same: renewal must pass the current list of domains; if a tenant was removed, renewal script uses the current list (no need to remove from cert until next renewal — old SANs stay until cert expires and is renewed with updated list).

**Pros:**

- One cert, one key; nginx/Asterisk config unchanged (same snippet, one cert path).
- No DNS API; HTTP-01 only.
- Phones get a valid cert for their tenant FQDN (it’s in the SAN list).

**Cons:**

- Let's Encrypt limit **50 SANs per certificate** (as of current policy). If a node has >50 tenants with FQDNs, you need either multiple certs + SNI or a different approach.
- Re-issue on every tenant add/remove (or batch periodically). Rate limits (50 certs per week per domain) may matter if tenants churn a lot.
- Renewal must know the current tenant list; renewal script reads from DB or from a maintained file.

**Changes required:**

- **pbx3:** Script that builds domain list (node + all tenant FQDNs from cluster table), runs certbot with multiple `-d`. Call it from API when adding/removing tenant FQDN and from cron for renewal. `le-domain` could become `le-domains` (one FQDN per line) or keep node as primary and add a separate “tenant FQDN list” source.
- **Certificates panel (optional):** Show “Cert covers: node1.pbx3.com, abc12xyz.pbx3.com, …” and “Add tenant FQDN” flow that triggers re-issue.
- **Tenant panel:** When setting `cluster.fqdn` to `{shortuid}.{domain}.{tld}`, trigger cert re-issue (or queue it). Ensure DNS is created (manual or later automation).

---

### Option B: Wildcard cert per base domain (`*.{domain}.{tld}`)

**Idea:** One certificate with SAN `*.pbx3.com` (and optionally `pbx3.com`). Covers **all** tenant FQDNs that match the pattern `{shortuid}.pbx3.com`, and the node FQDN if it’s under the same domain (e.g. `node1.pbx3.com`).

**Mechanics:**

- **DNS-01 challenge:** Required for wildcards. Certbot/lego creates a TXT record `_acme-challenge.pbx3.com` (or per-name); LE validates; then you get `*.pbx3.com`.
- **DNS API:** You need a DNS provider that supports API updates (e.g. Route53, Name.com, Cloudflare). Credentials (or IAM) must be available on the node (or on a central “cert server” that distributes the cert).
- **Storage:** Single cert in e.g. `/etc/letsencrypt/live/pbx3.com/` (or similar). Same apply-active-cert pattern; nginx/Asterisk use this one cert.
- **Renewal:** Standard certbot/lego renewal; DNS-01 again. No need to know tenant list; new tenants automatically covered.

**Pros:**

- One cert covers all current and **future** tenants; no re-issue when adding/removing tenants.
- No port 80 needed for challenge.
- Simple operational model once DNS API is in place.

**Cons:**

- **DNS API and credentials** — LETSENCRYPT_PLAN and CERTIFICATES_ADOPTION_PLAN explicitly avoided DNS API for simplicity. This is a design shift.
- Security: credentials must be stored and possibly rotated; lock down who can run certbot/lego with those credentials.
- Wildcard covers only **one level** of subdomain: `*.pbx3.com` covers `abc12xyz.pbx3.com` but not `foo.abc12xyz.pbx3.com`. For `{shortuid}.{domain}.{tld}` you’re fine.

**Changes required:**

- **pbx3:** Add DNS-01 support (certbot with DNS plugin or lego with DNS provider). Store credentials securely; document in installer/handoff.
- **LETSENCRYPT_PLAN / CERTIFICATES_ADOPTION_PLAN:** Update to allow wildcard + DNS-01 as an option (or replace current “one hostname, HTTP-01” with “wildcard when DNS API configured”).
- **Certificates panel:** Optional “Configure wildcard” flow (domain + DNS API choice + credentials). First cert and renewal use DNS-01.

---

### Option C: Multiple certs per node (one per tenant FQDN) + SNI

**Idea:** Each tenant FQDN gets its **own** certificate in `/etc/letsencrypt/live/{tenant_fqdn}/`. Nginx and Asterisk use **SNI** (Server Name Indication) to select the correct cert for each connection.

**Mechanics:**

- When a tenant is given an FQDN (e.g. set `cluster.fqdn`), run certbot for that FQDN only:  
  `certbot certonly --standalone -d abc12xyz.pbx3.com -m admin@example.com`  
  (or via a webroot that routes by Host header). DNS for that FQDN must point to this node; port 80 opened for the challenge.
- **Nginx:** Either (1) multiple `server { server_name abc12xyz.pbx3.com; ssl_certificate .../abc12xyz.pbx3.com/fullchain.pem; ... }` blocks, or (2) a single listen with `ssl_reject_handshake off` and a `map $ssl_server_name $cert_path` (or similar) to pick cert. Nginx supports multiple certs per listen via SNI.
- **Asterisk:** PJSIP and HTTP can use TLS SNI (multiple certs); config must list all tenant cert paths or be generated from cluster table.
- **Renewal:** `certbot renew` renews **all** certs under `/etc/letsencrypt`; deploy hook runs apply-active-cert (which must then write nginx/Asterisk config that includes **all** current certs, not just one).

**Pros:**

- Clean separation: add/remove tenant doesn’t change other tenants’ certs.
- No SAN limit; no re-issue of a giant cert when tenant list changes.
- HTTP-01 only; no DNS API.

**Cons:**

- **Config generation:** Nginx and Asterisk config must be **dynamic** (generated from list of tenant FQDNs and their cert paths). apply-active-cert (or a sibling script) must write multiple server blocks or SNI map and reload.
- **Port 80 for HTTP-01:** When requesting a cert for a **new** tenant FQDN, that FQDN must resolve here and port 80 must serve the challenge for that Host. So nginx (or a stub) must route `Host: abc12xyz.pbx3.com` to the same webroot/certbot challenge dir — doable with a single server block `server_name _` and a shared webroot, as long as certbot can serve the right token for that hostname.
- More certs and more renewal work (certbot handles it, but deploy hook must regenerate config for all).

**Changes required:**

- **pbx3:** Script to request cert for one FQDN; maintain list of “certified” FQDNs (e.g. from DB). apply-active-cert (or new script) reads all tenant FQDNs with certs, writes nginx snippet or full server blocks with per-name cert paths, and Asterisk config with multiple certs/SNI.
- **pbx3api nginx:** Either include a generated snippet that defines multiple server blocks (one per tenant FQDN) or one block with SNI map. Reference: nginx `ssl_certificate` can be different per `server_name`.
- **Certificates panel / API:** “Request certificate for tenant FQDN” (per tenant); show list of tenant FQDNs and cert status. Renewal remains global (certbot renew).

---

### Option D: Tenant FQDN is CNAME to node; node cert only (no tenant in cert)

**Idea:** Tenant FQDN `{shortuid}.{domain}.{tld}` is a **CNAME** to the node FQDN (e.g. `node1.pbx3.com`). Phones resolve tenant FQDN → node; they connect to the node’s IP. TLS is the **node’s** cert only; the client connects to the resolved hostname (tenant FQDN), so the TLS handshake presents the node’s cert — **mismatch** unless the client is configured to accept (e.g. “connect by IP” or “ignore cert name”). Many phones and browsers will show a security warning.

**Verdict:** **Not recommended** if we want “phones find tenant by tenant FQDN” and **valid** TLS. Only viable if endpoints connect by node FQDN or IP and tenant is identified by other means (e.g. path, auth), in which case tenant FQDN is for display/DNS only, not for TLS. So we do **not** treat this as a primary option for “tenant FQDN for phones with valid cert.”

---

## 5. Comparison summary

| Option | Cert model | Challenge | Re-issue on tenant add/remove? | SAN limit | DNS API? | Config complexity |
|--------|------------|-----------|--------------------------------|-----------|----------|-------------------|
| **A** Multi-SAN | One cert, node + all tenant FQDNs | HTTP-01 | Yes (or at renewal) | 50 names | No | Low |
| **B** Wildcard | One cert `*.{domain}.{tld}` | DNS-01 | No | N/A | Yes | Low |
| **C** SNI | One cert per tenant FQDN | HTTP-01 | No (new cert only for new tenant) | N/A | No | High (dynamic nginx/Asterisk) |
| **D** CNAME only | Node cert only | — | No | — | No | Low (but cert mismatch) |

---

## 6. Recommendation (short)

- **Small/medium per-node tenant count (e.g. &lt; 50), want to avoid DNS API:** **Option A** (multi-SAN). Straightforward extension of current design; add a script that builds domain list from node + `cluster.fqdn`, run certbot with multiple `-d`, re-issue when tenant FQDNs change (or at renewal with current list).
- **Many tenants or want zero re-issue on tenant churn:** **Option B** (wildcard + DNS-01) if you can adopt a DNS API and secure credentials.
- **Need &gt; 50 tenant FQDNs per node and no DNS API:** **Option C** (SNI + one cert per tenant). Highest implementation cost (dynamic nginx/Asterisk and cert-request flow per tenant).

---

## 7. Tenant FQDN and migration

- **Setting tenant FQDN:** Convention: `cluster.fqdn = {shortuid}.{domain}.{tld}` (e.g. derived from tenant shortuid + base domain). API/SPA can enforce this or allow override. Base domain could come from globals or config.
- **DNS for tenant FQDN:** For **HTTP-01** (Options A and C), each tenant FQDN must resolve to the **node** that hosts that tenant (A or CNAME). When a tenant is **migrated**, DNS must be updated so the same FQDN now points to the **new** node (supertask or manual). For **wildcard** (Option B), no per-tenant DNS for cert; but routing (which node serves which tenant) may still need A/CNAME or a load balancer that routes by hostname.
- **Export/import:** Tenant export includes `cluster.fqdn`; on import, the new node may need to (A) add this FQDN to its multi-SAN cert, (B) already have wildcard, or (C) request a new cert for this FQDN and regenerate SNI config. So the cert strategy affects what the “land tenant” step does after import.

---

## 8. Firewall FQDN inspection (iptables string match)

When **fqdninspect** is enabled, the firewall uses **iptables string matching** on inbound SIP (port 5060) so that only packets that contain the expected FQDN in the SIP payload (e.g. in Via or Contact, as `sip:<fqdn>`) are accepted. This reduces robo‑dialler / brute‑force attempts that don’t know the correct hostname. This only applies to **unencrypted** SIP (TCP/UDP 5060); TLS SIP is separate.

### 8.1 Sail65 reference (single FQDN)

In sail65 the rule is in **sail65/sail-6/opt/sark/etc/shorewall/sark_inline_fqdn**:

```
INLINE(ACCEPT) net $FW tcp 5060 ; -m string --algo bm --to 1000 --string "sip:$FQDN"
INLINE(ACCEPT) net $FW udp 5060 ; -m string --algo bm --to 1000 --string "sip:$FQDN"
```

- **INLINE** injects raw iptables rules into Shorewall.
- **-m string --algo bm --to 1000** matches the first 1000 bytes of the packet for the given string.
- **--string "sip:$FQDN"** ensures the SIP message contains the expected FQDN (e.g. in Via/Contact as `sip:node1.pbx3.com`). So only traffic that “claims” the right hostname is allowed through.

### 8.2 Current pbx3 behaviour (single FQDN)

- **pbx3** ships **pbx3_inline_fqdn** as comment-only; when **globals.fqdninspect** is YES, **NetHelperClass::copyFirewallTemplates()** overwrites it.
- NetHelper reads **globals** (fqdn, fqdninspect, bindport) and writes **two** INLINE rules (TCP and UDP) using **bindport** and the **fqdn** string. Note: current pbx3 code uses the raw FQDN string **without** the `"sip:"` prefix (sail65 uses `"sip:$FQDN"`); for consistency with sail65 and correct matching of SIP headers, the string should be **`sip:<fqdn>`**.
- File is written under `/etc/shorewall/pbx3_inline_fqdn` (or the configured Shorewall dir); **rules** includes `INCLUDE pbx3_inline_fqdn`.

### 8.3 What’s needed for multiple tenant FQDNs

We need to allow SIP that contains **any** of the valid FQDNs: **node FQDN** (globals.fqdn) plus **every tenant FQDN** (cluster.fqdn where not null). So:

- **One INLINE(ACCEPT) rule per FQDN**, for both TCP and UDP on the SIP port(s), with string **`sip:<that_fqdn>`**.
- Example: if node is `node1.pbx3.com` and tenants have `abc12xyz.pbx3.com`, `def99uvw.pbx3.com`, then the generated **pbx3_inline_fqdn** should contain (conceptually):
  - `INLINE(ACCEPT) net $FW tcp 5060 ; -m string --algo bm --to 1000 --string "sip:node1.pbx3.com"`
  - `INLINE(ACCEPT) net $FW udp 5060 ; -m string --algo bm --to 1000 --string "sip:node1.pbx3.com"`
  - same for `sip:abc12xyz.pbx3.com` (tcp + udp)
  - same for `sip:def99uvw.pbx3.com` (tcp + udp)
- **Who generates:** The same place that today writes **pbx3_inline_fqdn** (e.g. **NetHelperClass::copyFirewallTemplates()** in pbx3) should:
  1. Read **globals.fqdn**, **globals.fqdninspect**, **globals.bindport** (or use 5060 if bindport is for something else; confirm from sail65/pbx3).
  2. If fqdninspect is enabled, read all **cluster.fqdn** that are not null/empty (and optionally only where **cluster.fqdninspect** is true if we make it per-tenant later).
  3. Build the full list of FQDNs: node FQDN (if set) + tenant FQDNs, deduplicated.
  4. Write **pbx3_inline_fqdn** with two lines (TCP, UDP) per FQDN, each with string **`sip:<fqdn>`**, using the same **--to** and port as sail65 (e.g. 1000 and 5060) for consistency.
  5. If fqdninspect is disabled, write the file as comment-only (current behaviour).
- **When to regenerate:** Whenever **fqdninspect** is toggled, or when **globals.fqdn** or any **cluster.fqdn** is added/changed/removed, so that the inline file stays in sync with the tenant list. That implies: after tenant create/update/delete (if fqdn changed), and after sysglobals update (fqdn or fqdninspect), trigger the same path that runs copyFirewallTemplates (or equivalent) and then Shorewall restart/reload.

**Note:** iptables string matching is the reason we keep using iptables/Shorewall for this bit rather than nftables; nftables has different syntax and may not have the same string module. So this stays as an INLINE iptables rule under Shorewall.

---

## 9. Code blocks (panels, modules) to change

Below is the set of **panels, API controllers, backend scripts, and helpers** that need to be touched to implement **Option A (multi-SAN)** plus **firewall FQDN inspection for multiple tenant FQDNs**. Order is by layer (pbx3 → pbx3api → pbx3spa).

### 9.1 pbx3 (backend)

| Block | Path / location | Change |
|-------|------------------|--------|
| **le-first-cert.sh** | `pbx3-1/opt/pbx3/scripts/le-first-cert.sh` | Extend to support **multiple domains**: accept either one FQDN (current) or a list (e.g. from a file or space-separated args). Run `certbot certonly --standalone -d fqdn1 -d fqdn2 ... -m email`. Write **first** FQDN to `le-domain` (so cert path remains `/etc/letsencrypt/live/<first_fqdn>/`). Alternatively: add **le-first-cert-multi.sh** that takes domain list + email and leaves le-first-cert.sh as-is for single FQDN. |
| **le-renew-with-80.sh** | `pbx3-1/opt/pbx3/scripts/le-renew-with-80.sh` | No change if certbot renewal config (created at first run with multiple `-d`) already lists all SANs; `certbot renew` will renew that cert. Ensure deploy hook (apply-active-cert.sh) still runs. |
| **apply-active-cert.sh** | `pbx3-1/opt/pbx3/scripts/apply-active-cert.sh` | No change: continues to read **le-domain** (single “primary” FQDN) for cert path; multi-SAN cert lives in that one directory. |
| **NetHelperClass::copyFirewallTemplates()** | `pbx3-1/opt/pbx3/php/classes/NetHelperClass` | **Change:** (1) Read **globals** (fqdn, fqdninspect, bindport). (2) If fqdninspect enabled, also query **cluster** for all non-null `fqdn`. (3) Build list: node FQDN + tenant FQDNs, deduplicated. (4) Write **pbx3_inline_fqdn** with **two lines per FQDN** (TCP, UDP), string **`sip:<fqdn>`** (not raw fqdn), port from bindport or 5060, `--to 1000`. (5) If fqdninspect disabled, write comment-only. |
| **Firewall / syshelper trigger** | — | Today the API does **not** run copyFirewallTemplates; only pbx3’s `restartFirewall()` does. To keep the inline file in sync when tenant or sysglobals change from the panel, either: **(a)** Add a **script** on pbx3 (e.g. `update-fqdn-inline.sh`) that runs the PHP NetHelper copyFirewallTemplates (or replicates the logic in shell + sqlite3) and have the API call it via syshelper before/after firewall restart; or **(b)** Firewall panel “Restart” calls that script then shorewall restart. So: **FirewallController** (see below) or a new syscommand that “refreshes FQDN inline then restarts” may be needed. |

### 9.2 pbx3api (API)

| Block | Path / location | Change |
|-------|------------------|--------|
| **CertificateController** | `app/Http/Controllers/CertificateController.php` | **setup:** Accept **optional** list of extra FQDNs (e.g. `domains[]` or body with `fqdn` + `tenant_fqdns[]`). Build full list (node + tenants), call **le-first-cert-multi.sh** (or extended le-first-cert) with that list so the issued cert is multi-SAN. **letsencrypt (GET):** Continue to use le-domain for “primary” and path; optionally return **domains** (list of SANs) by reading from DB (globals.fqdn + cluster.fqdn) or from cert. **renew:** No change; certbot renew renews the multi-SAN cert. Optionally add **POST /certificates/letsencrypt/sync** that (1) builds domain list from globals + cluster, (2) re-issues cert with that list (same as setup but “already configured” path), for use when a tenant FQDN is added/removed. |
| **TenantController** | `app/Http/Controllers/TenantController.php` | **After create/update/delete** (when `cluster.fqdn` or `cluster.fqdninspect` might have changed): call syshelper to **refresh firewall FQDN inline** (script that runs copyFirewallTemplates or equivalent). Optionally trigger **cert re-issue** when tenant FQDN is set/changed (multi-SAN sync). |
| **SysglobalController** | `app/Http/Controllers/SysglobalController.php` | If **sysglobals** (or a dedicated “network” endpoint) exposes **fqdn** / **fqdninspect**: after update, call syshelper to **refresh firewall FQDN inline** so the Shorewall file is updated before next restart. |
| **FirewallController** | `app/Http/Controllers/FirewallController.php` | **ipv4restart / ipv6restart:** Before `shorewall restart`, call syshelper to run the **FQDN inline update script** (so the file reflects current globals + cluster.fqdn). That way “Restart firewall” from the panel always writes the latest tenant list into pbx3_inline_fqdn. |
| **New syscommand or script** | e.g. `syscommands` or new route | Optional: **“Refresh firewall FQDN inline”** (no restart) so tenant/sysglobals save can update the file without restarting Shorewall; admin can restart later. Or fold into existing firewall restart. |

### 9.3 pbx3spa (SPA / panels)

| Block | Path / location | Change |
|-------|------------------|--------|
| **CertificatesView** | `src/views/CertificatesView.vue` | **Option A multi-SAN:** (1) **Setup:** Either keep single “Hostname (FQDN)” for **node** only and add copy like “Tenant FQDNs are added from Tenant panel and included in cert at next renewal/sync,” or add a “Sync cert with tenant list” button that calls the new sync endpoint so the cert is re-issued with node + all tenant FQDNs. (2) **Status:** Show “Cert covers: &lt;list of domains&gt;” from GET letsencrypt if API returns **domains** (SAN list). (3) **Renew now:** Unchanged. |
| **TenantDetailView** | `src/views/TenantDetailView.vue` | Add **FQDN** (and optionally **FQDN inspect**) to the form: bind **editFqdn** to `cluster.fqdn`, include in save payload. Optionally show hint: “e.g. {shortuid}.pbx3.com”. If base domain is configurable (sysglobals or config), show it so user can follow convention. |
| **tenantAdvanced.js** | `src/constants/tenantAdvanced.js` | If FQDN is in the “advanced” section, add **fqdn** (and **fqdninspect** if per-tenant) to ADVANCED_KEYS and ADVANCED_FIELDS; otherwise add **editFqdn** in TenantDetailView outside advanced (e.g. Identity or Settings) and include in save. |
| **TenantCreateView** | `src/views/TenantCreateView.vue` | If new tenants get a default FQDN (e.g. derived from shortuid + base domain), add **fqdn** to create payload; else leave as null and user sets it in Edit. |

### 9.4 Summary table

| Layer | Component | Purpose of change |
|-------|-----------|--------------------|
| pbx3 | le-first-cert.sh (or new multi script) | Issue cert with multiple SANs (node + tenant FQDNs). |
| pbx3 | NetHelperClass::copyFirewallTemplates | Write one INLINE rule per FQDN with `sip:<fqdn>`. |
| pbx3 | Script + API call path | Refresh pbx3_inline_fqdn from API (tenant/sysglobals/firewall restart). |
| pbx3api | CertificateController | Setup/sync with domain list from DB; optionally return SAN list. |
| pbx3api | TenantController | After save: refresh firewall FQDN inline; optionally trigger cert sync. |
| pbx3api | SysglobalController / FirewallController | After sysglobals update or before firewall restart: refresh FQDN inline. |
| pbx3spa | CertificatesView | Show “Cert covers” list; optional “Sync with tenant list” action. |
| pbx3spa | TenantDetailView (+ constants) | Edit (and create) **cluster.fqdn** (and optionally fqdninspect). |

---

## 10. Impact on future tenant-scoped access

**Context:** Today only admins have access; there is no tenant-scoped security yet. The plan (see **ADMIN_PANELS_AND_PERMISSIONS.md**) is to tighten this so that **tenant users** can only see and manage their own tenant’s data (row-level scope via “allowed clusters” and abilities). A possible addition is using the **tenant URL** (e.g. `https://abc12xyz.pbx3.com`) as the **access point** so that the hostname identifies the tenant and the session is scoped to that tenant.

**Impact of this work:**

- **No conflict.** The per-tenant FQDN + cert + firewall work does **not** implement auth or row-level scope. It only makes **tenant FQDNs** first-class: stored in `cluster.fqdn`, included in the certificate (multi-SAN), and allowed in the firewall. That is exactly what you need if you later want “tenant URL = access point.”
- **Enables tenant-URL access.** If end users are given a URL like `https://abc12xyz.pbx3.com`:
  - **TLS** will already be valid for that hostname (we’re adding it to the cert).
  - The **API** can later use the **Host** header to resolve the tenant (`cluster.fqdn = request host`) and scope the session or all queries to that tenant. That’s an auth/middleware change; no change to cert or firewall.
  - The **SPA** can be served from that URL; the backend already has a single API and SPA entry point that can serve multiple hostnames (same nginx/Asterisk, same cert with many SANs). So this mod **enables** “one URL per tenant” without requiring it.
- **Nothing to undo.** We are not hardcoding “one global admin URL” or ignoring the Host header. We’re adding tenant FQDNs to the data model, cert, and firewall. Future auth can:
  - Keep a single entry URL (e.g. node FQDN) and scope by user’s `allowed_clusters` from whoami, or
  - Use the tenant URL as the access point and derive tenant from Host, then enforce row-level scope for that tenant.
- **One thing to keep in mind:** When you add tenant-scoped users, the API will need to **resolve tenant from request context**: either from the user’s allowed clusters (current plan) or from **Host** when the request is to a tenant FQDN. So ensure the API can map `Host: abc12xyz.pbx3.com` → tenant (e.g. `SELECT id/shortuid FROM cluster WHERE fqdn = ?`). This mod does not add that; it just makes sure the hostname is valid and routable so that when you do add it, it works.

**Summary:** This work **supports** future tenant-only access and tenant-URL access. It does not implement them. It provides the right building blocks (tenant FQDN in schema, valid cert and firewall for that URL) and does not block or conflict with row-level scope or “tenant URL as access point.”

---

## 11. References

- **pbx3spa/workingdocs/CERTIFICATES_ADOPTION_PLAN.md** — Panel and API; active cert selection; LE setup/renew.
- **pbx3/workingdocs/LETSENCRYPT_PLAN.md** — HTTP-01, one hostname, port 80, deploy hook; multi-server (one cert per server).
- **pbx3spa/workingdocs/TRUNK_ROUTE_MULTITENANCY.md** — Tenant migration (export/import, miniDB, trunk mapping).
- **pbx3 full_schema.sql** — `cluster.fqdn`, `cluster.fqdninspect`; `globals.fqdn` (instance).
- **pbx3api app/Models/Tenant.php** — `fqdn` in `$fillable`.
- **sail65:** `sail-6/opt/sark/etc/shorewall/sark_inline_fqdn` — reference INLINE rule with `sip:$FQDN`.
- **pbx3:** `pbx3-1/opt/pbx3/php/classes/NetHelperClass` — `copyFirewallTemplates()`; `pbx3-1/opt/pbx3/etc/shorewall/pbx3_inline_fqdn` — shipped template.
