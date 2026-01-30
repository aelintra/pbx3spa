# System context (memory for AI)

Quick reference for new chats. See **PLAN.md** for full plan and design.

---

## PBX3 in one paragraph

**PBX3** is essentially a **vanilla Asterisk PBX** with an **API in front**. It uses a **SQLite3** database for persistent storage and a **generator** that reads the DB and builds the files Asterisk needs to run. The **API (pbx3api)** is colocated on each PBX3 instance and is the only management interface — the frontend never touches SQLite or the generator; it only talks to the API.

---

## What we’re building

**pbx3-frontend** = admin UI to manage PBX3 instances: connect to an instance (API base URL), authenticate (login → Bearer token), then perform CRUD on data (tenants, extensions, trunks, queues, IVRs, firewall rules, etc.) and run operational commands (backups, snapshots, syscommands, firewall restart, live state). See **pbx3api/docs/routes-data-vs-operational.md** for data vs operational split.

---

## Key references

- **pbx3api/docs/** — api.md, auth.md, general.md (full API).
- **pbx3api/docs/routes-data-vs-operational.md** — Data vs operational routes; firewall = list + add/change/delete rules via POST, PUT = restart.
- **pbx3api/test/ENDPOINT_RESULTS.md** — Live test results.
- **pbx3-frontend/workingdocs/PLAN.md** — Full plan, design, phases, next steps.
