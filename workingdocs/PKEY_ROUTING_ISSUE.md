# PKEY Routing Issue Analysis

## Problem

**pkey is NOT globally unique** — it's unique per tenant (cluster). This breaks routing and API lookups when the same pkey exists in multiple tenants.

### Evidence

1. **ExtensionController::save** (line 116):
   ```php
   if (Extension::where('pkey', $request->pkey)->where('cluster', $request->cluster)->exists())
   ```
   This checks pkey + cluster together, confirming pkey is unique **per tenant**, not globally.

2. **Schema**: All tenant-scoped tables have:
   - `"id" TEXT PRIMARY KEY` (KSUID, 27 chars, globally unique)
   - `"shortuid" TEXT UNIQUE` (8 chars, globally unique)
   - `"pkey" TEXT` (human-readable, unique per tenant)

3. **Laravel route model binding**: Uses model's `primaryKey` (`pkey`) to resolve `{extension}`:
   ```php
   Route::get('extensions/{extension}', [ExtensionController::class, 'show']);
   ```
   Laravel does `Extension::findOrFail($value)` using pkey, which returns the **first match** — wrong if pkey exists in multiple tenants!

4. **Frontend routes**: All use `:pkey`:
   ```js
   { path: 'extensions/:pkey', name: 'extension-detail', component: ExtensionDetailView }
   ```
   URL `/extensions/1001` can't distinguish between extension 1001 in tenant A vs tenant B.

5. **Frontend API calls**: All use pkey:
   ```js
   await getApiClient().get(`extensions/${encodeURIComponent(pkey.value)}`)
   ```
   This hits the API with pkey, which Laravel resolves incorrectly.

---

## Affected Resources

**Definitely affected** (pkey unique per tenant):
- **Extensions** — confirmed by validation: `where('pkey', $request->pkey)->where('cluster', $request->cluster)`
- **Queues** — likely (has cluster field)
- **Agents** — likely (has cluster field)
- **Routes** — likely (has cluster field)
- **IVRs** — likely (has cluster field)
- **Trunks** — likely (has cluster field)
- **Inbound Routes** — likely (has cluster field)

**Not affected** (pkey globally unique):
- **Tenants** — pkey is the tenant identifier itself (no cluster field)

---

## Solution Options

### Option 1: Use `shortuid` in routes (Recommended)

**Pros:**
- Short (8 chars) — better for URLs than 27-char KSUID
- Human-readable (e.g., `abc12345`)
- Globally unique
- Already exists in schema

**Cons:**
- Need to update all routes and API calls
- Need to update API route model binding

**Implementation:**
1. **API**: Add `resolveRouteBinding()` to models to resolve by shortuid instead of pkey
2. **Frontend routes**: Change `:pkey` → `:shortuid`
3. **Frontend API calls**: Change `extensions/${pkey}` → `extensions/${shortuid}`
4. **List views**: Link to detail using `shortuid` instead of `pkey`
5. **Display**: Keep showing `pkey` in UI, but use `shortuid` for navigation

### Option 2: Use `id` (KSUID) in routes

**Pros:**
- Globally unique
- Already PRIMARY KEY in schema

**Cons:**
- Long (27 chars) — ugly URLs (`/extensions/01HXYZ1234567890ABCDEFGHIJ`)
- Not human-readable
- Harder to debug

### Option 3: Composite key in routes (`:tenant/:pkey`)

**Pros:**
- Keeps pkey visible in URL
- No API changes needed

**Cons:**
- Longer URLs (`/extensions/default/1001`)
- More complex routing
- Still uses pkey lookup (but scoped to tenant)

---

## Recommended Approach: Use `shortuid`

### Why `shortuid` over `id`:
- **Shorter URLs**: `/extensions/abc12345` vs `/extensions/01HXYZ1234567890ABCDEFGHIJ`
- **Human-readable**: Easier to debug, share, reference
- **Globally unique**: Same guarantee as id
- **Already in schema**: No migration needed

### Implementation Plan

#### Phase 1: API Changes

1. **Update models** to resolve route binding by shortuid:
   ```php
   // Extension.php, Queue.php, Agent.php, Route.php, Ivr.php, Trunk.php, InboundRoute.php
   public function resolveRouteBinding($value, $field = null)
   {
       // Try shortuid first (globally unique)
       $model = static::where('shortuid', $value)->first();
       if ($model) return $model;
       
       // Fallback to pkey for backward compatibility (if needed)
       return static::where('pkey', $value)->first();
   }
   ```

