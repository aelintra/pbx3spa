# Standardized Panel Design Pattern

**Last Updated**: 2026-02-02  
**Based on**: IVR CRUD panels implementation  
**Status**: Pattern established, ready for application to all panels

---

## Overview

This document defines the standardized pattern for all CRUD panels in the application. The pattern was established through the IVR panel implementation and should be applied consistently across all resources (Tenants, Extensions, Trunks, Routes, Queues, Agents, InboundRoutes, etc.).

---

## Panel Types

### 1. List View (`*ListView.vue`)
**Purpose**: Display all resources in a table with filtering, sorting, and actions

### 2. Create View (`*CreateView.vue`)
**Purpose**: Form to create a new resource

### 3. Edit View (`*DetailView.vue`)
**Purpose**: Form to edit an existing resource (always opens in edit mode)

---

## List View Pattern

### Structure

```
<div class="list-view">
  <header class="list-header">
    <h1>{Resource Name}s</h1>
    <p class="toolbar">
      <router-link :to="{ name: '{resource}-create' }" class="add-btn">Create</router-link>
      <input v-model="filterText" type="search" class="filter-input" ... />
    </p>
  </header>

  <section v-if="loading || error || deleteError || items.length === 0" class="list-states">
    <!-- Loading, error, empty states -->
  </section>

  <section v-else class="list-body">
    <p v-if="filterText && filteredItems.length === 0" class="empty">No items match filter.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <!-- Sortable column headers -->
          <th class="th-sortable" @click="setSort('field')">Column Name</th>
          <th class="th-actions" title="Edit">...</th>
          <th class="th-actions" title="Delete">...</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedItems" :key="item.pkey">
          <td>{{ item.field }}</td>
          <td>
            <router-link :to="{ name: '{resource}-detail', params: { pkey: item.pkey } }" 
                         class="cell-link cell-link-icon" title="Edit">
              <!-- Edit icon -->
            </router-link>
          </td>
          <td>
            <button @click="askConfirmDelete(item.pkey)" class="cell-link cell-link-delete">
              <!-- Delete icon -->
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Delete confirmation modal -->
  <Teleport to="body">...</Teleport>
</div>
```

### Key Elements

**Header:**
- `<h1>`: Resource plural name (e.g., "IVRs", "Tenants")
- Toolbar: Create button (left) + Filter input (right, same line, with `justify-content: space-between`)

**Table:**
- Sortable columns: `th-sortable` class, click handler, sort indicators
- Action columns: Edit (router-link), Delete (button)
- Immutable fields: `cell-immutable` class with `title="Immutable"`

**Filter:**
- Type: `type="search"`
- Position: Right side of toolbar, same line as Create button
- Placeholder: Describes what can be filtered

**Columns:**
- Primary identifier (e.g., "IVR Direct Dial", "Tenant name")
- Local UID (shortuid) - immutable styling
- Tenant (if applicable) - resolve shortuid to pkey for display
- Description
- Resource-specific columns (e.g., Greeting number, Timeout)
- Edit action (icon)
- Delete action (icon)

### CSS Classes

```css
.list-view { ... }
.list-header { ... }
.list-header h1 { margin: 0; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.add-btn { /* Primary button styling */ }
.filter-input { /* Search input styling */ }
.table { /* Table styling */ }
.th-sortable { /* Sortable header */ }
.cell-link { /* Link styling */ }
.cell-link-icon { /* Icon button */ }
.cell-link-delete { /* Delete button */ }
.cell-immutable { /* Immutable field styling */ }
```

---

## Create View Pattern

### Structure

