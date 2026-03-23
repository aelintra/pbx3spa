<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import { firstErrorMessage } from '@/utils/formErrors'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'

const { filterText } = useStickyFilter('greetings')
const toast = useToastStore()
const greetings = ref([])
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const deletingShortuid = ref(null)
const confirmDeleteShortuid = ref(null)
const downloadingShortuid = ref(null)
const { sortKey, sortOrder } = useStickySort('greetings', { defaultKey: 'pkey' })

// Playback: one shared Audio element; which row is loaded/playing
const audioRef = ref(null)
const playbackShortuid = ref(null)  // which greeting is loaded (blob URL set)
const loadingPlaybackShortuid = ref(null)
const playbackObjectUrl = ref(null)
const isPlaying = ref(false)
const playbackCurrentTime = ref(0)
const playbackDuration = ref(0)
const REWIND_SECS = 10

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(item) {
  const cl = item.cluster
  if (cl == null || cl === '') return '—'
  return clusterToTenantPkey.value.get(String(cl)) ?? cl
}

const filteredGreetings = computed(() => {
  const list = greetings.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  const map = clusterToTenantPkey.value
  return list.filter((item) => {
    const pkey = (item.pkey ?? '').toString().toLowerCase()
    const cluster = (item.cluster ?? '').toString().toLowerCase()
    const tenant = (map.get(String(item.cluster)) ?? item.cluster ?? '').toString().toLowerCase()
    const cname = (item.cname ?? '').toString().toLowerCase()
    const description = (item.description ?? '').toString().toLowerCase()
    const filename = (item.filename ?? '').toString().toLowerCase()
    const type = (item.type ?? '').toString().toLowerCase()
    return pkey.includes(q) || cluster.includes(q) || tenant.includes(q) || cname.includes(q) || description.includes(q) || filename.includes(q) || type.includes(q)
  })
})

function sortValue(item, key) {
  if (key === 'cluster') return tenantPkeyDisplay(item)
  const v = item[key]
  if (v == null || v === '') return ''
  return String(v)
}

const sortedGreetings = computed(() => {
  const list = [...filteredGreetings.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    const va = sortValue(a, key).toLowerCase()
    const vb = sortValue(b, key).toLowerCase()
    let cmp = 0
    if (va < vb) cmp = -1
    else if (va > vb) cmp = 1
    return order === 'asc' ? cmp : -cmp
  })
  return list
})

function setSort(k) {
  if (sortKey.value === k) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = k; sortOrder.value = 'asc' }
}

