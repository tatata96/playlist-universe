import type { PopularityTier, TrackSpeed } from '../../types/spotify'

export type GroqTrackInput = {
  id: string
  title: string
  artist: string
  album: string
  releaseDate: string
}

export type GroqTrackEnrichment = {
  id: string
  country: string
  speed: TrackSpeed
  genre: string[]
  energy: number
  scene: string[]
  instrumentation: string[]
  popularityTier: PopularityTier
}

export type GroqTrackEnrichmentResponse = {
  tracks: GroqTrackEnrichment[]
}

export type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}
