<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Users</div>
      <q-space />
      <q-btn color="primary" icon="person_add" label="Invite user" unelevated @click="inviteDialogOpen = true" />
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <q-list v-else bordered separator class="rounded-borders">
      <q-item v-for="user in users" :key="user.id">
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ user.displayName }}</q-item-label>
          <q-item-label caption>{{ user.email }}</q-item-label>
        </q-item-section>

        <q-item-section side top>
          <q-item-label caption v-if="user.lastLoginAt">
            Last login {{ new Date(user.lastLoginAt).toLocaleDateString() }}
          </q-item-label>
          <q-item-label caption v-else>Never signed in</q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="row items-center q-gutter-sm">
            <q-select
              :model-value="user.role"
              :options="['ADMIN', 'EDITOR']"
              dense
              outlined
              style="width: 110px"
              @update:model-value="(role) => updateUser(user, { role })"
            />
            <q-toggle
              :model-value="user.isActive"
              color="positive"
              @update:model-value="(isActive) => updateUser(user, { isActive })"
            />
            <q-badge :color="user.isActive ? 'positive' : 'grey-6'">
              {{ user.isActive ? 'Active' : 'Pending' }}
            </q-badge>
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="inviteDialogOpen" @hide="resetInviteForm">
      <q-card style="min-width: 380px">
        <template v-if="!inviteLink">
          <q-card-section class="text-h6">Invite a user</q-card-section>
          <q-card-section class="q-pt-none">
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
                <q-btn flat label="Cancel" v-close-popup />
                <q-btn type="submit" color="primary" label="Send invite" :loading="inviting" unelevated />
              </q-card-actions>
            </q-form>
          </q-card-section>
        </template>

        <template v-else>
          <q-card-section class="text-h6">
            <q-icon name="check_circle" color="positive" class="q-mr-xs" />
            Invite created
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="text-body2 q-mb-sm">
              Copy this link and send it to <strong>{{ inviteForm.email }}</strong> yourself — it's only shown
              once and expires in 72 hours.
            </div>
            <q-input :model-value="inviteLink" readonly outlined dense>
              <template #append>
                <q-btn flat dense round icon="content_copy" @click="copyInviteLink" />
              </template>
            </q-input>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Done" color="primary" v-close-popup />
          </q-card-actions>
        </template>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()

const users = ref([])
const loading = ref(true)

async function fetchUsers() {
  loading.value = true
  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch {
    $q.notify({ type: 'negative', message: 'Could not load users.' })
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
