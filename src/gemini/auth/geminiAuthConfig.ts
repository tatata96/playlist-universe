const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite'
const DEFAULT_GEMINI_TRACK_BATCH_SIZE = 20

export function getGeminiApiKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY.')
  }

  return apiKey
}

export function getGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
}

export function getGeminiTrackBatchSize() {
  const configured = import.meta.env.VITE_GEMINI_TRACK_BATCH_SIZE?.trim()
  if (!configured) return DEFAULT_GEMINI_TRACK_BATCH_SIZE

  const batchSize = Number(configured)
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('VITE_GEMINI_TRACK_BATCH_SIZE must be a positive integer.')
  }

  return batchSize
}
