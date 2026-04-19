/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string
  readonly VITE_SPOTIFY_REDIRECT_URI: string
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_GROQ_MODEL?: string
  readonly VITE_GROQ_TRACK_BATCH_SIZE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
