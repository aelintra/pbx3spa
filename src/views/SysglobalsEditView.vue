<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const sysglobal = ref(null)
const defaultTenant = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')

// Editable and display-only (read-only) fields
const editAbstimeout = ref('')
const editCosstart = ref('')
const editEdomain = ref('')
const editEmergency = ref('')
const editFqdn = ref('')
const editLanguage = ref('')
const editLoglevel = ref('')
const editLogopts = ref('')
const editLogsipdispsize = ref('')
const editLogsipnumfiles = ref('')
const editLogsipfilesize = ref('')
const editMaxin = ref('')
const editMaxout = ref('')
const editOperator = ref('')
const editRecfiledlim = ref('')
const editReclimit = ref('')
const editRecmount = ref('')
const editRecqdither = ref('')
const editRecqsearchlim = ref('')
const editSessiontimout = ref('')
const editSendedomain = ref('')
const editSipflood = ref('')
const editSysop = ref('')
const editVoipmax = ref('')

function syncEditFromSysglobal() {
  if (!sysglobal.value) return
  const g = sysglobal.value
  
  // API returns lowercase keys (schema standardised on lowercase)
  editAbstimeout.value = g.abstimeout != null ? String(g.abstimeout) : ''
  editCosstart.value = g.cosstart ?? ''
  editEdomain.value = g.edomain ?? ''
  editEmergency.value = g.emergency ?? ''
  editFqdn.value = g.fqdn ?? ''
  editLanguage.value = g.language ?? ''
  editLoglevel.value = g.loglevel != null ? String(g.loglevel) : ''
  editLogopts.value = g.logopts ?? ''
  editLogsipdispsize.value = g.logsipdispsize != null ? String(g.logsipdispsize) : ''
  editLogsipnumfiles.value = g.logsipnumfiles != null ? String(g.logsipnumfiles) : ''
  editLogsipfilesize.value = g.logsipfilesize != null ? String(g.logsipfilesize) : ''
  editMaxin.value = g.maxin != null ? String(g.maxin) : ''
  editMaxout.value = g.maxout != null ? String(g.maxout) : ''
  editOperator.value = g.operator != null ? String(g.operator) : ''
  editRecfiledlim.value = g.recfiledlim ?? ''
  editReclimit.value = g.reclimit ?? ''
  editRecmount.value = g.recmount ?? ''
  editRecqdither.value = g.recqdither ?? ''
  editRecqsearchlim.value = g.recqsearchlim ?? ''
  editSessiontimout.value = g.sessiontimout != null ? String(g.sessiontimout) : ''
  editSendedomain.value = g.sendedomain ?? ''
  editSipflood.value = g.sipflood ?? ''
  editSysop.value = g.sysop != null ? String(g.sysop) : ''
  editVoipmax.value = g.voipmax != null ? String(g.voipmax) : ''
}

async function fetchSysglobal() {
  loading.value = true
  error.value = ''
  try {
    const [sysglobalRes, tenantRes] = await Promise.all([
      getApiClient().get('sysglobals'),
      getApiClient().get('tenants/default').catch(() => null)
    ])
    sysglobal.value = sysglobalRes
    defaultTenant.value = tenantRes
    syncEditFromSysglobal()
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load system globals')
    sysglobal.value = null
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'dashboard' })
}

