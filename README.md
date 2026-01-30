# pbx3-frontend

Management (admin) UI for PBX3. This application is the front-end that operators use to configure and operate PBX3 systems.

## Architecture

- **pbx3-frontend** runs as a separate application (e.g. in the browser or as a hosted dashboard).
- Each **PBX3 instance** runs its own **pbx3api** (Laravel REST API) colocated on that instance.
- This frontend communicates with **pbx3api** over HTTPS to manage PBX3 instances. There is no single central API: the frontend connects to the API of whichever PBX3 instance(s) it is managing.
- Typical use: an operator selects or configures a PBX3 instance (by its pbx3api base URL), authenticates against that instance’s API (e.g. login → Bearer token), then uses the UI to manage that instance (extensions, trunks, queues, IVRs, system commands, etc.).

## Related repos (this workspace)

| Repo           | Role |
|----------------|------|
| **pbx3**       | Backend worker on each PBX3 instance (Asterisk, config generation, etc.). No web UI; driven via API. |
| **pbx3api**    | REST API colocated on every PBX3 instance. This frontend talks to pbx3api to manage the instance. |
| **pbx3-frontend** | This repo — the management/admin provider for PBX3. |

## API documentation

A full description of the API (methods, auth, and all resources) is in **pbx3api/docs**:

| Doc | Contents |
|-----|----------|
| **api.md** | Request/response conventions: GET/POST/PUT/DELETE, request notation, HTTP status codes, JSON bodies. |
| **auth.md** | Authorization: Laravel Sanctum, login/logout, Bearer token, whoami, users (admin), register, revoke. |
| **general.md** | API digest: endpoints and request bodies for agents, backups, class of service (cosrules/cosopens/coscloses), custom apps, day/holiday timers, destinations, extensions, firewalls, greetings, inbound routes, IVRs, logs/CDRs, queues, snapshots, routes, system commands, sysglobals, tenants, trunks, templates, and Asterisk AMI/AstDB. |
| **index.md** | Introduction, background, and requirements (pbx3 V65, PHP 8.2+, Laravel 11). |

When building the frontend, use **pbx3api/docs** as the source of truth for all endpoints and payloads.
