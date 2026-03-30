<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="row items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" class="q-mr-sm" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
            <path fill="white" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            <path fill="#00A550" d="M11.5 17.5l4-7h-3V4.5L8 11.5h3v6z"/>
          </svg>
          <span class="text-weight-bold">AED Locator</span>
        </q-toolbar-title>

        <!-- Install PWA Button -->
        <q-btn
          v-if="deferredPrompt"
          flat
          dense
          icon="install_mobile"
          label="Install"
          class="q-px-sm text-weight-bold q-ml-sm"
          style="background-color: rgba(255,255,255,0.2);"
          @click="installPWA"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const deferredPrompt = ref(null);

const handleInstallPrompt = (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt.value = e;
};

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleInstallPrompt);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
});

async function installPWA() {
  if (!deferredPrompt.value) return;

  // Show the prompt
  deferredPrompt.value.prompt();

  // Wait for the user to respond
  const { outcome } = await deferredPrompt.value.userChoice;
  
  if (outcome === 'accepted') {
    deferredPrompt.value = null; // Hide the button once installed
  }
}
</script>