```
<div class="create-view">
  <p class="back">
    <button type="button" class="back-btn" @click="goBack">← {Resource}s</button>
  </p>
  <h1>Create {Resource Name}</h1>

  <form class="form" @submit="onSubmit" @keydown="onKeydown">
    <p v-if="error" id="{resource}-create-error" class="error" role="alert">{{ error }}</p>

    <h2 class="detail-heading">Identity</h2>
    <table class="detail-fields-table edit-form-fields-table" aria-label="Identity">
      <tbody>
        <tr>
          <th class="detail-field-label" scope="row">
            <label for="field-id">Field Label</label>
          </th>
          <td class="detail-field-value">
            <input
              id="field-id"
              v-model="field"
              :class="{ 'edit-input': true, 'input-error': fieldError && fieldTouched }"
              :aria-invalid="fieldError && fieldTouched"
              :aria-describedby="fieldError && fieldTouched ? 'field-id-error' : 'field-id-hint'"
              @blur="onFieldBlur"
            />
            <p v-if="fieldError && fieldTouched" id="field-id-error" class="field-error" role="alert">
              {{ fieldError }}
            </p>
            <p v-else id="field-id-hint" class="form-hint">
              Hint text explaining the field.
            </p>
          </td>
        </tr>
        <!-- More fields -->
      </tbody>
    </table>

    <h2 class="detail-heading">Settings</h2>
    <table class="detail-fields-table edit-form-fields-table" aria-label="Settings">
      <!-- Settings fields -->
    </table>

    <!-- Optional: Additional sections (e.g., Keystroke options) -->
    <section class="destinations-section" aria-labelledby="...">
      <h2 id="..." class="destinations-heading">Section Name</h2>
      <!-- Section content -->
    </section>

    <div class="actions">
      <button type="submit" :disabled="loading">Create</button>
      <button type="button" class="secondary" @click="goBack">Cancel</button>
    </div>
  </form>
</div>
```

### Key Elements

**Navigation:**
- Back button: `← {Resource}s` (navigates to list)
- Heading: `Create {Resource Name}` (no dynamic name, resource is being created)

**Form Structure:**
- Always uses `<form>` with `@submit` handler
- Error message at top: `role="alert"`, unique ID
- Sections: Identity → Settings → (optional sections)
- Each section: `<h2 class="detail-heading">` → `<table class="detail-fields-table">`

**Field Layout:**
- Table-based: `<table>` with `<th>` (label) and `<td>` (input/value)
- Labels: `<label>` inside `<th scope="row">`
- Inputs: Inside `<td class="detail-field-value">`
- Hints/Errors: `<p>` below input, conditional display

**Validation:**
- Field-level error state: `fieldError`, `fieldTouched`
- Visual states: `input-error`, `input-valid` classes
- ARIA: `aria-invalid`, `aria-describedby`
- Error messages: `role="alert"`, replace hints when present

**Actions:**
- Submit button: Primary style, shows loading state
- Cancel button: Secondary style, navigates back

### Field Order (Identity Section)

1. Primary identifier (e.g., "IVR Direct Dial", "Extension number")
   - Required, validated
   - May have specific format (e.g., numeric, 3-5 digits)
2. Tenant (if applicable)
   - Required dropdown
   - Resolves shortuid to pkey for display
3. Description (optional)
   - Text input
4. Display name / Common name (optional, if applicable)
   - Text input
5. Legacy/Deprecated fields (if applicable)
   - Marked as optional, with hint about deprecation

### Field Order (Settings Section)

1. Active? (boolean toggle)
   - iOS-style sliding pill toggle
   - Default: 'YES'
2. Resource-specific settings
   - Dropdowns, inputs, toggles as needed
   - Ordered by importance/frequency of use
3. Timeout/Action fields (if applicable)
   - Usually last in Settings

### CSS Classes

```css
.create-view { max-width: 52rem; }
.back { margin-bottom: 1rem; }
.back-btn { /* Back button styling */ }
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.detail-fields-table {
  margin-top: 0.5rem;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  display: table;
}
.detail-field-label {
  font-weight: 500;
  color: #475569;
  padding: 0.375rem 1rem 0.375rem 0;
  vertical-align: top;
  width: 1%;
  white-space: nowrap;
}
.detail-field-value {
  padding: 0.375rem 0;
  vertical-align: top;
}
.edit-input { /* Input styling */ }
.input-error { /* Error state */ }
.input-valid { /* Valid state */ }
.field-error { /* Error message */ }
.form-hint { /* Hint text */ }
.actions { /* Action buttons container */ }
```

---

## Edit View Pattern

### Structure

