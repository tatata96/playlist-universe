const DEFAULT_GROQ_MODEL = 'gemini-2.5-flash-lite'
const DEFAULT_GROQ_TRACK_BATCH_SIZE = 20

export function getGroqApiKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY.')
  }

  return apiKey
}

export function getGroqModel() {
  return import.meta.env.VITE_GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL
}

export function getGroqTrackBatchSize() {
  const configured = import.meta.env.VITE_GROQ_TRACK_BATCH_SIZE?.trim()
  if (!configured) return DEFAULT_GROQ_TRACK_BATCH_SIZE

  const batchSize = Number(configured)
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('VITE_GROQ_TRACK_BATCH_SIZE must be a positive integer.')
  }

  return batchSize
}
