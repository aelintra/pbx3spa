<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

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
const timeout = ref('operator')
const greetnum = ref('')
const greetings = ref([])
const greetingsLoading = ref(false)
const listenforext = ref('NO')

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

const optionEntries = [
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

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.tenants)) return response.tenants
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

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
    tenants.value = normalizeList(response)
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

watch(cluster, () => loadDestinations())

function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}

/** Ensure option/tag/alert/timeout are sent as strings (API validation). Destinations can be numeric. */
function ivrPayload(optionsObj, tagsObj, alertsObj, timeoutVal) {
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

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      active: active.value,
      ...ivrPayload(options.value, tags.value, alerts.value, timeout.value),
      listenforext: listenforext.value
    }
    if (cname.value.trim()) body.cname = cname.value.trim()
    if (name.value.trim()) body.name = name.value.trim()
    if (description.value.trim()) body.description = description.value.trim()
    if (greetnum.value !== '' && greetnum.value != null) body.greetnum = parseInt(greetnum.value, 10)
    const ivr = await getApiClient().post('ivrs', body)
    const createdPkey = ivr?.pkey ?? ivr?.data?.pkey
    const message = createdPkey ? `IVR ${createdPkey} created` : 'IVR created'
    toast.show(message, 'success')
    await nextTick()
    router.push({ name: 'ivr-detail', params: { pkey: createdPkey || pkey.value.trim() } })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
    } else {
      error.value = err.data?.message ?? err.message ?? 'Failed to create IVR'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'ivrs' })
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
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← IVRs</button>
    </p>
    <h1>Create IVR</h1>

    <form class="form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="ivr-create-error" class="error" role="alert">{{ error }}</p>

      <label for="pkey" class="form-label">IVR Name</label>
      <input
        id="pkey"
        ref="pkeyInput"
        v-model="pkey"
        type="text"
        class="form-input"
        placeholder="e.g. main-ivr"
        required
        autocomplete="off"
      />
      <p class="form-hint">Unique ID for this IVR.</p>

      <label for="cluster" class="form-label">Tenant</label>
      <select
        id="cluster"
        v-model="cluster"
        class="form-input"
        required
        aria-label="Tenant"
        :disabled="tenantsLoading"
        :aria-busy="tenantsLoading"
      >
        <option v-if="tenantsLoading" value="">Loading…</option>
        <template v-else>
          <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
        </template>
      </select>
      <p class="form-hint">The tenant this IVR belongs to. Tenants provide multi-tenant support.</p>

      <div class="listenforext-row">
        <label class="form-label">Active?</label>
        <label class="toggle-pill-ios" aria-label="Active">
          <input
            type="checkbox"
            :checked="active === 'YES'"
            @change="active = $event.target.checked ? 'YES' : 'NO'"
          />
          <span class="toggle-pill-track"><span class="toggle-pill-thumb"></span></span>
        </label>
      </div>
      <p class="form-hint">If off, the IVR will not be offered as a destination and callers cannot reach it.</p>

      <label for="cname" class="form-label">Display name (optional)</label>
      <input
        id="cname"
        v-model="cname"
        type="text"
        class="form-input"
        placeholder="Common name / label"
        autocomplete="off"
      />
      <p class="form-hint">Optional label for this IVR.</p>

      <label for="name" class="form-label">Name (optional)</label>
      <input
        id="name"
        v-model="name"
        type="text"
        class="form-input"
        placeholder="Legacy name field"
        autocomplete="off"
      />
      <p class="form-hint">Legacy name field; prefer Display name (cname) for new IVRs.</p>

      <label for="description" class="form-label">Description (optional)</label>
      <input
        id="description"
        v-model="description"
        type="text"
        class="form-input"
        placeholder="Freeform description"
        autocomplete="off"
      />
      <p class="form-hint">Shown in the IVR list.</p>

      <label for="greetnum" class="form-label">Greeting Number</label>
      <select
        id="greetnum"
        v-model="greetnum"
        class="form-input"
        aria-label="Greeting number to play when IVR is activated"
        :disabled="greetingsLoading"
      >
        <option value="">—</option>
        <option v-for="n in greetingOptions" :key="n" :value="String(n)">{{ n }}</option>
      </select>
      <p class="form-hint">Greeting played when the IVR is activated. Greetings are created in the Greetings section.</p>

      <div class="listenforext-row">
        <label class="form-label">Listen for extension dial?</label>
        <label class="toggle-pill-ios" aria-label="Listen for extension dial">
          <input
            type="checkbox"
            :checked="listenforext === 'YES'"
            @change="listenforext = $event.target.checked ? 'YES' : 'NO'"
          />
          <span class="toggle-pill-track"><span class="toggle-pill-thumb"></span></span>
        </label>
      </div>
      <p class="form-hint">If on, the IVR listens for an extension number as well as key presses. This can slow response; you can use a separate sub-IVR for extension entry (e.g. “press star to enter extension”).</p>

      <section class="destinations-section" aria-labelledby="ivr-destinations-heading">
        <h2 id="ivr-destinations-heading" class="destinations-heading">Keystroke options</h2>
        <p class="form-hint destinations-hint">Action on KeyPress = destination. Tag = aid to the operator (e.g. "US West Telesales"). Alert = alertinfo string for distinctive ring (e.g. &lt;http://127.0.0.1/Bellcore-drX&gt;).</p>

        <div class="timeout-row">
          <label for="dest-timeout" class="form-label">Action on IVR Timeout</label>
          <select
            id="dest-timeout"
            v-model="timeout"
            class="form-input timeout-select"
            aria-label="Destination on timeout"
          >
            <option value="operator">Operator</option>
            <option value="None">None</option>
            <template v-for="(pkeys, group) in destinationGroups" :key="group">
              <optgroup v-if="pkeys.length" :label="group">
                <option v-for="p in pkeys" :key="p" :value="p">{{ p }}</option>
              </optgroup>
            </template>
          </select>
        </div>

        <div class="destinations-table">
          <div class="destinations-row destinations-header">
            <span class="dest-cell dest-key">Key</span>
            <span class="dest-cell dest-action">Action on KeyPress</span>
            <span class="dest-cell dest-tag">Tag</span>
            <span class="dest-cell dest-alert">Alert</span>
          </div>
          <template v-for="item in optionEntries" :key="item.key">
            <div class="destinations-row" :class="{ 'destinations-row-none': options[item.key] === 'None' }">
              <label :for="'dest-' + item.key" class="dest-cell dest-key">{{ item.label }}</label>
              <select
                :id="'dest-' + item.key"
                v-model="options[item.key]"
                class="form-input dest-cell dest-action"
                :aria-label="'Destination for key ' + item.label"
              >
                <option value="None">None</option>
                <option value="Operator">Operator</option>
                <template v-for="(pkeys, group) in destinationGroups" :key="group">
                  <optgroup v-if="pkeys.length" :label="group">
                    <option v-for="p in pkeys" :key="p" :value="p">{{ p }}</option>
                  </optgroup>
                </template>
              </select>
              <input
                :id="'tag-' + item.key"
                v-model="tags[item.tagKey]"
                type="text"
                class="form-input dest-cell dest-tag"
                placeholder="e.g. US West Telesales"
                :aria-label="'Tag for key ' + item.label"
                autocomplete="off"
              />
              <input
                :id="'alert-' + item.key"
                v-model="alerts[item.alertKey]"
                type="text"
                class="form-input dest-cell dest-alert"
                placeholder="e.g. &lt;http://127.0.0.1/Bellcore-drX&gt;"
                :aria-label="'Alert for key ' + item.label"
                autocomplete="off"
              />
            </div>
          </template>
        </div>
        <p v-if="destinationsLoading" class="form-hint">Loading destinations…</p>
      </section>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading">
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
.destinations-section {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}
.destinations-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #0f172a;
}
.destinations-hint {
  margin-bottom: 0.75rem;
}
.timeout-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.timeout-row .form-label {
  margin: 0;
  min-width: 12rem;
}
.timeout-select {
  min-width: 0;
  max-width: 20rem;
}
.listenforext-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.listenforext-row .form-label {
  margin: 0;
  min-width: 12rem;
}
/* iOS-style sliding pill toggle (on/off) */
.toggle-pill-ios {
  display: inline-block;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
}
.toggle-pill-ios input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.toggle-pill-track {
  display: block;
  width: 51px;
  height: 31px;
  border-radius: 31px;
  background: #e2e8f0;
  position: relative;
  transition: background-color 0.2s ease;
}
.toggle-pill-thumb {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}
.toggle-pill-ios input:checked + .toggle-pill-track {
  background: #34c759;
}
.toggle-pill-ios input:checked + .toggle-pill-track .toggle-pill-thumb {
  transform: translateX(20px);
}
.toggle-pill-ios input:focus-visible + .toggle-pill-track {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
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
  border-bottom: 1px solid #e2e8f0;
}
.destinations-row-none {
  opacity: 0.7;
}
.destinations-row-none .form-input,
.destinations-row-none .dest-key {
  color: #64748b;
}
.dest-cell {
  min-width: 0;
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
.back {
  margin-bottom: 1rem;
}
.back-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.back-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-label {
  font-size: 0.875rem;
  font-weight: 500;
}
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: -0.25rem 0 0 0;
}
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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
