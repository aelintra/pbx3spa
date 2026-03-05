<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'

const NATDEFAULT_OPTIONS = ['local', 'remote']
const YESNO_OPTIONS = ['YES', 'NO']
const ICMP_OPTIONS = ['YES', 'NO'] // YES = allow ping

const router = useRouter()
const toast = useToastStore()
const sysglobal = ref(null)
const sysnotes = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')

const editHostname = ref('')
const editDns = ref('')
const editBindport = ref('')
const editStaticipv4 = ref('')
const editTlsport = ref('')
const editNatdefault = ref('remote')
const editNatparams = ref('')
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
  editNatdefault.value = NATDEFAULT_OPTIONS.includes(g.natdefault) ? g.natdefault : 'remote'
  editNatparams.value = g.natparams ?? ''
  editSitename.value = g.sitename ?? ''
}

async function fetchData() {
  loading.value = true
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
    editHostname.value = notesRes?.network?.hostname ?? ''
    editDns.value = Array.isArray(notesRes?.dns) ? notesRes.dns.join('\n') : ''
    const s = notesRes?.smtp
    if (s) {
      editSmtpMailhub.value = s.mailhub ?? ''
      editSmtpUser.value = s.auth_user ?? ''
      editSmtpPass.value = s.auth_pass ?? ''
      editSmtpUseTls.value = (s.use_tls === 'YES') ? 'YES' : 'NO'
      editSmtpUseStarttls.value = (s.use_starttls === 'YES') ? 'YES' : 'NO'
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
    error.value = firstErrorMessage(err, 'Failed to load IP settings')
    sysglobal.value = null
    sysnotes.value = null
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'dashboard' })
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
    const newHostname = editHostname.value?.trim() ?? ''
    const currentHostname = network.value?.hostname ?? ''
    if (newHostname && newHostname !== currentHostname) {
      await getApiClient().put('syscommands/hostname', { hostname: newHostname })
    }
    const newDnsList = (editDns.value ?? '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    const currentDns = sysnotes.value?.dns ?? []
    const dnsChanged = newDnsList.length !== currentDns.length ||
      newDnsList.some((ip, i) => ip !== currentDns[i])
    if (dnsChanged && newDnsList.length > 0) {
      await getApiClient().put('syscommands/dns', { nameservers: newDnsList })
    }
    if (sysnotes.value?.smtp) {
      const cur = sysnotes.value.smtp
      const smtpChanged = editSmtpMailhub.value?.trim() !== (cur.mailhub ?? '') ||
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
      await getApiClient().put('syscommands/timezone', { timezone: editTimezone.value?.trim() || 'UTC' })
    }
    const newIcmp = editIcmp.value === 'YES'
    if (newIcmp !== sysnotes.value?.icmp) {
      await getApiClient().put('syscommands/icmp', { allow: newIcmp })
    }
    const body = {
      bindport: editBindport.value?.trim() || null,
      staticipv4: editStaticipv4.value?.trim() || null,
      tlsport: editTlsport.value !== '' && editTlsport.value != null ? parseInt(editTlsport.value, 10) : null,
      natdefault: NATDEFAULT_OPTIONS.includes(editNatdefault.value?.trim()) ? editNatdefault.value.trim() : 'remote',
      natparams: editNatparams.value?.trim() || null,
      sitename: editSitename.value?.trim() || null
    }
    await getApiClient().put('sysglobals', body)
    toast.show('IP settings saved')
    await fetchData()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save IP settings')
  } finally {
    saving.value = false
  }
}

const network = computed(() => sysnotes.value?.network ?? null)

onMounted(fetchData)
</script>

