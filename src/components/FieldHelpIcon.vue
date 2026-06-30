<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHelp } from '@/composables/useHelp'
import { renderHelpHtml } from '@/utils/helpTextFormat'

const props = defineProps({
  /** tt_help_core pkey (column name) for lookup */
  pkey: {
    type: String,
    required: true
  }
})

const { getHelp, ensureFetched } = useHelp()
const open = ref(false)
const anchorRef = ref(null)
const popoverRef = ref(null)

const help = computed(() => getHelp(props.pkey))
const hasHelp = computed(() => help.value && (help.value.htext ?? '').trim() !== '')
const renderedHtext = computed(() => renderHelpHtml(help.value?.htext ?? ''))

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDocumentClick(e) {
  if (
    open.value &&
    anchorRef.value &&
    popoverRef.value &&
    !anchorRef.value.contains(e.target) &&
    !popoverRef.value.contains(e.target)
  ) {
    close()
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    close()
  }
}

onMounted(async () => {
  await ensureFetched()
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
watch(open, (isOpen) => {
  if (isOpen) {
    requestAnimationFrame(() => {
      document.addEventListener('click', onDocumentClick)
      document.addEventListener('keydown', onKeydown)
    })
  } else {
    document.removeEventListener('click', onDocumentClick)
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <span v-if="hasHelp" class="field-help-wrap">
    <button
      :id="'help-trigger-' + pkey"
      ref="anchorRef"
      type="button"
      class="field-help-trigger"
      :aria-expanded="open"
      :aria-controls="'help-popover-' + pkey"
      aria-label="Help"
      title="Help"
      @click="toggle"
    >
      <span aria-hidden="true">?</span>
    </button>
    <div
      v-show="open"
      :id="'help-popover-' + pkey"
      ref="popoverRef"
      class="field-help-popover"
      role="region"
      :aria-labelledby="'help-trigger-' + pkey"
      aria-label="Help for this field"
    >
      <div class="field-help-text" v-html="renderedHtext" />
      <p class="field-help-pkey">
        Help key: <code>{{ pkey }}</code>
      </p>
    </div>
  </span>
</template>

<style scoped>
.field-help-wrap {
  position: relative;
  display: inline-flex;
  margin-left: 0.25rem;
  vertical-align: middle;
}
.field-help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  cursor: pointer;
}
.field-help-trigger:hover {
  color: #475569;
  background: #e2e8f0;
  border-color: #cbd5e1;
}
.field-help-trigger:focus {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.field-help-popover {
  position: absolute;
  left: 0;
  top: calc(100% + 0.375rem);
  z-index: 1000;
  min-width: 16rem;
  max-width: 28rem;
  max-height: min(60vh, 20rem);
  overflow-y: auto;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #0f172a;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  /* Labels use white-space: nowrap; reset so plain-text help wraps in the popover. */
  white-space: normal;
}
.field-help-text {
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}
.field-help-text :deep(p) {
  margin: 0 0 0.5em;
}
.field-help-text :deep(p:last-child) {
  margin-bottom: 0;
}
.field-help-text :deep(ul),
.field-help-text :deep(ol) {
  margin: 0.25em 0 0.5em 1.25em;
  padding: 0;
}
.field-help-text :deep(li) {
  margin: 0.15em 0;
}
.field-help-text :deep(a) {
  color: #2563eb;
}
.field-help-pkey {
  margin: 0.75rem 0 0;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.75rem;
  color: #64748b;
}
.field-help-pkey code {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  color: #475569;
}
</style>
