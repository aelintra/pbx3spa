<script setup>
/**
 * S10.6 — fleet user manage (gatekeeper SQLite). fleet_admin only.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  listFleetUsers,
  createFleetUser,
  updateFleetUser,
  disableFleetUser,
  enableFleetUser,
  revokeFleetUserSessions,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  getFleetAbilities,
  canFleet,
  FLEET_ABILITY,
  FLEET_ABILITY_ALL
} from '@/config/fleetGatekeeper'

const users = ref([])
const abilityVocab = ref([...FLEET_ABILITY_ALL])
const loading = ref(false)
const error = ref('')
const actionMsg = ref('')
const busyId = ref('')
const canAdmin = computed(() => canFleet(FLEET_ABILITY.ADMIN))

const showCreate = ref(false)
const createForm = ref({
  email: '',
  name: '',
  password: '',
  abilities: [FLEET_ABILITY.READ]
})

const editingId = ref(null)
const editForm = ref({
  name: '',
  password: '',
  abilities: []
})

async function load() {
  if (!hasFleetGatekeeperToken()) {
    users.value = []
    error.value = ''
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    if (!canFleet(FLEET_ABILITY.ADMIN)) {
      users.value = []
      error.value = 'This session lacks fleet_admin — cannot manage fleet users.'
      return
    }
    const data = await listFleetUsers()
    users.value = data.users || []
    if (Array.isArray(data.ability_vocab) && data.ability_vocab.length) {
      abilityVocab.value = data.ability_vocab
    }
  } catch (e) {
    users.value = []
    error.value = e?.message || 'Failed to load fleet users'
  } finally {
    loading.value = false
  }
}

function toggleAbility(target, ability) {
  const set = new Set(target.abilities)
  if (set.has(ability)) set.delete(ability)
  else set.add(ability)
  target.abilities = abilityVocab.value.filter((a) => set.has(a))
}

function toggleCreate() {
  showCreate.value = !showCreate.value
  if (showCreate.value) {
    editingId.value = null
  }
}

function startEdit(row) {
  showCreate.value = false
  editingId.value = row.id
  editForm.value = {
    name: row.name || '',
    password: '',
    abilities: [...(row.abilities || [])]
  }
  actionMsg.value = ''
  error.value = ''
}

function cancelEdit() {
  editingId.value = null
}

async function submitCreate() {
  if (!canAdmin.value) return
  busyId.value = 'create'
  error.value = ''
  actionMsg.value = ''
  try {
    const body = {
      email: createForm.value.email.trim(),
      password: createForm.value.password,
      name: createForm.value.name.trim(),
      abilities: [...createForm.value.abilities]
    }
    if (!body.abilities.length) {
      throw new Error('Pick at least one ability')
    }
    const created = await createFleetUser(body)
    actionMsg.value = `Created ${created.email}`
    showCreate.value = false
    createForm.value = {
      email: '',
      name: '',
      password: '',
      abilities: [FLEET_ABILITY.READ]
    }
    await load()
  } catch (e) {
    error.value = e?.message || 'Create failed'
  } finally {
    busyId.value = ''
  }
}

async function submitEdit() {
  if (!canAdmin.value || editingId.value == null) return
  busyId.value = String(editingId.value)
  error.value = ''
  actionMsg.value = ''
  try {
    if (!editForm.value.abilities.length) {
      throw new Error('Pick at least one ability')
    }
    const patch = {
      name: editForm.value.name.trim(),
      abilities: [...editForm.value.abilities]
    }
    if (editForm.value.password) {
      patch.password = editForm.value.password
    }
    const updated = await updateFleetUser(editingId.value, patch)
    actionMsg.value = `Updated ${updated.email}`
    editForm.value.password = ''
    editingId.value = null
    await load()
  } catch (e) {
    error.value = e?.message || 'Update failed'
  } finally {
    busyId.value = ''
  }
}

async function doDisable(row) {
  if (!canAdmin.value) return
  const ok = window.confirm(
    `Disable ${row.email}?\n\nLogin blocked; all sessions revoked. You can re-enable later.`
  )
  if (!ok) return
  busyId.value = String(row.id)
  error.value = ''
  actionMsg.value = ''
  try {
    await disableFleetUser(row.id)
    actionMsg.value = `Disabled ${row.email}`
    if (editingId.value === row.id) editingId.value = null
    await load()
  } catch (e) {
    error.value = e?.message || 'Disable failed'
  } finally {
    busyId.value = ''
  }
}

async function doEnable(row) {
  if (!canAdmin.value) return
  busyId.value = String(row.id)
  error.value = ''
  actionMsg.value = ''
  try {
    await enableFleetUser(row.id)
    actionMsg.value = `Enabled ${row.email}`
    await load()
  } catch (e) {
    error.value = e?.message || 'Enable failed'
  } finally {
    busyId.value = ''
  }
}

async function doRevoke(row) {
  if (!canAdmin.value) return
  const ok = window.confirm(`Revoke all sessions for ${row.email}?`)
  if (!ok) return
  busyId.value = String(row.id)
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await revokeFleetUserSessions(row.id)
    actionMsg.value = `Revoked ${result.revoked ?? 0} session(s) for ${row.email}`
    await load()
  } catch (e) {
    error.value = e?.message || 'Revoke failed'
  } finally {
    busyId.value = ''
  }
}

onMounted(load)

onBeforeUnmount(() => {
  // Avoid browser "save password" when leaving with form values still mounted.
  createForm.value.password = ''
  editForm.value.password = ''
  showCreate.value = false
  editingId.value = null
})
</script>

<template>
  <div class="fleet-users-view">
    <h1>Fleet users</h1>
    <p class="hint">
      Control-plane operators on the gatekeeper auth DB (not instance Sanctum).
      Requires <code>fleet_admin</code>. Disable revokes sessions; break-glass API token is separate.
    </p>

    <div v-if="hasFleetGatekeeperToken()" class="toolbar">
      <button type="button" class="primary" :disabled="loading" @click="load">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
      <button
        v-if="canAdmin"
        type="button"
        class="primary"
        :disabled="!!busyId"
        @click="toggleCreate"
      >
        {{ showCreate ? 'Cancel create' : 'Create user' }}
      </button>
    </div>

    <p v-if="actionMsg" class="ok-msg">{{ actionMsg }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <form
      v-if="showCreate && canAdmin"
      class="panel"
      autocomplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
      @submit.prevent="submitCreate"
    >
      <h2>Create fleet user</h2>
      <label>
        Email
        <input
          v-model="createForm.email"
          type="text"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          name="fleet_user_email"
          autocomplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          required
        />
      </label>
      <label>
        Name
        <input
          v-model="createForm.name"
          name="fleet_user_name"
          autocomplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
        />
      </label>
      <label>
        Password (min 10)
        <input
          v-model="createForm.password"
          type="password"
          name="fleet_user_new_password"
          autocomplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          required
          minlength="10"
        />
      </label>
      <fieldset class="abilities">
        <legend>Abilities</legend>
        <label v-for="a in abilityVocab" :key="a" class="check">
          <input
            type="checkbox"
            :checked="createForm.abilities.includes(a)"
            @change="toggleAbility(createForm, a)"
          />
          <code>{{ a }}</code>
        </label>
      </fieldset>
      <button type="submit" class="primary" :disabled="busyId === 'create'">
        {{ busyId === 'create' ? 'Creating…' : 'Create' }}
      </button>
    </form>

    <table v-if="users.length" class="data-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Abilities</th>
          <th>Sessions</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <template v-for="row in users" :key="row.id">
          <tr :class="{ muted: !!row.disabled_at }">
            <td><code>{{ row.email }}</code></td>
            <td>{{ row.name }}</td>
            <td class="abilities-cell">
              <code v-for="a in row.abilities" :key="a" class="chip">{{ a }}</code>
            </td>
            <td>{{ row.session_count }}</td>
            <td>
              <span v-if="row.disabled_at" class="badge badge--muted">disabled</span>
              <span v-else class="badge">active</span>
            </td>
            <td class="actions">
              <button
                v-if="canAdmin"
                type="button"
                class="linkish"
                :disabled="!!busyId"
                @click="editingId === row.id ? cancelEdit() : startEdit(row)"
              >
                {{ editingId === row.id ? 'Cancel' : 'Edit' }}
              </button>
              <button
                v-if="canAdmin && !row.disabled_at"
                type="button"
                class="linkish"
                :disabled="!!busyId"
                @click="doRevoke(row)"
              >
                Revoke sessions
              </button>
              <button
                v-if="canAdmin && !row.disabled_at"
                type="button"
                class="linkish danger"
                :disabled="!!busyId"
                @click="doDisable(row)"
              >
                Disable
              </button>
              <button
                v-if="canAdmin && row.disabled_at"
                type="button"
                class="linkish"
                :disabled="!!busyId"
                @click="doEnable(row)"
              >
                Enable
              </button>
            </td>
          </tr>
          <tr v-if="editingId === row.id" class="edit-row">
            <td colspan="6">
              <form
                class="edit-form"
                autocomplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                @submit.prevent="submitEdit"
              >
                <label>
                  Name
                  <input
                    v-model="editForm.name"
                    name="fleet_user_edit_name"
                    autocomplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                  />
                </label>
                <label>
                  New password (optional)
                  <input
                    v-model="editForm.password"
                    type="password"
                    name="fleet_user_edit_password"
                    autocomplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    minlength="10"
                  />
                </label>
                <fieldset class="abilities">
                  <legend>Abilities</legend>
                  <label v-for="a in abilityVocab" :key="a" class="check">
                    <input
                      type="checkbox"
                      :checked="editForm.abilities.includes(a)"
                      @change="toggleAbility(editForm, a)"
                    />
                    <code>{{ a }}</code>
                  </label>
                </fieldset>
                <button
                  type="submit"
                  class="primary"
                  :disabled="busyId === String(row.id)"
                >
                  {{ busyId === String(row.id) ? 'Saving…' : 'Save' }}
                </button>
              </form>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <p v-else-if="canAdmin && hasFleetGatekeeperToken() && !loading && !error" class="hint">
      No fleet users yet.
    </p>
  </div>
</template>

<style scoped>
.fleet-users-view {
  max-width: 64rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1rem 0;
}
.primary {
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  border: 1px solid var(--pbx-border);
  background: var(--pbx-primary, #2563eb);
  color: #fff;
  cursor: pointer;
  font: inherit;
}
.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.panel,
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 4px;
  background: var(--pbx-surface, #fff);
}
.panel h2 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}
input[type='email'],
input[type='password'],
input[type='text'],
input:not([type]) {
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--pbx-border);
  border-radius: 4px;
  font: inherit;
}
.abilities {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.abilities legend {
  font-size: 0.85rem;
  padding: 0;
  margin-bottom: 0.25rem;
}
.check {
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.ok-msg {
  color: var(--pbx-ok, #15803d);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--pbx-border);
  vertical-align: top;
}
.muted td {
  opacity: 0.7;
}
.abilities-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.chip {
  font-size: 0.75rem;
  padding: 0.1rem 0.35rem;
  background: var(--pbx-surface-subtle, #f1f5f9);
  border-radius: 3px;
}
.badge {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  border-radius: 3px;
  background: #dcfce7;
  color: #166534;
}
.badge--muted {
  background: var(--pbx-surface-subtle, #f1f5f9);
  color: var(--pbx-text-muted);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  white-space: nowrap;
}
.linkish {
  background: none;
  border: none;
  padding: 0;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}
.linkish.danger {
  color: var(--pbx-danger, #b91c1c);
}
.linkish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.edit-row td {
  background: var(--pbx-surface-subtle, #f8fafc);
}
</style>
