<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useStickyFilter, useStickySort } from '@/composables/useStickyFilter'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import ListLoadingState from '@/components/ListLoadingState.vue'
import ListViewMeta from '@/components/ListViewMeta.vue'

const { filterText } = useStickyFilter('users')
const { sortKey, sortOrder } = useStickySort('users', { defaultKey: 'name' })
const toast = useToastStore()
const users = ref([])
const loading = ref(true)
const error = ref('')
const deleteError = ref('')
const revokeError = ref('')
const deletingId = ref(null)
const revokingId = ref(null)
const confirmDeleteId = ref(null)

function abilitiesDisplay(abilities) {
  if (!Array.isArray(abilities) || abilities.length === 0) return '—'
  return abilities.join(', ')
}

const filteredUsers = computed(() => {
  const list = users.value
  const q = (filterText.value || '').trim().toLowerCase()
  if (!q) return list
  return list.filter((u) => {
    const name = (u.name ?? '').toString().toLowerCase()
    const email = (u.email ?? '').toString().toLowerCase()
    const abil = abilitiesDisplay(u.abilities).toLowerCase()
    const idStr = u.id != null ? String(u.id).toLowerCase() : ''
    return name.includes(q) || email.includes(q) || abil.includes(q) || idStr.includes(q)
  })
})

function sortValue(u, key) {
  if (key === 'abilities') return abilitiesDisplay(u.abilities)
  const v = u[key]
  return v == null ? '' : String(v)
}

