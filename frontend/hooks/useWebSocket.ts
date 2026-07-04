import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQueryClient } from '@tanstack/react-query'

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

/**
 * Custom hook to connect to the Django Channels WebSocket for real-time events.
 * Listens to group-specific events and automatically invalidates React Query caches.
 *
 * DEFERRED FEATURE — not invoked by any page yet. JWTs now live in httpOnly
 * cookies (see /api/backend proxy), so the old ?token= query auth cannot
 * work from browser JS. When real-time updates are wired, add a short-lived
 * WS ticket endpoint on the backend and exchange it here.
 */
export function useWebSocket(groupId?: string) {
  const { isAuthenticated } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!groupId || !isAuthenticated) return

    // TODO(deferred): authenticate via a server-issued one-time ticket.
    const wsUrl = `${WS_BASE_URL}/group/${groupId}/`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log(`[WebSocket] Connected to group ${groupId}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const eventType = data.type

        console.log(`[WebSocket Event] ${eventType}`, data)

        // Automatically invalidate React Query caches based on the event received
        switch (eventType) {
          case 'contribution.confirmed':
          case 'contribution.failed':
          case 'contribution.overdue':
            queryClient.invalidateQueries({ queryKey: ['contributions', groupId] })
            break
            
          case 'payout.completed':
          case 'cycle.completed':
            queryClient.invalidateQueries({ queryKey: ['rotation', groupId] })
            queryClient.invalidateQueries({ queryKey: ['payout', groupId] })
            break
            
          case 'loan.status_changed':
          case 'loan.defaulted':
            queryClient.invalidateQueries({ queryKey: ['loans', groupId] })
            // A loan default might affect the main group stats or penalty stats
            queryClient.invalidateQueries({ queryKey: ['group', groupId] })
            break
            
          case 'member.joined':
          case 'kyc.verified':
            queryClient.invalidateQueries({ queryKey: ['group', groupId] })
            queryClient.invalidateQueries({ queryKey: ['kyc', 'status'] })
            break
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message', err)
      }
    }

    ws.onclose = () => {
      console.log(`[WebSocket] Disconnected from group ${groupId}`)
    }

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [groupId, isAuthenticated, queryClient])

  return wsRef.current
}
