<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateIvrPkey, validateTenant, validateGreetnum } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import { normalizeList } from '@/utils/listResponse'
import { OPTION_ENTRIES, buildIvrPayload } from '@/constants/ivrDestinations'
import { fieldErrors } from '@/utils/formErrors'

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const cluster = ref('default')
const active = ref('YES')
const cname = ref('')
const name = ref('')
const description = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const destinations = ref(null)
const destinationsLoading = ref(false)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)
const greetnum = ref('')
const timeout = ref('operator')
const listenforext = ref('NO')

// Field-level validation using composable
const pkeyValidation = useFormValidation(pkey, validateIvrPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)
const greetnumValidation = useFormValidation(greetnum, validateGreetnum)

// Per-key: Action on KeyPress (option0–11), Tag (tag0–11), Alert (alert0–11). Model defaults: option* = 'None', timeout = 'operator'
const options = ref({
  option0: 'None',
  option1: 'None',
  option2: 'None',
  option3: 'None',
  option4: 'None',
  option5: 'None',
  option6: 'None',
  option7: 'None',
  option8: 'None',
  option9: 'None',
  option10: 'None',
  option11: 'None'
})
const tags = ref({
  tag0: '', tag1: '', tag2: '', tag3: '', tag4: '', tag5: '',
  tag6: '', tag7: '', tag8: '', tag9: '', tag10: '', tag11: ''
})
const alerts = ref({
  alert0: '', alert1: '', alert2: '', alert3: '', alert4: '', alert5: '',
  alert6: '', alert7: '', alert8: '', alert9: '', alert10: '', alert11: ''
})
const greetings = ref([])
const greetingsLoading = ref(false)

const greetingOptions = computed(() => {
  const list = greetings.value
  if (!Array.isArray(list)) return []
  const nums = list
    .map((name) => {
      const m = String(name).match(/usergreeting(\d+)/i)
      return m ? parseInt(m[1], 10) : null
    })
    .filter((n) => n != null)
  return [...new Set(nums)].sort((a, b) => a - b)
})

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

const destinationGroups = computed(() => {
  const d = destinations.value
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : [],
    Extensions: Array.isArray(d.Extensions) ? d.Extensions : [],
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : [],
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : []
  }
})

async function loadDestinations() {
  const c = cluster.value
  if (!c) {
    destinations.value = null
    return
  }
  destinationsLoading.value = true
  try {
    const response = await getApiClient().get('destinations', { params: { cluster: c } })
    destinations.value = response && typeof response === 'object' ? response : null
  } catch {
    destinations.value = null
  } finally {
    destinationsLoading.value = false
  }
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey === 'default')?.pkey ?? tenants.value[0]?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function loadGreetings() {
  greetingsLoading.value = true
  try {
    const response = await getApiClient().get('greetings')
    greetings.value = Array.isArray(response) ? response : (response?.data ?? [])
  } catch {
    greetings.value = []
  } finally {
    greetingsLoading.value = false
  }
}

function resetForm() {
  pkey.value = ''
  cluster.value = 'default'
  active.value = 'YES'
  cname.value = ''
  name.value = ''
  description.value = ''
  greetnum.value = ''
  timeout.value = 'operator'
  listenforext.value = 'NO'
  options.value = {
    option0: 'None', option1: 'None', option2: 'None', option3: 'None',
    option4: 'None', option5: 'None', option6: 'None', option7: 'None',
    option8: 'None', option9: 'None', option10: 'None', option11: 'None'
  }
  tags.value = {
    tag0: '', tag1: '', tag2: '', tag3: '', tag4: '', tag5: '',
    tag6: '', tag7: '', tag8: '', tag9: '', tag10: '', tag11: ''
  }
  alerts.value = {
    alert0: '', alert1: '', alert2: '', alert3: '', alert4: '', alert5: '',
    alert6: '', alert7: '', alert8: '', alert9: '', alert10: '', alert11: ''
  }
  pkeyValidation.reset()
  clusterValidation.reset()
  greetnumValidation.reset()
  error.value = ''
  loadDestinations()
}

watch(cluster, () => {
  loadDestinations()
  if (clusterValidation.touched.value) {
    clusterValidation.validate()
  }
})

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  
  // Validate all fields before submitting
  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' },
    { ...greetnumValidation, fieldId: 'greetnum' }
  ]
  
  if (!validateAll(validations)) {
    // Focus first error field
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
      return document.getElementById(id)
    })
    return
  }
  
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      active: active.value,
      ...buildIvrPayload(options.value, tags.value, alerts.value, timeout.value),
      listenforext: listenforext.value
    }
    if (cname.value.trim()) body.cname = cname.value.trim()
    if (name.value.trim()) body.name = name.value.trim()
    if (description.value.trim()) body.description = description.value.trim()
    if (greetnum.value !== '' && greetnum.value != null) body.greetnum = parseInt(greetnum.value, 10)
    await getApiClient().post('ivrs', body)
    toast.show(`IVR ${pkey.value.trim()} created`, 'success')
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      // Map server errors to field-level errors
      if (errors.pkey) {
        pkeyValidation.touched.value = true
        pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
      }
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
      }
      if (errors.greetnum) {
        greetnumValidation.touched.value = true
        greetnumValidation.error.value = Array.isArray(errors.greetnum) ? errors.greetnum[0] : errors.greetnum
      }
      
      // Show general error if no field-specific errors
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
      
      // Focus first error field
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
        return document.getElementById(id)
      })
    } else {
      error.value = err.data?.message ?? err.message ?? 'Failed to create IVR'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'ivrs' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await loadTenants()
  await loadDestinations()
  await loadGreetings()
  await nextTick()
  pkeyInput.value?.focus()
})
</script>

