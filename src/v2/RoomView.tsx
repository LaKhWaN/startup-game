import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react'
import { PlaceholderRoom } from './PlaceholderRoom'
import { hasWebGL } from './scene/webgl'

const HomeScene = lazy(() => import('./scene/HomeScene'))

/** Any asset/render failure falls back to the placeholder instead of a blank area. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('[v2 scene] falling back to placeholder:', err) }
  render() { return this.state.failed ? <PlaceholderRoom /> : this.props.children }
}

export function RoomView({ children }: { children?: ReactNode }) {
  const webgl = useMemo(() => hasWebGL(), [])
  if (!webgl) return <PlaceholderRoom />
  return (
    <SceneBoundary>
      <Suspense fallback={<PlaceholderRoom />}>
        <HomeScene>{children}</HomeScene>
      </Suspense>
    </SceneBoundary>
  )
}
