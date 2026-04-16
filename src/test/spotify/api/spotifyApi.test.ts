import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../../../spotify/auth/spotifyAuth', () => ({
  getValidSpotifyAccessToken: vi.fn(),
}))

import { getValidSpotifyAccessToken } from '../../../spotify/auth/spotifyAuth'
import { addTrackToPlaylist, createPlaylist, fetchLikedSongs } from '../../../spotify/api/spotifyApi'
import type { SpotifyTrackItem } from '../../../spotify/api/spotifyApiModels'
import { mapToTrack } from '../../../spotify/utils/spotifyApiUtils'

const mockGetToken = vi.mocked(getValidSpotifyAccessToken)

function makeTrackItem(id: string): SpotifyTrackItem {
  return {
    added_at: '2023-01-01T00:00:00Z',
    track: {
      id,
      name: 'Song',
      artists: [{ name: 'Artist' }],
      album: {
        name: 'Album',
        release_date: '2020-01-01',
        images: [{ url: `https://img/${id}.jpg`, width: 640, height: 640 }],
      },
    },
  }
}

function makePage(items: SpotifyTrackItem[], next: string | null = null) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ items, next }),
  }
}

describe('mapToTrack', () => {
  const mockItem: SpotifyTrackItem = {
    added_at: '2021-05-01T00:00:00Z',
    track: {
      id: 'track123',
      name: 'Bohemian Rhapsody',
      artists: [{ name: 'Queen' }, { name: 'Other Artist' }],
      album: {
        name: 'A Night at the Opera',
        release_date: '2023-07-14',
        images: [
          { url: 'https://i.scdn.co/image/large.jpg', width: 640, height: 640 },
          { url: 'https://i.scdn.co/image/small.jpg', width: 300, height: 300 },
        ],
      },
    },
  }

  it('maps a Spotify item to the Track shape', () => {
    expect(mapToTrack(mockItem as SpotifyTrackItem & { track: NonNullable<SpotifyTrackItem['track']> })).toEqual({
      id: 'track123',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      image: 'https://i.scdn.co/image/large.jpg',
      releaseDate: '2023-07-14',
      addedAt: '2021-05-01T00:00:00Z',
    })
  })

  it('falls back to an empty image when there are no album images', () => {
    const noImages: SpotifyTrackItem = {
      added_at: '2021-05-01T00:00:00Z',
      track: {
        ...mockItem.track!,
        album: { name: 'A Night at the Opera', release_date: '2023-07-14', images: [] },
      },
    }

    expect(mapToTrack(noImages as SpotifyTrackItem & { track: NonNullable<SpotifyTrackItem['track']> }).image).toBe('')
  })
})

describe('fetchLikedSongs', () => {
  beforeEach(() => {
    mockGetToken.mockResolvedValue('mock-token')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => vi.unstubAllGlobals())

  it('returns mapped liked tracks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makePage([makeTrackItem('liked1')]) as unknown as Response)

    const tracks = await fetchLikedSongs()

    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toEqual({
      id: 'liked1',
      title: 'Song',
      artist: 'Artist',
      album: 'Album',
      image: 'https://img/liked1.jpg',
      releaseDate: '2020-01-01',
      addedAt: '2023-01-01T00:00:00Z',
    })
  })

  it('fetches every page until next is null', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makePage([makeTrackItem('a')], 'https://api.spotify.com/v1/me/tracks?offset=50') as unknown as Response)
      .mockResolvedValueOnce(makePage([makeTrackItem('b')]) as unknown as Response)

    const tracks = await fetchLikedSongs()

    expect(tracks.map((track) => track.id)).toEqual(['a', 'b'])
  })

  it('calls onProgress with the cumulative item count', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makePage([makeTrackItem('a'), makeTrackItem('b')]) as unknown as Response)
    const onProgress = vi.fn()

    await fetchLikedSongs(onProgress)

    expect(onProgress).toHaveBeenCalledWith(2)
  })

  it('filters out null tracks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makePage([{ track: null, added_at: '2023-01-01T00:00:00Z' }, makeTrackItem('real')]) as unknown as Response,
    )

    const tracks = await fetchLikedSongs()

    expect(tracks).toHaveLength(1)
    expect(tracks[0].id).toBe('real')
  })

  it('throws when not signed in', async () => {
    mockGetToken.mockResolvedValue(null)

    await expect(fetchLikedSongs()).rejects.toThrow('Not signed in')
  })

  it('maps 403 responses to an account access message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'User not registered in the Developer Dashboard' } }),
    } as unknown as Response)

    await expect(fetchLikedSongs()).rejects.toThrow(/Access denied.*right account/)
  })

  it('throws a generic message for other failed responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as unknown as Response)

    await expect(fetchLikedSongs()).rejects.toThrow('Something went wrong')
  })
})

describe('playlist writes', () => {
  beforeEach(() => {
    mockGetToken.mockResolvedValue('mock-token')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => vi.unstubAllGlobals())

  it('creates a private playlist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'playlist-1', name: 'My Playlist' }),
    } as unknown as Response)

    const playlist = await createPlaylist('My Playlist', 'A test playlist')

    expect(playlist).toEqual({ id: 'playlist-1', name: 'My Playlist' })
    expect(fetch).toHaveBeenCalledWith('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ name: 'My Playlist', description: 'A test playlist', public: false }),
    })
  })

  it('adds a track URI to a playlist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({}),
    } as unknown as Response)

    await addTrackToPlaylist('playlist-1', 'spotify:track:track-1')

    expect(fetch).toHaveBeenCalledWith('https://api.spotify.com/v1/playlists/playlist-1/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ uris: ['spotify:track:track-1'] }),
    })
  })
})
