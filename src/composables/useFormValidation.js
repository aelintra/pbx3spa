import { ref, watch } from 'vue'

/**
 * Composable for form field validation
 *
 * @param {Ref} fieldRef - Vue ref containing the field value
 * @param {Function} validator - Validation function that returns error message or null
 * @param {Object} options - Options for validation behavior
 * @returns {Object} Validation state and handlers
 */
export function useFormValidation(fieldRef, validator, options = {}) {
  const {
    validateOnChange = true, // Validate on change after first blur
    validateOnBlur = true // Validate on blur
  } = options

  const error = ref(null)
  const touched = ref(false)

  function validate() {
    const result = validator(fieldRef.value)
    error.value = result
    return result === null
  }

  function onBlur() {
    touched.value = true
    if (validateOnBlur) {
      validate()
    }
  }

  function reset() {
    error.value = null
    touched.value = false
  }

  // Watch for changes and validate if touched
  if (validateOnChange && fieldRef) {
    watch(fieldRef, () => {
      if (touched.value) {
        validate()
      }
    })
  }

  return {
    error,
    touched,
    validate,
    onBlur,
    reset,
    isValid: () => error.value === null
  }
}

/**
 * Helper to validate all fields in a form
 *
 * @param {Array} validations - Array of validation objects from useFormValidation
 * @returns {Boolean} True if all fields are valid
 */
export function validateAll(validations) {
  let allValid = true
  validations.forEach(({ validate }) => {
    if (!validate()) {
      allValid = false
    }
  })
  return allValid
}

/**
 * Helper to focus first error field
 *
 * @param {Array} validations - Array of validation objects with fieldId property
 * @param {Function} getFieldElement - Function to get DOM element for field
 */
export async function focusFirstError(validations, getFieldElement) {
  for (const validation of validations) {
    if (validation.error.value) {
      const element = getFieldElement(validation.fieldId)
      if (element) {
        await new Promise((resolve) => setTimeout(resolve, 0)) // nextTick
        element.focus()
        break
      }
    }
  }
}
