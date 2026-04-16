import { describe, it, expect } from 'vitest'
import { parseRetryAfterMs } from './spotifyAuth'

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
