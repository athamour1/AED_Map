<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">Locations</div>
      <q-space />
      <q-btn color="primary" icon="add" label="New location" unelevated :to="{ name: 'location-new' }" />
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <q-banner v-else-if="loadError" dense class="bg-red-1 text-negative rounded-borders q-mb-md">
      Could not load locations. <q-btn flat dense label="Retry" @click="fetchLocations" />
    </q-banner>

    <div v-else-if="locations.length === 0" class="text-center text-grey-7 q-pa-xl">
      <q-icon name="place" size="48px" />
      <div class="q-mt-sm">No locations yet — add the first one.</div>
    </div>

    <q-table
      v-else
      :rows="locations"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :pagination="{ rowsPerPage: 20 }"
    >
      <template #body-cell-devices="props">
        <q-td :props="props">
          <q-badge color="blue-grey-6">{{ props.row.devices.length }}</q-badge>
        </q-td>
      </template>

      <template #body-cell-expiry="props">
        <q-td :props="props">
          <ExpiryBadge
            v-if="worstExpiry(props.row)"
            :date="worstExpiry(props.row).date"
            :label="worstExpiry(props.row).label"
          />
          <span v-else class="text-grey-6 text-caption">No devices</span>
        </q-td>
      </template>

      <template #body-cell-isAvailable="props">
        <q-td :props="props">
          <q-icon
            :name="props.row.isAvailable ? 'check_circle' : 'cancel'"
            :color="props.row.isAvailable ? 'positive' : 'negative'"
          />
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn
            flat
            dense
            round
            icon="edit"
            :to="{ name: 'location-edit', params: { id: props.row.id } }"
          />
          <q-btn flat dense round icon="delete" color="negative" @click="confirmDelete(props.row)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="deleteDialog.open">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">Delete location?</q-card-section>
        <q-card-section class="q-pt-none">
          This will permanently delete <strong>{{ deleteDialog.target?.name }}</strong>
          and its {{ deleteDialog.target?.devices.length ?? 0 }} device(s).
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat color="negative" label="Delete" :loading="deleteDialog.loading" @click="performDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import ExpiryBadge from 'components/ExpiryBadge.vue'

const $q = useQuasar()

const locations = ref([])
const loading = ref(true)
const loadError = ref(false)

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'addressText', label: 'Address', field: 'addressText', align: 'left' },
  { name: 'devices', label: 'Devices', field: (row) => row.devices.length, align: 'center' },
  { name: 'expiry', label: 'Worst expiry', field: 'expiry', align: 'left' },
  { name: 'isAvailable', label: 'Available', field: 'isAvailable', align: 'center' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

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

const deleteDialog = reactive({ open: false, target: null, loading: false })

function confirmDelete(location) {
  deleteDialog.target = location
  deleteDialog.open = true
}

async function performDelete() {
  deleteDialog.loading = true
  try {
    await api.delete(`/admin/locations/${deleteDialog.target.id}`)
    locations.value = locations.value.filter((l) => l.id !== deleteDialog.target.id)
    deleteDialog.open = false
    $q.notify({ type: 'positive', message: 'Location deleted.' })
  } catch {
    $q.notify({ type: 'negative', message: 'Could not delete location.' })
  } finally {
    deleteDialog.loading = false
  }
}

onMounted(fetchLocations)
</script>
