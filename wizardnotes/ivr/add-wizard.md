# IVR Add Procedure – sarkivr

**Scope:** Creating a new IVR via the sarkivr panel.  
**Location:** `sail-6/opt/sark/php/sarkivr/`

---

## 1. How you get to “New IVR”

- From the IVR list, user clicks **New** (action bar). Request has `new=1` (GET or POST).
- In `showForm()` (view.php): `if (isset($_POST['new']) || isset($_GET['new'])) { $this->showNew(); return; }`
- Flow: **show New form → user fills fields → Submit → saveNew() → showEdit()** (or showNew again if validation fails). Single form; no type chooser and no conditional fields.

---

## 2. New IVR form (showNew)

- **Entry:** `showNew()` in view.php (lines ~168–217).
- **Fields (all visible, no chooser):**
  - **ivrname (pkey):** Text input – IVR name (primary key).
  - **cluster:** Cluster selector (displayCluster). **Note:** Code sets `$this->myPanel->selected = $tuple['cluster']` but `$tuple` is never set in showNew(); likely bug – should be a default (e.g. `'default'`) or from POST.
  - **description:** Text input.
- **Buttons:** Cancel, Save (endsave).
- No JavaScript show/hide for the create form; IVR create is a simple single-form flow.

---

## 3. Front-end behaviour (javascript.js)

- No conditional visibility for the “New IVR” form. JS handles:
  - IVR key toggles on the **edit** page (ivrBoolean classes).
  - DataTable for the IVR list (ivrtable); makeEditable with empty aoColumns (no inline edit).
- Form submits to same page (POST); create is handled in view.php (saveNew), not update.php.

---

## 4. Submit and validation (saveNew)

- **Trigger:** `if (isset($_POST['save']) || isset($_POST['endsave']))` in showForm() → `saveNew()`.
- **Flow:** saveNew() validates pkey (IVR name) required via FormValidator; if valid, builds tuple from POST via `$this->helper->buildTupleArray($_POST, $tuple)` and calls `createTuple("ivrmenu", $tuple)`. On success → showEdit() (using saveKey); on failure → showNew() with errors.

### Validation (saveNew)

- FormValidator: pkey (IVR name) required.
- buildTupleArray: copies POST fields into $tuple (excluding buttons etc.); ivrmenu columns come from POST (pkey, cluster, description, and any other form fields that map to ivrmenu).

### After create

- On success, `$this->saveKey = $tuple['pkey']` so showEdit() can load the new IVR by pkey.
- showForm() calls showEdit() after saveNew() when !invalidForm.

---

## 5. Files involved

| File          | Role |
|---------------|------|
| view.php      | showForm() routing; showNew() form; saveNew() validation and createTuple("ivrmenu"); showEdit(). |
| javascript.js | IVR key toggles on edit; DataTable for list (no create-form show/hide). |
| main.php      | Includes srkmain (standard panel entry). |
| update.php    | Inline edit of IVR table (if used). |

---

## 6. Possible bugs / follow-ups

1. **showNew():** `$this->myPanel->selected = $tuple['cluster']` – `$tuple` is undefined in showNew(). Should be e.g. `'default'` or from a default cluster.
2. **buildTupleArray:** Confirm which POST keys map to ivrmenu columns (pkey, cluster, description at minimum).

---

## 7. Database touched (create flow)

- **Read:** None required for create (optional: cluster list for display).
- **Write:** ivrmenu (insert one row). pkey = ivrname.

---

*Working notes – IVR add flow for SPA replacement planning.*
