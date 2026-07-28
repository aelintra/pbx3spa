# Session handoff — where we left off

**AI: read this first.**

**Session end:** When the user says **`session end`**, **`end session`**, or **`update handoff`**, follow **`pbx3/workingdocs/SESSION_END_CHECKLIST.md`** (prepend a new block below; update **`pbx3/workingdocs/TODO.md`** and **`AGENT_HANDOFF.md`** too).

**New session:** Read **`AGENT_HANDOFF.md`** § Next agent session notes → **`TODO.md`** → this file (top **Session end** block only). Wait for user task before coding.

## Session end 2026-07-28 — SBC product tracks A/B/C (planning)

**On `main`:** Docs only — **`pbx3-directory/docs/SBC_PRODUCT_TRACKS.md`** (+ TODO / AGENT_HANDOFF). No SPA code.

**Operator impact:** None. **Posture locked:** Teams = C1 commercial answer only; STIR = continue Twilio; **Track A lab:** SARK (± FreePBX) behind SBC next when operator stands boxes up.

**Dev against golden:** unchanged — `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** **`TODO.md`** + **`SBC_PRODUCT_TRACKS.md`** (tracks **and** capability roadmap: SIP TLS, media mode, registration-edge, …). Dial-alias still call-path #1.

**Resume:** Dial-alias when scheduled; SARK/FreePBX ↔ SBC lab; Twilio STIR as useful; Teams only on customer C1 ask.

---

## Session end 2026-07-28 — SBC admin polish + SPA Home reboot — historical

**On `main`:** **pbx3sbc-admin** door-knock geo/map, System/Backups/Certificates polish, CDR above-table filters (all-records default; duration row layout) — tip **`919938c`**. **pbx3spa** Home Reboot right-aligned — **`368196b`**. Live on VIP + golden SPA as deployed.

**Operator impact:** SBC **System → Backups** / Certificates details; Door-knock View shows location+map; CDR date fields blank = all. SPA Home reboot button position only.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped). SBC admin `https://sbc.pbx3.com/admin`.

**Docs / TODO:** superseded by planning block above (same day).

**Resume:** see block above.

---

## Session end 2026-07-27 — SIPp EIP move + control duplex park — historical

**On `main`:** SIPp carrier EIP **`98.82.58.59`** (Peer **99**); pack **11/11 green**. Control-plane duplex/HA parked pre-live. Dial-alias §8 already locked earlier. SPA product unchanged; handoff only.

**Operator impact:** Peer **99** → new EIP (Filament Peers page 2 / SIPp lab). SIPp instance may be stopped — keep EIP. Pack SSH host is **`98.82.58.59`** (not `98.93.98.162`).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-27 — dial-alias §8 locked + backlog parks — historical

**On `main`:** Dial-alias requirements **fully locked** (docs). Litestream dropped; AMI wallboard = side gig; 2nd SIPp phone host when alias lab starts; fleet `/up`≠Asterisk parked pre-live. SPA product unchanged; handoff only.

**Operator impact:** superseded — SIPp EIP now **`98.82.58.59`** (see block above).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-27 — L1 pack 11/11 (queue-cancel-vm + out-busy) — historical

**On `main`:** L1 pack **11/11** green — added `in-queue-cancel-vm` + `out-busy-or-reject` (`uas-486`). Holiday deferred for day-parts. SPA product unchanged; handoff only.

**Operator impact:** Unchanged Peer **99** = EIP only. Pack: `ssh -i …/pbx3test.pem ubuntu@98.93.98.162 'cd ~/call-tests && ./run-pack.sh'`.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-27 — L1 grow outbound + OutVoip fix — historical

**On `main`:** L1 pack 9/9 (`feat-master-closed`, `in-cfim-external`, `out-egress-ok` + prior six). Catcher **SIPP_MAIN**. **pbx3cagi** OutVoip `desc`→`description`. SPA product unchanged; handoff only.

**Operator impact:** Outbound Egress Dial works again after OutVoip fix. Peer gwid **99** = EIP only.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-27 — L1 +302/multi-tenant + dial-alias reqs — historical

**On `main`:** L1 pack grew (`phone-302-local`, `in-multi-tenant-a-b`) — full pack green on SIPp EC2. **`TENANT_SHORT_DIAL_REQUIREMENTS.md`** drafted. SPA product code unchanged; handoff only this close.

**Operator impact:** Unchanged — Twilio DID → catcher 2000; Peer gwid **99** = EIP `98.93.98.162` only.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-27 — L1 pack + SIPp EC2 — historical

**On `main`:** Automated L1 pack on catcher tenant + off-box SIPp host. Pack green: open / CFIM / closed / queue. SPA code unchanged this slice.

