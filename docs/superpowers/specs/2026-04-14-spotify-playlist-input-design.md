# Spotify Playlist Input & Gallery Feature

**Date:** 2026-04-14  
**Project:** playlist-universe  
**Status:** Approved

---

## Overview

Add a first screen where users paste a public Spotify playlist URL. The app fetches all tracks via the Spotify Web API (Client Credentials Flow — no OAuth) and hands the normalized data to the existing `gallery-universe` canvas for visualization as a flat scatter of album covers.

The existing movie gallery demo in `App.tsx` is replaced entirely by this feature.

---

## Architecture

**Approach:** Custom hook (`usePlaylistLoader`) owns all async state. `App.tsx` stays thin — it reads from the hook and renders either `PlaylistInput` or `GalleryScene`. Both components are purely presentational.

```
App.tsx
  └─ usePlaylistLoader()         ← state machine + side effects
       ├─ parseSpotifyUrl.ts     ← pure URL → ID extraction
       └─ spotifyApi.ts          ← token cache + Spotify API calls
            └─ Track[]           ← normalized data shape
                 └─ GalleryScene ← feeds UniverseCanvas
```

---

## File Structure

```
src/
  App.tsx                        ← modified: replaces movie demo
  components/
    PlaylistInput.tsx            ← new: centered input screen
    GalleryScene.tsx             ← new: gallery wrapper
  hooks/
    usePlaylistLoader.ts         ← new: state machine + fetch logic
  utils/
    parseSpotifyUrl.ts           ← new: URL parsing utility
    spotifyApi.ts                ← new: token + API layer
  types/
    spotify.ts                   ← new: shared types
  index.css                      ← unchanged
  main.tsx                       ← unchanged
```

---

## Credentials

Stored in a `.env` file at the project root using Vite's convention:

```
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
```

**Note:** This is a frontend-only app — the client secret will be visible in the built bundle. This is acceptable for personal/demo use. The Client Credentials token grants access only to public Spotify data and carries no user permissions.

---

## State Machine

Managed inside `usePlaylistLoader`. Four phases:

| Phase | Meaning |
|-------|---------|
| `'idle'` | Initial state. Input shown, nothing loading. |
| `'loading'` | Token fetch + playlist fetch in progress. |
| `'ready'` | Tracks loaded. Gallery shown. |
| `'error'` | Something went wrong. Error message shown with retry. |

Transitions:
- `idle` → `loading` on `load(url)` call
- `loading` → `ready` on successful fetch
- `loading` → `error` on any failure
- `error` → `idle` on `reset()`
- `ready` → `idle` on `reset()` (back button)

---

## Hook Contract

```ts
// hooks/usePlaylistLoader.ts

type Phase = 'idle' | 'loading' | 'ready' | 'error'

interface UsePlaylistLoaderResult {
  phase: Phase
  tracks: Track[]
  error: string | null
  load: (url: string) => void
  reset: () => void
}

function usePlaylistLoader(): UsePlaylistLoaderResult
```

---

## Types

```ts
// types/spotify.ts

export interface Track {
  id: string
  title: string
  artist: string   // primary artist name
  album: string
  image: string    // album cover URL (640px preferred)
}

interface TokenCache {
  accessToken: string
  expiresAt: number  // Date.now() + (expires_in * 1000)
}
```

---

## URL Parsing (`parseSpotifyUrl.ts`)

Pure function — no side effects.

```ts
// Accepts:
//   https://open.spotify.com/playlist/5HaX196nnGC3tTnYIBbFxi
//   https://open.spotify.com/playlist/5HaX196nnGC3tTnYIBbFxi?si=abc
// Returns: playlist ID string, or throws on invalid input

export function parseSpotifyUrl(url: string): string
```

Validation rules:
1. Must be a valid URL (parseable by `new URL()`)
2. Hostname must be `open.spotify.com`
3. Path must match `/playlist/<id>`
4. ID must be a non-empty alphanumeric string

Throws a descriptive `Error` on any violation — caught by `usePlaylistLoader` and surfaced as the error message.

