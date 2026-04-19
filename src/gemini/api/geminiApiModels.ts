import type { PopularityTier, TrackSpeed } from '../../types/spotify'

export type GeminiTrackInput = {
  id: string
  title: string
  artist: string
  album: string
  releaseDate: string
}

export type GeminiTrackEnrichment = {
  id: string
  country: string
  speed: TrackSpeed
  genre: string[]
  energy: number
  scene: string[]
  instrumentation: string[]
  popularityTier: PopularityTier
}

export type GeminiTrackEnrichmentResponse = {
  tracks: GeminiTrackEnrichment[]
}

export type GeminiChatCompletionResponse = {
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string | null
    }
  }>
}
