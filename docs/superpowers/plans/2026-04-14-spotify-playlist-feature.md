# Spotify Playlist Input & Gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the movie gallery demo with a feature that accepts a public Spotify playlist URL, fetches all tracks via Client Credentials Flow, and visualizes album covers in the existing `gallery-universe` canvas.

**Architecture:** `usePlaylistLoader` hook owns the state machine (idle → loading → ready/error) and all async logic. `App.tsx` renders either `PlaylistInput` (idle/loading/error) or `GalleryScene` (ready). API logic lives in `spotifyApi.ts`; URL parsing is a pure utility in `parseSpotifyUrl.ts`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, gallery-universe, Vitest (added in Task 1), Spotify Web API (Client Credentials)

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `src/types/spotify.ts` | create | `Track` type, `Phase` type, `TokenCache` type |
| `src/utils/parseSpotifyUrl.ts` | create | Pure URL → playlist ID extraction + live validation helper |
| `src/utils/spotifyApi.ts` | create | Token cache, `fetchPlaylistTracks`, `mapToTrack` |
| `src/hooks/usePlaylistLoader.ts` | create | State machine (idle/loading/ready/error), calls API |
| `src/components/PlaylistInput.tsx` | create | Centered input screen, handles all non-ready phases |
| `src/components/GalleryScene.tsx` | create | Wraps `UniverseCanvas` with Spotify track data |
| `src/App.tsx` | modify | Replaces movie demo with hook + conditional render |
| `vite.config.ts` | modify | Adds Vitest `test` config |
| `.env.example` | create | Documents required env vars |
| `.gitignore` | modify | Adds `.env` and `.superpowers/` |

---

## Task 1: Project Setup — Vitest + .env

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Update vite.config.ts to add test config**

Replace the full contents of `vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
})
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, add two entries to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create .env.example**

```
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

- [ ] **Step 5: Update .gitignore**

Append these two lines to `.gitignore`:

```
.env
.superpowers/
```

- [ ] **Step 6: Verify Vitest runs without errors**

```bash
npm test
```

Expected output: something like `No test files found` — no crashes, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts package.json package-lock.json .env.example .gitignore
git commit -m "chore: add vitest and env setup for spotify feature"
```

---

## Task 2: Types

**Files:**
- Create: `src/types/spotify.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/spotify.ts

export type Phase = 'idle' | 'loading' | 'ready' | 'error'

// Must be a `type` (not `interface`) so it satisfies
// `Record<string, unknown>` required by gallery-universe generics.
export type Track = {
  id: string
  title: string
  artist: string
  album: string
  image: string // album cover URL (640px)
}

export type TokenCache = {
  accessToken: string
  expiresAt: number // Date.now() + (expires_in * 1000)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/spotify.ts
git commit -m "feat: add spotify types"
```

---

## Task 3: URL Parser (TDD)

**Files:**
- Create: `src/utils/parseSpotifyUrl.test.ts`
- Create: `src/utils/parseSpotifyUrl.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/parseSpotifyUrl.test.ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module './parseSpotifyUrl'`

- [ ] **Step 3: Implement parseSpotifyUrl.ts**

```ts
// src/utils/parseSpotifyUrl.ts

const INVALID_MSG = "That doesn't look like a Spotify playlist link."

export function parseSpotifyUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(INVALID_MSG)
  }

  if (parsed.hostname !== 'open.spotify.com') throw new Error(INVALID_MSG)

  const match = parsed.pathname.match(/^\/playlist\/([A-Za-z0-9]+)$/)
  if (!match) throw new Error(INVALID_MSG)

  return match[1]
}

