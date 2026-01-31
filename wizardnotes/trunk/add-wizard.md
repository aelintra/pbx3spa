# Trunk Add Procedure – sarktrunk

**Scope:** Creating a new trunk via the sarktrunk panel.  
**Location:** `sail-6/opt/sark/php/sarktrunk/`

---

## 1. How you get to “New Trunk”

- From the trunk list, user clicks **New** (action bar). Request has `new=1` (GET or POST).
- In `showForm()` (view.php): `if (isset($_POST['new']) || isset($_GET['new'])) { $this->showNew(); return; }`
- Flow: **show New form → user picks trunk type and fills fields → Submit → saveNew() → showEdit()** (or showNew again if validation fails). One form with conditional fields driven by the trunk type dropdown; no multi-step wizard.

---

## 2. New Trunk form (showNew)

- **Entry:** `showNew()` in view.php (lines ~227–295).
- **Trunk type chooser:** Dropdown `chooser` with options:
  - `Choose a trunk type`
  - `SIP (send registration)`
  - `SIP (accept registration)`
  - `SIP (trusted peer)`
  - `GeneralIAX2`
  - `InterSARK`
- **Hidden field:** `carrier` – set by JS from chooser value when user picks a type (so server receives same string as chooser, e.g. `SIP (send registration)`).
- **Conditional fields (all in one form, hidden until type chosen):**

| Div ID         | Shown when                    | Content |
|----------------|-------------------------------|--------|
| divtrunkname   | All types except “Choose”     | Trunk name (trunkname) – also used as pkey |
| divhost        | SIP send/trusted, GeneralIAX2, InterSARK | Host (host) |
| divpassword    | SIP send, SIP accept, GeneralIAX2, InterSARK | Password (password) |
| divpeername    | InterSARK only                | Peer name (peername) |
| divregister    | GeneralIAX2 only              | Boolean “Register this trunk” (regthistrunk, default NO) |
| divprivileged  | SIP send, SIP accept, SIP trusted, InterSARK | Boolean privileged (default NO) |

- **Note:** New trunk form does **not** include cluster; cluster appears only on the edit form. New trunks likely get a default cluster server-side (e.g. in lineio/carrier defaults).
- **Buttons:** Cancel, Save (endsave). JS disables the chooser after selection and grays it; submit is always available once type is chosen (no separate “show save” step).

---

## 3. Front-end behaviour (javascript.js)

- On load: hide all conditional divs (divtrunkname, divusername, divpassword, divhost, divpeername, divregister, divprivileged).
- On `#chooser` change:
  - Disable chooser and set background light grey.
  - Set hidden `#carrier` to chooser value: `$("#carrier").val($(this).val())`.
  - Show type-specific divs:
    - **SIP (send registration):** divtrunkname, divhost, divpassword, divprivileged.
    - **SIP (accept registration):** divtrunkname, divpassword, divprivileged (no host – host becomes `dynamic` server-side).
    - **SIP (trusted peer):** divtrunkname, divhost, divprivileged (no password in UI; server uses password from POST if present).
    - **GeneralIAX2:** divtrunkname, divpassword, divhost, divregister.
    - **InterSARK:** divtrunkname, divpeername, divhost, divpassword, divprivileged.
- Form submits to same page (POST); create is handled in view.php (saveNew), not update.php.

---

## 4. Submit and validation (saveNew)

- **Trigger:** `if (isset($_POST['save']) || isset($_POST['endsave']))` in showForm() → `saveNew()`.
- **Flow:** saveNew() switches on `$_POST['carrier']` (set from chooser) and calls one of: saveSIPreg, saveSIPdynamic, saveSIPsimple, saveIAX, saveSibling. Each builds `$tuple` and may set `invalidForm` and `error_hash` on validation failure. If `!invalidForm`, saveNew() calls `createTuple("lineio", $tuple)`. On success → showEdit(); on failure → showNew() with errors.

**Switch on carrier (chooser value):**

| carrier (POST)           | Handler       | Notes |
|--------------------------|---------------|--------|
| SIP (send registration)  | saveSIPreg    | SIP trunk that sends registration |
| SIP (accept registration)| saveSIPdynamic| SIP trunk that accepts registration (host = dynamic) |
| SIP (trusted peer)       | saveSIPsimple | SIP trusted peer |
| IAX2                     | saveIAX       | **Note:** Chooser sends `GeneralIAX2`, not `IAX2`. Switch case is `"IAX2"` so with current JS this branch may never run unless carrier is mapped elsewhere. |
| InterSARK                | saveSibling   | Inter-SARK / sibling trunk |
| default                  | log and return| No create |