Also exports a sync validation helper used by the component (the component applies debouncing):

```ts
export function isValidSpotifyPlaylistUrl(url: string): boolean
```

---

## API Layer (`spotifyApi.ts`)

### Token management

- Fetches a Client Credentials token from `https://accounts.spotify.com/api/token`
- Token cached in module-level memory with an `expiresAt` timestamp
- `getToken()` returns cached token if still valid (with a 60s safety margin), otherwise fetches fresh
- Token is **not** persisted to localStorage — a fresh one is fetched on each page load

### Playlist fetch

```ts
// Fetches playlist metadata + all tracks (handles Spotify pagination)
export async function fetchPlaylistTracks(playlistId: string): Promise<Track[]>
```

Internally:
1. Calls `GET /v1/playlists/{id}` for metadata
2. Calls `GET /v1/playlists/{id}/tracks` with pagination (`offset` + `limit=50`) until all tracks are retrieved
3. Filters out null track entries (Spotify includes these for local files)
4. Maps each item to `Track` via `mapToTrack()`

### Data mapping

```ts
function mapToTrack(item: SpotifyTrackItem): Track {
  return {
    id: item.track.id,
    title: item.track.name,
    artist: item.track.artists[0].name,
    album: item.track.album.name,
    image: item.track.album.images[0]?.url ?? '',
  }
}
```

Prefers the largest image (`images[0]` is 640px on Spotify). Falls back to empty string if no image.

---

## Components

### `PlaylistInput.tsx`

**Layout:** Centered Minimal (approved in design review)

- Full-screen, `background: var(--void)`
- Vertically and horizontally centered column
- Heading: `Playlist Universe` in Cormorant Garamond italic, gold accent on "Universe"
- Tagline: `paste a spotify link to begin` in JetBrains Mono, muted
- Input field + "Enter" button in a row
- Live URL validation: input border shifts to gold when URL is valid, red-tinted when invalid (only after first keystroke)
- Button disabled while input is invalid or empty
- Debounce: 300ms on the validation check
- On submit: calls `load(url)` from the hook

**Loading state:** `PlaylistInput` stays mounted. Input and button are disabled, and a centered gold pulse/spinner renders as an overlay. The component receives `phase` as a prop and handles this internally.

**Error state:** Error message shown below the input, in red-tinted text. "Try again" resets to idle.

### `GalleryScene.tsx`

Thin wrapper around `UniverseCanvas` from `gallery-universe`.

- Converts `Track[]` to `UniverseItem[]` using `createItems` and `createImageRenderer` (keyed on `image`)
- Passes `width={window.innerWidth}` and `height={window.innerHeight}`
- Small back-arrow button (top-left, fixed) calls `reset()` to return to input screen
- No grouping or filtering controls (flat scatter only, for now)

### `App.tsx`

```tsx
export default function App() {
  const { phase, tracks, error, load, reset } = usePlaylistLoader()

  if (phase === 'idle' || phase === 'loading' || phase === 'error') {
    return <PlaylistInput phase={phase} error={error} onSubmit={load} />
  }

  return <GalleryScene tracks={tracks} onBack={reset} />
}
```

---

## Error Handling

| Scenario | Source | User message |
|----------|--------|--------------|
| Invalid URL format | `parseSpotifyUrl` throws | "That doesn't look like a Spotify playlist link." |
| Playlist not found (404) | Spotify API | "Playlist not found. Check the link and try again." |
| Private playlist (403) | Spotify API | "This playlist is private." |
| Network / API failure | fetch throws | "Something went wrong. Check your connection and try again." |
| Empty playlist | 0 tracks returned | "This playlist has no tracks." |

---

## Bonus Features (in scope)

- **Debounced live URL validation** on the input (300ms) with visual indicator
- **URL format validation** before any network call (instant feedback)

## Out of Scope

- Grouping or filtering in the gallery (can be added later)
- OAuth / user playlists
- Track click interactions in the gallery
- Persisting the last-loaded playlist
- URL routing / bookmarkable gallery state
