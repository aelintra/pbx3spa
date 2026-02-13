<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const sysglobal = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')

// All 41 updateable fields from SysglobalController
const editAbstimeout = ref('')
const editBindaddr = ref('')
const editBindport = ref('')
const editCosstart = ref('')
const editEdomain = ref('')
const editEmergency = ref('')
const editFqdn = ref('')
const editFqdninspect = ref('')
const editFqdnprov = ref('')
const editLanguage = ref('')
const editLocalip = ref('')
const editLoglevel = ref('')
const editLogopts = ref('')
const editLogsipdispsize = ref('')
const editLogsipnumfiles = ref('')
const editLogsipfilesize = ref('')
const editMaxin = ref('')
const editMaxout = ref('')
const editMycommit = ref('')
const editNatdefault = ref('')
const editNatparams = ref('')
const editOperator = ref('')
const editPwdlen = ref('')
const editRecfiledlim = ref('')
const editReclimit = ref('')
const editRecmount = ref('')
const editRecqdither = ref('')
const editRecqsearchlim = ref('')
const editSessiontimout = ref('')
const editSendedomain = ref('')
const editSipflood = ref('')
const editSipdriver = ref('')
const editSitename = ref('')
const editStaticipv4 = ref('')
const editSysop = ref('')
const editSyspass = ref('')
const editTlsport = ref('')
const editUserotp = ref('')
const editVcl = ref('')
const editVoipmax = ref('')

function syncEditFromSysglobal() {
  if (!sysglobal.value) return
  const g = sysglobal.value
  
  // API returns lowercase keys (schema standardised on lowercase)
  editAbstimeout.value = g.abstimeout != null ? String(g.abstimeout) : ''
  editBindaddr.value = g.bindaddr ?? ''
  editBindport.value = g.bindport ?? ''
  editCosstart.value = g.cosstart ?? ''
  editEdomain.value = g.edomain ?? ''
  editEmergency.value = g.emergency ?? ''
  editFqdn.value = g.fqdn ?? ''
  editFqdninspect.value = g.fqdninspect ?? ''
  editFqdnprov.value = g.fqdnprov ?? ''
  editLanguage.value = g.language ?? ''
  editLocalip.value = g.localip ?? ''
  editLoglevel.value = g.loglevel != null ? String(g.loglevel) : ''
  editLogopts.value = g.logopts ?? ''
  editLogsipdispsize.value = g.logsipdispsize != null ? String(g.logsipdispsize) : ''
  editLogsipnumfiles.value = g.logsipnumfiles != null ? String(g.logsipnumfiles) : ''
  editLogsipfilesize.value = g.logsipfilesize != null ? String(g.logsipfilesize) : ''
  editMaxin.value = g.maxin != null ? String(g.maxin) : ''
  editMaxout.value = g.maxout != null ? String(g.maxout) : ''
  editMycommit.value = g.mycommit ?? ''
  editNatdefault.value = g.natdefault ?? ''
  editNatparams.value = g.natparams ?? ''
  editOperator.value = g.operator != null ? String(g.operator) : ''
  editPwdlen.value = g.pwdlen != null ? String(g.pwdlen) : ''
  editRecfiledlim.value = g.recfiledlim ?? ''
  editReclimit.value = g.reclimit ?? ''
  editRecmount.value = g.recmount ?? ''
  editRecqdither.value = g.recqdither ?? ''
  editRecqsearchlim.value = g.recqsearchlim ?? ''
  editSessiontimout.value = g.sessiontimout != null ? String(g.sessiontimout) : ''
  editSendedomain.value = g.sendedomain ?? ''
  editSipflood.value = g.sipflood ?? ''
  editSipdriver.value = g.sipdriver ?? ''
  editSitename.value = g.sitename ?? ''
  editStaticipv4.value = g.staticipv4 ?? ''
  editSysop.value = g.sysop != null ? String(g.sysop) : ''
  editSyspass.value = g.syspass != null ? String(g.syspass) : ''
  editTlsport.value = g.tlsport != null ? String(g.tlsport) : ''
  editUserotp.value = g.userotp ?? ''
  editVcl.value = g.vcl ?? ''
  editVoipmax.value = g.voipmax != null ? String(g.voipmax) : ''
}

