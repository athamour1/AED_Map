import { defineBoot } from '#q-app/wrappers'
import { initTheme } from 'src/composables/useTheme'

// Applies the saved light/dark preference before the first render, so the
// login page honours it too and nothing flashes in the wrong theme.
export default defineBoot(() => {
  initTheme()
})
