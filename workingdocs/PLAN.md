# Plan, design & build: PBX3 admin frontend

This document captures context, design, and a phased plan for building the admin frontend that manages PBX3 instances.

---

## 1. Context: what PBX3 is

- **PBX3** is essentially a **vanilla Asterisk PBX** with an **API in front of it**.
- **Persistent storage:** a simple **SQLite3** database.
- **Generator:** takes data from the database and **builds the files Asterisk needs to run** (configs, dialplan, etc.).
- **API (pbx3api):** Laravel REST API colocated on each PBX3 instance. It is the **only management interface** — the frontend never talks to SQLite or the generator directly; it only talks to the API.

So the mental model:

```
[Admin frontend]  ←→  [pbx3api]  ←→  [SQLite DB]  →  [Generator]  →  [Asterisk config/files]
                            ↓
                     [Asterisk] (runtime)
```

The frontend’s job: provide a UI that calls the API to read/update data (CRUD) and to run operational commands (backups, restarts, live state, etc.).

---

## 2. What we’re building

- **Product:** Admin frontend to **manage PBX3 instances**.
- **Users:** Operators/admins who need to configure and operate one or more PBX3 boxes (tenants, extensions, trunks, queues, IVRs, system commands, backups, firewall, etc.).
- **Scope:** Everything the API exposes — **data** (CRUD on objects) and **operational** (actions, housekeeping, live state). See **pbx3api/docs/routes-data-vs-operational.md** for the split.

---

## 3. Design constraints and principles

- **Multi-instance:** Frontend can connect to **different PBX3 instances** (each has its own API base URL). Operator chooses or configures which instance they’re managing.
- **Auth per instance:** Authenticate against that instance’s API (e.g. login → Bearer token). No central auth; token is scoped to one instance.
- **API as single source of truth:** All persistence and business logic live in PBX3 (DB + generator + Asterisk). Frontend is stateless; it only calls the API and renders responses.
- **Data vs operational:** UX can distinguish **data** (lists, forms, create/edit/delete) from **operational** (buttons for “take backup”, “restart firewall”, “start/stop PBX”; read-only live state panels).
- **Read-only vs admin:** API has admin-only vs non-admin endpoints; frontend should respect that (e.g. show/hide or disable by role if we ever get role from whoami).

---

## 4. Architecture options: client/server vs SPA

Two viable approaches: **conventional client/server** (e.g. Laravel admin app, one or more admin instances) vs **modern SPA** (static app, browser talks to pbx3api). Given what we know (distributed PBX3 instances, per-instance auth, REST API already in place), here are the trade-offs.

### Option A: Client/server (e.g. Laravel)

**Model:** One or more admin servers. Browser → our server → pbx3api. Our server holds session, optionally stores instance URLs and tokens, may have its own DB for users/roles.

| Pros | Cons |
|------|------|
| **Central auth:** One login to “the admin app”; server can map user → allowed PBX3 instances and tokens. Good if you want enterprise SSO, roles, audit logs in one place. | **Ops:** Must run and maintain server(s): deploy, host, SSL, backups, scaling. |
| **No CORS:** Browser never talks to pbx3api; server proxies. No need to change pbx3api CORS. | **Latency:** Every request goes browser → server → pbx3api (extra hop). |
| **Tokens hidden:** API base URLs and Bearer tokens stay on server; browser only gets session cookie. | **Single point of failure:** If our server is down, nobody can manage any instance. |
| **Extra logic easy:** Rate limiting, caching, audit logging, “which user did what on which instance” in our DB. | **Two stacks:** Backend (Laravel/PHP) + frontend (Blade + JS or SPA behind it). Heavier to build and maintain. |
| **Familiar** for teams already on Laravel/PHP. | If we only proxy to pbx3api with no central auth, the server adds complexity for limited gain. |

**Best when:** You want one admin deployment with central login and authorization (“this user can manage these N instances”), or you can’t/won’t configure CORS on pbx3api and want to hide tokens from the client.

---

### Option B: SPA (e.g. React, Vue, Svelte)

**Model:** Static frontend (or lightly hosted). Browser → pbx3api directly (or via optional thin proxy). Instance URL + token chosen per session (e.g. “Connect to this instance” → login to that instance’s API → token in memory or sessionStorage).

| Pros | Cons |
|------|------|
| **No app server:** Deploy as static files (CDN, S3, Netlify, etc.). Simple hosting, low cost, no backend to patch or scale. | **CORS:** pbx3api must allow the SPA’s origin (or we add a thin proxy). If we don’t control pbx3api, this can block. |
| **Direct API calls:** Browser → pbx3api; one less hop, lower latency. | **Token in browser:** Token (and often instance URL) live in JS/sessionStorage. Acceptable for many admin tools over HTTPS; some policies forbid it. |
| **Fits the API:** REST/JSON, stateless; we’re doing CRUD + actions. pbx3api is the only backend. | **No central auth out of the box:** Each instance has its own users. “One login for 50 PBX3s” would need a separate auth service or a small backend. |
| **Single codebase:** Frontend repo = UI + API client; no Laravel app to run. | **Multi-instance in UI:** We implement “instance selector” + “login to this instance” in the client; token per instance (e.g. per tab or saved list of instances). |
| **Modern DX:** Component-based UI, hot reload, good for complex admin UIs (tables, forms, modals). | |

