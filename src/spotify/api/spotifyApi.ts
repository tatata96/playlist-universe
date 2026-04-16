import type { Track } from '../../types/spotify'
import { getValidSpotifyAccessToken } from '../auth/spotifyAuth'
import type { SpotifyPage, SpotifyPlaylist, SpotifyTrack, SpotifyTrackItem } from './spotifyApiModels'
import { mapToTrack } from '../utils/spotifyApiUtils'

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1'

async function spotifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidSpotifyAccessToken()
  if (!token) {
    throw new Error('Not signed in. Please connect your Spotify account.')
  }

  const url = path.startsWith('http') ? path : `${SPOTIFY_API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })

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

  return response
}

async function spotifyGet<T>(path: string): Promise<T> {
  const response = await spotifyFetch(path)
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

export async function createPlaylist(name: string, description?: string): Promise<SpotifyPlaylist> {
  const response = await spotifyFetch('/me/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: description ?? '', public: false }),
  })

  return response.json() as Promise<SpotifyPlaylist>
}

export async function addTrackToPlaylist(playlistId: string, trackUri: string): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [trackUri] }),
  })
}
