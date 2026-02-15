# Auth patterns — rules for agents

**Purpose:** Single reference for auth and identity so future work does not break 2FA, self-service registration, or centralized/federated auth. **Do not freelance:** when touching login, tokens, whoami, or route guards, follow these patterns.

**Reference:** **PERMISSIONS_MINIMAL_DEPLOY_PLAN.md** (rollout); **ADMIN_PANELS_AND_PERMISSIONS.md** (abilities, areas).

---

## 1. Core contract (do not break)

- **SPA:** The app assumes only: (1) we have a **Bearer token**, (2) **whoami** (or equivalent) returns the current **user** and **abilities**. Nothing else about auth is assumed.
- **Do not** hard-code that the token must be issued by the same host as the API (`baseUrl`). Today we get the token via `POST baseUrl + '/auth/login'` — that is where we get it, not a requirement that issuer and API host are the same.
- **Do not** use the login response as the source of truth for user or abilities. **Whoami** is the source of truth after any successful auth. The rest of the app (guards, `can()`, nav) depends on whoami (or the same shape), not on the login response body.
- **API:** The ability model (token carries abilities; middleware checks abilities; whoami returns user + abilities) is stable. Who issues or validates the token can change (instance today, central later); the shape of whoami and the use of abilities in middleware should stay consistent.

---

## 2. 2FA / login modernization (later)

- **Do not assume** login is a single round-trip. The API may later return a different shape (e.g. `requires_2fa`, challenge id); the SPA will need an extra step (e.g. 2FA code screen) before the final token is issued.
- Keep **login logic in one place** (e.g. LoginView or a small auth helper) so 2FA can be added there without touching the rest of the app.
- **Do not** cache or assume “user never needs 2FA” or that abilities exist only in the login response. We use whoami as the source of truth; the token is created only after full auth (including 2FA when enabled).

---

## 3. Self-service registration (later, maybe)

- **Do not preclude** a future public “Sign up” flow. Use an **explicit allow-list of public routes** (e.g. `['/login']`) that require neither login nor admin. Adding `/register` (or `/signup`) later must be a one-line addition to that list.
- Admin user creation (e.g. POST `auth/register` with abilities) stays separate from any future self-service endpoint (e.g. unauthenticated sign-up with default abilities and different validation). Do not lock the API so that only admins can ever create users; keep the option for a separate public registration path.

---

## 4. Centralized auth / federated superuser (later)

- This is a **federated system** of PBX instances. A future “superuser” layer may let admins see all instances, with a **centralized auth service** that every instance trusts.
- **Do not** implement auth in a way that assumes the token is always issued by the same host as the API. The SPA only needs: a token and whoami returning user+abilities. You can later:
  - **Gateway:** Point `baseUrl` at a gateway that does login against central auth and proxies to instances; instances validate the token with the gateway/central. SPA unchanged.
  - **Split login and API:** SPA obtains the token from a central auth endpoint (e.g. OAuth2/OIDC), then sends that token to each instance (or gateway). Instances validate the token against central. SPA would need a configurable “auth origin” for login; the rest (store token, whoami, `can()`) stays the same.
- **API:** The token can be issued by Sanctum today and by a central service later. Each instance (or a gateway) only needs to resolve the token to user and abilities and expose whoami in the same shape. Adopting centralized auth is about **who issues and validates the token**, not about changing the ability/permission model.

---

## 5. Summary for agents

| Area | Do | Do not |
|------|----|--------|
| **Contract** | Treat “Bearer token + whoami → user, abilities” as the only auth contract. | Assume token issuer = API host; use login response for user/abilities. |
| **Login** | Keep login flow in one place; allow for multi-step (e.g. 2FA) later. | Assume single round-trip; cache “no 2FA.” |
| **Guards** | Use an explicit public-routes allow-list (e.g. `['/login']`). | Hard-code only `/login`; assume no other public routes will exist. |
| **User creation** | Keep admin creation separate from any future self-service path. | Lock the API so only admins can ever create users. |
| **Federation** | Keep contract abstract; token + whoami shape is stable. | Assume token is always issued by the instance API. |

When in doubt, preserve the contract and the whoami shape; keep login and public routes easy to extend.
