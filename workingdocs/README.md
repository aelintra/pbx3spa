# workingdocs

This folder is **for the AI (Cursor agent)** to record progress and build a memory of the pbx3spa system. When you start a new chat, read the files here to get up to speed. **Start with SESSION_HANDOFF.md** and **PROJECT_PLAN.md § "Current state (for the next chat)"** to see what's done, what's left, and what's planned next. **For extension provisioning (next priority):** read **EXTENSION_PROVISIONING_QUICKSTART.md** then the deployment plan. **For technical debt reduction and panel pattern conversion**, start with **AGENT_HANDOFF_TECHNICAL_DEBT.md** and **PANEL_REFACTOR_STRATEGY.md**. **pbx3/full_schema.sql** is the schema yardstick for API models/controllers.

**Naming note (2026-02-12):** Repo/component name changed from `pbx3-frontend` to `pbx3spa`. Docs and package metadata were updated to match.

## Contents

| File | Purpose |
|------|---------|
| **PLAN.md** | Plan, design & build: PBX3 context, scope, architecture options, Bearer token security, chosen stack (Vue), references. |
| **PROJECT_PLAN.md** | Discrete job steps (Vue stack): scaffold → API client → auth → login → layout → Tenants/Extensions list → …; test, sign off, commit per step. Default after login is the dashboard (Home). |
| **DEV_ENVIRONMENT.md** | Running the Vue stack in Cursor on macOS: Node/npm, npm install, npm run dev, browser, hot reload. |
| **UX_APPROACH.md** | How we deal with UX: when (upfront vs per-step), principles, key flows, screen outlines, tie to job steps; optional wireframes/checklist. |
| **SPA_BASICS.md** | SPA in detail for someone used to PHP client/server: how it works, build step, routing, state, API client, auth flow, deployment, glossary. |
| **STACK_CHOICE.md** | Vue vs Svelte/React/Alpine for "easiest to grasp" from HTML/JS/CSS; recommendation: Vue 3 + Vue Router + Pinia + Vite. |
| **DEPLOYMENT_BASICS.md** | How SPA apps are stored and served in production: what you deploy (static files), where they live (server vs S3+CloudFront vs Netlify/Vercel), publish/manage mechanism. |
| **SYSTEM_CONTEXT.md** | Short memory: PBX3 in one paragraph, what we're building, key references. |
| **PANEL_PATTERN.md** | Reusable List / Create / Detail pattern for resource panels (Extensions, Trunks, Queues, etc.); routes, views, CSS classes, conventions. |
| **PANEL_REFACTOR_STRATEGY.md** | Technical debt plan: Phase 1–4, shared normalizeList/DeleteConfirmModal, resource-specific config; suggested order; checklist. |
| **AGENT_HANDOFF_TECHNICAL_DEBT.md** | Handoff for new agent: current status, which panels use shared pieces, next steps, key files. Use when continuing debt reduction or panel conversion. |
| **BOOLEAN_STANDARDISATION.md** | Plan and fixer to standardise boolean columns to YES/NO; create migration in pbx3api when ready (none in repo yet). |
| **SESSION_HANDOFF.md** | Where we left off: done, left to do, references. **Next priority:** Extension provisioning (plan finalised; see EXTENSION_PROVISIONING_QUICKSTART.md). |
| **EXTENSION_PROVISIONING_QUICKSTART.md** | Start here for extension provisioning: read order, key files, implementation order. |
| **EXTENSION_PROVISIONING_DEPLOYMENT_PLAN.md** | Full plan (schema, API, frontend, Save vs Commit); §8 Build readiness, §5 Implementation order. |
| **DATABASE_CHANGES_FOR_PROVISIONING.md** | Exact DB changes for provisioning (user applies manually; PBX3 has no Laravel migrations). |
| **OLD_SYSTEM_EXTENSION_CREATE_REFERENCE.md** | How the legacy system did extension create and Save/Commit. |
| **EXTENSION_PROVISIONING_ISSUES.md** | Known fixes and decisions (getVendorFromMac, adjustAstProvSettings, etc.). |
| **HOLISTIC_ASSESSMENT.md** | UX, fitness for purpose, and approach (DB → generator → Asterisk); alternatives considered. |
| **TRUNK_ROUTE_MULTITENANCY.md** | Trunk/route ownership (collective vs private), allocation, migration mechanics, first cut; read when working on trunks, outbound routes, or tenant migration. |
| **README.md** | This file. |

## Folder structure

| Path | Role |
|------|------|
| **pbx3-master** | Placeholder folder; **not a git repo**. Contains the four repos below. |
| **pbx3** | System backend (Asterisk, SQLite, config generation, etc.). |
| **pbx3api** | Backend API; what the frontend calls. Tenant-scoped pattern doc and Cursor rule live here. |
| **pbx3cagi** | (Repo.) |
| **pbx3spa** | Vue SPA admin UI; current work is here (own git repo, root is `pbx3spa/`). |

## Context in one sentence

PBX3 = vanilla Asterisk with an API in front; SQLite for persistence; a generator builds Asterisk config from the DB; the admin frontend we are building talks only to the API to manage PBX3 instances.
