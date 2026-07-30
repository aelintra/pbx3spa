<script setup>
import { computed } from 'vue'
import { formatBytesAsGb, parseUsedPct, usedPctSwatchColor } from '@/utils/homePulse'

const props = defineProps({
  sysnotes: { type: Object, default: null },
  sitename: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

function display(val) {
  if (val == null || val === '') return '—'
  return String(val)
}

const systemInfo = computed(() => {
  const s = props.sysnotes?.system
  if (!s || typeof s !== 'object') return null
  return {
    ...s,
    php_version: s.php_version ?? s.phpVersion
  }
})

const diskUsagePct = computed(() => parseUsedPct(props.sysnotes?.resource?.disk_usage))
const diskFill = computed(() => usedPctSwatchColor(diskUsagePct.value))
const diskMeterWidth = computed(() => {
  if (diskUsagePct.value == null) return null
  return Math.min(100, Math.max(0, diskUsagePct.value))
})

const ramUsedPct = computed(() => {
  const total = parseInt(String(props.sysnotes?.resource?.ram_total ?? ''), 10)
  const free = parseInt(String(props.sysnotes?.resource?.ram_free ?? ''), 10)
  if (Number.isNaN(total) || total <= 0 || Number.isNaN(free)) return null
  return Math.min(100, Math.max(0, ((total - free) / total) * 100))
})
const ramFill = computed(() => usedPctSwatchColor(ramUsedPct.value))
</script>

<template>
  <section class="sysnotes-card" aria-label="System info">
    <p v-if="loading && !sysnotes" class="loading">Loading system info…</p>
    <p v-else-if="error && !sysnotes" class="error">{{ error }}</p>
    <div v-else class="sysnotes-grid">
      <div class="sysnotes-col">
        <span class="col-label">System</span>
        <dl v-if="systemInfo" class="sysnotes-dl">
          <template v-if="sitename || systemInfo.sitename">
            <dt>Site name</dt>
            <dd>{{ display(sitename || systemInfo.sitename) }}</dd>
          </template>
          <dt>Distro</dt>
          <dd>{{ display(systemInfo.distro) }}</dd>
          <dt>Asterisk release</dt>
          <dd>{{ display(systemInfo.asterisk_release) }}</dd>
          <dt>PBX3 release</dt>
          <dd>{{ display(systemInfo.app_release) }}</dd>
          <dt>PHP (API)</dt>
          <dd>{{ display(systemInfo.php_version) }}</dd>
        </dl>
        <p v-else class="empty">—</p>
      </div>

      <div class="sysnotes-col">
        <span class="col-label">Network</span>
        <dl v-if="sysnotes?.network" class="sysnotes-dl">
          <dt>MAC</dt>
          <dd>{{ display(sysnotes.network.mac) }}</dd>
          <dt>Hostname</dt>
          <dd>{{ display(sysnotes.network.hostname) }}</dd>
          <dt>Local IP</dt>
          <dd>{{ display(sysnotes.network.local_ip) }}</dd>
          <dt>Public IP</dt>
          <dd>{{ display(sysnotes.network.public_ip) }}</dd>
        </dl>
        <p v-else class="empty">—</p>
      </div>

      <div class="sysnotes-col">
        <span class="col-label">Resource</span>
        <dl v-if="sysnotes?.resource" class="sysnotes-dl">
          <dt>Disk usage</dt>
          <dd>
            <div class="disk-usage-block">
              <span>{{ display(sysnotes.resource.disk_usage) }}</span>
              <div
                v-if="diskMeterWidth != null"
                class="usage-meter"
                role="meter"
                :aria-valuenow="diskMeterWidth"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Disk ${display(sysnotes.resource.disk_usage)} used`"
              >
                <div
                  class="usage-meter-fill"
                  :style="{ width: diskMeterWidth + '%', background: diskFill }"
                />
              </div>
            </div>
          </dd>
          <dt>RAM size</dt>
          <dd>
            <div class="disk-usage-block">
              <span>{{ formatBytesAsGb(sysnotes.resource.ram_total) }}</span>
              <div
                v-if="ramUsedPct != null"
                class="usage-meter"
                role="meter"
                :aria-valuenow="ramUsedPct"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Memory ${Math.round(ramUsedPct)}% used`"
              >
                <div
                  class="usage-meter-fill"
                  :style="{ width: ramUsedPct + '%', background: ramFill }"
                />
              </div>
            </div>
          </dd>
          <dt>RAM free</dt>
          <dd>{{ formatBytesAsGb(sysnotes.resource.ram_free) }}</dd>
          <dt>Master timer</dt>
          <dd>{{ display(sysnotes.resource.masteroclo) }}</dd>
          <dt>Timer state</dt>
          <dd>{{ display(sysnotes.resource.timer_state) }}</dd>
        </dl>
        <p v-else class="empty">—</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sysnotes-card {
  padding: 0.75rem 1rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: var(--pbx-panel);
  container-type: inline-size;
  container-name: sysnotes;
}
.sysnotes-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem 1.5rem;
}
@container sysnotes (max-width: 52rem) {
  .sysnotes-grid {
    grid-template-columns: 1fr;
  }
}
@supports not (container-type: inline-size) {
  @media (max-width: 52rem) {
    .sysnotes-grid {
      grid-template-columns: 1fr;
    }
  }
}
.col-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.65rem;
}
.sysnotes-dl {
  margin: 0;
  font-size: 0.875rem;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 1rem;
  row-gap: 0.35rem;
  align-items: baseline;
}
.sysnotes-dl dt {
  margin: 0;
  color: #64748b;
  font-weight: 500;
}
.sysnotes-dl dt::after {
  content: ':';
}
.sysnotes-dl dd {
  margin: 0;
  color: #0f172a;
  min-width: 0;
  overflow-wrap: break-word;
}
.disk-usage-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 5rem;
  max-width: 8rem;
}
.usage-meter {
  height: 0.35rem;
  width: 100%;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.usage-meter-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 0;
}
.loading,
.empty {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}
.error {
  margin: 0;
  color: #dc2626;
  font-size: 0.875rem;
}
</style>