2. **Update routes** (no change needed — Laravel will use resolveRouteBinding):
   ```php
   Route::get('extensions/{extension}', ...) // {extension} now resolves by shortuid
   ```

#### Phase 2: Frontend Changes

1. **Update router**:
   ```js
   { path: 'extensions/:shortuid', name: 'extension-detail', component: ExtensionDetailView }
   ```

2. **Update list views**: Link using `shortuid`:
   ```vue
   <router-link :to="{ name: 'extension-detail', params: { shortuid: item.shortuid } }">
   ```

3. **Update detail views**: Use `shortuid` from route:
   ```js
   const shortuid = computed(() => route.params.shortuid)
   await getApiClient().get(`extensions/${encodeURIComponent(shortuid.value)}`)
   ```

4. **Update delete calls**: Use `shortuid`:
   ```js
   await getApiClient().delete(`extensions/${encodeURIComponent(item.shortuid)}`)
   ```

---

## Impact Assessment

### Resources to Update

**API Models** (add resolveRouteBinding):
- Extension
- Queue
- Agent
- Route
- Ivr
- Trunk
- InboundRoute

**Frontend Routes** (change `:pkey` → `:shortuid`):
- extensions/:shortuid
- queues/:shortuid
- agents/:shortuid
- routes/:shortuid
- ivrs/:shortuid
- trunks/:shortuid
- inbound-routes/:shortuid

**Frontend Views** (update API calls and links):
- All ListView components (link using shortuid)
- All DetailView components (fetch using shortuid)
- All CreateView components (if they redirect after create)

**API Controllers** (verify show/update/delete work with shortuid):
- ExtensionController
- QueueController
- AgentController
- RouteController
- IvrController
- TrunkController
- InboundRouteController

---

## Testing Checklist

After implementation:

- [ ] Create extension 1001 in tenant A
- [ ] Create extension 1001 in tenant B
- [ ] Navigate to extension A via list → should load correct extension
- [ ] Navigate to extension B via list → should load correct extension
- [ ] Direct URL `/extensions/{shortuidA}` → should load extension A
- [ ] Direct URL `/extensions/{shortuidB}` → should load extension B
- [ ] Edit extension A → should save to extension A
- [ ] Delete extension A → should delete extension A (not B)
- [ ] Repeat for Queue, Agent, Route, Ivr, Trunk, InboundRoute

---

## Backward Compatibility

**Option A: Support both** (recommended for migration):
- API `resolveRouteBinding` tries shortuid first, falls back to pkey
- Frontend gradually migrates to shortuid
- Old URLs with pkey still work (but may be ambiguous)

**Option B: Hard break**:
- Only support shortuid
- Old URLs break
- Cleaner long-term

---

## Notes

- **Tenant** doesn't need this fix (pkey is globally unique for tenants)
- **shortuid** is generated on create, so all existing records should have it
- **id** (KSUID) is also globally unique but longer — shortuid preferred for URLs
- This is a **breaking change** if we don't support backward compatibility

---

## Other API Elements That May Need Changes

The following API elements may need updates to fully support shortuid-based routing and lookups:

### Controllers - Duplicate Key Validation

**Current Issue**: Controllers check for duplicate `pkey` globally, but `pkey` is only unique per tenant.

**Affected Controllers**:
- `ExtensionController::save()` - Already checks `pkey + cluster` (correct)
- `QueueController::save()` - Checks `pkey` globally (needs `pkey + cluster`)
- `AgentController::save()` - Checks `pkey` globally (needs `pkey + cluster`)
- `RouteController::save()` - Checks `pkey` globally (needs `pkey + cluster`)
- `IvrController::save()` - Checks `pkey` globally (needs `pkey + cluster`)
- `TrunkController::save()` - Checks `pkey` globally (needs `pkey + cluster`)
- `InboundRouteController::save()` - Checks `pkey` globally (needs `pkey + cluster`)

**Action Required**: Update duplicate key validation to check `pkey + cluster` combination, or consider using `shortuid` uniqueness check (since shortuid is globally unique).

### Controllers - AMI Operations

**Current Issue**: ExtensionController runtime methods use `$extension->pkey` for AMI operations, which may be ambiguous if same `pkey` exists in multiple tenants.

