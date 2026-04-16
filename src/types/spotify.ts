export type Phase = 'idle' | 'loading' | 'ready' | 'error'

export type Mode = 'liked-songs'

// Must be a `type` (not `interface`) so it satisfies
// `Record<string, unknown>` required by gallery-universe generics.
export type Track = {
  id: string
  title: string
  artist: string
  album: string
  image: string // album cover URL (640px)
  releaseDate: string // e.g. "2021-03-05"
  addedAt: string    // e.g. "2023-11-14T10:22:00Z"
}
