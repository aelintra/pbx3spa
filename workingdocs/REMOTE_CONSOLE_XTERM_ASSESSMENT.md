# Remote Linux console (xterm.js) — feasibility & security assessment

**Goal:** Add a “Console” menu option in the SPA that opens an in-browser terminal connected to a remote Linux shell (the PBX host or a target server). **Primary concern:** security.

**Reference:** [xterm.js](https://xtermjs.org/) — terminal emulator that runs in the browser; used by VS Code, ttyd, and many others.

---

## 1. Feasibility

### Frontend (SPA)

- **xterm.js** is a **display layer only**. It renders a terminal in the browser; it does not provide a shell or network connection.
- **Integration is straightforward:** `npm install @xterm/xterm` (and optionally `@xterm/addon-fit` for responsive sizing). Add a Vue view/component that mounts a `<div>`, instantiates `new Terminal()`, calls `term.open(div)`, and wires `term.onData()` to send keystrokes and receives output to `term.write()`. Fits cleanly as a nav item (e.g. “Console”) and a route like `/console`, **gated by `can('admin')`** so only admins see it.
- **Verdict:** Feasible. The SPA part is well within reach and aligns with your stack (Vue 3, Vite).

### Backend (the actual shell)

To have a **remote** Linux console, the browser must get a **bidirectional stream** to a real shell (or SSH session). Options:

| Approach | Description | Complexity | Fits current stack? |
|----------|-------------|------------|----------------------|
| **A. WebSocket + PTY on API host** | Backend (e.g. Laravel or a small sidecar) spawns a PTY (e.g. `/bin/bash`), attaches it to a WebSocket; SPA connects to that WebSocket. Shell runs as the web server user (e.g. `www-data`) on the same machine as the API. | Medium | Laravel has no built-in WebSocket server; you’d add **Laravel Reverb** (or Soketi) and a custom “console” channel, or run a **small Node/Go service** that: (1) authenticates via your API (e.g. token or one-time ticket), (2) spawns a PTY, (3) bridges PTY ↔ WebSocket. |
| **B. Proxy to existing terminal server** | Use an existing tool (e.g. **ttyd**, **gotty**) that already does PTY + WebSocket. SPA opens a URL (or iframe) to that service; your API only issues a one-time ticket or proxy URL so the SPA can connect. | Low backend logic | Yes: run ttyd/gotty on the host; API returns a short-lived URL or ticket; SPA opens xterm.js and connects to that endpoint. You must secure the ttyd/gotty endpoint with the same auth (e.g. ticket in query, validated by reverse proxy or a small wrapper). |
| **C. WebSocket + SSH proxy** | User chooses “this host” or “target host”; backend proxies an SSH connection and streams stdin/stdout over WebSocket. | High | Possible but more code (SSH key or password handling, host selection). Often overkill for “console on the PBX itself.” |

**Verdict:** Feasible. The most practical paths are **(A)** a small WebSocket + PTY service that uses your existing auth, or **(B)** ttyd/gotty on the host with ticket-based or proxy-based auth so only your SPA (with admin token) can get a valid session.

---

## 2. Security (prime concern)

### xterm.js itself

- xterm.js is a **renderer**. It does not execute commands; it only draws characters and sends keystrokes to whatever you connect it to. Risk is **low**.
- Keep the dependency **updated** to avoid known XSS or escape-sequence issues (check advisories when upgrading).

### Where the real risk is

The **real** risk is **who gets a shell, and how**.

1. **Who gets a shell**  
   The process behind the WebSocket (PTY or ttyd) typically runs as the **web server user** (e.g. `www-data`) or a dedicated **console user**. That account can do everything the OS allows: read/write files, run commands, potentially escalate. So:
   - **Restrict by role:** Only users who already have “full” access should get the console. You already have **`can('admin')`** and `abilities:admin` in the API — the console **must** be available only to admins (route guard + nav link gated by `can('admin')`, and backend must not issue a session unless the user is an admin).
   - **Audit:** Log who opened a console and when (and optionally session id). No need to log every keystroke unless you have a compliance requirement.

2. **Session hijacking / unauthorized access**  
   - WebSocket must run over **WSS (TLS)** in production. No plain WS on the internet.
   - **Auth must be tied to your existing auth.** Options:
     - **One-time ticket:** SPA calls `GET /api/console-ticket` with `Authorization: Bearer <token>` (and optionally `cluster`). API (admin-only) returns a short-lived, single-use ticket. SPA connects to `wss://host/console?ticket=...`. WebSocket server validates the ticket and then opens the PTY. Token never appears in the WebSocket URL.
     - **Cookie-based:** If the WebSocket is on the same origin as the API and you use cookies for auth, the WebSocket can use the same cookie (ensure SameSite/Secure and WSS).
   - **No long-lived Bearer in URL:** Avoid putting the main API token in the query string (logs, Referer, history). Prefer a ticket or cookie.

3. **Input / output**  
   - The terminal only displays what the server sends and sends what the user types. The server must **not** trust client input beyond “forward to PTY” (no server-side interpretation of “special” commands from the client). Rate-limiting and “max one session per user” (or per admin) reduce abuse.
   - If you use ttyd/gotty (approach B), lock them down: bind to localhost and expose only via your reverse proxy (nginx) that checks the ticket or session; do not expose raw ttyd port to the internet.

4. **Network**  
   - Console endpoint (your WebSocket or ttyd) should **not** be directly exposed to the internet without auth. Put it behind the same front (e.g. nginx) that serves your API/SPA, and enforce auth (ticket or cookie) before upgrading to WebSocket or proxying to ttyd.

5. **Compliance / ops**  
   - Consider: who is allowed to use the console (only admins), where logs are stored, and whether you need “console access” in an audit trail. Document the decision.

### Summary: is it safe?

- **Safe if:**  
  - Only **admin** users can request a console session (SPA + API + WebSocket/ticket issuer).  
  - WebSocket is **WSS only** and auth is via **short-lived ticket** (or same-origin cookie), not Bearer in URL.  
  - Backend (or ttyd) is **not** exposed to the internet without auth; reverse proxy enforces ticket/session.  
  - You **audit** “who opened console and when” (and optionally session id).  
  - You keep **xterm.js** and backend deps updated.

- **Not safe if:**  
  - Any authenticated user (or unauthenticated) can open a shell, or the WebSocket is unauthenticated.  
  - Token is passed in the clear or in the URL.  
  - The PTY/ttyd service is bound to 0.0.0.0 with no auth in front.

---

## 3. Recommendation

- **Feasibility:** Yes. xterm.js in the SPA as a menu option is straightforward; the backend can be either a small WebSocket+PTY service (with Laravel Reverb or a sidecar) or a secured ttyd/gotty plus a ticket from your API.
- **Safety:** Yes, **provided** you treat the console as a **high-privilege feature**: admin-only, WSS, ticket-based (or cookie-based) auth, no direct exposure of the shell endpoint, and audit logging. Then risk is consistent with “admin has shell access” and is manageable.

If you decide the operational or compliance burden is too high, you can **not** add the feature and nothing in the current SPA or API is affected. No obligation to proceed.

---

## 4. If you proceed (minimal checklist)

- [ ] Console route and nav item **only for `can('admin')`**.
- [ ] API: **admin-only** endpoint that returns a **short-lived one-time console ticket** (e.g. `GET /api/console-ticket`).
- [ ] WebSocket server (or ttyd + nginx): validate **ticket** (or cookie) before opening PTY or proxying; use **WSS** only in production.
- [ ] Bind PTY/ttyd to **localhost**; expose only via reverse proxy that checks auth.
- [ ] **Audit log:** “User X opened console at time T” (and optionally session id).
- [ ] Dependency: **xterm.js** (and addons) kept updated; no execution of client-supplied commands on the server beyond “send to PTY”.

---

## 5. Open-source alternatives — ranked comparison

Sweep of open-source options, ranked on **ease of implementation**, **fitness for purpose** (remote Linux console in SPA), and **secure deployment** (admin-only, auth, audit). Two tiers: **(A) frontend-only** (terminal emulator in browser; you still need a backend) and **(B) full-stack** (backend + frontend; may or may not embed in your SPA).

---

### A. Frontend-only (terminal emulator in browser)

These replace or complement xterm.js as the in-browser display. You still need a WebSocket/PTY backend.

| Project | Ease of implementation | Fitness for purpose | Secure deployment (admin-only) | Notes |
|--------|-------------------------|----------------------|--------------------------------|-------|
| **xterm.js** | ★★★★★ | ★★★★★ | ★★★★★ | **Default choice.** npm, Vue-friendly, no runtime deps. [Security guide](https://xtermjs.org/docs/guides/security/) and CORS/WSS guidance. One notable historical CVE (CVE-2019-0542, DCS; fixed in 3.8.1+). Keep updated. |
| **ghostty-web** | ★★★★☆ | ★★★★★ | ★★★★☆ | [Coder/ghostty-web](https://github.com/coder/ghostty-web): WASM, ~400KB, **xterm.js-compatible API** (swap import). Better Unicode/scripts and some escape sequences. Newer; Ghostty native had advisories (e.g. window title sequence, patched). Monitor upstream security. |
| **DomTerm** | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ | [PerBothner/DomTerm](https://github.com/PerBothner/DomTerm): Full REPL/console, C++/JS, multiple frontends. Not a drop-in npm widget; more “application” than “embed in SPA.” Build from source; no standard “embed in Vue” path. |
| **hterm (libapps)** | ★★★☆☆ | ★★★★☆ | ★★★★☆ | [Chromium hterm](https://chromium.googlesource.com/apps/libapps/+/HEAD/hterm): Google, JS, ECMAScript 2021. Good for rendering/input but not the de facto standard; less ecosystem (addons, examples) than xterm.js. |

**Summary (frontend):** **xterm.js** remains the best balance of ease, fit, and documented security. **ghostty-web** is the main challenger if you want a drop-in upgrade and can accept a newer codebase; **DomTerm** and **hterm** are viable but harder or less aligned with “menu option in existing SPA.”

---

### B. Full-stack (backend + frontend)

End-to-end solutions. Security ranking emphasizes: **admin-only access**, **auth tied to your stack**, **no unauth’d exposure**, **auditability**.

| Project | Ease of implementation | Fitness for purpose | Secure deployment (admin-only) | Notes |
|--------|-------------------------|----------------------|--------------------------------|-------|
| **ttyd** | ★★★★★ | ★★★★★ | ★★★★★ | [tsl0922/ttyd](https://github.com/tsl0922/ttyd): C, PTY + WebSocket, uses xterm.js on frontend. **Auth:** `-c user:pass` or **auth proxy**: reverse proxy does auth, passes `X-WEBAUTH-USER`; ttyd on **Unix socket** (e.g. `-i /tmp/ttyd.sock`) so it’s not hit directly. Perfect for “embed in SPA”: run ttyd on localhost/socket, nginx validates your API token/ticket and proxies to ttyd. MIT, active. |
| **GoTTY** | ★★★★☆ | ★★★★★ | ★★★★☆ | [yudai/gotty](https://github.com/yudai/gotty): Go, same idea as ttyd. Basic auth, TLS, random URL. No built-in “delegate to my API” — you’d put it behind nginx with your own auth. Slightly less “auth proxy” story than ttyd. MIT. |
| **Wetty** | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | [butlerx/wetty](https://github.com/butlerx/wetty): Node, **SSH** to a server (not local PTY). xterm.js frontend. Auth is SSH (password/keys). To get admin-only you’d add a layer (e.g. nginx + your API ticket) or run Wetty only for users who already have SSH. More moving parts for “one local shell” than ttyd. |
| **Apache Guacamole** | ★★☆☆☆ | ★★★★☆ | ★★★★☆ | [guacamole.apache.org](https://guacamole.apache.org/): Full gateway (SSH, RDP, VNC). Strong auth/session model and DB-backed config. **Heavy** for “one console in SPA”: separate app, Tomcat, guacd, DB. Best when you need multi-protocol and many connections; overkill for a single admin console in pbx3spa. |
| **Sshwifty** | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | [nirui/sshwifty](https://github.com/nirui/sshwifty): Go, web SSH (and Telnet) client. **Shared-key** password for web UI; CVE fixes in 0.4.3. Standalone app; embedding in your SPA would mean iframe or separate route. AGPL-3.0. |
| **Bastillion** | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | [bastillion-io/Bastillion](https://github.com/bastillion-io/Bastillion): Java, bastion host + SSH key management, 2FA, session audit. Aimed at “many servers, many users.” Not a drop-in console for one SPA; would sit alongside your app. Strong for centralized, audited SSH access. |

**Summary (full-stack):** For **“one admin console in our SPA”**, **ttyd** is the best fit: easy to run behind nginx, auth proxy or ticket-based access, bind to localhost/socket, WSS at proxy. **GoTTY** is a close second. **Wetty** is good if you explicitly want SSH to a host. **Guacamole** and **Bastillion** are strong on secure deployment but heavy and not aimed at embedding a single console in an existing SPA.

---

### Overall ranking (for your use case)

1. **xterm.js + ttyd (or custom WebSocket+PTY)** — Easiest and safest path: xterm.js in the SPA (admin-only route), ttyd on localhost/socket behind nginx that validates a ticket from your API (admin-only). No need to switch frontend unless you want ghostty-web’s features.
2. **ghostty-web + ttyd** — Same as above with a modern, xterm.js-compatible frontend; monitor Ghostty security advisories.
3. **xterm.js + GoTTY** — Same pattern as ttyd, slightly less direct “auth proxy” support.
4. **Wetty** — If you want SSH to a specific host instead of a local PTY; add your own admin gate (e.g. ticket) in front.
5. **Guacamole / Bastillion / Sshwifty** — Use when you need a full gateway or multi-user bastion; not optimized for “one console menu item in pbx3spa.”

**Secure deployment (admin-only):** All of the above can be deployed securely **only if** you: (1) gate the console (route + backend) on `can('admin')`, (2) use WSS and ticket- or proxy-based auth so the shell endpoint is never publicly reachable without auth, (3) bind the PTY service to localhost or a socket, and (4) log who opened a console and when. ttyd’s auth-proxy + Unix socket pattern aligns best with that.

---

**References**

- xterm.js: https://xtermjs.org/ — [Security](https://xtermjs.org/docs/guides/security/)
- ghostty-web: https://github.com/coder/ghostty-web
- DomTerm: https://github.com/PerBothner/DomTerm
- hterm (libapps): https://chromium.googlesource.com/apps/libapps/+/HEAD/hterm
- ttyd: https://github.com/tsl0922/ttyd — [Auth proxy wiki](https://github.com/tsl0922/ttyd/wiki/Auth-Proxy)
- GoTTY: https://github.com/yudai/gotty
- Wetty: https://github.com/butlerx/wetty
- Apache Guacamole: https://guacamole.apache.org/
- Sshwifty: https://github.com/nirui/sshwifty
- Bastillion: https://github.com/bastillion-io/Bastillion
- Laravel Reverb (WebSockets): https://laravel.com/docs/reverb

---

## 6. Build plan (xterm.js console, aligned with PANEL_PATTERN)

This plan adds a **Console** menu option that opens an in-browser terminal (xterm.js) connected to a remote shell. It follows **PANEL_PATTERN.md**: single-screen panel, nav gated by `can('admin')`, toast API, loading/error handling, route naming, and full-width layout. Security checklist from §4 is applied throughout.

**Pattern references:** PANEL_PATTERN § Single-screen panels (no max-width, full content width), § Toast API (`toast.show(message, variant)`), § Route paths and names, § Loading states and error display. Console is a **single-screen utility panel** like Firewall and Backup (one view, no list/create/edit).

---

### 6.1 Panel type and route

- **Panel type:** Single-screen (exception to the three-panel rule). One view only; no list, no create, no edit.
- **Route path:** `/console`
- **Route name:** `console`
- **View file:** `ConsoleView.vue` (in `src/views/`)
- **Layout:** No `max-width` on the view root so the terminal can use full content width (PANEL_PATTERN § Single-screen panels: use full content width). Use a wrapper class e.g. `.console-view`.
- **Heading:** Single `<h1>Console</h1>` (list-style heading; PANEL_PATTERN § List panel: heading).
- **Nav:** Add a link **only when** `auth.can('admin')` (same block as Firewall, Backup, Users in `AppLayout.vue`). Label: **"Console"**. Path: `/console`.

---

### 6.2 Implementation phases

#### Phase 1 — SPA: xterm.js view and shell (no backend)

**Goal:** Add the Console route and a view that mounts xterm.js. No WebSocket yet; optional local “demo” or message that backend is not configured.

1. **Dependencies (pbx3spa)**  
   - `npm install @xterm/xterm @xterm/addon-fit`  
   - Add xterm CSS: import `@xterm/xterm/css/xterm.css` in the view (or in main.js if preferred globally).

2. **Route and nav**  
   - **Router** (`src/router/index.js`): Add child route `{ path: 'console', name: 'console', component: ConsoleView }` inside the AppLayout children (with firewall, backup, logs). Import `ConsoleView` from `@/views/ConsoleView.vue`.  
   - **AppLayout** (`src/layouts/AppLayout.vue`): Inside the `v-if="auth.can('admin')"` block, add `<router-link to="/console" class="nav-link" active-class="active">Console</router-link>` (e.g. after Backup).

3. **ConsoleView.vue**  
   - **Template:**  
     - Root: `<div class="console-view">` (no max-width).  
     - `<h1>Console</h1>`.  
     - Optional one-line intro (e.g. “Remote shell on the PBX host. Admin only.”).  
     - **Terminal container:** `<div ref="terminalContainer" class="console-terminal"></div>`.  
     - **States:**  
       - Loading: “Connecting…” (or “Starting terminal…” when no backend).  
       - Error: `firstErrorMessage`-style block (e.g. `{{ connectionError }}`).  
       - Connected: terminal visible and focused.  
     - Optional: “Disconnect” or “Close” button that closes the WebSocket and shows a message (toast when implemented).  
   - **Script:**  
     - Import `Terminal` from `@xterm/xterm`, `FitAddon` from `@xterm/addon-fit`.  
     - On mount: create `new Terminal()` (options: cursorBlink, theme if desired), `term.open(terminalContainerRef.value)`, add FitAddon and `fit()`.  
     - Resize: use `ResizeObserver` (or window resize) and call `fit()`.  
     - **Without backend:** Either leave `term.onData()` no-op and show “Console backend not configured” in the terminal or in a message below the heading; or skip Phase 1 WebSocket and go straight to “Connecting…” that fails gracefully.  
   - **Styles:** `.console-view` full width; `.console-terminal` with min-height (e.g. 400px), background and padding so the terminal is readable (match app theme). Import xterm.css so cursor and colors render.

4. **Guard**  
   - Console is under the same `beforeEach` as other app routes: user must be logged in and `auth.can('admin')` (already enforced for all non-public routes). No extra guard needed in the view; nav link is already gated.

**Deliverable:** Navigating to `/console` as admin shows the Console view with xterm.js mounted; terminal may be empty or show a placeholder until the backend is wired.

---

#### Phase 2 — API: console ticket (admin-only, audit)

**Goal:** API endpoint that issues a short-lived, one-time ticket for the console WebSocket. Only admins; audit log.

1. **pbx3api**  
   - **Route:** `GET /api/console-ticket` (or `GET /auth/console-ticket` if you prefer under auth prefix).  
   - **Middleware:** `auth:sanctum` + `abilities:admin` (same as other admin-only routes).  
   - **Controller:** e.g. `ConsoleController@ticket`.  
     - Generate a one-time token (e.g. random string stored in cache with TTL 60–120 seconds, key = token, value = user id or session id).  
     - Log audit: “User {id/email} requested console ticket at {timestamp}” (and optionally ticket id).  
     - Return JSON: `{ "ticket": "<token>", "ws_url": "wss://..." }` or just `{ "ticket": "<token>" }` if the SPA builds the WebSocket URL from baseUrl.  
   - **Security:** Do not return the Bearer token. Ticket only; ticket validated by the WebSocket server or by nginx/auth service before proxying to ttyd.

2. **SPA (minimal change in Phase 2)**  
   - Optional: add a “Connect” button that calls `GET /api/console-ticket` and shows the ticket in a toast or in the UI for debugging. Full wiring in Phase 4.

**Deliverable:** Admin can call `GET /api/console-ticket` with Bearer token and receive a short-lived ticket; API logs the request.

---

#### Phase 3 — Backend: WebSocket + PTY (ttyd or custom)

**Goal:** A process that serves a WebSocket and attaches it to a PTY (local shell). Only reachable after validating the ticket (or session).

**Option A — ttyd (recommended)**  
- Install and run **ttyd** on the host (e.g. `ttyd -i /tmp/ttyd.sock -c '' bash` or with a dedicated user).  
- **Auth:** Do not expose ttyd directly. Put **nginx** (or another reverse proxy) in front:  
  - Location e.g. `/console-ws` or `/ws/console`.  
  - Proxy validates the ticket (e.g. subrequest to pbx3api “validate this ticket” or a small auth service that checks the cache).  
  - If valid: proxy to ttyd’s Unix socket (or localhost port). If invalid: 403.  
- **WSS:** Terminate TLS at nginx; use `wss://` in production.  
- **Binding:** ttyd bound to Unix socket or `127.0.0.1` only; never 0.0.0.0 without auth in front.

**Option B — Custom WebSocket + PTY**  
- Small Node/Go service: on WebSocket connect, expect ticket in query or first message; validate ticket with API or shared cache; if valid, spawn PTY, bridge PTY ↔ WebSocket.  
- Same security: ticket-only, WSS, bind to localhost/socket, audit already in API when ticket was issued.

**Deliverable:** WebSocket endpoint (e.g. `wss://host/console-ws?ticket=...`) that, for a valid ticket, streams a shell. Invalid or missing ticket → 403.

---

#### Phase 4 — SPA: connect to WebSocket with ticket

**Goal:** Console view obtains a ticket from the API, connects to the WebSocket with that ticket, and wires xterm.js to the stream.

1. **Flow in ConsoleView.vue**  
   - On mount (or on “Connect” click):  
     1. Set loading: “Connecting…”.  
     2. `GET /api/console-ticket` with Bearer (use existing `getApiClient()`).  
     3. On success: build WebSocket URL (e.g. from `baseUrl` replace `https`→`wss`, path e.g. `/console-ws?ticket=` + response.ticket).  
     4. Open WebSocket; on open: clear loading, optionally `toast.show('Console connected')`.  
     5. On message: `term.write(data)` (binary or text as per backend).  
     6. `term.onData(key)` → send key to WebSocket.  
     7. On close/error: set `connectionError`, `toast.show('Console disconnected', 'error')`, allow “Reconnect”.  
   - **Cleanup:** On unmount, close WebSocket and `term.dispose()`.

2. **Toast API (PANEL_PATTERN § Toast API)**  
   - Use **`toast.show(message, variant)`** only.  
   - Success: e.g. `toast.show('Console connected')`.  
   - Error: e.g. `toast.show('Console disconnected', 'error')` or `toast.show(errorMessage, 'error')` for ticket/connection failures.

3. **Error display**  
   - **firstErrorMessage-style:** One block for connection/API errors (e.g. “Could not get console ticket”, “WebSocket closed”).  
   - Do not use raw `innerHTML` for server-sent data; xterm.js handles terminal output safely.

4. **Optional**  
   - “Disconnect” button: close WebSocket, show toast.  
   - “Reconnect” when disconnected.  
   - Escape key: optionally navigate back to Home or leave view (PANEL_PATTERN § Keyboard Navigation); document behaviour.

**Deliverable:** Admin opens Console → SPA gets ticket → connects to WSS with ticket → terminal shows shell I/O; disconnect and errors show toast and inline error as per pattern.

---

### 6.3 File and naming summary

| Item | Location / name |
|------|------------------|
| View | `pbx3spa/src/views/ConsoleView.vue` |
| Route path | `/console` |
| Route name | `console` |
| Nav label | Console |
| API ticket | `GET /api/console-ticket` (or `GET /auth/console-ticket`) |
| WebSocket path | e.g. `wss://host/console-ws?ticket=...` (decide with nginx/ttyd) |
| xterm CSS | `@xterm/xterm/css/xterm.css` |

---

### 6.4 PANEL_PATTERN compliance checklist

- [ ] **Single-screen:** One view only; no list/create/edit. No max-width on `.console-view`.
- [ ] **Route:** `path: 'console'`, `name: 'console'` under AppLayout children.
- [ ] **Nav:** Link “Console” inside `v-if="auth.can('admin')"` in AppLayout.
- [ ] **Heading:** `<h1>Console</h1>`.
- [ ] **Toast:** `toast.show(message, variant)` for success/error only; no `toast.success()` / `toast.error()`.
- [ ] **Loading/error:** Loading state while fetching ticket/connecting; firstErrorMessage-style block for connection/API errors.
- [ ] **Security (§4):** Console route and nav admin-only; ticket endpoint admin-only; WSS + ticket validation; PTY/ttyd bound to localhost or socket; audit log for ticket issuance.
- [ ] **No form components:** Console does not use FormField/FormSelect/FormToggle; terminal is the content. No API field parity required for this panel.

---

### 6.5 Order of work (recommended)

1. Phase 1 — SPA view, route, nav, xterm.js mount (and optional placeholder when no backend).  
2. Phase 2 — API ticket endpoint + audit.  
3. Phase 3 — ttyd (or custom) + nginx/auth.  
4. Phase 4 — SPA: ticket fetch → WebSocket connect → wire xterm.js; toast and error handling.  
5. **Installer / deployment** — Ensure SPA install/build fetches xterm (package.json + docs/scripts); extend host installer (or document manual steps) to install ttyd and nginx config for console. Can overlap with Phase 3/4 once backend path is decided.

After Phase 1, the Console menu item exists and shows the terminal UI; after Phase 4, the full secure flow is in place. After installer work, new installs and existing installers fetch and install all foreign components.

---

### 6.6 Effort estimates (reasonably competent developer)

Time estimates assume a developer familiar with Vue 3, Laravel, the codebase patterns (PANEL_PATTERN), and basic WebSocket/PTY concepts. Includes reading documentation, implementation, testing, and debugging.

| Phase | Tasks | Estimated hours | Notes |
|-------|-------|-----------------|-------|
| **Phase 1 — SPA view** | Install xterm.js, add route/nav, create ConsoleView.vue, mount Terminal with FitAddon, basic styling, resize handling | **4–6 hours** | Most time on xterm.js API (docs, options, FitAddon), Vue refs/lifecycle, styling to match app theme. Testing: terminal renders, resize works. |
| **Phase 2 — API ticket** | Create ConsoleController, ticket generation (cache with TTL), audit logging, route + middleware, test endpoint | **2–3 hours** | Straightforward: Laravel cache, Log facade, follow existing controller patterns. Testing: ticket issued, expires, audit logged. |
| **Phase 3 — Backend (ttyd)** | Install ttyd, configure Unix socket, nginx location + ticket validation (subrequest or auth service), WSS config, test connection | **4–8 hours** | **ttyd path:** 4–6h (install, socket config, nginx proxy_pass, ticket validation logic). **Custom service:** 6–8h (Node/Go WebSocket + PTY, ticket check, error handling). Testing: valid ticket → shell, invalid → 403. |
| **Phase 4 — SPA WebSocket** | Fetch ticket API, build WSS URL, WebSocket connect/disconnect, wire term.onData/term.write, error handling, toast, cleanup, reconnect button | **3–5 hours** | WebSocket API, URL building from baseUrl, binary vs text handling, error states, cleanup on unmount. Testing: connect, type, disconnect, reconnect. |
| **Installer / deployment** | Manage SPA and host installers so all foreign components are fetched and installed; see §6.6.1 below | **3–6 hours** | SPA: ensure npm install + build includes xterm; docs/scripts. Host: add ttyd + nginx (or installer steps). |
| **Total** | All phases + installer | **16–28 hours** | **~2–3.5 days** full-time, or **~2–3 weeks** part-time (2–3h/day). Add 20–30% buffer for unexpected issues. |

**6.6.1 Installer / deployment (foreign components)**

We must manage the SPA installer (and any host/product installer) so that all **foreign components** required for the console are fetched and installed. That includes npm dependencies for the SPA and, on the host, ttyd (or a custom WebSocket+PTY service) and nginx config.

| Scope | Tasks | Estimated hours | Notes |
|-------|--------|-----------------|-------|
| **SPA build / install** | Ensure the SPA install process fetches and builds with xterm.js and addon-fit. Update package.json (done in Phase 1). Ensure install docs and any install/CI scripts run `npm install` and `npm run build` in pbx3spa; verify build succeeds and dist includes xterm assets. Update DEV_ENVIRONMENT or README if they list manual steps. | **1–2 hours** | Adding deps to package.json is part of Phase 1; this is verifying the **install pipeline** (whoever runs npm install/build) gets them. If there is a dedicated “SPA installer” script, add or adjust steps so it runs in pbx3spa and builds. |
| **Host / product installer** | If the product uses an installer (e.g. pbx3api `installer.sh`, or a combined pbx3+api+SPA installer): add steps to **install ttyd** (apt, or download binary, or build from source), **add nginx config** for the console WebSocket (e.g. location `/console-ws`, proxy to ttyd socket), and optionally **run ttyd as a service** (systemd unit or similar). Document any manual steps (e.g. “enable console: install ttyd, add nginx snippet”). | **2–4 hours** | Depends on whether a single installer exists and how it’s structured. pbx3api installer today does nginx + PHP-FPM + composer; it does not install the SPA or ttyd. So either: (a) extend that installer (or add a separate script) to install ttyd and drop an nginx snippet, or (b) document manual install of ttyd + nginx for console. |

**Deliverables:**

- **SPA:** Any process that builds the SPA (developer `npm install && npm run build`, or CI, or an installer that builds pbx3spa) runs in a tree that has `@xterm/xterm` and `@xterm/addon-fit` in package.json; build produces a dist that includes the console view and xterm assets.
- **Host:** Either the installer installs ttyd and configures nginx for `/console-ws`, or install docs clearly state how to install ttyd and add the nginx config so the console works after deployment.

**Risk:** If the SPA is deployed by copying a pre-built dist (e.g. from CI) and the installer never runs `npm install` on the client, then adding deps to package.json is enough (CI runs npm install before build). If some deployments build the SPA on the target machine, those must run `npm install` (and have Node/npm) so the new deps are fetched.

**Breakdown by complexity:**

- **Low complexity:** Phase 2 (API ticket) — standard Laravel controller pattern.
- **Medium complexity:** Phase 1 (SPA view) — xterm.js integration, Vue lifecycle, but well-documented.
- **Medium–high complexity:** Phase 4 (WebSocket) — async state, error handling, cleanup; WebSocket API is straightforward but requires careful lifecycle management.
- **Variable complexity:** Phase 3 (backend) — **ttyd + nginx:** medium (4–6h) if familiar with nginx proxy and Unix sockets; **custom service:** higher (6–8h) if building WebSocket + PTY from scratch.

**Risk factors that could add time:**

- **Nginx configuration:** If ticket validation requires custom auth module or complex subrequest logic, add 2–4h.
- **WebSocket protocol:** If backend uses binary frames or custom message format, add 1–2h for protocol handling.
- **Browser compatibility:** If testing across browsers reveals xterm.js rendering issues, add 1–2h.
- **Security hardening:** If additional security review/audit is required beyond the checklist, add 2–4h.

**Assumptions:**

- Developer has access to a test environment where ttyd/nginx can be configured.
- Developer is comfortable reading xterm.js docs and WebSocket API docs.
- Developer follows PANEL_PATTERN conventions (no time lost on “how should this look?”).
- Testing is manual (no automated tests written; add 4–6h if E2E tests are required).
- **Installer:** SPA is built via `npm install` + `npm run build` (in pbx3spa); host installer (if any) can be extended to install ttyd and nginx config, or manual steps are acceptable.

**Minimum viable (MVP):** Phase 1 + Phase 2 + Phase 3 (ttyd) + Phase 4 = **~13–17 hours** for a working console with basic error handling. **Installer / deployment** adds **3–6 hours** so new installs and existing installers fetch and install all foreign components (xterm via npm, ttyd + nginx on host). Polish (reconnect button, better error messages, Escape key handling) adds 2–3h.
