# SPA basics (for someone used to PHP client/server)

You’re familiar with **client/server with PHP**: browser requests a URL → server runs PHP → server sends back HTML (often with data baked in) → browser displays it. Form submit → server processes → redirect or render again. Each “action” usually means a **new request and a full new page**. Sessions live on the server (cookie = session ID).

An **SPA (Single-Page Application)** is different: the server sends **one HTML shell** and a **bundle of JavaScript** once; after that, **JavaScript** fetches data (usually JSON from an API), updates the page in place, and handles “navigation” without full reloads. This doc outlines how that works in practice — the details, not just the outline.

---

## 1. The big difference

| PHP client/server | SPA |
|-------------------|-----|
| Each URL often = different PHP script; server **renders HTML** and sends it. | One initial HTML + JS; **JS** fetches data (e.g. REST API) and **renders** the UI. |
| Form submit → **new HTTP request** → server processes → **new page**. | Form submit → **JS** sends request (e.g. `fetch`) → **JS** updates the page (no full reload). |
| “Routes” = server routes (e.g. Laravel `Route::get(...)`). | “Routes” = **client-side**; JS shows different “views” for different URLs (e.g. `/tenants`, `/extensions`). |
| Session = server-side; cookie holds session ID. | Often **no server session** for app logic; token (or session cookie if you use a BFF) lives in browser. |
| Logic and “templates” live on **server** (PHP, Blade). | Logic and “templates” live in **JS** (components, state). |

So: in an SPA, the **browser** is doing the job of “which page to show” and “get data and render it” — using JS and an API (e.g. pbx3api) instead of the server rendering HTML.

---

## 2. What actually loads in the browser

1. User goes to `https://your-app.com/` (or `/index.html`).
2. Server returns **one HTML file** (often almost empty), e.g.:
   ```html
   <!DOCTYPE html>
   <html>
     <head>...</head>
     <body>
       <div id="root"></div>
       <script src="/assets/app.js"></script>
     </body>
   </html>
   ```
3. Browser loads **app.js** (one or more “bundled” JS files). That JS:
   - Runs in the browser.
   - Renders the initial UI into `#root` (or similar).
   - Listens to the URL (e.g. `/tenants`, `/extensions/1000`) and shows the right “view”.
   - When it needs data, it calls **your API** (e.g. `GET https://pbx3-instance/api/tenants`) with `fetch` or similar, gets **JSON**, then updates the DOM (lists, forms, etc.).

So there is **no** “second HTML page” from the server when you “navigate” — only the **first** HTML + JS. “Navigation” is JS changing what’s inside the page and optionally the URL (History API).

---

## 3. Build step (why there’s a “bundler”)

- You write **many** files (components, utils, API client) and often **JSX** or **Vue templates** or similar. Browsers don’t natively run that.
- A **bundler** (e.g. Vite, Webpack) **builds** your project into one or a few **plain JS** (and CSS) files that the browser can run. You run something like `npm run build`; output goes into `dist/` or `build/`.
- In **development** you run `npm run dev`: the bundler serves the app and **hot-reloads** when you change code (no need to refresh by hand). So: edit file → save → browser updates.

So compared to PHP: you don’t just “upload .php files”; you have a **build step** that produces static files (HTML + JS + CSS) that you then deploy.

---

## 4. Main pieces of an SPA (in code terms)

**Framework / library**  
- **React**, **Vue**, or **Svelte** (and similar) give you:
  - **Components**: reusable bits of UI (e.g. `TenantList`, `ExtensionForm`) that render HTML from **data** (state/props).
  - **State**: when data changes (e.g. list from API, form input), the framework **re-renders** the right part of the page.
- You write components in **JS** (or TS); the framework turns them into DOM updates.

**Routing**  
- A **router** (e.g. React Router, Vue Router) maps **URL path** → **which component** to show.
- Example: path `/tenants` → show `TenantList`; path `/extensions/:id` → show `ExtensionDetail` with `id` from the URL. So “routes” are **client-side**: no server round-trip for navigation, just JS swapping views.

**API client**  
- You use **fetch** or **axios** (or similar) to call your API (e.g. pbx3api).
- Typical flow: user opens “Tenants” → component mounts → JS runs `fetch(baseUrl + '/api/tenants', { headers: { Authorization: 'Bearer ' + token } })` → get JSON → put it in **state** → component re-renders with the list.
- So “get data and show it” is: **JS** does the request, **JS** stores the result, **JS** renders the UI. No server-rendered HTML.