export function isValidSpotifyPlaylistUrl(url: string): boolean {
  try {
    parseSpotifyUrl(url)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/parseSpotifyUrl.ts src/utils/parseSpotifyUrl.test.ts
git commit -m "feat: add spotify URL parser with tests"
```

---

## Task 4: Spotify API Layer (TDD for mapToTrack)

**Files:**
- Create: `src/utils/spotifyApi.test.ts`
- Create: `src/utils/spotifyApi.ts`

- [ ] **Step 1: Write failing tests for mapToTrack**

```ts
// src/utils/spotifyApi.test.ts
import { describe, it, expect } from 'vitest'
import { mapToTrack } from './spotifyApi'
import type { SpotifyTrackItem } from './spotifyApi'

const mockItem: SpotifyTrackItem = {
  track: {
    id: 'track123',
    name: 'Bohemian Rhapsody',
    artists: [{ name: 'Queen' }, { name: 'Other Artist' }],
    album: {
      name: 'A Night at the Opera',
      images: [
        { url: 'https://i.scdn.co/image/large.jpg', width: 640, height: 640 },
        { url: 'https://i.scdn.co/image/small.jpg', width: 300, height: 300 },
      ],
    },
  },
}

describe('mapToTrack', () => {
  it('maps a spotify item to the Track shape', () => {
    expect(mapToTrack(mockItem)).toEqual({
      id: 'track123',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      image: 'https://i.scdn.co/image/large.jpg',
    })
  })

  it('uses only the primary (first) artist', () => {
    expect(mapToTrack(mockItem).artist).toBe('Queen')
  })

  it('uses the largest image (first in the array)', () => {
    expect(mapToTrack(mockItem).image).toBe('https://i.scdn.co/image/large.jpg')
  })

  it('falls back to empty string when there are no images', () => {
    const noImages: SpotifyTrackItem = {
      track: {
        ...mockItem.track!,
        album: { name: 'A Night at the Opera', images: [] },
      },
    }
    expect(mapToTrack(noImages).image).toBe('')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module './spotifyApi'`

- [ ] **Step 3: Create spotifyApi.ts**

```ts
// src/utils/spotifyApi.ts
import type { Track, TokenCache } from '../types/spotify'

// ─── Spotify response shapes ─────────────────────────────────────────────────

interface SpotifyImage {
  url: string
  width: number
  height: number
}

interface SpotifyArtist {
  name: string
}

interface SpotifyAlbum {
  name: string
  images: SpotifyImage[]
}

interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
}

export interface SpotifyTrackItem {
  track: SpotifyTrack | null
}

interface SpotifyTracksPage {
  items: SpotifyTrackItem[]
  next: string | null
}

// ─── Token cache (module-level, not persisted across page loads) ─────────────

let tokenCache: TokenCache | null = null

// ─── Data mapping ────────────────────────────────────────────────────────────

export function mapToTrack(item: SpotifyTrackItem): Track {
  const t = item.track!
  return {
    id: t.id,
    title: t.name,
    artist: t.artists[0].name,
    album: t.album.name,
    image: t.album.images[0]?.url ?? '',
  }
}

// ─── Token management ────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const SAFETY_MARGIN_MS = 60_000
  if (tokenCache && Date.now() < tokenCache.expiresAt - SAFETY_MARGIN_MS) {
    return tokenCache.accessToken
  }

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string
  const credentials = btoa(`${clientId}:${clientSecret}`)

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('Failed to authenticate with Spotify.')

  const data = await res.json() as { access_token: string; expires_in: number }
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return tokenCache.accessToken
}

// ─── Playlist fetch (with pagination) ────────────────────────────────────────

export async function fetchPlaylistTracks(playlistId: string): Promise<Track[]> {
  const token = await getToken()

  // Verify the playlist exists and is accessible before paginating tracks
  const metaRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=id`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (metaRes.status === 404) throw new Error('Playlist not found. Check the link and try again.')
  if (metaRes.status === 403) throw new Error('This playlist is private.')
  if (!metaRes.ok) throw new Error('Something went wrong. Check your connection and try again.')

  // Paginate through all tracks (Spotify returns max 50 per page)
  const allItems: SpotifyTrackItem[] = []
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=0`

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Something went wrong. Check your connection and try again.')
    const page = await res.json() as SpotifyTracksPage
    allItems.push(...page.items)
    url = page.next
  }

  // Filter null entries (Spotify includes them for local files)
  const tracks = allItems.filter((item) => item.track !== null).map(mapToTrack)

  if (tracks.length === 0) throw new Error('This playlist has no tracks.')

  return tracks
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: 14 tests PASS (10 from `parseSpotifyUrl.test.ts` + 4 from `spotifyApi.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/utils/spotifyApi.ts src/utils/spotifyApi.test.ts
git commit -m "feat: add spotify API layer and data mapping with tests"
```

---

## Task 5: usePlaylistLoader Hook

**Files:**
- Create: `src/hooks/usePlaylistLoader.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/usePlaylistLoader.ts
import { useState, useCallback } from 'react'
import type { Phase, Track } from '../types/spotify'
import { parseSpotifyUrl } from '../utils/parseSpotifyUrl'
import { fetchPlaylistTracks } from '../utils/spotifyApi'

export interface UsePlaylistLoaderResult {
  phase: Phase
  tracks: Track[]
  error: string | null
  load: (url: string) => void
  reset: () => void
}

export function usePlaylistLoader(): UsePlaylistLoaderResult {
  const [phase, setPhase] = useState<Phase>('idle')
  const [tracks, setTracks] = useState<Track[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (url: string) => {
    setPhase('loading')
    setError(null)

    try {
      const playlistId = parseSpotifyUrl(url)
      const fetched = await fetchPlaylistTracks(playlistId)
      setTracks(fetched)
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }, [])

  const reset = useCallback(() => {
    setPhase('idle')
    setTracks([])
    setError(null)
  }, [])

  return { phase, tracks, error, load, reset }
}
```

- [ ] **Step 2: Run tests (no change expected — sanity check)**

```bash
npm test
```

Expected: 14 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePlaylistLoader.ts
git commit -m "feat: add usePlaylistLoader state machine hook"
```

---

## Task 6: PlaylistInput Component

**Files:**
- Create: `src/components/PlaylistInput.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/PlaylistInput.tsx
import { useState, useCallback, useRef } from 'react'
import type { Phase } from '../types/spotify'
import { isValidSpotifyPlaylistUrl } from '../utils/parseSpotifyUrl'

interface Props {
  phase: Phase
  error: string | null
  onSubmit: (url: string) => void
}

export function PlaylistInput({ phase, error, onSubmit }: Props) {
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLoading = phase === 'loading'

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    if (!touched && v.length > 0) setTouched(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setIsValid(isValidSpotifyPlaylistUrl(v))
    }, 300)
  }, [touched])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !isLoading) onSubmit(value)
  }, [isValid, isLoading, onSubmit, value])

  const inputBorderColor = !touched
    ? 'var(--border)'
    : isValid
    ? 'var(--gold)'
    : 'rgba(200, 80, 80, 0.5)'

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '28px',
      background: 'var(--void)',
      position: 'relative',
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(6, 6, 13, 0.75)',
          zIndex: 10,
        }}>
          <div style={{
            width: 36,
            height: 36,
            border: '2px solid var(--gold-dim)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 300,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          letterSpacing: '0.08em',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}>
          Playlist{' '}
          <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Universe</em>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginTop: '10px',
        }}>
          paste a spotify link to begin
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '480px',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="open.spotify.com/playlist/..."
            disabled={isLoading}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: `1px solid ${inputBorderColor}`,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              padding: '10px 14px',
              outline: 'none',
              letterSpacing: '0.04em',
              transition: 'border-color 0.2s',
              opacity: isLoading ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!isValid || isLoading}
            style={{
              background: isValid && !isLoading ? 'var(--gold)' : 'transparent',
              border: `1px solid ${isValid && !isLoading ? 'var(--gold)' : 'var(--border)'}`,
              color: isValid && !isLoading ? 'var(--void)' : 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              padding: '10px 20px',
              textTransform: 'uppercase',
              cursor: isValid && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Enter
          </button>
        </div>

        {error && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'rgba(200, 80, 80, 0.9)',
            letterSpacing: '0.04em',
          }}>
            {error}
          </p>
        )}
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Run tests (sanity check)**

