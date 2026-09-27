<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenant } from '@/utils/validation'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import { useUnsavedForm } from '@/composables/useUnsavedForm'
import { refreshCommitStatusUi } from '@/utils/commitStatus'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const { markDirty, beginHydrate, markClean } = useUnsavedForm()

const cluster = ref('default')
const active = ref('YES')
const cname = ref('')
const description = ref('')
const openRules = ref({})
const closedRules = ref({})
const availableRules = ref([])
const tenants = ref([])
const tenantsLoading = ref(true)
const rulesLoading = ref(false)
const error = ref('')
const loading = ref(false)

const clusterValidation = useFormValidation(cluster, validateTenant)

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur))
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

function tenantAliases(tenantPkey) {
  const t = tenants.value.find(
    (row) =>
      String(row.pkey) === String(tenantPkey) ||
      String(row.shortuid) === String(tenantPkey) ||
      String(row.id) === String(tenantPkey)
  )
  if (!t) return [String(tenantPkey)]
  return [t.pkey, t.shortuid, t.id].filter((v) => v != null && String(v).trim() !== '').map(String)
}

function ruleLabel(rule) {
  const name = rule?.cname != null && String(rule.cname).trim() !== '' ? String(rule.cname).trim() : ''
  return name || String(rule?.pkey ?? '')
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    tenants.value = await loadTenantOptions()
    if (tenants.value.length && (!cluster.value || cluster.value === 'default')) {
      const first = tenants.value.find((t) => t.pkey === 'default')?.pkey ?? tenants.value[0]?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function loadRulesForTenant() {
  rulesLoading.value = true
  try {
    const res = await getApiClient().get('cosrules')
    const all = normalizeList(res, 'cosrules') || normalizeList(res)
    const aliases = new Set(tenantAliases(cluster.value))
    const filtered = all.filter((r) => aliases.has(String(r.cluster ?? '')))
    availableRules.value = filtered
    const openMap = {}
    const closedMap = {}
    for (const r of filtered) {
      const key = String(r.pkey ?? '')
      if (!key) continue
      openMap[key] = openRules.value[key] === 'YES' ? 'YES' : 'NO'
      closedMap[key] = closedRules.value[key] === 'YES' ? 'YES' : 'NO'
    }
    openRules.value = openMap
    closedRules.value = closedMap
  } catch {
    availableRules.value = []
    openRules.value = {}
    closedRules.value = {}
  } finally {
    rulesLoading.value = false
  }
}

onMounted(async () => {
  beginHydrate()
  await ensureFetched()
  applySchemaDefaults('cosprofiles', {
    cluster,
    active,
    cname,
    description
  })
  await loadTenants()
  await loadRulesForTenant()
  await markClean()
})

watch(cluster, () => {
  loadRulesForTenant()
})

function goBack() {
  router.push({ name: 'cosprofiles' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

function selectedKeys(mapRef) {
  return Object.entries(mapRef.value)
    .filter(([, v]) => v === 'YES')
    .map(([k]) => k)
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [{ ...clusterValidation, fieldId: 'cluster' }]
  if (!cname.value || !String(cname.value).trim()) {
    error.value = 'Name is required'
    return
  }
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => document.getElementById(id))
    return
  }

  loading.value = true
  try {
    const body = {
      cluster: cluster.value.trim(),
      active: active.value,
      cname: cname.value.trim(),
      description: description.value.trim() || null,
      open_rules: selectedKeys(openRules),
      closed_rules: selectedKeys(closedRules)
    }
    const created = await getApiClient().post('cosprofiles', body)
    const label = (created?.cname && String(created.cname).trim()) || created?.shortuid || 'profile'
    toast.show(`CoS profile ${label} created`)
    refreshCommitStatusUi()
    router.push({ name: 'cosprofiles' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors?.cluster) {
      clusterValidation.touched.value = true
      clusterValidation.error.value = Array.isArray(errors.cluster)
        ? errors.cluster[0]
        : errors.cluster
    }
    if (errors?.cname) {
      error.value = Array.isArray(errors.cname) ? errors.cname[0] : errors.cname
    } else if (errors?.open_rules) {
      error.value = Array.isArray(errors.open_rules) ? errors.open_rules[0] : errors.open_rules
    } else if (errors?.closed_rules) {
      error.value = Array.isArray(errors.closed_rules) ? errors.closed_rules[0] : errors.closed_rules
    }
    if (!error.value) error.value = firstErrorMessage(err, 'Failed to create CoS profile')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown" @input="markDirty" @change="markDirty">
    <PanelBackLink :to="{ name: 'cosprofiles' }" label="CoS profiles">
      <h1>Create CoS profile</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="cname"
          v-model="cname"
          label="Name"
          type="text"
          placeholder="e.g. Staff, Lobby, Restricted"
          :required="true"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description"
          multiline
          :rows="3"
          placeholder="Who this profile is for"
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
          @blur="clusterValidation.onBlur"
        />
        <FormToggle id="active" v-model="active" label="Active" yes-value="YES" no-value="NO" />
        <p class="hint">
          New profiles are not the tenant Default. Default is fixed (convert/seed); change default
          policy by editing that profile’s Standard / After-hours lists.
        </p>
      </div>

      <h2 class="detail-heading">Standard (business hours)</h2>
      <p class="hint">
        Deny rules applied when the site is open. Tenant-wide rules still apply even if unchecked
        here.
      </p>
      <p v-if="rulesLoading" class="muted">Loading rules…</p>
      <p v-else-if="availableRules.length === 0" class="muted">
        No CoS rules for this tenant.
        <router-link :to="{ name: 'cosrule-create' }">Create a rule</router-link>
        first.
      </p>
      <div v-else class="form-fields rule-list">
        <FormToggle
          v-for="rule in availableRules"
          :id="`open-${rule.pkey}`"
          :key="`open-${rule.pkey}`"
          v-model="openRules[rule.pkey]"
          :label="ruleLabel(rule)"
          :hint="rule.description || ''"
          yes-value="YES"
          no-value="NO"
          hide-help
        />
      </div>

      <h2 class="detail-heading">After-hours</h2>
      <p class="hint">
        Typically stricter outbound when the site is closed (STATE CLOSED). Same rule packs as
        Standard; often more of them enabled.
      </p>
      <div v-if="!rulesLoading && availableRules.length" class="form-fields rule-list">
        <FormToggle
          v-for="rule in availableRules"
          :id="`closed-${rule.pkey}`"
          :key="`closed-${rule.pkey}`"
          v-model="closedRules[rule.pkey]"
          :label="ruleLabel(rule)"
          :hint="rule.description || ''"
          yes-value="YES"
          no-value="NO"
          hide-help
        />
      </div>

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
  margin: 1.25rem 0 0.35rem 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.hint,
.muted {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
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
.actions button[type='submit'] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type='submit']:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
</style>
