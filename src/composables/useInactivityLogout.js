import { onBeforeUnmount, onMounted, unref, watch } from 'vue'
import { getInactivityTimeoutMs } from '@/config/inactivity'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel']
const ACTIVITY_STORAGE_KEY = 'pbx3.lastActivityAt'

/**
 * Log out an authenticated shell after no user interaction for the configured interval.
 *
 * @param {() => void | Promise<void>} logout
 * @param {boolean | import('vue').Ref<boolean>} active
 */
export function useInactivityLogout(logout, active = true) {
  const timeoutMs = getInactivityTimeoutMs()
  let timerId = null
  let deadline = 0
  let mounted = false
  let loggingOut = false
  let lastBroadcastAt = 0

  function clearTimer() {
    if (timerId !== null) {
      window.clearTimeout(timerId)
      timerId = null
    }
  }

  function enabled() {
    return Boolean(unref(active))
  }

  function sharedActivityAt() {
    try {
      const value = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY))
      return Number.isFinite(value) ? value : 0
    } catch {
      return 0
    }
  }

  function scheduleFrom(activityAt) {
    clearTimer()
    if (!mounted || !enabled() || loggingOut) return
    deadline = activityAt + timeoutMs
    timerId = window.setTimeout(expireIfIdle, Math.max(0, deadline - Date.now()))
  }

  function expireIfIdle() {
    clearTimer()
    if (!enabled() || loggingOut) return

    deadline = Math.max(deadline, sharedActivityAt() + timeoutMs)
    const remaining = deadline - Date.now()
    if (remaining > 0) {
      timerId = window.setTimeout(expireIfIdle, remaining)
      return
    }

    loggingOut = true
    void Promise.resolve(logout())
  }

  function resetTimer() {
    if (!mounted || !enabled() || loggingOut) return
    const now = Date.now()
    scheduleFrom(now)
    if (now - lastBroadcastAt >= 1000) {
      lastBroadcastAt = now
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now))
      } catch {
        // Storage may be unavailable in private mode.
      }
    }
  }

  function onStorage(event) {
    if (event.key !== ACTIVITY_STORAGE_KEY) return
    const activityAt = Number(event.newValue)
    if (Number.isFinite(activityAt)) scheduleFrom(activityAt)
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      expireIfIdle()
    }
  }

  const stopWatching = watch(
    () => enabled(),
    (isActive) => {
      if (isActive) {
        loggingOut = false
        resetTimer()
      } else {
        clearTimer()
      }
    }
  )

  onMounted(() => {
    mounted = true
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('storage', onStorage)
    resetTimer()
  })

  onBeforeUnmount(() => {
    mounted = false
    clearTimer()
    stopWatching()
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, resetTimer)
    }
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('storage', onStorage)
  })
}
