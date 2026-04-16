import type { Track } from '../../types/spotify'
import { getGroqApiKey, getGroqModel, getGroqTrackBatchSize } from '../auth/groqAuthConfig'
import { buildGroqTrackEnrichmentPrompt, mapTrackToGroqInput } from '../utils/groqApiUtils'
import type { GroqChatCompletionResponse, GroqTrackEnrichment, GroqTrackEnrichmentResponse } from './groqApiModels'

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MAX_ATTEMPTS = 3
const GROQ_RETRY_DELAYS_MS = [800, 1800]
const GROQ_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

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
    return `Groq is rate limited right now (HTTP ${status}). Please try again in a moment.${detail}`
  }

  if (status >= 500) {
    return `Groq is temporarily unavailable (HTTP ${status}). Please try again in a moment.${detail}`
  }

  return `Groq request failed (HTTP ${status}).${detail}`
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

    await wait(GROQ_RETRY_DELAYS_MS[attempt - 1])
  }

  if (!response?.ok) {
    const status = response?.status ?? 0
    const detail = response ? await readGroqErrorDetail(response) : ''
    throw new GroqApiError(status, getGroqFailureMessage(status, detail))
  }

  const body = await response.json() as GroqChatCompletionResponse
  const text = body.choices?.[0]?.message?.content

  if (!text) {
    throw new Error('Groq returned an empty response.')
  }

  return JSON.parse(text) as T
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
  const enrichments: GroqTrackEnrichment[] = []

  for (const chunk of chunkTracks(tracks, batchSize)) {
    enrichments.push(...await enrichTrackChunkWithGroq(chunk))
    onProgress?.({
      enrichedCount: Math.min(enrichments.length, tracks.length),
      totalCount: tracks.length,
    })
  }

  const enrichmentById = new Map(enrichments.map((item) => [item.id, item]))

  return tracks.map((track) => ({
    ...track,
    ...enrichmentById.get(track.id),
  }))
}
