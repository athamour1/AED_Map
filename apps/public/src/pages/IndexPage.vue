<template>
  <q-page>
    <div id="map" class="absolute-full"></div>

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
            <div class="col">{{ selectedAed.locationDetails }}</div>
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
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import aedLocations from 'assets/aed-locations.json';

const map = ref(null);
const isDialogOpen = ref(false);
const selectedAed = ref(null);

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const currentDayIndex = new Date().getDay();

const formatSchedule = (daySchedule) => {
  if (!daySchedule || daySchedule.length === 0) return 'Closed';
  return daySchedule.map(slot => `${slot.open} - ${slot.close}`).join(', ');
};

onMounted(() => {
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

  // Function to evaluate if an AED is currently available based on its complex schedule
  const evaluateAvailability = (aed) => {
    // If it's explicitly deactivated (e.g., broken, maintenance)
    if (!aed.isAvailable) return false;
    
    // If it's a 24/7 location
    if (aed.is24h) return true;

    // If not 24/7 and no schedule provided, assume unavailable
    if (!aed.schedule) return false;

    const now = new Date();
    const currentDay = String(now.getDay()); // "0" (Sun) to "6" (Sat)
    const todaySchedule = aed.schedule[currentDay];

    // Check if it operates today at all
    if (!todaySchedule || todaySchedule.length === 0) return false;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeValue = currentHour * 60 + currentMinute;

    // Check if current time falls within ANY of today's time blocks
    return todaySchedule.some(slot => {
      const [openH, openM] = slot.open.split(':').map(Number);
      const openValue = openH * 60 + openM;
      
      const [closeH, closeM] = slot.close.split(':').map(Number);
      const closeValue = closeH * 60 + closeM;

      return timeValue >= openValue && timeValue <= closeValue;
    });
  };

  // Custom SVG icon generator for AED (Green if available, Red if unavailable)
  const getAedIcon = (isAvailableNow) => {
    const bgColor = isAvailableNow ? '#00A550' : '#E53935';
    return L.divIcon({
      html: `
        <div style="
          background-color: ${bgColor}; 
          width: 40px; 
          height: 40px; 
          border-radius: 50% 50% 50% 0; 
          transform: rotate(-45deg); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border: 2px solid white; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; margin-top: -2px; margin-left: -2px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
              <path fill="white" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              <path fill="${bgColor}" d="M11.5 17.5l4-7h-3V4.5L8 11.5h3v6z"/>
            </svg>
          </div>
        </div>
      `,
      className: 'custom-aed-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
  };

  // Store all markers in an array to compute bounds
  const markerObjects = [];

  aedLocations.forEach(aed => {
    // Compute current availability
    const isAvailableNow = evaluateAvailability(aed);
    aed.isAvailableNow = isAvailableNow; // Store dynamic property for the dialog

    const marker = L.marker([aed.lat, aed.lng], { icon: getAedIcon(isAvailableNow) }).addTo(map.value);
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
