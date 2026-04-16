import { describe, it, expect } from 'vitest'
import { parseSpotifyUrl, isValidSpotifyPlaylistUrl } from './parseSpotifyUrl'

describe('parseSpotifyUrl', () => {
  it('extracts ID from a clean URL', () => {
    expect(parseSpotifyUrl('https://open.spotify.com/playlist/5HaX196nnGC3tTnYIBbFxi'))
      .toBe('5HaX196nnGC3tTnYIBbFxi')
  })

  it('extracts ID from URL with ?si= query param', () => {
    expect(parseSpotifyUrl('https://open.spotify.com/playlist/5HaX196nnGC3tTnYIBbFxi?si=851381a3be3641a1'))
      .toBe('5HaX196nnGC3tTnYIBbFxi')
  })

  it('throws on empty string', () => {
    expect(() => parseSpotifyUrl('')).toThrow("That doesn't look like a Spotify playlist link.")
  })

  it('throws on a non-spotify URL', () => {
    expect(() => parseSpotifyUrl('https://www.youtube.com/watch?v=abc'))
      .toThrow("That doesn't look like a Spotify playlist link.")
  })

  it('throws on a spotify URL that is not a playlist', () => {
    expect(() => parseSpotifyUrl('https://open.spotify.com/track/abc123'))
      .toThrow("That doesn't look like a Spotify playlist link.")
  })

  it('throws on a malformed string', () => {
    expect(() => parseSpotifyUrl('not a url'))
      .toThrow("That doesn't look like a Spotify playlist link.")
  })
})

describe('isValidSpotifyPlaylistUrl', () => {
  it('returns true for a valid playlist URL', () => {
    expect(isValidSpotifyPlaylistUrl('https://open.spotify.com/playlist/5HaX196nnGC3tTnYIBbFxi'))
      .toBe(true)
  })

  it('returns true for a URL with query params', () => {
    expect(isValidSpotifyPlaylistUrl('https://open.spotify.com/playlist/5HaX196nnGC3tTnYIBbFxi?si=abc'))
      .toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isValidSpotifyPlaylistUrl('')).toBe(false)
  })

  it('returns false for a non-playlist spotify URL', () => {
    expect(isValidSpotifyPlaylistUrl('https://open.spotify.com/track/abc')).toBe(false)
  })
})