**Operator impact:** Twilio DID `+15139279738` → catcher 2000 (not dhbm8x 1000). SBC Peer gwid **99** = lab EIP `98.93.98.162` only — **do not** Peer office IP (breaks phones). bzy + Magrathea companion stopped (cost). After PBX3 deploy: `ssh -i …/pbx3test.pem ubuntu@98.93.98.162 'cd ~/call-tests && ./run-pack.sh'`.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` (bzy stopped).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-27 — SIPp in-open-ext green — historical

**On `main`:** Call-test pack Step 1 done. **`in-open-ext`** Successful call (VIP DID → 1000, Snom auto-answer, clean BYE). Inventory + attendance docs. Inbound Route `+E.164` pkey fixed (api/spa; golden hot-file). SBC-admin gwid allocate fixed (deploy VIP later).

**Operator impact:** Edit Inbound Route accepts `+` DIDs after api deploy. Temp SBC Peer gwid **99** for Mac SIPp — superseded by EC2 Peer. Restore DID openroute to ring group if still on 1000. Lab Snom may still be always-auto-answer.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded by L1 pack block above.

**Resume:** see block above.

---

## Session end 2026-07-26 — close: call test is next — historical

**On `main`:** Docs session closed. Strategy + time-based requirements already pushed. **Next work = SIPp call-test Step 1** (`in-open-ext` on golden). SPA unchanged.

**Operator impact:** None this slice. System treated as largely built; proper pathway/load testing before more edge features. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`TODO.md`** — call/SIP pack **#1 (locked next)** · **`CALL_TEST_STRATEGY.md`**.

**Resume:** SIPp + first green scenario. Do not start CAGI Phase 4 or day-parts implement first.

---

## Session end 2026-07-26 — call-test strategy (SIPp) — historical

**On `main`:** Docs only. **`CALL_TEST_STRATEGY.md`** (L0–L3; SIPp pathways/load). TODO lists call-test as suggested-next #1. SPA code unchanged.

**Operator impact:** None yet. Future: lab SIPp recipes against golden DIDs. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — call/SIP test open; time-based routing still open (§8); Phase 4 parked.

**Resume:** SIPp Step 1 (`in-open-ext`), or product crumbs / time-based §8. Do not start CAGI Phase 4 first.

---

## Session end 2026-07-26 — time-based routing requirements — historical

**On `main`:** Docs only. **`TIME_BASED_ROUTING_REQUIREMENTS.md`** (day-parts + route profiles; cron kept; FreePBX deferred). CAGI Phase 4 parked. SPA code unchanged.

**Operator impact:** None yet. Inbound still open/close. Future: DID → route profile; Day timers gain modes. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — Phase 4 parked; time-based routing open (lock §8 before code). Spec **`TIME_BASED_ROUTING_REQUIREMENTS.md`**.

**Resume:** Lock time-based routing §8, or product crumbs (D WSS / Twilio / drain / velocity V3). Do not start CAGI Phase 4 first.

---

## Session end 2026-07-26 — cagi thread-s + 3.2 AGI wrap (lab OK) — historical

**On `main` (pbx3cagi `9e4bfa9`):** Session pointer threaded into helpers (PR #1); thin `agi_wrap` over AGITool (PR #2). Golden + bzy live same binary. SPA unchanged.

**Operator impact:** None for SPA panels. AGI binary is wrap tip — calls + local CF / diverted validated on golden; bzy rolled to match. Velocity still notify-on / ACT-off. **Emergency roll back point** §5.5 unchanged (pre E/G pair).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — thread-s + 3.2 checked; Phase 4 optional next.

**Resume:** Phase 4 domain splits, or product backlog (D WSS / Twilio / drain / velocity V3).

---

## Session end 2026-07-26 — emergency rollback pin + bzy cagi parity — historical

**On `main`:** Docs only this slice. **Emergency roll back point** (pre E/G dial-locus) in **`AST_CONFIG_GENERATOR_SUBPROJECT.md` §5.5**. **bzy54n** AGI now same as golden **`c4b06bd`**. SPA unchanged.

**Operator impact:** Both lab nodes on matching cagi tip — run live tests as-is. Velocity still notify-on / ACT-off. Catastrophic dial-locus recovery = paired GenAst+CAGI tips in §5.5 (not CAGI alone).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — bzy lag cleared; operator tests first.

**Resume:** Await test results; then product backlog or optional cagi polish.

---

## Session end 2026-07-25 — pbx3cagi Phase 1.3–3.1 (golden call QA) — historical

**On `main` (pbx3cagi `c4b06bd`):** struct refactor through session pointer + macros gone; golden AGI binary live. Simple extension calls + CFIM OK. SPA unchanged this slice.

**Operator impact:** None for SPA panels. Golden AGI is new build — bzy may still be older cagi until rolled. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — cagi 1.3–3.1 checked; follow-on thread-`s` / Phase 4 optional.

**Resume:** Roll bzy cagi; or product (D WSS / Twilio / drain / velocity V3); or cagi helper threading — **`REFACTOR_PLAN.md`**.

---

## Session end 2026-07-25 — graph MCP + PHP class `.php` layout — historical

**On `genast-hermit` (pbx3):** code-review-graph MCP fixed + graphs built; hermit review no merge-blockers. Major PHP classes now `*.php` with extensionless **symlinks** for runtime. TODO open for full `.php` requires (drop symlinks). G+H still tip; not merged to main.

**Operator impact:** Hot-patch **`GenClass.php` / `HelperClass.php`** (not the bare names — those are symlinks). SPA unchanged this slice. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded — hermit merged; class `.php` requires done earlier same day.

**Resume:** see block above.

---

## Session end 2026-07-25 — GenAst hermit G+H (LepDial + trunk/queue/park overlay) — historical

**On `genast-hermit` (pbx3 / pbx3api / pbx3cagi) + SPA `main`:** G LepDial short-run + PostDial (golden call lab OK); H trunk/queue/park C2 overlays (DB + SPA admin; park on Tenant). Not merged to main.

**Operator impact:** Extension dials: AGI PreDial, dialplan Dial, PostDial on fail. Admin **PJSIP overlay** on Trunks; **Queue overlay** on Queues; **Parking overlay** on Tenant (no Parks panel). Commit picks up tmpl rolls without deleting freeze files (legacy freezes removed on golden). Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded by graph/class layout block above.

**Resume:** see block above.

---

## Session end 2026-07-25 — GenAst hermit A–F (C2–E lab; F hygiene) — historical

**On `genast-hermit` (pbx3 / pbx3api / pbx3cagi) + SPA `main`:** C2 DB overlay + SPA field; D WebRTC overlay (WSS lab deferred); E `Q*` short-run (golden Q1060 OK); F SBC host env + `$clstkey` parking fix. Not merged to main.

**Operator impact:** Extension edit (admin) has **PJSIP overlay**; Commit after F for parkinglot/`outbound_proxy`. Queue agents use AGI decide + dialplan Dial. Deploy **new cagi before** GenAst Commit when rolling E. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded by G+H block above.

**Resume:** see block above.

---

## Session end 2026-07-25 — GenAst hermit-crab A–C lab OK — historical

**On `genast-hermit` (pbx3 + pbx3api, pushed; not merged to main):** Phone tmpl + thin overlay with key merge; `$row` fix; characterize scripts; hot on golden/bzy. **C2 locked:** DB `pjsip_overlay` on extension + SPA extension-edit field (visibility). No SPA code this session.

**Operator impact:** Commit uses tmpl (no staged `*_phone.conf` chore). One-phone overrides via `endpoints/{suid}_phone.overlay.conf` until C2. Lab: `fkdd5d` qualify=60. Velocity still notify-on / ACT-off.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded by A–F block above.

**Resume:** see block above.

---

## Session end 2026-07-24 — GenAst challenger review parked — historical

**On `main` (docs):** GenAst challenger findings locked in **`pbx3/workingdocs/AST_CONFIG_GENERATOR_SUBPROJECT.md` §0** — phone tmpl + required hand overlay; dialplan thin / one Dial authority in CAGI; note `$row` shadow bug. Premature G2 code **stashed** on branch `genast-phone-overlay` (not shipped). No SPA code this session.

**Operator impact:** none yet. Commit/phone-tmpl chore unchanged until G2 lands. Velocity still notify-on / ACT-off on golden from earlier today.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded by **2026-07-25** block above.

**Resume:** see block above.

---

## Session end 2026-07-23 — velocity plan + Gatekeeper tenant-home + generator track — historical

**On `main` (pushed):** no SPA code this evening. **pbx3** docs: velocity requirements fleshed (V1–V5, `active=NO` act, fixture-first); Ast config generator + cagi one TODO track. **Ops:** control Gatekeeper redeployed — tenant-home rebuild live (`POST …/rebuild` OK, 5 tenants).

**Operator impact:** after tenant register/move, `catalog/tenant-home.json` should refresh from Gatekeeper without Mac script. Customer **Sign in to tenant** unchanged. Velocity / generator not operator-facing yet.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`. Catalog `tenant-home.json` on S3.

**Docs / TODO:** tips **pbx3** **`cbafc85`** / **pbx3spa** **`eb1d1a5`**; next velocity V1 or generator G1 / phone staging; Twilio when ready.

**Resume:** velocity V1 (CDR fixture) or Ast config generator staging; SSO deferred.

---

## Session end 2026-07-23 — login-homing B′ — historical

**On `main` (pushed):** SPA three-door login with **Sign in to tenant** first; resolve via `catalog/tenant-home.json` + instance-index → node Sanctum. Backend rollup writer in **pbx3** Gatekeeper/tools. Lab QA: `vqcwd4` / joe → bzy tenant UI OK.

**Operator impact:** customers type tenant shortuid/FQDN (not email) on the first door; MSP/Fleet doors unchanged. Gatekeeper on control now redeployed (same evening) for auto-rebuild.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`. Catalog sibling `tenant-home.json` (dev-catalog proxy or S3).

**Docs / TODO:** superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-23 — fleet multi-tenant phone dial / SBC AoR — historical

**On `main`:** no SPA code that slice. Backend/edge: multi-tenant phone rings via tenant AoR + SBC hop (fleet-gated). Golden + bzy live; ring groups OK. Source wipe in move job already on `main` from earlier same day.

**Operator impact:** phones behind SBC on multi-tenant nodes should dial correctly; after phone-tmpl changes, refresh staged `endpoints/*_phone.conf` then Commit.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · bzy `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** superseded by B′ block above.

**Resume:** see block above.

---

## Session end 2026-07-22 — instance user privileges P1–P4 — historical

**On `main`:** privileges P1–P4 + portable users; sandycroft→bzy. **Superseded** by 2026-07-23 blocks.

**Resume:** see block above.

---

## Session end 2026-07-22 — Twilio dialect lab — historical

**On `main`:** superseded — see 2026-07-23 block above. Live Twilio Peers may still be on Magrathea.

**Resume:** see block above.

---

## Session end 2026-07-22 — PSTN number dialects — historical

**On `main`:** superseded — see Twilio lab block above. Tips were pbx3 **`0e764c1`**/`f36db55`, sbc **`3404608`**, sbc-admin **`c623d0c`**, docs **`12f32e3`**, spa **`07c0969`**.

**Resume:** see block above.

---

## Session end 2026-07-22 — Egress qualify + ops notify + Fleet Instances badge — historical

**On `main`:** superseded. Tips were pbx3 **`d377631`**, spa **`8b9fc83`**, api **`5426f58`**, sbc **`b6135b2`**, sbc-admin **`69e1893`**.

**Resume:** see block above.

---

## Session end 2026-07-21 — Filament Backup + Fleet warm sync — historical

**On `main`:** superseded — see 2026-07-22 blocks above. Tips were pbx3 **`129ef40`**, spa **`d021f60`**, sbc **`9373d30`**, sbc-admin **`7dda7fb`**, docs **`b9fb77f`**.

**Resume:** see block above.

---

## Session end 2026-07-21 — Magrathea live HA + Edge HA panel — historical

**On `main`:** superseded — see Filament Backup + Fleet warm sync block above.

**Resume:** see block above.

---

## Session end 2026-07-21 — HA FO greenfield + SBC Certificates/LE — historical

**On `main`:** superseded — see Magrathea live HA block above.

**Resume:** see block above.

---

## Session end 2026-07-20 — SBC HA requirements + portability — historical

