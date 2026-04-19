import type { Track } from '../../types/spotify'
import { getGroqApiKey, getGroqModel, getGroqTrackBatchSize } from '../auth/groqAuthConfig'
import { buildGroqTrackEnrichmentPrompt, mapTrackToGroqInput } from '../utils/groqApiUtils'
import type { GroqChatCompletionResponse, GroqTrackEnrichment, GroqTrackEnrichmentResponse } from './groqApiModels'

const GROQ_CHAT_COMPLETIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const GROQ_MAX_ATTEMPTS = 3
const GROQ_RETRY_DELAYS_MS = [800, 1800]
const GROQ_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const GROQ_CACHE_KEY = 'playlist-universe:track-enrichments:v1'

type EnrichmentProgress = {
  enrichedCount: number
  totalCount: number
}

class GroqApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'GroqApiError'
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
  return parseRetryAfterMs(response.headers?.get('retry-after') ?? null) ?? GROQ_RETRY_DELAYS_MS[attempt - 1]
}

function readCachedEnrichments() {
  if (typeof localStorage === 'undefined') return new Map<string, GroqTrackEnrichment>()

  try {
    const rawCache = localStorage.getItem(GROQ_CACHE_KEY)
    if (!rawCache) return new Map<string, GroqTrackEnrichment>()

    const parsed = JSON.parse(rawCache) as Record<string, GroqTrackEnrichment>
    return new Map(Object.entries(parsed))
  } catch {
    return new Map<string, GroqTrackEnrichment>()
  }
}

function writeCachedEnrichments(enrichments: Map<string, GroqTrackEnrichment>) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(GROQ_CACHE_KEY, JSON.stringify(Object.fromEntries(enrichments)))
  } catch {
    // Cache writes are best effort; enrichment should still work without storage.
  }
}

function parseGroqJson<T>(text: string): T {
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

function buildGroqChatRequest(apiKey: string, model: string, prompt: string): RequestInit {
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

async function readGroqErrorDetail(response: Response) {
  try {
    const body = await response.json() as { error?: { message?: string } }
    return body.error?.message ? ` ${body.error.message}` : ''
  } catch {
    return ''
  }
}

function getGroqFailureMessage(status: number, detail: string) {
  if (status === 429) {
    return `Gemini is rate limited right now (HTTP ${status}). Please try again in a moment.${detail}`
  }

  if (status >= 500) {
    return `Gemini is temporarily unavailable (HTTP ${status}). Please try again in a moment.${detail}`
  }

  return `Gemini request failed (HTTP ${status}).${detail}`
}

async function groqGenerateJson<T>(prompt: string): Promise<T> {
  const apiKey = getGroqApiKey()
  const model = getGroqModel()

  let response: Response | null = null

  for (let attempt = 1; attempt <= GROQ_MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(GROQ_CHAT_COMPLETIONS_URL, buildGroqChatRequest(apiKey, model, prompt))

    if (response.ok || !GROQ_RETRYABLE_STATUSES.has(response.status) || attempt === GROQ_MAX_ATTEMPTS) {
      break
    }

    await wait(getRetryDelayMs(response, attempt))
  }

  if (!response?.ok) {
    const status = response?.status ?? 0
    const detail = response ? await readGroqErrorDetail(response) : ''
    throw new GroqApiError(status, getGroqFailureMessage(status, detail))
  }

  const body = await response.json() as GroqChatCompletionResponse
  const choice = body.choices?.[0]
  const text = choice?.message?.content

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  if (choice?.finish_reason === 'length') {
    throw new GroqApiError(413, 'Gemini response was truncated before it finished returning JSON.')
  }

  return parseGroqJson<T>(text)
}

async function enrichTrackChunkWithGroq(chunk: Track[]): Promise<GroqTrackEnrichment[]> {
  try {
    const chunkResponse = await groqGenerateJson<GroqTrackEnrichmentResponse>(
      buildGroqTrackEnrichmentPrompt(chunk.map(mapTrackToGroqInput)),
    )

    return chunkResponse.tracks
  } catch (err: unknown) {
    if (err instanceof GroqApiError && err.status === 413 && chunk.length > 1) {
      const midpoint = Math.ceil(chunk.length / 2)
      const firstHalf = await enrichTrackChunkWithGroq(chunk.slice(0, midpoint))
      const secondHalf = await enrichTrackChunkWithGroq(chunk.slice(midpoint))
      return [...firstHalf, ...secondHalf]
    }

    throw err
  }
}

export async function enrichTracksWithGroq(
  tracks: Track[],
  onProgress?: (progress: EnrichmentProgress) => void,
): Promise<Track[]> {
  if (tracks.length === 0) return []

  const batchSize = getGroqTrackBatchSize()
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
    const chunkEnrichments = await enrichTrackChunkWithGroq(chunk)
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
