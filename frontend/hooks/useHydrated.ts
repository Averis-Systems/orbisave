import { useSyncExternalStore } from 'react'

// Nothing to subscribe to: the value flips once, when React hands the tree over
// to the client, and never changes again.
const noopSubscribe = () => () => {}

/**
 * True once the client has hydrated, false during server render.
 *
 * Several pages need this because auth state is persisted client-side, so
 * rendering the signed-in or signed-out branch before hydration produces a
 * mismatch, or a flash of the wrong content.
 *
 * The usual spelling of this is a useState plus useEffect(() => setMounted(true)),
 * which works but schedules a second render pass on every page that uses it,
 * and React's compiler lint flags it as cascading renders. useSyncExternalStore
 * gives the same answer with no state update at all: the server snapshot is
 * false and the client snapshot is true.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
