import { defineBoot } from '#q-app/wrappers'
// Inter from the bundle (not fonts.googleapis.com): works offline and sends no
// visitor IPs to Google. Same type as the Trifylli admin.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'

export default defineBoot(() => {
  // Nothing to run: the imports are enough.
})