**State**  
- **Local state**: one component’s data (e.g. form fields, “loading” flag). Component re-renders when that state changes.
- **Global state** (optional): shared across many components (e.g. “current user”, “current instance URL”, “Bearer token”). Often kept in a small store (e.g. React Context, or Zustand, or Pinia in Vue) or passed down from a top-level “app” component.
- For PBX3 admin: you’ll have at least “instance base URL” and “Bearer token” (or “logged in?”) in global state (or a BFF session), and then per-page data (e.g. list of tenants) in local or page-level state.

**Auth flow (SPA calling API directly)**  
- User enters instance URL + email/password.
- SPA sends `POST {instanceUrl}/auth/login` with body `{ email, password }`.
- API returns something like `{ token: "1|..." }`.
- SPA stores the token (e.g. in memory or sessionStorage) and **base URL**.
- For every later request: SPA adds header `Authorization: Bearer {token}` and calls `{baseUrl}/api/tenants`, etc. All of this is **in JavaScript** in the browser.

---

## 5. Request flow: one example

**PHP style:**  
User goes to `/tenants` → server runs `TenantsController@index` → Laravel queries DB (or API), passes data to Blade → server sends HTML → browser displays it.

**SPA style:**  
User goes to `/tenants` (or clicks “Tenants”).  
1. **Router** (in JS) says “path is /tenants → render `TenantList`”.  
2. `TenantList` component **mounts**; in its “effect” or “useEffect” it runs:  
   `fetch(baseUrl + '/api/tenants', { headers: { Authorization: 'Bearer ' + token } })`.  
3. **Browser** sends request to pbx3api (or your BFF).  
4. Response (JSON) comes back.  
5. JS puts it in state: `setTenants(data)`.  
6. Component **re-renders**; it now has `tenants` and draws a table.  
No full page load; the “page” is whatever the component renders.

---

## 6. Deployment

- **Build** produces static files: `index.html`, `app.[hash].js`, `main.[hash].css` (and maybe more chunks).
- You put these on **any static host**: Nginx, Apache, S3 + CloudFront, Netlify, Vercel, etc. The server only needs to **serve files**; it doesn’t run PHP or your app logic.
- **Routing gotcha:** If the user goes directly to `https://your-app.com/tenants` (or refreshes there), the server must serve **the same** `index.html` for that path (so the JS can load and the **client-side** router can show `/tenants`). So you configure the server: “for any path, serve index.html” (or similar). That’s the only “server config” that feels a bit different from “one URL = one PHP file”.

---

## 7. Quick glossary (PHP → SPA)

| PHP / server world | SPA world |
|--------------------|-----------|
| Route (Laravel) | Client-side route (React Router, etc.) → which component to show |
| Controller action | Component + effect/hook that fetches and sets state |
| Blade template | JSX / Vue template / Svelte markup inside a component |
| Session (server) | Token in memory/sessionStorage, or BFF session (cookie) |
| Redirect | Router push (e.g. `navigate('/tenants')`) |
| Form POST → redirect | `fetch(POST)` → then set state or `navigate(...)` |
| Config (.env on server) | Env vars at **build** time (e.g. `import.meta.env`) or runtime (e.g. user enters API base URL) |

---

## 8. Summary

- **SPA** = one HTML shell + one (or a few) JS bundles; **JS** is responsible for routing, fetching data (API), and rendering the UI. No full page reloads for navigation or form posts.
- **Build step** turns your component tree and code into static JS/CSS/HTML that you deploy.
- **API** (e.g. pbx3api) is called **from the browser** via fetch/axios; **no** server-rendered HTML from that API — only JSON. So the “backend” for the SPA is the API; there is no PHP in the middle unless you add a BFF/proxy.
- If you’re used to PHP: “controller + view” becomes “component + state + API call”; “session” becomes “token (or BFF session)”; “route” becomes “client-side route → component”.

This should be enough detail to reason about how an SPA would work for the PBX3 admin UI and how it differs from a PHP client/server app. For more, the next step is a small tutorial in the framework you pick (e.g. React + React Router + fetch) and then map “tenants list” and “login” to the flow above.
