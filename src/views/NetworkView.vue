<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const YESNO_OPTIONS = ['YES', 'NO']
const ICMP_OPTIONS = ['YES', 'NO'] // YES = allow ping

const toast = useToastStore()
const auth = useAuthStore()
const sysglobal = ref(null)
const sysnotes = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const discarding = ref(false)
const saveError = ref('')

const editHostname = ref('')
const editDns = ref('')
const editBindport = ref('')
const editStaticipv4 = ref('')
const editTlsport = ref('')
const editSitename = ref('')
const editSmtpMailhub = ref('')
const editSmtpUser = ref('')
const editSmtpPass = ref('')
const editSmtpUseTls = ref('NO')
const editSmtpUseStarttls = ref('NO')
const timezoneOptions = ref([])
const editTimezone = ref('')
const editIcmp = ref('NO')

function syncEditFromSysglobal() {
  if (!sysglobal.value) return
  const g = sysglobal.value
  editBindport.value = g.bindport ?? ''
  editStaticipv4.value = g.staticipv4 ?? ''
  editTlsport.value = g.tlsport != null ? String(g.tlsport) : ''
  editSitename.value = g.sitename ?? ''
}

async function fetchData(options = {}) {
  const silent = options.silent === true
  if (!silent) {
    loading.value = true
  }
  error.value = ''
  try {
    const [globalsRes, notesRes, tzList] = await Promise.all([
      getApiClient().get('sysglobals'),
      getApiClient().get('syscommands/sysnotes'),
      getApiClient().get('syscommands/timezones')
    ])
    sysglobal.value = globalsRes
    sysnotes.value = notesRes
    syncEditFromSysglobal()
    auth.setGlobalsFqdnFromSysglobal(globalsRes)
    editHostname.value = notesRes?.network?.hostname ?? ''
    editDns.value = Array.isArray(notesRes?.dns) ? notesRes.dns.join('\n') : ''
    const s = notesRes?.smtp
    if (s) {
      editSmtpMailhub.value = s.mailhub ?? ''
      editSmtpUser.value = s.auth_user ?? ''
      editSmtpPass.value = s.auth_pass ?? ''
      editSmtpUseTls.value = s.use_tls === 'YES' ? 'YES' : 'NO'
      editSmtpUseStarttls.value = s.use_starttls === 'YES' ? 'YES' : 'NO'
    } else {
      editSmtpMailhub.value = ''
      editSmtpUser.value = ''
      editSmtpPass.value = ''
      editSmtpUseTls.value = 'NO'
      editSmtpUseStarttls.value = 'NO'
    }
    const currentTz = notesRes?.timezone ?? ''
    editTimezone.value = currentTz
    const tzArray = Array.isArray(tzList) ? tzList : []
    if (currentTz && !tzArray.includes(currentTz)) {
      timezoneOptions.value = [currentTz, ...tzArray]
    } else {
      timezoneOptions.value = tzArray
    }
    editIcmp.value = notesRes?.icmp === true ? 'YES' : 'NO'
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load network')
    sysglobal.value = null
    sysnotes.value = null
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function cancelEdit() {
  if (saving.value || discarding.value) return
  saveError.value = ''
  discarding.value = true
  try {
    await fetchData({ silent: true })
    if (!error.value) {
      toast.show('Discarded unsaved changes')
    }
  } finally {
    discarding.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    const newHostname = editHostname.value?.trim() ?? ''
    const currentHostname = network.value?.hostname ?? ''
    if (newHostname && newHostname !== currentHostname) {
      await getApiClient().put('syscommands/hostname', { hostname: newHostname })
    }
    const newDnsList = (editDns.value ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const currentDns = sysnotes.value?.dns ?? []
    const dnsChanged =
      newDnsList.length !== currentDns.length || newDnsList.some((ip, i) => ip !== currentDns[i])
    if (dnsChanged && newDnsList.length > 0) {
      await getApiClient().put('syscommands/dns', { nameservers: newDnsList })
    }
    if (sysnotes.value?.smtp) {
      const cur = sysnotes.value.smtp
      const smtpChanged =
        editSmtpMailhub.value?.trim() !== (cur.mailhub ?? '') ||
        editSmtpUser.value?.trim() !== (cur.auth_user ?? '') ||
        editSmtpPass.value !== (cur.auth_pass ?? '') ||
        editSmtpUseTls.value !== (cur.use_tls ?? 'NO') ||
        editSmtpUseStarttls.value !== (cur.use_starttls ?? 'NO')
      if (smtpChanged) {
        await getApiClient().put('syscommands/smtp', {
          mailhub: editSmtpMailhub.value?.trim() || '',
          auth_user: editSmtpUser.value?.trim() || null,
          auth_pass: editSmtpPass.value || null,
          use_tls: editSmtpUseTls.value,
          use_starttls: editSmtpUseStarttls.value
        })
      }
    }
    const currentTz = sysnotes.value?.timezone ?? ''
    if (editTimezone.value?.trim() !== currentTz) {
      await getApiClient().put('syscommands/timezone', {
        timezone: editTimezone.value?.trim() || 'UTC'
      })
    }
    const newIcmp = editIcmp.value === 'YES'
    if (newIcmp !== sysnotes.value?.icmp) {
      await getApiClient().put('syscommands/icmp', { allow: newIcmp })
    }
    const body = {
      bindport: editBindport.value?.trim() || null,
      staticipv4: editStaticipv4.value?.trim() || null,
      tlsport:
        editTlsport.value !== '' && editTlsport.value != null
          ? parseInt(editTlsport.value, 10)
          : null,
      sitename: editSitename.value?.trim() || null
    }
    await getApiClient().put('sysglobals', body)
    toast.show('Network saved')
    await fetchData()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save network')
  } finally {
    saving.value = false
  }
}

const network = computed(() => sysnotes.value?.network ?? null)

onMounted(fetchData)
</script>

<template>
  <div class="edit-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'dashboard' }" label="Dashboard" class="edit-header">
      <h1>Network</h1>
    </PanelBackLink>

    <section v-if="loading" class="loading-state">
      <p class="loading">Loading…</p>
    </section>

    <section v-else-if="error" class="error-state">
      <p class="error">{{ error }}</p>
      <button type="button" class="btn btn-primary" @click="fetchData">Retry</button>
    </section>

    <form v-else class="edit-form" @submit="saveEdit">
      <p v-if="saveError" class="form-error">{{ saveError }}</p>

      <div class="edit-actions edit-actions-top">
        <button type="submit" :disabled="saving || discarding" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button
          type="button"
          :disabled="saving || discarding"
          class="btn btn-secondary"
          @click="cancelEdit"
        >
          {{ discarding ? 'Restoring…' : 'Cancel' }}
        </button>
      </div>

      <h2 class="detail-heading">System</h2>
      <div class="form-fields">
        <FormField id="ip-sitename" v-model="editSitename" label="Site Name" />
        <FormField id="ip-hostname" v-model="editHostname" label="Hostname" />
        <FormReadonly id="ip-localip" label="Local IP" :value="network?.local_ip ?? '—'" />
        <FormField id="ip-staticipv4" v-model="editStaticipv4" label="Static IPv4" />
        <FormReadonly id="ip-publicip" label="Public IP" :value="network?.public_ip ?? '—'" />
        <FormReadonly id="ip-mac" label="MAC" :value="network?.mac ?? '—'" hide-help />
        <FormField id="ip-dns" v-model="editDns" label="DNS servers" multiline :rows="6" />
      </div>

      <h2 class="detail-heading">SIP Binding</h2>
      <div class="form-fields">
        <FormField id="ip-bindport" v-model="editBindport" label="Bind Port" />
        <FormField id="ip-tlsport" v-model="editTlsport" type="number" label="TLS Port" />
      </div>

      <template v-if="sysnotes?.smtp">
        <h2 class="detail-heading">SMTP</h2>
        <div class="form-fields">
          <FormField id="ip-smtp-mailhub" v-model="editSmtpMailhub" label="Mail hub" />
          <FormField id="ip-smtp-user" v-model="editSmtpUser" label="Auth user" />
          <FormField
            id="ip-smtp-pass"
            v-model="editSmtpPass"
            type="password"
            label="Auth password"
          />
          <FormSegmentedPill
            id="ip-smtp-usetls"
            v-model="editSmtpUseTls"
            label="Use TLS"
            :options="YESNO_OPTIONS"
          />
          <FormSegmentedPill
            id="ip-smtp-usestarttls"
            v-model="editSmtpUseStarttls"
            label="Use STARTTLS"
            :options="YESNO_OPTIONS"
          />
        </div>
      </template>

      <h2 class="detail-heading">NTP</h2>
      <div class="form-fields">
        <FormSelect
          id="ip-timezone"
          v-model="editTimezone"
          label="Timezone"
          :options="timezoneOptions"
          empty-text="—"
        />
      </div>

      <h2 class="detail-heading">Ping (ICMP)</h2>
      <div class="form-fields">
        <FormSegmentedPill
          id="ip-icmp"
          v-model="editIcmp"
          label="Allow ping requests"
          :options="ICMP_OPTIONS"
        />
      </div>

      <div class="edit-actions">
        <button type="submit" :disabled="saving || discarding" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button
          type="button"
          :disabled="saving || discarding"
          class="btn btn-secondary"
          @click="cancelEdit"
        >
          {{ discarding ? 'Restoring…' : 'Cancel' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.edit-view {
  padding: 1rem;
  max-width: 52rem;
}

.edit-header {
  margin-bottom: 1rem;
}

.edit-header h1 {
  margin: 0;
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
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 52rem;
}

.form-error {
  color: #dc2626;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border-radius: 0.375rem;
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
