# Trunk Add – Logic Flow (for SPA replacement)

Flowchart of logic paths through the “add new trunk” code. Use this to design the same behaviour in a modern SPA.

---

## 1. High-level flow (entry → outcome)

```mermaid
flowchart TD
    Start([User on Trunk list]) --> ClickNew[Click New]
    ClickNew --> RouteNew{GET/POST new?}
    RouteNew -->|Yes| ShowNew[showNew: render form]
    RouteNew -->|No| OtherRoutes[Other showForm branches...]

    ShowNew --> FormDisplay[Display: chooser + conditional fields]
    FormDisplay --> UserFills[User selects trunk type, fills fields, Submit]

    UserFills --> Submit{POST save or endsave?}
    Submit -->|No| FormDisplay
    Submit -->|Yes| SaveNew[saveNew]

    SaveNew --> SwitchCarrier[Switch on carrier]
    SwitchCarrier --> TypeHandler[Type-specific handler: saveSIPreg / saveSIPdynamic / saveSIPsimple / saveIAX / saveSibling]
    TypeHandler --> ValidOK{Validation OK?}
    ValidOK -->|No| SetInvalid[invalidForm, error_hash]
    ValidOK -->|Yes| BuildTuple[Build tuple, createPjsip*, copyTemplates]
    SetInvalid --> BackToNew[showNew with errors]
    BackToNew --> FormDisplay

    BuildTuple --> CreateLineio[createTuple lineio]
    CreateLineio --> CreateOK{ret = OK?}
    CreateOK -->|No| SetInvalid
    CreateOK -->|Yes| ShowEdit[showEdit for new trunk]

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
    ShowNew([showNew]) --> Chooser[displayPopupFor chooser: trunk type]
    Chooser --> Options[Choose type, SIP send reg, SIP accept reg, SIP trusted peer, GeneralIAX2, InterSARK]
    Options --> Divs[Conditional divs: trunkname, peername, host, username, password, register, privileged]
    Divs --> Hidden[hidden carrier set by JS from chooser]
    Hidden --> Buttons[Cancel, Save/End save]
```

---

## 4. saveNew() – switch on carrier

```mermaid
flowchart TD
    SaveNew([saveNew]) --> Switch([Switch POST carrier])
    Switch --> P{carrier?}

    P -->|SIP send registration| SIPreg[saveSIPreg]
    P -->|SIP accept registration| SIPdyn[saveSIPdynamic]
    P -->|SIP trusted peer| SIPsimple[saveSIPsimple]
    P -->|IAX2| IAX[saveIAX]
    P -->|InterSARK| Sibling[saveSibling]
    P -->|default| Done[log, return]

    SIPreg --> Valid1{Valid?}
    SIPdyn --> Valid2{Valid?}
    SIPsimple --> Valid3{Valid?}
    IAX --> Valid4{Valid?}
    Sibling --> Valid5{Valid?}

    Valid1 -->|No| Invalid[invalidForm, error_hash]
    Valid2 -->|No| Invalid
    Valid3 -->|No| Invalid
    Valid4 -->|No| Invalid
    Valid5 -->|No| Invalid
    Valid1 -->|Yes| Tuple1[tuple built]
    Valid2 -->|Yes| Tuple2[tuple built]
    Valid3 -->|Yes| Tuple3[tuple built]
    Valid4 -->|Yes| Tuple4[tuple built]
    Valid5 -->|Yes| Tuple5[tuple built]

    Tuple1 --> Create
    Tuple2 --> Create
    Tuple3 --> Create
    Tuple4 --> Create
    Tuple5 --> Create

    Create[createTuple lineio if !invalidForm]
```

---

## 5. SIP send registration (saveSIPreg)

```mermaid
flowchart TD
    SIPreg([saveSIPreg]) --> Val[Validate: host, trunkname, password req]
    Val --> ValOK{Valid?}
    ValOK -->|No| Invalid[invalidForm, GetErrors]
    ValOK -->|Yes| Tuple[pkey=trunkname, trunkname, host, peername, username, password, carrier=GeneralSIP, technology=SIP, desc, pjsipreg=SND]
    Tuple --> Pjsip[createPjsipTrunkInstance]
    Pjsip --> Register[register = user:pass@host]
    Register --> Copy[copyTemplates]
```

---

## 6. SIP accept registration (saveSIPdynamic)

```mermaid
flowchart TD
    SIPdyn([saveSIPdynamic]) --> Val[Validate: host, trunkname, password req]
    Val --> ValOK{Valid?}
    ValOK -->|No| Invalid[invalidForm, GetErrors]
    ValOK -->|Yes| Tuple[pkey=trunkname, trunkname, host=dynamic, peername, username=NULL, password=NULL, carrier=GeneralSIP, technology=SIP, desc, pjsipreg=RCV]
    Tuple --> Pjsip[createPjsipTrunkInstance]
    Pjsip --> Copy[copyTemplates]
```

