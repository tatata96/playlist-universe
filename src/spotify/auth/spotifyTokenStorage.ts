import { getSpotifyScope } from './spotifyAuthConfig'
import type { SpotifyTokenResponse, StoredSpotifyTokens } from './spotifyAuthModels'

const TOKEN_STORAGE_KEY = 'spotify_auth_tokens'

export function loadStoredTokens(): StoredSpotifyTokens | null {
  const rawValue = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as StoredSpotifyTokens
  } catch {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    return null
  }
}

export function saveTokens(response: SpotifyTokenResponse, existingRefreshToken?: string) {
  const tokens: StoredSpotifyTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? existingRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
    scope: response.scope ?? getSpotifyScope(),
    tokenType: response.token_type,
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
  return tokens
}

export function clearStoredTokens() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}
