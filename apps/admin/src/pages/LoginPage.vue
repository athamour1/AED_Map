<template>
  <q-page class="flex flex-center bg-blue-grey-1 q-pa-md">
    <q-card class="dialog-card--sm q-pa-md">
      <q-card-section class="text-center">
        <q-icon name="favorite" color="primary" size="40px" />
        <div class="text-h6 q-mt-sm">AED Map Admin</div>
        <div class="text-caption text-grey-7">Sign in to manage locations and devices</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            autocomplete="email"
            outlined
            dense
            :rules="[(val) => !!val || 'Email is required']"
          />
          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            autocomplete="current-password"
            outlined
            dense
            :rules="[(val) => !!val || 'Password is required']"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-banner v-if="errorMessage" dense class="bg-red-1 text-negative rounded-borders">
            {{ errorMessage }}
          </q-banner>

          <q-btn
            type="submit"
            color="primary"
            label="Sign in"
            class="full-width"
            :loading="loading"
            unelevated
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push(route.query.redirect ?? { name: 'locations' })
  } catch {
    errorMessage.value = 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}
</script>
