# Extension Add – Logic Flow (for SPA replacement)

Flowchart of all logic paths through the “add new extension” code. Use this to design the same behaviour in a modern SPA (API + client steps).

---

## 1. High-level flow (entry → outcome)

```mermaid
flowchart TD
    Start([User on Extension list]) --> ClickNew[Click New]
    ClickNew --> RouteNew{GET/POST new?}
    RouteNew -->|Yes| ShowNew[showNew: render form]
    RouteNew -->|No| OtherRoutes[Other showForm branches...]

    ShowNew --> FormDisplay[Display: extchooser + conditional fields]
    FormDisplay --> UserFills[User selects type, fills fields, Submit]

    UserFills --> Submit{POST save or endsave?}
    Submit -->|No| FormDisplay
    Submit -->|Yes| SaveNew[saveNew]

    SaveNew --> Validate[Load globals, validate form, build tuple]
    Validate --> ValidOK{Validation OK?}
    ValidOK -->|No| SetInvalid[invalidForm = true, error_hash]
    ValidOK -->|Yes| SwitchType[Switch on extchooser]

    SetInvalid --> BackToNew[showNew with errors]
    BackToNew --> FormDisplay

    SwitchType --> Branch[Type-specific branch]
    Branch --> AddExt[addNewExtension once or loop]
    AddExt --> AddOK{addNewExtension OK?}
    AddOK -->|No| SetInvalid
    AddOK -->|Yes| ShowEdit[showEdit for new ext]

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

## 3. showNew() – form build

```mermaid
flowchart TD
    ShowNew([showNew]) --> GetNext[getNextFreeExt]
    GetNext --> Adopt{GET new + adopt context?}
    Adopt -->|Yes| AdoptOpts[extchooser: Provisioned, Unprovisioned]
    Adopt -->|No| VXT{globals.VXT?}
    VXT -->|Yes| FullOpts[extchooser: + VXT batch, MAILBOX, etc.]
    VXT -->|No| NoVxtOpts[extchooser: no VXT batch]

    FullOpts --> Render
    NoVxtOpts --> Render
    AdoptOpts --> Render

    Render[Render form] --> DivChooser[divchooser: extension type]
    DivChooser --> Divs[Conditional divs: macaddr, rule, blksize, macblock, calleridname, device, devicevxt, cluster]
    Divs --> Buttons[Cancel, Save/End save]
```

---

## 4. saveNew() – validation and tuple build

```mermaid
flowchart TD
    SaveNew([saveNew]) --> LoadGlobals[Load globals: EXTLEN, NATDEFAULT, VCL, FQDNPROV, etc.]
    LoadGlobals --> FormVal[FormValidator: pkey req+num]
    FormVal --> ProvMac{extchooser = Provisioned?}
    ProvMac -->|Yes| MacVal[Add macaddr req + regexp]
    ProvMac -->|No| Validate
    MacVal --> Validate[ValidateForm]

    Validate --> ValOK{Valid?}
    ValOK -->|No| MergeErr[error_hash += GetErrors, return]
    ValOK -->|Yes| TuplePkey[tuple.pkey = POST pkey]

    TuplePkey --> ExtLen{strlen pkey = EXTLEN?}
    ExtLen -->|No| ErrKey[error KEY, invalidForm, return]
    ExtLen -->|Yes| TupleRest[desc, location, cluster, provisionwith from POST/globals]
    TupleRest --> LoadCOS[Load COS for createCos later]
    LoadCOS --> Switch[Switch extchooser]
```

---

## 5. saveNew() – switch on extension type (main branches)

```mermaid
flowchart TD
    Switch([Switch extchooser]) --> P{Type?}

    P -->|Provisioned| Prov[Provisioned branch]
    P -->|Unprovisioned| Unprov[device=General SIP, addNewExtension]
    P -->|WebRTC| Webrtc[device=WebRTC, addNewExtension]
    P -->|Provisioned batch| ProvBatch[Provisioned batch branch]
    P -->|Unprovisioned batch| UnprovBatch[Unprovisioned batch branch]
    P -->|WebRTC batch| WebrtcBatch[WebRTC batch branch]
    P -->|VXT batch| VxtBatch[VXT batch branch]
    P -->|MAILBOX| Mailbox[device=MAILBOX, addNewExtension]
    P -->|default| Done[no-op]

    Prov --> MacSet[macaddr from POST]
    MacSet --> Vendor[getVendorFromMac]
    Vendor --> VendorOK{vendor found?}
    VendorOK -->|No| ErrMac[Invalid/unsupported MAC, return]
    VendorOK -->|Yes| Dup[checkThisMacForDups]
    Dup --> DupYes{duplicate?}
    DupYes -->|Yes| ErrDup[MAC exists, return]
    DupYes -->|No| AddOne[addNewExtension]
```

---

## 6. Provisioned batch branch (detail)

```mermaid
flowchart TD
    ProvBatch([Provisioned batch]) --> Split[txtmacblock split by whitespace]
    Split --> Empty{macArray empty?}
    Empty -->|Yes| ErrEmpty[No MAC list, return]
    Empty -->|No| DupLoop[For each MAC: checkThisMacForDups]
    DupLoop --> HeadRoom[checkHeadRoom count, pkey]
    HeadRoom --> Invalid{invalidForm?}
    Invalid -->|Yes| Return[return -1]
    Invalid -->|No| Loop[For each MAC]
    Loop --> V[getVendorFromMac]
    V --> VOK{vendor?}
    VOK -->|No| ErrV[Vendor lookup failed, return]
    VOK -->|Yes| TupleMac[tuple device, macaddr, desc]
    TupleMac --> Add[addNewExtension]
    Add --> PkeyInc[pkey++]
    PkeyInc --> Loop
