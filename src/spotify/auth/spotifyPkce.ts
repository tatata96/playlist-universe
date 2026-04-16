export const PKCE_VERIFIER_STORAGE_KEY = 'spotify_pkce_code_verifier'
export const PKCE_STATE_STORAGE_KEY = 'spotify_pkce_state'
export const PKCE_REDIRECT_URI_STORAGE_KEY = 'spotify_pkce_redirect_uri'

function base64UrlEncode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function getRandomString(length: number) {
  const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = crypto.getRandomValues(new Uint8Array(length))

  return Array.from(randomValues, (value) => allowed[value % allowed.length]).join('')
}

export async function createCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return base64UrlEncode(new Uint8Array(digest))
}

export function clearPkceSessionStorage() {
  window.sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
  window.sessionStorage.removeItem(PKCE_STATE_STORAGE_KEY)
  window.sessionStorage.removeItem(PKCE_REDIRECT_URI_STORAGE_KEY)
}
