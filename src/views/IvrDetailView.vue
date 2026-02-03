<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const ivr = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editCluster = ref('default')
const editActive = ref('YES')
const editCname = ref('')
const editName = ref('')
const editDescription = ref('')
const editGreetnum = ref('')
const editListenforext = ref('NO')
const editTimeout = ref('operator')
const options = ref({
  option0: 'None', option1: 'None', option2: 'None', option3: 'None', option4: 'None', option5: 'None',
  option6: 'None', option7: 'None', option8: 'None', option9: 'None', option10: 'None', option11: 'None'
})
const tags = ref({
  tag0: '', tag1: '', tag2: '', tag3: '', tag4: '', tag5: '',
  tag6: '', tag7: '', tag8: '', tag9: '', tag10: '', tag11: ''
})
const alerts = ref({
  alert0: '', alert1: '', alert2: '', alert3: '', alert4: '', alert5: '',
  alert6: '', alert7: '', alert8: '', alert9: '', alert10: '', alert11: ''
})
const destinations = ref(null)
const destinationsLoading = ref(false)
const greetings = ref([])
const greetingsLoading = ref(false)
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)
const advancedOpen = ref(false)

const pkey = computed(() => route.params.pkey)

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
  const cur = editCluster.value
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

async function loadTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch {
    tenants.value = []
  }
}

async function loadDestinations() {
  const c = editCluster.value
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

function syncEditFromIvr() {
  if (!ivr.value) return
  const r = ivr.value
  editCluster.value = r.cluster ?? 'default'
  editActive.value = r.active ?? 'YES'
  editCname.value = r.cname ?? ''
  editName.value = r.name ?? ''
  editDescription.value = r.description ?? ''
  editGreetnum.value = r.greetnum != null ? String(r.greetnum) : ''
  editListenforext.value = r.listenforext ?? 'NO'
  editTimeout.value = r.timeout ?? 'operator'
  for (let i = 0; i <= 11; i++) {
    options.value[`option${i}`] = r[`option${i}`] ?? 'None'
    tags.value[`tag${i}`] = r[`tag${i}`] ?? ''
    alerts.value[`alert${i}`] = r[`alert${i}`] ?? ''
  }
}

async function fetchIvr() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    ivr.value = await getApiClient().get(`ivrs/${encodeURIComponent(pkey.value)}`)
    syncEditFromIvr()
    if (route.query.edit) {
      editing.value = true
      saveError.value = ''
      if (editCluster.value) loadDestinations()
    }
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load IVR'
    ivr.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTenants()
  loadGreetings()
  fetchIvr()
})
watch(pkey, fetchIvr)
watch(editCluster, () => {
  if (editing.value) loadDestinations()
})
watch(editing, (isEditing) => {
  if (isEditing && editCluster.value) loadDestinations()
})

function goBack() {
  router.push({ name: 'ivrs' })
}

function startEdit() {
  syncEditFromIvr()
  saveError.value = ''
  editing.value = true
  if (editCluster.value) loadDestinations()
}

function cancelEdit() {
  editing.value = false
  saveError.value = ''
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    if (editing.value) cancelEdit()
    else goBack()
  }
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

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    const body = {
      cluster: editCluster.value.trim(),
      active: editActive.value,
      ...ivrPayload(options.value, tags.value, alerts.value, editTimeout.value),
      listenforext: editListenforext.value
    }
    if (editCname.value.trim()) body.cname = editCname.value.trim()
    else body.cname = null
    if (editName.value.trim()) body.name = editName.value.trim()
    else body.name = null
    if (editDescription.value.trim()) body.description = editDescription.value.trim()
    if (editGreetnum.value !== '' && editGreetnum.value != null) body.greetnum = parseInt(editGreetnum.value, 10)
    await getApiClient().put(`ivrs/${encodeURIComponent(pkey.value)}`, body)
    await fetchIvr()
    editing.value = false
    toast.show(`IVR ${pkey.value} saved`)
  } catch (err) {
    const errors = err?.data
    const first = errors && typeof errors === 'object'
      ? (Object.values(errors).flat().find((m) => typeof m === 'string')) ?? null
      : null
    saveError.value = first ?? err.data?.message ?? err.message ?? 'Failed to update IVR'
  } finally {
    saving.value = false
  }
}

