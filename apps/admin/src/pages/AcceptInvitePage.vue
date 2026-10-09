<template>
  <q-page class="flex flex-center bg-blue-grey-1 q-pa-md">
    <q-card class="dialog-card--sm q-pa-md">
      <template v-if="!token">
        <q-card-section class="text-center">
          <q-icon name="error_outline" color="negative" size="40px" />
          <div class="text-h6 q-mt-sm">Invalid invite link</div>
          <div class="text-caption text-grey-7">
            This link is missing its invite token. Ask an admin to send you a new one.
          </div>
        </q-card-section>
      </template>

      <template v-else-if="success">
        <q-card-section class="text-center">
          <q-icon name="check_circle" color="positive" size="40px" />
          <div class="text-h6 q-mt-sm">Account activated</div>
          <div class="text-caption text-grey-7 q-mb-md">You can now sign in with your new password.</div>
          <q-btn color="primary" label="Go to sign in" :to="{ name: 'login' }" unelevated />
        </q-card-section>
      </template>

      <template v-else>
        <q-card-section class="text-center">
          <div class="text-h6">Set your password</div>
          <div class="text-caption text-grey-7">Finish setting up your AED Map Admin account</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
            <q-input
              v-model="password"
              type="password"
              label="New password"
              autocomplete="new-password"
              outlined
              dense
              :rules="[(val) => (val && val.length >= 8) || 'At least 8 characters']"
            />
            <q-input
              v-model="confirmPassword"
              type="password"
              label="Confirm password"
              autocomplete="new-password"
              outlined
              dense
              :rules="[(val) => val === password || 'Passwords do not match']"
            />

            <q-banner v-if="errorMessage" dense class="bg-red-1 text-negative rounded-borders">
              {{ errorMessage }}
            </q-banner>

            <q-btn
              type="submit"
              color="primary"
              label="Activate account"
              class="full-width"
              :loading="loading"
              unelevated
            />
          </q-form>
        </q-card-section>
      </template>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from 'boot/axios'

const route = useRoute()
const token = route.query.token ?? ''

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const success = ref(false)

async function handleSubmit() {
  if (password.value !== confirmPassword.value) return
  errorMessage.value = ''
  loading.value = true
  try {
    await api.post('/auth/accept-invite', { token, password: password.value })
    success.value = true
  } catch {
    errorMessage.value = 'This invite link is invalid, expired, or already used.'
  } finally {
    loading.value = false
  }
}
</script>
