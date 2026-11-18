<template>
  <div>
    <div class="row items-center q-mb-sm">
      <div class="text-overline text-grey-6">Photos · {{ photos.length }}/{{ MAX_PHOTOS }}</div>
      <q-space />
      <q-btn
        color="primary"
        icon="add_a_photo"
        label="Add photos"
        no-caps
        dense
        unelevated
        :loading="uploading"
        :disable="photos.length >= MAX_PHOTOS"
        @click="fileInput.click()"
      >
        <template #loading>
          <q-spinner class="q-mr-sm" size="1em" />
          {{ uploadProgress }}
        </template>
      </q-btn>
      <!-- accept="image/*" lets phones offer the camera directly; iOS turns
           HEIC into JPEG for us when the page asks for image/*. -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="handleFiles"
      />
    </div>

    <q-card v-if="photos.length === 0" flat bordered>
      <q-card-section class="column flex-center text-center q-pa-lg text-grey-6">
        <q-icon name="photo_camera" size="36px" class="q-mb-sm" />
        <div class="text-body2">No photos yet.</div>
        <div class="text-caption q-mb-md">
          Show the AED where it hangs, so people can find it fast. Photos appear on the public map.
        </div>
        <q-btn
          color="primary"
          no-caps
          unelevated
          icon="add_a_photo"
          label="Add the first photo"
          :loading="uploading"
          @click="fileInput.click()"
        />
      </q-card-section>
    </q-card>

    <div v-else class="row q-col-gutter-md">
      <div v-for="(photo, index) in photos" :key="photo.id" class="col-6 col-sm-4 col-md-3">
        <q-card flat bordered class="full-height">
          <q-img
            :src="photoUrl(photo.id, 'thumb')"
            :ratio="4 / 3"
            fit="cover"
            class="cursor-pointer"
            :alt="photo.caption || `Photo ${index + 1}`"
            @click="viewer = photo"
          >
            <div
              v-if="index === 0"
              class="absolute-top-left q-pa-xs text-caption"
              style="background: none"
            >
              <q-badge color="primary" label="Cover" />
            </div>
          </q-img>
          <q-card-section class="q-pa-sm">
            <div
              class="text-caption ellipsis-2-lines cursor-pointer"
              :class="photo.caption ? 'text-grey-9' : 'text-grey-6 text-italic'"
              style="min-height: 2.6em"
            >
              {{ photo.caption || 'Add a caption…' }}
              <q-popup-edit
                v-slot="scope"
                :model-value="photo.caption || ''"
                buttons
                label-set="Save"
                @save="(value) => saveCaption(photo, value)"
              >
                <q-input
                  v-model="scope.value"
                  dense
                  autofocus
                  counter
                  maxlength="200"
                  label="Caption"
                  hint="e.g. “Inside the lobby, left of the lifts”"
                  @keyup.enter="scope.set"
                />
              </q-popup-edit>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions class="q-pa-xs">
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="chevron_left"
              aria-label="Move earlier"
              :disable="index === 0 || reordering"
              @click="move(index, -1)"
            />
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="chevron_right"
              aria-label="Move later"
              :disable="index === photos.length - 1 || reordering"
              @click="move(index, 1)"
            />
            <q-space />
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="delete"
              color="negative"
              aria-label="Delete photo"
              @click="confirmDelete(photo)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <q-dialog :model-value="!!viewer" @update:model-value="viewer = null">
      <q-card v-if="viewer" style="width: 900px; max-width: 95vw">
        <q-img :src="photoUrl(viewer.id, 'full')" fit="contain" style="max-height: 80vh" />
        <q-card-section v-if="viewer.caption" class="text-body2">{{
          viewer.caption
        }}</q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

// Mirrors MAX_PHOTOS_PER_LOCATION in apps/api/src/photos/photos.service.ts.
const MAX_PHOTOS = 10

// Phone photos are often 5–10 MB. Shrinking them on the device first makes
// uploads quick over mobile data at the AED's location; the server re-encodes
// to at most 1600px anyway, so nothing visible is lost.
const CLIENT_MAX_EDGE = 2400
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024

const props = defineProps({
  locationId: { type: String, required: true },
})
const photos = defineModel('photos', { type: Array, default: () => [] })

const $q = useQuasar()
const fileInput = ref(null)
const uploading = ref(false)
const uploadProgress = ref('')
const reordering = ref(false)
const viewer = ref(null)

function photoUrl(id, variant) {
  return `/api/photos/${id}/${variant}`
}

async function shrink(file) {
  if (file.size <= SHRINK_ABOVE_BYTES || typeof createImageBitmap !== 'function') return file
  try {
    // createImageBitmap applies the EXIF orientation by default.
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file // let the server decide whether it can read the original
  }
}

function errorMessage(error, fallback) {
  const message = error?.response?.data?.message
  if (error?.response?.status === 413) return 'That photo is too large (max 15 MB).'
  return typeof message === 'string' ? message : fallback
}

async function handleFiles(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = '' // so picking the same file again still fires change
  if (files.length === 0) return

  const room = MAX_PHOTOS - photos.value.length
  if (files.length > room) {
    $q.notify({
      type: 'warning',
      message: `Only ${room} more photo(s) fit — the rest were skipped.`,
    })
  }

  uploading.value = true
  let added = 0
  for (const [i, file] of files.slice(0, room).entries()) {
    uploadProgress.value = `${i + 1}/${Math.min(files.length, room)}`
    try {
      const body = new FormData()
      body.append('file', await shrink(file), file.name)
      const { data } = await api.post(`/admin/locations/${props.locationId}/photos`, body)
      photos.value = [...photos.value, data]
      added++
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: `${file.name}: ${errorMessage(error, 'upload failed.')}`,
      })
    }
  }
  uploading.value = false
  if (added > 0)
    $q.notify({
      type: 'positive',
      message: added === 1 ? 'Photo added.' : `${added} photos added.`,
    })
}

async function saveCaption(photo, value) {
  try {
    const { data } = await api.patch(`/admin/photos/${photo.id}`, { caption: value })
    photos.value = photos.value.map((p) => (p.id === data.id ? data : p))
  } catch (error) {
    $q.notify({ type: 'negative', message: errorMessage(error, 'Could not save the caption.') })
  }
}

async function move(index, delta) {
  const next = [...photos.value]
  const [item] = next.splice(index, 1)
  next.splice(index + delta, 0, item)
  const previous = photos.value
  photos.value = next // optimistic
  reordering.value = true
  try {
    const { data } = await api.put(`/admin/locations/${props.locationId}/photos/order`, {
      ids: next.map((p) => p.id),
    })
    photos.value = data
  } catch (error) {
    photos.value = previous
    $q.notify({ type: 'negative', message: errorMessage(error, 'Could not reorder photos.') })
  } finally {
    reordering.value = false
  }
}

function confirmDelete(photo) {
  $q.dialog({
    title: 'Delete this photo?',
    message: 'It will be removed from the public map too.',
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await api.delete(`/admin/photos/${photo.id}`)
      photos.value = photos.value.filter((p) => p.id !== photo.id)
      $q.notify({ type: 'positive', message: 'Photo deleted.' })
    } catch (error) {
      $q.notify({ type: 'negative', message: errorMessage(error, 'Could not delete the photo.') })
    }
  })
}
</script>
