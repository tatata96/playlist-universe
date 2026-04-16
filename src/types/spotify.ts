export type Phase = 'idle' | 'loading' | 'ready' | 'error'

export type Mode = 'playlist-url' | 'liked-songs'

// Must be a `type` (not `interface`) so it satisfies
// `Record<string, unknown>` required by gallery-universe generics.
export type Track = {
  id: string
  title: string
  artist: string
  album: string
  image: string // album cover URL (640px)
}