function cancelEdit() {
  goBack()
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  
  try {
    const body = {}
    
    // Send all fields - empty strings become null for nullable fields
    body.abstimeout = editAbstimeout.value !== '' && editAbstimeout.value != null ? parseInt(editAbstimeout.value, 10) : null
    body.cosstart = editCosstart.value && editCosstart.value.trim() !== '' ? editCosstart.value.trim() : null
    body.emergency = editEmergency.value && editEmergency.value.trim() !== '' ? editEmergency.value.trim() : null
    body.fqdn = editFqdn.value && editFqdn.value.trim() !== '' ? editFqdn.value.trim() : null
    body.language = editLanguage.value && editLanguage.value.trim() !== '' ? editLanguage.value.trim() : null
    body.loglevel = editLoglevel.value !== '' && editLoglevel.value != null ? parseInt(editLoglevel.value, 10) : null
    body.logopts = editLogopts.value && editLogopts.value.trim() !== '' ? editLogopts.value.trim() : null
    body.logsipdispsize = editLogsipdispsize.value !== '' && editLogsipdispsize.value != null ? parseInt(editLogsipdispsize.value, 10) : null
    body.logsipnumfiles = editLogsipnumfiles.value !== '' && editLogsipnumfiles.value != null ? parseInt(editLogsipnumfiles.value, 10) : null
    body.logsipfilesize = editLogsipfilesize.value !== '' && editLogsipfilesize.value != null ? parseInt(editLogsipfilesize.value, 10) : null
    body.maxin = editMaxin.value !== '' && editMaxin.value != null ? parseInt(editMaxin.value, 10) : null
    body.maxout = editMaxout.value !== '' && editMaxout.value != null ? parseInt(editMaxout.value, 10) : null
    body.operator = editOperator.value !== '' && editOperator.value != null ? parseInt(editOperator.value, 10) : null
    body.recfiledlim = editRecfiledlim.value && editRecfiledlim.value.trim() !== '' ? editRecfiledlim.value.trim() : null
    body.reclimit = editReclimit.value && editReclimit.value.trim() !== '' ? editReclimit.value.trim() : null
    body.recmount = editRecmount.value && editRecmount.value.trim() !== '' ? editRecmount.value.trim() : null
    body.recqdither = editRecqdither.value && editRecqdither.value.trim() !== '' ? editRecqdither.value.trim() : null
    body.recqsearchlim = editRecqsearchlim.value && editRecqsearchlim.value.trim() !== '' ? editRecqsearchlim.value.trim() : null
    body.sessiontimout = editSessiontimout.value !== '' && editSessiontimout.value != null ? parseInt(editSessiontimout.value, 10) : null
    body.sendedomain = editSendedomain.value && editSendedomain.value.trim() !== '' ? editSendedomain.value.trim() : null
    body.sipflood = editSipflood.value && editSipflood.value.trim() !== '' ? editSipflood.value.trim() : null
    body.sysop = editSysop.value !== '' && editSysop.value != null ? parseInt(editSysop.value, 10) : null
    body.voipmax = editVoipmax.value !== '' && editVoipmax.value != null ? parseInt(editVoipmax.value, 10) : null
    
    await getApiClient().put('sysglobals', body)
    toast.show('System globals saved')
    await fetchSysglobal()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save system globals')
  } finally {
    saving.value = false
  }
}

onMounted(fetchSysglobal)
</script>

