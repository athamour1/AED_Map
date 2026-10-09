<template>
  <q-page>
    <div id="map" class="absolute-full" style="z-index: 0"></div>

    <q-inner-loading :showing="loading" color="primary" label="Finding AEDs…" />

    <!-- Status capsule: one floating pill owns all fleet-level messaging -->
    <q-page-sticky v-if="!loading" position="top" :offset="[0, 12]">
      <div
        v-if="error"
        class="row items-center no-wrap bg-white shadow-3 q-py-xs q-pl-md q-pr-xs"
        style="border-radius: 24px; max-width: calc(100vw - 24px)"
      >
        <q-icon name="cloud_off" color="negative" size="18px" class="q-mr-sm" />
        <span class="text-body2 text-grey-9">Couldn't load AED locations</span>
        <q-btn
          flat
          dense
          no-caps
          rounded
          color="primary"
          label="Retry"
          class="q-ml-sm text-weight-bold"
          @click="loadLocations"
        />
      </div>

      <div
        v-else-if="aedLocations.length === 0"
        class="row items-center no-wrap bg-white shadow-3 q-py-sm q-px-md"
        style="border-radius: 24px; max-width: calc(100vw - 24px)"
      >
        <q-icon name="location_off" color="grey-7" size="18px" class="q-mr-sm" />
        <span class="text-body2 text-grey-9">No AED locations available right now</span>
      </div>

      <div v-else class="row items-center no-wrap bg-white shadow-3 q-py-sm q-px-md" style="border-radius: 24px">
        <q-icon name="circle" color="positive" size="10px" class="q-mr-sm" />
        <span class="text-body2 text-weight-medium text-grey-9">
          {{ readyCount }} of {{ aedLocations.length }} AEDs ready now
        </span>
      </div>
    </q-page-sticky>

    <!-- Map controls: one vertical cluster, thumb-reachable, oversized targets -->
    <q-page-sticky position="bottom-right" :offset="[16, 28]">
      <!-- QPageSticky's offset is margin-based, so safe-area margins live here -->
      <div
        class="column items-center q-gutter-sm"
        style="margin-right: env(safe-area-inset-right); margin-bottom: env(safe-area-inset-bottom)"
      >
        <q-btn
          round
          unelevated
          color="white"
          text-color="grey-9"
          icon="add"
          class="shadow-3"
          aria-label="Zoom in"
          @click="zoomIn"
        />
        <q-btn
          round
          unelevated
          color="white"
          text-color="grey-9"
          icon="remove"
          class="shadow-3"
          aria-label="Zoom out"
          @click="zoomOut"
        />
        <q-btn
          round
          unelevated
          color="primary"
          icon="my_location"
          size="lg"
          class="shadow-4 q-mt-md"
          :loading="locating"
          aria-label="Show my location"
          @click="locateMe"
        />
      </div>
    </q-page-sticky>

    <!-- Emergency cluster: call for help, keep CPR tempo. Lives in the free
         thumb corner, mirroring the navigation cluster on the right. -->
    <q-page-sticky position="bottom-left" :offset="[16, 28]">
      <div
        class="column items-start q-gutter-sm"
        style="margin-left: env(safe-area-inset-left); margin-bottom: env(safe-area-inset-bottom)"
      >
        <q-btn
          rounded
          unelevated
          color="white"
          :text-color="metronomeRunning ? 'negative' : 'grey-9'"
          class="shadow-3"
          :aria-label="metronomeRunning ? 'Stop CPR tempo metronome' : 'Start CPR tempo metronome'"
          @click="toggleMetronome"
        >
          <q-icon
            name="monitor_heart"
            size="20px"
            class="q-mr-sm"
            :style="{ transform: metronomePulse ? 'scale(1.35)' : 'scale(1)', transition: 'transform 90ms ease-out' }"
          />
          <span class="text-weight-bold">{{ metronomeRunning ? '110 / min' : 'CPR tempo' }}</span>
        </q-btn>
        <q-btn
          rounded
          unelevated
          size="lg"
          color="negative"
          icon="call"
          label="112"
          class="shadow-4 text-weight-bold"
          aria-label="Call 112 emergency services"
          href="tel:112"
        />
      </div>
    </q-page-sticky>

    <!-- Rescue sheet: status leads, hours are demoted, one giant action -->
    <q-dialog v-model="isDialogOpen" position="bottom">
      <q-card
        v-if="selectedAed"
        style="width: 100vw; max-width: 480px; border-radius: 24px 24px 0 0; padding-bottom: max(env(safe-area-inset-bottom), 8px)"
      >
        <q-card-section class="row items-center no-wrap q-pb-none">
          <q-avatar
            :color="selectedAed.isAvailableNow ? 'positive' : 'negative'"
            text-color="white"
            :icon="selectedAed.isAvailableNow ? 'bolt' : 'block'"
            size="44px"
            class="q-mr-md"
          />
          <div class="col" style="min-width: 0">
            <div
              class="text-overline"
              :class="selectedAed.isAvailableNow ? 'text-positive' : 'text-negative'"
              style="line-height: 1.4"
            >
              {{ selectedAed.isAvailableNow ? 'Ready to use' : 'Not available now' }}
            </div>
            <div class="text-h6 text-weight-bold" style="line-height: 1.25">{{ selectedAed.name }}</div>
          </div>
          <q-btn icon="close" flat round dense class="q-ml-sm text-grey-7 self-start" aria-label="Close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm q-pb-none">
          <div class="row no-wrap items-start text-body2 text-grey-8">
            <q-icon name="place" size="18px" color="grey-6" class="q-mr-sm q-mt-xs" />
            <div class="col">{{ selectedAed.addressText }}</div>
          </div>
        </q-card-section>

        <q-card-section class="q-py-sm">
          <div v-if="selectedAed.is24h" class="row items-center bg-grey-2 rounded-borders q-pa-sm">
            <q-icon name="schedule" size="18px" color="grey-7" class="q-mr-sm" />
            <span class="text-body2 text-weight-medium">Open 24 hours, every day</span>
          </div>

          <q-expansion-item
            v-else-if="selectedAed.schedule"
            dense
            icon="schedule"
            :label="`Today: ${todayHours}`"
            caption="Full weekly hours"
            header-class="text-body2 text-weight-medium"
            class="bg-grey-2 rounded-borders"
          >
            <div class="q-px-md q-pb-sm">
              <div
                v-for="(dayName, index) in dayNames"
                :key="index"
                class="row justify-between text-body2 q-py-xs"
                :class="index === currentDayIndex ? 'text-primary text-weight-bold' : 'text-grey-8'"
              >
                <span>{{ dayName }}</span>
                <span>{{ formatSchedule(selectedAed.schedule[index]) }}</span>
              </div>
            </div>
          </q-expansion-item>

          <div v-else class="row items-center bg-grey-2 rounded-borders q-pa-sm">
            <q-icon name="schedule" size="18px" color="grey-7" class="q-mr-sm" />
            <span class="text-body2 text-grey-7">No schedule information</span>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-xs">
          <q-btn
            color="primary"
            unelevated
            size="lg"
            no-caps
            class="full-width text-weight-bold"
            label="Get directions"
            icon="directions"
            @click="openNavigation"
          />
          <!-- The sheet's backdrop hides the map's emergency cluster, so
               calling for help stays one tap away here too. -->
          <q-btn
            outline
            color="negative"
            class="full-width q-mt-sm text-weight-bold"
            label="Call 112"
            icon="call"
            href="tel:112"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useQuasar } from 'quasar';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { evaluateAvailability, formatSchedule, getAedIcon } from 'aed-map-shared';

