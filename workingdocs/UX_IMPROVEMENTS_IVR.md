# IVR CRUD Panels - UX Improvements Task List

## Status Overview
- **Completed**: 1/9 (11%)
- **In Progress**: 0/9
- **Pending**: 8/9 (89%)

---

## High Priority

### ✅ 1. Inline Form Validation with Field-Level Errors
**Status**: COMPLETED  
**Date Completed**: 2026-02-02

**What was done:**
- Real-time validation on blur/change
- Field-level error messages with visual indicators
- Visual error states (red border, warning icon)
- Valid states (green border when field is valid)
- Focus management on submit (focuses first error field)
- Server error mapping to field-level errors
- Applied to both Create and Edit panels

**Fields validated:**
- IVR Direct Dial (pkey): Required, 3-5 numeric digits
- Tenant: Required
- Greeting Number: Optional, validates if provided

---

### ⬜ 2. Improved Accessibility (ARIA, Keyboard Navigation)
**Status**: PENDING

**Description:** Add skip links for form sections, ensure all interactive elements are keyboard accessible, improve focus management, add `aria-describedby` for all fields, add `aria-required` for required fields, ensure proper heading hierarchy, test with screen reader.

**Implementation Steps:**
- [ ] **Step 2.1**: Add `aria-required="true"` to required form fields (pkey, tenant)
- [ ] **Step 2.2**: Add `aria-describedby` linking all fields to their hint/error messages
- [ ] **Step 2.3**: Add `aria-label` to icon-only buttons (Edit, Delete icons in list)
- [ ] **Step 4**: Add `aria-hidden="true"` to decorative icons
- [ ] **Step 2.5**: Add skip links at top of create/edit forms (Identity, Settings, Keystroke options)
- [ ] **Step 2.6**: Ensure proper heading hierarchy (h1 → h2 → h3)
- [ ] **Step 2.7**: Add visible focus indicators (enhance existing focus styles)
- [ ] **Step 2.8**: Test keyboard navigation (Tab through entire form)
- [ ] **Step 2.9**: Test with screen reader (VoiceOver/NVDA)

---

### ⬜ 3. Mobile Responsiveness
**Status**: PENDING

**Description:** Add responsive breakpoints for table layout, stack label/value vertically on mobile, adjust filter and toolbar for small screens, make action buttons more touch-friendly, optimize Keystroke options table for mobile.

**Implementation Steps:**
- [ ] **Step 3.1**: Add media query breakpoint at 768px
- [ ] **Step 3.2**: Stack label/value vertically in Identity/Settings tables on mobile
- [ ] **Step 3.3**: Adjust filter and toolbar layout for mobile (stack vertically)
- [ ] **Step 3.4**: Increase touch target size for Edit/Delete buttons (min 44x44px)
- [ ] **Step 3.5**: Make Keystroke options table horizontally scrollable on mobile
- [ ] **Step 3.6**: Test on mobile device (or browser dev tools mobile view)
- [ ] **Step 3.7**: Test on tablet size (768px - 1024px)

---

## Medium Priority

### ⬜ 4. Enhanced Field Hints and Examples
**Status**: PENDING

**Description:** Expand hints with more context, add examples where helpful, explain "Timeout" dropdown behavior, clarify "Listen for extension dial" behavior, add tooltips for technical terms, provide examples for Tag and Alert fields.

**Note:** Help texts are stored in `tt_help_core` and are now editable via the **Help messages** admin panel (API: helpcore resource). A per-field hint API (e.g. GET /help/{resource}/{field}) for in-context tooltips in IVR and other panels is still optional; see "Help Text API & Internationalization" below.

