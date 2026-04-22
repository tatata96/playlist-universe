# Playlist Universe

Playlist Universe lets you fly through your Spotify liked songs as a little galaxy of tracks. Drift between tracks, group them by mood, genre, year, scene, and other musical signals, then collect favorites into new private playlists as you explore.

The app is currently invite-only while in development. Spotify users must be added to the Spotify developer app before they can complete authorization.



https://github.com/user-attachments/assets/5b57e411-e807-42cd-b76c-e2b2abcba5b5





## Features

- Spotify sign-in with PKCE.
- Loads all liked songs from the Spotify Web API.
- Interactive `gallery-universe` canvas using album artwork.
- Grouping modes for year, date added, country, speed, genre, energy, scene, instrumentation, and popularity tier.
- Gemini-powered enrichment for grouping metadata.
- Private playlist creation and track adding from inside the gallery.

## Requirements

- Node.js and npm.
- A Spotify developer app.
- A Gemini API key.

## Environment

Create a `.env.local` file in the project root:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/


VITE_GEMINI_API_KEY=your_gemini_api_key
```

Optional Gemini settings:

```env
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
VITE_GEMINI_TRACK_BATCH_SIZE=20
```

The Spotify redirect URI must be registered in the Spotify developer dashboard. For local development, use `http://127.0.0.1:5173/`; `http://localhost` is intentionally rejected by the app.

Required Spotify scopes:

- `user-library-read`
- `playlist-read-private`
- `playlist-modify-private`

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## App Flow

1. The user starts the liked-songs mode.
2. If needed, the app redirects to Spotify authorization.
3. Spotify redirects back with an authorization code.
4. The app exchanges the code for tokens and stores them locally.
5. Liked songs are loaded from Spotify.
6. The gallery opens as soon as Spotify data is ready.
7. Gemini enrichment continues in the background and unlocks metadata grouping modes when complete.
