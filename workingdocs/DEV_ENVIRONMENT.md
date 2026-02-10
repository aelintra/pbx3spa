# Running the Vue stack in Cursor on macOS

How to run the PBX3 admin frontend (Vue 3 + Vite + Vue Router + Pinia) in the Cursor dev environment on macOS.

---

## 1. Prerequisites

- **Node.js** (includes **npm**). Vue and Vite run on Node; no PHP or other runtime needed.
- **macOS:** Node is not installed by default. Install one of:
  - **Homebrew:** `brew install node` (then `node -v` and `npm -v` to confirm).
  - **Official installer:** [nodejs.org](https://nodejs.org/) (LTS).
  - **nvm (Node Version Manager):** `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash` then `nvm install --lts` (useful if you need multiple Node versions).

Vite typically supports Node 18+. Check with `node -v` (e.g. `v20.x` or `v22.x` is fine).

---

## 2. Open the project in Cursor

- Open your workspace (e.g. the folder that contains `pbx3-frontend` and `pbx3api`), or open `pbx3-frontend` directly.
- The Vue app will live under **pbx3-frontend/** (once we create it in Step 1). All commands below run from that directory.

---

## 3. Install dependencies (first time, or after pull)

From the **pbx3-frontend** directory in the terminal:

```bash
cd pbx3-frontend
npm install
```

This reads **package.json** and installs Vue, Vite, Vue Router, Pinia, and other dependencies into **node_modules/**. You don’t commit **node_modules/**; it’s in **.gitignore**.

---

## 4. Run the dev server

From **pbx3-frontend**:

```bash
npm run dev
```

- **Vite** starts a local dev server (usually **http://localhost:5173**).
- The terminal shows the URL (e.g. `Local: http://localhost:5173/`).
- **Open that URL in your browser** (Chrome, Safari, Firefox). Cursor doesn’t run the app inside the editor; the app runs in the browser. You can use Cursor’s integrated terminal to run the command and keep it running.
- **Hot reload:** When you save a file, Vite rebuilds and the browser updates automatically (no full refresh needed in most cases).

To stop the server: **Ctrl+C** in the terminal.

---

## 5. Cursor-specific notes

- **Terminal:** Use Cursor’s integrated terminal (`` Ctrl+` `` or View → Terminal). Run `npm run dev` there; leave it running while you edit code.
- **Browser:** Open http://localhost:5173 in your normal browser (Cursor doesn’t embed a browser by default). You can use a “Simple Browser” or “Live Preview” style extension if you want a pane inside Cursor, but it’s optional.
- **No special “run” config required:** For a Vite app you don’t need a launch.json or task config to start; `npm run dev` in the terminal is enough.
- **Workspace:** If your workspace root is **pbx3-master** (with pbx3-frontend and pbx3api inside), open the terminal and `cd pbx3-frontend` before `npm install` / `npm run dev`. You can set the terminal’s default cwd in settings if you like.

---

## 6. Dev proxy (self-signed API certs)

If the PBX3 API uses a **self-signed certificate**, the browser blocks direct requests with `ERR_CERT_AUTHORITY_INVALID`. The Vite dev server **proxies** `/api` to your instance so the browser only talks to localhost (no cert error).

- **Restart** the dev server after changing the proxy target.
- Use **base URL** `http://localhost:5173/api` (same origin as the app) when logging in or setting credentials. Requests to `/api/*` are forwarded to the real API.
- **Proxy target** defaults to `https://192.168.1.205:44300`. To use another instance, set **VITE_API_PROXY_TARGET** in `.env.development` (e.g. `VITE_API_PROXY_TARGET=https://other-host:44300`).

### 6a. Two “targets” — proxy vs login (don’t forget)

There are two different places that refer to “which PBX3 instance” the app talks to. They do **not** override each other; they play different roles.

| What | Where it’s set | What it does |
|------|----------------|--------------|
| **VITE_API_PROXY_TARGET** | `.env.development` (fallback in `vite.config.js`) | Tells the **Vite dev server** where to **proxy** requests when the browser calls `http://localhost:5173/api/...`. |
| **SPA base URL** | **Login screen** → stored in auth store (`auth.baseUrl`) and sessionStorage (`pbx3_baseUrl`) | Tells the **browser** where to send API requests (the URL the app actually calls). |

**How they interact:**

- If the user logs in with base URL **`http://localhost:5173/api`** (the dev default): the browser sends all API requests to the dev server; the dev server then forwards them to **VITE_API_PROXY_TARGET**. So the real PBX3 instance is the one in `.env.development`.
- If the user logs in with a **direct** URL (e.g. `https://192.168.1.150:44300/api`): the browser sends requests straight to that host. The proxy is not used; **VITE_API_PROXY_TARGET** is irrelevant for those requests.

So: the SPA base URL (login) decides **where the browser sends the request**. Only when that is `http://localhost:5173/api` does the proxy (and thus **VITE_API_PROXY_TARGET**) come into play. To point at a different instance during dev without the user typing a new URL at login, change **VITE_API_PROXY_TARGET** in `.env.development` and restart the dev server; keep using `http://localhost:5173/api` at login.

---

## 7. Other useful commands (from pbx3-frontend)

| Command | Purpose |
|--------|--------|
| `npm run dev` | Start Vite dev server (hot reload). |
| `npm run build` | Production build; output in **dist/** (or **build/**). |
| `npm run preview` | Serve the production build locally (e.g. http://localhost:4173) to test before deploy. |

---

## 8. Summary

1. Install **Node.js** (and npm) on macOS if needed.
2. Open the project in **Cursor**; terminal at **pbx3-frontend**.
3. **`npm install`** once (or after dependency changes).
4. **`npm run dev`** to start the app; open **http://localhost:5173** in your browser.
5. Edit files; browser updates automatically. Stop with **Ctrl+C** in the terminal.

No PHP, no separate “backend” process for the frontend — just Node for the build and dev server, and the browser for the app. The app will talk to pbx3api (e.g. https://192.168.1.205:44300) from the browser once we add the API client and login.
