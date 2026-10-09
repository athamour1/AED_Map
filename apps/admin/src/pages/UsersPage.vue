<template>
  <q-page class="bg-grey-1 q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">Users</div>
        <div class="text-caption text-grey-7">
          Access is invite-only — new members activate through a link you send them.
        </div>
      </div>
      <q-space />
      <q-btn color="primary" icon="person_add" label="Invite user" no-caps unelevated @click="inviteDialogOpen = true" />
    </div>

    <!-- Loading: skeleton rows mirroring the roster, no reflow on arrival -->
    <q-card v-if="loading" flat bordered class="overflow-hidden">
      <div v-for="n in 3" :key="n">
        <q-separator v-if="n > 1" />
        <div class="row items-center q-pa-md">
          <q-skeleton type="QAvatar" size="40px" class="q-mr-md" />
          <div class="col">
            <q-skeleton type="text" width="35%" />
            <q-skeleton type="text" width="55%" />
          </div>
          <q-skeleton type="QBtn" width="140px" />
        </div>
      </div>
    </q-card>

    <q-banner v-else-if="loadError" dense class="bg-red-1 text-negative rounded-borders">
      Could not load users.
      <template #action>
        <q-btn flat dense no-caps color="negative" label="Retry" @click="fetchUsers" />
      </template>
    </q-banner>

    <!-- Empty state: explain the model, offer the action -->
    <q-card v-else-if="users.length === 0" flat bordered>
      <q-card-section class="column flex-center text-center q-pa-xl text-grey-7">
        <q-icon name="group_off" size="56px" class="q-mb-md" />
        <div class="text-subtitle1 q-mb-xs">No users yet</div>
        <div class="text-body2 q-mb-md">Invite the first team member — they'll set their own password.</div>
        <q-btn color="primary" icon="person_add" label="Invite user" no-caps unelevated @click="inviteDialogOpen = true" />
      </q-card-section>
    </q-card>

    <template v-else>
      <!-- Active members -->
      <div class="text-overline text-grey-6 q-mb-xs">Members · {{ activeUsers.length }}</div>
      <q-card flat bordered class="overflow-hidden" :class="pendingUsers.length > 0 ? 'q-mb-lg' : ''">
        <div v-if="activeUsers.length === 0" class="text-caption text-grey-6 q-pa-md">
          No active members yet.
        </div>
        <div v-for="(user, index) in activeUsers" :key="user.id">
          <q-separator v-if="index > 0" />
          <div class="row items-center q-pa-md q-gutter-y-sm">
            <q-avatar
              size="40px"
              :color="user.role === 'ADMIN' ? 'primary' : 'secondary'"
              text-color="white"
              class="text-weight-bold q-mr-md"
            >
              {{ initials(user.displayName) }}
            </q-avatar>
            <div class="col" style="min-width: 180px">
              <div class="text-body1 text-weight-medium ellipsis">{{ user.displayName }}</div>
              <div class="text-caption text-grey-7 ellipsis">{{ user.email }}</div>
              <div class="text-caption text-grey-6">
                <template v-if="user.lastLoginAt">
                  Last login {{ new Date(user.lastLoginAt).toLocaleDateString() }}
                </template>
                <template v-else>Never signed in</template>
              </div>
            </div>
            <div class="col-auto row items-center q-gutter-md">
              <q-btn-toggle
                :model-value="user.role"
                :options="[
                  { label: 'Admin', value: 'ADMIN' },
                  { label: 'Editor', value: 'EDITOR' },
                ]"
                no-caps
                dense
                unelevated
                padding="4px 12px"
                toggle-color="primary"
                color="grey-3"
                text-color="grey-8"
                @update:model-value="(role) => updateUser(user, { role })"
              />
              <q-toggle
                :model-value="user.isActive"
                color="positive"
                label="Active"
                :aria-label="user.isActive ? 'Deactivate user' : 'Activate user'"
                @update:model-value="(isActive) => updateUser(user, { isActive })"
              />
            </div>
          </div>
        </div>
      </q-card>

      <!-- Pending invites -->
      <template v-if="pendingUsers.length > 0">
        <div class="text-overline text-grey-6 q-mb-xs">Pending invites · {{ pendingUsers.length }}</div>
        <q-card flat bordered class="overflow-hidden">
          <div v-for="(user, index) in pendingUsers" :key="user.id">
            <q-separator v-if="index > 0" />
            <div class="row items-center q-pa-md q-gutter-y-sm">
              <q-avatar size="40px" color="grey-4" text-color="grey-8" class="text-weight-bold q-mr-md">
                {{ initials(user.displayName) }}
              </q-avatar>
              <div class="col" style="min-width: 180px">
                <div class="row items-center q-gutter-sm">
                  <span class="text-body1 text-weight-medium ellipsis">{{ user.displayName }}</span>
                  <q-badge color="orange-8">Pending</q-badge>
                </div>
                <div class="text-caption text-grey-7 ellipsis">{{ user.email }}</div>
                <div class="text-caption text-grey-6">Never signed in</div>
              </div>
              <div class="col-auto row items-center q-gutter-md">
                <q-btn-toggle
                  :model-value="user.role"
                  :options="[
                    { label: 'Admin', value: 'ADMIN' },
                    { label: 'Editor', value: 'EDITOR' },
                  ]"
                  no-caps
                  dense
                  unelevated
                  padding="4px 12px"
                  toggle-color="primary"
                  color="grey-3"
                  text-color="grey-8"
                  @update:model-value="(role) => updateUser(user, { role })"
                />
                <q-toggle
                  :model-value="user.isActive"
                  color="positive"
                  label="Active"
                  :aria-label="user.isActive ? 'Deactivate user' : 'Activate user'"
                  @update:model-value="(isActive) => updateUser(user, { isActive })"
                />
              </div>
            </div>
          </div>
        </q-card>
      </template>
    </template>

    <q-dialog v-model="inviteDialogOpen" @hide="resetInviteForm">
      <q-card style="width: 100%; max-width: 420px">
        <template v-if="!inviteLink">
          <q-card-section class="q-pb-none">
            <div class="text-h6">Invite a user</div>
            <div class="text-caption text-grey-7 q-mt-xs">
              They'll receive a one-time link to set their password.
            </div>
          </q-card-section>
          <q-card-section>
            <q-form class="q-gutter-sm" @submit.prevent="handleInvite">
              <q-input v-model="inviteForm.displayName" label="Name *" outlined dense
                :rules="[(val) => !!val || 'Required']" />
              <q-input v-model="inviteForm.email" type="email" label="Email *" outlined dense
                :rules="[(val) => !!val || 'Required']" />
              <q-select v-model="inviteForm.role" :options="['EDITOR', 'ADMIN']" label="Role" outlined dense />

              <q-banner v-if="inviteError" dense class="bg-red-1 text-negative rounded-borders">
                {{ inviteError }}
              </q-banner>

              <q-card-actions align="right" class="q-px-none">
                <q-btn flat no-caps label="Cancel" class="text-grey-8" v-close-popup />
                <q-btn type="submit" color="primary" no-caps label="Send invite" :loading="inviting" unelevated />
              </q-card-actions>
            </q-form>
          </q-card-section>
        </template>

        <template v-else>
          <q-card-section class="column flex-center text-center q-pb-none">
            <q-icon name="check_circle" color="positive" size="40px" class="q-mb-sm" />
            <div class="text-h6">Invite created</div>
          </q-card-section>
          <q-card-section>
            <div class="text-body2 q-mb-sm">
              Copy this link and send it to <strong>{{ inviteForm.email }}</strong> yourself — it's only shown
              once and expires in 72 hours.
            </div>
            <q-input :model-value="inviteLink" readonly outlined dense>
              <template #append>
                <q-btn flat dense round icon="content_copy" aria-label="Copy invite link" @click="copyInviteLink" />
              </template>
            </q-input>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps label="Done" color="primary" v-close-popup />
          </q-card-actions>
        </template>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const users = ref([])
