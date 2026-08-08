# Session handoff — where we left off

**AI: read this first.**

**Session end:** When the user says **`session end`**, **`end session`**, or **`update handoff`**, follow **`pbx3/workingdocs/SESSION_END_CHECKLIST.md`** (prepend a new block below; update **`pbx3/workingdocs/TODO.md`** and **`AGENT_HANDOFF.md`** too).

**New session:** Read **`AGENT_HANDOFF.md`** § Next agent session notes → **`TODO.md`** → this file (top **Session end** block only). Wait for user task before coding.

## Session end 2026-08-07 — Fleet SPA catalog UX polish

**On `main`:** Fleet Instances/Tenants/Users Actions menus + compact status; Site Groups / Edge button chrome; probe age vs RTT clarity; login TOTP label stacks above input. Tip: pbx3spa **`e9ac778`** (includes catalog polish **`93ab664`**).

**Dev against golden:** SPA **`npm run dev`** · Gatekeeper **`control.pbx3.com`** · API **`https://08jzwn.pbx3.com:44300/api`**.

**Operator impact:** Fleet catalog tables cleaner to scan; status popup for probe detail; cannot click Disable on own Fleet user row.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**.

**Resume:** First-out F1–F4; roll instance API tip to other nodes if needed.

---

## Session end 2026-08-07 — Fleet Gatekeeper TOTP lab green

**Superseded** by Fleet SPA catalog UX polish block above for “read first.” Gatekeeper TOTP still on `main`.

---

## Session end 2026-08-07 — SPA Sanctum TOTP lab green

**Superseded** by Fleet Gatekeeper TOTP block above for “read first.” Instance Sanctum TOTP on **`main`**.

---

## Session end 2026-08-07 — SBC TOTP 2FA lab green

**Superseded** by SPA Sanctum TOTP block above for “read first.” SBC TOTP still on `pbx3sbc-admin` **`main`**.

---

## Session end 2026-08-06 — first-out triage + Device lean + provisioning park

**Superseded** by SBC TOTP block above for “read first.” First-out / Device lean still on `main`.

---

## Session end 2026-08-06 — fleet DNS/LE lock + tenant-A warn

**Superseded** by first-out / Device lean block above for “read first.” Fleet DNS/LE lock still on `main`.

---

## Session end 2026-08-06 — Site Groups C0–C6 lab green

**Superseded** by fleet DNS/LE lock block above for “read first.” Site Groups still on `main`.

---

## Session end 2026-08-06 — naming lock + Site Group stopper

**Superseded** by Site Groups C0–C6 block above for “read first.” Naming lock still on `main`.

---

## Session end 2026-08-06 — Fleet Delete lab green

**Superseded** by naming + Site Group block above for “read first.” Fleet Delete still on `main`.

---

## Session end 2026-08-06 — number wire D1=C + seed MainOut

**Superseded** by Fleet Delete block above for “read first.” Number wire + MainOut seed shipped earlier same day.

---

## Session end 2026-08-05 — short dial D + E closed

**Superseded** by 2026-08-06 Fleet Delete block above for “read first.”

---

## Session end 2026-08-05 — short dial D desk findings (lean A)

**Superseded** by D+E closed block above. Path 1 shipped Magrathea; desk matrix green.

---

## Session end 2026-08-05 — day-parts on main + DID open-seed

**Superseded.** Day-parts + DID open-seed on `main`; golden **0.0.4-8** / cagi **1.0.0-13**.

---


## Session end 2026-08-04 — day-parts play-test + timer TZ/half-open + UX locks

**Superseded** by **2026-08-05** block above.

**On branch `time-based-routing`:** Timer uses Network site TZ; timespans half-open `[start,end)`; Day timer edit shows **Every day** for `*`. Spec: **default open** locked (BLF-only shops); **`mon-fri` ranges** = next UX must-have. Aelintra lab has full office day-parts (many weekday clones until ranges).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · SPA `npm run dev` on **`time-based-routing`**. Tenant **Aelintra**. DID **`01924910444`**.

**Operator impact:** Enter local office hours (not UTC). Abutting windows use exact times (e.g. `20:00` / `08:30`). Prefer **Every day** overnight closed + sat/sun (SARK-style) where binary; day-parts modes still need ranges for clean Mon–Fri open/lunch/evening.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** · **`TIME_BASED_ROUTING_REQUIREMENTS.md`** §5.8–5.9.

**Resume:** Flip → implement day-of-week ranges; then push/PR merge four repos when ready.

---

## Session end 2026-08-04 — time-based routing (day-parts) A–E complete

**Superseded** by play-test / timer harden block above.