<template>
  <div class="edit-view network-view" @keydown="onKeydown">
    <header class="edit-header">
      <h1>IP Settings</h1>
    </header>

    <section v-if="loading" class="loading-state">
      <p class="loading">Loading…</p>
    </section>

    <section v-else-if="error" class="error-state">
      <p class="error">{{ error }}</p>
      <button type="button" @click="fetchData" class="btn btn-primary">Retry</button>
    </section>

    <form v-else @submit="saveEdit" class="edit-form">
      <p v-if="saveError" class="form-error">{{ saveError }}</p>

      <div class="edit-actions edit-actions-top">
        <button type="submit" :disabled="saving" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" @click="goBack" :disabled="saving" class="btn btn-secondary">Cancel</button>
      </div>

      <div class="form-fields">
        <h2 class="section-heading">System</h2>

        <FormField
          id="ip-hostname"
          v-model="editHostname"
          label="Hostname"
          hint="System hostname (alphanumeric, hyphens)"
        />
        <FormReadonly
          id="ip-localip"
          label="Local IP"
          :value="network?.local_ip ?? '—'"
        />
        <FormReadonly
          id="ip-publicip"
          label="Public IP"
          :value="network?.public_ip ?? '—'"
        />
        <FormReadonly
          id="ip-mac"
          label="MAC"
          :value="network?.mac ?? '—'"
        />

        <h2 class="section-heading">DNS servers</h2>

        <FormField
          id="ip-dns"
          v-model="editDns"
          label="DNS servers"
          hint="One nameserver per line (IP or hostname)"
          multiline
          :rows="6"
        />

        <h2 class="section-heading">Binding</h2>

        <FormField
          id="ip-bindport"
          v-model="editBindport"
          label="Bind Port"
          hint="Port for SIP server (e.g. 5060)"
        />

        <FormField
          id="ip-tlsport"
          v-model="editTlsport"
          type="number"
          label="TLS Port"
          hint="Port for TLS connections (e.g. 5061)"
        />

        <FormField
          id="ip-staticipv4"
          v-model="editStaticipv4"
          label="Static IPv4"
          hint="Static IPv4 for VoIP; when set, used as local IP for SIP/Asterisk"
        />

        <h2 class="section-heading">NAT</h2>

        <FormSegmentedPill
          id="ip-natdefault"
          v-model="editNatdefault"
          label="NAT Default"
          :options="NATDEFAULT_OPTIONS"
          hint="local or remote"
        />

        <FormField
          id="ip-natparams"
          v-model="editNatparams"
          label="NAT Parameters"
          hint="e.g. force_rport,comedia"
        />

        <h2 class="section-heading">Site</h2>

        <FormField
          id="ip-sitename"
          v-model="editSitename"
          label="Site Name"
          hint="Site name"
        />

        <template v-if="sysnotes?.smtp">
          <h2 class="section-heading">SMTP</h2>
          <FormField
            id="ip-smtp-mailhub"
            v-model="editSmtpMailhub"
            label="Mail hub"
            hint="SMTP server (host:port)"
          />
          <FormField
            id="ip-smtp-user"
            v-model="editSmtpUser"
            label="Auth user"
            hint="SMTP auth username"
          />
          <FormField
            id="ip-smtp-pass"
            v-model="editSmtpPass"
            type="password"
            label="Auth password"
            hint="SMTP auth password"
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
        </template>

        <h2 class="section-heading">NTP</h2>
        <FormSelect
          id="ip-timezone"
          v-model="editTimezone"
          label="Timezone"
          :options="timezoneOptions"
          emptyText="—"
          hint="System timezone"
        />

        <h2 class="section-heading">Ping (ICMP)</h2>
        <FormSegmentedPill
          id="ip-icmp"
          v-model="editIcmp"
          label="Allow ping requests"
          :options="ICMP_OPTIONS"
          hint="Allow ICMP echo from network"
        />
      </div>

      <div class="edit-actions edit-actions-bottom">
        <button type="submit" :disabled="saving" class="btn btn-primary">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" @click="goBack" :disabled="saving" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.network-view .section-heading {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}
.network-view .section-heading:first-of-type {
  margin-top: 0;
}
</style>
