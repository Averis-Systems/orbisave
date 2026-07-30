"use client"

/**
 * Member-app network-state layer. Mirrors the admin portals'
 * @orbisave/admin-ui network module beat-for-beat, but lives here because the
 * member app does not consume the admin kit and renders the banner in its own
 * design language (see components/states/ConnectionBanner).
 *
 *   - Offline:  navigator.onLine + the online/offline window events.
 *   - Slow:     any request still in flight past SLOW_MS is flagged.
 *   - Timeout:  attachNetworkMonitor sets a default axios timeout so a dead
 *               connection rejects into the normal retry/error states instead
 *               of hanging forever.
 */

import { useSyncExternalStore } from "react"

const SLOW_MS = 4000
const TIMEOUT_MS = 20000

let onlineState = typeof navigator !== "undefined" ? navigator.onLine : true
let slowCount = 0

// Cached so getSnapshot stays referentially stable between real changes.
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

if (typeof window !== "undefined") {
  window.addEventListener("online", () => setOnline(true))
  window.addEventListener("offline", () => setOnline(false))
}

type NetMarker = { timer: ReturnType<typeof setTimeout>; counted: boolean }

interface AxiosLike {
  defaults: { timeout?: number }
  interceptors: {
    request: { use: (fn: (config: any) => any) => void }
    response: { use: (onOk: (res: any) => any, onErr: (err: any) => any) => void }
  }
  __netMonitorAttached?: boolean
}

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