```

---

## 7. Unprovisioned / WebRTC / VXT batch (common pattern)

```mermaid
flowchart TD
    Batch([Unprovisioned / WebRTC / VXT batch]) --> HeadRoom[checkHeadRoom blksize, pkey]
    HeadRoom --> NoRoom{invalidForm?}
    NoRoom -->|Yes| Return[return]
    NoRoom -->|No| SetDevice[tuple.device = General SIP / WebRTC / vxtdevice]
    SetDevice --> While[while blksize > 0]
    While --> Desc[tuple.desc = Ext + pkey]
    Desc --> Add[addNewExtension]
    Add --> Inc[pkey++, blksize--]
    Inc --> While
```

---

## 8. addNewExtension(tuple) – single-extension create

```mermaid
flowchart TD
    AddExt([addNewExtension]) --> LoadDev[Load device row by tuple.device]
    LoadDev --> ProvInit[provision = blank or include device]
    ProvInit --> Tech[technology, WebRTC transport wss, blf include, Cisco XML if needed]
    Tech --> Passwd[passwd = ret_password, dvrvmail = pkey]
    Passwd --> Adjust[adjustAstProvSettings tuple]
    Adjust --> Insert[createTuple ipphone]
    Insert --> InsertOK{ret = OK?}
    InsertOK -->|No| SetInvalid[invalidForm, error_hash DB, return -1]
    InsertOK -->|Yes| CreateCOS[createCos]
    CreateCOS --> WebRTC{device = WebRTC?}
    WebRTC -->|Yes| PjsipWrtc[createPjsipWebrtcInstance]
    WebRTC -->|No| PjsipPhone[createPjsipPhoneInstance]
    PjsipWrtc --> Done[return OK]
    PjsipPhone --> Done
```

---

## 9. Client-side (current JS) – type → visible fields

```mermaid
flowchart TD
    Load([Page load]) --> Hide[Hide: macaddr, rule, password, calleridname, device, macblock, devicevxt, blksize, save, endsave]
    Hide --> ShowChooser[Show only divchooser]

    Change([extchooser change]) --> HideChooser[Hide divchooser, show save/endsave]
    HideChooser --> Rule[Show divrule for all types]
    Rule --> Type{Type?}

    Type -->|Provisioned| Prov[Show divmacaddr, divcalleridname]
    Type -->|Provisioned batch| ProvB[Show divmacblock]
    Type -->|Unprovisioned / WebRTC / MAILBOX| Single[Show divcalleridname]
    Type -->|Unprovisioned batch / WebRTC batch| Blk[Show divblksize]
    Type -->|VXT batch| Vxt[Show divdevicevxt, divblksize]
```

---

## 10. Single diagram – full create path (simplified)

One view of the whole create path from “New” to “Edit” or “New again”:

```mermaid
flowchart TD
    subgraph Entry
        A([New]) --> B[showNew: form]
        B --> C[User: type + fields + Submit]
    end

    subgraph Submit
        C --> D[saveNew]
        D --> E{Validate}
        E -->|Fail| B
        E -->|OK| F[Build tuple]
        F --> G{extchooser}
    end

    subgraph Single["Single extension"]
        G -->|Provisioned| H[MAC → vendor → addNewExtension]
        G -->|Unprovisioned| I[General SIP → addNewExtension]
        G -->|WebRTC| J[WebRTC → addNewExtension]
        G -->|MAILBOX| K[MAILBOX → addNewExtension]
    end

    subgraph Batch["Batch"]
        G -->|Prov batch| L[MAC list → foreach addNewExtension]
        G -->|Unprov/WebRTC/VXT batch| M[blksize loop → addNewExtension]
    end

    subgraph AddOne["addNewExtension"]
        H --> N[device → provision → adjust → insert ipphone]
        I --> N
        J --> N
        K --> N
        L --> N
        M --> N
        N --> O{DB OK?}
        O -->|No| B
        O -->|Yes| P[createCos, createPjsip*]
        P --> Q([showEdit])
    end
```

---

## How to use this for the SPA

1. **API surface:** One or more endpoints that mirror `saveNew()` + `addNewExtension()`: e.g. `POST /api/extensions` with body `{ extChooser, pkey, macaddr?, txtmacblock?, blksize?, vxtdevice?, desc?, cluster? }`. Server runs the same validation and switch logic, returns created extension id(s) or validation errors.
2. **Client flow:**  
   - Step 1: Fetch “next free ext” and type options (or derive from globals).  
   - Step 2: Single form with type selector; show/hide fields by type (same as diagrams 3 and 9).  
   - Step 3: On submit, call create API; on success navigate to edit (or list); on validation errors show errors and stay on form (same as diagram 1).
3. **Batch:** API either accepts one extension per request (client loops) or a batch payload (server loops) – diagram 6 and 7 define the server-side loop and checks.
4. **addNewExtension** steps (diagram 8) stay server-side (DB + PJSIP instance creation); SPA only triggers them via the API.

---

*Working notes – flowcharts for SPA replacement planning.*