async function fetchSysglobal() {
  loading.value = true
  error.value = ''
  try {
    sysglobal.value = await getApiClient().get('sysglobals')
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
    body.bindaddr = editBindaddr.value && editBindaddr.value.trim() !== '' ? editBindaddr.value.trim() : null
    body.bindport = editBindport.value && editBindport.value.trim() !== '' ? editBindport.value.trim() : null
    body.cosstart = editCosstart.value && editCosstart.value.trim() !== '' ? editCosstart.value.trim() : null
    body.edomain = editEdomain.value && editEdomain.value.trim() !== '' ? editEdomain.value.trim() : null
    body.emergency = editEmergency.value && editEmergency.value.trim() !== '' ? editEmergency.value.trim() : null
    body.fqdn = editFqdn.value && editFqdn.value.trim() !== '' ? editFqdn.value.trim() : null
    body.fqdninspect = editFqdninspect.value && editFqdninspect.value.trim() !== '' ? editFqdninspect.value.trim() : null
    body.fqdnprov = editFqdnprov.value && editFqdnprov.value.trim() !== '' ? editFqdnprov.value.trim() : null
    body.language = editLanguage.value && editLanguage.value.trim() !== '' ? editLanguage.value.trim() : null
    body.localip = editLocalip.value && editLocalip.value.trim() !== '' ? editLocalip.value.trim() : null
    body.loglevel = editLoglevel.value !== '' && editLoglevel.value != null ? parseInt(editLoglevel.value, 10) : null
    body.logopts = editLogopts.value && editLogopts.value.trim() !== '' ? editLogopts.value.trim() : null
    body.logsipdispsize = editLogsipdispsize.value !== '' && editLogsipdispsize.value != null ? parseInt(editLogsipdispsize.value, 10) : null
    body.logsipnumfiles = editLogsipnumfiles.value !== '' && editLogsipnumfiles.value != null ? parseInt(editLogsipnumfiles.value, 10) : null
    body.logsipfilesize = editLogsipfilesize.value !== '' && editLogsipfilesize.value != null ? parseInt(editLogsipfilesize.value, 10) : null
    body.maxin = editMaxin.value !== '' && editMaxin.value != null ? parseInt(editMaxin.value, 10) : null
    body.maxout = editMaxout.value !== '' && editMaxout.value != null ? parseInt(editMaxout.value, 10) : null
    body.mycommit = editMycommit.value && editMycommit.value.trim() !== '' ? editMycommit.value.trim() : null
    body.natdefault = editNatdefault.value && editNatdefault.value.trim() !== '' ? editNatdefault.value.trim() : null
    body.natparams = editNatparams.value && editNatparams.value.trim() !== '' ? editNatparams.value.trim() : null
    body.operator = editOperator.value !== '' && editOperator.value != null ? parseInt(editOperator.value, 10) : null
    body.pwdlen = editPwdlen.value !== '' && editPwdlen.value != null ? parseInt(editPwdlen.value, 10) : null
    body.recfiledlim = editRecfiledlim.value && editRecfiledlim.value.trim() !== '' ? editRecfiledlim.value.trim() : null
    body.reclimit = editReclimit.value && editReclimit.value.trim() !== '' ? editReclimit.value.trim() : null
    body.recmount = editRecmount.value && editRecmount.value.trim() !== '' ? editRecmount.value.trim() : null
    body.recqdither = editRecqdither.value && editRecqdither.value.trim() !== '' ? editRecqdither.value.trim() : null
    body.recqsearchlim = editRecqsearchlim.value && editRecqsearchlim.value.trim() !== '' ? editRecqsearchlim.value.trim() : null
    body.sessiontimout = editSessiontimout.value !== '' && editSessiontimout.value != null ? parseInt(editSessiontimout.value, 10) : null
    body.sendedomain = editSendedomain.value && editSendedomain.value.trim() !== '' ? editSendedomain.value.trim() : null
    body.sipflood = editSipflood.value && editSipflood.value.trim() !== '' ? editSipflood.value.trim() : null
    body.sipdriver = editSipdriver.value && editSipdriver.value.trim() !== '' ? editSipdriver.value.trim() : null
    body.sitename = editSitename.value && editSitename.value.trim() !== '' ? editSitename.value.trim() : null
    body.staticipv4 = editStaticipv4.value && editStaticipv4.value.trim() !== '' ? editStaticipv4.value.trim() : null
    body.sysop = editSysop.value !== '' && editSysop.value != null ? parseInt(editSysop.value, 10) : null
    body.syspass = editSyspass.value !== '' && editSyspass.value != null ? parseInt(editSyspass.value, 10) : null
    body.tlsport = editTlsport.value !== '' && editTlsport.value != null ? parseInt(editTlsport.value, 10) : null
    body.userotp = editUserotp.value && editUserotp.value.trim() !== '' ? editUserotp.value.trim() : null
    body.vcl = editVcl.value && editVcl.value.trim() !== '' ? editVcl.value.trim() : null
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
    <header class="edit-header">
      <h1>System Globals</h1>
    </header>

    <section v-if="loading" class="loading-state">
      <p class="loading">Loading system globals…</p>
    </section>

    <section v-else-if="error" class="error-state">
      <p class="error">{{ error }}</p>
      <button type="button" @click="fetchSysglobal" class="btn btn-primary">Retry</button>
    </section>

    <form v-else @submit="saveEdit" class="edit-form">
      <p v-if="saveError" class="form-error">{{ saveError }}</p>

      <div class="edit-actions edit-actions-top">
        <button type="submit" :disabled="saving" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" @click="cancelEdit" :disabled="saving" class="btn btn-secondary">Cancel</button>
      </div>

      <div class="form-fields">
        <h2 class="section-heading">Network</h2>
        
        <FormField
          id="edit-bindaddr"
          v-model="editBindaddr"
          label="Bind Address"
          hint="IP address to bind SIP server"
        />
        
        <FormField
          id="edit-bindport"
          v-model="editBindport"
          label="Bind Port"
          hint="Port for SIP server"
        />
        
        <FormField
          id="edit-localip"
          v-model="editLocalip"
          label="Local IP"
          hint="Local IP address"
        />
        
        <FormField
          id="edit-staticipv4"
          v-model="editStaticipv4"
          label="Static IPv4"
          hint="Static IPv4 address"
        />
        
        <FormField
          id="edit-tlsport"
          v-model="editTlsport"
          type="number"
          label="TLS Port"
          hint="Port for TLS connections"
        />

        <h2 class="section-heading">SIP</h2>
        
        <FormField
          id="edit-sipdriver"
          v-model="editSipdriver"
          label="SIP Driver"
          hint="SIP driver configuration"
        />
        
        <FormField
          id="edit-sipflood"
          v-model="editSipflood"
          label="SIP Flood Protection"
          hint="SIP flood protection settings"
        />
        
        <FormField
          id="edit-maxin"
          v-model="editMaxin"
          type="number"
          label="Max In"
          hint="Maximum incoming connections"
        />
        
        <FormField
          id="edit-maxout"
          v-model="editMaxout"
          type="number"
          label="Max Out"
          hint="Maximum outgoing connections"
        />
        
        <FormField
          id="edit-voipmax"
          v-model="editVoipmax"
          type="number"
          label="VoIP Max"
          hint="Maximum VoIP connections"
        />

        <h2 class="section-heading">Domain & FQDN</h2>
        
        <FormField
          id="edit-edomain"
          v-model="editEdomain"
          label="Email Domain"
          hint="Email domain"
        />
        
        <FormField
          id="edit-fqdn"
          v-model="editFqdn"
          label="FQDN"
          hint="Fully Qualified Domain Name"
        />
        
        <FormField
          id="edit-fqdninspect"
          v-model="editFqdninspect"
          label="FQDN Inspect"
          hint="FQDN inspection settings"
        />
        
        <FormField
          id="edit-fqdnprov"
          v-model="editFqdnprov"
          label="FQDN Provision"
          hint="FQDN provisioning settings"
        />
        
        <FormField
          id="edit-sendedomain"
          v-model="editSendedomain"
          label="Send Domain"
          hint="Domain to send from"
        />

        <h2 class="section-heading">NAT</h2>
        
        <FormField
          id="edit-natdefault"
          v-model="editNatdefault"
          label="NAT Default"
          hint="Default NAT settings"
        />
        
        <FormField
          id="edit-natparams"
          v-model="editNatparams"
          label="NAT Parameters"
          hint="NAT configuration parameters"
        />

        <h2 class="section-heading">Logging</h2>
        
        <FormField
          id="edit-loglevel"
          v-model="editLoglevel"
          type="number"
          label="Log Level"
          hint="Logging level (0-9)"
        />
        
        <FormField
          id="edit-logopts"
          v-model="editLogopts"
          label="Log Options"
          hint="Logging options"
        />
        
        <FormField
          id="edit-logsipdispsize"
          v-model="editLogsipdispsize"
          type="number"
          label="SIP Display Size"
          hint="SIP log display size"
        />
        
        <FormField
          id="edit-logsipnumfiles"
          v-model="editLogsipnumfiles"
          type="number"
          label="SIP Number of Files"
          hint="Number of SIP log files"
        />
        
        <FormField
          id="edit-logsipfilesize"
          v-model="editLogsipfilesize"
          type="number"
          label="SIP File Size"
          hint="Size of SIP log files"
        />

        <h2 class="section-heading">Recording</h2>
        
        <FormField
          id="edit-recmount"
          v-model="editRecmount"
          label="Recording Mount"
          hint="Recording mount point"
        />
        
        <FormField
          id="edit-reclimit"
          v-model="editReclimit"
          label="Recording Limit"
          hint="Recording limit"
        />
        
        <FormField
          id="edit-recfiledlim"
          v-model="editRecfiledlim"
          label="Recording File Limit"
          hint="Recording file limit"
        />
        
        <FormField
          id="edit-recqdither"
          v-model="editRecqdither"
          label="Recording Q Dither"
          hint="Recording quality dither"
        />
        
        <FormField
          id="edit-recqsearchlim"
          v-model="editRecqsearchlim"
          label="Recording Q Search Limit"
          hint="Recording quality search limit"
        />

        <h2 class="section-heading">Security</h2>
        
        <FormField
          id="edit-pwdlen"
          v-model="editPwdlen"
          type="number"
          label="Password Length"
          hint="Minimum password length"
        />
        
        <FormField
          id="edit-sysop"
          v-model="editSysop"
          type="number"
          label="System Operator"
          hint="System operator ID"
        />
        
        <FormField
          id="edit-syspass"
          v-model="editSyspass"
          type="number"
          label="System Password"
          hint="System password ID"
        />
        
        <FormField
          id="edit-operator"
          v-model="editOperator"
          type="number"
          label="Operator"
          hint="Operator ID"
        />
        
        <FormField
          id="edit-userotp"
          v-model="editUserotp"
          label="User OTP"
          hint="User OTP settings"
        />

        <h2 class="section-heading">Timeouts & Limits</h2>
        
        <FormField
          id="edit-abstimeout"
          v-model="editAbstimeout"
          type="number"
          label="Absolute Timeout"
          hint="Absolute timeout in seconds"
        />
        
        <FormField
          id="edit-sessiontimout"
          v-model="editSessiontimout"
          type="number"
          label="Session Timeout"
          hint="Session timeout in seconds"
        />

        <h2 class="section-heading">Other</h2>
        
        <FormField
          id="edit-language"
          v-model="editLanguage"
          label="Language"
          hint="System language"
        />
        
        <FormField
          id="edit-sitename"
          v-model="editSitename"
          label="Site Name"
          hint="Site name"
        />
        
        <FormField
          id="edit-cosstart"
          v-model="editCosstart"
          label="CoS Start"
          hint="Class of Service start"
        />
        
        <FormField
          id="edit-emergency"
          v-model="editEmergency"
          label="Emergency"
          hint="Emergency number"
        />
        
        <FormField
          id="edit-mycommit"
          v-model="editMycommit"
          label="My Commit"
          hint="Commit identifier"
        />
        
        <FormField
          id="edit-vcl"
          v-model="editVcl"
          label="VCL"
          hint="VCL configuration"
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
}

.form-error {
  color: #dc2626;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border-radius: 0.375rem;
}

.form-fields {
  display: grid;
  gap: 1rem;
}

.section-heading {
  grid-column: 1 / -1;
  margin: 1.5rem 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.section-heading:first-child {
  margin-top: 0;
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
