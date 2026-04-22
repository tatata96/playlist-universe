import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getValidSpotifyAccessToken, parseRetryAfterMs } from '../../../spotify/auth/spotifyAuth'

describe('parseRetryAfterMs', () => {
  it('returns 1000ms on attempt 0 when header is null', () => {
    expect(parseRetryAfterMs(null, 0)).toBe(1000)
  })

  it('returns 2000ms on attempt 1 when header is null', () => {
    expect(parseRetryAfterMs(null, 1)).toBe(2000)
  })

  it('caps at 8000ms on attempt 3', () => {
    expect(parseRetryAfterMs(null, 3)).toBe(8000)
  })

  it('parses a numeric seconds header', () => {
    expect(parseRetryAfterMs('30', 0)).toBe(30_000)
  })

  it('falls back to backoff for an invalid string', () => {
    expect(parseRetryAfterMs('invalid', 0)).toBe(1000)
  })
})

describe('getValidSpotifyAccessToken', () => {
  let storage: Map<string, string>
  let dispatchEvent: ReturnType<typeof vi.fn>

  beforeEach(() => {
    storage = new Map()
    dispatchEvent = vi.fn()
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'client-id')
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      sessionStorage: {
        removeItem: vi.fn(),
      },
      setTimeout,
      dispatchEvent,
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('clears revoked refresh tokens and asks the user to sign in again', async () => {
    storage.set(
      'spotify_auth_tokens',
      JSON.stringify({
        accessToken: 'expired-access-token',
        refreshToken: 'revoked-refresh-token',
        expiresAt: Date.now() - 1000,
        scope: 'user-library-read',
        tokenType: 'Bearer',
      }),
    )
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Refresh token revoked',
      }),
    } as Response)

    await expect(getValidSpotifyAccessToken()).rejects.toThrow('Spotify sign-in expired. Please sign in again.')

    expect(storage.has('spotify_auth_tokens')).toBe(false)
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'spotify-auth-session-cleared' }))
  })
})
