<template>
  <q-page>
    <div id="map" class="absolute-full"></div>

    <div v-if="loading" class="absolute-full flex flex-center bg-white" style="z-index: 2;">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Bottom Sheet Dialog -->
    <q-dialog v-model="isDialogOpen" position="bottom" full-width>
      <q-card class="q-pa-sm" style="border-radius: 20px 20px 0 0; border: none; padding-bottom: max(env(safe-area-inset-bottom), 12px);" v-if="selectedAed">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">{{ selectedAed.name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="q-mb-sm text-body1 row justify-start">
            <q-icon name="place" color="grey-7" size="sm" class="q-mr-xs" />
            <div class="col">{{ selectedAed.addressText }}</div>
          </div>
          
          <div class="q-mb-sm row items-center text-body1">
            <q-icon
              :name="selectedAed.isAvailableNow ? 'check_circle' : 'cancel'"
              :color="selectedAed.isAvailableNow ? 'positive' : 'negative'"
              size="sm"
              class="q-mr-xs"
            />
            <span :class="selectedAed.isAvailableNow ? 'text-positive' : 'text-negative'" class="text-weight-medium">
              {{ selectedAed.isAvailableNow ? 'Currently Available' : 'Currently Unavailable' }}
            </span>
          </div>

          <div class="q-mb-md">
            <div class="row items-center q-mb-sm text-body1">
              <q-icon name="schedule" color="grey-7" size="sm" class="q-mr-xs" />
              <span class="text-weight-medium">Operating Hours</span>
            </div>
            
            <div class="q-ml-lg bg-grey-2 q-pa-sm" style="border-radius: 8px;">
              <template v-if="selectedAed.is24h">
                <div class="text-body2 text-weight-medium">24 Hours / 7 Days a week</div>
              </template>
              <template v-else-if="selectedAed.schedule">
                <div 
                  v-for="(dayName, index) in dayNames" 
                  :key="index" 
                  class="row justify-between text-body2 q-py-xs" 
                  :class="{'text-weight-bolder text-primary': index === currentDayIndex, 'text-grey-8': index !== currentDayIndex}"
                >
                  <span>{{ dayName }}</span>
                  <span>{{ formatSchedule(selectedAed.schedule[index]) }}</span>
                </div>
              </template>
              <template v-else>
                <div class="text-body2 text-grey-7">No schedule available</div>
              </template>
            </div>
          </div>
          
          <q-btn
            color="primary"
            class="full-width q-py-sm text-weight-bold"
            size="md"
            label="Navigate"
            icon="directions"
            @click="openNavigation"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { evaluateAvailability, formatSchedule, getAedIcon } from 'aed-map-shared';

const $q = useQuasar();

const map = ref(null);
const loading = ref(true);
const isDialogOpen = ref(false);
const selectedAed = ref(null);

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const currentDayIndex = new Date().getDay();

onMounted(async () => {
  let aedLocations = [];
  try {
    const response = await fetch('/api/locations');
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    aedLocations = await response.json();
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Could not load AED locations. Check your connection and try again.',
      position: 'top',
      timeout: 0,
      actions: [{ label: 'Dismiss', color: 'white' }],
    });
  } finally {
    loading.value = false;
  }

  // Center over Athens, Greece
  map.value = L.map('map', {
    zoomControl: false // Disable default zoom control to move it
  }).setView([37.9954210792772, 23.345278116198493], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map.value);

  // Add zoom control to top right to not conflict with bottom sheet
  L.control.zoom({
    position: 'topright'
  }).addTo(map.value);

  // Store all markers in an array to compute bounds
  const markerObjects = [];

  aedLocations.forEach(aed => {
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
});

const openNavigation = () => {
  if (selectedAed.value) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedAed.value.lat},${selectedAed.value.lng}`;
    window.open(url, '_blank');
  }
};
</script>

<style>
/* Leaflet map needs a defined height or absolute positioning */
#map {
  z-index: 1; /* Keep leaflet under quasar layout/dialogs */
}

/* Fix leaflet pane z-index if needed so dialog stays on top */
.leaflet-pane {
  z-index: 1;
}
.leaflet-top,
.leaflet-bottom {
  z-index: 2;
}

</style>