```
<div class="detail-view" @keydown="onKeydown">
  <p class="back">
    <button type="button" class="back-btn" @click="goBack">← {Resource}s</button>
  </p>
  <h1>Edit {Resource Name} {{ displayName || pkey }}</h1>

  <p v-if="loading" class="loading">Loading…</p>
  <p v-else-if="error" class="error">{{ error }}</p>
  <template v-else-if="resource">
    <div class="detail-content">
      <p v-if="deleteError" class="error">{{ deleteError }}</p>

      <form class="edit-form" @submit="saveEdit">
        <p v-if="saveError" id="{resource}-edit-error" class="error" role="alert">{{ saveError }}</p>

        <h2 class="detail-heading">Identity</h2>
        <table class="detail-fields-table edit-form-fields-table" aria-label="Identity">
          <tbody>
            <!-- Immutable fields (readonly) -->
            <tr>
              <th class="detail-field-label" scope="row">
                <label for="edit-identity-pkey">Primary Identifier</label>
              </th>
              <td class="detail-field-value">
                <p id="edit-identity-pkey" class="detail-readonly value-immutable" title="Immutable">
                  {{ resource.pkey ?? '—' }}
                </p>
              </td>
            </tr>
            <!-- Editable fields -->
            <tr>
              <th class="detail-field-label" scope="row">
                <label for="edit-field">Field Label</label>
              </th>
              <td class="detail-field-value">
                <input id="edit-field" v-model="editField" class="edit-input" ... />
                <!-- Hint or error -->
              </td>
            </tr>
          </tbody>
        </table>

        <h2 class="detail-heading">Settings</h2>
        <!-- Settings table -->

        <!-- Optional sections -->

        <div class="edit-actions">
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
        </div>
      </form>
    </div>
  </template>
</div>
```

### Key Elements

**Navigation:**
- Back button: `← {Resource}s`
- Heading: `Edit {Resource Name} {displayName || pkey}`
  - Shows display name (cname) if available, falls back to pkey
  - Example: "Edit IVR Main Menu" or "Edit IVR 1234"

**Always in Edit Mode:**
- No read-only view
- Form is always visible and editable
- Opens directly to edit mode (no intermediate view)

**Field Organization:**
- Identity section: Immutable fields first (pkey, shortuid, id), then editable
- Settings section: All editable settings
- Immutable fields: `<p class="detail-readonly value-immutable">` with `title="Immutable"`

**Validation:**
- Same pattern as Create view
- Field-level errors, visual states, ARIA attributes

**Actions:**
- Save button: Shows "Saving…" state
- Cancel button: Navigates back to list (no "cancel edit" mode)

### Field Order (Identity Section - Edit)

1. Primary identifier (readonly, immutable)
2. Local UID (readonly, immutable)
3. KSUID (readonly, immutable)
4. Tenant (editable dropdown)
5. Description (optional, editable)
6. Display name / Common name (optional, editable)
7. Legacy/Deprecated fields (optional, editable)

### Field Order (Settings Section - Edit)

Same as Create view, but may include additional fields that are only editable (not set on create).

---

## Common Patterns

### Boolean Fields

**Use iOS-style sliding pill toggles:**

```vue
<label class="toggle-pill-ios" aria-label="Field Name">
  <input
    type="checkbox"
    :checked="field === 'YES'"
    @change="field = $event.target.checked ? 'YES' : 'NO'"
  />
  <span class="toggle-pill-track"><span class="toggle-pill-thumb"></span></span>
</label>
```

**CSS:**
```css
.toggle-pill-ios { /* Container */ }
.toggle-pill-track { /* Track background */ }
.toggle-pill-thumb { /* Sliding thumb */ }
/* Checked state: green background, thumb translated */
```

### Dropdown Fields

```vue
<select
  id="field-id"
  v-model="field"
  class="edit-input"
  :aria-invalid="fieldError && fieldTouched"
  :aria-describedby="..."
  :disabled="loading"
  @blur="onFieldBlur"
>
  <option v-if="loading" value="">Loading…</option>
  <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
</select>
```

### Text Input Fields

```vue
<input
  id="field-id"
  v-model="field"
  type="text"
  class="edit-input"
  :class="{ 'input-error': fieldError && fieldTouched }"
  placeholder="e.g. example"
  :aria-invalid="fieldError && fieldTouched"
  :aria-describedby="..."
  @blur="onFieldBlur"
/>
```

### Readonly/Immutable Fields

