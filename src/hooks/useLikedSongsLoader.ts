import { useState, useEffect } from 'react'
import type { Track } from '../types/spotify'
import { fetchLikedSongs } from '../utils/spotifyApi'

type Options = { enabled: boolean }

type Result = {
  tracks: Track[]
  loadedCount: number
  error: string | null
  isComplete: boolean
}

export function useLikedSongsLoader({ enabled }: Options): Result {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    setTracks([])
    setLoadedCount(0)
    setError(null)
    setIsComplete(false)

    fetchLikedSongs((count) => {
      if (!cancelled) setLoadedCount(count)
    })
      .then((result) => {
        if (cancelled) return
        setTracks(result)
        setIsComplete(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load liked songs.')
        setIsComplete(true)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { tracks, loadedCount, error, isComplete }
}
