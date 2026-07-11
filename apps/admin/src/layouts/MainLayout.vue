<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" class="q-mr-sm lt-md" @click="drawerOpen = !drawerOpen" />
        <q-icon name="favorite" size="28px" class="q-mr-sm" />
        <q-toolbar-title>AED Map Admin</q-toolbar-title>

        <div class="row items-center q-gutter-sm" v-if="auth.user">
          <q-chip dense square color="white" text-color="primary" class="text-weight-bold">
            {{ auth.user.role }}
          </q-chip>
          <span class="text-body2">{{ auth.user.displayName }}</span>
          <q-btn flat dense icon="logout" label="Log out" @click="handleLogout" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above bordered :width="220">
      <q-list>
        <q-item clickable :to="{ name: 'locations' }" active-class="text-primary bg-blue-grey-1" exact>
          <q-item-section avatar><q-icon name="place" /></q-item-section>
          <q-item-section>Locations</q-item-section>
        </q-item>
        <q-item
          v-if="auth.isAdmin"
          clickable
          :to="{ name: 'users' }"
          active-class="text-primary bg-blue-grey-1"
        >
          <q-item-section avatar><q-icon name="group" /></q-item-section>
          <q-item-section>Users</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const auth = useAuthStore()
const router = useRouter()
const drawerOpen = ref(false)

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