**Affected Controllers**:
- `ExtensionController::showruntime()` - Uses `$extension->pkey` for AMI GetDB calls (lines 206-208)
- `ExtensionController::updateruntime()` - Uses `$extension->pkey` for AMI PutDB calls (lines 495-503)
  - **Impact**: AMI operations use pkey, which may be ambiguous if same pkey in multiple tenants
  - **Note**: AMI typically requires pkey within tenant context. Since route model binding now resolves by shortuid, we get the correct extension instance, so pkey should be unique within the tenant context. However, we should verify that AMI operations correctly identify the extension when called.

**Action Required**: 
- Verify that AMI operations correctly identify the extension (route model binding ensures correct extension instance)
- Consider adding tenant context validation to ensure AMI operations are scoped to correct tenant
- Document that AMI operations use pkey within tenant context (which is unique)

### Controllers - Resource Relationships (Class of Service)

**Current Issue**: CosOpenController and CosCloseController reference extensions by `IPphone_pkey` (extension pkey) in relationships, which may be ambiguous when same `pkey` exists in multiple tenants.

**Affected Controllers**:
- `CosOpenController` - Uses `IPphone_pkey` (extension pkey) in relationships
  - Line 17: `'IPphone_pkey' => 'exists:ipphone,pkey'`
  - Line 61-62: Checks for duplicate relationship using `IPphone_pkey`
  - **Impact**: If extension "1001" exists in multiple tenants, relationship lookup may be ambiguous
- `CosCloseController` - Same as CosOpenController

**Action Required**: 
- **NEEDS THOROUGH REVIEW** - Class of Service relationships need comprehensive analysis before changes
- Review how CosOpen/CosClose relationships work across tenants
- Determine if relationships should be tenant-scoped or globally unique
- Consider using `shortuid` or `id` instead of `pkey` for foreign key relationships, but only after full review
- **Priority**: Defer to end of implementation list - needs thorough review first

### Controllers - Resource Lookups

**Current Issue**: Controllers that look up resources by `pkey` may return wrong resource when same `pkey` exists in multiple tenants.

**Affected Controllers**:
- `DestinationController::index()` - Builds destination lists using `pkeys()` method
  - Line 34: `'Extensions' => $this->pkeys(IpPhone::query()->where('active', 'YES'), $clusterValues)`
  - **Impact**: Returns pkeys filtered by cluster, but if cluster resolution is wrong, may return wrong pkeys
  - **Note**: Already filters by cluster, but should verify cluster resolution is correct
- `TrunkController::update()` - Line 215: `Carrier::where('pkey', $trunk->carrier)->first()`
  - **Impact**: Carrier lookup by pkey - verify carriers are globally unique or tenant-scoped

**Action Required**: Review resource lookups to ensure they correctly handle tenant-scoped resources.

### Models - Foreign Key Relationships

**Current Issue**: Models may define relationships using `pkey` as foreign key, which breaks when same `pkey` exists in multiple tenants.

**Affected Models** (need verification):
- `Extension` - May have relationships referencing other resources by pkey
- `Queue` - May reference extensions/agents by pkey
- `Agent` - May reference queues by pkey
- `Route` - May reference trunks by pkey
- `Ivr` - May reference extensions/greetings by pkey

**Action Required**: 
- Audit all model relationships
- Update foreign key relationships to use `shortuid` or `id` instead of `pkey` where appropriate
- Consider adding composite foreign keys (`cluster` + `pkey`) if relationships are tenant-scoped

### Middleware

**Current Issue**: Middleware that validates or checks resources by `pkey` may fail when same `pkey` exists in multiple tenants.

**Affected Middleware** (need verification):
- `ValidateClusterAccess` - May check resource access by pkey
- Any authorization middleware that validates resource ownership

**Action Required**: 
- Review middleware for pkey-based lookups
- Update to use `shortuid` or `id` for resource identification
- Ensure tenant context is properly validated

### API Documentation

**Current Issue**: API documentation may show examples using `pkey` in URLs.

**Affected Files**:
- `pbx3api/docs/api.md`
- `pbx3api/docs/general.md`
- Any other API documentation files

**Action Required**: 
- Update API documentation to show `shortuid` usage in examples
- Document that `pkey` is tenant-scoped and `shortuid` should be used for routing
- Add migration notes for API consumers

### Tests