**On branch `time-based-routing` (push/merge open):** SPA route profiles primary; inbound/daytimers/holidays schedule-mode fields; tenants show **Schedule** force + timer `sched_mode`. API + packages on golden **0.0.4-7** / cagi **1.0.0-13**. Open/close demoted labels; help keys applied on golden.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · SPA `npm run dev` on **`time-based-routing`**. DID **`01924910444`**. Sideband timer ~1 min → refresh list/detail to see mode change.

**Operator impact:** Configure **route profiles** then attach DIDs; daytimers write named modes (not only closed windows). Master force still AUTO/CLOSED in SPA; multi-mode force via AstDB/BLF path. **Kildare** not updated.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** · **`TIME_BASED_ROUTING_REQUIREMENTS.md`**.

**Resume:** See current session end block above.

---

## Session end 2026-08-04 — short dial package roll + residual docs

**Superseded** by day-parts block above for “read first.” **Fleet packages on `main`:** **pbx3 0.0.4-6** + **pbx3cagi 1.0.0-11** on golden / bzy / kildare. Day-parts lab packages on golden only supersede those versions.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · **Outbound → Dial prefixes**. Magrathea **`3.93.26.82`**.

**Operator impact:** Short dial fleet-wide; CLIP redial OEM-open (**TODO D**).

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** · **`TENANT_SHORT_DIAL_REQUIREMENTS.md`**.

**Resume:** See current session end block above.

---

## Session end 2026-08-04 — SIPp pack 11/11 + DID lab debug

**Lab only (no SPA product code):** Full SIPp L1 pack green; Magrathea `01924910444` inbound restored; pack `OUT_DIGITS` digit-E.164 for Brindley strip. Site-dial dual-host still green. *(Package roll completed later same day — see block above.)*

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api`. SIPp Peer host `98.82.58.59` · UAC `98.93.32.43` · Magrathea **`3.93.26.82`**.

**Operator impact:** Office **01924** DIDs aim at **Kildare** (18076 already); **910444** still lab-routing to golden until moved. DID rules must use **post-dialect digit E.164** prefixes; node Ingress must include **wire `+44…`** after genAst. SBC **503 No gateways** can mean remapped home **603**, not missing route.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** · sipplab **`ENV_CONTRACT.md`** (`OUT_DIGITS`).

**Resume:** See current session end block above.

---

## Session end 2026-08-04 — tenant short dial A–E lab green + merge

**Merged to `main`:** Dial prefixes admin (**A/A′**) + GenAst/CAGI PrefixDial (**C**) + SBC miss→home + hairpin CLIP (**B/D partial**) + dual-host SIPp L1 (**E** green). Repos: pbx3, pbx3api, **pbx3spa**, pbx3cagi, pbx3sbc, sipplab.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · SPA `npm run dev` · **Outbound → Dial prefixes**. Lab: prefix `81` → `dhbm8x.pbx3.com`; path via Magrathea VIP **`3.93.26.82`**.

**Operator impact:** Instance admins configure sister-site dial by **tenant FQDN**. Handset shows **extension** as CLIP; network return id is PAI/`suid@fqdn`. Live dial needs home GenAst+cagi + Magrathea B (lab green; package roll still open). Tenant users do not see the panel.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** · **`TENANT_SHORT_DIAL_REQUIREMENTS.md`**.

**Resume:** Package roll / residual D–F when scheduled; next big product track often **time-based routing**. Wait for operator task.

---

## Session end 2026-08-03 — SPA WSS line test shipped

**Merged to `main` (pbx3spa):** JsSIP **Line test** on WebRTC extension detail — edge WSS path prover + post-call quality report (lab green: register / dial / answer / report). Violet right-aligned button; click feedback; no MAC on WebRTC edit. **pbx3** TODO/handoff: short dial + time-based routing next; parks for SPA bundle diet, lab DB anonymize, exploratory provision server.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · WSS `wss://sbc.pbx3.com:8089/ws` · **`8af9ee`** / **`dhbm8x.pbx3.com`** · SIP pass from create/regen/`~/webrtc-1500.env`.

**Operator impact:** Admins can prove Magrathea WebRTC registration and media from the instance SPA and leave a measurable quality report. Not a softphone.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** · **`WSS_LINE_TEST_REQUIREMENTS.md`**.

**Resume:** **Tenant short dial** · **time-based routing** as next big product tracks (when scheduled). Wait for operator task.

---

## Session end 2026-08-03 — package roll fleet + bzy SBC fix

**Merged / on `main`:** **pbx3 0.0.4-5** + **pbx3cagi 1.0.0-10** on **08jzwn**, **bzy54n**, **kildare**. Magrathea: bzy IP whitelist + dispatcher setid 3 → `54.158.236.215`. Earlier same day: W1 WSS lab green; SPA **WSS line test** requirements locked.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · edge WSS `wss://sbc.pbx3.com:8089/ws` · **`8af9ee`** / **`dhbm8x`** / **1500**. **bzy54n** public **`54.158.236.215`** (no EIP label).

