/**
 * Shared IVR keystroke/destinations config.
 * Used by IvrCreateView and IvrDetailView so we don't duplicate optionEntries or payload logic.
 */

/** Per-key rows for Keystroke options: option0–11, tag0–11, alert0–11. Labels: 0–9, *, #. */
export const OPTION_ENTRIES = [
  { key: 'option0', tagKey: 'tag0', alertKey: 'alert0', label: '0' },
  { key: 'option1', tagKey: 'tag1', alertKey: 'alert1', label: '1' },
  { key: 'option2', tagKey: 'tag2', alertKey: 'alert2', label: '2' },
  { key: 'option3', tagKey: 'tag3', alertKey: 'alert3', label: '3' },
  { key: 'option4', tagKey: 'tag4', alertKey: 'alert4', label: '4' },
  { key: 'option5', tagKey: 'tag5', alertKey: 'alert5', label: '5' },
  { key: 'option6', tagKey: 'tag6', alertKey: 'alert6', label: '6' },
  { key: 'option7', tagKey: 'tag7', alertKey: 'alert7', label: '7' },
  { key: 'option8', tagKey: 'tag8', alertKey: 'alert8', label: '8' },
  { key: 'option9', tagKey: 'tag9', alertKey: 'alert9', label: '9' },
  { key: 'option10', tagKey: 'tag10', alertKey: 'alert10', label: '*' },
  { key: 'option11', tagKey: 'tag11', alertKey: 'alert11', label: '#' }
]

/**
 * Build API payload for IVR option/tag/alert/timeout fields.
 * Ensures option/tag/alert/timeout are sent as strings (API validation). Destinations can be numeric.
 *
 * @param {Object} optionsObj - e.g. { option0: 'None', option1: '...', ... }
 * @param {Object} tagsObj - e.g. { tag0: '', tag1: '', ... }
 * @param {Object} alertsObj - e.g. { alert0: '', alert1: '', ... }
 * @param {string} timeoutVal - e.g. 'operator'
 * @returns {Object} Body fragment with option0–11, tag0–11, alert0–11, timeout
 */
export function buildIvrPayload(optionsObj, tagsObj, alertsObj, timeoutVal) {
  const body = {}
  for (let i = 0; i <= 11; i++) {
    const o = optionsObj[`option${i}`]
    body[`option${i}`] = o != null && o !== '' ? String(o) : null
    body[`tag${i}`] = tagsObj[`tag${i}`] != null && tagsObj[`tag${i}`] !== '' ? String(tagsObj[`tag${i}`]) : null
    body[`alert${i}`] = alertsObj[`alert${i}`] != null && alertsObj[`alert${i}`] !== '' ? String(alertsObj[`alert${i}`]) : null
  }
  body.timeout = timeoutVal != null && timeoutVal !== '' ? String(timeoutVal) : null
  return body
}