const $q = useQuasar();

const map = ref(null);
const loading = ref(true);
const error = ref(false);
const locating = ref(false);
const isDialogOpen = ref(false);
const selectedAed = ref(null);
const aedLocations = ref([]);

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const currentDayIndex = new Date().getDay();

const readyCount = computed(() => aedLocations.value.filter((aed) => aed.isAvailableNow).length);

const todayHours = computed(() => {
  if (!selectedAed.value?.schedule) return '';
  return formatSchedule(selectedAed.value.schedule[currentDayIndex]);
});

// --- CPR metronome ---------------------------------------------------------
// 110 bpm sits mid-guideline (100–120 compressions/min). Beats are scheduled
// on the Web Audio clock with a small lookahead so the tick holds tempo even
// when the JS main thread stutters; the interval only tops up the queue.
const CPR_BPM = 110;
const metronomeRunning = ref(false);
const metronomePulse = ref(false);

let audioCtx = null;
let metronomeTimer = null;
let nextBeatTime = 0;

function scheduleTick(time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.4, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

function metronomeLoop() {
  while (nextBeatTime < audioCtx.currentTime + 0.12) {
    scheduleTick(nextBeatTime);
    const delayMs = Math.max(0, (nextBeatTime - audioCtx.currentTime) * 1000);
    setTimeout(() => {
      metronomePulse.value = true;
      setTimeout(() => { metronomePulse.value = false; }, 140);
    }, delayMs);
    nextBeatTime += 60 / CPR_BPM;
  }
}

async function toggleMetronome() {
  if (metronomeRunning.value) {
    stopMetronome();
    return;
  }
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      $q.notify({ type: 'negative', message: 'Audio is not supported on this device.', position: 'top' });
      return;
    }
    audioCtx = new AudioCtx();
  }
  await audioCtx.resume();
  metronomeRunning.value = true;
  nextBeatTime = audioCtx.currentTime + 0.05;
  metronomeLoop();
  metronomeTimer = setInterval(metronomeLoop, 30);
}

