<template>
  <q-page class="bg-grey-1 q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">Locations</div>
        <div class="text-caption text-grey-7">Fleet readiness at a glance</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="New location" no-caps unelevated :to="{ name: 'location-new' }" />
    </div>

    <q-banner v-if="loadError" dense class="bg-red-1 text-negative rounded-borders q-mb-md">
      Could not load locations.
      <template #action>
        <q-btn flat dense no-caps color="negative" label="Retry" @click="fetchLocations" />
      </template>
    </q-banner>

    <template v-else>
      <!-- Readiness strip -->
      <q-card v-if="!loading" flat bordered class="q-mb-md">
        <div class="row items-stretch">
          <div class="col q-pa-md">
            <div class="text-h4 text-weight-bold">{{ locations.length }}</div>
            <div class="text-overline text-grey-7" style="line-height: 1.6">Locations</div>
          </div>
          <q-separator vertical />
          <div class="col q-pa-md">
            <div class="text-h4 text-weight-bold">{{ deviceCount }}</div>
            <div class="text-overline text-grey-7" style="line-height: 1.6">Devices</div>
          </div>
          <q-separator vertical />
          <div class="col q-pa-md">
            <div class="text-h4 text-weight-bold" :class="attentionCount > 0 ? 'text-negative' : 'text-grey-8'">
              {{ attentionCount }}
            </div>
            <div class="text-overline text-grey-7" style="line-height: 1.6">Need attention</div>
          </div>
        </div>
      </q-card>

      <!-- Search + triage segments -->
      <div v-if="!loading && locations.length > 0" class="row items-center q-col-gutter-sm q-mb-md">
        <div class="col-12 col-sm-5 col-md-4">
          <q-input v-model="filter" dense outlined clearable bg-color="white" placeholder="Search name or address">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-auto">
          <q-btn-toggle
            v-model="segment"
            no-caps
            dense
            unelevated
            toggle-color="primary"
            color="white"
            text-color="grey-8"
            class="shadow-1"
            padding="6px 12px"
            :options="segmentOptions"
          />
        </div>
      </div>

      <!-- Loading skeleton mirroring the roster rows -->
      <q-card v-if="loading" flat bordered class="overflow-hidden">
        <div v-for="n in 4" :key="n">
          <q-separator v-if="n > 1" />
          <div class="row items-center q-pa-md">
            <q-skeleton type="circle" size="10px" class="q-mr-md" />
            <div class="col">
              <q-skeleton type="text" width="30%" />
              <q-skeleton type="text" width="50%" />
            </div>
            <q-skeleton type="QChip" width="80px" />
          </div>
        </div>
      </q-card>

      <!-- Empty states -->
      <q-card v-else-if="filteredLocations.length === 0" flat bordered>
        <q-card-section class="column flex-center text-center q-pa-xl text-grey-7">
          <q-icon name="place" size="48px" class="q-mb-sm" />
          <div class="text-body1">
            {{ locations.length === 0
              ? 'No locations yet — add the first one.'
              : 'No locations match this view.' }}
          </div>
          <q-btn
            v-if="locations.length === 0"
            color="primary"
            icon="add"
            label="New location"
            no-caps
            unelevated
            class="q-mt-md"
            :to="{ name: 'location-new' }"
          />
        </q-card-section>
      </q-card>

      <!-- Roster: most urgent first, rows expand to per-device readiness -->
      <q-card v-else flat bordered class="overflow-hidden">
        <q-list separator>
          <q-expansion-item v-for="location in filteredLocations" :key="location.id">
            <template #header>
              <q-item-section side>
                <q-icon name="circle" size="10px" :color="location.isAvailable ? 'positive' : 'negative'" />
              </q-item-section>
              <q-item-section style="min-width: 0">
                <q-item-label class="text-weight-medium">{{ location.name }}</q-item-label>
                <q-item-label caption class="ellipsis">{{ location.addressText }}</q-item-label>
              </q-item-section>
              <q-item-section side class="gt-xs">
                <div class="row items-center no-wrap q-gutter-sm">
                  <span class="text-caption text-grey-7">
                    {{ location.devices.length }} {{ location.devices.length === 1 ? 'device' : 'devices' }}
                  </span>
                  <ExpiryBadge
                    v-if="worstExpiry(location)"
                    :date="worstExpiry(location).date"
                    :label="worstExpiry(location).label"
                  />
                </div>
              </q-item-section>
              <q-item-section side>
                <div class="row no-wrap">
                  <q-btn
                    flat
                    dense
                    round
                    icon="edit"
                    aria-label="Edit"
                    :to="{ name: 'location-edit', params: { id: location.id } }"
                    @click.stop
                  />
                  <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    color="negative"
                    aria-label="Delete"
                    @click.stop="confirmDelete(location)"
                  />
                </div>
              </q-item-section>
            </template>

            <div class="bg-grey-1 q-px-md q-py-sm">
              <div v-if="location.devices.length === 0" class="text-caption text-grey-6 q-py-sm">
                No devices at this location yet.
              </div>
              <div v-for="device in location.devices" :key="device.id" class="row items-center q-py-sm">
                <div class="col-12 col-sm-4" style="min-width: 0">
                  <div class="text-body2 text-weight-medium">{{ device.serialNumber }}</div>
                  <div class="text-caption text-grey-6 ellipsis">
                    {{ [device.manufacturer, device.model].filter(Boolean).join(' ') || 'Make and model not set' }}
                  </div>
                </div>
                <div class="col-12 col-sm-8 row items-center q-gutter-xs">
                  <ExpiryBadge :date="device.batteryExpirationDate" :label="`Battery: ${statusLabel(device.batteryExpirationDate)}`" />
                  <ExpiryBadge :date="device.padsExpirationDate" :label="`Pads: ${statusLabel(device.padsExpirationDate)}`" />
                  <ExpiryBadge :date="device.nextInspectionDue" :label="`Inspection: ${statusLabel(device.nextInspectionDue)}`" />
                </div>
              </div>
            </div>
          </q-expansion-item>
        </q-list>
      </q-card>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { expiryStatus } from 'aed-map-shared'