**Current Issue**: Tests may use `pkey` for resource identification, which may fail when same `pkey` exists in multiple tenants.

**Affected Areas**:
- Unit tests for controllers
- Integration tests for API endpoints
- Feature tests for CRUD operations

**Action Required**: 
- Update tests to use `shortuid` for resource identification
- Add tests for multi-tenant scenarios (same pkey in different tenants)
- Verify tests handle shortuid resolution correctly

### Helper Functions

**Current Issue**: Helper functions that resolve or look up resources by `pkey` may return wrong resource.

**Affected Functions** (need verification):
- Any helper functions in `app/Helpers/Helper.php`
- Utility functions that resolve resources
- Functions that build resource references

**Action Required**: 
- Audit helper functions for pkey-based lookups
- Update to use `shortuid` or `id` where appropriate
- Ensure tenant context is preserved

### Background Jobs / Commands

**Current Issue**: Background jobs or artisan commands that process resources by `pkey` may process wrong resource.

**Affected Areas** (need verification):
- Queue jobs that process resources
- Artisan commands that operate on resources
- Scheduled tasks that reference resources

**Action Required**: 
- Review background jobs and commands
- Update to use `shortuid` or `id` for resource identification
- Ensure tenant context is properly maintained

### Database Migrations / Seeders

**Current Issue**: Migrations or seeders that reference resources by `pkey` may fail or create incorrect relationships.

**Affected Areas** (need verification):
- Database migrations that create foreign key relationships
- Seeders that create test data with relationships

**Action Required**: 
- Review migrations for pkey-based foreign keys
- Update seeders to use `shortuid` or `id` for relationships
- Ensure test data properly handles tenant scoping

---

## Priority Assessment

### High Priority (Critical for Correctness)
1. **Duplicate Key Validation** - Controllers must check `pkey + cluster` or use `shortuid` uniqueness
   - **Status**: ExtensionController already correct; others need update
   - **Action**: Update Queue, Agent, Route, Ivr, Trunk, InboundRoute controllers
2. **AMI Operations** - Extension runtime operations must target correct extension
   - **Status**: Route model binding ensures correct extension instance
   - **Action**: Verify AMI operations work correctly with shortuid-based routing
   - **Note**: AMI uses pkey within tenant context (unique), so should work correctly

### Medium Priority (Important for Consistency)
3. **Model Relationships** - Foreign keys should use globally unique identifiers
4. **API Documentation** - Documentation should reflect shortuid usage
5. **Tests** - Tests should verify multi-tenant scenarios

### Low Priority (Nice to Have)
6. **Helper Functions** - Update for consistency
7. **Background Jobs** - Update if they process tenant-scoped resources
8. **Migrations/Seeders** - Update for future-proofing

### Deferred (Needs Thorough Review)
9. **Class of Service Relationships** - CosOpen/CosClose controllers need comprehensive review
   - **Status**: Uses extension pkey in relationships
   - **Action**: Defer to end - needs thorough analysis of how Cos relationships work across tenants
   - **Note**: May need tenant-scoping or migration to shortuid/id, but requires full review first

### Future Enhancement (Separate Mini-Project)
10. **Database Constraints for Tenant-Scoped Uniqueness** - Add UNIQUE constraint on (cluster, pkey)
   - **Status**: Application-level validation currently handles this
   - **Rationale**: Database constraint provides defense-in-depth and prevents race conditions
   - **Action**: 
     - Add `UNIQUE (cluster, pkey)` constraint to tenant-scoped tables:
       - `agent`
       - `ipphone` (extensions)
       - `queue`
       - `route`
       - `ivrmenu` (IVRs)
       - `trunks`
       - `inroutes`
     - Ensure `cluster` is NOT NULL (or handle NULLs appropriately)
     - Create migration to:
       - Check for existing duplicates
       - Clean up any duplicates
       - Add constraint
     - Update application code to catch database constraint violations and return friendly error messages
   - **Benefits**:
     - Prevents race conditions (two simultaneous requests can't both pass validation)
     - Enforced at database level (cannot be bypassed)
     - Better performance (indexed constraint)
     - Consistent with existing pattern (`ipphonecosopen`/`ipphonecosclosed` already use composite keys)
   - **Note**: Deferred to avoid database reload/migration work now. Application validation provides sufficient protection for current needs. Can be implemented as separate mini-project.