<template>
  <div class="create-view">
    <h1>Create IVR</h1>

    <form class="form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="ivr-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading || destinationsLoading || greetingsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="IVR Direct Dial"
          type="text"
          inputmode="numeric"
          pattern="[0-9]{3,5}"
          placeholder="e.g. 1234"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Numeric ID (3-5 digits) for this IVR."
          @blur="pkeyValidation.onBlur"
        />
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          hint="The tenant this IVR belongs to. Tenants provide multi-tenant support."
          @blur="clusterValidation.onBlur"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description (optional)"
          type="text"
          placeholder="Freeform description"
          hint="Shown in the IVR list."
        />
        <FormField
          id="cname"
          v-model="cname"
          label="Display name (optional)"
          type="text"
          placeholder="Common name / label"
          hint="Optional label for this IVR."
        />
        <FormField
          id="name"
          v-model="name"
          label="Name (optional)"
          type="text"
          placeholder="Legacy name field"
          hint="Legacy name field; prefer Display name (cname) for new IVRs."
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormToggle
          id="active"
          v-model="active"
          label="Active?"
          hint="If off, the IVR will not be offered as a destination and callers cannot reach it."
        />
        <FormSelect
          id="greetnum"
          v-model="greetnum"
          label="Greeting Number"
          :options="greetingOptions.map(n => String(n))"
          :error="greetnumValidation.error.value"
          :touched="greetnumValidation.touched.value"
          :loading="greetingsLoading"
          empty-text="—"
          hint="Greeting played when the IVR is activated. Greetings are created in the Greetings section."
          @blur="greetnumValidation.onBlur"
        />
        <FormToggle
          id="listenforext"
          v-model="listenforext"
          label="Listen for extension dial?"
          hint="If on, the IVR listens for an extension number as well as key presses. This can slow response; you can use a separate sub-IVR for extension entry (e.g. &quot;press star to enter extension&quot;)."
        />
        <FormSelect
          id="dest-timeout"
          v-model="timeout"
          label="Action on IVR Timeout"
          :options="['operator', 'None']"
          :option-groups="destinationGroups"
          aria-label="Destination on timeout"
        />
      </div>

      <section class="destinations-section" aria-labelledby="ivr-destinations-heading">
        <h2 id="ivr-destinations-heading" class="destinations-heading">Keystroke options</h2>
        <div class="destinations-table">
          <div class="destinations-row destinations-header">
            <span class="dest-cell dest-key">Key</span>
            <span class="dest-cell dest-action">Action on KeyPress</span>
            <span class="dest-cell dest-tag">Tag</span>
            <span class="dest-cell dest-alert">Alert</span>
          </div>
          <template v-for="item in OPTION_ENTRIES" :key="item.key">
            <div class="destinations-row dest-row-fields" :class="{ 'destinations-row-none': options[item.key] === 'None' }">
              <span class="dest-cell dest-key">{{ item.label }}</span>
              <div class="dest-cell dest-action">
                <FormSelect
                  :id="'dest-' + item.key"
                  v-model="options[item.key]"
                  label="Action on KeyPress"
                  :aria-label="'Destination for key ' + item.label"
                  hide-label
                  :options="['None', 'Operator']"
                  :option-groups="destinationGroups"
                />
              </div>
              <div class="dest-cell dest-tag">
                <FormField
                  :id="'tag-' + item.key"
                  v-model="tags[item.tagKey]"
                  label="Tag"
                  type="text"
                  placeholder="e.g. US West Telesales"
                  :aria-label="'Tag for key ' + item.label"
                  hide-label
                  autocomplete="off"
                />
              </div>
              <div class="dest-cell dest-alert">
                <FormField
                  :id="'alert-' + item.key"
                  v-model="alerts[item.alertKey]"
                  label="Alert"
                  type="text"
                  placeholder="e.g. &lt;http://127.0.0.1/Bellcore-drX&gt;"
                  :aria-label="'Alert for key ' + item.label"
                  hide-label
                  autocomplete="off"
                />
              </div>
            </div>
          </template>
        </div>
        <p v-if="destinationsLoading" class="form-hint">Loading destinations…</p>
      </section>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading || destinationsLoading || greetingsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 52rem;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;
}
.timeout-select {
  min-width: 0;
  max-width: 20rem;
}
.destinations-section {
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
  padding-top: 1rem;
}
.destinations-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #0f172a;
}
.destinations-table {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.destinations-row {
  display: grid;
  grid-template-columns: 2.5rem 1fr minmax(14rem, 1fr) minmax(20rem, 1fr);
  gap: 0.5rem 1rem;
  align-items: center;
}
.destinations-header {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
  padding-bottom: 0.25rem;
}
.destinations-row-none {
  opacity: 0.7;
}
.destinations-row-none .edit-input,
.destinations-row-none .dest-key {
  color: #64748b;
}
.dest-cell {
  min-width: 0;
}
.dest-row-fields .dest-cell :deep(.form-field) {
  margin-bottom: 0;
}
.dest-key {
  text-align: center;
  font-weight: 500;
}
.dest-action {
  min-width: 0;
}
.dest-tag,
.dest-alert {
  min-width: 0;
}
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: -0.25rem 0 0 0;
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type="submit"]:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
