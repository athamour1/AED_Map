<template>
  <q-page class="bg-grey-1 q-pa-md" :style="$q.screen.lt.md ? { paddingBottom: '96px' } : {}">
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <template v-else>
      <q-form @submit.prevent="handleSave">
        <!-- Command bar: identity + primary actions always together -->
        <q-card flat bordered class="q-mb-md">
          <div class="row items-center no-wrap q-pa-sm">
            <q-btn flat dense round icon="arrow_back" aria-label="Back to locations" class="q-mr-sm" :to="{ name: 'locations' }" />
            <div class="col" style="min-width: 0">
              <div class="text-overline text-grey-6" style="line-height: 1.2">
                {{ isEditing ? 'Edit location' : 'New location' }}
              </div>
              <div class="text-subtitle1 text-weight-bold ellipsis" style="line-height: 1.3">
                {{ form.name || 'Untitled location' }}
              </div>
            </div>
            <q-btn
              v-if="isEditing"
              flat
              dense
              round
              icon="delete"
              color="negative"
              aria-label="Delete location"
              class="q-mr-sm"
              @click="confirmDeleteLocation"
            />
            <q-btn flat no-caps label="Cancel" class="gt-sm q-mr-sm text-grey-8" :to="{ name: 'locations' }" />
            <q-btn
              type="submit"
              color="primary"
              no-caps
              unelevated
              :label="$q.screen.gt.xs ? 'Save location' : 'Save'"
              :loading="saving"
            />
          </div>
        </q-card>

        <!-- The map is the workspace, controls float over it -->
        <q-card flat bordered class="q-mb-md overflow-hidden">
          <div class="relative-position">
            <div id="picker-map" style="height: clamp(280px, 42vh, 460px); z-index: 0"></div>
            <q-chip square dense icon="touch_app" class="absolute-top-right q-ma-sm bg-white text-grey-8 shadow-2">
              Tap the map or drag the pin
            </q-chip>
            <q-chip square dense icon="place" class="absolute-bottom-left q-ma-sm bg-white text-grey-8 shadow-2">
              {{ form.lat.toFixed(6) }}, {{ form.lng.toFixed(6) }}
            </q-chip>
            <q-btn
              color="white"
              text-color="primary"
              no-caps
              unelevated
              icon="my_location"
              :label="$q.screen.gt.xs ? 'Use my location' : undefined"
              aria-label="Use my location"
              class="absolute-bottom-right q-mr-sm shadow-3"
              style="margin-bottom: 28px"
              :loading="locating"
              @click="useMyLocation"
            />
          </div>
        </q-card>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-card flat bordered class="full-height">
              <q-card-section>
                <div class="text-overline text-grey-6 q-mb-sm">Identity</div>
                <q-input
                  v-model="form.name"
                  label="Name *"
                  outlined
                  dense
                  class="q-mb-sm"
                  :rules="[(val) => !!val || 'Required']"
                />
                <q-input
                  v-model="form.addressText"
                  label="Address *"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Required']"
                />

                <q-separator class="q-my-md" />

                <div class="text-overline text-grey-6 q-mb-xs">Status</div>
                <div class="row items-center justify-between no-wrap q-py-xs">
                  <div>
                    <div class="text-body2 text-weight-medium">In service</div>
                    <div class="text-caption text-grey-6">Shown as available on the public map</div>
                  </div>
                  <q-toggle v-model="form.isAvailable" color="positive" aria-label="In service" />
                </div>
                <div class="row items-center justify-between no-wrap q-py-xs">
                  <div>
                    <div class="text-body2 text-weight-medium">Open 24/7</div>
                    <div class="text-caption text-grey-6">Always reachable — no weekly schedule needed</div>
                  </div>
                  <q-toggle v-model="form.is24h" color="primary" aria-label="Open 24/7" />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-6">
            <q-card flat bordered class="full-height">
              <q-card-section>
                <div class="text-overline text-grey-6 q-mb-sm">Weekly hours</div>

                <div v-if="form.is24h" class="column flex-center text-center q-pa-lg text-grey-6">
                  <q-icon name="all_inclusive" size="32px" class="q-mb-sm" />
                  <div class="text-body2">Open around the clock — no schedule needed.</div>
                </div>

                <template v-else>
                  <div class="row q-gutter-xs q-mb-md">
                    <q-chip
                      v-for="(day, index) in dayNames"
                      :key="day"
                      clickable
                      dense
                      class="text-weight-medium"
                      :color="scheduleDays[index].enabled ? 'primary' : 'grey-3'"
                      :text-color="scheduleDays[index].enabled ? 'white' : 'grey-8'"
                      @click="scheduleDays[index].enabled = !scheduleDays[index].enabled"
                    >
                      {{ day.slice(0, 3) }}
                    </q-chip>
                  </div>

                  <div v-if="!scheduleDays.some((d) => d.enabled)" class="text-caption text-grey-6">
                    Select the days this AED is reachable, then set its hours.
                  </div>

                  <template v-for="(day, index) in dayNames" :key="index">
                    <div v-if="scheduleDays[index].enabled" class="row items-center q-col-gutter-sm q-mb-xs">
                      <div class="col-4 col-sm-3 text-body2 text-weight-medium">{{ day }}</div>
                      <div class="col">
                        <q-input v-model="scheduleDays[index].open" type="time" dense outlined stack-label label="Opens" />
                      </div>
                      <div class="col">
                        <q-input v-model="scheduleDays[index].close" type="time" dense outlined stack-label label="Closes" />
                      </div>
                    </div>
                  </template>
                </template>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- On phones the command bar scrolls away; keep Save reachable -->
        <q-page-sticky position="bottom" expand class="lt-md" style="z-index: 3">
          <div
            class="full-width bg-white shadow-up-2 row items-center justify-end q-gutter-sm q-pa-sm"
            style="padding-bottom: max(env(safe-area-inset-bottom), 8px)"
          >
            <q-btn flat no-caps label="Cancel" class="text-grey-8" :to="{ name: 'locations' }" />
            <q-btn type="submit" color="primary" no-caps unelevated label="Save location" :loading="saving" />
          </div>
        </q-page-sticky>
      </q-form>

      <div class="q-mt-md">
        <template v-if="isEditing">
          <div class="row items-center q-mb-sm">
            <div class="text-overline text-grey-6">Devices · {{ devices.length }}</div>
            <q-space />
            <q-btn color="primary" icon="add" label="Add device" no-caps dense unelevated @click="openAddDevice" />
          </div>

          <q-card v-if="devices.length === 0" flat bordered>
            <q-card-section class="column flex-center text-center q-pa-lg text-grey-6">
              <q-icon name="monitor_heart" size="36px" class="q-mb-sm" />
              <div class="text-body2 q-mb-md">No devices at this location yet.</div>
              <q-btn color="primary" no-caps unelevated icon="add" label="Add the first device" @click="openAddDevice" />
            </q-card-section>
          </q-card>

          <div v-else class="row q-col-gutter-md">
            <div v-for="device in devices" :key="device.id" class="col-12 col-sm-6 col-lg-4">
              <q-card flat bordered class="full-height">
                <q-card-section class="q-pb-sm">
                  <div class="row items-start no-wrap">
                    <div class="col" style="min-width: 0">
                      <div class="text-body1 text-weight-bold ellipsis">{{ device.serialNumber }}</div>
                      <div class="text-caption text-grey-6 ellipsis">
                        {{ [device.manufacturer, device.model].filter(Boolean).join(' ') || 'Make and model not set' }}
                      </div>
                    </div>
                    <q-btn flat dense round size="sm" icon="edit" aria-label="Edit device" @click="openEditDevice(device)" />
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      icon="delete"
                      color="negative"
                      aria-label="Delete device"
                      @click="confirmDeleteDevice(device)"
                    />
                  </div>
                </q-card-section>
                <q-separator />
                <q-card-section class="q-pt-sm">
                  <div class="row items-center justify-between q-py-xs">
                    <span class="text-caption text-grey-7">Battery</span>
                    <ExpiryBadge :date="device.batteryExpirationDate" :label="expiryLabel(device.batteryExpirationDate)" />
                  </div>
                  <div class="row items-center justify-between q-py-xs">
                    <span class="text-caption text-grey-7">Pads</span>
                    <ExpiryBadge :date="device.padsExpirationDate" :label="expiryLabel(device.padsExpirationDate)" />
                  </div>
                  <div class="row items-center justify-between q-py-xs">
                    <span class="text-caption text-grey-7">Inspection</span>
                    <ExpiryBadge :date="device.nextInspectionDue" :label="expiryLabel(device.nextInspectionDue)" />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </template>

        <q-card v-else flat bordered>
          <q-card-section class="row items-center text-grey-7">
            <q-icon name="info" color="primary" size="20px" class="q-mr-sm" />
            <span class="text-body2">Save this location first to start adding its devices.</span>
          </q-card-section>
        </q-card>
      </div>
    </template>

    <DeviceDialog
      v-model:open="deviceDialogOpen"
      :device="editingDevice"
      :saving="deviceSaving"
      @submit="handleDeviceSubmit"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { expiryStatus } from 'aed-map-shared'

