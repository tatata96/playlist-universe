import { useEffect, useRef } from 'react'
import type { Track } from '../../types/spotify'
import './spotify-player.css'

// ---- Spotify IFrame API types ----

interface SpotifyIFrameAPI {
  createController(
    element: HTMLElement,
    options: { uri: string; height?: number },
    callback: (controller: SpotifyEmbedController) => void
  ): void
}

interface PlaybackUpdate {
  isPaused: boolean
  position: number
  duration: number
}

interface SpotifyEmbedController {
  loadUri(uri: string): void
  play(): void
  addListener(event: 'playback_update', callback: (e: { data: PlaybackUpdate }) => void): void
  destroy(): void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIFrameAPI) => void
  }
}

// ---- Script loader (singleton — loads once per page) ----

let apiPromise: Promise<SpotifyIFrameAPI> | null = null

function loadSpotifyIFrameAPI(): Promise<SpotifyIFrameAPI> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve
    const script = document.createElement('script')
    script.src = 'https://open.spotify.com/embed-podcast/iframe-api/v1'
    document.head.appendChild(script)
  })
  return apiPromise
}

// ---- Component ----

interface Props {
  track: Track
  onNext: () => void
}

export function SpotifyPlayer({ track, onNext }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<SpotifyEmbedController | null>(null)

  // Keep latest values in refs so effects don't need them as deps
  const trackRef = useRef(track)
  const onNextRef = useRef(onNext)
  useEffect(() => { trackRef.current = track }, [track])
  useEffect(() => { onNextRef.current = onNext }, [onNext])

  // Initialize controller once on mount
  useEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current

    loadSpotifyIFrameAPI().then((IFrameAPI) => {
      IFrameAPI.createController(
        element,
        { uri: `spotify:track:${trackRef.current.id}`, height: 80 },
        (controller) => {
          controllerRef.current = controller
          controller.addListener('playback_update', (e) => {
            const { isPaused, position, duration } = e.data
            // position > 0 guards against false positives on initial load
            if (isPaused && duration > 0 && position > 0 && position >= duration - 1) {
              onNextRef.current()
            }
          })
          controller.play()
        }
      )
    })

    return () => {
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, []) // intentionally empty — controller is created once

  // When track changes, load new URI and play
  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    controller.loadUri(`spotify:track:${track.id}`)
    controller.play()
  }, [track.id])


  return (
    <div className="spotify-player">

      {/* Spotify embed target */}
      <div ref={containerRef} className="spotify-player__embed" />
    </div>
  )
}
