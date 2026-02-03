# Technical Debt Analysis: IVR Panel Pattern

**Date**: 2026-02-02  
**Status**: Pre-standardization review  
**Purpose**: Identify weaknesses before committing pattern as standard

---

## Executive Summary

The current IVR panel implementation works well functionally but contains several patterns that, if standardized across all panels, will create significant technical debt. This document identifies these weaknesses and recommends mitigation strategies.

**Risk Level**: **Medium-High**  
**Impact**: Will compound across 10+ panels if not addressed

---

## Critical Issues (Must Address Before Standardization)

### 1. **Code Duplication Between Create and Edit Views**

**Problem:**
- Validation logic (`validatePkey`, `validateCluster`, `validateGreetnum`) is duplicated
- Field rendering HTML is nearly identical
- State management pattern (`fieldError`, `fieldTouched` refs) is repeated
- Form submission logic is similar but not shared

**Impact:**
- Changes to validation rules require updates in 2+ places
- Bug fixes must be applied multiple times
- Inconsistent behavior between create/edit
- Maintenance burden increases linearly with number of panels

**Evidence:**
```javascript
// IvrCreateView.vue
const pkeyError = ref(null)
const pkeyTouched = ref(false)
function validatePkey(value) { ... }
function validateAll() { ... }

// IvrDetailView.vue  
const clusterError = ref(null)
const clusterTouched = ref(false)
function validateCluster(value) { ... }
function validateAll() { ... }
```

**Recommendation:**
- Extract validation logic to composable (`useFormValidation.js`)
- Create reusable form field components (`FormField.vue`, `FormSelect.vue`, `FormToggle.vue`)
- Share form structure via composable or component composition

---

### 2. **No Reusable Form Components**

**Problem:**
- Every field is manually coded with identical HTML structure
- No abstraction for common patterns (text input, dropdown, toggle)
- CSS classes repeated in every component
- ARIA attributes manually added to each field

**Impact:**
- Adding a new field type requires copying/pasting HTML
- Accessibility improvements require changes across all panels
- Styling changes require updates in multiple files
- Inconsistent implementations across panels

**Evidence:**
```vue
<!-- Repeated 20+ times across panels -->
<th class="detail-field-label" scope="row">
  <label for="field-id">Field Label</label>
</th>
<td class="detail-field-value">
  <input id="field-id" v-model="field" :class="{...}" />
  <p v-if="fieldError" class="field-error">{{ fieldError }}</p>
  <p v-else class="form-hint">Hint text</p>
</td>
```

**Recommendation:**
- Create `<FormField>` component with props: `label`, `type`, `modelValue`, `error`, `hint`, `required`
- Create `<FormSelect>` component for dropdowns
- Create `<FormToggle>` component for boolean fields
- Centralize CSS in shared stylesheet

---

### 3. **Table-Based Form Layout (Semantic Issue)**

