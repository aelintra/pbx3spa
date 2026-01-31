# DDI Add – Logic Flow (for SPA replacement)

Flowchart of logic paths through the “add new DDI/CLID” code.

---

## 1. High-level flow (entry → outcome)

```mermaid
flowchart TD
    Start([User on DDI list]) --> ClickNew[Click New]
    ClickNew --> RouteNew{GET/POST new?}
    RouteNew -->|Yes| ShowNew[showNew: render form]
    RouteNew -->|No| OtherRoutes[Other showForm branches...]

    ShowNew --> FormDisplay[Display: cluster, chooserDiD + conditional fields]
    FormDisplay --> UserFills[User selects DiD or CLID, fills fields, Submit]

    UserFills --> Submit{POST save or endsave?}
    Submit -->|No| FormDisplay
    Submit -->|Yes| SaveNew[saveNew]

    SaveNew --> SwitchCarrier[Switch on carrier]
    SwitchCarrier --> TypeHandler[saveDiD or saveCLI]
    TypeHandler --> ValidOK{Validation OK?}
    ValidOK -->|No| SetInvalid[invalidForm, showNew]
    ValidOK -->|Yes| Smartlink[Optional smartlink logic]
    Smartlink --> Loop[Loop span times: createTuple lineio, increment pkey]
    Loop --> Done[showMain list]

    SetInvalid --> BackToNew[showNew with errors]
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
    Invalid -->|No| FallThrough[fall through to showMain]
    B -->|No| C[Other actions...]
```

---

## 3. saveNew() – switch and loop

```mermaid
flowchart TD
    SaveNew([saveNew]) --> Switch([Switch POST carrier])
    Switch --> P{carrier?}
    P -->|DiD| SaveDiD[saveDiD]
    P -->|CLID| SaveCLI[saveCLI]
    P -->|default| Return[return]

    SaveDiD --> ValidD{Valid?}
    SaveCLI --> ValidC{Valid?}
    ValidD -->|No| Invalid[invalidForm]
    ValidC -->|No| Invalid
    ValidD -->|Yes| TupleD[tuple + span]
    ValidC -->|Yes| TupleC[tuple, span=1]

    TupleD --> Smartlink{smartlink?}
    TupleC --> Loop
    Smartlink -->|Yes| ExtLookup[extkey from pkey, ipphone lookup, openroute/closeroute]
    Smartlink -->|No| Loop
    ExtLookup --> Loop[for i=0 to span-1: createTuple lineio]
    Loop --> Inc[pkey++ str_pad]
    Inc --> Loop
```

---

## 4. saveDiD – validation and tuple

```mermaid
flowchart TD
    SaveDiD([saveDiD]) --> Val[didnumber required]
    Val --> Check[No _ and / together]
    Check --> Parse[Split didnumber by /]
    Parse --> Pkey[pkey = first part]
    Parse --> Span{second part?}
    Span -->|Yes| SpanNum[span = number, max 100]
    Span -->|No| Span1[span = 1]
    SpanNum --> Tuple[cluster, trunkname, carrier=DiD, technology=DiD, smartlink]
    Span1 --> Tuple
    Tuple --> ValidOK{ValidateForm?}
    ValidOK -->|No| Invalid[invalidForm]
```

---

## 5. saveCLI – validation and tuple

```mermaid
flowchart TD
    SaveCLI([saveCLI]) --> Val[clinumber req, trunkname req]
    Val --> ValidOK{ValidateForm?}
    ValidOK -->|No| Invalid[invalidForm]
    ValidOK -->|Yes| Tuple[pkey=clinumber, cluster, trunkname, carrier=CLID, technology=CLID]
```

---

## 6. Client-side (current JS) – type → visible fields

```mermaid
flowchart TD
    Load([Page load]) --> Hide[Hide: trunkname, didnumber, clinumber, smartlink, endsave]
    Change([chooserDiD change]) --> Disable[Disable chooser, grey background]
    Disable --> ShowEnd[Show endsave]
    ShowEnd --> SetCarrier[Set hidden carrier = chooser value]
    SetCarrier --> Type{Type?}
    Type -->|DiD| DiD[Show divtrunkname, divdidnumber, divsmartlink]
    Type -->|CLID| CLID[Show divtrunkname, divclinumber]
```

---

## 7. Full create path (simplified)

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
        E -->|DiD| F[saveDiD: parse didnumber, span]
        E -->|CLID| G[saveCLI: pkey=clinumber]
    end
    subgraph Create
        F --> H{invalidForm?}
        G --> H
        H -->|Yes| B
        H -->|No| I[Optional smartlink]
        I --> J[Loop span: createTuple lineio]
        J --> K([showMain list])
    end
```

---

*Working notes – DDI add flowcharts for SPA replacement.*