function stopMetronome() {
  metronomeRunning.value = false;
  if (metronomeTimer) {
    clearInterval(metronomeTimer);
    metronomeTimer = null;
  }
}

onBeforeUnmount(() => {
  stopMetronome();
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
});

// Markers currently on the map, so a retry can clear them before re-rendering.
let markerObjects = [];
let userDot = null;
let userAccuracyCircle = null;

async function loadLocations() {
  loading.value = true;
  error.value = false;
  try {
    const response = await fetch('/api/locations');
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    aedLocations.value = await response.json();
    renderMarkers();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function renderMarkers() {
  markerObjects.forEach((marker) => marker.remove());
  markerObjects = [];

  aedLocations.value.forEach(aed => {
    // Compute current availability
    const isAvailableNow = evaluateAvailability(aed);
    aed.isAvailableNow = isAvailableNow; // Store dynamic property for the dialog

    const marker = L.marker([aed.lat, aed.lng], { icon: getAedIcon(L, isAvailableNow) }).addTo(map.value);
    markerObjects.push(marker);

    // Disable default popup and use our q-dialog
    marker.on('click', () => {
      selectedAed.value = aed;
      isDialogOpen.value = true;
      // Pan to marker nicely
      map.value.flyTo([aed.lat, aed.lng], 16, { duration: 0.5 });
    });
  });

  // Automatically zoom the map to fit all markers
  if (markerObjects.length > 0) {
    const group = new L.featureGroup(markerObjects);
    map.value.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}

function zoomIn() {
  map.value?.zoomIn();
}

function zoomOut() {
  map.value?.zoomOut();
}

function locateMe() {
  if (!('geolocation' in navigator)) {
    $q.notify({ type: 'negative', message: 'Location is not supported on this device.', position: 'top' });
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false;
      const latlng = [position.coords.latitude, position.coords.longitude];

      if (userDot) userDot.setLatLng(latlng);
      else {
        userDot = L.circleMarker(latlng, {
          radius: 8, color: 'white', weight: 3, fillColor: '#1976d2', fillOpacity: 1,
        }).addTo(map.value);
      }

      const accuracy = position.coords.accuracy ?? 0;
      if (userAccuracyCircle) {
        userAccuracyCircle.setLatLng(latlng);
        userAccuracyCircle.setRadius(accuracy);
      } else {
        userAccuracyCircle = L.circle(latlng, {
          radius: accuracy, color: '#1976d2', weight: 1, fillColor: '#1976d2', fillOpacity: 0.15,
        }).addTo(map.value);
      }

      map.value.flyTo(latlng, 16, { duration: 0.8 });
    },
    () => {
      locating.value = false;
      $q.notify({
        type: 'negative',
        message: 'Could not get your location. Check that location access is allowed.',
        position: 'top',
      });
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  );
}

onMounted(async () => {
  // Center over Megara, Greece until markers (or the user) say otherwise.
  // Leaflet's own zoom control is disabled — the floating cluster handles it.
  map.value = L.map('map', {
    zoomControl: false
  }).setView([37.9954210792772, 23.345278116198493], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map.value);

  await loadLocations();
});

const openNavigation = () => {
  if (selectedAed.value) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedAed.value.lat},${selectedAed.value.lng}`;
    window.open(url, '_blank');
  }
};
</script>