const loading = ref(true)
const loadError = ref(false)

const activeUsers = computed(() => users.value.filter((user) => user.isActive))
const pendingUsers = computed(() => users.value.filter((user) => !user.isActive))

function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '?'
  )
}

async function fetchUsers() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function updateUser(user, patch) {
  try {
    const { data } = await api.patch(`/users/${user.id}`, patch)
    users.value = users.value.map((u) => (u.id === data.id ? data : u))
  } catch {
    $q.notify({ type: 'negative', message: 'Could not update user.' })
  }
}

const inviteDialogOpen = ref(false)
const inviteForm = ref({ displayName: '', email: '', role: 'EDITOR' })
const inviteError = ref('')
const inviting = ref(false)
const inviteLink = ref('')

async function handleInvite() {
  inviteError.value = ''
  inviting.value = true
  try {
    const { data } = await api.post('/users/invite', inviteForm.value)
    inviteLink.value = `${window.location.origin}/admin/accept-invite?token=${data.inviteToken}`
    await fetchUsers()
  } catch (error) {
    inviteError.value =
      error.response?.status === 409
        ? 'A user with this email already exists.'
        : 'Could not create the invite.'
  } finally {
    inviting.value = false
  }
}

function resetInviteForm() {
  inviteForm.value = { displayName: '', email: '', role: 'EDITOR' }
  inviteError.value = ''
  inviteLink.value = ''
}

async function copyInviteLink() {
  await navigator.clipboard.writeText(inviteLink.value)
  $q.notify({ type: 'positive', message: 'Copied to clipboard.', timeout: 1500 })
}

onMounted(fetchUsers)
</script>
