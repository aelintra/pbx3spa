<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'

const NATDEFAULT_OPTIONS = ['local', 'remote']

const router = useRouter()
const toast = useToastStore()
const sysglobal = ref(null)
const sysnotes = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')

const editBindaddr = ref('')
const editBindport = ref('')
const editStaticipv4 = ref('')
const editTlsport = ref('')
const editNatdefault = ref('remote')
const editNatparams = ref('')
const editSitename = ref('')

function syncEditFromSysglobal() {
  if (!sysglobal.value) return
  const g = sysglobal.value
  editBindaddr.value = g.bindaddr ?? ''
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
    const [globalsRes, notesRes] = await Promise.all([
      getApiClient().get('sysglobals'),
      getApiClient().get('syscommands/sysnotes')
    ])
    sysglobal.value = globalsRes
    sysnotes.value = notesRes
    syncEditFromSysglobal()
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
    const body = {
      bindaddr: editBindaddr.value?.trim() || null,
      bindport: editBindport.value?.trim() || null,
      staticipv4: editStaticipv4.value?.trim() || null,
      tlsport: editTlsport.value !== '' && editTlsport.value != null ? parseInt(editTlsport.value, 10) : null,
      natdefault: editNatdefault.value?.trim() || null,
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
        <h2 class="section-heading">Binding</h2>

        <FormField
          id="ip-bindaddr"
          v-model="editBindaddr"
          label="Bind Address"
          hint="IP address to bind SIP server"
        />

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

        <h2 class="section-heading">System (read-only)</h2>

        <FormReadonly
          id="ip-hostname"
          label="Hostname"
          :value="network?.hostname ?? '—'"
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
