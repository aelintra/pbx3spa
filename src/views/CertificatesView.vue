<template>
  <div class="certificates-view">
    <h1>Certificates</h1>

    <p v-if="activeLabel" class="active-line">
      <strong>Currently in use:</strong> {{ activeLabel }}
    </p>
    <p v-else-if="loadError" class="error">{{ loadError }}</p>

    <!-- Section 1: Wildcard Let's Encrypt -->
    <section class="cert-section">
      <div class="section-header">
        <h2>Wildcard Let's Encrypt</h2>
      </div>
      <p class="section-explanation">
        A wildcard certificate covers your domain and all subdomains (e.g. <code>*.yourdomain.com</code>).
        It is issued and renewed automatically via DNS; no need to open port 80.
      </p>
      <p class="section-help">
        <a href="https://letsencrypt.org/docs/challenge-types/#dns-01-challenge" target="_blank" rel="noopener noreferrer">Learn about DNS-01 challenge</a>
        — Set up is done via the pbx3 installer with DNS API credentials for your domain.
      </p>

      <div v-if="leLoading" class="loading">
        <span class="spinner"></span>
        <span>Loading…</span>
      </div>
      <p v-else-if="leError" class="error">{{ leError }}</p>
      <template v-else-if="leStatus?.configured">
        <dl class="cert-dl">
          <dt>Domain</dt>
          <dd>{{ leStatus.domain }}</dd>
          <dt>Expires</dt>
          <dd>{{ leStatus.expires_at ?? '—' }}</dd>
          <dt>Issuer</dt>
          <dd>{{ leStatus.issuer ?? '—' }}</dd>
        </dl>
        <div class="section-actions">
          <button
            type="button"
            class="action-btn action-btn-primary"
            :disabled="renewing"
            @click="renewNow"
          >
            {{ renewing ? 'Renewing…' : 'Renew now' }}
          </button>
        </div>
        <p v-if="renewMessage" class="action-message">{{ renewMessage }}</p>
        <p v-if="renewError" class="error">{{ renewError }}</p>
      </template>
      <p v-else class="not-configured">
        Wildcard Let's Encrypt is not configured. Use the pbx3 installer to set up the host certificate
        (you will need DNS API credentials for your domain).
      </p>
    </section>

    <!-- Section 2: Purchased certificate -->
    <section class="cert-section">
      <div class="section-header">
        <h2>Purchased certificate</h2>
      </div>
      <p class="section-explanation">
        Upload your own certificate (fullchain.pem) and private key (privkey.pem) from a commercial CA.
      </p>

      <div v-if="customLoading" class="loading">
        <span class="spinner"></span>
        <span>Loading…</span>
      </div>
      <p v-else-if="customError" class="error">{{ customError }}</p>
      <template v-else>
        <p v-if="customInstalled" class="installed-msg">Customer certificate: In use.</p>
        <p v-else class="not-installed-msg">Not installed.</p>

        <div class="cert-upload">
          <label class="file-label">
            Certificate (fullchain.pem)
            <input
              type="file"
              accept=".pem,.crt"
              :disabled="installing"
              @change="onCertFileChange"
            />
          </label>
          <span class="file-name">{{ certFile?.name ?? '—' }}</span>
          <label class="file-label">
            Private key (privkey.pem)
            <input
              type="file"
              accept=".pem,.key"
              :disabled="installing"
              @change="onKeyFileChange"
            />
          </label>
          <span class="file-name">{{ keyFile?.name ?? '—' }}</span>
        </div>
        <div class="section-actions">
          <button
            type="button"
            class="action-btn action-btn-primary"
            :disabled="installing || !certFile || !keyFile"
            @click="installCustom"
          >
            {{ installing ? 'Installing…' : 'Install' }}
          </button>
          <button
            type="button"
            class="action-btn action-btn-danger"
            :disabled="installing || !customInstalled"
            @click="confirmRemoveCustom"
          >
            Remove
          </button>
        </div>
        <p v-if="installError" class="error">{{ installError }}</p>
        <p v-if="installSuccess" class="action-message">{{ installSuccess }}</p>
      </template>
    </section>

    <DeleteConfirmModal
      :show="!!showRemoveConfirm"
      title="Remove purchased certificate?"
      confirm-label="Remove"
      loading-label="Removing…"
      :loading="removing"
      @confirm="doRemoveCustom"
      @cancel="showRemoveConfirm = false"
    >
      <template #body>
        <p>The purchased certificate will be removed. The system will use Wildcard Let's Encrypt (if configured) or the default snakeoil certificate.</p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const toast = useToastStore()

const activeSource = ref(null)
const loadError = ref('')
const activeLoading = ref(true)

const leStatus = ref(null)
const leLoading = ref(true)
const leError = ref('')
const renewing = ref(false)
const renewMessage = ref('')
const renewError = ref('')

const customInstalled = ref(false)
const customLoading = ref(true)
const customError = ref('')
const installing = ref(false)
const installError = ref('')
const installSuccess = ref('')
const removing = ref(false)
const showRemoveConfirm = ref(false)

const certFile = ref(null)
const keyFile = ref(null)

