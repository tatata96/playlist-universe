import type { Track } from '../types/spotify'
import { getValidSpotifyAccessToken } from '../lib/spotifyAuth'
import type { SpotifyPage, SpotifyTrack, SpotifyTrackItem } from './spotifyApiModels'
import { mapToTrack } from '../utils/spotifyApiUtils'

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1'

async function spotifyGet<T>(path: string): Promise<T> {
  const token = await getValidSpotifyAccessToken()
  if (!token) {
    throw new Error('Not signed in. Please connect your Spotify account.')
  }

  const url = path.startsWith('http') ? path : `${SPOTIFY_API_BASE_URL}${path}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (response.status === 401) {
    throw new Error('Session expired. Please sign in again.')
  }

  if (response.status === 403) {
    let detail = ''

    try {
      const body = await response.json() as { error?: { message?: string } }
      if (body.error?.message) detail = ` (${body.error.message})`
    } catch {
      // Keep the generic message when Spotify does not return JSON.
    }

    throw new Error(
      `Access denied${detail}. Your Spotify account may not have access to this app - make sure you're signed in with the right account.`,
    )
  }

  if (!response.ok) {
    throw new Error(`Something went wrong (HTTP ${response.status}). Check your connection and try again.`)
  }

  return response.json() as Promise<T>
}

export async function fetchLikedSongs(onProgress?: (count: number) => void): Promise<Track[]> {
  const allItems: SpotifyTrackItem[] = []
  let url: string | null = '/me/tracks?limit=50'

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