<template>
  <div class="edit-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'dashboard' }" label="Dashboard" class="edit-header">
      <h1>System Globals</h1>
    </PanelBackLink>

    <section v-if="loading" class="loading-state">
      <p class="loading">Loading system globals…</p>
    </section>

    <section v-else-if="error" class="error-state">
      <p class="error">{{ error }}</p>
      <button type="button" @click="fetchSysglobal" class="btn btn-primary">Retry</button>
    </section>

    <form v-else @submit="saveEdit" class="edit-form">
      <p v-if="saveError" class="form-error">{{ saveError }}</p>

      <p class="scope-note">
        These values are stored in the instance <strong>globals</strong> table (one row per server). Per-tenant
        limits, MOH, LDAP, call-control flags, and tenant passwords are on each tenant —
        <router-link :to="{ name: 'tenant-detail', params: { pkey: 'default' } }">Default tenant</router-link>
        or
        <router-link :to="{ name: 'tenants' }">Tenants</router-link>.
      </p>

      <div class="edit-actions edit-actions-top">
        <button type="submit" :disabled="saving" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" @click="cancelEdit" :disabled="saving" class="btn btn-secondary">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormReadonly
          id="edit-identity-shortuid"
          label="Shortuid"
          :value="defaultTenant?.shortuid ?? '—'"
          class="readonly-identity"
        />
        <FormReadonly
          id="edit-identity-ksuid"
          label="KSUID"
          :value="defaultTenant?.id ?? '—'"
          class="readonly-identity"
        />
      </div>

      <h2 class="detail-heading">SIP</h2>
      <div class="form-fields">
        <FormField
          id="edit-sipflood"
          v-model="editSipflood"
          label="SIP Flood Protection"
        />
        <FormField
          id="edit-abstimeout"
          v-model="editAbstimeout"
          type="number"
          label="Absolute Timeout"
        />
        <FormField
          id="edit-maxin"
          v-model="editMaxin"
          type="number"
          label="Max In"
        />
        <FormField
          id="edit-maxout"
          v-model="editMaxout"
          type="number"
          label="Max Out"
        />
        <FormField
          id="edit-voipmax"
          v-model="editVoipmax"
          type="number"
          label="VoIP Max"
        />
      </div>

      <h2 class="detail-heading">Domain & FQDN</h2>
      <div class="form-fields">
        <FormReadonly
          id="edit-edomain"
          label="Email Domain"
          :value="sysglobal?.edomain ?? '—'"
        />
        <FormField
          id="edit-fqdn"
          v-model="editFqdn"
          label="FQDN"
        />
        <FormField
          id="edit-sendedomain"
          v-model="editSendedomain"
          label="Send Domain"
        />
      </div>

      <h2 class="detail-heading">Logging</h2>
      <div class="form-fields">
        <FormField
          id="edit-loglevel"
          v-model="editLoglevel"
          type="number"
          label="Log Level"
        />
        <FormField
          id="edit-logopts"
          v-model="editLogopts"
          label="Log Options"
        />
        <FormField
          id="edit-logsipdispsize"
          v-model="editLogsipdispsize"
          type="number"
          label="SIP Display Size"
        />
        <FormField
          id="edit-logsipnumfiles"
          v-model="editLogsipnumfiles"
          type="number"
          label="SIP Number of Files"
        />
        <FormField
          id="edit-logsipfilesize"
          v-model="editLogsipfilesize"
          type="number"
          label="SIP File Size"
        />
      </div>

      <h2 class="detail-heading">Recording</h2>
      <div class="form-fields">
        <FormField
          id="edit-recmount"
          v-model="editRecmount"
          label="Recording Mount"
        />
        <FormField
          id="edit-reclimit"
          v-model="editReclimit"
          label="Recording Limit"
        />
        <FormField
          id="edit-recfiledlim"
          v-model="editRecfiledlim"
          label="Recording File Limit"
        />
        <FormField
          id="edit-recqdither"
          v-model="editRecqdither"
          label="Recording Q Dither"
        />
        <FormField
          id="edit-recqsearchlim"
          v-model="editRecqsearchlim"
          label="Recording Q Search Limit"
        />
      </div>

      <h2 class="detail-heading">Other</h2>
      <div class="form-fields">
        <FormField
          id="edit-language"
          v-model="editLanguage"
          label="Language"
        />
        <FormField
          id="edit-sessiontimout"
          v-model="editSessiontimout"
          type="number"
          label="Session Timeout"
        />
        <FormField
          id="edit-cosstart"
          v-model="editCosstart"
          label="CoS Start"
        />
        <FormField
          id="edit-emergency"
          v-model="editEmergency"
          label="Emergency"
        />
      </div>

      <div class="edit-actions">
        <button type="submit" :disabled="saving" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" @click="cancelEdit" :disabled="saving" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.edit-view {
  padding: 1rem;
}

.edit-header {
  margin-bottom: 1rem;
}

.edit-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.loading-state,
.error-state {
  padding: 2rem;
  text-align: center;
}

.loading {
  color: #64748b;
}

.error {
  color: #dc2626;
  margin-bottom: 1rem;
}

.edit-form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-error {
  color: #dc2626;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border-radius: 0.375rem;
}

.scope-note {
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  line-height: 1.45;
  color: #475569;
  background: #f1f5f9;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
}

.scope-note a {
  color: #2563eb;
  font-weight: 500;
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

.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) {
  color: #94a3b8;
}
.readonly-identity :deep(.form-readonly) {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}

.edit-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.edit-actions-top {
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-top: 0;
  padding-bottom: 1.5rem;
  border-top: none;
  border-bottom: 1px solid #e2e8f0;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: white;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f8fafc;
}
</style>