// Leaflet resolves its default marker images relative to its CSS, which
// breaks under Vite's bundling — point them at the bundled assets instead.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
import { api } from 'boot/axios'
import ExpiryBadge from 'components/ExpiryBadge.vue'
import DeviceDialog from 'components/DeviceDialog.vue'

const props = defineProps({
  id: { type: String, default: null },
})

const $q = useQuasar()
const router = useRouter()

const isEditing = computed(() => !!props.id)
const loading = ref(isEditing.value)
const saving = ref(false)
const locating = ref(false)

const DEFAULT_CENTER = [37.9954210792772, 23.345278116198493] // Megara, Greece

const form = ref({
  name: '',
  addressText: '',
  lat: DEFAULT_CENTER[0],
  lng: DEFAULT_CENTER[1],
  isAvailable: true,
  is24h: false,
})

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const scheduleDays = ref(
  dayNames.map(() => ({ enabled: false, open: '08:00', close: '17:00' })),
)

const devices = ref([])

let map = null
let marker = null

function initMap() {
  map = L.map('picker-map').setView([form.value.lat, form.value.lng], 14)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  marker = L.marker([form.value.lat, form.value.lng], { draggable: true }).addTo(map)
  marker.on('dragend', () => {
    const { lat, lng } = marker.getLatLng()
    form.value.lat = lat
    form.value.lng = lng
  })

  map.on('click', (e) => {
    form.value.lat = e.latlng.lat
    form.value.lng = e.latlng.lng
    marker.setLatLng(e.latlng)
  })
}

