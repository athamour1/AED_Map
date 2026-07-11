<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" :to="{ name: 'locations' }" class="q-mr-sm" />
      <div class="text-h5">{{ isEditing ? 'Edit location' : 'New location' }}</div>
      <q-space />
      <q-btn
        v-if="isEditing"
        flat
        color="negative"
        icon="delete"
        label="Delete location"
        @click="deleteDialogOpen = true"
      />
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <template v-else>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Details</div>
              <q-form class="q-gutter-sm">
                <q-input v-model="form.name" label="Name *" outlined dense
                  :rules="[(val) => !!val || 'Required']" />
                <q-input v-model="form.addressText" label="Address *" outlined dense
                  :rules="[(val) => !!val || 'Required']" />
                <q-toggle v-model="form.isAvailable" label="Available" color="positive" />
                <q-toggle v-model="form.is24h" label="Open 24 hours" color="primary" />
              </q-form>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mt-md" v-if="!form.is24h">
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Weekly schedule</div>
              <div v-for="(day, index) in dayNames" :key="index" class="row items-center q-mb-xs q-col-gutter-sm">
                <div class="col-3">
                  <q-checkbox v-model="scheduleDays[index].enabled" :label="day" dense />
                </div>
                <div class="col-4" v-if="scheduleDays[index].enabled">
                  <q-input v-model="scheduleDays[index].open" type="time" dense outlined stack-label label="Open" />
                </div>
                <div class="col-4" v-if="scheduleDays[index].enabled">
                  <q-input v-model="scheduleDays[index].close" type="time" dense outlined stack-label label="Close" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">
                Location on map
                <span class="text-caption text-grey-7">— click to set coordinates</span>
              </div>
              <div id="picker-map" style="height: 320px; border-radius: 4px;"></div>
              <div class="text-caption text-grey-7 q-mt-xs">
                {{ form.lat.toFixed(6) }}, {{ form.lng.toFixed(6) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row justify-end q-mt-md q-gutter-sm">
        <q-btn flat label="Cancel" :to="{ name: 'locations' }" />
        <q-btn color="primary" label="Save location" :loading="saving" unelevated @click="handleSave" />
      </div>

      <q-card flat bordered class="q-mt-lg" v-if="isEditing">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle1">Devices</div>
            <q-space />
            <q-btn color="primary" icon="add" label="Add device" dense unelevated @click="openAddDevice" />
          </div>

          <div v-if="devices.length === 0" class="text-grey-7 text-center q-pa-md">
            No devices at this location yet.
          </div>

          <q-list v-else bordered separator>
            <q-item v-for="device in devices" :key="device.id">
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ device.serialNumber }}
                  <span class="text-grey-7 text-caption" v-if="device.manufacturer || device.model">
                    — {{ [device.manufacturer, device.model].filter(Boolean).join(' ') }}
                  </span>
                </q-item-label>
                <div class="row q-gutter-xs q-mt-xs">
                  <ExpiryBadge v-if="device.batteryExpirationDate" :date="device.batteryExpirationDate" :label="`Battery: ${expiryLabel(device.batteryExpirationDate)}`" />
                  <ExpiryBadge v-if="device.padsExpirationDate" :date="device.padsExpirationDate" :label="`Pads: ${expiryLabel(device.padsExpirationDate)}`" />
                  <ExpiryBadge v-if="device.nextInspectionDue" :date="device.nextInspectionDue" :label="`Inspection: ${expiryLabel(device.nextInspectionDue)}`" />
                </div>
              </q-item-section>
              <q-item-section side>
                <div class="row q-gutter-xs">
                  <q-btn flat dense round icon="edit" @click="openEditDevice(device)" />
                  <q-btn flat dense round icon="delete" color="negative" @click="confirmDeleteDevice(device)" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
      <q-banner v-else dense class="bg-blue-1 text-primary rounded-borders q-mt-lg">
        Save this location first to start adding devices.
      </q-banner>
    </template>

    <DeviceDialog
      v-model:open="deviceDialogOpen"
      :device="editingDevice"
      :saving="deviceSaving"
      @submit="handleDeviceSubmit"
    />

    <q-dialog v-model="deleteDialogOpen">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Delete this location?</q-card-section>
        <q-card-section class="q-pt-none">
          This will permanently delete <strong>{{ form.name }}</strong> and its {{ devices.length }} device(s).
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat color="negative" label="Delete" :loading="deletingLocation" @click="handleDeleteLocation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDeviceDialogOpen">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Delete this device?</q-card-section>
        <q-card-section class="q-pt-none">
          Serial number <strong>{{ deviceToDelete?.serialNumber }}</strong> will be permanently removed.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat color="negative" label="Delete" :loading="deletingDevice" @click="handleDeleteDevice" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { expiryStatus } from 'aed-map-shared'
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
const deletingLocation = ref(false)

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
  if (!form.value.name || !form.value.addressText) {
    $q.notify({ type: 'negative', message: 'Name and address are required.' })
    return
  }

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

const deleteDialogOpen = ref(false)
async function handleDeleteLocation() {
  deletingLocation.value = true
  try {
    await api.delete(`/admin/locations/${props.id}`)
    $q.notify({ type: 'positive', message: 'Location deleted.' })
    router.push({ name: 'locations' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not delete location.' })
  } finally {
    deletingLocation.value = false
    deleteDialogOpen.value = false
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

const deleteDeviceDialogOpen = ref(false)
const deviceToDelete = ref(null)
const deletingDevice = ref(false)

function confirmDeleteDevice(device) {
  deviceToDelete.value = device
  deleteDeviceDialogOpen.value = true
}

async function handleDeleteDevice() {
  deletingDevice.value = true
  try {
    await api.delete(`/admin/devices/${deviceToDelete.value.id}`)
    devices.value = devices.value.filter((d) => d.id !== deviceToDelete.value.id)
    $q.notify({ type: 'positive', message: 'Device deleted.' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not delete device.' })
  } finally {
    deletingDevice.value = false
    deleteDeviceDialogOpen.value = false
  }
}

function expiryLabel(date) {
  return expiryStatus(date).label
}
</script>