**Implementation Steps:**
- [ ] **Step 4.1**: Expand hint for "Timeout" field (explain what happens on timeout)
- [ ] **Step 4.2**: Expand hint for "Listen for extension dial" (explain behavior and performance impact)
- [ ] **Step 4.3**: Add example values for Tag field in Keystroke options
- [ ] **Step 4.4**: Add example values for Alert field in Keystroke options
- [ ] **Step 4.5**: Add hint explaining how to create greetings (for Greeting Number field)
- [ ] **Step 4.6**: Review all existing hints for clarity and completeness
- [ ] **Step 4.7**: Test hints are visible and helpful to new users

---

### ⬜ 5. Better Loading States
**Status**: PENDING

**Description:** Add skeleton loaders for list view, show loading state while fetching destinations, loading indicators for async operations (tenants, greetings), disable form during save operation.

**Implementation Steps:**
- [ ] **Step 5.1**: Add loading spinner/skeleton for IVR list while loading
- [ ] **Step 5.2**: Show "Loading destinations..." indicator in Keystroke options section
- [ ] **Step 5.3**: Add loading indicator for tenants dropdown (already has "Loading…" option)
- [ ] **Step 5.4**: Add loading indicator for greetings dropdown
- [ ] **Step 5.5**: Disable form inputs during save operation (prevent double-submit)
- [ ] **Step 5.6**: Show saving state on submit button ("Saving…" text)
- [ ] **Step 5.7**: Test loading states appear/disappear correctly

---

### ⬜ 6. Keystroke Options Improvements
**Status**: PENDING

