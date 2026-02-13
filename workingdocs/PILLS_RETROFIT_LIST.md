# Segmented Pills Retrofit List

**Rule:** Use segmented pills (button group) for **2–5 options**, FormSelect (dropdown) for **6+ options**.

**Status:** Segmented pill component not yet created. This list tracks fields to retrofit once component is available.

---

## Create Views

### InboundRouteCreateView
- ✅ **`carrier`** (DDI type): `['DiD', 'CLID']` = **2 options** → should be pills

### ExtensionCreateView
- ✅ **`protocol`**: `['SIP', 'WebRTC', 'Mailbox']` = **3 options** → should be pills

### TenantCreateView
- ✅ **`masteroclo`** (Timer status): `['AUTO', 'CLOSED']` = **2 options** → should be pills

### RouteCreateView
- ✅ **`strategy`**: `['hunt', 'balance']` = **2 options** → should be pills

### TrunkCreateView
- ✅ **`transport`**: `['udp', 'tcp', 'tls', 'wss']` = **4 options** → should be pills

### QueueCreateView
- ❌ **`devicerec`**: `['None', 'OTR', 'OTRR', 'Inbound', 'default']` = **5 options** → could be pills (at limit)
- ❌ **`strategy`**: `['ringall', 'roundrobin', 'leastrecent', 'fewestcalls', 'random', 'rrmemory']` = **6 options** → keep dropdown

---

## Detail Views

### ExtensionDetailView
- ✅ **`transport`**: `['udp', 'tcp', 'tls', 'wss']` = **4 options** → should be pills
- ✅ **`location`**: `['desk', 'cell']` = **2 options** → should be pills
- ✅ **`ipversion`**: `['IPV4', 'IPV6']` = **2 options** → should be pills

### InboundRouteDetailView
- ✅ **`disa`**: `['', 'DISA', 'CALLBACK']` = **3 options** (empty = None) → should be pills
- ✅ **`iaxreg`**, **`pjsipreg`**: `['', 'SND', 'RCV']` = **3 options** (empty = None) → should be pills

### TrunkDetailView
- ✅ **`disa`**: `['', 'DISA', 'CALLBACK']` = **3 options** (empty = None) → should be pills
- ✅ **`iaxreg`**, **`pjsipreg`**: `['', 'SND', 'RCV']` = **3 options** (empty = None) → should be pills

### TenantDetailView
- ✅ **`masteroclo`** (Timer status): `['AUTO', 'CLOSED']` = **2 options** → should be pills

### RouteDetailView
- ✅ **`strategy`**: `['hunt', 'balance']` = **2 options** → should be pills

### QueueDetailView
- ❌ **`devicerec`**: `['None', 'OTR', 'OTRR', 'Inbound', 'default']` = **5 options** → could be pills (at limit)
- ❌ **`strategy`**: `['ringall', 'roundrobin', 'leastrecent', 'fewestcalls', 'random', 'rrmemory']` = **6 options** → keep dropdown

---

## Summary

**Create views to retrofit:** 5 fields
- InboundRouteCreateView: carrier (2)
- ExtensionCreateView: protocol (3)
- TenantCreateView: masteroclo (2)
- RouteCreateView: strategy (2)
- TrunkCreateView: transport (4)

**Detail views to retrofit:** ~8 fields
- ExtensionDetailView: transport (4), location (2), ipversion (2)
- InboundRouteDetailView: disa (3), iaxreg (3), pjsipreg (3)
- TrunkDetailView: disa (3), iaxreg (3), pjsipreg (3)
- TenantDetailView: masteroclo (2)
- RouteDetailView: strategy (2)

**Total:** ~13 fields across create and detail views

---

## Implementation Plan

1. **Create FormPill component** (or FormSegmentedPill)
   - Button group style
   - Single selection
   - Matches FormSelect API (options, modelValue, etc.)
   - Accessible (keyboard navigation, ARIA)

2. **Retrofit fields** (one panel at a time, test each)
   - Start with create views (simpler)
   - Then detail views
   - Test: verify selection works, form submission, validation

3. **Note:** Fields with empty string option (`''`) need special handling:
   - Display as "None" or "—" in pills
   - Map empty string ↔ "None" for API

---

## Edge Cases

- **Empty string options:** `disa`, `iaxreg`, `pjsipreg` have `['', 'SND', 'RCV']` where `''` means "None". Pills should show "None" but send `''` to API.
- **Queue devicerec:** Exactly 5 options (at limit). Could go either way, but pills would be better UX.
- **Tenant advanced fields:** Many use FormSelect with 2–4 options. These are in `tenantAdvanced.js` config; would need to update config to use pills.
