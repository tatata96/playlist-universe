import { useState, useEffect } from 'react'
import type { Track } from '../types/spotify'
import { fetchLikedSongs } from '../spotify/api/spotifyApi'
import { enrichTracksWithGemini } from '../gemini/api/geminiApi'

type Options = { enabled: boolean }

type LoadingStage = 'spotify' | 'gemini'

type Result = {
  tracks: Track[]
  loadedCount: number
  enrichedCount: number
  totalCount: number
  stage: LoadingStage
  error: string | null
  geminiError: string | null
  isComplete: boolean
}

export function useLikedSongsLoader({ enabled }: Options): Result {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loadedCount, setLoadedCount] = useState(0)
  const [enrichedCount, setEnrichedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [stage, setStage] = useState<LoadingStage>('spotify')
  const [error, setError] = useState<string | null>(null)
  const [geminiError, setGeminiError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    /* eslint-disable react-hooks/set-state-in-effect */
    setTracks([])
    setLoadedCount(0)
    setEnrichedCount(0)
    setTotalCount(0)
    setStage('spotify')
    setError(null)
    setGeminiError(null)
    setIsComplete(false)
    /* eslint-enable react-hooks/set-state-in-effect */

    fetchLikedSongs((count) => {
      if (!cancelled) setLoadedCount(count)
    })
      .then(async (result) => {
        if (cancelled) return
        setStage('gemini')
        setTotalCount(result.length)
        setTracks(result)

        try {
          const enrichedTracks = await enrichTracksWithGemini(result, (progress) => {
            if (cancelled) return
            setEnrichedCount(progress.enrichedCount)
            setTotalCount(progress.totalCount)
          })
          if (cancelled) return
          setTracks(enrichedTracks)
        } catch (err: unknown) {
          if (cancelled) return
          setGeminiError(err instanceof Error ? err.message : 'Could not enrich tracks.')
        }

        if (!cancelled) setIsComplete(true)
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

  return { tracks, loadedCount, enrichedCount, totalCount, stage, error, geminiError, isComplete }
}