```vue
<p class="detail-readonly value-immutable" title="Immutable">
  {{ value ?? '—' }}
</p>
```

---

## Validation Pattern

### State Management

```javascript
// Field-level validation state
const fieldError = ref(null)
const fieldTouched = ref(false)

// Validation function
function validateField(value) {
  if (!value || !value.trim()) {
    return 'Field is required'
  }
  // Additional validation rules
  return null // Valid
}

// Blur handler
function onFieldBlur() {
  fieldTouched.value = true
  fieldError.value = validateField(field.value)
}

// Watch for changes (after first touch)
watch(field, (newValue) => {
  if (fieldTouched.value) {
    fieldError.value = validateField(newValue)
  }
})

// Validate all on submit
function validateAll() {
  let isValid = true
  fieldTouched.value = true
  fieldError.value = validateField(field.value)
  if (fieldError.value) isValid = false
  // ... validate other fields
  return isValid
}
```

### Template Integration

```vue
<input
  :class="{
    'edit-input': true,
    'input-error': fieldError && fieldTouched,
    'input-valid': !fieldError && fieldTouched && field.trim()
  }"
  :aria-invalid="fieldError && fieldTouched"
  :aria-describedby="fieldError && fieldTouched ? 'field-id-error' : 'field-id-hint'"
  @blur="onFieldBlur"
/>
<p v-if="fieldError && fieldTouched" id="field-id-error" class="field-error" role="alert">
  {{ fieldError }}
</p>
<p v-else id="field-id-hint" class="form-hint">
  Hint text.
</p>
```

---

## Navigation Pattern

### List → Create
- Click "Create" button → Navigate to `{resource}-create` route

### List → Edit
- Click Edit icon → Navigate to `{resource}-detail` route with `pkey` param
- Always opens in edit mode (no read-only view)

### Create/Edit → List
- Click Cancel button → Navigate to `{resource}s` route
- Click Back button (←) → Navigate to `{resource}s` route
- After successful save → Navigate to detail view (edit) or list

### Keyboard Navigation
- `Escape` key: Navigate back to list
- `Enter` on form: Submit form

---

## Spacing & Layout

### Vertical Spacing

- **Main heading to first section**: 1.5rem margin-top on first `.detail-heading`
- **Between sections**: 1.5rem margin-top on `.detail-heading` (except first)
- **Section heading to table**: 0.5rem margin-top on `.detail-fields-table`
- **Between table rows**: No border, clean spacing
- **After last section**: 1.5rem margin-bottom

### Horizontal Layout

- **Table layout**: `display: table` (explicit)
- **Label column**: Fixed width (`width: 1%`), `white-space: nowrap`
- **Value column**: Flexible, takes remaining space
- **Max width**: Create/Edit views: `max-width: 52rem`

---

## Styling Conventions

### Colors

- **Headings**: `#334155` (slate-700)
- **Field labels**: `#475569` (slate-600)
- **Hint text**: `#64748b` (slate-500)
- **Error text**: `#dc2626` (red-600)
- **Valid border**: `#16a34a` (green-600)
- **Immutable fields**: `#64748b` (slate-500) with `#f8fafc` background

### Typography

- **Main heading (h1)**: Default size, bold
- **Section heading (h2)**: `1rem`, `font-weight: 600`
- **Field labels**: `font-weight: 500`
- **Hint text**: `0.8125rem` (13px)
- **Table text**: `0.9375rem` (15px)

### Borders & Shadows

- **Input borders**: `1px solid #e2e8f0` (slate-200)
- **Error borders**: `2px solid #dc2626`
- **Focus**: `border-color: #3b82f6` (blue-500)
- **Focus ring**: `box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)`

---

## Component Structure (Script)

### Standard Imports

```javascript
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
```

### Standard Refs

```javascript
const router = useRouter()
const toast = useToastStore()
const route = useRoute()
const resource = ref(null)
const loading = ref(true)
const error = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const pkey = computed(() => route.params.pkey)

// Edit form fields (prefix with "edit")
const editField = ref('')

// Validation state
const fieldError = ref(null)
const fieldTouched = ref(false)
```

### Standard Functions

```javascript
// Navigation
function goBack() {
  router.push({ name: '{resource}s' })
}

// Keyboard handler
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

// Normalize API responses
function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.{resource}s)) return response.{resource}s
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

// Field errors from API
function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}
```