**Operator impact:** All lab fleet nodes share current packages. New fleet-node public IPs need Fail2Ban whitelist + **dispatcher destination/source_ip** update (lab lesson).

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**.

**Resume:** Wait for task; product backlog open (number-wire, SPA line test implement, multi-AZ, …).

---

## Session end 2026-08-03 — Magrathea W1 closed; SPA line-test locked

**Merged to `main`:** Magrathea WSS path lab green + docs; PrepDial/webrtc tmpl product bits; **SPA** **`WSS_LINE_TEST_REQUIREMENTS.md`** direction locked (not implemented).

**Dev against golden:** edge `wss://sbc.pbx3.com:8089/ws` · **`8af9ee`** / **`dhbm8x.pbx3.com`** / **1500** · pass `~/webrtc-1500.env`. Instance **8089 closed** (edge-only WSS). API still `https://08jzwn.pbx3.com:44300/api`.

**Operator impact:** Real fleet web users = **WebRTC media on home** + **WSS only on SBC** + SIP/UDP to homes. Line test when built: instance SPA path prover against a real WebRTC extension.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — package residual + open backlog. Operator picks next session work.

**Resume:** Wait for task; do not assume next feature.

---

## Session end 2026-08-03 — Magrathea W1 WebRTC (lab green)

**Branches:** **pbx3sbc** `w1-magrathea-wss` · **pbx3cagi** `w1-webrtc-prep-fqdn` · **pbx3** `main` webrtc tmpl. Desk↔edge browser path **working both ways** (operator + audio).

**Dev / lab client:** WSS `wss://sbc.pbx3.com:8089/ws` · SIP **`8af9ee`** · domain **`dhbm8x.pbx3.com`** · pass golden `~/webrtc-1500.env`. Instance-direct WSS still available for singleton smokes.

**Operator impact:** Fleet WebRTC endpoints should use **UDP + SBC outbound_proxy** (same as desks); Dial RURI tenant FQDN via PrepDial. No SPA product change this session.

**Docs / TODO:** **`WEBRTC_W1_MAGRATHEA.md`** green · residual package merge / SG clamp / multi-AZ / SPA line test.

**Resume:** packaging or other TODO; do not enable edge WSS elsewhere without backup discipline in that checklist.

---

## Session end 2026-08-03 — WebRTC WSS golden (inbound + ICE)

**On `main` (pbx3):** Instance-direct WSS WebRTC path fixed on golden and in package source (webrtc tmpl, GenAst `$fqdn`/`$externip`, shorewall public RTP, ice_host via `refresh-pjsip-externip.sh`, apply-active-cert ACLs + Asterisk restart). No SPA code this session.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · SSH `ubuntu@44.196.98.191` (`pbx3test.pem`). WSS: `wss://08jzwn.pbx3.com:8089/ws` · SIP user **`8af9ee`** · domain **`dhbm8x.pbx3.com`** · dial **`1500`**.

**Operator impact:** Snom↔desk OK after open RTP; inbound to webphone works (JsSIP + Browser-Phone + **dev-team SPA**). Dev phone accepts SIP **`8af9ee`** (no digit-only sanitizer block). Post-Accept lag similar across clients = not a PBX-template metric. **from_domain / media_address / ice_host** still matter for **singleton-direct** WSS; less so when W1 terminates on SBC.

**Docs / TODO:** **`WEBRTC_WSS_LAB.md`**; residual SG **8089** clamp; multi-AZ; package roll. **SPA backlog:** **WSS line test** (ops path prover — not a softphone product) in **FEATURE_PLANS_INDEX** / **TODO**.

**Resume:** Clamp **8089** when host tests done; then backlog (number-wire, multi-AZ, package, SPA line test when scheduled).

---

## Session end 2026-08-03 — docs garden (handoff/TODO archive)

**Merged / on `main` soon:** docs only. Live handoffs slimmed; history under **`workingdocs/archive/`** (pbx3 + spa). **`TODO.md`** open-only; closed log archived. **SESSION_END_CHECKLIST** updated.

**Resume:** same product backlog as before garden; top of **AGENT_HANDOFF** + **TODO**. Wait for task.

---

## Session end 2026-08-02 — Kildare PSTN + Mangle + number wire draft

**Merged to `main`:** **pbx3cagi** Mangle **1.0.0-9** (`502596e`); **pbx3** Egress seed `00:+ 0:+44` + wire/research docs; **pbx3-docs** number-dialect seed note. SPA product code unchanged this session.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · SSH `ubuntu@44.196.98.191` (`pbx3test.pem`). **Kildare:** `https://kildare.pbx3.com:44300` · SSH `ubuntu@3.93.253.1` (`aelsip.pem`) · tenant **`18c8z3`**. Magrathea **`3.93.26.82`**.

