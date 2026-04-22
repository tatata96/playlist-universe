import type { Track } from '../../types/spotify'
import { getGeminiApiKey, getGeminiModel, getGeminiTrackBatchSize } from '../auth/geminiAuthConfig'
import { buildGeminiTrackEnrichmentPrompt, mapTrackToGeminiInput } from '../utils/geminiApiUtils'
import type { GeminiChatCompletionResponse, GeminiTrackEnrichment, GeminiTrackEnrichmentResponse } from './geminiApiModels'

const GEMINI_CHAT_COMPLETIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const GEMINI_MAX_ATTEMPTS = 3
const GEMINI_RETRY_DELAYS_MS = [800, 1800]
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const GEMINI_CACHE_KEY = 'playlist-universe:track-enrichments:v1'

type EnrichmentProgress = {
  enrichedCount: number
  totalCount: number
}

class GeminiApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'GeminiApiError'
    this.status = status
  }
}

function chunkTracks(tracks: Track[], batchSize: number) {
  const chunks: Track[][] = []

  for (let i = 0; i < tracks.length; i += batchSize) {
    chunks.push(tracks.slice(i, i + batchSize))
  }

  return chunks
}

function wait(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms))
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return null

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const dateMs = Date.parse(value)
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now())
  }

  return null
}

function getRetryDelayMs(response: Response, attempt: number) {
  return parseRetryAfterMs(response.headers?.get('retry-after') ?? null) ?? GEMINI_RETRY_DELAYS_MS[attempt - 1]
}

function readCachedEnrichments() {
  if (typeof localStorage === 'undefined') return new Map<string, GeminiTrackEnrichment>()

  try {
    const rawCache = localStorage.getItem(GEMINI_CACHE_KEY)
    if (!rawCache) return new Map<string, GeminiTrackEnrichment>()

    const parsed = JSON.parse(rawCache) as Record<string, GeminiTrackEnrichment>
    return new Map(Object.entries(parsed))
  } catch {
    return new Map<string, GeminiTrackEnrichment>()
  }
}

function writeCachedEnrichments(enrichments: Map<string, GeminiTrackEnrichment>) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify(Object.fromEntries(enrichments)))
  } catch {
    // Cache writes are best effort; enrichment should still work without storage.
  }
}

function parseGeminiJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1]
      ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)

    try {
      return JSON.parse(jsonMatch) as T
    } catch {
      throw new Error('Gemini returned invalid JSON.')
    }
  }
}

function buildGeminiChatRequest(apiKey: string, model: string, prompt: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You enrich Spotify track metadata for a music visualization app. Return only valid JSON and no prose.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 4096,
      response_format: {
        type: 'json_object',
      },
    }),
  }
}

async function readGeminiErrorDetail(response: Response) {
  try {
    const body = await response.json() as { error?: { message?: string } }
    return body.error?.message ? ` ${body.error.message}` : ''
  } catch {
    return ''
  }
}

function getGeminiFailureMessage(status: number, detail: string) {
  if (status === 429) {
    return `Gemini is rate limited right now (HTTP ${status}). Please try again in a moment.${detail}`
  }

  if (status >= 500) {
    return `Gemini is temporarily unavailable (HTTP ${status}). Please try again in a moment.${detail}`
  }

  return `Gemini request failed (HTTP ${status}).${detail}`
}

async function geminiGenerateJson<T>(prompt: string): Promise<T> {
  const apiKey = getGeminiApiKey()
  const model = getGeminiModel()

  let response: Response | null = null

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(GEMINI_CHAT_COMPLETIONS_URL, buildGeminiChatRequest(apiKey, model, prompt))

    if (response.ok || !GEMINI_RETRYABLE_STATUSES.has(response.status) || attempt === GEMINI_MAX_ATTEMPTS) {
      break
    }

    await wait(getRetryDelayMs(response, attempt))
  }

  if (!response?.ok) {
    const status = response?.status ?? 0
    const detail = response ? await readGeminiErrorDetail(response) : ''
    throw new GeminiApiError(status, getGeminiFailureMessage(status, detail))
  }

  const body = await response.json() as GeminiChatCompletionResponse
  const choice = body.choices?.[0]
  const text = choice?.message?.content

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  if (choice?.finish_reason === 'length') {
    throw new GeminiApiError(413, 'Gemini response was truncated before it finished returning JSON.')
  }

  return parseGeminiJson<T>(text)
}

async function enrichTrackChunkWithGemini(chunk: Track[]): Promise<GeminiTrackEnrichment[]> {
  try {
    const chunkResponse = await geminiGenerateJson<GeminiTrackEnrichmentResponse>(
      buildGeminiTrackEnrichmentPrompt(chunk.map(mapTrackToGeminiInput)),
    )

    return chunkResponse.tracks
  } catch (err: unknown) {
    if (err instanceof GeminiApiError && err.status === 413 && chunk.length > 1) {
      const midpoint = Math.ceil(chunk.length / 2)
      const firstHalf = await enrichTrackChunkWithGemini(chunk.slice(0, midpoint))
      const secondHalf = await enrichTrackChunkWithGemini(chunk.slice(midpoint))
      return [...firstHalf, ...secondHalf]
    }

    throw err
  }
}

export async function enrichTracksWithGemini(
  tracks: Track[],
  onProgress?: (progress: EnrichmentProgress) => void,
): Promise<Track[]> {
  if (tracks.length === 0) return []

  const batchSize = getGeminiTrackBatchSize()
  const cachedEnrichments = readCachedEnrichments()
  const enrichments = new Map(cachedEnrichments)
  const uncachedTracks = tracks.filter((track) => !cachedEnrichments.has(track.id))

  if (uncachedTracks.length !== tracks.length) {
    onProgress?.({
      enrichedCount: tracks.length - uncachedTracks.length,
      totalCount: tracks.length,
    })
  }

  for (const chunk of chunkTracks(uncachedTracks, batchSize)) {
    const chunkEnrichments = await enrichTrackChunkWithGemini(chunk)
    for (const enrichment of chunkEnrichments) {
      enrichments.set(enrichment.id, enrichment)
    }
    writeCachedEnrichments(enrichments)
    onProgress?.({
      enrichedCount: Math.min(
        tracks.filter((track) => enrichments.has(track.id)).length,
        tracks.length,
      ),
      totalCount: tracks.length,
    })
  }

  return tracks.map((track) => ({
    ...track,
    ...enrichments.get(track.id),
  }))
}
