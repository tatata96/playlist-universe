import { useState, useCallback } from 'react'
import type { Phase, Track } from '../types/spotify'
import { parseSpotifyUrl } from '../utils/parseSpotifyUrl'
import { fetchPlaylistTracks } from '../utils/spotifyApi'

export interface UsePlaylistLoaderResult {
  phase: Phase
  tracks: Track[]
  error: string | null
  load: (url: string) => void
  reset: () => void
}

export function usePlaylistLoader(): UsePlaylistLoaderResult {
  const [phase, setPhase] = useState<Phase>('idle')
  const [tracks, setTracks] = useState<Track[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (url: string) => {
    setPhase('loading')
    setError(null)
    try {
      const playlistId = parseSpotifyUrl(url)
      const fetched = await fetchPlaylistTracks(playlistId)
      setTracks(fetched)
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }, [])

  const reset = useCallback(() => {
    setPhase('idle')
    setTracks([])
    setError(null)
  }, [])

  return { phase, tracks, error, load, reset }
}
