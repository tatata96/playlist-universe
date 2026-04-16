const AUTH_SCOPE = [
  'user-library-read',
  'playlist-read-private',
].join(' ')

export function getSpotifyClientId() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim()
  if (!clientId) {
    throw new Error('Missing VITE_SPOTIFY_CLIENT_ID.')
  }

  return clientId
}

export function getSpotifyRedirectUri() {
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim()
  if (!configured) {
    throw new Error('Missing VITE_SPOTIFY_REDIRECT_URI.')
  }

  const redirectUri = configured
  const parsed = new URL(redirectUri)
  const isLoopback = parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1'
  const isSecure = parsed.protocol === 'https:'

  if (!isSecure && !isLoopback) {
    throw new Error(
      'Spotify redirect URI must use HTTPS, or http://127.0.0.1 during local development.',
    )
  }

  if (parsed.hostname === 'localhost') {
    throw new Error('Spotify redirect URI cannot use http://localhost. Use http://127.0.0.1 instead.')
  }

  return redirectUri
}

export function getSpotifyScope() {
  return AUTH_SCOPE
}