**Best when:** You’re okay with “connect to instance X + log in to that instance’s API” per session, you control or can set CORS on pbx3api, and you want minimal infra (static hosting only).

---

### Summary

| Dimension | Client/server (e.g. Laravel) | SPA |
|-----------|------------------------------|-----|
| **Hosting** | Need server(s) | Static; no app server |
| **Who calls pbx3api** | Our server (proxy) | Browser (or thin proxy) |
| **CORS** | Not an issue | pbx3api must allow SPA origin (or proxy) |
| **Token / instance URL** | Server-side | Browser (e.g. sessionStorage + instance selector) |
| **Central auth** | Natural (our DB, our login) | Would need extra backend or service |
| **Latency** | Extra hop | Direct to pbx3api |
| **Ops** | Deploy & maintain backend | Deploy static assets only |

**Recommendation (for current scope):** If you don’t need **central auth** (one login, roles, “user X can only touch instances A,B,C”) and you **can set CORS** on pbx3api (or accept a tiny proxy), **SPA** is the simpler fit: one codebase, no server to run, and the API is already the single source of truth. If you need **central auth and/or must hide tokens from the client**, **client/server** is the better fit, with the cost of running and maintaining the admin backend.

---

## 5. Bearer token security (frontend)

Holding Bearer tokens in the browser (e.g. in memory or sessionStorage) is a common concern. Here’s the risk and how other developers handle it.

### Why it’s a concern

- **XSS (Cross-Site Scripting):** If an attacker can run JavaScript in your app (injected script, compromised dependency), they can read **localStorage**, **sessionStorage**, or in-memory variables and exfiltrate the token. Then they can call the API as the user until the token is revoked or expires.
- **localStorage** is especially long-lived and available to any JS on the same origin, so it’s the worst place for a token. **sessionStorage** is better (cleared when the tab closes) but still readable by JS. **In-memory only** (no persistence) limits exposure to the lifetime of the tab and is slightly better, but XSS can still read it.

So: any token the frontend can read, XSS can read. The only way to “not hold the token on the frontend” is to never give the token to the browser at all — i.e. use a backend.

### How others handle it

**1. Don’t put the token in the browser — BFF / proxy (recommended if you care most about token safety)**

- The **browser never sees** the Bearer token. Flow:
  - User enters instance URL + credentials in the SPA.
  - SPA sends credentials to **your backend** (same origin or trusted).
  - Backend calls pbx3api `POST /auth/login`, receives the Bearer token, stores it **server-side** (e.g. in a session store or DB, keyed by a session ID).
  - Backend sets an **HttpOnly, Secure, SameSite** cookie containing only the session ID (or a signed session token). The cookie is not readable by JavaScript.
  - For every API call: browser → your backend (cookie sent automatically) → backend looks up the Bearer token for that session, calls pbx3api with it, returns the response to the browser.
- **Result:** Token never touches the browser. XSS cannot steal it (they can’t read HttpOnly cookies). You do need to run and secure a backend (CSRF protection if you use cookies, secure session store, HTTPS).

This is the “thin proxy” or “BFF” (Backend for Frontend) approach: minimal backend that does login + proxy + session storage. No need for full Laravel auth if you don’t want it — just “login to instance X, store token server-side, proxy requests.”

**2. Token in browser with mitigations (pragmatic for many internal/admin SPAs)**

If you stay with a pure SPA and the browser must send the Bearer token to pbx3api (or a proxy that forwards it), then:

- **Prefer sessionStorage over localStorage** so the token dies when the tab closes.
- **Or keep the token only in memory** (no persistence); user re-logs in when they refresh. Slightly more secure, slightly worse UX.
- **HTTPS only** so the token isn’t sent in the clear.
- **Short session timeout** or short-lived tokens if the API supports it (pbx3api tokens are long-lived unless revoked; you could add a “log out” that revokes and clears the client).
- **Content Security Policy (CSP)** and other hardening to reduce XSS risk (restrict script sources, avoid eval, etc.). This doesn’t remove the risk but shrinks the attack surface.
- **Dependency hygiene:** audit and update deps to reduce supply-chain / XSS risk.

Many internal/admin tools accept this trade-off: token in sessionStorage or memory, over HTTPS, with CSP and good hygiene. The risk is considered acceptable when the app is admin-only, not public, and the impact of token theft is bounded (e.g. one PBX3 instance, revocable).

**3. HttpOnly cookie for *your* session, token stays on server**

- Same as (1): your backend does login to pbx3api, stores the Bearer token server-side, gives the browser only an HttpOnly session cookie. The browser never sees the Bearer token. This is the standard “session cookie + server-side token” pattern.

