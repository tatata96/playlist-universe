import { getSpotifyClientId } from './spotifyAuthConfig'
import type { SpotifyTokenResponse, StoredSpotifyTokens } from './spotifyAuthModels'
import { saveTokens } from './spotifyTokenStorage'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function parseRetryAfterMs(headerValue: string | null, attempt: number) {
  if (!headerValue) {
    return Math.min(1000 * 2 ** attempt, 8000)
  }

  const seconds = Number(headerValue)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const retryDate = Date.parse(headerValue)
  if (Number.isNaN(retryDate)) {
    return Math.min(1000 * 2 ** attempt, 8000)
  }

  return Math.max(retryDate - Date.now(), 0)
}

export async function postSpotifyToken(params: URLSearchParams) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'), attempt)
      await wait(retryAfterMs)
      continue
    }

    if (!response.ok) {
      let message = `Spotify token request failed with ${response.status}.`

      try {
        const errorBody = (await response.json()) as SpotifyTokenResponse
        const details = errorBody.error_description ?? errorBody.error
        if (details) {
          message = `Spotify token request failed: ${details}`
        }
      } catch {
        // Keep the fallback message when the response is not JSON.
      }

      throw new Error(message)
    }

    return (await response.json()) as SpotifyTokenResponse
  }

  throw new Error('Spotify rate limit reached. Try again in a moment.')
}

export async function refreshSpotifyAccessToken(tokens: StoredSpotifyTokens) {
  if (!tokens.refreshToken) {
    throw new Error('Missing Spotify refresh token. Please sign in again.')
  }

  const tokenResponse = await postSpotifyToken(
    new URLSearchParams({
      client_id: getSpotifyClientId(),
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }),
  )

  return saveTokens(tokenResponse, tokens.refreshToken)
}
