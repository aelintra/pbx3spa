# workingdocs

This folder is **for the AI (Cursor agent)** to record progress and build a memory of the pbx3-frontend system. When you start a new chat, read the files here to get up to speed. **Start with PROJECT_PLAN.md § "Current state (for the next chat)"** and **SESSION_HANDOFF.md** to see what's done, what's left, and what's planned next. **pbx3/full_schema.sql** is the schema yardstick for API models/controllers.

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
| **BOOLEAN_STANDARDISATION.md** | Plan and fixer to standardise boolean columns to YES/NO; create migration in pbx3api when ready (none in repo yet). |
| **SESSION_HANDOFF.md** | Where we left off: done, left to do, references. |
| **README.md** | This file. |

## Context in one sentence

PBX3 = vanilla Asterisk with an API in front; SQLite for persistence; a generator builds Asterisk config from the DB; the admin frontend we are building talks only to the API to manage PBX3 instances.