// Editors standing at the physical AED can capture its coordinates directly.
function useMyLocation() {
  if (!('geolocation' in navigator)) {
    $q.notify({ type: 'negative', message: 'Location is not supported on this device.' })
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false
      const { latitude, longitude } = position.coords
      form.value.lat = latitude
      form.value.lng = longitude
      marker.setLatLng([latitude, longitude])
      map.flyTo([latitude, longitude], 17, { duration: 0.6 })
    },
    () => {
      locating.value = false
      $q.notify({
        type: 'negative',
        message: 'Could not get your location. Check that location access is allowed.',
      })
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

function applySchedule(schedule) {
  if (!schedule) return
  for (let i = 0; i < 7; i++) {
    const daySchedule = schedule[String(i)]
    if (daySchedule && daySchedule.length > 0) {
      scheduleDays.value[i] = {
        enabled: true,
        open: daySchedule[0].open,
        close: daySchedule[0].close,
      }
    }
  }
}

function buildSchedulePayload() {
  const schedule = {}
  scheduleDays.value.forEach((day, index) => {
    if (day.enabled) {
      schedule[String(index)] = [{ open: day.open, close: day.close }]
    }
  })
  return Object.keys(schedule).length > 0 ? schedule : undefined
}

async function fetchLocation() {
  const { data } = await api.get(`/admin/locations/${props.id}`)
  form.value = {
    name: data.name,
    addressText: data.addressText,
    lat: data.lat,
    lng: data.lng,
    isAvailable: data.isAvailable,
    is24h: data.is24h,
  }
  applySchedule(data.schedule)
  devices.value = data.devices
}

onMounted(async () => {
  if (isEditing.value) {
    try {
      await fetchLocation()
    } catch {
      $q.notify({ type: 'negative', message: 'Could not load this location.' })
      router.push({ name: 'locations' })
      return
    }
  }
  loading.value = false
  // Map container must exist in the DOM before Leaflet initializes it.
  setTimeout(initMap, 0)
})

async function handleSave() {
  saving.value = true
  const payload = {
    name: form.value.name,
    addressText: form.value.addressText,
    lat: form.value.lat,
    lng: form.value.lng,
    isAvailable: form.value.isAvailable,
    is24h: form.value.is24h,
    schedule: form.value.is24h ? undefined : buildSchedulePayload(),
  }

  try {
    if (isEditing.value) {
      await api.patch(`/admin/locations/${props.id}`, payload)
      $q.notify({ type: 'positive', message: 'Location saved.' })
    } else {
      const { data } = await api.post('/admin/locations', payload)
      $q.notify({ type: 'positive', message: 'Location created — now add its device(s).' })
      router.push({ name: 'location-edit', params: { id: data.id } })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Could not save location.' })
  } finally {
    saving.value = false
  }
}

function confirmDeleteLocation() {
  $q.dialog({
    title: 'Delete this location?',
    message: `This will permanently delete "${form.value.name}" and its ${devices.value.length} device(s).`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(handleDeleteLocation)
}

async function handleDeleteLocation() {
  try {
    await api.delete(`/admin/locations/${props.id}`)
    $q.notify({ type: 'positive', message: 'Location deleted.' })
    router.push({ name: 'locations' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not delete location.' })
  }
}

const deviceDialogOpen = ref(false)
const deviceSaving = ref(false)
const editingDevice = ref(null)

function openAddDevice() {
  editingDevice.value = null
  deviceDialogOpen.value = true
}
function openEditDevice(device) {
  editingDevice.value = device
  deviceDialogOpen.value = true
}

async function handleDeviceSubmit(payload) {
  deviceSaving.value = true
  try {
    if (editingDevice.value) {
      const { data } = await api.patch(`/admin/devices/${editingDevice.value.id}`, payload)
      devices.value = devices.value.map((d) => (d.id === data.id ? data : d))
    } else {
      const { data } = await api.post(`/admin/locations/${props.id}/devices`, payload)
      devices.value = [...devices.value, data]
    }
    deviceDialogOpen.value = false
    $q.notify({ type: 'positive', message: 'Device saved.' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not save device.' })
  } finally {
    deviceSaving.value = false
  }
}

function confirmDeleteDevice(device) {
  $q.dialog({
    title: 'Delete this device?',
    message: `Serial number "${device.serialNumber}" will be permanently removed.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(() => handleDeleteDevice(device))
}

async function handleDeleteDevice(device) {
  try {
    await api.delete(`/admin/devices/${device.id}`)
    devices.value = devices.value.filter((d) => d.id !== device.id)
    $q.notify({ type: 'positive', message: 'Device deleted.' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not delete device.' })
  }
}

function expiryLabel(date) {
  return expiryStatus(date).label
}
</script>
