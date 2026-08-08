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
  clearFleetUserTwoFactor,
  refreshFleetSession,
  getFleetMe
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
/** Current session user id (null for break-glass / unknown). */
const selfUserId = ref(null)
const canAdmin = computed(() => canFleet(FLEET_ABILITY.ADMIN))

function isSelf(row) {
  return selfUserId.value != null && Number(row?.id) === Number(selfUserId.value)
}

const showCreate = ref(false)
const createForm = ref({
  email: '',
  name: '',
  password: '',
  abilities: [FLEET_ABILITY.READ],
  notify_failures: false
})

const editingId = ref(null)
const editForm = ref({
  name: '',
  password: '',
  abilities: [],
  notify_failures: false
})

const openMenuId = ref(null)

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeRowMenu() {
  openMenuId.value = null
}

function onDocClick(e) {
  const t = e.target
  if (!(t instanceof Element)) return
  if (t.closest('.actions-cell')) return
  closeRowMenu()
}

async function load() {
  if (!hasFleetGatekeeperToken()) {
    users.value = []
    selfUserId.value = null
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
      selfUserId.value = null
      error.value = 'This session lacks fleet_admin — cannot manage fleet users.'
      return
    }
    const [data, me] = await Promise.all([listFleetUsers(), getFleetMe().catch(() => null)])
    users.value = data.users || []
    const uid = me?.user?.id
    selfUserId.value = uid != null && Number.isFinite(Number(uid)) ? Number(uid) : null
    if (Array.isArray(data.ability_vocab) && data.ability_vocab.length) {
      abilityVocab.value = data.ability_vocab
    }
  } catch (e) {
    users.value = []
    selfUserId.value = null
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
  closeRowMenu()
  showCreate.value = false
  editingId.value = row.id
  editForm.value = {
    name: row.name || '',
    password: '',
    abilities: [...(row.abilities || [])],
    notify_failures: !!row.notify_failures
  }
  actionMsg.value = ''
  error.value = ''
}

function cancelEdit() {
  editingId.value = null
  closeRowMenu()
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
      abilities: [...createForm.value.abilities],
      notify_failures: !!createForm.value.notify_failures
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
      abilities: [FLEET_ABILITY.READ],
      notify_failures: false
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
      abilities: [...editForm.value.abilities],
      notify_failures: !!editForm.value.notify_failures
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

async function doClear2fa(row) {
  if (!canAdmin.value) return
  const ok = window.confirm(
    `Clear 2FA for ${row.email}? This revokes their sessions so they can sign in with password only and re-enroll.`
  )
  if (!ok) return
  busyId.value = String(row.id)
  error.value = ''
  actionMsg.value = ''
  try {
    const result = await clearFleetUserTwoFactor(row.id)
    actionMsg.value = `Cleared 2FA for ${row.email} (revoked ${result.revoked ?? 0} session(s))`
    await load()
  } catch (e) {
    error.value = e?.message || 'Clear 2FA failed'
  } finally {
    busyId.value = ''
  }
}

onMounted(() => {
  load()
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
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
      <label class="check">
        <input v-model="createForm.notify_failures" type="checkbox" />
        Email on instance down
      </label>
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
          <th>Notify</th>
          <th>2FA</th>
          <th>Sessions</th>
          <th>Status</th>
          <th v-if="canAdmin">Actions</th>
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
            <td>{{ row.notify_failures ? 'yes' : '—' }}</td>
            <td>{{ row.two_factor_enabled ? 'on' : '—' }}</td>
            <td>{{ row.session_count }}</td>
            <td>
              <span v-if="row.disabled_at" class="badge badge--muted">disabled</span>
              <span v-else class="badge">active</span>
            </td>
            <td v-if="canAdmin" class="actions actions-cell">
              <template v-if="editingId !== row.id">
                <div class="row-menu">
                  <button
                    type="button"
                    class="row-menu-trigger"
                    :aria-expanded="openMenuId === row.id"
                    :disabled="!!busyId"
                    @click.stop="toggleMenu(row.id)"
                  >
                    Actions ▾
                  </button>
                  <div v-if="openMenuId === row.id" class="row-menu-panel" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      class="row-menu-item"
                      :disabled="!!busyId"
                      @click="startEdit(row)"
                    >
                      Edit
                    </button>
                    <button
                      v-if="!row.disabled_at"
                      type="button"
                      role="menuitem"
                      class="row-menu-item"
                      :disabled="!!busyId"
                      @click="closeRowMenu(); doRevoke(row)"
                    >
                      Revoke sessions
                    </button>
                    <button
                      v-if="row.two_factor_enabled"
                      type="button"
                      role="menuitem"
                      class="row-menu-item row-menu-item--danger"
                      :disabled="!!busyId"
                      @click="closeRowMenu(); doClear2fa(row)"
                    >
                      Clear 2FA
                    </button>
                    <button
                      v-if="!row.disabled_at && !isSelf(row)"
                      type="button"
                      role="menuitem"
                      class="row-menu-item row-menu-item--danger"
                      :disabled="!!busyId"
                      @click="closeRowMenu(); doDisable(row)"
                    >
                      Disable
                    </button>
                    <button
                      v-if="row.disabled_at"
                      type="button"
                      role="menuitem"
                      class="row-menu-item"
                      :disabled="!!busyId"
                      @click="closeRowMenu(); doEnable(row)"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              </template>
              <button
                v-else
                type="button"
                class="linkish"
                :disabled="!!busyId"
                @click="cancelEdit"
              >
                Cancel
              </button>
            </td>
          </tr>
          <tr v-if="editingId === row.id" class="edit-row">
            <td colspan="8">
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
                <label class="check">
                  <input v-model="editForm.notify_failures" type="checkbox" />
                  Email on instance down
                </label>
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
  padding-bottom: 6rem;
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
  border: 1px solid var(--pbx-accent, #2563eb);
  background: var(--pbx-accent, #2563eb);
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
  white-space: nowrap;
  width: 1%;
}
.actions-cell {
  position: relative;
}
.row-menu {
  position: relative;
  display: inline-block;
}
.row-menu-trigger {
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.3rem;
  background: var(--pbx-surface, #fff);
  padding: 0.2rem 0.5rem;
  font: inherit;
  font-size: 0.8rem;
  color: var(--pbx-text, inherit);
  cursor: pointer;
}
.row-menu-trigger:disabled {
  opacity: 0.5;
  cursor: default;
}
.row-menu-panel {
  position: absolute;
  z-index: 20;
  top: auto;
  bottom: calc(100% + 0.25rem);
  right: 0;
  min-width: 9.5rem;
  padding: 0.25rem 0;
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.35rem;
  background: var(--pbx-surface, #fff);
  box-shadow: 0 4px 14px rgb(15 23 42 / 0.1);
}
.row-menu-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 0.35rem 0.75rem;
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
}
.row-menu-item:hover:not(:disabled) {
  background: var(--pbx-surface-subtle, #f8fafc);
}
.row-menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}
.row-menu-item--danger {
  color: var(--pbx-danger, #b91c1c);
}
.linkish {
  background: none;
  border: none;
  padding: 0;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  text-decoration: underline;
}
.linkish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.edit-row td {
  background: var(--pbx-surface-subtle, #f8fafc);
}
</style>
