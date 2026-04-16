export interface SpotifyArtist {
  name: string
}

export interface SpotifyAlbum {
  name: string
  release_date: string
  images: Array<{ url: string; width: number; height: number }>
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
}

export interface SpotifyPlaylist {
  id: string
  name: string
}

export interface SpotifyTrackItem {
  added_at: string
  track: SpotifyTrack | null
}

export interface SpotifyPage {
  items: SpotifyTrackItem[]
  next: string | null
}
