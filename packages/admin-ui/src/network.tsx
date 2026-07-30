'use client'

/**
 * Platform network-state layer for the admin portals (Console + Manager).
 *
 * Three concerns, one small dependency-free store:
 *   - Offline:  navigator.onLine + the online/offline window events.
 *   - Slow:     any request still in flight past SLOW_MS is flagged, so the
 *               UI can say "still loading" instead of looking frozen.
 *   - Timeout:  attachNetworkMonitor sets a default axios timeout so a dead
 *               connection rejects (and hits the normal retry/error states)
 *               instead of hanging forever.
 *
 * The member app carries its own copy of this behaviour in its own design
 * language; this one is admin-only and rides the shared admin-ui kit.
 */

import { useSyncExternalStore } from 'react'
import { Loader2, WifiOff } from 'lucide-react'

const SLOW_MS = 4000
const TIMEOUT_MS = 20000

let onlineState = typeof navigator !== 'undefined' ? navigator.onLine : true
let slowCount = 0

// Cached so getSnapshot is referentially stable between real changes —
// useSyncExternalStore loops forever otherwise.
let snapshot = { online: onlineState, slow: slowCount > 0 }
const SERVER_SNAPSHOT = { online: true, slow: false }

const listeners = new Set<() => void>()

function emit() {
  const next = { online: onlineState, slow: slowCount > 0 }
  if (next.online === snapshot.online && next.slow === snapshot.slow) return
  snapshot = next
  listeners.forEach((l) => l())
}

function setOnline(value: boolean) {
  onlineState = value
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setOnline(true))
  window.addEventListener('offline', () => setOnline(false))
}

type NetMarker = { timer: ReturnType<typeof setTimeout>; counted: boolean }

// Structural axios shape — admin-ui does not want a hard axios import, only
// the interceptor surface it actually touches.
interface AxiosLike {
  defaults: { timeout?: number }
  interceptors: {
    request: { use: (fn: (config: any) => any) => void }
    response: { use: (onOk: (res: any) => any, onErr: (err: any) => any) => void }
  }
  __netMonitorAttached?: boolean
}

/**
 * Wire an axios instance into the network store: a default timeout, plus
 * slow-request tracking. Idempotent so Fast Refresh can't double-attach.
 */
export function attachNetworkMonitor(api: AxiosLike) {
  if (api.__netMonitorAttached) return
  api.__netMonitorAttached = true

  if (!api.defaults.timeout) api.defaults.timeout = TIMEOUT_MS

  api.interceptors.request.use((config) => {
    const marker: NetMarker = {
      counted: false,
      timer: setTimeout(() => {
        marker.counted = true
        slowCount += 1
        emit()
      }, SLOW_MS),
    }
    config.__netMarker = marker
    return config
  })

  const settle = (config: any) => {
    const marker: NetMarker | undefined = config?.__netMarker
    if (!marker) return
    clearTimeout(marker.timer)
    if (marker.counted) {
      slowCount = Math.max(0, slowCount - 1)
      emit()
    }
  }

  api.interceptors.response.use(
    (res) => {
      settle(res.config)
      return res
    },
    (err) => {
      settle(err?.config)
      return Promise.reject(err)
    }
  )
}

export interface ConnectionStatus {
  online: boolean
  slow: boolean
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT
  )
}

/**
 * Slim full-width strip: red when offline (persistent), amber when the
 * connection is merely slow. Renders nothing when the connection is healthy.
 * role="status" + aria-live so screen readers hear the change without it
 * stealing focus.
 */
export function ConnectionBanner() {
  const { online, slow } = useConnectionStatus()

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        <WifiOff className="h-4 w-4 shrink-0" />
        You&apos;re offline. We&apos;ll reconnect and refresh automatically once your connection returns.
      </div>
    )
  }

  if (slow) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        Slow connection — still loading. Hang tight.
      </div>
    )
  }

  return null
}
