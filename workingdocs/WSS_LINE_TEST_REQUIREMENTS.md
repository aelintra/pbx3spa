# SPA WSS line test — requirements (locked direction)

**Status:** **Phase 1 lab green 2026-08-03**. **Phase 2 Support panel shipped 2026-08-26** (Tools → Line quality test; hidden caller; Hold/Resume; retires per-WebRTC button).  
**Job:** In-admin **diagnostic tool** — a dead-simple dialler over **SIP-over-WSS** that proves the extension path **and**, after **BYE**, leaves a readable **call quality report** (loss, jitter, RTT, path/timing). Demo-able evidence, not a plaything.  
**Not:** desk softphone, softphone chrome (transfer / BLF / multi-line / directory / call history / presence), Browser-Phone fork, native app, team softphone SPA replacement. **Hold** is Phase 2 **diagnostic only** (§10).

**Related:** **`FEATURE_PLANS_INDEX.md`** · **`pbx3/workingdocs/WEBRTC_WSS_LAB.md`** § Fleet edge W1 · **`FLEET_TRUNK_PEERING_DECISION.md`** §6.1 · SBC W1 checklist **`pbx3sbc/workingdocs/WEBRTC_W1_MAGRATHEA.md`**.

---

## 1. Product shape

| Piece | Role |
|-------|------|
| **Simple dialler** | Register · Dial · Answer · Hangup · short status log. One call at a time. |
| **During call** | Sample **WebRTC `getStats()`** (~1s) while the session is up — do not build mid-call softphone UI. |
| **After BYE** | **Call report** screen: verdict, SIP timeline, media quality, path context. |

Tone: **ops/diagnostic tool.** If a UI affordance only makes sense on a desk phone, leave it out.

---

## 2. Where it lives

| Layer | Role |
|-------|------|
| **pbx3spa (browser)** | UI + **JsSIP** UA (locked). SIP signaling, media negotiation, and **getStats** run **only in the browser**. |
| **Instance API (pbx3api)** | Auth, list/create **WebRTC** extensions, password reveal / set under admin capacity. |
| **Fleet / Gatekeeper** | **Not** v1 host of the line test. Optional later: pick tenant / deep-link defaults. **Never** mid-call; never SIP/media plane. |
| **SBC + home Asterisk** | Real call path (unchanged product stack). Stats are **browser-edge** of that path, not AMI/Homer for v1. |

v1 surface: **Instance SPA mode** (already on a tenant home).  
Optional later: Fleet → open instance / tenant line test with edge defaults — still a tool deep-link, not a second softphone product.

---

## 3. Extension definition — need one, not “WSS transport”

**Yes — needs a real tenant `ipphone` row.** REGISTER/auth needs shortuid + password + GenAst-built PJSIP.

**WebRTC device type, not client-facing WSS on the instance.**

| Concept | Magrathea / fleet path (default for line test) |
|---------|-----------------------------------------------|
| SPA UI “type” | **WebRTC** extension (device=`WebRTC`) |
| Home PJSIP signaling | **`transport-udp`** + fleet **`outbound_proxy`** (same as product tmpl after W1) |
| Home media | **`webrtc=yes`** (ICE / DTLS-SRTP) |
| Client WSS | **SBC only** — browser talks `wss://sbc…:8089/ws`; OpenSIPS speaks **SIP UDP** to the home |

Magrathea **terminates WSS**. The home extension is **not** “listen on instance TCP 8089.” Instance **public 8089 can stay closed**.

**Optional lab toggles:** singleton-direct `wss://instance:8089` if the operator is proving pure node WSS (requires instance WSS open + endpoint `transport-wss` path). **Not** the product default once edge is up.

---

## 4. Client / field model

Keep **two separate fields** (desks already separate domain vs next hop):

| Field | Source / default |
|-------|------------------|
| **WSS URL** | Fleet edge: `wss://sbc.pbx3.com:8089/ws` when instance is fleet (Egress / fleet posture). Editable override. |
| **SIP domain** | Tenant FQDN from cluster (e.g. `dhbm8x.pbx3.com`). |
| **SIP user** | Extension **shortuid** (not dialable pkey). Show dialable as label only. |
| **Password** | From create / admin reveal / operator enter-for-session. No long-term softphone vault. |
| **Dial target** | Free text (e.g. desk shortuid / dialable / echo). |

Library: **JsSIP** (locked 2026-08-03 — operator + agent). Lab-proven path; thin dialler + easy `session.connection` → **getStats**. Do not introduce SIP.js unless JsSIP fails Magrathea edge.

---

## 5. UX

### 5.1 Dialler (dead simple)

**Placement (Phase 1 — retired 2026-08-26):** ~~Extensions detail → Line test~~ → **Tools → Line quality test** (§10). Deep-link from any extension detail still pre-fills dial target.

Actions only: **Register · Dial · Answer · Hangup** + short status log while active.  
Optional during connected: a compact “sampling…” indicator only — not charts-in-flight.

Pick **existing WebRTC** extension **or** one-click create “line test” WebRTC on tenant (optional implement slice). New creates still need **Commit** before REGISTER can succeed.

### 5.2 Post-call report (the demo / diagnostic)

After clean or failed hangup to **BYE** (or terminal failure before answer), present a **Call report**:

| Section | Content |
|---------|---------|
| **Verdict** | Registered · connected · clean BYE — or which step failed |
| **Timeline** | REGISTER 401→200 · INVITE → 18x → 200 · answer · BYE; durations / deltas |
| **Media quality** | From sampled **getStats**: packet loss %, jitter, RTT, bitrate (in/out), codec if available |
| **Path context** | WSS host · SIP domain · SIP user · dial target · ICE candidate types (host/srflx/relay) when available |

