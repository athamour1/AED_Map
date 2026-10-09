<template>
  <q-dialog
    :model-value="open"
    :maximized="$q.screen.lt.sm"
    @update:model-value="$emit('update:open', $event)"
  >
    <q-card class="dialog-card--md">
      <q-card-section class="row items-center no-wrap q-pb-none">
        <div class="col" style="min-width: 0">
          <div class="text-overline text-grey-6" style="line-height: 1.2">
            {{ device ? 'Edit device' : 'Add device' }}
          </div>
          <div class="text-subtitle1 text-weight-bold ellipsis" style="line-height: 1.3">
            {{ form.serialNumber || 'New device' }}
          </div>
        </div>
        <q-btn
          icon="close"
          flat
          round
          dense
          class="q-ml-sm text-grey-7"
          aria-label="Close"
          @click="$emit('update:open', false)"
        />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSubmit">
          <div class="text-overline text-grey-6 q-mb-sm">Identity</div>
          <q-input
            v-model="form.serialNumber"
            label="Serial number *"
            outlined
            dense
            class="q-mb-sm"
            :rules="[(val) => !!val || 'Required']"
          />
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.manufacturer" label="Manufacturer" outlined dense />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="form.model" label="Model" outlined dense />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="text-overline text-grey-6 q-mb-sm">Readiness dates</div>
          <q-input
            v-model="form.installDate"
            type="date"
            label="Install date"
            outlined
            dense
            stack-label
            class="q-mb-sm"
          />
          <div class="row q-col-gutter-sm q-mb-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.batteryExpirationDate" type="date" label="Battery expiration" outlined dense stack-label />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="form.padsExpirationDate" type="date" label="Pads expiration" outlined dense stack-label />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.lastInspectionDate" type="date" label="Last inspection" outlined dense stack-label />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="form.nextInspectionDue" type="date" label="Next inspection due" outlined dense stack-label />
            </div>
          </div>

          <template v-if="hasAnyExpiry">
            <q-separator class="q-my-md" />
            <div class="text-overline text-grey-6 q-mb-xs">Readiness</div>
            <div v-if="form.batteryExpirationDate" class="row items-center justify-between q-py-xs">
              <span class="text-caption text-grey-7">Battery</span>
              <ExpiryBadge :date="form.batteryExpirationDate" :label="statusLabel(form.batteryExpirationDate)" />
            </div>
            <div v-if="form.padsExpirationDate" class="row items-center justify-between q-py-xs">
              <span class="text-caption text-grey-7">Pads</span>
              <ExpiryBadge :date="form.padsExpirationDate" :label="statusLabel(form.padsExpirationDate)" />
            </div>
            <div v-if="form.nextInspectionDue" class="row items-center justify-between q-py-xs">
              <span class="text-caption text-grey-7">Inspection</span>
              <ExpiryBadge :date="form.nextInspectionDue" :label="statusLabel(form.nextInspectionDue)" />
            </div>
          </template>

          <q-separator class="q-my-md" />

          <div class="text-overline text-grey-6 q-mb-sm">Notes</div>
          <q-input
            v-model="form.notes"
            type="textarea"
            outlined
            dense
            rows="2"
            placeholder="Anything a maintainer should know"
          />

          <div class="row items-center justify-end q-gutter-sm q-mt-md">
            <q-btn flat no-caps label="Cancel" class="text-grey-8" @click="$emit('update:open', false)" />
            <q-btn type="submit" color="primary" no-caps unelevated label="Save device" :loading="saving" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { expiryStatus } from 'aed-map-shared'
import ExpiryBadge from './ExpiryBadge.vue'

const $q = useQuasar()

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