const sortedUsers = computed(() => {
  const list = [...filteredUsers.value]
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
  else {
    sortKey.value = k
    sortOrder.value = 'asc'
  }
}

function sortClass(k) {
  if (sortKey.value !== k) return ''
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const response = await getApiClient().get('auth/users')
    users.value = Array.isArray(response) ? response : []
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

function askConfirmDelete(id) {
  confirmDeleteId.value = id
  deleteError.value = ''
}

function cancelConfirmDelete() {
  confirmDeleteId.value = null
}

async function confirmAndDeleteUser(id) {
  if (confirmDeleteId.value !== id) return
  deleteError.value = ''
  deletingId.value = id
  try {
    await getApiClient().delete(`auth/users/${id}`)
    await loadUsers()
    toast.show('User deleted')
  } catch (err) {
    deleteError.value = err.data?.message || err.message || 'Failed to delete user'
  } finally {
    confirmDeleteId.value = null
    deletingId.value = null
  }
}

async function revokeTokens(id) {
  revokeError.value = ''
  revokingId.value = id
  try {
    await getApiClient().delete(`auth/users/revoke/${id}`)
    await loadUsers()
    toast.show('Tokens revoked')
  } catch (err) {
    revokeError.value = err.data?.message || err.message || 'Failed to revoke tokens'
  } finally {
    revokingId.value = null
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="list-view">
    <header class="list-header">
      <h1>Users</h1>
      <p class="toolbar">
        <router-link :to="{ name: 'user-create' }" class="add-btn">Create</router-link>
        <input
          v-model="filterText"
          type="search"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          class="filter-input"
          placeholder="Filter by name, email, abilities, or id"
          aria-label="Filter users"
        />
      </p>
    </header>

    <section
      v-if="loading || error || deleteError || revokeError || users.length === 0"
      class="list-states"
    >
      <ListLoadingState v-if="loading" message="Loading users from API…" />
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-if="deleteError" class="error">{{ deleteError }}</p>
      <p v-if="revokeError" class="error">{{ revokeError }}</p>
      <div v-else-if="users.length === 0" class="empty">No users.</div>
    </section>

    <section v-else class="list-body">
      <ListViewMeta
        v-if="users.length > 0"
        :total="users.length"
        :filtered="filteredUsers.length"
      />
      <p v-if="filterText && filteredUsers.length === 0" class="empty">
        No users match the filter.
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('name')"
              @click="setSort('name')"
            >
              Name
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('email')"
              @click="setSort('email')"
            >
              Email
            </th>
            <th
              class="th-sortable"
              title="Click to sort"
              :class="sortClass('abilities')"
              @click="setSort('abilities')"
            >
              Abilities
            </th>
            <th class="th-actions">Edit</th>
            <th class="th-actions">Revoke</th>
            <th class="th-actions">Delete</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in sortedUsers" :key="u.id">
            <td>{{ u.name ?? '—' }}</td>
            <td>{{ u.email ?? '—' }}</td>
            <td>{{ abilitiesDisplay(u.abilities) }}</td>
            <td>
              <router-link
                :to="{ name: 'user-edit', params: { id: u.id } }"
                class="cell-link cell-link-icon"
                title="Edit"
                aria-label="Edit"
              >
                <span class="action-icon" aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg
                ></span>
              </router-link>
            </td>
            <td>
              <button
                type="button"
                class="cell-link cell-link-icon"
                :title="revokingId === u.id ? 'Revoking…' : 'Revoke tokens'"
                :aria-label="revokingId === u.id ? 'Revoking…' : 'Revoke tokens'"
                :disabled="revokingId === u.id"
                @click="revokeTokens(u.id)"
              >
                <span
                  v-if="revokingId === u.id"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" /></svg
                ></span>
                <span v-else class="action-icon" aria-hidden="true">Revoke</span>
              </button>
            </td>
            <td>
              <button
                type="button"
                class="cell-link cell-link-delete cell-link-icon"
                :title="deletingId === u.id ? 'Deleting…' : 'Delete user'"
                :aria-label="deletingId === u.id ? 'Deleting…' : 'Delete user'"
                :disabled="deletingId === u.id"
                @click="askConfirmDelete(u.id)"
              >
                <span
                  v-if="deletingId === u.id"
                  class="action-icon action-icon-spin"
                  aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" /></svg
                ></span>
                <span v-else class="action-icon" aria-hidden="true"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" /></svg
                ></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <DeleteConfirmModal
      :show="!!confirmDeleteId"
      title="Delete user?"
      :loading="deletingId === confirmDeleteId"
      @confirm="confirmAndDeleteUser(confirmDeleteId)"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          This user will be permanently deleted. They will no longer be able to log in. This cannot
          be undone.
        </p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.list-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.list-header {
  margin: 0;
}
.list-header h1 {
  margin: 0;
}
.list-states {
  margin: 0;
}
.list-body {
  margin: 0;
}
.error,
.empty {
  margin-top: 0;
}
.error {
  color: #dc2626;
}
.table {
  margin-top: 0;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
.table th,
.table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.table th {
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
}
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.th-sortable::before {
  content: '\21C5';
  font-size: 0.7em;
  color: #94a3b8;
  margin-left: 0.2em;
  font-weight: normal;
}
.th-sortable.sort-asc::before,
.th-sortable.sort-desc::before {
  content: none;
}
.th-sortable:hover {
  background: #f1f5f9;
}
.th-sortable.sort-asc::after {
  content: ' \2191';
  font-size: 0.75em;
  color: #64748b;
}
.th-sortable.sort-desc::after {
  content: ' \2193';
  font-size: 0.75em;
  color: #64748b;
}
.th-actions {
  white-space: nowrap;
}
.table tbody tr:hover {
  background: #f8fafc;
}
.cell-link {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
}
.cell-link:hover:not(:disabled) {
  color: #1d4ed8;
}
.cell-link-delete {
  color: #dc2626;
}
.cell-link-delete:hover:not(:disabled) {
  color: #b91c1c;
}
.cell-link-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.action-icon-spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.toolbar {
  margin: 0.75rem 0 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.filter-input {
  margin-left: auto;
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  min-width: 16rem;
}
.filter-input:focus {
  outline: none;
  border-color: #2563eb;
}
.add-btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border-radius: 0.375rem;
  text-decoration: none;
}
.add-btn:hover {
  background: #1d4ed8;
}
</style>