**4. OAuth / OIDC style (if you had an IdP)**

- Authorization code flow + PKCE; short-lived access token (in memory only), refresh token in HttpOnly cookie or handled by a BFF. The “token” in the browser is minimal and short-lived. For pbx3api we don’t have OAuth; the equivalent of “minimize token in browser” is either in-memory only + short TTL (if API supported) or BFF so the real token never hits the client.

### Summary

| Approach | Token in browser? | XSS can steal token? | Cost |
|----------|--------------------|----------------------|------|
| **BFF / proxy** (backend stores token, cookie for session) | No | No (HttpOnly cookie) | Run and maintain backend |
| **SPA + sessionStorage** | Yes | Yes | None (static hosting) |
| **SPA + in-memory only** | Yes (in RAM) | Yes | None; user re-logs on refresh |
| **CSP + hygiene** (with either SPA option) | — | Harder but not impossible | Implementation effort |

**Recommendation:** If **avoiding token in the frontend** is a hard requirement, use a **thin backend (BFF/proxy)** that performs login to pbx3api, stores the Bearer token server-side, and uses an HttpOnly session cookie for the browser. You get “no Bearer token on the frontend” without building full central auth — just login + proxy + session. If you accept “token in browser with mitigations” for an internal admin tool, use **sessionStorage** (or in-memory), **HTTPS**, **CSP**, and short sessions / logout where possible.

---

## 6. High-level plan

| Phase | Focus | Outcomes |
|-------|--------|----------|
| **1. Plan & design** | Lock context, scope, and UX direction | This doc; stack choice; rough information architecture and key flows (instance + login, main nav, data vs operational). |
| **2. Foundation** | Project setup, API client, auth, instance selection | Repo with chosen stack; HTTP client for API; login flow; “select instance” (URL + optional saved instances); token storage and reuse. |
| **3. Data views** | CRUD UI for main data objects | Tenants, extensions, trunks, queues, IVRs, inbound routes, routes (ring groups), day/holiday timers, CoS, custom apps, sysglobals, firewall rules (list + add/change/delete), backups/snapshots (list, upload, download, delete). Greetings, agents, destinations, logs as needed. |
| **4. Operational** | Actions and live state | Syscommands (commit, start, stop, reboot, pbxrunstate); backups/new, restore; snapshots/new, restore; firewall restart; extension runtime; AMI/live state (optional or later). |
| **5. Polish** | UX, errors, edge cases | Error handling, loading states, validation aligned with API, responsive layout, accessibility, and any remaining flows. |

---

## 7. Chosen stack and job steps

- **Stack (locked):** **Vue 3** (Composition API) + **Vite** + **Vue Router** + **Pinia**. See **workingdocs/STACK_CHOICE.md**.
- **Job steps:** Discrete, testable, sign-off-able, committable steps are in **workingdocs/PROJECT_PLAN.md**. No big bang; one step at a time.
- **Other decisions (for the plan):** Hosting = static SPA initially. Nav = by resource (Tenants, Extensions, …). Instance selector = login page (base URL field). Logout in layout. Data first; operational later as steps.
- **Hosting:** Static SPA only (user points at API) vs small backend for env/config; how instance URLs and tokens are stored (e.g. session only vs optional local storage).
- **Information architecture:** Top-level nav (e.g. by resource: Tenants, Extensions, Trunks, … vs by area: Data / System / Logs). Where “instance selector” and “logout” live.
- **Data vs operational in UI:** Separate sections (e.g. “Configuration” vs “Actions & status”) or mixed per resource (e.g. Extensions list + “Runtime” tab/panel).

---

## 8. References (in repo / sibling repos)

- **pbx3-frontend/README.md** — Role of this repo and pointer to API docs.
- **pbx3api/docs/** — Full API: api.md, auth.md, general.md, index.md.
- **pbx3api/docs/routes-data-vs-operational.md** — Split of data vs operational routes; firewall nuance (list + add/change/delete rules via POST).
- **pbx3api/docs/API_DOC_ISSUES.md** — Known doc/code issues.
- **pbx3api/test/** — Endpoint test script and results (ENDPOINT_RESULTS.md).
- **workingdocs/PROJECT_PLAN.md** — Discrete job steps (scaffold → API client → auth → login → layout → Tenants/Extensions list → …); test, sign off, commit per step.
- **workingdocs/SPA_BASICS.md** — SPA in detail for someone used to PHP client/server (request flow, build step, routing, state, auth, deployment, glossary).

---

## 9. Next steps

1. **Execute PROJECT_PLAN.md** — Start with **Step 1: Scaffold** (Vue 3 + Vite + Vue Router + Pinia). Test, sign off, commit. Then Step 2, 3, … in order.
2. Add further job steps to PROJECT_PLAN.md as we go (detail views, CRUD, operational).

This doc will be updated as we lock decisions and complete phases.