---

## 5. Per-type validation and tuple build

### saveSIPreg (SIP send registration)

- **Validation:** host required, trunkname required, password required.
- **Tuple:** pkey = trunkname; trunkname, host, peername = trunkname, username = trunkname, password; carrier = GeneralSIP; technology = SIP; desc = trunkname; pjsipreg = SND. Then createPjsipTrunkInstance($tuple), build register string, copyTemplates($tuple).

### saveSIPdynamic (SIP accept registration)

- **Validation:** host required, trunkname required, password required (but host is then set to `dynamic` and username/password to NULL in tuple).
- **Tuple:** pkey = trunkname; trunkname; host = `dynamic`; peername = trunkname; username = NULL; password = NULL; carrier = GeneralSIP; technology = SIP; desc = trunkname; pjsipreg = RCV. Then createPjsipTrunkInstance, copyTemplates.

### saveSIPsimple (SIP trusted peer)

- **Validation:** host required, trunkname required. Password not validated (optional).
- **Tuple:** pkey = trunkname; trunkname, host, peername, username = trunkname, password from POST; carrier = GeneralSIP; technology = SIP; desc = trunkname; pjsipreg = NONE. Then createPjsipTrunkInstance, copyTemplates.

### saveIAX (GeneralIAX2)

- **Validation:** host required, trunkname required.
- **Tuple:** pkey = trunkname; trunkname, host, username = trunkname, peername = trunkname, password; carrier = $_POST['carrier'] (e.g. GeneralIAX2); technology = IAX2; desc = peername. If regthistrunk == YES, set register string. copyTemplates($tuple). No createPjsipTrunkInstance (IAX2).

### saveSibling (InterSARK)

- **Validation:** trunkname required (“No hostname”), host required (“No host address”). Password not explicitly validated but used in tuple.
- **Tuple:** pkey = trunkname; trunkname, host, password; carrier = $_POST['carrier'] (InterSARK); privileged from POST; technology = IAX2. username/peername/desc built from peername and php_uname("n") depending on privileged (YES: username = hostname+peername, peername = peername+hostname; NO: username = hostname~peername, peername = peername~hostname). copyTemplates($tuple).

---

## 6. After build: createTuple and copyTemplates

- **createTuple("lineio", $tuple):** Inserts one row into `lineio` (and any related tables the helper manages). pkey = trunkname.
- **createPjsipTrunkInstance($tuple):** Called for SIP types only; creates PJSIP config for the trunk.
- **copyTemplates($tuple):** Loads Carrier row where `Carrier.pkey = $tuple['carrier']` (GeneralSIP, GeneralIAX2, InterSARK, etc.). Fetches sipiaxuser, sipiaxpeer templates; substitutes username, fromuser, secret, host from tuple; for InterSARK applies extra replacements (mainmenu→priv_sibling, trunk=yes→trunk=no; context=internal→mainmenu when privileged=NO). Writes result into tuple (sipiaxuser, sipiaxpeer). These are used for chan_sip/IAX config generation.

---

## 7. Files involved

| File          | Role |
|---------------|------|
| view.php      | showForm() routing; showNew() form; saveNew() switch; saveSIPreg, saveSIPdynamic, saveSIPsimple, saveIAX, saveSibling; copyTemplates(). |
| javascript.js | Show/hide divs by chooser; set carrier from chooser; DataTable + makeEditable for list. |
| main.php      | Includes srkmain (standard panel entry). |
| update.php    | Inline edit of trunk table columns (not the create flow). |
| delete.php    | Trunk deletion. |

---

## 8. Possible bugs / follow-ups

1. **IAX2 vs GeneralIAX2:** Chooser value is `GeneralIAX2` but saveNew() switch has `case "IAX2"`. So with current JS, carrier = "GeneralIAX2" and the IAX branch never runs. SPA/API should accept `GeneralIAX2` and run the same logic as saveIAX (or legacy should map GeneralIAX2 → IAX2).
2. **SIP (accept registration):** Form validates host required, but tuple sets host = `dynamic` and username/password = NULL. So “host” in the form may be unused or repurposed; confirm UX intent.
3. **Cluster:** New trunk form has no cluster field; default cluster for new trunks (e.g. `default`) may be applied in createTuple or schema default.

---

## 9. Database / globals touched (create flow)

- **Read:** globals (SIPDRIVER); Carrier (template rows by carrier pkey: GeneralSIP, GeneralIAX2, InterSARK).
- **Write:** lineio (insert); PJSIP config files via createPjsipTrunkInstance (SIP only).

---

*Working notes – trunk add flow for SPA replacement planning.*