**Problem:**
- Using `<table>` elements for form layout (not tabular data)
- Semantically incorrect HTML
- Harder to make responsive (tables don't stack well)
- Accessibility concerns (screen readers expect data tables)

**Impact:**
- Mobile responsiveness requires complex CSS overrides
- Screen reader users may be confused
- Future layout changes are difficult
- Violates HTML best practices

**Evidence:**
```vue
<table class="detail-fields-table edit-form-fields-table">
  <tbody>
    <tr>
      <th><label>...</label></th>
      <td><input /></td>
    </tr>
  </tbody>
</table>
```

**Recommendation:**
- Use CSS Grid or Flexbox with semantic HTML
- `<div class="form-field">` with `<label>` and `<input>`
- Maintain visual appearance while fixing semantics
- Better responsive behavior out of the box

---

### 4. **Validation Logic Not Centralized**

**Problem:**
- Validation rules are hardcoded in each component
- No shared validation schema
- Server-side validation rules may drift from client-side
- No way to reuse validation across resources

**Impact:**
- Inconsistent validation between panels
- API changes require manual updates in multiple places
- No single source of truth for validation rules
- Difficult to test validation logic

**Evidence:**
```javascript
// IvrCreateView.vue
function validatePkey(value) {
  if (!value || !value.trim()) return 'IVR Direct Dial is required'
  if (!/^\d{3,5}$/.test(value.trim())) return 'Must be 3-5 numeric digits'
  return null
}

// What if we need this same rule for Extension pkey?
// Must duplicate or risk inconsistency
```

**Recommendation:**
- Create validation schema system (`validationSchemas.js`)
- Define rules per resource/field
- Use composable to apply validation
- Consider library like `yup` or `zod` for schema validation

---

### 5. **Manual State Management for Validation**

**Problem:**
- Each field requires 2 refs (`fieldError`, `fieldTouched`)
- Manual `watch` handlers for each field
- Manual blur handlers for each field
- No abstraction for "touched" state

**Impact:**
- Boilerplate code increases with each field
- Easy to forget to add validation state
- Inconsistent validation behavior
- Hard to track form-wide validation state

**Evidence:**
```javascript
// For every field:
const fieldError = ref(null)
const fieldTouched = ref(false)
function onFieldBlur() {
  fieldTouched.value = true
  fieldError.value = validateField(field.value)
}
watch(field, (newValue) => {
  if (fieldTouched.value) {
    fieldError.value = validateField(newValue)
  }
})
```

**Recommendation:**
- Use form state management library (`vee-validate`, `formkit`)
- Or create composable: `useFieldValidation(fieldRef, validator)`
- Automatically handle touched state, errors, watchers

---

### 6. **Manual API Error Mapping**

**Problem:**
- Server errors must be manually mapped to field-level errors
- Error structure varies by API endpoint
- No consistent error handling pattern
- Easy to miss error mapping

**Impact:**
- Server errors may not display correctly
- Inconsistent error handling across panels
- Maintenance burden

**Evidence:**
```javascript
// Manual mapping in each component
if (errors.cluster) {
  clusterTouched.value = true
  clusterError.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
}
if (errors.greetnum) {
  greetnumTouched.value = true
  greetnumError.value = Array.isArray(errors.greetnum) ? errors.greetnum[0] : errors.greetnum
}
```

**Recommendation:**
- Create `mapApiErrorsToFields(apiErrors, fieldMap)` utility
- Standardize API error response format
- Auto-map errors to form fields

---

## Medium Priority Issues

### 7. **CSS Classes Defined Per Component**

**Problem:**
- Same CSS classes defined in multiple components
- No shared stylesheet
- Inconsistent styling if classes differ slightly

**Impact:**
- CSS duplication
- Harder to maintain consistent styling
- Larger bundle size

**Recommendation:**
- Extract common CSS to `form-styles.css` or `panel-styles.css`
- Use scoped styles only for component-specific styles

---

### 8. **Hardcoded Field Ordering**

**Problem:**
- Field order is hardcoded in template
- Cannot easily reorder fields
- No way to conditionally show/hide fields based on config

**Impact:**
- Field reordering requires template changes
- Cannot support field-level permissions
- Difficult to create dynamic forms

**Recommendation:**
- Define field configuration as data structure
- Render fields from config array
- Support conditional fields, ordering, permissions

---

### 9. **No Form State Management (Dirty, Pristine, etc.)**

**Problem:**
- Cannot detect if form has unsaved changes
- No way to warn user before navigation
- No "reset to original" functionality

**Impact:**
- Users may lose unsaved changes
- No way to implement "unsaved changes" warning
- Poor UX for accidental navigation

**Recommendation:**
- Track original values
- Compare current vs original on navigation
- Show warning if dirty

---

### 10. **Keystroke Options Hardcoded Structure**

**Problem:**
- `optionEntries` array is hardcoded
- Magic numbers (0-11) throughout code
- Not flexible if options change

**Impact:**
- Hard to extend or modify
- Magic numbers are error-prone
- Not reusable for other resources

**Recommendation:**
- Define option structure as configuration
- Use constants for option keys
- Make it data-driven

---

## Low Priority Issues (Can Address Later)

### 11. **No TypeScript**

**Problem:**
- No compile-time type checking
- No IntelliSense for API responses
- Easy to introduce type errors

**Impact:**
- Runtime errors instead of compile-time
- Less developer confidence
- Slower development

**Recommendation:**
- Consider migrating to TypeScript
- Or add JSDoc type annotations

---

### 12. **No Debouncing**

**Problem:**
- Validation runs on every keystroke (after first blur)
- No debouncing for API calls (destinations loading)
- Potential performance issues

**Impact:**
- Unnecessary validation runs
- Extra API calls
- Performance degradation with many fields

**Recommendation:**
- Debounce validation (300ms)
- Debounce filter input
- Cache API responses

---

### 13. **No Optimistic Updates**

**Problem:**
- UI waits for server response before updating
- No immediate feedback
- Slower perceived performance

**Impact:**
- Perceived slowness
- Less responsive feel

**Recommendation:**
- Update UI optimistically
- Rollback on error

---

### 14. **Help Text Hardcoded**

**Problem:**
- Help text is hardcoded in components
- No way to update without code changes
- No i18n support

**Impact:**
- Cannot update help text easily
- No multi-language support
- Hardcoded English only

**Recommendation:**
- Integrate with help text API (when available)
- Support i18n

---

### 15. **Incomplete Accessibility**

**Problem:**
- Some ARIA attributes present but not comprehensive
- No skip links
- Focus management could be better

**Impact:**
- Accessibility gaps
- May not meet WCAG standards

**Recommendation:**
- Complete ARIA implementation
- Add skip links
- Improve focus management

---

## Risk Assessment Matrix

| Issue | Severity | Likelihood | Impact | Priority |
|-------|----------|------------|--------|----------|
| Code Duplication | High | High | High | **Critical** |
| No Reusable Components | High | High | High | **Critical** |
| Table Layout | Medium | Medium | Medium | **High** |
| Validation Not Centralized | High | High | Medium | **High** |
| Manual State Management | Medium | High | Medium | **High** |
| Manual Error Mapping | Medium | High | Low | **Medium** |
| CSS Duplication | Low | High | Low | **Medium** |
| Hardcoded Field Order | Low | Medium | Low | **Low** |
| No Form State | Low | Medium | Medium | **Low** |
| Hardcoded Options | Low | Low | Low | **Low** |

---

## Recommended Action Plan

### Phase 1: Before Standardization (Critical)

1. **Create Reusable Form Components**
   - `<FormField>` for text inputs
   - `<FormSelect>` for dropdowns
   - `<FormToggle>` for boolean fields
   - Extract to `src/components/forms/`

2. **Create Validation Composable**
   - `useFormValidation.js` composable
   - Centralized validation rules
   - Reusable validation state management

3. **Fix Table Layout**
   - Convert to CSS Grid/Flexbox
   - Maintain visual appearance
   - Improve semantics

### Phase 2: During Standardization (High Priority)

4. **Create Shared Stylesheet**
   - Extract common CSS
   - Define design tokens
   - Ensure consistency

5. **Create Form State Composable**
   - `useFormState.js` for dirty/pristine tracking
   - Handle form reset
   - Warn on unsaved changes

6. **Standardize Error Handling**
   - `mapApiErrorsToFields()` utility
   - Consistent error response format
   - Auto-mapping

### Phase 3: After Standardization (Medium/Low Priority)

7. **Add Debouncing**
8. **Complete Accessibility**
9. **Add Form Configuration System**
10. **Consider TypeScript Migration**

---

## Migration Strategy

### Option A: Refactor IVR First (Recommended)

1. Refactor IVR panels to use new components/composables
2. Validate pattern works well
3. Apply to other panels incrementally

**Pros:**
- Validates approach before scaling
- IVR becomes reference implementation
- Lower risk

**Cons:**
- Temporary inconsistency during migration
- Takes longer

### Option B: Build Infrastructure First

1. Build all reusable components/composables
2. Create comprehensive pattern document
3. Apply to all panels simultaneously

**Pros:**
- Consistent from start
- Faster overall

**Cons:**
- Higher risk if pattern has issues
- More upfront work

**Recommendation**: **Option A** - Refactor IVR first, then standardize

---

## Success Criteria

Before standardizing, ensure:

- [ ] Form components are reusable and tested
- [ ] Validation logic is centralized
- [ ] Layout uses semantic HTML
- [ ] Code duplication is minimized
- [ ] Pattern is documented
- [ ] IVR panels work with new pattern
- [ ] Performance is acceptable
- [ ] Accessibility is improved

---

## Conclusion

The current IVR implementation is **functionally sound** but contains patterns that will create technical debt if standardized as-is. The **critical issues** (code duplication, no reusable components, table layout) should be addressed before applying the pattern to other panels.

**Recommendation**: Refactor IVR panels to use reusable components and centralized validation, then use that as the standard pattern for other panels.

---

*This analysis should be reviewed before committing the pattern as standard.*
