# IVR Add – Logic Flow (for SPA replacement)

Flowchart of logic paths through the “add new IVR” code.

---

## 1. High-level flow (entry → outcome)

```mermaid
flowchart TD
    Start([User on IVR list]) --> ClickNew[Click New]
    ClickNew --> RouteNew{GET/POST new?}
    RouteNew -->|Yes| ShowNew[showNew: render form]
    RouteNew -->|No| OtherRoutes[Other showForm branches...]

    ShowNew --> FormDisplay[Display: ivrname, cluster, description]
    FormDisplay --> UserFills[User fills fields, Submit]

    UserFills --> Submit{POST save or endsave?}
    Submit -->|No| FormDisplay
    Submit -->|Yes| SaveNew[saveNew]

    SaveNew --> Validate[pkey required]
    Validate --> ValidOK{Valid?}
    ValidOK -->|No| SetInvalid[invalidForm, error_hash, showNew]
    ValidOK -->|Yes| BuildTuple[buildTupleArray POST, tuple]
    BuildTuple --> Insert[createTuple ivrmenu]
    Insert --> InsertOK{ret = OK?}
    InsertOK -->|No| SetInvalid
    InsertOK -->|Yes| SaveKey[saveKey = pkey, showEdit]

    ShowEdit([User sees edit screen])
```

---

## 2. showForm() routing (add-related branches only)

```mermaid
flowchart TD
    ShowForm([showForm entry]) --> A{POST new or GET new?}
    A -->|Yes| ShowNew[showNew return]
    A -->|No| B{POST save or endsave?}
    B -->|Yes| SaveNew[saveNew]
    SaveNew --> Invalid{invalidForm?}
    Invalid -->|Yes| ShowNew2[showNew return]
    Invalid -->|No| ShowEdit[showEdit return]
    B -->|No| C[Other actions...]
```

---

## 3. saveNew() – validation and create

```mermaid
flowchart TD
    SaveNew([saveNew]) --> Val[FormValidator: pkey req]
    Val --> ValOK{ValidateForm?}
    ValOK -->|No| Invalid[invalidForm, GetErrors]
    ValOK -->|Yes| Build[buildTupleArray POST, tuple]
    Build --> Create[createTuple ivrmenu, tuple]
    Create --> OK{ret = OK?}
    OK -->|No| Invalid
    OK -->|Yes| Message[message, saveKey = pkey]
```

---

## 4. Client-side (IVR create)

IVR create has no conditional UI; all fields (ivrname, cluster, description) are always visible. No show/hide logic in JS for the new form.

---

*Working notes – IVR add flowcharts for SPA replacement.*
