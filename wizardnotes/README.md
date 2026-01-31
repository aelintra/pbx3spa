# Working notes – sail-6

This folder holds planning notes and artefacts for the sail-6 repo (admin panels and related logic under `opt/sark/php`). Use it to:

- Store analysis and diagrams
- List findings, TODOs, and follow-up tasks
- Keep notes for later refactors or documentation

**Root:**

- `00-admin-panels-overview.md` – First-pass overview of admin panels, entry point, shared infra, and panel list.

**Panel analysis (each in its own folder):**

Each panel has a folder with the same analysis set: add-flow analysis, flowcharts, and an agent brief for SPA replacement.

| Folder       | Panel        | Contents |
|-------------|--------------|----------|
| **extension/** | sarkextension | `add-wizard.md` – Add-extension form, saveNew, addNewExtension, per-type behaviour, JS show/hide, possible bugs. `flowchart.md` + `flowchart.html` – Logic flowcharts. `agent-brief-spa.md` – Instructions for SPA: single form + conditional UI + one create API. |
| **trunk/**     | sarktrunk     | `add-wizard.md` – Add-trunk form, saveNew switch, saveSIPreg/saveSIPdynamic/saveSIPsimple/saveIAX/saveSibling, copyTemplates, JS show/hide, possible bugs (IAX2 vs GeneralIAX2). `flowchart.md` + `flowchart.html`. `agent-brief-spa.md`. |
| **ivr/**       | sarkivr       | `add-wizard.md` – Add-IVR form (ivrname, cluster, description), saveNew, createTuple ivrmenu; possible bug ($tuple in showNew). `flowchart.md` + `flowchart.html`. `agent-brief-spa.md`. |
| **ddi/**       | sarkddi       | `add-wizard.md` – Add-DDI form (chooserDiD DiD/CLID, trunkname, didnumber/clinumber, smartlink), saveNew switch saveDiD/saveCLI, span loop, smartlink; possible bugs. `flowchart.md` + `flowchart.html`. `agent-brief-spa.md`. |

Within each panel folder:

- **add-wizard.md** – Legacy PHP behaviour, form fields, validation, per-type logic, files involved, possible bugs.
- **flowchart.md** – Mermaid flowcharts of add-flow logic.
- **flowchart.html** – Same flowcharts in a single HTML file (open in browser to view).
- **agent-brief-spa.md** – Agent brief: API contract, client behaviour, visibility rules, checklist for implementing the create flow in a modern SPA.
