<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const show = computed(() => auth.isLoggedIn && Boolean(auth.displayInstanceLabel?.trim()))

const tenantSecondary = computed(() => {
  const t = auth.tenantContext
  if (!t) return ''
  const main = (t.label ?? '').trim() || (t.pkey ?? '').trim()
  if (!main) return ''
  const pk = (t.pkey ?? '').trim()
  if (pk && pk !== main) return pk
  return ''
})
</script>

<template>
  <div
    v-if="show"
    class="session-context-chips"
    role="group"
    aria-label="Connected PBX context"
  >
    <span class="context-chip context-chip--instance" title="Instance FQDN from Instance Globals (sysglobals.fqdn)">
      <span class="context-chip-k">Instance</span>
      <span class="context-chip-v">{{ auth.displayInstanceLabel }}</span>
    </span>
    <span
      v-if="auth.tenantContext"
      class="context-chip context-chip--tenant"
      :title="tenantSecondary ? `Tenant: ${tenantSecondary}` : 'Tenant in focus'"
    >
      <span class="context-chip-k">Tenant</span>
      <span class="context-chip-v">{{ (auth.tenantContext.label || auth.tenantContext.pkey || '').trim() || '—' }}</span>
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
</style>
