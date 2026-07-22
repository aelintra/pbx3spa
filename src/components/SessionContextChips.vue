<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const show = computed(() => auth.isLoggedIn && Boolean(auth.displayInstanceLabel?.trim()))

const showSwitcher = computed(
  () => !auth.isAdmin && auth.allowedClusterDetails.length > 1
)

const tenantSecondary = computed(() => {
  const t = auth.tenantContext
  if (!t) return ''
  const main = (t.label ?? '').trim() || (t.pkey ?? '').trim()
  if (!main) return ''
  const pk = (t.pkey ?? '').trim()
  if (pk && pk !== main) return pk
  return ''
})

function onSwitchTenant(e) {
  const id = e.target.value
  const detail = auth.allowedClusterDetails.find(
    (d) => String(d.shortuid) === id || String(d.pkey) === id
  )
  if (!detail) return
  auth.setTenantContext(detail.pkey || detail.shortuid, detail.label || detail.pkey || detail.shortuid)
}

const switcherValue = computed(() => {
  const t = auth.tenantContext
  if (!t) return ''
  const pk = String(t.pkey || '')
  const match = auth.allowedClusterDetails.find(
    (d) => String(d.pkey) === pk || String(d.shortuid) === pk
  )
  return match ? String(match.shortuid || match.pkey) : pk
})
</script>

<template>
  <div v-if="show" class="session-context-chips" role="group" aria-label="Connected PBX context">
    <span
      class="context-chip context-chip--instance"
      title="Instance FQDN from Instance Globals (sysglobals.fqdn)"
    >
      <span class="context-chip-k">Instance</span>
      <span class="context-chip-v">
        {{ auth.displayInstanceLabel }}
        <template v-if="auth.displayInstanceEnvironment">
          <span class="context-chip-env">({{ auth.displayInstanceEnvironment }})</span>
        </template>
      </span>
    </span>
    <label v-if="showSwitcher" class="context-chip context-chip--tenant context-chip--switch">
      <span class="context-chip-k">Tenant</span>
      <select class="tenant-switch" :value="switcherValue" @change="onSwitchTenant">
        <option v-if="!switcherValue" value="" disabled>Select tenant…</option>
        <option
          v-for="c in auth.allowedClusterDetails"
          :key="c.shortuid || c.pkey"
          :value="c.shortuid || c.pkey"
        >
          {{ c.label || c.pkey || c.shortuid }}
        </option>
      </select>
    </label>
    <span
      v-else-if="auth.tenantContext"
      class="context-chip context-chip--tenant"
      :title="tenantSecondary ? `Tenant: ${tenantSecondary}` : 'Tenant in focus'"
    >
      <span class="context-chip-k">Tenant</span>
      <span class="context-chip-v">{{
        (auth.tenantContext.label || auth.tenantContext.pkey || '').trim() || '—'
      }}</span>
    </span>
  </div>
</template>

<style scoped>
.session-context-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.65rem;
  min-width: 0;
}

.context-chip {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem;
  max-width: min(100%, 28rem);
  padding: 0.3rem 0.65rem;
  font-size: 0.8125rem;
  line-height: 1.3;
  border-radius: 9999px;
  border: 1px solid var(--pbx-border, #e2e8f0);
  background: var(--pbx-surface-subtle, #f1f5f9);
  color: var(--pbx-text, #0f172a);
}

.context-chip--tenant {
  background: var(--pbx-canvas, #f8fafc);
}

.context-chip--switch {
  align-items: center;
}

.tenant-switch {
  max-width: 12rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: inherit;
}

.context-chip-k {
  font-weight: 600;
  color: var(--pbx-text-muted, #64748b);
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}

.context-chip-v {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.context-chip-env {
  font-weight: 500;
  color: var(--pbx-text-muted, #64748b);
}
</style>
