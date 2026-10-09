import { ref } from 'vue'
import { Dark } from 'quasar'

// Theme preference: 'auto' follows the OS, 'light'/'dark' pin it. Remembered
// per browser — a convenience only, so storage failures (private mode,
// blocked site data) just fall back to 'auto'.
const STORAGE_KEY = 'aed-admin-theme'
const MODES = ['auto', 'light', 'dark']

const mode = ref('auto')

function apply(next) {
  mode.value = MODES.includes(next) ? next : 'auto'
  Dark.set(mode.value === 'auto' ? 'auto' : mode.value === 'dark')
}

export function initTheme() {
  let stored = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // storage unavailable — keep the default
  }
  apply(stored)
}

export function useTheme() {
  function setMode(next) {
    apply(next)
    try {
      localStorage.setItem(STORAGE_KEY, mode.value)
    } catch {
      // storage unavailable — the choice still applies for this session
    }
  }

  return { mode, setMode }
}