function sortClass(k) {
  if (sortKey.value !== k) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

async function loadGreetings() {
  loading.value = true
  error.value = ''
  try {
    const [gRes, tRes] = await Promise.all([
      getApiClient().get('greetingrecords'),
      getApiClient().get('tenants')
    ])
    greetings.value = normalizeList(gRes, 'greetingrecords') || normalizeList(gRes)
    tenants.value = normalizeList(tRes, 'tenants')
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load greetings')
  } finally {
    loading.value = false
  }
}

function askConfirmDelete(shortuid) {
  confirmDeleteShortuid.value = shortuid
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeleteShortuid.value = null
}

async function confirmAndDelete(shortuid) {
  if (confirmDeleteShortuid.value !== shortuid) return
  deleteError.value = ''
  deletingShortuid.value = shortuid
  try {
    await getApiClient().delete(`greetingrecords/${encodeURIComponent(shortuid)}`)
    await loadGreetings()
    toast.show('Greeting deleted')
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete greeting')
  } finally {
    confirmDeleteShortuid.value = null
    deletingShortuid.value = null
  }
}

async function downloadGreeting(shortuid, pkey) {
  downloadingShortuid.value = shortuid
  try {
    const blob = await getApiClient().getBlob(`greetingrecords/${encodeURIComponent(shortuid)}/download`)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // API returns the correct filename; this is just a fallback hint for the browser.
    a.download = `usergreeting${pkey}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.show('Greeting download started')
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Failed to download greeting'), 'error')
  } finally {
    downloadingShortuid.value = null
  }
}

function formatTime(sec) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function revokePlaybackUrl() {
  if (playbackObjectUrl.value) {
    window.URL.revokeObjectURL(playbackObjectUrl.value)
    playbackObjectUrl.value = null
  }
}

async function playPause(g) {
  const shortuid = g?.shortuid
  if (!shortuid) return
  const audio = audioRef.value
  if (!audio) return

  if (playbackShortuid.value === shortuid) {
    if (isPlaying.value) {
      audio.pause()
      isPlaying.value = false
    } else {
      audio.play().catch(() => {})
      isPlaying.value = true
    }
    return
  }

  loadingPlaybackShortuid.value = shortuid
  revokePlaybackUrl()
  try {
    const blob = await getApiClient().getBlob(`greetingrecords/${encodeURIComponent(shortuid)}/download`)
    const url = window.URL.createObjectURL(blob)
    playbackObjectUrl.value = url
    playbackShortuid.value = shortuid
    audio.src = url
    playbackDuration.value = 0
    playbackCurrentTime.value = 0
    await audio.play()
    isPlaying.value = true
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Failed to load audio'), 'error')
    playbackShortuid.value = null
    revokePlaybackUrl()
  } finally {
    loadingPlaybackShortuid.value = null
  }
}

function onPlaybackTimeUpdate() {
  const a = audioRef.value
  if (a) playbackCurrentTime.value = a.currentTime
}

function onPlaybackLoadedMetadata() {
  const a = audioRef.value
  if (a) playbackDuration.value = a.duration
}

function onPlaybackEnded() {
  isPlaying.value = false
  playbackCurrentTime.value = playbackDuration.value
}

function rewind() {
  const a = audioRef.value
  if (!a) return
  a.currentTime = Math.max(0, a.currentTime - REWIND_SECS)
}

function seek(seconds) {
  const a = audioRef.value
  if (!a) return
  a.currentTime = Math.max(0, Math.min(seconds, a.duration || 0))
}

onMounted(loadGreetings)
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
  revokePlaybackUrl()
})
</script>

<template>
  <div class="list-view">
    <audio
      ref="audioRef"
      class="sr-only"
      @timeupdate="onPlaybackTimeUpdate"
      @loadedmetadata="onPlaybackLoadedMetadata"
      @ended="onPlaybackEnded"
    />
    <header class="list-header">
      <h1>Greetings</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'greeting-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          class="filter-input"
          placeholder="Filter by number, tenant, name, or filename"
          aria-label="Filter greetings"
        />
      </p>
    </header>

    <section v-if="loading || error || deleteError || greetings.length === 0" class="list-states">
      <ListLoadingState v-if="loading" message="Loading greetings from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <div v-else-if="greetings.length === 0" class="empty">No greetings.</div>
    </section>

    <section v-else class="list-body">
      <p v-if="filterText && filteredGreetings.length === 0" class="empty">No greetings match the filter.</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="th-sortable" title="Click to sort" :class="sortClass('pkey')" @click="setSort('pkey')">Number</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('shortuid')" @click="setSort('shortuid')">Local UID</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cluster')" @click="setSort('cluster')">Tenant</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('cname')" @click="setSort('cname')">Name</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('filename')" @click="setSort('filename')">Original filename</th>
            <th class="th-sortable" title="Click to sort" :class="sortClass('type')" @click="setSort('type')">Type</th>
            <th class="th-actions" title="Play"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span></th>
            <th class="th-actions" title="Download"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span></th>
            <th class="th-actions" title="Edit"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span></th>
            <th class="th-actions" title="Delete"><span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in sortedGreetings" :key="g.shortuid || g.id || (g.cluster || '') + '-' + (g.pkey || '')">
            <td>{{ g.pkey }}</td>
            <td>{{ g.shortuid ?? '—' }}</td>
            <td>{{ tenantPkeyDisplay(g) }}</td>
            <td>{{ g.cname ?? '' }}</td>
            <td>{{ g.filename ?? '—' }}</td>
            <td>{{ g.type ?? '—' }}</td>
            <td class="play-cell">
              <template v-if="g.shortuid">
                <span v-if="loadingPlaybackShortuid === g.shortuid" class="play-loading">Loading…</span>
                <template v-else>
                  <button
                    type="button"
                    class="cell-link cell-link-icon play-btn"
                    :title="playbackShortuid === g.shortuid && isPlaying ? 'Pause' : 'Play'"
                    :aria-label="playbackShortuid === g.shortuid && isPlaying ? 'Pause' : 'Play'"
                    @click="playPause(g)"
                  >
                    <span v-if="playbackShortuid === g.shortuid && isPlaying" class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></span>
                    <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
                  </button>
                  <button
                    v-if="playbackShortuid === g.shortuid"
                    type="button"
                    class="cell-link cell-link-icon rewind-btn"
                    title="Rewind 10 seconds"
                    aria-label="Rewind 10 seconds"
                    @click="rewind()"
                  >
                    <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg></span>
                  </button>
                  <div v-if="playbackShortuid === g.shortuid && playbackDuration > 0" class="seek-row">
                    <input
                      type="range"
                      class="seek-slider"
                      min="0"
                      :max="playbackDuration"
                      step="0.1"
                      :value="playbackCurrentTime"
                      @input="seek(parseFloat($event.target.value))"
                      aria-label="Seek"
                    />
                    <span class="seek-time">{{ formatTime(playbackCurrentTime) }} / {{ formatTime(playbackDuration) }}</span>
                  </div>
                </template>
              </template>
              <span v-else style="opacity: 0.5;">—</span>
            </td>
            <td>
              <button
                v-if="g.shortuid"
                type="button"
                class="cell-link cell-link-icon"
                :disabled="downloadingShortuid === g.shortuid"
                :title="downloadingShortuid === g.shortuid ? 'Downloading…' : 'Download'"
                @click="downloadGreeting(g.shortuid, g.pkey)"
              >
                <span v-if="downloadingShortuid === g.shortuid" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>
              </button>
              <span v-else style="opacity: 0.5;">—</span>
            </td>
            <td>
              <router-link v-if="g.shortuid" :to="{ name: 'greeting-detail', params: { shortuid: g.shortuid } }" class="cell-link cell-link-icon" title="Edit" aria-label="Edit">
                <span class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></span>
              </router-link>
              <span v-else style="opacity: 0.5;">—</span>
            </td>
            <td>
              <button
                v-if="g.shortuid"
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :disabled="deletingShortuid === g.shortuid"
                :title="deletingShortuid === g.shortuid ? 'Deleting…' : 'Delete'"
                @click="askConfirmDelete(g.shortuid)"
              >
                <span v-if="deletingShortuid === g.shortuid" class="action-icon action-icon-spin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg></span>
                <span v-else class="action-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></span>
              </button>
              <span v-else style="opacity: 0.5;">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeleteShortuid"
      title="Delete greeting?"
      :loading="deletingShortuid === confirmDeleteShortuid"
      @confirm="confirmDeleteShortuid && confirmAndDelete(confirmDeleteShortuid)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Greeting <strong>{{ confirmDeleteShortuid }}</strong> will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.list-view { display: flex; flex-direction: column; gap: 1rem; }
.list-header { margin: 0; }
.list-states, .list-body { margin: 0; }
.error, .empty { margin-top: 0; }
.error { color: #dc2626; }
.table { margin-top: 0; width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.table th, .table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.table th { font-weight: 600; color: #475569; background: #f8fafc; }
.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable::before { content: '\21C5'; font-size: 0.7em; color: #94a3b8; margin-left: 0.2em; font-weight: normal; }
.th-sortable.sort-asc::before, .th-sortable.sort-desc::before { content: none; }
.th-sortable:hover { background: #f1f5f9; }
.th-sortable.sort-asc::after { content: ' \2191'; font-size: 0.75em; color: #64748b; }
.th-sortable.sort-desc::after { content: ' \2193'; font-size: 0.75em; color: #64748b; }
.th-actions { cursor: default; white-space: nowrap; }
.action-icon { display: inline-flex; align-items: center; justify-content: center; }
.action-icon-spin { animation: action-icon-spin 0.8s linear infinite; }
@keyframes action-icon-spin { to { transform: rotate(360deg); } }
.cell-link-icon { padding: 0.25rem; }
.table tbody tr:hover { background: #f8fafc; }
.cell-link { color: #2563eb; text-decoration: none; background: none; border: none; padding: 0; font: inherit; cursor: pointer; }
.cell-link:hover { text-decoration: underline; }
.cell-link-delete { color: #dc2626; }
.cell-link:disabled { opacity: 0.7; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.play-cell { white-space: nowrap; }
.play-cell .play-btn { margin-right: 0.25rem; }
.play-cell .rewind-btn { margin-right: 0.5rem; }
.play-loading { font-size: 0.875rem; color: #64748b; }
.seek-row { display: inline-flex; align-items: center; gap: 0.5rem; vertical-align: middle; }
.seek-slider { width: 5rem; height: 0.5rem; accent-color: #2563eb; }
.seek-time { font-size: 0.75rem; color: #64748b; min-width: 4.5rem; }
.toolbar { margin: 0.75rem 0 0 0; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.add-btn { display: inline-block; padding: 0.5rem 1rem; font-size: 0.9375rem; font-weight: 500; color: #fff; background: #2563eb; border-radius: 0.375rem; text-decoration: none; }
.add-btn:hover { background: #1d4ed8; }
.filter-input { padding: 0.5rem 0.75rem; font-size: 0.9375rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; min-width: 16rem; }
.filter-input:focus { outline: none; border-color: #2563eb; }
</style>

