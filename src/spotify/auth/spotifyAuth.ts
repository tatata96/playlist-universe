import {
  getSpotifyClientId,
  getSpotifyRedirectUri,
  getSpotifyScope,
} from './spotifyAuthConfig'
import type { StoredSpotifyTokens } from './spotifyAuthModels'
import {
  clearPkceSessionStorage,
  createCodeChallenge,
  getRandomString,
  PKCE_REDIRECT_URI_STORAGE_KEY,
  PKCE_STATE_STORAGE_KEY,
  PKCE_VERIFIER_STORAGE_KEY,
} from './spotifyPkce'
import {
  loadStoredTokens,
  saveTokens,
  clearStoredTokens,
} from './spotifyTokenStorage'
import {
  postSpotifyToken,
  refreshSpotifyAccessToken,
  parseRetryAfterMs,
} from './spotifyTokenApi'

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'

let loginCompletionPromise: Promise<StoredSpotifyTokens | null> | null = null

function getUriOriginAndPath(uri: string) {
  const parsed = new URL(uri)
  return `${parsed.origin}${parsed.pathname}`
}

function clearSpotifyCallbackParams(url: URL) {
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  window.history.replaceState({}, document.title, url.toString())
}

export async function beginSpotifyLogin() {
  const clientId = getSpotifyClientId()
  const redirectUri = getSpotifyRedirectUri()
  const codeVerifier = getRandomString(64)
  const state = getRandomString(16)
  const codeChallenge = await createCodeChallenge(codeVerifier)

  window.sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier)
  window.sessionStorage.setItem(PKCE_STATE_STORAGE_KEY, state)
  window.sessionStorage.setItem(PKCE_REDIRECT_URI_STORAGE_KEY, redirectUri)

  const searchParams = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: getSpotifyScope(),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  })

  window.location.assign(`${SPOTIFY_AUTHORIZE_URL}?${searchParams.toString()}`)
}

export async function maybeCompleteSpotifyLogin() {
  if (loginCompletionPromise) {
    return await loginCompletionPromise
  }

  loginCompletionPromise = completeSpotifyLogin()

  try {
    return await loginCompletionPromise
  } finally {
    loginCompletionPromise = null
  }
}

async function completeSpotifyLogin() {
  const currentUrl = new URL(window.location.href)
  const code = currentUrl.searchParams.get('code')
  const returnedState = currentUrl.searchParams.get('state')
  const error = currentUrl.searchParams.get('error')

  if (error) {
    clearSpotifyCallbackParams(currentUrl)
    throw new Error(`Spotify authorization failed: ${error}`)
  }

  if (!code) {
    return loadStoredTokens()
  }

  const storedState = window.sessionStorage.getItem(PKCE_STATE_STORAGE_KEY)
  const codeVerifier = window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)
  const storedRedirectUri = window.sessionStorage.getItem(PKCE_REDIRECT_URI_STORAGE_KEY)
  const configuredRedirectUri = getSpotifyRedirectUri()

  if (!returnedState || !storedState || returnedState !== storedState) {
    clearPkceSessionStorage()
    throw new Error('Spotify authorization state mismatch. Please try signing in again.')
  }

  if (!codeVerifier) {
    clearPkceSessionStorage()
    throw new Error('Missing PKCE code verifier. Please try signing in again.')
  }

  if (!storedRedirectUri || storedRedirectUri !== configuredRedirectUri) {
    clearPkceSessionStorage()
    throw new Error(
      'Spotify redirect URI changed during sign-in. Use the same 127.0.0.1 redirect URI and try again.',
    )
  }

  if (getUriOriginAndPath(currentUrl.toString()) !== getUriOriginAndPath(configuredRedirectUri)) {
    clearPkceSessionStorage()
    throw new Error('Spotify callback URI does not match VITE_SPOTIFY_REDIRECT_URI.')
  }

  // Remove the one-time callback params immediately so duplicate effect runs
  // do not attempt to exchange the same authorization code a second time.
  clearSpotifyCallbackParams(currentUrl)

  const tokenResponse = await postSpotifyToken(
    new URLSearchParams({
      client_id: getSpotifyClientId(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: storedRedirectUri,
      code_verifier: codeVerifier,
    }),
  )

  clearPkceSessionStorage()
  return saveTokens(tokenResponse)
}

export function clearSpotifySession() {
  clearPkceSessionStorage()
  clearStoredTokens()
}

export async function getValidSpotifyAccessToken() {
  const tokens = loadStoredTokens()
  if (!tokens) {
    return null
  }

  if (tokens.expiresAt - Date.now() > 60_000) {
    return tokens.accessToken
  }

  const refreshedTokens = await refreshSpotifyAccessToken(tokens)
  return refreshedTokens.accessToken
}

export {
  getSpotifyClientId,
  getSpotifyRedirectUri,
  getSpotifyScope,
  loadStoredTokens,
  parseRetryAfterMs,
  refreshSpotifyAccessToken,
}

export type { StoredSpotifyTokens }
