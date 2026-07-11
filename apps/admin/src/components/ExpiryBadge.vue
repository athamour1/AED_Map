<template>
  <q-chip dense square :color="status.color" text-color="white" :icon="icon">
    {{ label ?? status.label }}
  </q-chip>
</template>

<script setup>
import { computed } from 'vue'
import { expiryStatus } from 'aed-map-shared'

const props = defineProps({
  date: { type: [String, Date, null], default: null },
  label: { type: String, default: null },
})

const status = computed(() => expiryStatus(props.date))

const icon = computed(() => {
  if (status.value.level === 'critical') return 'warning'
  if (status.value.level === 'warning') return 'schedule'
  if (status.value.level === 'ok') return 'check_circle'
  return 'help_outline'
})
</script>