**On `main`:** superseded — see block above. Tips were pbx3 **`a5e19d4`**, sbc **`994eb68`**, spa **`a3dc665`**, docs **`7873efe`**.

**Resume:** see block above.

---

## Session end 2026-07-20 — SBC backup/restore v1 + scratch drill — historical

**On `main`:** superseded — see block above. Tips were pbx3 **`9cc0d11`**, sbc **`0a326d0`**, docs **`7873efe`**.

**Resume:** see block above.

---

## Session end 2026-07-20 — SBC data aging complete (WS0–WS4) — historical

**On `main`:** superseded — see block above. Tips were sbc-admin **`82641ad`**, pbx3 **`5471d9c`**, docs **`553c8e7`**.

**Resume:** see block above.

---

## Session end 2026-07-20 — SPA/SBC brand mark + Fail2ban log + SBC aging review — historical

**On `main`:** superseded — see blocks above. Tips were spa **`858c084`**, sbc-admin **`0210d10`**, pbx3 **`b511d59`**.

**Resume:** see block above.

---

## Session end 2026-07-19 — auto-logout (SPA + SBC) + downstream peer REGISTER reqs — historical

**On `main`:** superseded — see block above. Tips were SPA **`1868242`**, SBC admin **`2e56ae3`**, pbx3 **`af70342`**.

**Resume:** see block above.

---

## Session end 2026-07-18 — SBC admin SPA kinship polish — historical

**On `main`:** superseded — see block above. Tips were **pbx3sbc-admin** **`463431b`**, **pbx3spa** **`0f9fd65`**.

**Resume:** see block above.

---

## Session end 2026-07-18 — Instances polish + SPA panel polish — historical

**On `main` / `changes`:** superseded — SPA **`changes`** later merged to **`7dda918`**; see block above.

**Resume:** see block above.

---

## Session end 2026-07-17 — log retention Phases 5–6 — historical

**Merged to `main`:** superseded — tips were **pbx3api** **`6c28486`**, **pbx3spa** **`a9ce18c`**, **pbx3** **`7c9f8d4`**.

**Resume:** see block above.

---

## Session end 2026-07-17 — log retention Phases 1–4 (`logs`) — historical

**On `logs` then `main`:** superseded by Phases 5–6 block above.

**Resume:** see block above.

---

## Session end 2026-07-16 — REGISTER-loop lab + Asterisk F2B off — historical

**On `main`:** superseded — tips were **pbx3** **`59b5dc5`**, **pbx3api** **`16fba66`**, **pbx3spa** **`305faec`**.

**Resume:** see block above.

---

## Session end 2026-07-16 — ops notify live (probe + REGISTER loops) — historical

**On `main`:** superseded — tips were SPA **`aa8b22a`**, **pbx3** **`8622fd8`**, **pbx3api** **`4b2aa99`**.

**Resume:** see block above.

---

## Session end 2026-07-16 — What is PBX3 + ops notify requirements — historical

**On `main`:** superseded — tips were SPA **`cf64ea7`**, **pbx3** **`0aac37b`**, **pbx3-docs** **`e76c451`**.

**Resume:** see block above.

---

## Session end 2026-07-15 — pbx3-docs MkDocs + Pages (lab guide) — historical

**On `main`:** superseded — tips were SPA **`d4d3e71`**, **pbx3** **`1d8316a`**, **pbx3-docs** **`2a37a00`**.

**Resume:** see block above.

---

## Session end 2026-07-15 — S10.8 login chooser + fleet shell gate — historical

**On `main`:** superseded — docs session above. Tips were **pbx3spa** **`54cced4`** / **`59225b9`**; **pbx3** **`6f4facd`**.

**Resume:** see block above.

---

## Session end 2026-07-15 — S10.5 DID ownership + SBC project (residue paused) — historical

**On `s105`:** superseded — residue shipped later same day. See block above.

**Resume:** see block above.

---

## Session end 2026-07-14 — S10.4 catalog ↔ SBC reconcile + setid guard — historical

**On `main`:** **pbx3** **`96e432e`** (reconcile + project + `SbcSetidGuard`). **pbx3sbc-admin** **`2d232f8`** (`/fleet/domains`, `dispatcher-sets`). **pbx3spa** **`15c5090`** (Fleet Reconcile; Instances Link setid from live sets; Apply button only when mismatches). Live on control + SBC.

**Day:** Catalog is HoR; Apply catalog→SBC is projection only (not undo). Invented setids rejected. Operator copy on Reconcile + Instances.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · gatekeeper **`https://control.pbx3.com`** · SBC **`https://sbc.pbx3.com/admin`** · Fleet Reconcile / Instances against live gatekeeper (`npm run dev` on spa `main`)

**Docs / TODO:** tip **S10.5** DID/edge; S10.4 [x].

**Resume:** see block above.

---

## Session end 2026-07-14 — S10.1–S10.3 fleet abilities + Instances + job control — historical

**On `main`:** **pbx3** **`4498a4c`**, **pbx3spa** **`18f957d`**. Superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-14 — S7 recordings S3 offload + Storage UI + S7.10 sweeper — historical

**On `main`:** **pbx3** **`ed484f3`**, **pbx3api** **`6f46712`**, **pbx3spa** **`6e23fa3`**. Superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-14 — S10, design rules 10–14, S7 PCI-shaped — historical

**On `main`:** docs/plan tip before evening implement. Superseded by block above.

**Resume:** see block above.

---

## Session end 2026-07-14 — LE, control, fleet auth, Pack A, identity stance — historical

**On `main`:** Fleet auth + Pack A + SBC LE morning arc. Superseded by pm block above.

**Resume:** see block above.

---

## Session end 2026-07-13 — Peers carrier UX + SBC sidebar — historical

**On `main`:** **pbx3sbc-admin** **`374afb0`** / **`e78d13a`** (Peers grouped by `carrier=`/`role=` attrs; Used-by = route counts; sidebar Peering→Routing→Fail2Ban→Logs). **pbx3sbc** **`5d90d84`**. **pbx3spa** Fleet mode already on **`main`** (**`ba31dd4`**); no SPA code this session.

**Day:** Logical carrier Peers layout live on SBC; clarified Number routes vs DID aliases (aliases not for fleet delivery). TODO tip: **LE on SBC + control EC2**, then Fleet auth.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · **bzy54n:** `https://bzy54n.pbx3.com:44300/api` · SBC **`http://sbc.pbx3.com/admin`** · gatekeeper local `http://127.0.0.1:8090`

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — LE SBC/control; prefix-overlap; Fail2ban inbound whitelist still open.

**Resume:** LE for SBC / control EC2 standup, or Fleet auth — not Peers layout polish unless copy tweaks from use.

---

## Session WIP 2026-07-13 — Fleet mode UX (`fleetadmin`) — historical (merged)

**Branch:** **`fleetadmin`** merged → **`main`**; branch deleted. See Fleet mode TODO [x] and earlier session notes. Superseded by Peers UX session end above.

---

## Session end 2026-07-11 — S9 snapshots + peering Phase 5 (stop here)

**On `main`:** **pbx3spa** **`103ab34`** (`/snapshots`), **pbx3api** **`d8c560c`** (snap on Commit + FIFO; golden), **pbx3sbc** **`05ea925`** / **pbx3sbc-admin** **`2df6a60`** (alias_db + DID aliases; Phase 5 call OK). **pbx3** docs tip **`3705b8b`**.

**Day:** Snapshots S9.5–S9.7 complete. Peering Phase 5 done; Phase 2 blocked on second SIP provider (user returning when acquired).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · **bzy54n:** `https://bzy54n.pbx3.com:44300/api` · gatekeeper `http://127.0.0.1:8090` via `/fleet-gk` · SBC `http://sbc.pbx3.com/admin` · **Snapshots** at `/snapshots`

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — Phase 2 when second carrier, or Fleet mode UX.

**Resume:** Phase 2 outbound failover (needs 2nd ITSP), or Fleet mode shell swap.

---

## Session end 2026-07-11 — Fleet UI home + SBC stylesync (stop here) — historical

**On `main`:** stylesync / Fleet UI direction. Superseded by **S9 + Phase 5** block above.

**Resume:** see block above.

---

## Session end 2026-07-10 — S8.10 day complete (stop here) — historical

