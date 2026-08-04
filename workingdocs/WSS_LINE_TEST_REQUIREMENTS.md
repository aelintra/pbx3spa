# SPA WSS line test — requirements (locked direction)

**Status:** **lab green 2026-08-03** (operator: register / dial / report OK) on branch **`spa-line-test`** → merge to **`main`**.  
**Job:** In-admin **diagnostic tool** — a dead-simple dialler over **SIP-over-WSS** that proves the extension path **and**, after **BYE**, leaves a readable **call quality report** (loss, jitter, RTT, path/timing). Demo-able evidence, not a plaything.  
**Not:** desk softphone, softphone chrome (hold / transfer / BLF / multi-line / directory / call history / presence), Browser-Phone fork, native app, team softphone SPA replacement.

**Related:** **`FEATURE_PLANS_INDEX.md`** · **`pbx3/workingdocs/WEBRTC_WSS_LAB.md`** § Fleet edge W1 · **`FLEET_TRUNK_PEERING_DECISION.md`** §6.1 · Magrathea checklist **`pbx3sbc/workingdocs/WEBRTC_W1_MAGRATHEA.md`**.

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

**Placement (locked):** **Extensions detail** → **Line test** button (header actions) when `device=WebRTC` only. Opens a side panel (drawer). No left-nav menu item.

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

- Softphone product chrome (hold, transfer, multi-call, contacts/directory, presence/BLF, voicemail UI, call history product)  
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
