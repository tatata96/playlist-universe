import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Track } from '../../../types/spotify'

vi.mock('../../../groq/auth/groqAuthConfig', () => ({
  getGroqApiKey: vi.fn(() => 'mock-groq-key'),
  getGroqModel: vi.fn(() => 'openai/gpt-oss-20b'),
  getGroqTrackBatchSize: vi.fn(() => 2),
}))

import { enrichTracksWithGroq } from '../../../groq/api/groqApi'

function makeTrack(id: string): Track {
  return {
    id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    album: `Album ${id}`,
    image: `https://img/${id}.jpg`,
    releaseDate: '2020-01-01',
    addedAt: '2024-01-01T00:00:00Z',
  }
}

function makeGroqResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: { content },
        },
      ],
    }),
  } as unknown as Response
}

function makeGroqErrorResponse(status: number, message = 'Request failed') {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  } as unknown as Response
}

describe('enrichTracksWithGroq', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends tracks to Groq with JSON object response mode', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
      tracks: [
        {
          id: 'a',
          country: 'United Kingdom',
          speed: 'fast',
          genre: ['rock'],
          energy: 88,
          scene: ['road trip'],
          instrumentation: ['guitar'],
          popularityTier: 'classic',
        },
      ],
    })))

    const [track] = await enrichTracksWithGroq([makeTrack('a')])

    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-groq-key',
          'Content-Type': 'application/json',
        },
      }),
    )
    expect(track).toMatchObject({
      id: 'a',
      country: 'United Kingdom',
      speed: 'fast',
      genre: ['rock'],
      energy: 88,
      scene: ['road trip'],
      instrumentation: ['guitar'],
      popularityTier: 'classic',
    })

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(request.body)) as {
      model: string
      max_completion_tokens: number
      response_format: {
        type: string
      }
    }

    expect(body.model).toBe('openai/gpt-oss-20b')
    expect(body.max_completion_tokens).toBe(4096)
    expect(body.response_format.type).toBe('json_object')
  })

  it('batches requests and reports enrichment progress', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
        tracks: [
          {
            id: 'a',
            country: 'United States',
            speed: 'medium',
            genre: ['pop'],
            energy: 60,
            scene: ['party'],
            instrumentation: ['synth'],
            popularityTier: 'mainstream',
          },
          {
            id: 'b',
            country: 'Turkey',
            speed: 'slow',
            genre: ['indie'],
            energy: 30,
            scene: ['rainy day'],
            instrumentation: ['guitar'],
            popularityTier: 'cult',
          },
        ],
      })))
      .mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
        tracks: [
          {
            id: 'c',
            country: 'France',
            speed: 'fast',
            genre: ['electronic'],
            energy: 92,
            scene: ['gym'],
            instrumentation: ['drums'],
            popularityTier: 'viral',
          },
        ],
      })))

    const onProgress = vi.fn()
    const tracks = await enrichTracksWithGroq([
      makeTrack('a'),
      makeTrack('b'),
      makeTrack('c'),
    ], onProgress)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, { enrichedCount: 2, totalCount: 3 })
    expect(onProgress).toHaveBeenNthCalledWith(2, { enrichedCount: 3, totalCount: 3 })
    expect(tracks.map((track) => track.country)).toEqual(['United States', 'Turkey', 'France'])
  })

  it('keeps the original track fields when Groq omits an id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
      tracks: [
        {
          id: 'a',
          country: 'United States',
          speed: 'medium',
          genre: ['pop'],
          energy: 60,
          scene: ['party'],
          instrumentation: ['synth'],
          popularityTier: 'mainstream',
        },
      ],
    })))

    const tracks = await enrichTracksWithGroq([makeTrack('a'), makeTrack('missing')])

    expect(tracks[1]).toEqual(makeTrack('missing'))
  })

  it('retries temporary Groq capacity errors', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGroqErrorResponse(503, 'Service unavailable.'))
      .mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
        tracks: [
          {
            id: 'a',
            country: 'United States',
            speed: 'medium',
            genre: ['pop'],
            energy: 60,
            scene: ['party'],
            instrumentation: ['synth'],
            popularityTier: 'mainstream',
          },
        ],
      })))

    const enrichment = enrichTracksWithGroq([makeTrack('a')])

    await vi.advanceTimersByTimeAsync(800)

    await expect(enrichment).resolves.toMatchObject([
      {
        id: 'a',
        country: 'United States',
      },
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('splits an oversized batch and retries smaller chunks', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGroqErrorResponse(413, 'Request too large for model.'))
      .mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
        tracks: [
          {
            id: 'a',
            country: 'United States',
            speed: 'medium',
            genre: ['pop'],
            energy: 60,
            scene: ['party'],
            instrumentation: ['synth'],
            popularityTier: 'mainstream',
          },
        ],
      })))
      .mockResolvedValueOnce(makeGroqResponse(JSON.stringify({
        tracks: [
          {
            id: 'b',
            country: 'Turkey',
            speed: 'slow',
            genre: ['indie'],
            energy: 30,
            scene: ['rainy day'],
            instrumentation: ['guitar'],
            popularityTier: 'cult',
          },
        ],
      })))

    const tracks = await enrichTracksWithGroq([makeTrack('a'), makeTrack('b')])

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(tracks.map((track) => track.country)).toEqual(['United States', 'Turkey'])
  })

  it('throws when Groq returns a failed response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGroqErrorResponse(400, 'Invalid API key.'))

    await expect(enrichTracksWithGroq([makeTrack('a')])).rejects.toThrow('Groq request failed')
  })

  it('throws when Groq returns no text', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: null } }] }),
    } as unknown as Response)

    await expect(enrichTracksWithGroq([makeTrack('a')])).rejects.toThrow('Groq returned an empty response')
  })
})
