# List export (PDF / CSV) – how to produce them

**Context:** Replace sarkreport with “Export” on each list panel. Export = current filtered/sorted list as PDF or CSV. This doc recommends how to generate PDFs and CSVs.

**Pattern:** When adding a **new main list panel**, optionally include Export CSV and Export PDF following the same approach. See **PANEL_PATTERN.md** § “Optional: List export (CSV / PDF)” for when to add it and the step-by-step (SPA toolbar, export columns, API route + controller + Blade view).

---

## CSV

**Recommendation: produce in the SPA (client-side).**

- The list data is already in the client (extensions, filtered/sorted).
- Build a CSV string from the visible columns (or a fixed set), create a `Blob`, trigger download with a temporary `<a download="extensions.csv">` (or `URL.createObjectURL` + click).
- **No backend change.** Same list response as today; no new API.
- Works with current filter/sort because we export exactly what’s on screen (the in-memory list).
- For typical PBX sizes (hundreds to low thousands of rows), client-side is fine. If we later need CSV for very large datasets (e.g. CDR), we can add a streaming CSV endpoint.

**Implementation:** Small util (e.g. `exportListToCsv(rows, columns)`) + “Export CSV” button in the list toolbar. Columns = list of `{ key, label }`; escape commas and quotes in cell values.

---

## PDF

**Two options.**

### Option A: Backend (Laravel + dompdf) — **recommended for PDF**

- **Library:** [dompdf](https://github.com/dompdf/dompdf) (PHP, open source). In Laravel the usual wrapper is [barryvdh/laravel-dompdf](https://github.com/barryvdh/laravel-dompdf).
- **Flow:** New endpoint e.g. `GET /extensions/export/pdf?cluster=...&...` (same query params as the list). Controller fetches extensions (reuse list logic), renders an HTML view (Blade or simple HTML string) with a table, passes HTML to dompdf → returns `application/pdf`.
- **Pros:** One consistent report layout; easy to add headers/footers, page breaks, “Generated at …”; no extra SPA bundle; same pattern for Queues, Trunks, etc. Familiar legacy SARK server-side PDF approach.
- **Cons:** Requires backend work and a small Blade/HTML template per resource (or one parameterised template).

### Option B: Frontend (SPA + jsPDF)

- **Libraries:** [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) (open source).
- **Flow:** “Export PDF” in the list view builds a PDF from the current in-memory list (same data as CSV), triggers download. No new API.
- **Pros:** No backend change; “what you see” = what you export; single place (SPA) for export behaviour.
- **Cons:** Larger SPA bundle; table layout (columns, page breaks) is more manual; if list is huge, building in the browser can be slower than server-side streaming.

---

## Recommendation summary

| Format | Where to produce | Notes |
|--------|-------------------|--------|
| **CSV** | SPA (client-side) | From current list data; no API; small util + toolbar button. |
| **PDF** | API (Laravel + dompdf) | New GET …/export/pdf per resource; Blade/HTML table → PDF; consistent layout, reusable. |

**Order of implementation for Extensions:**  
1. Add **Export CSV** in the SPA (util + button on Extensions list).  
2. Add **Export PDF** via API (dompdf + Blade view) and a toolbar button that opens or downloads the PDF (e.g. `window.open(apiUrl)` or fetch + Blob download).

If you prefer to avoid backend for PDF in the first iteration, we can use **Option B (jsPDF)** for PDF and add dompdf later when we want a shared report layout across resources.
