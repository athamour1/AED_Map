<template>
  <q-layout view="hHh Lpr lFf" class="app-shell" :style="{ '--q-drawer-width': `${drawerWidth}px` }">
    <q-header class="bg-primary text-white" :class="{ 'is-scrolled': scrolled }">
      <q-toolbar>
        <q-btn flat dense round icon="menu" class="q-mr-sm lt-md" @click="drawerOpen = !drawerOpen" />
        <q-icon name="favorite" size="28px" class="q-mr-sm" />
        <q-toolbar-title class="text-weight-bold">AED Map Admin</q-toolbar-title>

        <q-btn flat dense round :icon="themeIcon" aria-label="Theme" class="q-mr-xs">
          <q-tooltip>Theme</q-tooltip>
          <q-menu anchor="bottom right" self="top right">
            <q-list dense style="min-width: 160px">
              <q-item
                v-for="opt in themeOptions"
                :key="opt.value"
                clickable
                v-close-popup
                :active="themeMode === opt.value"
                @click="setThemeMode(opt.value)"
              >
                <q-item-section avatar><q-icon :name="opt.icon" /></q-item-section>
                <q-item-section>{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <div class="row items-center q-gutter-sm" v-if="auth.user">
          <q-chip dense color="white" text-color="primary" class="text-weight-bold gt-xs">
            {{ auth.user.role }}
          </q-chip>
          <span class="text-body2 gt-xs">{{ auth.user.displayName }}</span>
          <q-btn
            flat
            dense
            icon="logout"
            :label="$q.screen.gt.xs ? 'Log out' : undefined"
            aria-label="Log out"
            @click="handleLogout"
          />
        </div>
      </q-toolbar>
    </q-header>

    <!-- Declared 12px wider than it paints on desktop: the spare 12px is the
         gap on its left in the floating-panel layout (see app.scss). -->
    <q-drawer v-model="drawerOpen" show-if-above bordered :width="drawerWidth">
      <q-list class="q-py-sm">
        <q-item
          clickable
          :to="{ name: 'locations' }"
          active-class="nav-active"
          exact
        >
          <q-item-section avatar><q-icon name="place" /></q-item-section>
          <q-item-section>Locations</q-item-section>
        </q-item>
        <q-item
          v-if="auth.isAdmin"
          clickable
          :to="{ name: 'users' }"
          active-class="nav-active"
        >
          <q-item-section avatar><q-icon name="group" /></q-item-section>
          <q-item-section>Users</q-item-section>
        </q-item>
      </q-list>

      <!-- On phones the header hides the signed-in identity; show it here. -->
      <div v-if="auth.user" class="absolute-bottom q-pa-md lt-sm drawer-user">
        <div class="text-weight-medium">{{ auth.user.displayName }}</div>
        <div class="text-caption text-grey-7">{{ auth.user.role }}</div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition name="aed-page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'
import { useTheme } from 'src/composables/useTheme'

const $q = useQuasar()
const auth = useAuthStore()
const router = useRouter()
const drawerOpen = ref(false)
// Also exposed as --q-drawer-width: app.scss paints the floating drawer 12px
// narrower than this and needs the declared width to do so.
const drawerWidth = computed(() => ($q.screen.lt.md ? 240 : 252))

const { mode: themeMode, setMode: setThemeMode } = useTheme()
const themeOptions = [
  { value: 'auto', label: 'System', icon: 'brightness_auto' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
]
const themeIcon = computed(() => themeOptions.find((o) => o.value === themeMode.value).icon)

// The bar deepens its shadow once content sits under it. What scrolls is the
// page card on desktop and the page container on phones (app.scss), so listen
// in the capture phase and read whichever element scrolled.
const scrolled = ref(false)
function onScroll(e) {
  const el = e.target
  if (el instanceof Element && el.closest('.q-page-container')) {
    scrolled.value = el.scrollTop > 4
  }
}
onMounted(() => document.addEventListener('scroll', onScroll, { capture: true, passive: true }))
onBeforeUnmount(() => document.removeEventListener('scroll', onScroll, { capture: true }))

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.drawer-user {
  border-top: 1px solid var(--border-soft);
}
</style>