**On `main`:** **pbx3spa** **`089477b`**, **pbx3api** **`0fb0019`** on **08jzwn**/**bzy54n**, **pbx3sbc-admin** **`6036bcb`**, **pbx3** **`9e00e30`**. Superseded by **2026-07-11** block above.

**Resume:** see block above.

---

## Session end 2026-07-10 — S8.10 merged to main (interim auth) — historical

**On `main`:** merge before node pull. Superseded by **day complete** above.

**Resume:** see block above.

---

## Session end 2026-07-10 — S8.10 live moves + affcot phone POC — historical

**On `movewizard`:** live moves + Snom POC. Superseded by merge to **`main`** above.

**Resume:** see block above.

---

## Session end 2026-07-10 — S8.10 movewizard scaffold (lab move next) — historical

**On `movewizard`:** scaffold + Hosted on. Superseded by live moves + phone POC above.

**Resume:** see block above.

---

## Session end 2026-07-10 — pbx3 0.0.3-25 on golden + bzy54n — historical

**On `main`:** **pbx3** **`1bed066`** (**0.0.3-25** Egress identify packaged). Earlier: **pbx3sbc** **`b914e1c`**, **pbx3sbc-admin** **`138d65d`**.

**Fleet:** **08jzwn** + **bzy54n** on **pbx3 0.0.3-25** (identify no longer hot-patch-only). Peering Phases 3–4 still lab-green (Magrathea DID **`01924918076`** → golden **1000**).

**Ops:** After egress **`genAst.sh`**, **`systemctl restart asterisk`**. SBC admin **`http://sbc.pbx3.com/admin`**.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · **affcot:** `https://bzy54n.pbx3.com:44300/api`

**Docs / TODO:** superseded by movewizard block above.

**Resume:** see **Session end 2026-07-10 — S8.10 movewizard** above.

---

## Session end 2026-07-10 — SBC peering Phases 3–4 lab green (Magrathea DID) — historical

**On `main`:** **pbx3** **`3af4519`** (Egress identify), **pbx3sbc** **`b914e1c`**, **pbx3sbc-admin** **`138d65d`**. Superseded by **0.0.3-25** install same day.

**Lab validated:** Magrathea DID **`01924918076`** → golden **1000**; hangup both ways; Active Calls two legs.

**Resume:** see block above.

---

## Session end 2026-07-09 — Phase A egress + PSTN validated both fleet nodes

**On `fleet-phase-a`:** **pbx3** **`ded9b76`** (egress qualify + rollback/availability docs). **pbx3api**, **pbx3spa**, **pbx3cagi** unchanged on branch. **On `main`:** **pbx3sbc** **`8c702fb`** (peering egress live), **pbx3sbc-admin** **`4282261`**.

**Fleet nodes:** **08jzwn** (golden) + **bzy54n** — register, PSTN outbound via **Egress** → SBC → carrier **validated**. **affcot** Snom ext **1101** on **bzy54n** — SIP auth username **`59507r`**. **2026-07-10:** Linphone softphone on **bzy54n** — register OK; makes/receives calls across the SBC.

**SBC:** Peering Phase 0–2 live; **bzy54n** dispatcher **setid 3** + tenant domains. Admin **`http://sbc.pbx3.com/admin`**.

**Ops note:** After egress template / **`genAst.sh`**, **`systemctl restart asterisk`** on the node — **`pjsip reload`** alone caused **503** on bzy54n outbound until restart.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` · **affcot:** `https://bzy54n.pbx3.com:44300/api`

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — superseded 2026-07-10 (peering 3–4 done).

**Resume:** see **Session end 2026-07-10** block above.

---

## Session end 2026-07-09 — Phase A live on fleet nodes; SBC soak; peering next

**On `fleet-phase-a`:** **pbx3** **`67d2376`** (egress PJSIP template, pushed). **pbx3api**, **pbx3spa**, **pbx3cagi** unchanged on branch. **On `main`:** **pbx3sbc** **`1d9433d`**, **pbx3sbc-admin** **`4282261`** (profile/password; pushed).

**Fleet nodes:** **08jzwn** + **bzy54n** — Phase A deployed (egress seed, fleet `.env`, **pbx3cagi 1.0.0-4**, preflight green). Egress PJSIP fix hot-patched. Extension calling via SBC working.

**SBC:** Reboot soak OK. Admin panel login + profile password change working. **Peering not live** — test carrier available for Phase 0–2 lab.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — SBC peering Phase 0–2 is #1.

**Resume:** seed **`dr_*`** on SBC + test carrier outbound; merge **`fleet-phase-a`** when stable.

---

## Session end 2026-07-09 — fleet-egress merged to main; Phase A + fleet shell scaffold

**Merged to `main`:** **pbx3** **`9a25470`**, **pbx3api** **`2e25076`**, **pbx3spa** **`308af87`**, **pbx3cagi** **`9fe15e2`**, **pbx3sbc** **`d84c192`**. **`fleet-egress`** branch work integrated and pushed.

**SPA:** Fleet nav link, **`FleetTenantsView`** stub, route create/detail hides trunk picker when fleet posture active (`useFleetPosture`). Run locally from **`main`** against golden API.

**Nodes pulled:** **08jzwn** + **bzy54n** **`/opt/pbx3api`** at **`2e25076`**. Preflight fails only on missing **Egress** trunk (seed not run). **pbx3cagi** deb not rebuilt on nodes yet.

**SBC:** **`/home/ubuntu/pbx3sbc`** at **`d84c192`**; OpenSIPS not reloaded this session.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — deploy Phase A on golden is #1 next.

**Resume:** egress seed + fleet `.env` + **pbx3cagi** deb on golden; then SBC template reload + dispatcher attrs backfill.

---

## Session end 2026-07-08 — pbx3sbc inter-extension calling on sbc.pbx3.com

**On `main`:** **pbx3sbc** **`8174dfe`** (NAT INVITE routing, Yealink auth relay, Snom `line=` preservation). **No SPA/API changes.**

**SBC:** **`sbc.pbx3.com`** — tenant **`dhbm8x.pbx3.com`** → Golden **`08jzwn`**. Phones: Snom 1000 + Yealinks 1001/1002; all extension directions working after fixes. Live OpenSIPS config hot-patched on server.

**Direction:** SBC standup **in progress** — extension path proven; next soak + **carrier peering** (`PEERING-PLAN.md`), then Phase A Egress.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — SBC extension calling done; peering + multi-tenant dispatcher lookup open.

**Resume:** SBC peering/PSTN path; more tenants on **`sbc.pbx3.com`**.

---

## Session end 2026-07-07 — §2.6.1 node IAM tighten; S7 deferred; S8.10 next

**On `main`:** **pbx3** **`a4628fe`** (node S3 IAM tighten — drop `tenants/*`; docs; recordings bucket naming note), **pbx3api** **`34d8bd8`** (fleet-preflight deny probe). **No SPA changes.**

**Fleet:** IAM applied live on **08jzwn** + **bzy54n** (backup PUT OK, `tenants/*` denied); `pbx3:fleet-preflight` all green. **bzy54n** now on **pbx3 0.0.3-23** (R1.5 parity smoke-tested).

**Direction:** **S7 recordings S3 deferred** (local R1.5 tier is enough; needs B′ gatekeeper). **S8.10 panel tenant moves = priority** — next is **SBC standup** → **Phase A** Egress → **B′** control plane + gatekeeper → **C** move wizard. Gatekeeper runs in the control-plane service on its own host, not on a node/SBC.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — §2.6.1 done; S7 deferred; S8.10 #1.

**Resume:** SBC standup (`pbx3sbc` image) → Phase A Egress.

---

## Session end 2026-07-07 — R1.5 recordings local archive shipped

**On `main`:** **pbx3api** **`27ff302`…`f5237de`**; **pbx3** **`0.0.3-23`** (`efdc78a` deb on golden). No SPA changes.

**Shipped:** Spool → local archive offload (`/opt/pbx3/media/recordings/{tenant}/{yyyy}/{mm}/{dd}/`); SQLite `recordings` index; retention + `recused` tally; cron on **08jzwn** + **bzy54n**. Recordings panel unchanged — list/play from archive + DB. Scheduled **daily backups** cron installed (was SPA-manual only).

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — R1.5 complete; **S7** next.

**Resume:** **S7** S3 recordings offload; optional **§2.6.1** IAM; **bzy54n** **0.0.3-23** deb upgrade.

---

## Session end 2026-07-07 — R1 call recordings shipped

**Merged to `main`:** **pbx3api** **`4f52853`**, **pbx3spa** **`ea0fefc`** (`r1` → `main`). **pbx3** docs: **`RECORDINGS_STORAGE_DESIGN.md`** on **`main`**.

**Shipped:** Recordings panel (ACD nav) — list/filter by tenant, date, search; inline play + download. API indexes **`/var/spool/asterisk/monitor`**. Golden smoke: **duns** tenant on **08jzwn**.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login; hard-refresh SPA after pull if nav missing.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — R1 complete; **R1.5** next.

**Resume:** **R1.5** local archive + SQLite `recordings` index; design in **`pbx3/pbx3-directory/docs/RECORDINGS_STORAGE_DESIGN.md`**.

---

## Session end 2026-07-07 — S8.10 fleet mobility design docs

**On `main`.** Docs only in **`pbx3-directory/`** — no SPA/API/runtime changes this session.

**Added:** **`TENANT_MOBILITY_FLEET_CONSOLE_DESIGN.md`** (Fleet Console move wizard, SBC + S3 + control-plane architecture, §13 for implementers) + **`FLEET_SYSTEM_OVERVIEW.md`** (stakeholder / slides source).

**Fleet unchanged:** affcot on **bzy54n**; golden **08jzwn**; packages **0.0.3-22** / **pbx3cagi 1.0.0-3**.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — S8.10 open item + §2.6.1 IAM early win.

**Resume:** **R1** call recordings; **S8.10** implementation when scheduled (**Phase A** or IAM tighten first).

---

## Session end 2026-07-07 — S8 closed; fleet on 0.0.3-22

**All on `main`.** **`s8-tenant-move` merged.** **`pbx3 0.0.3-22`** deb (**`e4f9a88`**) + **`pbx3cagi 1.0.0-3`** installed fleet-wide. **pbx3api** **`a7cb907`** on golden + bzy54n (`git pull` + composer — no scp).

**Drill complete:** affcot on **bzy54n**; golden cleaned; catalog updated.

**Dev:** golden `https://08jzwn.pbx3.com:44300/api` · affcot `https://bzy54n.pbx3.com:44300/api`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**.

**Resume:** **R1** call recordings.

---

## Session end 2026-07-06 — affcot tenant migration drill

**On `main`:** **pbx3cagi** **1.0.0-3** (`_all.deb` packaging, **`bf8774e`**). **Pending merge `s8-tenant-move`:** pbx3 (runbook, postinst runLinker, **0.0.3-22**) + pbx3api (tenant import + auto firewall FQDN refresh).

**Drill:** **affcot** moved **08jzwn → bzy54n** — export/import, DNS, phone register, ext-to-ext calls; golden tenant removed; catalog updated.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login. **Affcot on bzy54n:** `https://bzy54n.pbx3.com:44300/api` or `VITE_API_PROXY_TARGET`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**, **`pbx3-directory/docs/TENANT_MIGRATION_RUNBOOK.md`**.

**Resume:** Merge **`s8-tenant-move`**; deploy **0.0.3-22** / **pbx3cagi 1.0.0-3**; then **R1** recordings.

---

## Session end 2026-07-06 — snapshots backlog + backup retention

**On `main`.** Docs only: snapshots UX / commit hook / FIFO backlog (**S9.5–S9.7**, **`ea34c69`**). Operator Q&A: **local+S3** on **`/backup`** is normal — local eviction is **9-file FIFO** (on create/cron), not time-based; S3 holds **30d**.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login, or `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300` + `npm run dev`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**.

**Resume:** **S8.5–S8.6** tenant migration; then **R1** recordings.

---

## Session end 2026-07-06 — S8 rebuild drill complete

**On `main`.** Second full fleet rebuild validated: lab **`i-09b5e1853b40f10db`** → **`pbx3 0.0.3-21`** → S3 restore → onboard → **`pbx3:fleet-preflight`** → SPA (lab API URL at login). Lab terminated; golden re-onboarded. Runbook Phase 1 hardened (**`15c5e9b`**). DNS/LE skipped by design.

**Dev against golden:** `https://08jzwn.pbx3.com:44300/api` at login, or `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300` + `npm run dev`. Home IPs: **System info → Network** (not page title).

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**.

**Resume:** **S8.5–S8.6** tenant migration; then **R1** recordings.

---

## Session end 2026-07-06 — S8 rebuild shipped; drill paused

**Merged to `main`:** **S8.1–S8.4** fleet rebuild tooling (pbx3 + pbx3api); **`s8build`** deleted. **`pbx3 0.0.3-21`** includes restore + hostname sync scripts. First lab rebuild validated; lab EC2 terminated; **second drill** not started — launch new instance next.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`. (Revert from lab IP if `.env.development` still points at `13.217.51.165`.)

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**, **`pbx3/pbx3-directory/docs/REBUILD_INSTANCE_RUNBOOK.md`**.

**Resume:** New lab EC2 → install **-21** → restore S3 backup → onboard → **`pbx3:fleet-preflight`** → SPA smoke via Vite proxy to new IP.

---

## Session end 2026-07-05 — SPA hygiene deferred; S8 next

**On `main`** (all repos). Docs only. **SPA size review:** ~38k LOC, single bundle OK on golden/LAN — **no code changes**. Deferred **Phase H** (lazy routes) + **Phase H2** (list/detail extraction) until after **S8 / R1**; see **`PROJECT_PLAN.md`**, **`PBX3SPA_CODEBASE_ANALYSIS.md`**. Removed obsolete **`ROLLBACK_NOTE.txt`** from holding folder (never in git).

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**.

**Resume:** **S8.1–S8.4** fleet checklist + IAM hardening; then **R1** recordings.

---

## Session end 2026-07-04 — Phase 0 complete; S8 next

**On `main`** (all repos). **pbx3cagi Phase 0** shipped and **golden-signed-off** on **08jzwn** (`make test` with synthetic seed + live tenant DB). Product priority **S8 → R1 → S7**; cagi struct refactor deferred. **`phase0`** branch deleted.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`**. Harness: **`pbx3cagi/workingdocs/TEST_RECIPE.md`**.

**Resume:** **S8.1–S8.4** fleet checklist + IAM hardening; then **R1** recordings panel/API.

---

## Session end 2026-07-04 — Phase 0 golden sign-off

**On `main`** (all repos). **pbx3cagi Phase 0:** golden **08jzwn** — `make test` PASS with synthetic seed and live **`/opt/pbx3/db/sqlite.rdonly.db`**. Gate cleared; struct refactor still deferred until **S8 + R1**.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — **S8** fleet first; **R1** recordings panel/API next.

**Resume:** **S8.1–S8.4** fleet checklist + IAM hardening; then **R1** (`sarkrecordings` port + API).

---

## Session end 2026-07-04 — Phase 0 harness + S8/R1 priority

**On `main`** (all repos). **pbx3cagi:** Phase 0 offline AGI test harness (synthetic fixture, CFIM scenarios, **`make test`**, **`TEST_RECIPE.md`**). **Planning:** product priority **S8 → R1 recordings → S7 S3**; pbx3cagi struct refactor deferred. **`phase0`** branch deleted.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`. On node: `cd pbx3cagi/pbx3cagi-1.0.0/csource && make test` per **`pbx3cagi/workingdocs/TEST_RECIPE.md`**.

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — S8 fleet first; **R1** recordings panel/API next (no SPA recordings panel yet).

**Resume:** **S8.1–S8.4** fleet checklist + IAM hardening; user golden harness testing in progress; then **R1** (`sarkrecordings` port + API).

---

## Session end 2026-07-04 — golden QA merged (`goldenQA` → `main`)

**Merged to `main`** in pbx3, pbx3api, pbx3spa, pbx3cagi; branch **`goldenQA`** deleted. Golden **08jzwn** QA: CoS assignment, extension calling, CFIM (shortuid AstDB), runtime save/display (AMI DBGet fix), GenAst, **pbx3cagi** local CFIM divert (no hold clip). **pbx3cagi 1.0.0-2** ships amd64 + arm64 binaries.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`. Deploy **`main`** on node (not `goldenQA`).

**Docs / TODO:** **`pbx3/workingdocs/TODO.md`** — Runtime live SIP/latency and SWOCLIP create/edit still open for re-examine.

**Resume:** Phase S8 fleet lifecycle, or operator pass on Extension Runtime + inbound SWOCLIP create panel parity.

---

## Session end 2026-07-02 (evening) — docs, MkDocs map, session-end habit

**On `main`**, no code changes this chat. **Pushed:** SIP/catalog policy, handoff refresh, CoS partial tracking, **`USER_GUIDES_MKDOCS_CONTENT_MAP.md`**, **session-end checklist + Cursor rule**.

**Workingdocs policy:** workingdocs = dev/AI; MkDocs **`pbx3-docs`** = installer/admin how-tos (see content map). Rationalization: session-end habit in place; optional 2–3 h handoff trim later.

**Resume:** Golden QA + deploy **pbx3api** (queue/trunk). New chat: **`New session — read handoff and summarize.`** Close with **`Session end.`**

---

## Session end 2026-07-02 — panel fixes (**merged to `main`**)

**Merged to `main`** (pbx3, pbx3api, pbx3spa); branch **`panelfixes`** deleted. Demo panel QA — queues (outcome/divert/greetnum), trunks (trimmed Settings/Advanced), routes (auth removed), inbound SWOCLIP retained, custom app **extcode** help, Instance Globals tidy, Network hostname **read-only**, **Site name** on Home.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300`; `npm run dev`. Home **Site name** reads **`GET sysglobals.sitename`** (no golden API deploy required for that UX).

**Docs:** **`pbx3/workingdocs/TODO.md`** (Runtime, SWOCLIP, maxin/maxout, session timeout, permissions Phase 1+). **`NETWORK_SYSGLOBALS_OVERLAP.md`** — hostname display-only; **sitename** = friendly label (Network edit, Home System column).

**Resume:** Operator QA on golden; deploy **pbx3api** when queue/trunk API changes needed on node; add **`extcode`** (+ **`iaxreg`**) rows on golden **Help messages** if missing.

---

## Session end 2026-05-30 — Phase 4 pause (`helptext`)

**Golden 08jzwn:** Demo DB from test instance; identity + LE + **410** `tt_help_core` rows applied. Packages **0.0.3-16** / **0.0.3-17** installed. Field-help walkthrough **in progress** — operator will report gaps.

**Branch `helptext`** (pbx3, pbx3api, pbx3spa): Phase 4 audit + Tier 1–2 help done; Certificates Sync UX + LE SAN replace fix; tenant **Mix monitor** removed from panel.

**Dev against golden:** `VITE_API_PROXY_TARGET=https://08jzwn.pbx3.com:44300` in `.env.development`; `npm run dev`.

**Resume:** Operator feedback from demo QA → remaining Phase 4 (Backup/Certificates/Login wiring, IVR dynamic keys, KSUID readouts). See **pbx3/workingdocs/AGENT_HANDOFF.md** § Next agent session notes.

---

## Session end 2026-05-30 — Track B Phases 0–3 on `main`

**Completed:** Track B release hardening **Phases 0–3** merged to **`main`** in **pbx3**, **pbx3api**, **pbx3spa**; **`hardening`** branch deleted. Fleet TLS, pbx3api installer health checks, fail2ban `jail.d` (**0.0.3-15**). Golden **08jzwn** validated end-to-end.

**Next (Track B Phase 4):** SPA field help on Tier 1–2 demo panels — **`pbx3/workingdocs/TRACK_B_RELEASE_HARDENING.md`** § Phase 4, **`STAKEHOLDER_DEMO_SCRIPT.md`**, **`formHelpPkey.js`**, **`tt_help_core`** in `sqlite_message.sql`.

---

## Session end 2026-05-17 — LE done; directory planning next

**Completed:** Per-instance **Let's Encrypt Option A** (multi-SAN, HTTP-01 webroot) merged to **`main`** in **pbx3**, **pbx3api**, **pbx3spa**. Remote **`certificates`** branches removed. Test node **`08jzwn.pbx3.com`**: package **pbx3 0.0.3-9**, API on **`main`**, three tenant FQDNs on cert, **Sync** + **renew --dry-run** OK.

**Dev pattern:** Local **pbx3spa** + `https://<instance-or-tenant-fqdn>:44300/api`. **`:44300/`** is Laravel only (welcome page) — not a missing cert.

**Next priority:** **Instance directory** (Model B central admin) — planning reference:

| Doc | Location |
|-----|----------|
| **PLANNING_HANDOFF.md** (start here) | **`pbx3/pbx3-directory/docs/`** |
| **INSTANCE_DIRECTORY_NEXT.md** (pointer) | **pbx3spa/workingdocs/** |
| **CENTRAL_ADMIN_DIRECTION.md** | **pbx3spa/workingdocs/** |

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

## Direction of travel — central admin (2026-05-17)

**Agreed:** **Model B** — one **central pbx3spa**; operators pick an **instance** from a **directory** (S3 index/map TBD), not a login URL field.

**LE/TLS:** **Done** on test node; merged to **`main`**. See **Session end 2026-05-17** above.

**Directory planning:** **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** (phases A–E, open questions, test node reference). Stub schema: **`pbx3/pbx3-directory/schema/`**.

**Dev today:** API base URL at login until instance picker ships (**`DEV_ENVIRONMENT.md`**).

---

## TLS / Certificates — shipped (2026-05-17)

**On `main`:** Multi-SAN LE (Option A), Certificates panel (**Sync**, cert covers), `tls-active.json`, webroot HTTP-01, **pbx3 0.0.3-9** (bash `apply-active-cert`, postinst `idpwgen`).

**Operator flow:** DNS per tenant FQDN → **Sync with tenant list** → verify `tls-active.json` → local SPA + `https://<fqdn>:44300/api`.

**Optional node follow-on:** firewall `update-fqdn-inline` (Step 1.2–1.3 in **TLS_IMPLEMENTATION_STEPS.md**). Archive: **pbx3/workingdocs/HANDOFF_RESUME_LE_OPERATOR_FLOW.md** (pre-merge notes; Sync now in SPA).

---

## Done

### App layout — independent main scroll + sidebar scroll persistence

- **`src/layouts/AppLayout.vue`:** Viewport-height shell (`100vh`) so **list/detail content** scrolls inside **`.content`** while the **left nav stays on screen**. Sidebar has its own scroll and **`sessionStorage`** persistence (`pbx3spa-sidebar-scroll`) so scroll position survives refresh and route changes (rAF-throttled save; restore after `nextTick`).
- **Accordion nav:** One nav **group** expanded at a time (compact sidebar). **Tradeoff** vs scroll persistence: user feedback may later justify **persisting expanded groups** or **multiple open sections** — documented in **PANEL_PATTERN.md** § App shell and navigation.
- **Branch:** Developed on **`scroller`**; merge to **`main`** when ready.

### Shell / topbar (Apr 2026 — after context chips)

- **`src/layouts/AppLayout.vue`:** Top bar is **three zones**: **`.topbar-left`** (**`h1.logo` → `PBX3 Admin`**), **`.topbar-center`** (**`SessionContextChips`**), **`.topbar-right`** (Commit, user, Logout). The left and right zones use **`flex: 1 1 0`** so they share space; the chip block is **`position: absolute`**, **`left: 50%`**, **`transform: translateX(calc(-50% - var(--pbx-shell-sidebar-width) / 2))`** so **Instance / Tenant** align with **viewport** center (main column alone would skew chips right of true center because of the sidebar).
- **CSS variable:** **`.app-layout { --pbx-shell-sidebar-width: 15.75rem; }`** and **`.sidebar { width: var(--pbx-shell-sidebar-width); }`**. If you change sidebar width, update the variable only — do not hard-code a second width in the transform.
- **Z-index / visibility:** Chips use **`z-index: 2`**; wings **`z-index: 1`**. **Do not** add opaque **`background`** on **`.topbar-left` / `.topbar-right`** while chips sit underneath — that **hid** the chips in an earlier iteration.
- **Sidebar:** No image or text logo in the nav column (PNG transparency / proper logo asset **deferred**). **`.sidebar-top-spacer`** (`min-height: calc(0.75rem * 2 + 2rem * 1.25)`) preserves top padding so the first nav links stay where they were with the old PBX³ line.
- **Example commits on `main`:** `74921db` (*topbar identity chips viewport-centered and visible*); earlier shell work includes `e459d45` (*sidebar top spacer, wider nav column*). **Always `git log`** for the latest.

### Latest session (Apr 2026 — context chips, instance FQDN, detail active header)

- **Commit:** Example on **`pbx3spa`** `main`: `8bd0233` (*SPA: context chips, globals FQDN instance label, detail active UX*). **Always commit inside `pbx3spa/`** (or `pbx3api/`, etc.); **`pbx3-master` is not a git repository.**
- **Context chips:** `src/components/SessionContextChips.vue` in **AppLayout** top bar (see **Shell / topbar** above for layout). **Auth** (`src/stores/auth.js`): `globalsFqdn` from **`GET sysglobals` → `fqdn`**; `displayInstanceLabel` prefers that, then whoami `instance_label` / `instance_name`, then API URL host. **`refreshGlobalsFqdnForTopBar()`** in **AppLayout** after login / `whoami`. **SysglobalsEditView**, **NetworkView**, **TenantCreateView** call **`auth.setGlobalsFqdnFromSysglobal`** after loading sysglobals. **Tenant** context: **TenantDetailView** `setTenantContext`; **TenantsListView** / unmount detail **`clearTenantContext`**; **`useSessionContext.js`**.
- **Detail edit — Active in header:** Pattern matches **Extension**, **Queue**, **Trunk**, **IVR**, **Day timer**, etc.: wrap **`PanelBackLink`** default slot in **`div.detail-panel-head`** → **`div.detail-title-status-row`** → **`h1.detail-panel-title`** + **`DetailActiveStatusBar`** (`v-model="editActive"`, `toggle-id`, `:readonly="isReadOnly('active')"` when applicable). Optional **`p.detail-active-inactive-hint`** when `editActive === 'NO'` (entity-specific sentence). Do **not** put long inactive copy inside **`DetailActiveStatusBar`** (it used to right-align under the pill). **Removed** **`.detail-inactive-banner`** (orange box) in favour of the muted hint. Global layout rules live in **`src/assets/main.css`** (`.detail-title-status-row`, `.detail-panel-head .detail-active-inactive-hint`).
- **Day timers:** **DayTimerDetailView** now syncs **`active`** on load and includes it in **PUT** when not schema read-only (list already had **Active** column).

### Previous session (panel back link + Asterisk editor button parity)

- **Component:** `src/components/PanelBackLink.vue` — header row with `router-link` `← {{ label }}` and default **slot** for the following `<h1>`. Styling matches the former inline Asterisk back link (blue, small type, hover underline).
- **Where used:** Every `*DetailView` and `*CreateView` for tenant-scoped resources (extensions, tenants, trunks, queues, … — see `router/index.js` `name` values in each view). **UserCreateView** → `users`. **AsteriskFileDetailView** → `asterisk-files`. **SysglobalsEditView** and **NetworkView** → `dashboard` (“← Dashboard”) because there is no list parent.
- **Adding a new panel:** Import `PanelBackLink`, wrap the top `<h1>` only: `<PanelBackLink :to="{ name: '…' }" label="…">` … `</PanelBackLink>`. Pass `class="edit-header"` / `create-header` / `detail-header` when the view already relied on those selectors for margin/`h1` rules.
- **Asterisk file edit:** Top and bottom action rows are **`.edit-actions`** / **`.edit-actions-top`** with unclassed `type="submit"` Save and `class="secondary"` Cancel — same CSS pattern as e.g. `ExtensionDetailView.vue` (blue Save, outlined Cancel). **Cancel** still calls `goBack()` → list route.

### Previous session (Commit everywhere, sticky sort, contextual help)

- **Commit in app chrome:** `CommitButton` in `AppLayout` topbar on all routes that mutate PBX config (admin only), except operational-only areas (backup, certificates, devices, firewall, help-messages, IP settings, logs, users). Uses `GET syscommands/commitstatus` and `GET syscommands/commit` — same red/green dirty behaviour as Dashboard; users do not need to return Home to commit.
- **Sticky sort:** `useStickySort` in `useStickyFilter.js`; wired to every sortable list (and both tables on Backup/restore). Same sessionStorage + 5‑min expiry as `useStickyFilter`. See **STICKY_LIST_UI.md**.
- **Per-field help:** `useHelp` loads `helpcore` once (admin layout); `FieldHelpIcon` resolves hints by `tt_help_core` pkey on forms. No separate `GET /help/{resource}/{field}` required for current UX.

### Previous milestone (Certificates panel + Let's Encrypt)

- **Certificates panel (pbx3spa):** Single view at `/certificates` with two sections: **Let's Encrypt** and **Purchased certificate**. When LE not configured: form **Hostname (FQDN)** + **Email (Let's Encrypt)** and button **Get certificate** (POST `/certificates/letsencrypt/setup`). When configured: Hostname, Expires, Issuer + **Renew now** (POST `/certificates/letsencrypt/renew`). Help text: A record + port 80 reachable; we open 80 only during issuance/renewal. Purchased: upload cert/key, Install, Remove. See **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** (index), **pbx3/workingdocs/CERTIFICATES_PANEL_AND_API.md**, **SINGLE_PANEL_SCREENS.md**.
- **Certificates API (pbx3api):** GET active, GET letsencrypt, POST letsencrypt/setup (fqdn, email → le-first-cert.sh), POST letsencrypt/renew (le-renew-with-80.sh), GET/POST/DELETE custom. Setup and renew need PBX3_SYSCMD_TIMEOUT ≥ 90.
- **pbx3 scripts:** le-port80-open.sh, le-port80-close.sh (Shorewall managed rule); le-renew-with-80.sh (open 80, certbot renew, close 80); le-first-cert.sh (first-time: open 80, certonly --standalone, write le-domain, apply-active-cert, close 80). Cron: twice daily LE renewal when le-domain exists. apply-active-cert.sh unchanged (custom → LE → snakeoil for nginx + Asterisk).
- **Docs:** **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** (index), **pbx3/workingdocs/CERTIFICATES_PANEL_AND_API.md**, **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md** (Option A §12). **pbx3spa** stub files redirect to **pbx3**. Shipped on **`main`** (pbx3, pbx3api, pbx3spa).
- **Per-tenant FQDN + LE:** **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md** is complete (this repo’s **LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md** is a redirect). It covers: Option A (multi-SAN LE cert), firewall FQDN inspection (inline rules per tenant), data model (FQDNs in tenants; instance apex in **`globals.domain`** / API **`domain`**), purchased certs (§6: wildcard/single multi-SAN supported via custom path; multiple individual purchased certs = future extension). **§11 gate:** Panel integration is on **`main`**; re-read §11 prerequisites table, then **§12** Phases 1–4 before starting implementation.
- **For next agent:** Certificates panel and LE flow are complete. Deploy: ensure scripts are executable (chmod +x le-*.sh); set PBX3_SYSCMD_TIMEOUT=90 for setup/renew from panel. Local test: don't create le-domain so no LE renewal runs.

### Previous sessions (condensed)

Holiday Timers, Extension harmonisation, Queue audit, Custom Apps, Help messages, Certificates, Backup/restore, Extensions completion, Permissions Phase 0, Trunk/DDI, Field mutability, create-panel standardization, tenant-scoped id vs pkey, IVR edit, Inbound routes + schema + booleans. See PROJECT_PLAN, FEATURE_PLANS_INDEX.md, and git history for detail.


---

## Left to do

### Complex create flows (create exercise)

**Approach:** One create view per resource + type chooser + conditional fields + one polymorphic create API per resource. See **workingdocs/COMPLEX_CREATE_PLAN.md**.

**Status:** **Trunk create: done** (SIP-only chooser; IAX2 deferred). **DDI (Inbound routes): done** (create + edit aligned to legacy; Connection/Advanced removed from edit). **Extensions: complete** (full CRUD, extension type derivation, live IP/Status from AMI, SIP password display; structure sound; some TODOs remain). **IVR create: done** (see **COMPLEX_CREATE_PLAN.md**). See COMPLEX_CREATE_PLAN.md for remaining create-flow items (e.g. trunk IAX2). 

### Create-panel standardization (PANEL_PATTERN §3 + §8)

**Done:** All six create panels (Extension, Trunk, Route, Queue, Agent, IVR) now match §3: Identity / Settings / optional Advanced grouping; defaults preset where applicable; FormToggle for booleans, FormSegmentedPill for 2–3 option fields, FormSelect for 4+. See **CREATE_PANELS_STANDARDIZATION.md** for status. Trunk type-chooser and conditional fields remain per COMPLEX_CREATE_PLAN.md.

### Instance directory (Model B) — **next**

- **Planning:** **`pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md`** — phases A–E, open questions, test node `08jzwn`.
- **Product:** **CENTRAL_ADMIN_DIRECTION.md** — central SPA, instance picker, S3 index TBD.
- **Pointer:** **INSTANCE_DIRECTORY_NEXT.md** (this repo).
- **Not started:** SPA picker, central auth, directory write path, S3 publish.

### Let's Encrypt per-tenant FQDN — **done on main** (maintenance)

- **Spec:** **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md**. New tenant: DNS → **Sync**. Optional: firewall `update-fqdn-inline` (**TLS_IMPLEMENTATION_STEPS.md** Step 1.2–1.3).

### Future project: data-driven list policy

- **Doc:** **DATA_DRIVEN_LIST_POLICY_PROJECT.md**. Replace hardcoded allow/deny or read-only lists (e.g. Asterisk files, log files) with a general, data-driven policy store. One mechanism, multiple scopes (e.g. `asterisk_files`, `log_files`), with per-scope inclusive vs exclusive semantics. Not implemented now; Asterisk Files and Logs can use hardcoded or simple logic until this project is done.

### Boolean pill style (to decide)

- **Segmented pill vs slider toggle:** Pattern says “all booleans as pills.” We currently use (a) **segmented pill** (YES | NO, two segments) for form booleans (e.g. “Listen for extension dial?”, “Register this trunk?”) and (b) **slider toggle** (left/right, single pill) for per-item on/off (e.g. “activate this key” in the IVR hide/reveal card layout). Decide whether to standardise on one style, or keep both (e.g. segmented for form booleans, slider for inline toggles). Deferred; document decision in PANEL_PATTERN or BOOLEAN_STANDARDISATION when decided.

### Other to-dos (from PROJECT_PLAN § Current state)

- **pbx3api – Middleware on remote:** Investigate why `ValidateClusterAccess.php` doesn’t appear on remote after pull (newpanels in use, file tracked); may be from old Sanctum experiment or deploy path.

- **Commit from config panels:** **Done** — **`CommitButton`** in **`AppLayout`** topbar (admin) + Dashboard; `commitstatus` / `commit` syscommands; hidden on operational-only routes (backup, certificates, devices, firewall, help-messages, IP settings, logs, users). See **Done** § Latest session.
- **Extensions:** Allow changing extension number (pkey) — needs API support first.
- **Extensions:** Add "Regenerate SIP password" button — allow users to regenerate passwd (for compromised/periodic refresh) without allowing manual password creation. Low priority.
- **Phone images:** API hosts library; SPA consumes URLs.
- **Tenants – Timer status / masteroclo:** API null handling; prefer API fix (e.g. model accessor or DB default).
- **Field mutability:** Done — API-driven; frontend uses GET /schemas (useSchema composable). See FIELD_MUTABILITY_API_PLAN.md.
- **Review later (UX):** Inline edit for list rows — revisit when main pattern is stable.
- **Sticky list filter/sort:** **Done** — `useStickyFilter` + `useStickySort` (5‑min expiry). See **STICKY_LIST_UI.md**.
- **Help text (per-field hints):** **Done** — cached `helpcore` + `FieldHelpIcon` / form `hint` props; optional future: REST shape `GET /help/{resource}/{field}` if we want resource-scoped URLs (see **UX_IMPROVEMENTS_IVR.md**).
- **SPA bundle size / performance (watch):** Fine on **LAN** today; re-check when testing moves to the **cloud** (latency, slower links). Watch `npm run build` output (JS/CSS gzip sizes), consider **route-level code splitting** (`import()` in router) and **rollup visualizer** if the main chunk grows. No fixed budget yet — treat as ongoing hygiene.

### Panel pattern audit (for when we come back)

**Fully implement pattern (read: Identity + Settings/Transport + Advanced; edit: all API-updateable fields):** Trunk, Inbound route only.

**Do not fully implement:** Tenant (edit: 5 of 50+ fields), Extension (edit: core fields implemented; structure sound; some advanced fields deferred), Route (edit: 3 of 9), Agent (no read structure + edit: 3 of 7), Queue (no read structure + edit: 2 of 5). **IVR:** read structure (Identity/Settings/Advanced) and edit now include all API-updateable fields (active, cname, name, description, cluster, greetnum, listenforext, timeout, option/tag/alert 0–11); see TODO_IVR_NAME for name deprecation decision. See full audit in chat history; standardize remaining panels later.

### Layout alternatives (parked)

- **IVR create — pill-per-key layout:** Alternative to the current inline horizontal table: one pill (toggle) per telephone key that activates/deactivates keypress listen; when activated, the panel expands vertically to show Action on KeyPress (dropdown), Tag (text), Alert (text). Matches the original SARK IVR edit UI. Reverted in favour of the horizontal table; can be reintroduced if preferred (see chat/session history for implementation).

### Parked / later

- **Backups** — review after first CRUD set.
- **Admin user management** — API needs stronger user/privilege support first.

---

## References

- **PROJECT_PLAN.md** § Current state — full “next chat” instructions, stack, principles, job steps.
- **EXTENSION_PROVISIONING_QUICKSTART.md** — start here for extension provisioning (read order, key files, implementation order).
- **EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md** — full plan; §8 Build readiness, §5 Implementation order.
- **EXTENSIONS_LIVE_DATA.md** — live IP/Status from Asterisk (extensions/live, runtime, amiQueryUntilComplete, key-value collection approach matching old system, frontend Unknown/— handling; gotchas for next agent).
- **DATABASE_CHANGES_FOR_PROVISIONING.md** — DB changes list (user applies manually; PBX3 has no Laravel migrations).
- **COMPLEX_CREATE_PLAN.md** — complex create flows: Trunk done, DDI done, Extensions complete, IVR create done.
- **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** — Phase 0 rollout (abilities, can(), route guard, Users panel); Phase 1 later.
- **ADMIN_PANELS_AND_PERMISSIONS.md** — Pattern: abilities, admin vs tenant areas, row-level scope.
- **AUTH_PATTERNS.md** — Auth contract and rules for agents (2FA, self-service, centralized auth); follow when touching login/tokens/whoami/guards.
- **PANEL_PATTERN.md** §8 — reference implementation status; §3 for create-form rules; §2.2 list blocks; §4.1 detail blocks; **App shell** — **SessionContextChips** (viewport-centered), **`--pbx-shell-sidebar-width`**, **sidebar top spacer**; **Edit** — **detail-panel-head**, **DetailActiveStatusBar**, **detail-active-inactive-hint**; **PanelBackLink** + top `←` parent navigation on create/detail (and dashboard-parent settings views).
- **SPA_SHELL_ROADMAP.md** — Stage 1 + Stage 2 shell (context chips, top bar three-zone layout, detail active UX); remaining ideas (collapsible sidebar, ⌘K).
- **`src/components/SessionContextChips.vue`**, **`src/components/DetailActiveStatusBar.vue`**, **`src/stores/auth.js`** (`globalsFqdn`, `tenantContext`), **`src/composables/useSessionContext.js`**, **`src/utils/sessionContext.js`** — context chips and tenant signpost.
- **`src/components/PanelBackLink.vue`** — shared top-of-panel back link; use for any new detail/create/settings sub-page that should return to a list or Home.
- **BOOLEAN_STANDARDISATION.md** — plan and fixer for standardising boolean columns to YES/NO; migration in pbx3api (run when ready).
- **pbx3api/docs/TODO_IVR_NAME.md** — IVR ivrmenu `name` field: research usage and decide whether to remove from API/UI (schema marks name deprecated in favour of cname).
- **pbx3api/docs/TENANT_SCOPED_PATTERN.md** — Tenant-scoped panels: id for identity, pkey+cluster for uniqueness; controller update by id; Form Request pkey rules. **pbx3api/.cursor/rules/tenant-scoped-panels.mdc** — Cursor rule for same (when editing API controllers/models/requests).
- **pbx3/full_schema.sql** — schema yardstick; API models/controllers must match column set (see SYSTEM_CONTEXT.md).
- **TRUNK_ROUTE_MULTITENANCY.md** — Trunk/route ownership (collective vs private), allocation, migration mechanics; read when working on trunks, outbound routes, or tenant migration.
- **wizardnotes/** — add-wizard.md, agent-brief-spa.md per resource (DDI, extension, trunk, ivr).
- **SYSTEM_CONTEXT.md**, **README.md** — context and setup.
- **pbx3/workingdocs/TLS_AND_CERTIFICATES.md** — TLS documentation index + overview (**pbx3** repo).
- **pbx3/workingdocs/CERTIFICATES_PANEL_AND_API.md** — Panel + **`/certificates/*`** API + code checklist.
- **pbx3/workingdocs/LETSENCRYPT_PER_TENANT_FQDN.md** — **Option A** full spec, firewall §9. **pbx3spa** `CERTIFICATES_ADOPTION_PLAN.md` / `LETSENCRYPT_PER_TENANT_FQDN_OPTIONS.md` redirect to **pbx3**.
- **pbx3/pbx3-directory/docs/PLANNING_HANDOFF.md** — **instance directory** planning (next session).
- **INSTANCE_DIRECTORY_NEXT.md** — short pointer to directory docs.
- **CENTRAL_ADMIN_DIRECTION.md** — Model B central admin.