---

## 7. SIP trusted peer (saveSIPsimple)

```mermaid
flowchart TD
    SIPsimple([saveSIPsimple]) --> Val[Validate: host, trunkname req]
    Val --> ValOK{Valid?}
    ValOK -->|No| Invalid[invalidForm, GetErrors]
    ValOK -->|Yes| Tuple[pkey=trunkname, trunkname, host, peername, username, password from POST, carrier=GeneralSIP, technology=SIP, desc, pjsipreg=NONE]
    Tuple --> Pjsip[createPjsipTrunkInstance]
    Pjsip --> Copy[copyTemplates]
```

---

## 8. GeneralIAX2 (saveIAX) – note: switch case is IAX2

```mermaid
flowchart TD
    IAX([saveIAX]) --> Val[Validate: host, trunkname req]
    Val --> ValOK{Valid?}
    ValOK -->|No| Invalid[invalidForm, GetErrors]
    ValOK -->|Yes| Tuple[pkey=trunkname, trunkname, host, username, peername, password, carrier=POST carrier, technology=IAX2, desc]
    Tuple --> Reg{regthistrunk YES?}
    Reg -->|Yes| Register[register = user:pass@host]
    Reg -->|No| Copy
    Register --> Copy[copyTemplates]
```

---

## 9. InterSARK (saveSibling)

```mermaid
flowchart TD
    Sibling([saveSibling]) --> Val[Validate: trunkname, host req]
    Val --> ValOK{Valid?}
    ValOK -->|No| Invalid[invalidForm, GetErrors]
    ValOK -->|Yes| Tuple[trunkname, host, password, carrier=InterSARK, privileged, technology=IAX2]
    Tuple --> Priv{privileged YES?}
    Priv -->|Yes| UserYes[username=hostname+peername, peername=peername+hostname]
    Priv -->|No| UserNo[username=hostname~peername, peername=peername~hostname]
    UserYes --> Copy[copyTemplates]
    UserNo --> Copy
```

---

## 10. Client-side (current JS) – type → visible fields

```mermaid
flowchart TD
    Load([Page load]) --> Hide[Hide: trunkname, username, password, host, peername, register, privileged]
    Change([chooser change]) --> Disable[Disable chooser, grey background]
    Disable --> SetCarrier[Set hidden carrier = chooser value]
    SetCarrier --> Type{Type?}

    Type -->|SIP send reg| A[Show trunkname, host, password, privileged]
    Type -->|SIP accept reg| B[Show trunkname, password, privileged]
    Type -->|SIP trusted peer| C[Show trunkname, host, privileged]
    Type -->|GeneralIAX2| D[Show trunkname, password, host, register]
    Type -->|InterSARK| E[Show trunkname, peername, host, password, privileged]
```

---

## 11. Single diagram – full create path (simplified)

```mermaid
flowchart TD
    subgraph Entry
        A([New]) --> B[showNew: form]
        B --> C[User: type + fields + Submit]
    end

    subgraph Submit
        C --> D[saveNew]
        D --> E{Switch carrier}
    end

    subgraph Handlers
        E -->|SIP send| F[saveSIPreg]
        E -->|SIP accept| G[saveSIPdynamic]
        E -->|SIP trusted| H[saveSIPsimple]
        E -->|IAX2/GeneralIAX2| I[saveIAX]
        E -->|InterSARK| J[saveSibling]
    end

    subgraph Create
        F --> K[Validate, tuple, createPjsip*, copyTemplates]
        G --> K
        H --> K
        I --> K
        J --> K
        K --> L{invalidForm?}
        L -->|Yes| B
        L -->|No| M[createTuple lineio]
        M --> N{ret OK?}
        N -->|No| B
        N -->|Yes| O([showEdit])
    end
```

---

## How to use this for the SPA

1. **API:** One endpoint, e.g. `POST /api/trunks`, body: `{ carrier/trunkType, trunkname, host?, password?, peername?, regthistrunk?, privileged? }`. Server runs same switch and handlers, returns 201 + trunk id or 400 + errors.
2. **Client:** One “New trunk” page; chooser drives visibility per diagram 10; submit → API; 201 → navigate to edit; 400 → show errors.
3. **carrier vs chooser:** API should accept chooser values (e.g. `GeneralIAX2`, `SIP (send registration)`) and map `GeneralIAX2` to IAX logic if legacy switch expects `IAX2`.

---

*Working notes – flowcharts for trunk add SPA replacement.*
