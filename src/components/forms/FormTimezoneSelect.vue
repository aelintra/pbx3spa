<script setup>
/**
 * Searchable timezone picker — stores IANA id, shows friendly labels.
 * Layout matches FormField / FormSelect (label | control grid).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import { deriveHelpPkeyFromFieldId } from '@/utils/formHelpPkey'
import { filterTimezoneOptions, timezoneLabel } from '@/utils/timezoneLabels'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: String, default: '' },
  /** Full list of IANA ids from API (or prebuilt {value,label} objects). */
  options: { type: Array, default: () => [] },
  helpPkey: { type: String, default: null },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  placeholder: {
    type: String,
    default: 'Search city or zone (e.g. New York, EST, America/…)'
  }
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const highlight = ref(0)
const rootEl = ref(null)
const inputEl = ref(null)
const listEl = ref(null)

const effectiveHelpPkey = computed(() => props.helpPkey ?? deriveHelpPkeyFromFieldId(props.id))

const normalizedOptions = computed(() => {
  const raw = props.options ?? []
  if (!raw.length) return []
  if (typeof raw[0] === 'string') {
    // Lazy: NetworkView may still pass string ids; prefer buildTimezoneOptions upstream.
    return raw.map((id) => ({ value: id, label: timezoneLabel(id) }))
  }
  return raw
})

const filtered = computed(() => filterTimezoneOptions(normalizedOptions.value, query.value))

const displaySelected = computed(() => {
  const v = (props.modelValue || '').trim()
  if (!v) return ''
  const hit = normalizedOptions.value.find((o) => o.value === v)
  return hit?.label ?? timezoneLabel(v)
})

watch(
  () => props.modelValue,
  () => {
    if (!open.value) query.value = displaySelected.value
  },
  { immediate: true }
)

function openMenu() {
  if (props.disabled) return
  open.value = true
  query.value = ''
  highlight.value = 0
  nextTick(() => inputEl.value?.select?.())
}

function closeMenu(commitQuery = false) {
  open.value = false
  if (!commitQuery) {
    query.value = displaySelected.value
  }
}

function pick(opt) {
  if (!opt) return
  emit('update:modelValue', opt.value)
  query.value = opt.label
  open.value = false
}

function onInput() {
  if (!open.value) open.value = true
  highlight.value = 0
}

function onKeydown(e) {
  if (props.disabled) return
  const list = filtered.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!open.value) openMenu()
    else highlight.value = Math.min(highlight.value + 1, Math.max(list.length - 1, 0))
    scrollHighlight()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlight.value = Math.max(highlight.value - 1, 0)
    scrollHighlight()
  } else if (e.key === 'Enter') {
    if (open.value && list[highlight.value]) {
      e.preventDefault()
      pick(list[highlight.value])
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeMenu()
  }
}

function scrollHighlight() {
  nextTick(() => {
    const el = listEl.value?.querySelector('[data-active="true"]')
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

function onDocPointerDown(e) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    closeMenu()
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown))
</script>

<template>
  <div ref="rootEl" class="form-field timezone-select">
    <label :for="id" class="form-field-label">
      {{ label }}
      <FieldHelpIcon v-if="effectiveHelpPkey" :pkey="effectiveHelpPkey" />
    </label>
    <div class="form-field-input-wrapper">
      <input
        :id="id"
        ref="inputEl"
        v-model="query"
        type="search"
        class="form-input timezone-input"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        role="combobox"
        :aria-expanded="open"
        aria-autocomplete="list"
        :aria-controls="`${id}-list`"
        @focus="openMenu"
        @input="onInput"
        @keydown="onKeydown"
      />
      <ul
        v-show="open"
        :id="`${id}-list`"
        ref="listEl"
        class="timezone-list"
        role="listbox"
      >
        <li v-if="!filtered.length" class="timezone-empty" role="option" aria-disabled="true">
          No matches
        </li>
        <li
          v-for="(opt, idx) in filtered"
          :key="opt.value"
          class="timezone-option"
          role="option"
          :aria-selected="opt.value === modelValue"
          :data-active="idx === highlight"
          :class="{
            'is-active': idx === highlight,
            'is-selected': opt.value === modelValue
          }"
          @mousedown.prevent="pick(opt)"
        >
          {{ opt.label }}
        </li>
      </ul>
      <p v-if="hint" class="form-field-hint">{{ hint }}</p>
      <p v-else-if="modelValue" class="form-field-hint">
        Saves as <code>{{ modelValue }}</code> (IANA zone; handles daylight saving).
      </p>
    </div>
  </div>
</template>

<style scoped>
.form-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2fr;
  gap: 0.375rem 1rem;
  align-items: start;
  margin-bottom: 0.75rem;
}
.form-field-label {
  font-weight: 500;
  color: #475569;
  padding-top: 0.375rem;
  white-space: nowrap;
}
.form-field-input-wrapper {
  min-width: 0;
  position: relative;
}
.timezone-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #fff;
  color: inherit;
}
.timezone-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.15);
}
.timezone-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
}
.timezone-list {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: calc(100% + 0.25rem);
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  max-height: 16rem;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  box-shadow: 0 10px 25px rgb(15 23 42 / 0.12);
}
.timezone-option {
  padding: 0.45rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: #0f172a;
}
.timezone-option.is-active,
.timezone-option:hover {
  background: #eff6ff;
}
.timezone-option.is-selected {
  font-weight: 600;
}
.timezone-empty {
  padding: 0.55rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
}
.form-field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
}
.form-field-hint code {
  font-size: 0.75rem;
}
</style>