**Presentation:** a few clear visuals (gauges and/or short sparklines from the sample series) — tool-looking, not marketing widgets.  
**Optional:** “Copy summary” / export JSON for tickets. No call-history product store for v1 (session-local report is enough).

---

## 6. Stats source (v1)

| Source | Use |
|--------|-----|
| SIP UA events | Register / invite / ring / answer / hangup timing and outcomes |
| `RTCPeerConnection.getStats()` | Loss, jitter, RTT, bytes/packets, candidate types, codec |

**Not v1:** Gatekeeper aggregation, Homer/HEP in this UI, AMI channel stats, cross-instance fleet dashboards of line tests.

---

## 7. Explicit non-goals

- Softphone product chrome (**transfer**, multi-call, contacts/directory, presence/BLF, voicemail UI, call history product)  
- **Hold** as general desk-phone feature — **except** Phase 2 **diagnostic hold** (§10) to exercise MOH for jitter testing (shipped)  
- Fleet console owning SIP credentials catalog-wide  
- Gatekeeper or directory in the call path  
- Innovate/Browser-Phone productization  
- Requiring instance **TCP 8089** for the Magrathea prove-path  
- Mid-call wall of live charts (sample quietly; report after BYE)

---

## 8. Success when shipped

Operator, logged into instance SPA as admin:

1. Opens line test on a WebRTC extension (or creates one).  
2. Defaults WSS = edge, domain = tenant.  
3. Register **401→200** via Magrathea → home.  
4. Dial desk / peer on same tenant: ring + bidirectional audio.  
5. Runs the call to hangup / **BYE**.  
6. Sees a **Call report** with path verdict + media quality (loss, jitter, RTT / bitrate as available) that is demo- and ticket-useful.  

Instance 8089 may remain closed for that path.

---

## 9. Implement when scheduled

Cross-repo: mostly **pbx3spa** (UA + sampling + report UI); **pbx3api** only if password-reveal or create helper needs a thin endpoint. No OpenSIPS change for the thin SPA itself.

Suggested build order: shell dialler → REGISTER/call path → getStats samples → post-call report visuals. **Library:** JsSIP.  
**Shipped (lab):** 2026-08-03 — register/dial/answer/report OK.  
**Pre-release residual (TODO):** SPA main-chunk size / lazy-load JsSIP — see **`pbx3/workingdocs/TODO.md`** “Pre-first-release — SPA production bundle diet”.

---

## 10. Phase 2 — Support line test panel (**shipped 2026-08-26**)

**Motivation (2026-08-25):** When a customer reports bad audio, ops wants **jitter / loss / RTT** on a **real call to that extension** — not only on WebRTC extension detail. Phase 1 already supports **WebRTC → dial desk ext → post-call report**; Phase 2 improves **discovery and workflow**.

### Shape (shipped)

| Piece | Implementation |
|-------|----------------|
| **SPA surface** | **Tools → Line quality test** (`/tools/line-test`) |
| **Caller identity** | One **hidden WebRTC** per tenant — `description = system:line-test`; dialable prefer **`981` / `9801` / `98001`** by `ext_len` (not all-9s — **999** is emergency in UK/IE/etc.); walk down if taken |
| **Dial target** | Operator picks **any extension** or types digits; deep-link `?target=` (+ optional `?cluster=`) from any extension detail |
| **Stats** | Reuse Phase 1 engine: JsSIP + `getStats()` post-call report (copy summary for tickets) |
| **In-call hold** | **Hold** / **Resume** while connected — Asterisk **MOH**; sampling continues; report lists hold intervals |
| **Visibility** | Excluded from Extensions index / live / PDF by default (`include_system=1` to include) |

### In-call hold (locked)

| # | Lock |
|---|------|
| **H1** | **Hold** and **Resume** buttons enabled only in **connected** state (after answer, before BYE). |
| **H2** | **Purpose:** put callee on hold → Asterisk **MOH** to far end → continue quiet **`getStats()` sampling** during hold/resume cycles for ticket evidence. |
| **H3** | **Not** transfer, not multi-call, not park — single session hold/unhold only (JsSIP `hold()` / `unhold()`). |
| **H4** | Post-call report notes **hold intervals** (timestamps) alongside media samples. |

### Locks (decided at implement 2026-08-26)

| # | Decision |
|---|----------|
| **L1** | **Ensure on demand** — `POST extensions/line-test/ensure` when opening the Tools panel (not auto on tenant create). |
| **L2** | Hide via **`description = system:line-test`** (+ API list filter). No new schema column. |
| **L3** | Password: ensure response includes `passwd` for admins; session-only in SPA. |
| **L4** | Stats scope unchanged: **browser WebRTC leg** + bridged call. |

### Supersedes Phase 1 UX (locked — done)

| # | Lock |
|---|------|
| **S1** | Phase 2 is the **single ops line-quality tool**. |
| **S2** | Customers do **not** need a visible WebRTC phone for support testing. |
| **S3** | Deep-link from **any extension detail** → Tools panel with dial target pre-filled. |
| **S4** | Phase 1 per-WebRTC **Line test** button **retired** (replaced by **Line quality test** deep-link). |

### Non-goals (unchanged)

Softphone product, customer self-service quality portal, fleet-wide aggregate dashboards.

### API

- `POST /api/extensions/line-test/ensure` `{ cluster }` → resolve or create WebRTC; `201` when created (Commit required); passwd visible.
- Extensions `GET` omits system rows unless `?include_system=1`.