function askConfirmDelete() {
  deleteError.value = ''
  confirmDeleteOpen.value = true
}

function cancelConfirmDelete() {
  confirmDeleteOpen.value = false
}

async function confirmAndDelete() {
  deleteError.value = ''
  deleting.value = true
  try {
    await getApiClient().delete(`ivrs/${encodeURIComponent(pkey.value)}`)
    toast.show(`IVR ${pkey.value} deleted`)
    router.push({ name: 'ivrs' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete IVR'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

/** Identity: pkey, shortuid, id (immutable), name, cname, description — same pattern as Trunk/Tenant/InboundRoute detail */
const identityFields = computed(() => {
  if (!ivr.value) return []
  const r = ivr.value
  return [
    { label: 'IVR Name', value: r.pkey ?? '—', immutable: true },
    { label: 'Local UID', value: r.shortuid ?? '—', immutable: true },
    { label: 'KSUID', value: r.id ?? '—', immutable: true },
    { label: 'Name', value: r.name ?? '—', immutable: false },
    { label: 'Display name', value: r.cname ?? '—', immutable: false },
    { label: 'Description', value: r.description ?? '—', immutable: false }
  ]
})

/** Settings: active, tenant, greeting, listenforext, timeout, and key options (shown in table in read view). */
const settingsFields = computed(() => {
  if (!ivr.value) return []
  const r = ivr.value
  return [
    { label: 'Active?', value: r.active ?? '—' },
    { label: 'Tenant', value: r.cluster ?? '—' },
    { label: 'Greeting number', value: r.greetnum != null ? String(r.greetnum) : '—' },
    { label: 'Listen for extension dial?', value: r.listenforext ?? '—' },
    { label: 'Action on IVR timeout', value: r.timeout ?? '—' }
  ]
})

const ADVANCED_EXCLUDE = new Set([
  'pkey', 'id', 'shortuid', 'active', 'cname', 'name', 'description', 'cluster', 'greetnum', 'listenforext', 'timeout',
  'option0', 'option1', 'option2', 'option3', 'option4', 'option5',
  'option6', 'option7', 'option8', 'option9', 'option10', 'option11',
  'tag0', 'tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10', 'tag11',
  'alert0', 'alert1', 'alert2', 'alert3', 'alert4', 'alert5', 'alert6', 'alert7', 'alert8', 'alert9', 'alert10', 'alert11'
])
const otherFields = computed(() => {
  if (!ivr.value || typeof ivr.value !== 'object') return []
  return Object.entries(ivr.value)
    .filter(([k]) => !ADVANCED_EXCLUDE.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← IVRs</button>
    </p>
    <h1>IVR: {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="ivr">
      <div class="detail-content">
        <p v-if="!editing" class="toolbar">
          <button type="button" class="edit-btn" @click="startEdit">Edit</button>
          <button
            type="button"
            class="delete-btn"
            :disabled="deleting"
            @click="askConfirmDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete IVR' }}
          </button>
        </p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form v-else-if="editing" class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="ivr-edit-error" class="error" role="alert">{{ saveError }}</p>

          <h2 class="detail-heading">Identity</h2>
          <label>IVR Name</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ ivr.pkey ?? '—' }}</p>
          <label>Local UID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ ivr.shortuid ?? '—' }}</p>
          <label>KSUID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ ivr.id ?? '—' }}</p>
          <label for="edit-description">Description (optional)</label>
          <input id="edit-description" v-model="editDescription" type="text" class="edit-input" placeholder="Freeform description" />
          <label for="edit-cname">Display name (optional)</label>
          <input id="edit-cname" v-model="editCname" type="text" class="edit-input" placeholder="Common name / label" />
          <label for="edit-name">Name (optional)</label>
          <input id="edit-name" v-model="editName" type="text" class="edit-input" placeholder="Legacy name field" />

          <h2 class="detail-heading">Settings</h2>
          <label class="edit-label-block">Active?</label>
          <div class="switch-toggle switch-ios" role="group" aria-label="Active">
            <input id="edit-active-yes" v-model="editActive" type="radio" value="YES" />
            <label for="edit-active-yes">YES</label>
            <input id="edit-active-no" v-model="editActive" type="radio" value="NO" />
            <label for="edit-active-no">NO</label>
          </div>
          <label for="edit-cluster">Tenant</label>
          <select id="edit-cluster" v-model="editCluster" class="edit-input" required :disabled="destinationsLoading">
            <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <label for="edit-greetnum">Greeting Number</label>
          <select id="edit-greetnum" v-model="editGreetnum" class="edit-input" :disabled="greetingsLoading">
            <option value="">—</option>
            <option v-for="n in greetingOptions" :key="n" :value="String(n)">{{ n }}</option>
          </select>
          <label class="edit-label-block">Listen for extension dial?</label>
          <div class="switch-toggle switch-ios" role="group" aria-label="Listen for extension dial">
            <input id="edit-listenforext-yes" v-model="editListenforext" type="radio" value="YES" />
            <label for="edit-listenforext-yes">YES</label>
            <input id="edit-listenforext-no" v-model="editListenforext" type="radio" value="NO" />
            <label for="edit-listenforext-no">NO</label>
          </div>

          <section class="destinations-section" aria-labelledby="ivr-edit-destinations-heading">
            <h2 id="ivr-edit-destinations-heading" class="destinations-heading">Keystroke options</h2>
            <div class="timeout-row">
              <label for="edit-timeout" class="form-label">Action on IVR Timeout</label>
              <select id="edit-timeout" v-model="editTimeout" class="edit-input timeout-select">
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
                  <label :for="'edit-dest-' + item.key" class="dest-cell dest-key">{{ item.label }}</label>
                  <select
                    :id="'edit-dest-' + item.key"
                    v-model="options[item.key]"
                    class="edit-input dest-cell dest-action"
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
                    :id="'edit-tag-' + item.key"
                    v-model="tags[item.tagKey]"
                    type="text"
                    class="edit-input dest-cell dest-tag"
                    placeholder="Tag"
                  />
                  <input
                    :id="'edit-alert-' + item.key"
                    v-model="alerts[item.alertKey]"
                    type="text"
                    class="edit-input dest-cell dest-alert"
                    placeholder="Alert"
                  />
                </div>
              </template>
            </div>
            <p v-if="destinationsLoading" class="form-hint">Loading destinations…</p>
          </section>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
          </div>
        </form>

        <template v-if="!editing">
          <section class="detail-section">
            <h2 class="detail-heading">Identity</h2>
            <dl class="detail-list">
              <template v-for="f in identityFields" :key="f.label">
                <dt>{{ f.label }}</dt>
                <dd :class="{ 'value-immutable': f.immutable }" :title="f.immutable ? 'Immutable' : undefined">{{ f.value }}</dd>
              </template>
            </dl>
          </section>
          <section class="detail-section">
            <h2 class="detail-heading">Settings</h2>
            <dl class="detail-list">
              <template v-for="f in settingsFields" :key="f.label">
                <dt>{{ f.label }}</dt>
                <dd>{{ f.value }}</dd>
              </template>
            </dl>
            <h3 class="detail-subheading">Keystroke options</h3>
            <div class="readonly-destinations-table">
              <div class="destinations-row destinations-header">
                <span class="dest-cell dest-key">Key</span>
                <span class="dest-cell dest-action">Action</span>
                <span class="dest-cell dest-tag">Tag</span>
                <span class="dest-cell dest-alert">Alert</span>
              </div>
              <template v-for="item in optionEntries" :key="item.key">
                <div class="destinations-row" :class="{ 'destinations-row-none': (ivr[item.key] ?? 'None') === 'None' }">
                  <span class="dest-cell dest-key">{{ item.label }}</span>
                  <span class="dest-cell dest-action">{{ ivr[item.key] ?? 'None' }}</span>
                  <span class="dest-cell dest-tag">{{ ivr[item.tagKey] ?? '—' }}</span>
                  <span class="dest-cell dest-alert">{{ ivr[item.alertKey] ?? '—' }}</span>
                </div>
              </template>
            </div>
          </section>
          <section class="detail-section">
            <button type="button" class="collapse-trigger" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen">
              {{ advancedOpen ? '▼' : '▶' }} Advanced
            </button>
            <dl v-show="advancedOpen" class="detail-list detail-list-other">
              <template v-for="[key, value] in otherFields" :key="key">
                <dt>{{ key }}</dt>
                <dd>{{ value == null ? '—' : String(value) }}</dd>
              </template>
            </dl>
          </section>
        </template>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="confirmDeleteOpen" class="modal-backdrop" @click.self="cancelConfirmDelete">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <h2 id="modal-delete-title" class="modal-title">Delete IVR?</h2>
          <p class="modal-body">
            IVR <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.
          </p>
          <div class="modal-actions">
            <button type="button" class="modal-btn modal-btn-cancel" @click="cancelConfirmDelete">Cancel</button>
            <button type="button" class="modal-btn modal-btn-delete" :disabled="deleting" @click="confirmAndDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.detail-view {
  max-width: 52rem;
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
.loading,
.error {
  margin-top: 1rem;
}
.error {
  color: #dc2626;
}
.detail-content {
  margin-top: 0;
}
.detail-section {
  margin-top: 1.5rem;
}
.detail-section:first-of-type {
  margin-top: 1rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 0.5rem 0;
}
.detail-subheading {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #475569;
  margin: 1rem 0 0.5rem 0;
}
.detail-list {
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 2rem;
  font-size: 0.9375rem;
}
.detail-list dt {
  font-weight: 500;
  color: #475569;
}
.detail-list dd {
  margin: 0;
}
.detail-readonly {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  color: #64748b;
}
.value-immutable {
  color: #64748b;
  background: #f8fafc;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
.detail-list-other {
  margin-top: 0.5rem;
}
.collapse-trigger {
  display: block;
  width: 100%;
  padding: 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
  background: transparent;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
}
.collapse-trigger:hover {
  color: #0f172a;
}
.toolbar {
  margin: 0 0 0.75rem 0;
}
.edit-btn,
.delete-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  margin-right: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
}
.edit-btn {
  color: #2563eb;
  background: transparent;
  border: 1px solid #93c5fd;
}
.edit-btn:hover {
  background: #eff6ff;
}
.delete-btn {
  color: #dc2626;
  background: transparent;
  border: 1px solid #fca5a5;
}
.delete-btn:hover:not(:disabled) {
  background: #fef2f2;
}
.delete-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.edit-form {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 52rem;
}
.edit-form label {
  font-size: 0.875rem;
  font-weight: 500;
}
.edit-label-block {
  display: block;
  margin-bottom: 0.25rem;
}
.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
}
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}
.switch-toggle.switch-ios {
  display: flex;
  flex-wrap: wrap;
  background: #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0;
}
.switch-toggle.switch-ios input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-toggle.switch-ios label {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.15s, color 0.15s;
  color: #64748b;
}
.switch-toggle.switch-ios label:hover {
  color: #334155;
}
.switch-toggle.switch-ios input:checked + label {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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
.timeout-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.timeout-row .form-label {
  min-width: 12rem;
}
.timeout-select {
  min-width: 0;
  max-width: 20rem;
}
.destinations-table,
.readonly-destinations-table {
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
.destinations-row-none .edit-input,
.destinations-row-none .dest-key {
  color: #64748b;
}
.readonly-destinations-table .dest-cell {
  font-size: 0.9375rem;
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
.edit-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.edit-input:focus {
  outline: none;
  border-color: #3b82f6;
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
}
.edit-actions button {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.edit-actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.edit-actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.edit-actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.edit-actions button.secondary:hover {
  background: #f1f5f9;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 24rem;
  width: 100%;
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
.modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}
.modal-body strong {
  color: #0f172a;
}
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}
.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}
.modal-btn-cancel:hover {
  background: #e2e8f0;
}
.modal-btn-delete {
  background: #dc2626;
  color: white;
}
.modal-btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}
.modal-btn-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
