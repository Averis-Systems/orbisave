import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQueryClient } from '@tanstack/react-query'

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

/**
 * Custom hook to connect to the Django Channels WebSocket for real-time events.
 * Listens to group-specific events and automatically invalidates React Query caches.
 */
export function useWebSocket(groupId?: string) {
  const { token } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!groupId || !token) return

    // Connect to the specific group channel with JWT auth
    const wsUrl = `${WS_BASE_URL}/group/${groupId}/?token=${token}`
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
  }, [groupId, token, queryClient])

  return wsRef.current
}
