<template>
  <q-dialog :model-value="open" @update:model-value="$emit('update:open', $event)">
    <q-card style="min-width: 420px; max-width: 480px">
      <q-card-section class="text-h6">{{ device ? 'Edit device' : 'Add device' }}</q-card-section>

      <q-card-section class="q-pt-none">
        <q-form @submit.prevent="handleSubmit" class="q-gutter-sm">
          <q-input v-model="form.serialNumber" label="Serial number *" outlined dense
            :rules="[(val) => !!val || 'Required']" />
          <div class="row q-col-gutter-sm">
            <q-input v-model="form.manufacturer" label="Manufacturer" outlined dense class="col" />
            <q-input v-model="form.model" label="Model" outlined dense class="col" />
          </div>

          <q-input v-model="form.installDate" type="date" label="Install date" outlined dense
            stack-label />

          <div class="row q-col-gutter-sm">
            <q-input
              v-model="form.batteryExpirationDate"
              type="date"
              label="Battery expiration"
              outlined
              dense
              stack-label
              class="col"
            />
            <q-input
              v-model="form.padsExpirationDate"
              type="date"
              label="Pads expiration"
              outlined
              dense
              stack-label
              class="col"
            />
          </div>

          <div class="row q-col-gutter-sm">
            <q-input
              v-model="form.lastInspectionDate"
              type="date"
              label="Last inspection"
              outlined
              dense
              stack-label
              class="col"
            />
            <q-input
              v-model="form.nextInspectionDue"
              type="date"
              label="Next inspection due"
              outlined
              dense
              stack-label
              class="col"
            />
          </div>

          <q-input v-model="form.notes" label="Notes" type="textarea" outlined dense rows="2" />

          <div class="row q-col-gutter-sm q-mt-sm" v-if="hasAnyExpiry">
            <div class="col-auto" v-if="form.batteryExpirationDate">
              <ExpiryBadge :date="form.batteryExpirationDate" :label="`Battery: ${statusLabel(form.batteryExpirationDate)}`" />
            </div>
            <div class="col-auto" v-if="form.padsExpirationDate">
              <ExpiryBadge :date="form.padsExpirationDate" :label="`Pads: ${statusLabel(form.padsExpirationDate)}`" />
            </div>
            <div class="col-auto" v-if="form.nextInspectionDue">
              <ExpiryBadge :date="form.nextInspectionDue" :label="`Inspection: ${statusLabel(form.nextInspectionDue)}`" />
            </div>
          </div>

          <q-card-actions align="right" class="q-px-none">
            <q-btn flat label="Cancel" @click="$emit('update:open', false)" />
            <q-btn type="submit" color="primary" label="Save" :loading="saving" unelevated />
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { expiryStatus } from 'aed-map-shared'
import ExpiryBadge from './ExpiryBadge.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  device: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'submit'])

const blankForm = () => ({
  serialNumber: '',
  manufacturer: '',
  model: '',
  installDate: '',
  batteryExpirationDate: '',
  padsExpirationDate: '',
  lastInspectionDate: '',
  nextInspectionDue: '',
  notes: '',
})

const form = ref(blankForm())

watch(
  () => [props.open, props.device],
  () => {
    if (!props.open) return
    if (props.device) {
      const toDateInput = (val) => (val ? val.slice(0, 10) : '')
      form.value = {
        serialNumber: props.device.serialNumber ?? '',
        manufacturer: props.device.manufacturer ?? '',
        model: props.device.model ?? '',
        installDate: toDateInput(props.device.installDate),
        batteryExpirationDate: toDateInput(props.device.batteryExpirationDate),
        padsExpirationDate: toDateInput(props.device.padsExpirationDate),
        lastInspectionDate: toDateInput(props.device.lastInspectionDate),
        nextInspectionDue: toDateInput(props.device.nextInspectionDue),
        notes: props.device.notes ?? '',
      }
    } else {
      form.value = blankForm()
    }
  },
  { immediate: true },
)

const hasAnyExpiry = computed(
  () => form.value.batteryExpirationDate || form.value.padsExpirationDate || form.value.nextInspectionDue,
)

function statusLabel(date) {
  return expiryStatus(date).label
}

function handleSubmit() {
  const payload = {}
  for (const [key, value] of Object.entries(form.value)) {
    if (value) payload[key] = value
  }
  emit('submit', payload)
}
</script>