import { api } from 'boot/axios'
import ExpiryBadge from 'components/ExpiryBadge.vue'

const $q = useQuasar()

const locations = ref([])
const loading = ref(true)
const loadError = ref(false)
const filter = ref('')
const segment = ref('all')

async function fetchLocations() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await api.get('/admin/locations')
    locations.value = data
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// Picks the soonest-expiring date across every device's tracked fields —
// the badge should reflect the most urgent thing needing attention.
function worstExpiry(location) {
  const fields = ['batteryExpirationDate', 'padsExpirationDate', 'nextInspectionDue']
  let soonest = null
  for (const device of location.devices) {
    for (const field of fields) {
      const value = device[field]
      if (!value) continue
      if (!soonest || new Date(value) < new Date(soonest)) {
        soonest = value
      }
    }
  }
  if (!soonest) return location.devices.length > 0 ? { date: null, label: 'No dates set' } : null
  return { date: soonest, label: undefined }
}

function worstExpiryLevel(location) {
  const worst = worstExpiry(location)
  return worst && worst.date ? expiryStatus(worst.date).level : null
}

function needsAttention(location) {
  return !location.isAvailable || ['critical', 'warning'].includes(worstExpiryLevel(location))
}

// The roster is a readiness board: whatever needs a human first sorts first.
function urgencyRank(location) {
  if (!location.isAvailable) return 0
  const level = worstExpiryLevel(location)
  if (level === 'critical') return 0
  if (level === 'warning') return 1
  return 2
}

const deviceCount = computed(() => locations.value.reduce((sum, l) => sum + l.devices.length, 0))
const attentionCount = computed(() => locations.value.filter(needsAttention).length)
const unavailableCount = computed(() => locations.value.filter((l) => !l.isAvailable).length)

const segmentOptions = computed(() => [
  { label: `All · ${locations.value.length}`, value: 'all' },
  { label: `Needs attention · ${attentionCount.value}`, value: 'attention' },
  { label: `Unavailable · ${unavailableCount.value}`, value: 'unavailable' },
])

const filteredLocations = computed(() => {
  const needle = (filter.value || '').toLowerCase()
  return locations.value
    .filter((location) => {
      if (segment.value === 'attention' && !needsAttention(location)) return false
      if (segment.value === 'unavailable' && location.isAvailable) return false
      if (needle && !`${location.name} ${location.addressText}`.toLowerCase().includes(needle)) return false
      return true
    })
    .sort((a, b) => urgencyRank(a) - urgencyRank(b) || a.name.localeCompare(b.name))
})

function statusLabel(date) {
  return expiryStatus(date).label
}

function confirmDelete(location) {
  $q.dialog({
    title: 'Delete location?',
    message: `This will permanently delete "${location.name}" and its ${location.devices.length} device(s).`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(() => performDelete(location))
}

async function performDelete(location) {
  try {
    await api.delete(`/admin/locations/${location.id}`)
    locations.value = locations.value.filter((l) => l.id !== location.id)
    $q.notify({ type: 'positive', message: 'Location deleted.' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not delete location.' })
  }
}

onMounted(fetchLocations)
</script>
