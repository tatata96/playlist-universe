import type { Track } from '../types/spotify'
import { getValidSpotifyAccessToken } from '../lib/spotifyAuth'

// ---- Internal types ----

interface SpotifyArtist { name: string }
interface SpotifyAlbum {
  name: string
  release_date: string
  images: Array<{ url: string; width: number; height: number }>
}
interface SpotifyTrack { id: string; name: string; artists: SpotifyArtist[]; album: SpotifyAlbum }

export interface SpotifyTrackItem {
  added_at: string
  track: SpotifyTrack | null
}

interface SpotifyPage {
  items: SpotifyTrackItem[]
  next: string | null
}

// ---- Helpers ----

async function spotifyGet<T>(path: string): Promise<T> {
  const token = await getValidSpotifyAccessToken()
  if (!token) throw new Error('Not signed in. Please connect your Spotify account.')

  const url = path.startsWith('http') ? path : `https://api.spotify.com/v1${path}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (res.status === 401) throw new Error('Session expired. Please sign in again.')
  if (res.status === 403) {
    let detail = ''
    try {
      const body = await res.json() as { error?: { message?: string } }
      if (body.error?.message) detail = ` (${body.error.message})`
    } catch { /* ignore parse errors */ }
    throw new Error(`Access denied${detail}. Your Spotify account may not have access to this app — make sure you're signed in with the right account.`)
  }
  if (!res.ok) throw new Error(`Something went wrong (HTTP ${res.status}). Check your connection and try again.`)

  return res.json() as Promise<T>
}

// ---- Public API ----

function mapToTrack(item: SpotifyTrackItem & { track: SpotifyTrack }): Track {
  const t = item.track
  return {
    id: t.id,
    title: t.name,
    artist: t.artists[0].name,
    album: t.album.name,
    image: t.album.images[0]?.url ?? '',
    releaseDate: t.album.release_date,
    addedAt: item.added_at,
  }
}

export async function fetchLikedSongs(onProgress?: (count: number) => void): Promise<Track[]> {
  const allItems: SpotifyTrackItem[] = []
  let url: string | null = `/me/tracks?limit=50`

  while (url) {
    const page: SpotifyPage = await spotifyGet<SpotifyPage>(url)
    allItems.push(...page.items)
    onProgress?.(allItems.length)
    url = page.next
  }

  return allItems
    .filter((item): item is SpotifyTrackItem & { track: SpotifyTrack } => item.track !== null)
    .map(mapToTrack)
}