**Description:** Make sections collapsible, visual grouping (0-9, *, #), show only configured options by default (with "Show all" toggle), reduce visual clutter.

**Implementation Steps:**
- [ ] **Step 6.1**: Add "Show all" / "Show configured only" toggle button
- [ ] **Step 6.2**: Filter to show only rows where option !== 'None' by default
- [ ] **Step 6.3**: Add visual separator/grouping between 0-9, *, # sections
- [ ] **Step 6.4**: Add collapsible section wrapper (optional - can collapse entire section)
- [ ] **Step 6.5**: Test toggle works correctly (shows/hides unconfigured rows)
- [ ] **Step 6.6**: Test visual grouping improves readability

---

## Low Priority

### ⬜ 7. Advanced Filtering
**Status**: PENDING

**Description:** Debounce filter input, show result count ("5 IVRs found"), clear button (X) when filter is active, filter by multiple columns.

**Implementation Steps:**
- [ ] **Step 7.1**: Add debounce to filter input (300ms delay)
- [ ] **Step 7.2**: Show result count above table ("5 IVRs found" or "No IVRs match filter")
- [ ] **Step 7.3**: Add clear button (X) inside filter input when text is present
- [ ] **Step 7.4**: Test debounce reduces API calls/renders
- [ ] **Step 7.5**: Test clear button resets filter and shows all results
- [ ] **Step 7.6**: (Future) Add multi-column filtering UI

---

### ⬜ 8. Column Management
**Status**: PENDING

**Description:** Column visibility toggle, sticky first column (IVR Direct Dial), responsive column hiding.

**Implementation Steps:**
- [ ] **Step 8.1**: Hide less important columns on small screens (< 1024px) via CSS
- [ ] **Step 8.2**: Make first column (IVR Direct Dial) sticky when scrolling horizontally
- [ ] **Step 8.3**: Test responsive hiding works at different screen sizes
- [ ] **Step 8.4**: Test sticky column works when table overflows
- [ ] **Step 8.5**: (Future) Add column visibility toggle UI

---

### ⬜ 9. Success Feedback Refinements
**Status**: PENDING

**Description:** Toast notification before redirect, or stay on page with success message, better confirmation of save success.

**Implementation Steps:**
- [ ] **Step 9.1**: Ensure toast notification shows before redirect (verify timing)
- [ ] **Step 9.2**: Add success message that stays visible for 2-3 seconds
- [ ] **Step 9.3**: Test toast is visible and readable before redirect happens
- [ ] **Step 9.4**: (Future) Consider staying on page with success banner instead of redirect

---

## Help Text API & Internationalization

### Current Situation
- **Database**: Help texts exist in `tt_help_core` table (English only)
- **API**: No endpoint currently exists to access help texts
- **Language**: All entries are English only
- **Impact**: Affects Task #4 (Enhanced Field Hints) and broader UX improvements

### The Challenge
Creating a help text API exposes the need for:
1. Multi-language support (internationalization/i18n)
2. Language detection/preference management
3. Fallback handling (missing translations)
4. Database schema considerations
5. Translation management workflow

### Recommended Phased Approach

#### Phase 1: Immediate UX Improvements (Current)
- **Action**: Implement Task #4 with hardcoded hints in components
- **Rationale**: Provides immediate UX benefit without API/i18n complexity
- **Timeline**: Can proceed now
- **Trade-off**: Not scalable long-term, but gets improvements to users quickly

#### Phase 2: Help Text API (Separate Project)
- **Status:** Admin CRUD for tt_help_core is **done** (helpcore API + Help messages panel). Optional next step: per-field hint API for in-context tooltips.
- **Action** (optional): Build per-field hint endpoint, e.g. `GET /help/{resource}/{field}?lang={lang}` (start with English only)
- **Structure**: Design response format to support future i18n:
  ```json
  {
    "field": "pkey",
    "resource": "ivr",
    "hint": "Numeric ID (3-5 digits) for this IVR.",
    "example": "e.g. 1234",
    "language": "en"
  }
  ```
- **Timeline**: Separate project, can be done in parallel
- **Benefit**: Centralized help text management, easier to update

#### Phase 3: Internationalization (Future)
- **Action**: Add multi-language support to help API
- **Requirements**: 
  - Language parameter support
  - Database schema for translations
  - Translation management UI/workflow
  - User language preference storage
- **Timeline**: When multi-language support is needed
- **Scope**: Consider if this extends beyond help text to all UI text

### Design Considerations

**API Endpoint Design:**
- Start simple: `GET /help/ivr/pkey` (defaults to English)
- Add language later: `GET /help/ivr/pkey?lang=es`
- Support fallback: Return English if translation missing

**Database Schema:**
- Current: `tt_help_core` (English only)
- Future: May need `tt_help_core_translations` or language column
- Consider: Versioning (help text changes over time)

**Frontend Integration:**
- Phase 1: Hardcoded hints in components
- Phase 2: Fetch from API, cache responses
- Phase 3: Language-aware fetching based on user preference

### Impact on UX Improvements

**Task #4 (Enhanced Field Hints):**
- **Without API**: Hardcode hints → Quick implementation, English only
- **With API**: Dynamic hints → Scalable, maintainable, but requires API project
- **With i18n**: Multi-language hints → Best UX, but most complex

**Recommendation**: Proceed with Phase 1 (hardcoded) for Task #4, plan for Phase 2 (API) as separate project.

### Questions to Resolve
- [ ] What is the target user base? (English-only vs. multi-language)
- [ ] When is i18n support needed?
- [ ] Who will manage translations?
- [ ] Should i18n extend beyond help text to all UI text?
- [ ] What is the priority of the Help Text API project?

---

## Notes

### Implementation Details

**Validation Implementation:**
- Uses Vue 3 Composition API with `ref` for state management
- Validation triggers: `@blur`, `watch` for change detection, `validateAll()` on submit
- Error state classes: `input-error`, `input-valid`
- Error message component: `.field-error` with warning icon
- Accessibility: `aria-invalid`, `aria-describedby`, `role="alert"`

**Current Field Validation Rules:**
- **pkey**: Required, must match `/^\d{3,5}$/`
- **cluster**: Required, must not be empty
- **greetnum**: Optional, if provided must be valid integer >= 0

---

## Future Considerations

- Form auto-save (draft functionality)
- Bulk operations (select multiple IVRs)
- Export/Import functionality
- Advanced search (beyond simple filter)
- Field-level undo/redo
- Form templates/presets
- Validation rule customization

---

*Last Updated: 2026-02-02*