const activeLabel = computed(() => {
  if (activeSource.value === 'custom') return 'Purchased certificate'
  if (activeSource.value === 'letsencrypt') return "Wildcard Let's Encrypt"
  if (activeSource.value === 'snakeoil') return 'Snakeoil'
  return ''
})

async function fetchActive() {
  activeLoading.value = true
  loadError.value = ''
  try {
    const data = await getApiClient().get('certificates/active')
    activeSource.value = data?.source ?? null
  } catch (err) {
    loadError.value = firstErrorMessage(err, 'Failed to load active certificate')
    activeSource.value = null
  } finally {
    activeLoading.value = false
  }
}

async function fetchLetsEncrypt() {
  leLoading.value = true
  leError.value = ''
  renewMessage.value = ''
  renewError.value = ''
  try {
    leStatus.value = await getApiClient().get('certificates/letsencrypt')
  } catch (err) {
    leError.value = firstErrorMessage(err, 'Failed to load Let\'s Encrypt status')
    leStatus.value = null
  } finally {
    leLoading.value = false
  }
}

async function fetchCustom() {
  customLoading.value = true
  customError.value = ''
  try {
    const data = await getApiClient().get('certificates/custom')
    customInstalled.value = data?.installed === true
  } catch (err) {
    customError.value = firstErrorMessage(err, 'Failed to load custom cert status')
    customInstalled.value = false
  } finally {
    customLoading.value = false
  }
}

function refetchAll() {
  fetchActive()
  fetchLetsEncrypt()
  fetchCustom()
}

async function renewNow() {
  renewing.value = true
  renewMessage.value = ''
  renewError.value = ''
  try {
    const data = await getApiClient().post('certificates/letsencrypt/renew', {})
    renewMessage.value = data?.message ?? 'Renewal completed.'
    toast.show(renewMessage.value)
    refetchAll()
  } catch (err) {
    const msg = err?.data?.message ?? firstErrorMessage(err, 'Renewal failed')
    renewError.value = msg
    toast.show(msg, 'error')
  } finally {
    renewing.value = false
  }
}

function onCertFileChange(event) {
  const file = event.target.files?.[0]
  if (file) certFile.value = file
  event.target.value = ''
}

function onKeyFileChange(event) {
  const file = event.target.files?.[0]
  if (file) keyFile.value = file
  event.target.value = ''
}

async function installCustom() {
  if (!certFile.value || !keyFile.value) {
    installError.value = 'Please select both certificate and key files.'
    return
  }
  installing.value = true
  installError.value = ''
  installSuccess.value = ''
  try {
    const formData = new FormData()
    formData.append('cert', certFile.value)
    formData.append('key', keyFile.value)
    await getApiClient().postFile('certificates/custom', formData)
    installSuccess.value = 'Purchased certificate installed.'
    toast.show('Purchased certificate installed.')
    certFile.value = null
    keyFile.value = null
    refetchAll()
  } catch (err) {
    installError.value = err?.data?.message ?? firstErrorMessage(err, 'Install failed')
    toast.show(installError.value, 'error')
  } finally {
    installing.value = false
  }
}

function confirmRemoveCustom() {
  showRemoveConfirm.value = true
}

async function doRemoveCustom() {
  removing.value = true
  try {
    await getApiClient().delete('certificates/custom')
    toast.show('Purchased certificate removed.')
    showRemoveConfirm.value = false
    refetchAll()
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Remove failed'), 'error')
  } finally {
    removing.value = false
  }
}

onMounted(() => {
  fetchActive()
  fetchLetsEncrypt()
  fetchCustom()
})
</script>

<style scoped>
.certificates-view {
  padding: 0 1rem 2rem;
}
.active-line {
  margin: 0.5rem 0 1.5rem;
  font-size: 1rem;
}
.cert-section {
  margin-bottom: 2.5rem;
}
.section-header {
  margin-bottom: 0.5rem;
}
.section-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.section-explanation,
.section-help {
  margin: 0.5rem 0;
  font-size: 0.9375rem;
  color: #475569;
}
.section-help code {
  background: #f1f5f9;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
.section-help a {
  color: #2563eb;
}
.cert-dl {
  margin: 0.5rem 0 1rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1.5rem;
  max-width: 32rem;
}
.cert-dl dt {
  font-weight: 600;
  color: #334155;
}
.cert-dl dd {
  margin: 0;
}
.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0;
}
.action-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9375rem;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}
.action-btn-primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.action-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.action-btn-secondary {
  background: #f8fafc;
}
.action-btn-danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.action-btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.action-message {
  color: #059669;
  margin: 0.25rem 0;
}
.error {
  color: #dc2626;
  margin: 0.25rem 0;
}
.not-configured,
.not-installed-msg,
.installed-msg {
  margin: 0.5rem 0;
  color: #475569;
}
.installed-msg {
  color: #059669;
  font-weight: 500;
}
.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e2e8f0;
  border-top-color: #64748b;
  border-radius: 50%;
  animation: cert-spin 0.7s linear infinite;
}
@keyframes cert-spin {
  to { transform: rotate(360deg); }
}
.cert-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin: 0.5rem 0;
}
.file-label {
  font-size: 0.9375rem;
  cursor: pointer;
}
.file-label input {
  margin-left: 0.25rem;
}
.file-name {
  font-size: 0.875rem;
  color: #64748b;
}
</style>
