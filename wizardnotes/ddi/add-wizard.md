# DDI Add Procedure – sarkddi

**Scope:** Creating new DDI/CLID entries via the sarkddi panel.  
**Location:** `sail-6/opt/sark/php/sarkddi/`

---

## 1. How you get to “New DiD”

- From the DDI list, user clicks **New** (action bar). Request has `new=1` (GET or POST).
- In `showForm()` (view.php): `if (isset($_POST['new']) || isset($_GET['new'])) { $this->showNew(); return; }`
- Flow: **show New form → user picks route type (DiD or CLID) and fills type-specific fields → Submit → saveNew() → showMain()** (list). On validation error → showNew() again. One form with conditional fields driven by the route type dropdown; no multi-step wizard.

---

## 2. New DDI form (showNew)

- **Entry:** `showNew()` in view.php (lines ~185–248).
- **Route type chooser:** Dropdown `chooserDiD` with options: `Choose a route type`, `DiD`, `CLID`.
- **Hidden field:** `carrier` – set by JS from chooser value when user picks a type (so server receives `DiD` or `CLID`).
- **Conditional fields (hidden until type chosen):**

| Div ID        | Shown when | Content |
|---------------|------------|--------|
| divtrunkname  | DiD, CLID  | Trunk name (trunkname). |
| divdidnumber  | DiD only   | DiD number(s) (didnumber). Can be single number or `number/span` for range (e.g. 5551234/10). |
| divclinumber  | CLID only  | CLID number (clinumber). |
| divsmartlink  | DiD only   | Smartlink (commented in form; shown by JS for DiD). |

- **Always shown:** cluster selector (default `'default'`).
- **Buttons:** Cancel, Save (endsave). JS hides endsave until chooser is changed; after type selected, chooser is disabled and greyed.

---

## 3. Front-end behaviour (javascript.js)

- On load: hide divtrunkname, divdidnumber, divclinumber, divsmartlink, endsave.
- On `#chooserDiD` change:
  - Disable chooser and set background light grey.
  - Show endsave.
  - **DiD:** show divtrunkname, divdidnumber, divsmartlink.
  - **CLID:** show divtrunkname, divclinumber.
  - Set hidden `#carrier` to chooser value: `$("#carrier").val($(this).val())`.
- Form submits to same page (POST); create is handled in view.php (saveNew).

---

## 4. Submit and validation (saveNew)

- **Trigger:** `if (isset($_POST['save']) || isset($_POST['endsave']))` in showForm() → `saveNew()`.
- **Flow:** saveNew() switches on `$_POST['carrier']` (DiD or CLID) and calls saveDiD($tuple) or saveCLI($tuple). Each validates and builds $tuple. If !invalidForm, optional smartlink logic (for DiD), then a loop: createTuple("lineio", $tuple) up to `$this->span` times (span = 1 for single DID/CLID, or from didnumber/span for DiD range). pkey is incremented each iteration (with leading zeros preserved). On success → showMain() (list); on failure → showNew() with errors. **Note:** Success does not navigate to showEdit(); user sees the list.

### Switch on carrier

| carrier (POST) | Handler   | Notes |
|----------------|-----------|--------|
| DiD            | saveDiD   | DiD number(s); can be range (number/span). |
| CLID           | saveCLI   | CLID number + trunkname. |
| default        | return    | No create. |

---

## 5. saveDiD (DiD)

- **Validation:** didnumber required. Custom: DiD cannot contain both `_` and `/` (class and span). Parse didnumber: split by `/`; first part = pkey (leading zeros preserved); if second part present, it must be numeric = span (max 100); first part must be numeric for range.
- **Tuple:** pkey (from first part of didnumber), cluster from POST, trunkname, carrier = DiD, technology = DiD. If smartlink = YES, $this->smartlink = true (used later in saveNew loop to set openroute/closeroute from extension derived from pkey suffix).
- **Span:** If didnumber is `number/span`, $this->span = span; else span = 1. Loop in saveNew() creates span rows: pkey, pkey+1, … with str_pad to keep length.

---

## 6. saveCLI (CLID)

- **Validation:** clinumber required, trunkname required.
- **Tuple:** pkey = clinumber (strip_tags); cluster, trunkname, carrier = CLID, technology = CLID. Single row (span = 1 effectively).

---

## 7. saveNew() loop and smartlink

- After saveDiD or saveCLI, if !invalidForm:
  - If smartlink (DiD only): load EXTLEN from globals; get user cluster; for each iteration, extkey = last EXTLEN chars of tuple pkey; lookup ipphone by extkey; if found and (user cluster matches or admin), set openroute/closeroute to that extension and routeclass; else default to Operator/100.
  - Loop i = 0 to span-1: createTuple("lineio", $tuple). On error break. Else increment countkey and set tuple['pkey'] = str_pad(countkey, len, 0, STR_PAD_LEFT) for next iteration.
- **Note:** Typo in legacy: `$this->error_hash[trunk]` should be `$this->error_hash['trunk']` (quoted key).

---

## 8. Files involved

| File          | Role |
|---------------|------|
| view.php      | showForm() routing; showNew() form; saveNew() switch, saveDiD(), saveCLI(), loop createTuple("lineio"). |
| javascript.js | Show/hide divs by chooserDiD; set carrier from chooser; DataTable for list. |
| main.php      | Includes srkmain. |
| update.php    | Inline edit of DDI/lineio (if used). |

---

## 9. Possible bugs / follow-ups

1. **error_hash key:** `$this->error_hash[trunk]` should be `$this->error_hash['trunk']` (or similar) so the key is a string.
2. **Success flow:** After create, showForm() does not call showEdit(); it falls through to showMain(). So user always returns to the list, not to edit. Confirm if intentional.

---

## 10. Database / globals touched (create flow)

- **Read:** globals (EXTLEN for smartlink); user (cluster); ipphone (for smartlink); Carrier table implied by lineio.carrier (DiD, CLID).
- **Write:** lineio (insert one or more rows). carriertype DiD/CLID; pkey = number(s).

---

*Working notes – DDI add flow for SPA replacement planning.*