---

## Field Naming Conventions

### Database Fields → Display Labels

- `pkey` → "IVR Direct Dial" / "Extension number" / "Tenant name" (resource-specific)
- `shortuid` → "Local UID"
- `id` → "KSUID"
- `cluster` → "Tenant"
- `description` → "Description"
- `cname` → "Display name"
- `name` → "Name" (if not deprecated)
- `active` → "Active?"
- Boolean fields → Use question format: "Active?", "Listen for extension dial?"

### Field Labels in Forms

- Required fields: No "(required)" suffix (use `aria-required` instead)
- Optional fields: Include "(optional)" in label
- Immutable fields: Show with `title="Immutable"` and readonly styling

---

## Error Handling

### Display Hierarchy

1. **Field-level errors**: Show inline below field (highest priority)
2. **Form-level errors**: Show at top of form (`role="alert"`)
3. **Delete errors**: Show above form actions
4. **Loading errors**: Show instead of content

### Error Message Format

- Field errors: Specific to field (e.g., "Must be 3-5 numeric digits")
- Form errors: General or first field error from API
- Delete errors: Specific to delete operation

---

## Loading States

### List View
- Show "Loading {Resource}s from API…" while `loading === true`
- Show empty state if `items.length === 0` after load

### Create/Edit View
- Show "Loading…" while `loading === true`
- Disable form inputs during save (`saving === true`)
- Show "Creating…" / "Saving…" on submit button

### Async Data Loading
- Dropdowns: Show "Loading…" option while loading
- Disable dropdowns while loading (`:disabled="loading"`)
- Show loading indicators for destinations, tenants, etc.

---

## Success Feedback

### After Create
- Show toast: `"{Resource} {pkey} created"`
- Navigate to detail view (edit mode)

### After Edit
- Show toast: `"{Resource} {pkey} saved"`
- Stay on edit view (refresh data if needed)

### After Delete
- Show toast: `"{Resource} {pkey} deleted"`
- Navigate to list view

---

## Accessibility Requirements

### ARIA Attributes

- **Required fields**: `aria-required="true"`
- **Invalid fields**: `aria-invalid="true"`
- **Field descriptions**: `aria-describedby="field-id-hint"` or `"field-id-error"`
- **Error messages**: `role="alert"`
- **Icon buttons**: `aria-label="Action name"`
- **Decorative icons**: `aria-hidden="true"`

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order
- Visible focus indicators
- Escape key returns to list
- Enter submits forms

### Semantic HTML

- Proper heading hierarchy (h1 → h2 → h3)
- Table headers with `scope` attributes
- Form labels properly associated with inputs
- Skip links for form sections (future enhancement)

---

## Responsive Considerations

### Mobile (< 768px)

- Stack label/value vertically in tables
- Adjust toolbar/filter layout
- Increase touch target sizes (min 44x44px)
- Horizontal scroll for wide tables

### Tablet (768px - 1024px)

- May hide less important columns
- Adjust spacing as needed

### Desktop (> 1024px)

- Full layout with all columns visible
- Optimal spacing and readability

---

## Migration Checklist

When applying this pattern to existing panels:

- [ ] Update list view header (Create button + Filter layout)
- [ ] Update list view columns (add resource-specific columns)
- [ ] Remove pkey link from list (navigation via edit icon only)
- [ ] Update create view structure (Identity → Settings tables)
- [ ] Update edit view heading format ("Edit {Resource} {name}")
- [ ] Remove read-only view from edit (always open in edit mode)
- [ ] Convert boolean fields to iOS-style toggles
- [ ] Implement table-based field layout
- [ ] Add field-level validation
- [ ] Update spacing and styling
- [ ] Ensure consistent field ordering
- [ ] Add ARIA attributes
- [ ] Test keyboard navigation
- [ ] Test responsive layout

---

## Examples

### Complete Examples

See:
- `IvrCreateView.vue` - Create view pattern
- `IvrDetailView.vue` - Edit view pattern  
- `IvrsListView.vue` - List view pattern

These files serve as the reference implementation for this pattern.

---

*This pattern should be applied to all CRUD panels for consistency and maintainability.*
