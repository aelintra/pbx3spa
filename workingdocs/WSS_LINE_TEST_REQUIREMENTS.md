# SPA WSS line test — requirements (locked direction)

**Status:** direction **locked 2026-08-03** (operator + agent). **Not implemented.**  
**Job:** In-admin **path prover** — register / dial / answer / hangup over **SIP-over-WSS** to prove the extension path for ops.  
**Not:** desk softphone, presence/BLF, multi-line, call history, Browser-Phone fork, native app, team softphone SPA replacement.

**Related:** **`FEATURE_PLANS_INDEX.md`** · **`pbx3/workingdocs/WEBRTC_WSS_LAB.md`** § Fleet edge W1 · **`FLEET_TRUNK_PEERING_DECISION.md`** §6.1 · Magrathea checklist **`pbx3sbc/workingdocs/WEBRTC_W1_MAGRATHEA.md`**.

---

## 1. Where it lives

| Layer | Role |
|-------|------|
| **pbx3spa (browser)** | UI + **SIP.js or JsSIP** UA. SIP signaling and media negotiation run **only in the browser**. |
| **Instance API (pbx3api)** | Auth, list/create **WebRTC** extensions, password reveal / set under admin capacity. |
| **Fleet / Gatekeeper** | **Not** v1 host of the line test. Optional later: pick tenant / deep-link defaults. **Never** mid-call; never SIP/media plane. |
| **SBC + home Asterisk** | Real call path (unchanged product stack). |

v1 surface: **Instance SPA mode** (already on a tenant home).  
Optional later: Fleet → open instance / tenant line test with edge defaults — not a second softphone product.

---

## 2. Extension definition — need one, not “WSS transport”

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

## 3. Client / field model

Keep **two separate fields** (desks already separate domain vs next hop):

| Field | Source / default |
|-------|------------------|
| **WSS URL** | Fleet edge: `wss://sbc.pbx3.com:8089/ws` when instance is fleet (Egress / fleet posture). Editable override. |
| **SIP domain** | Tenant FQDN from cluster (e.g. `dhbm8x.pbx3.com`). |
| **SIP user** | Extension **shortuid** (not dialable pkey). Show dialable as label only. |
| **Password** | From create / admin reveal / operator enter-for-session. No long-term softphone vault. |
| **Dial target** | Free text (e.g. desk shortuid / dialable / echo). |

Library: SIP.js or JsSIP (pick at build; one is enough).

---

## 4. UX (thin)

Placement (cheap, pick one at implement):

- **Extensions detail** → **Line test** drawer, or  
- **Tools** → Line test with extension picker (WebRTC only).

Actions only: **Register · Dial · Answer · Hangup** + short status log.  
No hold/transfer/contacts unless free after core path works.

Pick **existing WebRTC** extension **or** one-click create “line test” WebRTC on tenant (optional implement slice).

---

## 5. Explicit non-goals

- Softphone product chrome / multi-call / directories  
- Fleet console owning SIP credentials catalog-wide  
- Gatekeeper or directory in the call path  
- Innovate/Browser-Phone productization  
- Requiring instance **TCP 8089** for the Magrathea prove-path  

---

## 6. Success when shipped

Operator, logged into instance SPA as admin:

1. Opens line test on a WebRTC extension (or creates one).  
2. Defaults WSS = edge, domain = tenant.  
3. Register **401→200** via Magrathea → home.  
4. Dial desk / peer on same tenant: ring + bidirectional audio.  
5. Answer inbound; hangup clean.  

Instance 8089 may remain closed for that path.

---

## 7. Implement when scheduled

Cross-repo: mostly **pbx3spa**; **pbx3api** only if password-reveal or create helper needs a thin endpoint. No OpenSIPS change for the thin SPA itself.
