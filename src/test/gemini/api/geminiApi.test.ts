import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Track } from '../../../types/spotify'

vi.mock('../../../gemini/auth/geminiAuthConfig', () => ({
  getGeminiApiKey: vi.fn(() => 'mock-gemini-key'),
  getGeminiModel: vi.fn(() => 'gemini-2.5-flash-lite'),
  getGeminiTrackBatchSize: vi.fn(() => 2),
}))

import { enrichTracksWithGemini } from '../../../gemini/api/geminiApi'

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

function makeGeminiResponse(content: string, finishReason: string | null = 'stop') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          finish_reason: finishReason,
          message: { content },
        },
      ],
    }),
  } as unknown as Response
}

function makeGeminiErrorResponse(status: number, message = 'Request failed', retryAfter: string | null = null) {
  return {
    ok: false,
    status,
    headers: {
      get: (name: string) => name.toLowerCase() === 'retry-after' ? retryAfter : null,
    },
    json: async () => ({ error: { message } }),
  } as unknown as Response
}

describe('enrichTracksWithGemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends tracks to Gemini with JSON object response mode', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const [track] = await enrichTracksWithGemini([makeTrack('a')])

    expect(fetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-gemini-key',
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

    expect(body.model).toBe('gemini-2.5-flash-lite')
    expect(body.max_completion_tokens).toBe(4096)
    expect(body.response_format.type).toBe('json_object')
  })

  it('batches requests and reports enrichment progress', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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
    const tracks = await enrichTracksWithGemini([
      makeTrack('a'),
      makeTrack('b'),
      makeTrack('c'),
    ], onProgress)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, { enrichedCount: 2, totalCount: 3 })
    expect(onProgress).toHaveBeenNthCalledWith(2, { enrichedCount: 3, totalCount: 3 })
    expect(tracks.map((track) => track.country)).toEqual(['United States', 'Turkey', 'France'])
  })

  it('keeps the original track fields when Gemini omits an id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const tracks = await enrichTracksWithGemini([makeTrack('a'), makeTrack('missing')])

    expect(tracks[1]).toEqual(makeTrack('missing'))
  })

  it('retries temporary Gemini capacity errors', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGeminiErrorResponse(503, 'Service unavailable.'))
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const enrichment = enrichTracksWithGemini([makeTrack('a')])

    await vi.advanceTimersByTimeAsync(800)

    await expect(enrichment).resolves.toMatchObject([
      {
        id: 'a',
        country: 'United States',
      },
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('respects Retry-After when retrying rate limits', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGeminiErrorResponse(429, 'Rate limited.', '3'))
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const enrichment = enrichTracksWithGemini([makeTrack('a')])

    await vi.advanceTimersByTimeAsync(2999)
    expect(fetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)

    await expect(enrichment).resolves.toMatchObject([
      {
        id: 'a',
        country: 'United States',
      },
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('uses cached enrichments before calling Gemini', async () => {
    const localStorageMock = {
      getItem: vi.fn(() => JSON.stringify({
        a: {
          id: 'a',
          country: 'United States',
          speed: 'medium',
          genre: ['pop'],
          energy: 60,
          scene: ['party'],
          instrumentation: ['synth'],
          popularityTier: 'mainstream',
        },
      })),
      setItem: vi.fn(),
    }
    vi.stubGlobal('localStorage', localStorageMock)

    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const onProgress = vi.fn()
    const tracks = await enrichTracksWithGemini([makeTrack('a'), makeTrack('b')], onProgress)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(tracks.map((track) => track.country)).toEqual(['United States', 'Turkey'])
    expect(onProgress).toHaveBeenNthCalledWith(1, { enrichedCount: 1, totalCount: 2 })
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('accepts fenced JSON returned by Gemini', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse(`\`\`\`json
{
  "tracks": [
    {
      "id": "a",
      "country": "United States",
      "speed": "medium",
      "genre": ["pop"],
      "energy": 60,
      "scene": ["party"],
      "instrumentation": ["synth"],
      "popularityTier": "mainstream"
    }
  ]
}
\`\`\``))

    const tracks = await enrichTracksWithGemini([makeTrack('a')])

    expect(tracks[0].country).toBe('United States')
  })

  it('throws a clear error when Gemini returns invalid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiResponse('not json'))

    await expect(enrichTracksWithGemini([makeTrack('a')])).rejects.toThrow('Gemini returned invalid JSON')
  })

  it('splits an oversized batch and retries smaller chunks', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGeminiErrorResponse(413, 'Request too large for model.'))
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const tracks = await enrichTracksWithGemini([makeTrack('a'), makeTrack('b')])

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(tracks.map((track) => track.country)).toEqual(['United States', 'Turkey'])
  })

  it('splits a batch when Gemini truncates the JSON response', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeGeminiResponse('{"tracks":[{"id":"a"', 'length'))
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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
      .mockResolvedValueOnce(makeGeminiResponse(JSON.stringify({
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

    const tracks = await enrichTracksWithGemini([makeTrack('a'), makeTrack('b')])

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(tracks.map((track) => track.country)).toEqual(['United States', 'Turkey'])
  })

  it('throws when Gemini returns a failed response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeGeminiErrorResponse(400, 'Invalid API key.'))

    await expect(enrichTracksWithGemini([makeTrack('a')])).rejects.toThrow('Gemini request failed')
  })

  it('throws when Gemini returns no text', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: null } }] }),
    } as unknown as Response)

    await expect(enrichTracksWithGemini([makeTrack('a')])).rejects.toThrow('Gemini returned an empty response')
  })
})