**Operator impact:** Kildare **outbound + inbound** over Brindley working. Inbound Numbers / inroute show **`+441924918076`** (fleet wire). Outbound still node Mangle national→`+E.164` then SBC Brindley strip to `0…`.

**Docs / TODO:** open **number wire Model A/B** draft; **cagi 1.0.0-9** package/golden roll follow-up. **`TODO.md`** updated this session.

**Resume:** SPA-stable; product from TODO or wire-standard decision. Wait for task.


---

## Session history (archived)

Older **Session end** blocks live in **`archive/SESSION_HANDOFF_HISTORY.md`**. New session: top block only. Session end prepends a new block above this pointer.

---

## Quick start (next agent)

1. **Repos / branch:** **`main`** in all repos (`helptext`, `panelfixes`, `directory` merged and deleted). **`pbx3-master`** is **not** a git repo (four nested repos). Commit inside the repo you changed.
2. **Directory work:** Read **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** → **CENTRAL_ADMIN_DIRECTION.md** → v0 schema under **`pbx3/pbx3-directory/schema/`**.
3. **Panel / UI work:** **PANEL_PATTERN.md**; **PROJECT_PLAN.md** § Current state; **FEATURE_PLANS_INDEX.md**.
4. **TLS / certs (maintenance only):** **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** — new tenant = DNS → **Sync**; do not re-run **Get certificate** if LE already configured.

**Primary branch:** **`main`** (all repos).

## Read order by task

| Task | Read (in order) |
|------|------------------|
| Current state / next steps | This file only |
| **Session end** (user request) | **pbx3/workingdocs/SESSION_END_CHECKLIST.md** |
| **New session** (user request) | **pbx3/AGENT_HANDOFF.md** § Next agent session notes → **pbx3/TODO.md** → this file (top block only) |
| New or refactor panel | PANEL_PATTERN.md; optional: LIST_EXPORT_PDF_CSV.md, SINGLE_PANEL_SCREENS.md, PANEL_PATTERN_DEPARTURES.md |
| Panel conversion / technical debt | AGENT_HANDOFF_TECHNICAL_DEBT.md, PANEL_REFACTOR_STRATEGY.md |
| Feature (provisioning, DDI, trunk, cert, etc.) | FEATURE_PLANS_INDEX.md → then docs listed there |
| Port from Sail65 | SAIL65_PANEL_PORT_PLAN.md |
| Auth / permissions | AUTH_PATTERNS.md, ADMIN_PANELS_AND_PERMISSIONS.md, PERMISSIONS_MINIMAL_DEPLOY_PLAN.md |
| Schema / API alignment | pbx3api/workingdocs/PLAN_MODELS_AND_VALIDATION_HARMONISATION.md + resource audit; pbx3 full_schema.sql |
| Dev / run locally | DEV_ENVIRONMENT.md, SPA_BASICS.md |
| **Instance directory (next)** | **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`**; **INSTANCE_DIRECTORY_NEXT.md**; **CENTRAL_ADMIN_DIRECTION.md** |
| Per-instance TLS / LE (shipped on main) | pbx3 **TLS_AND_CERTIFICATES.md**, **TLS_IMPLEMENTATION_STEPS.md** |
| **Track B — SPA field help (Phase 4)** | pbx3 **TRACK_B_RELEASE_HARDENING.md** § Phase 4 → **STAKEHOLDER_DEMO_SCRIPT.md** → **PANEL_PATTERN.md** |

**Source of truth:** Schema and code. Verify against pbx3 full_schema.sql and repo code when changing behaviour; workingdocs may be outdated.

---

**Start here (context):** Read **PROJECT_PLAN.md** § Current state and **PANEL_PATTERN.md** (single-screen panels, cascaded sections, table alignment, toast API) to see what’s done and what’s left. **Branch:** **`main`** (pbx3spa, pbx3api).

**Extensions:** Complete (create/update, extension type derivation, live IP/Status from Asterisk AMI, SIP password display). Structure is sound; some TODOs remain (regenerate password, allow pkey change, PJSIP config edit). See **EXTENSIONS_LIVE_DATA.md** for live data behaviour and gotchas.

**Single-screen panels:** Firewall (IPv4 + IPv6) and **Backup/restore (Backups + Snapshots)** are complete. See **SINGLE_PANEL_SCREENS.md** for the full list; **PANEL_PATTERN.md** § Single-screen panels with cascaded sections and § Table column alignment for layout rules.

**Repos:** **pbx3-master** is not a git repo; it is a placeholder folder containing the four repos: **pbx3**, **pbx3api**, **pbx3cagi**, **pbx3spa**. Commit in the relevant repo.