```bash
npm test
```

Expected: 14 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlaylistInput.tsx
git commit -m "feat: add PlaylistInput component with live URL validation"
```

---

## Task 7: GalleryScene Component

**Files:**
- Create: `src/components/GalleryScene.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/GalleryScene.tsx
import { useMemo } from 'react'
import { useUniverseCore, UniverseCanvas, createItems, createImageRenderer } from 'gallery-universe'
import type { Track } from '../types/spotify'

interface Props {
  tracks: Track[]
  onBack: () => void
}

// Created once at module level — does not depend on any data
const renderItem = createImageRenderer<Track>('image')

export function GalleryScene({ tracks, onBack }: Props) {
  const items = useMemo(
    () => createItems<Track>(tracks.length, (i) => tracks[i]),
    [tracks]
  )

  const core = useUniverseCore<Track>({
    items,
    onItemClick: (item) => {
      console.log(`${item.data.title} — ${item.data.artist}`)
    },
  })

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)' }}>
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 10,
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          padding: '6px 14px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--gold)'
          e.currentTarget.style.color = 'var(--gold)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        ← Back
      </button>

      <UniverseCanvas
        core={{ ...core, animationState: core.animRef }}
        width={window.innerWidth}
        height={window.innerHeight}
        renderItem={renderItem}
        groupBy={null}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run tests (sanity check)**

```bash
npm test
```

Expected: 14 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/GalleryScene.tsx
git commit -m "feat: add GalleryScene component wrapping UniverseCanvas"
```

---

## Task 8: Wire App.tsx + Manual Verification

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App.tsx entirely**

```tsx
// src/App.tsx
import { usePlaylistLoader } from './hooks/usePlaylistLoader'
import { PlaylistInput } from './components/PlaylistInput'
import { GalleryScene } from './components/GalleryScene'

export default function App() {
  const { phase, tracks, error, load, reset } = usePlaylistLoader()

  if (phase === 'ready') {
    return <GalleryScene tracks={tracks} onBack={reset} />
  }

  return <PlaylistInput phase={phase} error={error} onSubmit={load} />
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: 14 tests PASS.

- [ ] **Step 3: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 4: Manual verification checklist**

Open the URL printed by Vite (typically http://localhost:5173) and check each:

1. **Empty state** — "Playlist Universe" heading centered, input empty, button disabled (no gold)
2. **Invalid URL** — type `https://google.com` → after 300ms, input border turns red, button stays disabled
3. **Valid URL** — paste a real Spotify playlist URL → border turns gold, button activates (gold fill)
4. **Loading** — press Enter → spinner overlay appears, input disabled
5. **Success** — gallery renders with album covers scattered in 3D space
6. **Back button** — "← Back" top-left returns to input screen with cleared state
7. **Error: invalid ID** — try `https://open.spotify.com/playlist/FAKEID000000000` → error message below input
8. **Error: private playlist** — try a known private playlist URL → "This playlist is private."

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App.tsx — spotify playlist input + gallery complete"
```

---

## Final Checklist

- [ ] All 14 tests pass (`npm test`)
- [ ] TypeScript build clean (`npm run build`)
- [ ] `.env` is in `.gitignore` (verify with `git status` — `.env` should not appear)
- [ ] `.env.example` is committed as a reference for credentials
