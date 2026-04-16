import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/spotifyAuth', () => ({
  getValidSpotifyAccessToken: vi.fn(),
}))

import { getValidSpotifyAccessToken } from '../lib/spotifyAuth'
import { mapToTrack, fetchPlaylistTracks, fetchLikedSongs } from './spotifyApi'
import type { SpotifyTrackItem } from './spotifyApi'

const mockGetToken = vi.mocked(getValidSpotifyAccessToken)

const makeTrackItem = (id: string): SpotifyTrackItem => ({
  track: {
    id,
    name: 'Song',
    artists: [{ name: 'Artist' }],
    album: {
      name: 'Album',
      images: [{ url: `https://img/${id}.jpg`, width: 640, height: 640 }],
    },
  },
})

const makePage = (items: SpotifyTrackItem[], next: string | null = null) => ({
  ok: true,
  status: 200,
  json: async () => ({ items, next }),
})

describe('mapToTrack', () => {
  const mockItem: SpotifyTrackItem = {
    track: {
      id: 'track123',
      name: 'Bohemian Rhapsody',
      artists: [{ name: 'Queen' }, { name: 'Other Artist' }],
      album: {
        name: 'A Night at the Opera',
        images: [
          { url: 'https://i.scdn.co/image/large.jpg', width: 640, height: 640 },
          { url: 'https://i.scdn.co/image/small.jpg', width: 300, height: 300 },
        ],
      },
    },
  }

  it('maps a spotify item to the Track shape', () => {
    expect(mapToTrack({ track: mockItem.track! })).toEqual({
      id: 'track123',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      image: 'https://i.scdn.co/image/large.jpg',
    })
  })

  it('uses only the primary (first) artist', () => {
    expect(mapToTrack({ track: mockItem.track! }).artist).toBe('Queen')
  })

  it('uses the largest image (first in the array)', () => {
    expect(mapToTrack({ track: mockItem.track! }).image).toBe('https://i.scdn.co/image/large.jpg')
  })

  it('falls back to empty string when there are no images', () => {
    const noImages = {
      track: { ...mockItem.track!, album: { name: 'A Night at the Opera', images: [] } },
    }
    expect(mapToTrack(noImages).image).toBe('')
  })
})

describe('fetchPlaylistTracks', () => {
  beforeEach(() => {
    mockGetToken.mockResolvedValue('mock-token')
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('returns mapped tracks for a single-page playlist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makePage([makeTrackItem('abc')]) as unknown as Response)
    const tracks = await fetchPlaylistTracks('playlist123')
    expect(tracks).toEqual([{ id: 'abc', title: 'Song', artist: 'Artist', album: 'Album', image: 'https://img/abc.jpg' }])
  })

  it('paginates until next is null', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce(makePage([makeTrackItem('t1')], 'https://api.spotify.com/v1/playlists/p/tracks?offset=1') as unknown as Response)
      .mockResolvedValueOnce(makePage([makeTrackItem('t2')]) as unknown as Response)
    const tracks = await fetchPlaylistTracks('p')
    expect(tracks).toHaveLength(2)
    expect(tracks[0].id).toBe('t1')
    expect(tracks[1].id).toBe('t2')
  })

  it('throws when not signed in', async () => {
    mockGetToken.mockResolvedValue(null)
    await expect(fetchPlaylistTracks('p')).rejects.toThrow('Not signed in')
  })

  it('throws on 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as unknown as Response)
    await expect(fetchPlaylistTracks('p')).rejects.toThrow('Playlist not found')
  })

  it('throws when playlist has no tracks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makePage([]) as unknown as Response)
    await expect(fetchPlaylistTracks('p')).rejects.toThrow('no tracks')
  })

  it('filters out null tracks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makePage([{ track: null }, makeTrackItem('real')]) as unknown as Response
    )
    const tracks = await fetchPlaylistTracks('p')
    expect(tracks).toHaveLength(1)
    expect(tracks[0].id).toBe('real')
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
    expect(tracks[0].id).toBe('liked1')
  })

  it('calls onProgress with cumulative count', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makePage([makeTrackItem('a'), makeTrackItem('b')]) as unknown as Response)
    const onProgress = vi.fn()
    await fetchLikedSongs(onProgress)
    expect(onProgress).toHaveBeenCalledWith(2)
  })

  it('maps 403 to the invite error message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) } as unknown as Response)
    await expect(fetchLikedSongs()).rejects.toThrow('tamarakozok@gmail.com')
  })

  it('re-throws non-403 errors unchanged', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as unknown as Response)
    await expect(fetchLikedSongs()).rejects.toThrow('Something went wrong')
  })
})
